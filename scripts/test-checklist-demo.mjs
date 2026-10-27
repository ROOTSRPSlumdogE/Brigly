import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const c=vm.createContext({crypto,console});for(const file of ['workspace-state','schedule-state','shift-operations-state','demo-history','restaurant-history','planner-state','duties-state','checklist-history','team-chat-state','checklist-demo','duties-ui'])vm.runInContext(readFileSync(new URL('../assets/js/'+file+'.js',import.meta.url),'utf8'),c);
const B=c.Brigly,store={v:null,getItem(){return this.v},setItem(k,v){this.v=v}};
let s=B.load(store);const today=s.date;
assert(B.validState(s));assert.equal(s.checklistDemo.version,2);assert.equal(s.checklistDemo.liveDay,today);assert(!s.checklistDemo.skipped);

// Each service runs its own lists: lunch has no event setup, private events have no dinner closing routine.
assert(!B.work.tasks(s,B.addDays(today,-1),'Lunch').some(t=>t.list==='Event Setup'));
assert(B.work.defaultTasks(s,'Private events').some(t=>t.list==='Event Setup'));
assert(B.work.defaultTasks(s,'Dinner').length>=40&&B.work.defaultTasks(s,'Lunch').length>=20);
// Tonight-only tasks sit on top of today's routine without touching tomorrow.
assert(B.work.tasks(s,today,'Dinner').some(t=>t.specific&&/Bennett/.test(t.title)));
assert(!B.work.tasks(s,B.addDays(today,1),'Dinner').some(t=>t.specific));
// Today's services are staffed at every station.
for(const area of ['Floor','Bar','Kitchen'])assert(s.shifts.some(x=>x.date===today&&x.service==='Dinner'&&x.area===area));

// History is mostly, but not perfectly, complete, with real owners and notes.
s.role='manager';const groups=B.work.history(s,B.addDays(today,-30),B.addDays(today,-1));
const total=groups.reduce((n,g)=>n+g.totalCount,0),done=groups.reduce((n,g)=>n+g.completedCount,0);
assert(groups.length>40);assert(done/total>.85&&done/total<.995,'completion '+done/total);
assert(groups.some(g=>g.noteCount>0));
for(const g of groups.slice(0,10))for(const t of g.rows)if(t.check)assert(s.team.some(p=>p.id===t.check.by));
assert(!('privateItems' in s)&&s.orders.some(x=>x.id.startsWith('cdemo-')));
assert(s.chat.messages.filter(m=>m.thread==='team').length>=5&&s.chat.messages.some(m=>m.kind==='image'&&m.media.src)&&s.chat.messages.some(m=>m.kind==='todo'&&m.thread.startsWith('dm:')));
s.role='crew';s.crewId='alex';assert(B.chat.threads(s).some(t=>t.id==='team'&&t.unread>0));assert(B.chat.todos(s).some(m=>m.todo.for==='alex'));s.role='manager';

// Applied once: reloading keeps the same records, and the workspace still fits in browser storage.
assert(B.save(store,s));const again=B.load(store);
assert.equal(again.tasks.length,s.tasks.length);assert.equal(again.taskNotes.length,s.taskNotes.length);assert.equal(Object.keys(again.checks).length,Object.keys(s.checks).length);
assert(store.v.length<4000000,'storage '+store.v.length);

// The checklist screen renders the shift hero, station tiles and pinned notes.
s.service='Dinner';
const ui=c.createDutiesUI({state:()=>s,e:x=>String(x??''),button:(label,a,id='',attrs='')=>`<button data-action="${a}" data-id="${id}" ${attrs}>${label}</button>`,input:()=>'',textarea:()=>'',select:()=>'',render(){},openTasks(){}});
ui.listHandle('area','Bar');const html=ui.lists();
assert(html.includes('cl-modes'));assert(html.includes('cl-progress'));assert.equal((html.match(/class="cl-station"/g)||[]).length,3);
assert(html.includes('Martinez table'));assert(html.includes('Tonight only'));
console.log('PASS: per-service checklist templates, staffed shifts, tonight-only tasks, realistic history, one-time seeding, storage size and checklist hero UI.');

// Upgrade path: history seeded on an earlier day, first-release marker, and today's list emptied.
const files=['workspace-state','schedule-state','shift-operations-state','demo-history','restaurant-history','planner-state','duties-state','checklist-history','team-chat-state'];
const at=(now,list)=>{const Real=Date;class D extends Real{constructor(...a){super(...(a.length?a:[now]))}static now(){return new Real(now).getTime()}}const x=vm.createContext({crypto,console,Date:D});for(const f of list)vm.runInContext(readFileSync(new URL('../assets/js/'+f+'.js',import.meta.url),'utf8'),x);return x.Brigly;};
const box={v:null,getItem(){return this.v},setItem(k,v){this.v=v}};
const old=at('2026-10-25T15:00:00',files);let u=old.load(box);u.checklistDemo={version:1,anchor:'2026-10-25'};u.checklistScopes.push('2026-10-26|Lunch');old.save(box,u);
let L=at('2026-10-26T12:10:00',[...files,'checklist-demo']);u=L.load(box);
assert(L.validState(u));assert.equal(u.checklistDemo.liveDay,'2026-10-26');
const lunch=L.work.tasks(u,'2026-10-26','Lunch'),noon=Object.keys(u.checks['2026-10-26|Lunch']||{}).length;
assert(lunch.length>=20,'today lunch list restored');assert(lunch.some(t=>t.specific));assert(noon>0&&noon<lunch.length);
for(const area of ['Floor','Bar','Kitchen'])for(const list of ['Opening','Closing'])assert(lunch.some(t=>t.area===area&&t.list===list),area+' '+list);
L.save(box,u);L=at('2026-10-26T19:40:00',[...files,'checklist-demo']);u=L.load(box);
assert(Object.keys(u.checks['2026-10-26|Lunch']).length>noon,'crew keeps working through the day');
L.configure(u);u.role='manager';u.date='2026-10-26';u.service='Dinner';const reopened=Object.keys(u.checks['2026-10-26|Dinner'])[0];
u=L.change(u,{type:'check',id:reopened,done:false,at:new Date().toISOString()});L.save(box,u);u=L.load(box);assert(!u.checks['2026-10-26|Dinner'][reopened],'reopened task stays open');
console.log('PASS: upgrade from an earlier seed day restores today’s lists, live progress advances, and manual changes are respected.');
