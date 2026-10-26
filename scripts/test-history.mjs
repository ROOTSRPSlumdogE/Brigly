import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const c=vm.createContext({});
for(const file of ['workspace-state','schedule-state','shift-operations-state'])vm.runInContext(readFileSync(new URL(`../assets/js/${file}.js`,import.meta.url),'utf8'),c);
const B=c.Brigly,original=B.starter('2026-10-25');
original.shiftNotes.push({id:'user-note',date:original.date,service:original.service,author:'jamie',priority:'manager',body:'Keep this handover.',archived:false,updated:'2026-10-25T12:00:00.000Z'});
const saved=JSON.stringify(original);
vm.runInContext(readFileSync(new URL('../assets/js/demo-history.js',import.meta.url),'utf8'),c);
const s=B.demo.enrich(original,'2026-10-25');
assert(B.validState(s));assert.equal(JSON.stringify(original),saved);
assert.equal(s.demoHistory.from,'2026-05-01');assert.equal(s.demoHistory.to,'2026-10-25');
assert(s.shifts.length>1200);assert(s.reservations.length>2000);assert(s.scheduling.requests.length>80);
assert.equal(new Set(s.shifts.filter(x=>x.demo&&x.date<=s.demoHistory.to).map(x=>x.date.slice(0,7))).size,6);
assert(s.shifts.some(x=>x.end<x.start));assert(new Set(s.shifts.map(x=>x.service)).size>=5);
for(const field of ['shifts','shiftNotes','reservations','orders','specials','briefings','unavailable'])for(const record of original[field])assert.equal(JSON.stringify(s[field].find(x=>x.id===record.id)),JSON.stringify(record));
assert.equal(B.demo.enrich(s,'2026-10-26'),s);
assert.equal(JSON.stringify(s),JSON.stringify(B.demo.enrich(original,'2026-10-25')));
for(const person of s.team){const shifts=s.shifts.filter(x=>x.person===person.id);for(let i=0;i<shifts.length;i++)for(let j=i+1;j<shifts.length;j++)assert(!B.overlaps(shifts[i],shifts[j]),`Conflicting shifts: ${shifts[i].id}, ${shifts[j].id}`);}
for(const r of s.reservations.filter(x=>x.demo)){const min=t=>Number(t.slice(0,2))*60+Number(t.slice(3));assert(!s.reservations.some(x=>x.id!==r.id&&x.date===r.date&&x.table===r.table&&Math.abs(min(x.time)-min(r.time))<120),`Table conflict ${r.id}`);}
const report=B.ops.report(s,'alex',s.demoHistory.from,s.demoHistory.to,'manager');
assert(report.shiftCount>80);assert(report.wageCost>5000);assert(report.tips>1000);assert(report.sickShifts+report.timeOffShifts+report.lateShifts>0);
assert(Math.abs(report.wageCost-report.rows.reduce((sum,x)=>sum+x.wageCost,0))<0.02);
const memory={value:null,setItem(k,v){this.value=v;},getItem(){return this.value;}};
assert(B.save(memory,s));assert(memory.value.length<2500000);assert.equal(B.load(memory).shifts.length,s.shifts.length);
console.log(`PASS: six-month history (${s.shifts.length} shifts, ${s.reservations.length} bookings), varied services, nonconflicting assignments and tables, preserved records, idempotent migration, report totals and storage round-trip.`);
