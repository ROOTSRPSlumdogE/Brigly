import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import vm from 'node:vm';
const c=vm.createContext({});
for(const file of ['workspace-state','schedule-state','shift-operations-state','demo-history','restaurant-history','planner-state','duties-state','checklist-history','app-navigation','shift-home','shift-operations-ui'])vm.runInContext(readFileSync(new URL('../assets/js/'+file+'.js',import.meta.url),'utf8'),c);
const B=c.Brigly;let s=B.starter('2026-10-25');s.date='2026-10-25';s.service='Dinner';s.role='manager';
const e=x=>String(x??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const button=(label,action,id='',extra='',style='secondary')=>`<button type="button" class="button ${style}" data-action="${action}" data-id="${e(id)}" ${extra}>${e(label)}</button>`;
const badge=(label,tone='')=>`<span class="badge ${tone}">${e(label)}</span>`;
const input=(name,label,value='',type='text',attrs='')=>`<label>${label}<input name="${name}" type="${type}" value="${e(value)}" ${attrs}></label>`;
const select=(name,label,values,value)=>`<label>${label}<select name="${name}">${values.map(v=>{const [k,t]=Array.isArray(v)?v:[v,v];return `<option value="${e(k)}" ${k===value?'selected':''}>${e(t)}</option>`;}).join('')}</select></label>`;
let screens=0;
const ops=c.createShiftOperationsUI({state:()=>s,e,button,badge,input,textarea:()=>'',select,dateLabel:x=>x,render(){},commit(){},open(){},reportScreen(){screens++;},createInContext(){},navigate(){}});

// Every reporting module renders with real six-month data, stays fast and escapes content.
const tabs=['overview','members','checklists','orders','reservations','eighty-six','specials'];
for(const tab of tabs){
 ops.handle('report-tab',tab,{});
 const t0=performance.now(),html=ops.section('reports'),ms=performance.now()-t0;
 assert(html.includes('manager-reports-hub'),tab+' renders the hub');
 assert(html.includes(`data-id="${tab}" aria-pressed="true"`),tab+' tab is selected');
 assert(ms<1500,`${tab} report rendered in ${ms.toFixed(0)}ms`);
 console.log(`  ${tab.padEnd(13)} ${ms.toFixed(0).padStart(4)}ms  ${(html.length/1024).toFixed(0)}KB`);
}
assert.equal(screens,tabs.length);
ops.handle('report-tab','orders',{});assert(ops.section('reports').includes('Summarized supply order list'));
ops.handle('report-tab','specials',{});assert(ops.section('reports').includes('I HAVE READ THIS'));
ops.handle('report-tab','eighty-six',{});assert(ops.section('reports').includes('Most frequently 86'));
for(const r of ['today','7','month','30','six']){ops.handle('report-range',r,{});assert(ops.section('reports').includes('manager-reports-hub'));}
s.orders.push({id:'xss-order',name:'<img src=x onerror=alert(1)>',quantity:1,unit:'box',area:'Bar',note:'',author:'noah',status:'Requested',feedback:''});
ops.handle('report-tab','orders',{});let html=ops.section('reports');assert(!html.includes('<img src=x'));assert(html.includes('&lt;img'));
console.log('PASS: seven manager report modules, date presets, summarized orders, briefing read log, 86 trends, escaping and render budget.');

// Onboarding: the confirm button carries its CTA class and the manager sees who has read it.
const brief=s.briefings.find(x=>x.date===s.date&&x.service==='Dinner');
const crew=[...new Set(s.shifts.filter(x=>x.date===s.date&&x.service==='Dinner').map(x=>x.person))].filter(id=>id!==s.managerId);
brief.acks=[crew[0]];
html=ops.hub(s.date,'Dinner');
assert(/class="button onboarding-ack-cta"[^>]*data-action="ack"/.test(html),'single class attribute on the confirm CTA');
assert(html.includes('Team read confirmations (1 of'));assert(html.includes('Pressed “I’ve read this”'));
const home=c.createShiftHome({state:()=>s,e,dateLabel:x=>x,render(){},focus(){},close(){},open(){}});
html=home.render();
assert(html.indexOf('onboarding-spotlight')<html.indexOf('service-digest'),'onboarding sits above the digest');
assert(html.includes('Who pressed “I have read this”'));
assert(html.includes('Specials on the menu'));assert(html.includes('special-price-pill'));
assert(!/Before taking orders[\s\S]*?Special · \$/.test(html),'specials no longer mixed into the 86 card');
s.role='crew';s.crewId=crew.find(id=>B.person(id)?.access==='crew'&&id!==crew[0]);html=home.render();
assert(html.includes('I have read this briefing'));assert(html.includes('needs-ack'));
brief.acks.push(s.crewId);html=home.render();assert(html.includes('You confirmed reading this shift briefing'));
console.log('PASS: prominent onboarding confirmation, manager read-receipt tracker and dedicated specials card.');

// Arrivals rows: status badge lives inside the info column, never beside the name as its own column.
s.role='manager';html=home.render();
const rows=html.match(/<div class="digest-row arrival-row">[\s\S]*?<\/button><\/div><\/div>/g)||[];
assert(rows.length>0);
for(const row of rows){assert(row.includes('arrival-time-box'));assert(row.includes('arrival-action'));assert(/arrival-info[\s\S]*badge tone-/.test(row));}
console.log('PASS: arrivals rows use a three-column time · details · action layout with inline status.');
