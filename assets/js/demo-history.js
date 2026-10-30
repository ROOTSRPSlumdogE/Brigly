/* Deterministic, fictional restaurant history. Appended once; existing records stay intact. */
(function(){
  'use strict';
  const B=globalThis.Brigly,previous={starter:B.starter,load:B.load};
  const hash=text=>{let n=2166136261;for(const c of text){n^=c.charCodeAt(0);n=Math.imul(n,16777619);}return n>>>0;};
  const pick=(items,key)=>items[hash(key)%items.length];
  const minutes=t=>Number(t.slice(0,2))*60+Number(t.slice(3));
  const clock=n=>`${String(Math.floor(n/60)%24).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`;
  function enrich(input,anchor=B.dateString(new Date())){
    if(input.demoHistory?.version===1)return input;
    const s=globalThis.Brigly.clone(input);B.configure(s);
    const start=new Date(anchor+'T12:00:00');start.setDate(1);start.setMonth(start.getMonth()-5);
    const from=B.dateString(start),to=anchor,planningTo=B.addDays(anchor,7);
    const hired=new Date(start);hired.setMonth(hired.getMonth()+2);const hireDate=B.dateString(hired);
    const service=(id,name,start,end,breakMinutes)=>{
      let found=s.setup.services.find(x=>x.id===id)||s.setup.services.find(x=>x.name===name);
      if(!found){found={id,name,start,end,breakMinutes,active:true};s.setup.services.push(found);}return found.name;
    };
    const lunch=service('lunch','Lunch','10:30','16:30',30),dinner=service('dinner','Dinner','16:00','23:00',30);
    const brunch=service('demo-brunch','Weekend brunch','09:00','15:00',30),event=service('demo-events','Private events','17:00','23:30',30),late=service('demo-late','Late service','20:00','02:00',30);
    const newPeople=[['demo-nina','Nina Brooks','Server','Floor',18],['demo-owen','Owen Ellis','Bartender','Bar',20],['demo-isla','Isla Reed','Line cook','Kitchen',21],['demo-eli','Eli Foster','Host','Floor',17]];
    for(const [id,name,role,station,rate] of newPeople){
      if(s.team.some(p=>p.id===id))continue;
      const area=s.setup.areas.includes(station)?station:s.setup.areas[0];
      if(!s.setup.roles.includes(role))s.setup.roles.push(role);
      s.team.push({id,name,role,area,initials:name.split(' ').map(x=>x[0]).join(''),active:true,access:'crew',demo:true});
      s.scheduling.defaults[id]={rate,sickPaid:false,timeoffPaid:false};
    }
    const ids=['jamie','alex','mia','noah','sam','leo',...newPeople.map(p=>p[0])];
    const team=s.team.filter(p=>ids.includes(p.id)&&p.active);
    const occupied=new Set(s.shifts.map(x=>x.date));
    const allIds=new Set(s.shifts.map(x=>x.id));
    const generated=[];
    for(let date=from;date<=planningTo;date=B.addDays(date,1)){

      const weekday=new Date(date+'T12:00:00').getDay(),weekend=[5,6].includes(weekday),season=new Date(date+'T12:00:00').getMonth();
      for(let i=0;i<team.length;i++){
        const p=team[i];
        if(occupied.has(date)&&!newPeople.some(x=>x[0]===p.id))continue;
        const n=hash(`${date}|${p.id}`),weekIndex=Math.floor((new Date(date+'T12:00:00')-start)/604800000);
        // Staggered days off, part-time colleagues, and more coverage on busy weekends.
        if((weekday+i)%7<2&&!weekend)continue;
        if(p.id==='demo-eli'&&![0,5,6].includes(weekday))continue;
        if(p.id==='demo-isla'&&date<hireDate)continue;
        let which=n%3===0?lunch:dinner;
        if([0,6].includes(weekday)&&i%2===0)which=brunch;
        if(weekday===5&&weekIndex%3===1&&i%3===0)which=event;
        if(weekday===6&&i===3&&weekIndex%2===0)which=late;
        const template=s.setup.services.find(x=>x.name===which);
        let begin=minutes(template.start),duration=B.duration(template);
        if(p.area===s.team.find(x=>x.id==='sam')?.area&&['sam','leo','demo-isla'].includes(p.id)){begin-=60;duration+=30;}
        else if(n%4===0){begin+=30;duration-=30;}
        duration=Math.max(240,Math.min(duration,600));begin=(begin+1440)%1440;
        const base=s.scheduling.defaults[p.id].rate,rate=Math.max(0,base-(date.slice(0,7)<anchor.slice(0,7)&&season<8?1:0));
        const x={id:`history-${date}-${p.id}`,date,service:which,person:p.id,start:clock(begin),end:clock(begin+duration),area:p.area,payRate:rate,breakMinutes:duration>=360?30:0,demo:true};
        if(allIds.has(x.id)||s.shifts.some(y=>y.person===x.person&&B.overlaps(x,y)))continue;
        // Respect time-off ranges already entered by the user.
        if(s.scheduling.requests.some(r=>r.kind==='timeoff'&&r.person===p.id&&r.status==='Approved'&&date>=r.from&&date<=r.to))continue;
        s.shifts.push(x);generated.push(x);allIds.add(x.id);
      }
    }
    B.configure(s);
    const noteBodies=['Restock the service station before the first seating.','Patio tables are open if the weather holds. Check with the host before seating.','The private group arrives together. Keep the welcome area clear.','Leave the handover tray beside the bar and label any open stock.','We have a new seasonal special. Review the ingredients with the kitchen.','The early seating is busy. Coordinate table resets with the host.'];
    const manager=s.team.find(p=>p.active&&p.access==='manager')?.id||s.managerId;
    const guests=['Bennett','Jordan','Martinez','Patel','Wilson','Taylor','Reed','Kim','Thompson','Garcia','Parker','Nguyen','Clarke','Morgan','Brooks','Chen'];
    const scopedKeys=[...new Set(generated.map(x=>x.date+'|'+x.service))];
    for(const key of scopedKeys){
      const date=key.slice(0,10),service=key.slice(11),members=generated.filter(x=>x.date===date&&x.service===service),past=date<anchor,n=hash(key);
      if(!s.shiftNotes.some(x=>x.date===date&&x.service===service)){
        s.shiftNotes.push({id:`history-note-${n}`,date,service,author:manager,priority:'manager',body:pick(noteBodies,key),updated:date+'T13:00:00.000Z',archived:false,demo:true});
        if(n%3===0&&members.length)s.shiftNotes.push({id:`history-crew-note-${n}`,date,service,author:members[0].person,priority:'crew',body:'Station checked and restocked. Spare glassware is ready for the next seating.',updated:date+'T14:00:00.000Z',archived:false,demo:true});
      }
      if(!s.briefings.some(x=>x.date===date&&x.service===service))s.briefings.push({id:`history-brief-${n}`,date,service,title:pick(['A steady start to service','The weekend, together','Ready for the first guests','Today’s service plan'],key),body:pick(noteBodies,key+'brief')+'\n\nCheck the shift notes, reservations and approved 86 items before service.',author:manager,approved:true,revision:1,acks:past?[...new Set(members.map(x=>x.person))]:[],demo:true});
      if(past&&!s.checks[key])s.checks[key]=Object.fromEntries(s.tasks.slice(0,8).filter((t,i)=>hash(key+t.id)%25!==0).map(t=>[t.id,{by:members.find(x=>x.area===t.area)?.person||manager,at:date+'T22:30:00.000Z'}]));
      if(!s.reservations.some(x=>x.date===date&&x.service===service)){
        const count=service===event?2:service===late?3:4+n%5;
        const first=service===brunch?10*60:service===lunch?12*60:service===late?21*60:18*60;
        for(let k=0;k<count;k++){
          const time=clock(first+k*15);let table=1;
          while(s.reservations.some(r=>r.date===date&&r.table===String(table)&&Math.abs(minutes(r.time)-minutes(time))<120))table++;
          s.reservations.push({id:`history-res-${n}-${k}`,date,service,name:pick(guests,key+k),guests:service===event?8+k*4:2+hash(key+'party'+k)%5,time,table:String(table),note:pick(['','Window table preferred.','Birthday dinner.','Please confirm dietary needs on arrival.','Early seating requested.'],key+'note'+k),contact:'',status:past?(hash(key+'status'+k)%19===0?'Cancelled':hash(key+'status'+k)%31===0?'No-show':'Completed'):'Confirmed',demo:true});
        }
      }
      if(n%7===0&&!s.unavailable.some(x=>x.date===date&&x.service===service))s.unavailable.push({id:`history-86-${n}`,date,service,name:pick(['Burrata','Draught pale ale','Fresh oysters','Roasted squash','House sourdough'],key),reason:'Limited stock for this service. Confirm alternatives with the kitchen.',area:members[0]?.area||s.setup.areas[0],author:members[0]?.person||manager,reviewer:manager,status:past?'Restored':'Approved',active:!past,feedback:past?'Restocked after service.':'',demo:true});
      if(n%4===0&&!s.specials.some(x=>x.date===date&&x.service===service))s.specials.push({id:`history-special-${n}`,date,service,name:pick(['Market vegetable plate','Seasonal risotto','Grilled catch of the day','Orchard spritz'],key),description:'A seasonal addition to the menu. Ask the kitchen for today’s preparation.',price:18+n%14,allergens:'Verify ingredients and cross-contact with the kitchen before advising a guest.',active:true,demo:true});
    }
    for(const x of generated){
      if(x.date>anchor)continue;
      const n=hash(x.id),weekday=new Date(x.date+'T12:00:00').getDay();
      let out=false;
      if(x.date<anchor&&n%67===0){
        s.scheduling.requests.push({id:x.id+'-leave',person:x.person,kind:'timeoff',from:x.date,to:x.date,status:'Approved',paid:n%2===0,note:'Planned personal time off.',feedback:'Coverage arranged.',created:B.addDays(x.date,-12)+'T12:00:00.000Z',demo:true});out=true;
      }else if(x.date<anchor&&n%61===0){
        s.scheduling.requests.push({id:x.id+'-sick',person:x.person,kind:'sick',shiftId:x.id,date:x.date,status:'Reviewed',paid:n%3===0,note:'Unable to attend this shift.',feedback:'Absence recorded; coverage arranged.',created:x.date+'T08:00:00.000Z',demo:true});out=true;
      }else if(x.date<anchor&&n%19===0){
        s.scheduling.requests.push({id:x.id+'-late',person:x.person,kind:'late',shiftId:x.id,date:x.date,status:'Reviewed',minutes:[5,10,15,20,30][n%5],note:'Arrival update shared with manager.',feedback:'Arrival time confirmed.',created:x.date+'T12:00:00.000Z',demo:true});
      }
      const p=s.team.find(p=>p.id===x.person),isKitchen=['sam','leo','demo-isla'].includes(x.person);
      if(!out&&!isKitchen&&!s.scheduling.tips.some(t=>t.person===x.person&&t.date===x.date)){
        const base=['noah','demo-owen'].includes(x.person)?65:['mia','demo-eli','jamie'].includes(x.person)?12:35;
        const amount=B.schedule.round((base+n%64)*([5,6].includes(weekday)?1.35:1)*(1+(Number(x.date.slice(5,7))-5)*0.025));
        s.scheduling.tips.push({id:x.id+'-tips',person:p.id,date:x.date,amount,demo:true});
      }
    }
    // A handful of completed same-station exchanges, without creating overlapping work.
    let exchanges=0;
    for(const a of generated){
      if(exchanges>=9||a.date>=anchor||hash(a.id)%41!==0||B.schedule.absence(s,a))continue;
      const b=generated.find(x=>x.date===a.date&&x.person!==a.person&&x.area===a.area&&!B.schedule.absence(s,x)&&!s.scheduling.requests.some(r=>r.shiftId===x.id||r.targetId===x.id));
      if(!b||s.scheduling.requests.some(r=>r.shiftId===a.id||r.targetId===a.id))continue;
      if(s.shifts.some(x=>![a.id,b.id].includes(x.id)&&((x.person===a.person&&B.overlaps(x,b))||(x.person===b.person&&B.overlaps(x,a)))))continue;
      const request={id:a.id+'-swap',person:a.person,kind:'swap',shiftId:a.id,date:a.date,targetId:b.id,targetPerson:b.person,sourceSignature:B.schedule.signature(a),targetSignature:B.schedule.signature(b),status:'Approved',note:'Teammates agreed to exchange service assignments.',feedback:'Swap approved after checking coverage.',created:B.addDays(a.date,-3)+'T12:00:00.000Z',demo:true};
      [a.person,b.person]=[b.person,a.person];[a.payRate,b.payRate]=[b.payRate,a.payRate];s.scheduling.requests.push(request);exchanges++;
    }
    s.demoHistory={version:1,from,to,planningTo,fictional:true};
    B.configure(s);
    if(!B.validState(s))throw Error('The sample history failed validation.');
    return s;
  }
  B.demo={enrich};
  B.starter=date=>enrich(previous.starter(date),date||B.dateString(new Date()));
  B.load=storage=>enrich(previous.load(storage));
})();
