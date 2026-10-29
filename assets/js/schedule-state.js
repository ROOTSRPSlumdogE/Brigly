/* Scheduling domain: requests, attendance, defaults and gross earnings estimates. */
(function () {
  'use strict';
  const B=globalThis.Brigly, original={starter:B.starter,load:B.load,valid:B.validState,change:B.change};
  const clone=x=>globalThis.Brigly.clone(x);
  const round=x=>Math.round((x+Number.EPSILON)*100)/100;
  const minutes=t=>Number(t.slice(0,2))*60+Number(t.slice(3));
  const integer=(x,max=100000)=>Number.isInteger(x)&&x>=0&&x<=max;
  const money=x=>Number.isFinite(x)&&x>=0&&x<=100000&&round(x)===x;
  const note=x=>typeof x==='string'&&x.length<=500;
  const id=x=>typeof x==='string'&&x.length>0&&x.length<100;
  const active=r=>!['Declined','Withdrawn','Obsolete'].includes(r.status);
  const signature=s=>JSON.stringify([s.id,s.person,s.date,s.service,s.start,s.end,s.area,s.breakMinutes,s.payRate]);
  function upgrade(state) {
    const s=clone(state);
    if(!s.scheduling){
      s.crewId='alex';
      s.scheduling={version:1,defaults:Object.fromEntries(B.crew.map((p,i)=>[p.id,{rate:[26,18,17,20,28,21][i],sickPaid:false,timeoffPaid:false}])),requests:[],tips:[]};
      s.shifts.forEach(shift=>{shift.payRate=s.scheduling.defaults[shift.person].rate;shift.breakMinutes=0;});
    }
    return s;
  }
  function valid(s){
    try{
      if(!original.valid(s)||!B.person(s.crewId)||!s.scheduling||s.scheduling.version!==1)return false;
      const {defaults,requests,tips}=s.scheduling;
      if(!defaults||!B.crew.every(p=>defaults[p.id]&&money(defaults[p.id].rate)&&typeof defaults[p.id].sickPaid==='boolean'&&typeof defaults[p.id].timeoffPaid==='boolean'))return false;
      if(!s.shifts.every(x=>money(x.payRate)&&integer(x.breakMinutes,1440)&&x.breakMinutes<B.duration(x)))return false;
      if(!Array.isArray(requests)||!Array.isArray(tips)||requests.length>10000||tips.length>10000)return false;
      if(new Set(requests.map(r=>r.id)).size!==requests.length||new Set(tips.map(t=>`${t.person}|${t.date}`)).size!==tips.length)return false;
      if(!tips.every(t=>id(t.id)&&B.person(t.person)&&B.isDate(t.date)&&money(t.amount)))return false;
      return requests.every(r=>{
        if(!id(r.id)||!B.person(r.person)||!note(r.note)||!note(r.feedback)||!['timeoff','sick','late','swap'].includes(r.kind)||typeof r.created!=='string')return false;
        if(!['Pending','Awaiting teammate','Approved','Declined','Reported','Reviewed','Withdrawn','Obsolete'].includes(r.status))return false;
        const statuses={timeoff:['Pending','Approved','Declined','Withdrawn'],sick:['Reported','Reviewed','Withdrawn'],late:['Reported','Reviewed','Withdrawn'],swap:['Awaiting teammate','Pending','Approved','Declined','Withdrawn','Obsolete']};
        if(!statuses[r.kind].includes(r.status))return false;
        if(r.kind==='timeoff')return B.isDate(r.from)&&B.isDate(r.to)&&r.from<=r.to&&typeof r.paid==='boolean';
        if(!id(r.shiftId)||!B.isDate(r.date))return false;
        if(r.kind!=='swap'&&active(r)&&!s.shifts.some(x=>x.id===r.shiftId))return false;
        if(r.kind==='sick')return typeof r.paid==='boolean';
        if(r.kind==='late')return integer(r.minutes,1440);
        return id(r.targetId)&&B.person(r.targetPerson)&&r.targetPerson!==r.person&&typeof r.sourceSignature==='string'&&typeof r.targetSignature==='string'&&(!['Awaiting teammate','Pending'].includes(r.status)||(s.shifts.some(x=>x.id===r.targetId)&&s.shifts.some(x=>x.id===r.shiftId)));
      });
    }catch{return false;}
  }
  function absence(s,shift){
    return s.scheduling.requests.find(r=>r.person===shift.person&&r.kind==='sick'&&r.shiftId===shift.id&&['Reported','Reviewed'].includes(r.status))||s.scheduling.requests.find(r=>r.person===shift.person&&r.kind==='timeoff'&&r.status==='Approved'&&shift.date>=r.from&&shift.date<=r.to);
  }
  function metrics(s,shift){
    const scheduledMinutes=B.duration(shift)-shift.breakMinutes;
    const out=absence(s,shift);
    const late=s.scheduling.requests.find(r=>r.kind==='late'&&r.shiftId===shift.id&&r.person===shift.person&&['Reported','Reviewed'].includes(r.status));
    const lost=late?Math.min(late.minutes,scheduledMinutes):0;
    const workMinutes=out?0:Math.max(0,scheduledMinutes-lost);
    const paidAbsenceMinutes=out?.paid?scheduledMinutes:0;
    return {scheduledMinutes,workMinutes,paidAbsenceMinutes,wages:round((workMinutes+paidAbsenceMinutes)/60*shift.payRate),absence:out,late:out?null:late};
  }
  function inPeriod(date,anchor,period){
    if(period==='day')return date===anchor;
    if(period==='week')return date>=B.monday(anchor)&&date<=B.addDays(B.monday(anchor),6);
    if(period==='month')return date.slice(0,7)===anchor.slice(0,7);
    return true;
  }
  function totals(s,person,anchor,period){
    const shifts=s.shifts.filter(x=>(!person||x.person===person)&&inPeriod(x.date,anchor,period));
    const result={scheduledMinutes:0,workMinutes:0,paidAbsenceMinutes:0,wages:0,tips:0,count:shifts.length};
    for(const shift of shifts){const m=metrics(s,shift);for(const key of ['scheduledMinutes','workMinutes','paidAbsenceMinutes','wages'])result[key]+=m[key];}
    result.tips=round(s.scheduling.tips.filter(t=>(!person||t.person===person)&&inPeriod(t.date,anchor,period)).reduce((n,t)=>n+t.amount,0));
    result.wages=round(result.wages);result.total=round(result.wages+result.tips);return result;
  }
  function assertAvailable(s,shift,ignore=[]){
    if(s.scheduling.requests.some(r=>r.kind==='timeoff'&&r.status==='Approved'&&r.person===shift.person&&shift.date>=r.from&&shift.date<=r.to))throw Error('This teammate has approved time off on that date.');
    if(s.shifts.some(x=>x.id!==shift.id&&!ignore.includes(x.id)&&x.person===shift.person&&B.overlaps(x,shift)&&!absence(s,x)))throw Error('This teammate already has an overlapping shift.');
  }
  function requestSummary(r){return r.kind==='timeoff'?`${r.from} – ${r.to}`:r.date;}
  function change(state,action,role=state.role){
    let s=upgrade(state),me=B.actor(role,s.crewId,s.managerId);
    const manager=role==='manager';
    const needManager=()=>{if(!manager)throw Error('Only managers can review requests and change pay settings.');};
    const shiftBy=id=>{const shift=s.shifts.find(x=>x.id===id);if(!shift)throw Error('This shift is no longer available.');return shift;};
    const requestBy=id=>{const r=s.scheduling.requests.find(x=>x.id===id);if(!r)throw Error('This request is no longer available.');return r;};
    const ownShift=id=>{const x=shiftBy(id);if(x.person!==me)throw Error('You can only report or request changes to your own shift.');return x;};
    const makeRequest=fields=>{
      if(!id(action.id)||s.scheduling.requests.some(r=>r.id===action.id)||!note(action.note||''))throw Error('Check the request details.');
      const r={id:action.id,person:me,note:action.note||'',feedback:'',created:new Date().toISOString(),...fields};s.scheduling.requests.push(r);return r;
    };
    if(!action.type.startsWith('schedule:')){
      if(action.type==='put'&&action.collection==='shifts'){
        action=clone(action);const old=s.shifts.find(x=>x.id===action.item.id);
        action.item.payRate=action.item.payRate??s.scheduling.defaults[action.item.person]?.rate;
        action.item.breakMinutes=action.item.breakMinutes??old?.breakMinutes??0;
        if(old&&old.person!==action.item.person&&s.scheduling.requests.some(r=>r.shiftId===old.id&&['sick','late'].includes(r.kind)&&active(r)))throw Error('Resolve attendance reports before reassigning this shift.');
        assertAvailable(s,action.item);
      }
      if(action.type==='remove'&&action.collection==='shifts'&&s.scheduling.requests.some(r=>r.shiftId===action.id&&['sick','late'].includes(r.kind)&&active(r)))throw Error('Withdraw the attendance report before removing this shift.');
      s=original.change(s,action,role);
      for(const r of s.scheduling.requests.filter(r=>r.kind==='swap'&&['Awaiting teammate','Pending'].includes(r.status))){
        const a=s.shifts.find(x=>x.id===r.shiftId),b=s.shifts.find(x=>x.id===r.targetId);
        if(!a||!b||signature(a)!==r.sourceSignature||signature(b)!==r.targetSignature){r.status='Obsolete';r.feedback='A shift changed. Submit a new swap request.';}
      }
    }else if(action.type==='schedule:timeoff'){
      if(!B.isDate(action.from)||!B.isDate(action.to)||action.from>action.to)throw Error('Choose a valid date range.');
      if(s.scheduling.requests.some(r=>r.kind==='timeoff'&&r.person===me&&['Pending','Approved'].includes(r.status)&&r.from<=action.to&&r.to>=action.from))throw Error('You already have a time-off request covering these dates.');
      makeRequest({kind:'timeoff',from:action.from,to:action.to,status:'Pending',paid:s.scheduling.defaults[me].timeoffPaid});
    }else if(action.type==='schedule:report'){
      const shift=ownShift(action.shiftId);
      if(!['sick','late'].includes(action.kind))throw Error('Choose a valid attendance report.');
      if(absence(s,shift))throw Error('This shift already has an absence. Withdraw that report before changing it.');
      if(s.scheduling.requests.some(r=>r.shiftId===shift.id&&r.kind===action.kind&&active(r)))throw Error('This shift already has that report.');
      if(action.kind==='late'&&(!integer(action.minutes,1440)||action.minutes<1||action.minutes>B.duration(shift)))throw Error('Enter minutes late between 1 and the shift length.');
      makeRequest({kind:action.kind,shiftId:shift.id,date:shift.date,status:'Reported',...(action.kind==='sick'?{paid:s.scheduling.defaults[me].sickPaid}:{minutes:action.minutes})});
    }else if(action.type==='schedule:swap'){
      const a=ownShift(action.shiftId),b=shiftBy(action.targetId);
      if(a.person===b.person||a.area!==b.area)throw Error('Choose another teammate’s shift in the same station.');
      if([a,b].some(x=>absence(s,x)||s.scheduling.requests.some(r=>r.shiftId===x.id&&r.kind==='late'&&active(r))))throw Error('Resolve attendance or absence reports before swapping these shifts.');
      if(s.scheduling.requests.some(r=>r.kind==='swap'&&['Pending','Awaiting teammate'].includes(r.status)&&[r.shiftId,r.targetId].some(id=>[a.id,b.id].includes(id))))throw Error('One of these shifts already has a pending swap.');
      assertAvailable(s,{...a,person:b.person},[b.id]);assertAvailable(s,{...b,person:a.person},[a.id]);
      makeRequest({kind:'swap',shiftId:a.id,date:a.date,targetId:b.id,targetPerson:b.person,sourceSignature:signature(a),targetSignature:signature(b),status:'Awaiting teammate'});
    }else if(action.type==='schedule:respond'){
      const r=requestBy(action.id);
      if(r.kind!=='swap'||r.targetPerson!==me||r.status!=='Awaiting teammate')throw Error('Only the invited teammate can respond to this swap.');
      if(!['accept','decline'].includes(action.decision))throw Error('Choose accept or decline.');
      r.status=action.decision==='accept'?'Pending':'Declined';r.feedback=action.decision==='accept'?'Teammate accepted. Awaiting manager review.':'Teammate declined the swap.';
    }else if(action.type==='schedule:review'){
      needManager();const r=requestBy(action.id);
      if(!['Pending','Reported','Reviewed'].includes(r.status)&&!(r.kind==='timeoff'&&r.status==='Approved'))throw Error('This request is not ready for manager review.');
      if(!note(action.feedback||''))throw Error('Keep the response under 500 characters.');
      if(action.decision==='decline'){
        if(!['timeoff','swap'].includes(r.kind)||!action.feedback?.trim())throw Error('Add a reason for declining this request.');
        r.status='Declined';r.feedback=action.feedback;
      }else{
        if(action.decision!=='approve')throw Error('Choose a valid review action.');
        if(r.kind==='timeoff'&&s.scheduling.requests.some(q=>q.kind==='sick'&&q.person===r.person&&active(q)&&q.date>=r.from&&q.date<=r.to))throw Error('A sickness report covers these dates. Resolve that report before approving time off.');
        if(['sick','timeoff'].includes(r.kind)){
          if(typeof action.paid!=='boolean')throw Error('Choose paid or unpaid.');
          r.paid=action.paid;
        }
        if(r.kind==='late'){
          const shift=shiftBy(r.shiftId);
          if(!integer(action.minutes,B.duration(shift)))throw Error('Check the confirmed minutes late.');
          r.minutes=action.minutes;
        }
        if(r.kind==='swap'){
          const a=shiftBy(r.shiftId),b=shiftBy(r.targetId);
          if(signature(a)!==r.sourceSignature||signature(b)!==r.targetSignature)throw Error('The shifts changed. Please submit a new swap request.');
          if([a,b].some(x=>absence(s,x)||s.scheduling.requests.some(q=>q.shiftId===x.id&&q.kind==='late'&&active(q))))throw Error('An attendance or absence report now affects this swap. Decline it and arrange coverage.');
          assertAvailable(s,{...a,person:b.person},[b.id]);assertAvailable(s,{...b,person:a.person},[a.id]);
          // Rates stay with each person for this exchange, not the station being covered.
          [a.person,b.person]=[b.person,a.person];[a.payRate,b.payRate]=[b.payRate,a.payRate];
        }
        r.status=['sick','late'].includes(r.kind)?'Reviewed':'Approved';r.feedback=action.feedback||'';
      }
    }else if(action.type==='schedule:withdraw'){
      const r=requestBy(action.id);
      if(r.person!==me&&!manager)throw Error('You can only withdraw your own requests.');
      if(!['Pending','Awaiting teammate','Reported'].includes(r.status)&&!(manager&&['Approved','Reviewed'].includes(r.status)&&r.kind!=='swap'))throw Error('Ask your manager to correct this reviewed request.');
      r.status='Withdrawn';r.feedback=manager?'Withdrawn by manager.':'Withdrawn by requester.';
    }else if(action.type==='schedule:tips'){
      const person=manager?(action.person||me):me;
      if(!B.person(person)||!B.isDate(action.date)||!money(action.amount))throw Error('Enter a valid date and tip amount.');
      const tip=s.scheduling.tips.find(t=>t.person===person&&t.date===action.date);
      if(tip)tip.amount=action.amount;
      else s.scheduling.tips.push({id:action.id,person,date:action.date,amount:action.amount});
    }else if(action.type==='schedule:defaults'){
      needManager();if(!B.person(action.person)||!money(action.rate)||typeof action.sickPaid!=='boolean'||typeof action.timeoffPaid!=='boolean')throw Error('Check the hourly rate and absence defaults.');
      s.scheduling.defaults[action.person]={rate:action.rate,sickPaid:action.sickPaid,timeoffPaid:action.timeoffPaid};
    }else throw Error('Unknown scheduling action.');
    if(!valid(s))throw Error('Check the scheduling details. This change could not be saved.');
    return s;
  }
  B.starter=(date)=>upgrade(original.starter(date));
  B.validState=valid;
  B.load=storage=>{try{const raw=JSON.parse(storage.getItem(B.KEY));if(original.valid(raw)){const s=upgrade(raw);if(valid(s))return s;}}catch{}return B.starter();};
  B.change=change;
  B.schedule={metrics,totals,inPeriod,absence,active,signature,requestSummary,round};
})();
