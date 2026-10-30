import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import vm from 'node:vm';
const c=vm.createContext({});for(const file of ['workspace-state','schedule-state','shift-operations-state','demo-history','restaurant-history','planner-state','duties-state','checklist-history','app-navigation','shift-home'])vm.runInContext(readFileSync(new URL('../assets/js/'+file+'.js',import.meta.url),'utf8'),c);
const B=c.Brigly;let s=B.starter('2026-10-25');s.role='crew';s.crewId='alex';s.date='2026-10-21';s.service='Dinner';
const escape=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let opened='',closed=false,picker=0;const home=c.createShiftHome({state:()=>s,e:escape,dateLabel:x=>x,render(){},focus(date,service){s.date=date;s.service=service;},close(){closed=true},open(title,html){opened=title+html},openContext(){picker++;}});
let html=home.render();assert.equal((html.match(/class="td-action"/g)||[]).length,8);assert(html.includes('schedule-report-sick'));assert(html.includes('schedule-report-late'));assert(html.includes('schedule-shift-tips'));assert(html.includes('data-date="2026-10-21"'));assert(!html.includes('summary-grid'));assert(!html.includes('schedule-tabs'));
const own=s.shifts.find(x=>x.person==='alex'&&x.date==='2026-10-22');home.handle('choose',own.id);assert.equal(s.date,own.date);assert.equal(s.service,own.service);assert(closed);
home.handle('picker');assert.equal(picker,1,'the date button opens the shift picker in the command bar');
s.role='manager';html=home.render();assert(html.includes('plan-add'));assert(html.includes('data-action="navigate" data-id="reservations"'));assert(html.includes('td-rail'));assert(!html.includes('plan-copy')); assert(!html.includes('schedule-report-sick'));assert(html.includes('guests'));
s.role='crew';s.team.find(x=>x.id==='alex').name='<script>alert(1)</script>';s.date='2026-12-20';html=home.render();assert(html.includes('You’re off'));assert(!html.includes('schedule-report-sick'));assert(html.includes('schedule-timeoff'));
console.log('PASS: focused crew/manager entry actions, correct shift scoping, shift selection, full-calendar access and no-shift state.');
// Overview actions reuse the same service-scoped operations and escape shared content.
s=B.starter('2026-10-25');s.role='crew';s.crewId='alex';s.date='2026-10-21';s.service='Dinner';
s.checks[s.date+'|'+s.service]={};html=home.render();assert(html.includes('Up next for you'));assert(html.includes('Before taking orders'));assert(html.includes('td-hero-team'),'the team lives in the hero');assert(html.includes('data-action="chat-dm"'));assert(!html.includes('td-card td-team'));assert(!html.includes('Team chat'));assert(!html.includes('tr-today'));assert(html.includes('data-task='));assert(!html.includes('ops-approve-alert'));
const ctx=B.ops.context(s,s.date,s.service);if(ctx.notes.length){ctx.notes[0].body='<img src=x onerror=alert(1)>';html=home.render();assert(!html.includes('<img src=x'));assert(html.includes('&lt;img'));}
s.unavailable.push({id:'overview-review',date:s.date,service:s.service,name:'Test item',reason:'Check stock',status:'Reported',active:false,area:'Kitchen',author:'alex',reviewer:'',feedback:''});
s.role='manager';html=home.render();assert(html.includes('Needs your attention'));assert(html.includes('86 report · Test item'));assert(html.includes('ops-approve-alert'));assert(html.includes('data-id="overview-review"'));
s.date='2026-10-22';html=home.render();assert(!html.includes('data-id="overview-review"'));
console.log('PASS: inline overview actions, role visibility, service isolation, checklist access and escaped shared notes.');
// The time clock is part of the hero card, not a second card above it.
const punch=c.createShiftHome({state:()=>s,e:escape,dateLabel:x=>x,render(){},focus(){},close(){},open(){},clock:()=>({state:'on',label:'On the clock',detail:'1 h worked',acts:'<button data-action="tc-out">Clock out</button>'})});
s.role='crew';s.date='2026-10-21';html=punch.render();assert(html.includes('td-hero-tc" data-state="on"'));assert(html.includes('data-action="tc-out"'));assert(html.includes('On the clock'));assert(!html.includes('td-clock"'));assert.equal(html.indexOf('td-hero-tc')<html.indexOf('td-actions'),true,'clock sits inside the hero above the actions');
console.log('PASS: time clock merged into the Today hero.');

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

