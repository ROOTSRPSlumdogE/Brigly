import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const load=files=>{const c=vm.createContext({crypto,console,document:{addEventListener(){},getElementById(){return null;},querySelector(){return null;}},window:{scrollTo(){}},requestAnimationFrame(){}});for(const f of files)vm.runInContext(readFileSync(new URL('../assets/js/'+f+'.js',import.meta.url),'utf8'),c);return c;};
const core=['workspace-state','schedule-state','shift-operations-state','demo-history','restaurant-history','planner-state','duties-state','checklist-history','team-chat-state','stock-state','checklist-demo','stock-demo','manage-state','payroll-state','writeups-state','business-state','training-state','floor-state'];
const c=load([...core,'floor-ui']),B=c.Brigly,F=B.floor,store={v:null,getItem(){return this.v},setItem(k,v){this.v=v}};
const same=(a,b)=>assert.equal(JSON.stringify(a),JSON.stringify(b));
const fails=(fn,re)=>assert.throws(fn,err=>re.test(err.message),'expected '+re);
const today=B.dateString(new Date());

// Every workspace gets a floor plan; existing bookings keep their tables, get a turn time, a source and tags, and nothing is lost.
let s=B.starter('2026-10-25');s.date='2026-10-25';s.service='Dinner';s.role='manager';
assert(B.validState(s));
assert.equal(s.floor.version,1);assert(s.floor.rooms.length>=4);assert(s.floor.tables.length>=20);
assert(s.reservations.every(r=>Array.isArray(r.tables)&&Number.isInteger(r.duration)&&F.SOURCES.includes(r.source)&&Array.isArray(r.tags)&&r.table===r.tables.join('+')));
const bennett=s.reservations.find(r=>r.id==='res-1');same(bennett.tables,['4']);assert.equal(bennett.duration,120);assert.equal(bennett.table,'4');
assert(s.reservations.filter(r=>!F.CLOSED.includes(r.status)).every(r=>!r.tables.length||r.guests<=F.capacity(s,r.tables)),'sample parties fit their tables');
assert(new Set(s.reservations.map(r=>r.name)).size>200,'sample history has a wide guest base');
assert(s.reservations.some(r=>r.tables[0]?.startsWith('B')),'bar tables carry history');
console.log('PASS: starter floor plan, booking migration (tables, turn time, source, tags) and realistic sample guests.');

// Legacy data: no floor key and free-text tables still load, and a plan that no longer fits is rebuilt without losing bookings.
const legacy=JSON.parse(JSON.stringify(s));delete legacy.floor;for(const r of legacy.reservations){delete r.tables;delete r.duration;delete r.source;delete r.tags;}
legacy.reservations[0].table='Patio 3';legacy.reservations[1].table='Window seat';legacy.reservations[2].table='4 + 5';
store.v=JSON.stringify(legacy);let up=B.load(store);
assert(B.validState(up));same(up.reservations[0].tables,['3']);same(up.reservations[1].tables,['Wind']);same(up.reservations[2].tables,['4','5']);assert.equal(up.reservations[2].table,'4+5');
assert(up.floor.tables.some(t=>t.label==='Wind'),'unknown labels become tables so the booking keeps its place');
const broken=JSON.parse(JSON.stringify(s));broken.floor.tables[0].x=999;store.v=JSON.stringify(broken);up=B.load(store);
assert(B.validState(up));assert.equal(up.reservations.length,s.reservations.length,'an invalid plan is rebuilt, bookings stay');
console.log('PASS: legacy free-text tables, missing plan and broken plan recovery.');

