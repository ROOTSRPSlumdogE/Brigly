import {readFile,access,readdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';

const root=fileURLToPath(new URL('../',import.meta.url));
const pages=(await readdir(root)).filter(x=>x.endsWith('.html'));
let count=0;

for(const page of pages){
  const html=await readFile(path.join(root,page),'utf8');
  const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);
  if(new Set(ids).size!==ids.length){
    const seen=new Set();
    const dupes=ids.filter(id=>seen.has(id)?true:(seen.add(id),false));
    throw Error('Duplicate IDs in '+page+': '+dupes.join(', '));
  }
  if(!html.includes('lang="en"')||!html.includes('<title>'))throw Error('Missing metadata: '+page);

  for(const match of html.matchAll(/(?:href|src)="([^"]+)"/g)){
    const link=match[1];
    if(/^(https?:|mailto:|data:)/.test(link))continue;
    const [file,hash]=link.split('#');
    const target=path.join(root,file||page);
    await access(target);
    if(hash&&(file||page)!=='demo.html'){
      const text=await readFile(target,'utf8');
      if(!text.includes('id="'+hash+'"'))throw Error('Missing anchor '+link+' in '+page);
    }
    count++;
  }
  if(/<form\b/.test(html)&&page==='index.html')throw Error('Registration must remain closed');
  if(/fonts\.google/.test(html))throw Error('Unexpected third-party font');
}

for(const cssFile of ['site.css','demo.css']){
  const css=await readFile(path.join(root,'assets/css',cssFile),'utf8');
  if(/Georgia/i.test(css))throw Error('BrandKit typography violation (Georgia found) in '+cssFile);
}

for(const file of ['site.js','demo.js']){
  execFileSync(process.execPath,['--check',path.join(root,'assets/js',file)]);
}

console.log(`PASS: ${pages.length} pages, ${count} local references, unique IDs, BrandKit typography, metadata, closed registration and JS syntax.`);
