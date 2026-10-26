import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const c=vm.createContext({});for(const file of ['workspace-state','schedule-state','shift-operations-state','demo-history','restaurant-history','planner-state','duties-state'])vm.runInContext(readFileSync(new URL('../assets/js/'+file+'.js',import.meta.url),'utf8'),c);
const B=c.Brigly;let s=B.starter('2026-10-25');s.date='2026-10-25';s.service='Dinner';
const original=B.work.tasks(s)[0],next=B.addDays(s.date,1),previousCount=B.work.tasks(s).length;
s=B.change(s,{type:'check',id:original.id,done:true,at:'2026-10-25T12:00:00Z'});
s=B.change(s,{type:'put',collection:'tasks',item:{...original,title:'Only tonight'}});
assert.equal(B.work.tasks(s).length,previousCount);assert(B.work.tasks(s).some(t=>t.title==='Only tonight'));assert(!B.work.tasks(s,next,'Dinner').some(t=>t.title==='Only tonight'));
const changed=B.work.tasks(s).find(t=>t.title==='Only tonight');assert(s.checks[s.date+'|Dinner'][changed.id]);
s.role='crew';s.crewId='alex';s=B.change(s,{type:'check',id:changed.id,done:true,at:'2026-10-25T12:30:00Z'});assert.equal(s.checks[s.date+'|Dinner'][changed.id].by,'alex');
assert.throws(()=>B.change(s,{type:'put',collection:'tasks',item:{...changed,title:'Denied'}}));assert.throws(()=>B.change(s,{type:'check',id:original.id,done:true,at:''}));
s.role='manager';s=B.change(s,{type:'checklist:empty'});assert.equal(B.work.tasks(s).length,0);assert.equal(B.work.tasks(s,next,'Dinner').length,previousCount);
s=B.change(s,{type:'put',collection:'tasks',item:{id:'new-shift-task',list:'Closing',title:'Secure patio',area:'Floor'}});assert.equal(B.work.tasks(s).length,1);assert.equal(B.work.tasks(s)[0].list,'Closing');
const stored={getItem:()=>JSON.stringify(s)};const loaded=B.load(stored);assert(B.validState(loaded));assert.equal(B.work.tasks(loaded).length,1);
console.log('PASS: independent shift lists, preserved completion, assigned-crew updates and storage round-trip.');
const dinner=s.setup.services.find(x=>x.name==='Dinner');s=B.change(s,{type:'ops:service',...dinner,name:'Evening',apply:'defaults'});assert(s.checklistScopes.includes(s.date+'|Evening'));assert(B.work.tasks(s,s.date,'Evening').some(x=>x.title==='Secure patio'));assert(B.validState(s));
console.log('PASS: service renaming retains custom shift lists.');
s=B.starter('2026-10-25');s.date='2026-10-25';s.service='Dinner';
s=B.change(s,{type:'checklist:add',area:'Bar',list:'Opening',titles:'Check ice supply\nPrepare garnishes\nCheck ice supply'});
assert.equal(B.work.tasks(s).filter(t=>t.title==='Check ice supply').length,1);
const barCount=B.work.tasks(s).filter(t=>t.area==='Bar').length,kitchenBefore=B.work.tasks(s).filter(t=>t.area==='Kitchen').length;
s.role='crew';s.crewId='noah';const barTask=B.work.tasks(s).find(t=>t.area==='Bar'),kitchenTask=B.work.tasks(s).find(t=>t.area==='Kitchen');
s=B.change(s,{type:'check',id:barTask.id,done:true,at:'2026-10-25T17:00:00Z'});assert.equal(s.checks[s.date+'|Dinner'][barTask.id].by,'noah');assert.throws(()=>B.change(s,{type:'check',id:kitchenTask.id,done:true,at:''}));assert.throws(()=>B.change(s,{type:'checklist:add',area:'Bar',list:'Closing',titles:'Denied'}));
s.role='manager';s=B.change(s,{type:'checklist:empty',area:'Bar',list:'Opening'});assert.equal(B.work.tasks(s).filter(t=>t.area==='Bar'&&t.list==='Opening').length,0);assert.equal(B.work.tasks(s).filter(t=>t.area==='Kitchen').length,kitchenBefore);assert(B.work.tasks(s).some(t=>t.area==='Bar'&&t.list==='Closing'));assert(B.work.tasks(s,B.addDays(s.date,1),'Dinner').some(t=>t.area==='Bar'&&t.list==='Opening'));
console.log('PASS: station-based completion permissions, bulk task entry, duplicate skipping and station/phase-specific clearing.');
vm.runInContext(readFileSync(new URL('../assets/js/duties-ui.js',import.meta.url),'utf8'),c);
s=B.starter('2026-10-25');s.role='crew';s.crewId='noah';s.date='2026-10-25';s.service='Dinner';
const ui=c.createDutiesUI({state:()=>s,e:x=>String(x??''),button:(label,a,id,attrs)=>'<button data-action="'+a+'" data-id="'+id+'" '+attrs+'>'+label+'</button>',render(){}});
assert.equal(ui.listContext().area,'Bar');let markup=ui.lists();assert(markup.includes('Restock the bar'));assert(!markup.includes('Polish glassware'));assert(!markup.includes('Edit list'));ui.listHandle('area','Kitchen');markup=ui.lists();assert(markup.includes('disabled'));assert(markup.includes('Viewing another team'));ui.listHandle('open','Closing');assert.equal(ui.listContext().list,'Closing');s.crewId='leo';assert.equal(ui.listContext().area,'Kitchen');s.role='manager';assert(ui.lists().includes('Edit list'));ui.listHandle('manage');assert(ui.lists().includes('Add tasks'));
console.log('PASS: crew station defaults, read-only other teams, manager edit mode and direct closing-list navigation.');

