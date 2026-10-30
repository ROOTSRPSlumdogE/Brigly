/* POS, version 2: checks per table, tab, takeout or delivery (linked to the seated booking), seats and courses with hold-and-fire, split and merge, item and check discounts, happy-hour pricing from Happenings, several tax rates, voids, comps, refunds and tip adjustments, split payments with gift cards and house accounts, the cash drawer (float, paid in and out, no sale, count and over/short), server sections, close-out, an audit journal, PINs for fast user switching, training mode, stock depletion from recipes, and compact day rollups for reporting. Tips flow into earnings; sales feed the daily close. DOM-free. */
(function(){
 'use strict';
 const B=Brigly,prev={starter:B.starter,load:B.load,valid:B.validState,change:B.change};
 const copy=x=>globalThis.Brigly.clone(x);
 const txt=(x,max)=>typeof x==='string'&&x.length<=max;
 const num=(x,max=1000000)=>typeof x==='number'&&Number.isFinite(x)&&x>=0&&x<=max;
 const money=x=>typeof x==='number'&&Number.isFinite(x)&&Math.abs(x)<=1000000;
 const ident=x=>typeof x==='string'&&/^[\w-]{1,100}$/.test(x);
 const round=n=>Math.round(n*100)/100;
 const stamp=x=>x===undefined||x===''||(txt(x,40)&&!isNaN(new Date(x).getTime()));
 const hhmm=x=>x===undefined||x===''||(typeof x==='string'&&/^([01]\d|2[0-3]):[0-5]\d$/.test(x));
 const LINE=['held','staged','sent','ready','served','void'],STATUS=['open','paid','void'],TYPES=['dine','tab','takeout','delivery'],TYPE_LABEL={dine:'Dine-in',tab:'Bar tab',takeout:'Takeout',delivery:'Delivery'};
 const DRAWER_EVENTS=['in','out','nosale','drop'],JOURNAL=['void','comp','discount','refund','tip','reopen','transfer','split','merge','drawer','nosale','paidin','paidout','drop','settings','gift','account','training','pin','open-item'];
 const SPECIAL_TENDERS=['Cash','Card','Gift card','House account'];
 const DEFAULTS={
  taxRate:8.75,taxGroups:[{name:'Alcohol',rate:10.25,categories:['cocktails','wine','beer']}],taxIncluded:false,rounding:0,
  serviceCharge:18,serviceChargeFrom:6,tipSuggestions:[18,20,22],tenders:['Cash','Card','Gift card','House account'],tipOut:{Bar:2,Kitchen:1.5},
  voidReasons:['Guest changed their mind','Wrong item rung in','Kitchen or bar error','Long wait','Duplicate'],compReasons:['Guest recovery','Manager comp','Birthday or celebration','Staff meal','Quality issue'],
  discountPresets:[{id:'staff',name:'Staff meal',kind:'pct',value:50},{id:'industry',name:'Industry',kind:'pct',value:20},{id:'regular',name:'Regular guest',kind:'pct',value:10},{id:'dessert',name:'Dessert on us',kind:'amt',value:12}],
  happyHour:{enabled:true,pct:25,categories:['cocktails','wine','beer']},
  orderTypes:{dine:true,tab:true,takeout:true,delivery:true},coursing:true,lateMinutes:15,warnMinutes:8,
  cashFloat:300,receipt:{header:'The Copper Room',footer:'Thank you. See you soon.'},depleteStock:true,prepMinutes:20,keepDays:3};
 const LIMITS={checks:6000,lines:150,payments:20,discounts:5,refunds:10,guests:60,qty:99,drawers:120,events:60,gift:300,accounts:60,journal:300};

 function base(){return {version:2,seq:1000,settings:copy(DEFAULTS),checks:[],sections:{},days:{},drawers:[],giftCards:[],accounts:[],journal:[],pins:{}};}
 // Menu categories decide the tax rate of a line when it is rung in; the rate travels with the line so reprints and old checks agree.
 function taxFor(s,st,catId){const g=(st.taxGroups||[]).find(x=>(x.categories||[]).includes(catId));return g?g.rate:st.taxRate;}
 function upgrade(state){
  let s=copy(state);if(!s?.setup)return s;
  // Validation may run before the floor plan and menu exist in this copy; checks need both.
  if(!s.floor&&B.floor?.upgrade)s=B.floor.upgrade(s);
  if(!s.menu&&B.menu?.upgrade)s=B.menu.upgrade(s);
  if(!s.menu||!s.floor)return s;
  s.pos??=base();const p=s.pos;
  p.settings={...copy(DEFAULTS),...p.settings};const st=p.settings;st.tipOut={...st.tipOut};st.happyHour={...DEFAULTS.happyHour,...st.happyHour};st.orderTypes={...DEFAULTS.orderTypes,...st.orderTypes};st.receipt={...DEFAULTS.receipt,...st.receipt};
  p.checks??=[];p.sections??={};p.days??={};p.drawers??=[];p.giftCards??=[];p.accounts??=[];p.journal??=[];p.pins??={};
  if(p.version===1){
   for(const c of p.checks){c.type??=c.tables.length?'dine':'tab';c.source??='pos';c.refunds??=[];for(const l of c.lines){if(l.tax===undefined){const it=B.menu.item(s,l.item);l.tax=taxFor(s,st,it?.category||'');}}}
   p.version=2;
  }
  return s;
 }
 function validPos(s){
  const p=s.pos;if(!p||p.version!==2||!Number.isInteger(p.seq)||!Array.isArray(p.checks)||p.checks.length>LIMITS.checks||!p.sections||typeof p.sections!=='object'||!p.days||typeof p.days!=='object')return false;
  if(!Array.isArray(p.drawers)||p.drawers.length>LIMITS.drawers||!Array.isArray(p.giftCards)||p.giftCards.length>LIMITS.gift||!Array.isArray(p.accounts)||p.accounts.length>LIMITS.accounts||!Array.isArray(p.journal)||p.journal.length>LIMITS.journal||!p.pins||typeof p.pins!=='object')return false;
  const st=p.settings;
  if(!st||!num(st.taxRate,100)||!Array.isArray(st.taxGroups)||st.taxGroups.length>6||!st.taxGroups.every(g=>txt(g.name,30)&&g.name&&num(g.rate,100)&&Array.isArray(g.categories)&&g.categories.every(c=>txt(c,40)))||typeof st.taxIncluded!=='boolean'||![0,0.05,0.1,0.5,1].includes(st.rounding))return false;
  if(!num(st.serviceCharge,100)||!Number.isInteger(st.serviceChargeFrom)||st.serviceChargeFrom<0||!Array.isArray(st.tipSuggestions)||!st.tipSuggestions.every(x=>num(x,100))||!Array.isArray(st.tenders)||!st.tenders.length||!st.tenders.every(t=>txt(t,30)&&t.trim())||!st.tipOut||typeof st.tipOut!=='object'||!Object.values(st.tipOut).every(v=>num(v,100))||!Array.isArray(st.voidReasons)||!Array.isArray(st.compReasons)||!Number.isInteger(st.keepDays))return false;
  if(!Array.isArray(st.discountPresets)||st.discountPresets.length>12||!st.discountPresets.every(d=>ident(d.id)&&txt(d.name,40)&&d.name&&['pct','amt'].includes(d.kind)&&num(d.value,d.kind==='pct'?100:100000)))return false;
  if(!st.happyHour||typeof st.happyHour.enabled!=='boolean'||!num(st.happyHour.pct,100)||!Array.isArray(st.happyHour.categories)||!st.orderTypes||!TYPES.every(t=>typeof st.orderTypes[t]==='boolean')||typeof st.coursing!=='boolean'||!Number.isInteger(st.lateMinutes)||st.lateMinutes<1||!Number.isInteger(st.warnMinutes)||!num(st.cashFloat,100000)||!st.receipt||!txt(st.receipt.header,80)||!txt(st.receipt.footer,160)||typeof st.depleteStock!=='boolean'||!Number.isInteger(st.prepMinutes))return false;
  const person=id=>s.team.some(x=>x.id===id),services=new Set(s.setup.services.map(v=>v.name));
  if(new Set(p.checks.map(c=>c.id)).size!==p.checks.length)return false;
  const codes=new Set(p.giftCards.map(g=>g.code)),accounts=new Set(p.accounts.map(a=>a.id));
  for(const c of p.checks){
   if(!ident(c.id)||!Number.isInteger(c.number)||!B.isDate(c.date)||!services.has(c.service)||!TYPES.includes(c.type)||!Array.isArray(c.tables)||c.tables.length>4||!c.tables.every(l=>txt(l,4))||!txt(c.res||'',100)||!txt(c.name||'',100)||!person(c.server)||!Number.isInteger(c.guests)||c.guests<0||c.guests>LIMITS.guests||!STATUS.includes(c.status)||!stamp(c.openedAt)||!stamp(c.closedAt)||!stamp(c.presentedAt)||!hhmm(c.pickupAt)||!txt(c.phone||'',40)||!txt(c.allergy||'',120)||!txt(c.note||'',500)||typeof c.serviceCharge!=='boolean'||!['pos','online'].includes(c.source)||!(c.training===undefined||typeof c.training==='boolean')||!txt(c.parent||'',100))return false;
   if(c.tab!==undefined&&(!c.tab||!txt(c.tab.card||'',8)||!num(c.tab.preauth||0,100000)))return false;
   if(!Array.isArray(c.lines)||c.lines.length>LIMITS.lines||!Array.isArray(c.payments)||c.payments.length>LIMITS.payments||!Array.isArray(c.discounts)||c.discounts.length>LIMITS.discounts||!Array.isArray(c.refunds)||c.refunds.length>LIMITS.refunds)return false;
   if(new Set(c.lines.map(l=>l.id)).size!==c.lines.length||new Set(c.payments.map(x=>x.id)).size!==c.payments.length)return false;
   if(!c.lines.every(l=>ident(l.id)&&txt(l.item,100)&&txt(l.name,100)&&l.name&&money(l.price)&&(l.base===undefined||money(l.base))&&Number.isInteger(l.qty)&&l.qty>0&&l.qty<=LIMITS.qty&&(l.splitOf===undefined||(Number.isInteger(l.splitOf)&&l.splitOf>=2&&l.splitOf<=20))&&Number.isInteger(l.seat)&&l.seat>=0&&Number.isInteger(l.course)&&l.course>=0&&LINE.includes(l.status)&&Array.isArray(l.mods)&&l.mods.every(m=>txt(m.name,60)&&money(m.price))&&txt(l.note||'',200)&&txt(l.station||'',40)&&stamp(l.sentAt)&&stamp(l.servedAt)&&num(l.tax,100)&&txt(l.promo||'',40)&&txt(l.gift||'',20)&&(l.comp===undefined||(txt(l.comp.reason,200)&&person(l.comp.by)))&&(l.discount===undefined||(['pct','amt'].includes(l.discount.kind)&&num(l.discount.value,100000)&&txt(l.discount.reason,200)&&person(l.discount.by)))&&txt(l.voidReason||'',200)))return false;
   if(!c.payments.every(x=>ident(x.id)&&st.tenders.includes(x.method)&&money(x.amount)&&x.amount>=0&&num(x.tip,100000)&&stamp(x.at)&&person(x.by)&&txt(x.ref||'',60)&&(x.tendered===undefined||num(x.tendered,100000))&&(x.method!=='Gift card'||codes.has(x.ref))&&(x.method!=='House account'||accounts.has(x.ref))))return false;
   if(!c.discounts.every(d=>ident(d.id)&&['pct','amt'].includes(d.kind)&&num(d.value,d.kind==='pct'?100:100000)&&txt(d.reason,200)&&person(d.by)))return false;
   if(!c.refunds.every(r=>ident(r.id)&&money(r.amount)&&r.amount>0&&st.tenders.includes(r.method)&&txt(r.reason,200)&&person(r.by)&&stamp(r.at)))return false;
   if(c.status==='paid'&&!c.closedAt)return false;
  }
  if(!p.drawers.every(d=>ident(d.id)&&B.isDate(d.date)&&services.has(d.service)&&person(d.openedBy)&&stamp(d.openedAt)&&d.openedAt&&num(d.float,100000)&&stamp(d.closedAt)&&(d.closedAt?person(d.closedBy)&&num(d.counted,1000000)&&money(d.expected):true)&&txt(d.note||'',300)&&Array.isArray(d.events)&&d.events.length<=LIMITS.events&&d.events.every(ev=>DRAWER_EVENTS.includes(ev.kind)&&num(ev.amount,100000)&&txt(ev.reason||'',120)&&person(ev.by)&&stamp(ev.at))))return false;
  if(p.drawers.filter(d=>!d.closedAt).some((d,i,arr)=>arr.findIndex(x=>x.date===d.date&&x.service===d.service)!==i))return false;
  if(codes.size!==p.giftCards.length||!p.giftCards.every(g=>/^GC-[A-Z0-9]{4,8}$/.test(g.code)&&num(g.balance,100000)&&num(g.issued,100000)&&stamp(g.issuedAt)&&person(g.issuedBy)&&['pending','active','empty'].includes(g.status)&&txt(g.check||'',100)&&txt(g.note||'',120)))return false;
  if(accounts.size!==p.accounts.length||!p.accounts.every(a=>ident(a.id)&&txt(a.name,80)&&a.name&&money(a.balance)&&num(a.limit,1000000)&&txt(a.contact||'',120)&&typeof a.active==='boolean'))return false;
  if(!p.journal.every(j=>stamp(j.at)&&j.at&&person(j.by)&&JOURNAL.includes(j.kind)&&txt(j.text,240)&&(j.amount===undefined||money(j.amount))&&txt(j.check||'',100)))return false;
  if(!Object.entries(p.pins).every(([id,pin])=>person(id)&&/^\d{4}$/.test(pin)))return false;
  if(!Object.entries(p.sections).every(([k,v])=>B.isDate(k.slice(0,10))&&k[10]==='|'&&services.has(k.slice(11))&&v&&typeof v.tables==='object'&&Object.entries(v.tables).every(([l,pid])=>txt(l,4)&&person(pid))))return false;
  return Object.entries(p.days).every(([k,d])=>B.isDate(k.slice(0,10))&&k[10]==='|'&&services.has(k.slice(11))&&d&&Number.isInteger(d.checks)&&Number.isInteger(d.covers)&&money(d.net)&&money(d.gross)&&money(d.tips)&&money(d.tax)&&d.byServer&&typeof d.byServer==='object'&&d.byItem&&typeof d.byItem==='object');
 }
 function valid(s){try{s=upgrade(s);return prev.valid(s)&&validPos(s);}catch{return false;}}

 // ---------- Money ----------
 const settings=s=>s.pos.settings;
 const unit=l=>l.price+(l.mods||[]).reduce((n,m)=>n+m.price,0);
 const lineGross=l=>round(unit(l)*l.qty/(l.splitOf||1));
 const lineTotal=l=>l.status==='void'?0:lineGross(l);
 const lineDisc=l=>{if(!l.discount||l.comp||l.status==='void')return 0;const g=lineGross(l);return round(l.discount.kind==='pct'?g*l.discount.value/100:Math.min(l.discount.value,g));};
 const roundTo=(n,step)=>step?round(Math.round(n/step)*step):round(n);
 function totals(s,c){
  const st=settings(s),live=c.lines.filter(l=>l.status!=='void');
  const gross=round(live.reduce((n,l)=>n+lineGross(l),0)),comps=round(live.filter(l=>l.comp).reduce((n,l)=>n+lineGross(l),0));
  const itemDisc=round(live.reduce((n,l)=>n+lineDisc(l),0)),afterComps=round(gross-comps-itemDisc);
  const checkDisc=round(c.discounts.reduce((n,d)=>n+(d.kind==='pct'?afterComps*d.value/100:Math.min(d.value,afterComps)),0));
  const discounts=round(itemDisc+checkDisc),net=Math.max(0,round(afterComps-checkDisc));
  // Tax per line at the rate it was rung in with; check-level discounts shrink every line in proportion.
  const share=afterComps>0?net/afterComps:0;
  let tax=0;for(const l of live){if(l.comp)continue;const base=(lineGross(l)-lineDisc(l))*share;tax+=st.taxIncluded?base*l.tax/(100+l.tax):base*l.tax/100;}
  tax=round(tax);
  const sc=c.serviceCharge?round(net*st.serviceCharge/100):0,total=roundTo(st.taxIncluded?net+sc:net+sc+tax,st.rounding);
  const paid=round(c.payments.reduce((n,x)=>n+x.amount,0)),tips=round(c.payments.reduce((n,x)=>n+x.tip,0)+sc);
  const voids=c.lines.filter(l=>l.status==='void'&&l.sentAt),voidAmt=round(voids.reduce((n,l)=>n+lineGross(l),0));
  const promos=round(live.filter(l=>l.promo&&l.base!==undefined).reduce((n,l)=>n+(l.base-l.price)*l.qty/(l.splitOf||1),0));
  const refunded=round((c.refunds||[]).reduce((n,r)=>n+r.amount,0));
  return {gross,comps,discounts,itemDisc,checkDisc,net,sc,tax,total,paid,due:round(total-paid),tips,cardTips:round(c.payments.filter(x=>x.method!=='Cash').reduce((n,x)=>n+x.tip,0)),cashTips:round(c.payments.filter(x=>x.method==='Cash').reduce((n,x)=>n+x.tip,0)),voids:voids.length,voidAmt,items:live.reduce((n,l)=>n+l.qty,0),promos,refunded,taxIncluded:st.taxIncluded};
 }
 const key=(date,service)=>date+'|'+service;
 const real=c=>!c.training;
 const checks=(s,date,service)=>s.pos.checks.filter(c=>c.date===date&&(!service||c.service===service));
 const openChecks=(s,date,service)=>checks(s,date,service).filter(c=>c.status==='open');
 const check=(s,id)=>s.pos.checks.find(c=>c.id===id);
 const uses=(c,label)=>c.tables.some(l=>l.toLowerCase()===String(label).toLowerCase());
 const checksFor=(s,date,service,label)=>openChecks(s,date,service).filter(c=>uses(c,label));
 const forTable=(s,date,service,label)=>checksFor(s,date,service,label)[0]||null;
 const stageOf=(s,c)=>{const t=totals(s,c);const live=c.lines.filter(l=>l.status!=='void');if(c.payments.length&&t.due>0.005)return 'paying';if(c.presentedAt&&t.due>0.005)return 'presented';if(!live.length)return 'new';if(live.every(l=>l.status==='held'))return 'ordering';if(live.some(l=>l.status==='sent'))return 'sent';if(live.some(l=>l.status==='ready'))return 'ready';if(live.some(l=>l.status==='held'||l.status==='staged'))return live.some(l=>l.status==='served')?'served':'ordering';return 'served';};
 const minutesSince=iso=>iso?Math.max(0,Math.round((Date.now()-new Date(iso).getTime())/60000)):0;
 const typeLabel=t=>TYPE_LABEL[t]||'Dine-in';

 // ---------- Sections: which server has which table on a service ----------
 const sections=(s,date,service)=>s.pos.sections[key(date,service)]?.tables||{};
 const serverOf=(s,date,service,label)=>{const m=sections(s,date,service);const k=Object.keys(m).find(l=>l.toLowerCase()===String(label).toLowerCase());return k?m[k]:'';};
 const myTables=(s,date,service,person)=>Object.entries(sections(s,date,service)).filter(([,pid])=>pid===person).map(([l])=>l);
 function staff(s,date,service){
  const on=s.shifts.filter(x=>x.date===date&&x.service===service&&!B.schedule?.absence?.(s,x)).map(x=>({...x,p:s.team.find(p=>p.id===x.person)})).filter(x=>x.p?.active);
  const servers=on.filter(x=>x.area==='Floor'&&!/host|busser|runner/i.test(x.p.role)).map(x=>x.person),bar=on.filter(x=>x.area==='Bar').map(x=>x.person);
  const uniq=a=>[...new Set(a)],mgr=s.team.filter(p=>p.active&&p.access==='manager').map(p=>p.id);
  return {servers:uniq(servers.length?servers:on.filter(x=>x.area==='Floor').map(x=>x.person)).sort(),bar:uniq(bar).sort(),managers:mgr,all:uniq([...servers,...bar,...on.map(x=>x.person)])};
 }
 function suggestSections(s,date,service){
  const F=B.floor,plan=F.plan(s),{servers,bar,managers}=staff(s,date,service),out={};
  const floorStaff=servers.length?servers:managers,barStaff=bar.length?bar:floorStaff;
  if(!floorStaff.length)return out;
  const isBar=t=>t.shape==='bar'||/bar/i.test(plan.rooms.find(r=>r.id===t.room)?.name||'');
  let i=0;
  for(const room of plan.rooms){
   const tables=plan.tables.filter(t=>t.room===room.id&&!isBar(t)).sort((a,b)=>a.y-b.y||a.x-b.x);if(!tables.length)continue;
   const per=Math.ceil(tables.length/floorStaff.length);
   tables.forEach((t,k)=>{out[t.label]=floorStaff[(i+Math.floor(k/per))%floorStaff.length];});
   i=(i+Math.ceil(tables.length/per))%floorStaff.length;
  }
  plan.tables.filter(isBar).sort((a,b)=>a.y-b.y||a.x-b.x).forEach((t,k)=>{out[t.label]=barStaff[k%barStaff.length];});
  return out;
 }
 function tableState(s,date,service,label){
  const list=checksFor(s,date,service,label),c=list[0]||null,server=c?.server||serverOf(s,date,service,label)||'';
  if(!c)return {server,check:null,checks:[],totals:null,stage:null,minutes:0};
  return {server,check:c,checks:list,totals:totals(s,c),stage:stageOf(s,c),minutes:minutesSince(c.openedAt)};
 }
 function at(s,date,service){
  const {start,end}=B.floor.serviceWindow(s,service),today=B.dateString(new Date());
  if(date===today){const n=B.floor.nowMinutes();if(n>=start&&n<end)return n;if(n>=end)return end-1;}
  return Math.min(start+60,end-1);
 }
 // Happy hour comes from Happenings: an active happy-hour happening for the service with a time window like "16:00–18:00".
 function happyHour(s,date,service,minute=at(s,date,service)){
  for(const sp of s.specials||[]){
   if(sp.kind!=='happy_hour'||!sp.active||sp.date!==date||sp.service!==service)continue;
   const m=/(\d{1,2}):(\d{2})\D+(\d{1,2}):(\d{2})/.exec(sp.time||'');if(!m)continue;
   const a=Number(m[1])*60+Number(m[2]),b=Number(m[3])*60+Number(m[4]);
   if(minute>=a&&minute<b)return sp;
  }
  return null;
 }
 function priceFor(s,it,date,service,minute){
  const hh=settings(s).happyHour;
  if(hh.enabled&&hh.pct>0&&hh.categories.includes(it.category)&&happyHour(s,date,service,minute))return {price:round(it.price*(1-hh.pct/100)),base:it.price,promo:'Happy hour'};
  return {price:it.price};
 }
 // Kitchen and bar tickets: what has been sent and is not yet served, oldest first, with the next course waiting behind it.
 function tickets(s,date,service,station=''){
  const out=[],late=settings(s).lateMinutes,warn=settings(s).warnMinutes;
  for(const c of openChecks(s,date,service)){
   const mine=c.lines.filter(l=>['staged','sent','ready'].includes(l.status)&&(!station||(l.station||'')===station));
   const lines=mine.filter(l=>l.status!=='staged'),staged=mine.filter(l=>l.status==='staged');
   if(!lines.length)continue;
   const first=lines.map(l=>l.sentAt).sort()[0],m=minutesSince(first);
   out.push({check:c,lines:lines.sort((a,b)=>a.course-b.course||String(a.sentAt).localeCompare(String(b.sentAt))),staged:staged.sort((a,b)=>a.course-b.course),sentAt:first,minutes:m,late:m>=late,warn:m>=warn&&m<late,allReady:lines.every(l=>l.status==='ready')});
  }
  return out.sort((a,b)=>String(a.sentAt).localeCompare(String(b.sentAt)));
 }
 // All-day view: how many of each item the station still has to make.
 function allDay(s,date,service,station=''){
  const m=new Map();
  for(const t of tickets(s,date,service,station))for(const l of t.lines){if(l.status!=='sent')continue;const k=l.name+(l.mods.length?' · '+l.mods.map(x=>x.name).join(', '):'');m.set(k,(m.get(k)||0)+l.qty);}
  return [...m].map(([name,qty])=>({name,qty})).sort((a,b)=>b.qty-a.qty||a.name.localeCompare(b.name));
 }
 // Recently served items, newest first, so the pass can recall a bump made by mistake.
 function recent(s,date,service,station='',minutes=20){
  const out=[];
  for(const c of openChecks(s,date,service))for(const l of c.lines)if(l.status==='served'&&l.servedAt&&minutesSince(l.servedAt)<=minutes&&(!station||(l.station||'')===station))out.push({check:c,line:l,minutes:minutesSince(l.servedAt)});
  return out.sort((a,b)=>String(b.line.servedAt).localeCompare(String(a.line.servedAt)));
 }
 // Sides fire with the mains: for holding and firing, course 3 ranks with course 2.
 const courseRank=l=>l.course===3?2:l.course;
 const nextCourse=c=>{const staged=c.lines.filter(l=>l.status==='staged');return staged.length?Math.min(...staged.map(courseRank)):null;};

 // ---------- Cash drawer ----------
 const drawer=(s,date,service)=>s.pos.drawers.find(d=>d.date===date&&d.service===service&&!d.closedAt)||null;
 const drawerById=(s,id)=>s.pos.drawers.find(d=>d.id===id);
 // What should be in the drawer: the float, cash taken, cash refunds, paid in and out, drops, and the cash tips the house paid out are not in here.
 function drawerExpected(s,d){
  const list=checks(s,d.date,d.service).filter(real),from=d.openedAt,to=d.closedAt||'9999';
  const inWin=at_=>at_>=from&&at_<=to;
  const cashIn=round(list.flatMap(c=>c.payments).filter(x=>x.method==='Cash'&&inWin(x.at)).reduce((n,x)=>n+x.amount,0));
  const changeOut=0;
  const refunds=round(list.flatMap(c=>c.refunds||[]).filter(r=>r.method==='Cash'&&inWin(r.at)).reduce((n,r)=>n+r.amount,0));
  const paidIn=round(d.events.filter(e=>e.kind==='in').reduce((n,e)=>n+e.amount,0)),paidOut=round(d.events.filter(e=>e.kind==='out').reduce((n,e)=>n+e.amount,0)),drops=round(d.events.filter(e=>e.kind==='drop').reduce((n,e)=>n+e.amount,0));
  const expected=round(d.float+cashIn-changeOut-refunds+paidIn-paidOut-drops);
  return {float:d.float,cashIn,refunds,paidIn,paidOut,drops,expected,noSales:d.events.filter(e=>e.kind==='nosale').length,over:d.closedAt?round(d.counted-(d.expected??expected)):null};
 }

 // ---------- Gift cards and house accounts ----------
 const giftCard=(s,code)=>s.pos.giftCards.find(g=>g.code===String(code||'').toUpperCase().trim());
 const account=(s,id)=>s.pos.accounts.find(a=>a.id===id);
 const newCode=s=>{for(let i=0;i<50;i++){const code='GC-'+Math.random().toString(36).slice(2,6).toUpperCase().replace(/[^A-Z0-9]/g,'7');if(!giftCard(s,code))return code;}return 'GC-'+Date.now().toString(36).toUpperCase().slice(-6);};

 // ---------- Labor for the service, from the roster ----------
 function labor(s,date,service=''){
  const list=s.shifts.filter(x=>x.date===date&&(!service||x.service===service)),cost=round(list.reduce((n,x)=>n+(B.schedule?.metrics?B.schedule.metrics(s,x).wages:0),0)),hours=Math.round(list.reduce((n,x)=>n+(B.schedule?.metrics?B.schedule.metrics(s,x).workMinutes:0),0)/6)/10;
  return {cost,hours,people:new Set(list.map(x=>x.person)).size};
 }

 // ---------- Rollups and sales ----------
 const hourOf=iso=>new Date(iso).getHours();
 const catName=(s,l)=>{const it=B.menu.item(s,l.item);const c=it&&B.menu.category(s,it.category);return c?c.name:l.gift?'Gift cards':(l.station||'Other');};
 function rollup(s,date,service,list=checks(s,date,service)){
  const d={checks:0,covers:0,gross:0,comps:0,discounts:0,promos:0,net:0,tax:0,sc:0,tips:0,voids:0,voidAmt:0,refunds:0,giftSold:0,byServer:{},byCat:{},byItem:{},byTender:{},byHour:{},byType:{}};
  for(const c of list){
   if(c.training)continue;
   const t=totals(s,c);
   if(c.status==='void'){d.voids+=c.lines.filter(l=>l.status==='void'&&l.sentAt).length;d.voidAmt=round(d.voidAmt+c.lines.filter(l=>l.status==='void'&&l.sentAt).reduce((n,l)=>n+lineGross(l),0));continue;}
   if(c.status!=='paid')continue;
   d.checks++;d.covers+=c.guests;d.gross=round(d.gross+t.gross);d.comps=round(d.comps+t.comps);d.discounts=round(d.discounts+t.discounts);d.promos=round(d.promos+t.promos);d.net=round(d.net+t.net);d.tax=round(d.tax+t.tax);d.sc=round(d.sc+t.sc);d.tips=round(d.tips+t.tips);d.voids+=t.voids;d.voidAmt=round(d.voidAmt+t.voidAmt);d.refunds=round(d.refunds+t.refunded);
   const sv=d.byServer[c.server]||=[0,0,0,0];sv[0]=round(sv[0]+t.net);sv[1]=round(sv[1]+t.tips);sv[2]++;sv[3]+=c.guests;
   const h=hourOf(c.closedAt||c.openedAt);d.byHour[h]=round((d.byHour[h]||0)+t.net);
   const ty=d.byType[c.type||'dine']||=[0,0];ty[0]=round(ty[0]+t.net);ty[1]++;
   for(const l of c.lines){if(l.status==='void')continue;const v=l.comp?0:round(lineGross(l)-lineDisc(l)),cat=catName(s,l);d.byCat[cat]=round((d.byCat[cat]||0)+v);const it=d.byItem[l.item||l.name]||=[0,0];it[0]+=l.qty;it[1]=round(it[1]+v);if(l.gift)d.giftSold=round(d.giftSold+lineGross(l));}
   for(const x of c.payments){const m=d.byTender[x.method]||=[0,0];m[0]=round(m[0]+x.amount);m[1]=round(m[1]+x.tip);}
  }
  const dr=s.pos.drawers.filter(x=>x.date===date&&x.service===service&&x.closedAt);
  if(dr.length)d.cash={expected:round(dr.reduce((n,x)=>n+x.expected,0)),counted:round(dr.reduce((n,x)=>n+x.counted,0))};
  return d;
 }
 const trim=(d,n=40)=>{const top=Object.entries(d.byItem).sort((a,b)=>b[1][1]-a[1][1]).slice(0,n);d.byItem=Object.fromEntries(top);return d;};
 const memo=new WeakMap();
 function sales(s,{from,to,service='',server=''}={}){
  from||=B.dateString(new Date());to||=from;
  const k=[from,to,service,server].join('|');let cache=memo.get(s);if(!cache){cache=new Map();memo.set(s,cache);}if(cache.has(k))return cache.get(k);
  const out={from,to,checks:0,covers:0,gross:0,comps:0,discounts:0,promos:0,net:0,tax:0,sc:0,tips:0,voids:0,voidAmt:0,refunds:0,giftSold:0,open:0,openTotal:0,days:0,cashOver:0,cashCounted:0,byServer:new Map(),byCat:new Map(),byItem:new Map(),byTender:new Map(),byHour:new Map(),byService:new Map(),byDay:new Map(),byType:new Map()};
  const add=(d,date,svc)=>{
   if(server){const sv=d.byServer[server];if(!sv)return;out.checks+=sv[2];out.covers+=sv[3];out.net=round(out.net+sv[0]);out.tips=round(out.tips+sv[1]);const S=out.byServer.get(server)||{net:0,tips:0,checks:0,covers:0};S.net=round(S.net+sv[0]);S.tips=round(S.tips+sv[1]);S.checks+=sv[2];S.covers+=sv[3];out.byServer.set(server,S);out.byDay.set(date,round((out.byDay.get(date)||0)+sv[0]));return;}
   for(const f of ['checks','covers','voids'])out[f]+=d[f]||0;for(const f of ['gross','comps','discounts','promos','net','tax','sc','tips','voidAmt','refunds','giftSold'])out[f]=round(out[f]+(d[f]||0));
   if(d.cash){out.cashOver=round(out.cashOver+d.cash.counted-d.cash.expected);out.cashCounted=round(out.cashCounted+d.cash.counted);}
   for(const [pid,sv] of Object.entries(d.byServer)){const S=out.byServer.get(pid)||{net:0,tips:0,checks:0,covers:0};S.net=round(S.net+sv[0]);S.tips=round(S.tips+sv[1]);S.checks+=sv[2];S.covers+=sv[3];out.byServer.set(pid,S);}
   for(const [c,v] of Object.entries(d.byCat))out.byCat.set(c,round((out.byCat.get(c)||0)+v));
   for(const [i,v] of Object.entries(d.byItem)){const I=out.byItem.get(i)||[0,0];I[0]+=v[0];I[1]=round(I[1]+v[1]);out.byItem.set(i,I);}
   for(const [m,v] of Object.entries(d.byTender)){const T=out.byTender.get(m)||[0,0];T[0]=round(T[0]+v[0]);T[1]=round(T[1]+v[1]);out.byTender.set(m,T);}
   for(const [h,v] of Object.entries(d.byHour))out.byHour.set(Number(h),round((out.byHour.get(Number(h))||0)+v));
   for(const [t,v] of Object.entries(d.byType||{dine:[d.net,d.checks]})){const T=out.byType.get(t)||[0,0];T[0]=round(T[0]+v[0]);T[1]+=v[1];out.byType.set(t,T);}
   const SV=out.byService.get(svc)||{net:0,checks:0,covers:0};SV.net=round(SV.net+d.net);SV.checks+=d.checks;SV.covers+=d.covers;out.byService.set(svc,SV);
   out.byDay.set(date,round((out.byDay.get(date)||0)+d.net));
  };
  const seen=new Set();
  for(const c of s.pos.checks){if(c.date<from||c.date>to||(service&&c.service!==service))continue;const kk=key(c.date,c.service);if(seen.has(kk))continue;seen.add(kk);const list=checks(s,c.date,c.service);add(rollup(s,c.date,c.service,list),c.date,c.service);
   for(const o of list)if(o.status==='open'&&real(o)&&(!server||o.server===server)){out.open++;out.openTotal=round(out.openTotal+totals(s,o).total);}}
  for(const [kk,d] of Object.entries(s.pos.days)){const date=kk.slice(0,10),svc=kk.slice(11);if(date<from||date>to||(service&&svc!==service))continue;seen.add(kk);add(d,date,svc);}
  out.days=new Set([...seen].map(x=>x.slice(0,10))).size;
  out.avgCheck=out.checks?round(out.net/out.checks):0;out.perCover=out.covers?round(out.net/out.covers):0;out.tipPct=out.net?Math.round(out.tips/out.net*1000)/10:0;
  const name=id=>B.menu.item(s,id)?.name||(id==='gift-card'?'Gift card':id==='open-item'?'Open item':id);
  out.servers=[...out.byServer].map(([person,v])=>({person,...v,avgCheck:v.checks?round(v.net/v.checks):0,tipPct:v.net?Math.round(v.tips/v.net*1000)/10:0})).sort((a,b)=>b.net-a.net);
  out.categories=[...out.byCat].map(([label,value])=>({label,value})).sort((a,b)=>b.value-a.value);
  out.items=[...out.byItem].map(([id,[qty,net]])=>({id,name:name(id),qty,net})).sort((a,b)=>b.net-a.net);
  out.tenders=[...out.byTender].map(([method,[amount,tip]])=>({method,amount,tip})).sort((a,b)=>b.amount-a.amount);
  out.hours=[...out.byHour].sort((a,b)=>a[0]-b[0]).map(([hour,net])=>({hour,net}));
  out.services=[...out.byService].map(([service,v])=>({service,...v})).sort((a,b)=>b.net-a.net);
  out.types=[...out.byType].map(([type,[net,checks]])=>({type,label:typeLabel(type),net,checks})).sort((a,b)=>b.net-a.net);
  cache.set(k,out);return out;
 }
 const daySales=(s,date)=>Object.fromEntries(sales(s,{from:date,to:date}).services.map(x=>[x.service,x.net]));
 function menuMix(s,from,to){
  const S=sales(s,{from,to}),rows=S.items.map(r=>{const it=B.menu.item(s,r.id);const cost=it?B.menu.cost(s,it):0;const unitPrice=r.qty?r.net/r.qty:0;const cm=round(unitPrice-cost);return {...r,item:it,category:it?B.menu.category(s,it.category)?.name||'':'',cost:round(cost*r.qty),cm,cmTotal:round(cm*r.qty),costPct:unitPrice?Math.round(cost/unitPrice*1000)/10:0,share:0,klass:''};}).filter(r=>r.qty>0&&r.item);
  const units=rows.reduce((n,r)=>n+r.qty,0),avgCm=rows.length?rows.reduce((n,r)=>n+r.cmTotal,0)/Math.max(1,units):0,popularity=rows.length?0.7*(100/rows.length):0;
  // Classes compare like with like: a dish is popular and profitable against the other dishes in its category (Kasavana–Smith, per menu category), so a $4 soda is never a "dog" next to the rib-eye.
  const byCat=new Map();for(const r of rows){const g=byCat.get(r.category)||[];g.push(r);byCat.set(r.category,g);}
  for(const r of rows){r.share=units?Math.round(r.qty/units*1000)/10:0;const g=byCat.get(r.category),gUnits=g.reduce((n,x)=>n+x.qty,0),gCm=g.reduce((n,x)=>n+x.cmTotal,0)/Math.max(1,gUnits),gPop=0.7*(100/g.length);r.catShare=gUnits?Math.round(r.qty/gUnits*1000)/10:0;const popular=r.catShare>=gPop,profitable=r.cm>=gCm;r.klass=popular&&profitable?'Star':popular?'Plow horse':profitable?'Puzzle':'Dog';}
  return {rows:rows.sort((a,b)=>b.net-a.net),units,avgCm:round(avgCm),popularity:Math.round(popularity*10)/10,foodCost:round(rows.reduce((n,r)=>n+r.cost,0)),net:S.net,costPct:S.net?Math.round(rows.reduce((n,r)=>n+r.cost,0)/S.net*1000)/10:0};
 }
 function serverReport(s,person,date,service=''){
  const mine=checks(s,date,service).filter(c=>c.server===person&&real(c)),paid=mine.filter(c=>c.status==='paid'),open=mine.filter(c=>c.status==='open');
  const sum=f=>round(paid.reduce((n,c)=>n+totals(s,c)[f],0));
  const net=sum('net'),tips=sum('tips'),cardTips=sum('cardTips'),cashTips=sum('cashTips'),sc=sum('sc');
  const cash=round(paid.reduce((n,c)=>n+c.payments.filter(x=>x.method==='Cash').reduce((m,x)=>m+x.amount,0),0)),card=round(paid.reduce((n,c)=>n+c.payments.filter(x=>x.method!=='Cash').reduce((m,x)=>m+x.amount,0),0));
  const tipOut=Object.entries(settings(s).tipOut).filter(([,pct])=>pct>0).map(([to,pct])=>({to,pct,amount:round(net*pct/100)})),tipOutTotal=round(tipOut.reduce((n,x)=>n+x.amount,0));
  const rolled=service?[s.pos.days[key(date,service)]].filter(Boolean):Object.entries(s.pos.days).filter(([k])=>k.startsWith(date+'|')).map(([,d])=>d);
  const extra=rolled.reduce((acc,d)=>{const sv=d.byServer[person];if(sv){acc.net=round(acc.net+sv[0]);acc.tips=round(acc.tips+sv[1]);acc.checks+=sv[2];acc.covers+=sv[3];}return acc;},{net:0,tips:0,checks:0,covers:0});
  return {person,date,service,checks:paid.length+extra.checks,open:open.length,covers:paid.reduce((n,c)=>n+c.guests,0)+extra.covers,gross:sum('gross'),comps:sum('comps'),discounts:sum('discounts'),net:round(net+extra.net),tax:sum('tax'),sc,tips:round(tips+extra.tips),cardTips,cashTips,cash,card,tipOut,tipOutTotal,netTips:round(tips+extra.tips-tipOutTotal),avgCheck:paid.length?round(net/paid.length):0,voids:sum('voids'),voidAmt:sum('voidAmt'),refunds:sum('refunded'),openChecks:open,cashDue:round(cash-cashTips)};
 }
 const tipsFor=(s,person,date)=>round(checks(s,date).filter(c=>c.server===person&&c.status==='paid'&&real(c)).reduce((n,c)=>n+totals(s,c).tips,0));
 const pinOf=(s,id)=>s.pos.pins[id]||(s.team.find(p=>p.id===id)?.access==='manager'?'0000':'1234');
 // The end-of-day report as text, for the printer or the clipboard.
 function zReport(s,date,service=''){
  const S=sales(s,{from:date,to:date,service}),w=42,pad=(a,b)=>String(a).slice(0,w-String(b).length-1).padEnd(w-String(b).length)+b,m=n=>'$'+Number(n||0).toFixed(2),L=labor(s,date,service);
  const dr=s.pos.drawers.filter(d=>d.date===date&&(!service||d.service===service));
  const lines=[settings(s).receipt.header.toUpperCase(),'END OF DAY · '+date+(service?' · '+service:''),'='.repeat(w),pad('Checks',S.checks),pad('Covers',S.covers),pad('Gross sales',m(S.gross)),pad('Comps',m(S.comps)),pad('Discounts',m(S.discounts)),pad('Promotions',m(S.promos)),pad('NET SALES',m(S.net)),pad('Tax collected',m(S.tax)),pad('Service charge',m(S.sc)),pad('Tips',m(S.tips)),pad('Refunds',m(S.refunds)),pad('Voids after sending',S.voids+' · '+m(S.voidAmt)),pad('Gift cards sold',m(S.giftSold)),pad('Average check',m(S.avgCheck)),'-'.repeat(w),'BY TENDER',...S.tenders.map(t=>pad(' '+t.method,m(t.amount)+' (tips '+m(t.tip)+')')),'-'.repeat(w),'BY ORDER TYPE',...S.types.map(t=>pad(' '+t.label,m(t.net)+' · '+t.checks)),'-'.repeat(w),'BY SERVER',...S.servers.map(r=>pad(' '+(B.person(r.person)?.name||r.person),m(r.net)+' · tips '+m(r.tips))),'-'.repeat(w),'CASH DRAWERS',...(dr.length?dr.map(d=>{const x=drawerExpected(s,d);return pad(' '+d.service+(d.closedAt?'':' (open)'),d.closedAt?'exp '+m(d.expected)+' cnt '+m(d.counted)+' '+(x.over>=0?'+':'')+m(x.over):'expected '+m(x.expected));}):[' No drawer opened']),'-'.repeat(w),pad('Labor (rostered)',m(L.cost)+' · '+(S.net?Math.round(L.cost/S.net*100):0)+'%'),pad('Sales per labor hour',L.hours?m(S.net/L.hours):'—'),'='.repeat(w),'Printed '+new Date().toLocaleString('en-US',{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})];
  return lines.join('\n');
 }

 // ---------- Changes ----------
 function syncTips(s,person,date){
  const hasChecks=checks(s,date).some(c=>c.server===person);if(!hasChecks)return;
  const amount=tipsFor(s,person,date),list=s.scheduling.tips,old=list.find(t=>t.person===person&&t.date===date);
  if(old){if(amount>0||old.source==='pos'){old.amount=amount;old.source='pos';}}
  else if(amount>0)list.push({id:'pos-tip-'+person+'-'+date.replace(/-/g,''),person,date,amount,source:'pos'});
 }
 // Paid food leaves the shelf: recipe units per portion come off the counted stock, never below zero.
 function deplete(s,c){
  if(!settings(s).depleteStock||c.training||!s.stock?.items)return;
  for(const l of c.lines){if(l.status==='void')continue;const it=B.menu.item(s,l.item);if(!it)continue;for(const r of it.recipe||[]){const x=s.stock.items.find(i=>i.id===r.item);if(x&&x.onHand!==null&&x.onHand!==undefined)x.onHand=Math.max(0,round(x.onHand-r.units*l.qty/(l.splitOf||1)));}}
 }
 function change(state,action,role=state.role){
  let s=upgrade(state);const a=copy(action);
  if(!a?.type?.startsWith('pos:')){
   s=upgrade(prev.change(s,a,role));
   if(a.type==='floor:table'&&a.label!==undefined){const old=state.floor?.tables.find(t=>t.id===a.id),now=s.floor.tables.find(t=>t.id===a.id);if(old&&now&&old.label!==now.label){for(const c of s.pos.checks)c.tables=c.tables.map(l=>l===old.label?now.label:l);for(const sec of Object.values(s.pos.sections))if(sec.tables[old.label]!==undefined){sec.tables[now.label]=sec.tables[old.label];delete sec.tables[old.label];}}}
   if(a.type==='ops:service'){const oldName=state.setup?.services?.find(x=>x.id===a.id)?.name,name=s.setup.services.find(x=>x.id===a.id)?.name;if(oldName&&name&&oldName!==name){for(const c of s.pos.checks)if(c.service===oldName)c.service=name;for(const d of s.pos.drawers)if(d.service===oldName)d.service=name;for(const box of ['sections','days'])for(const k of Object.keys(s.pos[box]))if(k.slice(11)===oldName){s.pos[box][k.slice(0,11)+name]=s.pos[box][k];delete s.pos[box][k];}}}
   if(!valid(s))throw Error('Check the POS details.');return s;
  }
  const me=B.actor(role,s.crewId,s.managerId),manager=role==='manager',viewer=s.team.find(p=>p.id===me);
  if(!viewer?.active||viewer.access!==role)throw Error('Choose an active team member.');
  const can=k=>manager||!!B.permissions?.can(s,k,me);
  const use=can('pos'),lead=can('posLead');
  if(!use)throw Error('Your manager has turned off the POS for your profile.');
  const needLead=what=>{if(!lead)throw Error(`Only managers or a POS lead can ${what}.`);};
  const now=new Date().toISOString(),p=s.pos,st=p.settings;
  const get=id=>{const c=check(s,id);if(!c)throw Error('This check no longer exists.');return c;};
  const openOnly=c=>{if(c.status!=='open')throw Error(`Check #${c.number} is ${c.status}. Reopen it first.`);};
  const own=c=>{if(c.server!==me&&!lead)throw Error(`Check #${c.number} belongs to ${s.team.find(x=>x.id===c.server)?.name||'another server'}. Ask them or a manager.`);};
  const clean=(x,max)=>String(x??'').trim().slice(0,max);
  const asManager=act=>{s=upgrade(prev.change(s,act,'manager'));};
  const log=(kind,text,amount,checkId)=>{p.journal.push({at:now,by:me,kind,text:clean(text,240),...(amount!==undefined?{amount:round(amount)}:{}),...(checkId?{check:checkId}:{})});if(p.journal.length>LIMITS.journal)p.journal.splice(0,p.journal.length-LIMITS.journal);};
  const newId=prefix=>prefix+'-'+Math.random().toString(36).slice(2,10);
  const label=c=>'#'+c.number+(c.tables.length?' · Table '+c.tables.join('+'):c.type!=='dine'?' · '+typeLabel(c.type):'');
  const finish=c=>{
   c.status='paid';c.closedAt=now;syncTips(s,c.server,c.date);deplete(s,c);
   for(const g of p.giftCards)if(g.check===c.id&&g.status==='pending')g.status='active';
   if(c.res){const r=s.reservations.find(x=>x.id===c.res);if(r&&r.status==='Seated'&&!p.checks.some(o=>o.res===c.res&&o.status==='open'))asManager({type:'reservation-status',id:r.id,status:'Completed'});}
  };
  const freeTable=c=>{if(c.res){const r=s.reservations.find(x=>x.id===c.res);if(r&&r.status==='Seated'&&r.source==='Walk-in'&&!p.checks.some(o=>o.res===c.res&&o.status==='open'&&o.id!==c.id))asManager({type:'reservation-status',id:r.id,status:'Completed'});}};
  const newCheck=(from,extra)=>({id:extra.id,number:p.seq++,date:from.date,service:from.service,type:from.type,tables:[...from.tables],res:from.res,name:'',server:from.server,guests:1,status:'open',openedAt:now,closedAt:'',presentedAt:'',pickupAt:from.pickupAt||'',phone:'',allergy:from.allergy||'',note:'',by:me,serviceCharge:false,training:from.training,source:'pos',parent:from.id,lines:[],discounts:[],payments:[],refunds:[],...(from.tab?{tab:{...from.tab}}:{}),...extra});
  const addLine=(c,l)=>{if(c.lines.length>=LIMITS.lines)throw Error('This check is full. Start another one.');c.lines.push(l);};
  if(a.type==='pos:open'){
   const date=B.isDate(a.date)?a.date:s.date,service=a.service||s.service;
   if(!s.setup.services.some(v=>v.name===service))throw Error('Choose a valid service.');
   if(!ident(a.id)||check(s,a.id))throw Error('This check could not be opened.');
   const type=TYPES.includes(a.type_)?a.type_:(Array.isArray(a.tables)&&a.tables.length?'dine':'tab');
   if(!st.orderTypes[type])throw Error(typeLabel(type)+' orders are turned off in POS settings.');
   const tables=type==='takeout'||type==='delivery'?[]:[...new Set((Array.isArray(a.tables)?a.tables:[]).map(l=>B.floor.byLabel(s,l)?.label).filter(Boolean))].slice(0,4);
   if(Array.isArray(a.tables)&&a.tables.length&&!tables.length&&type!=='takeout'&&type!=='delivery')throw Error('That table is not on the floor plan.');
   const guests=Number(a.guests??1);if(!Number.isInteger(guests)||guests<0||guests>LIMITS.guests)throw Error('Enter the number of guests (0–60).');
   let server=a.server||'';if(server&&server!==me)needLead('open a check for another server');
   server||=tables.length?(serverOf(s,date,service,tables[0])||me):me;
   if(!s.team.some(x=>x.id===server&&x.active))throw Error('Choose an active team member as the server.');
   if(!manager&&!lead&&server!==me)server=me;
   if(tables.length&&!a.another){const busy=tables.map(l=>forTable(s,date,service,l)).find(Boolean);if(busy)throw Error(`Table ${busy.tables.join('+')} already has check #${busy.number}. Open it, or start another check for the same table.`);}
   const training=a.training===true;if(training)needLead('open a training check');
   let res=a.res||'';
   if(tables.length&&!res&&a.seat!==false&&!training){
    const A=at(s,date,service),occ=B.floor.occupancy(s,date,service,A).find(o=>o.table.label===tables[0]);
    const b=occ?.booking;
    if(b&&b.status==='Seated')res=b.id;
    else if(b&&b.status==='Confirmed'&&['reserved','late'].includes(occ.status)){asManager({type:'floor:seat',id:b.id});res=b.id;}
    else{
     const id='walk-'+a.id.replace(/[^\w-]/g,'').slice(0,50);
     try{asManager({type:'floor:walk-in',id,date,service,tables,guests:Math.max(1,guests||1),name:clean(a.name,100)});res=id;}
     catch(err){
      const blockers=B.floor.conflicts(s,{id,date,service,time:B.floor.clock(A),tables,duration:s.floor.settings.turnMinutes});
      if(!blockers.length||!blockers.every(r=>r.status==='Completed'))throw err;
     }
    }
   }
   const linked=res?s.reservations.find(r=>r.id===res):null,pos=s.pos;
   const g=guests||linked?.guests||0,pickup=hhmm(a.pickupAt)&&a.pickupAt?a.pickupAt:(type==='takeout'||type==='delivery'?B.floor.clock(B.floor.nowMinutes()+st.prepMinutes+(type==='delivery'?15:0)):'');
   const tab=type==='tab'&&a.card?{card:clean(a.card,8).replace(/\D/g,'').slice(-4),preauth:num(Number(a.preauth),100000)?round(Number(a.preauth)):0}:undefined;
   pos.checks.push({id:a.id,number:pos.seq++,date,service,type,tables,res:linked?linked.id:'',name:clean(a.name,100)||(linked&&linked.source!=='Walk-in'?linked.name:''),server,guests:g,status:'open',openedAt:now,closedAt:'',presentedAt:'',pickupAt:pickup,phone:clean(a.phone,40),allergy:clean(a.allergy,120),note:clean(a.note,500),by:me,serviceCharge:type==='dine'&&st.serviceCharge>0&&st.serviceChargeFrom>0&&g>=st.serviceChargeFrom,...(training?{training:true}:{}),source:a.source==='online'&&lead?'online':'pos',parent:'',...(tab?{tab}:{}),lines:[],discounts:[],payments:[],refunds:[]});
   if(training)log('training','Opened training check #'+(pos.seq-1),undefined,a.id);
  }else if(a.type==='pos:add'){
   const c=get(a.id);openOnly(c);own(c);
   const qty=Number(a.qty??1);if(!Number.isInteger(qty)||qty<1||qty>LIMITS.qty)throw Error('Enter a quantity between 1 and 99.');
   const seat=Number(a.seat??0);if(!Number.isInteger(seat)||seat<0||seat>LIMITS.guests)throw Error('Choose a seat.');
   const note=clean(a.note,200),lineId=ident(a.line)?a.line:newId('l');
   if(c.lines.some(l=>l.id===lineId))throw Error('This line was already added.');
   if(a.item==='open-item'){
    // An open item: anything not on the menu, priced on the spot by a lead.
    needLead('ring in an open item');const price=round(Number(a.price));const name=clean(a.name,100)||'Open item';if(!num(price,100000)||price<=0)throw Error('Enter a price for the open item.');
    const station=s.setup.areas.includes(a.station)?a.station:'',course=Number.isInteger(a.course)?a.course:0;
    addLine(c,{id:lineId,item:'open-item',name,price,qty,seat,course,status:'held',mods:[],note,station,sentAt:'',tax:st.taxRate});log('open-item',`${qty}× ${name} at ${price.toFixed(2)} on ${label(c)}`,price*qty,c.id);
   }else if(a.item==='gift-card'){
    const amount=round(Number(a.price));if(!num(amount,5000)||amount<5)throw Error('Gift cards start at 5.00.');
    if(p.giftCards.length>=LIMITS.gift)throw Error('The gift card list is full.');
    const code=newCode(s);
    addLine(c,{id:lineId,item:'gift-card',name:'Gift card '+code,price:amount,qty:1,seat,course:0,status:'served',mods:[],note,station:'',sentAt:now,servedAt:now,tax:0,gift:code});
    p.giftCards.push({code,balance:amount,issued:amount,issuedAt:now,issuedBy:me,status:'pending',check:c.id,note:clean(a.note,120)});
    log('gift','Sold gift card '+code+' on '+label(c),amount,c.id);
   }else{
    const it=B.menu.item(s,a.item);if(!it||!it.active)throw Error('That item is not on the menu.');
    const av=B.menu.availability(s,it,c.date,c.service);
    if(av.status==='service')throw Error(`${it.name} is not served at ${c.service}.`);
    if(av.status==='soldout')throw Error(`${it.name} is sold out: ${av.reason}`);
    if(B.menu.OFF.includes(av.status))throw Error(`${it.name} is 86’d${av.reason?': '+av.reason:'.'}${av.sub?' Offer '+av.sub.name+' instead.':''}`);
    // A count set by the kitchen caps what can still be rung in for this service.
    if(av.status==='limited'&&qty>av.remaining)throw Error(`Only ${av.remaining} ${it.name} left for ${c.service}.`);
    const chosen=[].concat(a.mods||[]).map(String),mods=[];
    for(const g of B.menu.modifierGroups(s,it)){const picked=g.options.filter(o=>chosen.includes(o.name));if(g.required&&!picked.length)throw Error(`Choose ${g.name.toLowerCase()} for ${it.name}.`);if(!g.multi&&picked.length>1)throw Error(`Pick one ${g.name.toLowerCase()}.`);for(const o of picked)mods.push({name:o.name,price:o.price});}
    const course=Number.isInteger(a.course)?a.course:Math.max(0,B.menu.COURSES.indexOf(B.menu.courseOf(s,it)));
    const pr=priceFor(s,it,c.date,c.service,c.date===B.dateString(new Date())?B.floor.nowMinutes():undefined);
    const same=c.lines.find(l=>l.status==='held'&&l.item===it.id&&l.seat===seat&&l.note===note&&l.price===pr.price&&JSON.stringify(l.mods)===JSON.stringify(mods)&&!l.comp&&!l.discount&&!l.splitOf);
    if(same)same.qty=Math.min(LIMITS.qty,same.qty+qty);
    else addLine(c,{id:lineId,item:it.id,name:it.name,price:pr.price,...(pr.base!==undefined?{base:pr.base,promo:pr.promo}:{}),qty,seat,course,status:'held',mods,note,station:it.station,sentAt:'',tax:taxFor(s,st,it.category)});
   }
  }else if(a.type==='pos:repeat'){
   // Another round: the last batch of drinks sent for this seat (or the table) goes back on as held lines.
   const c=get(a.id);openOnly(c);own(c);
   const drinks=c.lines.filter(l=>l.status!=='void'&&l.status!=='held'&&l.station==='Bar'&&!l.gift&&(a.seat===undefined||l.seat===Number(a.seat)));
   if(!drinks.length)throw Error('No drinks have been sent on this check yet.');
   const last=drinks.map(l=>l.sentAt).sort().at(-1),batch=drinks.filter(l=>l.sentAt===last);
   for(const l of batch){const it=B.menu.item(s,l.item);if(it&&!B.menu.sellable(s,it,c.date,c.service))continue;addLine(c,{id:newId('l'),item:l.item,name:l.name,price:l.price,...(l.base!==undefined?{base:l.base,promo:l.promo}:{}),qty:l.qty,seat:l.seat,course:l.course,status:'held',mods:copy(l.mods),note:l.note||'',station:l.station,sentAt:'',tax:l.tax});}
  }else if(a.type==='pos:line'){
   const c=get(a.id);openOnly(c);own(c);const l=c.lines.find(x=>x.id===a.line);if(!l)throw Error('This line no longer exists.');
   if(l.status!=='held'&&(a.qty!==undefined||a.note!==undefined))throw Error('Sent items can’t be changed. Void the line instead.');
   if(a.qty!==undefined){const q=Number(a.qty);if(!Number.isInteger(q)||q<0||q>LIMITS.qty)throw Error('Enter a quantity between 0 and 99.');
    if(q>l.qty){const it=B.menu.item(s,l.item),left=it?B.menu.remaining(s,it,c.date,c.service):null;if(left!==null&&q-l.qty>left)throw Error(`Only ${left} more ${it.name} left for ${c.service}.`);}
    if(q===0){c.lines=c.lines.filter(x=>x!==l);}else l.qty=q;}
   if(a.seat!==undefined){const seat=Number(a.seat);if(!Number.isInteger(seat)||seat<0||seat>LIMITS.guests)throw Error('Choose a seat.');l.seat=seat;}
   if(a.course!==undefined){if(!['held','staged'].includes(l.status))throw Error('This course is already in the kitchen.');const course=Number(a.course);if(!Number.isInteger(course)||course<0||course>9)throw Error('Choose a course.');l.course=course;}
   if(a.note!==undefined)l.note=clean(a.note,200);
  }else if(a.type==='pos:remove-line'){
   const c=get(a.id);openOnly(c);own(c);const l=c.lines.find(x=>x.id===a.line);if(!l)throw Error('This line no longer exists.');
   if(l.status!=='held'&&!(l.gift&&c.payments.length===0))throw Error('This item was already sent. Void it with a reason instead.');
   if(l.gift)p.giftCards=p.giftCards.filter(g=>g.code!==l.gift);
   c.lines=c.lines.filter(x=>x!==l);
  }else if(a.type==='pos:send'){
   // Send what is held. With coursing on, the first course fires now and later courses wait on the pass until someone fires them.
   const c=get(a.id);openOnly(c);own(c);
   const held=c.lines.filter(l=>l.status==='held'&&(a.course===undefined||l.course===Number(a.course))&&(!Array.isArray(a.lines)||a.lines.includes(l.id)));
   if(!held.length)throw Error('Nothing to send yet.');
   const inKitchen=c.lines.filter(l=>['sent','ready','served','staged'].includes(l.status)&&!l.gift);
   const firedUpTo=Math.max(-1,...inKitchen.filter(l=>l.status!=='staged').map(courseRank));
   const first=Math.min(...held.filter(l=>l.station!=='Bar').map(courseRank),Infinity);
   for(const l of held){
    const stage=st.coursing&&!a.fireAll&&c.type==='dine'&&l.station!=='Bar'&&courseRank(l)>Math.max(firedUpTo,first===Infinity?courseRank(l):first);
    l.status=stage?'staged':'sent';l.sentAt=now;
   }
  }else if(a.type==='pos:fire'){
   // Fire the next course (or a given one): staged items start cooking now.
   const c=get(a.id);openOnly(c);
   const course=a.course===undefined?nextCourse(c):Number(a.course);if(course===null)throw Error('No course is waiting to be fired.');
   const staged=c.lines.filter(l=>l.status==='staged'&&courseRank(l)<=(course===3?2:course));if(!staged.length)throw Error('Nothing is waiting in that course.');
   for(const l of staged){l.status='sent';l.sentAt=now;}
  }else if(a.type==='pos:bump'){
   const c=get(a.id);openOnly(c);
   const ids=Array.isArray(a.lines)?a.lines:[a.line],lines=c.lines.filter(l=>ids.includes(l.id));if(!lines.length)throw Error('This line no longer exists.');
   const allowed={sent:['ready','served'],ready:['served','sent'],served:['ready']};
   for(const l of lines){if(!allowed[l.status]?.includes(a.status))throw Error(`${l.name} can’t move to ${a.status}.`);l.status=a.status;if(a.status==='served')l.servedAt=now;else delete l.servedAt;}
  }else if(a.type==='pos:void-line'){
   const c=get(a.id);openOnly(c);const l=c.lines.find(x=>x.id===a.line);if(!l)throw Error('This line no longer exists.');
   if(l.status==='void')throw Error('This line is already void.');
   if(l.status==='held'){own(c);c.lines=c.lines.filter(x=>x!==l);}
   else{needLead('void an item that was already sent');const reason=clean(a.reason,200);if(!reason)throw Error('Add the reason for the void.');l.status='void';l.voidReason=reason;l.voidBy=me;if(l.gift)p.giftCards=p.giftCards.filter(g=>g.code!==l.gift);log('void',`Voided ${l.qty}× ${l.name} on ${label(c)} · ${reason}`,lineGross(l),c.id);}
  }else if(a.type==='pos:comp'){
   needLead('comp an item');const c=get(a.id);openOnly(c);const l=c.lines.find(x=>x.id===a.line);if(!l||l.status==='void')throw Error('This line no longer exists.');
   if(a.undo){delete l.comp;}else{const reason=clean(a.reason,200);if(!reason)throw Error('Add the reason for the comp.');l.comp={reason,by:me,at:now};delete l.discount;log('comp',`Comped ${l.qty}× ${l.name} on ${label(c)} · ${reason}`,lineGross(l),c.id);}
  }else if(a.type==='pos:discount'){
   needLead('add a discount');const c=get(a.id);openOnly(c);
   const preset=a.preset?st.discountPresets.find(d=>d.id===a.preset):null;
   const kind=preset?preset.kind:a.kind,value=preset?preset.value:Number(a.value);
   if(!['pct','amt'].includes(kind)||!num(value,kind==='pct'?100:100000)||value<=0)throw Error('Enter a percentage up to 100 or an amount.');
   const reason=clean(a.reason,200)||preset?.name||'';if(!reason)throw Error('Add the reason for the discount.');
   if(a.line){const l=c.lines.find(x=>x.id===a.line);if(!l||l.status==='void')throw Error('This line no longer exists.');if(l.comp)throw Error('This item is already comped.');l.discount={kind,value:round(value),reason,by:me};log('discount',`${kind==='pct'?value+'% off':'$'+value.toFixed(2)+' off'} ${l.name} on ${label(c)} · ${reason}`,lineDisc(l),c.id);}
   else{if(c.discounts.length>=LIMITS.discounts)throw Error('Up to five discounts per check.');c.discounts.push({id:ident(a.discount)?a.discount:newId('d'),kind,value:round(value),reason,by:me});log('discount',`${kind==='pct'?value+'% off':'$'+value.toFixed(2)+' off'} ${label(c)} · ${reason}`,undefined,c.id);}
  }else if(a.type==='pos:remove-discount'){
   needLead('remove a discount');const c=get(a.id);openOnly(c);
   if(a.line){const l=c.lines.find(x=>x.id===a.line);if(l)delete l.discount;}else c.discounts=c.discounts.filter(d=>d.id!==a.discount);
  }else if(a.type==='pos:update'){
   const c=get(a.id);openOnly(c);own(c);
   if(a.guests!==undefined){const g=Number(a.guests);if(!Number.isInteger(g)||g<0||g>LIMITS.guests)throw Error('Enter the number of guests (0–60).');c.guests=g;}
   if(a.name!==undefined)c.name=clean(a.name,100);if(a.note!==undefined)c.note=clean(a.note,500);if(a.phone!==undefined)c.phone=clean(a.phone,40);if(a.allergy!==undefined)c.allergy=clean(a.allergy,120);
   if(a.pickupAt!==undefined){if(!hhmm(a.pickupAt))throw Error('Enter the pickup time as HH:MM.');c.pickupAt=a.pickupAt;}
   if(a.type_!==undefined){if(!TYPES.includes(a.type_))throw Error('Choose an order type.');if(!st.orderTypes[a.type_])throw Error(typeLabel(a.type_)+' orders are turned off.');if((a.type_==='takeout'||a.type_==='delivery')&&c.tables.length)throw Error('Take the check off its table first.');c.type=a.type_;}
   if(a.card!==undefined||a.preauth!==undefined){const card=clean(a.card??c.tab?.card,8).replace(/\D/g,'').slice(-4),pre=round(Number(a.preauth??c.tab?.preauth??0));if(!num(pre,100000))throw Error('Enter the pre-authorised amount.');if(card||pre)c.tab={card,preauth:pre};else delete c.tab;}
   if(a.serviceCharge!==undefined){needLead('change the service charge');c.serviceCharge=a.serviceCharge===true;}
  }else if(a.type==='pos:present'){
   const c=get(a.id);openOnly(c);own(c);if(!c.lines.some(l=>l.status!=='void'))throw Error('Nothing on the check yet.');c.presentedAt=a.undo?'':now;
  }else if(a.type==='pos:transfer'){
   const c=get(a.id);openOnly(c);
   if(a.server!==undefined&&a.server!==c.server){if(c.server!==me)needLead('transfer another server’s check');if(!s.team.some(x=>x.id===a.server&&x.active))throw Error('Choose an active team member.');log('transfer',`${label(c)} moved to ${s.team.find(x=>x.id===a.server)?.name}`,undefined,c.id);c.server=a.server;}
   if(Array.isArray(a.tables)){own(c);const tables=[...new Set(a.tables.map(l=>B.floor.byLabel(s,l)?.label).filter(Boolean))].slice(0,4);if(a.tables.length&&!tables.length)throw Error('That table is not on the floor plan.');
    const busy=tables.map(l=>forTable(s,c.date,c.service,l)).find(o=>o&&o.id!==c.id&&!a.join);if(busy)throw Error(`Table ${busy.tables.join('+')} already has check #${busy.number}.`);
    if(tables.length&&(c.type==='takeout'||c.type==='delivery'))c.type='dine';
    c.tables=tables;if(c.res&&tables.length){const r=s.reservations.find(x=>x.id===c.res);if(r&&['Confirmed','Seated'].includes(r.status)&&r.tables.join('+')!==tables.join('+'))try{asManager({type:'floor:assign',id:r.id,tables});}catch{}}}
  }else if(a.type==='pos:move-lines'){
   // Items move to another open check, or to a new check on the same table (a split by item).
   const c=get(a.id);openOnly(c);own(c);
   const ids=[].concat(a.lines||[]),moving=c.lines.filter(l=>ids.includes(l.id)&&l.status!=='void');if(!moving.length)throw Error('Pick the items to move.');
   let to=a.to?get(a.to):null;if(to){openOnly(to);if(to.date!==c.date||to.service!==c.service)throw Error('Checks must be on the same service.');}
   else{if(!ident(a.newId)||check(s,a.newId))throw Error('The new check could not be opened.');to=newCheck(c,{id:a.newId,name:clean(a.name,100)});p.checks.push(to);}
   for(const l of moving){
    const q=Number(a.qty??l.qty);
    if(moving.length===1&&Number.isInteger(q)&&q>0&&q<l.qty){l.qty-=q;addLine(to,{...copy(l),id:newId('l'),qty:q});}
    else{c.lines=c.lines.filter(x=>x!==l);addLine(to,l);}
   }
   if(!c.lines.length&&!c.payments.length&&a.to){p.checks=p.checks.filter(x=>x!==c);}
   log('split',`${moving.length} item${moving.length===1?'':'s'} moved from ${label(c)} to #${to.number}`,undefined,to.id);
  }else if(a.type==='pos:split-line'){
   // Share one item's cost between guests: the line becomes n equal shares, each on its own seat if seats are given.
   const c=get(a.id);openOnly(c);own(c);const l=c.lines.find(x=>x.id===a.line);if(!l||l.status==='void')throw Error('This line no longer exists.');
   const n=Number(a.n);if(!Number.isInteger(n)||n<2||n>10)throw Error('Split an item between 2 and 10 guests.');
   if((l.splitOf||1)*n>20)throw Error('This item is already split as far as it goes.');
   const seats=Array.isArray(a.seats)?a.seats.map(Number).filter(x=>Number.isInteger(x)&&x>=0&&x<=LIMITS.guests):[];
   let base=l;if(l.qty>1){l.qty-=1;base={...copy(l),id:newId('l'),qty:1};addLine(c,base);}
   base.splitOf=(base.splitOf||1)*n;if(seats.length)base.seat=seats[0];
   for(let i=1;i<n;i++)addLine(c,{...copy(base),id:newId('l'),seat:seats[i]??base.seat});
   log('split',`${l.name} shared ${n} ways on ${label(c)}`,undefined,c.id);
  }else if(a.type==='pos:split'){
   // Split a check: one check per seat (shared items spread across them), or evenly into n equal checks.
   const c=get(a.id);openOnly(c);own(c);
   if(c.lines.filter(l=>l.status!=='void').length<1)throw Error('Nothing on the check to split.');
   const ids=[].concat(a.ids||[]);if(!ids.every(ident)||ids.some(id=>check(s,id)))throw Error('The new checks could not be opened.');
   const made=[];
   if(a.mode==='seats'){
    const live=c.lines.filter(l=>l.status!=='void'),seats=[...new Set(live.map(l=>l.seat).filter(n=>n>0))].sort((x,y)=>x-y);
    if(seats.length<2)throw Error('Give the items seat numbers first; at least two seats are needed.');
    const shared=live.filter(l=>l.seat===0),targets=[c];
    for(let i=1;i<seats.length;i++){const id=ids[i-1];if(!id)throw Error('The new checks could not be opened.');const nc=newCheck(c,{id,name:c.name?c.name+' · seat '+seats[i]:'Seat '+seats[i]});p.checks.push(nc);targets.push(nc);made.push(nc);}
    for(let i=1;i<seats.length;i++)for(const l of live.filter(x=>x.seat===seats[i])){c.lines=c.lines.filter(x=>x!==l);targets[i].lines.push(l);}
    for(const l of shared){c.lines=c.lines.filter(x=>x!==l);const n=seats.length*(l.splitOf||1);targets.forEach(t=>t.lines.push({...copy(l),id:newId('l'),splitOf:n,seat:0}));}
    c.name=c.name?c.name+' · seat '+seats[0]:'Seat '+seats[0];
   }else{
    const n=Number(a.n);if(!Number.isInteger(n)||n<2||n>10)throw Error('Split between 2 and 10 ways.');
    if(ids.length<n-1)throw Error('The new checks could not be opened.');
    const live=c.lines.filter(l=>l.status!=='void');
    if(live.some(l=>(l.splitOf||1)*n>20))throw Error('These items are already split as far as they go.');
    for(const l of live)l.splitOf=(l.splitOf||1)*n;
    for(let i=1;i<n;i++){const nc=newCheck(c,{id:ids[i-1],name:c.name?c.name+' · '+(i+1)+'/'+n:(i+1)+'/'+n,guests:Math.max(1,Math.round(c.guests/n))});nc.lines=live.map(l=>({...copy(l),id:newId('l')}));nc.discounts=copy(c.discounts);p.checks.push(nc);made.push(nc);}
    c.name=c.name?c.name+' · 1/'+n:'1/'+n;c.guests=Math.max(1,Math.round(c.guests/n));
   }
   for(const nc of made)nc.serviceCharge=c.serviceCharge;
   log('split',`${label(c)} split into ${made.length+1} checks`,undefined,c.id);
  }else if(a.type==='pos:merge'){
   const c=get(a.id),from=get(a.from);openOnly(c);openOnly(from);own(c);own(from);if(c===from)throw Error('Pick a different check to merge.');
   if(from.date!==c.date||from.service!==c.service)throw Error('Checks must be on the same service.');
   if(c.lines.length+from.lines.length>LIMITS.lines||c.payments.length+from.payments.length>LIMITS.payments)throw Error('The merged check would be too long.');
   for(const l of from.lines)c.lines.push(l);for(const x of from.payments)c.payments.push(x);for(const d of from.discounts)if(c.discounts.length<LIMITS.discounts)c.discounts.push(d);
   c.tables=[...new Set([...c.tables,...from.tables])].slice(0,4);c.guests+=from.guests;if(!c.res&&from.res)c.res=from.res;c.serviceCharge=c.serviceCharge||from.serviceCharge;
   for(const g of p.giftCards)if(g.check===from.id)g.check=c.id;
   p.checks=p.checks.filter(x=>x!==from);
   log('merge',`#${from.number} merged into ${label(c)}`,undefined,c.id);
  }else if(a.type==='pos:pay'){
   const c=get(a.id);openOnly(c);own(c);const x=a.payment||{};
   if(!ident(x.id)||c.payments.some(y=>y.id===x.id))throw Error('This payment was already recorded.');
   if(!st.tenders.includes(x.method))throw Error('Choose how the guest is paying.');
   const amount=round(Number(x.amount)),tip=round(Number(x.tip||0)),t=totals(s,c);
   if(!Number.isFinite(amount)||amount<0||!num(tip,100000))throw Error('Enter the amount and tip.');
   if(amount<=0&&tip<=0)throw Error('Enter an amount.');
   if(amount>t.due+0.005)throw Error(`Only ${t.due.toFixed(2)} is due. Change is given from cash, not recorded as a payment.`);
   if(c.payments.length>=LIMITS.payments)throw Error('Too many payments on one check.');
   let ref=clean(x.ref,60);
   if(x.method==='Gift card'){const g=giftCard(s,ref);if(!g||g.status==='pending')throw Error('That gift card is not active.');if(g.balance<amount+tip-0.005)throw Error(`This gift card has ${g.balance.toFixed(2)} left.`);g.balance=round(g.balance-amount-tip);if(g.balance<=0.005)g.status='empty';ref=g.code;}
   if(x.method==='House account'){const acc=account(s,ref);if(!acc||!acc.active)throw Error('Choose a house account.');if(acc.limit>0&&acc.balance+amount+tip>acc.limit+0.005)throw Error(`${acc.name} would go over its ${acc.limit.toFixed(2)} limit.`);acc.balance=round(acc.balance+amount+tip);}
   if(x.method==='Cash'&&!drawer(s,c.date,c.service)&&c.date===B.dateString(new Date())&&st.cashFloat>0&&a.requireDrawer)throw Error('Open the cash drawer first.');
   const tendered=x.method==='Cash'&&num(Number(x.tendered),100000)&&Number(x.tendered)>0?round(Number(x.tendered)):undefined;
   c.payments.push({id:x.id,method:x.method,amount,tip,at:now,by:me,ref,...(tendered!==undefined?{tendered}:{})});
   if(totals(s,c).due<=0.005)finish(c);
  }else if(a.type==='pos:remove-payment'){
   needLead('remove a payment');const c=get(a.id);openOnly(c);const x=c.payments.find(y=>y.id===a.payment);if(!x)throw Error('This payment no longer exists.');
   if(x.method==='Gift card'){const g=giftCard(s,x.ref);if(g){g.balance=round(g.balance+x.amount+x.tip);g.status='active';}}
   if(x.method==='House account'){const acc=account(s,x.ref);if(acc)acc.balance=round(acc.balance-x.amount-x.tip);}
   c.payments=c.payments.filter(y=>y!==x);
  }else if(a.type==='pos:tip'){
   // Adjust the tip on a card payment after the slip comes back; the same day, by the server or a lead.
   const c=get(a.id);const x=c.payments.find(y=>y.id===a.payment);if(!x)throw Error('This payment no longer exists.');
   if(x.method==='Cash')throw Error('Cash tips are declared, not adjusted.');if(c.server!==me)needLead('adjust another server’s tips');
   const tip=round(Number(a.tip));if(!num(tip,100000))throw Error('Enter the tip.');
   if(x.method==='House account'){const acc=account(s,x.ref);if(acc)acc.balance=round(acc.balance-x.tip+tip);}
   log('tip',`Tip on ${label(c)} changed ${x.tip.toFixed(2)} → ${tip.toFixed(2)}`,tip-x.tip,c.id);x.tip=tip;syncTips(s,c.server,c.date);
  }else if(a.type==='pos:refund'){
   needLead('refund a payment');const c=get(a.id);if(c.status!=='paid')throw Error('Only paid checks can be refunded. Open checks take a void instead.');
   const amount=round(Number(a.amount)),t=totals(s,c),room=round(t.paid-t.refunded);
   if(!num(amount,100000)||amount<=0)throw Error('Enter the amount to refund.');if(amount>room+0.005)throw Error(`Up to ${room.toFixed(2)} can be refunded on this check.`);
   if(!st.tenders.includes(a.method))throw Error('Choose how the money goes back.');
   const reason=clean(a.reason,200);if(!reason)throw Error('Add the reason for the refund.');
   if(c.refunds.length>=LIMITS.refunds)throw Error('Too many refunds on one check.');
   if(a.method==='Gift card'){const g=giftCard(s,a.ref);if(!g)throw Error('Choose the gift card to refund to.');g.balance=round(g.balance+amount);g.status='active';}
   if(a.method==='House account'){const acc=account(s,a.ref);if(!acc)throw Error('Choose the house account.');acc.balance=round(acc.balance-amount);}
   c.refunds.push({id:ident(a.refund)?a.refund:newId('r'),amount,method:a.method,reason,by:me,at:now});
   log('refund',`Refunded ${amount.toFixed(2)} by ${a.method} on ${label(c)} · ${reason}`,amount,c.id);
  }else if(a.type==='pos:close'){
   const c=get(a.id);openOnly(c);own(c);if(totals(s,c).due>0.005)throw Error('There is still a balance due.');
   if(!c.lines.some(l=>l.status!=='void')&&!c.payments.length){p.checks=p.checks.filter(x=>x!==c);freeTable(c);}else finish(c);
  }else if(a.type==='pos:reopen'){
   needLead('reopen a check');const c=get(a.id);if(c.status==='open')throw Error('This check is already open.');
   c.status='open';c.closedAt='';if(a.unvoid)for(const l of c.lines)if(l.status==='void'&&l.voidReason==='Check voided'){l.status=l.sentAt?'served':'held';delete l.voidReason;}
   syncTips(s,c.server,c.date);log('reopen',`Reopened ${label(c)}`,undefined,c.id);
  }else if(a.type==='pos:void'){
   needLead('void a check');const c=get(a.id);openOnly(c);
   if(c.payments.length)throw Error('Remove the payments before voiding this check.');
   const reason=clean(a.reason,200);if(!reason)throw Error('Add the reason for the void.');
   for(const l of c.lines)if(l.status!=='void'){l.status='void';l.voidReason='Check voided';}
   p.giftCards=p.giftCards.filter(g=>!(g.check===c.id&&g.status==='pending'));
   c.status='void';c.closedAt=now;c.note=(c.note?c.note+' · ':'')+'Voided: '+reason;log('void',`Voided ${label(c)} · ${reason}`,totals(s,c).voidAmt,c.id);
   freeTable(c);
  }else if(a.type==='pos:section'){
   needLead('assign sections');const date=B.isDate(a.date)?a.date:s.date,service=a.service||s.service;
   if(!s.setup.services.some(v=>v.name===service))throw Error('Choose a valid service.');
   if(!s.team.some(x=>x.id===a.person&&x.active))throw Error('Choose an active team member.');
   const k=key(date,service),sec=p.sections[k]||={tables:{},by:me,at:now};
   const labels=[...new Set([].concat(a.tables||[]).map(l=>B.floor.byLabel(s,l)?.label).filter(Boolean))];
   if(a.replace!==false)for(const l of Object.keys(sec.tables))if(sec.tables[l]===a.person&&!labels.includes(l))delete sec.tables[l];
   for(const l of labels)sec.tables[l]=a.person;sec.by=me;sec.at=now;
  }else if(a.type==='pos:section-table'){
   needLead('assign sections');const date=B.isDate(a.date)?a.date:s.date,service=a.service||s.service,t=B.floor.byLabel(s,a.table);if(!t)throw Error('That table is not on the floor plan.');
   const k=key(date,service),sec=p.sections[k]||={tables:{},by:me,at:now};
   if(a.person){if(!s.team.some(x=>x.id===a.person&&x.active))throw Error('Choose an active team member.');sec.tables[t.label]=a.person;}else delete sec.tables[t.label];
   sec.by=me;sec.at=now;
  }else if(a.type==='pos:section-auto'){
   needLead('assign sections');const date=B.isDate(a.date)?a.date:s.date,service=a.service||s.service;
   const tables=suggestSections(s,date,service);if(!Object.keys(tables).length)throw Error('Nobody is rostered on this service yet. Add shifts first.');
   p.sections[key(date,service)]={tables,by:me,at:now,auto:true};
  }else if(a.type==='pos:section-clear'){
   needLead('assign sections');delete p.sections[key(B.isDate(a.date)?a.date:s.date,a.service||s.service)];
  }else if(a.type==='pos:drawer-open'){
   const date=B.isDate(a.date)?a.date:s.date,service=a.service||s.service;
   if(!s.setup.services.some(v=>v.name===service))throw Error('Choose a valid service.');
   if(drawer(s,date,service))throw Error('A drawer is already open for this service.');
   const float_=round(Number(a.float??st.cashFloat));if(!num(float_,100000))throw Error('Enter the starting float.');
   if(p.drawers.length>=LIMITS.drawers)p.drawers.splice(0,p.drawers.length-LIMITS.drawers+1);
   p.drawers.push({id:ident(a.id)?a.id:newId('dr'),date,service,openedBy:me,openedAt:now,float:float_,closedAt:'',note:'',events:[]});
   log('drawer',`Opened the ${service} drawer with a ${float_.toFixed(2)} float`,float_);
  }else if(a.type==='pos:drawer-event'){
   const d=drawerById(s,a.drawer)||drawer(s,s.date,s.service);if(!d)throw Error('Open the cash drawer first.');if(d.closedAt)throw Error('This drawer is closed.');
   if(!DRAWER_EVENTS.includes(a.kind))throw Error('Choose paid in, paid out, drop or no sale.');
   const amount=a.kind==='nosale'?0:round(Number(a.amount));if(a.kind!=='nosale'&&(!num(amount,100000)||amount<=0))throw Error('Enter the amount.');
   const reason=clean(a.reason,120);if(['in','out'].includes(a.kind)&&!reason)throw Error('Add what the cash was for.');
   if(a.kind==='out'&&!lead&&amount>50)throw Error('Paid-outs over 50.00 need a manager or POS lead.');
   if(['out','drop'].includes(a.kind)&&drawerExpected(s,d).expected<amount-0.005)throw Error('There is not that much cash in the drawer.');
   if(d.events.length>=LIMITS.events)throw Error('This drawer has too many entries. Close it and open a fresh one.');
   d.events.push({kind:a.kind,amount,reason,by:me,at:now});
   log({in:'paidin',out:'paidout',drop:'drop',nosale:'nosale'}[a.kind],a.kind==='nosale'?'No sale · drawer opened':`${a.kind==='in'?'Paid in':a.kind==='out'?'Paid out':'Cash drop'} ${amount.toFixed(2)}${reason?' · '+reason:''}`,amount||undefined);
  }else if(a.type==='pos:drawer-close'){
   const d=drawerById(s,a.drawer)||drawer(s,s.date,s.service);if(!d)throw Error('No drawer is open.');if(d.closedAt)throw Error('This drawer is already closed.');
   const counted=round(Number(a.counted));if(!num(counted,1000000))throw Error('Enter the cash counted.');
   const x=drawerExpected(s,d);d.expected=x.expected;d.counted=counted;d.closedAt=now;d.closedBy=me;d.note=clean(a.note,300);
   const over=round(counted-x.expected);log('drawer',`Closed the ${d.service} drawer · counted ${counted.toFixed(2)} against ${x.expected.toFixed(2)} (${over>=0?'over':'short'} ${Math.abs(over).toFixed(2)})`,over);
  }else if(a.type==='pos:drawer-reopen'){
   needLead('reopen a drawer');const d=drawerById(s,a.drawer);if(!d||!d.closedAt)throw Error('That drawer is not closed.');if(drawer(s,d.date,d.service))throw Error('Another drawer is open for this service.');
   d.closedAt='';delete d.closedBy;delete d.counted;delete d.expected;log('drawer',`Reopened the ${d.service} drawer for ${d.date}`);
  }else if(a.type==='pos:gift-adjust'){
   if(!manager)throw Error('Only managers can change a gift card balance.');const g=giftCard(s,a.code);if(!g)throw Error('That gift card does not exist.');
   const amount=round(Number(a.amount));if(!money(amount)||g.balance+amount<-0.005)throw Error('Enter an amount that keeps the balance at or above zero.');
   g.balance=round(g.balance+amount);g.status=g.balance<=0.005?'empty':'active';if(a.note!==undefined)g.note=clean(a.note,120);
   log('gift',`Gift card ${g.code} ${amount>=0?'topped up':'reduced'} by ${Math.abs(amount).toFixed(2)}${a.note?' · '+clean(a.note,120):''}`,amount);
  }else if(a.type==='pos:account'){
   needLead('manage house accounts');
   const id=ident(a.id)?a.id:newId('acc'),old=account(s,id),name=clean(a.name??old?.name,80);if(!name)throw Error('Name the house account.');
   const limit=round(Number(a.limit??old?.limit??0));if(!num(limit,1000000))throw Error('Enter the credit limit (0 for none).');
   if(old){old.name=name;old.limit=limit;if(a.contact!==undefined)old.contact=clean(a.contact,120);if(a.active!==undefined)old.active=a.active!==false;}
   else{if(p.accounts.length>=LIMITS.accounts)throw Error('The house account list is full.');p.accounts.push({id,name,balance:0,limit,contact:clean(a.contact,120),active:true});log('account',`Opened house account ${name}`);}
  }else if(a.type==='pos:account-settle'){
   needLead('settle a house account');const acc=account(s,a.id);if(!acc)throw Error('That house account does not exist.');
   const amount=round(Number(a.amount));if(!num(amount,1000000)||amount<=0)throw Error('Enter the amount received.');
   const method=st.tenders.includes(a.method)?a.method:'Card';acc.balance=round(acc.balance-amount);
   if(method==='Cash'){const d=drawer(s,s.date,s.service);if(d&&d.events.length<LIMITS.events)d.events.push({kind:'in',amount,reason:'House account · '+acc.name,by:me,at:now});}
   log('account',`${acc.name} paid ${amount.toFixed(2)} by ${method}${a.note?' · '+clean(a.note,120):''}`,amount);
  }else if(a.type==='pos:pin'){
   const who=a.person||me;if(who!==me&&!manager)throw Error('Only managers set other people’s PINs.');if(!s.team.some(x=>x.id===who))throw Error('Choose a team member.');
   const pin=String(a.pin||'');if(!/^\d{4}$/.test(pin))throw Error('A PIN is four digits.');p.pins[who]=pin;if(who!==me)log('pin',`PIN reset for ${s.team.find(x=>x.id===who)?.name}`);
  }else if(a.type==='pos:settings'){
   if(!manager)throw Error('Only managers can change POS settings.');
   const n=(k,max)=>{if(a[k]===undefined)return;const v=Number(a[k]);if(!num(v,max))throw Error('Check the '+k+' setting.');st[k]=round(v);};
   n('taxRate',100);n('serviceCharge',100);n('cashFloat',100000);
   if(a.taxGroups!==undefined){const list=[].concat(a.taxGroups).map(g=>({name:clean(g.name,30),rate:round(Number(g.rate)),categories:[...new Set([].concat(g.categories||[]).map(c=>clean(c,40)).filter(Boolean))]})).filter(g=>g.name);if(list.length>6||!list.every(g=>num(g.rate,100)))throw Error('Check the tax groups.');st.taxGroups=list;}
   if(a.taxIncluded!==undefined)st.taxIncluded=a.taxIncluded===true;
   if(a.rounding!==undefined){const r=Number(a.rounding);if(![0,0.05,0.1,0.5,1].includes(r))throw Error('Rounding is off, 0.05, 0.10, 0.50 or 1.00.');st.rounding=r;}
   if(a.serviceChargeFrom!==undefined){const v=Number(a.serviceChargeFrom);if(!Number.isInteger(v)||v<0||v>60)throw Error('Check the party size for the service charge.');st.serviceChargeFrom=v;}
   if(a.tipSuggestions!==undefined){const list=[].concat(a.tipSuggestions).map(Number).filter(x=>num(x,100));if(!list.length||list.length>5)throw Error('Enter one to five tip suggestions.');st.tipSuggestions=list;}
   if(a.tenders!==undefined){const list=[...new Set([].concat(a.tenders).map(x=>clean(x,30)).filter(Boolean))];if(!list.length)throw Error('Keep at least one way to pay.');const used=new Set(p.checks.flatMap(c=>[...c.payments.map(x=>x.method),...c.refunds.map(r=>r.method)]));for(const m of used)if(!list.includes(m))list.push(m);st.tenders=list;}
   if(a.tipOut!==undefined){const out={};for(const [k,v] of Object.entries(a.tipOut||{})){const pct=Number(v);if(!s.setup.areas.includes(k)||!num(pct,100))throw Error('Tip-out needs a station and a percentage.');if(pct>0)out[k]=round(pct);}st.tipOut=out;}
   for(const k of ['voidReasons','compReasons'])if(a[k]!==undefined)st[k]=[...new Set([].concat(a[k]).map(x=>clean(x,80)).filter(Boolean))].slice(0,12);
   if(a.discountPresets!==undefined){const list=[].concat(a.discountPresets).map((d,i)=>({id:ident(d.id)?d.id:'preset-'+i+'-'+Math.random().toString(36).slice(2,6),name:clean(d.name,40),kind:d.kind==='amt'?'amt':'pct',value:round(Number(d.value))})).filter(d=>d.name&&num(d.value,d.kind==='pct'?100:100000)&&d.value>0).slice(0,12);st.discountPresets=list;}
   if(a.happyHour!==undefined){const h=a.happyHour||{};const pct=Number(h.pct??st.happyHour.pct);if(!num(pct,100))throw Error('Check the happy hour percentage.');st.happyHour={enabled:h.enabled!==undefined?h.enabled===true:st.happyHour.enabled,pct:round(pct),categories:h.categories!==undefined?[...new Set([].concat(h.categories).map(c=>clean(c,40)).filter(Boolean))]:st.happyHour.categories};}
   if(a.orderTypes!==undefined){const o={...st.orderTypes};for(const t of TYPES)if(a.orderTypes[t]!==undefined)o[t]=a.orderTypes[t]===true;if(!o.dine&&!o.tab)throw Error('Keep dine-in or bar tabs on.');st.orderTypes=o;}
   for(const k of ['coursing','depleteStock'])if(a[k]!==undefined)st[k]=a[k]===true;
   for(const [k,lo,hi] of [['lateMinutes',1,120],['warnMinutes',0,120],['prepMinutes',0,240],['keepDays',1,30]])if(a[k]!==undefined){const v=Number(a[k]);if(!Number.isInteger(v)||v<lo||v>hi)throw Error('Check the '+k+' setting.');st[k]=v;}
   if(a.receipt!==undefined)st.receipt={header:clean(a.receipt.header??st.receipt.header,80)||st.receipt.header,footer:clean(a.receipt.footer??st.receipt.footer,160)};
   log('settings','POS settings changed');
  }else if(a.type==='pos:consolidate'){
   if(!manager)throw Error('Only managers can archive a day.');const date=B.isDate(a.date)?a.date:s.date,service=a.service||s.service;
   const list=checks(s,date,service);if(!list.length)throw Error('No checks to archive for this service.');
   if(list.some(c=>c.status==='open'))throw Error('Close or void every open check first.');
   const k=key(date,service),d=trim(rollup(s,date,service,list));
   const old=p.days[k];if(old){for(const f of ['checks','covers','voids'])d[f]+=old[f]||0;for(const f of ['gross','comps','discounts','promos','net','tax','sc','tips','voidAmt','refunds','giftSold'])d[f]=round(d[f]+(old[f]||0));
    for(const box of ['byServer','byItem','byTender','byType'])for(const [kk,v] of Object.entries(old[box]||{})){const cur=d[box][kk];d[box][kk]=cur?cur.map((x,i)=>round(x+v[i])):v;}
    for(const box of ['byCat','byHour'])for(const [kk,v] of Object.entries(old[box]||{}))d[box][kk]=round((d[box][kk]||0)+v);
    if(old.cash){d.cash=d.cash?{expected:round(d.cash.expected+old.cash.expected),counted:round(d.cash.counted+old.cash.counted)}:old.cash;}}
   p.days[k]=d;p.checks=p.checks.filter(c=>!(c.date===date&&c.service===service));p.drawers=p.drawers.filter(x=>!(x.date===date&&x.service===service&&x.closedAt));
  }else throw Error('Unknown POS action.');
  if(!valid(s))throw Error('Check the POS details.');return s;
 }
 B.pos={DEFAULTS,LIMITS,LINE,STATUS,TYPES,TYPE_LABEL,SPECIAL_TENDERS,upgrade,base,settings,totals,lineTotal,lineGross,lineDisc,checks,openChecks,check,forTable,checksFor,stageOf,tableState,typeLabel,sections,serverOf,myTables,staff,suggestSections,at,happyHour,priceFor,taxFor,tickets,allDay,recent,nextCourse,drawer,drawerById,drawerExpected,giftCard,account,labor,rollup,trim,sales,daySales,menuMix,serverReport,tipsFor,pinOf,zReport,syncTips,key,minutesSince};
 B.starter=(...args)=>upgrade(prev.starter(...args));B.validState=valid;B.change=change;
 B.load=storage=>{try{
  const s=upgrade(prev.load(storage));if(valid(s))return s;
  s.pos=base();if(valid(s))return s;
 }catch{}return B.starter();};
})();
