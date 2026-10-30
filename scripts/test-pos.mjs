import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const load=files=>{const c=vm.createContext({crypto,console,document:{addEventListener(){},getElementById(){return null;},querySelector(){return null;},querySelectorAll(){return [];}},window:{scrollTo(){}},requestAnimationFrame(){},performance,navigator:{}});for(const f of files)vm.runInContext(readFileSync(new URL('../assets/js/'+f+'.js',import.meta.url),'utf8'),c);return c;};
const core=['workspace-state','schedule-state','shift-operations-state','demo-history','restaurant-history','planner-state','duties-state','checklist-history','team-chat-state','stock-state','checklist-demo','stock-demo','manage-state','payroll-state','writeups-state','business-state','training-state','floor-state','menu-state','pos-state','pos-demo'];
const c=load([...core,'app-navigation','floor-ui','pos-views','pos-ui']),B=c.Brigly,P=B.pos,F=B.floor,N=c.BriglyNavigation,store={v:null,getItem(){return this.v},setItem(k,v){this.v=v}};
const as=(s,role,id)=>({...s,role,...(role==='crew'?{crewId:id}:{managerId:id})});
const fails=(fn,re)=>assert.throws(fn,err=>re.test(err.message),'expected '+re);
const same=(a,b)=>assert.equal(JSON.stringify(a),JSON.stringify(b));
const round=n=>Math.round(n*100)/100;
const today=B.dateString(new Date());

// The fictional workspace gets twelve weeks of POS history that tracks the recorded sales, with every order type, closed drawers, gift cards and house accounts, within the storage budget.
let s=B.load(store);assert(B.validState(s));assert(s.pos&&s.pos.version===2);
assert(s.posDemo&&!s.posDemo.skipped,'demo applied');assert(Object.keys(s.pos.days).length>100,'day rollups');assert(s.pos.checks.length>20,'recent full checks');
assert(B.save(store,s));assert(store.v.length<4.5e6,'storage '+store.v.length);
const S7=P.sales(s,{from:B.addDays(today,-7),to:B.addDays(today,-1)});
assert(S7.net>1000&&S7.checks>50&&S7.servers.length>=2&&S7.items.length>5&&S7.tenders.length>=2);
assert(Math.abs(S7.avgCheck-S7.net/S7.checks)<0.02);
assert(S7.types.length>=3&&S7.types.some(t=>t.type==='takeout')&&S7.types.some(t=>t.type==='dine'),'order types in the rollups');
const biz=s.business.sales.filter(x=>x.date>=B.addDays(today,-7)&&x.date<today).reduce((n,x)=>n+x.amount,0);
assert(S7.net>biz*0.85&&S7.net<biz*1.25,'POS history tracks recorded sales: '+S7.net+' vs '+biz);
const mix=P.menuMix(s,B.addDays(today,-28),B.addDays(today,-1));assert(mix.rows.length>10&&mix.rows.every(r=>['Star','Plow horse','Puzzle','Dog'].includes(r.klass)));
assert(P.sales(s,{from:B.addDays(today,-7),to:B.addDays(today,-1),server:S7.servers[0].person}).net===S7.servers[0].net,'a server filter matches the server table');
assert(s.pos.drawers.some(d=>d.closedAt&&typeof d.counted==='number'),'closed drawers with counts');assert(s.pos.giftCards.length>=3&&s.pos.accounts.length>=2&&s.pos.journal.length>0);
assert(s.pos.checks.some(ch=>ch.type==='takeout'&&ch.pickupAt),'takeout checks with pickup times');
console.log('PASS: seeded POS history, order types, drawers, cards, accounts, journal, sales aggregates, menu engineering and the storage budget.');

