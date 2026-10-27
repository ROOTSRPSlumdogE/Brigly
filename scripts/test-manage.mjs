import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import vm from 'node:vm';
const c=vm.createContext({crypto:globalThis.crypto,window:{scrollTo(){}}});
for(const file of ['workspace-state','schedule-state','shift-operations-state','demo-history','restaurant-history','planner-state','duties-state','checklist-history','team-chat-state','stock-state','manage-state','payroll-state','writeups-state','business-state','app-navigation','shift-operations-ui','schedule-ui','finance-ui','writeups-ui','hr-ui','reports-ui','manage-ui'])vm.runInContext(readFileSync(new URL('../assets/js/'+file+'.js',import.meta.url),'utf8'),c);
const B=c.Brigly,P=B.permissions;
let s=B.starter('2026-10-25');s.date='2026-10-25';s.service='Dinner';s.role='manager';B.configure(s);
const as=(st,id)=>{const p=st.team.find(x=>x.id===id);return {...st,role:p.access,crewId:p.access==='crew'?id:st.crewId,managerId:p.access==='manager'?id:st.managerId};};
const e=x=>String(x??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const button=(label,action,id='',extra='',style='secondary')=>`<button type="button" class="button ${style}" data-action="${action}" data-id="${e(id)}" ${extra}>${e(label)}</button>`;
const badge=(label,tone='')=>`<span class="badge ${tone}">${e(label)}</span>`;
const input=(name,label,value='',type='text',attrs='')=>`<label>${label}<input name="${name}" type="${type}" value="${e(value)}" ${attrs}></label>`;
const textarea=(name,label,value='')=>`<label>${label}<textarea name="${name}">${e(value)}</textarea></label>`;
const select=(name,label,values,value)=>`<label>${label}<select name="${name}">${values.map(v=>{const [k,t]=Array.isArray(v)?v:[v,v];return `<option value="${e(k)}" ${k===value?'selected':''}>${e(t)}</option>`;}).join('')}</select></label>`;
const dateLabel=(d,o={month:'short',day:'numeric'})=>new Date(d+'T12:00:00').toLocaleDateString('en-US',o);

// Navigation: managers get Roster and Manage; crew keep their schedule, requests and earnings.
const N=c.BriglyNavigation,mgr=N.groups(true)[1].items.map(x=>x[1]),crew=N.groups(false)[1].items.map(x=>x[1]);
assert.deepEqual([...mgr],['shifts','manage','training','reports']);assert.deepEqual([...crew],['me','training']);
assert(!N.groups(true).some(g=>g.items.some(x=>['requests','earnings','setup'].includes(x[1]))));
s={...B.change(as(s,'alex'),{type:'schedule:timeoff',id:'r-open',from:'2026-11-02',to:'2026-11-03',note:''}),role:'manager'};
assert.equal(s.scheduling.requests.filter(r=>['Reported','Pending'].includes(r.status)).length,1);
assert.equal(N.badges(s).shifts?.text,'1','open requests badge rides on the roster for managers');
assert(c.BriglyNotifications.build(s).filter(n=>n.id.startsWith('req-')).every(n=>n.actions.every(a=>a.screen!=='requests')));
console.log('PASS: manager navigation is Roster + Manage, requests surface on the roster.');

// Permissions: roles carry defaults, people can be adjusted, lead permissions grant one part of the back office.
const crewShift=s.shifts.find(x=>x.date===s.date&&x.service==='Dinner'&&s.team.find(p=>p.id===x.person)?.access==='crew'&&s.team.find(p=>p.id===x.person)?.role!=='Head chef'),worker=crewShift.person,role=s.team.find(p=>p.id===worker).role;
const mates=s.team.filter(p=>p.active&&p.access==='crew'&&p.role===role).map(p=>p.id);
assert.equal(P.roleDefault(s,'Head chef','stock'),true,'the demo head chef runs stock');assert.equal(P.roleDefault(s,'Host','stockRequests'),false);
s=B.change(s,{type:'manage:role-permissions',role,perms:{report86:true,stockRequests:true,timeoff:true}});
assert(P.keys.filter(k=>P.base(k)).every(k=>P.can(s,k,worker)));
const alert={type:'ops:alert',id:'a-perm',date:s.date,service:'Dinner',name:'Halibut',area:crewShift.area,reason:'Sold out'};
assert.doesNotThrow(()=>B.change(as(s,worker),alert));
s=B.change(s,{type:'manage:role-permissions',role,perms:{report86:false}});
assert(mates.every(id=>!P.can(s,'report86',id)),'the role default reaches everyone in the role');
assert.throws(()=>B.change(as(s,worker),alert),/turned off “Report 86 items”/);
assert.throws(()=>B.change(as(s,worker),{type:'checklist:note',task:'x',date:s.date,service:'Dinner',id:'n1',body:'out',stockItem:'Halibut'}),/Report 86/);
s=B.change(s,{type:'manage:permissions',person:worker,perms:{report86:true,timeoff:false}});
assert(P.can(s,'report86',worker)&&!P.can(s,'timeoff',worker),'one person can differ from their role');
assert.deepEqual([...P.custom(s,s.team.find(p=>p.id===worker))].sort(),['report86','timeoff']);
assert.throws(()=>B.change(as(s,worker),{type:'schedule:timeoff',id:'t-perm',from:'2026-11-10',to:'2026-11-10',note:''}),/Request time off/);
s=B.change(s,{type:'manage:role-permissions',role,perms:{report86:true}});
assert.deepEqual([...P.custom(s,s.team.find(p=>p.id===worker))],['timeoff'],'an override that now matches the role is dropped');
s=B.change(s,{type:'manage:permissions',person:worker,perms:{timeoff:null}});assert(!s.team.find(p=>p.id===worker).perms);
assert.doesNotThrow(()=>B.change(s,{...alert,id:'a-mgr'}),'managers keep every permission');
assert.throws(()=>B.change(as(s,worker),{type:'manage:permissions',person:worker,perms:{report86:true}}),/Only managers/);
assert.throws(()=>B.change(as(s,worker),{type:'manage:role-permissions',role,perms:{stock:true}}),/Only managers/);
assert.throws(()=>B.change(s,{type:'manage:permissions',person:worker,perms:{fly:true}}),/Choose a permission/);
// Lead permission: approving an 86 needs a manager, or someone whose role or person grants Run stock.
s=B.change(as(s,worker),alert);s.role='manager';
assert.throws(()=>B.change(as(s,worker),{type:'ops:review-alert',id:'a-perm',status:'Approved'}),/Only managers/);
s=B.change(s,{type:'manage:permissions',person:worker,perms:{stock:true}});
let led=B.change(as(s,worker),{type:'ops:review-alert',id:'a-perm',status:'Approved'});
assert.equal(led.unavailable.find(x=>x.id==='a-perm').reviewer,worker,'the lead is recorded as the reviewer');
assert.equal(led.team.find(p=>p.id===worker).access,'crew');assert.equal(led.managerId,s.managerId);
s=B.change(s,{type:'ops:catalog',catalog:'roles',oldName:'Head chef',name:'Chef de cuisine'});
assert.equal(P.roleDefault(s,'Chef de cuisine','stock'),true,'renaming a role keeps its permissions');
const chef=s.team.find(p=>p.active&&p.access==='crew'&&p.role==='Chef de cuisine');
assert(chef,'demo has a crew head chef');{const item=s.stock.items.find(i=>i.active&&i.vendor&&i.teams.includes(chef.area));led=B.change(as(s,chef.id),{type:'stock:request',id:'lead-req',lines:[{item:item.id,quantity:1}]});assert.equal(led.orders.find(o=>o.id==='lead-req-0').status,'Approved','a stock lead orders like a manager');}
console.log('PASS: role defaults, personal adjustments, lead permissions with manager rights, and role renames.');

// The HR file: contact, personal, employment, pay, tax and compliance records, validated and manager-only.
s=B.change(s,{type:'manage:hr',person:worker,hr:{phone:'555-0101',email:'sam@example.com',emergency:'Ana · sister · 555-0199',legalName:'Samuel Rivera',taxIdLast4:'1234',filingStatus:'Head of household',dependents:'2000',stateAllowances:'2',workState:'il',foodHandlerExpires:'2026-11-01',employmentType:'Part-time'}});
let pw=s.team.find(x=>x.id===worker);
assert.equal(pw.phone,'555-0101');assert.equal(pw.hr.dependents,2000);assert.equal(pw.hr.workState,'IL');assert.equal(pw.hr.stateAllowances,2);
assert.throws(()=>B.change(s,{type:'manage:hr',person:worker,hr:{taxIdLast4:'123-45-6789'}}),/SSN/);
assert.throws(()=>B.change(s,{type:'manage:hr',person:worker,hr:{filingStatus:'Whatever'}}),/Filing status/);
assert.throws(()=>B.change(s,{type:'manage:hr',person:worker,hr:{email:'nope'}}),/valid email/);
assert.throws(()=>B.change(as(s,worker),{type:'manage:hr',person:worker,hr:{legalName:'X'}}),/Only managers/);
s=B.change(s,{type:'manage:hr',person:worker,hr:{legalName:''}});assert(!('legalName' in s.team.find(x=>x.id===worker).hr));
const p0=s.team.find(x=>x.id===worker);
const member={type:'ops:member',id:worker,name:p0.name,role:p0.role,area:p0.area,access:'crew',active:true};
s=B.change(s,{...member,notes:'Prefers closing shifts'});
s=B.change(s,{...member,access:'manager'});s=B.change(s,{...member,access:'crew'});
assert.equal(s.team.find(x=>x.id===worker).hr.taxIdLast4,'1234','the HR file survives profile and access changes');
console.log('PASS: HR file with contact, tax, pay and certification records.');

// Manage screen: every tab renders and escapes names; permissions by role and by member; the HR file popup and form.
const ops=c.createShiftOperationsUI({state:()=>s,e,button,badge,input,textarea,select,dateLabel,render(){},commit(){},open(){},view:(t,h)=>{ops.last=[t,h];},reportScreen(){},createInContext(){},navigate(){}});
const common={state:()=>s,e,button,badge,dateLabel,render(){},notify(){},open(){},form(){},close(){},go(){},commit:a=>{s=B.change(s,a);return true;}};
const fin=c.createFinanceUI(common),wu=c.createWriteupsUI(common),hr=c.createHRUI({...common,writeups:wu});
const ui=c.createManageUI({finance:fin,writeups:wu,hr,state:()=>s,e,button,badge,dateLabel,render(){},close(){},open:(t,h)=>{ui.last=h;},form:(t,h)=>{ui.form=h;},commit:a=>{s=B.change(s,a);return true;},reports:()=>ops.section('reports'),setup:()=>ops.section('setup')});
s.team.find(x=>x.id===worker).name='<b>Sam</b>';
// Seven sections; older names open the right section and view.
const where={todo:'todo',daily:'daily',timesheets:'timesheets',payruns:'payruns',people:'team',onboarding:'team',timeoff:'team',performance:'team',skills:'team',writeups:'team',compliance:'compliance',permissions:'settings',setup:'settings'};
assert.equal((ui.render().match(/class="mg-nav-item/g)||[]).length,7,'seven sections in Manage');
for(const tab of Object.keys(where)){
 ui.show(tab);const html=ui.render();
 assert(html.includes(`data-id="${where[tab]}" aria-current="page"`),tab+' opens '+where[tab]);
 assert(!html.includes('<b>Sam</b>'),tab+' escapes names');
}
ui.show('todo');let html=ui.render();assert(html.includes('Time &amp; payroll')||html.includes('Time & payroll'));assert(html.includes('schedule request')&&html.includes('Close out'));
assert(!['sales','inventory','labor','reports','overview'].some(x=>html.includes(`class="mg-nav-item ${''}" data-action="mg-tab" data-id="${x}"`)),'analysis sections left Manage');
ui.show('daily');html=ui.render();assert(html.includes('Recent closes')&&html.includes('READY TO CLOSE'));
ui.show('setup');html=ui.render();assert(html.includes('Pay &amp; payroll')||html.includes('Pay & payroll'));assert(html.includes('Services & default shift times'));
ui.show('compliance');html=ui.render();assert(html.includes('Compliance &amp; certifications')||html.includes('Compliance & certifications'));assert(html.includes('FOOD HANDLER'));
ui.show('payruns');html=ui.render();assert(html.includes('fin-steps')&&html.includes('Pay run history'));
ui.show('timesheets');assert(ui.render().includes('fin-period'));
ui.show('writeups');html=ui.render();assert(html.includes('Templates')&&html.includes('Reviews')&&html.includes('data-action="mg-view"'),'warnings sit with reviews under Performance');
ui.show('onboarding');assert(ui.render().includes('Priya'));
ui.show('timeoff');html=ui.render();assert(html.includes('Balances')&&html.includes('Change policy'));assert(!html.includes('res-kpi'),'no summary tiles that Reports already shows');
ui.show('skills');assert(ui.render().includes('Training matrix'));
ui.show('compliance');assert(ui.render().includes('Labor rules'));
ui.show('setup');html=ui.render();assert(html.includes('Services & default shift times')&&!html.includes('<h2>Your team</h2>'));
ui.show('permissions');html=ui.render();assert(html.includes('data-action="mg-role-perm"')&&html.includes('Lead permissions'));
ui.handle('role-perm',role,{perm:'notes'});assert(mates.every(id=>!P.can(s,'notes',id)));
ui.handle('perm-view','members');html=ui.render();assert(html.includes('Everyone’s permissions')&&html.includes('data-action="mg-member-perms"'));
ui.handle('member-perm',worker,{perm:'notes',value:'on'});assert(P.can(s,'notes',worker)&&ui.last.includes('is-custom'));
ui.handle('member-reset',worker,{});assert(!P.can(s,'notes',worker));
ui.handle('profile',worker,{});assert(ui.last.includes('Tax · W-4')&&ui.last.includes('•••-••-1234')&&ui.last.includes('&lt;b&gt;Sam'));
ui.handle('hr-edit',worker,{});assert(ui.form.includes('name="taxIdLast4"')&&ui.form.includes('name="phone"'));
assert.equal(ui.submit({legalName:'Sam R'}).type,'manage:hr');
// Reports: a team member's report opens in a popup instead of below the table.
ops.handle('report-tab','members',{});html=ops.section('reports');assert(!html.includes('Per-shift records')&&html.includes('View report'));
const other=s.team.find(p=>p.active&&p.id!==worker);ops.handle('select-report-person',other.id,{});assert(ops.last[1].includes('Per-shift records')&&ops.last[1].includes(other.name)&&ops.last[0]==='Shift report');
ops.handle('report-tab','labor',{});html=ops.section('reports');
assert(html.includes('Labor by team member')&&html.includes('data-id="labor" aria-pressed="true"'));
console.log('PASS: Manage overview, people and compliance, permissions by role and member, HR file, report popup and setup.');


// Reports: four dashboards with trends and comparisons, and the detailed records.
let person=null;const rp=c.createReportsUI({...common,finance:fin,person:(id,a,b)=>{person=[id,a,b];}});
for(const b of ['executive','sales','menu','guests','labor','operations','people']){rp.show(b);const t0=performance.now(),h=rp.render(),ms=performance.now()-t0;assert(h.includes('rp-kpi')&&h.includes('rp-delta'),b+' board');assert(ms<4000,b+' rendered in '+Math.round(ms)+'ms');console.log('  '+b.padEnd(11)+String(Math.round(ms)).padStart(5)+'ms');}
rp.show('executive');html=rp.render();assert(html.includes('Scorecard')&&html.includes('rp-line')&&html.includes('Where the money goes'));
rp.show('sales');html=rp.render();assert(html.includes('rp-heat')&&html.includes('Weekly profit picture')&&html.includes('AVERAGE CHECK'));
rp.show('menu');html=rp.render();assert(html.includes('Every feature, ranked by revenue')&&html.includes('HAPPY HOUR LIFT')&&html.includes('Happy hours')&&html.includes('Events'));
rp.show('guests');html=rp.render();assert(html.includes('Best days of the week')&&html.includes('When guests arrive')&&html.includes('Party sizes')&&html.includes('WALK-IN SHARE'));
rp.show('sales');assert(rp.render().includes('Service performance'));
rp.show('specials');assert(rp.render().includes('Every feature, ranked by revenue'),'specials links open Menu & happenings');
rp.show('labor');html=rp.render();assert(html.includes('Overtime watch')&&html.includes('Where labor goes'));
rp.show('inventory');html=rp.render();assert(html.includes('Price watch')&&html.includes('ON HAND'));
rp.handle('span','4');assert(rp.render().includes('4 weeks'));assert(!rp.render().includes('Detailed records'),'no detailed records board');
rp.show('people');html=rp.render();assert(html.includes('Team members')&&html.includes('data-action="rp-person"'));rp.handle('person','alex');assert.equal(person[0],'alex');
rp.show('operations');assert(rp.render().includes('Most missed checklist tasks'));
rp.show('checklists');assert(rp.render().includes('Most missed checklist tasks'),'older report links land on the right board');
// Regression: To do renders while someone is on the clock.
s.timeclock.entries.push({id:'live-now',person:'alex',date:B.payroll.stamp().slice(0,10),shiftId:'',in:B.payroll.stamp(),out:'',breaks:[],status:'Open'});
ui.show('todo');assert(ui.render().includes(e(s.team.find(x=>x.id==='alex').name.split(' ')[0])),'the on-the-clock tile names who is working');s.timeclock.entries=s.timeclock.entries.filter(x=>x.id!=='live-now');
// The crew's own file shows only issued records.
s=B.change(s,{type:'writeup:save',id:'mf1',kind:'warning',person:'alex',category:'Policy',date:s.date,title:'Phone use',details:'Phone on the floor.',issue:true});
s=B.change(s,{type:'writeup:save',id:'mf2',kind:'writeup',person:'alex',category:'Conduct',date:s.date,title:'Private draft',details:'Draft only.',issue:false});
s.role='crew';s.crewId='alex';html=hr.myFile();assert(html.includes('Phone use')&&!html.includes('Private draft')&&html.includes('Read &amp; sign'));s.role='manager';
console.log('PASS: report dashboards, comparison periods, detailed records and the crew file.');

// Old manager screens land in their new homes.
let manageTab=null;
const sched=c.createScheduleUI({state:()=>s,week:()=>B.monday(s.date),home:()=>'',e,button,badge,input,textarea,select,dateLabel,roster:()=>'<roster>',render(){},commit(){},extras:()=>'',section:()=>'',context:()=>'',open(){},manage:()=>'<manage>',reportsPage:()=>'<reports>',reportBoard:b=>{manageTab=['report',b];},manageTab:(t,r)=>{manageTab=[t,r];}});
sched.show('reports');assert.equal(sched.screen(),'reports');assert(sched.render().includes('<reports>'),'Reports is its own page');
sched.show('earnings');assert.equal(sched.screen(),'reports');assert.deepEqual(manageTab,['report','labor']);
sched.show('setup');assert.equal(sched.screen(),'manage');assert.deepEqual(manageTab,['setup','']);
sched.show('requests');assert.equal(sched.screen(),'shifts');html=sched.render();
assert(html.indexOf('Requests &amp; attendance')>-1||html.indexOf('Requests & attendance')>-1);assert(html.indexOf('Requests')<html.indexOf('<roster>'),'open requests sit above the roster');
s.role='crew';s.crewId='alex';sched.show('requests');assert.equal(sched.screen(),'requests');
console.log('PASS: legacy Inbox, Labor & pay, Reports and Team & setup routes redirect.');