// Service defaults per service, custom checklists, and shift-specific task segregation
s=B.starter('2026-10-25');s.role='manager';s.date='2026-10-25';s.service='Lunch';
s=B.change(s,{type:'checklist:add-default',area:'Bar',list:'Opening',titles:'Check lunch draft lines\nStock iced tea',service:'Lunch'});
assert(B.work.defaultTasks(s,'Lunch').some(t=>t.title==='Check lunch draft lines'));
assert(!B.work.defaultTasks(s,'Dinner').some(t=>t.title==='Check lunch draft lines'));
// Unmaterialized future lunch automatically receives default tasks
const futureLunch=B.work.tasks(s,'2026-10-29','Lunch');
assert(futureLunch.some(t=>t.title==='Check lunch draft lines'));
assert(futureLunch.some(t=>t.title==='Stock iced tea'));

// Custom checklist creation (e.g. VIP Event Prep, Mid-shift, Deep Clean)
s.service='Dinner';s.date='2026-10-25';
s=B.change(s,{type:'checklist:add',area:'Floor',list:'VIP Event Prep',titles:'Arrange VIP floral centerpiece\nStage private dining menus',specific:true});
const dinnerTasks=B.work.tasks(s,'2026-10-25','Dinner');
const vipTask=dinnerTasks.find(t=>t.title==='Arrange VIP floral centerpiece');
assert(vipTask);
assert.equal(vipTask.list,'VIP Event Prep');
assert.equal(B.work.isSpecific(vipTask),true);
assert(B.work.lists(s,'2026-10-25','Dinner').includes('VIP Event Prep'));

// Save current shift tasks as default for service
s=B.change(s,{type:'checklist:save-defaults',service:'Dinner'});
const dinnerDefaults=B.work.defaultTasks(s,'Dinner');
assert(dinnerDefaults.some(t=>t.title==='Arrange VIP floral centerpiece'));
assert.equal(dinnerDefaults.every(t=>!t.date&&t.service==='Dinner'),true);

// Clear specific default list
s=B.change(s,{type:'checklist:empty-default',service:'Dinner',area:'Floor',list:'VIP Event Prep'});
assert(!B.work.defaultTasks(s,'Dinner').some(t=>t.area==='Floor'&&t.list==='VIP Event Prep'));

// UI: Shift-specific tasks rendered separately from default routine
s=B.starter('2026-10-25');s.role='manager';s.date='2026-10-25';s.service='Dinner';
s=B.change(s,{type:'checklist:add',area:'Bar',list:'Opening',titles:'Set up oyster bar station',specific:true});
let uiMarkup=ui.lists();
ui.listHandle('area','Bar');
ui.listHandle('phase','Opening');
uiMarkup=ui.lists();
assert(uiMarkup.includes('specific-tasks-panel'));
assert(uiMarkup.includes('Special &amp; event tasks')||uiMarkup.includes('Special & event tasks'));
assert(uiMarkup.includes('Shift-specific'));
assert(uiMarkup.includes('Set up oyster bar station'));
assert(uiMarkup.includes('default-tasks-panel'));
assert(uiMarkup.includes('Standard opening routine')||uiMarkup.includes('Standard Opening routine'));

// UI: Manager mode switch to default service templates
ui.listHandle('mode','defaults');
uiMarkup=ui.lists();
assert(uiMarkup.includes('service-default-banner'));
assert(uiMarkup.includes('Default service template'));
assert(uiMarkup.includes('service-default-tabs'));
assert(uiMarkup.includes('checklist-default-svc'));
ui.listHandle('default-svc','Lunch');
assert(ui.lists().includes('Default checklists for Lunch'));
ui.listHandle('mode','shift');
assert(!ui.lists().includes('service-default-banner'));

console.log('PASS: service-specific defaults, custom checklists, shift-specific segregation and manager default template UI.');


// Lists are due by the service times; a task added to the template from a customised shift also lands on tonight's list.
s=B.starter('2026-10-25');s.role='manager';s.date='2026-10-25';s.service='Dinner';
const dinner2=s.setup.services.find(x=>x.name==='Dinner');
assert.equal(B.work.due(s,'Opening').time,dinner2.start);assert.equal(B.work.due(s,'Event Setup').time,dinner2.start);
assert.equal(B.work.due(s,'Closing').short,'Close');assert(B.work.due(s,'Closing').at>B.work.due(s,'Mid-shift Prep').at);assert.equal(B.work.due(s,'VIP Event Prep'),null);
s=B.change(s,{type:'checklist:add',area:'Floor',list:'Opening',titles:'Tonight only test',specific:true});
s=B.change(s,{type:'checklist:add-default',area:'Floor',list:'Opening',titles:'Wipe down menus',service:'Dinner',alsoShift:true});
assert(B.work.defaultTasks(s,'Dinner').some(t=>t.title==='Wipe down menus'));
assert(B.work.tasks(s).some(t=>t.title==='Wipe down menus'&&!B.work.isSpecific(t)),'tonight gets it as part of the routine');
s=B.change(s,{type:'checklist:add-default',area:'Floor',list:'Opening',titles:'Wipe down menus',service:'Dinner',alsoShift:true});
assert.equal(B.work.tasks(s).filter(t=>t.title==='Wipe down menus').length,1,'no duplicates');
console.log('PASS: list due times from service hours and template additions that also reach tonight’s customised list.');
