/* Manage: role-based permissions with per-person overrides, and each person's HR file, enforced on every change. */
(function(){
 'use strict';
 const B=Brigly,prev={change:B.change,starter:B.starter};
 const copy=x=>JSON.parse(JSON.stringify(x));
 // Everyday actions start on for every role; lead permissions start off and hand one part of the back office to a role or person.
 const list=[
  ['report86','Report 86 items','Flag dishes and stock that ran out. A manager or stock lead approves each report.','everyday'],
  ['stockRequests','Request stock','Ask for supplies from the stock list.','everyday'],
  ['notes','Post shift notes','Leave notes on the shifts they work.','everyday'],
  ['briefings','Post shift briefings','Write the pre-shift briefing for shifts they work.','everyday'],
  ['reservations','Handle reservations','Add, seat and update guest bookings.','everyday'],
  ['swaps','Request shift swaps','Offer one of their shifts to a teammate.','everyday'],
  ['timeoff','Request time off','Ask for days off.','everyday'],
  ['stock','Run stock & 86s','Approve 86 reports, review stock requests, place and receive orders and count any team.','lead'],
  ['checklists','Edit checklists','Build shift lists and templates and check off tasks for any station.','lead'],
  ['happenings','Run happenings','Add, edit and pause specials, happy hours and events.','lead'],
  ['training','Run training','Create and assign courses, and sign off any practical.','lead']
 ];
 const keys=list.map(x=>x[0]),title=key=>list.find(x=>x[0]===key)?.[1]||key,base=key=>list.find(x=>x[0]===key)?.[3]==='everyday';
 const roleDefault=(s,role,key)=>{const v=s.setup?.rolePerms?.[role]?.[key];return typeof v==='boolean'?v:base(key);};
 function can(s,key,person=B.actor(s.role,s.crewId,s.managerId)){
  const p=s.team.find(x=>x.id===person);if(!p?.active)return false;if(p.access==='manager')return true;
  const own=p.perms?.[key];return typeof own==='boolean'?own:roleDefault(s,p.role,key);
 }
 // Keys where this person differs from their role.
 const custom=(s,p)=>keys.filter(k=>typeof p.perms?.[k]==='boolean'&&p.perms[k]!==roleDefault(s,p.role,k));

 // The HR file. Only the last four digits of tax and bank numbers are kept.
 const options={
  employmentType:['Full-time','Part-time','Seasonal','Contractor'],overtime:['Non-exempt · hourly with overtime','Exempt · salaried'],
  payFrequency:['Weekly','Every two weeks','Twice a month','Monthly'],payMethod:['Direct deposit','Paper check','Pay card'],accountType:['Checking','Savings'],
  filingStatus:['Single or married filing separately','Married filing jointly','Head of household'],yesNo:['No','Yes']
 };
 const hr=[
  ['legalName','Legal name','text','Personal',120],['preferredName','Preferred name','text','Personal',80],['pronouns','Pronouns','text','Personal',40],
  ['birthDate','Date of birth','date','Personal'],['address','Home address','textarea','Contact',240],
  ['employeeId','Employee ID','text','Employment',40],['employmentType','Employment type','select','Employment',options.employmentType],
  ['overtime','Overtime status','select','Employment',options.overtime],['reportsTo','Reports to','person','Employment'],['probationEnds','Probation ends','date','Employment'],
  ['payFrequency','Pay frequency','select','Pay & banking',options.payFrequency],['payMethod','Payment method','select','Pay & banking',options.payMethod],
  ['bankName','Bank','text','Pay & banking',80],['accountType','Account type','select','Pay & banking',options.accountType],['accountLast4','Account number · last 4','last4','Pay & banking'],
  ['taxIdLast4','SSN / ITIN · last 4','last4','Tax'],['filingStatus','Filing status (W-4 step 1c)','select','Tax',options.filingStatus],
  ['multipleJobs','Multiple jobs or spouse works (step 2)','select','Tax',options.yesNo],['dependents','Dependents amount (step 3)','money','Tax'],
  ['otherIncome','Other income (step 4a)','money','Tax'],['deductions','Deductions (step 4b)','money','Tax'],['extraWithholding','Extra withholding per pay (step 4c)','money','Tax'],
  ['taxExempt','Claims exemption from withholding','select','Tax',options.yesNo],['workState','Work state','state','Tax'],['stateAllowances','State allowances','int','Tax'],
  ['w4Date','W-4 on file since','date','Documents'],['i9Date','I-9 verified on','date','Documents'],['workAuthExpires','Work authorization expires','date','Documents'],
  ['handbookDate','Handbook acknowledged','date','Documents'],['foodHandlerExpires','Food handler card expires','date','Certifications'],
  ['alcoholCertExpires','Alcohol server certification expires','date','Certifications'],['servsafeExpires','ServSafe Manager expires','date','Certifications']
 ];
 function hrValue(s,[key,label,type,,extra],raw){
  const v=typeof raw==='string'?raw.trim():raw;if(v===''||v===null||v===undefined)return undefined;
  const bad=()=>{throw Error(`Check “${label}”.`);};
  if(['text','textarea'].includes(type))return typeof v==='string'&&v.length<=extra?v:bad();
  if(type==='date')return B.isDate(v)?v:bad();
  if(type==='select')return extra.includes(v)?v:bad();
  if(type==='last4')return /^\d{4}$/.test(v)?v:bad();
  if(type==='state')return /^[A-Za-z]{2}$/.test(v)?v.toUpperCase():bad();
  if(type==='person')return s.team.some(p=>p.id===v)?v:bad();
  const n=Number(v);
  if(type==='int')return Number.isInteger(n)&&n>=0&&n<=99?n:bad();
  return Number.isFinite(n)&&n>=0&&n<=1000000?Math.round(n*100)/100:bad();
 }
 const details={phone:80,email:120,emergency:160,notes:1000};

 // Which everyday permission a crew action needs, if any.
 function needs(a){
  if(['ops:alert','stock:alert'].includes(a.type))return 'report86';
  if(a.type==='checklist:note'&&String(a.stockItem||'').trim())return 'report86';
  if(a.type==='stock:request')return 'stockRequests';
  if(a.type==='ops:note')return 'notes';
  if(a.type==='put'&&a.collection==='briefings')return 'briefings';
  if((a.type==='put'&&a.collection==='reservations')||a.type==='reservation-status')return 'reservations';
  if(a.type==='schedule:swap')return 'swaps';
  if(a.type==='schedule:timeoff')return 'timeoff';
  return '';
 }
 // Which lead permission lets a crew member make this change with manager rights.
 function lead(a){
  if(a.type.startsWith('stock:')||['ops:alert','ops:review-alert','order-status'].includes(a.type))return 'stock';
  if(a.type.startsWith('checklist:')||(['put','remove'].includes(a.type)&&a.collection==='tasks'))return 'checklists';
  if(['put','toggle'].includes(a.type)&&a.collection==='specials')return 'happenings';
  return '';
 }
 // Runs one change as a manager while keeping who made it, then puts the person's access back.
 function elevate(state,a,me){
  const s=copy(state),managerId=s.managerId;s.team.find(p=>p.id===me).access='manager';s.managerId=me;s.role='manager';B.configure(s);
  const out=prev.change(s,a,'manager'),p=out.team.find(x=>x.id===me);if(p)p.access='crew';
  out.managerId=managerId;out.role=state.role;B.configure(out);return out;
 }
 function change(state,a,role=state.role){
  const me=B.actor(role,state.crewId,state.managerId),manager=role==='manager';
  if(!manager){const key=needs(a);if(key&&!can(state,key,me))throw Error(`Your manager has turned off “${title(key)}” for your profile.`);}
  const needManager=what=>{if(!manager)throw Error(`Only managers can ${what}.`);};
  if(a.type==='manage:role-permissions'){
   needManager('change permissions');
   const s=copy(state);if(!s.setup.roles.includes(a.role))throw Error('Choose a role.');
   if(!Object.keys(a.perms||{}).length||!Object.entries(a.perms).every(([k,v])=>keys.includes(k)&&typeof v==='boolean'))throw Error('Choose a permission to change.');
   const set={...s.setup.rolePerms?.[a.role]};
   for(const [k,v] of Object.entries(a.perms)){if(v===base(k))delete set[k];else set[k]=v;}
   s.setup.rolePerms={...s.setup.rolePerms,[a.role]:set};if(!Object.keys(set).length)delete s.setup.rolePerms[a.role];
   // A person's override that now matches their role is no longer an exception.
   for(const p of s.team.filter(p=>p.role===a.role&&p.perms)){for(const k of Object.keys(p.perms))if(p.perms[k]===roleDefault(s,p.role,k))delete p.perms[k];if(!Object.keys(p.perms).length)delete p.perms;}
   B.configure(s);return s;
  }
  if(a.type==='manage:permissions'){
   needManager('change permissions');
   const s=copy(state),people=[].concat(a.person);
   if(!people.length||!Object.entries(a.perms||{}).every(([k,v])=>keys.includes(k)&&(typeof v==='boolean'||v===null)))throw Error('Choose a permission to change.');
   for(const id of people){
    const p=s.team.find(x=>x.id===id);if(!p)throw Error('This team member no longer exists.');
    if(p.access==='manager')continue;
    const own={...p.perms};
    for(const [k,v] of Object.entries(a.perms)){if(v===null||v===roleDefault(s,p.role,k))delete own[k];else own[k]=v;}
    for(const k of Object.keys(own))if(!keys.includes(k))delete own[k];
    if(Object.keys(own).length)p.perms=own;else delete p.perms;
   }
   B.configure(s);return s;
  }
  if(a.type==='manage:hr'){
   needManager('edit HR files');
   const s=copy(state),p=s.team.find(x=>x.id===a.person);if(!p)throw Error('This team member no longer exists.');
   for(const k of Object.keys(details).filter(k=>k!=='notes'&&a.hr&&k in a.hr)){
    const v=String(a.hr[k]??'').trim();if(v.length>details[k])throw Error('Keep contact details shorter.');
    if(k==='email'&&v&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v))throw Error('Enter a valid email address or leave it empty.');
    if(v)p[k]=v;else delete p[k];
   }
   const file={...p.hr};
   for(const [k,raw] of Object.entries(a.hr||{})){const field=hr.find(f=>f[0]===k);if(!field)continue;const v=hrValue(s,field,raw);if(v===undefined)delete file[k];else file[k]=v;}
   if(file.reportsTo===p.id)throw Error('Someone cannot report to themselves.');
   if(Object.keys(file).length)p.hr=file;else delete p.hr;
   B.configure(s);return s;
  }
  if(a.type==='ops:member'){
   for(const [k,max] of Object.entries(details))if(a[k]!==undefined&&(typeof a[k]!=='string'||a[k].length>max))throw Error('Keep contact details and notes shorter.');
   if(a.email?.trim()&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(a.email.trim()))throw Error('Enter a valid email address or leave it empty.');
   const old=state.team.find(x=>x.id===a.id),s=prev.change(state,a,role),p=s.team.find(x=>x.id===a.id);
   for(const k of Object.keys(details)){const v=(a[k]??old?.[k]??'').trim();if(v)p[k]=v;else delete p[k];}
   return s;
  }
  if(['ops:catalog','ops:remove-catalog'].includes(a.type)&&a.catalog==='roles'){
   const s=prev.change(state,a,role),perms=s.setup.rolePerms;
   if(perms&&a.type==='ops:catalog'&&a.oldName&&perms[a.oldName]){perms[a.name]=perms[a.oldName];delete perms[a.oldName];}
   if(perms&&a.type==='ops:remove-catalog')delete perms[a.name];
   return s;
  }
  const key=!manager&&lead(a);
  if(key&&can(state,key,me))return elevate(state,a,me);
  return prev.change(state,a,role);
 }

 // A new demo workspace starts with a believable HR picture, with a few gaps and renewals for the HR overview to flag.
 const contacts=['Jordan · partner','Priya · sister','Marcus · father','Elena · mother','Chris · roommate','Dana · partner','Luis · brother'];
 const banks=['Chase','Bank of America','Wells Fargo','Fifth Third'];
 function seed(s){
  const today=s.date||B.dateString(new Date()),pad=(n,len=4)=>String(n).padStart(len,'0').slice(-len);
  s.setup.rolePerms||={'Head chef':{stock:true,checklists:true},Host:{stockRequests:false}};
  s.team.filter(p=>p.active).forEach((p,i)=>{
   if(p.hr)return;
   const gap=i%4===3,since=p.joinedOn||B.addDays(today,-300),bar=p.area==='Bar'||/server|bartender/i.test(p.role),lead=p.access==='manager'||/chef/i.test(p.role);
   if(!p.phone&&!gap){
    p.phone=`(312) 555-01${pad(10+i*7,2)}`;p.email=p.name.toLowerCase().replace(/[^a-z]+/g,'.')+'@copperroom.example';
    if(i%3!==2)p.emergency=contacts[i%contacts.length].replace(' ·',` ${p.name.split(' ').pop()} ·`)+` · (312) 555-02${pad(20+i*3,2)}`;
   }
   const born=B.addDays(today,i===1?3:-(8000+i*631));
   p.hr={legalName:p.name,birthDate:i===1?(Number(today.slice(0,4))-27)+born.slice(4):born,employeeId:'CR-'+(1001+i),employmentType:i%3===2?'Part-time':'Full-time',overtime:p.access==='manager'?options.overtime[1]:options.overtime[0],payFrequency:'Every two weeks',payMethod:gap?'Paper check':'Direct deposit',workState:'IL',filingStatus:options.filingStatus[i%3],multipleJobs:i%3===2?'Yes':'No',taxExempt:'No',stateAllowances:i%3,taxIdLast4:pad(2741+i*1373),handbookDate:since,foodHandlerExpires:B.addDays(today,i%5===2?12:i%5===4?-6:220+i*40)};
   if(!gap)Object.assign(p.hr,{bankName:banks[i%banks.length],accountType:'Checking',accountLast4:pad(4410+i*919),w4Date:since,i9Date:since});
   if(i%4===1)p.hr.dependents=2000;
   if(bar)p.hr.alcoholCertExpires=B.addDays(today,i%3===0?21:300+i*20);
   if(lead)p.hr.servsafeExpires=B.addDays(today,500+i*30);
   if(p.joinedOn&&p.joinedOn>B.addDays(today,-90))p.hr.probationEnds=B.addDays(p.joinedOn,90);
   const boss=s.team.find(x=>x.active&&x.access==='manager'&&x.id!==p.id);if(boss)p.hr.reportsTo=boss.id;
  });
  return s;
 }
 B.starter=(...args)=>seed(prev.starter(...args));
 // A workspace saved before HR files existed gets the same demo picture once.
 const load=B.load;
 B.load=storage=>{const s=load(storage);return s.setup.rolePerms||s.team.some(p=>p.hr)?s:seed(s);};
 B.change=change;B.permissions={list,keys,can,title,base,roleDefault,custom};B.hr={fields:hr,options};
})();
