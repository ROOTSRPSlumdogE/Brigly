import {mkdir,cp,readFile,writeFile,rm} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const root=fileURLToPath(new URL('../',import.meta.url));
const out=path.join(root,'dist');
await rm(out,{recursive:true,force:true});
await mkdir(out,{recursive:true});

const pages=['index.html','demo.html','privacy.html','terms.html','thanks.html','404.html'];
for(const name of [...pages,'site.webmanifest','app.webmanifest'])await cp(path.join(root,name),path.join(out,name));
for(const name of ['css','js','logos','icons','fonts'])await cp(path.join(root,'assets',name),path.join(out,'assets',name),{recursive:true});

await mkdir(path.join(out,'assets/images'),{recursive:true});
const images=[
  'social-preview.png',
  'brigly-service-editorial.webp',
  'brigly-seasonal-menu.webp',
  'brigly-kitchen-service.webp',
  'brigly-table-welcome.webp',
  'brigly-week-together.webp',
  'brigly-bar-preparation.webp',
  'brigly-restaurant-frontage.webp',
  'brigly-wine-comparison.webp',
  'brigly-dining-room.webp'
];
for(const name of images)await cp(path.join(root,'assets/images',name),path.join(out,'assets/images',name));

// Set only after the canonical public URL is owned and chosen.
const origin=process.env.SITE_URL?.replace(/\/$/,'');
if(origin){
  const u=new URL(origin);
  if(u.protocol!=='https:'||u.pathname!=='/'||u.search||u.hash||u.username||u.password)throw Error('SITE_URL must be an HTTPS origin');
  for(const name of pages){
    let html=await readFile(path.join(out,name),'utf8');
    html=html.replace('</head>',`<link rel="canonical" href="${origin}/${name}"><meta property="og:url" content="${origin}/${name}"></head>`).replace('content="assets/images/social-preview.png"',`content="${origin}/assets/images/social-preview.png"`);
    await writeFile(path.join(out,name),html);
  }
  await writeFile(path.join(out,'sitemap.xml'),`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${['index.html','privacy.html','terms.html'].map(p=>`<url><loc>${origin}/${p}</loc></url>`).join('')}</urlset>`);
}

await writeFile(path.join(out,'robots.txt'),`User-agent: *\nAllow: /\nDisallow: /demo.html\nDisallow: /thanks.html\n${origin?'Sitemap: '+origin+'/sitemap.xml\n':''}`);
console.log('Built deployable preview in Website/dist. Registration is closed. '+(origin?'Canonical metadata generated.':'Set SITE_URL to generate canonical metadata and sitemap.'));