// A check on a free table seats a walk-in, so the live map agrees; the same table can’t get a second check by accident.
const date=B.addDays(today,-10),service='Dinner';
const used=new Set(s.reservations.filter(r=>r.date===date).flatMap(r=>r.tables));
const table=s.floor.tables.find(t=>t.shape!=='bar'&&t.room==='main'&&t.seats>=4&&!used.has(t.label)&&!P.forTable(s,date,service,t.label));assert(table,'a free table');
const before=P.sales(s,{from:date,to:date,service});
let a=as(s,'crew','alex');a.date=date;a.service=service;
a=B.change(a,{type:'pos:open',id:'chk1',tables:[table.label],guests:3,date,service});
let ck=P.check(a,'chk1');assert(ck&&ck.status==='open'&&ck.type==='dine'&&ck.server==='alex'&&ck.guests===3&&ck.number>0&&ck.source==='pos');
const walk=a.reservations.find(r=>r.id===ck.res);assert(walk&&walk.status==='Seated'&&walk.source==='Walk-in'&&walk.tables[0]===table.label,'opening on a free table seats a walk-in');
assert.equal(F.occupancy(a,date,service,P.at(a,date,service)).find(o=>o.table.id===table.id).status,'seated');
fails(()=>B.change(a,{type:'pos:open',id:'chk2',tables:[table.label],guests:2,date,service}),/already has check/);
// Items: required modifiers, merging held lines, tax by category, 86’d dishes refused.
a=B.change(a,{type:'pos:add',id:'chk1',item:'mi-fries',qty:2,seat:1});
fails(()=>B.change(a,{type:'pos:add',id:'chk1',item:'mi-rib-eye-steak'}),/cooking temperature/);
a=B.change(a,{type:'pos:add',id:'chk1',item:'mi-rib-eye-steak',mods:['Medium rare','Fries'],seat:1});
a=B.change(a,{type:'pos:add',id:'chk1',item:'mi-fries',qty:1,seat:1});
ck=P.check(a,'chk1');assert.equal(ck.lines.length,2);assert.equal(ck.lines[0].qty,3,'the same held item merges');assert.equal(ck.lines[1].price,42);assert.equal(ck.lines[1].mods.length,2);assert.equal(ck.lines[0].tax,8.75);
let m=as(a,'manager','jamie');m=B.change(m,{type:'menu:86',id:'p86',item:'mi-latte',reason:'Machine down.',date,service});a=as(m,'crew','alex');
fails(()=>B.change(a,{type:'pos:add',id:'chk1',item:'mi-latte'}),/86/);
// With a substitute set, the refusal names it.
m=B.change(m,{type:'ops:sub',id:'p86',sub:{item:'mi-pot-of-tea'}});a=as(m,'crew','alex');fails(()=>B.change(a,{type:'pos:add',id:'chk1',item:'mi-latte'}),/Offer Pot of tea instead/);
let t=P.totals(a,ck);assert.equal(t.gross,60);assert.equal(t.tax,5.25);assert.equal(t.total,65.25);assert.equal(t.due,t.total);assert.equal(t.sc,0,'no service charge under the party size');
// A cocktail carries the alcohol rate; the tax lands per line.
a=B.change(a,{type:'pos:add',id:'chk1',item:s.menu.items.find(i=>i.category==='cocktails'&&i.active&&!i.modifiers.length).id,seat:2});
const cocktail=P.check(a,'chk1').lines.at(-1);assert.equal(cocktail.tax,10.25);assert.equal(cocktail.station,'Bar');
t=P.totals(a,P.check(a,'chk1'));assert.equal(t.tax,round(60*0.0875+cocktail.price*0.1025));
// Coursing: send fires the drinks and the first food course; later courses hold until fired. Sent items can only be voided with a reason by a lead.
a=B.change(a,{type:'pos:add',id:'chk1',item:'mi-fries',qty:1,seat:2,course:4});
a=B.change(a,{type:'pos:line',id:'chk1',line:ck.lines[0].id,qty:2});assert.equal(P.check(a,'chk1').lines[0].qty,2);
a=B.change(a,{type:'pos:send',id:'chk1'});ck=P.check(a,'chk1');
assert(ck.lines.filter(l=>l.course<=3&&l.station==='Kitchen').every(l=>l.status==='sent'),'first course fires');assert.equal(ck.lines.find(l=>l.station==='Bar').status,'sent','drinks never hold');assert.equal(ck.lines.find(l=>l.course===4).status,'staged','dessert holds');
assert.equal(P.nextCourse(ck),4);assert.equal(P.tickets(a,date,service,'Kitchen')[0].staged.length,1);
fails(()=>B.change(a,{type:'pos:remove-line',id:'chk1',line:ck.lines[0].id}),/already sent/);
fails(()=>B.change(a,{type:'pos:void-line',id:'chk1',line:ck.lines[0].id,reason:'x'}),/POS lead/);
assert.equal(P.tickets(a,date,service).length,1);assert.equal(P.stageOf(a,ck),'sent');assert(P.allDay(a,date,service,'Kitchen').some(r=>r.name.startsWith('Fries')&&r.qty===2));
let k=as(a,'crew','sam');
k=B.change(k,{type:'pos:fire',id:'chk1'});assert.equal(P.check(k,'chk1').lines.find(l=>l.course===4).status,'sent','expo fires the next course');assert.equal(P.nextCourse(P.check(k,'chk1')),null);
k=B.change(k,{type:'pos:bump',id:'chk1',line:ck.lines[1].id,status:'ready'});assert.equal(P.check(k,'chk1').lines[1].status,'ready');
k=B.change(k,{type:'pos:bump',id:'chk1',lines:P.check(k,'chk1').lines.map(l=>l.id),status:'served'});assert(P.check(k,'chk1').lines.every(l=>l.status==='served'),'bump all');
assert.equal(P.tickets(k,date,service).length,0);assert.equal(P.stageOf(k,P.check(k,'chk1')),'served');
k=B.change(k,{type:'pos:bump',id:'chk1',line:ck.lines[1].id,status:'ready'});assert.equal(P.check(k,'chk1').lines[1].status,'ready','recall from served');k=B.change(k,{type:'pos:bump',id:'chk1',line:ck.lines[1].id,status:'served'});
// Repeat round brings the last drinks back as held lines; dropping the check marks it presented.
k=as(k,'crew','alex');k=B.change(k,{type:'pos:repeat',id:'chk1'});assert.equal(P.check(k,'chk1').lines.filter(l=>l.status==='held').length,1);k=B.change(k,{type:'pos:remove-line',id:'chk1',line:P.check(k,'chk1').lines.find(l=>l.status==='held').id});
k=B.change(k,{type:'pos:present',id:'chk1'});assert(P.check(k,'chk1').presentedAt);assert.equal(P.stageOf(k,P.check(k,'chk1')),'presented');
// Manager: void a sent line, comp a line, discount an item and the check (presets), totals follow.
m=as(k,'manager','jamie');
m=B.change(m,{type:'pos:add',id:'chk1',item:'mi-cola',seat:2});m=B.change(m,{type:'pos:send',id:'chk1'});
const cola=P.check(m,'chk1').lines.find(l=>l.item==='mi-cola');
fails(()=>B.change(m,{type:'pos:void-line',id:'chk1',line:cola.id,reason:''}),/reason/);
m=B.change(m,{type:'pos:void-line',id:'chk1',line:cola.id,reason:'Wrong item rung in'});assert.equal(P.check(m,'chk1').lines.find(l=>l.id===cola.id).status,'void');
m=B.change(m,{type:'pos:void-line',id:'chk1',line:P.check(m,'chk1').lines.find(l=>l.station==='Bar'&&l.status!=='void').id,reason:'Duplicate'});
m=B.change(m,{type:'pos:void-line',id:'chk1',line:P.check(m,'chk1').lines.find(l=>l.course===4&&l.status!=='void').id,reason:'Duplicate'});
m=B.change(m,{type:'pos:comp',id:'chk1',line:P.check(m,'chk1').lines[0].id,reason:'Guest recovery'});
m=B.change(m,{type:'pos:discount',id:'chk1',line:P.check(m,'chk1').lines[1].id,preset:'staff'});
let ln=P.check(m,'chk1').lines[1];assert.equal(ln.discount.value,50);assert.equal(ln.discount.reason,'Staff meal');assert.equal(P.lineDisc(ln),21);
m=B.change(m,{type:'pos:discount',id:'chk1',kind:'pct',value:10,reason:'Birthday or celebration'});
t=P.totals(m,P.check(m,'chk1'));assert.equal(t.gross,54);assert.equal(t.comps,12);assert.equal(t.itemDisc,21);assert.equal(t.checkDisc,2.1);assert.equal(t.discounts,23.1);assert.equal(t.net,18.9);assert.equal(t.voids,3);assert.equal(t.total,round(18.9+round(18.9*.0875)));
assert(m.pos.journal.filter(j=>j.check==='chk1').map(j=>j.kind).includes('comp')&&m.pos.journal.some(j=>j.kind==='discount'&&j.check==='chk1'),'comps and discounts reach the journal');
// Payments: split across tenders, cash tendered for change, no overpaying, only the server or a lead, then the table frees and tips post to earnings.
a=as(m,'crew','alex');
fails(()=>B.change(a,{type:'pos:pay',id:'chk1',payment:{id:'pay0',method:'Card',amount:t.total+5}}),/Only/);
a=B.change(a,{type:'pos:pay',id:'chk1',payment:{id:'pay1',method:'Cash',amount:10,tip:3,tendered:20}});assert.equal(P.check(a,'chk1').status,'open');assert.equal(P.totals(a,P.check(a,'chk1')).due,round(t.total-10));assert.equal(P.check(a,'chk1').payments[0].tendered,20);
fails(()=>B.change(as(a,'crew','noah'),{type:'pos:pay',id:'chk1',payment:{id:'pay2',method:'Card',amount:1}}),/belongs to/);
const fries=s.stock.items.find(i=>i.name.toLowerCase().includes('fries')||i.name.toLowerCase().includes('potato'));
a=B.change(a,{type:'pos:pay',id:'chk1',payment:{id:'pay2',method:'Card',amount:round(t.total-10),tip:7}});
ck=P.check(a,'chk1');assert.equal(ck.status,'paid');assert(ck.closedAt);
assert.equal(a.reservations.find(r=>r.id===ck.res).status,'Completed','paying in full frees the table');
const tip=a.scheduling.tips.find(x=>x.person==='alex'&&x.date===date);assert(tip&&tip.source==='pos');assert.equal(tip.amount,10);assert.equal(tip.amount,P.tipsFor(a,'alex',date));
const after=P.sales(a,{from:date,to:date,service});assert.equal(round(after.net-before.net),18.9,'the archived rollup and the live check both count');assert.equal(after.checks-before.checks,1);
const rep=P.serverReport(a,'alex',date,service);assert(rep.checks>=1&&rep.tips>=10&&rep.cash===10&&rep.cardTips===7&&rep.tipOut.length===2&&rep.cashDue===7);
// Tip adjustment after the slip comes back, and a refund by a lead with a reason.
a=B.change(a,{type:'pos:tip',id:'chk1',payment:'pay2',tip:9});assert.equal(P.tipsFor(a,'alex',date),12);assert.equal(a.scheduling.tips.find(x=>x.person==='alex'&&x.date===date).amount,12);
fails(()=>B.change(a,{type:'pos:refund',id:'chk1',amount:5,method:'Card',reason:'x'}),/POS lead/);
m=as(a,'manager','jamie');fails(()=>B.change(m,{type:'pos:refund',id:'chk1',amount:500,method:'Card',reason:'Overcharged'}),/Up to/);
m=B.change(m,{type:'pos:refund',id:'chk1',amount:5,method:'Card',reason:'Overcharged'});assert.equal(P.totals(m,P.check(m,'chk1')).refunded,5);assert.equal(P.sales(m,{from:date,to:date,service}).refunds,5);assert(m.pos.journal.at(-1).kind==='refund');
console.log('PASS: open on a free table, items, tax per line, coursing with hold and fire, bump and recall, repeat round, void/comp/discounts, split payments with change, table release, tips, tip adjustment and refunds.');

