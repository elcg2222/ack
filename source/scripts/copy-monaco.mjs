import { cpSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const root=dirname(dirname(fileURLToPath(import.meta.url)));
const src=join(root,'node_modules','monaco-editor','min','vs');
const dest=join(root,'public','monaco','vs');
if(existsSync(src)){mkdirSync(join(root,'public','monaco'),{recursive:true});cpSync(src,dest,{recursive:true});console.log('Monaco copied to public/monaco/vs');}