// Shift Home separation of shift-specific tasks and dynamic checklist cards
s=B.starter('2026-10-25');s.role='crew';s.crewId='alex';s.date='2026-10-21';s.service='Dinner';
s=B.change(s,{type:'checklist:add',area:'Floor',list:'Event Setup',titles:'Set wine tasting display',specific:true},'manager');
html=home.render();
assert(html.includes('Tonight only'));
assert(html.includes('td-specific'));
assert(html.includes('Shift-specific'));
assert(html.includes('Set wine tasting display'));
assert(html.includes('Event Setup'));
console.log('PASS: shift home specific task segregation and custom checklist cards verified.');



// The shift briefing lives on Today: no separate tab, and its notes, posting and editing happen in place.
s=B.starter('2026-10-25');B.configure(s);s.role='crew';s.crewId='alex';s.date='2026-10-21';s.service='Dinner';
assert(!N.groups(false).concat(N.groups(true)).some(g=>g.items.some(item=>item[1]==='onboarding')));
assert(!N.primary(false).concat(N.primary(true),N.serviceItems()).some(item=>item[1]==='onboarding'));
html=home.render();assert(!html.includes('data-id="onboarding"'));
const mine={id:'home-note-mine',date:s.date,service:s.service,body:'Crew handover',author:'alex',priority:'crew',updated:'2026-10-21T10:00:00.000Z'};
s.shiftNotes.push(mine);for(let i=0;i<4;i++)s.shiftNotes.push({...mine,id:'home-note-'+i,author:'jamie',priority:'manager'});
html=home.render();assert(html.includes('data-action="ops-note" data-id="home-note-mine"'));assert(!html.includes('data-action="ops-note" data-id="home-note-0"'));assert(html.includes('class="td-more"'));assert(html.includes('Add a shift note'));
s.briefings=s.briefings.filter(x=>!(x.date===s.date&&x.service===s.service));html=home.render();assert(html.includes('data-action="ops-context-create" data-id="briefings"'));
s.role='manager';html=home.render();assert(html.includes('data-action="ops-archive-note" data-id="home-note-0"'));assert(html.includes('Add priority note'));
s.briefings.push({id:'home-brief',date:s.date,service:s.service,title:'Tonight',body:'Plan',author:'alex',revision:1,acks:[]});
s.unavailable=[];assert.equal(N.badges(s).home?.tone,'amber');
s.role='crew';html=home.render();assert(html.includes('data-collection="briefings" data-id="home-brief"'),'briefing authors edit from Today');
console.log('PASS: shift briefing merged into Today with in-place notes, posting, author edits and Today badge.');

// The single-page briefing preserves role-specific confirmation and approval actions.
vm.runInContext(readFileSync(new URL('../assets/js/onboarding-ui.js',import.meta.url),'utf8'),c);
const onboarding=c.createOnboardingUI({state:()=>s,e:escape,dateLabel:x=>x});
const briefing=s.briefings.find(x=>x.id==='home-brief');
briefing.author='jamie';briefing.approved=true;
s.shifts.push({person:'alex',date:s.date,service:s.service,area:'Floor',start:'16:00',end:'23:00'});
html=onboarding.render();
assert(html.includes('data-action="ack"'));
assert(html.includes('Expected guests')&&html.includes('From the previous shift'));
assert(!html.includes('ob-next')&&!html.includes('ob-back'));
briefing.acks.push('alex');html=onboarding.render();
assert(!html.includes('data-action="ack"'));assert(html.includes('Briefing read'));
s.role='manager';briefing.approved=false;html=onboarding.render();
assert(html.includes('data-approved="true"'));assert(!html.includes('data-action="ack"'));
briefing.approved=true;html=onboarding.render();assert(html.includes('Withdraw approval'));
briefing.body='<img src=x onerror=alert(1)>';html=onboarding.render();assert(!html.includes('<img src=x'));assert(html.includes('&lt;img'));
console.log('PASS: one-page onboarding, crew acknowledgement, manager approvals and escaped briefing content.');