// Booking rules: joined tables, per-table conflicts with turn times, capacity, unknown tables, and the legacy table text stays in sync.
const put=(item,role='manager')=>{s=B.change(s,{type:'put',collection:'reservations',item},role);return s.reservations.find(r=>r.id===item.id);};
const base={date:'2026-10-25',service:'Dinner',note:'',contact:''};
let r=put({...base,id:'party',name:'Okafor',guests:12,time:'20:00',tables:['6','10'],duration:150,source:'Online',tags:['Birthday','Large party']});
assert.equal(r.table,'6+10');same(r.tables,['6','10']);assert.equal(r.duration,150);assert.equal(r.source,'Online');assert(r.createdAt);
fails(()=>put({...base,id:'clash',name:'Clash',guests:4,time:'21:30',tables:['10']}),/Table 10 is booked for Okafor at 20:00/);
put({...base,id:'after',name:'After',guests:4,time:'22:30',tables:['10'],duration:60});
fails(()=>put({...base,id:'big',name:'Big',guests:8,time:'21:00',tables:['1']}),/seats up to 2/);
fails(()=>put({...base,id:'ghost',name:'Ghost',guests:2,time:'21:00',tables:['ZZ']}),/not on the floor plan/);
fails(()=>put({...base,id:'many',name:'Many',guests:2,time:'21:00',tables:['1','2','3','7','9']}),/up to 4 tables/);
fails(()=>put({...base,id:'long',name:'Long',guests:2,time:'21:00',tables:['9'],duration:10}),/turn time/);
r=put({...base,id:'short',name:'Short',guests:2,time:'18:00',tables:['9'],duration:60});
put({...base,id:'next',name:'Next',guests:2,time:'19:00',tables:['9'],duration:60});
fails(()=>put({...base,id:'overlap',name:'Overlap',guests:2,time:'18:45',tables:['9'],duration:60}),/Table 9 is booked/);
r=put({...base,id:'lower',name:'Lower',guests:2,time:'20:30',tables:['b1']});same(r.tables,['B1'],'labels are matched without case');
r=put({...base,id:'open',name:'Open',guests:3,time:'20:30',tables:[]});assert.equal(r.table,'');
assert(B.validState(s));
console.log('PASS: joined tables, turn-time conflicts per table, capacity, unknown tables and table text sync.');

// Lifecycle timestamps, seating at another table, assigning and walk-ins that shorten to the next booking.
s=B.change(s,{type:'reservation-status',id:'res-1',status:'Seated'},'crew');assert(s.reservations.find(x=>x.id==='res-1').seatedAt);
s=B.change(s,{type:'reservation-status',id:'res-1',status:'Completed'},'crew');assert(s.reservations.find(x=>x.id==='res-1').completedAt);
s=B.change(s,{type:'floor:seat',id:'open',tables:['3']});r=s.reservations.find(x=>x.id==='open');assert.equal(r.status,'Seated');same(r.tables,['3']);assert(r.seatedAt);
fails(()=>B.change(s,{type:'floor:seat',id:'open'}),/Only confirmed/);
s=B.change(s,{type:'floor:assign',id:'lower',tables:['B2']},'crew');same(s.reservations.find(x=>x.id==='lower').tables,['B2']);
fails(()=>B.change(s,{type:'floor:assign',id:'lower',tables:['3']}),/booked for Open/);
s=B.change(s,{type:'floor:walk-in',guests:2,tables:['9'],date:'2026-10-25',service:'Dinner',time:'20:15'},'crew');
let w=s.reservations.at(-1);assert.equal(w.status,'Seated');assert.equal(w.source,'Walk-in');assert.equal(w.name,'Walk-in');assert(w.seatedAt);assert.equal(w.duration,120);
s=B.change(s,{type:'floor:walk-in',guests:2,tables:['10'],date:'2026-10-25',service:'Dinner',time:'17:00',duration:240});
w=s.reservations.at(-1);assert.equal(w.duration,180,'a walk-in ends when the next booking starts');
fails(()=>B.change(s,{type:'floor:walk-in',guests:2,tables:['10'],date:'2026-10-25',service:'Dinner',time:'19:30'}),/booked for Okafor/);
fails(()=>B.change(s,{type:'floor:walk-in',guests:2,tables:[],date:'2026-10-25',service:'Dinner'}),/Pick a table/);
fails(()=>B.change(s,{type:'floor:walk-in',guests:40,tables:['9'],date:'2026-10-25',service:'Dinner'}),/party size/);
console.log('PASS: seating timestamps, seat elsewhere, assign, walk-ins with automatic turn shortening.');

