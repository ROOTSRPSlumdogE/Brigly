import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const c=vm.createContext({});for(const f of ['workspace-state','schedule-state','shift-operations-state','demo-history','restaurant-history','planner-state'])vm.runInContext(readFileSync(new URL('../assets/js/'+f+'.js',import.meta.url),'utf8'),c);
const B=c.Brigly;let s=B.starter('2026-10-25');assert(B.validState(s));const original=JSON.stringify(s);assert.equal(B.restaurantDemo.enrich(s),s);
assert(s.team.filter(p=>!p.active&&p.leftOn).length>=2);
for(const p of s.team.filter(p=>p.leftOn)){assert(s.shifts.filter(x=>x.person===p.id).every(x=>x.date<=p.leftOn));const r=B.ops.report(s,p.id,s.demoHistory.from,s.demoHistory.to);assert(r.shiftCount>30&&r.wageCost>1000&&r.tips>0);}
for(const x of s.shifts){if(x.date<s.demoHistory.from||x.date>s.demoHistory.planningTo)continue;for(const key of ['shiftNotes','unavailable','specials','reservations','briefings'])assert(s[key].some(y=>y.date===x.date&&y.service===x.service),key+' missing for '+x.date+' '+x.service);}
const preset=s.setup.services.find(x=>x.name==='Lunch'),date='2026-11-09';
s=B.change(s,{type:'plan:place',id:'test-place',presetId:preset.id,person:'alex',date});assert(s.shifts.some(x=>x.id==='test-place'&&x.payRate===s.scheduling.defaults.alex.rate));
assert.throws(()=>B.change(s,{type:'plan:place',id:'test-duplicate',presetId:preset.id,person:'alex',date}),/overlapping/);
assert.throws(()=>B.change(s,{type:'plan:place',id:'bad-crew',presetId:preset.id,person:'alex',date:'2026-11-10'},'crew'),/Only managers/);
assert.throws(()=>B.change(s,{type:'plan:place',id:'bad-former',presetId:preset.id,person:'demo-grace',date}),/not employed/);
s=B.change(s,{type:'plan:place',id:'move',shiftId:'test-place',person:'mia',date:'2026-11-10'});assert.equal(s.shifts.find(x=>x.id==='test-place').person,'mia');assert.equal(s.shifts.find(x=>x.id==='test-place').payRate,s.scheduling.defaults.mia.rate);
s=B.change(s,{type:'plan:save',id:'test-template',name:'Quiet week',week:date});assert.equal(s.planning.templates[0].entries.length,1);
const a={type:'plan:apply',id:'applied',templateId:'test-template',week:'2026-11-16'};s=B.change(s,a);const count=s.shifts.length;s=B.change(s,{...a,id:'again'});assert.equal(s.shifts.length,count);
let conflicting=B.change(s,{type:'plan:place',id:'conflict',presetId:preset.id,person:'mia',date:'2026-11-24'});conflicting.shifts.find(x=>x.id==='conflict').start='10:30';const before=JSON.stringify(conflicting);assert.throws(()=>B.change(conflicting,{...a,week:'2026-11-23'}),/overlapping/);assert.equal(JSON.stringify(conflicting),before);
const alex=s.team.find(p=>p.id==='alex');assert.throws(()=>B.change(s,{type:'ops:member',...alex,active:false,leftOn:'2026-05-01'}),/Reassign/);
const storage={getItem(){return this.v},setItem(k,v){this.v=v}};assert(B.save(storage,s));assert(storage.v.length<2400000);const reload=B.load(storage);assert.equal(reload.shifts.length,s.shifts.length);assert.equal(reload.planning.templates.length,1);assert(B.validState(reload));
console.log('PASS: planner assignment/move permissions, collision protection, atomic template reuse and duplicate skipping, employment dates, departed staff reports, complete service history and migration persistence.');

// Deletion is reversible and bulk operations are atomic.
let deletion=B.change(s,{type:'plan:remove',id:'trash-test',ids:['test-place']});
assert(!deletion.shifts.some(x=>x.id==='test-place'));
assert.equal(deletion.planning.removed.at(-1).shifts[0].id,'test-place');
deletion=B.change(deletion,{type:'plan:restore',id:'trash-test'});
assert.equal(JSON.stringify(deletion.shifts.find(x=>x.id==='test-place')),JSON.stringify(s.shifts.find(x=>x.id==='test-place')));
assert.equal(deletion.planning.removed.length,0);
assert.throws(()=>B.change(s,{type:'plan:remove',id:'crew-trash',ids:['test-place']},'crew'),/Only managers/);
let removed=B.change(s,{type:'plan:remove',id:'conflict-undo',ids:['test-place']});
removed=B.change(removed,{type:'plan:place',id:'replacement',person:'mia',date:'2026-11-10',presetId:preset.id});
assert.throws(()=>B.change(removed,{type:'plan:restore',id:'conflict-undo'}),/overlapping/);
assert.equal(removed.planning.removed.length,1);
const protectedShift=s.shifts.find(x=>B.schedule.absence(s,x));
assert(protectedShift);const beforeBulk=JSON.stringify(s);
assert.throws(()=>B.change(s,{type:'plan:remove',id:'atomic-delete',ids:['test-place',protectedShift.id]}),/absence/);
assert.equal(JSON.stringify(s),beforeBulk);
B.save(storage,removed);assert.equal(B.load(storage).planning.removed[0].id,'conflict-undo');
console.log('PASS: manager-only quick delete, exact undo, conflict-safe restore, persisted recovery and atomic bulk deletion.');
