import http from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../dist/',import.meta.url));
const types={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.ttf':'font/ttf','.webmanifest':'application/manifest+json','.xml':'application/xml','.txt':'text/plain'};
http.createServer(async(req,res)=>{try{const url=new URL(req.url,'http://localhost');const rel=decodeURIComponent(url.pathname)==='/'?'index.html':decodeURIComponent(url.pathname).slice(1);const p=path.resolve(root,rel);if(!p.startsWith(root))throw Error('Invalid path');const data=await readFile(p);res.writeHead(200,{'Content-Type':types[path.extname(p)]||'application/octet-stream'});res.end(data);}catch{res.writeHead(404,{'Content-Type':'text/html'});res.end(await readFile(path.join(root,'404.html')));}}).listen(8000,'127.0.0.1',()=>console.log('Local: http://127.0.0.1:8000'));
