import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import vm from 'node:vm';
const c=vm.createContext({});for(const file of ['workspace-state','schedule-state','shift-operations-state','demo-history','restaurant-history','planner-state','duties-state','checklist-history','duties-ui'])vm.runInContext(readFileSync(new URL('../assets/js/'+file+'.js',import.meta.url),'utf8'),c);
const B=c.Brigly;let s=B.starter('2026-10-25');s.date='2026-10-25';s.service='Dinner';
// Seeded demo notes exist on today and past shifts, and serialized size stays well under localStorage limits.
assert(s.taskNotes.length>=6,'Starter demo includes seeded manager & crew task notes');
assert(JSON.stringify(s).length<2200000,'Lean event storage keeps state compact');
let task=B.work.tasks(s).find(t=>t.area==='Bar'&&t.list==='Closing');
const initialBarNotes=B.work.notes(s,task.id).length;
const initialTotalNotes=s.taskNotes.length;
s=B.change(s,{type:'checklist:note',id:'manager-note',task:task.id,body:'Important: check stock before service.',important:true});
s.role='crew';s.crewId='noah';s=B.change(s,{type:'checklist:note',id:'crew-note',task:task.id,body:'Could not restock Miller Lite.',stockItem:'Miller Lite'});
assert.equal(s.unavailable.find(x=>x.id==='stock-crew-note').status,'Reported');
assert.equal(B.work.notes(s,task.id).length,initialBarNotes+2);
assert.throws(()=>B.change(s,{type:'checklist:note',id:'crew-priority',task:task.id,body:'No',important:true}));
s.crewId='alex';assert.throws(()=>B.change(s,{type:'checklist:note',id:'other-station',task:task.id,body:'No'}));
assert.throws(()=>B.work.history(s,s.date,s.date));
s.crewId='noah';s=B.change(s,{type:'check',id:task.id,done:true,at:'2026-10-25T18:00:00Z'});s=B.change(s,{type:'check',id:task.id,done:false,at:'2026-10-25T18:01:00Z'});
assert(s.taskEvents.some(x=>x.task===task.id&&x.kind==='reopened'&&x.by==='noah'));
s.role='manager';s=B.change(s,{type:'put',collection:'tasks',item:{...task,title:'Check beer stock'}});
task=B.work.tasks(s).find(t=>t.title==='Check beer stock');
assert.equal(B.work.notes(s,task.id).length,initialBarNotes+2);
assert(s.taskEvents.some(x=>x.task===task.id&&x.kind==='reopened'));
s=B.change(s,{type:'remove',collection:'tasks',id:task.id});
let report=B.work.history(s,s.date,s.date,'Dinner','Bar');
let row=report[0].rows.find(x=>x.id===task.id);
assert(row.removed);assert.equal(row.notes.length,initialBarNotes+2);assert(row.events.some(x=>x.kind==='removed'));
assert.equal(B.work.history(s,'2030-01-01','2030-01-02').length,0);
// Multi-day reporting, filters, contributors and CSV export.
const pastReport=B.work.history(s,'2026-10-18','2026-10-24');
assert(pastReport.length>=7,'Manager can report across past days and services');
assert(pastReport.some(g=>g.contributors.length>0&&g.completedCount>0));
const notesOnly=B.work.history(s,'2026-10-18','2026-10-25','','',{filter:'important'});
assert(notesOnly.every(g=>g.rows.every(r=>r.notes.some(n=>n.important))));
const csv=B.work.historyCSV(s,'2026-10-24','2026-10-25');
assert(csv.includes('Brigly checklist completion & notes report'));
assert(csv.includes('Miller Lite'));
const dinner=s.setup.services.find(x=>x.name==='Dinner');
s=B.change(s,{type:'ops:service',...dinner,name:'Evening',apply:'defaults'});
assert(s.taskNotes.filter(n=>n.date===s.date).every(n=>n.service==='Evening'));
assert(B.work.history(s,s.date,s.date,'Evening','Bar').length);
const loaded=B.load({getItem:()=>JSON.stringify(s)});
assert.equal(loaded.taskNotes.length,initialTotalNotes+2);
assert.equal(loaded.taskEvents.length,s.taskEvents.length);
assert(B.validState(loaded));
// First operation may remove a default task: retain its remapped notes and imported completion.
s=B.starter('2026-10-25');s.date='2026-10-25';s.service='Dinner';task=B.work.tasks(s)[0];
s=B.change(s,{type:'checklist:note',id:'before-removal',task:task.id,body:'Keep this record'});
s=B.change(s,{type:'remove',collection:'tasks',id:task.id});
report=B.work.history(s,s.date,s.date,'Dinner');
assert(report[0].rows.some(t=>t.removed&&t.notes.some(n=>n.id==='before-removal')));
console.log('PASS: manager history, task notes, priority permissions, atomic 86 reports, completion/reopening audit, removed-task retention, remapping, service rename, CSV export and persistence.');
const removedIds=new Set(s.taskEvents.filter(x=>x.kind==='removed').map(x=>x.task));
s=B.change(s,{type:'checklist:add',area:'Floor',list:'Opening',titles:'New task after deletion'});
assert(!removedIds.has(B.work.tasks(s).find(x=>x.title==='New task after deletion').id));
console.log('PASS: deleted task identifiers are not reused by new checklist tasks.');
// UI verification: both manager important notes and crew 86 notes render inline on checklists and in reports.
s=B.starter('2026-10-25');s.date='2026-10-25';s.service='Dinner';s.role='manager';
const ui=c.createDutiesUI({
 state:()=>s,
 e:x=>String(x??''),
 button:(label,a,id='',attrs='',style='')=>`<button data-action="${a}" data-id="${id}" class="${style}" ${attrs}>${label}</button>`,
 input:(name,label,value='',type='text',attrs='')=>`<input name="${name}" value="${value}" type="${type}" ${attrs}>`,
 textarea:(name,label,value='',attrs='')=>`<textarea name="${name}" ${attrs}>${value}</textarea>`,
 select:(name,label,values,value)=>`<select name="${name}" data-value="${value}">${values.length}</select>`,
 render(){},
 openTasks(){}
});
ui.listHandle('area','Bar');
const barHtml=ui.lists();
assert(barHtml.includes('Super important today, please do not forget'));
assert(barHtml.includes('86 Draught pale ale'));
ui.listHandle('view','history');
ui.listHandle('range','7');
const reportHtml=ui.lists();
assert(reportHtml.includes('MANAGER CHECKLIST REPORTING'));
assert(reportHtml.includes('Completed by:'));
assert(reportHtml.includes('Download CSV'));
console.log('PASS: inline multi-note checklist display and multi-day manager report UI.');
