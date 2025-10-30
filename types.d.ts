// Comprehensive Node.js type declarations for GitHub Actions compatibility

declare module 'path' {
  export function join(...paths: string[]): string;
  export function resolve(...pathSegments: string[]): string;
  export function relative(from: string, to: string): string;
  export function dirname(p: string): string;
  export function basename(p: string, ext?: string): string;
  export function extname(p: string): string;
  export function parse(p: string): any;
  export function format(pathObject: any): string;
  export function normalize(p: string): string;
  export function isAbsolute(p: string): boolean;
  export const sep: string;
  export const delimiter: string;
  export const posix: any;
  export const win32: any;
}

declare module 'fs' {
  export function readFile(path: string, encoding?: string): Promise<string>;
  export function writeFile(path: string, data: string): Promise<void>;
  export function readdir(path: string, options?: any): Promise<any[]>;
  export function mkdir(path: string, options?: any): Promise<void>;
  export function stat(path: string): Promise<any>;
  export function exists(path: string): Promise<boolean>;
  export function readFileSync(path: string, encoding?: string): string;
  export function writeFileSync(path: string, data: string): void;
  export function readdirSync(path: string, options?: any): any[];
  export function mkdirSync(path: string, options?: any): void;
  export function statSync(path: string): any;
  export function existsSync(path: string): boolean;
}

declare global {
  namespace NodeJS {
    interface Process {
      env: ProcessEnv;
      exit(code?: number): never;
      cwd(): string;
      platform: string;
      version: string;
      argv: string[];
      execPath: string;
      pid: number;
      title: string;
      arch: string;
    }
    
    interface ProcessEnv {
      [key: string]: string | undefined;
      NODE_ENV?: string;
      PATH?: string;
    }
    
    interface Global {
      [key: string]: any;
    }

    interface Timer {
      hasRef(): boolean;
      ref(): this;
      refresh(): this;
      unref(): this;
    }

    interface Timeout extends Timer {
      close(): void;
    }
  }

  var process: NodeJS.Process;
  var require: NodeRequire;
  var module: NodeModule;
  var __dirname: string;
  var __filename: string;
  var global: NodeJS.Global;
  var console: Console;
  var Buffer: BufferConstructor;
  var setTimeout: (callback: (...args: any[]) => void, ms: number, ...args: any[]) => NodeJS.Timeout;
  var clearTimeout: (timeoutId: NodeJS.Timeout) => void;
  var setInterval: (callback: (...args: any[]) => void, ms: number, ...args: any[]) => NodeJS.Timer;
  var clearInterval: (intervalId: NodeJS.Timer) => void;
  var setImmediate: (callback: (...args: any[]) => void, ...args: any[]) => NodeJS.Immediate;
  var clearImmediate: (immediateId: NodeJS.Immediate) => void;

  interface NodeRequire {
    (id: string): any;
    resolve(id: string): string;
    cache: any;
    extensions: any;
    main: NodeModule | undefined;
  }

  interface NodeModule {
    exports: any;
    require: NodeRequire;
    id: string;
    filename: string;
    loaded: boolean;
    parent: NodeModule | null;
    children: NodeModule[];
    paths: string[];
  }

  interface Console {
    log(...args: any[]): void;
    error(...args: any[]): void;
    warn(...args: any[]): void;
    info(...args: any[]): void;
    debug(...args: any[]): void;
    trace(...args: any[]): void;
    assert(value: any, message?: string, ...optionalParams: any[]): void;
    count(label?: string): void;
    countReset(label?: string): void;
    group(...label: any[]): void;
    groupCollapsed(...label: any[]): void;
    groupEnd(): void;
    time(label?: string): void;
    timeEnd(label?: string): void;
    timeLog(label?: string, ...data: any[]): void;
    timeStamp(label?: string): void;
    profile(label?: string): void;
    profileEnd(label?: string): void;
    table(tabularData: any, properties?: string[]): void;
    clear(): void;
    dir(obj: any, options?: any): void;
    dirxml(...data: any[]): void;
  }
}