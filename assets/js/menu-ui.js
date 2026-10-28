/* Menu screen: the menu by category with live availability (86s, counts, day-parts, stock), a stats strip fed by the POS, a category rail, cards or a list, a dish sheet with recipe, cost, allergens and an "At the till" panel (price, happy hour, tax, sold today, open checks, count, menu-engineering class), the allergen finder and matrix, the 86 board with the kitchen's counts, a Performance tab (menu engineering from POS sales) and setup for categories, modifiers, ingredient allergens and the target cost. Shares the Stock layout and the POS category colours. */
globalThis.createMenuUI=function(api){
 'use strict';
 const B=Brigly,M=()=>B.menu,P=()=>B.pos,{e,input,textarea,select,dateLabel}=api,s=()=>api.state();
 const manager=()=>s().role==='manager',me=()=>B.actor(s().role,s().crewId,s().managerId),can=k=>manager()||!!B.permissions?.can(s(),k),lead=()=>can('menu'),canReport=()=>can('report86'),canCount=()=>lead()||canReport(),canPos=()=>!!(P()&&s().pos)&&can('pos');
 const paths={menu:'M4 4h16v16H4z M8 8h8 M8 12h8 M8 16h5',allergen:'M12 3 2 20h20z M12 9v5 M12 17h.01',out:'M5 5l14 14 M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20',setup:'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M4 12h2 M18 12h2 M12 4v2 M12 18v2 M6.3 6.3l1.4 1.4 M16.3 16.3l1.4 1.4 M6.3 17.7l1.4-1.4 M16.3 7.7l1.4-1.4',search:'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14 M20 20l-4-4',add:'M12 5v14 M5 12h14',check:'M5 12l5 5 9-10',x:'M6 6l12 12 M18 6L6 18',edit:'M4 20h4L19 9l-4-4L4 16z M13 7l4 4',chev:'M9 6l6 6-6 6',stock:'M21 8 12 3 3 8v8l9 5 9-5z M3 8l9 5 9-5 M12 13v8',leaf:'M5 20c0-9 5-14 14-14-1 9-6 14-14 14z M5 20l8-8',chart:'M4 3v18h17 M8 16v-5 M13 16V6 M18 16v-8',count:'M5 9h14 M5 15h14 M10 4 8 20 M16 4l-2 16',pos:'M3 7h18v10H3z M3 11h18 M7 15h3',up:'M12 19V5 M5 12l7-7 7 7',down:'M12 5v14 M5 12l7 7 7-7',copy:'M8 8h12v12H8z M4 16V4h12',grid:'M4 4h7v7H4z M13 4h7v7h-7z M4 13h7v7H4z M13 13h7v7h-7z',list:'M4 6h16 M4 12h16 M4 18h16',clock:'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18 M12 7v5l3 2',star:'m12 3 2.7 5.6 6.3.9-4.5 4.4 1 6.1-5.5-2.9L6.5 20l1-6.1L3 9.5l6.3-.9z',tag:'M3 12V4h8l9 9-8 8z M7 8h.01'};
 const icon=k=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[k]||paths.menu}"/></svg>`;
 const money=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(n||0);
 const pct=n=>(Math.round((n||0)*10)/10)+'%';
 const plural=(n,w,ws)=>n+' '+(n===1?w:ws||w+'s');
 const name=id=>B.person(id)?.name||'Team member',first=id=>name(id).split(' ')[0];
 const today=()=>B.dateString(new Date());
 const btn=(label,action,id='',style='secondary',attrs='')=>`<button type="button" class="button ${style}" data-action="mn-${action}" data-id="${e(id)}" ${attrs}>${label}</button>`;
 const tag=(label,tone='slate')=>`<span class="sk-tag" data-tone="${tone}">${e(label)}</span>`;
 const avTone=st=>st==='ok'?'sage':st==='low'?'amber':st==='limited'?'orange':st==='archived'||st==='service'?'slate':'danger';
 const code=a=>`<abbr class="mn-code" title="${e(a)}">${e(M().CODES[a]||a.slice(0,2))}</abbr>`;
 const codes=list=>list.length?`<span class="mn-codes" aria-label="Allergens: ${e(list.join(', '))}">${list.map(code).join('')}</span>`:'<span class="mn-codes is-none">No listed allergens</span>';
 const DIET_SHORT={Vegetarian:'V',Vegan:'VG','Gluten-free':'GF','Dairy-free':'DF','Nut-free':'NF','Contains alcohol':'ABV',Spicy:'Spicy',Kids:'Kids'};
 const diets=list=>(list||[]).map(d=>`<abbr class="mn-diet" data-tone="${d==='Contains alcohol'||d==='Spicy'?'orange':'sage'}" title="${e(d)}">${e(DIET_SHORT[d]||d)}</abbr>`).join('');
 const costTone=p=>{const t=s().menu.settings.targetCost;return p<=t?'sage':p<=t+8?'amber':'danger';};
 const hueStyle=catId=>`--ct:var(--cat-${M().hue(s(),catId)})`;
 const klassTone=k=>k==='Star'?'sage':k==='Plow horse'?'amber':k==='Puzzle'?'orange':'danger';
 let tab='menu',cat='',query='',avoid=new Set(),diet=new Set(),viewer='',form=null,pane='categories',sort='menu',view='cards',period=28,ingQuery='';
 const ensure=()=>{if(viewer!==me()){viewer=me();cat='';query='';avoid=new Set();diet=new Set();sort='menu';}if((tab==='setup'||tab==='performance')&&!lead())tab='menu';if(!lead()&&['cost','sales'].includes(sort))sort='menu';};
 const items=()=>M().list(s(),{query});
 const outs=()=>M().outs(s());
 // What the POS does with a dish right now: price (with happy hour), tax rate and group, sold today, open checks, the count, four weeks of sales.
 function till(i){
  const st=s();if(!P()||!st.pos)return null;
  const now=st.date===today()?B.floor.nowMinutes():undefined,pr=P().priceFor(st,i,st.date,st.service,now),set=st.pos.settings,hh=set.happyHour,inHH=hh.enabled&&hh.pct>0&&hh.categories.includes(i.category);
  const window_=(st.specials||[]).find(x=>x.kind==='happy_hour'&&x.active&&x.date===st.date&&x.service===st.service&&x.time)?.time||'';
  const group=(set.taxGroups||[]).find(g=>(g.categories||[]).includes(i.category));
  const t=today(),S=P().sales(st,{from:B.addDays(t,-27),to:t}),row=S.items.find(x=>x.id===i.id),mix=P().menuMix(st,B.addDays(t,-27),t).rows.find(r=>r.id===i.id);
  return {price:pr.price,promo:pr.promo,base:pr.base,inHH,hhPct:hh.pct,hhPrice:inHH?Math.round(i.price*(1-hh.pct/100)*100)/100:null,hhWindow:window_,tax:group?group.rate:set.taxRate,taxName:group?group.name:'Standard',soldToday:M().sold(st,i),open:M().openOn(st,i),remaining:M().remaining(st,i),sold4:row?row.qty:0,net4:row?row.net:0,klass:mix?.klass||'',share:mix?.share||0};
 }
 const sales4=()=>{const st=s();if(!P()||!st.pos)return new Map();const t=today();return P().sales(st,{from:B.addDays(t,-27),to:t}).byItem;};

 function tabs(){
  const o=outs(),off=o.off.length+o.reported.length;
  const list=[['menu','Menu','menu',null],['allergens','Allergens','allergen',null],['86','86 & counts','out',off?[off,o.off.length?'danger':'amber',off+' off']:o.limited.length?[o.limited.length,'orange',o.limited.length+' counting down']:null]];
  if(lead())list.push(['performance','Performance','chart',null],['setup','Setup','setup',null]);
  return `<nav class="sk-tabs" aria-label="Menu sections">${list.map(([id,label,key,n])=>`<button type="button" data-action="mn-tab" data-id="${id}" ${tab===id?'aria-current="page"':''} aria-label="${label}${n?', '+e(n[2]):''}"><span class="sk-tab-icon">${icon(key)}${n?`<em data-tone="${n[1]}">${n[0]}</em>`:''}</span><span class="sk-tab-label">${label}</span></button>`).join('')}</nav>`;
 }
 // ---------- Menu ----------
 function stats(){
  const st=s(),o=outs(),on=M().list(st).length,out=[];
  const stat=(b,label,tone='')=>`<span class="mn-stat" ${tone?`data-tone="${tone}"`:''}><b>${b}</b><small>${label}</small></span>`;
  out.push(stat(on,'on the menu'));
  if(o.off.length)out.push(stat(o.off.length,'off now','danger'));
  if(o.reported.length)out.push(stat(o.reported.length,'reported','amber'));
  if(o.limited.length)out.push(stat(o.limited.length,'counting down','orange'));
  if(o.notServed.length)out.push(stat(o.notServed.length,'not at '+e(st.service)));
  if(P()&&st.pos){
   const now=st.date===today()?B.floor.nowMinutes():undefined,hh=P().happyHour(st,st.date,st.service,now),set=st.pos.settings.happyHour;
   const next=(st.specials||[]).find(x=>x.kind==='happy_hour'&&x.active&&x.date===st.date&&x.service===st.service);
   if(set.enabled&&hh)out.push(stat(set.pct+'% off','happy hour now · '+e(set.categories.map(c=>M().category(st,c)?.name||c).join(', ')),'orange'));
   else if(set.enabled&&next?.time)out.push(stat(e(next.time),'happy hour · '+set.pct+'% off'));
   if(lead()){const t=today(),mix=P().menuMix(st,B.addDays(t,-27),t);if(mix.units)out.push(stat(pct(mix.costPct),'food cost · 4 wk',costTone(mix.costPct)));}
  }
  return `<div class="mn-stats" aria-label="Menu at a glance">${out.join('')}</div>`;
 }
 function card(i,sold){
  const av=i.availability,off=M().OFF.includes(av.status),t=P()&&s().pos?P().priceFor(s(),i,s().date,s().service,s().date===today()?B.floor.nowMinutes():undefined):{price:i.price};
  return `<button type="button" class="mn-card ${off?'is-off':''} ${av.status==='limited'?'is-limited':''}" style="${hueStyle(i.category)}" data-action="mn-open" data-id="${e(i.id)}" aria-label="${e(i.name)}, ${money(t.price)}, ${e(av.label)}"><span class="mn-card-top"><strong>${e(i.name)}</strong><b class="mn-price ${t.promo?'is-promo':''}">${t.promo?`<s>${money(t.base)}</s>`:''}${money(t.price)}</b></span><small class="mn-desc">${e(i.description||'')}</small><span class="mn-card-foot">${av.status!=='ok'?tag(av.label,avTone(av.status)):''}${diets(i.dietary)}${codes(i.allergenList)}${lead()?`<span class="mn-cost" data-tone="${costTone(i.costPct)}">${pct(i.costPct)} cost</span>`:''}${lead()&&sold?`<span class="mn-sold" title="Sold in the last four weeks">${sold}× · 4 wk</span>`:''}</span></button>`;
 }
 function row(i,sold){
  const av=i.availability,off=M().OFF.includes(av.status);
  return `<button type="button" class="sk-row mn-row mn-row-dish ${off?'is-off':''}" style="${hueStyle(i.category)}" data-action="mn-open" data-id="${e(i.id)}"><span class="sk-row-main"><i class="mn-dot"></i><span class="sk-row-text"><strong>${e(i.name)}</strong><small><span>${e(i.description||'')}</span></small></span></span><span class="sk-row-act mn-row-meta">${av.status!=='ok'?tag(av.label,avTone(av.status)):''}${codes(i.allergenList)}${lead()?`<span class="mn-cost" data-tone="${costTone(i.costPct)}">${pct(i.costPct)}</span><small class="mn-sold">${sold?sold+'×':'—'}</small>`:''}<b class="mn-price">${money(i.price)}</b></span></button>`;
 }
 function sorted(list,sold){
  const l=list.slice();
  if(sort==='price')l.sort((a,b)=>a.price-b.price||a.order-b.order);
  else if(sort==='cost')l.sort((a,b)=>b.costPct-a.costPct||a.order-b.order);
  else if(sort==='sales')l.sort((a,b)=>(sold.get(b.id)?.[0]||0)-(sold.get(a.id)?.[0]||0)||a.order-b.order);
  else if(sort==='name')l.sort((a,b)=>a.name.localeCompare(b.name));
  return l;
 }
 function menuView(){
  const st=s(),groups=M().byCategory(st,{query}),cats=st.menu.categories.filter(c=>c.active).sort((a,b)=>a.order-b.order),sold=sales4();
  const catBtn=(id,label,n,extra='',style='')=>`<button type="button" class="mn-cat ${extra}" role="tab" data-action="mn-cat" data-id="${e(id)}" aria-selected="${cat===id}" ${style?`style="${style}"`:''}><i class="mn-dot"></i><span>${label}</span><em>${n}</em></button>`;
  const rail=`<nav class="mn-cats" role="tablist" aria-label="Categories">${catBtn('','All',items().length,'is-all')}${cats.map(c=>{const n=groups.find(g=>g.category.id===c.id)?.items.length||0,off=!M().servedAt(c,st.service);return catBtn(c.id,e(c.name)+(off?`<small>${e(c.services.join(' · '))} only</small>`:''),n,off?'is-muted':'',hueStyle(c.id));}).join('')}</nav>`;
  const sortOpts=[['menu','Menu order'],['name','A to Z'],['price','Price'],...(lead()?[['cost','Food cost'],['sales','Best sellers']]:[])];
  const bar=`<div class="mn-toolbar"><label class="sk-search"><span class="sr-only">Search the menu</span>${icon('search')}<input type="search" data-mn-search value="${e(query)}" placeholder="Dish, drink, allergen, diet or tag" autocomplete="off"></label><div class="sk-select"><span class="sr-only">Sort</span><select data-mn-sort aria-label="Sort dishes">${sortOpts.map(([k,l])=>`<option value="${k}" ${sort===k?'selected':''}>${l}</option>`).join('')}</select></div><div class="mn-view" role="group" aria-label="View"><button type="button" class="sk-iconbtn" data-action="mn-view" data-id="cards" aria-pressed="${view==='cards'}" aria-label="Cards">${icon('grid')}</button><button type="button" class="sk-iconbtn" data-action="mn-view" data-id="list" aria-pressed="${view==='list'}" aria-label="List">${icon('list')}</button></div><div class="toolbar mn-actions">${canCount()?btn(icon('count')+'<span>Set a count</span>','count','','secondary fl-icon-btn'):''}${canReport()?btn(icon('out')+'<span>86 a dish</span>','86','','secondary fl-icon-btn'):''}${lead()?btn(icon('add')+'<span>Add dish</span>','item','','fl-icon-btn'):''}</div></div>`;
  const shown=cat?groups.filter(g=>g.category.id===cat):groups;
  const head=g=>{const c=g.category,off=!M().servedAt(c,st.service);return `<h3 class="sk-group-head mn-group-head" style="${hueStyle(c.id)}"><i class="mn-dot"></i>${e(c.name)}<span>${g.items.length}</span><small>${e(c.course)} · ${e(c.station)}${off?' · '+tag(c.services.join(' · ')+' only','slate'):c.services.length?' · '+e(c.services.join(' · ')):''}</small>${lead()?btn(icon('edit'),'category',c.id,'quiet small fl-icon-only','aria-label="Edit category"'):''}</h3>`;};
  const body=shown.length?shown.map(g=>{const list=sorted(g.items,sold);return `<section class="mn-group">${head(g)}${view==='list'?`<div class="sk-card mn-list">${list.map(i=>row(i,sold.get(i.id)?.[0]||0)).join('')}</div>`:`<div class="mn-grid">${list.map(i=>card(i,sold.get(i.id)?.[0]||0)).join('')}</div>`}</section>`;}).join(''):`<div class="empty"><strong>Nothing matches</strong>Try another word, or clear the search.</div>`;
  const o=outs(),banner=o.off.length?`<div class="sk-banner" data-tone="danger">${icon('out')}<span><strong>${plural(o.off.length,'dish','dishes')} off right now:</strong> ${e(o.off.map(i=>i.name+(i.availability.status==='soldout'?' (sold out)':'')).join(', '))}</span>${btn('See why','tab','86','quiet small')}</div>`:o.limited.length?`<div class="sk-banner" data-tone="amber">${icon('count')}<span><strong>Counting down:</strong> ${e(o.limited.map(i=>i.name+' · '+i.availability.remaining+' left').join(', '))}</span>${btn('Counts','tab','86','quiet small')}</div>`:'';
  return bar+stats()+`<div class="mn-layout">${rail}<div class="mn-body">${banner}${body}</div></div>`;
 }
 // The dish sheet: everything a server, a cook or the till asks about one dish.
 function itemSheet(id){
  const st=s(),raw=M().item(st,id);if(!raw)return;
  const i=M().list(st,{activeOnly:false}).find(x=>x.id===id)||raw,av=i.availability,c=M().category(st,i.category),T=till(i);
  const recipe=(i.recipe||[]).map(r=>{const x=st.stock.items.find(y=>y.id===r.item);if(!x)return '';const alert=st.unavailable.find(u=>u.item===x.id&&u.date===st.date&&u.service===st.service&&['Approved','Reported'].includes(u.status));const low=x.onHand!==null&&x.onHand<x.par;
   return `<div class="mn-ing"><button type="button" class="mn-ing-main" data-action="stock-open" data-id="${e(x.id)}"><strong>${e(x.name)}</strong><small>${e(r.amount||'')}${r.amount?' · ':''}${e(x.category)}${M().ingredientAllergens(st,x.id).length?' · '+e(M().ingredientAllergens(st,x.id).join(', ')):''}</small></button><span class="mn-ing-side">${alert?tag(alert.status==='Approved'?'86’d':'Reported','danger'):low?tag('Low','amber'):x.onHand!==null?tag('On hand','sage'):''}${lead()?`<b>${money((x.cost||0)*r.units)}</b>`:''}</span></div>`;}).join('');
  const banner=M().OFF.includes(av.status)&&av.status!=='archived'?`<div class="fl-current" data-tone="danger"><div><strong>${e(av.label)}</strong><small>${e(av.reason||'')}${av.alert?' · '+e(first(av.alert.author))+(av.alert.status==='Reported'?' · waiting for a manager':''):''}${T&&T.open.checks?` · still on ${plural(T.open.checks,'open check')}${T.open.held?' ('+T.open.held+' not sent yet)':''}`:''}</small></div></div>`
   :av.status==='86'&&av.pending?`<div class="fl-current" data-tone="danger"><div><strong>${e(av.label)}</strong><small>${e(av.reason||'')} · ${e(first(av.alert.author))} · waiting for a manager</small></div></div>`
   :av.status==='ingredient-reported'?`<div class="fl-current" data-tone="danger"><div><strong>${e(av.label)}</strong><small>${e(av.reason||'')} · waiting for a manager</small></div></div>`
   :av.status==='limited'?`<div class="mn-count-bar" data-tone="${av.remaining<=3?'danger':'orange'}"><div><strong>${av.remaining} of ${av.limit} left for ${e(st.service)}</strong><small>${T?plural(T.soldToday,'sold'):''}${T&&T.open.held?' · '+T.open.held+' held on open checks':''}. The POS marks it sold out at zero.</small></div><i style="--p:${Math.round(av.remaining/Math.max(1,av.limit)*100)}%"></i></div>`
   :av.status==='low'?`<p class="sk-hint">Running low on ${e(av.low.join(', '))}. Check with the kitchen before pushing it.</p>`:'';
  const tillPanel=T?`<section class="mn-till"><h4 class="fl-sub">${icon('pos')}At the till</h4><dl class="sk-facts mn-till-facts">
    <div><dt>Rings in at</dt><dd>${money(T.price)}${T.promo?`<span> · ${e(T.promo)}, was ${money(T.base)}</span>`:''}</dd>${T.inHH&&!T.promo?`<small>Happy hour ${T.hhWindow?e(T.hhWindow)+' · ':''}${money(T.hhPrice)} (${T.hhPct}% off)</small>`:T.inHH?'':'<small>No happy-hour pricing</small>'}</div>
    <div><dt>Tax</dt><dd>${pct(T.tax)}</dd><small>${e(T.taxName)} rate from POS settings</small></div>
    <div><dt>Sold ${st.date===today()?'today':e(dateLabel(st.date,{month:'short',day:'numeric'}))}</dt><dd>${T.soldToday}</dd><small>${T.open.checks?`On ${plural(T.open.checks,'open check')}${T.open.held?' · '+T.open.held+' not sent yet':''}`:'Not on any open check'}</small></div>
    <div><dt>Count for ${e(st.service)}</dt><dd>${T.remaining===null?'<span>None set</span>':`${T.remaining}<span> of ${i.limit.qty} left</span>`}</dd><small>${T.remaining===null?'Set one when the kitchen has a fixed number of portions':T.remaining===0?'Sold out on the POS':'Counts down as it is rung in'}</small></div>
    ${lead()?`<div><dt>Last four weeks</dt><dd>${T.sold4}<span> sold · ${money(T.net4)}</span></dd><small>${T.klass?`${pct(T.share)} of units · <span class="badge ${klassTone(T.klass)==='sage'?'tone-sage':klassTone(T.klass)==='amber'?'tone-amber':klassTone(T.klass)==='orange'?'tone-orange':'tone-danger'}">${e(T.klass)}</span>`:'No sales in the period'}</small></div>`:''}
   </dl><div class="toolbar mn-till-actions">${canCount()&&i.active?btn(icon('count')+'<span>'+(T.remaining===null?'Set a count':'Change count')+'</span>','count',i.id,'secondary small fl-icon-btn'):''}${lead()?btn('Change price','price',i.id,'secondary small'):''}${canPos()?`<button type="button" class="button quiet small" data-action="ps-go">Open the POS ›</button>`:''}</div></section>`:'';
  const html=`<div class="sk-sheet mn-sheet" style="${hueStyle(i.category)}"><div class="mn-sheet-head"><div class="fl-sheet-top">${tag(av.label,avTone(av.status))}<span class="badge"><i class="mn-dot"></i>${e(c?.name||'')} · ${e(i.course)}</span><span class="badge">${e(i.station)}</span>${(i.dietary||[]).map(d=>`<span class="fl-tag" data-tone="${d==='Contains alcohol'||d==='Spicy'?'orange':'sage'}">${e(d)}</span>`).join('')}${(i.tags||[]).map(t=>`<span class="fl-tag" data-tone="slate">${icon('tag')}${e(t)}</span>`).join('')}</div><b class="mn-sheet-price">${money(i.price)}</b></div>
   ${banner}
   <p class="mn-sheet-desc">${e(i.description||'No description yet.')}</p>
   <div class="mn-sheet-grid"><div class="mn-sheet-col">
   <section><h4 class="fl-sub">Allergens</h4><div class="mn-allergens">${i.allergenList.length?i.allergenList.map(a=>`<span class="fl-tag" data-tone="danger">${e(a)}</span>`).join(''):'<span class="fl-tag" data-tone="sage">None listed</span>'}${(i.mayContain||[]).map(a=>`<span class="fl-tag" data-tone="amber">May contain ${e(a)}</span>`).join('')}</div><p class="sk-hint">From the recipe ingredients plus the kitchen’s own flags. Always confirm cross-contact with the kitchen before advising a guest.</p></section>
   ${recipe?`<section><h4 class="fl-sub">Recipe · ${plural((i.recipe||[]).length,'ingredient')}</h4><div class="mn-ings">${recipe}</div>${lead()?`<dl class="sk-facts"><div><dt>Portion cost</dt><dd>${money(i.cost)}</dd></div><div><dt>Food cost</dt><dd><span class="mn-cost" data-tone="${costTone(i.costPct)}">${pct(i.costPct)}</span><small>Target ${pct(st.menu.settings.targetCost)}</small></dd></div><div><dt>Margin</dt><dd>${money(i.margin)}</dd></div><div><dt>Price</dt><dd>${money(i.price)}</dd></div></dl>`:''}</section>`:lead()?'<p class="sk-hint">No recipe yet. Add ingredients from the stock list to see cost and allergens.</p>':''}
   ${i.prep||i.plating?`<section><h4 class="fl-sub">In the kitchen</h4>${i.prep?`<p class="mn-note"><strong>Prep</strong>${e(i.prep)}</p>`:''}${i.plating?`<p class="mn-note"><strong>Plating</strong>${e(i.plating)}</p>`:''}</section>`:''}
   ${M().modifierGroups(st,i).length?`<section><h4 class="fl-sub">Modifiers on the POS</h4>${M().modifierGroups(st,i).map(g=>`<p class="mn-note"><strong>${e(g.name)}${g.required?' · required':''}${g.multi?' · pick several':''}</strong>${g.options.map(o=>e(o.name)+(o.price?' ('+(o.price>0?'+':'')+money(o.price)+')':'')).join(', ')}</p>`).join('')}</section>`:''}
   </div>${tillPanel}</div>
   <div class="toolbar fl-primary-row">${av.status==='86'&&!av.pending&&manager()?`<button type="button" class="button" data-action="ops-restore-alert" data-id="${e(av.alert.id)}">Back on the menu</button>`:''}${av.status==='86'&&av.pending&&manager()?`<button type="button" class="button" data-action="ops-approve-alert" data-id="${e(av.alert.id)}">Approve 86</button><button type="button" class="button secondary" data-action="ops-decline-alert" data-id="${e(av.alert.id)}">Decline</button>`:''}${av.status==='ingredient'&&av.alert?`<button type="button" class="button secondary" data-action="stock-open" data-id="${e(av.alert.item)}">${icon('stock')}Open the ingredient</button>`:''}${av.status==='soldout'&&canCount()?btn('Add more','count',i.id,''):''}${av.status!=='86'&&av.status!=='archived'&&i.active&&canReport()?btn(manager()?'86 this dish':'Report 86','86',i.id,'secondary'):''}${lead()?btn(icon('edit')+'<span>Edit</span>','item',i.id,'secondary fl-icon-btn')+btn(icon('copy')+'<span>Duplicate</span>','duplicate',i.id,'quiet fl-icon-btn')+btn(icon('up'),'item-order',i.id,'quiet fl-icon-only','data-direction="-1" aria-label="Move up in '+e(c?.name||'its category')+'"')+btn(icon('down'),'item-order',i.id,'quiet fl-icon-only','data-direction="1" aria-label="Move down in '+e(c?.name||'its category')+'"')+btn(i.active?'Archive':'Restore','archive',i.id,'quiet'):''}</div></div>`;
  api.open(i.name,html,false,'',true);
 }
 // ---------- Allergens ----------
 function allergensView(){
  const st=s(),A=M().ALLERGENS,chips=`<div class="sk-chips mn-chips" aria-label="Guest avoids">${A.map(a=>`<button type="button" class="sk-chip" data-action="mn-avoid" data-id="${e(a)}" aria-pressed="${avoid.has(a)}">${e(a)}</button>`).join('')}${avoid.size||diet.size?btn('Clear','avoid-clear','','quiet small'):''}</div>`;
  const dietChips=`<div class="sk-chips mn-chips mn-diet-chips" aria-label="Guest wants"><span class="mn-chips-label">Wants</span>${['Vegetarian','Vegan','Gluten-free','Dairy-free','Nut-free'].map(d=>`<button type="button" class="sk-chip" data-action="mn-diet" data-id="${e(d)}" aria-pressed="${diet.has(d)}">${icon('leaf')}${e(d)}</button>`).join('')}</div>`;
  let finder='';
  if(avoid.size||diet.size){
   const safe=M().safeFor(st,[...avoid]).filter(i=>[...diet].every(d=>(i.dietary||[]).includes(d))),byCourse=M().COURSES.map(c=>[c,safe.filter(i=>i.course===c)]).filter(([,l])=>l.length);
   const title=[avoid.size?'Safe without '+[...avoid].join(', '):'',diet.size?[...diet].join(' & '):''].filter(Boolean).join(' · ');
   finder=`<section class="panel mn-finder"><div class="panel-head"><div><h3>${e(title)}</h3><p>${plural(safe.length,'dish','dishes')} · nothing here lists or may contain what the guest avoids. Confirm cross-contact with the kitchen.</p></div></div><div class="mn-finder-body">${byCourse.map(([c,l])=>`<div class="mn-finder-course"><h4 class="fl-sub">${e(c)} <em>${l.length}</em></h4>${l.map(i=>`<button type="button" class="sk-row mn-row" style="${hueStyle(i.category)}" data-action="mn-open" data-id="${e(i.id)}"><span class="sk-row-main"><i class="mn-dot"></i><span class="sk-row-text"><strong>${e(i.name)}</strong><small>${e(i.description||'')}</small></span></span><span class="sk-row-act">${i.availability.status!=='ok'?tag(i.availability.label,avTone(i.availability.status)):''}${diets(i.dietary)}<b>${money(i.price)}</b></span></button>`).join('')}</div>`).join('')||'<div class="empty"><strong>Nothing fits that combination</strong>Ask the kitchen what they can adapt.</div>'}</div></section>`;
  }
  const rows=M().matrix(st),groups=M().byCategory(st);
  const matrix=`<section class="panel"><div class="panel-head"><div><h3>Allergen matrix</h3><p>${plural(rows.length,'dish','dishes')} × ${A.length} allergens · ● contains · ○ may contain</p></div><div class="toolbar">${btn('Print view','print','','secondary small')}</div></div><div class="table-scroll"><table class="mn-matrix"><thead><tr><th>DISH</th>${A.map(a=>`<th><abbr title="${e(a)}">${e(M().CODES[a])}</abbr></th>`).join('')}</tr></thead><tbody>${groups.map(g=>`<tr class="mn-matrix-group"><td colspan="${A.length+1}">${e(g.category.name)}</td></tr>`+g.items.map(i=>{const r=rows.find(x=>x.item.id===i.id);return `<tr><td><button type="button" class="mn-link" data-action="mn-open" data-id="${e(i.id)}">${e(i.name)}</button></td>${r.cells.map(c=>`<td class="mn-cell" data-v="${c}">${c==='yes'?'●':c==='may'?'○':''}</td>`).join('')}</tr>`;}).join('')).join('')}</tbody></table></div><div class="legend">${A.map(a=>`<span><b>${e(M().CODES[a])}</b> ${e(a)}</span>`).join('')}</div></section>`;
  return `<p class="sk-hint mn-lead">Tap what the guest avoids, and what they want, to see what they can order. Hand-flagged allergens and “may contain” notes are set per dish; ingredient allergens come from Setup.</p>${chips}${dietChips}${finder}${matrix}`;
 }
 // ---------- 86 & counts ----------
 function outsView(){
  const st=s(),o=outs(),counts=M().counts(st);
  const openNote=i=>{if(!P()||!st.pos)return '';const op=M().openOn(st,i);return op.checks?` · on ${plural(op.checks,'open check')}${op.held?' ('+op.held+' unsent)':''}`:'';};
  const row=(i,extra='')=>{const av=i.availability,a=av.alert;return `<div class="sk-row mn-row" style="${hueStyle(i.category)}"><button type="button" class="sk-row-main" data-action="mn-open" data-id="${e(i.id)}"><i class="mn-dot"></i><span class="sk-row-text"><strong>${e(i.name)}</strong><small><span>${e(av.label)}${av.reason?' · '+e(av.reason):''}${a?' · '+e(first(a.author)):''}${openNote(i)}</span></small></span></button><span class="sk-row-act">${extra}</span></div>`;};
  const off=o.off.map(i=>{const a=i.availability.alert,stt=i.availability.status;return row(i,stt==='86'&&manager()?`<button type="button" class="button small secondary" data-action="ops-restore-alert" data-id="${e(a.id)}">Back on</button>`:stt==='ingredient'?`<button type="button" class="button small quiet" data-action="stock-open" data-id="${e(a.item)}">Stock</button>`:stt==='soldout'&&canCount()?btn('Add more','count',i.id,'small secondary'):stt==='soldout'?tag('By count','danger'):'');}).join('');
  const rep=o.reported.map(i=>{const a=i.availability.alert;return row(i,manager()&&a?`<button type="button" class="button small" data-action="ops-approve-alert" data-id="${e(a.id)}">Approve</button><button type="button" class="button small secondary" data-action="ops-decline-alert" data-id="${e(a.id)}">Decline</button>`:tag('Awaiting manager','amber'));}).join('');
  const cnt=counts.map(({item:x,qty,sold,remaining})=>{const i=M().list(st,{activeOnly:false}).find(y=>y.id===x.id);return `<div class="sk-row mn-row mn-count-row" style="${hueStyle(x.category)}"><button type="button" class="sk-row-main" data-action="mn-open" data-id="${e(x.id)}"><i class="mn-dot"></i><span class="sk-row-text"><strong>${e(x.name)}</strong><small><span>${plural(sold,'sold')} of ${qty}${i&&i.availability.status!=='limited'&&i.availability.status!=='soldout'?' · '+e(i.availability.label):''}</span></small><span class="mn-count-track" data-tone="${remaining===0?'danger':remaining<=3?'amber':'sage'}"><i style="--p:${Math.round(remaining/Math.max(1,qty)*100)}%"></i></span></span></button><span class="sk-row-act"><b class="mn-left" data-tone="${remaining===0?'danger':remaining<=3?'amber':''}">${remaining===0?'Sold out':remaining+' left'}</b>${canCount()?btn('Change','count',x.id,'small quiet'):''}</span></div>`;}).join('');
  const low=o.low.map(i=>row(i,tag('Low','amber'))).join('');
  const ns=o.notServed.map(i=>row(i,tag(i.availability.services.join(' · ')+' only','slate'))).join('');
  const section=(title,body,hint='')=>body?`<section class="sk-section"><h3 class="sk-group-head">${title}</h3>${hint?`<p class="sk-hint">${hint}</p>`:''}<div class="sk-card">${body}</div></section>`:'';
  const head=`<div class="mn-toolbar"><p class="sk-hint">${e(st.service)} · ${e(dateLabel(st.date,{weekday:'short',month:'short',day:'numeric'}))} · dishes come off when they are 86’d, when an ingredient on the stock list is, or when the kitchen’s count for the service runs out. The POS greys them out the moment it happens.</p><div class="toolbar">${canCount()?btn(icon('count')+'<span>Set a count</span>','count','','secondary fl-icon-btn'):''}${canReport()?btn(icon('out')+'<span>86 a dish</span>','86','','fl-icon-btn'):''}<button type="button" class="button secondary" data-action="navigate" data-id="eighty-six">Stock 86 board</button></div></div>`;
  const nothing=!off&&!rep&&!cnt&&!low;
  return head+(nothing?`<div class="sk-card"><div class="td-clear"><span>${icon('check')}</span><div><strong>Full menu available</strong><small>Nothing is 86’d and no counts are running for ${e(st.service)}.</small></div></div></div>`:section('Off the menu now',off)+section('Reported, waiting for a manager',rep)+section('Counts for '+e(st.service),cnt,'Set by the kitchen. The POS counts each one down and refuses the dish at zero.')+section('Running low',low,'An ingredient is below par and not on order. Push gently.'))+(ns?`<details class="sk-fold" data-key="mn-not-served"><summary><span>Not served at ${e(st.service)}<small>${plural(o.notServed.length,'dish','dishes')} in day-part categories the POS hides for this service</small></span></summary><div class="sk-card">${ns}</div></details>`:'');
 }
 // ---------- Performance (menu engineering from POS sales) ----------
 function performanceView(){
  const st=s();if(!P()||!st.pos)return '<div class="empty"><strong>No POS data</strong>Sales arrive here once checks are paid on the POS.</div>';
  const t=today(),from=period===0?t:B.addDays(t,-(period-1)),to=t,S=P().sales(st,{from,to}),mix=P().menuMix(st,from,to),target=st.menu.settings.targetCost;
  const periods=[[0,'Today'],[7,'7 days'],[28,'28 days'],[84,'12 weeks']];
  const chips=`<div class="sk-chips mn-chips" role="tablist" aria-label="Period">${periods.map(([d,l])=>`<button type="button" class="sk-chip" role="tab" data-action="mn-period" data-id="${d}" aria-pressed="${period===d}" aria-selected="${period===d}">${l}</button>`).join('')}<span class="mn-chips-note">${e(dateLabel(from,{month:'short',day:'numeric'}))}${from!==to?' – '+e(dateLabel(to,{month:'short',day:'numeric'})):''} · ${plural(S.days,'service day')}</span></div>`;
  const soldIds=new Set(mix.rows.map(r=>r.id)),unsold=M().list(st).filter(i=>!soldIds.has(i.id));
  const avgCost=mix.net?mix.costPct:0;
  const kpi=(label,value,note,tone='')=>`<article class="rp-kpi" ${tone?`data-tone="${tone}"`:''}><small>${label}</small><strong>${value}</strong><p>${note}</p></article>`;
  const kpis=`<div class="rp-kpis mn-kpis">${kpi('UNITS SOLD',mix.units.toLocaleString('en-US'),plural(S.checks,'paid check'))}${kpi('POS NET SALES',money(S.net),plural(S.covers,'cover')+' · '+money(S.avgCheck)+' average check')}${kpi('FOOD COST',mix.units?pct(avgCost):'—',`Recipe cost of what sold · target ${pct(target)}`,mix.units?costTone(avgCost):'')}${kpi('MARGIN PER UNIT',money(mix.avgCm),`Price less recipe cost, averaged over units${unsold.length?' · '+plural(unsold.length,'dish','dishes')+' unsold':''}`)}</div>`;
  const quad=[['Star','Stars','Popular and profitable. Protect them: keep them on, keep the recipe tight.','sage'],['Plow horse','Plow horses','Popular but thin. Raise the price a little or trim the portion cost.','amber'],['Puzzle','Puzzles','Profitable but slow. Feature them, move them up the menu, train the floor.','orange'],['Dog','Dogs','Neither. Rework, reprice or take them off.','danger']];
  const quadrants=`<div class="mn-quad">${quad.map(([k,title,hint,tone])=>{const rows=mix.rows.filter(r=>r.klass===k);return `<section class="mn-quad-tile" data-tone="${tone}"><h4>${title}<em>${rows.length}</em></h4><p>${hint}</p><div class="mn-quad-list">${rows.slice(0,4).map(r=>`<button type="button" class="mn-link" data-action="mn-open" data-id="${e(r.id)}">${e(r.name)}<small>${r.qty}× · ${money(r.cm)} each</small></button>`).join('')||'<small class="sk-hint">None in this period.</small>'}</div></section>`;}).join('')}</div>`;
  const table=`<section class="panel"><div class="panel-head"><div><h3>Every dish, ranked by net sales</h3><p>Each dish is classed against the others in its category: popular when it takes more than its share of the category’s units, profitable when its margin beats the category average. Recipe costs as they stand today.</p></div><div class="toolbar">${manager()?`<button type="button" class="button secondary small" data-action="ops-report-tab" data-id="pos">POS report ›</button>`:''}</div></div><div class="table-scroll"><table class="mn-perf"><thead><tr><th>DISH</th><th>CATEGORY</th><th>SOLD</th><th>MIX</th><th>NET SALES</th><th>COST %</th><th>MARGIN EACH</th><th>CLASS</th></tr></thead><tbody>${mix.rows.map(r=>`<tr><td><button type="button" class="mn-link" data-action="mn-open" data-id="${e(r.id)}">${e(r.name)}</button></td><td>${e(r.category)}</td><td>${r.qty}</td><td>${pct(r.share)}</td><td><strong>${money(r.net)}</strong></td><td><span class="mn-cost" data-tone="${costTone(r.costPct)}">${pct(r.costPct)}</span></td><td>${money(r.cm)}</td><td><span class="sk-tag" data-tone="${klassTone(r.klass)}">${e(r.klass)}</span></td></tr>`).join('')||'<tr><td colspan="8">No dishes sold in this period.</td></tr>'}</tbody></table></div></section>`;
  const unsoldPanel=unsold.length?`<section class="panel"><div class="panel-head"><div><h3>Not sold in this period</h3><p>${plural(unsold.length,'dish','dishes')} on the menu with no POS sales. Candidates to feature, move or retire.</p></div></div><div class="mn-unsold">${unsold.map(i=>`<button type="button" class="sk-chip" style="${hueStyle(i.category)}" data-action="mn-open" data-id="${e(i.id)}"><i class="mn-dot"></i>${e(i.name)}<span>${money(i.price)}</span></button>`).join('')}</div></section>`:'';
  return chips+kpis+quadrants+table+unsoldPanel;
 }
 // ---------- Setup ----------
 function posNote(c){
  const st=s();if(!P()||!st.pos)return '';const set=st.pos.settings,g=(set.taxGroups||[]).find(x=>(x.categories||[]).includes(c.id)),hh=set.happyHour.enabled&&set.happyHour.categories.includes(c.id);
  return [g?e(g.name)+' tax '+pct(g.rate):'Tax '+pct(set.taxRate),hh?'happy hour '+set.happyHour.pct+'% off':''].filter(Boolean).join(' · ');
 }
 function setupView(){
  const st=s(),m=st.menu,panes=[['categories','Categories'],['modifiers','Modifiers'],['ingredients','Ingredient allergens'],['settings','Settings']];
  const seg=`<div class="segmented fl-seg mn-seg" role="tablist">${panes.map(([id,l])=>`<button type="button" role="tab" class="${pane===id?'selected':''}" data-action="mn-pane" data-id="${id}" aria-selected="${pane===id}">${l}</button>`).join('')}</div>`;
  let body='';
  if(pane==='categories'){
   const cats=m.categories.slice().sort((a,b)=>a.order-b.order);
   body=`<p class="sk-hint">The order here is the order on the menu and on the POS tiles. Each category carries a colour, a course, the station that makes it, the services it is sold at, and its POS tax group.</p><div class="sk-card">${cats.map((c,i)=>`<div class="sk-row mn-row" style="${hueStyle(c.id)}"><button type="button" class="sk-row-main" data-action="mn-category" data-id="${e(c.id)}"><i class="mn-dot"></i><span class="sk-row-text"><strong>${e(c.name)}${c.active?'':' · hidden'}</strong><small><span>${e(c.course)} · ${e(c.station)} · ${plural(m.items.filter(x=>x.category===c.id&&x.active).length,'dish','dishes')}${c.services.length?' · '+e(c.services.join(' & '))+' only':''}${posNote(c)?' · '+posNote(c):''}</span></small></span></button><span class="sk-row-act">${i>0?btn(icon('up'),'cat-order',c.id,'quiet small fl-icon-only','data-direction="-1" aria-label="Move up"'):''}${i<cats.length-1?btn(icon('down'),'cat-order',c.id,'quiet small fl-icon-only','data-direction="1" aria-label="Move down"'):''}</span></div>`).join('')}</div><div class="toolbar mn-setup-actions">${btn(icon('add')+'<span>Add category</span>','category','','secondary fl-icon-btn')}${manager()&&P()&&st.pos?`<button type="button" class="button quiet" data-action="ps-go" data-tab="settings">Tax groups & happy hour in POS settings ›</button>`:''}</div>`;
  }else if(pane==='modifiers'){
   body=`<p class="sk-hint">Modifier groups are what the POS asks when a dish is rung in: required ones block the add until a choice is made; option prices land on the line.</p><div class="sk-card">${m.modifiers.map(g=>`<div class="sk-row mn-row"><button type="button" class="sk-row-main" data-action="mn-modifier" data-id="${e(g.id)}"><span class="sk-row-text"><strong>${e(g.name)}${g.required?' · required':''}${g.multi?' · pick several':''}</strong><small><span>${e(g.options.map(o=>o.name+(o.price?' '+(o.price>0?'+':'')+money(o.price):'')).join(', '))}</span></small></span></button><span class="sk-row-act"><small>${plural(m.items.filter(i=>i.modifiers.includes(g.id)).length,'dish','dishes')}</small></span></div>`).join('')||'<p class="sk-hint">No modifier groups yet.</p>'}</div><div class="toolbar mn-setup-actions">${btn(icon('add')+'<span>Add modifier group</span>','modifier','','secondary fl-icon-btn')}</div>`;
  }else if(pane==='ingredients'){
   const q=ingQuery.trim().toLowerCase(),list=st.stock.items.filter(x=>x.active&&(!q||x.name.toLowerCase().includes(q)||x.category.toLowerCase().includes(q)||M().ingredientAllergens(st,x.id).some(a=>a.toLowerCase().includes(q)))).sort((a,b)=>a.category.localeCompare(b.category)||a.name.localeCompare(b.name));
   body=`<p class="sk-hint">Every dish inherits the allergens of its ingredients. Tap an ingredient to correct them.</p><label class="sk-search"><span class="sr-only">Search ingredients</span>${icon('search')}<input type="search" data-mn-ing-search value="${e(ingQuery)}" placeholder="Ingredient, category or allergen" autocomplete="off"></label><div class="sk-card">${list.map(x=>{const a=M().ingredientAllergens(st,x.id),used=M().usedIn(st,x.id).length;return `<div class="sk-row mn-row"><button type="button" class="sk-row-main" data-action="mn-ingredient" data-id="${e(x.id)}"><span class="sk-row-text"><strong>${e(x.name)}</strong><small><span>${e(x.category)}${used?' · in '+plural(used,'dish','dishes'):''}</span></small></span></button><span class="sk-row-act">${a.length?codes(a):'<small>—</small>'}</span></div>`;}).join('')||'<p class="sk-hint" style="padding:14px 16px">Nothing matches.</p>'}</div>`;
  }else{
   const mix=P()&&st.pos?P().menuMix(st,B.addDays(today(),-27),today()):null;
   body=`<dl class="sk-facts"><div><dt>Target food cost</dt><dd>${pct(m.settings.targetCost)}</dd><small>Dishes above it show amber, well above show red</small></div><div><dt>Dishes on the menu</dt><dd>${m.items.filter(i=>i.active).length}<span> of ${m.items.length}</span></dd><small>${plural(m.categories.filter(c=>c.active).length,'category','categories')} · ${plural(m.modifiers.length,'modifier group')}</small></div>${mix?`<div><dt>Food cost · 4 weeks</dt><dd>${pct(mix.costPct)}</dd><small>From POS sales and recipe costs</small></div><div><dt>Units sold · 4 weeks</dt><dd>${mix.units.toLocaleString('en-US')}</dd><small>${money(mix.net)} net on the POS</small></div>`:''}</dl><div class="toolbar mn-setup-actions">${manager()?btn('Change target','settings','','secondary'):''}${manager()?`<button type="button" class="button secondary" data-action="ops-report-tab" data-id="menu">Menu report ›</button>`:''}</div>`;
  }
  return seg+body;
 }
 function render(){
  ensure();
  const main=tab==='allergens'?allergensView():tab==='86'?outsView():tab==='performance'?performanceView():tab==='setup'?setupView():menuView();
  return `<div class="sk mn" data-tab="${tab}">${tabs()}<div class="sk-body"><div class="sk-main">${main}</div></div></div>`;
 }

 // ---------- Dialogs ----------
 function open(title,fields,details,save=true,label='',wide=false){form=details;api.close?.();api.open(title,fields,save,label,wide);}
 const checks=(nameAttr,options,chosen,labelOf=x=>x)=>`<div class="sk-checks mn-checks">${options.map(o=>`<label><input type="checkbox" name="${nameAttr}" value="${e(o)}" ${chosen.includes(o)?'checked':''}><span>${e(labelOf(o))}</span></label>`).join('')}</div>`;
 const stockOptions=chosen=>{const st=s(),cats=[...new Set(st.stock.items.filter(x=>x.active).map(x=>x.category))];return `<option value="">— none —</option>`+cats.map(c=>`<optgroup label="${e(c)}">${st.stock.items.filter(x=>x.active&&x.category===c).sort((a,b)=>a.name.localeCompare(b.name)).map(x=>`<option value="${e(x.id)}" ${x.id===chosen?'selected':''}>${e(x.name)} · per ${e(x.unit)}${x.cost?' '+money(x.cost):''}</option>`).join('')}</optgroup>`).join('');};
 const recipeRow=(r,i)=>`<div class="mn-recipe-row"><label><span class="sr-only">Ingredient</span><select name="r_item_${i}">${stockOptions(r?.item||'')}</select></label><label><span class="sr-only">Portion</span><input name="r_amount_${i}" value="${e(r?.amount||'')}" placeholder="180 g" maxlength="40"></label><label><span class="sr-only">Order units per portion</span><input name="r_units_${i}" type="number" inputmode="decimal" value="${r?r.units:''}" min="0" step="0.0001" placeholder="0.18"></label></div>`;
 function itemDialog(id){
  const st=s(),x=id?M().item(st,id):null,cats=st.menu.categories.slice().sort((a,b)=>a.order-b.order),mods=st.menu.modifiers;
  const rows=(x?.recipe||[]).map(recipeRow).join('')+recipeRow(null,(x?.recipe||[]).length);
  open(x?'Edit dish':'Add a dish',input('name','Name',x?.name||query||'','text','required maxlength="100"')+`<div class="mg-form-grid">${select('category','Category',cats.map(c=>[c.id,c.name+' · '+c.course+(c.services.length?' · '+c.services.join(' & ')+' only':'')]),x?.category||cat||cats[0]?.id)}${select('station','Made at',st.setup.areas.map(a=>[a,a]),x?.station||cats.find(c=>c.id===(x?.category||cat))?.station||st.setup.areas[0])}${input('price','Price ($)',x?.price??'','number','required min="0" max="10000" step="0.01" inputmode="decimal"')}${select('active','On the menu',[['true','Yes'],['false','Archived']],String(x?.active??true))}</div>`+textarea('description','Description for guests',x?.description||'','maxlength="500" rows="2"')+input('tags','Tags, comma separated',(x?.tags||[]).join(', '),'text','maxlength="200" placeholder="New, Signature, Seasonal"')+
   `<fieldset class="mg-form-section"><legend>Recipe · from the stock list</legend><p class="sk-hint">Portion is what the guest sees (180 g, 1 bottle). Units is how many order units one portion uses: 180 g of a kilo item is 0.18. Cost and allergens follow from it, and the POS takes it off counted stock when the check is paid.</p><div class="mn-recipe-rows" id="mn-recipe-rows">${rows}</div>${btn(icon('add')+'<span>Another ingredient</span>','recipe-add','','quiet small fl-icon-btn')}</fieldset>`+
   `<fieldset class="mg-form-section"><legend>Diet & allergens</legend><p class="sk-hint">Dietary tags</p>${checks('dietary',M().DIETARY,x?.dietary||[])}<p class="sk-hint">Allergens not covered by the recipe (sauces, garnishes, breading)</p>${checks('allergens',M().ALLERGENS,x?.allergens||[])}<p class="sk-hint">May contain (shared fryer, open kitchen)</p>${checks('mayContain',M().ALLERGENS,x?.mayContain||[])}</fieldset>`+
   (mods.length?`<fieldset class="mg-form-section"><legend>Modifiers the POS asks for</legend>${checks('modifiers',mods.map(g=>g.id),x?.modifiers||[],gid=>mods.find(g=>g.id===gid).name)}</fieldset>`:'')+
   textarea('prep','Prep notes for the kitchen',x?.prep||'','maxlength="1000" rows="2"')+textarea('plating','Plating',x?.plating||'','maxlength="500" rows="2"'),{type:'item',id:x?.id||''},true,x?'Save dish':'Add dish',true);
 }
 function categoryDialog(id){
  const st=s(),c=id?M().category(st,id):null,svc=st.setup.services.filter(v=>v.active!==false).map(v=>v.name);
  open(c?'Edit category':'Add a category',input('name','Name',c?.name||'','text','required maxlength="40"')+`<div class="mg-form-grid">${select('course','Course',M().COURSES.map(x=>[x,x]),c?.course||'Mains')}${select('station','Made at',st.setup.areas.map(a=>[a,a]),c?.station||st.setup.areas[0])}</div>`+select('active','Shown on the menu',[['true','Yes'],['false','Hidden']],String(c?.active??true))+`<fieldset class="mg-form-section"><legend>Served at</legend><p class="sk-hint">Tick the services this category sells at. Leave every box empty for all of them. The POS hides the category at other services.</p>${checks('services',svc,c?.services||[])}</fieldset>`+(c&&posNote(c)?`<p class="sk-hint">On the POS: ${posNote(c)}. Tax groups and happy-hour categories live in POS → Settings.</p>`:'')+(c&&!st.menu.items.some(i=>i.category===c.id)?btn('Remove category','remove-category',c.id,'danger'):''),{type:'category',id:c?.id||''},true,c?'Save':'Add category');
 }
 function modifierDialog(id){
  const g=id?s().menu.modifiers.find(x=>x.id===id):null;
  open(g?'Edit modifier group':'Add a modifier group',input('name','Group name',g?.name||'','text','required maxlength="60" placeholder="Cooking temperature"')+`<div class="mg-form-grid">${select('required','Guest must choose',[['false','Optional'],['true','Required']],String(g?.required??false))}${select('multi','Choices',[['false','Pick one'],['true','Pick several']],String(g?.multi??false))}</div>`+textarea('options','Options, one per line · add a price with | (Oat milk | 0.50)',(g?.options||[]).map(o=>o.name+(o.price?' | '+o.price:'')).join('\n'),'required rows="5" maxlength="2000"')+(g?btn('Remove group','remove-modifier',g.id,'danger'):''),{type:'modifier',id:g?.id||''},true,g?'Save':'Add group');
 }
 function ingredientDialog(id){
  const st=s(),x=st.stock.items.find(y=>y.id===id);if(!x)return;
  const used=M().usedIn(st,x.id);
  open(x.name,`<p class="sk-dialog-meta">${e(x.category)}${used.length?' · in '+e(used.map(i=>i.name).join(', ')):' · not in any recipe yet'}</p>`+checks('allergens',M().ALLERGENS,M().ingredientAllergens(st,x.id)),{type:'ingredient',id:x.id},true,'Save allergens');
 }
 function alertDialog(id){
  const st=s(),list=M().list(st).filter(i=>!M().OFF.includes(i.availability.status)),x=id?M().item(st,id):null;
  if(!x&&!list.length){api.notify('Everything is already off the menu for this service.');return;}
  const op=x&&P()&&st.pos?M().openOn(st,x):null;
  const reasons=['Sold out for tonight','Ingredient didn’t arrive','Quality not right','Kitchen is slammed · pausing it','Back tomorrow'];
  open(manager()?'86 a dish':'Report an 86',`<p class="sk-dialog-meta">${e(st.service)} · ${e(dateLabel(st.date,{weekday:'short',month:'short',day:'numeric'}))} · ${manager()?'goes live for the whole team and the POS right away.':'shows as unconfirmed until a manager approves it.'}</p>`+(x?`<p><strong>${e(x.name)}</strong></p>`:select('item','Dish',list.map(i=>[i.id,i.name+' · '+money(i.price)]),list[0]?.id))+(op&&op.checks?`<p class="sk-banner" data-tone="amber"><strong>On ${plural(op.checks,'open check')} right now</strong>${op.held?` · ${op.held} not sent yet. Let the servers know before they fire.`:' · already sent to the kitchen.'}</p>`:'')+`<div class="sk-reasons" aria-label="Quick reasons">${reasons.map(r=>`<button type="button" class="sk-chip" data-action="mn-reason" data-text="${e(r)}">${e(r)}</button>`).join('')}</div>`+textarea('reason','Reason & what to offer instead','','required maxlength="500" placeholder="e.g. Sold out. Offer the sea bass instead."'),{type:'86',id:crypto.randomUUID(),item:x?.id||''},true,manager()?'86 it':'Send report');
 }
 function countDialog(id){
  const st=s(),x=id?M().item(st,id):null,list=M().list(st).filter(i=>!['archived','service'].includes(i.availability.status));
  if(!x&&!list.length){api.notify('Nothing on the menu for this service.');return;}
  const soldSoFar=x?M().sold(st,x):0,cur=x?.limit&&x.limit.date===st.date&&x.limit.service===st.service?x.limit.qty:null;
  open(cur===null?'Set a count':'Change the count',`<p class="sk-dialog-meta">${e(st.service)} · ${e(dateLabel(st.date,{weekday:'short',month:'short',day:'numeric'}))} · how many portions the kitchen has. The POS counts them down and marks the dish sold out at zero.</p>`+(x?`<p><strong>${e(x.name)}</strong>${soldSoFar?`<small class="sk-dialog-meta"> · ${plural(soldSoFar,'sold')} already this service</small>`:''}</p>`:select('item','Dish',list.map(i=>[i.id,i.name+(i.availability.status==='limited'?' · '+i.availability.label:'')]),list[0]?.id))+`<div class="sk-reasons" aria-label="Quick counts">${[6,8,10,12,16,20,24,30].map(n=>`<button type="button" class="sk-chip" data-action="mn-count-set" data-text="${n}">${n}</button>`).join('')}</div>`+input('qty','Portions for this service',cur??'','number','required min="0" max="999" step="1" inputmode="numeric"')+(cur!==null?btn('Clear the count','limit-clear',x.id,'quiet'):''),{type:'count',id:x?.id||''},true,cur===null?'Set count':'Save count');
 }
 function priceDialog(id){
  const st=s(),x=M().item(st,id);if(!x)return;const mg=M().margin(st,x);
  open('Change price',`<p class="sk-dialog-meta"><strong>${e(x.name)}</strong> · now ${money(x.price)}${x.recipe.length?' · portion cost '+money(mg.cost)+' · '+pct(mg.costPct)+' food cost':''}</p>`+input('price','New price ($)',x.price,'number','required min="0" max="10000" step="0.01" inputmode="decimal"')+'<p class="sk-hint">Takes effect on the POS for the next item rung in. Lines already on checks keep the price they were rung at.</p>',{type:'price',id:x.id},true,'Save price');
 }
 function settingsDialog(){open('Menu settings',input('targetCost','Target food cost (%)',s().menu.settings.targetCost,'number','required min="0" max="100" step="0.5"')+'<p>Dishes at or under the target show green in the menu, the dish sheet and Performance.</p>',{type:'settings'},true,'Save');}
 function submit(values,fd){
  const f=form||{};
  if(f.type==='item'){
   const recipe=[];for(const [k,v] of Object.entries(values)){const m=k.match(/^r_item_(\d+)$/);if(!m||!v)continue;recipe.push({item:v,amount:values['r_amount_'+m[1]]||'',units:Number(values['r_units_'+m[1]]||0)});}
   return {type:'menu:item',id:f.id,name:values.name,category:values.category,station:values.station,price:Number(values.price),description:values.description,tags:String(values.tags||'').split(',').map(t=>t.trim()).filter(Boolean),recipe,dietary:fd.getAll('dietary'),allergens:fd.getAll('allergens'),mayContain:fd.getAll('mayContain'),modifiers:fd.getAll('modifiers'),prep:values.prep,plating:values.plating,active:values.active!=='false'};
  }
  if(f.type==='category')return {type:'menu:category',id:f.id,name:values.name,course:values.course,station:values.station,active:values.active!=='false',services:fd.getAll('services')};
  if(f.type==='modifier')return {type:'menu:modifier',id:f.id,name:values.name,required:values.required==='true',multi:values.multi==='true',options:String(values.options||'').split('\n').map(l=>{const [n,p]=l.split('|');return {name:(n||'').trim(),price:Number((p||'0').replace(/[^\d.-]/g,''))||0};}).filter(o=>o.name)};
  if(f.type==='ingredient')return {type:'menu:ingredient',item:f.id,allergens:fd.getAll('allergens')};
  if(f.type==='86')return {type:'menu:86',id:f.id,item:f.item||values.item,reason:values.reason,date:s().date,service:s().service};
  if(f.type==='count')return {type:'menu:limit',id:f.id||values.item,qty:Number(values.qty),date:s().date,service:s().service};
  if(f.type==='price')return {type:'menu:price',id:f.id,price:Number(values.price)};
  if(f.type==='settings')return {type:'menu:settings',targetCost:Number(values.targetCost)};
  throw Error('Unknown menu form.');
 }
 const saved=()=>({item:'Dish saved. The POS has it now.',category:'Category saved.',modifier:'Modifier group saved.',ingredient:'Allergens saved. Every dish using it is updated.','86':manager()?'86’d. The floor and the POS see it now.':'Reported. Your manager will confirm it.',count:'Count set. The POS counts it down from here.',price:'Price changed. The POS rings the new price from now on.',settings:'Settings saved.'})[form?.type]||'Saved.';

 function handle(action,id,ds={},target){
  if(action==='tab'){tab=id;api.render();window.scrollTo({top:0,behavior:'instant'});return;}
  if(action==='go'){tab=ds.tab||'menu';if(ds.query!==undefined)query=ds.query;api.go();return;}
  if(action==='pane'){pane=id;api.render();return;}
  if(action==='cat'){cat=id||'';api.render();return;}
  if(action==='view'){view=id==='list'?'list':'cards';api.render();return;}
  if(action==='period'){period=Number(id)||0;api.render();return;}
  if(action==='avoid'){if(avoid.has(id))avoid.delete(id);else avoid.add(id);api.render();return;}
  if(action==='diet'){if(diet.has(id))diet.delete(id);else diet.add(id);api.render();return;}
  if(action==='avoid-clear'){avoid=new Set();diet=new Set();api.render();return;}
  if(action==='open'){itemSheet(id);return;}
  if(action==='item'){if(!lead())return;itemDialog(id);return;}
  if(action==='category'){if(!lead())return;categoryDialog(id);return;}
  if(action==='modifier'){if(!lead())return;modifierDialog(id);return;}
  if(action==='ingredient'){if(!lead())return;ingredientDialog(id);return;}
  if(action==='settings'){settingsDialog();return;}
  if(action==='86'){alertDialog(id);return;}
  if(action==='count'){if(!canCount())return;countDialog(id);return;}
  if(action==='price'){if(!lead())return;priceDialog(id);return;}
  if(action==='reason'){const box=document.querySelector('#editor-form [name="reason"]');if(box){box.value=(box.value&&!box.value.endsWith(' ')?box.value+' ':box.value)+(ds.text||'');box.focus();}return;}
  if(action==='count-set'){const box=document.querySelector('#editor-form [name="qty"]');if(box){box.value=ds.text||'';box.focus();}return;}
  if(action==='recipe-add'){const box=document.getElementById('mn-recipe-rows');if(!box)return;const n=box.querySelectorAll('.mn-recipe-row').length;box.insertAdjacentHTML('beforeend',recipeRow(null,n));box.lastElementChild.querySelector('select')?.focus();return;}
  if(action==='archive'){const x=M().item(s(),id);if(!x)return;if(api.commit({type:'menu:archive',id,active:!x.active},x.active?'Archived. It stays in reports and leaves the POS.':'Back on the menu and the POS.'))api.close();return;}
  if(action==='duplicate'){if(!lead())return;const before=new Set(s().menu.items.map(i=>i.id));if(api.commit({type:'menu:duplicate',id},'Copied. Give it its own name and price.')){const made=s().menu.items.find(i=>!before.has(i.id));if(made)itemDialog(made.id);}return;}
  if(action==='item-order'){api.commit({type:'menu:item-order',id,direction:Number(ds.direction)||1},Number(ds.direction)<0?'Moved up. The POS tiles follow.':'Moved down. The POS tiles follow.');return;}
  if(action==='limit-clear'){if(api.commit({type:'menu:limit',id,qty:null},'Count cleared.'))api.close();return;}
  if(action==='cat-order'){api.commit({type:'menu:category-order',id,direction:Number(ds.direction)||1},null);return;}
  if(action==='remove-category'){if(api.commit({type:'menu:remove-category',id},'Category removed.'))api.close();return;}
  if(action==='remove-modifier'){if(api.commit({type:'menu:remove-modifier',id},'Modifier group removed.'))api.close();return;}
  if(action==='print'){try{window.print();}catch{}return;}
 }
 function onChange(t){
  if(t.closest?.('.mn-checks')&&t.type==='checkbox')t.closest('label').classList.toggle('is-on',t.checked);
  if(t.dataset?.mnSort!==undefined){sort=t.value;api.render();return;}
  // A new category in the dish form pulls its station along.
  if(t.name==='category'&&form?.type==='item'){const c=M().category(s(),t.value),st=t.form?.elements.namedItem('station');if(c&&st)st.value=c.station;}
 }
 const refresh=(sel,html)=>{const body=document.querySelector('.mn .sk-main');if(!body)return;const scroll=window.scrollY;body.innerHTML=html;const box=body.querySelector(sel);if(box){box.focus();box.setSelectionRange(box.value.length,box.value.length);}window.scrollTo({top:scroll,behavior:'instant'});};
 function onInput(t){
  if(t.dataset?.mnSearch!==undefined){query=t.value;refresh('[data-mn-search]',menuView());}
  else if(t.dataset?.mnIngSearch!==undefined){ingQuery=t.value;refresh('[data-mn-ing-search]',setupView());}
 }
 // A line for Today and the palette: what is off right now.
 const summary=()=>{const o=outs();return {off:o.off,reported:o.reported,low:o.low,limited:o.limited};};
 return {render,handle,submit,saved,onChange,onInput,show:t=>{tab=t;},tab:()=>tab,open:itemSheet,alert:alertDialog,count:countDialog,summary};
};
