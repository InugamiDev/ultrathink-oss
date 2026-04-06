/**
 * UltraThink Usage Widget for Übersicht
 *
 * Shows: Anthropic usage limits (5hr + weekly + sonnet), memory stats,
 * session activity, x2 promo detection, reset timers, project breakdown
 * Tabbed interface: Usage | Activity | Memory
 *
 * Install: brew install --cask ubersicht
 * Symlink: ln -s .../widgets/ultrathink-usage.jsx ~/Library/Application\ Support/Übersicht/widgets/
 */

// Refresh every 60 seconds
export const refreshFrequency = 60 * 1000;

// Shell command — fetches Anthropic usage API + UltraThink DB stats
export const command = `
  export PATH="/Users/inugami/.nvm/versions/node/v24.12.0/bin:$PATH"

  CACHE="/tmp/ultrathink-status/anthropic-usage.json"

  # 1. Anthropic usage API (with cache fallback)
  CREDS=$(security find-generic-password -s "Claude Code-credentials" -w 2>/dev/null)
  TOKEN=$(echo "$CREDS" | jq -r '.claudeAiOauth.accessToken' 2>/dev/null)
  USAGE='{}'
  if [ -n "$TOKEN" ] && [ "$TOKEN" != "null" ]; then
    FRESH=$(curl -s --max-time 5 "https://api.anthropic.com/api/oauth/usage" \\
      -H "Authorization: Bearer $TOKEN" \\
      -H "anthropic-beta: oauth-2025-04-20" \\
      -H "Content-Type: application/json" 2>/dev/null || echo '{}')
    # Use fresh data if valid, otherwise fall back to cache
    if echo "$FRESH" | jq -e '.five_hour' >/dev/null 2>&1; then
      USAGE="$FRESH"
      mkdir -p /tmp/ultrathink-status 2>/dev/null
      echo "$FRESH" > "$CACHE" 2>/dev/null
    elif [ -f "$CACHE" ]; then
      USAGE=$(cat "$CACHE")
    fi
  elif [ -f "$CACHE" ]; then
    USAGE=$(cat "$CACHE")
  fi

  # 2. UltraThink DB stats
  cd /Users/inugami/Documents/GitHub/InuVerse/ai-agents/ultrathink
  DB_STATS=$(npx tsx memory/scripts/usage-report.ts 2>/dev/null || echo '{}')

  # 3. Tekiō wheel stats
  WHEEL=$(npx tsx memory/scripts/wheel-count.ts 2>/dev/null || echo '0')

  # 4. Combine
  jq -n --argjson usage "$USAGE" --argjson db "$DB_STATS" --argjson wheel "$WHEEL" '{ usage: $usage, db: $db, wheel: $wheel }'
`;

// Position: top-right corner
export const className = `
  position: fixed;
  top: 32px;
  right: 16px;
  width: 360px;
  z-index: 999;
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', sans-serif;
  -webkit-font-smoothing: antialiased;
`;

// --- Tab state management (Übersicht pattern) ---
export const initialState = { tab: "usage" };

export const updateState = (event, previousState) => {
  // Custom dispatch events (tab switching)
  if (event.type === "SET_TAB") {
    return { ...previousState, tab: event.tab };
  }
  // Default: command output (no event.type from Übersicht)
  if (event.output !== undefined) {
    return { ...previousState, output: event.output, error: event.error };
  }
  if (event.error) {
    return { ...previousState, error: event.error };
  }
  return previousState;
};

// --- Colors ---
const c = {
  bg: "#0f1117",
  card: "#181b23",
  cardHover: "#1e2130",
  border: "#262a36",
  text: "#e2e8f0",
  muted: "#64748b",
  dim: "#475569",
  purple: "#a78bfa",
  green: "#22c55e",
  amber: "#f59e0b",
  red: "#ef4444",
  blue: "#3b82f6",
  cyan: "#06b6d4",
  pink: "#ec4899",
  teal: "#14b8a6",
};

const catColors = {
  solution: c.green,
  pattern: c.blue,
  architecture: c.amber,
  preference: c.purple,
  insight: c.cyan,
  "tool-preference": c.muted,
  identity: c.pink,
  "project-context": c.teal,
};

function colorForPct(left) {
  if (left > 50) return c.green;
  if (left > 20) return c.amber;
  return c.red;
}

