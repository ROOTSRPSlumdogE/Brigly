import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import vm from 'node:vm';
const c=vm.createContext({});for(const file of ['workspace-state','schedule-state','shift-operations-state','demo-history','restaurant-history','planner-state','duties-state','checklist-history','app-navigation','shift-home'])vm.runInContext(readFileSync(new URL('../assets/js/'+file+'.js',import.meta.url),'utf8'),c);
const B=c.Brigly;let s=B.starter('2026-10-25');s.role='crew';s.crewId='alex';s.date='2026-10-21';s.service='Dinner';
const escape=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let opened='',closed=false;const home=c.createShiftHome({state:()=>s,e:escape,dateLabel:x=>x,render(){},focus(date,service){s.date=date;s.service=service;},close(){closed=true},open(title,html){opened=title+html}});
let html=home.render();assert.equal((html.match(/class="instant-action"/g)||[]).length,6);assert(html.includes('schedule-report-sick'));assert(html.includes('schedule-report-late'));assert(html.includes('schedule-shift-tips'));assert(html.includes('data-date="2026-10-21"'));assert(!html.includes('summary-grid'));assert(!html.includes('schedule-tabs'));
const own=s.shifts.find(x=>x.person==='alex'&&x.date==='2026-10-22');home.handle('choose',own.id);assert.equal(s.date,own.date);assert.equal(s.service,own.service);assert(closed);
home.handle('picker');assert(opened.includes('Open full calendar'));assert(opened.includes('home-choose'));
s.role='manager';html=home.render();assert(html.includes('plan-add'));assert(html.includes('Reservations'));assert(html.includes('service-digest'));assert(!html.includes('plan-copy')); assert(!html.includes('schedule-report-sick'));assert(html.includes('guests'));
s.role='crew';s.team.find(x=>x.id==='alex').name='<script>alert(1)</script>';s.date='2026-12-20';html=home.render();assert(html.includes('You’re off today'));assert(!html.includes('schedule-report-sick'));assert(html.includes('Request time off'));
console.log('PASS: focused crew/manager entry actions, correct shift scoping, shift selection, full-calendar access and no-shift state.');
// Overview actions reuse the same service-scoped operations and escape shared content.
s=B.starter('2026-10-25');s.role='crew';s.crewId='alex';s.date='2026-10-21';s.service='Dinner';
s.checks[s.date+'|'+s.service]={};html=home.render();assert(html.includes('Service at a glance'));assert(html.includes('Before taking orders'));assert(html.includes('Working this service'));assert(html.includes('data-task='));assert(!html.includes('ops-approve-alert'));
const ctx=B.ops.context(s,s.date,s.service);if(ctx.notes.length){ctx.notes[0].body='<img src=x onerror=alert(1)>';html=home.render();assert(!html.includes('<img src=x'));assert(html.includes('&lt;img'));}
s.unavailable.push({id:'overview-review',date:s.date,service:s.service,name:'Test item',reason:'Check stock',status:'Reported',active:false,area:'Kitchen',author:'alex',reviewer:'',feedback:''});
s.role='manager';html=home.render();assert(html.includes('86 reports to review'));assert(html.includes('ops-approve-alert'));assert(html.includes('data-id="overview-review"'));
s.date='2026-10-22';html=home.render();assert(!html.includes('data-id="overview-review"'));
console.log('PASS: inline overview actions, role visibility, service isolation, checklist access and escaped shared notes.');

// Daily operations navigation & Notification Center engine verification
const N=c.BriglyNavigation,Notifs=c.BriglyNotifications;
const mgrGroups=N.groups(true),crewPrimary=N.primary(false);
assert.equal(mgrGroups[0].label,'Live service');
assert(mgrGroups[0].items.every(item=>['orange','sage','amber','danger','slate'].includes(item[4])));
assert(crewPrimary.some(item=>item[1]==='lists'&&item[4]==='sage'));
s=B.starter('2026-10-25');B.configure(s);s.role='manager';
const mgrNotifs=Notifs.build(s,new Set());
assert(mgrNotifs.length>0);
assert(mgrNotifs.some(n=>n.id.startsWith('tasknote-')&&n.unread));
assert(mgrNotifs.some(n=>n.id.startsWith('check-pulse-')));
const readSet=new Set(mgrNotifs.map(n=>n.id));
assert(Notifs.build(s,readSet).every(n=>!n.unread));
const badges=N.badges(s);
assert(badges.lists&&badges.lists.tone==='sage');
console.log('PASS: daily operations navigation, semantic color tones, live nav badges, and Shift Pulse notifications verified.');