// Permissions: crew book and seat, only managers (or a floor-plan lead) change the layout.
const crew=JSON.parse(JSON.stringify(s));crew.role='crew';crew.crewId='alex';
fails(()=>B.change(crew,{type:'floor:table',id:'t-x',room:'main',label:'99'},'crew'),/Only managers or a floor-plan lead/);
fails(()=>B.change(crew,{type:'floor:room',id:'x',name:'X',cols:10,rows:10},'crew'),/Only managers/);
const lead=B.change(crew,{type:'manage:permissions',person:'alex',perms:{floor:true}},'manager');
const ledit=B.change({...lead,role:'crew',crewId:'alex'},{type:'floor:table',id:'t-lead',room:'main',label:'99',seats:2,max:2,shape:'round'},'crew');
assert(ledit.floor.tables.some(t=>t.id==='t-lead'),'a floor-plan lead can edit the layout');
console.log('PASS: layout permissions with the floor-plan lead permission.');

// Layout editor: rooms, tables, moving, resizing, overlaps, bounds, unique labels, renames that follow bookings, removal.
s=B.change(s,{type:'floor:room',id:'terrace',name:'Terrace',cols:12,rows:8});assert.equal(s.floor.rooms.at(-1).name,'Terrace');
fails(()=>B.change(s,{type:'floor:room',id:'dup',name:'terrace',cols:12,rows:8}),/already has that name/);
fails(()=>B.change(s,{type:'floor:room',id:'tiny',name:'Tiny',cols:2,rows:2}),/cells wide/);
s=B.change(s,{type:'floor:table',id:'t-a',room:'terrace',shape:'round',seats:2,max:2,w:2,h:2});
let a=s.floor.tables.find(t=>t.id==='t-a');assert.equal(a.x,0);assert.equal(a.y,0);assert(/^\d+$/.test(a.label),'auto label is the next free number');
s=B.change(s,{type:'floor:table',id:'t-b',room:'terrace',shape:'square',seats:4,max:4,w:2,h:2});
let b=s.floor.tables.find(t=>t.id==='t-b');assert.equal(b.x,2,'new tables take the next free spot');
fails(()=>B.change(s,{type:'floor:table',id:'t-b',x:0,y:0}),/overlaps table/);
fails(()=>B.change(s,{type:'floor:table',id:'t-b',x:11,y:0}),/inside the room/);
fails(()=>B.change(s,{type:'floor:table',id:'t-b',label:'4'}),/already exists/);
fails(()=>B.change(s,{type:'floor:table',id:'t-b',label:'Patio 3'}),/short label/);
fails(()=>B.change(s,{type:'floor:table',id:'t-b',seats:6,max:4}),/Maximum capacity/);
s=B.change(s,{type:'floor:table',id:'t-b',x:9,y:3,w:3,h:2});b=s.floor.tables.find(t=>t.id==='t-b');same([b.x,b.y,b.w,b.h],[9,3,3,2]);
s=B.change(s,{type:'floor:table',id:'t-b',seats:8});b=s.floor.tables.find(t=>t.id==='t-b');assert.equal(b.max,8,'raising seats lifts the maximum with it');
fails(()=>B.change(s,{type:'floor:room',id:'terrace',name:'Terrace',cols:10,rows:8}),/would fall outside/);
// Renaming a table follows every booking that uses it.
const ten=s.floor.tables.find(t=>t.label==='10');s=B.change(s,{type:'floor:table',id:ten.id,label:'T10'});
assert.equal(s.reservations.find(x=>x.id==='party').table,'6+T10');
fails(()=>B.change(s,{type:'floor:remove-room',id:'terrace'}),/tables in this room/);
fails(()=>B.change(s,{type:'floor:remove-room',id:'nope'}),/no longer exists/);
s=B.change(s,{type:'floor:remove-table',id:'t-a'});s=B.change(s,{type:'floor:remove-table',id:'t-b'});s=B.change(s,{type:'floor:remove-room',id:'terrace'});
assert(!s.floor.rooms.some(x=>x.id==='terrace'));
s=B.change(s,{type:'floor:room-order',id:'bar',direction:-1});assert.equal(s.floor.rooms[0].id,'bar');
s=B.change(s,{type:'floor:settings',turnMinutes:90});assert.equal(s.floor.settings.turnMinutes,90);
r=put({...base,id:'default-turn',name:'Default',guests:2,time:'22:00',tables:['1']});assert.equal(r.duration,90);
// Removing a table in use frees upcoming bookings but keeps history.
const future=B.addDays(today,2);put({...base,id:'future',date:future,name:'Future',guests:2,time:'19:00',tables:['7']});
const seven=s.floor.tables.find(t=>t.label==='7');s=B.change(s,{type:'floor:remove-table',id:seven.id});
same(s.reservations.find(x=>x.id==='future').tables,[]);
assert(B.validState(s));B.save(store,s);assert.equal(B.load(store).floor.rooms[0].id,'bar');
console.log('PASS: rooms, table placement, drag bounds, overlap, labels, renames, removal, order and default turn time.');

