/// <reference types="node" />

// Comprehensive Node.js type declarations for TypeScript compatibility

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
      
      // EventEmitter methods for process events
      on(event: 'uncaughtException', listener: (error: Error) => void): this;
      on(event: 'unhandledRejection', listener: (reason: any, promise: Promise<any>) => void): this;
      on(event: 'SIGINT' | 'SIGTERM' | 'SIGHUP' | 'SIGBREAK', listener: () => void): this;
      on(event: 'beforeExit' | 'exit', listener: (code: number) => void): this;
      on(event: 'warning', listener: (warning: Error) => void): this;
      on(event: string | symbol, listener: (...args: any[]) => void): this;
      
      once(event: 'uncaughtException', listener: (error: Error) => void): this;
      once(event: 'unhandledRejection', listener: (reason: any, promise: Promise<any>) => void): this;
      once(event: 'SIGINT' | 'SIGTERM' | 'SIGHUP' | 'SIGBREAK', listener: () => void): this;
      once(event: 'beforeExit' | 'exit', listener: (code: number) => void): this;
      once(event: 'warning', listener: (warning: Error) => void): this;
      once(event: string | symbol, listener: (...args: any[]) => void): this;
      
      removeListener(event: string | symbol, listener: (...args: any[]) => void): this;
      off(event: string | symbol, listener: (...args: any[]) => void): this;
      emit(event: string | symbol, ...args: any[]): boolean;
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

    interface Immediate {
      hasRef(): boolean;
      ref(): this;
      unref(): this;
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

// Ensure this file is treated as a module
export {};