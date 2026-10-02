import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root = fileURLToPath(new URL('../',import.meta.url));
const mime = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.webp':'image/webp','.png':'image/png'};
http.createServer(async (req,res) => {
  try {
    const route = decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    const relative = route === '/' ? 'index.html' : route.slice(1);
    const target = path.resolve(root,relative);
    if (!target.startsWith(root) || !mime[path.extname(target)] || /^(supabase|tests)[/\\]/.test(relative)) {res.writeHead(404);res.end();return;}
    res.writeHead(200,{'Content-Type':mime[path.extname(target)],'Cache-Control':'no-store'});
    res.end(await readFile(target));
  } catch {res.writeHead(404);res.end();}
}).listen(3000,'127.0.0.1',() => console.log('Prévia do Carijó: http://localhost:3000'));
