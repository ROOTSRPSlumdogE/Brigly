import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const load=files=>{const c=vm.createContext({crypto,console,document:{addEventListener(){}}});for(const f of files)vm.runInContext(readFileSync(new URL('../assets/js/'+f+'.js',import.meta.url),'utf8'),c);return c;};
const core=['workspace-state','schedule-state','shift-operations-state','planner-state','duties-state','checklist-history','team-chat-state','stock-state'];
const c=load([...core,'stock-ui']),B=c.Brigly,store={v:null,getItem(){return this.v},setItem(k,v){this.v=v}};
const as=(s,role,id)=>({...s,role,...(role==='crew'?{crewId:id}:{managerId:id})});
const fails=(fn,re)=>assert.throws(fn,err=>re.test(err.message),'expected '+re);

// Every workspace starts with a stock list, vendors, and older supply requests / 86s linked by name.
let s=B.load(store);assert(B.validState(s));
assert(s.stock.items.length>=60&&s.stock.vendors.length>=8);
assert.equal(s.orders.find(o=>o.name==='Cocktail napkins').item,'st-cocktail-napkins');
assert.equal(s.unavailable.find(x=>x.name==='Burrata').item,'st-burrata');
const date=s.date,service='Dinner';s.service=service;

// Teams decide who can 86 and order what: the bartender can't order fish, the kitchen can.
s=as(s,'crew','noah');
fails(()=>B.change(s,{type:'stock:request',id:'r1',lines:[{item:'st-halibut-fillet',quantity:2}]}),/Kitchen crew or a manager/);
fails(()=>B.change(s,{type:'stock:alert',id:'a1',item:'st-oysters',date,service,reason:'Sold out.'}),/Kitchen crew/);
s=B.change(s,{type:'stock:request',id:'r2',lines:[{item:'st-limes',quantity:2},{item:'st-fever-tree-tonic',quantity:3}],note:'Weekend list'});
const limes=s.orders.find(o=>o.id==='r2-0');
assert.equal(limes.status,'Requested');assert.equal(limes.vendor,'greenleaf');assert.equal(limes.area,'Bar');assert.equal(limes.cost,42);
// Made-in-house items can be 86'd but never ordered.
s=as(s,'crew','sam');
fails(()=>B.change(s,{type:'stock:request',id:'r3',lines:[{item:'st-chocolate-tart',quantity:1}]}),/made in house/);
s=B.change(s,{type:'stock:request',id:'r4',lines:[{item:'st-halibut-fillet',quantity:4}]});

// Crew can adjust or withdraw only their own pending lines.
fails(()=>B.change(s,{type:'stock:qty',id:'r2-0',quantity:5}),/can no longer be changed/);
s=as(s,'crew','noah');s=B.change(s,{type:'stock:qty',id:'r2-0',quantity:3});assert.equal(s.orders.find(o=>o.id==='r2-0').quantity,3);
s=B.change(s,{type:'stock:cancel',id:'r2-1'});assert.equal(s.orders.find(o=>o.id==='r2-1').status,'Cancelled');
fails(()=>B.change(s,{type:'stock:review',ids:['r2-0'],status:'Approved'}),/Only managers/);

// Manager review: decline needs a reason; approvals land on the order sheet.
s=as(s,'manager','jamie');
fails(()=>B.change(s,{type:'stock:review',ids:['r4-0'],status:'Declined',feedback:''}),/reason/);
s=B.change(s,{type:'stock:review',ids:['r2-0','r4-0'],status:'Approved'});
assert(s.orders.filter(o=>['r2-0','r4-0'].includes(o.id)).every(o=>o.status==='Approved'&&o.reviewer==='jamie'));
// Manager lines skip review, and repeat adds merge into one line.
s=B.change(s,{type:'stock:request',id:'m1',lines:[{item:'st-limes',quantity:1}]});
s=B.change(s,{type:'stock:request',id:'m2',lines:[{item:'st-limes',quantity:2}]});
const mine=s.orders.filter(o=>o.item==='st-limes'&&o.author==='jamie');assert.equal(mine.length,1);assert.equal(mine[0].quantity,3);assert.equal(mine[0].status,'Approved');

