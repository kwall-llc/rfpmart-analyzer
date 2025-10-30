// Global Node.js type declarations
declare module 'path' {
  export = import('node:path');
}

declare module 'fs' {
  export = import('node:fs');
}

declare module 'crypto' {
  export = import('node:crypto');
}

declare module 'util' {
  export = import('node:util');
}

declare var process: NodeJS.Process;
declare var require: NodeRequire;
declare var module: NodeModule;
declare var __dirname: string;
declare var __filename: string;
declare var global: NodeJS.Global;
declare var console: Console;