// Live occupancy, availability suggestions, pacing and the service statistics.
s=B.starter('2026-10-25');s.date='2026-10-25';s.service='Dinner';
const occ=F.occupancy(s,'2026-10-25','Dinner',19*60);
assert.equal(occ.find(o=>o.table.label==='4').status,'late','Bennett at 18:30 is late at 19:00');
assert.equal(occ.find(o=>o.table.label==='2').status,'reserved','Jordan at 19:00 holds table 2');
assert.equal(occ.find(o=>o.table.label==='8').status,'soon','Martinez at 19:30 arrives soon');
assert.equal(occ.find(o=>o.table.label==='B1').status,'open');
s=B.change(s,{type:'reservation-status',id:'res-1',status:'Seated'});
assert.equal(F.occupancy(s,'2026-10-25','Dinner',19*60).find(o=>o.table.label==='4').status,'seated');
const av=F.availability(s,{date:'2026-10-25',service:'Dinner',time:'19:00',guests:4,duration:120});
assert(av.rows.find(x=>x.table.label==='2').conflict,'table 2 shows its conflict');
assert(av.suggestions.length>0);assert(av.suggestions.every(g=>g.reduce((n,t)=>n+t.max,0)>=4));
assert(!av.suggestions.some(g=>g.some(t=>['2','4','8'].includes(t.label))),'booked tables are not suggested');
put({...base,id:'p1',name:'Private',guests:10,time:'21:30',tables:['P1']});put({...base,id:'p2',name:'Private two',guests:8,time:'21:30',tables:['P2']});
const big=F.availability(s,{date:'2026-10-25',service:'Dinner',time:'21:30',guests:12,duration:120});assert(!big.suggestions.some(g=>g.length===1),'no single table seats 12 once the private room is taken');
assert(big.suggestions.some(g=>g.length===2),'large parties get joined-table suggestions');
const pace=F.timeline(s,'2026-10-25','Dinner');assert.equal(pace[0].time,'16:00');assert(pace.some(p=>p.covers>=12));
const st=F.stats(s,'2026-10-25','Dinner',19*60);assert.equal(st.covers,30);assert.equal(st.bookings,5);assert.equal(st.seatedNow,1);assert(st.seats>0);assert(st.utilization>0);
console.log('PASS: occupancy states, conflict-aware suggestions, joined suggestions, pacing and service statistics.');

// Guest statistics: directory, tiers, reliability, usual time, favourites, cohorts, sources and period framing.
const G=F.guests(s,B.addDays('2026-10-25',-89),'2026-10-25');
assert(G.summary.uniqueGuests>50);assert(G.summary.returning>0&&G.summary.newGuests>0,'both new and returning guests appear');
assert(G.summary.returningShare>0&&G.summary.returningShare<100);
assert(G.summary.avgDine>60&&G.summary.avgDine<200,'dine time comes from seated/completed stamps');
assert(G.summary.noShowRate>=0&&G.summary.walkInShare>0);
const reg=G.directory.find(g=>g.visits>=4);assert.equal(reg.tier,'Regular');assert(reg.usualTime);assert(reg.favouriteRoom);assert(reg.reliability<=100);
assert(G.cohorts.reduce((n,x)=>n+x.value,0)===G.summary.uniqueGuests,'cohorts cover every guest in the period');
assert(G.sources.length>=3&&G.arrivals.length>0&&G.weekdays.length===7);
const h=F.history(s,reg.key);assert(h.length>=4);assert(h.every(x=>F.guestKey(x)===reg.key));
const noShow=B.change(s,{type:'reservation-status',id:'res-2',status:'No-show'});
const G2=F.guests(noShow,'2026-10-25','2026-10-25');const j=G2.directory.find(g=>g.name==='Jordan');assert(j.noShows>=1);assert(j.reliability<100);
const U=F.utilization(s,B.addDays('2026-10-25',-30),'2026-10-25');assert(U.rooms.length>=4);assert(U.rooms.find(x=>x.room.id==='main').utilization>0);assert(U.tables[0].bookings>0);
console.log('PASS: guest directory, tiers, reliability, favourites, cohorts, sources, no-show tracking and room utilization.');

