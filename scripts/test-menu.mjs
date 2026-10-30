import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const load=files=>{const c=vm.createContext({crypto,console,document:{addEventListener(){},getElementById(){return null;},querySelector(){return null;},querySelectorAll(){return [];}},window:{scrollTo(){},print(){}},requestAnimationFrame(){},performance,navigator:{}});for(const f of files)vm.runInContext(readFileSync(new URL('../assets/js/'+f+'.js',import.meta.url),'utf8'),c);return c;};
const core=['workspace-state','schedule-state','shift-operations-state','demo-history','restaurant-history','planner-state','duties-state','checklist-history','team-chat-state','stock-state','checklist-demo','stock-demo','manage-state','payroll-state','writeups-state','business-state','training-state','floor-state','menu-state','pos-state','pos-demo'];
const c=load([...core,'app-navigation','menu-ui']),B=c.Brigly,M=B.menu,N=c.BriglyNavigation,store={v:null,getItem(){return this.v},setItem(k,v){this.v=v}};
const as=(s,role,id)=>({...s,role,...(role==='crew'?{crewId:id}:{managerId:id})});
const fails=(fn,re)=>assert.throws(fn,err=>re.test(err.message),'expected '+re);
const same=(a,b)=>assert.equal(JSON.stringify(a),JSON.stringify(b));
const today=B.dateString(new Date());

// Every workspace gets a menu built on the stock list: recipes point at real stock items, allergens follow the ingredients, and cost comes from stock prices.
let s=B.load(store);assert(B.validState(s));
assert(s.menu.items.length>=40&&s.menu.categories.length>=10&&s.menu.modifiers.length>=5);
const stockIds=new Set(s.stock.items.map(i=>i.id));assert(s.menu.items.every(i=>i.recipe.every(r=>stockIds.has(r.item))),'recipes only use stock items');
const burrata=M.item(s,'mi-burrata-heirloom-tomatoes'),hal=M.item(s,'mi-pan-roasted-halibut');
assert(M.allergens(s,burrata).includes('Milk')&&M.allergens(s,burrata).includes('Gluten'),'allergens derive from ingredients');
same(M.allergens(s,hal),['Fish','Milk']);
const mg=M.margin(s,hal);assert(mg.cost>6&&mg.cost<9,'halibut portion cost '+mg.cost);assert(mg.costPct>0&&mg.margin>0);
// The starter 86s (burrata, tonight's halibut) take their dishes off the menu.
const outs=M.outs(s,s.date,'Dinner');assert(outs.off.some(i=>i.id==='mi-burrata-heirloom-tomatoes'&&i.availability.status==='ingredient'),'an 86’d ingredient takes the dish off');
const safe=M.safeFor(s,['Milk','Gluten']);assert(safe.length>5&&safe.every(i=>!i.allergenList.includes('Milk')&&!i.allergenList.includes('Gluten')));assert(!safe.some(i=>i.id==='mi-burrata-heirloom-tomatoes'));
assert.equal(M.matrix(s)[0].cells.length,M.ALLERGENS.length);
assert(M.byCategory(s).length>=8&&M.list(s,{query:'fish'}).some(i=>i.id==='mi-pan-roasted-halibut'),'search finds dishes by allergen');
console.log('PASS: seeded menu, recipes on stock items, derived allergens, cost, availability from the 86 board, allergen finder.');