// Placing an order numbers a PO per vendor with the next reachable delivery date.
const seq=s.stock.poSeq;
s=B.change(s,{type:'stock:place',vendor:'greenleaf'});
const po='PO-'+seq,placed=s.orders.filter(o=>o.po===po);
assert.equal(placed.length,2);assert(placed.every(o=>o.status==='Ordered'&&B.isDate(o.expected)&&o.expected>=B.dateString(new Date())));
fails(()=>B.change(s,{type:'stock:place',vendor:'greenleaf'}),/nothing approved/);
assert.equal(s.orders.find(o=>o.id==='r4-0').status,'Approved','other vendors stay on the sheet');

// Receiving logs shorts and adds what arrived to the last count.
s=B.change(s,{type:'stock:count',id:'st-limes',onHand:.5});
s=B.change(s,{type:'stock:receive',po,received:{'r2-0':2},note:'One case short.'});
const got=s.orders.find(o=>o.id==='r2-0');assert.equal(got.status,'Received');assert.equal(got.receivedQty,2);assert.equal(got.deliveryNote,'One case short.');
assert.equal(s.stock.items.find(i=>i.id==='st-limes').onHand,.5+2+3);
fails(()=>B.change(s,{type:'stock:receive',po}),/already received/);

// Delivery timing: order by the cut-off, lead days before a delivery day.
const v={days:[3],cutoff:'14:00',lead:1};
const tue=new Date('2026-10-27T10:00:00'),tueLate=new Date('2026-10-27T15:00:00');
assert.equal(B.stock.nextDelivery(v,tue).date,'2026-10-28');
assert.equal(B.stock.nextDelivery(v,tueLate).date,'2026-11-04');

// 86s are picked from the stock list, can't be doubled, and can ask for a restock.
s=as(s,'crew','sam');
s=B.change(s,{type:'stock:alert',id:'alert-1',item:'st-oysters',date,service,reason:'Sold out. Offer the mussels.',restock:2});
const alert=s.unavailable.find(x=>x.id==='alert-1');assert.equal(alert.item,'st-oysters');assert.equal(alert.status,'Reported');assert.equal(alert.area,'Kitchen');
assert(s.orders.some(o=>o.item==='st-oysters'&&o.status==='Requested'&&o.author==='sam'));
fails(()=>B.change(s,{type:'stock:alert',id:'alert-2',item:'st-oysters',date,service,reason:'Gone.'}),/already on the 86 board/);
fails(()=>B.change(s,{type:'stock:alert',id:'alert-3',item:'st-chocolate-tart',date,service,reason:'All gone.',restock:1}),/made in house/);
// Free-text 86s from checklist notes still link when the name matches.
s=B.change(s,{type:'ops:alert',id:'note-86',date,service,name:'fresh oysters',reason:'From a task note.',area:'Kitchen'});
assert.equal(s.unavailable.find(x=>x.id==='note-86').item,'st-oysters');

// Counting: team crew and managers only.
s=as(s,'crew','noah');fails(()=>B.change(s,{type:'stock:count',id:'st-burrata',onHand:2}),/Kitchen crew/);
s=as(s,'crew','sam');s=B.change(s,{type:'stock:count',id:'st-burrata',onHand:1});assert.equal(s.stock.items.find(i=>i.id==='st-burrata').countedBy,'sam');