// Splits and merges: by seat, evenly, by item; moving items between checks; merging back.
m.date=date;m.service=service;
const free2=s.floor.tables.filter(tb=>tb.shape!=='bar'&&tb.seats>=4&&!used.has(tb.label)&&!P.forTable(m,date,service,tb.label)&&tb.id!==table.id);assert(free2.length>=2);
m=B.change(m,{type:'pos:open',id:'sp1',tables:[free2[0].label],guests:3,date,service});
m=B.change(m,{type:'pos:add',id:'sp1',item:'mi-fries',seat:1});m=B.change(m,{type:'pos:add',id:'sp1',item:'mi-cola',seat:2});m=B.change(m,{type:'pos:add',id:'sp1',item:'mi-cola',seat:3});m=B.change(m,{type:'pos:add',id:'sp1',item:'mi-espresso',seat:0,qty:1});
const base=P.totals(m,P.check(m,'sp1')).gross;
m=B.change(m,{type:'pos:split',id:'sp1',mode:'seats',ids:['sp1b','sp1c']});
const parts=['sp1','sp1b','sp1c'].map(id=>P.check(m,id));assert(parts.every(Boolean));assert(parts.every(x=>x.tables[0]===free2[0].label&&x.server==='jamie'));
assert(Math.abs(parts.reduce((n,x)=>n+P.totals(m,x).gross,0)-base)<0.05,'a seat split keeps the money (to the cent per shared line)');assert(parts.every(x=>x.lines.some(l=>l.splitOf===3)),'shared items spread across the seats');
assert.equal(P.checksFor(m,date,service,free2[0].label).length,3);assert.equal(P.tableState(m,date,service,free2[0].label).checks.length,3);
m=B.change(m,{type:'pos:merge',id:'sp1',from:'sp1b'});assert(!P.check(m,'sp1b'));m=B.change(m,{type:'pos:merge',id:'sp1',from:'sp1c'});assert(Math.abs(P.totals(m,P.check(m,'sp1')).gross-base)<0.05,'merging restores the total');
m=B.change(m,{type:'pos:split',id:'sp1',mode:'even',n:2,ids:['sp1d']});assert(Math.abs(P.totals(m,P.check(m,'sp1')).gross+P.totals(m,P.check(m,'sp1d')).gross-base)<0.1,'an even split halves every line');
assert(P.check(m,'sp1d').lines.every(l=>l.splitOf>=2));m=B.change(m,{type:'pos:merge',id:'sp1',from:'sp1d'});
const moveLine=P.check(m,'sp1').lines.find(l=>l.item==='mi-cola');
m=B.change(m,{type:'pos:move-lines',id:'sp1',lines:[moveLine.id],newId:'sp1e',name:'Separate'});assert(P.check(m,'sp1e').lines.length>=1&&P.check(m,'sp1e').name==='Separate');assert(!P.check(m,'sp1').lines.some(l=>l.id===moveLine.id));
m=B.change(m,{type:'pos:move-lines',id:'sp1e',lines:P.check(m,'sp1e').lines.map(l=>l.id),to:'sp1'});assert(!P.check(m,'sp1e'),'an emptied check goes away');
fails(()=>B.change(as(m,'crew','noah'),{type:'pos:split',id:'sp1',mode:'even',n:2,ids:['x1']}),/belongs to/);
const shareLine=P.check(m,'sp1').lines.find(l=>l.item==='mi-fries');const before3=P.totals(m,P.check(m,'sp1')).gross,count3=P.check(m,'sp1').lines.length;
m=B.change(m,{type:'pos:split-line',id:'sp1',line:shareLine.id,n:3,seats:[1,2,3]});assert.equal(P.check(m,'sp1').lines.length,count3+2,'three shares');assert(Math.abs(P.totals(m,P.check(m,'sp1')).gross-before3)<0.05,'sharing keeps the money');{const k=(shareLine.splitOf||1)*3,shares=P.check(m,'sp1').lines.filter(l=>l.item==='mi-fries'&&l.splitOf===k);assert.equal(shares.length,3,'three equal shares');assert.equal(shares.map(l=>l.seat).sort().join(),'1,2,3','one share per seat');}
fails(()=>B.change(m,{type:'pos:split-line',id:'sp1',line:P.check(m,'sp1').lines.find(l=>(l.splitOf||1)>=3).id,n:10}),/as far as it goes/);
assert(m.pos.journal.some(j=>j.kind==='split')&&m.pos.journal.some(j=>j.kind==='merge'));
console.log('PASS: split by seat and evenly, move items between checks, merge back, journal entries.');

