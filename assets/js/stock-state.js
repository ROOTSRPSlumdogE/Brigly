/* Stock: one catalog of what each team can 86 and order, vendors with delivery days and cut-offs, and purchase orders from crew request to delivery. */
(function(){
 const B=Brigly,prev={starter:B.starter,load:B.load,valid:B.validState,change:B.change};
 const clone=x=>globalThis.Brigly.clone(x);
 const slug=t=>String(t).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
 const txt=(x,max)=>typeof x==='string'&&x.length<=max;
 const label=(x,max=80)=>txt(x,max)&&x.trim().length>0;
 const num=(x,max=100000)=>typeof x==='number'&&Number.isFinite(x)&&x>=0&&x<=max;
 const time=x=>typeof x==='string'&&/^([01]\d|2[0-3]):[0-5]\d$/.test(x);
 const round=n=>Math.round(n*100)/100;
 const open=['Requested','Approved','Ordered'];

 // Starter catalog: category order follows how a walk-through count usually runs, kitchen to bar to floor.
 const CATEGORIES=['Seafood','Meat & poultry','Dairy & eggs','Produce','Bakery','Dry goods','Made in house','Spirits','Wine','Beer & cider','Mixers & soft drinks','Coffee & tea','Disposables','Cleaning & chemicals'];
 const VENDORS=[
  ['harbor','Harbor & Line Seafood','Dana Ortiz','(555) 014-2201','orders@harborline.example',[2,4,6],'14:00',1,250,'HL-20417','Fish is cut to order. Call before 9:00 about shorts.'],
  ['greenleaf','Greenleaf Produce Co.','Marco Silva','(555) 014-3380','orders@greenleaf.example',[1,2,3,4,5,6],'20:00',1,120,'GP-8812',''],
  ['northfield','Northfield Meats','Ruth Okafor','(555) 014-4410','sales@northfieldmeats.example',[1,3,5],'12:00',1,300,'NM-1190','Portion cuts need 48 hours’ notice.'],
  ['valley','Copper Valley Dairy','Ben Hale','(555) 014-5527','dairy@coppervalley.example',[1,3,5],'16:00',1,100,'CV-3305',''],
  ['millstreet','Mill Street Bakery','Ana Brandt','(555) 014-6012','wholesale@millstreet.example',[0,1,2,3,4,5,6],'18:00',1,40,'MS-077','Delivers before 7:00.'],
  ['riverside','Riverside Beverage','Tom Reyes','(555) 014-7720','orders@riversidebev.example',[2,5],'15:00',1,200,'RB-55102','Return empty kegs on delivery.'],
  ['cellar','Cellar & Still Wine and Spirits','Claire Dubois','(555) 014-8834','trade@cellarandstill.example',[3],'17:00',2,350,'CS-6620','Mixed cases allowed above the minimum.'],
  ['metro','Metro Restaurant Supply','Priya Shah','(555) 014-9145','service@metrosupply.example',[4],'12:00',2,150,'MRS-40981','Dry goods, disposables and chemicals.'],
  ['bean','Bean & Leaf Roasters','Hugo Lind','(555) 014-1068','hello@beanandleaf.example',[1,4],'15:00',1,60,'BL-214','']
 ];
 // [name, category, vendor ('' = made in house), teams, order unit, pack, cost per unit, par, storage]
 const ITEMS=[
  ['Halibut fillet','Seafood','harbor',['Kitchen'],'kg','Skin-on, cut to order',38,6,'Walk-in cooler'],
  ['Sea bass','Seafood','harbor',['Kitchen'],'kg','Whole, gutted',29,5,'Walk-in cooler'],
  ['Oysters','Seafood','harbor',['Kitchen'],'dozen','Kumamoto',24,8,'Walk-in cooler'],
  ['Mussels','Seafood','harbor',['Kitchen'],'kg','Rope-grown',9,6,'Walk-in cooler'],
  ['Salmon side','Seafood','harbor',['Kitchen'],'kg','Pin-boned',26,4,'Walk-in cooler'],
  ['Rib-eye steak','Meat & poultry','northfield',['Kitchen'],'case','10 × 300 g',165,2,'Walk-in cooler'],
  ['Chicken thighs','Meat & poultry','northfield',['Kitchen'],'case','5 kg, boneless',48,2,'Walk-in cooler'],
  ['Whole chickens','Meat & poultry','northfield',['Kitchen'],'case','6 birds',72,2,'Walk-in cooler'],
  ['Lamb shoulder','Meat & poultry','northfield',['Kitchen'],'kg','Bone-in',21,4,'Walk-in cooler'],
  ['Pancetta','Meat & poultry','northfield',['Kitchen'],'kg','Sliced',24,2,'Walk-in cooler'],
  ['Burrata','Dairy & eggs','valley',['Kitchen'],'case','6 × 125 g',42,3,'Walk-in cooler'],
  ['Heavy cream','Dairy & eggs','valley',['Kitchen'],'case','6 × 1 L',27,2,'Walk-in cooler'],
  ['Unsalted butter','Dairy & eggs','valley',['Kitchen'],'case','20 × 250 g',64,2,'Walk-in cooler'],
  ['Parmesan','Dairy & eggs','valley',['Kitchen'],'kg','24-month wheel cut',31,2,'Walk-in cooler'],
  ['Free-range eggs','Dairy & eggs','valley',['Kitchen'],'tray','30 eggs',11,4,'Walk-in cooler'],
  ['Whole milk','Dairy & eggs','valley',['Kitchen','Bar'],'crate','6 × 2 L',15,3,'Walk-in cooler'],
  ['Oat milk','Dairy & eggs','valley',['Bar'],'case','12 × 1 L barista',30,2,'Bar back'],
  ['Delicata squash','Produce','greenleaf',['Kitchen'],'case','10 kg',34,2,'Walk-in cooler'],
  ['Heirloom tomatoes','Produce','greenleaf',['Kitchen'],'case','5 kg',28,2,'Walk-in cooler'],
  ['Mixed salad leaves','Produce','greenleaf',['Kitchen'],'case','2 kg',22,3,'Walk-in cooler'],
  ['Wild mushrooms','Produce','greenleaf',['Kitchen'],'kg','Chanterelle & oyster mix',24,3,'Walk-in cooler'],
  ['Shallots','Produce','greenleaf',['Kitchen'],'sack','5 kg',14,1,'Dry storage'],
  ['Fresh herbs','Produce','greenleaf',['Kitchen'],'box','Thyme, sage & rosemary',16,2,'Walk-in cooler'],
  ['Lemons','Produce','greenleaf',['Kitchen','Bar'],'case','80 count',38,2,'Walk-in cooler'],
  ['Limes','Produce','greenleaf',['Bar','Kitchen'],'case','100 count',42,2,'Bar back'],
  ['Fresh mint','Produce','greenleaf',['Bar'],'bunch','Large',1.8,12,'Bar back'],
  ['Honeycrisp apples','Produce','greenleaf',['Bar','Kitchen'],'case','40 count',36,1,'Walk-in cooler'],
  ['Brioche buns','Bakery','millstreet',['Kitchen'],'tray','24 buns',14,2,'Dry storage'],
  ['Focaccia slabs','Bakery','millstreet',['Kitchen'],'tray','4 slabs',18,2,'Dry storage'],
  ['Arborio rice','Dry goods','metro',['Kitchen'],'bag','5 kg',17,2,'Dry storage'],
  ['Tipo 00 flour','Dry goods','metro',['Kitchen'],'bag','25 kg',29,1,'Dry storage'],
  ['Extra virgin olive oil','Dry goods','metro',['Kitchen'],'tin','5 L',46,2,'Dry storage'],
  ['Fryer oil','Dry goods','metro',['Kitchen'],'jug','20 L',39,2,'Dry storage'],
  ['Dark chocolate 70%','Dry goods','metro',['Kitchen'],'bag','2.5 kg callets',41,1,'Dry storage'],
  ['Hazelnuts','Dry goods','metro',['Kitchen'],'bag','1 kg, roasted',18,1,'Dry storage'],
  ['House sourdough','Made in house','',['Kitchen'],'loaf','Two bakes daily',0,12,'Pastry station'],
  ['Chocolate tart','Made in house','',['Kitchen'],'tart','10 portions',0,2,'Pastry station'],
  ['Fresh pappardelle','Made in house','',['Kitchen'],'batch','40 portions',0,1,'Walk-in cooler'],
  ['Orchard old fashioned batch','Made in house','',['Bar'],'batch','2 L',0,1,'Bar back'],
  ['House bourbon','Spirits','cellar',['Bar'],'case','6 × 1 L',162,1,'Bar back'],
  ['London dry gin','Spirits','cellar',['Bar'],'case','6 × 1 L',138,1,'Bar back'],
  ['Vodka','Spirits','cellar',['Bar'],'case','6 × 1 L',120,1,'Bar back'],
  ['Blanco tequila','Spirits','cellar',['Bar'],'case','6 × 750 ml',174,1,'Bar back'],
  ['Amaro','Spirits','cellar',['Bar'],'bottle','700 ml',32,2,'Bar back'],
  ['Aromatic bitters','Spirits','cellar',['Bar'],'bottle','200 ml',12,3,'Bar back'],
  ['House red','Wine','cellar',['Bar'],'case','12 × 750 ml Côtes du Rhône',156,2,'Wine cellar'],
  ['House white','Wine','cellar',['Bar'],'case','12 × 750 ml Sauvignon blanc',144,2,'Wine cellar'],
  ['Rosé','Wine','cellar',['Bar'],'case','12 × 750 ml',150,1,'Wine cellar'],
  ['Prosecco','Wine','cellar',['Bar'],'case','6 × 750 ml',78,2,'Wine cellar'],
  ['Draught pale ale','Beer & cider','riverside',['Bar'],'keg','30 L',145,2,'Beer cooler'],
  ['Draught lager','Beer & cider','riverside',['Bar'],'keg','30 L',120,2,'Beer cooler'],
  ['Bottled lager','Beer & cider','riverside',['Bar'],'case','24 × 330 ml',36,3,'Beer cooler'],
  ['Dry cider','Beer & cider','riverside',['Bar'],'case','24 × 330 ml',42,1,'Beer cooler'],
  ['Fever-Tree tonic','Mixers & soft drinks','riverside',['Bar'],'case','24 × 200 ml',26,4,'Bar back'],
  ['Soda water','Mixers & soft drinks','riverside',['Bar'],'case','24 × 200 ml',14,3,'Bar back'],
  ['Ginger beer','Mixers & soft drinks','riverside',['Bar'],'case','24 × 200 ml',27,2,'Bar back'],
  ['Cola','Mixers & soft drinks','riverside',['Bar','Floor'],'case','24 × 330 ml',19,2,'Bar back'],
  ['Still mineral water','Mixers & soft drinks','riverside',['Floor','Bar'],'case','12 × 750 ml',18,4,'Front of house'],
  ['Sparkling mineral water','Mixers & soft drinks','riverside',['Floor','Bar'],'case','12 × 750 ml',18,4,'Front of house'],
  ['Espresso beans','Coffee & tea','bean',['Bar'],'bag','1 kg',28,6,'Bar back'],
  ['Decaf espresso beans','Coffee & tea','bean',['Bar'],'bag','1 kg',30,2,'Bar back'],
  ['Loose-leaf tea selection','Coffee & tea','bean',['Bar','Floor'],'box','6 tins',54,1,'Bar back'],
  ['Cocktail napkins','Disposables','metro',['Bar','Floor'],'pack','500 count',9,6,'Supply closet'],
  ['Dinner candles','Disposables','metro',['Floor'],'box','24 count',21,3,'Supply closet'],
  ['Takeaway boxes','Disposables','metro',['Floor','Kitchen'],'case','200 count',44,1,'Supply closet'],
  ['Paper straws','Disposables','metro',['Bar'],'box','500 count',11,2,'Supply closet'],
  ['Receipt paper rolls','Disposables','metro',['Floor','Bar'],'box','50 rolls',27,1,'Supply closet'],
  ['Kids’ crayons','Disposables','metro',['Floor'],'pack','100 count',12,1,'Front of house'],
  ['Day-dot labels','Disposables','metro',['Kitchen'],'roll','1,000 count',8,4,'Supply closet'],
  ['Nitrile gloves · medium','Disposables','metro',['Kitchen','Bar'],'box','100 count',9,6,'Supply closet'],
  ['Cling film','Disposables','metro',['Kitchen'],'roll','300 m',14,2,'Supply closet'],
  ['Sanitizer concentrate','Cleaning & chemicals','metro',['Kitchen','Bar','Floor'],'jug','5 L',34,2,'Supply closet'],
  ['Glass polishing cloths','Cleaning & chemicals','metro',['Bar','Floor'],'pack','12 count',15,2,'Supply closet'],
  ['Hand soap refills','Cleaning & chemicals','metro',['Floor'],'case','6 × 1 L',29,1,'Supply closet'],
  ['Dishwasher detergent','Cleaning & chemicals','metro',['Kitchen'],'drum','20 L',68,1,'Supply closet'],
  ['Beer line cleaner','Cleaning & chemicals','metro',['Bar'],'jug','5 L',31,1,'Supply closet']
 ];
 // Names people have used on the 86 board before the stock list existed.
 const ALIASES={'fresh oysters':'Oysters','decaf beans':'Decaf espresso beans','roasted squash':'Delicata squash'};

 function catalog(s){
  const areas=s.setup.areas;
  return {version:1,categories:[...CATEGORIES],poSeq:1040,counts:[],assignments:[],
   vendors:VENDORS.map(([id,name,contact,phone,email,days,cutoff,lead,minimum,account,note])=>({id,name,contact,phone,email,days,cutoff,lead,minimum,account,note,active:true})),
   items:ITEMS.map(([name,category,vendor,teams,unit,pack,cost,par,location])=>{let t=teams.filter(a=>areas.includes(a));if(!t.length)t=[areas[0]];return {id:'st-'+slug(name),name,category,vendor,teams:t,unit,pack,cost,par,onHand:null,countedAt:'',countedBy:'',location,sku:'',active:true};})};
 }
 function byName(s,name){
  if(typeof name!=='string'||!name.trim())return null;
  const n=name.trim().toLowerCase(),target=(ALIASES[n]||n).toLowerCase();
  return s.stock.items.find(i=>i.name.toLowerCase()===target)||null;
 }
 // Links older supply requests and 86 records to stock items by name. Records that don't match stay as free text.
 function link(s){
  for(const o of s.orders)if(o.item===undefined){const it=byName(s,o.name);o.item=it?.id||'';o.vendor=it?.vendor||'';o.cost=it?.cost??0;o.at??='';}
  for(const x of s.unavailable)if(x.item===undefined)x.item=byName(s,x.name)?.id||'';
 }
 function upgrade(state){
  const s=clone(state);if(!s?.setup||!Array.isArray(s.orders)||!Array.isArray(s.unavailable))return s;
  s.stock??=catalog(s);s.stock.counts??=[];s.stock.assignments??=[];link(s);return s;
 }
 function validStock(s){
  const st=s.stock,areas=s.setup.areas,person=id=>s.team.some(p=>p.id===id);
  if(!st||st.version!==1||!Number.isInteger(st.poSeq)||!Array.isArray(st.categories)||!Array.isArray(st.vendors)||!Array.isArray(st.items))return false;
  if(!st.categories.every(c=>label(c))||new Set(st.categories.map(c=>c.toLowerCase())).size!==st.categories.length)return false;
  const vendorIds=new Set(st.vendors.map(v=>v.id)),itemIds=new Set(st.items.map(i=>i.id));
  if(vendorIds.size!==st.vendors.length||itemIds.size!==st.items.length)return false;
  if(!st.vendors.every(v=>/^[\w-]{1,100}$/.test(v.id)&&label(v.name)&&txt(v.contact,80)&&txt(v.phone,40)&&txt(v.email,120)&&Array.isArray(v.days)&&v.days.every(d=>Number.isInteger(d)&&d>=0&&d<=6)&&new Set(v.days).size===v.days.length&&time(v.cutoff)&&Number.isInteger(v.lead)&&v.lead>=0&&v.lead<=7&&num(v.minimum)&&txt(v.account,60)&&txt(v.note,500)&&typeof v.active==='boolean'))return false;
  if(!st.items.every(i=>/^[\w-]{1,100}$/.test(i.id)&&label(i.name,100)&&st.categories.includes(i.category)&&(i.vendor===''||vendorIds.has(i.vendor))&&Array.isArray(i.teams)&&i.teams.length&&i.teams.every(t=>areas.includes(t))&&new Set(i.teams).size===i.teams.length&&label(i.unit,40)&&txt(i.pack,80)&&num(i.cost)&&num(i.par)&&(i.onHand===null||num(i.onHand))&&txt(i.countedAt,40)&&(i.countedBy===''||person(i.countedBy))&&txt(i.location,60)&&txt(i.sku,60)&&typeof i.active==='boolean'))return false;
  // Count sessions: one open sheet per team at a time; submitted ones keep what was counted, expected and used.
  const usedOk=x=>x===undefined||x===null||(typeof x==='number'&&Number.isFinite(x));
  if(!Array.isArray(st.counts)||st.counts.length>5000||new Set(st.counts.map(c=>c.id)).size!==st.counts.length)return false;
  if(!st.counts.every(c=>/^[\w-]{1,100}$/.test(c.id)&&areas.includes(c.team)&&person(c.startedBy)&&txt(c.startedAt,40)&&['Open','Submitted'].includes(c.status)&&txt(c.note,500)&&c.entries&&typeof c.entries==='object'&&!Array.isArray(c.entries)&&Object.entries(c.entries).every(([id,x])=>itemIds.has(id)&&x&&num(x.qty)&&person(x.by)&&(x.expected===undefined||x.expected===null||num(x.expected))&&usedOk(x.used))&&(c.status==='Open'||(txt(c.submittedAt,40)&&person(c.submittedBy)&&num(c.value,100000000)))))return false;
  // Count assignments: a team, a person (or the whole team), a due date and an optional weekly repeat.
  if(!Array.isArray(st.assignments)||st.assignments.length>5000||new Set(st.assignments.map(x=>x.id)).size!==st.assignments.length)return false;
  if(!st.assignments.every(x=>/^[\w-]{1,120}$/.test(x.id)&&/^[\w-]{1,100}$/.test(x.series)&&areas.includes(x.team)&&(x.assignee===''||person(x.assignee))&&B.isDate(x.date)&&txt(x.note,300)&&['','weekly'].includes(x.repeat)&&person(x.by)&&txt(x.at,40)&&['Open','Done','Cancelled'].includes(x.status)&&(x.status!=='Done'||(txt(x.doneAt,40)&&person(x.doneBy)))))return false;
  if(new Set(st.counts.filter(c=>c.status==='Open').map(c=>c.team)).size!==st.counts.filter(c=>c.status==='Open').length)return false;
  if(!s.orders.every(o=>typeof o.item==='string'&&(o.item===''||itemIds.has(o.item))&&typeof o.vendor==='string'&&(o.vendor===''||vendorIds.has(o.vendor))&&num(o.cost)&&txt(o.at,40)&&(o.po===undefined||txt(o.po,20))&&(!o.expected||B.isDate(o.expected))&&(o.receivedQty===undefined||num(o.receivedQty))&&(o.deliveryNote===undefined||txt(o.deliveryNote,500))))return false;
  return s.unavailable.every(x=>x.item===undefined||x.item===''||itemIds.has(x.item));
 }
 function valid(s){try{s=upgrade(s);return prev.valid(s)&&validStock(s);}catch{return false;}}

 // Teams a person works for on this service: their home station plus any station they're rostered on.
 function teams(s,person,date=s.date,service=s.service){
  const p=s.team.find(x=>x.id===person);if(!p)return [];if(p.access==='manager')return [...s.setup.areas];
  return [...new Set([p.area,...s.shifts.filter(x=>x.person===person&&x.date===date&&x.service===service).map(x=>x.area)])].filter(a=>s.setup.areas.includes(a));
 }
 const canUse=(s,item,role=s.role,date=s.date,service=s.service)=>role==='manager'||item.teams.some(t=>teams(s,B.actor(role,s.crewId,s.managerId),date,service).includes(t));
 const dayStart=date=>new Date(date+'T00:00:00');
 // The earliest delivery still reachable: delivery day minus lead days, at the vendor's cut-off time.
 function nextDelivery(v,now=new Date()){
  if(!v?.days?.length)return null;
  const today=B.dateString(now);
  for(let k=0;k<=21;k++){
   const date=B.addDays(today,k);if(!v.days.includes(dayStart(date).getDay()))continue;
   const by=new Date(B.addDays(date,-v.lead)+'T'+v.cutoff+':00');
   if(by.getTime()>now.getTime())return {date,orderBy:by};
  }
  return null;
 }
 const lineTotal=o=>round(o.quantity*(o.cost||0));
 const openLines=(s,itemId)=>s.orders.filter(o=>o.item===itemId&&open.includes(o.status));

 function change(state,action,role=state.role){
  let s=upgrade(state);const a=clone(action);
  if(!a?.type?.startsWith('stock:')){
   if(a?.type==='ops:remove-catalog'&&a.catalog==='areas'&&s.stock.items.some(i=>i.teams.includes(a.name)))throw Error('Stock items are assigned to this station. Change their teams first.');
   const renamed=a?.type==='ops:catalog'&&a.catalog==='areas'&&a.oldName?a.oldName:'';
   s=upgrade(prev.change(s,a,role));
   if(renamed&&renamed!==a.name){for(const i of s.stock.items)i.teams=i.teams.map(t=>t===renamed?a.name:t);for(const c of [...s.stock.counts,...s.stock.assignments])if(c.team===renamed)c.team=a.name;}
   if(!valid(s))throw Error('Check the stock details.');return s;
  }
  const me=B.actor(role,s.crewId,s.managerId),manager=role==='manager',viewer=s.team.find(p=>p.id===me);
  if(!viewer?.active||viewer.access!==role)throw Error('Choose an active team member.');
  const needManager=()=>{if(!manager)throw Error('Only managers can make this change.');};
  const now=new Date().toISOString(),st=s.stock;
  const item=id=>{const x=st.items.find(i=>i.id===id);if(!x)throw Error('This stock item no longer exists.');return x;};
  const order=id=>{const o=s.orders.find(x=>x.id===id);if(!o)throw Error('This order line no longer exists.');return o;};
  const vendor=id=>{const v=st.vendors.find(x=>x.id===id);if(!v)throw Error('This vendor no longer exists.');return v;};
  const allowed=(x,date,service)=>{if(!canUse(s,x,role,date,service))throw Error(`Only ${x.teams.join(' / ')} crew or a manager can do this for ${x.name}.`);};
  const teamFor=(x,date,service)=>teams(s,me,date,service).find(t=>x.teams.includes(t))||x.teams[0];
  const qty=n=>{if(!Number.isInteger(n)||n<1||n>10000)throw Error('Enter a whole quantity between 1 and 10,000.');return n;};
  const session=id=>{const c=st.counts.find(x=>x.id===id);if(!c)throw Error('This count no longer exists.');return c;};
  // Someone assigned to count another team's stock may do that count.
  const mayCount=team=>manager||teams(s,me).includes(team)||st.assignments.some(x=>x.status==='Open'&&x.team===team&&x.assignee===me);
  const counter=c=>{if(c.status!=='Open')throw Error('This count was already finished.');if(!mayCount(c.team))throw Error(`Only ${c.team} crew or a manager can work on this count.`);};

  if(a.type==='stock:item'){
   needManager();
   if(!label(a.name,100))throw Error('Give the item a name (up to 100 characters).');
   const category=typeof a.category==='string'?a.category.trim():'';
   if(!label(category))throw Error('Choose or type a category.');
   const known=st.categories.find(c=>c.toLowerCase()===category.toLowerCase());if(!known)st.categories.push(category);
   if(a.vendor)vendor(a.vendor);
   const teamList=[...new Set(Array.isArray(a.teams)?a.teams:[])].filter(t=>s.setup.areas.includes(t));
   if(!teamList.length)throw Error('Choose at least one team that can 86 and order this item.');
   if(!label(a.unit,40))throw Error('Enter the order unit, e.g. case, kg or bottle.');
   if(!num(a.cost)||!num(a.par))throw Error('Enter a valid unit cost and par level.');
   if(st.items.some(i=>i.id!==a.id&&i.name.toLowerCase()===a.name.trim().toLowerCase()))throw Error('Another stock item already has that name.');
   const old=st.items.find(i=>i.id===a.id);
   const next={id:old?.id||a.id,name:a.name.trim(),category:known||category,vendor:a.vendor||'',teams:teamList,unit:a.unit.trim(),pack:String(a.pack||'').trim().slice(0,80),cost:round(a.cost),par:round(a.par),onHand:old?.onHand??null,countedAt:old?.countedAt||'',countedBy:old?.countedBy||'',location:String(a.location||'').trim().slice(0,60),sku:String(a.sku||'').trim().slice(0,60),active:a.active!==false};
   if(!/^[\w-]{1,100}$/.test(next.id))throw Error('This item could not be saved.');
   if(old)Object.assign(old,next);else st.items.push(next);
  }else if(a.type==='stock:vendor'){
   needManager();
   if(!label(a.name))throw Error('Give the vendor a name.');
   const days=[...new Set(Array.isArray(a.days)?a.days.map(Number):[])].filter(d=>Number.isInteger(d)&&d>=0&&d<=6).sort();
   if(!days.length)throw Error('Choose at least one delivery day.');
   if(!time(a.cutoff)||!Number.isInteger(a.lead)||a.lead<0||a.lead>7||!num(a.minimum))throw Error('Check the order cut-off, lead days and minimum order.');
   if(st.vendors.some(v=>v.id!==a.id&&v.name.toLowerCase()===a.name.trim().toLowerCase()))throw Error('Another vendor already has that name.');
   const old=st.vendors.find(v=>v.id===a.id);
   if(old&&a.active===false&&s.orders.some(o=>o.vendor===old.id&&['Approved','Ordered'].includes(o.status)))throw Error('Place or receive this vendor’s open orders before archiving it.');
   const next={id:old?.id||a.id,name:a.name.trim(),contact:String(a.contact||'').trim().slice(0,80),phone:String(a.phone||'').trim().slice(0,40),email:String(a.email||'').trim().slice(0,120),days,cutoff:a.cutoff,lead:a.lead,minimum:round(a.minimum),account:String(a.account||'').trim().slice(0,60),note:String(a.note||'').trim().slice(0,500),active:a.active!==false};
   if(!/^[\w-]{1,100}$/.test(next.id))throw Error('This vendor could not be saved.');
   if(old)Object.assign(old,next);else st.vendors.push(next);
  }else if(a.type==='stock:count'){
   const x=item(a.id);allowed(x,s.date,s.service);
   if(a.onHand===null||a.onHand==='')x.onHand=null;
   else if(num(a.onHand))x.onHand=round(a.onHand);
   else throw Error('Enter what is on the shelf, or leave it blank.');
   x.countedAt=now;x.countedBy=me;
  }else if(a.type==='stock:request'){
   const lines=Array.isArray(a.lines)?a.lines:[];
   if(!lines.length||lines.length>60)throw Error('Add at least one item to the request.');
   if(typeof a.id!=='string'||!/^[\w-]{1,80}$/.test(a.id))throw Error('This request could not be sent.');
   const note=typeof a.note==='string'?a.note.trim():'';if(note.length>500)throw Error('Keep the note under 500 characters.');
   for(const [i,line] of lines.entries()){
    const x=item(line.item),q=qty(line.quantity);
    if(!x.active)throw Error(`${x.name} is archived.`);
    allowed(x,s.date,s.service);
    if(!x.vendor)throw Error(`${x.name} is made in house. It can be 86’d but not ordered.`);
    const status=manager?'Approved':'Requested';
    // One open line per item and requester keeps the order sheet tidy.
    const same=s.orders.find(o=>o.item===x.id&&o.author===me&&o.status===status&&o.vendor===x.vendor);
    if(same){same.quantity=Math.min(10000,same.quantity+q);if(note&&!same.note.includes(note))same.note=(same.note?same.note+' · ':'')+note;continue;}
    const id=a.id+'-'+i;if(s.orders.some(o=>o.id===id))throw Error('This request was already sent.');
    s.orders.push({id,name:x.name,quantity:q,unit:x.unit,area:teamFor(x,s.date,s.service),note,author:me,status,feedback:'',item:x.id,vendor:x.vendor,cost:x.cost,at:now,...(manager?{reviewer:me,reviewedAt:now}:{})});
   }
  }else if(a.type==='stock:review'){
   needManager();
   const ids=Array.isArray(a.ids)?a.ids:[];if(!ids.length)throw Error('Nothing to review.');
   if(!['Approved','Declined'].includes(a.status))throw Error('Choose approve or decline.');
   const feedback=typeof a.feedback==='string'?a.feedback.trim():'';
   if(a.status==='Declined'&&!feedback)throw Error('Add a short reason so the crew knows why.');
   if(feedback.length>500)throw Error('Keep the reason under 500 characters.');
   for(const id of ids){
    const o=order(id);if(o.status!=='Requested')throw Error('This request was already reviewed.');
    if(a.status==='Approved'&&!o.vendor)throw Error(`${o.name} has no vendor. Link it to a stock item first.`);
    o.status=a.status;o.feedback=feedback;o.reviewer=me;o.reviewedAt=now;
   }
  }else if(a.type==='stock:qty'){
   const o=order(a.id),q=qty(a.quantity);
   if(manager?!['Requested','Approved'].includes(o.status):(o.author!==me||o.status!=='Requested'))throw Error('This line can no longer be changed.');
   o.quantity=q;
  }else if(a.type==='stock:cancel'){
   const o=order(a.id);
   if(manager?!['Requested','Approved'].includes(o.status):(o.author!==me||o.status!=='Requested'))throw Error('This line can no longer be withdrawn.');
   o.status='Cancelled';o.feedback=o.author===me?'Withdrawn by the requester.':'Removed from the order sheet.';o.reviewer=me;o.reviewedAt=now;
  }else if(a.type==='stock:place'){
   needManager();const v=vendor(a.vendor);
   const lines=s.orders.filter(o=>o.vendor===v.id&&o.status==='Approved'&&(!Array.isArray(a.ids)||a.ids.includes(o.id)));
   if(!lines.length)throw Error('There is nothing approved to order from '+v.name+'.');
   const po='PO-'+(st.poSeq++),expected=nextDelivery(v)?.date||'';
   for(const o of lines)Object.assign(o,{status:'Ordered',po,orderedAt:now,orderedBy:me,expected});
  }else if(a.type==='stock:receive'){
   const lines=s.orders.filter(o=>o.status==='Ordered'&&(o.po||'vendor:'+o.vendor)===a.po);
   if(!lines.length)throw Error('This delivery was already received.');
   if(!manager&&!lines.some(o=>o.item&&canUse(s,item(o.item),role)))throw Error('Only the receiving team or a manager can check in this delivery.');
   const note=typeof a.note==='string'?a.note.trim():'';if(note.length>500)throw Error('Keep the delivery note under 500 characters.');
   for(const o of lines){
    const got=a.received&&Object.hasOwn(a.received,o.id)?a.received[o.id]:o.quantity;
    if(!num(got,o.quantity*10))throw Error('Enter what arrived for '+o.name+'.');
    Object.assign(o,{status:'Received',receivedQty:round(got),receivedAt:now,receivedBy:me});if(note)o.deliveryNote=note;
    const x=st.items.find(i=>i.id===o.item);if(x&&x.onHand!==null)x.onHand=round(x.onHand+got);
   }
  }else if(a.type==='stock:count-start'){
   if(!s.setup.areas.includes(a.team))throw Error('Choose a team to count.');
   if(!mayCount(a.team))throw Error('You can only count your own team’s stock, or a count you’re assigned to.');
   if(st.counts.some(c=>c.status==='Open'&&c.team===a.team))throw Error(`A ${a.team} count is already in progress. Continue that one.`);
   if(typeof a.id!=='string'||!/^[\w-]{1,80}$/.test(a.id)||st.counts.some(c=>c.id===a.id))throw Error('This count could not be started.');
   st.counts.push({id:a.id,team:a.team,startedBy:me,startedAt:now,status:'Open',entries:{},note:''});
  }else if(a.type==='stock:count-entry'){
   const c=session(a.id);counter(c);const x=item(a.item);
   if(!x.teams.includes(c.team))throw Error(`${x.name} isn’t on the ${c.team} count sheet.`);
   if(a.qty===null||a.qty==='')delete c.entries[x.id];
   else if(num(a.qty))c.entries[x.id]={qty:round(a.qty),by:me};
   else throw Error('Enter what is on the shelf, or leave it blank.');
  }else if(a.type==='stock:count-submit'){
   const c=session(a.id);counter(c);
   if(!Object.keys(c.entries).length)throw Error('Count at least one item before finishing.');
   const note=typeof a.note==='string'?a.note.trim():'';if(note.length>500)throw Error('Keep the note under 500 characters.');
   let value=0;
   // Expected is what the system thought was there (last count plus deliveries checked in since); the gap is usage.
   for(const [id,x] of Object.entries(c.entries)){const it=item(id);x.expected=it.onHand;x.used=it.onHand===null?null:round(it.onHand-x.qty);it.onHand=x.qty;it.countedAt=now;it.countedBy=x.by;value+=x.qty*it.cost;}
   Object.assign(c,{status:'Submitted',submittedAt:now,submittedBy:me,note,value:round(value)});
   // A finished count completes this team's assignments due by tomorrow; weekly ones roll on to their next date.
   const today=B.dateString(new Date());
   for(const x of st.assignments.filter(x=>x.status==='Open'&&x.team===c.team&&x.date<=B.addDays(today,1))){
    Object.assign(x,{status:'Done',doneAt:now,doneBy:me,countId:c.id});
    if(x.repeat!=='weekly')continue;
    let next=B.addDays(x.date,7);while(next<=today)next=B.addDays(next,7);
    const id=x.series+'-'+next.replace(/-/g,'');
    if(!st.assignments.some(y=>y.id===id))st.assignments.push({id,series:x.series,team:x.team,assignee:x.assignee,date:next,note:x.note,repeat:'weekly',by:x.by,at:now,status:'Open'});
   }
  }else if(a.type==='stock:count-discard'){
   const c=session(a.id);if(c.status!=='Open')throw Error('Finished counts stay in the history.');
   if(!manager&&c.startedBy!==me)throw Error('Only the person who started this count or a manager can discard it.');
   st.counts=st.counts.filter(x=>x!==c);
  }else if(a.type==='stock:assign'){
   needManager();
   if(!s.setup.areas.includes(a.team))throw Error('Choose the team to count.');
   if(a.assignee&&!s.team.some(p=>p.id===a.assignee&&p.active))throw Error('Choose an active team member, or the whole team.');
   if(!B.isDate(a.date))throw Error('Choose a due date.');
   const note=typeof a.note==='string'?a.note.trim():'';if(note.length>300)throw Error('Keep the note under 300 characters.');
   if(!['','weekly'].includes(a.repeat||''))throw Error('Choose how often this count repeats.');
   const old=st.assignments.find(x=>x.id===a.id);
   if(old&&old.status!=='Open')throw Error('This count is already done.');
   if(!old&&a.date<B.dateString(new Date()))throw Error('Pick today or a later date.');
   if(typeof a.id!=='string'||!/^[\w-]{1,100}$/.test(a.id))throw Error('This assignment could not be saved.');
   const next={id:a.id,series:old?.series||a.id,team:a.team,assignee:a.assignee||'',date:a.date,note,repeat:a.repeat||'',by:old?.by||me,at:old?.at||now,status:'Open'};
   if(old)Object.assign(old,next);else st.assignments.push(next);
  }else if(a.type==='stock:assign-cancel'){
   needManager();const x=st.assignments.find(y=>y.id===a.id);
   if(!x||x.status!=='Open')throw Error('This count is no longer scheduled.');
   x.status='Cancelled';
  }else if(a.type==='stock:alert'){
   const date=a.date||s.date,service=a.service||s.service,x=item(a.item);allowed(x,date,service);
   if(s.unavailable.some(u=>u.id!==a.id&&u.item===x.id&&u.date===date&&u.service===service&&['Reported','Approved'].includes(u.status)))throw Error(`${x.name} is already on the 86 board for this service.`);
   s=upgrade(prev.change(s,{type:'ops:alert',id:a.id,date,service,name:x.name,reason:String(a.reason||''),area:teamFor(x,date,service),sub:a.sub},role));
   s.unavailable.find(u=>u.id===a.id).item=x.id;
   if(Number(a.restock)>0){
    if(!x.vendor)throw Error(`${x.name} is made in house, so there is nothing to reorder.`);
    s=change(s,{type:'stock:request',id:String(a.id).replace(/[^\w-]/g,'').slice(0,60)+'-restock',lines:[{item:x.id,quantity:Number(a.restock)}],note:'Restock after the 86 on '+date+' · '+service},role);
   }
  }else throw Error('Unknown stock action.');
  if(!valid(s))throw Error('Check the stock details.');return s;
 }
 // Latest finished count for a team, and whether a weekly count is due.
 function lastCount(s,team){return s.stock.counts.filter(c=>c.team===team&&c.status==='Submitted').sort((a,b)=>b.submittedAt.localeCompare(a.submittedAt))[0]||null;}
 function countDue(s,team,now=Date.now()){const last=lastCount(s,team);return !last||(now-new Date(last.submittedAt).getTime())/864e5>=7;}
 // Open count assignments a person should see: everything for managers; for crew, their own and their team's.
 function assignedTo(s,person,role){
  const open=(s.stock.assignments||[]).filter(x=>x.status==='Open').sort((a,b)=>a.date.localeCompare(b.date));
  if(role==='manager')return open;
  const mine=teams(s,person);return open.filter(x=>x.assignee===person||(x.assignee===''&&mine.includes(x.team)));
 }
 B.stock={upgrade,catalog,teams,canUse,nextDelivery,lineTotal,openLines,round,byName,lastCount,countDue,assignedTo};
 B.starter=(...args)=>upgrade(prev.starter(...args));B.validState=valid;B.change=change;
 B.load=storage=>{try{
  const s=upgrade(prev.load(storage));if(valid(s))return s;
  // A stock list that no longer fits the workspace (e.g. stations were edited elsewhere) is rebuilt rather than losing everything else.
  s.stock=catalog(s);for(const o of s.orders)if(o.item&&!s.stock.items.some(i=>i.id===o.item))o.item='';for(const x of s.unavailable)if(x.item&&!s.stock.items.some(i=>i.id===x.item))x.item='';
  if(valid(s))return s;
 }catch{}return B.starter();};
})();
