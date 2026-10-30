/* Menu: categories by course and station, dishes and drinks with recipes built from Stock items, portion cost and margin, allergens derived from ingredients, modifiers, and availability driven by the 86 board. DOM-free. */
(function(){
 'use strict';
 const B=Brigly,prev={starter:B.starter,load:B.load,valid:B.validState,change:B.change};
 const copy=x=>globalThis.Brigly.clone(x);
 const slug=t=>String(t).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
 const norm=t=>String(t||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
 const ING_CATEGORY='Ingredients';
 // The menu is the source of truth for ingredients. A recipe row points at a stock item by id, or names one: a name that
 // matches an existing stock item (ignoring case, accents and punctuation) reuses it, anything else becomes a new stock item.
 function ingredient(s,ref,station){
  const st=s.stock,items=st.items;
  if(ref?.item){const x=items.find(i=>i.id===ref.item);if(x)return x;}
  const name=String(ref?.name||'').trim().slice(0,100);if(!name)return null;
  const key=norm(name),found=items.find(i=>norm(i.name)===key)||(B.stock?.byName?B.stock.byName(s,name):null);
  if(found)return found;
  const base='st-'+(slug(name).slice(0,60)||'ingredient');let id=base,n=2;while(items.some(i=>i.id===id))id=base+'-'+n++;
  if(!st.categories.some(c=>c.toLowerCase()===ING_CATEGORY.toLowerCase()))st.categories.push(ING_CATEGORY);
  const category=st.categories.find(c=>c.toLowerCase()===ING_CATEGORY.toLowerCase());
  const made={id,name,category,vendor:'',teams:[s.setup.areas.includes(station)?station:s.setup.areas[0]],unit:'portion',pack:'',cost:0,par:0,onHand:null,countedAt:'',countedBy:'',location:'',sku:'',active:true,source:'menu'};
  items.push(made);return made;
 }
 // Ingredients the menu created follow the dishes: used by a dish on the menu they stay active; used by none they are archived
 // (never deleted, so counts, orders and 86 history keep their item). Anything counted, on order or 86'd is left alone.
 function sweep(s){
  const used=new Set();for(const i of s.menu.items)if(i.active)for(const r of i.recipe||[])used.add(r.item);
  for(const x of s.stock.items){
   if(x.source!=='menu')continue;
   if(used.has(x.id)){x.active=true;continue;}
   const busy=(s.orders||[]).some(o=>o.item===x.id&&['Requested','Approved','Ordered'].includes(o.status))||(s.unavailable||[]).some(u=>u.item===x.id&&['Reported','Approved'].includes(u.status));
   if(!busy&&x.onHand===null)x.active=false;
  }
 }
 const txt=(x,max)=>typeof x==='string'&&x.length<=max;
 const label=(x,max=80)=>txt(x,max)&&x.trim().length>0;
 const num=(x,max=100000)=>typeof x==='number'&&Number.isFinite(x)&&x>=0&&x<=max;
 const round=n=>Math.round(n*100)/100;
 const ident=x=>typeof x==='string'&&/^[\w-]{1,100}$/.test(x);
 const ALLERGENS=['Gluten','Crustaceans','Eggs','Fish','Peanuts','Soy','Milk','Tree nuts','Celery','Mustard','Sesame','Sulphites','Lupin','Molluscs'];
 const CODES={Gluten:'G',Crustaceans:'Cr',Eggs:'E',Fish:'F',Peanuts:'P',Soy:'So',Milk:'M','Tree nuts':'N',Celery:'Ce',Mustard:'Mu',Sesame:'Se',Sulphites:'Su',Lupin:'L',Molluscs:'Mo'};
 const DIETARY=['Vegetarian','Vegan','Gluten-free','Dairy-free','Nut-free','Contains alcohol','Spicy','Kids'];
 const COURSES=['Drinks','Starters','Mains','Sides','Desserts'];
 const LIMITS={items:600,categories:40,modifiers:60,recipe:30,options:20};

 // Which allergens each stock item carries. Managers can correct this per ingredient in Menu → Setup.
 const INGREDIENT_ALLERGENS={
  'st-oysters':['Molluscs'],'st-mussels':['Molluscs'],'st-halibut-fillet':['Fish'],'st-sea-bass':['Fish'],'st-salmon-side':['Fish'],
  'st-burrata':['Milk'],'st-heavy-cream':['Milk'],'st-unsalted-butter':['Milk'],'st-parmesan':['Milk'],'st-free-range-eggs':['Eggs'],'st-whole-milk':['Milk'],
  'st-brioche-buns':['Gluten','Eggs','Milk'],'st-focaccia-slabs':['Gluten'],'st-tipo-00-flour':['Gluten'],'st-house-sourdough':['Gluten'],'st-fresh-pappardelle':['Gluten','Eggs'],
  'st-chocolate-tart':['Gluten','Eggs','Milk','Soy'],'st-dark-chocolate-70':['Soy'],'st-hazelnuts':['Tree nuts'],
  'st-house-red':['Sulphites'],'st-house-white':['Sulphites'],'st-ros':['Sulphites'],'st-prosecco':['Sulphites'],'st-dry-cider':['Sulphites'],
  'st-draught-pale-ale':['Gluten'],'st-draught-lager':['Gluten'],'st-bottled-lager':['Gluten'],'st-aromatic-bitters':['Sulphites'],'st-amaro':['Sulphites'],'st-orchard-old-fashioned-batch':['Sulphites']
 };
 // [id, name, course, station]
 const CATEGORIES=[
  ['starters','Starters','Starters','Kitchen'],['mains','Mains','Mains','Kitchen'],['sides','Sides','Sides','Kitchen'],['desserts','Desserts','Desserts','Kitchen'],['brunch','Brunch','Mains','Kitchen'],['kids','Kids','Mains','Kitchen'],
  ['cocktails','Cocktails','Drinks','Bar'],['wine','Wine','Drinks','Bar'],['beer','Beer & cider','Drinks','Bar'],['soft','Soft drinks','Drinks','Bar'],['coffee','Coffee & tea','Drinks','Bar']
 ];
 const MODIFIERS=[
  ['temp','Cooking temperature',true,false,[['Rare',0],['Medium rare',0],['Medium',0],['Medium well',0],['Well done',0]]],
  ['side','Choice of side',true,false,[['Fries',0],['Greens',0],['Salad',0]]],
  ['milk','Milk',false,false,[['Whole',0],['Oat',.5]]],
  ['dressing','Dressing',false,false,[['On the side',0],['No dressing',0]]],
  ['extras','Extras',false,true,[['Add burrata',6],['Add pancetta',4],['Add egg',2]]],
  ['spirit','Spirit',false,false,[['House',0],['Premium',3]]]
 ];
 // [name, category, price, description, recipe [[stock id, portion label, order units per portion]...], dietary, extra allergens, modifiers, prep, plating]
 const ITEMS=[
  ['Oysters on the half shell','starters',21,'Six Kumamoto oysters with mignonette and lemon.',[['st-oysters','6 oysters',.5],['st-lemons','½ lemon',.006],['st-shallots','10 g',.002]],['Gluten-free','Dairy-free'],[],[],'Shuck to order. Keep on crushed ice.','Six on ice, mignonette in a ramekin, lemon cheek.'],
  ['Burrata & heirloom tomatoes','starters',16,'Burrata, heirloom tomatoes, basil oil and focaccia crumb.',[['st-burrata','1 ball',.167],['st-heirloom-tomatoes','150 g',.03],['st-focaccia-slabs','¼ slab',.0625],['st-extra-virgin-olive-oil','20 ml',.004]],['Vegetarian'],[],['extras'],'Tomatoes at room temperature. Tear the burrata.','Tomatoes first, burrata on top, oil and crumb last.'],
  ['Mussels in white wine','starters',17,'Rope-grown mussels, white wine, garlic, parsley, toasted sourdough.',[['st-mussels','450 g',.45],['st-house-white','60 ml',.007],['st-unsalted-butter','30 g',.006],['st-house-sourdough','2 slices',.125],['st-fresh-herbs','sprig',.02]],[],[],[],'Discard any that stay open. Steam 3–4 minutes with the lid on.','Deep bowl, bread on the rim, broth over.'],
  ['Wild mushroom toast','starters',14,'Chanterelles and oyster mushrooms on sourdough, parmesan, thyme.',[['st-wild-mushrooms','120 g',.12],['st-house-sourdough','1 slice',.0625],['st-parmesan','15 g',.015],['st-unsalted-butter','20 g',.004],['st-fresh-herbs','sprig',.02]],['Vegetarian'],[],['extras'],'Mushrooms in a hot pan, no crowding.','Toast, mushrooms, shaved parmesan, thyme.'],
  ['Focaccia & olive oil','starters',7,'Warm focaccia, extra virgin olive oil, flaky salt.',[['st-focaccia-slabs','⅓ slab',.083],['st-extra-virgin-olive-oil','30 ml',.006]],['Vegan'],[],[],'Warm 4 minutes in the oven.','Board, oil in a dish.'],
  ['Mixed leaf salad','starters',11,'Mixed leaves, shallot vinaigrette, toasted hazelnuts.',[['st-mixed-salad-leaves','80 g',.04],['st-shallots','10 g',.002],['st-hazelnuts','15 g',.015],['st-extra-virgin-olive-oil','15 ml',.003]],['Vegan','Gluten-free'],[],['dressing','extras'],'Dress just before it leaves the pass.','Tall in a chilled bowl, hazelnuts over.'],
  ['Pan-roasted halibut','mains',38,'Halibut, brown butter, lemon, seasonal greens.',[['st-halibut-fillet','180 g',.18],['st-unsalted-butter','40 g',.008],['st-lemons','½ lemon',.006],['st-mixed-salad-leaves','60 g',.03]],['Gluten-free'],[],[],'Skin side down, press for 20 seconds, baste with brown butter.','Greens under, fish on top, lemon butter around.'],
  ['Whole roasted sea bass','mains',34,'Whole sea bass, herbs, lemon, olive oil.',[['st-sea-bass','1 fish',.45],['st-fresh-herbs','sprigs',.03],['st-lemons','½ lemon',.006],['st-extra-virgin-olive-oil','20 ml',.004]],['Gluten-free','Dairy-free'],[],[],'Score the skin. 14 minutes at 220 °C.','Whole on an oval, lemon and herbs.'],
  ['Rib-eye steak','mains',42,'300 g rib-eye, café de Paris butter, fries.',[['st-rib-eye-steak','1 steak',.1],['st-unsalted-butter','30 g',.006],['st-fryer-oil','portion',.01]],['Gluten-free'],[],['temp','side'],'Rest 5 minutes. Fries in the second fryer.','Sliced on the bias, butter on top, fries beside.'],
  ['Roast chicken','mains',27,'Half roast chicken, pan jus, greens.',[['st-whole-chickens','½ bird',.083],['st-fresh-herbs','sprig',.02],['st-unsalted-butter','20 g',.004],['st-mixed-salad-leaves','60 g',.03]],['Gluten-free','Dairy-free'],[],['side'],'Butter under the skin. 165 °F at the thigh.','Carved, jus over, greens beside.'],
  ['Braised lamb shoulder','mains',31,'Slow-braised lamb shoulder, soft polenta, gremolata.',[['st-lamb-shoulder','220 g',.22],['st-shallots','20 g',.004],['st-house-red','60 ml',.007],['st-parmesan','20 g',.02],['st-fresh-herbs','sprig',.02]],['Gluten-free'],[],[],'Braise 3½ hours the day before. Reheat in its liquor.','Polenta base, lamb, braising liquor, gremolata.'],
  ['Pappardelle with wild mushrooms','mains',24,'Fresh pappardelle, chanterelles, cream, parmesan.',[['st-fresh-pappardelle','1 portion',.025],['st-wild-mushrooms','90 g',.09],['st-heavy-cream','80 ml',.013],['st-parmesan','20 g',.02]],['Vegetarian'],[],['extras'],'Pasta 2 minutes. Finish in the pan with the sauce.','Twisted in a bowl, parmesan and thyme.'],
  ['Roasted squash risotto','mains',26,'Delicata squash, brown butter, crispy sage.',[['st-arborio-rice','90 g',.018],['st-delicata-squash','150 g',.015],['st-unsalted-butter','40 g',.008],['st-parmesan','25 g',.025],['st-fresh-herbs','sage',.02]],['Vegetarian','Gluten-free'],[],[],'Toast the rice. Stock hot. Vegan version: olive oil and vegetable stock, no parmesan.','Flat in a warm bowl, sage on top.'],
  ['Copper Room burger','mains',22,'Beef patty, aged cheddar, pancetta, brioche, fries.',[['st-brioche-buns','1 bun',.042],['st-pancetta','30 g',.03],['st-heirloom-tomatoes','slice',.01],['st-mixed-salad-leaves','20 g',.01],['st-fryer-oil','portion',.01]],[],['Gluten','Milk','Sesame'],['temp','extras'],'Patty 160 g, seasoned on the grill only.','Bun, leaf, patty, cheese, pancetta; fries beside.'],
  ['Fries','sides',6,'Hand-cut fries, flaky salt.',[['st-fryer-oil','portion',.01]],['Vegan','Gluten-free'],[],[],'Blanch at 140 °C, finish at 180 °C.','Paper-lined dish.'],
  ['Seasonal greens','sides',7,'Greens, lemon, olive oil.',[['st-mixed-salad-leaves','80 g',.04],['st-lemons','¼ lemon',.003],['st-extra-virgin-olive-oil','10 ml',.002]],['Vegan','Gluten-free'],[],[],'','Small bowl.'],
  ['House sourdough & butter','sides',5,'Two slices, cultured butter.',[['st-house-sourdough','2 slices',.125],['st-unsalted-butter','20 g',.004]],['Vegetarian'],[],[],'','Board, butter quenelle.'],
  ['Chocolate tart','desserts',11,'Dark chocolate tart, crème fraîche, hazelnut praline.',[['st-chocolate-tart','1 slice',.1],['st-heavy-cream','30 ml',.005],['st-hazelnuts','10 g',.01]],['Vegetarian'],[],[],'Room temperature 20 minutes before service.','Slice, cream beside, praline over.'],
  ['Apple crumble','desserts',10,'Honeycrisp apples, oat crumble, vanilla cream.',[['st-honeycrisp-apples','1 apple',.025],['st-tipo-00-flour','40 g',.0016],['st-unsalted-butter','30 g',.006],['st-heavy-cream','40 ml',.007]],['Vegetarian'],['Gluten'],[],'Bake to order, 12 minutes.','Ramekin on a plate, cream in a jug.'],
  ['Affogato','desserts',8,'Vanilla ice cream, a shot of espresso.',[['st-espresso-beans','18 g',.018],['st-heavy-cream','60 ml',.01]],['Vegetarian','Gluten-free'],['Eggs'],[],'Espresso poured at the table.','Glass, espresso in a small jug.'],
  ['Eggs Benedict','brunch',17,'Poached eggs, pancetta, hollandaise, brioche.',[['st-free-range-eggs','2 eggs',.067],['st-pancetta','40 g',.04],['st-unsalted-butter','50 g',.01],['st-brioche-buns','1 bun',.042]],[],[],[],'Hollandaise fresh each service. Hold under 2 hours.','Two halves, egg on each, sauce over, chives.'],
  ['Avocado toast','brunch',14,'Sourdough, smashed avocado, poached egg, chilli.',[['st-house-sourdough','2 slices',.125],['st-free-range-eggs','1 egg',.033],['st-lemons','¼ lemon',.003],['st-extra-virgin-olive-oil','10 ml',.002]],['Vegetarian','Dairy-free'],[],['extras'],'Avocado seasoned with lemon and salt only.','Two slices, egg on top, chilli flakes.'],
  ['Kids pasta','kids',9,'Pappardelle with butter and parmesan.',[['st-fresh-pappardelle','½ portion',.0125],['st-unsalted-butter','20 g',.004],['st-parmesan','15 g',.015]],['Vegetarian','Kids'],[],[],'No pepper, no herbs.','Small bowl, cut short.'],
  ['Orchard old fashioned','cocktails',15,'Bourbon, spiced apple, aromatic bitters, orange twist.',[['st-orchard-old-fashioned-batch','90 ml',.045],['st-house-bourbon','20 ml',.0033],['st-aromatic-bitters','2 dashes',.005]],['Contains alcohol','Vegan','Gluten-free'],[],[],'Stir 20 seconds over large ice.','Rocks glass, one large cube, orange twist.'],
  ['Negroni','cocktails',14,'Gin, sweet vermouth, bitter amaro.',[['st-london-dry-gin','30 ml',.005],['st-amaro','30 ml',.043]],['Contains alcohol','Vegan','Gluten-free'],[],['spirit'],'Stir, never shake.','Rocks glass, orange slice.'],
  ['Margarita','cocktails',14,'Blanco tequila, lime, orange liqueur, salt rim.',[['st-blanco-tequila','50 ml',.011],['st-limes','1 lime',.01]],['Contains alcohol','Vegan','Gluten-free'],[],['spirit'],'Shake hard, double strain.','Coupe or rocks, half salt rim.'],
  ['Gin & tonic','cocktails',12,'London dry gin, Fever-Tree tonic, lime.',[['st-london-dry-gin','50 ml',.0083],['st-fever-tree-tonic','1 bottle',.042],['st-limes','wedge',.0025]],['Contains alcohol','Vegan','Gluten-free'],[],['spirit'],'','Copa glass, plenty of ice.'],
  ['Vodka soda','cocktails',11,'Vodka, soda, lime.',[['st-vodka','50 ml',.0083],['st-soda-water','1 bottle',.042],['st-limes','wedge',.0025]],['Contains alcohol','Vegan','Gluten-free'],[],['spirit'],'','Highball.'],
  ['Mint julep','cocktails',14,'Bourbon, mint, sugar, crushed ice.',[['st-house-bourbon','60 ml',.01],['st-fresh-mint','8 leaves',.1]],['Contains alcohol','Vegan','Gluten-free'],[],[],'Crushed ice only.','Julep cup, mint bouquet.'],
  ['Spiced pear spritz','cocktails',13,'Prosecco, pear, amaro, soda.',[['st-prosecco','90 ml',.02],['st-amaro','20 ml',.029],['st-soda-water','½ bottle',.021]],['Contains alcohol','Vegan','Gluten-free'],[],[],'','Wine glass, ice, pear slice.'],
  ['House red · glass','wine',12,'Côtes du Rhône.',[['st-house-red','150 ml',.0167]],['Contains alcohol','Vegan','Gluten-free'],[],[],'','150 ml pour.'],
  ['House white · glass','wine',11,'Sauvignon blanc.',[['st-house-white','150 ml',.0167]],['Contains alcohol','Vegan','Gluten-free'],[],[],'','150 ml pour.'],
  ['Rosé · glass','wine',11,'Provence style.',[['st-ros','150 ml',.0167]],['Contains alcohol','Vegan','Gluten-free'],[],[],'','150 ml pour.'],
  ['Prosecco · glass','wine',12,'Extra dry.',[['st-prosecco','125 ml',.028]],['Contains alcohol','Vegan','Gluten-free'],[],[],'','Flute.'],
  ['House red · bottle','wine',46,'Côtes du Rhône, 750 ml.',[['st-house-red','1 bottle',.083]],['Contains alcohol','Vegan','Gluten-free'],[],[],'','Present and pour.'],
  ['Draught pale ale','beer',8,'Pint.',[['st-draught-pale-ale','pint',.019]],['Contains alcohol','Vegan'],[],[],'','Pint glass.'],
  ['Draught lager','beer',7,'Pint.',[['st-draught-lager','pint',.019]],['Contains alcohol','Vegan'],[],[],'','Pint glass.'],
  ['Bottled lager','beer',6,'330 ml.',[['st-bottled-lager','1 bottle',.042]],['Contains alcohol','Vegan'],[],[],'','Served with a glass.'],
  ['Dry cider','beer',7,'330 ml.',[['st-dry-cider','1 bottle',.042]],['Contains alcohol','Vegan','Gluten-free'],[],[],'','Over ice if asked.'],
  ['Still water','soft',4,'750 ml.',[['st-still-mineral-water','1 bottle',.083]],['Vegan','Gluten-free'],[],[],'','Bottle and glasses.'],
  ['Sparkling water','soft',4,'750 ml.',[['st-sparkling-mineral-water','1 bottle',.083]],['Vegan','Gluten-free'],[],[],'','Bottle and glasses.'],
  ['Cola','soft',3.5,'330 ml.',[['st-cola','1 can',.042]],['Vegan','Gluten-free'],[],[],'','Glass with ice and lemon.'],
  ['Ginger beer','soft',4,'200 ml.',[['st-ginger-beer','1 bottle',.042]],['Vegan','Gluten-free'],[],[],'','Glass with ice and lime.'],
  ['Espresso','coffee',3.5,'Double shot.',[['st-espresso-beans','18 g',.018]],['Vegan','Gluten-free'],[],[],'','Demitasse.'],
  ['Latte','coffee',4.5,'Double shot, steamed milk.',[['st-espresso-beans','18 g',.018],['st-whole-milk','200 ml',.0167]],['Vegetarian','Gluten-free'],[],['milk'],'Oat milk on request.','Cup or glass.'],
  ['Pot of tea','coffee',4,'Loose-leaf selection.',[['st-loose-leaf-tea-selection','pot',.006]],['Vegan','Gluten-free'],[],[],'','Pot and cup; milk in a jug.']
 ];
 function seedMenu(s){
  const areas=s.setup.areas,stockIds=new Set((s.stock?.items||[]).map(i=>i.id)),station=a=>areas.includes(a)?a:areas[0],svc=new Set(s.setup.services.map(x=>x.name));
  // Brunch is a daypart: it only sells at lunch, so the POS hides it at dinner.
  const cats=CATEGORIES.map(([id,name,course,st],i)=>({id,name,course,station:station(st),order:i,active:true,services:id==='brunch'&&svc.has('Lunch')?['Lunch']:[]}));
  const mods=MODIFIERS.map(([id,name,required,multi,options])=>({id,name,required,multi,options:options.map(([n,p])=>({name:n,price:p}))}));
  const items=ITEMS.map(([name,category,price,description,recipe,dietary,allergens,modifiers,prep,plating],i)=>({id:'mi-'+slug(name),name,category,station:cats.find(c=>c.id===category).station,price,description,
   recipe:recipe.filter(([item])=>stockIds.has(item)).map(([item,amount,units])=>({item,amount,units})),dietary,allergens,mayContain:[],modifiers,prep,plating,tags:[],order:i,active:true}));
  const allergens={};for(const [k,v] of Object.entries(INGREDIENT_ALLERGENS))if(stockIds.has(k))allergens[k]=[...v];
  return {version:1,categories:cats,items,modifiers:mods,allergens,settings:{targetCost:30}};
 }
 function upgrade(state){
  let s=copy(state);if(!s?.setup)return s;
  // Validation may run before the stock catalog exists in this copy; the menu needs it for recipes.
  if(!s.stock&&B.stock?.upgrade)s=B.stock.upgrade(s);
  if(!s.stock)return s;
  s.menu??=seedMenu(s);
  const stockIds=new Set(s.stock.items.map(i=>i.id)),svc=new Set(s.setup.services.map(x=>x.name)),keep=B.addDays(B.dateString(new Date()),-7);
  for(const c of s.menu.categories)c.services=(c.services||[]).filter(n=>svc.has(n));
  for(const it of s.menu.items){it.recipe=(it.recipe||[]).filter(r=>stockIds.has(r.item));it.tags??=[];
   // A count set for a service is forgotten a week later so old limits never hide a dish.
   if(it.limit&&(!B.isDate(it.limit.date)||it.limit.date<keep||!svc.has(it.limit.service)))delete it.limit;}
  for(const k of Object.keys(s.menu.allergens||{}))if(!stockIds.has(k))delete s.menu.allergens[k];
  for(const u of s.unavailable){if(u.menuItem&&!s.menu.items.some(i=>i.id===u.menuItem))u.menuItem='';
   // A substitute whose dish was removed keeps its name as plain text.
   if(u.sub&&u.sub.item&&!s.menu.items.some(i=>i.id===u.sub.item))u.sub.item='';}
  return s;
 }
 function validMenu(s){
  const m=s.menu;if(!m||m.version!==1||!Array.isArray(m.categories)||!Array.isArray(m.items)||!Array.isArray(m.modifiers)||!m.allergens||typeof m.allergens!=='object'||!m.settings||!num(m.settings.targetCost,100))return false;
  if(m.categories.length>LIMITS.categories||m.items.length>LIMITS.items||m.modifiers.length>LIMITS.modifiers)return false;
  const areas=s.setup.areas,stockIds=new Set(s.stock.items.map(i=>i.id)),catIds=new Set(m.categories.map(c=>c.id)),modIds=new Set(m.modifiers.map(x=>x.id)),svc=new Set(s.setup.services.map(x=>x.name));
  if(catIds.size!==m.categories.length||modIds.size!==m.modifiers.length||new Set(m.items.map(i=>i.id)).size!==m.items.length)return false;
  if(!m.categories.every(c=>ident(c.id)&&label(c.name,40)&&COURSES.includes(c.course)&&areas.includes(c.station)&&Number.isInteger(c.order)&&typeof c.active==='boolean'&&Array.isArray(c.services)&&c.services.every(n=>svc.has(n))))return false;
  if(!m.items.every(i=>i.limit===undefined||(i.limit&&B.isDate(i.limit.date)&&svc.has(i.limit.service)&&Number.isInteger(i.limit.qty)&&i.limit.qty>=0&&i.limit.qty<=999)))return false;
  if(new Set(m.categories.map(c=>c.name.toLowerCase())).size!==m.categories.length)return false;
  if(!m.modifiers.every(x=>ident(x.id)&&label(x.name,60)&&typeof x.required==='boolean'&&typeof x.multi==='boolean'&&Array.isArray(x.options)&&x.options.length>0&&x.options.length<=LIMITS.options&&x.options.every(o=>label(o.name,60)&&typeof o.price==='number'&&Number.isFinite(o.price)&&o.price>=-1000&&o.price<=1000)&&new Set(x.options.map(o=>o.name.toLowerCase())).size===x.options.length))return false;
  if(!m.items.every(i=>ident(i.id)&&label(i.name,100)&&catIds.has(i.category)&&areas.includes(i.station)&&num(i.price,10000)&&txt(i.description,500)&&Array.isArray(i.recipe)&&i.recipe.length<=LIMITS.recipe&&i.recipe.every(r=>stockIds.has(r.item)&&txt(r.amount,40)&&num(r.units,1000))
   &&Array.isArray(i.dietary)&&i.dietary.every(d=>DIETARY.includes(d))&&Array.isArray(i.allergens)&&i.allergens.every(a=>ALLERGENS.includes(a))&&Array.isArray(i.mayContain)&&i.mayContain.every(a=>ALLERGENS.includes(a))
   &&Array.isArray(i.modifiers)&&i.modifiers.every(x=>modIds.has(x))&&txt(i.prep,1000)&&txt(i.plating,500)&&Array.isArray(i.tags)&&i.tags.every(t=>label(t,30))&&Number.isInteger(i.order)&&typeof i.active==='boolean'))return false;
  if(!Object.entries(m.allergens).every(([k,v])=>stockIds.has(k)&&Array.isArray(v)&&v.every(a=>ALLERGENS.includes(a))))return false;
  return s.unavailable.every(u=>(u.menuItem===undefined||u.menuItem===''||m.items.some(i=>i.id===u.menuItem))&&(!u.sub||!u.sub.item||m.items.some(i=>i.id===u.sub.item)));
 }
 function valid(s){try{s=upgrade(s);return prev.valid(s)&&validMenu(s);}catch{return false;}}

 // ---------- Derived ----------
 const menu=s=>s.menu;
 const item=(s,id)=>menu(s).items.find(i=>i.id===id);
 const category=(s,id)=>menu(s).categories.find(c=>c.id===id);
 const stockItem=(s,id)=>s.stock.items.find(i=>i.id===id);
 const courseOf=(s,it)=>category(s,it.category)?.course||'Mains';
 function cost(s,it){return round((it.recipe||[]).reduce((n,r)=>n+(stockItem(s,r.item)?.cost||0)*r.units,0));}
 function margin(s,it){const c=cost(s,it);return {cost:c,costPct:it.price?Math.round(c/it.price*1000)/10:0,margin:round(it.price-c)};}
 // Allergens: everything the ingredients carry, plus what the kitchen flagged by hand.
 function allergens(s,it){
  const map=menu(s).allergens,set=new Set(it.allergens||[]);
  for(const r of it.recipe||[])for(const a of map[r.item]||[])set.add(a);
  return ALLERGENS.filter(a=>set.has(a));
 }
 const ingredientAllergens=(s,stockId)=>menu(s).allergens[stockId]||[];
 const alerts=(s,date,service)=>s.unavailable.filter(u=>u.date===date&&u.service===service&&['Reported','Approved'].includes(u.status));
 // The colour a category carries on the Menu and on POS tiles: fixed by its place in the menu order, so both screens agree.
 const hue=(s,catId)=>{const cats=menu(s).categories.slice().sort((a,b)=>a.order-b.order),i=cats.findIndex(c=>c.id===catId);return i<0?7:i%8;};
 // Is this category served at this service? Empty means every service.
 const servedAt=(c,service)=>!c||!c.services?.length||c.services.includes(service);
 // How many of a dish the POS rang for a service (open and paid checks, voids and training checks left out).
 function sold(s,it,date=s.date,service=s.service){
  const P=B.pos;if(!P||!s.pos)return 0;let n=0;
  for(const c of P.checks(s,date,service)){if(c.status==='void'||c.training)continue;for(const l of c.lines)if(l.item===it.id&&l.status!=='void')n+=l.qty/(l.splitOf||1);}
  return Math.round(n*100)/100;
 }
 // A count set for the service ("12 portions tonight") leaves this many to sell; null when no count was set.
 function remaining(s,it,date=s.date,service=s.service){const lim=it.limit;if(!lim||lim.date!==date||lim.service!==service)return null;return Math.max(0,lim.qty-sold(s,it,date,service));}
 // Open checks that carry the dish right now: what an 86 would hit.
 function openOn(s,it,date=s.date,service=s.service){
  const out={checks:0,held:0,sent:0,qty:0,list:[]},P=B.pos;if(!P||!s.pos)return out;
  for(const c of P.openChecks(s,date,service)){const ls=c.lines.filter(l=>l.item===it.id&&l.status!=='void');if(!ls.length)continue;out.checks++;out.list.push(c);for(const l of ls){out.qty+=l.qty;if(l.status==='held')out.held+=l.qty;else out.sent+=l.qty;}}
  return out;
 }
 // What the manager set to offer instead of an 86’d item: the dish (with whether it can be sold right now) or plain text.
 function substitute(s,u,date=s.date,service=s.service){
  const sb=u?.sub;if(!sb||!sb.name)return null;
  const dish=sb.item?item(s,sb.item):null;
  if(!dish)return {item:'',name:sb.name,dish:null,available:null};
  const av=availability(s,dish,date,service,false);
  return {item:dish.id,name:dish.name,dish,price:dish.price,available:!OFF.includes(av.status),availability:av};
 }
 // Dishes a manager can offer instead: everything sellable right now, the 86’d item’s own category first, then the rest of the menu by category.
 function subOptions(s,{date=s.date,service=s.service,exclude=[],cat=''}={}){
  const all=list(s,{date,service}).filter(i=>!OFF.includes(i.availability.status)&&!exclude.includes(i.id)),row=i=>({id:i.id,name:i.name,price:i.price,category:i.category});
  const groups=[],same=cat?all.filter(i=>i.category===cat):[];
  if(same.length)groups.push({label:'Same category · '+(category(s,cat)?.name||''),items:same.map(row)});
  for(const c of menu(s).categories.slice().sort((a,b)=>a.order-b.order)){if(c.id===cat)continue;const l=all.filter(i=>i.category===c.id);if(l.length)groups.push({label:c.name,items:l.map(row)});}
  return groups;
 }
 // Can this be sold right now? Archived, 86’d on the board, an ingredient 86’d, not served at this service, sold out by count, counting down, or running low. deep=false skips the substitute lookup (a substitute’s own availability never chains).
 function availability(s,it,date=s.date,service=s.service,deep=true){
  if(!it.active)return {status:'archived',label:'Off the menu',reason:'Archived'};
  const list=alerts(s,date,service),subOf=u=>deep?substitute(s,u,date,service):null;
  const own=list.find(u=>u.menuItem===it.id);
  if(own)return {status:'86',label:own.status==='Approved'?'86’d':'86 reported',reason:own.reason,alert:own,pending:own.status==='Reported',sub:subOf(own)};
  const outs=[];for(const r of it.recipe||[]){const u=list.find(x=>x.item===r.item);if(u)outs.push({ingredient:stockItem(s,r.item)?.name||r.item,alert:u});}
  const approvedOut=outs.find(o=>o.alert.status==='Approved');
  if(approvedOut)return {status:'ingredient',label:'Out · '+approvedOut.ingredient,reason:approvedOut.alert.reason,alert:approvedOut.alert,ingredient:approvedOut.ingredient,sub:subOf(approvedOut.alert)};
  const cat=category(s,it.category);
  if(!servedAt(cat,service))return {status:'service',label:'Not at '+service,reason:cat.name+' is served at '+cat.services.join(' and ')+' only.',services:cat.services};
  const left=remaining(s,it,date,service);
  if(left===0)return {status:'soldout',label:'Sold out',reason:'All '+it.limit.qty+' sold.',remaining:0,limit:it.limit.qty};
  if(outs.length)return {status:'ingredient-reported',label:outs[0].ingredient+' reported out',reason:outs[0].alert.reason,alert:outs[0].alert,ingredient:outs[0].ingredient,pending:true,sub:subOf(outs[0].alert)};
  if(left!==null)return {status:'limited',label:left+' left',reason:left+' of '+it.limit.qty+' left to sell.',remaining:left,limit:it.limit.qty};
  const low=(it.recipe||[]).map(r=>stockItem(s,r.item)).filter(x=>x&&x.onHand!==null&&x.onHand<x.par&&!(s.orders||[]).some(o=>o.item===x.id&&['Approved','Ordered'].includes(o.status)));
  if(low.length)return {status:'low',label:'Low · '+low[0].name,reason:low.map(x=>x.name).join(', ')+' below par',low:low.map(x=>x.name)};
  return {status:'ok',label:'Available',reason:''};
 }
 const OFF=['archived','86','ingredient','service','soldout'];
 const sellable=(s,it,date,service)=>!OFF.includes(availability(s,it,date,service).status);
 function list(s,{date=s.date,service=s.service,category:catId='',query='',activeOnly=true}={}){
  const q=String(query||'').trim().toLowerCase();
  return menu(s).items.filter(i=>(!activeOnly||i.active)&&(!catId||i.category===catId)&&(!q||i.name.toLowerCase().includes(q)||(i.description||'').toLowerCase().includes(q)||allergens(s,i).some(a=>a.toLowerCase().includes(q))||(i.dietary||[]).some(d=>d.toLowerCase().includes(q))||(i.tags||[]).some(t=>t.toLowerCase().includes(q))))
   .map(i=>({...i,course:courseOf(s,i),allergenList:allergens(s,i),availability:availability(s,i,date,service),...margin(s,i)}))
   .sort((a,b)=>(category(s,a.category)?.order??0)-(category(s,b.category)?.order??0)||a.order-b.order||a.name.localeCompare(b.name));
 }
 // Groups by category. inService drops the categories not served at the service (the POS); the Menu screen keeps them with a tag.
 const byCategory=(s,opts={})=>menu(s).categories.filter(c=>c.active&&(!opts.inService||servedAt(c,opts.service||s.service))).sort((a,b)=>a.order-b.order).map(c=>({category:c,items:list(s,{...opts,category:c.id})})).filter(g=>g.items.length||opts.keepEmpty);
 // Dishes a guest can have when they avoid certain allergens (not "may contain" either).
 const safeFor=(s,avoid,opts={})=>list(s,opts).filter(i=>!i.allergenList.some(a=>avoid.includes(a))&&!(i.mayContain||[]).some(a=>avoid.includes(a)));
 const matrix=s=>list(s).map(i=>({item:i,cells:ALLERGENS.map(a=>i.allergenList.includes(a)?'yes':(i.mayContain||[]).includes(a)?'may':'')}));
 // Everything that is off right now, and why; plus the counts running down.
 function outs(s,date=s.date,service=s.service){
  const all=list(s,{date,service});
  return {off:all.filter(i=>['86','ingredient','soldout'].includes(i.availability.status)),reported:all.filter(i=>i.availability.status==='ingredient-reported'||(i.availability.status==='86'&&i.availability.pending)),low:all.filter(i=>i.availability.status==='low'),limited:all.filter(i=>i.availability.status==='limited'),notServed:all.filter(i=>i.availability.status==='service')};
 }
 // Every count set for this service, with what is left: the kitchen's board.
 const counts=(s,date=s.date,service=s.service)=>menu(s).items.filter(i=>i.active&&i.limit&&i.limit.date===date&&i.limit.service===service).map(i=>({item:i,qty:i.limit.qty,sold:sold(s,i,date,service),remaining:remaining(s,i,date,service)})).sort((a,b)=>a.remaining-b.remaining||a.item.name.localeCompare(b.item.name));
 // Which dishes use a stock item: handy when it runs out.
 const usedIn=(s,stockId)=>menu(s).items.filter(i=>i.active&&(i.recipe||[]).some(r=>r.item===stockId));
 const modifierGroups=(s,it)=>(it.modifiers||[]).map(id=>menu(s).modifiers.find(m=>m.id===id)).filter(Boolean);
 function priceWith(s,it,mods=[]){let p=it.price;for(const g of modifierGroups(s,it))for(const o of g.options)if(mods.includes(o.name))p+=o.price;return round(p);}

 function change(state,action,role=state.role){
  let s=upgrade(state);const a=copy(action);
  if(!a?.type?.startsWith('menu:')){
   if(a?.type==='ops:remove-catalog'&&a.catalog==='areas'&&(s.menu.categories.some(c=>c.station===a.name)||s.menu.items.some(i=>i.station===a.name)))throw Error('Menu categories or dishes are routed to this station. Change their station first.');
   const renamed=a?.type==='ops:catalog'&&a.catalog==='areas'&&a.oldName?a.oldName:'';
   const svcOld=a?.type==='ops:service'?s.setup.services.find(x=>x.id===a.id)?.name:'',svcNew=svcOld?String(a.name||'').trim():'';
   const next=prev.change(s,a,role);
   // A renamed service keeps the day-part categories and counts that pointed at it (mapped before upgrade prunes names that no longer exist).
   if(svcOld&&svcNew&&svcOld!==svcNew&&next.menu){for(const c of next.menu.categories)c.services=(c.services||[]).map(n=>n===svcOld?svcNew:n);for(const i of next.menu.items)if(i.limit?.service===svcOld)i.limit.service=svcNew;}
   s=upgrade(next);
   if(renamed&&renamed!==a.name){for(const c of s.menu.categories)if(c.station===renamed)c.station=a.name;for(const i of s.menu.items)if(i.station===renamed)i.station=a.name;}
   if(!valid(s))throw Error('Check the menu details.');return s;
  }
  const me=B.actor(role,s.crewId,s.managerId),manager=role==='manager',viewer=s.team.find(p=>p.id===me);
  if(!viewer?.active||viewer.access!==role)throw Error('Choose an active team member.');
  const lead=manager||!!B.permissions?.can(s,'menu',me);
  const needLead=()=>{if(!lead)throw Error('Only managers or a menu lead can change the menu.');};
  const m=s.menu,now=new Date().toISOString();
  const get=id=>{const x=m.items.find(i=>i.id===id);if(!x)throw Error('This menu item no longer exists.');return x;};
  const clean=(x,max)=>String(x??'').trim().slice(0,max);
  if(a.type==='menu:category'){
   needLead();const name=clean(a.name,40);if(!name)throw Error('Give the category a name.');
   if(!COURSES.includes(a.course))throw Error('Choose a course.');if(!s.setup.areas.includes(a.station))throw Error('Choose the station that makes it.');
   if(m.categories.some(c=>c.id!==a.id&&c.name.toLowerCase()===name.toLowerCase()))throw Error('Another category already has that name.');
   const old=m.categories.find(c=>c.id===a.id),id=old?.id||a.id||slug(name);if(!ident(id))throw Error('This category could not be saved.');
   const svcAll=s.setup.services.map(x=>x.name),svcLive=s.setup.services.filter(v=>v.active!==false).map(v=>v.name),services=[...new Set([].concat(a.services||[]).filter(n=>svcAll.includes(n)))];
   const next={id,name,course:a.course,station:a.station,order:old?.order??m.categories.length,active:a.active!==false,services:svcLive.every(n=>services.includes(n))?[]:services};
   if(old)Object.assign(old,next);else{if(m.categories.length>=LIMITS.categories)throw Error('Up to 40 categories are supported.');m.categories.push(next);}
   // Dishes follow their category's station unless they were routed elsewhere on purpose.
   if(old&&old.station!==a.station)for(const i of m.items)if(i.category===id&&i.station===old.station)i.station=a.station;
  }else if(a.type==='menu:category-order'){
   needLead();const i=m.categories.findIndex(c=>c.id===a.id),j=i+(a.direction<0?-1:1);if(i<0)throw Error('That category no longer exists.');if(j<0||j>=m.categories.length)return s;
   [m.categories[i],m.categories[j]]=[m.categories[j],m.categories[i]];m.categories.forEach((c,k)=>c.order=k);
  }else if(a.type==='menu:remove-category'){
   needLead();const c=m.categories.find(x=>x.id===a.id);if(!c)throw Error('That category no longer exists.');
   if(m.items.some(i=>i.category===c.id))throw Error('Move or archive the dishes in this category first.');
   m.categories=m.categories.filter(x=>x!==c);
  }else if(a.type==='menu:item'){
   needLead();const name=clean(a.name,100);if(!name)throw Error('Give the dish a name.');
   const cat=m.categories.find(c=>c.id===a.category);if(!cat)throw Error('Choose a category.');
   const price=Number(a.price);if(!num(price,10000))throw Error('Enter a price.');
   const station=s.setup.areas.includes(a.station)?a.station:cat.station;
   if(m.items.some(i=>i.id!==a.id&&i.name.toLowerCase()===name.toLowerCase()))throw Error('Another menu item already has that name.');
   const recipe=[];for(const r of Array.isArray(a.recipe)?a.recipe:[]){if(!r||(!r.item&&!String(r.name||'').trim()))continue;const st=ingredient(s,r,station);if(!st)throw Error('An ingredient is not on the stock list.');const units=Number(r.units);if(!num(units,1000))throw Error('Check the portion for '+st.name+'.');if(recipe.some(x=>x.item===st.id))continue;recipe.push({item:st.id,amount:clean(r.amount,40),units:round(units*10000)/10000});}
   if(recipe.length>LIMITS.recipe)throw Error('Up to 30 ingredients per dish.');
   const pick=(listIn,allowed)=>[...new Set([].concat(listIn||[]).filter(x=>allowed.includes(x)))];
   const modifiers=[...new Set([].concat(a.modifiers||[]).filter(id=>m.modifiers.some(x=>x.id===id)))];
   const old=m.items.find(i=>i.id===a.id),id=old?.id||a.id||'mi-'+slug(name);if(!ident(id))throw Error('This item could not be saved.');
   const next={id,name,category:cat.id,station,price:round(price),description:clean(a.description,500),recipe,dietary:pick(a.dietary,DIETARY),allergens:pick(a.allergens,ALLERGENS),mayContain:pick(a.mayContain,ALLERGENS),modifiers,prep:clean(a.prep,1000),plating:clean(a.plating,500),tags:[].concat(a.tags||[]).map(t=>clean(t,30)).filter(Boolean).slice(0,8),order:old?.order??m.items.length,active:a.active!==false,updatedAt:now};
   if(old)Object.assign(old,next);else{if(m.items.length>=LIMITS.items)throw Error('The menu is full.');m.items.push(next);}
  }else if(a.type==='menu:archive'){
   needLead();const x=get(a.id);x.active=a.active===true;x.updatedAt=now;
  }else if(a.type==='menu:price'){
   // A quick price change from the dish sheet. Lines already on checks keep the price they were rung at.
   needLead();const x=get(a.id),price=Number(a.price);if(!num(price,10000))throw Error('Enter a price.');x.price=round(price);x.updatedAt=now;
  }else if(a.type==='menu:item-order'){
   // Dishes move within their category; the POS tiles follow the same order.
   needLead();const x=get(a.id),sib=m.items.filter(i=>i.category===x.category).sort((p,q)=>p.order-q.order||p.name.localeCompare(q.name)),i=sib.indexOf(x),j=i+(a.direction<0?-1:1);
   if(j<0||j>=sib.length)return s;
   m.items.sort((p,q)=>p.order-q.order||p.name.localeCompare(q.name)).forEach((it,k)=>it.order=k);
   const y=sib[j];[x.order,y.order]=[y.order,x.order];
  }else if(a.type==='menu:duplicate'){
   // A copy to start the next dish from: same recipe, modifiers and notes, a fresh name.
   needLead();const x=get(a.id);if(m.items.length>=LIMITS.items)throw Error('The menu is full.');
   let name=x.name+' copy',n=2;while(m.items.some(i=>i.name.toLowerCase()===name.toLowerCase()))name=x.name+' copy '+n++;
   const id='mi-'+slug(name);if(!ident(id)||m.items.some(i=>i.id===id))throw Error('This dish could not be copied.');
   const next={...copy(x),id,name:name.slice(0,100),order:m.items.length,active:true,updatedAt:now};delete next.limit;m.items.push(next);
  }else if(a.type==='menu:limit'){
   // The kitchen sets how many portions there are for a service; the POS counts them down and marks the dish sold out at zero.
   if(!lead&&!B.permissions?.can(s,'report86',me))throw Error('Only managers, a menu lead or someone who can report 86s can set a count.');
   const x=get(a.id),date=a.date||s.date,service=a.service||s.service;
   if(!B.isDate(date)||!s.setup.services.some(v=>v.name===service))throw Error('Choose a service.');
   if(a.qty===null||a.qty===''||a.qty===undefined){delete x.limit;}
   else{const qty=Number(a.qty);if(!Number.isInteger(qty)||qty<0||qty>999)throw Error('Enter a count between 0 and 999.');x.limit={date,service,qty};}
  }else if(a.type==='menu:modifier'){
   needLead();const name=clean(a.name,60);if(!name)throw Error('Give the modifier group a name.');
   const options=[];for(const o of Array.isArray(a.options)?a.options:[]){const n=clean(o?.name,60);if(!n)continue;const p=Number(o.price||0);if(!Number.isFinite(p)||p<-1000||p>1000)throw Error('Check the price for '+n+'.');if(options.some(x=>x.name.toLowerCase()===n.toLowerCase()))continue;options.push({name:n,price:round(p)});}
   if(!options.length)throw Error('Add at least one option.');if(options.length>LIMITS.options)throw Error('Up to 20 options per group.');
   const old=m.modifiers.find(x=>x.id===a.id),id=old?.id||a.id||slug(name);if(!ident(id))throw Error('This modifier could not be saved.');
   const next={id,name,required:a.required===true,multi:a.multi===true,options};
   if(old)Object.assign(old,next);else{if(m.modifiers.length>=LIMITS.modifiers)throw Error('Up to 60 modifier groups are supported.');m.modifiers.push(next);}
  }else if(a.type==='menu:remove-modifier'){
   needLead();if(!m.modifiers.some(x=>x.id===a.id))throw Error('That modifier no longer exists.');
   m.modifiers=m.modifiers.filter(x=>x.id!==a.id);for(const i of m.items)i.modifiers=i.modifiers.filter(x=>x!==a.id);
  }else if(a.type==='menu:ingredient'){
   needLead();const st=s.stock.items.find(i=>i.id===a.item);if(!st)throw Error('That stock item no longer exists.');
   const listA=[...new Set([].concat(a.allergens||[]).filter(x=>ALLERGENS.includes(x)))];
   if(listA.length)m.allergens[st.id]=listA;else delete m.allergens[st.id];
  }else if(a.type==='menu:settings'){
   if(!manager)throw Error('Only managers can change menu settings.');
   const t=Number(a.targetCost);if(!num(t,100))throw Error('Enter a target food cost between 0 and 100%.');m.settings.targetCost=round(t);
  }else if(a.type==='menu:86'){
   // A dish goes on the 86 board like a stock item: crew reports stay unconfirmed until a manager approves.
   const x=get(a.item),date=a.date||s.date,service=a.service||s.service;
   if(alerts(s,date,service).some(u=>u.menuItem===x.id&&u.id!==a.id))throw Error(`${x.name} is already on the 86 board for this service.`);
   const reason=clean(a.reason,500)||'Sold out.';
   if(a.sub&&a.sub.item===x.id)throw Error('Pick a different dish to offer instead.');
   s=upgrade(prev.change(s,{type:'ops:alert',id:a.id,date,service,name:x.name,reason,area:x.station,sub:a.sub},role));
   const u=s.unavailable.find(y=>y.id===a.id);if(u)u.menuItem=x.id;
  }else throw Error('Unknown menu action.');
  sweep(s);
  if(!valid(s))throw Error('Check the menu details.');return s;
 }
 B.menu={ALLERGENS,CODES,DIETARY,COURSES,LIMITS,OFF,upgrade,seed:seedMenu,item,category,courseOf,hue,servedAt,cost,margin,allergens,ingredientAllergens,availability,sellable,sold,remaining,openOn,counts,list,byCategory,safeFor,matrix,outs,usedIn,modifierGroups,priceWith,alerts,substitute,subOptions};
 B.starter=(...args)=>upgrade(prev.starter(...args));B.validState=valid;B.change=change;
 B.load=storage=>{try{
  const s=upgrade(prev.load(storage));if(valid(s))return s;
  // A menu that no longer fits the workspace (stations or stock edited elsewhere) is rebuilt rather than losing everything else.
  s.menu=seedMenu(s);for(const u of s.unavailable)if(u.menuItem&&!s.menu.items.some(i=>i.id===u.menuItem))u.menuItem='';
  if(valid(s))return s;
 }catch{}return B.starter();};
})();