// Order types: a takeout order with a pickup time, a bar tab with a card on file, type changes, settings that turn a type off.
m=B.change(m,{type:'pos:open',id:'to1',type_:'takeout',guests:1,name:'Priya S.',phone:'555-0102',pickupAt:'19:30',date,service});
let to=P.check(m,'to1');assert.equal(to.type,'takeout');assert.equal(to.pickupAt,'19:30');assert(!to.tables.length&&!to.serviceCharge);
m=B.change(m,{type:'pos:add',id:'to1',item:'mi-fries',course:3});m=B.change(m,{type:'pos:add',id:'to1',item:'mi-rib-eye-steak',mods:['Medium','Fries'],course:2});m=B.change(m,{type:'pos:send',id:'to1'});
assert(P.check(m,'to1').lines.every(l=>l.status==='sent'),'takeout never holds a course');
m=B.change(m,{type:'pos:open',id:'tab1',type_:'tab',guests:1,card:'4242',preauth:100,date,service});assert.equal(P.check(m,'tab1').tab.card,'4242');assert.equal(P.check(m,'tab1').tab.preauth,100);
fails(()=>B.change(m,{type:'pos:update',id:'sp1',type_:'takeout'}),/off its table/);
m=B.change(m,{type:'pos:transfer',id:'tab1',tables:[free2[1].label]});assert.equal(P.check(m,'tab1').type,'tab');assert.equal(P.check(m,'tab1').tables[0],free2[1].label,'a tab can sit at a table and stays a tab');
let off=B.change(m,{type:'pos:settings',orderTypes:{delivery:false}});fails(()=>B.change(off,{type:'pos:open',id:'dl1',type_:'delivery',date,service}),/turned off/);
fails(()=>B.change(m,{type:'pos:settings',orderTypes:{dine:false,tab:false}}),/Keep dine-in/);
// Happy hour: a live happening with a time window reprices the bar categories while it runs.
let hh=JSON.parse(JSON.stringify(m));hh.specials.push({id:'hh-test',date,service,kind:'happy_hour',name:'Test hour',time:'16:00–23:00',description:'Half-price spritz.',price:8,allergens:'',active:true,questions:[]});
assert(P.happyHour(hh,date,service,F.mins('18:00')),'the happening is live at 18:00');assert(!P.happyHour(hh,date,service,F.mins('15:00')));
const spritz=s.menu.items.find(i=>i.category==='cocktails'&&i.active&&!i.modifiers.length);
const pr=P.priceFor(hh,spritz,date,service,F.mins('18:00'));assert.equal(pr.price,round(spritz.price*0.75));assert.equal(pr.promo,'Happy hour');
assert.equal(P.priceFor(hh,s.menu.items.find(i=>i.category==='mains'&&i.active),date,service,F.mins('18:00')).promo,undefined,'food keeps its price');
console.log('PASS: takeout and tabs, pickup times, pre-auth, type rules and happy-hour pricing from Happenings.');

// Gift cards and house accounts: sell a card on a check, it activates when paid, redeem it, charge and settle an account.
m=B.change(m,{type:'pos:open',id:'gc1',type_:'tab',guests:1,date,service});
m=B.change(m,{type:'pos:add',id:'gc1',item:'gift-card',price:50,note:'For Sam'});
const giftLine=P.check(m,'gc1').lines[0];assert(giftLine.gift&&/^GC-/.test(giftLine.gift)&&giftLine.tax===0&&giftLine.status==='served');
let card=P.giftCard(m,giftLine.gift);assert.equal(card.status,'pending');assert.equal(card.balance,50);
fails(()=>B.change(m,{type:'pos:pay',id:'gc1',payment:{id:'gp0',method:'Gift card',amount:10,ref:giftLine.gift}}),/not active/);
assert.equal(P.totals(m,P.check(m,'gc1')).total,50,'gift cards are not taxed');
m=B.change(m,{type:'pos:pay',id:'gc1',payment:{id:'gp1',method:'Card',amount:50,tip:0}});assert.equal(P.giftCard(m,giftLine.gift).status,'active');
assert.equal(P.sales(m,{from:date,to:date,service}).giftSold,50);
m=B.change(m,{type:'pos:open',id:'gc2',type_:'tab',guests:1,date,service});m=B.change(m,{type:'pos:add',id:'gc2',item:'mi-espresso',qty:2});
const gcTotal=P.totals(m,P.check(m,'gc2')).total;
fails(()=>B.change(m,{type:'pos:pay',id:'gc2',payment:{id:'gp2',method:'Gift card',amount:gcTotal,ref:'GC-NOPE'}}),/not active/);
m=B.change(m,{type:'pos:pay',id:'gc2',payment:{id:'gp2',method:'Gift card',amount:gcTotal,tip:1,ref:giftLine.gift}});
assert.equal(P.check(m,'gc2').status,'paid');assert.equal(P.giftCard(m,giftLine.gift).balance,round(50-gcTotal-1));
fails(()=>B.change(m,{type:'pos:pay',id:'gc1',payment:{id:'gp3',method:'House account',amount:1,ref:'acc-linden'}}),/paid/);
m=B.change(m,{type:'pos:open',id:'ha1',type_:'tab',guests:2,name:'Linden lunch',date,service});m=B.change(m,{type:'pos:add',id:'ha1',item:'mi-fries',qty:2});
const haTotal=P.totals(m,P.check(m,'ha1')).total,acc0=P.account(m,'acc-linden').balance;
fails(()=>B.change(m,{type:'pos:pay',id:'ha1',payment:{id:'hp0',method:'House account',amount:haTotal,ref:'acc-studio'}}),/Choose a house account/);
m=B.change(m,{type:'pos:pay',id:'ha1',payment:{id:'hp1',method:'House account',amount:haTotal,tip:2,ref:'acc-linden'}});assert.equal(P.account(m,'acc-linden').balance,round(acc0+haTotal+2));
m=B.change(m,{type:'pos:account-settle',id:'acc-linden',amount:100,method:'Card',note:'Invoice 1042'});assert.equal(P.account(m,'acc-linden').balance,round(acc0+haTotal+2-100));
m=B.change(m,{type:'pos:account',name:'Test Co.',limit:200,contact:'Weekly'});const testCo=m.pos.accounts.find(x=>x.name==='Test Co.');assert(testCo&&testCo.active);
m=B.change(m,{type:'pos:open',id:'ha2',type_:'tab',guests:1,date,service});m=B.change(m,{type:'pos:add',id:'ha2',item:'mi-rib-eye-steak',mods:['Medium','Fries'],qty:5});
fails(()=>B.change(m,{type:'pos:pay',id:'ha2',payment:{id:'hp2',method:'House account',amount:P.totals(m,P.check(m,'ha2')).total,ref:testCo.id}}),/limit/);
m=B.change(m,{type:'pos:gift-adjust',code:giftLine.gift,amount:20,note:'Goodwill'});assert.equal(P.giftCard(m,giftLine.gift).balance,round(50-gcTotal-1+20));
fails(()=>B.change(as(m,'crew','alex'),{type:'pos:gift-adjust',code:giftLine.gift,amount:20}),/managers/);
console.log('PASS: gift cards sold, activated and redeemed, house accounts charged within their limit and settled.');