function formatDuration(mins) {
  if (!mins || mins < 1) return "<1m";
  if (mins < 60) return `${Math.round(mins)}m`;
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function formatReset(isoStr) {
  if (!isoStr) return { countdown: "", label: "" };
  const resetDate = new Date(isoStr);
  const diff = resetDate - new Date();
  let countdown;
  if (diff <= 0) {
    countdown = "now";
  } else {
    const hrs = Math.floor(diff / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    if (hrs > 24) {
      const days = Math.floor(hrs / 24);
      countdown = `${days}d ${hrs % 24}h`;
    } else {
      countdown = hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
    }
  }
  const vn = resetDate.toLocaleString("en-US", {
    timeZone: "Asia/Ho_Chi_Minh",
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  return { countdown, label: vn };
}

function getX2Status() {
  const now = new Date();
  const promoEnd = new Date("2026-03-28T00:00:00-04:00");
  if (now >= promoEnd) return { active: false };
  const et = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
  const day = et.getDay();
  const hour = et.getHours();
  const isOffPeak = day === 0 || day === 6 || hour < 8 || hour >= 14;

  let windowEnd = null;
  if (isOffPeak) {
    if (day === 0 || day === 6) {
      const daysToMon = day === 0 ? 1 : 2;
      windowEnd = new Date(et);
      windowEnd.setDate(windowEnd.getDate() + daysToMon);
      windowEnd.setHours(8, 0, 0, 0);
    } else if (hour < 8) {
      windowEnd = new Date(et);
      windowEnd.setHours(8, 0, 0, 0);
    } else {
      windowEnd = new Date(et);
      if (day === 5) {
        windowEnd.setDate(windowEnd.getDate() + 3);
      } else {
        windowEnd.setDate(windowEnd.getDate() + 1);
      }
      windowEnd.setHours(8, 0, 0, 0);
    }
  }

  let remaining = "";
  if (windowEnd) {
    const diff = windowEnd - et;
    const hrs = Math.floor(diff / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    remaining = hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
  }

  const promoLeft = promoEnd - now;
  const promoDays = Math.floor(promoLeft / 86400000);
  const promoEndsIn = `${promoDays}d`;

  return { active: isOffPeak, remaining, promoEndsIn };
}

function sparkline(values, color) {
  const blocks = ["▁", "▂", "▃", "▄", "▅", "▆", "▇", "█"];
  const max = Math.max(...values, 1);
  const chars = values.map((v) => blocks[Math.min(Math.floor((v / max) * 7), 7)]);
  return (
    <span style={{ fontFamily: "monospace", fontSize: "12px", letterSpacing: "-1px", color }}>{chars.join("")}</span>
  );
}

function UsageBar({ label, used, resetAt, x2 }) {
  const left = Math.max(0, 100 - Math.round(used));
  const color = colorForPct(left);
  const reset = formatReset(resetAt);
  return (
    <div style={{ marginBottom: "10px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <span style={{ fontSize: "11px", color: c.muted, width: "50px", flexShrink: 0 }}>{label}</span>
        <div style={{ flex: 1 }}>
          <div
            style={{
              height: "8px",
              background: c.card,
              borderRadius: "4px",
              overflow: "hidden",
              border: `1px solid ${c.border}`,
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${Math.round(used)}%`,
                backgroundColor: color,
                borderRadius: "4px",
                transition: "width 0.5s ease",
              }}
            />
          </div>
        </div>
        <span style={{ fontSize: "12px", fontWeight: "700", color, width: "36px", textAlign: "right", flexShrink: 0 }}>
          {left}%
        </span>
      </div>
      {reset.label && (
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "3px", paddingLeft: "58px" }}>
          <span style={{ fontSize: "9px", color: c.dim }}>resets {reset.label} (VN)</span>
          <span style={{ fontSize: "9px", color: c.dim }}>in {reset.countdown}</span>
        </div>
      )}
    </div>
  );
}

function StatCard({ value, label, color, sub }) {
  return (
    <div
      style={{
        flex: 1,
        background: c.card,
        borderRadius: "10px",
        padding: "12px 8px",
        textAlign: "center",
        border: `1px solid ${c.border}`,
      }}
    >
      <div style={{ fontSize: "20px", fontWeight: "700", lineHeight: "1.2", color }}>{value}</div>
      <div
        style={{
          fontSize: "9px",
          color: c.muted,
          marginTop: "2px",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
        }}
      >
        {label}
      </div>
      {sub && <div style={{ fontSize: "9px", color: c.dim, marginTop: "2px" }}>{sub}</div>}
    </div>
  );
}

function Divider() {
  return <div style={{ height: "1px", background: c.border, margin: "14px 0" }} />;
}

function SectionLabel({ children }) {
  return (
    <div
      style={{
        fontSize: "10px",
        color: c.muted,
        textTransform: "uppercase",
        letterSpacing: "0.06em",
        marginBottom: "8px",
        fontWeight: "600",
      }}
    >
      {children}
    </div>
  );
}

// --- Tab Components ---

function TabBar({ active, dispatch }) {
  const tabs = [
    { id: "usage", label: "Usage" },
    { id: "activity", label: "Activity" },
    { id: "memory", label: "Memory" },
  ];
  return (
    <div
      style={{
        display: "flex",
        gap: "2px",
        background: c.card,
        borderRadius: "8px",
        padding: "3px",
        marginBottom: "14px",
        border: `1px solid ${c.border}`,
      }}
    >
      {tabs.map((tab) => (
        <div
          key={tab.id}
          onClick={() => dispatch({ type: "SET_TAB", tab: tab.id })}
          style={{
            flex: 1,
            textAlign: "center",
            fontSize: "11px",
            fontWeight: active === tab.id ? "700" : "500",
            color: active === tab.id ? c.text : c.dim,
            background: active === tab.id ? c.bg : "transparent",
            borderRadius: "6px",
            padding: "6px 0",
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
        >
          {tab.label}
        </div>
      ))}
    </div>
  );
}

function UsageTab({ usage, u5h, u7d, uSonnet, uOpus, extraUsage, x2, hasUsage, hasDb, sessions, memory }) {
  // Calculate usage left for hero cards
  const left5h = u5h ? Math.max(0, 100 - Math.round(u5h.utilization)) : null;
  const left7d = u7d ? Math.max(0, 100 - Math.round(u7d.utilization)) : null;

  return (
    <div>
      {/* x2 Promo Banner */}
      {x2.active && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "rgba(168,85,247,0.08)",
            border: "1px solid rgba(168,85,247,0.2)",
            borderRadius: "8px",
            padding: "8px 10px",
            marginBottom: "14px",
            fontSize: "10px",
            color: "#c084fc",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ fontSize: "14px" }}>⚡</span>
            <div>
              <div style={{ fontWeight: "700" }}>x2 usage active</div>
              <div style={{ fontSize: "9px", color: "#a78bfa", marginTop: "1px" }}>
                window ends in {x2.remaining} · promo ends in {x2.promoEndsIn}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Usage Bars */}
      {hasUsage && (
        <div style={{ marginBottom: "14px" }}>
          <SectionLabel>Usage Remaining</SectionLabel>
          {u5h && <UsageBar label="5 hour" used={u5h.utilization} resetAt={u5h.resets_at} x2={x2.active} />}
          {u7d && <UsageBar label="weekly" used={u7d.utilization} resetAt={u7d.resets_at} />}
          {uSonnet && uSonnet.utilization != null && (
            <UsageBar label="sonnet" used={uSonnet.utilization} resetAt={uSonnet.resets_at} />
          )}
          {uOpus && uOpus.utilization != null && (
            <UsageBar label="opus" used={uOpus.utilization} resetAt={uOpus.resets_at} />
          )}
          {extraUsage && extraUsage.is_enabled && (
            <div style={{ fontSize: "10px", color: c.cyan, marginTop: "4px" }}>
              Extra usage: {extraUsage.utilization != null ? `${Math.round(extraUsage.utilization)}% used` : "enabled"}
            </div>
          )}
        </div>
      )}

      <Divider />

      {/* Hero Stats: sessions, 5hr left, weekly left, new memories */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "14px" }}>
        {hasDb && (
          <StatCard
            value={sessions?.totals?.thisWeek || 0}
            label="sessions"
            color={c.amber}
            sub={`${sessions?.totals?.allTime || "—"} all-time`}
          />
        )}
        {left5h !== null ? (
          <StatCard value={`${left5h}%`} label="5hr left" color={colorForPct(left5h)} />
        ) : (
          <StatCard value="—" label="5hr left" color={c.dim} />
        )}
        {left7d !== null ? (
          <StatCard value={`${left7d}%`} label="weekly left" color={colorForPct(left7d)} />
        ) : (
          <StatCard value="—" label="weekly left" color={c.dim} />
        )}
        {hasDb && (
          <StatCard
            value={memory?.weekNew || 0}
            label="new mem"
            color={c.green}
            sub={`${Number(memory?.active || 0).toLocaleString()} total`}
          />
        )}
      </div>
    </div>
  );
}

function ActivityTab({ hasDb, sessions, memory, dailySess, dailyMems, projects, maxProjMins, todaySessions }) {
  if (!hasDb) {
    return <div style={{ color: c.muted, fontSize: "12px" }}>No database connected</div>;
  }

  return (
    <div>
      {/* Sparklines */}
      {dailySess.length > 0 && (
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "14px" }}>
          <div>
            <span style={{ fontSize: "10px", color: c.muted, marginRight: "6px" }}>sessions</span>
            {sparkline(dailySess, c.amber)}
          </div>
          <div>
            <span style={{ fontSize: "10px", color: c.muted, marginRight: "6px" }}>memories</span>
            {sparkline(dailyMems, c.green)}
          </div>
        </div>
      )}

      {/* Projects */}
      {projects.length > 0 && (
        <div style={{ marginBottom: "14px" }}>
          <SectionLabel>Projects</SectionLabel>
          {projects.map(([name, data2]) => {
            const pct = Math.max((data2.mins / maxProjMins) * 100, 3);
            return (
              <div key={name} style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                <span
                  style={{
                    fontSize: "11px",
                    color: "#94a3b8",
                    width: "90px",
                    flexShrink: 0,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {name}
                </span>
                <div style={{ flex: 1, height: "4px", background: c.card, borderRadius: "2px", overflow: "hidden" }}>
                  <div
                    style={{
                      height: "100%",
                      width: `${pct}%`,
                      backgroundColor: c.blue,
                      borderRadius: "2px",
                      opacity: 0.6,
                    }}
                  />
                </div>
                <span style={{ fontSize: "10px", color: c.dim, width: "24px", textAlign: "right", flexShrink: 0 }}>
                  {data2.count}
                </span>
              </div>
            );
          })}
        </div>
      )}

      <Divider />

      {/* Today's Sessions */}
      {todaySessions.length > 0 && (
        <div style={{ marginBottom: "12px" }}>
          <SectionLabel>Today</SectionLabel>
          {todaySessions.slice(0, 6).map((sess) => {
            const start = new Date(sess.started_at);
            const timeLabel = `${start.getHours().toString().padStart(2, "0")}:${start.getMinutes().toString().padStart(2, "0")}`;
            const proj = (sess.task_context || "").split("/").pop();
            const dur = formatDuration(Number(sess.duration_min || 0));
            return (
              <div
                key={sess.id}
                style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px", fontSize: "10px" }}
              >
                <span style={{ color: c.dim }}>{timeLabel}</span>
                <span
                  style={{
                    color: "#94a3b8",
                    flex: 1,
                    marginLeft: "8px",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {proj}
                </span>
                <span style={{ color: c.dim, marginLeft: "8px", flexShrink: 0 }}>{dur}</span>
                {sess.memories_created > 0 && (
                  <span style={{ color: c.green, marginLeft: "6px", flexShrink: 0 }}>+{sess.memories_created}</span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {todaySessions.length === 0 && (
        <div style={{ color: c.dim, fontSize: "11px", textAlign: "center", padding: "12px 0" }}>
          No sessions today yet
        </div>
      )}

      {/* Daily breakdown */}
      {(sessions?.daily || []).length > 0 && (
        <div>
          <SectionLabel>This Week</SectionLabel>
          {(sessions.daily || []).slice(0, 7).map((day) => {
            const d = new Date(day.day);
            const dayName = d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
            return (
              <div
                key={day.day}
                style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px", fontSize: "10px" }}
              >
                <span style={{ color: "#94a3b8", width: "80px" }}>{dayName}</span>
                <span style={{ color: c.dim }}>{day.session_count} sess</span>
                <span style={{ color: c.dim }}>{formatDuration(Number(day.total_minutes || 0))}</span>
                <span style={{ color: c.green, width: "40px", textAlign: "right" }}>+{day.memories_created || 0}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function MemoryTab({ hasDb, memory }) {
  if (!hasDb || !memory) {
    return <div style={{ color: c.muted, fontSize: "12px" }}>No database connected</div>;
  }

  const topCats = (memory.categories || []).slice(0, 8);
  const maxCat = Math.max(...topCats.map((c2) => Number(c2.count)), 1);
  const topAccessed = (memory.topAccessed || []).slice(0, 5);
  const totalActive = Number(memory.active || 1);

  return (
    <div>
      {/* Memory Overview */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "14px" }}>
        <StatCard value={Number(memory.active || 0).toLocaleString()} label="active" color={c.green} />
        <StatCard value={Number(memory.archived || 0).toLocaleString()} label="archived" color={c.dim} />
        <StatCard value={Number(memory.relations || 0).toLocaleString()} label="relations" color={c.blue} />
        <StatCard value={memory.avgImportance || "—"} label="avg imp" color={c.amber} />
      </div>

      <div style={{ display: "flex", gap: "10px", marginBottom: "14px" }}>
        <StatCard value={memory.weekNew || 0} label="new this week" color={c.green} />
        <StatCard value={memory.weekArchived || 0} label="archived this week" color={c.dim} />
      </div>

      <Divider />

      {/* Categories */}
      {topCats.length > 0 && (
        <div style={{ marginBottom: "14px" }}>
          <SectionLabel>Categories</SectionLabel>
          {topCats.map((cat) => {
            const count = Number(cat.count);
            const pct = Math.max((count / maxCat) * 100, 3);
            const color = catColors[cat.category] || c.muted;
            const catPct = ((count / totalActive) * 100).toFixed(1);
            return (
              <div
                key={cat.category}
                style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}
              >
                <span
                  style={{
                    fontSize: "10px",
                    color: "#94a3b8",
                    width: "72px",
                    flexShrink: 0,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {cat.category}
                </span>
                <div style={{ flex: 1, height: "4px", background: c.card, borderRadius: "2px", overflow: "hidden" }}>
                  <div
                    style={{
                      height: "100%",
                      width: `${pct}%`,
                      backgroundColor: color,
                      borderRadius: "2px",
                      opacity: 0.7,
                    }}
                  />
                </div>
                <span style={{ fontSize: "10px", color: c.dim, width: "52px", textAlign: "right", flexShrink: 0 }}>
                  {count} ({catPct}%)
                </span>
              </div>
            );
          })}
        </div>
      )}

      <Divider />

      {/* Most Recalled */}
      {topAccessed.length > 0 && (
        <div style={{ marginBottom: "14px" }}>
          <SectionLabel>Most Recalled</SectionLabel>
          {topAccessed.map((mem, i) => (
            <div
              key={i}
              style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px", fontSize: "10px" }}
            >
              <span
                style={{
                  color: "#94a3b8",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  flex: 1,
                  marginRight: "8px",
                }}
              >
                {mem.preview}
              </span>
              <span style={{ color: c.dim, flexShrink: 0 }}>{mem.access_count}x</span>
            </div>
          ))}
        </div>
      )}

      {/* Daily Memory Growth */}
      {(memory.dailyMemories || []).length > 0 && (
        <div>
          <SectionLabel>Daily Growth</SectionLabel>
          {[...(memory.dailyMemories || [])].slice(0, 7).map((day) => {
            const d = new Date(day.day);
            const dayName = d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
            return (
              <div
                key={day.day}
                style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px", fontSize: "10px" }}
              >
                <span style={{ color: "#94a3b8", width: "80px" }}>{dayName}</span>
                <span style={{ color: c.green }}>+{day.created}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// --- Main Render ---

export const render = (state, dispatch) => {
  const { output, error, tab: activeTab = "usage" } = state || {};
  const containerStyle = {
    background: c.bg,
    borderRadius: "16px",
    border: `1px solid ${c.border}`,
    padding: "20px",
    boxShadow: "0 12px 40px rgba(0,0,0,0.6)",
    color: c.text,
  };

  if (error) {
    return (
      <div style={containerStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
          <span style={{ fontSize: "14px", fontWeight: "700", color: c.purple }}>ultrathink</span>
        </div>
        <div style={{ color: c.red, fontSize: "12px" }}>Error: {String(error).slice(0, 120)}</div>
      </div>
    );
  }

  let data;
  try {
    data = JSON.parse(output);
  } catch {
    return (
      <div style={containerStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
          <span style={{ fontSize: "14px", fontWeight: "700", color: c.purple }}>ultrathink</span>
        </div>
        <div style={{ color: c.muted, fontSize: "12px" }}>Connecting...</div>
      </div>
    );
  }

  const { usage, db, wheel } = data || {};
  const hasUsage = usage && (usage.five_hour || usage.seven_day);
  const hasDb = db && db.sessions && db.memory;
  const wheelCount = wheel || 0;

  if (!hasUsage && !hasDb) {
    return (
      <div style={containerStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
          <span style={{ fontSize: "14px", fontWeight: "700", color: c.purple }}>ultrathink</span>
        </div>
        <div style={{ color: c.muted, fontSize: "12px" }}>No data available</div>
      </div>
    );
  }

  const now = new Date();
  const timeStr = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
  const x2 = getX2Status();

  // Usage
  const u5h = usage?.five_hour;
  const u7d = usage?.seven_day;
  const uSonnet = usage?.seven_day_sonnet;
  const uOpus = usage?.seven_day_opus;
  const extraUsage = usage?.extra_usage;

  // DB stats
  const sessions = db?.sessions;
  const memory = db?.memory;
  const dailySess = hasDb ? [...(sessions.daily || [])].reverse().map((d) => Number(d.session_count || 0)) : [];
  const dailyMems = hasDb ? [...(memory.dailyMemories || [])].reverse().map((d) => Number(d.created || 0)) : [];

  // Project breakdown
  const projectMap = {};
  if (hasDb) {
    (sessions.list || []).forEach((sess) => {
      if (!sess.ended_at) return;
      const proj = (sess.task_context || "unknown").split("/").pop();
      if (!projectMap[proj]) projectMap[proj] = { count: 0, mins: 0 };
      projectMap[proj].count++;
      projectMap[proj].mins += Number(sess.duration_min || 0);
    });
  }
  const projects = Object.entries(projectMap)
    .sort((a, b) => b[1].mins - a[1].mins)
    .slice(0, 5);
  const maxProjMins = projects.length > 0 ? Math.max(...projects.map(([, v]) => v.mins)) : 1;

  // Today's sessions
  const todaySessions = hasDb
    ? (sessions.list || []).filter((sess) => {
        const d = new Date(sess.started_at);
        return d.toDateString() === now.toDateString() && sess.ended_at;
      })
    : [];

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
        <div>
          <span style={{ fontSize: "14px", fontWeight: "700", color: c.purple }}>ultrathink</span>
          <span style={{ fontSize: "10px", color: c.dim, fontWeight: "400" }}> dashboard</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          {wheelCount > 0 && (
            <span
              style={{
                fontSize: "10px",
                fontWeight: "600",
                color: "#f59e0b",
                background: "rgba(245,158,11,0.1)",
                padding: "2px 6px",
                borderRadius: "4px",
              }}
            >
              ☸ {wheelCount}
            </span>
          )}
          {x2.active && (
            <span
              style={{
                fontSize: "10px",
                fontWeight: "700",
                color: "#c084fc",
                background: "rgba(168,85,247,0.15)",
                padding: "2px 6px",
                borderRadius: "4px",
              }}
            >
              ⚡x2
            </span>
          )}
          <span style={{ fontSize: "10px", color: c.dim }}>{timeStr}</span>
        </div>
      </div>

      {/* Tab Bar */}
      <TabBar active={activeTab} dispatch={dispatch} />

      {/* Tab Content */}
      {activeTab === "usage" && (
        <UsageTab
          usage={usage}
          u5h={u5h}
          u7d={u7d}
          uSonnet={uSonnet}
          uOpus={uOpus}
          extraUsage={extraUsage}
          x2={x2}
          hasUsage={hasUsage}
          hasDb={hasDb}
          sessions={sessions}
          memory={memory}
        />
      )}
      {activeTab === "activity" && (
        <ActivityTab
          hasDb={hasDb}
          sessions={sessions}
          memory={memory}
          dailySess={dailySess}
          dailyMems={dailyMems}
          projects={projects}
          maxProjMins={maxProjMins}
          todaySessions={todaySessions}
        />
      )}
      {activeTab === "memory" && <MemoryTab hasDb={hasDb} memory={memory} />}

      {/* Footer */}
      <div
        style={{
          fontSize: "10px",
          color: c.dim,
          textAlign: "center",
          marginTop: "12px",
          borderTop: `1px solid ${c.border}`,
          paddingTop: "10px",
        }}
      >
        {hasDb && `${sessions?.totals?.allTime || "—"} all-time · ${Number(memory?.archived || 0)} archived`}
        {hasUsage &&
          u7d &&
          ` · resets ${new Date(u7d.resets_at).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}`}
      </div>
    </div>
  );
};