// Inventory counts: one open sheet per team, crew count their own team, finishing updates on-hand and works out usage.
s=as(s,'crew','noah');fails(()=>B.change(s,{type:'stock:count-start',id:'c0',team:'Kitchen'}),/own team/);
s=as(s,'crew','sam');s=B.change(s,{type:'stock:count-start',id:'c1',team:'Kitchen'});
fails(()=>B.change(s,{type:'stock:count-start',id:'c2',team:'Kitchen'}),/already in progress/);
fails(()=>B.change(s,{type:'stock:count-entry',id:'c1',item:'st-house-bourbon',qty:1}),/count sheet/);
fails(()=>B.change(s,{type:'stock:count-submit',id:'c1'}),/at least one/);
s=B.change(s,{type:'stock:count-entry',id:'c1',item:'st-burrata',qty:.5});
s=B.change(s,{type:'stock:count-entry',id:'c1',item:'st-mussels',qty:3});
s=B.change(s,{type:'stock:count-entry',id:'c1',item:'st-mussels',qty:null});assert(!s.stock.counts.find(c=>c.id==='c1').entries['st-mussels']);
s=as(s,'manager','jamie');s=B.change(s,{type:'stock:count-entry',id:'c1',item:'st-mussels',qty:4});
s=B.change(s,{type:'stock:count-submit',id:'c1',note:'Weekly count'});
const counted=s.stock.counts.find(c=>c.id==='c1');
assert.equal(counted.status,'Submitted');assert.equal(counted.entries['st-burrata'].used,.5);assert.equal(counted.entries['st-mussels'].used,null);
assert.equal(s.stock.items.find(i=>i.id==='st-burrata').onHand,.5);assert.equal(s.stock.items.find(i=>i.id==='st-mussels').countedBy,'jamie');
assert(!B.stock.countDue(s,'Kitchen'));assert(B.stock.countDue(s,'Floor'));
fails(()=>B.change(s,{type:'stock:count-entry',id:'c1',item:'st-burrata',qty:1}),/already finished/);
s=B.change(s,{type:'stock:count-start',id:'c3',team:'Floor'});
s=as(s,'crew','alex');fails(()=>B.change(s,{type:'stock:count-discard',id:'c3'}),/started this count/);
s=as(s,'manager','jamie');s=B.change(s,{type:'stock:count-discard',id:'c3'});assert(!s.stock.counts.some(c=>c.id==='c3'));

// Count assignments: managers schedule them; the assignee may count another team; finishing completes it and weekly ones roll on.
const day=B.dateString(new Date());
s=as(s,'crew','alex');fails(()=>B.change(s,{type:'stock:assign',id:'a1',team:'Kitchen',assignee:'alex',date:day,repeat:''}),/Only managers/);
s=as(s,'manager','jamie');
fails(()=>B.change(s,{type:'stock:assign',id:'a0',team:'Kitchen',assignee:'',date:B.addDays(day,-1),repeat:''}),/today or a later date/);
s=B.change(s,{type:'stock:assign',id:'a1',team:'Kitchen',assignee:'alex',date:day,repeat:'weekly',note:'Walk-in first'});
s=B.change(s,{type:'stock:assign',id:'a2',team:'Floor',assignee:'',date:B.addDays(day,3),repeat:''});
s=as(s,'crew','alex');assert(B.stock.assignedTo(s,'alex','crew').map(x=>x.id).join()==='a1,a2','own assignment plus whole-team Floor');
s=B.change(s,{type:'stock:count-start',id:'c4',team:'Kitchen'});
s=B.change(s,{type:'stock:count-entry',id:'c4',item:'st-burrata',qty:2});
s=B.change(s,{type:'stock:count-submit',id:'c4'});
const a1=s.stock.assignments.find(x=>x.id==='a1');assert.equal(a1.status,'Done');assert.equal(a1.doneBy,'alex');assert.equal(a1.countId,'c4');
const nextWeek=s.stock.assignments.find(x=>x.series==='a1'&&x.status==='Open');assert.equal(nextWeek.date,B.addDays(day,7));assert.equal(nextWeek.assignee,'alex');
assert.equal(s.stock.assignments.find(x=>x.id==='a2').status,'Open','a later assignment for another team stays open');
s=as(s,'crew','noah');fails(()=>B.change(s,{type:'stock:count-start',id:'c5',team:'Kitchen'}),/assigned to/);
s=as(s,'manager','jamie');s=B.change(s,{type:'stock:assign-cancel',id:nextWeek.id});assert.equal(s.stock.assignments.find(x=>x.id===nextWeek.id).status,'Cancelled');