// Only managers or a menu lead change the menu. Recipes must use stock items; names stay unique.
let crew=as(s,'crew','alex');
fails(()=>B.change(crew,{type:'menu:item',id:'',name:'Test',category:'mains',price:10}),/menu lead/);
let m=as(s,'manager','jamie');
m=B.change(m,{type:'menu:item',id:'',name:'Grilled salmon',category:'mains',station:'Kitchen',price:29,description:'Salmon, greens.',recipe:[{item:'st-salmon-side',amount:'170 g',units:.17},{item:'st-unsalted-butter',amount:'20 g',units:.004}],dietary:['Gluten-free'],allergens:[],mayContain:['Molluscs'],modifiers:['side'],prep:'',plating:''});
const salmon=m.menu.items.find(i=>i.name==='Grilled salmon');assert(salmon&&salmon.id==='mi-grilled-salmon');
same(M.allergens(m,salmon),['Fish','Milk']);assert.equal(M.cost(m,salmon),Math.round((26*.17+64*.004)*100)/100);
fails(()=>B.change(m,{type:'menu:item',id:'',name:'grilled SALMON',category:'mains',price:1}),/already has that name/);
fails(()=>B.change(m,{type:'menu:item',id:'',name:'Ghost',category:'mains',price:1,recipe:[{item:'st-nope',units:1}]}),/not on the stock list/);
fails(()=>B.change(m,{type:'menu:item',id:'',name:'Nocat',category:'zzz',price:1}),/Choose a category/);
// The menu is the source of truth for ingredients: naming one that is not stocked yet creates it in Stock, matched by normalised name, never twice.
m=B.change(m,{type:'menu:item',id:'',name:'Yuzu sorbet',category:'desserts',price:9,recipe:[{name:'Yuzu purée',amount:'40 g',units:.04},{name:'  heavy CREAM ',amount:'30 ml',units:.005}]});
const yuzu=m.stock.items.find(i=>i.name==='Yuzu purée');assert(yuzu&&yuzu.source==='menu'&&yuzu.category==='Ingredients'&&yuzu.teams.includes('Kitchen')&&yuzu.active,'a new ingredient lands in Stock');
same(m.menu.items.find(i=>i.id==='mi-yuzu-sorbet').recipe.map(r=>r.item),[yuzu.id,'st-heavy-cream']);
m=B.change(m,{type:'menu:item',id:'',name:'Yuzu tonic',category:'cocktails',price:9,recipe:[{name:'yuzu puree',units:.02},{name:'YUZU PURÉE',units:.02},{item:'st-fever-tree-tonic',units:.042}]});
assert.equal(m.stock.items.filter(i=>/^yuzu/i.test(i.name)).length,1,'no duplicate ingredients');assert.equal(m.menu.items.find(i=>i.id==='mi-yuzu-tonic').recipe.length,2);
assert(M.usedIn(m,yuzu.id).map(i=>i.id).includes('mi-yuzu-tonic'),'affected dishes follow the ingredient');
m=B.change(m,{type:'menu:item',id:'mi-yuzu-sorbet',name:'Yuzu sorbet',category:'desserts',price:9,recipe:[]});
assert(m.stock.items.find(i=>i.id===yuzu.id).active,'still used by another dish, so it stays');
m=B.change(m,{type:'menu:archive',id:'mi-yuzu-tonic',active:false});
assert.equal(m.stock.items.find(i=>i.id===yuzu.id).active,false,'an unused menu ingredient is archived, not deleted');assert(m.stock.items.some(i=>i.id==='st-fever-tree-tonic'&&i.active),'stocked items are never touched');
m=B.change(m,{type:'menu:archive',id:'mi-yuzu-tonic',active:true});assert(m.stock.items.find(i=>i.id===yuzu.id).active,'restoring the dish brings its ingredient back');
assert(B.validState(m));
console.log('PASS: recipes create and reuse stock ingredients by normalised name, and archive the ones the menu no longer uses.');
let lead=as(B.change(m,{type:'manage:permissions',person:'alex',perms:{menu:true}}),'crew','alex');
lead=B.change(lead,{type:'menu:item',id:'mi-grilled-salmon',name:'Grilled salmon',category:'mains',price:31,recipe:salmon.recipe});
assert.equal(lead.menu.items.find(i=>i.id==='mi-grilled-salmon').price,31,'a menu lead edits dishes');
// Categories and modifier groups.
fails(()=>B.change(m,{type:'menu:remove-category',id:'mains'}),/Move or archive/);
m=B.change(m,{type:'menu:category',id:'',name:'Specials board',course:'Mains',station:'Kitchen'});assert(m.menu.categories.some(x=>x.id==='specials-board'));
m=B.change(m,{type:'menu:remove-category',id:'specials-board'});assert(!m.menu.categories.some(x=>x.id==='specials-board'));
m=B.change(m,{type:'menu:modifier',id:'',name:'Sauce',required:false,multi:true,options:[{name:'Peppercorn',price:2},{name:'Béarnaise',price:2}]});assert(m.menu.modifiers.some(x=>x.id==='sauce'));
m=B.change(m,{type:'menu:item',id:'mi-grilled-salmon',name:'Grilled salmon',category:'mains',price:31,recipe:salmon.recipe,modifiers:['side','sauce']});
assert.equal(M.priceWith(m,M.item(m,'mi-grilled-salmon'),['Peppercorn']),33);
m=B.change(m,{type:'menu:remove-modifier',id:'sauce'});same(M.item(m,'mi-grilled-salmon').modifiers,['side'],'removing a group removes it from dishes');
// Ingredient allergens reach every dish that uses the ingredient.
m=B.change(m,{type:'menu:ingredient',item:'st-fryer-oil',allergens:['Soy']});assert(M.allergens(m,M.item(m,'mi-fries')).includes('Soy'));
// A crew 86 of a dish is a report until a manager approves it; it lands on the shared 86 board.
let c86=as(m,'crew','alex');
c86=B.change(c86,{type:'menu:86',id:'a86',item:'mi-roast-chicken',reason:'Out of birds.',date:today,service:'Dinner'});
const u=c86.unavailable.find(x=>x.id==='a86');assert(u&&u.menuItem==='mi-roast-chicken'&&u.status==='Reported'&&u.area==='Kitchen'&&u.name==='Roast chicken');
let av=M.availability(c86,M.item(c86,'mi-roast-chicken'),today,'Dinner');assert.equal(av.status,'86');assert(av.pending);
fails(()=>B.change(c86,{type:'menu:86',id:'a86b',item:'mi-roast-chicken',date:today,service:'Dinner'}),/already on the 86 board/);
let mm=as(c86,'manager','jamie');mm=B.change(mm,{type:'ops:review-alert',id:'a86',status:'Approved'});
av=M.availability(mm,M.item(mm,'mi-roast-chicken'),today,'Dinner');assert.equal(av.status,'86');assert(!av.pending);
assert(M.outs(mm,today,'Dinner').off.some(i=>i.id==='mi-roast-chicken'));
mm=B.change(mm,{type:'ops:review-alert',id:'a86',status:'Restored'});assert.equal(M.availability(mm,M.item(mm,'mi-roast-chicken'),today,'Dinner').status,'ok');
// An 86’d stock item takes every dish that uses it off.
mm=B.change(mm,{type:'stock:alert',id:'s86',item:'st-rib-eye-steak',date:today,service:'Dinner',reason:'None left.'});
assert.equal(M.availability(mm,M.item(mm,'mi-rib-eye-steak'),today,'Dinner').status,'ingredient');assert(M.usedIn(mm,'st-rib-eye-steak').some(i=>i.id==='mi-rib-eye-steak'));
mm=B.change(mm,{type:'menu:archive',id:'mi-kids-pasta',active:false});assert.equal(M.availability(mm,M.item(mm,'mi-kids-pasta')).status,'archived');assert(!M.list(mm).some(i=>i.id==='mi-kids-pasta'));
fails(()=>B.change(as(mm,'crew','noah'),{type:'menu:settings',targetCost:28}),/managers/);
mm=B.change(mm,{type:'menu:settings',targetCost:28});assert.equal(mm.menu.settings.targetCost,28);
// Substitutes: a manager sets what to offer instead of an 86’d dish (a dish, named after it, or free text); the Menu carries it on availability, and crew cannot set one.
let sv=as(mm,'manager','jamie');
sv=B.change(sv,{type:'menu:86',id:'a86w',item:'mi-house-white-glass',reason:'Case didn’t arrive.',date:today,service:'Dinner',sub:{item:'mi-rose-glass'}});
const uw=sv.unavailable.find(x=>x.id==='a86w');assert.equal(uw.sub.item,'mi-rose-glass');assert.equal(uw.sub.name,'Rosé · glass','named after the dish');assert(B.validState(sv));
av=M.availability(sv,M.item(sv,'mi-house-white-glass'),today,'Dinner');assert.equal(av.status,'86');assert.equal(av.sub.name,'Rosé · glass');assert(av.sub.dish&&av.sub.available===true);
const opts=M.subOptions(sv,{cat:'wine',exclude:['mi-house-white-glass']}),optIds=opts.flatMap(g=>g.items.map(i=>i.id));
assert(opts[0].label.startsWith('Same category')&&opts[0].items.some(i=>i.id==='mi-rose-glass'),'own category first');
assert(!optIds.includes('mi-house-white-glass')&&!optIds.includes('mi-rib-eye-steak')&&!optIds.includes('mi-kids-pasta'),'excluded, 86’d and archived dishes are not offered');
fails(()=>B.change(sv,{type:'menu:86',id:'a86x',item:'mi-rose-glass',reason:'Gone.',date:today,service:'Dinner',sub:{item:'mi-rose-glass'}}),/different dish/);
fails(()=>B.change(sv,{type:'ops:sub',id:'a86w',sub:{item:'mi-nope'}}),/no longer on the menu/);
fails(()=>B.change(as(sv,'crew','alex'),{type:'ops:sub',id:'a86w',sub:{item:'',name:'Prosecco'}}),/Only managers/);
fails(()=>B.change(as(sv,'crew','alex'),{type:'menu:86',id:'a86d',item:'mi-house-red-glass',reason:'Gone.',date:today,service:'Dinner',sub:{item:'',name:'Rosé'}}),/Only managers/);
let cr=B.change(as(sv,'crew','alex'),{type:'menu:86',id:'a86c',item:'mi-prosecco-glass',reason:'Last bottle.',date:today,service:'Dinner'});assert(!cr.unavailable.find(x=>x.id==='a86c').sub,'crew reports carry no substitute');
cr=B.change(as(cr,'manager','jamie'),{type:'ops:sub',id:'a86c',sub:{item:'',name:'Ask the bar for the cava'}});assert.equal(cr.unavailable.find(x=>x.id==='a86c').sub.name,'Ask the bar for the cava');
av=M.availability(cr,M.item(cr,'mi-prosecco-glass'),today,'Dinner');assert.equal(av.sub.available,null,'free text has no dish');assert.equal(av.sub.item,'');
cr=B.change(as(cr,'manager','jamie'),{type:'ops:sub',id:'a86c',sub:null});assert(!cr.unavailable.find(x=>x.id==='a86c').sub,'cleared');
// A stock 86 carries one too and every dish it takes off shows it; a substitute that is itself off says so; two 86s pointing at each other never loop.
let sk=B.change(sv,{type:'ops:sub',id:'s86',sub:{item:'mi-whole-roasted-sea-bass'}});
av=M.availability(sk,M.item(sk,'mi-rib-eye-steak'),today,'Dinner');assert.equal(av.status,'ingredient');assert.equal(av.sub.name,'Whole roasted sea bass');assert(av.sub.available);
sk=B.change(sk,{type:'menu:86',id:'a86sb',item:'mi-whole-roasted-sea-bass',reason:'Gone.',date:today,service:'Dinner',sub:{item:'mi-rib-eye-steak'}});
assert.equal(M.availability(sk,M.item(sk,'mi-rib-eye-steak'),today,'Dinner').sub.available,false,'the sea bass is off too');assert.equal(M.availability(sk,M.item(sk,'mi-whole-roasted-sea-bass'),today,'Dinner').sub.available,false);
assert(!M.subOptions(sk).some(g=>g.items.some(i=>i.id==='mi-whole-roasted-sea-bass')),'an 86’d dish is never offered');
// A substitute dish that disappears keeps its name as plain text.
const gone=B.clone(sk);gone.unavailable.find(x=>x.id==='a86w').sub.item='mi-gone';const up=M.upgrade(gone),ug=up.unavailable.find(x=>x.id==='a86w');assert.equal(ug.sub.item,'');assert.equal(ug.sub.name,'Rosé · glass');assert(B.validState(up));
// A menu that no longer fits is rebuilt without losing the rest of the workspace.
const broken=JSON.parse(JSON.stringify(mm));broken.menu.items[0].category='nope';store.v=JSON.stringify(broken);const re=B.load(store);
assert(B.validState(re));assert(re.menu.items.length>=40,'menu rebuilt');assert.equal(re.shifts.length,mm.shifts.length);
console.log('PASS: permissions and the menu lead, dishes, categories, modifiers, ingredient allergens, the 86 flow both ways, archive, settings and recovery.');

