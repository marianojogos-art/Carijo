// Local static build only: no Wrangler, credentials, network, or deployment.
import assert from 'node:assert/strict';
import {readdir,readFile,mkdir,mkdtemp,copyFile,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const root=fileURLToPath(new URL('../',import.meta.url));
const excludes=(await readFile(path.join(root,'.assetsignore'),'utf8')).split(/\r?\n/).filter(Boolean);
const artifact=await mkdtemp(path.join(tmpdir(),'carijo-static-')),destination=path.join(artifact,'public'),manifest=[];
async function collect(directory=''){
 for(const entry of await readdir(path.join(root,directory),{withFileTypes:true})){
  const relative=path.posix.join(directory,entry.name);
  if(entry.name.startsWith('.')||entry.name==='node_modules'||excludes.some(pattern=>path.matchesGlob(relative,pattern)||path.matchesGlob(relative+'/',pattern)))continue;
  if(entry.isDirectory()){await collect(relative);continue;}
  assert(entry.isFile(),`Unsupported asset: ${relative}`);
  assert(['.html','.js','.mjs','.css','.json','.webp','.png','.svg','.jpg','.ico','.woff','.woff2'].includes(path.extname(relative))||['_headers','_redirects'].includes(relative),`Unexpected public file: ${relative}`);
  const content=await readFile(path.join(root,relative));
  if(/\.m?js$/.test(relative))execFileSync(process.execPath,['--check',path.join(root,relative)]);
  if(relative.endsWith('.json'))JSON.parse(content);
  manifest.push({file:relative,sha256:createHash('sha256').update(content).digest('hex'),bytes:content.length});
  await mkdir(path.dirname(path.join(destination,relative)),{recursive:true});await copyFile(path.join(root,relative),path.join(destination,relative));
 }
}
await collect();
const paths=new Set(manifest.map(item=>item.file));
for(const item of manifest.filter(item=>/\.(html|m?js|css)$/.test(item.file))){
 const content=await readFile(path.join(destination,item.file),'utf8');
 const matches=item.file.endsWith('.html')?[...content.matchAll(/(?:src|href)="([^"#]+)"/g)].map(m=>m[1]):item.file.endsWith('.css')?[...content.matchAll(/url\(['"]?([^)'"\s]+)['"]?\)/g)].map(m=>m[1]):[...content.matchAll(/(?:from\s*|import\s*)['"](\.\.?\/[^'"]+)['"]/g)].map(m=>m[1]);
 for(const reference of matches){if(/^(?:https?:|data:|#)/.test(reference))continue;const target=path.posix.normalize(path.posix.join(path.posix.dirname(item.file),reference.split(/[?#]/)[0]));assert(paths.has(target),`Missing asset: ${item.file} -> ${reference}`);}
}
await writeFile(path.join(artifact,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(`Build estático local: ${manifest.length} arquivos; sintaxe, JSON e referências locais validados.\nArtefato: ${destination}\nManifesto SHA-256: ${path.join(artifact,'manifest.json')}`);