// Catalog management: managers set teams per item; station renames follow and in-use stations can't be removed.
s=as(s,'manager','jamie');
s=B.change(s,{type:'stock:item',id:'st-yuzu',name:'Yuzu juice',category:'Bar syrups',teams:['Bar'],vendor:'greenleaf',unit:'bottle',pack:'500 ml',cost:18,par:2,location:'Bar back',sku:'',active:true});
assert(s.stock.categories.includes('Bar syrups'));
fails(()=>B.change(s,{type:'stock:item',id:'st-yuzu-2',name:'yuzu juice',category:'Produce',teams:['Bar'],vendor:'',unit:'bottle',cost:0,par:0}),/already has that name/);
fails(()=>B.change(s,{type:'stock:item',id:'st-x',name:'Thing',category:'Produce',teams:[],vendor:'',unit:'each',cost:0,par:0}),/at least one team/);
s=B.change(s,{type:'ops:catalog',catalog:'areas',name:'Cocktail bar',oldName:'Bar'});
assert(s.stock.items.find(i=>i.id==='st-yuzu').teams.includes('Cocktail bar'));
fails(()=>B.change(s,{type:'ops:remove-catalog',catalog:'areas',name:'Kitchen'}),/in use|Stock items/);
s=B.change(s,{type:'stock:vendor',id:'v-new',name:'Island Farms',days:[2,5],cutoff:'10:00',lead:1,minimum:80,contact:'',phone:'',email:'',account:'',note:'',active:true});
fails(()=>B.change(s,{type:'stock:vendor',id:'harbor',name:'Harbor & Line Seafood',days:[2],cutoff:'14:00',lead:1,minimum:0,active:false}),/open orders/);
assert(B.validState(s));assert(B.save(store,s));assert.equal(B.load(store).stock.items.length,s.stock.items.length);
console.log('PASS: stock catalog, team permissions, request → review → PO → receiving, shorts, counts, 86 links, restocks, inventory counts, count assignments and catalog setup.');

// The screen renders for crew and manager in every section.
let opened=null;
const ui=(state)=>c.createStockUI({state:()=>state,e:x=>String(x??''),input:()=>'',textarea:()=>'',select:()=>'',dateLabel:d=>d,commit(){},notify(){},render(){},report(){},close(){},open(title,fields){opened={title,fields};}});
let view=as(B.load(store),'crew','sam');view.service=service;
let u=ui(view);let html=u.render();
assert(html.includes('sk-tabs')&&html.includes('>Halibut fillet<')&&!html.includes('>House bourbon<'),'crew sees only their team list');
assert(!html.includes('data-id="vendors"')&&html.includes('data-id="requests"'),'crew sections');
// One + per orderable row; everything else lives in the item sheet.
assert(html.includes('data-action="stock-step" data-id="st-halibut-fillet"')&&!html.includes('class="sk-86'));
u.handle('open','st-halibut-fillet');assert.equal(opened.title,'Halibut fillet');assert(opened.fields.includes('86 this item')&&opened.fields.includes('Add to request')&&!opened.fields.includes('Edit item'));
u.handle('step','st-mussels',{step:1});assert(u.render().includes('sk-cart'));
u.handle('filter','low');html=u.render().split('class="sk-rail"')[0];assert(html.includes('>Mussels<')&&!html.includes('>Oysters<'),'below-par filter');
u.handle('tab','86');assert(u.render().includes('Report 86'));u.handle('tab','requests');assert(u.render().includes('My requests'));
view=as(view,'manager','jamie');u=ui(view);
for(const t of ['items','orders','86','vendors']){u.handle('tab',t);assert(u.render().length>1000,t);}
u.handle('tab','orders');html=u.render();assert(html.includes('aria-selected="true">Review')&&html.includes('stock-approve'));
u.handle('stage','order');html=u.render();assert(html.includes('Place order')&&html.includes('below par'));
u.handle('stage','arriving');html=u.render();assert(view.orders.some(o=>o.status==='Ordered')?html.includes('Check in delivery'):html.includes('Nothing on the way'));
u.handle('tab','items');u.handle('open','st-oysters');assert(opened.fields.includes('Edit item'));
u.handle('tab','count');html=u.render();assert(html.includes('Inventory')&&html.includes('Start count')&&html.includes('Count history'));
u.handle('count-view','c1');assert(opened.title==='Kitchen count'&&opened.fields.includes('Used'));
html=u.render();assert(html.includes('Scheduled counts')&&html.includes('Floor · Whole team'));u.handle('assign','a2');assert(opened.title==='Edit count'&&opened.fields.includes('Cancel this count'));
console.log('PASS: Stock screen renders the stock list, order sheet, inventory, 86 board, vendors and crew requests.');