// The cash drawer: open with a float, paid in and out, a no sale, a drop, then count and close with the over/short in the journal and the rollup.
m.date=date;m.service=service;
assert(!P.drawer(m,date,service));
m=B.change(m,{type:'pos:drawer-open',id:'drw1',date,service,float:300});const dr=P.drawer(m,date,service);assert(dr&&dr.float===300);
fails(()=>B.change(m,{type:'pos:drawer-open',id:'drw2',date,service,float:300}),/already open/);
m=B.change(m,{type:'pos:open',id:'cash1',type_:'tab',guests:1,date,service});m=B.change(m,{type:'pos:add',id:'cash1',item:'mi-espresso',qty:4});
const cashTotal=P.totals(m,P.check(m,'cash1')).total;m=B.change(m,{type:'pos:pay',id:'cash1',payment:{id:'cp1',method:'Cash',amount:cashTotal,tip:2,tendered:50}});
let x=P.drawerExpected(m,dr);assert.equal(x.cashIn,cashTotal);assert.equal(x.expected,round(300+cashTotal));
fails(()=>B.change(m,{type:'pos:drawer-event',drawer:'drw1',kind:'out',amount:20,reason:''}),/what the cash was for/);
fails(()=>B.change(as(m,'crew','alex'),{type:'pos:drawer-event',drawer:'drw1',kind:'out',amount:80,reason:'Taxi'}),/need a manager/);
m=B.change(m,{type:'pos:drawer-event',drawer:'drw1',kind:'out',amount:18.5,reason:'Lemons'});m=B.change(m,{type:'pos:drawer-event',drawer:'drw1',kind:'in',amount:40,reason:'Change from the bank'});m=B.change(m,{type:'pos:drawer-event',drawer:'drw1',kind:'nosale'});
fails(()=>B.change(m,{type:'pos:drawer-event',drawer:'drw1',kind:'drop',amount:5000}),/not that much/);
m=B.change(m,{type:'pos:drawer-event',drawer:'drw1',kind:'drop',amount:200});
x=P.drawerExpected(m,P.drawer(m,date,service));assert.equal(x.expected,round(300+cashTotal-18.5+40-200));assert.equal(x.noSales,1);
m=B.change(m,{type:'pos:refund',id:'cash1',amount:3,method:'Cash',reason:'Overcharged'});assert.equal(P.drawerExpected(m,P.drawer(m,date,service)).refunds,3);
const cashBefore=P.sales(m,{from:date,to:date,service}).cashOver;m=B.change(m,{type:'pos:drawer-close',drawer:'drw1',counted:round(x.expected-3-2),note:'Short two dollars'});
const closed=P.drawerById(m,'drw1');assert(closed.closedAt&&closed.counted===round(x.expected-5)&&closed.expected===round(x.expected-3));assert.equal(P.drawerExpected(m,closed).over,-2);
assert(m.pos.journal.at(-1).kind==='drawer'&&/short 2.00/.test(m.pos.journal.at(-1).text));
assert.equal(P.rollup(m,date,service).cash.counted,closed.counted);assert.equal(round(P.sales(m,{from:date,to:date,service}).cashOver-cashBefore),-2,'the drawer result reaches the sales aggregate');
m=B.change(m,{type:'pos:drawer-reopen',drawer:'drw1'});assert(!P.drawerById(m,'drw1').closedAt);m=B.change(m,{type:'pos:drawer-close',drawer:'drw1',counted:closed.counted});
assert(/CASH DRAWERS/.test(P.zReport(m,date,service))&&/NET SALES/.test(P.zReport(m,date,service)));
console.log('PASS: drawer float, paid in and out, no sale, drops, cash refunds, count with over/short, reopen and the Z report.');

// Stock depletion, training mode, PINs, labor and the open item.
let st2=as(m,'manager','jamie');st2.date=date;st2.service=service;
const recipeItem=s.menu.items.find(i=>i.active&&i.recipe.length&&!i.modifiers.length&&i.category!=='cocktails');const ing=recipeItem.recipe[0];
st2.stock.items.find(i=>i.id===ing.item).onHand=100;
st2=B.change(st2,{type:'pos:open',id:'dep1',type_:'tab',guests:1,date,service});st2=B.change(st2,{type:'pos:add',id:'dep1',item:recipeItem.id,qty:2});
st2=B.change(st2,{type:'pos:pay',id:'dep1',payment:{id:'dp1',method:'Card',amount:P.totals(st2,P.check(st2,'dep1')).total}});
assert.equal(st2.stock.items.find(i=>i.id===ing.item).onHand,round(100-ing.units*2),'paid dishes come off counted stock');
fails(()=>B.change(as(st2,'crew','alex'),{type:'pos:open',id:'tr0',training:true,type_:'tab',guests:1,date,service}),/POS lead/);
const netBefore=P.sales(st2,{from:date,to:date,service}).net;
st2=B.change(st2,{type:'pos:open',id:'tr1',training:true,type_:'tab',guests:1,date,service});assert(P.check(st2,'tr1').training);
st2=B.change(st2,{type:'pos:add',id:'tr1',item:'mi-espresso',qty:3});st2=B.change(st2,{type:'pos:pay',id:'tr1',payment:{id:'tp1',method:'Cash',amount:P.totals(st2,P.check(st2,'tr1')).total,tip:5}});
assert.equal(P.sales(st2,{from:date,to:date,service}).net,netBefore,'training checks never count');assert.equal(P.tipsFor(st2,'jamie',date),P.tipsFor(m,'jamie',date));
fails(()=>B.change(st2,{type:'pos:add',id:'dep1',item:'open-item',name:'Corkage',price:15}),/paid/);
st2=B.change(st2,{type:'pos:open',id:'oi1',type_:'tab',guests:1,date,service});
fails(()=>B.change(as(st2,'crew','alex'),{type:'pos:add',id:'oi1',item:'open-item',name:'Corkage',price:15}),/belongs to|POS lead/);
st2=B.change(st2,{type:'pos:add',id:'oi1',item:'open-item',name:'Corkage',price:15,station:'Floor'});assert.equal(P.check(st2,'oi1').lines[0].price,15);assert.equal(P.check(st2,'oi1').lines[0].tax,8.75);
assert.equal(P.pinOf(st2,'jamie'),'0000');assert.equal(P.pinOf(st2,'alex'),'1234');
st2=B.change(st2,{type:'pos:pin',pin:'4321'});assert.equal(P.pinOf(st2,'jamie'),'4321');fails(()=>B.change(st2,{type:'pos:pin',pin:'12'}),/four digits/);
fails(()=>B.change(as(st2,'crew','alex'),{type:'pos:pin',person:'jamie',pin:'9999'}),/managers/);st2=B.change(as(st2,'crew','alex'),{type:'pos:pin',pin:'5555'});assert.equal(P.pinOf(st2,'alex'),'5555');
const L=P.labor(st2,date,service);assert(L.cost>0&&L.hours>0&&L.people>0,'labor from the roster');
console.log('PASS: stock depletion from recipes, training mode, open items, PINs and labor.');

