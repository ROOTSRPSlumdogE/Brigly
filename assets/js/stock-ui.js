/* Stock screen, phone first: one list per team to 86 and order from, an item sheet for everything else, shelf-to-sheet inventory counts, the manager's order pipeline one stage at a time, and vendors. Wide screens add detail columns and a summary rail. */
globalThis.createStockUI=function(api){
 const B=Brigly,{e,input,textarea,select,dateLabel}=api,s=()=>api.state(),boss=()=>s().role==='manager',manager=()=>boss()||!!B.permissions?.can(s(),'stock'),me=()=>B.actor(s().role,s().crewId,s().managerId);
 const paths={search:'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14 M20 20l-4-4',add:'M12 5v14 M5 12h14',minus:'M5 12h14',check:'M5 12l5 5 9-10',x:'M6 6l12 12 M18 6L6 18',copy:'M9 9h11v11H9z M5 15V4h11',download:'M12 4v11 M7 10l5 5 5-5 M5 20h14',clock:'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18 M12 7v5l3 2',truck:'M2 7h12v10H2z M14 10h4l4 4v3h-8 M6 20a2 2 0 1 0 0-.1 M18 20a2 2 0 1 0 0-.1',count:'M9 4h6v3H9z M6 6h12v15H6z M9 11h6 M9 15h4',report:'M4 3v18h17 M8 16v-5 M13 16V6 M18 16v-8',chev:'M9 6l6 6-6 6',edit:'M4 20h4L19 9l-4-4L4 16z M13 7l4 4','86':'M5 5l14 14 M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20',bag:'M5 8h14l-1 12H6z M9 8V6a3 3 0 0 1 6 0v2',person:'M10 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M3 21v-1a7 7 0 0 1 14 0v1 M19 8v6 M16 11h6',back:'M15 5l-7 7 7 7',Floor:'M4 9h16 M6 9v11 M18 9v11 M8 5h8',Bar:'M5 4h14l-7 8z M12 12v8 M8 20h8',Kitchen:'M4 11h16v2a7 7 0 0 1-7 7h-2a7 7 0 0 1-7-7z M9 7c0-2 2-2 2-4 M14 7c0-2 2-2 2-4'};
 const icon=key=>'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="'+(paths[key]||paths.add)+'"/></svg>';
 const money=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(n||0);
 const whole=n=>'$'+Math.round(n||0).toLocaleString('en-US');
 const qtyText=n=>Number(n).toLocaleString('en-US',{maximumFractionDigits:2});
 // Order units read naturally next to a quantity: 2 cases, 1 box, 3 kg.
 const units=(n,unit)=>Number(n)===1||/^(kg|g|l|ml|dozen|each)$/i.test(unit)||unit.length<3||/s$/i.test(unit)?unit:/(s|x|ch|sh)$/i.test(unit)?unit+'es':unit+'s';
 const amount=(n,unit)=>qtyText(n)+' '+units(n,unit);
 const plural=(n,word)=>n+' '+word+(n===1?'':'s');
 const weekday=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
 const name=id=>B.person(id)?.name||'Team member',first=id=>name(id).split(' ')[0];
 const ago=iso=>{if(!iso)return 'earlier';const m=Math.round((Date.now()-new Date(iso).getTime())/60000);if(m<1)return 'just now';if(m<60)return m+' min ago';if(m<1440)return Math.round(m/60)+' h ago';return new Date(iso).toLocaleDateString('en-US',{month:'short',day:'numeric'});};
 const today=()=>B.dateString(new Date());
 const dayShort=date=>!date?'soon':date===today()?'today':date===B.addDays(today(),1)?'tomorrow':dateLabel(date,{weekday:'short',month:'short',day:'numeric'});
 const clock=d=>d.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'}).replace(':00','');
 const when=(d,lower=false)=>{const k=B.dateString(d),word=k===today()?'Today':k===B.addDays(today(),1)?'Tomorrow':weekday[d.getDay()];return (lower&&k<=B.addDays(today(),1)?word.toLowerCase():word)+' '+clock(d);};
 const hhmm=t=>clock(new Date('2000-01-01T'+t+':00'));
 const stamp=iso=>{const d=new Date(iso);return d.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'})+' · '+clock(d);};
 const btn=(label,action,id='',style='',attrs='')=>`<button type="button" class="button ${style}" data-action="stock-${action}" data-id="${e(id)}" ${attrs}>${label}</button>`;
 const opsBtn=(label,action,id,style='')=>`<button type="button" class="button ${style}" data-action="ops-${action}" data-id="${e(id)}">${label}</button>`;
 const tag=(label,tone)=>`<span class="sk-tag" data-tone="${tone}">${e(label)}</span>`;
 const stepper=(action,id,q,attrs='')=>`<div class="sk-stepper"><button type="button" data-action="stock-${action}" data-id="${e(id)}" data-step="-1" aria-label="One less" ${attrs}>${icon('minus')}</button><span>${qtyText(q)}</span><button type="button" data-action="stock-${action}" data-id="${e(id)}" data-step="1" aria-label="One more">${icon('add')}</button></div>`;
 const isWide=()=>globalThis.matchMedia?.('(min-width:761px)').matches??true;

 let tab='items',team='',filter='all',query='',stage='',group='vendor',form=null,viewer='',countId='',countResult='',historyLimit=8;
 const cart=new Map();
 const st=()=>s().stock,vendor=id=>st().vendors.find(v=>v.id===id),item=id=>st().items.find(i=>i.id===id);
 const myTeams=()=>B.stock.teams(s(),me()),canUse=x=>B.stock.canUse(s(),x);
 const alerts=()=>s().unavailable.filter(x=>x.date===s().date&&x.service===s().service);
 const alertFor=x=>alerts().find(u=>u.item===x.id&&['Approved','Reported'].includes(u.status));
 const below=x=>x.active&&x.onHand!==null&&x.onHand<x.par;
 const suggested=x=>below(x)?Math.max(1,Math.ceil(x.par-x.onHand)):1;
 const orderKey=o=>o.po||'vendor:'+o.vendor;
 const lines=status=>s().orders.filter(o=>o.status===status);
 const total=list=>list.reduce((n,o)=>n+B.stock.lineTotal(o),0);
 const byKey=(list,key)=>[...list.reduce((m,o)=>m.set(key(o),[...(m.get(key(o))||[]),o]),new Map())];
 function cutoff(v){
  const n=B.stock.nextDelivery(v);if(!n)return null;const hrs=(n.orderBy.getTime()-Date.now())/3600000;
  return {...n,hrs,label:`Order by ${when(n.orderBy,true)} · arrives ${dayShort(n.date)}`,left:hrs<1?Math.max(1,Math.round(hrs*60))+' min':Math.round(hrs)+' h',tone:hrs<3?'danger':hrs<24?'amber':'sage'};
 }
 // The single most useful fact about an item, shown on its row.
 function status(x){
  const a=alertFor(x);if(a)return a.status==='Approved'?['86’d','danger']:['86 reported','orange'];
  const pending=B.stock.openLines(s(),x.id),ord=pending.find(o=>o.status==='Ordered');
  if(ord)return ['Arrives '+dayShort(ord.expected),'sage'];
  if(pending.length)return [pending.some(o=>o.status==='Approved')?'On order sheet':'Requested','slate'];
  if(below(x))return ['Low · '+qtyText(x.onHand)+' of '+qtyText(x.par),'amber'];
  return null;
 }
 function show(next){tab=next==='86'?'86':next==='orders'?(manager()?'orders':'requests'):next==='inventory'?'count':next;stage='';}
 function ensure(){
  // Filters belong to whoever is previewing; switching person starts from their own team.
  if(viewer!==me()){viewer=me();team='';filter='all';query='';stage='';countId='';countResult='';cart.clear();}
  if(manager()&&tab==='requests')tab='orders';
  if(!manager()&&['orders','vendors'].includes(tab))tab='items';
  if(team&&!(manager()?s().setup.areas:myTeams()).includes(team))team='';
 }

 // Section tabs. Each count means work waiting there: teams to count, 86s, requests to review or your open requests.
 function tabs(){
  const a=alerts(),reported=a.filter(u=>u.status==='Reported').length,live=a.filter(u=>u.status==='Approved').length;
  const mineOpen=s().orders.filter(o=>o.author===me()&&['Requested','Approved','Ordered'].includes(o.status)).length;
  const toCount=countTeams().filter(t=>openCount(t)||B.stock.countDue(s(),t)).length,review=lines('Requested').length;
  const list=[['items','Items','bag',null],['count','Count','count',toCount?[toCount,'amber',plural(toCount,'team')+' to count']:null],
   ['86','86','86',manager()?(reported?[reported,'danger',plural(reported,'report')+' to review']:live?[live,'muted',live+' 86’d']:null):(live+reported?[live+reported,'danger',(live+reported)+' 86’d']:null)],
   manager()?['orders','Orders','truck',review?[review,'orange',plural(review,'request')+' to review']:null]:['requests','Requests','clock',mineOpen?[mineOpen,'muted',mineOpen+' open']:null]];
  const current=tab==='vendors'?'orders':tab;
  return `<nav class="sk-tabs" aria-label="Stock sections">${list.map(([id,label,key,n])=>`<button type="button" data-action="stock-tab" data-id="${id}" ${current===id?'aria-current="page"':''} aria-label="${label}${n?', '+e(n[2]):''}"><span class="sk-tab-icon">${icon(key)}${n?`<em data-tone="${n[1]}">${n[0]}</em>`:''}</span><span class="sk-tab-label">${label}</span></button>`).join('')}</nav>`;
 }
 // A cut-off inside three hours with lines still waiting is the one thing worth interrupting a manager for.
 function urgent(){
  if(!manager())return '';
  const due=byKey(lines('Approved'),o=>o.vendor).map(([vid,l])=>({v:vendor(vid),l})).filter(x=>x.v).map(x=>({...x,c:cutoff(x.v)})).filter(x=>x.c&&x.c.hrs<3).sort((a,b)=>a.c.orderBy-b.c.orderBy)[0];
  return due?`<button type="button" class="sk-urgent" data-action="stock-goto" data-id="order">${icon('clock')}<span><strong>${e(due.v.name)} cut-off in ${due.c.left}</strong><small>${plural(due.l.length,'line')} · ${whole(total(due.l))} waiting to be placed</small></span>${icon('chev')}</button>`:'';
 }

 function row(x){
  const t=status(x),q=cart.get(x.id)||0,use=canUse(x),v=vendor(x.vendor);
  const search=[x.name,x.category,v?.name||'made in house',x.location,x.sku,...x.teams].join(' ').toLowerCase();
  let act='';
  if(use&&x.vendor)act=q?stepper('step',x.id,q):`<button type="button" class="sk-add" data-action="stock-step" data-id="${e(x.id)}" data-step="1" aria-label="Add ${e(x.name)}">${icon('add')}</button>`;
  return `<div class="sk-row${t?.[1]==='danger'?' is-86':''}" data-search="${e(search)}" ${matches(x)?'':'hidden'}><button type="button" class="sk-row-main" data-action="stock-open" data-id="${e(x.id)}"><span class="sk-row-text"><strong>${e(x.name)}</strong><small>${t?tag(t[0],t[1]):''}<span>${e(x.unit+(x.pack?' · '+x.pack:''))}</span></small></span><span class="sk-col">${e(v?.name||'Made in house')}</span><span class="sk-col sk-col-num">${x.onHand===null?'<i>–</i>':`<span><b>${qtyText(x.onHand)}</b> / ${qtyText(x.par)}</span><span class="sk-level${below(x)?' is-low':''}" aria-hidden="true"><span style="width:${x.par?Math.min(100,Math.round(x.onHand/x.par*100)):100}%"></span></span>`}</span></button>${act?`<div class="sk-row-act">${act}</div>`:''}</div>`;
 }
 const matches=x=>!query||[x.name,x.category,vendor(x.vendor)?.name||'made in house',x.location,x.sku,...x.teams].join(' ').toLowerCase().includes(query.toLowerCase());
 function itemsView(){
  const mineT=myTeams();
  let pool=st().items.filter(x=>x.active&&(manager()||x.teams.some(t=>mineT.includes(t))));
  if(team)pool=pool.filter(x=>x.teams.includes(team));
  const onOrder=x=>B.stock.openLines(s(),x.id).length>0;
  const tests={all:()=>true,'86':x=>Boolean(alertFor(x)),low:below,order:onOrder};
  const counts=Object.fromEntries(Object.entries(tests).map(([k,f])=>[k,pool.filter(f).length]));
  const shown=pool.filter(tests[filter]||tests.all);
  const teams=manager()?s().setup.areas:mineT;
  const teamPick=teams.length>1?`<label class="sk-select"><span class="sr-only">Team</span><select name="stockTeam">${[['',manager()?'All teams':'All my teams'],...teams.map(a=>[a,a])].map(([v,l])=>`<option value="${e(v)}" ${team===v?'selected':''}>${e(l)}</option>`).join('')}</select></label>`:'';
  const chips=`<div class="sk-chips" aria-label="Filter items">${teamPick}${[['all','All'],['86','86’d'],['low','Below par'],['order','On order']].map(([id,label])=>`<button type="button" class="sk-chip" data-action="stock-filter" data-id="${id}" aria-pressed="${filter===id}">${label}<span>${counts[id]}</span></button>`).join('')}</div>`;
  const toolbar=`<div class="sk-toolbar"><label class="sk-search">${icon('search')}<span class="sr-only">Search stock</span><input type="search" value="${e(query)}" placeholder="Search items" data-stock-search autocomplete="off" enterkeyhint="search"></label>${manager()?`<button type="button" class="sk-iconbtn is-primary" data-action="stock-item" data-id="">${icon('add')}<span>Item</span></button>`:''}</div>`;
  const key=x=>x.category;
  const groups=st().categories.filter(k=>shown.some(x=>key(x)===k)).map(k=>{
   const list=shown.filter(x=>key(x)===k).sort((a,b)=>a.name.localeCompare(b.name));
   return `<section class="sk-group" data-stock-group ${list.some(matches)?'':'hidden'}><h3 class="sk-group-head">${e(k)}<span>${list.length}</span></h3><div class="sk-card">${list.map(row).join('')}</div></section>`;
  }).join('');
  const none=!shown.length?`<div class="sk-empty"><strong>${filter==='86'?'Nothing is 86’d':filter==='low'?'Nothing below par':filter==='order'?'Nothing on order':'No items yet'}</strong><p>${filter==='low'?'Counts at or above par for everything counted.':filter==='all'?(manager()?'Add the first item your team orders.':'Your manager hasn’t added items for your team yet.'):'Try another filter.'}</p></div>`
   :`<div class="sk-empty sk-noresults" ${shown.some(matches)?'hidden':''}><strong>No match for “<span data-stock-query>${e(query)}</span>”</strong><p>${manager()?'Add it to the stock list so your team can 86 and order it.':'Ask your manager to add it to the stock list.'}</p>${manager()?btn('Add item','item','','secondary small'):''}</div>`;
  return urgent()+toolbar+chips+groups+none;
 }
 function cartBar(){
  if(!cart.size||tab!=='items')return '';
  const list=[...cart].map(([id,q])=>({x:item(id),q})).filter(l=>l.x);
  return `<div class="sk-cart" role="region" aria-label="${manager()?'Order':'Request'}"><span class="sk-cart-icon">${icon('bag')}<em>${list.length}</em></span><span class="sk-cart-text"><strong>${plural(list.length,'item')}</strong><small>${manager()?'Est. '+whole(list.reduce((n,l)=>n+l.q*l.x.cost,0)):'Your manager reviews it'}</small></span>${btn('Review','cart','','')}</div>`;
 }

 function itemSheet(id){
  const x=item(id);if(!x)return;
  const v=vendor(x.vendor),a=alertFor(x),pending=B.stock.openLines(s(),x.id),use=canUse(x),c=v&&cutoff(v),t=status(x);
  const fact=(label,value,sub='')=>`<div><dt>${label}</dt><dd>${value}</dd>${sub?`<small>${sub}</small>`:''}</div>`;
  const facts=fact('On hand',x.onHand===null?'Not counted':`${qtyText(x.onHand)} <span>of ${e(amount(x.par,x.unit))}</span>`,x.countedAt?'Counted '+e(ago(x.countedAt))+(x.countedBy?' by '+e(first(x.countedBy)):''):'Par '+e(amount(x.par,x.unit)))+
   fact('Vendor',e(v?.name||'Made in house'),c?e(c.label):'')+
   fact('Pack',e(x.unit+(x.pack?' · '+x.pack:'')),x.vendor&&manager()?e(money(x.cost)+' per '+x.unit):'')+
   fact('Teams',e(x.teams.join(', ')),e(x.location||''));
  const alertBox=a?`<div class="sk-sheet-86" data-status="${e(a.status)}"><strong>${a.status==='Approved'?'86’d this service':'86 reported · waiting for a manager'}</strong><p>${e(a.reason)}</p><small>${e(name(a.author))}${a.reviewer?' · confirmed by '+e(first(a.reviewer)):''}</small>${manager()?`<div class="sk-actions">${a.status==='Reported'?opsBtn('Approve 86','approve-alert',a.id,'small')+opsBtn('Decline','decline-alert',a.id,'secondary small'):opsBtn('Back in stock','restore-alert',a.id,'secondary small')}</div>`:''}</div>`:'';
  const pipe=pending.length?`<ul class="sk-sheet-pipe">${pending.map(o=>`<li>${tag(o.status==='Ordered'?'On order':o.status==='Approved'?'Order sheet':'Requested',o.status==='Ordered'?'sage':'slate')}<span>${e(amount(o.quantity,o.unit))} · ${e(first(o.author))}${o.status==='Ordered'?' · arrives '+e(dayShort(o.expected)):''}</span></li>`).join('')}</ul>`:'';
  const order=use&&x.vendor&&x.active?`<div class="sk-sheet-order"><div class="sk-stepper is-lg"><button type="button" data-action="stock-sheet-step" data-step="-1" aria-label="One less">${icon('minus')}</button><input type="number" inputmode="numeric" min="1" max="10000" step="1" value="${cart.get(x.id)||suggested(x)}" data-sheet-qty aria-label="Quantity in ${e(units(2,x.unit))}"><button type="button" data-action="stock-sheet-step" data-step="1" aria-label="One more">${icon('add')}</button></div><button type="button" class="button" data-action="stock-sheet-add" data-id="${e(x.id)}">${cart.has(x.id)?'Update':manager()?'Add to order':'Add to request'}</button></div><p class="sk-hint">${e(units(2,x.unit))}${below(x)?' · suggested from par':''}</p>`:'';
  const more=[use&&!a&&x.active?`<button type="button" class="sk-sheet-action is-danger" data-action="stock-86" data-id="${e(x.id)}">${icon('86')}<span>86 this item</span></button>`:'',use?`<button type="button" class="sk-sheet-action" data-action="stock-count-one" data-id="${e(x.id)}">${icon('count')}<span>Update count</span></button>`:'',manager()?`<button type="button" class="sk-sheet-action" data-action="stock-item" data-id="${e(x.id)}">${icon('edit')}<span>Edit item</span></button>`:''].join('');
  open(x.name,`<div class="sk-sheet"><p class="sk-sheet-sub">${t?tag(t[0],t[1]):''}${e(x.category)}</p>${alertBox}${order}<dl class="sk-facts">${facts}</dl>${pipe}${more?`<div class="sk-sheet-more">${more}</div>`:''}${!use?`<p class="sk-hint">Only ${e(x.teams.join(' / '))} crew and managers can 86 or order this.</p>`:''}</div>`,{type:'sheet',id},false);
 }

 function card86(u){
  const x=item(u.item),pending=x?B.stock.openLines(s(),x.id):[],ord=pending.find(o=>o.status==='Ordered');
  const restock=!x?'':!x.vendor?'<small>Made in house</small>':ord?`<small class="is-good">${icon('truck')}Restock arrives ${e(dayShort(ord.expected))}</small>`:pending.length?`<small>${icon('clock')}Restock ${pending[0].status==='Approved'?'on the order sheet':'requested'}</small>`:canUse(x)&&['Approved','Reported'].includes(u.status)?`<button type="button" class="sk-link" data-action="stock-restock" data-id="${e(x.id)}">${icon('add')}Request restock</button>`:'';
  const actions=manager()?(u.status==='Reported'?opsBtn('Approve','approve-alert',u.id,'small')+opsBtn('Decline','decline-alert',u.id,'secondary small'):u.status==='Approved'?opsBtn('Back in stock','restore-alert',u.id,'secondary small'):opsBtn('86 again','approve-alert',u.id,'secondary small')):'';
  const editable=x&&(manager()||(u.status==='Reported'&&u.author===me()));
  return `<article class="sk-86" data-status="${e(u.status)}"><div class="sk-86-top"><strong>${e(u.name)}</strong>${tag(u.area,'slate')}</div><p>${e(u.reason)}</p><small class="sk-86-by">${e(first(u.author))}${u.reviewer&&u.status!=='Reported'?' · confirmed by '+e(first(u.reviewer)):''}${u.feedback?' · '+e(u.feedback):''}${editable?` · <button type="button" class="sk-link" data-action="stock-86-edit" data-id="${e(u.id)}">Edit</button>`:''}</small>${restock||actions?`<div class="sk-86-foot">${restock}<span class="sk-actions">${actions}</span></div>`:''}</article>`;
 }
 function boardView(){
  const state=s(),a=alerts(),write=(manager()||state.shifts.some(x=>x.person===me()&&x.date===state.date&&x.service===state.service))&&(!B.permissions||B.permissions.can(state,'report86'));
  const live=a.filter(u=>u.status==='Approved'),reported=a.filter(u=>u.status==='Reported'),done=a.filter(u=>['Restored','Declined'].includes(u.status));
  const head=`<div class="sk-head"><div><h2>86 · ${e(state.service)}</h2><p>${e(dayShort(state.date)).replace(/^./,c=>c.toUpperCase())} · check before taking orders</p></div>${write?btn(icon('86')+(manager()?'86 an item':'Report 86'),'report-86','','sk-danger'):''}</div>`;
  const section=(title,list,note='')=>list.length?`<section class="sk-section"><h3 class="sk-group-head">${title}<span>${list.length}</span></h3>${note?`<p class="sk-hint">${note}</p>`:''}<div class="sk-86-list">${list.map(card86).join('')}</div></section>`:'';
  return head+section('Waiting for a manager',reported,manager()?'':'Unconfirmed. Check with your manager before telling guests.')+(live.length?section('86’d now',live):`<div class="sk-empty"><strong>Full menu available</strong><p>Nothing is 86’d for ${e(state.service.toLowerCase())}.</p></div>`)+(done.length?`<details class="sk-fold" data-key="stock-86-done"><summary>Back on or declined · ${done.length}</summary><div class="sk-86-list">${done.map(card86).join('')}</div></details>`:'')+(manager()?`<button type="button" class="sk-more-link" data-action="stock-report-86">${icon('report')}86 history & reports${icon('chev')}</button>`:'');
 }

 function lineRow(o,{edit=false,vendorName=false,actions=''}={}){
  const short=o.receivedQty!==undefined&&o.receivedQty<o.quantity;
  const meta=[vendorName?vendor(o.vendor)?.name||'No vendor':'',o.area,first(o.author)].filter(Boolean).map(e).join(' · ');
  const qty=edit&&['Requested','Approved'].includes(o.status)?stepper('qty',o.id,o.quantity,o.quantity<=1?'disabled':''):`<span class="sk-qty">${e(amount(o.receivedQty??o.quantity,o.unit))}${short?` <small>of ${qtyText(o.quantity)}</small>`:''}</span>`;
  return `<div class="sk-line${short?' is-short':''}"><div class="sk-line-text"><strong>${e(o.name)}</strong><small>${meta}</small>${o.note?`<p>“${e(o.note)}”</p>`:''}</div><div class="sk-line-qty">${qty}<span class="sk-line-total">${whole(B.stock.lineTotal(o))}</span></div>${actions?`<div class="sk-line-act">${actions}</div>`:''}</div>`;
 }
 function ordersView(){
  const requested=lines('Requested').sort((a,b)=>(a.at||'').localeCompare(b.at||'')),approved=lines('Approved'),ordered=lines('Ordered');
  const recent=lines('Received').filter(o=>(o.receivedAt||'')>=new Date(Date.now()-14*864e5).toISOString());
  const busy=new Set([...requested,...approved,...ordered].map(o=>o.item)),suggestions=st().items.filter(x=>below(x)&&x.vendor&&!busy.has(x.id));
  const pos=byKey(ordered,orderKey);
  const stages=[['review','Review',requested.length],['order','To order',new Set(approved.map(o=>o.vendor)).size],['arriving','Arriving',pos.length],['received','Received','']];
  if(!stage)stage=requested.length?'review':approved.length||suggestions.length?'order':pos.length?'arriving':'received';
  const nav=`<div class="sk-stages" role="tablist" aria-label="Order stage">${stages.map(([id,label,n])=>`<button type="button" role="tab" data-action="stock-stage" data-id="${id}" aria-selected="${stage===id}">${label}${n?`<em>${n}</em>`:''}</button>`).join('')}<button type="button" class="sk-stage-link" data-action="stock-tab" data-id="vendors">Vendors${icon('chev')}</button></div>`;
  let body='';
  if(stage==='review'){
   body=requested.length?`<div class="sk-head is-sub"><p>${plural(requested.length,'request')} from the crew. Adjust quantities, then approve to add them to the order sheet.</p>${btn(icon('check')+'Approve all','approve-all','','secondary small')}</div><div class="sk-card">${requested.map(o=>lineRow(o,{edit:true,vendorName:true,actions:`<button type="button" class="sk-round is-ok" data-action="stock-approve" data-id="${e(o.id)}" aria-label="Approve ${e(o.name)}">${icon('check')}</button><button type="button" class="sk-round" data-action="stock-decline" data-id="${e(o.id)}" aria-label="Decline ${e(o.name)}">${icon('x')}</button>`})).join('')}</div>`:`<div class="sk-empty"><strong>All caught up</strong><p>No crew requests waiting for review.</p></div>`;
  }else if(stage==='order'){
   const suggest=suggestions.length?`<details class="sk-fold sk-suggest" data-key="stock-suggest"><summary><span><strong>${plural(suggestions.length,'item')} below par</strong><small>From the last count · par minus on hand</small></span>${btn('Add all','suggest-all','','secondary small')}</summary><div class="sk-card">${suggestions.map(x=>{const need=suggested(x);return `<div class="sk-line"><div class="sk-line-text"><strong>${e(x.name)}</strong><small>${e(vendor(x.vendor)?.name||'')} · ${qtyText(x.onHand)} of ${qtyText(x.par)} on hand</small></div><div class="sk-line-qty"><span class="sk-qty">+${e(amount(need,x.unit))}</span><span class="sk-line-total">${whole(need*x.cost)}</span></div><div class="sk-line-act">${btn('Add','suggest',x.id,'secondary small',`data-qty="${need}"`)}</div></div>`;}).join('')}</div></details>`:'';
   const key=o=>group==='vendor'?o.vendor:group==='team'?o.area:(item(o.item)?.category||'Other');
   const groups=byKey(approved,key).sort(([a],[b])=>{if(group!=='vendor')return String(a).localeCompare(String(b));return (cutoff(vendor(a))?.orderBy||Infinity)-(cutoff(vendor(b))?.orderBy||Infinity);});
   const groupPick=`<label class="sk-select is-plain"><span>Group by</span><select name="stockGroup">${[['vendor','Vendor'],['team','Team'],['category','Category']].map(([v,l])=>`<option value="${v}" ${group===v?'selected':''}>${l}</option>`).join('')}</select></label>`;
   const cards=groups.map(([k,list])=>{
    const sum=total(list),v=group==='vendor'?vendor(k):null,c=v&&cutoff(v),gap=v&&v.minimum>sum?v.minimum-sum:0;
    const head=`<header class="sk-po-head"><div><strong>${e(v?v.name:k||'Unassigned')}</strong><small>${plural(list.length,'line')}${v?.minimum?' · '+(gap?whole(gap)+' under the '+whole(v.minimum)+' minimum':'minimum met'):''}</small></div><span class="sk-po-total">${whole(sum)}</span></header>`;
    const meter=v?.minimum?`<span class="sk-meter${gap?' is-under':''}"><span style="width:${Math.min(100,sum/v.minimum*100)}%"></span></span>`:'';
    const due=c?`<p class="sk-due" data-tone="${c.tone}">${icon('clock')}${e(c.label)}</p>`:'';
    const body=`<details class="sk-po-lines" ${isWide()?'open':''} data-key="stock-po-${e(k)}"><summary>${plural(list.length,'item')}</summary>${list.map(o=>lineRow(o,{edit:true,vendorName:group!=='vendor',actions:`<button type="button" class="sk-round" data-action="stock-cancel" data-id="${e(o.id)}" aria-label="Remove ${e(o.name)}">${icon('x')}</button>`})).join('')}</details>`;
    const foot=v?`<footer class="sk-po-foot">${btn(icon('copy')+'<span>Copy</span>','copy',v.id,'secondary')}${btn('Place order','place',v.id,'')}</footer>`:'';
    return `<article class="sk-po">${head}${meter}${due}${body}${foot}</article>`;
   }).join('');
   body=suggest+(approved.length?`<div class="sk-head is-sub"><p>${whole(total(approved))} across ${plural(groups.length,group==='vendor'?'vendor':group)}${group==='vendor'?' · soonest cut-off first':' · group by vendor to place orders'}</p>${groupPick}</div><div class="sk-po-grid">${cards}</div>`:`<div class="sk-empty"><strong>Order sheet is empty</strong><p>Approve requests, add below-par items, or tap + on any item.</p>${btn('Open items','tab','items','secondary small')}</div>`);
  }else if(stage==='arriving'){
   body=pos.length?`<div class="sk-po-grid">${pos.sort(([,a],[,b])=>(a[0].expected||'').localeCompare(b[0].expected||'')).map(([po,list])=>{const v=vendor(list[0].vendor),late=list[0].expected&&list[0].expected<today();return `<article class="sk-po is-arriving"><header class="sk-po-head"><div><strong>${e(v?.name||'Order')}</strong><small>${e(po.startsWith('vendor:')?'No PO number':po)} · ${plural(list.length,'line')}</small></div><span class="sk-po-total">${whole(total(list))}</span></header><p class="sk-due" data-tone="${late?'danger':'sage'}">${icon('truck')}${late?'Overdue · was due ':'Arrives '}${e(dayShort(list[0].expected))}</p><details class="sk-po-lines" ${isWide()?'open':''} data-key="stock-arr-${e(po)}"><summary>${plural(list.length,'item')}</summary>${list.map(o=>lineRow(o)).join('')}</details><footer class="sk-po-foot">${btn(icon('copy')+'<span>Copy</span>','copy-po',po,'secondary')}${btn('Check in delivery','receive',po,'')}</footer></article>`;}).join('')}</div>`:`<div class="sk-empty"><strong>Nothing on the way</strong><p>Placed orders show here until they’re checked in.</p></div>`;
  }else{
   const groups=byKey(recent,orderKey).sort(([,a],[,b])=>b[0].receivedAt.localeCompare(a[0].receivedAt));
   const closed=s().orders.filter(o=>['Declined','Cancelled'].includes(o.status)&&(o.reviewedAt||o.at||'')>=new Date(Date.now()-14*864e5).toISOString());
   body=`<div class="sk-head is-sub"><p>Last 14 days · ${whole(recent.reduce((n,o)=>n+(o.receivedQty??o.quantity)*(o.cost||0),0))} received</p>${!boss()?'':btn(icon('report')+'Report','report','','secondary small')}</div>`+(groups.length?`<div class="sk-card">${groups.map(([po,list])=>{const short=list.filter(o=>o.receivedQty<o.quantity).length;return `<details class="sk-received" data-key="stock-rcv-${e(po)}"><summary><span><strong>${e(vendor(list[0].vendor)?.name||'')}</strong><small>${e(po)} · ${e(dayShort(list[0].receivedAt.slice(0,10)))} · ${e(first(list[0].receivedBy))}</small></span>${short?tag(short+' short','danger'):tag('Complete','sage')}<b>${whole(list.reduce((n,o)=>n+(o.receivedQty??o.quantity)*o.cost,0))}</b></summary>${list[0].deliveryNote?`<p class="sk-hint">${e(list[0].deliveryNote)}</p>`:''}${list.map(o=>lineRow(o)).join('')}</details>`;}).join('')}</div>`:`<div class="sk-empty"><strong>No deliveries yet</strong><p>Checked-in deliveries from the last two weeks show here.</p></div>`)+(closed.length?`<details class="sk-fold" data-key="stock-closed"><summary>Declined & withdrawn · ${closed.length}</summary><div class="sk-card">${closed.map(o=>lineRow(o,{vendorName:true})+(o.feedback?`<p class="sk-hint sk-feedback">${e(o.feedback)}</p>`:'')).join('')}</div></details>`:'');
  }
  return urgent()+nav+body;
 }
 function requestsView(){
  const mine=s().orders.filter(o=>o.author===me()).sort((a,b)=>(b.at||'').localeCompare(a.at||''));
  const live=mine.filter(o=>['Requested','Approved','Ordered'].includes(o.status)),done=mine.filter(o=>!live.includes(o)).slice(0,30);
  const steps=['Requested','Approved','Ordered','Received'];
  const label={Requested:['Waiting for review','slate'],Approved:['Approved · next order','sage'],Ordered:['Arrives','sage'],Received:['Received','sage'],Declined:['Declined','danger'],Cancelled:['Withdrawn','slate']};
  const card=o=>{const i=steps.indexOf(o.status),closed=['Declined','Cancelled'].includes(o.status),[text,tone]=label[o.status]||[o.status,'slate'];
   return `<article class="sk-request"><div class="sk-request-top"><div><strong>${e(o.name)}</strong><small>${e(amount(o.quantity,o.unit))} · ${e(ago(o.at))}</small></div>${tag(o.status==='Ordered'?'Arrives '+dayShort(o.expected):text,tone)}</div>${closed?'':`<ol class="sk-progress" aria-label="Step ${i+1} of 4">${steps.map((t,k)=>`<li class="${k<=i?'done':''}"></li>`).join('')}</ol>`}${o.feedback&&o.status!=='Cancelled'?`<p class="sk-hint sk-feedback">${e(first(o.reviewer))}: ${e(o.feedback)}</p>`:''}${o.status==='Requested'?`<button type="button" class="sk-link" data-action="stock-cancel" data-id="${e(o.id)}">Withdraw request</button>`:''}</article>`;};
  return `<div class="sk-head"><div><h2>My requests</h2><p>${live.length?plural(live.length,'request')+' in progress':'Nothing in progress'}</p></div>${btn(icon('add')+'Request items','tab','items','')}</div>${live.length?`<div class="sk-request-list">${live.map(card).join('')}</div>`:`<div class="sk-empty"><strong>No open requests</strong><p>Tap + on any item to ask your manager for more.</p></div>`}${done.length?`<details class="sk-fold" data-key="stock-mine-done"><summary>Earlier · ${done.length}</summary><div class="sk-request-list">${done.map(card).join('')}</div></details>`:''}`;
 }
 function vendorsView(){
  const rows=st().vendors.map(v=>{const c=v.active&&cutoff(v),openLines=s().orders.filter(o=>o.vendor===v.id&&['Approved','Ordered'].includes(o.status)),count=st().items.filter(x=>x.vendor===v.id&&x.active).length;
   return `<button type="button" class="sk-vendor${v.active?'':' is-archived'}" data-action="stock-vendor" data-id="${e(v.id)}"><span class="sk-vendor-main"><strong>${e(v.name)}</strong><small>${v.days.slice().sort((a,b)=>((a+6)%7)-((b+6)%7)).map(d=>weekday[d]).join(' · ')}</small><small>Order by ${e(hhmm(v.cutoff))}${v.lead>1?', '+v.lead+' days ahead':v.lead===1?' the day before':' same day'}</small><small>${plural(count,'item')}${v.minimum?' · '+whole(v.minimum)+' minimum':''}${openLines.length?' · '+whole(total(openLines))+' open':''}${v.active?'':' · archived'}</small></span>${c?`<span class="sk-due is-chip" data-tone="${c.tone}">${e(when(c.orderBy))}</span>`:''}${icon('chev')}</button>`;}).join('');
  return `<div class="sk-sheet-head"><button type="button" class="sk-back" data-action="stock-tab" data-id="orders">${icon('back')}<span>Orders</span></button></div><div class="sk-head"><div><h2>Vendors</h2><p>Delivery days, cut-offs and minimums drive the order sheet</p></div>${btn(icon('add')+'Vendor','vendor','','')}</div><div class="sk-card">${rows}</div>`;
 }
 // Inventory: shelf-to-sheet counts per team, in the order people walk the storage areas.
 const WALK=['Walk-in cooler','Freezer','Pastry station','Dry storage','Bar back','Beer cooler','Wine cellar','Front of house','Supply closet'];
 const walk=(a,b)=>{const i=x=>{const n=WALK.indexOf(x);return n<0?99:n;};return i(a)-i(b)||a.localeCompare(b);};
 const counts=()=>st().counts||[];
 const openCount=t=>counts().find(c=>c.team===t&&c.status==='Open');
 const sheetItems=t=>st().items.filter(x=>x.active&&x.teams.includes(t));
 const assignments=()=>(st().assignments||[]).filter(x=>x.status==='Open').sort((a,b)=>a.date.localeCompare(b.date));
 const nextAssign=t=>assignments().find(x=>x.team===t);
 // Crew count their own teams, plus any team a manager assigned them to.
 const countTeams=()=>manager()?s().setup.areas:[...new Set([...myTeams(),...assignments().filter(x=>x.assignee===me()).map(x=>x.team)])];
 const who=x=>x.assignee?(x.assignee===me()?'You':first(x.assignee)):'Whole team';
 const dueText=date=>{const t=today();if(date<t){const d=Math.round((new Date(t+'T12:00:00')-new Date(date+'T12:00:00'))/864e5);return d===1?'overdue since yesterday':'overdue by '+d+' days';}return date===t?'due today':date===B.addDays(t,1)?'due tomorrow':'due '+dateLabel(date,{weekday:'short',month:'short',day:'numeric'});};
 const dueTag=x=>x.date<today()?tag('Overdue','danger'):x.date<=B.addDays(today(),1)?tag(x.date===today()?'Due today':'Due tomorrow','amber'):'';
 const worth=list=>list.reduce((n,x)=>n+(x.onHand||0)*x.cost,0);
 const reorder=c=>Object.keys(c.entries).map(item).filter(x=>x&&below(x)&&x.vendor&&!B.stock.openLines(s(),x.id).length);
 const teamTone=t=>t==='Bar'?'orange':t==='Kitchen'?'slate':'sage';
 function countView(){
  const c=countId&&counts().find(x=>x.id===countId&&x.status==='Open');
  if(c)return sheetView(c);
  countId='';
  const list=countTeams();
  const r=countResult&&counts().find(x=>x.id===countResult&&x.status==='Submitted');let result='';
  if(r){const low=reorder(r);result=`<section class="sk-result"><span class="sk-result-icon">${icon('check')}</span><span><strong>${e(r.team)} count saved</strong><small>${plural(Object.keys(r.entries).length,'item')} counted · ${low.length?plural(low.length,'item')+' below par':'everything at par'}</small></span>${low.length?btn((manager()?'Order ':'Request ')+low.length,'count-order',r.id,''):''}<button type="button" class="sk-round" data-action="stock-count-dismiss" aria-label="Dismiss">${icon('x')}</button></section>`;}
  const cards=list.map(t=>{
   const o=openCount(t),items=sheetItems(t),last=B.stock.lastCount(s(),t),due=B.stock.countDue(s(),t),n=o?items.filter(x=>o.entries[x.id]).length:0,a=nextAssign(t);
   const assign=a?`<${manager()?'button type="button" data-action="stock-assign" data-id="'+e(a.id)+'"':'div'} class="sk-assign-line${a.date<today()?' is-overdue':''}">${icon('person')}<span><strong>${e(who(a))} · ${e(dueText(a.date))}</strong>${a.repeat||a.note?`<small>${[a.repeat?'Every week':'',a.note].filter(Boolean).map(e).join(' · ')}</small>`:''}</span>${manager()?icon('chev'):''}</${manager()?'button':'div'}>`:'';
   const state=o?tag(n+' of '+items.length,'sage'):a&&dueTag(a)?dueTag(a):due?tag(last?'Due':'Never counted','amber'):tag('Up to date','slate');
   const line=o?`Counting now · ${e(first(o.startedBy))} · ${e(ago(o.startedAt))}`:last?`Last count ${e(ago(last.submittedAt))} · ${e(first(last.submittedBy))}`:'Not counted yet';
   return `<article class="sk-team${o?' is-open':''}"><div class="sk-team-top"><span class="sk-team-icon" data-tone="${teamTone(t)}">${icon(t)}</span><span class="sk-team-text"><strong>${e(t)}</strong><small>${line}</small></span>${state}</div>${assign}${o?`<span class="sk-meter"><span style="width:${items.length?n/items.length*100:0}%"></span></span>`:''}<div class="sk-team-foot"><small>${plural(items.length,'item')}${items.filter(below).length?' · '+items.filter(below).length+' below par':''}${manager()?' · '+whole(worth(items))+' on hand':''}</small><span class="sk-team-actions">${manager()&&!a?btn(icon('person')+'Assign','assign','','secondary',`data-team="${e(t)}"`):''}${o?btn('Continue','count-open',o.id,''):btn(icon('count')+'Start count','count-start',t,due||(a&&a.date<=today())?'':'secondary')}</span></div></article>`;
  }).join('');
  const sched=manager()?`<section class="sk-section"><div class="sk-section-head"><h3 class="sk-group-head">Scheduled counts<span>${assignments().length}</span></h3>${btn(icon('add')+'Assign','assign','','secondary small')}</div>${assignments().length?`<div class="sk-card">${assignments().map(x=>`<button type="button" class="sk-vendor" data-action="stock-assign" data-id="${e(x.id)}"><span class="sk-vendor-main"><strong>${e(x.team)} · ${e(x.assignee?first(x.assignee):'Whole team')}</strong><small>${e(dueText(x.date).replace(/^./,c=>c.toUpperCase()))}${x.repeat?' · every week':''}${x.note?' · '+e(x.note):''}</small></span>${dueTag(x)}${icon('chev')}</button>`).join('')}</div>`:'<p class="sk-hint">Nothing scheduled. Assign a count to a person or a whole team and it shows on their Today screen.</p>'}</section>`:'';
  const done=counts().filter(c=>c.status==='Submitted'&&list.includes(c.team)).sort((a,b)=>b.submittedAt.localeCompare(a.submittedAt));
  const hist=done.length?`<section class="sk-section"><h3 class="sk-group-head">Count history<span>${done.length}</span></h3><div class="sk-card">${done.slice(0,historyLimit).map(c=>`<button type="button" class="sk-vendor" data-action="stock-count-view" data-id="${e(c.id)}"><span class="sk-vendor-main"><strong>${e(c.team)} · ${e(stamp(c.submittedAt))}</strong><small>${e(first(c.submittedBy))} · ${plural(Object.keys(c.entries).length,'item')} counted${manager()?' · '+whole(c.value):''}</small></span>${icon('chev')}</button>`).join('')}</div>${done.length>historyLimit?btn('Show more','count-more','','secondary small'):''}</section>`:'';
  return `<div class="sk-head"><div><h2>Inventory</h2><p>Count shelf to sheet, one team at a time. Counts update on-hand and the order suggestions.</p></div></div>${result}<div class="sk-team-grid">${cards||'<div class="sk-empty"><strong>No team to count</strong><p>You’re not on a team for this service.</p></div>'}</div>${sched}${hist}`;
 }
 function countRow(x,c){
  const entry=c.entries[x.id],search=[x.name,x.category,x.location,x.sku].join(' ').toLowerCase();
  const last=!entry&&x.onHand!==null?`<button type="button" class="sk-last" data-action="stock-centry-fill" data-id="${e(x.id)}">Last count ${qtyText(x.onHand)}</button>`:'';
  return `<div class="sk-row${entry?' is-counted':''}" data-search="${e(search)}" ${matches(x)?'':'hidden'}><div class="sk-row-main"><span class="sk-row-text"><strong>${e(x.name)}</strong><small><span>${e(units(2,x.unit))}${x.pack?' · '+e(x.pack):''} · par ${qtyText(x.par)}</span></small>${last}</span></div><div class="sk-row-act"><div class="sk-stepper is-count"><button type="button" data-action="stock-centry-step" data-id="${e(x.id)}" data-step="-1" aria-label="One less ${e(x.name)}" ${entry?.qty>0?'':'disabled'}>${icon('minus')}</button><input type="number" inputmode="decimal" enterkeyhint="next" min="0" max="100000" step="0.5" value="${entry?entry.qty:''}" placeholder="–" data-count-entry="${e(x.id)}" aria-label="${e(x.name)}, ${e(units(2,x.unit))} on hand"><button type="button" data-action="stock-centry-step" data-id="${e(x.id)}" data-step="1" aria-label="One more ${e(x.name)}">${icon('add')}</button></div></div></div>`;
 }
 function sheetView(c){
  const items=sheetItems(c.team),done=items.filter(x=>c.entries[x.id]).length;
  const groups=[...new Set(items.map(x=>x.location||'Other'))].sort(walk).map(loc=>{
   const list=items.filter(x=>(x.location||'Other')===loc).sort((a,b)=>a.name.localeCompare(b.name)),n=list.filter(x=>c.entries[x.id]).length;
   return `<section class="sk-group" data-stock-group ${list.some(matches)?'':'hidden'}><h3 class="sk-group-head">${e(loc)}<span>${n} of ${list.length}</span></h3><div class="sk-card">${list.map(x=>countRow(x,c)).join('')}</div></section>`;
  }).join('');
  return `<div class="sk-sheet-head"><button type="button" class="sk-back" data-action="stock-count-close">${icon('back')}<span>Inventory</span></button>${manager()||c.startedBy===me()?`<button type="button" class="sk-link is-muted" data-action="stock-count-discard" data-id="${e(c.id)}">Discard</button>`:''}</div><div class="sk-head"><div><h2>${e(c.team)} count</h2><p>Started by ${e(first(c.startedBy))} · ${e(ago(c.startedAt))} · saves as you go, teammates can help</p></div></div><span class="sk-meter is-lg" role="progressbar" aria-valuemin="0" aria-valuemax="${items.length}" aria-valuenow="${done}"><span style="width:${items.length?done/items.length*100:0}%"></span></span><div class="sk-toolbar"><label class="sk-search">${icon('search')}<span class="sr-only">Find an item</span><input type="search" value="${e(query)}" placeholder="Find an item" data-stock-search autocomplete="off" enterkeyhint="search"></label></div>${groups}<div class="sk-empty sk-noresults" ${items.some(matches)?'hidden':''}><strong>No match for “<span data-stock-query>${e(query)}</span>”</strong><p>Only ${e(c.team)} items are on this sheet.</p></div><div class="sk-cart is-count" role="region" aria-label="Count progress"><span class="sk-cart-text"><strong>${done} of ${items.length} counted</strong><small>${done<items.length?'Skipped items keep their last count':'Everything counted'}</small></span>${btn('Finish','count-finish',c.id,'',done?'':'disabled')}</div>`;
 }
 function rail(){
  const a=alerts(),live=a.filter(u=>u.status==='Approved'),rep=a.filter(u=>u.status==='Reported');
  let html=`<section class="sk-rail-card sk-rail-86"><h3>86’d · ${e(s().service)}</h3>${live.length?live.map(u=>`<button type="button" class="sk-rail-row" data-action="stock-tab" data-id="86"><span><strong>${e(u.name)}</strong><small>${e(u.area)} · ${e(u.reason)}</small></span></button>`).join(''):'<p class="sk-hint">Full menu available.</p>'}${rep.length?`<button type="button" class="sk-rail-row is-flag" data-action="stock-tab" data-id="86"><span><strong>${plural(rep.length,'report')} waiting</strong><small>${manager()?'Approve or decline':'Waiting for a manager'}</small></span>${icon('chev')}</button>`:''}</section>`;
  if(manager()){
   const due=byKey(lines('Approved'),o=>o.vendor).map(([vid,l])=>({v:vendor(vid),l})).filter(x=>x.v).map(x=>({...x,c:cutoff(x.v)})).filter(x=>x.c).sort((a,b)=>a.c.orderBy-b.c.orderBy).slice(0,4);
   const waiting=[[lines('Requested').length,n=>plural(n,'request')+' to review','review'],[st().items.filter(x=>below(x)&&x.vendor&&!B.stock.openLines(s(),x.id).length).length,n=>plural(n,'item')+' below par','order'],[byKey(lines('Ordered'),orderKey).length,n=>n===1?'1 delivery arriving':n+' deliveries arriving','arriving']].filter(([n])=>n);
   html+=`<section class="sk-rail-card"><h3>Next cut-offs</h3>${due.map(x=>`<button type="button" class="sk-rail-row" data-action="stock-goto" data-id="order"><span><strong>${e(x.v.name)}</strong><small>${plural(x.l.length,'line')} · ${whole(total(x.l))}</small></span><em data-tone="${x.c.tone}">${e(when(x.c.orderBy))}</em></button>`).join('')||'<p class="sk-hint">Nothing waiting on a cut-off.</p>'}</section>`;
   if(waiting.length)html+=`<section class="sk-rail-card"><h3>Waiting on you</h3>${waiting.map(([n,text,id])=>`<button type="button" class="sk-rail-row" data-action="stock-goto" data-id="${id}"><span><strong>${e(text(n))}</strong></span>${icon('chev')}</button>`).join('')}</section>`;
  }else{
   const mine=s().orders.filter(o=>o.author===me()&&['Requested','Approved','Ordered'].includes(o.status)).slice(0,4);
   html+=`<section class="sk-rail-card"><h3>Your requests</h3>${mine.map(o=>`<button type="button" class="sk-rail-row" data-action="stock-tab" data-id="requests"><span><strong>${e(o.name)}</strong><small>${e(amount(o.quantity,o.unit))}</small></span><em data-tone="${o.status==='Ordered'?'sage':'slate'}">${o.status==='Ordered'?'Arrives '+e(dayShort(o.expected)):e(o.status)}</em></button>`).join('')||'<p class="sk-hint">Tap + on an item to request it.</p>'}</section>`;
  }
  const inv=countTeams().map(t=>{const o=openCount(t),last=B.stock.lastCount(s(),t),due=B.stock.countDue(s(),t);return `<button type="button" class="sk-rail-row" data-action="${o?'stock-count-open':'stock-tab'}" data-id="${o?e(o.id):'count'}"><span><strong>${e(t)}</strong><small>${o?'Counting now · '+e(first(o.startedBy)):nextAssign(t)?e(who(nextAssign(t)))+' · '+e(dueText(nextAssign(t).date)):last?'Counted '+e(ago(last.submittedAt)):'Never counted'}</small></span><em data-tone="${o?'sage':nextAssign(t)?.date<today()?'danger':due?'amber':'slate'}">${o?'In progress':nextAssign(t)?.date<today()?'Overdue':due?'Due':'Up to date'}</em></button>`;}).join('');
  if(inv)html+=`<section class="sk-rail-card"><h3>Inventory</h3>${inv}</section>`;
  return `<aside class="sk-rail" aria-label="Stock summary">${html}</aside>`;
 }
 function render(){
  ensure();
  const main=tab==='orders'?ordersView():tab==='requests'?requestsView():tab==='86'?boardView():tab==='vendors'?vendorsView():tab==='count'?countView():itemsView();
  return `<div class="sk">${tabs()}<div class="sk-body"><div class="sk-main">${main}${cartBar()}</div>${rail()}</div></div>`;
 }

 // Dialogs
 function open(title,fields,details,save=true,label=''){form=details;api.close?.();api.open(title,fields,save,label);}
 function alertDialog(date,service,itemId='',alertId=''){
  const state=s(),old=alertId?state.unavailable.find(x=>x.id===alertId):null,fixed=item(old?.item||itemId);
  const taken=new Set(state.unavailable.filter(u=>u.date===date&&u.service===service&&['Reported','Approved'].includes(u.status)&&u.id!==alertId).map(u=>u.item));
  const pickable=st().items.filter(x=>x.active&&B.stock.canUse(state,x,state.role,date,service)&&!taken.has(x.id));
  if(!fixed&&!pickable.length){api.notify('Everything on your team’s list is already 86’d, or you’re not on a team for this service.');return;}
  const reasons=['Sold out','Delivery short','Quality issue','Prep not ready','Equipment down'];
  const picker=fixed?`<div class="sk-picked"><strong>${e(fixed.name)}</strong><small>${e(fixed.category)} · ${e(fixed.teams.join(', '))}</small><input type="hidden" name="item" value="${e(fixed.id)}"></div>`:`<label class="sk-search">${icon('search')}<span class="sr-only">Find an item</span><input type="search" placeholder="Find an item" data-stock-pick autocomplete="off"></label><div class="sk-pick-list" role="radiogroup" aria-label="Item to 86">${st().categories.filter(c=>pickable.some(x=>x.category===c)).map(c=>`<p class="sk-pick-cat" data-pick-cat="${e(c)}">${e(c)}</p>`+pickable.filter(x=>x.category===c).map((x,i)=>`<label class="sk-pick" data-pick="${e((x.name+' '+c).toLowerCase())}" data-pick-group="${e(c)}"><input type="radio" name="item" value="${e(x.id)}" ${i===0&&c===pickable[0].category?'required':''}><span>${e(x.name)}</span></label>`).join('')).join('')}</div>`;
  const restock=(!fixed||fixed.vendor)&&!old?input('restock','Also request a restock (optional)','','number','min="0" max="10000" step="1" inputmode="numeric" placeholder="Quantity"'):'';
  open(old?'Edit 86':manager()?'86 an item':'Report an 86',`<p class="sk-dialog-meta">${e(service)} · ${e(dayShort(date))} · ${manager()?'goes live for the whole team right away.':'shows as unconfirmed until a manager approves it.'}</p>${picker}<div class="sk-reasons" aria-label="Quick reasons">${reasons.map(r=>`<button type="button" class="sk-chip" data-action="stock-reason" data-text="${e(r)}">${e(r)}</button>`).join('')}</div>${textarea('reason','Reason & what to offer instead',old?.reason||'','required maxlength="500" placeholder="e.g. Sold out. Offer the sea bass instead."')}${restock}`,{type:'alert',id:old?.id||crypto.randomUUID(),date,service},true,old?'Save':manager()?'86 it':'Send report');
 }
 function cartDialog(){
  const list=[...cart].map(([id,q])=>({x:item(id),q})).filter(l=>l.x);if(!list.length)return;
  open(manager()?'Add to order sheet':'Your request',`<p class="sk-dialog-meta">${manager()?'Lines go straight onto the order sheet, grouped by vendor.':'Your manager reviews it before ordering. Follow it under Requests.'}</p><div class="sk-qty-list">${list.map(l=>`<label class="sk-qty-row"><span><strong>${e(l.x.name)}</strong><small>${e(units(2,l.x.unit))}${l.x.pack?' · '+e(l.x.pack):''}</small></span><input type="number" inputmode="numeric" name="qty:${e(l.x.id)}" value="${l.q}" min="0" max="10000" step="1" aria-label="Quantity of ${e(l.x.name)}"></label>`).join('')}</div>${textarea('note',manager()?'Note (optional)':'Note for your manager (optional)','','maxlength="500" rows="2" placeholder="e.g. Two big bookings on Saturday"')}<p class="sk-hint">Set a quantity to 0 to remove it.</p>`,{type:'request',id:'req-'+crypto.randomUUID().replace(/-/g,'').slice(0,16)},true,manager()?'Add to order sheet':'Send request');
 }
 function countDialog(id){
  const x=item(id);if(!x)return;
  open('Count · '+x.name,`<p class="sk-dialog-meta">How many ${e(units(2,x.unit))} are on the shelf now? Par is ${e(amount(x.par,x.unit))}.</p>`+input('onHand','On hand',x.onHand??'','number','min="0" max="100000" step="0.5" inputmode="decimal" autofocus'),{type:'count',id},true,'Save count');
 }
 function itemDialog(id){
  const x=item(id),areas=s().setup.areas,vendors=st().vendors.filter(v=>v.active||v.id===x?.vendor);
  open(x?'Edit item':'New item',input('name','Item name',x?.name||query||'','text','required maxlength="100"')+
   `<fieldset class="sk-checks"><legend>Teams that can 86 and order it</legend>${areas.map(a=>`<label><input type="checkbox" name="teams" value="${e(a)}" ${(x?x.teams.includes(a):team?team===a:areas[0]===a)?'checked':''}><span>${e(a)}</span></label>`).join('')}</fieldset>`+
   `<div class="sk-form-row">${select('category','Category',[...st().categories.map(c=>[c,c]),['__new','+ New category…']],x?.category||st().categories[0])}${input('newCategory','New category','','text','maxlength="80" placeholder="Only if new"')}</div>`+
   select('vendor','Vendor',[...vendors.map(v=>[v.id,v.name]),['','Made in house (86 only)']],x?x.vendor:vendors[0]?.id||'')+
   `<div class="sk-form-row">${input('unit','Order unit',x?.unit||'case','text','required maxlength="40" placeholder="case, kg, bottle"')}${input('pack','Pack size',x?.pack||'','text','maxlength="80" placeholder="6 × 1 L"')}</div>`+
   `<div class="sk-form-row">${input('par','Par level',x?.par??1,'number','required min="0" max="100000" step="0.5" inputmode="decimal"')}${input('cost','Unit cost ($)',x?.cost??0,'number','required min="0" max="100000" step="0.01" inputmode="decimal"')}</div>`+
   `<div class="sk-form-row">${input('location','Storage area',x?.location||'','text','maxlength="60" list="stock-locations" placeholder="Walk-in cooler"')}${input('sku','Vendor SKU',x?.sku||'','text','maxlength="60" placeholder="Optional"')}</div><datalist id="stock-locations">${[...new Set(st().items.map(i=>i.location).filter(Boolean))].map(l=>`<option value="${e(l)}">`).join('')}</datalist>`+
   select('active','Status',[['true','Active'],['false','Archived (hidden from crew)']],String(x?.active??true))+
   '<p class="sk-hint">Par is what you want on the shelf after a delivery. Counts below par become order suggestions.</p>',{type:'item',id:x?.id||''},true,x?'Save item':'Add item');
 }
 function vendorDialog(id){
  const v=vendor(id);
  open(v?v.name:'New vendor',input('name','Vendor name',v?.name||'','text','required maxlength="80"')+
   `<fieldset class="sk-checks sk-days"><legend>Delivery days</legend>${[1,2,3,4,5,6,0].map(d=>`<label><input type="checkbox" name="days" value="${d}" ${v?.days.includes(d)?'checked':''}><span>${weekday[d]}</span></label>`).join('')}</fieldset>`+
   `<div class="sk-form-row">${input('cutoff','Order cut-off',v?.cutoff||'14:00','time','required')}${select('lead','Order ahead',[['0','Same day'],['1','1 day before'],['2','2 days before'],['3','3 days before']],String(v?.lead??1))}</div>`+
   `<div class="sk-form-row">${input('minimum','Minimum order ($)',v?.minimum??0,'number','required min="0" max="100000" step="1" inputmode="numeric"')}${input('account','Account number',v?.account||'','text','maxlength="60"')}</div>`+
   `<div class="sk-form-row">${input('contact','Rep name',v?.contact||'','text','maxlength="80"')}${input('phone','Phone',v?.phone||'','tel','maxlength="40"')}</div>`+
   input('email','Order email',v?.email||'','email','maxlength="120"')+textarea('note','Notes for whoever orders',v?.note||'','maxlength="500" rows="2"')+
   select('active','Status',[['true','Active'],['false','Archived']],String(v?.active??true)),{type:'vendor',id:v?.id||'v-'+Date.now().toString(36)},true,v?'Save vendor':'Add vendor');
 }
 function finishDialog(id){
  const c=counts().find(x=>x.id===id);if(!c)return;
  const items=sheetItems(c.team),counted=items.filter(x=>c.entries[x.id]),low=counted.filter(x=>c.entries[x.id].qty<x.par);
  open('Finish '+c.team+' count',`<dl class="sk-facts"><div><dt>Counted</dt><dd>${counted.length} <span>of ${items.length}</span></dd></div><div><dt>Below par</dt><dd>${low.length}</dd></div>${manager()?`<div><dt>Counted value</dt><dd>${whole(counted.reduce((n,x)=>n+c.entries[x.id].qty*x.cost,0))}</dd></div>`:''}<div><dt>Not counted</dt><dd>${items.length-counted.length}</dd><small>Keep their last count</small></div></dl>${low.length?`<p class="sk-hint">Below par: ${e(low.map(x=>x.name).join(', '))}</p>`:''}${textarea('note','Note (optional)','','maxlength="500" rows="2" placeholder="e.g. Two cases moved to the event fridge"')}<p class="sk-hint">Saving updates on-hand for everything counted and works out what was used since the last count.</p>`,{type:'count-finish',id},true,'Save count');
 }
 function assignDialog(id,teamName){
  const x=(st().assignments||[]).find(a=>a.id===id),t=x?.team||teamName||s().setup.areas[0];
  const people=s().team.filter(p=>p.active).sort((a,b)=>Number(b.area===t)-Number(a.area===t)||a.name.localeCompare(b.name));
  open(x?'Edit count':'Assign a count',select('team','Team to count',s().setup.areas.map(a=>[a,a]),t)+
   select('assignee','Who counts',[['','Whole team (anyone on it)'],...people.map(p=>[p.id,p.name+' · '+p.area])],x?.assignee??'')+
   `<div class="sk-form-row">${input('date','Due',x?.date||today(),'date','required'+(x?'':` min="${today()}"`))}${select('repeat','Repeats',[['','Once'],['weekly','Every week']],x?x.repeat:'weekly')}</div>`+
   textarea('note','Note for the counter (optional)',x?.note||'','maxlength="300" rows="2" placeholder="e.g. Include the patio bar fridge"')+
   '<p class="sk-hint">It shows on Today for whoever is assigned, with reminders the day before. Finishing the count completes it; weekly counts then schedule the next one.</p>'+
   (x?`<button type="button" class="sk-link sk-cancel-link" data-action="stock-assign-cancel" data-id="${e(x.id)}">Cancel this count</button>`:''),
   {type:'assign',id:x?.id||'asg-'+Date.now().toString(36)},true,x?'Save':'Assign');
 }
 function historyDialog(id){
  const c=counts().find(x=>x.id===id);if(!c)return;
  const rows=Object.entries(c.entries).map(([iid,x])=>({it:item(iid),...x})).filter(r=>r.it).sort((a,b)=>walk(a.it.location||'Other',b.it.location||'Other')||a.it.name.localeCompare(b.it.name));
  const usage=r=>r.used===null||r.used===undefined?'First count':r.used>=0?'Used '+amount(r.used,r.it.unit):amount(-r.used,r.it.unit)+' more than expected';
  open(c.team+' count',`<p class="sk-dialog-meta">${e(stamp(c.submittedAt))} · ${e(name(c.submittedBy))} · ${plural(rows.length,'item')}${manager()?' · '+whole(c.value)+' on hand':''}</p>${c.note?`<p class="sk-hint">“${e(c.note)}”</p>`:''}<p class="sk-hint">Used = last count + deliveries checked in − this count. “More than expected” usually means a delivery wasn’t checked in, or a miscount.</p><div class="sk-qty-list">${rows.map(r=>`<div class="sk-count-line${r.used<0?' is-over':''}"><span><strong>${e(r.it.name)}</strong><small>${e(usage(r))}</small></span><b>${e(amount(r.qty,r.it.unit))}</b>${r.qty<r.it.par?tag('Below par','amber'):''}</div>`).join('')}</div>`,{type:'none'},false);
 }
 function poText(list,heading){
  const v=vendor(list[0].vendor),pad=(t,n)=>String(t).padEnd(n).slice(0,n);
  return [heading,`Vendor: ${v?.name||''}${v?.account?' (Account '+v.account+')':''}`,`From: The Copper Room · ${name(me())}`,list[0].expected?`Delivery: ${dayShort(list[0].expected)}`:'','-'.repeat(48),
   ...list.map(o=>`${pad(amount(o.quantity,o.unit),12)} ${pad(o.name+(item(o.item)?.pack?' ('+item(o.item).pack+')':''),26)} ${money(B.stock.lineTotal(o)).padStart(9)}`),
   '-'.repeat(48),`Estimated total: ${money(total(list))}`,'Please call if anything is short or substituted.'].filter(Boolean).join('\n');
 }
 function poDialog(list,heading,file){
  open(heading,`<p class="sk-dialog-meta">Send it to ${e(vendor(list[0].vendor)?.email||'your rep')} or read it out on the phone. Prices are estimates.</p><textarea class="sk-po-text" readonly rows="${Math.min(16,list.length+8)}" aria-label="Order text">${e(poText(list,heading))}</textarea><div class="sk-dialog-actions">${btn(icon('copy')+'Copy text','clip','','')}${btn(icon('download')+'CSV','csv',file,'secondary')}</div>`,{type:'none',lines:list.map(o=>o.id),file},false);
 }
 function csv(ids,file){
  const cell=x=>'"'+String(x??'').replace(/^[=+@-]/,"'$&").replaceAll('"','""')+'"';
  const rows=[['PO','Vendor','Item','Vendor SKU','Quantity','Unit','Pack','Unit cost','Line total','Team','Requested by'],...ids.map(id=>s().orders.find(o=>o.id===id)).filter(Boolean).map(o=>[o.po||'',vendor(o.vendor)?.name||'',o.name,item(o.item)?.sku||'',o.quantity,o.unit,item(o.item)?.pack||'',o.cost,B.stock.lineTotal(o),o.area,name(o.author)])];
  const blob=new Blob(['﻿'+rows.map(r=>r.map(cell).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download=file;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 }

 function handle(action,id,data={}){
  const state=s(),top=()=>globalThis.scrollTo?.({top:0,behavior:'instant'});
  if(action==='tab'){show(id);query='';api.render();top();return;}
  // Deep link from Today, the quick palette or a task note: the right tab, order stage and team in one tap.
  if(action==='go'){api.close?.();api.go?.();ensure();show(id||'items');if(data.stage)stage=data.stage;query='';filter='all';if(data.team&&(manager()?state.setup.areas:myTeams()).includes(data.team))team=data.team;api.render();top();return;}
  if(action==='count-start'){const cid='count-'+Date.now().toString(36);if(api.commit({type:'stock:count-start',id:cid,team:id},null)){countId=cid;countResult='';query='';api.render();top();}return;}
  if(action==='count-go'){api.go?.();tab='count';countResult='';query='';const o=openCount(id);if(o){countId=o.id;api.render();top();return;}const cid='count-'+Date.now().toString(36);if(api.commit({type:'stock:count-start',id:cid,team:id},null)){countId=cid;api.render();top();}return;}
  if(action==='assign'){assignDialog(id,data.team);return;}
  if(action==='assign-cancel'){if(api.commit({type:'stock:assign-cancel',id},'Count cancelled.')){form=null;api.close?.();}return;}
  if(action==='count-open'){tab='count';countId=id;countResult='';query='';api.render();top();return;}
  if(action==='count-close'){countId='';query='';api.render();top();return;}
  if(action==='centry-step'||action==='centry-fill'){const c=counts().find(x=>x.id===countId),x=item(id);if(!c||!x)return;const cur=c.entries[id]?.qty;const next=action==='centry-fill'?x.onHand:Math.max(0,(cur??0)+Number(data.step||0));if(next===null||(cur===undefined&&Number(data.step)<0))return;api.commit({type:'stock:count-entry',id:c.id,item:id,qty:next},null);return;}
  if(action==='count-finish'){finishDialog(id);return;}
  if(action==='count-discard'){open('Discard this count?','<p class="sk-dialog-meta">Everything entered on this sheet is deleted. On-hand levels stay as they were.</p>',{type:'count-discard',id},true,'Discard count');return;}
  if(action==='count-view'){historyDialog(id);return;}
  if(action==='count-more'){historyLimit+=10;api.render();return;}
  if(action==='count-dismiss'){countResult='';api.render();return;}
  if(action==='count-order'){const c=counts().find(x=>x.id===id),list=c?reorder(c).map(x=>({item:x.id,quantity:suggested(x)})):[];if(list.length&&api.commit({type:'stock:request',id:'count-'+Date.now().toString(36),lines:list,note:'Below par after the '+c.team+' count'},manager()?plural(list.length,'item')+' added to the order sheet.':'Request sent for '+plural(list.length,'item')+'.'))countResult='',api.render();return;}
  if(action==='goto'){tab='orders';stage=id;api.render();top();return;}
  if(action==='stage'){stage=id;api.render();return;}
  if(action==='filter'){filter=id;api.render();return;}
  if(action==='step'){const q=Math.max(0,(cart.get(id)||0)+Number(data.step||1));if(q)cart.set(id,q);else cart.delete(id);api.render();return;}
  if(action==='cart'){cartDialog();return;}
  if(action==='open'){itemSheet(id);return;}
  if(action==='sheet-step'){const i=document.querySelector('#editor-fields [data-sheet-qty]');if(i)i.value=Math.max(1,Math.round(Number(i.value)||0)+Number(data.step));return;}
  if(action==='sheet-add'){const i=document.querySelector('#editor-fields [data-sheet-qty]'),q=Math.round(Number(i?.value));if(!(q>=1&&q<=10000)){api.notify('Enter a whole quantity from 1 to 10,000.');return;}const x=item(id);cart.set(id,q);form=null;api.close?.();if(state.view!=='stock'){api.go?.();show('items');}api.render();api.notify(`${amount(q,x.unit)} ${x.name} added · ${plural(cart.size,'item')} ready to ${manager()?'add':'send'}`);return;}
  if(action==='count-one'){countDialog(id);return;}
  if(action==='86'){alertDialog(state.date,state.service,id);return;}
  if(action==='86-edit'){const u=state.unavailable.find(x=>x.id===id);if(u)alertDialog(u.date,u.service,'',u.id);return;}
  if(action==='report-86'){alertDialog(state.date,state.service);return;}
  if(action==='report-86-history'){api.report('eighty-six');return;}
  if(action==='report'){api.report('orders');return;}
  if(action==='restock'){const x=item(id);if(!x)return;cart.set(x.id,below(x)?suggested(x):Math.max(1,Math.ceil(x.par)));cartDialog();return;}
  if(action==='reason'){const box=document.querySelector('#editor-form [name=reason]');if(box){const v=box.value.trim();box.value=v?v.replace(/[.\s]*$/,'. ')+data.text+'. ':data.text+'. ';box.focus();}return;}
  if(action==='approve'){api.commit({type:'stock:review',ids:[id],status:'Approved'},'Approved · on the order sheet.');return;}
  if(action==='approve-all'){api.commit({type:'stock:review',ids:lines('Requested').map(o=>o.id),status:'Approved'},'All requests approved.');return;}
  if(action==='decline'){const o=state.orders.find(x=>x.id===id);open('Decline request',`<p class="sk-dialog-meta">${e(o?amount(o.quantity,o.unit):'')} ${e(o?.name)} · ${e(name(o?.author))}</p>`+textarea('feedback','Reason for the crew','','required maxlength="500" rows="3" placeholder="e.g. Already on Thursday’s delivery."'),{type:'decline',id},true,'Decline');return;}
  if(action==='qty'){const o=state.orders.find(x=>x.id===id);if(o)api.commit({type:'stock:qty',id,quantity:Math.max(1,o.quantity+Number(data.step||0))},null);return;}
  if(action==='cancel'){api.commit({type:'stock:cancel',id},manager()?'Removed from the order sheet.':'Request withdrawn.');return;}
  if(action==='suggest'){api.commit({type:'stock:request',id:'par-'+Date.now().toString(36),lines:[{item:id,quantity:Number(data.qty)||1}],note:'Below par after the last count'},'Added to the order sheet.');return;}
  if(action==='suggest-all'){const busy=new Set(state.orders.filter(o=>['Requested','Approved','Ordered'].includes(o.status)).map(o=>o.item));const list=st().items.filter(x=>below(x)&&x.vendor&&!busy.has(x.id)).map(x=>({item:x.id,quantity:suggested(x)}));api.commit({type:'stock:request',id:'par-'+Date.now().toString(36),lines:list,note:'Below par after the last count'},plural(list.length,'item')+' added to the order sheet.');return;}
  if(action==='place'){const v=vendor(id),list=lines('Approved').filter(o=>o.vendor===id),sum=total(list),c=cutoff(v);open('Place order',`<div class="sk-picked"><strong>${e(v.name)}</strong><small>${plural(list.length,'line')} · ${money(sum)}${c?' · arrives '+e(dayShort(c.date)):''}</small></div>${sum<v.minimum?`<p class="sk-warn">${whole(v.minimum-sum)} under the ${whole(v.minimum)} minimum. The vendor may charge a delivery fee or refuse the order.</p>`:''}<textarea class="sk-po-text" readonly rows="${Math.min(14,list.length+8)}" aria-label="Order text">${e(poText(list,'Purchase order'))}</textarea><p class="sk-hint">Placing gives these lines a PO number so the team can see what’s arriving.</p>`,{type:'place',vendor:id},true,'Place order');return;}
  if(action==='copy'){const list=lines('Approved').filter(o=>o.vendor===id);if(list.length)poDialog(list,'Draft order · '+vendor(id).name,'brigly-order-'+id+'.csv');return;}
  if(action==='copy-po'){const list=lines('Ordered').filter(o=>orderKey(o)===id);if(list.length)poDialog(list,(id.startsWith('vendor:')?'Order':id)+' · '+(vendor(list[0].vendor)?.name||''),'brigly-'+id.replace(/[^\w-]/g,'')+'.csv');return;}
  if(action==='clip'){const t=document.querySelector('#editor-fields .sk-po-text');if(t){t.select();(navigator.clipboard?.writeText(t.value)||Promise.reject()).then(()=>api.notify('Order copied. Paste it into an email or message to your rep.'),()=>{document.execCommand?.('copy');api.notify('Order selected. Copy it with Ctrl+C.');});}return;}
  if(action==='csv'){if(form?.lines)csv(form.lines,id);return;}
  if(action==='receive'){const list=lines('Ordered').filter(o=>orderKey(o)===id);if(!list.length)return;open('Check in delivery',`<div class="sk-picked"><strong>${e(vendor(list[0].vendor)?.name||'')}</strong><small>${e(id.startsWith('vendor:')?'No PO number':id)} · change anything that arrived short</small></div><div class="sk-qty-list">${list.map(o=>`<label class="sk-qty-row"><span><strong>${e(o.name)}</strong><small>Ordered ${e(amount(o.quantity,o.unit))}</small></span><input type="number" inputmode="decimal" name="recv:${e(o.id)}" value="${o.quantity}" min="0" max="${o.quantity*10}" step="0.5" aria-label="Received ${e(o.name)}"></label>`).join('')}</div>${textarea('note','Delivery note (optional)','','maxlength="500" rows="2" placeholder="Shorts, substitutions, quality"')}`,{type:'receive',po:id},true,'Confirm delivery');return;}
  if(action==='item'){itemDialog(id);return;}
  if(action==='vendor'){vendorDialog(id);return;}
 }
 function submit(v,data){
  if(!form)throw Error('Reopen the form.');
  if(form.type==='alert')return {type:'stock:alert',id:form.id,item:v.item,date:form.date,service:form.service,reason:v.reason,restock:Number(v.restock)||0};
  if(form.type==='request'){const list=Object.entries(v).filter(([k])=>k.startsWith('qty:')).map(([k,q])=>({item:k.slice(4),quantity:Math.round(Number(q))})).filter(l=>l.quantity>0);if(!list.length)throw Error('Set at least one quantity above 0.');return {type:'stock:request',id:form.id,lines:list,note:v.note};}
  if(form.type==='count')return {type:'stock:count',id:form.id,onHand:v.onHand===''?null:Number(v.onHand)};
  if(form.type==='decline')return {type:'stock:review',ids:[form.id],status:'Declined',feedback:v.feedback};
  if(form.type==='place')return {type:'stock:place',vendor:form.vendor};
  if(form.type==='receive')return {type:'stock:receive',po:form.po,note:v.note,received:Object.fromEntries(Object.entries(v).filter(([k])=>k.startsWith('recv:')).map(([k,q])=>[k.slice(5),Number(q)]))};
  if(form.type==='item'){const cat=v.category==='__new'?v.newCategory:v.category;if(!cat)throw Error('Type a name for the new category.');return {type:'stock:item',id:form.id||'st-'+(v.name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,40)||'item')+'-'+Date.now().toString(36),name:v.name,category:cat,teams:data.getAll('teams'),vendor:v.vendor,unit:v.unit,pack:v.pack,cost:Number(v.cost),par:Number(v.par),location:v.location,sku:v.sku,active:v.active==='true'};}
  if(form.type==='vendor')return {type:'stock:vendor',id:form.id,name:v.name,days:data.getAll('days').map(Number),cutoff:v.cutoff,lead:Number(v.lead),minimum:Number(v.minimum),account:v.account,contact:v.contact,phone:v.phone,email:v.email,note:v.note,active:v.active==='true'};
  if(form.type==='count-finish')return {type:'stock:count-submit',id:form.id,note:v.note};
  if(form.type==='assign')return {type:'stock:assign',id:form.id,team:v.team,assignee:v.assignee,date:v.date,note:v.note,repeat:v.repeat};
  if(form.type==='count-discard')return {type:'stock:count-discard',id:form.id};
  throw Error('Nothing to save.');
 }
 // Called once a dialog's change has been saved; returns the confirmation to show.
 function saved(){
  const messages={alert:manager()?'86 is live for the whole team.':'86 report sent to your manager.',request:manager()?'Added to the order sheet.':'Request sent. Follow it under Requests.',count:'Count saved.',decline:'Declined. The crew sees your reason.',place:'Order placed. It now shows under Arriving.',receive:'Delivery checked in.',item:'Stock list updated.',vendor:'Vendor saved.','count-finish':'Count saved. On-hand is up to date.','count-discard':'Count discarded.',assign:'Count scheduled. It shows on Today for whoever counts.'};
  const type=form?.type;if(type==='request')cart.clear();if(type==='place')stage='arriving';if(type==='receive')stage='received';if(type==='count-finish'){countResult=form.id;countId='';}if(type==='count-discard')countId='';form=null;return messages[type];
 }
 function onChange(t){
  if(t.name==='stockTeam'){team=t.value;api.render();return;}
  if(t.name==='stockGroup'){group=t.value;api.render();return;}
  if(t.dataset?.countEntry===undefined)return;
  const id=t.dataset.countEntry,value=t.value.trim(),session=countId;
  // Wait for focus to land on the next field so it can be restored after the redraw.
  setTimeout(()=>{const next=document.activeElement?.dataset?.countEntry;if(api.commit({type:'stock:count-entry',id:session,item:id,qty:value===''?null:Number(value)},null)&&next)document.querySelector(`[data-count-entry="${CSS.escape(next)}"]`)?.focus();},0);
 }
 // Enter moves to the next item on the count sheet, like a paper sheet.
 document.addEventListener('keydown',ev=>{
  if(ev.key!=='Enter'||!ev.target.matches?.('[data-count-entry]'))return;
  ev.preventDefault();const all=[...document.querySelectorAll('[data-count-entry]')].filter(x=>!x.closest('[hidden]')),next=all[all.indexOf(ev.target)+1];
  if(next)next.focus();else ev.target.blur();
 });
 // Live search filters rows in place, so typing never loses focus.
 document.addEventListener('input',ev=>{
  const t=ev.target;
  if(t.matches?.('[data-stock-search]')){
   query=t.value.trim();const q=query.toLowerCase(),view=t.closest('.sk-main');if(!view)return;
   for(const r of view.querySelectorAll('.sk-row'))r.hidden=Boolean(q)&&!r.dataset.search.includes(q);
   for(const g of view.querySelectorAll('[data-stock-group]'))g.hidden=!g.querySelector('.sk-row:not([hidden])');
   const none=view.querySelector('.sk-noresults');if(none){none.hidden=Boolean(view.querySelector('.sk-row:not([hidden])'));const label=none.querySelector('[data-stock-query]');if(label)label.textContent=query;}
  }
  if(t.matches?.('[data-stock-pick]')){
   const q=t.value.trim().toLowerCase(),list=t.closest('#editor-fields')?.querySelector('.sk-pick-list');if(!list)return;
   for(const r of list.querySelectorAll('.sk-pick'))r.hidden=Boolean(q)&&!r.dataset.pick.includes(q);
   for(const c of list.querySelectorAll('[data-pick-cat]'))c.hidden=!list.querySelector(`.sk-pick[data-pick-group="${CSS.escape(c.dataset.pickCat)}"]:not([hidden])`);
  }
 });
 return {render,handle,submit,saved,onChange,show,alert:alertDialog,tab:()=>tab};
};