// Demo workspaces get six months of deliveries and a live pipeline, once, within the storage budget.
const d=load(['workspace-state','schedule-state','shift-operations-state','demo-history','restaurant-history','planner-state','duties-state','checklist-history','team-chat-state','stock-state','checklist-demo','stock-demo']).Brigly;
const box={v:null,getItem(){return this.v},setItem(k,v){this.v=v}};
let demo=d.load(box);assert(d.validState(demo));assert.equal(demo.stockDemo.version,1);assert(!demo.stockDemo.skipped);
const received=demo.orders.filter(o=>o.status==='Received');
assert(new Set(received.map(o=>o.po)).size>150&&received.some(o=>o.receivedQty<o.quantity));
for(const status of ['Requested','Approved','Ordered'])assert(demo.orders.some(o=>o.status===status&&o.item),status);
assert(demo.stock.items.filter(i=>i.onHand!==null&&i.onHand<i.par).length>=5);
assert(demo.unavailable.some(x=>x.item==='st-halibut-fillet'&&x.date===demo.date));
assert(demo.stock.counts.some(c=>c.team==='Kitchen'&&c.status==='Open')&&d.stock.countDue(demo,'Floor')&&!d.stock.countDue(demo,'Bar'));assert(demo.stock.counts.filter(c=>c.status==='Submitted').length>=20);
assert(demo.stock.assignments.some(x=>x.team==='Floor'&&x.assignee==='mia'&&x.date<demo.date)&&d.stock.assignedTo(demo,'mia','crew').some(x=>x.team==='Floor'));
// Today shows Mia her overdue Floor count with a start button.
{
 const hc=load(['workspace-state','schedule-state','shift-operations-state','demo-history','restaurant-history','planner-state','duties-state','checklist-history','team-chat-state','stock-state','checklist-demo','stock-demo','shift-home']);
 const view={...hc.Brigly.load({v:null,getItem(){return this.v},setItem(k,v){this.v=v}}),role:'crew',crewId:'mia',date:demo.date};
 const homeUI=hc.createShiftHome({state:()=>view,e:x=>String(x??''),dateLabel:d=>d,render(){},focus(){},close(){},open(){}});
 const today=homeUI.render();
 assert(today.includes('Up next for you')&&today.includes('Floor stock count is overdue')&&today.includes('data-action="stock-count-go" data-id="Floor"'),'Mia sees her overdue Floor count on Today');
 view.role='manager';const mgr=homeUI.render();
 assert(mgr.includes('Floor stock count is overdue')&&mgr.includes('Kitchen stock count is due today'),'managers see overdue and due counts');
}

assert(d.save(box,demo));const count=demo.orders.length;demo=d.load(box);assert.equal(demo.orders.length,count,'seeded once');
assert(box.v.length<4000000,'storage '+box.v.length);
console.log('PASS: purchasing history, live order pipeline, last count and storage budget.');
