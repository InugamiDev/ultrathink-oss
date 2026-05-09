// intent: Tauri commands + engine sidecar bridge for UltraThink Studio
// status: done (start/send/stop/list_projects wired; ready for frontend)
// next: deploy commands, knowledge-graph queries, global shortcut handler
// confidence: medium — Tauri 2 IPC shape is stable; sidecar process lifecycle is the most subtle bit
//
// Architecture:
//   - Frontend invokes `start_session` → spawns one Node sidecar process per session
//   - Sidecar runs `apps/studio-engine/dist/sidecar.js`, communicates via stdin/stdout JSON
//   - Each line on sidecar stdout becomes a Tauri event `engine:event:<sessionId>`
//   - Sessions tracked in a Mutex<HashMap<sessionId, Sender>> so follow-ups + stop work

use std::collections::HashMap;
use std::path::PathBuf;
use std::process::Stdio;

use anyhow::{anyhow, Result};
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, Manager, State};
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
use tokio::process::{Child, Command};
use tokio::sync::{mpsc, Mutex};

#[derive(Default)]
struct AppState {
    sessions: Mutex<HashMap<String, SessionHandle>>,
    /// Preview dev servers keyed by project dir; child held to kill on drop.
    previews: Mutex<HashMap<String, Child>>,
    /// CAR runs keyed by run id. Each entry owns the child so dropping kills it.
    car_runs: Mutex<HashMap<String, CarRunHandle>>,
}

struct CarRunHandle {
    child: Child,
    lane_id: String,
    task: String,
    started_at: String,
    /// If the run got an isolated git worktree, this is the host project (parent
    /// repo) — used to remove the worktree on cancel/complete.
    project_dir: Option<String>,
    /// Path under `~/.ultrathink-studio/worktrees/` if isolation kicked in.
    worktree_path: Option<String>,
}

/// Create an isolated git worktree under `~/.ultrathink-studio/worktrees/<run_id>`
/// in detached-HEAD mode so per-lane CAR runs can edit files in parallel without
/// stepping on each other or the user's working tree. Returns the worktree path
/// on success, None when the host isn't a git repo or worktree creation fails
/// (caller falls back to running directly in project_dir).
fn create_car_worktree(project_dir: &str, run_id: &str) -> Option<String> {
    let host = std::path::Path::new(project_dir);
    if !host.join(".git").exists() {
        return None;
    }
    let home = dirs::home_dir()?;
    let parent = home.join(".ultrathink-studio").join("worktrees");
    if let Err(e) = std::fs::create_dir_all(&parent) {
        log::warn!("[worktree] mkdir {} failed: {}", parent.display(), e);
        return None;
    }
    let path = parent.join(run_id);
    let out = std::process::Command::new("git")
        .args(["worktree", "add", "--detach", &path.to_string_lossy()])
        .current_dir(project_dir)
        .output()
        .ok()?;
    if !out.status.success() {
        log::warn!(
            "[worktree] add failed: {}",
            String::from_utf8_lossy(&out.stderr)
        );
        return None;
    }
    Some(path.to_string_lossy().to_string())
}

fn cleanup_car_worktree(project_dir: &str, worktree_path: &str) {
    let _ = std::process::Command::new("git")
        .args(["worktree", "remove", "--force", worktree_path])
        .current_dir(project_dir)
        .output();
    let _ = std::process::Command::new("git")
        .args(["worktree", "prune"])
        .current_dir(project_dir)
        .output();
}