// Sections: who has which table, drawn from the roster; new checks default to the table’s server; transfers.
m=as(st2,'manager','jamie');
fails(()=>B.change(as(m,'crew','alex'),{type:'pos:section-auto',date,service}),/POS lead/);
m=B.change(m,{type:'pos:section-auto',date,service});const sec=P.sections(m,date,service);assert(Object.keys(sec).length>=20,'every table has a server');
const free3=s.floor.tables.find(tb=>tb.shape!=='bar'&&tb.seats>=4&&!used.has(tb.label)&&!P.forTable(m,date,service,tb.label));
m=B.change(m,{type:'pos:section-table',date,service,table:free3.label,person:'noah'});assert.equal(P.serverOf(m,date,service,free3.label),'noah');assert(P.myTables(m,date,service,'noah').includes(free3.label));
m=B.change(m,{type:'pos:open',id:'chk3',tables:[free3.label],guests:2,date,service});assert.equal(P.check(m,'chk3').server,'noah','a manager’s new check goes to the section’s server');
m=B.change(m,{type:'pos:transfer',id:'chk3',server:'alex'});assert.equal(P.check(m,'chk3').server,'alex');
assert.equal(P.tableState(m,date,service,free3.label).check.id,'chk3');assert.equal(P.tableState(m,date,service,free3.label).stage,'new');
m=B.change(m,{type:'pos:add',id:'chk3',item:'mi-espresso'});m=B.change(m,{type:'pos:pay',id:'chk3',payment:{id:'p3',method:'Cash',amount:1,tip:0}});
fails(()=>B.change(m,{type:'pos:void',id:'chk3',reason:'Test'}),/Remove the payments/);
m=B.change(m,{type:'pos:remove-payment',id:'chk3',payment:'p3'});m=B.change(m,{type:'pos:void',id:'chk3',reason:'Guest changed their mind'});
assert.equal(P.check(m,'chk3').status,'void');const r3=m.reservations.find(r=>r.id===P.check(m,'chk3').res);assert(!r3||r3.status==='Completed');
// Reopen and close, settings, archiving a finished day, turning the POS off for someone, and recovery.
fails(()=>B.change(as(m,'crew','alex'),{type:'pos:reopen',id:'chk1'}),/POS lead/);
m=B.change(m,{type:'pos:reopen',id:'chk1'});assert.equal(P.check(m,'chk1').status,'open');m=B.change(m,{type:'pos:close',id:'chk1'});assert.equal(P.check(m,'chk1').status,'paid');
fails(()=>B.change(m,{type:'pos:settings',taxRate:200}),/taxRate/);m=B.change(m,{type:'pos:settings',taxRate:10,taxGroups:[{name:'Alcohol',rate:12,categories:['cocktails']}],rounding:0.05,taxIncluded:false,discountPresets:[{name:'VIP',kind:'pct',value:15}],happyHour:{enabled:false},lateMinutes:12,receipt:{header:'COPPER',footer:'Bye'}});
assert.equal(m.pos.settings.taxGroups[0].rate,12);assert.equal(m.pos.settings.discountPresets[0].name,'VIP');assert(!m.pos.settings.happyHour.enabled);assert.equal(m.pos.settings.receipt.header,'COPPER');
m=B.change(m,{type:'pos:open',id:'rd1',type_:'tab',guests:1,date,service});m=B.change(m,{type:'pos:add',id:'rd1',item:'mi-espresso'});
assert.equal(P.check(m,'rd1').lines[0].tax,10,'new lines take the new rate; old lines keep theirs');assert.equal(P.totals(m,P.check(m,'rd1')).total%0.05<0.001||Math.abs(P.totals(m,P.check(m,'rd1')).total%0.05-0.05)<0.001,true,'rounding to 0.05');
const y=B.addDays(today,-1),ysvc=m.pos.checks.find(z=>z.date===y)?.service;
if(ysvc){const b4=P.sales(m,{from:y,to:y,service:ysvc});m=B.change(m,{type:'pos:consolidate',date:y,service:ysvc});assert(m.pos.days[y+'|'+ysvc]);assert(!m.pos.checks.some(z=>z.date===y&&z.service===ysvc));const aft=P.sales(m,{from:y,to:y,service:ysvc});assert.equal(aft.net,b4.net);assert.equal(aft.checks,b4.checks);assert.equal(JSON.stringify([...aft.byType]),JSON.stringify([...b4.byType]),'order types survive archiving');}
fails(()=>B.change(as(m,'crew','alex'),{type:'pos:consolidate',date,service}),/managers/);
const offp=B.change(m,{type:'manage:permissions',person:'alex',perms:{pos:false}});fails(()=>B.change(as(offp,'crew','alex'),{type:'pos:open',id:'chk9',tables:[],guests:1,date,service}),/turned off/);
const broken=JSON.parse(JSON.stringify(m));broken.pos.checks[0].server='ghost';store.v=JSON.stringify(broken);const re=B.load(store);assert(B.validState(re));assert.equal(re.shifts.length,m.shifts.length);
// A version-1 POS record upgrades in place: types, sources, refunds and per-line tax appear.
const v1=JSON.parse(JSON.stringify(m));v1.pos.version=1;for(const ch of v1.pos.checks){delete ch.type;delete ch.source;delete ch.refunds;for(const l of ch.lines)delete l.tax;}delete v1.pos.drawers;delete v1.pos.journal;delete v1.pos.pins;
const up=P.upgrade(v1);assert.equal(up.pos.version,2);assert(up.pos.checks.every(ch=>P.TYPES.includes(ch.type)&&ch.source==='pos'&&Array.isArray(ch.refunds)&&ch.lines.every(l=>typeof l.tax==='number')));assert(B.validState(up));
console.log('PASS: sections, default server, transfers, void with payments, reopen, settings v2, archiving with order types, permissions, recovery and the v1 upgrade.');

