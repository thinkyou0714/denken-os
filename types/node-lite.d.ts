/**
 * Minimal Node.js ambient types used by this repository's CLI/scripts/tests.
 *
 * The ideal production setup is to depend on @types/node. This shim keeps the
 * quality gate deterministic in restricted package registries while covering
 * only the small Node surface imported in this codebase.
 */
declare module "node:fs" {
  export function readFileSync(path: string | URL, encoding: BufferEncoding): string;
  export function writeFileSync(path: string | URL, data: string, encoding?: BufferEncoding): void;
  export function readdirSync(path: string | URL): string[];
  export function mkdirSync(path: string | URL, options?: { recursive?: boolean }): string | undefined;
  export function existsSync(path: string | URL): boolean;
  export function mkdtempSync(prefix: string): string;
  export function rmSync(path: string | URL, options?: { recursive?: boolean; force?: boolean }): void;
}

declare module "node:path" {
  export function dirname(path: string): string;
  export function join(...paths: string[]): string;
  export function resolve(...paths: string[]): string;
}

declare module "node:url" {
  export function fileURLToPath(url: string | URL): string;
}

declare module "node:os" {
  export function tmpdir(): string;
}

type BufferEncoding =
  | "ascii"
  | "utf8"
  | "utf-8"
  | "utf16le"
  | "ucs2"
  | "ucs-2"
  | "base64"
  | "base64url"
  | "latin1"
  | "binary"
  | "hex";

declare const process: {
  argv: string[];
  env: Record<string, string | undefined>;
  exit(code?: number): never;
};

declare const console: {
  log(...data: unknown[]): void;
  error(...data: unknown[]): void;
  warn(...data: unknown[]): void;
};

declare class URL {
  constructor(url: string, base?: string | URL);
  searchParams: URLSearchParams;
  toString(): string;
}

declare class URLSearchParams {
  set(name: string, value: string): void;
  get(name: string): string | null;
  toString(): string;
}

interface ImportMeta {
  readonly url: string;
}
