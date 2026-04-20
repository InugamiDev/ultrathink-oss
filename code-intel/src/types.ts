export interface CIProject {
  id: string;
  name: string;
  root_path: string;
  last_indexed_at: string | null;
  created_at: string;
}

export interface CIFile {
  id: string;
  project_id: string;
  relative_path: string;
  sha256: string;
  language: string | null;
  indexed_at: string;
}

export type SymbolKind =
  | "function"
  | "class"
  | "interface"
  | "type"
  | "enum"
  | "variable"
  | "method"
  | "property"
  | "module"
  | "namespace";

export interface CISymbol {
  id: string;
  file_id: string;
  name: string;
  kind: SymbolKind;
  signature: string | null;
  line_number: number;
  is_exported: boolean;
  parent_symbol_id: string | null;
}

export type EdgeType = "imports" | "calls" | "extends" | "implements" | "type_ref" | "re_exports";

export interface CIEdge {
  id: string;
  source_symbol_id: string;
  target_symbol_id: string | null;
  edge_type: EdgeType;
  target_name: string | null;
  target_module: string | null;
}

export interface CIModule {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  directory_pattern: string | null;
  file_count: number;
  symbol_count: number;
  created_at: string;
}

export interface VFSEntry {
  file_path: string;
  line_number: number;
  is_exported: boolean;
  kind: SymbolKind;
  name: string;
  signature: string;
  raw: string;
}

export interface ImportInfo {
  source_file: string;
  imported_names: string[];
  module_specifier: string;
  resolved_path: string | null;
  is_reexport: boolean;
}