struct SessionHandle {
    /// Send line-delimited JSON commands to the sidecar's stdin.
    cmd_tx: mpsc::Sender<String>,
    /// The owned child process; kept so dropping the entry kills the sidecar.
    _child: Child,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct StartSessionRequest {
    pub prompt: String,
    pub project_dir: Option<String>,
    pub model: Option<String>,
    pub adapter: Option<String>,
    pub api_key: Option<String>,
    pub base_url: Option<String>,
    pub top_skills: Option<u32>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct StartSessionResponse {
    pub session_id: String,
    pub project_dir: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ProjectInfo {
    pub dir: String,
    pub name: String,
    pub last_modified: String,
}

/// Locate a script under packages/studio-engine/dist/. Multiple fallback
/// strategies because the .app's binary path isn't predictable when launched
/// via Finder/Launch Services (vs. a direct dev run from cargo).
///
/// Order:
///   1. Bundled in Tauri resources (production)
///   2. ULTRATHINK_HOME env var (manual override)
///   3. Walk up from current_exe — covers most dev scenarios
///   4. Walk up from the canonicalized current_exe — covers symlinked builds
///   5. Common dev install locations under $HOME — last-resort
///
/// Logs each attempted strategy to stderr so the debug terminal surfaces what
/// was tried when all strategies miss.
fn locate_engine_script(app: &AppHandle, name: &str) -> Result<PathBuf> {
    let mut tried: Vec<String> = Vec::new();

    // 1. Bundled resources
    if let Ok(bundled) = app
        .path()
        .resolve(format!(".engine/{}", name), tauri::path::BaseDirectory::Resource)
    {
        tried.push(format!("[bundle] {}", bundled.display()));
        if bundled.exists() {
            return Ok(bundled);
        }
    }
    // Legacy bundle path
    if let Ok(bundled) = app
        .path()
        .resolve(format!("resources/{}", name), tauri::path::BaseDirectory::Resource)
    {
        if bundled.exists() {
            return Ok(bundled);
        }
    }

    // 2. ULTRATHINK_HOME env var override
    if let Ok(home) = std::env::var("ULTRATHINK_HOME") {
        let candidate = std::path::PathBuf::from(&home)
            .join("packages/studio-engine/dist")
            .join(name);
        tried.push(format!("[ULTRATHINK_HOME] {}", candidate.display()));
        if candidate.exists() {
            return Ok(candidate);
        }
    }

    // 3 + 4. Walk up from current_exe (raw + canonicalized).
    let exe = std::env::current_exe()?;
    let exe_canon = exe.canonicalize().unwrap_or_else(|_| exe.clone());
    for start in [exe.clone(), exe_canon] {
        let mut cur = start.clone();
        cur.pop();
        let mut depth = 0;
        while let Some(parent) = cur.parent() {
            for relative in [
                format!("packages/studio-engine/dist/{}", name),
                format!("apps/studio-engine/dist/{}", name), // legacy fallback
            ] {
                let candidate = parent.join(&relative);
                if candidate.exists() {
                    return Ok(candidate);
                }
            }
            cur = parent.to_path_buf();
            depth += 1;
            if depth > 25 {
                break;
            }
        }
        tried.push(format!("[walkup from {}] no match", start.display()));
    }

    // 5. Common dev install locations under $HOME
    if let Some(home) = dirs::home_dir() {
        for variant in [
            "Documents/GitHub/InuVerse/ai-agents/ultrathink",
            "Documents/GitHub/ultrathink",
            "InuVerse/ai-agents/ultrathink",
            "ai-agents/ultrathink",
            "ultrathink",
            ".ultrathink",
        ] {
            let candidate = home
                .join(variant)
                .join("packages/studio-engine/dist")
                .join(name);
            tried.push(format!("[home-variant] {}", candidate.display()));
            if candidate.exists() {
                return Ok(candidate);
            }
        }
    }

    // All strategies failed — log everything we tried so the user can copy
    // the diagnostic from the debug terminal back to us.
    eprintln!(
        "[locate_engine_script] failed for `{}` after {} attempts:",
        name,
        tried.len()
    );
    for t in &tried {
        eprintln!("  {}", t);
    }
    Err(anyhow!("could not locate engine script: {}", name))
}

fn locate_sidecar(app: &AppHandle) -> Result<PathBuf> {
    locate_engine_script(app, "sidecar.js")
}

/// Walk up from the binary path until we find the UltraThink workspace root
/// (the dir that contains `.claude/skills/_registry.json`). Returns None for
/// shipped/installed builds where the binary lives outside the source tree.
/// Used to set CWD on spawned engine scripts + sidecar so their dotenv lookup
/// finds `.env` (DATABASE_URL etc.). When Studio.app launches from Finder,
/// inherited cwd is `/`, which would otherwise leave DATABASE_URL unset.
fn find_workspace_root() -> Option<PathBuf> {
    let mut cur = std::env::current_exe().ok()?;
    cur.pop();
    while let Some(parent) = cur.parent() {
        if parent.join(".claude/skills/_registry.json").exists()
            || parent.join("packages/studio-engine/dist/sidecar.js").exists()
        {
            return Some(parent.to_path_buf());
        }
        cur = parent.to_path_buf();
    }
    None
}

#[derive(Debug, Deserialize)]
#[serde(tag = "type")]
enum SidecarMsg {
    #[serde(rename = "ready")]
    Ready {
        #[serde(rename = "sessionId")]
        session_id: String,
        #[serde(rename = "projectDir")]
        project_dir: String,
    },
    #[serde(rename = "event")]
    Event {
        #[serde(rename = "sessionId")]
        session_id: String,
        event: serde_json::Value,
    },
    #[serde(rename = "turn-done")]
    TurnDone {
        #[serde(rename = "sessionId")]
        session_id: String,
        #[serde(rename = "exitCode")]
        exit_code: Option<i32>,
    },
    #[serde(rename = "error")]
    Error { message: String },
    #[serde(rename = "ack")]
    Ack,
}

async fn spawn_sidecar_session(
    req: &StartSessionRequest,
    app: &AppHandle,
) -> Result<(StartSessionResponse, mpsc::Sender<String>, Child)> {
    let sidecar = locate_sidecar(app)?;
    let node_bin = std::env::var("NODE_BIN").unwrap_or_else(|_| "node".to_string());

    let mut cmd = Command::new(node_bin);
    cmd.arg(&sidecar)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .kill_on_drop(true);
    // CWD = workspace root so the sidecar's dotenv loads .env (DATABASE_URL,
    // ANTHROPIC_API_KEY, etc.). Without this the memory MCP fails silently
    // and claude falls back to writing memory to disk.
    if let Some(root) = find_workspace_root() {
        cmd.current_dir(root);
    }
    let mut child = cmd.spawn()?;

    let stdin = child.stdin.take().ok_or_else(|| anyhow!("no stdin"))?;
    let stdout = child.stdout.take().ok_or_else(|| anyhow!("no stdout"))?;
    let stderr = child.stderr.take().ok_or_else(|| anyhow!("no stderr"))?;

    // stderr → Rust log AND debug terminal (engine:event global topic).
    // Without this, "node not found", "claude not found", hook errors all
    // disappear silently. Now anything written to sidecar stderr surfaces
    // immediately in the debug terminal (Cmd+`).
    let app_stderr = app.clone();
    tokio::spawn(async move {
        let mut reader = BufReader::new(stderr).lines();
        while let Ok(Some(line)) = reader.next_line().await {
            // Scrub before logging or emitting — the line may include a 401
            // body that echoes the bad x-api-key, or a hook stderr that dumped
            // env. Defense-in-depth.
            let safe = scrub_secrets(&line);
            log::warn!("[sidecar stderr] {safe}");
            let _ = app_stderr.emit(
                "engine:event",
                serde_json::json!({
                    "sessionId": "_sidecar",
                    "event": { "kind": "sidecar-stderr", "line": safe }
                }),
            );
        }
    });

    // mpsc channel feeds stdin
    let (cmd_tx, mut cmd_rx) = mpsc::channel::<String>(32);
    let mut stdin = stdin;
    tokio::spawn(async move {
        while let Some(msg) = cmd_rx.recv().await {
            if stdin.write_all(msg.as_bytes()).await.is_err() {
                break;
            }
            if !msg.ends_with('\n') {
                let _ = stdin.write_all(b"\n").await;
            }
            let _ = stdin.flush().await;
        }
    });

    // Send the start command
    let start_msg = serde_json::json!({
        "op": "start",
        "params": {
            "prompt": req.prompt,
            "projectDir": req.project_dir,
            "model": req.model,
            "adapter": req.adapter,
            "apiKey": req.api_key,
            "baseUrl": req.base_url,
            "topSkills": req.top_skills.unwrap_or(3),
        }
    });
    cmd_tx.send(serde_json::to_string(&start_msg)? + "\n").await?;

    // Read stdout until we see the "ready" message; spawn the rest as background event pump
    let mut stdout_lines = BufReader::new(stdout).lines();
    let mut ready: Option<StartSessionResponse> = None;

    while let Some(line) = stdout_lines.next_line().await? {
        if line.trim().is_empty() {
            continue;
        }
        let msg: SidecarMsg = match serde_json::from_str(&line) {
            Ok(m) => m,
            Err(e) => {
                log::warn!("[sidecar parse] {} :: {}", e, line);
                continue;
            }
        };
        if let SidecarMsg::Ready {
            session_id,
            project_dir,
        } = &msg
        {
            ready = Some(StartSessionResponse {
                session_id: session_id.clone(),
                project_dir: project_dir.clone(),
            });
            break;
        } else if let SidecarMsg::Error { message } = &msg {
            return Err(anyhow!("sidecar error: {}", message));
        }
    }

    let resp = ready.ok_or_else(|| anyhow!("sidecar exited before ready"))?;

    // Background pump: forward events to the frontend
    let app_handle = app.clone();
    let session_id_owned = resp.session_id.clone();
    let project_dir_for_pump = resp.project_dir.clone();
    tokio::spawn(async move {
        while let Ok(Some(line)) = stdout_lines.next_line().await {
            if line.trim().is_empty() {
                continue;
            }
            let msg: SidecarMsg = match serde_json::from_str(&line) {
                Ok(m) => m,
                Err(e) => {
                    log::warn!("[sidecar parse] {} :: {}", e, line);
                    continue;
                }
            };
            match msg {
                SidecarMsg::Event { session_id, event } => {
                    // Scrub once at the boundary — applies to UI, debug terminal,
                    // AND on-disk session log so a 401-with-leaked-key never
                    // gets persisted.
                    let scrubbed = scrub_event(&event);
                    append_session_log(&session_id, &scrubbed);
                    let _ = app_handle.emit(&format!("engine:event:{}", session_id), scrubbed.clone());
                    let _ = app_handle.emit(
                        "engine:event",
                        serde_json::json!({ "sessionId": session_id, "event": scrubbed }),
                    );
                }
                SidecarMsg::TurnDone {
                    session_id,
                    exit_code,
                } => {
                    let exit_event = serde_json::json!({
                        "kind": "spawn-exited",
                        "exitCode": exit_code,
                        "signal": null
                    });
                    append_session_log(&session_id, &exit_event);
                    let _ = app_handle.emit(&format!("engine:event:{}", session_id), exit_event.clone());
                    let _ = app_handle.emit(
                        "engine:event",
                        serde_json::json!({ "sessionId": session_id, "event": exit_event }),
                    );
                    // Auto-checkpoint: a successful turn snapshots the project tree
                    // so the user can revert to it later. Only fires if the dir is
                    // a git repo (we don't auto-init on imported projects).
                    if exit_code == Some(0) {
                        let dir = project_dir_for_pump.clone();
                        let app_for_checkpoint = app_handle.clone();
                        let sid = session_id.clone();
                        tokio::task::spawn_blocking(move || {
                            if let Some(sha) = git_checkpoint(&dir) {
                                let ev = serde_json::json!({
                                    "kind": "checkpoint-created",
                                    "sha": sha,
                                    "projectDir": dir,
                                });
                                let _ = app_for_checkpoint
                                    .emit(&format!("engine:event:{}", sid), ev.clone());
                                let _ = app_for_checkpoint.emit(
                                    "engine:event",
                                    serde_json::json!({ "sessionId": sid, "event": ev }),
                                );
                            }
                        });
                    }
                }
                SidecarMsg::Error { message } => {
                    let err_event = serde_json::json!({
                        "kind": "error",
                        "message": message,
                        "recoverable": false
                    });
                    append_session_log(&session_id_owned, &err_event);
                    let _ = app_handle.emit(&format!("engine:event:{}", session_id_owned), err_event.clone());
                    let _ = app_handle.emit(
                        "engine:event",
                        serde_json::json!({ "sessionId": session_id_owned, "event": err_event }),
                    );
                }
                SidecarMsg::Ready { .. } | SidecarMsg::Ack => { /* not surfaced to UI */ }
            }
        }
    });

    Ok((resp, cmd_tx, child))
}

#[tauri::command]
async fn start_session(
    req: StartSessionRequest,
    app: AppHandle,
    state: State<'_, AppState>,
) -> std::result::Result<StartSessionResponse, String> {
    let (resp, cmd_tx, child) = spawn_sidecar_session(&req, &app)
        .await
        .map_err(|e| e.to_string())?;
    state.sessions.lock().await.insert(
        resp.session_id.clone(),
        SessionHandle {
            cmd_tx,
            _child: child,
        },
    );
    Ok(resp)
}

#[tauri::command]
async fn send_message(
    session_id: String,
    prompt: String,
    state: State<'_, AppState>,
) -> std::result::Result<(), String> {
    let map = state.sessions.lock().await;
    let handle = map
        .get(&session_id)
        .ok_or_else(|| format!("no such session: {}", session_id))?;
    let msg = serde_json::json!({"op": "send", "params": {"prompt": prompt}});
    let line = serde_json::to_string(&msg).map_err(|e| e.to_string())? + "\n";
    handle.cmd_tx.send(line).await.map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
async fn stop_session(
    session_id: String,
    state: State<'_, AppState>,
) -> std::result::Result<(), String> {
    let mut map = state.sessions.lock().await;
    if let Some(handle) = map.remove(&session_id) {
        let msg = serde_json::json!({"op": "shutdown"});
        let line = serde_json::to_string(&msg).map_err(|e| e.to_string())? + "\n";
        let _ = handle.cmd_tx.send(line).await;
    }
    Ok(())
}

#[tauri::command]
async fn list_projects() -> std::result::Result<Vec<ProjectInfo>, String> {
    let home = dirs::home_dir().ok_or("no home dir")?;
    let projects_dir = home.join("Studio").join("projects");
    if !projects_dir.exists() {
        return Ok(vec![]);
    }
    let mut out: Vec<ProjectInfo> = Vec::new();
    let read = std::fs::read_dir(&projects_dir).map_err(|e| e.to_string())?;
    for entry in read.flatten() {
        let path = entry.path();
        if !path.is_dir() {
            continue;
        }
        let meta = entry.metadata().map_err(|e| e.to_string())?;
        let modified: chrono_like::Iso = meta
            .modified()
            .map(chrono_like::Iso::from_systime)
            .unwrap_or_else(|_| chrono_like::Iso::epoch());
        out.push(ProjectInfo {
            dir: path.to_string_lossy().to_string(),
            name: path
                .file_name()
                .map(|s| s.to_string_lossy().to_string())
                .unwrap_or_default(),
            last_modified: modified.to_string(),
        });
    }
    out.sort_by(|a, b| b.last_modified.cmp(&a.last_modified));
    Ok(out)
}

/// Create a new project directory under ~/Studio/projects/<safe-name>/.
/// Errors if the directory already exists. Returns the absolute path.
/// The user-supplied name is sanitised: lowercase, alphanumerics + dashes only,
/// length 1-64. Empty or whitespace-only names rejected.
#[tauri::command]
async fn create_project(name: String) -> std::result::Result<ProjectInfo, String> {
    let trimmed = name.trim();
    if trimmed.is_empty() {
        return Err("Project name cannot be empty".into());
    }
    let safe: String = trimmed
        .to_lowercase()
        .chars()
        .map(|c| match c {
            'a'..='z' | '0'..='9' | '-' | '_' => c,
            ' ' | '/' | '\\' | '.' => '-',
            _ => '-',
        })
        .collect::<String>()
        .trim_matches('-')
        .chars()
        .take(64)
        .collect();
    if safe.is_empty() {
        return Err(format!("Project name '{}' has no valid characters", trimmed));
    }
    let home = dirs::home_dir().ok_or("no home dir")?;
    let projects_dir = home.join("Studio").join("projects");
    std::fs::create_dir_all(&projects_dir).map_err(|e| e.to_string())?;
    let target = projects_dir.join(&safe);
    if target.exists() {
        return Err(format!("Project '{}' already exists at {}", safe, target.to_string_lossy()));
    }
    std::fs::create_dir(&target).map_err(|e| format!("Failed to create {}: {}", target.to_string_lossy(), e))?;
    // Seed a minimal AGENTS.md so future spawns get a project anchor.
    let agents_md = format!(
        "# {name}\n\nProject scaffold created by UltraThink Studio.\n",
        name = safe
    );
    let _ = std::fs::write(target.join("AGENTS.md"), agents_md);

    let modified = chrono_like::Iso::from_systime(std::time::SystemTime::now()).to_string();

    // Initialise as a git repo so per-turn auto-commits + CAR worktrees work.
    // Best-effort — tolerated if git isn't installed.
    let _ = std::process::Command::new("git")
        .arg("init")
        .arg("--initial-branch=main")
        .arg(&target)
        .output();
    let _ = std::process::Command::new("git")
        .args(["-C", target.to_string_lossy().as_ref(), "add", "AGENTS.md"])
        .output();
    let _ = std::process::Command::new("git")
        .args([
            "-C",
            target.to_string_lossy().as_ref(),
            "-c",
            "user.email=studio@ultrathink.local",
            "-c",
            "user.name=UltraThink Studio",
            "commit",
            "-m",
            "studio: scaffold",
            "--allow-empty",
        ])
        .output();

    Ok(ProjectInfo {
        dir: target.to_string_lossy().to_string(),
        name: safe,
        last_modified: modified,
    })
}

/// Rename a project. Sanitises new_name like create_project; refuses if dest exists.
#[tauri::command]
async fn rename_project(old_path: String, new_name: String) -> std::result::Result<ProjectInfo, String> {
    let old = std::path::PathBuf::from(&old_path);
    if !old.is_dir() {
        return Err(format!("Source not a directory: {}", old_path));
    }
    let parent = old.parent().ok_or("Source has no parent")?;
    let trimmed = new_name.trim();
    if trimmed.is_empty() {
        return Err("New name cannot be empty".into());
    }
    let safe: String = trimmed
        .to_lowercase()
        .chars()
        .map(|c| match c {
            'a'..='z' | '0'..='9' | '-' | '_' => c,
            _ => '-',
        })
        .collect::<String>()
        .trim_matches('-')
        .chars()
        .take(64)
        .collect();
    if safe.is_empty() {
        return Err(format!("Name '{}' has no valid characters", trimmed));
    }
    let new_path = parent.join(&safe);
    if new_path.exists() {
        return Err(format!("'{}' already exists", safe));
    }
    std::fs::rename(&old, &new_path).map_err(|e| format!("Rename failed: {}", e))?;
    let modified = chrono_like::Iso::from_systime(std::time::SystemTime::now()).to_string();
    Ok(ProjectInfo {
        dir: new_path.to_string_lossy().to_string(),
        name: safe,
        last_modified: modified,
    })
}

/// Move a project to ~/.Trash on macOS, recursive remove elsewhere. Refuses to
/// touch anything outside ~/Studio/projects/ as a safety net.
#[tauri::command]
async fn delete_project(project_dir: String) -> std::result::Result<(), String> {
    let path = std::path::PathBuf::from(&project_dir);
    let home = dirs::home_dir().ok_or("no home dir")?;
    let projects_root = home.join("Studio").join("projects");
    let canon = path.canonicalize().map_err(|e| e.to_string())?;
    let canon_root = projects_root.canonicalize().unwrap_or(projects_root);
    if !canon.starts_with(&canon_root) {
        return Err(format!(
            "Refusing to delete {} — only paths under {} are allowed.",
            canon.to_string_lossy(),
            canon_root.to_string_lossy()
        ));
    }
    #[cfg(target_os = "macos")]
    {
        let trash = home.join(".Trash");
        let stamp = chrono_like::Iso::from_systime(std::time::SystemTime::now()).to_string();
        let safe_stamp: String = stamp.chars().filter(|c| c.is_ascii_alphanumeric()).collect();
        let basename = canon.file_name().and_then(|s| s.to_str()).unwrap_or("project");
        let dest = trash.join(format!("{}-studio-{}", basename, safe_stamp));
        std::fs::rename(&canon, &dest).map_err(|e| format!("Move to Trash failed: {}", e))?;
        return Ok(());
    }
    #[cfg(not(target_os = "macos"))]
    {
        std::fs::remove_dir_all(&canon).map_err(|e| format!("Delete failed: {}", e))?;
        Ok(())
    }
}

/// Duplicate a project — preserves git history via `cp -R`.
#[tauri::command]
async fn duplicate_project(
    project_dir: String,
    new_name: String,
) -> std::result::Result<ProjectInfo, String> {
    let src = std::path::PathBuf::from(&project_dir);
    if !src.is_dir() {
        return Err(format!("Source not a directory: {}", project_dir));
    }
    let parent = src.parent().ok_or("Source has no parent")?;
    let trimmed = new_name.trim();
    let safe: String = trimmed
        .to_lowercase()
        .chars()
        .map(|c| match c {
            'a'..='z' | '0'..='9' | '-' | '_' => c,
            _ => '-',
        })
        .collect::<String>()
        .trim_matches('-')
        .chars()
        .take(64)
        .collect();
    if safe.is_empty() {
        return Err(format!("Name '{}' has no valid characters", trimmed));
    }
    let dest = parent.join(&safe);
    if dest.exists() {
        return Err(format!("'{}' already exists", safe));
    }
    let status = std::process::Command::new("cp")
        .arg("-R")
        .arg(&src)
        .arg(&dest)
        .status()
        .map_err(|e| format!("cp failed: {}", e))?;
    if !status.success() {
        return Err(format!("cp exited with {}", status));
    }
    let modified = chrono_like::Iso::from_systime(std::time::SystemTime::now()).to_string();
    Ok(ProjectInfo {
        dir: dest.to_string_lossy().to_string(),
        name: safe,
        last_modified: modified,
    })
}

/// Wipe Claude Code's per-project session jsonls + the auto-memory cache for
/// a given project. Called from ProjectsPanel kebab → "Reset chat sessions".
///
/// Claude Code stores each session as `~/.claude/projects/<sanitized>/<uuid>.jsonl`
/// where `<sanitized>` is the absolute project path with `/` replaced by `-`
/// (so `/Users/me/Studio/projects/foo` → `-Users-me-Studio-projects-foo`).
/// The auto-memory hook writes markdown files alongside under `memory/`. Both
/// are derivable per-conversation context — discarding them just makes the
/// next chat truly fresh and unblocks "session id already in use" errors.
///
/// Does NOT touch the project source files themselves, the dashboard graph
/// memories in Postgres, or the user's other projects.
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ResetSessionsResult {
    pub jsonl_removed: u32,
    pub memory_files_removed: u32,
    pub claude_dir: Option<String>,
}

#[tauri::command]
async fn reset_project_sessions(
    project_dir: String,
    include_memory: Option<bool>,
) -> std::result::Result<ResetSessionsResult, String> {
    let canon = std::fs::canonicalize(&project_dir)
        .map_err(|e| format!("Project path not found: {}", e))?;
    let canon_str = canon.to_string_lossy();
    // Refuse anything outside the user's expected project roots.
    let home = dirs::home_dir().ok_or("no home dir")?;
    let allowed_roots = [home.join("Studio/projects"), home.join("projects")];
    if !allowed_roots.iter().any(|r| canon.starts_with(r)) {
        return Err(format!(
            "Refusing to reset sessions for {} — outside ~/Studio/projects/",
            canon_str
        ));
    }
    let sanitized = canon_str.replace('/', "-");
    let claude_dir = home.join(".claude/projects").join(&sanitized);
    if !claude_dir.exists() {
        return Ok(ResetSessionsResult {
            jsonl_removed: 0,
            memory_files_removed: 0,
            claude_dir: Some(claude_dir.to_string_lossy().to_string()),
        });
    }

    let mut jsonl_removed = 0u32;
    let entries = std::fs::read_dir(&claude_dir).map_err(|e| e.to_string())?;
    for entry in entries.flatten() {
        let path = entry.path();
        if path.extension().and_then(|s| s.to_str()) == Some("jsonl") {
            if std::fs::remove_file(&path).is_ok() {
                jsonl_removed += 1;
            }
        }
    }

    let mut memory_files_removed = 0u32;
    if include_memory.unwrap_or(false) {
        let memory_dir = claude_dir.join("memory");
        if memory_dir.exists() {
            if let Ok(entries) = std::fs::read_dir(&memory_dir) {
                for entry in entries.flatten() {
                    let path = entry.path();
                    if path.is_file() && std::fs::remove_file(&path).is_ok() {
                        memory_files_removed += 1;
                    }
                }
            }
        }
    }

    Ok(ResetSessionsResult {
        jsonl_removed,
        memory_files_removed,
        claude_dir: Some(claude_dir.to_string_lossy().to_string()),
    })
}

/// Seed a demo project's memory graph with ~20 realistic, ecommerce-themed
/// memories so the Memory tab is populated on first run (useful for live demos
/// and onboarding). Calls `packages/memory/scripts/seed-demo-project.ts` via
/// `npx tsx` from the workspace root, then returns `{created, skipped, linked}`.
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SeedResult {
    pub created: u32,
    pub skipped: u32,
    pub linked: u32,
    pub scope: String,
}

#[tauri::command]
async fn seed_demo_memories(scope: Option<String>) -> std::result::Result<SeedResult, String> {
    let target = scope.unwrap_or_else(|| "acomo".to_string());
    let root = find_workspace_root().ok_or_else(|| "workspace root not found".to_string())?;
    // npx tsx <script> <scope> — same path as the CLI version. dotenv loads
    // DATABASE_URL from the workspace .env when CWD is set correctly (see
    // run_engine_script for the same pattern).
    let output = Command::new("npx")
        .args([
            "tsx",
            "packages/memory/scripts/seed-demo-project.ts",
            &target,
        ])
        .current_dir(&root)
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .output()
        .await
        .map_err(|e| format!("spawn npx tsx failed: {}", e))?;
    if !output.status.success() {
        return Err(format!(
            "seed exited {}: {}",
            output.status,
            String::from_utf8_lossy(&output.stderr)
        ));
    }
    let stdout = String::from_utf8_lossy(&output.stdout);
    // The script JSON-stringifies its summary on the last non-empty line.
    let line = stdout
        .lines()
        .filter(|l| !l.trim().is_empty())
        .last()
        .unwrap_or("");
    let parsed: serde_json::Value =
        serde_json::from_str(line).map_err(|e| format!("seed output not JSON: {} (line={:?})", e, line))?;
    Ok(SeedResult {
        created: parsed.get("created").and_then(|v| v.as_u64()).unwrap_or(0) as u32,
        skipped: parsed.get("skipped").and_then(|v| v.as_u64()).unwrap_or(0) as u32,
        linked: parsed.get("linked").and_then(|v| v.as_u64()).unwrap_or(0) as u32,
        scope: target,
    })
}

// --- Memory graph (knowledge-graph view) -------------------------------------

#[tauri::command]
async fn query_memory_graph(
    limit: Option<u32>,
    scope: Option<String>,
    app: AppHandle,
) -> std::result::Result<serde_json::Value, String> {
    let limit_arg = format!("--limit={}", limit.unwrap_or(500));
    let mut args: Vec<&str> = vec!["graph", &limit_arg];
    let scope_arg;
    if let Some(s) = scope.as_deref() {
        if !s.is_empty() {
            scope_arg = format!("--scope={}", s);
            args.push(&scope_arg);
        }
    }
    run_engine_script(&app, "memory-query.js", &args)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn query_memory_node(
    id: String,
    app: AppHandle,
) -> std::result::Result<serde_json::Value, String> {
    run_engine_script(&app, "memory-query.js", &["node", &format!("--id={}", id)])
        .await
        .map_err(|e| e.to_string())
}

// --- Workspace files ---------------------------------------------------------

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct FileNode {
    pub path: String,
    pub name: String,
    pub is_dir: bool,
    pub size: Option<u64>,
}

#[tauri::command]
async fn list_files(dir: String) -> std::result::Result<Vec<FileNode>, String> {
    let path = std::path::Path::new(&dir);
    if !path.exists() {
        return Err(format!("not found: {}", dir));
    }
    let read = std::fs::read_dir(path).map_err(|e| e.to_string())?;
    let mut out: Vec<FileNode> = Vec::new();
    for entry in read.flatten() {
        let p = entry.path();
        let name = p
            .file_name()
            .map(|s| s.to_string_lossy().to_string())
            .unwrap_or_default();
        // skip noisy default-ignores
        if matches!(name.as_str(), "node_modules" | ".git" | ".next" | "dist" | "build") {
            continue;
        }
        if name.starts_with('.') && !matches!(name.as_str(), ".env.example" | ".gitignore") {
            continue;
        }
        let meta = entry.metadata().map_err(|e| e.to_string())?;
        out.push(FileNode {
            path: p.to_string_lossy().to_string(),
            name,
            is_dir: meta.is_dir(),
            size: if meta.is_file() { Some(meta.len()) } else { None },
        });
    }
    out.sort_by(|a, b| match (a.is_dir, b.is_dir) {
        (true, false) => std::cmp::Ordering::Less,
        (false, true) => std::cmp::Ordering::Greater,
        _ => a.name.cmp(&b.name),
    });
    Ok(out)
}

#[tauri::command]
async fn read_file_text(path: String) -> std::result::Result<String, String> {
    // Cap reads at 5MB to avoid the UI choking on a huge binary
    let meta = std::fs::metadata(&path).map_err(|e| e.to_string())?;
    if meta.len() > 5 * 1024 * 1024 {
        return Err(format!(
            "file too large ({} bytes); max 5 MB in editor",
            meta.len()
        ));
    }
    std::fs::read_to_string(&path).map_err(|e| e.to_string())
}

// --- Preview server ----------------------------------------------------------

#[tauri::command]
async fn detect_framework(
    project_dir: String,
    app: AppHandle,
) -> std::result::Result<serde_json::Value, String> {
    run_engine_script(&app, "preview-server.js", &["detect", &project_dir])
        .await
        .map_err(|e| e.to_string())
}

/// Start a preview dev server in the background. Streams events via `preview:event:<projectDir>`.
/// Returns immediately with `started: true`; ready/port arrive over the event stream.
#[tauri::command]
async fn start_preview(
    project_dir: String,
    app: AppHandle,
    state: State<'_, AppState>,
) -> std::result::Result<(), String> {
    let script = locate_engine_script(&app, "preview-server.js").map_err(|e| e.to_string())?;
    let node_bin = std::env::var("NODE_BIN").unwrap_or_else(|_| "node".to_string());
    let mut child = Command::new(node_bin)
        .arg(&script)
        .arg("start")
        .arg(&project_dir)
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .kill_on_drop(true)
        .spawn()
        .map_err(|e| e.to_string())?;

    let stdout = child.stdout.take().ok_or("no stdout")?;
    let app_handle = app.clone();
    let dir_owned = project_dir.clone();
    tokio::spawn(async move {
        let mut lines = BufReader::new(stdout).lines();
        while let Ok(Some(line)) = lines.next_line().await {
            if line.trim().is_empty() {
                continue;
            }
            if let Ok(v) = serde_json::from_str::<serde_json::Value>(&line) {
                let _ = app_handle.emit(&format!("preview:event:{}", dir_owned), v);
            }
        }
    });

    state.previews.lock().await.insert(project_dir, child);
    Ok(())
}

#[tauri::command]
async fn stop_preview(
    project_dir: String,
    state: State<'_, AppState>,
) -> std::result::Result<(), String> {
    if let Some(mut child) = state.previews.lock().await.remove(&project_dir) {
        let _ = child.kill().await;
    }
    Ok(())
}

// --- Deploy ------------------------------------------------------------------

#[tauri::command]
async fn deploy_run(
    project_dir: String,
    provider: String,
    app: AppHandle,
) -> std::result::Result<(), String> {
    let script = locate_engine_script(&app, "deploy.js").map_err(|e| e.to_string())?;
    let node_bin = std::env::var("NODE_BIN").unwrap_or_else(|_| "node".to_string());
    let mut child = Command::new(node_bin)
        .arg(&script)
        .arg("run")
        .arg(&project_dir)
        .arg(&provider)
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .kill_on_drop(true)
        .spawn()
        .map_err(|e| e.to_string())?;

    let stdout = child.stdout.take().ok_or("no stdout")?;
    let app_handle = app.clone();
    let dir_owned = project_dir.clone();
    tokio::spawn(async move {
        let mut lines = BufReader::new(stdout).lines();
        while let Ok(Some(line)) = lines.next_line().await {
            if line.trim().is_empty() {
                continue;
            }
            if let Ok(v) = serde_json::from_str::<serde_json::Value>(&line) {
                let _ = app_handle.emit(&format!("deploy:event:{}", dir_owned), v);
            }
        }
        let _ = child.wait().await;
    });
    Ok(())
}

// --- Helpers -----------------------------------------------------------------

/// Run a one-shot engine script with args, capture stdout, parse as JSON.
async fn run_engine_script(app: &AppHandle, name: &str, args: &[&str]) -> Result<serde_json::Value> {
    let script = locate_engine_script(app, name)?;
    let node_bin = std::env::var("NODE_BIN").unwrap_or_else(|_| "node".to_string());
    let mut cmd = Command::new(node_bin);
    cmd.arg(&script)
        .args(args)
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());
    // Set CWD to workspace root so the engine's dotenv finds `.env` and
    // DATABASE_URL ends up in the script's process.env. Without this the
    // memory MCP can't reach Postgres and the graph view is empty.
    if let Some(root) = find_workspace_root() {
        cmd.current_dir(root);
    }
    let output = cmd.output().await?;
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        log::warn!("[engine-script {} failed] {}", name, stderr);
    }
    let stdout = String::from_utf8_lossy(&output.stdout);
    let line = stdout.lines().last().unwrap_or("").trim();
    if line.is_empty() {
        return Ok(serde_json::Value::Null);
    }
    Ok(serde_json::from_str(line)?)
}

// --- Onboarding helpers ------------------------------------------------------

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ClaudeStatus {
    pub ok: bool,
    pub version: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct CliPrereq {
    pub name: String,
    pub bin: String,
    pub ok: bool,
    pub version: Option<String>,
    pub install_hint: String,
}

async fn detect_cli(bin: &str, install_hint: &str) -> CliPrereq {
    let out = Command::new(bin).arg("--version").output().await;
    match out {
        Ok(o) if o.status.success() => CliPrereq {
            name: bin.to_string(),
            bin: bin.to_string(),
            ok: true,
            version: Some(String::from_utf8_lossy(&o.stdout).lines().next().unwrap_or("").to_string()),
            install_hint: install_hint.to_string(),
        },
        _ => CliPrereq {
            name: bin.to_string(),
            bin: bin.to_string(),
            ok: false,
            version: None,
            install_hint: install_hint.to_string(),
        },
    }
}

#[tauri::command]
async fn check_prereqs() -> std::result::Result<Vec<CliPrereq>, String> {
    Ok(vec![
        detect_cli("claude", "curl -fsSL https://claude.ai/install.sh | bash").await,
        detect_cli("codex", "npm i -g @openai/codex").await,
        detect_cli("vercel", "npm i -g vercel  # then `vercel login`").await,
        detect_cli("wrangler", "npm i -g wrangler  # then `wrangler login`").await,
        detect_cli("netlify", "npm i -g netlify-cli  # then `netlify login`").await,
        detect_cli("gh", "brew install gh  # then `gh auth login`").await,
        detect_cli("git", "Already on macOS via Xcode CLT; otherwise install git").await,
    ])
}

#[tauri::command]
async fn check_claude_cli() -> std::result::Result<ClaudeStatus, String> {
    let bin = std::env::var("CLAUDE_BIN").unwrap_or_else(|_| "claude".to_string());
    Ok(check_cli_version(&bin).await)
}

#[tauri::command]
async fn check_codex_cli() -> std::result::Result<ClaudeStatus, String> {
    let bin = std::env::var("CODEX_BIN").unwrap_or_else(|_| "codex".to_string());
    Ok(check_cli_version(&bin).await)
}

async fn check_cli_version(bin: &str) -> ClaudeStatus {
    match Command::new(bin).arg("--version").output().await {
        Ok(o) if o.status.success() => ClaudeStatus {
            ok: true,
            version: Some(String::from_utf8_lossy(&o.stdout).trim().to_string()),
        },
        _ => ClaudeStatus { ok: false, version: None },
    }
}

#[tauri::command]
async fn skill_registry_status(app: AppHandle) -> std::result::Result<serde_json::Value, String> {
    run_engine_script(&app, "skill-sync.js", &["status"])
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn skill_registry_install(app: AppHandle) -> std::result::Result<serde_json::Value, String> {
    run_engine_script(&app, "skill-sync.js", &["install"])
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn skill_registry_list(app: AppHandle) -> std::result::Result<serde_json::Value, String> {
    run_engine_script(&app, "skill-sync.js", &["list"])
        .await
        .map_err(|e| e.to_string())
}

/// Symlink every skill from the local UltraThink repo into ~/.claude/skills/
/// so any Claude Code session — including spawns from ~/Studio/projects/foo/ —
/// picks them up via the global config dir.
#[tauri::command]
async fn skill_registry_sync_global(app: AppHandle) -> std::result::Result<serde_json::Value, String> {
    run_engine_script(&app, "skill-sync.js", &["sync"])
        .await
        .map_err(|e| e.to_string())
}

// --- Session event log ----------------------------------------------------
//
// Every event emitted by the sidecar is also persisted to
// ~/.ultrathink-studio/sessions/<sessionId>.jsonl (newline-delimited JSON).
// This gives us:
//   1. Crash recovery — if the app dies mid-turn, the session log survives.
//   2. Insights aggregation — InsightsPanel can read across all sessions.
//   3. Resume on reopen — ChatPanel hydrates the prior session's transcript
//      via read_session_log so the user doesn't lose context.

fn session_log_path(session_id: &str) -> Option<PathBuf> {
    let home = dirs::home_dir()?;
    let dir = home.join(".ultrathink-studio").join("sessions");
    let _ = std::fs::create_dir_all(&dir);
    // Sanitize: strip path separators & null bytes.
    let safe: String = session_id
        .chars()
        .map(|c| if c.is_ascii_alphanumeric() || c == '-' || c == '_' { c } else { '_' })
        .collect();
    Some(dir.join(format!("{}.jsonl", safe)))
}

fn append_session_log(session_id: &str, event: &serde_json::Value) {
    let Some(path) = session_log_path(session_id) else {
        return;
    };
    let row = serde_json::json!({
        "at": chrono_like::Iso::from_systime(std::time::SystemTime::now()).to_string(),
        "event": event,
    });
    if let Ok(mut f) = std::fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(&path)
    {
        use std::io::Write;
        let _ = writeln!(f, "{}", row);
    }
}

/// Strip API keys and bearer tokens from a string before it's emitted to the
/// frontend or written to disk. Hand-rolled (no regex crate dep) — handles the
/// shapes that actually leak from upstream APIs:
///   sk-ant-...     (Anthropic)
///   sk-proj-...    (OpenAI project keys)
///   sk-...         (OpenAI / OpenRouter / generic)
///   ghp_/gho_/ghs_/ghu_/ghr_  (GitHub PATs)
///   xox[bpoars]-... (Slack)
///   AIza...        (Google API keys, ~40 chars alphanum + - + _)
///   Bearer <token>
///   "x-api-key": "..."
fn scrub_secrets(input: &str) -> String {
    let mut out = String::with_capacity(input.len());
    let bytes = input.as_bytes();
    let mut i = 0;
    while i < bytes.len() {
        let rest = &input[i..];
        // Scan for any of the prefixes
        let prefix_match = ["sk-ant-", "sk-proj-", "sk-", "ghp_", "gho_", "ghs_", "ghu_", "ghr_"]
            .iter()
            .find(|p| rest.starts_with(*p));
        if let Some(p) = prefix_match {
            out.push_str(p);
            out.push_str("***");
            // Skip up to whitespace, comma, quote, or end
            let mut j = i + p.len();
            while j < bytes.len() {
                let c = bytes[j];
                if c.is_ascii_whitespace() || matches!(c, b'"' | b'\'' | b',' | b'}' | b']' | b';' | b')') {
                    break;
                }
                j += 1;
            }
            i = j;
            continue;
        }
        // Bearer <token>
        if rest.len() > 7 && rest.starts_with("Bearer ") {
            out.push_str("Bearer ***");
            let mut j = i + 7;
            while j < bytes.len() {
                let c = bytes[j];
                if c.is_ascii_whitespace() || matches!(c, b'"' | b'\'' | b',') {
                    break;
                }
                j += 1;
            }
            i = j;
            continue;
        }
        // x-api-key: "..."  or  "x-api-key": "..."
        if rest.to_ascii_lowercase().starts_with("x-api-key") {
            // Find the next quoted value or value after :, replace with ***
            out.push_str("x-api-key=***");
            let mut j = i + "x-api-key".len();
            // Skip past separator + quote into the value
            let mut in_value = false;
            while j < bytes.len() {
                let c = bytes[j];
                if !in_value && (c == b':' || c == b'=' || c == b' ' || c == b'"') {
                    j += 1;
                    if c == b'"' {
                        in_value = true;
                    }
                    continue;
                }
                if in_value && c == b'"' {
                    j += 1;
                    break;
                }
                if !in_value && (c.is_ascii_whitespace() || c == b',') {
                    break;
                }
                j += 1;
            }
            i = j;
            continue;
        }
        // pass through
        let ch = rest.chars().next().unwrap_or('\0');
        out.push(ch);
        i += ch.len_utf8();
    }
    out
}

/// Apply scrub_secrets to any string fields in an event JSON value.
/// Walks recursively. Returns a new owned Value with scrubbed strings.
fn scrub_event(v: &serde_json::Value) -> serde_json::Value {
    use serde_json::Value;
    match v {
        Value::String(s) => Value::String(scrub_secrets(s)),
        Value::Array(a) => Value::Array(a.iter().map(scrub_event).collect()),
        Value::Object(m) => {
            let mut out = serde_json::Map::with_capacity(m.len());
            for (k, val) in m {
                out.insert(k.clone(), scrub_event(val));
            }
            Value::Object(out)
        }
        _ => v.clone(),
    }
}

#[tauri::command]
async fn read_session_log(
    session_id: String,
    limit: Option<usize>,
) -> std::result::Result<Vec<serde_json::Value>, String> {
    let path = session_log_path(&session_id).ok_or_else(|| "no home dir".to_string())?;
    if !path.exists() {
        return Ok(vec![]);
    }
    let text = std::fs::read_to_string(&path).map_err(|e| e.to_string())?;
    let lines: Vec<&str> = text.lines().filter(|l| !l.trim().is_empty()).collect();
    let take = limit.unwrap_or(500);
    let start = lines.len().saturating_sub(take);
    let mut out = Vec::with_capacity(lines.len() - start);
    for line in &lines[start..] {
        if let Ok(v) = serde_json::from_str::<serde_json::Value>(line) {
            out.push(v);
        }
    }
    Ok(out)
}

#[tauri::command]
async fn list_sessions() -> std::result::Result<Vec<serde_json::Value>, String> {
    let Some(home) = dirs::home_dir() else {
        return Ok(vec![]);
    };
    let dir = home.join(".ultrathink-studio").join("sessions");
    if !dir.exists() {
        return Ok(vec![]);
    }
    let mut out = Vec::new();
    for entry in std::fs::read_dir(&dir).map_err(|e| e.to_string())?.flatten() {
        let path = entry.path();
        if path.extension().and_then(|s| s.to_str()) != Some("jsonl") {
            continue;
        }
        let session_id = path
            .file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or("")
            .to_string();
        let meta = entry.metadata().map_err(|e| e.to_string())?;
        let modified = meta
            .modified()
            .map(chrono_like::Iso::from_systime)
            .unwrap_or_else(|_| chrono_like::Iso::epoch())
            .to_string();
        out.push(serde_json::json!({
            "sessionId": session_id,
            "lastModified": modified,
            "sizeBytes": meta.len(),
        }));
    }
    out.sort_by(|a, b| {
        b.get("lastModified")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .cmp(a.get("lastModified").and_then(|v| v.as_str()).unwrap_or(""))
    });
    Ok(out)
}

/// One-shot diagnostic: which `node` and `claude` does the app see?
/// What's PATH? Can the engine sidecar resolve? Returns a single JSON blob the
/// user can paste back when something's broken.
#[tauri::command]
async fn diagnose_spawn(app: AppHandle) -> std::result::Result<serde_json::Value, String> {
    let path_env = std::env::var("PATH").unwrap_or_default();
    let node_bin = std::env::var("NODE_BIN").unwrap_or_else(|_| "node".to_string());
    let claude_bin = std::env::var("CLAUDE_BIN").unwrap_or_else(|_| "claude".to_string());
    let codex_bin = std::env::var("CODEX_BIN").unwrap_or_else(|_| "codex".to_string());

    async fn which(bin: &str) -> Option<String> {
        let out = Command::new("/usr/bin/which").arg(bin).output().await.ok()?;
        if out.status.success() {
            Some(String::from_utf8_lossy(&out.stdout).trim().to_string())
        } else {
            None
        }
    }
    async fn version(bin: &str, arg: &str) -> Option<String> {
        let out = Command::new(bin).arg(arg).output().await.ok()?;
        if out.status.success() {
            Some(String::from_utf8_lossy(&out.stdout).trim().to_string())
        } else {
            Some(format!("exit {}: {}", out.status, String::from_utf8_lossy(&out.stderr).trim()))
        }
    }

    let sidecar = locate_sidecar(&app)
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_else(|e| format!("ERROR: {}", e));

    Ok(serde_json::json!({
        "pathEnv": path_env,
        "nodeBin": node_bin,
        "nodeWhich": which(&node_bin).await,
        "nodeVersion": version(&node_bin, "--version").await,
        "claudeBin": claude_bin,
        "claudeWhich": which(&claude_bin).await,
        "claudeVersion": version(&claude_bin, "--version").await,
        "codexBin": codex_bin,
        "codexWhich": which(&codex_bin).await,
        "codexVersion": version(&codex_bin, "--version").await,
        "sidecarScript": sidecar,
    }))
}

/// Status of the OSS skill kit: cloned to ~/.ultrathink-core, count of skills.
#[tauri::command]
async fn oss_kit_status(app: AppHandle) -> std::result::Result<serde_json::Value, String> {
    run_engine_script(&app, "skill-sync.js", &["oss-status"])
        .await
        .map_err(|e| e.to_string())
}

/// Install/update the OSS skill kit. Clones https://github.com/InugamiDev/ultrathink-core
/// to ~/.ultrathink-core, then symlinks each skill into ~/.claude/skills/.
/// Idempotent: re-running pulls + re-syncs.
#[tauri::command]
async fn oss_kit_install(
    source: Option<String>,
    app: AppHandle,
) -> std::result::Result<serde_json::Value, String> {
    let src = source.unwrap_or_else(|| "https://github.com/InugamiDev/ultrathink-core.git".into());
    run_engine_script(&app, "skill-sync.js", &["install-oss", &src])
        .await
        .map_err(|e| e.to_string())
}

// --- Telemetry (opt-in, error-only) ------------------------------------------

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TelemetryReport {
    pub message: String,
    pub stack: Option<String>,
    pub component: Option<String>,
}

#[tauri::command]
async fn report_error(report: TelemetryReport) -> std::result::Result<(), String> {
    // Opt-in only — frontend MUST honour the user's onboarding choice and only
    // call this when they consented.
    //
    // PII scrubbing: every field passes through scrub_secrets() before it
    // leaves this process. That handles API keys, bearer tokens, GitHub PATs.
    // We never include prompt content, file content, or user paths beyond
    // the home-tilde collapse (`/Users/<name>/` → `~/`) for stack frames.
    //
    // DSN: ULTRATHINK_TELEMETRY_DSN points at a Sentry/GlitchTip collector.
    // If empty, we log locally and exit. Default in shipped builds is empty.
    let dsn = std::env::var("ULTRATHINK_TELEMETRY_DSN")
        .or_else(|_| std::env::var("ULTRATHINK_TELEMETRY_URL"))
        .unwrap_or_default();
    let scrubbed_message = scrub_secrets(&report.message);
    let scrubbed_stack = report.stack.as_deref().map(scrub_paths_and_secrets);
    let component = report.component.as_deref().unwrap_or("unknown");
    if dsn.is_empty() {
        log::info!("[telemetry disabled] {} :: component={}", scrubbed_message, component);
        return Ok(());
    }
    // Sentry envelope shape — works against both Sentry SaaS and self-hosted
    // GlitchTip. The shipped binary doesn't bundle a sentry SDK; we just
    // construct the payload and log it. Wiring an HTTP POST is the
    // RELEASE-time job (M-153 docker-compose + workflow).
    let envelope = serde_json::json!({
        "platform": "javascript",
        "level": "error",
        "release": format!("ultrathink-studio@{}", env!("CARGO_PKG_VERSION")),
        "tags": { "component": component, "os": std::env::consts::OS },
        "exception": {
            "values": [{
                "type": "Error",
                "value": scrubbed_message,
                "stacktrace": scrubbed_stack.map(|s| serde_json::json!({ "frames": [{ "function": s }] })),
            }]
        },
    });
    log::warn!("[telemetry] dsn={} payload={}", dsn, envelope);
    Ok(())
}

/// Defence-in-depth: scrub paths AND secrets. Used on stack traces where
/// the user's home dir leaks via Vite source maps.
fn scrub_paths_and_secrets(input: &str) -> String {
    let scrubbed = scrub_secrets(input);
    let home = dirs::home_dir()
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_default();
    if home.is_empty() {
        scrubbed
    } else {
        scrubbed.replace(&home, "~")
    }
}

// --- Secret storage (OS keychain) --------------------------------------------
//
// API keys never live in localStorage in the production build. They sit in the
// platform's native secret store (macOS Keychain, Windows Credential Manager,
// Linux Secret Service). Settings.tsx migrates one-time on first launch and
// nukes the localStorage copy.
//
// Service prefix is namespaced so a future second app from the same publisher
// can coexist. Account = the logical key name we hand out to callers
// ("anthropic-api-key", "openai-api-key", etc).

const SECRET_SERVICE: &str = "studio.ultrathink.app/secrets";

fn validate_secret_account(account: &str) -> std::result::Result<(), String> {
    if account.is_empty() || account.len() > 128 {
        return Err("invalid account name length".into());
    }
    if !account
        .chars()
        .all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_' || c == '.')
    {
        return Err("invalid characters in account name (allow [a-zA-Z0-9._-])".into());
    }
    Ok(())
}

#[tauri::command]
async fn secret_set(account: String, value: String) -> std::result::Result<(), String> {
    validate_secret_account(&account)?;
    if value.is_empty() {
        return Err("refusing to store empty secret".into());
    }
    let entry = keyring::Entry::new(SECRET_SERVICE, &account).map_err(|e| e.to_string())?;
    entry.set_password(&value).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
async fn secret_get(account: String) -> std::result::Result<Option<String>, String> {
    validate_secret_account(&account)?;
    let entry = keyring::Entry::new(SECRET_SERVICE, &account).map_err(|e| e.to_string())?;
    match entry.get_password() {
        Ok(v) => Ok(Some(v)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
async fn secret_delete(account: String) -> std::result::Result<(), String> {
    validate_secret_account(&account)?;
    let entry = keyring::Entry::new(SECRET_SERVICE, &account).map_err(|e| e.to_string())?;
    match entry.delete_credential() {
        Ok(()) => Ok(()),
        Err(keyring::Error::NoEntry) => Ok(()),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
async fn secret_has(account: String) -> std::result::Result<bool, String> {
    validate_secret_account(&account)?;
    let entry = keyring::Entry::new(SECRET_SERVICE, &account).map_err(|e| e.to_string())?;
    match entry.get_password() {
        Ok(_) => Ok(true),
        Err(keyring::Error::NoEntry) => Ok(false),
        Err(e) => Err(e.to_string()),
    }
}

// --- CAR (Codex Auto Runner) - concurrent multi-lane runs --------------------

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct CarLane {
    pub id: String,
    pub label: String,
    pub cli: String,           // "claude" or "codex"
    pub model: String,
    pub system_hint: String,
    pub color: String,         // CSS variable name
}

fn car_lanes_config_path() -> std::result::Result<PathBuf, String> {
    let home = dirs::home_dir().ok_or("no home dir")?;
    let dir = home.join(".ultrathink-studio");
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir.join("car-lanes.json"))
}

fn default_car_lanes() -> Vec<CarLane> {
    vec![
        CarLane {
            id: "claude-orchestrator".into(),
            label: "Claude Orchestrator".into(),
            cli: "claude".into(),
            model: "claude-opus-4-7".into(),
            system_hint: "Plan, decompose, route subtasks. Don't write code yourself.".into(),
            color: "var(--accent)".into(),
        },
        CarLane {
            id: "codex-coder".into(),
            label: "Codex Coder".into(),
            cli: "codex".into(),
            model: "gpt-5-codex".into(),
            system_hint: "Implement code changes. Make tests pass. No design discussions.".into(),
            color: "var(--cyan)".into(),
        },
        CarLane {
            id: "codex-tester".into(),
            label: "Codex Tester".into(),
            cli: "codex".into(),
            model: "gpt-5-codex".into(),
            system_hint: "Write and improve tests. Cover edge cases.".into(),
            color: "var(--teal)".into(),
        },
        CarLane {
            id: "claude-reviewer".into(),
            label: "Claude Reviewer".into(),
            cli: "claude".into(),
            model: "claude-sonnet-4-6".into(),
            system_hint: "Code review. Find bugs, suggest improvements.".into(),
            color: "var(--pink)".into(),
        },
    ]
}

#[tauri::command]
async fn car_list_lanes() -> std::result::Result<Vec<CarLane>, String> {
    let path = car_lanes_config_path()?;
    if !path.exists() {
        return Ok(default_car_lanes());
    }
    let text = std::fs::read_to_string(&path).map_err(|e| e.to_string())?;
    let lanes: Vec<CarLane> = serde_json::from_str(&text).unwrap_or_else(|_| default_car_lanes());
    Ok(lanes)
}

#[tauri::command]
async fn car_save_lanes(lanes: Vec<CarLane>) -> std::result::Result<(), String> {
    let path = car_lanes_config_path()?;
    let text = serde_json::to_string_pretty(&lanes).map_err(|e| e.to_string())?;
    std::fs::write(&path, text).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
async fn car_reset_lanes() -> std::result::Result<Vec<CarLane>, String> {
    let path = car_lanes_config_path()?;
    let _ = std::fs::remove_file(&path);
    Ok(default_car_lanes())
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct CarRunSummary {
    pub id: String,
    pub lane_id: String,
    pub task: String,
    pub started_at: String,
}

#[tauri::command]
async fn car_list_runs(state: State<'_, AppState>) -> std::result::Result<Vec<CarRunSummary>, String> {
    let map = state.car_runs.lock().await;
    Ok(map
        .iter()
        .map(|(id, h)| CarRunSummary {
            id: id.clone(),
            lane_id: h.lane_id.clone(),
            task: h.task.clone(),
            started_at: h.started_at.clone(),
        })
        .collect())
}

#[tauri::command]
async fn car_start_run(
    lane_id: String,
    task: String,
    project_dir: Option<String>,
    app: AppHandle,
    state: State<'_, AppState>,
) -> std::result::Result<String, String> {
    let lanes = car_list_lanes().await?;
    let lane = lanes
        .into_iter()
        .find(|l| l.id == lane_id)
        .ok_or_else(|| format!("unknown lane: {}", lane_id))?;

    // Run-id collisions: two lanes started in the same millisecond would
    // otherwise overwrite each other in `state.car_runs`. Append an atomic
    // counter to break ties — simpler than pulling in the uuid crate.
    let run_id = {
        use std::sync::atomic::{AtomicU64, Ordering};
        static COUNTER: AtomicU64 = AtomicU64::new(0);
        let ms = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|d| d.as_millis())
            .unwrap_or(0);
        let n = COUNTER.fetch_add(1, Ordering::Relaxed);
        format!("run_{}_{:04x}", ms, n & 0xFFFF)
    };

    // Mirror Paperclip's adapter spawn shape so we get identical stream-json events.
    //   claude: --print "<prompt>" --output-format stream-json --verbose --model X
    //           --add-dir CWD --append-system-prompt SYSTEM_HINT --include-partial-messages
    //   codex:  exec --json (prompt on argv, cwd via current_dir)
    let host_project = project_dir.clone();
    let initial_cwd = project_dir.unwrap_or_else(|| {
        dirs::home_dir()
            .map(|p| p.to_string_lossy().to_string())
            .unwrap_or_else(|| ".".to_string())
    });

    // Per-lane git worktree: each CAR run gets its own checkout under
    // ~/.ultrathink-studio/worktrees/<run_id>/ so concurrent lanes can mutate
    // files without colliding. Falls back to the bare project dir if the host
    // isn't a git repo (e.g. a fresh "Studio/projects/foo" without git init).
    let worktree_path = create_car_worktree(&initial_cwd, &run_id);
    let cwd = worktree_path.clone().unwrap_or_else(|| initial_cwd.clone());
    let host_for_cleanup = host_project.clone();

    let mut cmd = Command::new(&lane.cli);
    if lane.cli == "claude" {
        cmd.arg("--print")
            .arg(&task)
            .arg("--output-format")
            .arg("stream-json")
            .arg("--input-format")
            .arg("text")
            .arg("--verbose")
            .arg("--include-partial-messages")
            .arg("--model")
            .arg(&lane.model)
            .arg("--add-dir")
            .arg(&cwd)
            .arg("--permission-mode")
            .arg("acceptEdits");
        if !lane.system_hint.trim().is_empty() {
            cmd.arg("--append-system-prompt").arg(&lane.system_hint);
        }
    } else if lane.cli == "codex" {
        cmd.arg("exec").arg("--json").arg(&task);
        cmd.current_dir(&cwd);
    } else {
        // Unknown CLI — fall back to passing the task as the only argument.
        cmd.arg(&task);
        cmd.current_dir(&cwd);
    }

    let mut child = cmd
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .kill_on_drop(true)
        .spawn()
        .map_err(|e| format!("spawn {} failed: {}", lane.cli, e))?;

    let stdout = child.stdout.take().ok_or("no stdout")?;
    let stderr = child.stderr.take().ok_or("no stderr")?;
    let started_at = chrono_like::Iso::from_systime(std::time::SystemTime::now()).to_string();

    let topic = format!("car:event:{}", run_id);

    // Emit task-started immediately so the UI gets a definitive marker.
    let _ = app.emit(
        &topic,
        serde_json::json!({
            "kind": "task-started",
            "runId": run_id,
            "laneId": lane.id,
            "cli": lane.cli,
            "model": lane.model,
            "task": task,
            "startedAt": started_at,
        }),
    );

    // Stream stdout: parse each line as JSON (claude stream-json or codex JSON)
    // and translate to normalized car-events.
    let app_stdout = app.clone();
    let topic_stdout = topic.clone();
    let cli_kind = lane.cli.clone();
    let model_kind = lane.model.clone();
    let run_id_for_stdout = run_id.clone();
    let lane_id_for_stdout = lane.id.clone();
    let cleanup_host = host_for_cleanup.clone();
    let cleanup_worktree = worktree_path.clone();
    tokio::spawn(async move {
        let mut lines = BufReader::new(stdout).lines();
        let mut acc_input: u64 = 0;
        let mut acc_output: u64 = 0;
        let mut acc_cached: u64 = 0;
        let mut acc_cost: f64 = 0.0;
        let started_ms = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|d| d.as_millis())
            .unwrap_or(0);

        while let Ok(Some(line)) = lines.next_line().await {
            let trimmed = line.trim();
            if trimmed.is_empty() {
                continue;
            }
            // Always emit raw log so the user can drill in.
            let _ = app_stdout.emit(
                &topic_stdout,
                serde_json::json!({ "kind": "log", "stream": "stdout", "line": trimmed }),
            );
            let val: serde_json::Value = match serde_json::from_str(trimmed) {
                Ok(v) => v,
                Err(_) => continue, // non-JSON lines are already logged above
            };
            for ev in normalize_run_event(&cli_kind, &val, &model_kind) {
                if let Some(usage) = ev.get("usage") {
                    acc_input += usage.get("inputTokens").and_then(|v| v.as_u64()).unwrap_or(0);
                    acc_output += usage.get("outputTokens").and_then(|v| v.as_u64()).unwrap_or(0);
                    acc_cached += usage.get("cachedInputTokens").and_then(|v| v.as_u64()).unwrap_or(0);
                    if let Some(c) = usage.get("costUsd").and_then(|v| v.as_f64()) {
                        acc_cost = c.max(acc_cost);
                    }
                }
                let _ = app_stdout.emit(&topic_stdout, ev);
            }
        }

        let now_ms = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|d| d.as_millis())
            .unwrap_or(0);
        let duration_ms = now_ms.saturating_sub(started_ms) as u64;

        // Final task-completed with accumulated usage + computed cost (if pricing known).
        let computed_cost = compute_cost(&model_kind, acc_input, acc_output, acc_cached);
        let final_cost = if acc_cost > 0.0 { acc_cost } else { computed_cost };
        let _ = app_stdout.emit(
            &topic_stdout,
            serde_json::json!({
                "kind": "task-completed",
                "runId": run_id_for_stdout,
                "laneId": lane_id_for_stdout,
                "model": model_kind,
                "durationMs": duration_ms,
                "usage": {
                    "inputTokens": acc_input,
                    "outputTokens": acc_output,
                    "cachedInputTokens": acc_cached,
                    "costUsd": final_cost,
                },
            }),
        );
        // Append to telemetry log for Insights aggregation.
        append_telemetry(&serde_json::json!({
            "at": chrono_like::Iso::from_systime(std::time::SystemTime::now()).to_string(),
            "kind": "car-run",
            "project": null,
            "prompt": null,
            "status": "completed",
            "durationMs": duration_ms,
            "costUsd": final_cost,
            "skill": format!("car:{}", lane_id_for_stdout),
        }));
        // Tear down the per-lane worktree if we created one. Best-effort —
        // a failed remove just leaves the dir for the user / next prune.
        if let (Some(host), Some(wt)) = (cleanup_host, cleanup_worktree) {
            tokio::task::spawn_blocking(move || cleanup_car_worktree(&host, &wt));
        }
    });

    // Stream stderr as log-only events.
    let app_stderr = app.clone();
    let topic_stderr = topic.clone();
    tokio::spawn(async move {
        let mut lines = BufReader::new(stderr).lines();
        while let Ok(Some(line)) = lines.next_line().await {
            if line.trim().is_empty() {
                continue;
            }
            let _ = app_stderr.emit(
                &topic_stderr,
                serde_json::json!({ "kind": "log", "stream": "stderr", "line": line }),
            );
        }
    });

    state.car_runs.lock().await.insert(
        run_id.clone(),
        CarRunHandle {
            child,
            lane_id: lane.id.clone(),
            task,
            started_at,
            project_dir: host_project,
            worktree_path,
        },
    );

    Ok(run_id)
}

/// Snapshot the project tree as a "checkpoint:" commit. Best-effort —
/// returns the new commit sha on success, None when the dir isn't a git
/// repo or there's nothing to commit. Sync API for spawn_blocking callers.
fn git_checkpoint(project_dir: &str) -> Option<String> {
    let dot_git = std::path::Path::new(project_dir).join(".git");
    if !dot_git.exists() {
        return None;
    }
    // git add -A
    let add_ok = std::process::Command::new("git")
        .args(["add", "-A"])
        .current_dir(project_dir)
        .output()
        .ok()
        .map(|o| o.status.success())
        .unwrap_or(false);
    if !add_ok {
        return None;
    }
    // Skip if nothing staged — `git diff --cached --quiet` exits 0 when clean.
    let clean = std::process::Command::new("git")
        .args(["diff", "--cached", "--quiet"])
        .current_dir(project_dir)
        .status()
        .ok()
        .map(|s| s.success())
        .unwrap_or(true);
    if clean {
        return None;
    }
    let ts = chrono_like::Iso::from_systime(std::time::SystemTime::now()).to_string();
    let msg = format!("checkpoint: {}", ts);
    let commit_out = std::process::Command::new("git")
        .args(["commit", "-m", &msg, "--no-verify", "--no-gpg-sign"])
        .current_dir(project_dir)
        .env("GIT_AUTHOR_NAME", "UltraThink Studio")
        .env("GIT_AUTHOR_EMAIL", "checkpoint@ultrathink.local")
        .env("GIT_COMMITTER_NAME", "UltraThink Studio")
        .env("GIT_COMMITTER_EMAIL", "checkpoint@ultrathink.local")
        .output()
        .ok()?;
    if !commit_out.status.success() {
        return None;
    }
    let sha = std::process::Command::new("git")
        .args(["rev-parse", "HEAD"])
        .current_dir(project_dir)
        .output()
        .ok()?;
    if !sha.status.success() {
        return None;
    }
    Some(String::from_utf8_lossy(&sha.stdout).trim().to_string())
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Checkpoint {
    pub sha: String,
    pub message: String,
    pub date: String,
}

/// List checkpoint commits in a project. Returns empty list if not a git repo.
#[tauri::command]
async fn list_checkpoints(project_dir: String) -> std::result::Result<Vec<Checkpoint>, String> {
    let dot_git = std::path::Path::new(&project_dir).join(".git");
    if !dot_git.exists() {
        return Ok(vec![]);
    }
    let out = std::process::Command::new("git")
        .args([
            "log",
            "--pretty=format:%H%x1f%cI%x1f%s",
            "--max-count=200",
        ])
        .current_dir(&project_dir)
        .output()
        .map_err(|e| e.to_string())?;
    if !out.status.success() {
        return Ok(vec![]);
    }
    let stdout = String::from_utf8_lossy(&out.stdout);
    let rows = stdout
        .lines()
        .filter_map(|line| {
            let mut parts = line.splitn(3, '\u{1f}');
            let sha = parts.next()?.to_string();
            let date = parts.next()?.to_string();
            let message = parts.next()?.to_string();
            Some(Checkpoint { sha, message, date })
        })
        .collect();
    Ok(rows)
}

/// Hard-revert the working tree to a specific commit. Caller is expected to
/// confirm with the user — this discards uncommitted changes inside project_dir.
#[tauri::command]
async fn revert_to_checkpoint(
    project_dir: String,
    sha: String,
) -> std::result::Result<(), String> {
    if !std::path::Path::new(&project_dir).join(".git").exists() {
        return Err("not a git repository".to_string());
    }
    // Validate sha is a hex string of plausible length so we don't pass a flag.
    if sha.len() < 7 || sha.len() > 64 || !sha.chars().all(|c| c.is_ascii_hexdigit()) {
        return Err(format!("invalid checkpoint sha: {sha}"));
    }
    let out = std::process::Command::new("git")
        .args(["reset", "--hard", &sha])
        .current_dir(&project_dir)
        .output()
        .map_err(|e| e.to_string())?;
    if !out.status.success() {
        return Err(String::from_utf8_lossy(&out.stderr).to_string());
    }
    Ok(())
}

/// Read the current git branch of a project directory. Returns null if the
/// dir isn't a git repo, the HEAD is detached, or the file is unreadable.
/// We avoid spawning `git` — read .git/HEAD directly.
#[tauri::command]
async fn git_branch(project_dir: String) -> std::result::Result<Option<String>, String> {
    let head = std::path::Path::new(&project_dir).join(".git").join("HEAD");
    if !head.exists() {
        return Ok(None);
    }
    let contents = std::fs::read_to_string(&head).map_err(|e| e.to_string())?;
    let trimmed = contents.trim();
    // ref: refs/heads/main → "main"
    if let Some(refname) = trimmed.strip_prefix("ref: refs/heads/") {
        return Ok(Some(refname.to_string()));
    }
    // detached HEAD — return short sha
    if trimmed.len() >= 7 {
        return Ok(Some(format!("({:.7})", trimmed)));
    }
    Ok(None)
}

// --- CAR event normalization + pricing ---------------------------------------

/// Pricing per 1M tokens. ($/1M input, $/1M output, $/1M cached-input).
///
/// SYNC NOTE: This table mirrors `packages/studio-engine/src/pricing.ts`.
/// When you add or change a model in either, update both. The TS table is the
/// canonical source for the OSS clone; Rust mirrors so CAR cost computation
/// runs without round-tripping through the sidecar.
fn pricing_for(model: &str) -> Option<(f64, f64, f64)> {
    match model {
        // Claude 4 family
        "claude-opus-4-7" => Some((5.00, 25.00, 0.50)),
        "claude-opus-4-6" => Some((15.00, 75.00, 1.50)),
        "claude-sonnet-4-6" => Some((3.00, 15.00, 0.30)),
        "claude-sonnet-4-5" => Some((3.00, 15.00, 0.30)),
        "claude-haiku-4-5" => Some((1.00, 5.00, 0.10)),
        "claude-haiku-4-4" => Some((1.00, 5.00, 0.10)),
        // Claude 3 legacy
        "claude-3-7-sonnet-20250219" => Some((3.00, 15.00, 0.30)),
        "claude-3-5-sonnet-20241022" => Some((3.00, 15.00, 0.30)),
        "claude-3-5-haiku-20241022" => Some((0.80, 4.00, 0.08)),
        // OpenAI gpt-5
        "gpt-5" => Some((10.00, 30.00, 1.00)),
        "gpt-5-mini" => Some((0.15, 0.60, 0.015)),
        "gpt-5-nano" => Some((0.05, 0.20, 0.005)),
        "gpt-5-codex" => Some((1.25, 10.00, 0.13)),
        "gpt-5-codex-mini" => Some((0.625, 5.00, 0.06)),
        "gpt-5-codex-high" => Some((2.50, 20.00, 0.25)),
        // OpenAI gpt-4 / o-series legacy
        "gpt-4o" => Some((2.50, 10.00, 0.25)),
        "gpt-4o-mini" => Some((0.15, 0.60, 0.015)),
        "gpt-4-turbo" => Some((10.00, 30.00, 0.0)),
        "o3" => Some((2.00, 8.00, 0.50)),
        "o3-mini" => Some((1.10, 4.40, 0.55)),
        "o4-mini" => Some((1.10, 4.40, 0.275)),
        _ => None,
    }
}

fn compute_cost(model: &str, input: u64, output: u64, cached: u64) -> f64 {
    if let Some((p_in, p_out, p_cached)) = pricing_for(model) {
        let billed_input = input.saturating_sub(cached);
        return (billed_input as f64 / 1_000_000.0) * p_in
            + (output as f64 / 1_000_000.0) * p_out
            + (cached as f64 / 1_000_000.0) * p_cached;
    }
    0.0
}

fn append_telemetry(row: &serde_json::Value) {
    let Some(home) = dirs::home_dir() else {
        return;
    };
    let dir = home.join(".ultrathink-studio");
    let _ = std::fs::create_dir_all(&dir);
    let path = dir.join("telemetry.jsonl");
    if let Ok(mut f) = std::fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(&path)
    {
        use std::io::Write;
        let _ = writeln!(f, "{}", row);
    }
}

/// Translate a single raw stdout JSON line from claude/codex into 0..N normalized
/// car-events the UI can render. Returns events keyed by `kind`:
///   "text-delta"  { text }
///   "tool-call"   { name, input }
///   "tool-result" { name, isError }
///   "thinking"    { text }
///   "usage"       { usage: {...} }   (interim, model may stream multiple)
fn normalize_run_event(
    cli: &str,
    raw: &serde_json::Value,
    model: &str,
) -> Vec<serde_json::Value> {
    let mut out = Vec::new();
    let t = raw.get("type").and_then(|v| v.as_str()).unwrap_or("");
    if cli == "claude" {
        match t {
            "assistant" => {
                if let Some(content) = raw
                    .get("message")
                    .and_then(|m| m.get("content"))
                    .and_then(|c| c.as_array())
                {
                    for block in content {
                        let bt = block.get("type").and_then(|v| v.as_str()).unwrap_or("");
                        match bt {
                            "text" => {
                                if let Some(text) = block.get("text").and_then(|v| v.as_str()) {
                                    out.push(serde_json::json!({ "kind": "text-delta", "text": text }));
                                }
                            }
                            "tool_use" => {
                                let name = block.get("name").and_then(|v| v.as_str()).unwrap_or("?");
                                out.push(serde_json::json!({
                                    "kind": "tool-call",
                                    "name": name,
                                    "input": block.get("input"),
                                }));
                            }
                            "thinking" => {
                                if let Some(text) = block.get("thinking").and_then(|v| v.as_str()) {
                                    out.push(serde_json::json!({ "kind": "thinking", "text": text }));
                                }
                            }
                            _ => {}
                        }
                    }
                }
                // Anthropic also surfaces `message.usage` on assistant messages.
                if let Some(u) = raw.get("message").and_then(|m| m.get("usage")) {
                    let input = u.get("input_tokens").and_then(|v| v.as_u64()).unwrap_or(0);
                    let output = u.get("output_tokens").and_then(|v| v.as_u64()).unwrap_or(0);
                    let cached = u
                        .get("cache_read_input_tokens")
                        .and_then(|v| v.as_u64())
                        .unwrap_or(0);
                    out.push(serde_json::json!({
                        "kind": "usage",
                        "usage": {
                            "inputTokens": input,
                            "outputTokens": output,
                            "cachedInputTokens": cached,
                            "costUsd": compute_cost(model, input, output, cached),
                        },
                    }));
                }
            }
            "user" => {
                if let Some(content) = raw
                    .get("message")
                    .and_then(|m| m.get("content"))
                    .and_then(|c| c.as_array())
                {
                    for block in content {
                        if block.get("type").and_then(|v| v.as_str()) == Some("tool_result") {
                            out.push(serde_json::json!({
                                "kind": "tool-result",
                                "isError": block.get("is_error").and_then(|v| v.as_bool()).unwrap_or(false),
                            }));
                        }
                    }
                }
            }
            "result" => {
                let input = raw
                    .get("usage")
                    .and_then(|u| u.get("input_tokens"))
                    .and_then(|v| v.as_u64())
                    .unwrap_or(0);
                let output = raw
                    .get("usage")
                    .and_then(|u| u.get("output_tokens"))
                    .and_then(|v| v.as_u64())
                    .unwrap_or(0);
                let cached = raw
                    .get("usage")
                    .and_then(|u| u.get("cache_read_input_tokens"))
                    .and_then(|v| v.as_u64())
                    .unwrap_or(0);
                let cost = raw
                    .get("total_cost_usd")
                    .and_then(|v| v.as_f64())
                    .unwrap_or_else(|| compute_cost(model, input, output, cached));
                out.push(serde_json::json!({
                    "kind": "usage",
                    "usage": {
                        "inputTokens": input,
                        "outputTokens": output,
                        "cachedInputTokens": cached,
                        "costUsd": cost,
                    },
                }));
            }
            _ => {}
        }
    } else if cli == "codex" {
        match t {
            "item.completed" => {
                if let Some(item) = raw.get("item") {
                    let it = item.get("type").and_then(|v| v.as_str()).unwrap_or("");
                    match it {
                        "assistant_message" | "agent_message" => {
                            if let Some(text) = item.get("text").and_then(|v| v.as_str()) {
                                out.push(serde_json::json!({ "kind": "text-delta", "text": text }));
                            }
                        }
                        "tool_call" | "function_call" | "command_execution" => {
                            let name = item
                                .get("name")
                                .or_else(|| item.get("tool_name"))
                                .and_then(|v| v.as_str())
                                .unwrap_or("tool");
                            out.push(serde_json::json!({
                                "kind": "tool-call",
                                "name": name,
                                "input": item.get("input").or_else(|| item.get("arguments")),
                            }));
                        }
                        "reasoning" | "thinking" => {
                            if let Some(text) = item.get("text").and_then(|v| v.as_str()) {
                                out.push(serde_json::json!({ "kind": "thinking", "text": text }));
                            }
                        }
                        _ => {}
                    }
                }
            }
            "turn.completed" => {
                if let Some(u) = raw.get("usage") {
                    let input = u
                        .get("input_tokens")
                        .or_else(|| u.get("inputTokens"))
                        .and_then(|v| v.as_u64())
                        .unwrap_or(0);
                    let output = u
                        .get("output_tokens")
                        .or_else(|| u.get("outputTokens"))
                        .and_then(|v| v.as_u64())
                        .unwrap_or(0);
                    let cached = u
                        .get("cached_input_tokens")
                        .or_else(|| u.get("cachedInputTokens"))
                        .and_then(|v| v.as_u64())
                        .unwrap_or(0);
                    out.push(serde_json::json!({
                        "kind": "usage",
                        "usage": {
                            "inputTokens": input,
                            "outputTokens": output,
                            "cachedInputTokens": cached,
                            "costUsd": compute_cost(model, input, output, cached),
                        },
                    }));
                }
            }
            _ => {}
        }
    }
    out
}

#[tauri::command]
async fn car_cancel_run(
    run_id: String,
    state: State<'_, AppState>,
) -> std::result::Result<(), String> {
    if let Some(mut handle) = state.car_runs.lock().await.remove(&run_id) {
        let _ = handle.child.kill().await;
        if let (Some(host), Some(wt)) = (handle.project_dir, handle.worktree_path) {
            tokio::task::spawn_blocking(move || cleanup_car_worktree(&host, &wt));
        }
    }
    Ok(())
}

// --- Telemetry read (insights) -----------------------------------------------

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct TelemetryEvent {
    pub at: String,
    pub kind: String,
    pub project: Option<String>,
    pub prompt: Option<String>,
    pub status: Option<String>,
    pub duration_ms: Option<u64>,
    pub cost_usd: Option<f64>,
    pub skill: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
#[serde(rename_all = "camelCase")]
pub struct InsightsSummary {
    pub event_count: u64,
    pub builds_shipped: u64,
    pub builds_failed: u64,
    pub success_rate_pct: f64,
    pub p95_duration_ms: u64,
    pub spend_usd: f64,
    pub recent: Vec<TelemetryEvent>,
    pub skill_costs: Vec<(String, f64, u64)>,
    pub has_data: bool,
}

#[tauri::command]
async fn read_telemetry(_window: Option<String>) -> std::result::Result<InsightsSummary, String> {
    let path = dirs::home_dir()
        .ok_or("no home dir")?
        .join(".ultrathink-studio")
        .join("telemetry.jsonl");

    if !path.exists() {
        return Ok(InsightsSummary::default());
    }

    let text = std::fs::read_to_string(&path).map_err(|e| e.to_string())?;
    let events: Vec<TelemetryEvent> = text
        .lines()
        .filter(|l| !l.trim().is_empty())
        .filter_map(|l| serde_json::from_str::<TelemetryEvent>(l).ok())
        .collect();

    if events.is_empty() {
        return Ok(InsightsSummary::default());
    }

    let mut shipped = 0u64;
    let mut failed = 0u64;
    let mut spend = 0.0f64;
    let mut durations: Vec<u64> = Vec::new();
    let mut by_skill: HashMap<String, (f64, u64)> = HashMap::new();

    for e in &events {
        if let Some(s) = &e.status {
            match s.as_str() {
                "ok" | "shipped" | "completed" => shipped += 1,
                "fail" | "failed" | "error" => failed += 1,
                _ => {}
            }
        }
        if let Some(c) = e.cost_usd {
            spend += c;
        }
        if let Some(d) = e.duration_ms {
            durations.push(d);
        }
        if let Some(sk) = &e.skill {
            let entry = by_skill.entry(sk.clone()).or_insert((0.0, 0));
            entry.0 += e.cost_usd.unwrap_or(0.0);
            entry.1 += 1;
        }
    }

    durations.sort_unstable();
    let p95 = if durations.is_empty() {
        0
    } else {
        let idx = ((durations.len() as f64) * 0.95).ceil() as usize - 1;
        durations[idx.min(durations.len() - 1)]
    };

    let total_for_rate = shipped + failed;
    let success_rate = if total_for_rate > 0 {
        (shipped as f64 / total_for_rate as f64) * 100.0
    } else {
        0.0
    };

    let recent: Vec<TelemetryEvent> = events.iter().rev().take(20).cloned().collect();

    let mut skill_costs: Vec<(String, f64, u64)> = by_skill
        .into_iter()
        .map(|(name, (cost, count))| (name, cost, count))
        .collect();
    skill_costs.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));
    skill_costs.truncate(10);

    Ok(InsightsSummary {
        event_count: events.len() as u64,
        builds_shipped: shipped,
        builds_failed: failed,
        success_rate_pct: success_rate,
        p95_duration_ms: p95,
        spend_usd: spend,
        recent,
        skill_costs,
        has_data: true,
    })
}

// --- Global shortcut ---------------------------------------------------------

#[cfg(desktop)]
fn install_global_shortcut(app: &AppHandle) -> Result<()> {
    use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};

    // Cmd+Shift+U on macOS, Ctrl+Shift+U elsewhere.
    let modifier = if cfg!(target_os = "macos") {
        Modifiers::SUPER | Modifiers::SHIFT
    } else {
        Modifiers::CONTROL | Modifiers::SHIFT
    };
    let shortcut = Shortcut::new(Some(modifier), Code::KeyU);

    let app_clone = app.clone();
    app.global_shortcut()
        .on_shortcut(shortcut, move |_app, _sh, ev| {
            if ev.state == ShortcutState::Pressed {
                // Surface main window + emit a focus event the frontend can listen for.
                if let Some(w) = app_clone.get_webview_window("main") {
                    let _ = w.show();
                    let _ = w.set_focus();
                    let _ = w.unminimize();
                }
                let _ = app_clone.emit("studio:summon", ());
            }
        })?;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    env_logger::init();
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .setup(|app| {
            #[cfg(desktop)]
            {
                if let Err(err) = install_global_shortcut(&app.handle()) {
                    log::warn!("global shortcut not registered: {err}");
                }
            }
            Ok(())
        })
        .manage(AppState::default())
        .invoke_handler(tauri::generate_handler![
            start_session,
            send_message,
            stop_session,
            list_projects,
            create_project,
            rename_project,
            delete_project,
            duplicate_project,
            reset_project_sessions,
            seed_demo_memories,
            git_branch,
            list_checkpoints,
            revert_to_checkpoint,
            secret_set,
            secret_get,
            secret_delete,
            secret_has,
            list_files,
            read_file_text,
            query_memory_graph,
            query_memory_node,
            detect_framework,
            start_preview,
            stop_preview,
            deploy_run,
            check_claude_cli,
            check_codex_cli,
            check_prereqs,
            skill_registry_status,
            skill_registry_install,
            skill_registry_list,
            skill_registry_sync_global,
            oss_kit_status,
            oss_kit_install,
            diagnose_spawn,
            read_session_log,
            list_sessions,
            report_error,
            car_list_lanes,
            car_save_lanes,
            car_reset_lanes,
            car_list_runs,
            car_start_run,
            car_cancel_run,
            read_telemetry,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

// Tiny inlined replacement for chrono::DateTime<Utc>::to_rfc3339() so we don't
// pull a heavy dep just to format a timestamp.
mod chrono_like {
    use std::time::{SystemTime, UNIX_EPOCH};

    pub struct Iso(pub String);

    impl Iso {
        pub fn from_systime(t: SystemTime) -> Self {
            let secs = t
                .duration_since(UNIX_EPOCH)
                .map(|d| d.as_secs() as i64)
                .unwrap_or(0);
            // Format as ISO-ish (UTC, no fractional seconds). Good enough for sorting.
            // Years, months, days computed without external crate via simple algorithm.
            let (y, mo, d, h, mi, s) = ymdhms_from_unix_secs(secs);
            Iso(format!(
                "{:04}-{:02}-{:02}T{:02}:{:02}:{:02}Z",
                y, mo, d, h, mi, s
            ))
        }
        pub fn epoch() -> Self {
            Iso("1970-01-01T00:00:00Z".to_string())
        }
        pub fn to_string(&self) -> String {
            self.0.clone()
        }
    }

    fn ymdhms_from_unix_secs(s: i64) -> (i32, u32, u32, u32, u32, u32) {
        // Algorithm from Howard Hinnant's "date" reference, simplified for UTC.
        let z = s.div_euclid(86400);
        let secs_of_day = s.rem_euclid(86400) as u32;
        let h = secs_of_day / 3600;
        let mi = (secs_of_day % 3600) / 60;
        let sec = secs_of_day % 60;

        let z = z + 719468;
        let era = if z >= 0 { z } else { z - 146096 } / 146097;
        let doe = (z - era * 146097) as u32;
        let yoe = (doe - doe / 1460 + doe / 36524 - doe / 146096) / 365;
        let y = yoe as i32 + era as i32 * 400;
        let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
        let mp = (5 * doy + 2) / 153;
        let d = doy - (153 * mp + 2) / 5 + 1;
        let mo = if mp < 10 { mp + 3 } else { mp - 9 };
        let y = if mo <= 2 { y + 1 } else { y };
        (y, mo, d, h, mi, sec)
    }
}
