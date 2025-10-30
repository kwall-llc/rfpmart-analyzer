// Global Node.js type declarations
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';
import * as util from 'util';

declare global {
  namespace NodeJS {
    interface Process {
      env: ProcessEnv;
      exit(code?: number): never;
      cwd(): string;
      platform: string;
      version: string;
    }
    
    interface ProcessEnv {
      [key: string]: string | undefined;
    }
    
    interface Global {
      [key: string]: any;
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
}