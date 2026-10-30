import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import vm from 'node:vm';
const c=vm.createContext({crypto:globalThis.crypto,window:{scrollTo(){}},setTimeout:(fn)=>fn(),clearTimeout(){},clearInterval(){},performance});
for(const file of ['workspace-state','schedule-state','shift-operations-state','demo-history','restaurant-history','planner-state','duties-state','checklist-history','team-chat-state','stock-state','manage-state','payroll-state','writeups-state','business-state','training-state','app-navigation','shift-operations-ui','schedule-ui','finance-ui','writeups-ui','hr-ui','training-ui','me-ui'])vm.runInContext(readFileSync(new URL('../assets/js/'+file+'.js',import.meta.url),'utf8'),c);
const B=c.Brigly,N=c.BriglyNavigation,today=B.payroll.stamp().slice(0,10);
let s=B.starter(today);s.role='manager';B.configure(s);
const as=(st,id)=>{const p=st.team.find(x=>x.id===id);return {...st,role:p.access,crewId:p.access==='crew'?id:st.crewId,managerId:p.access==='manager'?id:st.managerId};};
const e=x=>String(x??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const button=(label,action,id='',extra='',style='secondary')=>`<button type="button" class="button ${style}" data-action="${action}" data-id="${e(id)}" ${extra}>${e(label)}</button>`;
const badge=(label,tone='')=>`<span class="badge ${tone}">${e(label)}</span>`;
const input=(name,label,value='',type='text',attrs='')=>`<label>${label}<input name="${name}" type="${type}" value="${e(value)}" ${attrs}></label>`;
const textarea=(name,label,value='')=>`<label>${label}<textarea name="${name}">${e(value)}</textarea></label>`;
const select=(name,label,values,value)=>`<label>${label}<select name="${name}">${values.map(v=>{const [k,t]=Array.isArray(v)?v:[v,v];return `<option value="${e(k)}" ${k===value?'selected':''}>${e(t)}</option>`;}).join('')}</select></label>`;
const dateLabel=(d,o={month:'short',day:'numeric'})=>new Date(d+'T12:00:00').toLocaleDateString('en-US',o);
const common={state:()=>s,e,button,badge,dateLabel,render(){},notify(){},open(){},form(){},close(){},go(){},commit:a=>{s=B.change(s,a);return true;}};

// Navigation: crew get My space in the sidebar and the dock; the hub screens light it up; managers keep their screens.
assert.equal(N.groups(false)[1].items.map(x=>x[1]).join(),'me,training','the crew group is My space and Training');
assert.equal(N.primary(false).map(x=>x[1]).join(),'home,lists,stock','the crew dock is Today, Checklists and Stock (Chat and More are added by demo.js); My space lives in More');
assert.equal(N.primary(true).map(x=>x[1]).join(),'home,lists,stock','managers get the same dock; Scheduling lives in More');
for(const scr of ['me','shifts','earnings','requests','myfile'])assert(N.active(scr,'me'),scr+' lights up My space');assert(!N.active('training','me')&&N.active('training','training'),'Training is its own tab');
s=as(s,'alex');s=B.change(s,{type:'schedule:timeoff',id:'r-me',from:B.addDays(today,10),to:B.addDays(today,11),note:''});
assert.equal(N.badges(s).me?.text,'1','open requests ride on the My space pill');

// The hub: an overview and five sections, rendered through the schedule router for crew only.
const fin=c.createFinanceUI(common),wu=c.createWriteupsUI(common),tr=c.createTrainingUI(common),hr=c.createHRUI({...common,writeups:wu,training:()=>tr});
let sched;const me=c.createMeUI({...common,schedule:()=>sched,training:()=>tr,hr:()=>hr,finance:()=>fin});
sched=c.createScheduleUI({...common,input,textarea,select,week:()=>B.monday(s.date),home:()=>'',training:()=>tr.render(),me:scr=>me.render(scr),roster:()=>'<roster>',extras:()=>'',section:()=>'',context:()=>'',manage:()=>'',reportsPage:()=>'',reportBoard(){},manageTab(){},pay:()=>fin.myPay(),myfile:()=>hr.myFile()});
s.team.find(x=>x.id==='alex').name='<b>Alex</b> Morgan';
sched.show('me');let html=sched.render();
assert(html.includes('mx-view')&&html.includes('mx-switch')&&html.includes('data-id="me" aria-pressed="true"'),'the overview renders with the three-way switch');
assert(html.includes('mx-week')&&html.includes('mx-strip')&&html.includes('data-action="week-prev"')&&html.includes('data-action="home-choose"'),'the week strip and the week’s shifts are on the overview');
assert(html.includes('Requests')&&html.includes('data-action="schedule-timeoff"')&&html.includes('Withdraw'),'requests live on the overview with their actions');
assert(html.includes('mx-stats')&&html.includes('Sick leave')&&html.includes('Training'),'balances, pay and training sit in the stat strip');
assert(!html.includes('Next shift')&&!html.includes('schedule-report-sick'),'nothing that Today already shows');
assert(!html.includes('<b>Alex</b>'),'names are escaped');
for(const [scr,marker] of [['shifts','mx-week'],['requests','mx-week'],['earnings','earnings-panel'],['myfile','hr-myfile']]){sched.show(scr);html=sched.render();assert(html.includes('mx-view')&&html.includes(marker),scr+' renders inside My space');}
assert.equal(sched.screen(),'myfile');
sched.show('earnings');assert(sched.render().includes('data-id="earnings" aria-pressed="true"'));
// Managers are untouched.
s=as(s,'jamie');sched.show('shifts');html=sched.render();assert(html.includes('schedule-tabs')&&html.includes('<roster>')&&!html.includes('mx-view'),'managers keep the roster with tabs');
sched.show('training');assert(sched.render().includes('tr-view'));
console.log('PASS: My space for the crew: an overview with the week, requests, balances and recognition, plus Earnings and My file; managers unchanged.');
