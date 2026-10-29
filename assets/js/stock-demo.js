/* Demo-only purchasing content: six months of received deliveries per vendor, today's open order pipeline and the last stock count. Runs once per fictional workspace. */
(function(){
 const B=Brigly,prev={starter:B.starter,load:B.load};
 const copy=x=>globalThis.Brigly.clone(x);
 const hash=t=>{let n=2166136261;for(const c of String(t)){n^=c.charCodeAt(0);n=Math.imul(n,16777619);}return n>>>0;};
 const at=(date,clock)=>new Date(date+'T'+clock+':00');
 // Deliveries per week: perishables come more often than wine or dry goods.
 const cadence={greenleaf:2,harbor:2,northfield:1,valley:1,millstreet:1,riverside:1,bean:1,cellar:.5,metro:.5};
 const shorts=['Short on the delivery. Credit requested from the rep.','One unit damaged in transit and refused. Credit noted on the invoice.','Substitute brand offered and refused. Credit requested.'];

 // Weekly closing counts per team for the last two months: Floor is overdue, and the kitchen is counting right now.
 function counts(s,today,now){
  const st=s.stock;st.counts??=[];if(st.counts.length)return;
  const manager=s.team.find(p=>p.active&&p.access==='manager')?.id||'jamie',round=B.stock.round;
  const crew=(team,salt)=>{const pool=s.team.filter(p=>p.active&&p.access==='crew'&&p.area===team);return pool.length?pool[hash(salt)%pool.length].id:manager;};
  const iso=(date,clock)=>new Date(date+'T'+clock+':00').toISOString();
  const notes={Bar:'Two cases of prosecco moved to the event fridge; counted there.',Kitchen:'Walk-in reorganised. Seafood is on the top left shelf now.',Floor:''};
  for(const team of s.setup.areas){
   const items=st.items.filter(x=>x.active&&x.teams.includes(team));if(!items.length)continue;
   const gap=team==='Floor'?9:1;
   for(let w=7;w>=0;w--){
    const date=B.addDays(today,-(gap+w*7)),by=crew(team,team+date),id='sdemo-count-'+team.toLowerCase().replace(/[^a-z0-9]+/g,'-')+'-'+date,entries={},latest=w===0;let value=0;
    for(const x of items){
     const h=hash(id+x.id);if(!latest&&h%9===0)continue;if(latest&&x.onHand===null)continue;
     const qty=latest?x.onHand:Math.round(x.par*(.4+(h%90)/100)*2)/2,used=Math.round(x.par*(.4+(h%60)/100)*2)/2+(h%17===0?-1:0);
     const expected=w===7?null:round(qty+used);
     entries[x.id]={qty,by,expected,used:expected===null?null:round(expected-qty)};value+=qty*x.cost;
     // The last Floor count was nine days ago, so its own items still show that count.
     if(latest&&team==='Floor'&&x.teams.length===1){x.countedAt=iso(date,'22:40');x.countedBy=by;}
    }
    st.counts.push({id,team,startedBy:by,startedAt:iso(date,'22:05'),status:'Submitted',entries,note:latest?notes[team]||'':'',submittedAt:iso(date,'22:40'),submittedBy:by,value:round(value)});
   }
  }
  const kitchen=st.items.filter(x=>x.active&&x.teams.includes('Kitchen')&&x.location==='Walk-in cooler');
  if(kitchen.length&&s.team.some(p=>p.id==='sam'&&p.active)){
   const entries={};for(const x of kitchen.slice(0,14)){const h=hash('open'+x.id);entries[x.id]={qty:Math.max(0,round((x.onHand??x.par)-(h%3)*.5)),by:h%2?'sam':crew('Kitchen','open')};}
   st.counts.push({id:'sdemo-count-kitchen-live',team:'Kitchen',startedBy:'sam',startedAt:new Date(now-40*60000).toISOString(),status:'Open',entries,note:''});
  }
 }
 // Weekly count assignments: Mia's Floor count slipped past yesterday, the kitchen counts tonight as a team, Noah has the bar on Sunday.
 function assignments(s,today,now){
  const st=s.stock;st.assignments??=[];if(st.assignments.length)return;
  const manager=s.team.find(p=>p.active&&p.access==='manager')?.id||'jamie',active=id=>s.team.some(p=>p.id===id&&p.active);
  const at=new Date(now-3*864e5).toISOString();
  for(const [team,assignee,date,note] of [['Floor','mia',B.addDays(today,-1),'Include the host stand and the patio bar fridge.'],['Kitchen','',today,'Walk-in first, then the dry store. Label anything without a date.'],['Bar',active('noah')?'noah':'',B.addDays(today,6),'']]){
   if(!s.setup.areas.includes(team)||(assignee&&!active(assignee)))continue;
   const id='sdemo-assign-'+team.toLowerCase().replace(/[^a-z0-9]+/g,'-');
   st.assignments.push({id,series:id,team,assignee,date,note,repeat:'weekly',by:manager,at,status:'Open'});
  }
 }
 function enrich(input){
  if(!input?.restaurantHistory?.fictional||!input.stock||input.stockDemo?.assignments)return input;
  const s=copy(input),st=s.stock,today=B.dateString(new Date()),now=Date.now();B.configure(s);
  if(!s.stockDemo){
  const from=s.demoHistory?.from||B.addDays(today,-182);
  const manager=s.team.find(p=>p.active&&p.access==='manager')?.id||'jamie';
  const crewFor=(teams,date,salt)=>{const pool=s.team.filter(p=>p.access==='crew'&&teams.includes(p.area)&&(!p.joinedOn||p.joinedOn<=date)&&(!p.leftOn||p.leftOn>=date));return pool.length?pool[hash(salt)%pool.length].id:manager;};
  const items=v=>st.items.filter(i=>i.vendor===v&&i.active);
  const history=[];

  // 1. Received purchase orders, one line per item, from the start of the sample history to yesterday.
  for(const v of st.vendors){
   const per=cadence[v.id]??1,days=[...v.days].sort((a,b)=>((a+6)%7)-((b+6)%7)).slice(0,Math.max(1,Math.ceil(per)));
   for(let d=from;d<today;d=B.addDays(d,1)){
    const weekday=new Date(d+'T12:00:00').getDay();if(!days.includes(weekday))continue;
    const week=Math.floor((new Date(d+'T12:00:00')-new Date(from+'T12:00:00'))/604800000);
    if(per<1&&week%2)continue;
    const pool=items(v.id),n=hash(v.id+d);if(!pool.length)continue;
    const count=Math.min(pool.length,3+n%3),start=n%pool.length;
    const orderDay=B.addDays(d,-v.lead),placed=at(orderDay,v.cutoff);placed.setHours(placed.getHours()-2-n%4);
    const lines=[];
    for(let k=0;k<count;k++){
     const x=pool[(start+k*2)%pool.length],h=hash(x.id+d),q=Math.max(1,Math.round(x.par*(.5+(h%70)/100)));
     const asked=new Date(placed.getTime()-(3+h%20)*3600000),short=h%29===0&&q>1;
     lines.push({id:`sdemo-${v.id}-${d}-${k}`,name:x.name,quantity:q,unit:x.unit,area:x.teams[0],note:'',author:h%3?crewFor(x.teams,orderDay,x.id+d):manager,status:'Received',feedback:'',item:x.id,vendor:v.id,cost:x.cost,at:asked.toISOString(),reviewer:manager,reviewedAt:placed.toISOString(),orderedAt:placed.toISOString(),orderedBy:manager,expected:d,receivedQty:short?q-1:q,receivedAt:at(d,'09:'+String(10+h%40).padStart(2,'0')).toISOString(),receivedBy:crewFor(x.teams,d,'recv'+d),...(short?{deliveryNote:shorts[h%shorts.length]}:{})});
    }
    history.push({placed:placed.toISOString(),lines});
   }
  }
  // A few requests each month never made it onto an order.
  for(let d=from;d<today;d=B.addDays(d,9)){
   const x=st.items.filter(i=>i.vendor)[hash('decline'+d)%st.items.filter(i=>i.vendor).length];
   s.orders.push({id:'sdemo-declined-'+d,name:x.name,quantity:2,unit:x.unit,area:x.teams[0],note:'Running low before the weekend.',author:crewFor(x.teams,d,'declined'+d),status:'Declined',feedback:['Already on Thursday’s delivery.','We have two in the dry store. Check the top shelf.','Par is fine after Saturday’s count.'][hash(d)%3],item:x.id,vendor:x.vendor,cost:x.cost,at:at(d,'15:20').toISOString(),reviewer:manager,reviewedAt:at(d,'17:05').toISOString()});
  }
  history.sort((a,b)=>a.placed.localeCompare(b.placed));
  for(const po of history){const id='PO-'+(st.poSeq++);for(const line of po.lines)s.orders.push({...line,po:id});}

  // 2. Today's pipeline: crew requests to review, an order sheet per vendor, deliveries on the way and one short delivery.
  const hours=h=>new Date(now-h*3600000).toISOString();
  const find=name=>st.items.find(i=>i.name===name);
  const line=(id,name,quantity,author,status,extra={})=>{const x=find(name);if(!x||s.orders.some(o=>o.id===id)||!s.team.some(p=>p.id===author))return;s.orders.push({id,name:x.name,quantity,unit:x.unit,area:s.team.find(p=>p.id===author&&p.access==='crew'&&x.teams.includes(p.area))?.area||x.teams[0],note:'',author,status,feedback:'',item:x.id,vendor:x.vendor,cost:x.cost,at:hours(extra.ago??3),...extra});delete s.orders.at(-1).ago;};
  line('sdemo-live-limes','Limes',2,'noah','Requested',{ago:3.2,note:'Garnish station is low for the weekend cocktail list.'});
  line('sdemo-live-mint','Fresh mint',12,'demo-owen','Requested',{ago:2.5,note:'Orchard drinks are moving fast tonight.'});
  line('sdemo-live-cream','Heavy cream',2,'leo','Requested',{ago:1.7,note:'Risotto and panna cotta both use it this week.'});
  line('sdemo-live-leaves','Mixed salad leaves',2,'demo-isla','Requested',{ago:1.1});
  line('sdemo-live-crayons','Kids’ crayons',1,'mia','Requested',{ago:5,note:'Two family bookings on Sunday.'});
  const approved={reviewer:manager,reviewedAt:hours(.8)};
  line('sdemo-live-tomatoes','Heirloom tomatoes',2,manager,'Approved',{ago:6,...approved});
  line('sdemo-live-mushrooms','Wild mushrooms',3,'sam','Approved',{ago:7,note:'Pappardelle special Friday and Saturday.',...approved});
  line('sdemo-live-shallots','Shallots',1,manager,'Approved',{ago:6,...approved});
  line('sdemo-live-oysters','Oysters',6,'sam','Approved',{ago:4,note:'Raw bar for the Saturday event.',...approved});
  line('sdemo-live-seabass','Sea bass',4,'sam','Approved',{ago:4,...approved});
  line('sdemo-live-prosecco','Prosecco',2,'noah','Approved',{ago:9,note:'Private event welcome drinks.',...approved});
  line('sdemo-live-sanitizer','Sanitizer concentrate',2,manager,'Approved',{ago:8,...approved});
  // Placed earlier and still on the way.
  for(const [vendor,names,ago] of [['northfield',[['Rib-eye steak',2],['Chicken thighs',1],['Pancetta',1]],20],['valley',[['Burrata',3],['Unsalted butter',1],['Parmesan',2]],18]]){
   const v=st.vendors.find(x=>x.id===vendor);if(!v)continue;
   const id='PO-'+(st.poSeq++),placed=hours(ago),expected=B.stock.nextDelivery(v,new Date(now-ago*3600000))?.date||B.addDays(today,1);
   names.forEach(([name,q],i)=>line(`sdemo-live-${vendor}-${i}`,name,q,manager,'Ordered',{ago:ago+2,po:id,orderedAt:placed,orderedBy:manager,expected,...approved,reviewedAt:placed}));
  }
  // The older sample request already marked ordered joins a numbered PO.
  const labels=s.orders.filter(o=>o.status==='Ordered'&&!o.po);if(labels.length){const id='PO-'+(st.poSeq++);for(const o of labels)Object.assign(o,{po:id,orderedAt:hours(26),orderedBy:manager,expected:B.stock.nextDelivery(st.vendors.find(v=>v.id===o.vendor),new Date(now-26*3600000))?.date||today,at:o.at||hours(30)});}
  // Yesterday's fish delivery came in short, which is why halibut keeps getting 86'd.
  {const id='PO-'+(st.poSeq++),y=B.addDays(today,-1);
   line('sdemo-live-halibut','Halibut fillet',10,'sam','Received',{ago:40,po:id,orderedAt:hours(38),orderedBy:manager,expected:y,receivedQty:4,receivedAt:at(y,'09:20').toISOString(),receivedBy:'sam',deliveryNote:'Only 4 kg of halibut arrived. Dana is crediting the rest and sending 6 kg on the next run.',...approved,reviewedAt:hours(38)});
   line('sdemo-live-mussels','Mussels',6,'sam','Received',{ago:40,po:id,orderedAt:hours(38),orderedBy:manager,expected:y,receivedQty:6,receivedAt:at(y,'09:20').toISOString(),receivedBy:'sam',...approved,reviewedAt:hours(38)});}
  for(const o of s.orders)if(o.item&&!o.at)o.at=hours(30);

  // 3. Last night's closing count: most items near par, some clearly below it.
  const low={'Sparkling mineral water':1,'Cocktail napkins':2,'Espresso beans':2,'Lemons':.5,'Limes':.5,'Burrata':1,'Halibut fillet':4,'Fresh mint':3,'Glass polishing cloths':0,'Arborio rice':1,'Ginger beer':0};
  const counted=at(B.addDays(today,-1),'22:40');
  for(const x of st.items){if(!x.active)continue;const h=hash('count'+x.id);
   if(h%5===0&&!(x.name in low))continue;
   x.onHand=x.name in low?low[x.name]:Math.round(x.par*(1+(h%80)/100)*2)/2;
   x.countedAt=new Date(counted.getTime()+(h%50)*60000).toISOString();x.countedBy=crewFor(x.teams,today,'counter'+x.teams[0]);}
  // Today's halibut 86 points at the short delivery.
  for(const svc of ['Dinner','Lunch']){const id='sdemo-86-halibut-'+svc.toLowerCase();if(s.setup.services.some(v=>v.name===svc&&v.active)&&!s.unavailable.some(x=>x.id===id||(x.date===today&&x.service===svc&&x.item==='st-halibut-fillet')))s.unavailable.push({id,date:today,service:svc,name:'Halibut fillet',reason:'Delivery came in short (4 of 10 kg). Offer the sea bass instead.',area:'Kitchen',author:'sam',status:'Approved',active:true,reviewer:manager,feedback:'',item:'st-halibut-fillet'});}

  s.stockDemo={version:1,anchor:today};
  }
  counts(s,today,now);assignments(s,today,now);s.stockDemo={...s.stockDemo,counts:1,assignments:1};
  B.configure(s);
  if(!B.validState(s)){console.warn('Stock demo content could not be applied.');return {...input,stockDemo:{version:1,anchor:today,skipped:true}};}
  return s;
 }
 B.starter=(...args)=>enrich(B.stock.upgrade(prev.starter(...args)));B.load=storage=>enrich(B.stock.upgrade(prev.load(storage)));
})();