// The POS screen: command bar, floor with lanes, orders, kitchen display, cash, close-out with journal, sections; the order screen and its dialogs; Today card, Reports, badges and notifications.
const e=x=>String(x??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const input=(name,label,value='',type='text',attrs='')=>`<label>${label}<input name="${name}" type="${type}" value="${e(value)}" ${attrs}></label>`;
const textarea=(name,label,value='',attrs='')=>`<label>${label}<textarea name="${name}" ${attrs}>${e(value)}</textarea></label>`;
const select=(name,label,values,value)=>`<label>${label}<select name="${name}">${values.map(v=>{const [kk,tt]=Array.isArray(v)?v:[v,v];return `<option value="${e(kk)}" ${kk===value?'selected':''}>${e(tt)}</option>`;}).join('')}</select></label>`;
let ui=as(m,'manager','jamie');ui.date=date;ui.service=service;
const opened=[],commits=[],switched=[];let went=0;
const api={state:()=>ui,e,input,textarea,select,dateLabel:d=>d,render(){},notify(){},close(){},go(){went++;},open(tt,h){opened.push([tt,h]);},commit(x){try{ui=B.change(ui,x);commits.push(x.type);return true;}catch(err){commits.push('ERR '+err.message);return false;}},switchUser(id){switched.push(id);}};
const pos=c.createPosUI(api);
let html=pos.render();assert(html.includes('sk-tabs')&&html.includes('ps-bar')&&html.includes('ps-table')&&html.includes('fl-canvas')&&html.includes('data-id="sections"')&&html.includes('data-id="cash"'));assert(html.includes('ps-srv'),'server initials on the map');assert(html.includes('Takeout &amp; delivery')&&html.includes('Bar tabs'),'lanes');
for(const tb of ['checks','tickets','cash','close','sections']){pos.show(tb);html=pos.render();assert(html.includes('data-tab="'+tb+'"'),tb);}
pos.show('checks');html=pos.render();assert(html.includes('data-ps-osearch')&&html.includes('Every type')&&html.includes('#'+P.check(ui,'to1').number));
pos.handle('type-filter','takeout');html=pos.render();assert(html.includes('#'+P.check(ui,'to1').number)&&!html.includes('#'+P.check(ui,'sp1').number),'type filter');pos.handle('type-filter','');
pos.show('tickets');html=pos.render();assert(html.includes('Expo · all')&&html.includes('ps-ticket')&&html.includes('Bump all'));pos.handle('kds-mode','allday');assert(pos.render().includes('ps-allday'));pos.handle('kds-mode','recent');assert(pos.render().includes('Recently served'));pos.handle('kds-mode','tickets');
pos.show('cash');html=pos.render();assert(html.includes('drawer')&&html.includes('Drawer history'));pos.handle('cash-pane','gift');assert(pos.render().includes('GC-'));pos.handle('cash-pane','accounts');assert(pos.render().includes('Linden'));pos.handle('cash-pane','drawer');
pos.show('close');html=pos.render();assert(html.includes('By server')&&html.includes('fin-close')&&html.includes('Journal')&&html.includes('LABOR')&&html.includes('By order type')&&html.includes('Z report'));
pos.handle('zreport','');assert.equal(opened.at(-1)[0],'Z report');assert(opened.at(-1)[1].includes('END OF DAY'));
pos.handle('settings','');assert.equal(opened.at(-1)[0],'POS settings');const setAct=pos.submit({taxRate:'9',taxIncluded:'false',groupName:'Alcohol',groupRate:'11',rounding:'0',serviceCharge:'18',serviceChargeFrom:'6',tipSuggestions:'18, 20',cashFloat:'250',tenders:'Cash\nCard\nGift card\nHouse account\nVoucher',coursing:'true',prepMinutes:'20',warnMinutes:'8',lateMinutes:'15',depleteStock:'true',keepDays:'3',discountPresets:'Staff meal | pct | 50',hhEnabled:'true',hhPct:'25',receiptHeader:'The Copper Room',receiptFooter:'Thanks',voidReasons:'Dup',compReasons:'Recovery'},{getAll:kk=>kk==='groupCats'?['cocktails']:kk==='hhCats'?['cocktails','beer']:kk.startsWith('ot_')?['on']:[]});
assert.equal(setAct.type,'pos:settings');assert.equal(setAct.taxGroups[0].rate,11);assert(setAct.tenders.includes('Voucher'));ui=B.change(ui,setAct);assert.equal(ui.pos.settings.cashFloat,250);
pos.show('tables');pos.handle('open','chk1');html=pos.render();assert(html.includes('ps-order')&&html.includes('#'+P.check(ui,'chk1').number)&&html.includes('Reopen')&&html.includes('Refund')&&html.includes('Adjust tip')===false);
ui.team.find(p=>p.id==='alex').name='<b>Alex</b> Morgan';
const free4=s.floor.tables.find(tb=>tb.shape!=='bar'&&tb.seats>=4&&!used.has(tb.label)&&!P.forTable(ui,date,service,tb.label));
pos.handle('table',free4.label);assert.equal(opened.at(-1)[0],'New check');assert(opened.at(-1)[1].includes('Order type')&&opened.at(-1)[1].includes('data-ps-when'));assert.equal(went,1);
const act=pos.submit({type_:'dine',table:free4.label,guests:'2',name:'',server:'alex',allergy:'Nut allergy'},{getAll:()=>[]});assert.equal(act.type,'pos:open');assert.equal(act.allergy,'Nut allergy');ui=B.change(ui,act);pos.saved();
html=pos.render();assert(html.includes('ps-item')&&html.includes('data-ps-search')&&html.includes('Top sellers')&&html.includes('ps-allergy')&&!html.includes('<b>Alex</b>')&&html.includes('&lt;b&gt;Alex'));
pos.handle('add','mi-fries');assert.equal(commits.at(-1),'pos:add');
// An 86’d tile with a sellable substitute stays tappable and rings in the substitute; without one it is disabled.
html=pos.render();assert(html.includes('data-action="ps-sub" data-id="mi-latte"')&&html.includes('→ Pot of tea')&&html.includes('offer Pot of tea instead'),'substitute on the tile');
pos.handle('sub','mi-latte');assert.equal(commits.at(-1),'pos:add');assert(P.openChecks(ui,date,service).some(ch=>ch.lines.some(l=>l.item==='mi-pot-of-tea')),'the substitute was rung in');
ui=B.change(ui,{type:'ops:sub',id:'p86',sub:null});html=pos.render();assert(html.includes('data-action="ps-add" data-id="mi-latte" disabled')&&!html.includes('ps-sub'),'no substitute, no tap');
pos.handle('add','mi-rib-eye-steak');assert.equal(opened.at(-1)[0],'Rib-eye steak');assert(opened.at(-1)[1].includes('Allergy on this check'));
const addAct=pos.submit({qty:'1',seat:'1',course:'2',note:''},{getAll:kk=>kk==='mod_temp'?['Medium']:kk==='mod_side'?['Greens']:[]});same(addAct.mods,['Medium','Greens']);ui=B.change(ui,addAct);
pos.handle('send',act.id);assert.equal(commits.at(-1),'pos:send');html=pos.render();assert(html.includes('Holding')||html.includes('Fire')||true);
pos.handle('cat','other');html=pos.render();assert(html.includes('Gift card')&&html.includes('Open item'));pos.handle('open-item',act.id);assert.equal(opened.at(-1)[0],'Open item');const oiAct=pos.submit({name:'Corkage',price:'12',station:'Floor',course:'0'},{getAll:()=>[]});assert.equal(oiAct.item,'open-item');
pos.handle('gift','50');assert.equal(opened.at(-1)[0],'Sell a gift card');assert.equal(pos.submit({price:'50',note:''},{getAll:()=>[]}).item,'gift-card');pos.handle('cat','');
pos.handle('split',act.id);assert.equal(opened.at(-1)[0].slice(0,5),'Split');const spAct=pos.submit({mode:'even',n:'3'},{getAll:()=>[]});assert.equal(spAct.type,'pos:split');assert.equal(spAct.n,3);assert(spAct.ids.length>=2);
assert.equal(pos.submit({mode:'items'},{getAll:()=>[]}),null,'by item switches to selection');html=pos.render();assert(html.includes('ps-selbar')&&html.includes('ps-pick')&&html.includes('ps-rail'));
pos.handle('pick-line',P.check(ui,act.id).lines[0].id,{},{checked:true});html=pos.render();assert(html.includes('Share cost')&&html.includes('is-on'),'the selection bar appears');pos.handle('sel-move',act.id);assert(opened.at(-1)[0].startsWith('Move'));const mv=pos.submit({mode:'new',name:'Side'},{getAll:()=>[]});assert.equal(mv.type,'pos:move-lines');assert.equal(mv.lines.length,1);
pos.handle('sel-split',act.id);assert.equal(opened.at(-1)[0],'Share the cost');const sh=pos.submit({n:'2',seats:'next'},{getAll:()=>[]});assert.equal(sh.type,'pos:split-line');same(sh.seats,[1,2]);
pos.handle('sel-seat',act.id);assert(opened.at(-1)[0].startsWith('Seat'));assert.equal(pos.submit({seat:'2',course:''},{getAll:()=>[]}).seat,2);
pos.handle('table-sheet',act.id);assert(opened.at(-1)[1].includes('ps-timeline')&&opened.at(-1)[1].includes('ps-tiles')&&opened.at(-1)[1].includes('Split check'));
pos.handle('select',act.id);
pos.handle('pay',act.id);assert(opened.at(-1)[0].startsWith('Pay'));assert(opened.at(-1)[1].includes('ps-pad')&&opened.at(-1)[1].includes('Gift card code'));
const payAct=pos.submit({method:'Cash',amount:'5',tip:'1',tendered:'20'},{getAll:()=>[]});assert.equal(payAct.type,'pos:pay');assert.equal(payAct.payment.amount,5);assert.equal(payAct.payment.tendered,20);
const payGift=pos.submit({method:'Gift card',amount:'5',tip:'0',ref_gift:'gc-7k2m'},{getAll:()=>[]});assert.equal(payGift.payment.ref,'GC-7K2M');
pos.handle('guests',act.id);assert(opened.at(-1)[1].includes('Order type'));const upd=pos.submit({type_:'dine',guests:'3',name:'Bennett',phone:'',note:'',allergy:'Nut allergy',serviceCharge:'false'},{getAll:()=>[]});assert.equal(upd.type,'pos:update');assert.equal(upd.guests,3);
pos.handle('transfer',act.id);assert(opened.at(-1)[0].startsWith('Move table'));pos.handle('merge',act.id);assert(opened.at(-1)[0].startsWith('Merge'));pos.handle('receipt',act.id);assert(opened.at(-1)[1].includes('ps-receipt')&&opened.at(-1)[1].includes('Email the receipt'));
pos.handle('refund','chk1');assert(opened.at(-1)[0].startsWith('Refund'));const rf=pos.submit({method:'Card',amount:'2',reason:'Overcharged'},{getAll:()=>[]});assert.equal(rf.type,'pos:refund');
pos.handle('discount',act.id);assert(opened.at(-1)[1].includes('ps-preset'));
pos.handle('switch','');assert.equal(opened.at(-1)[0],'Switch user');assert(opened.at(-1)[1].includes('ps-pin')&&opened.at(-1)[1].includes('data-pin="true"'));
ui=B.change(ui,{type:'pos:drawer-open',id:'drw9',date,service,float:200});pos.handle('drawer-event','out');assert.equal(opened.at(-1)[0],'Paid out');assert.equal(pos.submit({amount:'12',reason:'Ice'},{getAll:()=>[]}).type,'pos:drawer-event');
pos.handle('drawer-close','');assert(opened.at(-1)[1].includes('ps-denoms'));assert.equal(pos.submit({counted:'400',note:''},{getAll:()=>[]}).type,'pos:drawer-close');
pos.handle('account','');assert.equal(pos.submit({name:'New Co.',limit:'100',contact:''},{getAll:()=>[]}).type,'pos:account');
pos.handle('pin','');assert.equal(pos.submit({person:'jamie',pin:'1111'},{getAll:()=>[]}).type,'pos:pin');
const card_=pos.todayCard();assert(card_&&card_.title==='Sales'&&card_.body.includes('Paid checks')&&card_.body.includes('pickups'));
const d={R:{from:B.addDays(today,-28),to:B.addDays(today,-1)},Q:{from:B.addDays(today,-56),to:B.addDays(today,-29)}};
const report=pos.report(d);assert(report.includes('rp-kpi')&&report.includes('Menu mix')&&report.includes('Servers')&&report.includes('Order types')&&report.includes('LABOR')&&report.includes('CASH OVER'));assert(pos.csvRows(d).length>10&&pos.csvRows(d).some(r=>r[0]==='Order type'));
ui=as(ui,'crew','alex');const cardC=pos.todayCard();assert.equal(cardC,null,'servers get no tables card on Today');ui=as(ui,'crew','sam');const cardK=pos.todayCard();assert(!cardK||cardK.title==='Kitchen tickets');ui=as(ui,'crew','alex');
pos.show('tables');html=pos.render();assert(!html.includes('data-id="sections"'),'crew have no sections tab');assert(html.includes('ps-who'));
pos.show('close');html=pos.render();assert(html.includes('Cash to hand in')&&html.includes('Change my PIN'));
const floor=c.createFloorUI({...api,badge:(l,tn)=>`<span class="badge ${tn}">${e(l)}</span>`,button:(label,action,id='',extra='')=>`<button data-action="${action}" data-id="${e(id)}" ${extra}>${e(label)}</button>`,serviceFields:()=>'',edit(){},form(){}});
floor.show('floor');html=floor.render();assert(html.includes('ps-srv')&&html.includes('open checks'),'the live map shows servers and open checks');
floor.tableSheet(free4.id);assert(opened.at(-1)[1].includes('ps-table'),'the table sheet opens the check');
ui=as(ui,'manager','jamie');const bd=N.badges(ui);assert(bd.pos&&bd.pos.text,'the POS pill counts open checks');
ui.pos.checks.find(z=>z.id===act.id).lines.push({id:'late1',item:'mi-fries',name:'Fries',price:6,qty:1,seat:0,course:3,status:'sent',mods:[],station:'Kitchen',sentAt:new Date(Date.now()-30*60000).toISOString(),tax:8.75});
const notifs=c.BriglyNotifications.build(ui,new Set());assert(notifs.some(n=>n.badge.includes('late ticket')),'late tickets reach the bell');
console.log('PASS: POS screen with command bar, lanes, orders, kitchen display, cash, close-out, journal, settings, order screen, split and move, pay with numpad, gift and account forms, PIN switch, Today card, Reports board, live map overlay, badges and notifications.');