// The UI renders every tab for managers and crew with escaped content, and the form carries the table picker.
const e=x=>String(x??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const button=(label,action,id='',extra='',style='secondary')=>`<button type="button" class="button ${style}" data-action="${action}" data-id="${e(id)}" ${extra}>${e(label)}</button>`;
const badge=(label,tone='')=>`<span class="badge ${tone}">${e(label)}</span>`;
const input=(name,label,value='',type='text',attrs='')=>`<label>${label}<input name="${name}" type="${type}" value="${e(value)}" ${attrs}></label>`;
const textarea=(name,label,value='',attrs='')=>`<label>${label}<textarea name="${name}" ${attrs}>${e(value)}</textarea></label>`;
const select=(name,label,values,value)=>`<label>${label}<select name="${name}">${values.map(v=>{const [k,t]=Array.isArray(v)?v:[v,v];return `<option value="${e(k)}" ${k===value?'selected':''}>${e(t)}</option>`;}).join('')}</select></label>`;
let ui=s,opened=[],forms=[],edits=0,commits=[],went=0;
const api={state:()=>ui,e,button,badge,input,textarea,select,dateLabel:x=>x,render(){},notify(){},close(){},edit(){edits++;},go(){went++;},serviceFields:()=>'<label>Date<input name="date"></label>',open(t,h){opened.push([t,h]);},form(t,h,l){forms.push([t,h,l]);},commit(a){try{ui=B.change(ui,a);commits.push(a.type);return true;}catch(err){commits.push('ERR '+err.message);return false;}}};
const floor=c.createFloorUI(api);
ui.reservations.find(x=>x.id==='res-3').name='<img src=x onerror=alert(1)>';
for(const v of ['floor','bookings','editor']){floor.show(v);const t0=performance.now(),html=floor.render(),ms=performance.now()-t0;assert(html.includes('fl-page'),v);assert(!html.includes('<img src=x'),v+' escapes');if(v!=='editor')assert(html.includes('&lt;img'),v+' shows escaped name');assert(ms<400,v+' renders in '+Math.round(ms)+'ms');}
floor.show('floor');let html=floor.render();
assert(html.includes('fl-canvas'));assert((html.match(/class="fl-table /g)||[]).length>=10,'the active room is drawn');assert(html.includes('data-fl-time'));assert(html.includes('Arriving'));assert(html.includes('fl-pace-mini'));
assert(html.includes('data-tone="sage"'),'the seated table is green');assert(html.includes('Edit layout'));assert(!html.includes('Guest directory'),'guest statistics live in Reports');
// Tap-to-assign: start from an unassigned booking, tap two tables to join them, confirm.
ui=B.change(ui,{type:'put',collection:'reservations',item:{id:'walkup',date:ui.date,service:ui.service,name:'Walkup',guests:10,time:'20:30',tables:[],note:'',contact:''}});
floor.handle('pick-start','walkup',{mode:'assign'});html=floor.render();assert(html.includes('fl-pickbar'));assert(html.includes('data-pick='));
const six=ui.floor.tables.find(t=>t.label==='6'),sevenT=ui.floor.tables.find(t=>t.label==='7');
floor.handle('pick-table',six.id,{});floor.handle('pick-table',sevenT.id,{});html=floor.render();assert(html.includes('Tables 6 + 7'));
floor.handle('pick-confirm','walkup',{});assert.equal(commits.at(-1),'floor:assign');same(ui.reservations.find(x=>x.id==='walkup').tables,['6','7']);assert(!floor.render().includes('fl-pickbar'));
floor.handle('pick-start','walkup',{});floor.handle('pick-table',ui.floor.tables.find(t=>t.label==='10').id,{});floor.handle('pick-confirm','walkup',{seat:'true'});assert.equal(commits.at(-1),'floor:seat');assert.equal(ui.reservations.find(x=>x.id==='walkup').status,'Seated');
floor.handle('booking','walkup',{});assert.equal(opened.at(-1)[0],'Walkup');assert(opened.at(-1)[1].includes('Complete visit'));assert(opened.at(-1)[1].includes('Move table'));
floor.show('editor');html=floor.render();assert(html.includes('data-edit="true"'));assert(html.includes('fl-add-table'));assert(html.includes('data-fl-turn'));assert(html.includes('Done'));
floor.handle('select',ui.floor.tables[0].id,{});html=floor.render();assert(html.includes('is-selected'));assert(html.includes('data-fl-prop="label"'));
floor.handle('add-table','booth',{seats:'4',max:'6',w:'3',h:'2'});assert.equal(commits.at(-1),'floor:table');assert.equal(ui.floor.tables.at(-1).shape,'booth');
floor.onChange({dataset:{flProp:'seats',id:ui.floor.tables.at(-1).id},value:'6'});assert.equal(ui.floor.tables.at(-1).seats,6);
floor.handle('duplicate',ui.floor.tables.at(-1).id,{});assert.equal(ui.floor.tables.at(-1).seats,6);assert.notEqual(ui.floor.tables.at(-1).label,ui.floor.tables.at(-2).label);
// Guest statistics render for Reports with a searchable directory and profiles.
const report=floor.guestReport(B.addDays(ui.date,-83),ui.date);assert(report.includes('fl-guest-rows'));assert(report.includes('Guest directory'));assert(report.includes('Visit frequency'));assert(report.includes('Where guests sit'));
const reg2=F.guests(ui,'2000-01-01','2999-12-31').directory.find(g=>g.visits>=4);floor.handle('guest',reg2.key,{});assert.equal(opened.at(-1)[0],reg2.name);assert(opened.at(-1)[1].includes('History'));assert(opened.at(-1)[1].includes('fl-rebook'));
floor.handle('rebook',reg2.key,{});assert.equal(edits,1);const prefilled=floor.form({},null);assert(prefilled.includes('value="'+e(reg2.name)+'"'),'book again prefills the guest');
floor.handle('open','floor',{});assert.equal(went,1,'report links jump back to the floor');
floor.handle('table',ui.floor.tables.find(t=>t.label==='4').id,{});assert(opened.at(-1)[0].startsWith('Table 4'));assert(opened.at(-1)[1].includes('Bennett'));assert(opened.at(-1)[1].includes('Complete visit'));
floor.handle('walkin','',{table:'B1'});assert.equal(forms.at(-1)[0],'Seat a walk-in');assert(forms.at(-1)[1].includes('value="B1" checked'));
const act=floor.submit({name:'',guests:'2',time:'19:05',duration:'90',note:''},{getAll:()=>['B1']});assert.equal(act.type,'floor:walk-in');ui=B.change(ui,act);assert.equal(ui.reservations.at(-1).status,'Seated');
floor.handle('add-room','',{});const roomAct=floor.submit({roomId:'',name:'Mezzanine',cols:'12',rows:'8'},{getAll:()=>[]});assert.equal(roomAct.type,'floor:room');assert(roomAct.id.startsWith('mezzanine-'));
const formHtml=floor.form({id:'res-2',name:'Jordan',guests:2,time:'19:00',tables:['2'],duration:120,source:'Phone',tags:['Window'],date:'2026-10-25',service:'Dinner'},true);
assert(formHtml.includes('data-fl-picker'));assert(formHtml.includes('value="2" checked'));assert(formHtml.includes('name="duration"'));assert(formHtml.includes('name="tags" value="Window" checked'));assert(!formHtml.includes('Booked 19:00'),'a booking never conflicts with itself');
floor.show('bookings');html=floor.render();assert(html.includes('res-card'));assert(html.includes('until '));assert(html.includes('Guest statistics'));
ui.role='crew';ui.crewId='alex';floor.show('floor');html=floor.render();assert(!html.includes('Edit layout'),'crew do not see the editor');floor.show('editor');assert(!floor.render().includes('data-edit="true"'),'crew land on the floor instead of the editor');
console.log('PASS: floor, bookings and editor render fast with escaped content; tap-to-assign, sheets, forms, picker, guest report and crew visibility work.');
