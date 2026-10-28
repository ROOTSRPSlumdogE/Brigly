/* Demo-only POS content for the fictional workspace: twelve weeks of day rollups that match the recorded sales, full checks for the last few days (dine-in, bar tabs, takeout and delivery), closed cash drawers with their counts, gift cards and house accounts, an audit journal, server sections, and a live service today with checks on the seated tables, a drawer open and pickups due. Runs once, then keeps today fresh. */
(function(){
 'use strict';
 const B=Brigly,prev={starter:B.starter,load:B.load};
 const copy=x=>JSON.parse(JSON.stringify(x));
 const hash=t=>{let n=2166136261;for(const c of String(t)){n^=c.charCodeAt(0);n=Math.imul(n,16777619);}return n>>>0;};
 const round=n=>Math.round(n*100)/100;
 const iso=(date,minutes)=>{const m=((minutes%1440)+1440)%1440,d=minutes>=1440?B.addDays(date,1):minutes<0?B.addDays(date,-1):date;return new Date(d+'T'+String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0')+':00').toISOString();};
 const ROLLUP_DAYS=84,FULL_DAYS=2,PRUNE_DAYS=120,TOP_ITEMS=8;
 const PROFILE={
  Dinner:{starters:.4,mains:.85,sides:.15,desserts:.3,drinks:1.1,drinkCats:['cocktails','wine','beer','soft','coffee'],drinkW:[.3,.3,.2,.12,.08],mainCats:['mains']},
  Lunch:{starters:.2,mains:.9,sides:.1,desserts:.1,drinks:.9,drinkCats:['soft','wine','beer','coffee','cocktails'],drinkW:[.35,.2,.2,.2,.05],mainCats:['mains']},
  'Weekend brunch':{starters:.1,mains:.95,sides:.1,desserts:.05,drinks:1.2,drinkCats:['coffee','soft','cocktails','wine'],drinkW:[.45,.2,.25,.1],mainCats:['brunch','mains']},
  'Private events':{starters:.8,mains:1,sides:.3,desserts:.7,drinks:1.8,drinkCats:['wine','cocktails','beer','soft'],drinkW:[.45,.3,.1,.15],mainCats:['mains']},
  'Late service':{starters:.35,mains:.3,sides:.2,desserts:.1,drinks:2,drinkCats:['cocktails','beer','wine','soft'],drinkW:[.45,.3,.15,.1],mainCats:['mains']}
 };
 const profile=svc=>PROFILE[svc]||PROFILE.Dinner;
 function pools(s){
  const m=s.menu,by=cat=>m.items.filter(i=>i.active&&i.category===cat);
  return {starters:by('starters'),sides:by('sides'),desserts:by('desserts'),cat:by,all:m.items.filter(i=>i.active)};
 }
 const pick=(list,h)=>list.length?list[h%list.length]:null;
 const weighted=(cats,weights,h)=>{let r=(h%1000)/1000,i=0;for(;i<weights.length-1;i++){if(r<weights[i])break;r-=weights[i];}return cats[i];};
 function lines(s,P,svc,guests,seed,out86,date,minute){
  const pr=profile(svc),st=s.pos.settings,list=[],add=(it,seat,h)=>{if(!it||out86.has(it.id))return;const mods=B.menu.modifierGroups(s,it).filter(g=>g.required).map(g=>{const o=g.options[h%g.options.length];return {name:o.name,price:o.price};});const price=B.pos.priceFor(s,it,date,svc,minute);list.push({id:'l'+list.length,item:it.id,name:it.name,price:price.price,...(price.base!==undefined?{base:price.base,promo:price.promo}:{}),qty:1,seat,course:Math.max(0,B.menu.COURSES.indexOf(B.menu.courseOf(s,it))),status:'served',mods,station:it.station,tax:B.pos.taxFor(s,st,it.category)});};
  for(let g=1;g<=guests;g++){
   const h=hash(seed+':'+g);
   if((h%100)/100<pr.starters)add(pick(P.starters,h>>>3),g,h);
   if((h%97)/97<pr.mains){const cats=pr.mainCats.flatMap(c=>P.cat(c));add(pick(cats,h>>>5),g,h>>>2);}
   if((h%89)/89<pr.sides)add(pick(P.sides,h>>>7),g,h);
   if((h%83)/83<pr.desserts)add(pick(P.desserts,h>>>9),g,h);
   const drinks=Math.round(pr.drinks+((h%7)-3)/6);
   for(let d=0;d<Math.max(0,drinks);d++){const hd=hash(seed+':'+g+':d'+d),cat=weighted(pr.drinkCats,pr.drinkW,hd);add(pick(P.cat(cat),hd>>>4),g,hd);}
  }
  if(!list.length)add(pick(P.all,hash(seed)),1,0);
  return list;
 }
 function crew(s,date,svc){const st=B.pos.staff(s,date,svc);const servers=st.servers.length?st.servers:st.bar.length?st.bar:st.managers;return {servers,bar:st.bar.length?st.bar:servers};}
 const out86For=(s,date,svc)=>{const set=new Set();for(const u of s.unavailable)if(u.date===date&&u.service===svc&&u.status==='Approved'){if(u.menuItem)set.add(u.menuItem);if(u.item)for(const it of B.menu.usedIn(s,u.item))set.add(it.id);}return set;};
 const party=h=>{const r=h%100;return r<22?1:r<62?2:r<80?3:r<93?4:r<98?6:8;};
 const NAMES=['Priya S.','Marcus B.','Elena R.','Tom K.','Aisha M.','Daniel O.','Yuki T.','Sofia L.','Ben H.','Chloe W.'];
 const fresh=c=>({presentedAt:'',pickupAt:'',phone:'',allergy:'',source:'pos',parent:'',refunds:[],...c});
 // Checks for a whole service, adding up to about the recorded net sales.
 function serviceChecks(s,P,date,svc,target){
  const out86=out86For(s,date,svc),{servers,bar}=crew(s,date,svc),{start,end}=B.floor.serviceWindow(s,svc),res=s.reservations.filter(r=>r.date===date&&r.service===svc&&!['Cancelled','No-show'].includes(r.status)),tables=s.floor.tables.filter(t=>t.shape!=='bar'),barTables=s.floor.tables.filter(t=>t.shape==='bar');
  const out=[];let net=0,n=0;const seedBase=date+'|'+svc;
  const make=(guests,tbl,r,h,type)=>{
   const minutes=r?B.floor.mins(r.time):start+30+(h%Math.max(30,end-start-90));
   const server=tbl?.shape==='bar'?bar[h%bar.length]:servers[(tbl?tables.indexOf(tbl):h)%servers.length];
   type=type||(tbl?(tbl.shape==='bar'?'tab':'dine'):'tab');
   const c=fresh({id:'pd'+hash(seedBase+n).toString(36),number:0,date,service:svc,type,tables:tbl?[tbl.label]:[],res:r?r.id:'',name:r&&r.source!=='Walk-in'?r.name:(type==='takeout'||type==='delivery'?NAMES[h%NAMES.length]:''),server,guests,status:'paid',openedAt:iso(date,minutes+2),closedAt:iso(date,Math.min(end+40,minutes+55+(h%50))),lines:lines(s,P,svc,guests,seedBase+n,out86,date,minutes+2),discounts:[],payments:[],note:'',by:server,serviceCharge:false});
   if(type==='takeout'||type==='delivery'){c.pickupAt=B.floor.clock(minutes+25);c.phone='(555) 01'+String(h%90+10)+'-'+String(h%9000+1000);c.source=h%3?'online':'pos';c.closedAt=iso(date,minutes+30);c.lines=c.lines.filter(l=>l.station!=='Bar'||['soft'].includes(B.menu.item(s,l.item)?.category));if(!c.lines.length)c.lines=lines(s,P,svc,guests,seedBase+n+'x',out86,date,minutes).slice(0,2);}
   c.serviceCharge=type==='dine'&&s.pos.settings.serviceCharge>0&&guests>=s.pos.settings.serviceChargeFrom;
   if(h%23===0&&c.lines.length>2)c.lines[1].comp={reason:'Guest recovery',by:servers[0],at:c.closedAt};
   if(h%31===0&&c.lines.length>3){c.lines[2].status='void';c.lines[2].voidReason='Kitchen or bar error';c.lines[2].voidBy=servers[0];c.lines[2].sentAt=c.openedAt;}
   if(h%37===0&&c.lines.length>1){c.lines[0].discount={kind:'pct',value:50,reason:'Staff meal',by:servers[0]};}
   if(h%41===0)c.discounts.push({id:'d'+c.id,kind:'pct',value:10,reason:'Regular guest',by:servers[0]});
   const t=B.pos.totals(s,c),method=(h%100)<66?'Card':(h%100)<92?'Cash':'Gift card',tipPct=method==='Cash'?.12+(h%7)/100:.17+(h%7)/100;
   if(method==='Gift card')c.payments.push({id:'p'+c.id,method:'Card',amount:t.total,tip:round(t.net*tipPct),at:c.closedAt,by:server,ref:''});
   else c.payments.push({id:'p'+c.id,method,amount:t.total,tip:type==='takeout'||type==='delivery'?round(t.net*.08):round(t.net*tipPct),at:c.closedAt,by:server,ref:'',...(method==='Cash'?{tendered:Math.ceil(t.total/10)*10}:{})});
   if(h%17===0&&t.total>60){const half=round(t.total/2),tip=c.payments[0].tip;c.payments[0].amount=half;c.payments[0].tip=round(tip/2);c.payments.push({id:'q'+c.id,method:'Card',amount:round(t.total-half),tip:round(tip-tip/2),at:c.closedAt,by:server,ref:''});}
   n++;return c;
  };
  for(const r of res){if(net>=target)break;const h=hash(seedBase+r.id),tbl=r.tables.length?B.floor.byLabel(s,r.tables[0]):null;const c=make(r.guests,tbl,r,h);net+=B.pos.totals(s,c).net;out.push(c);}
  let guard=0;
  while(net<target&&guard++<400){const h=hash(seedBase+'w'+guard),kind=h%11===0?'takeout':h%29===0?'delivery':'',isBar=!kind&&barTables.length&&(h%4===0),tbl=kind?null:isBar?barTables[h%barTables.length]:tables[h%tables.length];const c=make(kind?1+(h%3):isBar?1+(h%2):party(h>>>3),tbl,null,h,kind);net+=B.pos.totals(s,c).net;out.push(c);}
  return out;
 }
 const section=(s,date,svc,when)=>{const k=date+'|'+svc;if(s.pos.sections[k])return;const t=B.pos.suggestSections(s,date,svc);if(Object.keys(t).length)s.pos.sections[k]={tables:t,by:'demo',at:when,auto:true};};
 // A closed drawer for a finished service: a float, a paid-out or two, and a count that is a few dollars off now and then.
 function drawerFor(s,date,svc,list,mgr){
  const {start,end}=B.floor.serviceWindow(s,svc),h=hash('dr'+date+svc),cash=list.filter(c=>c.status==='paid').flatMap(c=>c.payments).filter(x=>x.method==='Cash').reduce((n,x)=>n+x.amount,0);
  if(!cash)return;
  const d={id:'dr'+h.toString(36),date,service:svc,openedBy:mgr,openedAt:iso(date,start-30),float:s.pos.settings.cashFloat,closedAt:iso(date,end+35),closedBy:mgr,note:'',events:[]};
  if(h%2)d.events.push({kind:'out',amount:[18.4,32,45.5,24][h%4],reason:['Window cleaner','Ice run · corner store','Lemons & limes (market)','Taxi for a guest'][h%4],by:mgr,at:iso(date,start+90+(h%120))});
  if(h%5===0)d.events.push({kind:'nosale',amount:0,reason:'',by:mgr,at:iso(date,start+40)});
  if(cash>600)d.events.push({kind:'drop',amount:Math.floor(cash/200)*100,reason:'Safe drop',by:mgr,at:iso(date,end-60)});
  const x=B.pos.drawerExpected(s,d);d.expected=x.expected;d.counted=round(x.expected+[0,0,-2,0,5,-0.5,0,1.25][h%8]);
  s.pos.drawers.push(d);
  s.pos.journal.push({at:d.closedAt,by:mgr,kind:'drawer',text:`Closed the ${svc} drawer · counted ${d.counted.toFixed(2)} against ${d.expected.toFixed(2)} (${d.counted>=d.expected?'over':'short'} ${Math.abs(d.counted-d.expected).toFixed(2)})`,amount:round(d.counted-d.expected)});
 }
 function journalFrom(s,list){
  for(const c of list){const lbl='#'+c.number+(c.tables.length?' · Table '+c.tables.join('+'):'');
   for(const l of c.lines){if(l.comp)s.pos.journal.push({at:l.comp.at||c.closedAt,by:l.comp.by,kind:'comp',text:`Comped ${l.qty}× ${l.name} on ${lbl} · ${l.comp.reason}`,amount:B.pos.lineGross(l),check:c.id});if(l.status==='void'&&l.sentAt)s.pos.journal.push({at:c.closedAt,by:l.voidBy||c.server,kind:'void',text:`Voided ${l.qty}× ${l.name} on ${lbl} · ${l.voidReason}`,amount:B.pos.lineGross(l),check:c.id});if(l.discount)s.pos.journal.push({at:c.closedAt,by:l.discount.by,kind:'discount',text:`${l.discount.value}% off ${l.name} on ${lbl} · ${l.discount.reason}`,amount:B.pos.lineDisc(l),check:c.id});}
   for(const d of c.discounts)s.pos.journal.push({at:c.closedAt,by:d.by,kind:'discount',text:`${d.value}% off ${lbl} · ${d.reason}`,check:c.id});}
 }
 function seedDay(s,P,date,full,mgr){
  const sales=s.business.sales.filter(x=>x.date===date);if(!sales.length)return;
  for(const x of sales){
   const list=serviceChecks(s,P,date,x.service,x.amount);if(!list.length)continue;
   if(full){for(const c of list)c.number=s.pos.seq++;s.pos.checks.push(...list);section(s,date,x.service,iso(date,540));for(const pid of new Set(list.map(c=>c.server)))B.pos.syncTips(s,pid,date);drawerFor(s,date,x.service,list,mgr);journalFrom(s,list);}
   else{s.pos.seq+=list.length;const d=B.pos.rollup(s,date,x.service,list);const h=hash('cash'+date+x.service),cash=Object.values(d.byTender)[0]?(d.byTender.Cash||[0])[0]:0;if(cash){const exp=round(s.pos.settings.cashFloat+cash-(h%2?30:0));d.cash={expected:exp,counted:round(exp+[0,0,-2,0,5,-1,0,2][h%8])};}s.pos.days[date+'|'+x.service]=B.pos.trim(d,TOP_ITEMS);}
  }
 }
 function seedCards(s,today,mgr){
  if(s.pos.giftCards.length||s.pos.accounts.length)return;
  const when=d=>iso(B.addDays(today,-d),780);
  s.pos.giftCards.push({code:'GC-7K2M',balance:100,issued:100,issuedAt:when(21),issuedBy:mgr,status:'active',check:'',note:'Birthday gift · R. Alvarez'},{code:'GC-Q9D4',balance:32.5,issued:75,issuedAt:when(40),issuedBy:mgr,status:'active',check:'',note:''},{code:'GC-3HXB',balance:0,issued:50,issuedAt:when(60),issuedBy:mgr,status:'empty',check:'',note:'Fully redeemed'},{code:'GC-N5TP',balance:250,issued:250,issuedAt:when(6),issuedBy:mgr,status:'active',check:'',note:'Corporate · Linden & Co.'});
  s.pos.accounts.push({id:'acc-linden',name:'Linden & Co.',balance:412.6,limit:1500,contact:'Office lunches · invoiced monthly · accounts@linden.example',active:true},{id:'acc-harbor',name:'Harbor Hotel concierge',balance:188.25,limit:1000,contact:'Guest referrals · settle every Friday',active:true},{id:'acc-studio',name:'Northlight Studio',balance:0,limit:500,contact:'Closed for the season',active:false});
  s.pos.journal.push({at:when(6),by:mgr,kind:'gift',text:'Sold gift card GC-N5TP',amount:250},{at:when(3),by:mgr,kind:'account',text:'Harbor Hotel concierge paid 320.00 by Card',amount:320});
 }
 // Today: the host has seated the parties whose time has come, finished the earlier ones, the bar has a couple of tabs, the drawer is open and takeout is due.
 function seedToday(s,P,today,nowMin,mgr){
  const services=[...new Set(s.shifts.filter(x=>x.date===today).map(x=>x.service))].map(n=>s.setup.services.find(v=>v.name===n)).filter(Boolean).sort((a,b)=>a.start.localeCompare(b.start));
  for(const v of services){
   const {start,end}=B.floor.serviceWindow(s,v.name),k=today+'|'+v.name;
   if(nowMin>=start-180)section(s,today,v.name,iso(today,Math.max(0,start-120)));
   if(nowMin<start||s.pos.checks.some(c=>c.date===today&&c.service===v.name))continue;
   const live=nowMin<end,out86=out86For(s,today,v.name),{servers,bar}=crew(s,today,v.name),res=s.reservations.filter(r=>r.date===today&&r.service===v.name&&!['Cancelled','No-show'].includes(r.status)),st=s.pos.settings;
   const mk=(r,tbl,guests,openMin,h,status,type)=>{
    const server=tbl?.shape==='bar'?bar[h%bar.length]:(B.pos.serverOf(s,today,v.name,tbl?.label||'')||servers[h%servers.length]);
    type=type||(tbl?(tbl.shape==='bar'?'tab':'dine'):'tab');
    const c=fresh({id:'pl'+hash(k+(r?r.id:'t'+h)+type).toString(36),number:s.pos.seq++,date:today,service:v.name,type,tables:tbl?[tbl.label]:[],res:r?r.id:'',name:r&&r.source!=='Walk-in'?r.name:(type==='takeout'||type==='delivery'?NAMES[h%NAMES.length]:''),server,guests,status:'open',openedAt:iso(today,openMin),closedAt:'',lines:lines(s,P,v.name,guests,k+'L'+(r?r.id:h)+type,out86,today,openMin),discounts:[],payments:[],note:'',by:server,serviceCharge:type==='dine'&&st.serviceCharge>0&&guests>=st.serviceChargeFrom});
    const age=nowMin-openMin;
    if(type==='takeout'||type==='delivery'){c.pickupAt=B.floor.clock(openMin+st.prepMinutes+(type==='delivery'?15:0));c.phone='(555) 01'+String(h%90+10)+'-'+String(h%9000+1000);c.source=h%3?'online':'pos';c.lines=c.lines.filter(l=>l.station!=='Bar').slice(0,3);if(!c.lines.length)c.lines=lines(s,P,v.name,1,k+'T'+h,out86,today,openMin).slice(0,2);for(const l of c.lines){l.status=age>=12?'ready':'sent';l.sentAt=iso(today,openMin+1);}if(status==='paid'){for(const l of c.lines){l.status='served';l.servedAt=iso(today,openMin+18);}const t=B.pos.totals(s,c);c.payments.push({id:'p'+c.id,method:'Card',amount:t.total,tip:round(t.net*.08),at:iso(today,openMin+20),by:server,ref:''});c.status='paid';c.closedAt=c.payments[0].at;}else if(h%2){const t=B.pos.totals(s,c);c.payments.push({id:'p'+c.id,method:'Card',amount:t.total,tip:round(t.net*.08),at:iso(today,openMin),by:server,ref:''});}return c;}
    if(tbl&&h%7===0&&status!=='paid')c.allergy=['Nut allergy · seat 2','Coeliac · seat 1, no bread','Shellfish allergy · whole table'][h%3];
    for(const l of c.lines){const due=4+l.course*13;if(status==='paid'){l.status='served';}else if(age>=due+24){l.status='served';l.sentAt=iso(today,openMin+due);l.servedAt=iso(today,openMin+due+20);}else if(age>=due+9){l.status='ready';l.sentAt=iso(today,openMin+due);}else if(age>=due){l.status='sent';l.sentAt=iso(today,openMin+due);}else if(st.coursing&&type==='dine'&&l.station!=='Bar'&&age>=4&&l.course>1){l.status='staged';l.sentAt=iso(today,openMin+4);}else{l.status='held';}}
    if(status==='paid'){const t=B.pos.totals(s,c),method=h%3?'Card':'Cash';c.payments.push({id:'p'+c.id,method,amount:t.total,tip:round(t.net*(method==='Cash'?.14:.19)),at:iso(today,Math.min(nowMin-1,openMin+75)),by:server,ref:'',...(method==='Cash'?{tendered:Math.ceil(t.total/10)*10}:{})});c.status='paid';c.closedAt=c.payments[0].at;}
    else if(c.lines.length&&c.lines.every(l=>l.status==='served')&&h%3===0)c.presentedAt=iso(today,nowMin-3);
    if(type==='tab'&&h%2)c.tab={card:String(4000+h%6000),preauth:h%3?75:100};
    return c;
   };
   for(const r of res){
    const h=hash(k+r.id),tbl=r.tables.length?B.floor.byLabel(s,r.tables[0]):null,t0=B.floor.mins(r.time),t1=t0+(r.duration||120);
    const finished=r.status==='Completed'||(!live&&r.status!=='Confirmed')||(r.status==='Confirmed'&&t1<=nowMin-5),seated=!finished&&(r.status==='Seated'||(r.status==='Confirmed'&&t0<=nowMin-6&&h%10!==0));
    if(finished){
     if(r.status!=='Completed'){r.status='Completed';r.seatedAt||=iso(today,t0+3);r.completedAt=iso(today,Math.min(t1,nowMin-3));}
     s.pos.checks.push(mk(r,tbl,r.guests,t0+3,h,'paid'));
    }else if(seated&&live&&tbl){
     if(r.status!=='Seated'){r.status='Seated';r.seatedAt=iso(today,t0+2+(h%6));}
     const openMin=Math.max(start,Math.min(nowMin-1,Math.round((new Date(r.seatedAt)-new Date(today+'T00:00:00'))/60000)+1));
     const c=mk(r,tbl,r.guests,openMin,h,'open');
     if(h%5===0&&c.lines.length&&c.lines.every(l=>l.status==='served')){const t=B.pos.totals(s,c);c.payments.push({id:'p'+c.id,method:'Card',amount:round(t.total/2),tip:round(t.net*.1),at:iso(today,nowMin-2),by:c.server,ref:''});}
     s.pos.checks.push(c);
    }
   }
   if(live){
    s.floor.tables.filter(t=>t.shape==='bar').slice(0,2).forEach((t,i)=>{if(!B.pos.forTable(s,today,v.name,t.label))s.pos.checks.push(mk(null,t,1+i,Math.max(start,nowMin-25-i*15),hash(k+'bar'+i),'open'));});
    // Takeout and a delivery in the queue, one already picked up.
    [['takeout',14,'open'],['takeout',6,'open'],['delivery',11,'open'],['takeout',55,'paid']].forEach(([type,ago,status],i)=>{if(nowMin-ago>=start)s.pos.checks.push(mk(null,null,1,nowMin-ago,hash(k+type+i),status,type));});
    if(!B.pos.drawer(s,today,v.name)&&!s.pos.drawers.some(d=>d.date===today&&d.service===v.name))s.pos.drawers.push({id:'dr'+hash(k).toString(36),date:today,service:v.name,openedBy:mgr,openedAt:iso(today,start-20),float:st.cashFloat,closedAt:'',note:'',events:nowMin-start>60?[{kind:'out',amount:22.4,reason:'Limes & mint · corner market',by:mgr,at:iso(today,start+45)}]:[]});
   }else{
    const list=s.pos.checks.filter(c=>c.date===today&&c.service===v.name);if(list.length)drawerFor(s,today,v.name,list,mgr);
   }
   for(const pid of new Set(s.pos.checks.filter(c=>c.date===today&&c.service===v.name).map(c=>c.server)))B.pos.syncTips(s,pid,today);
   journalFrom(s,s.pos.checks.filter(c=>c.date===today&&c.service===v.name&&c.status==='paid'));
  }
  const tomorrow=B.addDays(today,1);for(const n of new Set(s.shifts.filter(x=>x.date===tomorrow).map(x=>x.service)))section(s,tomorrow,n,iso(today,600));
 }
 function apply(input){
  if(!input?.restaurantHistory?.fictional||!input.menu||!input.pos||!input.business?.sales?.length)return input;
  const today=B.dateString(new Date()),nowMin=B.floor.nowMinutes(),meta=input.posDemo||{};
  if(meta.liveDay===today&&meta.version===2&&!meta.skipped)return input;
  const s=copy(input);B.configure(s);const P=pools(s),mgr=s.team.find(p=>p.active&&p.access==='manager')?.id||'jamie';
  if(!meta.anchor||meta.version!==2){
   // First run, or the POS model moved on: rebuild the demo content from the recorded sales.
   s.pos.checks=s.pos.checks.filter(c=>!/^p[dl]/.test(c.id));s.pos.days={};s.pos.drawers=[];s.pos.journal=[];s.pos.giftCards=[];s.pos.accounts=[];
   for(const k of Object.keys(s.pos.sections))if(s.pos.sections[k].by==='demo')delete s.pos.sections[k];
   for(let d=B.addDays(today,-ROLLUP_DAYS);d<today;d=B.addDays(d,1))seedDay(s,P,d,d>=B.addDays(today,-FULL_DAYS),mgr);
  }else{
   const keep=B.addDays(today,-(s.pos.settings.keepDays||FULL_DAYS));
   for(const k of new Set(s.pos.checks.filter(c=>c.date<keep&&/^p[dl]/.test(c.id)).map(c=>c.date+'|'+c.service))){const date=k.slice(0,10),svc=k.slice(11),list=s.pos.checks.filter(c=>c.date===date&&c.service===svc);if(list.some(c=>c.status==='open'))continue;s.pos.days[k]=B.pos.trim(B.pos.rollup(s,date,svc,list),TOP_ITEMS);s.pos.checks=s.pos.checks.filter(c=>!(c.date===date&&c.service===svc));s.pos.drawers=s.pos.drawers.filter(d=>!(d.date===date&&d.service===svc&&d.closedAt));delete s.pos.sections[k];}
   for(let d=meta.liveDay||meta.anchor;d<today;d=B.addDays(d,1))if(!s.pos.checks.some(c=>c.date===d)&&!Object.keys(s.pos.days).some(k=>k.startsWith(d+'|')))seedDay(s,P,d,d>=keep,mgr);
  }
  const prune=B.addDays(today,-PRUNE_DAYS);for(const k of Object.keys(s.pos.days))if(k.slice(0,10)<prune)delete s.pos.days[k];
  const jprune=B.addDays(today,-14)+'T00';s.pos.journal=s.pos.journal.filter(j=>j.at>=jprune);
  seedCards(s,today,mgr);
  seedToday(s,P,today,nowMin,mgr);
  s.pos.journal.sort((a,b)=>a.at.localeCompare(b.at));if(s.pos.journal.length>B.pos.LIMITS.journal)s.pos.journal.splice(0,s.pos.journal.length-B.pos.LIMITS.journal);
  s.posDemo={version:2,anchor:meta.anchor||today,liveDay:today};
  B.configure(s);
  if(!B.validState(s)){console.warn('POS demo content could not be applied.');B.posDemo.lastFailed=s;B.configure(input);return {...input,posDemo:{version:2,anchor:meta.anchor||today,liveDay:today,skipped:true}};}
  return s;
 }
 B.posDemo={apply};
 B.starter=(...args)=>apply(prev.starter(...args));
 B.load=storage=>apply(prev.load(storage));
})();