// The Menu screen for both roles.
const e=x=>String(x??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const input=(name,label,value='',type='text',attrs='')=>`<label>${label}<input name="${name}" type="${type}" value="${e(value)}" ${attrs}></label>`;
const textarea=(name,label,value='',attrs='')=>`<label>${label}<textarea name="${name}" ${attrs}>${e(value)}</textarea></label>`;
const select=(name,label,values,value)=>`<label>${label}<select name="${name}">${values.map(v=>{const [k,t]=Array.isArray(v)?v:[v,v];return `<option value="${e(k)}" ${k===value?'selected':''}>${e(t)}</option>`;}).join('')}</select></label>`;
let ui=as(mm,'manager','jamie');ui.menu.items[0].name='<img src=x onerror=alert(1)>';
const opened=[];const api={state:()=>ui,e,input,textarea,select,dateLabel:(d)=>d,render(){},notify(){},close(){},go(){},open(t,h,save){opened.push([t,h,save]);},commit(a){try{ui=B.change(ui,a);return true;}catch(err){return false;}}};
const menuUI=c.createMenuUI(api);
let html=menuUI.render();assert(html.includes('sk-tabs')&&html.includes('mn-card')&&html.includes('data-action="mn-tab" data-id="setup"'));
assert(!html.includes('<img src=x')&&html.includes('&lt;img'),'names are escaped');assert(html.includes('mn-cost'),'managers see food cost');
for(const t of ['allergens','86','setup']){menuUI.show(t);html=menuUI.render();assert(html.includes('data-tab="'+t+'"'),t);}
menuUI.show('allergens');menuUI.handle('avoid','Milk');html=menuUI.render();assert(html.includes('Safe without Milk')&&html.includes('mn-matrix'));
menuUI.show('86');html=menuUI.render();assert(html.includes('Off the menu now')&&html.includes('Rib-eye steak'));
menuUI.handle('open','mi-pan-roasted-halibut');assert.equal(opened.at(-1)[0],'Pan-roasted halibut');assert(opened.at(-1)[1].includes('Recipe')&&opened.at(-1)[1].includes('Fish')&&opened.at(-1)[1].includes('stock-open'));
menuUI.handle('item','mi-pan-roasted-halibut');
const act=menuUI.submit({name:'Pan-roasted halibut',category:'mains',station:'Kitchen',price:'39',description:'x',r_name_0:'Halibut fillet',r_amount_0:'180 g',r_units_0:'0.18',r_name_1:'',prep:'',plating:'',active:'true'},{getAll:k=>k==='dietary'?['Gluten-free']:[]});
assert.equal(act.type,'menu:item');assert.equal(act.recipe.length,1);assert.equal(act.price,39);same(act.dietary,['Gluten-free']);
menuUI.handle('86','mi-fries');assert.equal(opened.at(-1)[0],'86 a dish');assert(opened.at(-1)[1].includes('name="sub"')&&opened.at(-1)[1].includes('<optgroup label="Same category · Sides">')&&!opened.at(-1)[1].includes('value="mi-fries"'),'manager picks what to offer instead');
const a86=menuUI.submit({reason:'Fryer down',sub:'mi-rib-eye-steak'},{getAll:()=>[]});assert.equal(a86.type,'menu:86');assert.equal(a86.item,'mi-fries');same(a86.sub,{item:'mi-rib-eye-steak',name:''});
same(menuUI.submit({reason:'Fryer down',sub:'text:',subText:'Crisps from the bar'},{getAll:()=>[]}).sub,{item:'',name:'Crisps from the bar'});assert.equal(menuUI.submit({reason:'Fryer down',sub:''},{getAll:()=>[]}).sub,null);
// The dish sheet and the 86 tab show the substitute; the sheet lets a manager set or change it.
ui=B.change(ui,{type:'menu:86',id:'ui86',item:'mi-house-white-glass',reason:'Case didn’t arrive.',date:today,service:'Dinner',sub:{item:'mi-rose-glass'}});
menuUI.handle('open','mi-house-white-glass');assert(opened.at(-1)[1].includes('mn-sub')&&opened.at(-1)[1].includes('Offer instead')&&opened.at(-1)[1].includes('data-action="mn-open" data-id="mi-rose-glass"')&&opened.at(-1)[1].includes('data-action="stock-sub" data-id="ui86"'),'sheet shows the substitute');
menuUI.show('86');html=menuUI.render();assert(html.includes('offer Rosé · glass instead'),'86 tab names the substitute');
menuUI.handle('open','mi-rib-eye-steak');assert(opened.at(-1)[1].includes('Nothing set to offer instead')&&opened.at(-1)[1].includes('data-action="stock-sub" data-id="s86"'),'an ingredient 86 without a substitute offers to set one');
menuUI.show('setup');for(const p of ['categories','modifiers','ingredients','settings']){menuUI.handle('pane',p);html=menuUI.render();assert(html.includes('mn-seg'),p);}
ui=as(ui,'crew','alex');menuUI.handle('open','mi-house-white-glass');assert(opened.at(-1)[1].includes('Offer instead')&&!opened.at(-1)[1].includes('data-action="stock-sub"'),'crew see the substitute but cannot change it');
menuUI.handle('86','mi-fries');assert(!opened.at(-1)[1].includes('name="sub"'),'crew reports have no substitute field');
ui=as(mm,'crew','alex');menuUI.show('menu');html=menuUI.render();assert(!html.includes('data-id="setup"'),'crew have no setup tab');assert(!html.includes('mn-cost'),'crew do not see cost');menuUI.show('86');assert(menuUI.render().includes('mn-86'),'crew can report an 86 from the 86 tab');menuUI.show('menu');
// Navigation: Menu and POS sit in Live service, follow the shift, and the Menu pill counts dishes that are off.
assert(N.groups(true)[0].items.some(x=>x[1]==='menu')&&N.groups(true)[0].items.some(x=>x[1]==='pos'));assert(N.service('menu')&&N.service('pos'));
const badges=N.badges(as(mm,'manager','jamie'));assert(badges.menu&&badges.menu.tone==='danger');
assert(B.permissions.keys.includes('menu')&&B.permissions.keys.includes('pos')&&B.permissions.keys.includes('posLead'));
console.log('PASS: Menu screen for managers and crew, dish sheet, forms, allergen finder, setup panes, navigation and permissions.');

// Day-parts, counts, quick price, duplicate, ordering, and what the POS does with them.
{
 const T=B.dateString(new Date());
 let w=as(B.load({v:null,getItem(){return null},setItem(){}}),'manager','jamie');w={...w,date:T,service:'Dinner'};
 const brunch=M.category(w,'brunch');same(brunch.services,['Lunch'],'brunch is a lunch-only category in a fresh workspace');
 assert.equal(M.availability(w,M.item(w,'mi-eggs-benedict'),T,'Dinner').status,'service','a day-part category is not served at dinner');
 assert.equal(M.availability(w,M.item(w,'mi-eggs-benedict'),T,'Lunch').status,'ok');
 assert(!M.sellable(w,M.item(w,'mi-eggs-benedict'),T,'Dinner')&&M.servedAt(brunch,'Lunch')&&!M.servedAt(brunch,'Dinner'));
 assert(!M.byCategory(w,{service:'Dinner',inService:true}).some(g=>g.category.id==='brunch'),'the POS hides the category at dinner');
 assert(M.byCategory(w,{service:'Dinner'}).some(g=>g.category.id==='brunch'),'the Menu screen keeps it');
 assert(M.outs(w,T,'Dinner').notServed.some(i=>i.id==='mi-eggs-benedict'));
 w=B.change(w,{type:'pos:open',id:'cnt1',type_:'dine',table:'1',guests:2});
 fails(()=>B.change(w,{type:'pos:add',id:'cnt1',item:'mi-eggs-benedict'}),/not served at Dinner/);
 // Services on a category: an invalid name is dropped; ticking every service means no restriction.
 w=B.change(w,{type:'menu:category',id:'brunch',name:'Brunch',course:'Mains',station:'Kitchen',services:w.setup.services.filter(v=>v.active!==false).map(v=>v.name)});same(M.category(w,'brunch').services,[]);
 w=B.change(w,{type:'menu:category',id:'brunch',name:'Brunch',course:'Mains',station:'Kitchen',services:['Lunch','Nope']});same(M.category(w,'brunch').services,['Lunch']);
 // A renamed service follows into the category.
 const lunch=w.setup.services.find(x=>x.name==='Lunch');w=B.change(w,{type:'ops:service',id:lunch.id,name:'Midday',start:lunch.start,end:lunch.end,breakMinutes:lunch.breakMinutes,active:lunch.active});
 same(M.category(w,'brunch').services,['Midday']);w=B.change(w,{type:'ops:service',id:lunch.id,name:'Lunch',start:lunch.start,end:lunch.end,breakMinutes:lunch.breakMinutes,active:lunch.active});
 // Colours are stable per category and shared with the POS tiles.
 assert.equal(M.hue(w,'starters'),0);assert.equal(M.hue(w,'mains'),1);assert.equal(M.hue(w,'nope'),7);
 // Counts: the kitchen sets portions for a service; the POS counts down and refuses the dish at zero.
 fails(()=>B.change(w,{type:'menu:limit',id:'mi-oysters-on-the-half-shell',qty:1000}),/between 0 and 999/);
 w=B.change(w,{type:'menu:limit',id:'mi-oysters-on-the-half-shell',qty:2,date:T,service:'Dinner'});
 let oy=M.item(w,'mi-oysters-on-the-half-shell');assert.equal(M.remaining(w,oy,T,'Dinner'),2);assert.equal(M.remaining(w,oy,T,'Lunch'),null,'a count belongs to one service');
 let av=M.availability(w,oy,T,'Dinner');assert.equal(av.status,'limited');assert.equal(av.label,'2 left');assert(M.counts(w,T,'Dinner').some(c=>c.item.id===oy.id&&c.remaining===2));
 const crew2=as(w,'crew','alex');assert.equal(M.item(B.change(crew2,{type:'menu:limit',id:'mi-fries',qty:5,date:T,service:'Dinner'}),'mi-fries').limit.qty,5,'crew who can report 86s set counts');
 fails(()=>B.change(w,{type:'pos:add',id:'cnt1',item:oy.id,qty:3}),/Only 2 .* left/);
 w=B.change(w,{type:'pos:add',id:'cnt1',item:oy.id,qty:2});
 assert.equal(M.sold(w,oy,T,'Dinner'),2,'held lines count against the kitchen number');assert.equal(M.remaining(w,oy,T,'Dinner'),0);
 av=M.availability(w,oy,T,'Dinner');assert.equal(av.status,'soldout');assert(!M.sellable(w,oy,T,'Dinner'));assert(M.outs(w,T,'Dinner').off.some(i=>i.id===oy.id));
 fails(()=>B.change(w,{type:'pos:add',id:'cnt1',item:oy.id}),/sold out/);
 const line=B.pos.check(w,'cnt1').lines.find(l=>l.item===oy.id);fails(()=>B.change(w,{type:'pos:line',id:'cnt1',line:line.id,qty:3}),/Only 0 more/);
 const op=M.openOn(w,oy,T,'Dinner');assert.equal(op.checks,1);assert.equal(op.held,2);assert.equal(op.sent,0);
 w=B.change(w,{type:'pos:line',id:'cnt1',line:line.id,qty:1});assert.equal(M.remaining(w,oy,T,'Dinner'),1);
 w=B.change(w,{type:'menu:limit',id:oy.id,qty:null,date:T,service:'Dinner'});assert.equal(M.item(w,oy.id).limit,undefined);assert(['ok','low'].includes(M.availability(w,M.item(w,oy.id),T,'Dinner').status),'count cleared');
 // Quick price change: new lines ring at the new price, old lines keep theirs.
 w=B.change(w,{type:'menu:price',id:'mi-fries',price:6.5});assert.equal(M.item(w,'mi-fries').price,6.5);
 fails(()=>B.change(as(w,'crew','noah'),{type:'menu:price',id:'mi-fries',price:7}),/menu lead/);
 // Duplicate and reorder within a category; the POS tiles follow the order.
 w=B.change(w,{type:'menu:duplicate',id:'mi-fries'});const cp=w.menu.items.find(i=>i.name==='Fries copy');assert(cp&&cp.id==='mi-fries-copy'&&cp.recipe.length===1&&cp.active&&cp.category==='sides');
 w=B.change(w,{type:'menu:duplicate',id:'mi-fries'});assert(w.menu.items.some(i=>i.name==='Fries copy 2'));
 const sides=()=>M.list(w,{category:'sides'}).map(i=>i.id);assert.equal(sides().at(-1),'mi-fries-copy-2');
 w=B.change(w,{type:'menu:item-order',id:'mi-fries-copy-2',direction:-1});assert.equal(sides().at(-2),'mi-fries-copy-2');
 w=B.change(w,{type:'menu:item-order',id:'mi-fries',direction:-1});assert.equal(sides()[0],'mi-fries');
 assert.deepEqual(sides(),B.menu.byCategory(w,{inService:true}).find(g=>g.category.id==='sides').items.map(i=>i.id),'the POS pane uses the same order');
 // Tags are searchable; a stale count disappears on load.
 w=B.change(w,{type:'menu:item',id:'mi-fries',name:'Fries',category:'sides',price:6.5,recipe:M.item(w,'mi-fries').recipe,tags:['Signature','  ']});same(M.item(w,'mi-fries').tags,['Signature']);assert(M.list(w,{query:'signature'}).some(i=>i.id==='mi-fries'));
 const old=JSON.parse(JSON.stringify(w));old.menu.items.find(i=>i.id==='mi-fries').limit={date:B.addDays(T,-30),service:'Dinner',qty:4};const re2=B.load({v:JSON.stringify(old),getItem(){return this.v},setItem(){}});
 assert.equal(M.item(re2,'mi-fries').limit,undefined,'a month-old count is forgotten');
 // Menu engineering classes compare dishes within their category.
 const mix=B.pos.menuMix(w,B.addDays(T,-28),B.addDays(T,-1));assert(mix.rows.length>10&&mix.rows.every(r=>typeof r.catShare==='number'));
 assert(!mix.rows.filter(r=>r.category==='Soft drinks').every(r=>r.klass==='Dog'),'a soda is not a dog just because the rib-eye earns more');
 console.log('PASS: day-part categories, kitchen counts on the POS, quick price, duplicate, ordering, tags, stale counts and per-category engineering.');
}
// The redesigned screen: stats strip, category rail, list view, sort, the till panel on the dish sheet, counts on the 86 tab and the Performance tab.
{
 let v=as(mm,'manager','jamie');const api2={state:()=>v,e,input,textarea,select,dateLabel:(d)=>d,render(){},notify(){},close(){},go(){},open(t,h,save){opened.push([t,h,save]);},commit(a){try{v=B.change(v,a);return true;}catch(err){return false;}}};
 const ui2=c.createMenuUI(api2);let h=ui2.render();
 assert(h.includes('mn-stats')&&h.includes('mn-cats')&&h.includes('data-action="mn-view"')&&h.includes('data-mn-sort')&&h.includes('--ct:var(--cat-')&&h.includes('data-id="performance"'),'manager menu screen');
 assert(h.includes('mn-diet'));ui2.show('86');assert(ui2.render().includes('Set a count'),'counts are set from the 86 tab');ui2.show('menu');h=ui2.render();
 ui2.handle('view','list');h=ui2.render();assert(h.includes('mn-list')&&h.includes('mn-row-dish')&&!h.includes('mn-grid'),'list view');
 ui2.onChange({dataset:{mnSort:''},value:'price'});h=ui2.render();const prices=[...h.matchAll(/mn-price">\$([\d.]+)/g)].map(x=>Number(x[1])).slice(0,6);assert(prices.every((p,i)=>i===0||p>=prices[i-1]),'sorted by price '+prices);
 ui2.handle('view','cards');ui2.onChange({dataset:{mnSort:''},value:'menu'});
 ui2.handle('open','mi-oysters-on-the-half-shell');const sheet=opened.at(-1)[1];assert(sheet.includes('At the till')&&sheet.includes('Rings in at')&&sheet.includes('Tax')&&sheet.includes('Count for')&&sheet.includes('data-action="mn-count"')&&sheet.includes('data-action="mn-price"')&&sheet.includes('data-action="mn-duplicate"')&&sheet.includes('data-action="mn-item-order"'),'till panel and lead actions');
 ui2.handle('count','mi-oysters-on-the-half-shell');assert.equal(opened.at(-1)[0],'Set a count');const act2=ui2.submit({qty:'4'},{getAll:()=>[]});assert.equal(act2.type,'menu:limit');assert.equal(act2.qty,4);assert.equal(act2.id,'mi-oysters-on-the-half-shell');
 v=B.change(v,act2);ui2.show('86');h=ui2.render();assert(h.includes('Counts for')&&h.includes('mn-count-track')&&h.includes('4 left'),'counts board');
 ui2.handle('price','mi-fries');const pa=ui2.submit({price:'7'},{getAll:()=>[]});assert.equal(pa.type,'menu:price');assert.equal(pa.price,7);
 ui2.handle('category','brunch');const ca=ui2.submit({name:'Brunch',course:'Mains',station:'Kitchen',active:'true'},{getAll:k=>k==='services'?['Lunch']:[]});same(ca.services,['Lunch']);
 ui2.show('performance');for(const p of [0,7,28]){ui2.handle('period',String(p));h=ui2.render();assert(h.includes('mn-quad')&&h.includes('mn-perf')&&h.includes('rp-kpi'),'performance '+p);}
 ui2.show('allergens');ui2.handle('diet','Vegan');h=ui2.render();assert(h.includes('Vegan')&&h.includes('mn-finder'));
 ui2.show('setup');ui2.handle('pane','ingredients');ui2.onInput({dataset:{mnIngSearch:''},value:'oyster'});h=ui2.render();assert(h.includes('Oysters')&&!h.includes('Fryer oil'),'ingredient search');
 v=as(v,'crew','alex');ui2.show('menu');h=ui2.render();assert(!h.includes('data-id="performance"')&&!h.includes('mn-cost')&&h.includes('data-action="mn-view"'),'crew keep the view toggle but see no costs');
 ui2.show('86');assert(ui2.render().includes('Set a count'),'crew who report 86s can set counts from the 86 tab');
 ui2.handle('count','mi-fries');assert.equal(opened.at(-1)[0],'Set a count','the crew count action opens its form');
 console.log('PASS: redesigned Menu screen, list view and sort, till panel, counts board, Performance and crew view.');
}
