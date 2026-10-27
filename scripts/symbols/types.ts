// The indexes in src/data/symbols/, which src/lib/code-symbols.ts reads.

import type { Mention } from "./mentions.ts";

export interface CodeSymbol {
  id: string;
  name: string;
  qualname: string;
  kind: string;
  module: string;
  path: string;
  line: number;
  signature: string;
  doc: string | null;
  bare: boolean;
  pageBare?: boolean;
  aliasOf?: string;
  members?: string[];
}

// An integration hook of core, from scripts/symbols/hooks.json.
export interface Hook {
  id: string;
  name: string;
  kind: "hook";
  page: string;
  notOn?: string[];
  signature: string;
  doc: string;
}

// A hook as scripts/symbols/hooks.json defines it.
export interface HookDefinition {
  page: string;
  when: string;
  notOn?: string[];
  signatures: { file: string; quote: string; signature: string }[];
}

export interface HooksFile {
  hooks: Record<string, HookDefinition>;
}

export interface SymbolIndex {
  repository: string;
  commit: string;
  symbols: CodeSymbol[];
  hooks?: Hook[];
}

export interface GenerateOptions {
  checkout: string;
  ref: string;
  mentions: Mention[];
}

export interface Generated {
  index: SymbolIndex;
  summary: string[];
}
