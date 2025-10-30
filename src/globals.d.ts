/// <reference types="node" />
/// <reference path="../types/node.d.ts" />

// Explicit Node.js global declarations for GitHub Actions compatibility
declare global {
  namespace NodeJS {
    interface Process {
      env: {
        [key: string]: string | undefined;
        NODE_ENV?: string;
        RFPMART_USERNAME?: string;
        RFPMART_PASSWORD?: string;
      };
      exit(code?: number): never;
      cwd(): string;
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
}

// Ensure this file is treated as a module
export {};