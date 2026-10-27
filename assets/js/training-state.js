/* Training: a course center for every role. A course is a journey stage for an audience, with objectives, lessons (read, watch,
   look, decide), a quiz, a practical signed off on shift, flash cards and an order-the-steps sequence. Finishing earns XP, levels,
   streaks, badges and a certificate, and updates the skills matrix. The arena adds four games, duels between teammates, a weekly
   personal and team challenge and a leaderboard. Everything here is DOM-free and validated; Reports and HR files read from it. */
(function(){
 'use strict';
 const B=Brigly,prev={change:B.change,starter:B.starter,load:B.load};
 const copy=x=>JSON.parse(JSON.stringify(x));
 const now=()=>new Date().toISOString();
 const today=()=>(B.payroll?.stamp?.()||now()).slice(0,10);
 const txt=(x,max)=>typeof x==='string'&&x.length<=max;
 const nonempty=(x,max)=>txt(x,max)&&x.trim().length>0;
 const isId=x=>typeof x==='string'&&/^[\w-]{1,80}$/.test(x);
 const hash=x=>[...String(x)].reduce((h,c)=>(h*31+c.charCodeAt(0))>>>0,7);
 const person=(s,id)=>s.team.find(p=>p.id===id);
 const days=(a,b)=>Math.round((new Date(b+'T12:00:00')-new Date(a+'T12:00:00'))/864e5);

 // Progression: XP for every step, five levels, stages of a role journey, games and badges earned from the record.
 const XP={lesson:15,quizPass:50,quizPerfect:25,practical:100,daily:10,scenarioBest:20,scenarioOk:8,gameCorrect:6,gameCombo:2,duelWin:60,duelLose:20,duelTie:40,rating:5};
 const levels=[[0,'Trainee','🌱'],[300,'Apprentice','🔪'],[800,'Pro','⭐'],[1600,'Captain','🏅'],[3000,'Legend','🏆']];
 const stages=[['onboarding','Welcome','Your first week'],['core','Core skills','What your role needs'],['advanced','Advanced','Go deeper'],['lead','Lead','Run the shift']];
 const lessonKinds=['text','video','image','scenario'];
 const images=['brigly-table-welcome','brigly-dining-room','brigly-kitchen-service','brigly-bar-preparation','brigly-wine-comparison','brigly-seasonal-menu','brigly-service-editorial','brigly-week-together','brigly-restaurant-frontage'];
 const emojis=['📚','🍽️','🍷','🍸','🔪','🔥','🧼','🧾','🛎️','🤝','🧠','⏱️','🧯','🧊','📋','🎯','💬','🥂','🌿','🚪','👋','🥜','🪪','🌡️','🎨','🔐','📣','☕','🍰','🧺'];
 const games=[
  ['speed','Speed round','60 seconds of questions from your courses. Combos multiply.','⚡'],
  ['pairs','Pair up','Match each term with its meaning. Fewer misses, more XP.','🃏'],
  ['order','In order','Put the steps of a routine in the right order.','🔢'],
  ['lightning','True or false','30 seconds. Trust your gut.','🌩️']
 ];
 const defaults={requiredWithinDays:14,weeklyGoal:300,teamGoal:2500,leaderboard:'everyone'};
 const badges=[
  ['first','First course','Finish your first course','🎓',(x)=>[Math.min(1,x.done),1]],
  ['scholar','Scholar','Finish five courses','📚',(x)=>[Math.min(5,x.done),5]],
  ['ace','Quiz ace','Score 100% on any quiz','💯',(x)=>[x.perfect?1:0,1]],
  ['allergen','Allergen aware','Complete Allergens & food safety','🥜',(x)=>[x.allergen?1:0,1]],
  ['ready','Role ready','Finish every required course for your role','✅',(x)=>[x.reqDone,Math.max(1,x.req)]],
  ['streak3','On a roll','Learn three days in a row','🔥',(x)=>[Math.min(3,x.streak),3]],
  ['streak7','Unstoppable','Learn seven days in a row','🌋',(x)=>[Math.min(7,x.streak),7]],
  ['speed','Speed demon','Get 12 right in one speed round','⚡',(x)=>[Math.min(12,x.speedBest),12]],
  ['pairs','Sharp memory','Clear Pair up with two misses or fewer','🧠',(x)=>[x.pairsClean?1:0,1]],
  ['duelist','Duelist','Win three duels','⚔️',(x)=>[Math.min(3,x.duelWins),3]],
  ['mentor','Mentor','Sign off three teammates','🤝',(x)=>[Math.min(3,x.signoffs),3]],
  ['critic','Critic','Rate three courses','⭐',(x)=>[Math.min(3,x.ratings),3]]
 ];

 function upgrade(state){
  const s=copy(state);s.training||={};const t=s.training;
  t.courses||=[];t.assignments||=[];t.progress||={};t.xp||={};t.games||={};t.daily||={};t.signoffs||=[];t.ratings||=[];t.duels||=[];t.settings={...defaults,...t.settings};
  for(const c of t.courses){c.qa||=[];c.objectives||=[];c.stage||='core';c.cards||=[];c.sequence||=[];}
  return s;
 }
 const settings=s=>({...defaults,...s.training?.settings});
 const course=(s,id)=>s.training.courses.find(c=>c.id===id);
 const published=s=>s.training.courses.filter(c=>c.status==='Published');

 // Who a course is for: everyone, a role, a station or people with manager access.
 function audienceOf(s,p){const out=['Everyone',p.role,p.area];if(p.access==='manager')out.push('Managers');return out;}
 const stageIndex=st=>Math.max(0,stages.findIndex(x=>x[0]===st));
 function pathFor(s,pid){
  const p=person(s,pid);if(!p)return [];
  const mine=audienceOf(s,p),assigned=new Set(s.training.assignments.filter(a=>a.person===pid).map(a=>a.course));
  return published(s).filter(c=>assigned.has(c.id)||c.audience.some(a=>mine.includes(a))).sort((a,b)=>stageIndex(a.stage)-stageIndex(b.stage)||(b.required?1:0)-(a.required?1:0)||a.order-b.order||a.title.localeCompare(b.title));
 }
 // Due dates: an explicit assignment, or the policy for required courses of someone who joined after the course existed.
 function dueFor(s,p,c,assignment){
  if(assignment?.due)return assignment.due;
  // New hires (first 90 days) get the policy deadline; longer-serving people are assigned a date by a manager instead.
  if(!c.required||!p?.joinedOn||days(p.joinedOn,today())>90)return '';
  const from=(c.publishedAt||c.createdAt||'').slice(0,10),start=from&&from>p.joinedOn?from:p.joinedOn;
  return B.addDays(start,settings(s).requiredWithinDays);
 }
 function progress(s,pid,cid){
  const c=course(s,cid),p=person(s,pid),pr=s.training.progress[pid]?.[cid]||{},lessons=c?c.lessons:[],done=lessons.filter(l=>pr.lessons?.[l.id]).length;
  const hasQuiz=!!c?.quiz?.questions?.length,hasPractical=!!c?.practical?.steps?.length;
  const quizPassed=!hasQuiz||!!pr.quiz?.passedAt,practical=pr.practical||null;
  const steps=lessons.length+(hasQuiz?1:0)+(hasPractical?1:0),doneSteps=done+(hasQuiz&&quizPassed?1:0)+(hasPractical&&practical?.status==='Approved'?1:0);
  const status=pr.completedAt?'Completed':practical?.status==='Pending'?'Awaiting sign-off':practical?.status==='Returned'?'Returned':doneSteps?'In progress':'Not started';
  const assignment=s.training.assignments.find(a=>a.person===pid&&a.course===cid),due=c?dueFor(s,p,c,assignment):'';
  const prereq=c?.prereq&&course(s,c.prereq)?course(s,c.prereq):null,locked=!!prereq&&!s.training.progress[pid]?.[prereq.id]?.completedAt;
  const lastAt=[...Object.values(pr.lessons||{}),pr.quiz?.lastAt||'',pr.practical?.at||pr.practical?.requestedAt||'',pr.completedAt||''].filter(Boolean).sort().at(-1)||'';
  return {course:cid,person:pid,lessonsDone:done,lessons:lessons.length,hasQuiz,quizPassed,quiz:pr.quiz||null,hasPractical,practical,steps,doneSteps,pct:steps?Math.round(doneSteps/steps*100):0,status,completedAt:pr.completedAt||'',due,assignedBy:assignment?.by||'',overdue:!!due&&!pr.completedAt&&due<today(),readyForSignoff:done===lessons.length&&quizPassed&&hasPractical&&practical?.status!=='Approved'&&practical?.status!=='Pending',locked,prereq:prereq?.id||'',lastAt,rating:s.training.ratings.find(r=>r.person===pid&&r.course===cid)||null};
 }
 const ledger=(s,pid)=>s.training.xp[pid]||[];
 function xp(s,pid,from='',to=''){return ledger(s,pid).filter(x=>(!from||x.at.slice(0,10)>=from)&&(!to||x.at.slice(0,10)<=to)).reduce((n,x)=>n+x.amount,0);}
 function level(total){
  let i=0;while(i<levels.length-1&&total>=levels[i+1][0])i++;
  const next=levels[i+1]||null;
  return {index:i,title:levels[i][1],icon:levels[i][2],min:levels[i][0],next:next?next[0]:null,nextTitle:next?next[1]:'',pct:next?Math.round((total-levels[i][0])/(next[0]-levels[i][0])*100):100,toNext:next?next[0]-total:0};
 }
 function streak(s,pid){
  const set=new Set(ledger(s,pid).map(x=>x.at.slice(0,10)));if(!set.size)return {count:0,today:false,week:Array.from({length:7},(_,i)=>({date:B.addDays(today(),i-6),on:false}))};
  const t=today();let d=set.has(t)?t:B.addDays(t,-1),count=0;
  while(set.has(d)){count++;d=B.addDays(d,-1);}
  return {count,today:set.has(t),week:Array.from({length:7},(_,i)=>{const date=B.addDays(t,i-6);return {date,on:set.has(date)};})};
 }
 function certificates(s,pid){
  const t=s.training;return published(s).filter(c=>t.progress[pid]?.[c.id]?.completedAt).map(c=>{const pr=t.progress[pid][c.id];return {id:'BR-'+hash(pid+'|'+c.id+'|'+pr.completedAt).toString(36).toUpperCase().padStart(7,'0').slice(0,7),course:c.id,title:c.title,emoji:c.emoji,person:pid,at:pr.completedAt,by:pr.practical?.by||'',skill:c.skill||'',score:pr.quiz?.best??null};}).sort((a,b)=>b.at.localeCompare(a.at));
 }
 function earned(s,pid){
  const t=s.training,my=pathFor(s,pid),done=my.filter(c=>progress(s,pid,c.id).status==='Completed'),all=published(s).filter(c=>t.progress[pid]?.[c.id]?.completedAt);
  const quizzes=Object.values(t.progress[pid]||{}).map(x=>x.quiz).filter(Boolean),st=streak(s,pid),g=t.games[pid]||[],required=my.filter(c=>c.required);
  const facts={done:all.length,perfect:quizzes.some(q=>q.best===100),allergen:all.some(c=>/allergen/i.test(c.title)),req:required.length,reqDone:required.filter(c=>done.includes(c)).length,streak:st.count,speedBest:Math.max(0,...g.filter(x=>x.game==='speed').map(x=>x.correct)),pairsClean:g.some(x=>x.game==='pairs'&&x.misses<=2),duelWins:t.duels.filter(d=>d.status==='Done'&&d.winner===pid).length,signoffs:t.signoffs.filter(x=>x.by===pid&&x.decision==='Approved').length,ratings:t.ratings.filter(r=>r.person===pid).length};
  return badges.map(([id,title,how,icon,fn])=>{const [have,need]=fn(facts);return {id,title,how,icon,have,need,earned:have>=need&&(id!=='ready'||facts.req>0)};});
 }
 function leaderboard(s,period='week',area=''){
  const t=today(),from=period==='week'?B.monday(t):period==='month'?t.slice(0,8)+'01':'';
  return s.team.filter(p=>p.active&&(!area||p.area===area)).map(p=>{const total=xp(s,p.id),period_=xp(s,p.id,from);return {person:p.id,xp:period_,total,level:level(total),streak:streak(s,p.id).count,courses:pathFor(s,p.id).filter(c=>progress(s,p.id,c.id).status==='Completed').length};}).sort((a,b)=>b.xp-a.xp||b.total-a.total||a.person.localeCompare(b.person)).map((x,i)=>({...x,rank:i+1}));
 }
 // The weekly challenges: a personal XP goal and one for the whole team.
 function challenge(s,pid){
  const c=settings(s),from=B.monday(today()),mine=xp(s,pid,from),team=s.team.filter(p=>p.active).reduce((n,p)=>n+xp(s,p.id,from),0);
  return {from,to:B.addDays(from,6),mine,goal:c.weeklyGoal,done:mine>=c.weeklyGoal,team,teamGoal:c.teamGoal,teamDone:team>=c.teamGoal,contributors:s.team.filter(p=>p.active&&xp(s,p.id,from)>0).length};
 }
 // Sign-offs: managers always, people the manager named, trainers of the course's skill, or anyone with the Run training lead permission.
 function canApprove(s,c,pid){
  const p=person(s,pid);if(!p?.active||!c?.practical)return false;
  if(p.access==='manager')return true;
  if(B.permissions?.can(s,'training',pid))return true;
  const a=c.practical.approvers||{};
  if(a.people?.includes(pid))return true;
  if(a.roles?.includes(p.role))return true;
  if(a.trainers&&c.skill&&(s.business?.skills?.levels?.[pid]?.[c.skill]||0)>=3)return true;
  return false;
 }
 const canAnswer=(s,c,pid)=>{const p=person(s,pid);return !!p?.active&&(p.access==='manager'||!!B.permissions?.can(s,'training',pid)||(c.skill&&(s.business?.skills?.levels?.[pid]?.[c.skill]||0)>=3)||(c.practical&&canApprove(s,c,pid)));};
 function pending(s,approver=''){
  const out=[];
  for(const [pid,courses] of Object.entries(s.training.progress))for(const [cid,pr] of Object.entries(courses)){
   if(pr.practical?.status!=='Pending')continue;const c=course(s,cid);if(!c||!person(s,pid)?.active)continue;
   if(approver&&(approver===pid||!canApprove(s,c,approver)))continue;
   out.push({person:pid,course:cid,requestedAt:pr.practical.requestedAt,note:pr.practical.note||''});
  }
  return out.sort((a,b)=>a.requestedAt.localeCompare(b.requestedAt));
 }
 function bank(s,pid){
  const out=[];
  for(const c of pathFor(s,pid))for(const q of c.quiz?.questions||[])out.push({...q,course:c.id,courseTitle:c.title,emoji:c.emoji});
  return out;
 }
 function dailyQuestion(s,pid,date=today()){
  const list=bank(s,pid);if(!list.length)return null;
  const q=list[hash(date+'|'+pid)%list.length],done=s.training.daily[pid]?.[date];
  return {...q,date,answered:done!==undefined,correct:done===true};
 }
 function cards(s,pid){const out=[];for(const c of pathFor(s,pid))for(const [term,def] of c.cards||[])out.push({term,def,course:c.id,emoji:c.emoji});return out;}
 function sequences(s,pid){return pathFor(s,pid).filter(c=>c.sequence?.length>=4).map(c=>({course:c.id,title:c.title,emoji:c.emoji,steps:c.sequence}));}
 const rating=(s,cid)=>{const r=s.training.ratings.filter(x=>x.course===cid);return {count:r.length,avg:r.length?Math.round(r.reduce((n,x)=>n+x.stars,0)/r.length*10)/10:0,list:r.slice().sort((a,b)=>b.at.localeCompare(a.at))};};
 const finishers=(s,cid)=>Object.entries(s.training.progress).filter(([pid,c])=>c[cid]?.completedAt&&person(s,pid)?.active).map(([pid])=>pid);
 // Team overview for managers.
 function team(s){
  return s.team.filter(p=>p.active).map(p=>{const path=pathFor(s,p.id),rows=path.map(c=>progress(s,p.id,c.id)),done=rows.filter(r=>r.status==='Completed').length,req=rows.filter(r=>course(s,r.course).required),reqDone=req.filter(r=>r.status==='Completed').length,quizzes=rows.map(r=>r.quiz).filter(Boolean);
   return {person:p.id,path,rows,done,total:path.length,required:req.length,requiredDone:reqDone,pct:path.length?Math.round(done/path.length*100):0,pending:rows.filter(r=>r.status==='Awaiting sign-off').length,overdue:rows.filter(r=>r.overdue).length,xp:xp(s,p.id),level:level(xp(s,p.id)),streak:streak(s,p.id).count,inProgress:rows.filter(r=>r.status==='In progress'||r.status==='Returned').length,avgBest:quizzes.length?Math.round(quizzes.reduce((n,q)=>n+q.best,0)/quizzes.length):null,lastActive:ledger(s,p.id).at(-1)?.at||'',certs:certificates(s,p.id).length,health:rows.some(r=>r.overdue)?'behind':req.length&&reqDone<req.length?'catching-up':'on-track'};}).sort((a,b)=>b.xp-a.xp);
 }
 // Numbers for Reports: what happened between two dates, plus the live compliance picture.
 function report(s,from,to){
  const t=s.training,inRange=iso=>!!iso&&iso.slice(0,10)>=from&&iso.slice(0,10)<=to,crew=s.team.filter(p=>p.active);
  let completions=0,attempts=0,scoreSum=0,passes=0;const missed=new Map();
  for(const [pid,courses] of Object.entries(t.progress)){if(!person(s,pid))continue;for(const [cid,pr] of Object.entries(courses)){const c=course(s,cid);if(!c)continue;if(inRange(pr.completedAt))completions++;
   for(const h of pr.quiz?.history||[])if(inRange(h.at)){attempts++;scoreSum+=h.score;if(h.score>=(c.quiz?.passMark||80))passes++;for(const qid of h.wrong||[]){const q=c.quiz?.questions.find(x=>x.id===qid);if(q){const k=cid+'|'+qid,m=missed.get(k)||{course:c.title,emoji:c.emoji,text:q.text,misses:0};m.misses++;missed.set(k,m);}}}}}
  const xpTotal=crew.reduce((n,p)=>n+xp(s,p.id,from,to),0),active=crew.filter(p=>xp(s,p.id,from,to)>0).length;
  const signoffs=t.signoffs.filter(x=>inRange(x.at)),approved=signoffs.filter(x=>x.decision==='Approved').length,returned=signoffs.length-approved;
  const rows=team(s),req=rows.reduce((n,x)=>n+x.required,0),reqDone=rows.reduce((n,x)=>n+x.requiredDone,0);
  const perCourse=published(s).map(c=>{const on=rows.flatMap(x=>x.rows.filter(r=>r.course===c.id)),q=on.map(r=>r.quiz).filter(Boolean);return {course:c.id,title:c.title,emoji:c.emoji,required:c.required,learners:on.length,completed:on.filter(r=>r.status==='Completed').length,inRange:on.filter(r=>inRange(r.completedAt)).length,avgBest:q.length?Math.round(q.reduce((n,x)=>n+x.best,0)/q.length):null,avgAttempts:q.length?Math.round(q.reduce((n,x)=>n+x.attempts,0)/q.length*10)/10:null,rating:rating(s,c.id)};}).filter(x=>x.learners);
  const people=rows.map(x=>({...x,xpInRange:xp(s,x.person,from,to),completedInRange:x.rows.filter(r=>inRange(r.completedAt)).length}));
  const games=crew.reduce((n,p)=>n+(t.games[p.id]||[]).filter(g=>inRange(g.at)).length,0),duels=t.duels.filter(d=>d.status==='Done'&&inRange(d.settledAt)).length;
  return {from,to,completions,attempts,avgScore:attempts?Math.round(scoreSum/attempts):null,passRate:attempts?Math.round(passes/attempts*100):null,xp:xpTotal,active,headcount:crew.length,approved,returned,pendingNow:pending(s).length,required:req,requiredDone:reqDone,compliance:req?Math.round(reqDone/req*100):100,perCourse,missed:[...missed.values()].sort((a,b)=>b.misses-a.misses).slice(0,8),people,games,duels,certificates:crew.reduce((n,p)=>n+certificates(s,p.id).filter(c=>inRange(c.at)).length,0)};
 }
 function weekSeries(s,weeks){return weeks.map(w=>{const r=report(s,w.from,w.to);return {from:w.from,to:w.to,xp:r.xp,completions:r.completions,active:r.active,attempts:r.attempts,avgScore:r.avgScore};});}

 // Validation for courses and their parts.
 function validCourse(s,c){
  const bad=m=>{throw Error(m);};
  if(!isId(c.id))bad('Course id is invalid.');if(!nonempty(c.title,100))bad('Give the course a title.');if(!txt(c.description||'',600))bad('Keep the description under 600 characters.');
  if(!txt(c.emoji||'',8))bad('Pick an emoji.');if(!['Published','Draft'].includes(c.status))bad('Choose a status.');if(!stages.some(x=>x[0]===c.stage))bad('Choose a journey stage.');
  const okAudience=['Everyone','Managers',...s.setup.roles,...s.setup.areas];
  if(!Array.isArray(c.audience)||!c.audience.length||!c.audience.every(a=>okAudience.includes(a)))bad('Choose who the course is for.');
  if(!Number.isInteger(c.minutes)||c.minutes<1||c.minutes>600)bad('Estimated minutes must be between 1 and 600.');
  if(!Number.isInteger(c.xp)||c.xp<0||c.xp>2000)bad('Course XP must be between 0 and 2000.');
  if(typeof c.required!=='boolean')bad('Required must be yes or no.');
  if(c.skill&&!(s.business?.skills?.list||[]).includes(c.skill))bad('Choose a skill from the skills list.');
  if(c.cover&&!images.includes(c.cover))bad('Choose a cover picture.');
  if(c.prereq&&(c.prereq===c.id||!course(s,c.prereq)))bad('Choose another course as the prerequisite.');
  if(!Array.isArray(c.objectives)||c.objectives.length>8||!c.objectives.every(x=>nonempty(x,160)))bad('Up to eight learning objectives, each under 160 characters.');
  if(!Array.isArray(c.lessons)||c.lessons.length>40)bad('A course can hold up to 40 lessons.');
  for(const l of c.lessons)validLesson(l);
  if(c.quiz){if(!Array.isArray(c.quiz.questions)||c.quiz.questions.length>40)bad('Up to 40 quiz questions.');for(const q of c.quiz.questions)validQuestion(q);const pm=Number(c.quiz.passMark);if(!Number.isInteger(pm)||pm<1||pm>100)bad('The pass mark is a percentage.');}
  if(c.practical){const p=c.practical;if(!nonempty(p.title,120))bad('Name the practical.');if(!Array.isArray(p.steps)||!p.steps.length||p.steps.length>25||!p.steps.every(x=>nonempty(x,200)))bad('List between 1 and 25 practical steps.');if(!txt(p.note||'',600))bad('Keep the practical note shorter.');
   const a=p.approvers||{};if(!Array.isArray(a.roles||[])||!(a.roles||[]).every(r=>s.setup.roles.includes(r)))bad('Choose approver roles from the roles list.');if(!Array.isArray(a.people||[])||!(a.people||[]).every(id=>person(s,id)))bad('Choose approvers from the team.');}
  if(Array.isArray(c.cards)){if(c.cards.length>40||!c.cards.every(x=>Array.isArray(x)&&x.length===2&&nonempty(x[0],60)&&nonempty(x[1],160)))bad('Flash cards need a term and a meaning, up to 40.');}
  if(Array.isArray(c.sequence)){if(c.sequence.length>12||!c.sequence.every(x=>nonempty(x,120)))bad('A sequence holds up to 12 steps.');if(c.sequence.length&&c.sequence.length<4)bad('A sequence needs at least four steps.');}
 }
 function validLesson(l){
  const bad=m=>{throw Error(m);};
  if(!isId(l.id)||!lessonKinds.includes(l.kind))bad('Choose a lesson type.');if(!nonempty(l.title,120))bad('Give the lesson a title.');if(!txt(l.body||'',6000))bad('Keep the lesson under 6000 characters.');
  if(l.takeaways&&(!Array.isArray(l.takeaways)||l.takeaways.length>5||!l.takeaways.every(x=>nonempty(x,160))))bad('Up to five takeaways.');
  if(l.kind==='video'&&l.url&&!/^https:\/\/\S+$/.test(l.url))bad('Video links start with https://.');
  if(l.kind==='image'&&!(images.includes(l.image)||/^https:\/\/\S+$/.test(l.image||'')))bad('Choose a picture or paste an https:// image link.');
  if(l.kind==='scenario'){if(!nonempty(l.situation||l.body,2000))bad('Describe the situation.');if(!Array.isArray(l.choices)||l.choices.length<2||l.choices.length>5)bad('Give the scenario 2 to 5 choices.');
   if(!l.choices.every(c=>nonempty(c.text,200)&&nonempty(c.outcome,500)&&['best','ok','bad'].includes(c.grade)))bad('Each choice needs text, an outcome and a grade.');if(!l.choices.some(c=>c.grade==='best'))bad('Mark one choice as the best answer.');}
 }
 function validQuestion(q){
  const bad=m=>{throw Error(m);};
  if(!isId(q.id)||!nonempty(q.text,300))bad('Write the question.');if(!Array.isArray(q.options)||q.options.length<2||q.options.length>6||!q.options.every(o=>nonempty(o,160)))bad('Give 2 to 6 answers.');
  if(!Number.isInteger(q.answer)||q.answer<0||q.answer>=q.options.length)bad('Mark the right answer.');if(!txt(q.explain||'',400))bad('Keep the explanation shorter.');
 }

 function award(s,pid,amount,reason,ref=''){
  if(!amount)return;const list=s.training.xp[pid]||=[];list.push({at:now(),amount,reason,ref});if(list.length>3000)list.splice(0,list.length-3000);
 }
 function finish(s,pid,c,pr){
  if(pr.completedAt)return;pr.completedAt=now();award(s,pid,c.xp,'Finished '+c.title,c.id);
  if(c.skill&&s.business?.skills?.list?.includes(c.skill)){const lv=s.business.skills.levels[pid]||={};if((lv[c.skill]||0)<2)lv[c.skill]=2;}
 }
 const needLead=(s,role,me,what)=>{if(role==='manager')return;if(B.permissions?.can(s,'training',me))return;throw Error('Only managers or training leads can '+what+'.');};
 const shuffle=(list,seed)=>{const out=list.slice();let h=seed>>>0||1;for(let i=out.length-1;i>0;i--){h=(h*1103515245+12345)>>>0;const j=h%(i+1);[out[i],out[j]]=[out[j],out[i]];}return out;};

 function change(state,a,role=state.role){
  if(!/^training:/.test(a.type)){const s=prev.change(state,a,role);return s.training?.settings?s:upgrade(s);}
  const s=upgrade(state),me=B.actor(role,s.crewId,s.managerId),t=s.training;
  const mine=(pid,cid)=>{const p=t.progress[pid]||={};return p[cid]||={lessons:{}};};
  const getCourse=id=>{const c=course(s,id);if(!c)throw Error('This course no longer exists.');return c;};
  const open=id=>{const c=getCourse(id);if(c.status!=='Published'&&role!=='manager')throw Error('This course is not published yet.');if(progress(s,me,c.id).locked)throw Error('Finish '+course(s,c.prereq).title+' first.');return c;};
  if(a.type==='training:course-save'){
   needLead(s,role,me,'edit courses');const old=course(s,a.course?.id);
   const c={...(old||{lessons:[],quiz:{passMark:80,questions:[]},practical:null,cards:[],sequence:[],qa:[],author:me,createdAt:now(),order:t.courses.length+1}),...a.course};
   c.minutes=Number(c.minutes);c.xp=Number(c.xp);c.required=!!c.required;c.title=String(c.title||'').trim();c.description=String(c.description||'').trim();c.skill=c.skill||'';c.cover=c.cover||'';c.prereq=c.prereq||'';c.stage=c.stage||'core';c.objectives=[].concat(c.objectives||[]).map(x=>String(x).trim()).filter(Boolean);c.updatedAt=now();
   validCourse(s,c);if(old)Object.assign(old,c);else t.courses.push(c);
  }else if(a.type==='training:course-duplicate'){
   needLead(s,role,me,'copy courses');const c=getCourse(a.id),copyOf=copy(c);copyOf.id=a.newId||crypto.randomUUID();copyOf.title=c.title+' (copy)';copyOf.status='Draft';copyOf.qa=[];copyOf.createdAt=now();copyOf.updatedAt=now();copyOf.author=me;copyOf.order=t.courses.length+1;
   copyOf.lessons=copyOf.lessons.map(l=>({...l,id:crypto.randomUUID()}));if(copyOf.quiz)copyOf.quiz.questions=copyOf.quiz.questions.map(q=>({...q,id:crypto.randomUUID()}));validCourse(s,copyOf);t.courses.push(copyOf);
  }else if(a.type==='training:course-remove'){
   needLead(s,role,me,'remove courses');getCourse(a.id);t.courses=t.courses.filter(c=>c.id!==a.id);t.assignments=t.assignments.filter(x=>x.course!==a.id);t.ratings=t.ratings.filter(x=>x.course!==a.id);
   for(const c of t.courses)if(c.prereq===a.id)c.prereq='';for(const p of Object.values(t.progress))delete p[a.id];
  }else if(a.type==='training:course-status'){
   needLead(s,role,me,'publish courses');const c=getCourse(a.id);if(!['Published','Draft'].includes(a.status))throw Error('Choose a status.');
   if(a.status==='Published'&&!c.lessons.length&&!c.quiz?.questions?.length&&!c.practical)throw Error('Add at least one lesson, quiz question or practical before publishing.');
   if(a.status==='Published'&&c.status!=='Published')c.publishedAt=now();c.status=a.status;c.updatedAt=now();
  }else if(a.type==='training:course-move'){
   needLead(s,role,me,'reorder courses');const c=getCourse(a.id),sorted=t.courses.slice().sort((x,y)=>x.order-y.order),i=sorted.indexOf(c),j=i+(a.dir<0?-1:1);
   if(j<0||j>=sorted.length)return s;[sorted[i],sorted[j]]=[sorted[j],sorted[i]];sorted.forEach((x,k)=>x.order=k+1);
  }else if(a.type==='training:lesson-save'){
   needLead(s,role,me,'edit lessons');const c=getCourse(a.course),l={...a.lesson};l.title=String(l.title||'').trim();l.takeaways=[].concat(l.takeaways||[]).map(x=>String(x).trim()).filter(Boolean);validLesson(l);
   const old=c.lessons.find(x=>x.id===l.id);if(old)Object.assign(old,l);else c.lessons.push(l);c.updatedAt=now();
  }else if(a.type==='training:lesson-remove'){
   needLead(s,role,me,'edit lessons');const c=getCourse(a.course);c.lessons=c.lessons.filter(x=>x.id!==a.id);c.updatedAt=now();
  }else if(a.type==='training:lesson-move'){
   needLead(s,role,me,'edit lessons');const c=getCourse(a.course),i=c.lessons.findIndex(x=>x.id===a.id),j=i+(a.dir<0?-1:1);if(i<0||j<0||j>=c.lessons.length)return s;[c.lessons[i],c.lessons[j]]=[c.lessons[j],c.lessons[i]];
  }else if(a.type==='training:question-save'){
   needLead(s,role,me,'edit quizzes');const c=getCourse(a.course);c.quiz||={passMark:80,questions:[]};const q={...a.question};q.text=String(q.text||'').trim();q.options=(q.options||[]).map(x=>String(x).trim()).filter(Boolean);q.answer=Number(q.answer);validQuestion(q);
   if(a.passMark!==undefined){const pm=Number(a.passMark);if(!Number.isInteger(pm)||pm<1||pm>100)throw Error('The pass mark is a percentage.');c.quiz.passMark=pm;}
   const old=c.quiz.questions.find(x=>x.id===q.id);if(old)Object.assign(old,q);else c.quiz.questions.push(q);c.updatedAt=now();
  }else if(a.type==='training:question-remove'){
   needLead(s,role,me,'edit quizzes');const c=getCourse(a.course);if(c.quiz)c.quiz.questions=c.quiz.questions.filter(x=>x.id!==a.id);
  }else if(a.type==='training:practical-save'){
   needLead(s,role,me,'edit practicals');const c=getCourse(a.course);
   if(a.practical===null){c.practical=null;}else{c.practical={title:String(a.practical.title||'').trim(),steps:[].concat(a.practical.steps||[]).map(x=>String(x).trim()).filter(Boolean),note:String(a.practical.note||'').trim(),approvers:{trainers:!!a.practical.approvers?.trainers,roles:[].concat(a.practical.approvers?.roles||[]),people:[].concat(a.practical.approvers?.people||[])}};validCourse(s,c);}
   c.updatedAt=now();
  }else if(a.type==='training:cards-save'){
   needLead(s,role,me,'edit flash cards');const c=getCourse(a.course);c.cards=[].concat(a.cards||[]).map(x=>[String(x[0]||'').trim(),String(x[1]||'').trim()]).filter(x=>x[0]&&x[1]);validCourse(s,c);
  }else if(a.type==='training:sequence-save'){
   needLead(s,role,me,'edit the sequence');const c=getCourse(a.course);c.sequence=[].concat(a.steps||[]).map(x=>String(x).trim()).filter(Boolean);validCourse(s,c);
  }else if(a.type==='training:settings'){
   needLead(s,role,me,'change training settings');const c={...settings(s)};
   for(const [k,min,max] of [['requiredWithinDays',1,365],['weeklyGoal',50,5000],['teamGoal',100,100000]]){if(a[k]===undefined)continue;const v=Number(a[k]);if(!Number.isInteger(v)||v<min||v>max)throw Error('Check the training settings.');c[k]=v;}
   if(a.leaderboard!==undefined){if(!['everyone','managers'].includes(a.leaderboard))throw Error('Choose who sees the leaderboard.');c.leaderboard=a.leaderboard;}
   t.settings=c;
  }else if(a.type==='training:assign'){
   needLead(s,role,me,'assign courses');const c=getCourse(a.course),people=[].concat(a.people||[]).filter(id=>person(s,id)?.active);if(!people.length)throw Error('Choose at least one teammate.');
   if(a.due&&!B.isDate(a.due))throw Error('Choose a due date.');
   for(const pid of people){t.assignments=t.assignments.filter(x=>!(x.course===c.id&&x.person===pid));t.assignments.push({id:crypto.randomUUID(),course:c.id,person:pid,by:me,at:now(),due:a.due||'',note:String(a.note||'').slice(0,300)});}
  }else if(a.type==='training:unassign'){
   needLead(s,role,me,'change assignments');t.assignments=t.assignments.filter(x=>!(x.course===a.course&&x.person===a.person));
  }else if(a.type==='training:nudge'){
   needLead(s,role,me,'send reminders');const c=getCourse(a.course),p=person(s,a.person);if(!p?.active)throw Error('Choose a current teammate.');if(p.id===me)throw Error('You cannot nudge yourself.');
   if(!B.chat)throw Error('Team chat is not available.');
   const body=String(a.message||'').trim()||`Quick reminder: ${c.emoji} ${c.title} is waiting for you in Training${progress(s,p.id,c.id).due?' (due '+progress(s,p.id,c.id).due+')':''}. It takes about ${c.minutes} minutes.`;
   const out=prev.change(s,{type:'chat:send',thread:B.chat.dm(me,p.id),id:crypto.randomUUID(),kind:'text',body},role);
   out.training.nudges=[...(out.training.nudges||[]),{person:p.id,course:c.id,by:me,at:now()}].slice(-500);return out;
  }else if(a.type==='training:lesson-done'){
   const c=open(a.course),l=c.lessons.find(x=>x.id===a.lesson);if(!l)throw Error('This lesson no longer exists.');const pr=mine(me,c.id);
   if(!pr.lessons[l.id]){pr.lessons[l.id]=now();let amount=XP.lesson;if(l.kind==='scenario'){const ch=l.choices[Number(a.choice)];if(!ch)throw Error('Pick what you would do.');amount+=ch.grade==='best'?XP.scenarioBest:ch.grade==='ok'?XP.scenarioOk:0;pr.scenarios={...pr.scenarios,[l.id]:Number(a.choice)};}award(s,me,amount,'Lesson · '+l.title,c.id);}
   const p=progress(s,me,c.id);if(p.lessonsDone===p.lessons&&p.quizPassed&&!p.hasPractical)finish(s,me,c,pr);
  }else if(a.type==='training:quiz'){
   const c=open(a.course),qs=c.quiz?.questions||[];if(!qs.length)throw Error('This course has no quiz.');
   const answers=[].concat(a.answers||[]);if(answers.length!==qs.length)throw Error('Answer every question.');
   const wrong=qs.filter((q,i)=>Number(answers[i])!==q.answer).map(q=>q.id),correct=qs.length-wrong.length,score=Math.round(correct/qs.length*100),pr=mine(me,c.id),q=pr.quiz||={best:0,attempts:0,passedAt:'',history:[]};
   q.attempts++;q.last=score;q.lastAt=now();q.history=[...(q.history||[]),{at:now(),score,wrong}].slice(-20);const passed=score>=c.quiz.passMark;
   if(score>q.best)q.best=score;
   if(passed&&!q.passedAt){q.passedAt=now();award(s,me,XP.quizPass+(score===100?XP.quizPerfect:0),'Quiz · '+c.title+(score===100?' · perfect':''),c.id);if(score===100)q.perfectAt=now();}
   else if(score===100&&!q.perfectAt){q.perfectAt=now();award(s,me,XP.quizPerfect,'Perfect quiz · '+c.title,c.id);}
   const p=progress(s,me,c.id);if(p.lessonsDone===p.lessons&&p.quizPassed&&!p.hasPractical)finish(s,me,c,pr);
  }else if(a.type==='training:request-signoff'){
   const c=open(a.course);if(!c.practical)throw Error('This course has no practical.');const p=progress(s,me,c.id);
   if(p.lessonsDone<p.lessons||!p.quizPassed)throw Error('Finish every lesson and pass the quiz first.');if(p.practical?.status==='Pending')throw Error('Your sign-off request is already waiting.');if(p.practical?.status==='Approved')throw Error('This practical is already signed off.');
   if(!txt(a.note||'',500))throw Error('Keep the note shorter.');const pr=mine(me,c.id);pr.practical={status:'Pending',requestedAt:now(),note:(a.note||'').trim(),checked:[].concat(a.checked||[]).map(Number).filter(n=>Number.isInteger(n)),tries:(pr.practical?.tries||0)+1};
  }else if(a.type==='training:signoff'){
   const c=getCourse(a.course),pr=t.progress[a.person]?.[c.id];if(!pr?.practical||pr.practical.status!=='Pending')throw Error('Nothing is waiting for sign-off here.');
   if(a.person===me)throw Error('Someone else has to sign you off.');if(!canApprove(s,c,me))throw Error('You are not an approver for this course.');
   if(!['Approved','Returned'].includes(a.decision))throw Error('Approve or return the practical.');if(!txt(a.feedback||'',500))throw Error('Keep the feedback shorter.');
   if(a.decision==='Returned'&&!nonempty(a.feedback||'',500))throw Error('Tell them what to practise before trying again.');
   pr.practical={...pr.practical,status:a.decision,by:me,at:now(),feedback:(a.feedback||'').trim()};t.signoffs.push({course:c.id,person:a.person,by:me,at:now(),decision:a.decision});
   if(a.decision==='Approved'){award(s,a.person,XP.practical,'Signed off · '+c.practical.title,c.id);const p=progress(s,a.person,c.id);if(p.lessonsDone===p.lessons&&p.quizPassed)finish(s,a.person,c,pr);}
  }else if(a.type==='training:reset'){
   needLead(s,role,me,'reset progress');if(t.progress[a.person])delete t.progress[a.person][a.course];
  }else if(a.type==='training:rate'){
   const c=open(a.course);if(!t.progress[me]?.[c.id]?.completedAt)throw Error('Finish the course before rating it.');
   const stars=Number(a.stars);if(!Number.isInteger(stars)||stars<1||stars>5)throw Error('Rate from 1 to 5 stars.');if(!txt(a.comment||'',300))throw Error('Keep the comment under 300 characters.');
   const first=!t.ratings.some(r=>r.person===me&&r.course===c.id);t.ratings=t.ratings.filter(r=>!(r.person===me&&r.course===c.id));t.ratings.push({course:c.id,person:me,stars,comment:(a.comment||'').trim(),at:now()});
   if(first)award(s,me,XP.rating,'Rated '+c.title,c.id);
  }else if(a.type==='training:ask'){
   const c=open(a.course);if(!nonempty(a.text,500))throw Error('Write your question.');c.qa.push({id:a.id||crypto.randomUUID(),author:me,text:a.text.trim(),at:now(),answer:null});if(c.qa.length>200)c.qa.splice(0,c.qa.length-200);
  }else if(a.type==='training:answer'){
   const c=getCourse(a.course),q=c.qa.find(x=>x.id===a.id);if(!q)throw Error('This question no longer exists.');if(!canAnswer(s,c,me))throw Error('Managers, training leads and trainers answer course questions.');
   if(!nonempty(a.text,800))throw Error('Write the answer.');q.answer={author:me,text:a.text.trim(),at:now()};
  }else if(a.type==='training:game'){
   const game=games.find(g=>g[0]===a.game);if(!game)throw Error('Unknown game.');
   const correct=Number(a.correct)||0,total=Number(a.total)||0,misses=Number(a.misses)||0,combo=Number(a.bestCombo)||0;
   if(correct<0||correct>60||total<0||total>60||misses<0||misses>200||correct>Math.max(total,correct))throw Error('That score does not look right.');
   const amount=a.game==='speed'?correct*XP.gameCorrect+combo*XP.gameCombo:a.game==='pairs'?Math.max(10,60-misses*5):a.game==='order'?correct*8+(total&&correct===total?20:0):correct*5+combo*XP.gameCombo;
   (t.games[me]||=[]).push({game:a.game,correct,total,misses,bestCombo:combo,score:amount,at:now()});if(t.games[me].length>300)t.games[me].splice(0,t.games[me].length-300);
   award(s,me,amount,game[1]+(a.game==='pairs'?' · '+misses+' misses':' · '+correct+' right'),a.game);
  }else if(a.type==='training:daily'){
   const date=a.date||today(),q=dailyQuestion(s,me,date);if(!q)throw Error('No question today.');if(q.answered)throw Error('You already answered today’s question.');
   const correct=Number(a.answer)===q.answer;(t.daily[me]||={})[date]=correct;if(correct)award(s,me,XP.daily,'Question of the day','daily');
  }else if(a.type==='training:duel-send'){
   const to=person(s,a.to);if(!to?.active||to.id===me)throw Error('Choose a teammate to challenge.');
   if(t.duels.some(d=>d.status==='Open'&&((d.from===me&&d.to===to.id)||(d.from===to.id&&d.to===me))))throw Error('You already have an open duel with '+to.name+'.');
   const theirs=new Set(bank(s,to.id).map(q=>q.course+'|'+q.id)),common=bank(s,me).filter(q=>theirs.has(q.course+'|'+q.id)),pool=common.length>=5?common:bank(s,me);
   if(pool.length<5)throw Error('Finish a course first so there are questions to duel on.');
   const qs=shuffle(pool,hash(me+to.id+now())).slice(0,5).map(q=>({course:q.course,id:q.id}));
   t.duels.push({id:a.id||crypto.randomUUID(),from:me,to:to.id,questions:qs,scores:{},status:'Open',at:now()});if(t.duels.length>300)t.duels.splice(0,t.duels.length-300);
  }else if(a.type==='training:duel-play'){
   const d=t.duels.find(x=>x.id===a.id);if(!d||d.status!=='Open')throw Error('This duel is over.');if(![d.from,d.to].includes(me))throw Error('This is not your duel.');if(d.scores[me])throw Error('You already played this duel.');
   const answers=[].concat(a.answers||[]);if(answers.length!==d.questions.length)throw Error('Answer every question.');
   const correct=d.questions.filter((q,i)=>{const c=course(s,q.course),item=c?.quiz?.questions.find(x=>x.id===q.id);return item&&Number(answers[i])===item.answer;}).length;
   d.scores[me]={correct,at:now(),seconds:Math.max(0,Math.min(600,Number(a.seconds)||0))};
   if(d.scores[d.from]&&d.scores[d.to]){const f=d.scores[d.from],g=d.scores[d.to];d.status='Done';d.settledAt=now();d.winner=f.correct>g.correct?d.from:g.correct>f.correct?d.to:f.seconds&&g.seconds&&f.seconds!==g.seconds?(f.seconds<g.seconds?d.from:d.to):'';
    for(const pid of [d.from,d.to]){const other=pid===d.from?d.to:d.from;award(s,pid,d.winner===pid?XP.duelWin:d.winner?XP.duelLose:XP.duelTie,(d.winner===pid?'Won a duel against ':d.winner?'Duel against ':'Tied a duel with ')+(person(s,other)?.name.split(' ')[0]||'a teammate'),'duel');}}
  }else if(a.type==='training:duel-decline'){
   const d=t.duels.find(x=>x.id===a.id);if(!d||d.status!=='Open')throw Error('This duel is over.');if(![d.from,d.to].includes(me))throw Error('This is not your duel.');d.status='Declined';d.settledAt=now();
  }else throw Error('Unknown training change.');
  return s;
 }

 // A new teammate's onboarding checklist gets a training step that ticks itself off.
 if(B.biz?.steps&&!B.biz.steps.some(x=>x[0]==='courses'))B.biz.steps.push(['courses','Required courses finished in Training','Training','Training',(s,p)=>{if(!s.training)return false;const req=pathFor(s,p.id).filter(c=>c.required);return req.length>0&&req.every(c=>!!s.training.progress[p.id]?.[c.id]?.completedAt);}]);

 // The demo course library: every role in The Copper Room gets a journey, with objectives, lessons, quizzes, practicals, cards and sequences.
 const L=(id,kind,title,body,extra={})=>({id,kind,title,body,...extra});
 const Q=(id,text,options,answer,explain='')=>({id,text,options,answer,explain});
 const P=(title,steps,note='',approvers={trainers:true,roles:[],people:[]})=>({title,steps,note,approvers});
 function library(created){
  const base={status:'Published',createdAt:created,updatedAt:created,publishedAt:created};
  // Each course gets its own question list; a shared array would show every question on every course.
  return [
   {...base,id:'c-welcome',emoji:'👋',cover:'brigly-dining-room',stage:'onboarding',title:'Welcome to The Copper Room',description:'Who we are, how a service runs and how Brigly keeps the team connected. Everyone starts here.',audience:['Everyone'],required:true,minutes:12,xp:120,skill:'',order:1,
    objectives:['Greet every guest within 30 seconds','Find your shift, briefing and checklists in Brigly','Know what to do when a guest has a problem','Work as one team across floor, bar and kitchen'],
    lessons:[
     L('l-w1','text','How we think about hospitality','Every guest should leave feeling looked after, not processed.\n\n• Greet within 30 seconds, even if it’s just eye contact and “I’ll be right with you.”\n• Names matter: the Bennetts come every anniversary. Use the reservation notes.\n• Fix problems at the table, then tell a manager. Never make a guest wait for permission to be happy.\n• The kitchen, bar and floor are one team. If you see a station drowning, help, then ask.',{takeaways:['30 seconds to a first hello','Fix it at the table, then report','One team, three stations']}),
     L('l-w2','image','A service, start to finish','Opening: checklists, briefing, specials and the 86 board. Service: seat, serve, communicate. Closing: reset every station so the next shift walks into a clean start. Brigly’s Today screen follows this order on purpose.',{image:'brigly-dining-room',caption:'The dining room before doors open. Every table set the same way, every time.'}),
     L('l-w3','text','Brigly in five minutes','Today shows your shift, the briefing and what needs you. Checklists are your station’s tasks for this service. Stock is where you report an 86 or request supplies. Team chat replaces the group text.\n\nRead and confirm every briefing before service: it tells you who is where, which guests to look after and what’s off the menu.',{takeaways:['Today → briefing → checklists','Report 86s in Stock, not in chat']}),
     L('l-w4','scenario','Your first rush','',{situation:'It’s 7:40 on a Friday. Three tables sat at once, the bar is backed up and a guest at table 4 is waving at you while you carry plates for table 8.',choices:[{text:'Drop the plates for table 8, then go straight to table 4.',outcome:'Right call. Finish what’s in your hands, then acknowledge the wave. Table 4 waits 40 seconds, not five minutes.',grade:'best'},{text:'Stop mid-floor and ask table 4 what they need while holding the plates.',outcome:'The food cools and table 8 watches you talk to someone else about their dinner. Finish the drop first.',grade:'ok'},{text:'Pretend not to see table 4 until the bar calms down.',outcome:'Guests always know when they’ve been seen and ignored. A quick “one moment” costs nothing.',grade:'bad'}]})
    ],
    quiz:{passMark:80,questions:[
     Q('q-w1','How quickly should every guest be acknowledged?',['Within 30 seconds','Within 5 minutes','When their drinks arrive','When they ask'],0,'Eye contact and “I’ll be right with you” count.'),
     Q('q-w2','Where do you confirm you read the shift briefing?',['On Today','In Stock','On the roster','In Reports'],0),
     Q('q-w3','A guest’s dish is cold. What do you do first?',['Fix it at the table, then tell a manager','Wait for a manager to decide','Offer a discount','Tell the kitchen it’s their fault'],0,'Fix first, report second.'),
     Q('q-w4','The bar is drowning and you have a free minute. You should…',['Help, then ask what else they need','Stay on your section no matter what','Post in team chat','Take a break'],0),
     Q('q-w5','Where do you report that a dish has sold out?',['Stock · 86 board','Team chat','Reservations','Happenings'],0)
    ]},
    practical:null,
    cards:[['86','An item that is sold out or cannot be served'],['Briefing','The pre-shift note from the manager that everyone confirms'],['Cover','One guest served during a service'],['Turn','Reset a table for the next party']],
    sequence:['Read and confirm the briefing','Run your opening checklist','Check specials and the 86 board','Service: seat, serve, communicate','Run your closing checklist','Leave a handover note']},
   {...base,id:'c-allergen',emoji:'🥜',cover:'brigly-kitchen-service',stage:'onboarding',title:'Allergens & food safety',description:'The 14 major allergens, cross-contact, the temperature danger zone and what to say to a guest. Required for everyone who touches food or takes an order.',audience:['Everyone'],required:true,minutes:25,xp:200,skill:'Allergen trained',order:2,prereq:'c-welcome',
    objectives:['Name the 14 allergens we track','Prevent cross-contact at every step','Answer an allergy question without guessing','Keep food out of the danger zone'],
    lessons:[
     L('l-a1','text','The allergens we track','Milk, eggs, fish, shellfish, tree nuts, peanuts, wheat, soy, sesame, celery, mustard, lupin, molluscs and sulphites.\n\nA reaction can start within minutes. Treat every allergy question as serious, even for a garnish.\n\nNever guess. “Let me check with the kitchen” is always the right answer.',{takeaways:['14 allergens, all serious','Never guess, always check']}),
     L('l-a2','text','Cross-contact','Cross-contact is when an allergen touches food that should be free of it: a shared fryer, a knife wiped on an apron, a spoon moved between pans.\n\n• Use the purple board and knives for allergy orders.\n• Change gloves and wash hands before plating an allergy dish.\n• Allergy tickets get a red flag at the pass and the server carries them, never a runner.',{takeaways:['Purple board, fresh gloves, fresh pan','The server carries allergy dishes']}),
     L('l-a3','image','The danger zone','Bacteria grow fastest between 41°F and 135°F (5°C and 57°C). Cold food stays below 41°F, hot food above 135°F. Log walk-in and reach-in temperatures at opening and closing, and never leave proteins on the line longer than two hours.',{image:'brigly-kitchen-service',caption:'Every station logs temperatures at opening. If a reading is off, tell the chef before you do anything else.'}),
     L('l-a4','scenario','“Is the risotto gluten-free?”','',{situation:'A guest at table 6 asks whether the squash risotto is gluten-free. You think it is, because risotto is rice.',choices:[{text:'Say “Let me check with the kitchen” and ask the chef about every ingredient, including the stock and the garnish.',outcome:'Exactly. Rice is gluten-free; the crispy topping may not be. The chef confirms, you flag the ticket, and the guest sees you take it seriously.',grade:'best'},{text:'Say yes, because risotto is made of rice.',outcome:'The breadcrumb crumble on top contains wheat. A guess like this is how reactions happen.',grade:'bad'},{text:'Suggest another dish to avoid the question.',outcome:'Safer than guessing, but the guest wanted the risotto. Check first; you can always suggest an alternative after.',grade:'ok'}]})
    ],
    quiz:{passMark:80,questions:[
     Q('q-a1','A guest asks if a dish contains nuts and you are not sure. You should…',['Check with the kitchen before answering','Say no if you can’t see any nuts','Ask the guest how allergic they are','Recommend a different dish'],0),
     Q('q-a2','Which of these is cross-contact?',['Frying gluten-free fries in the shared fryer','Serving a dish that lists wheat on the menu','Storing milk in the walk-in','Using a clean purple board'],0),
     Q('q-a3','The temperature danger zone is roughly…',['41°F to 135°F','0°F to 32°F','135°F to 165°F','Room temperature only'],0),
     Q('q-a4','Who carries an allergy ticket to the table?',['The server who took the order','Any runner','The host','The bartender'],0),
     Q('q-a5','Sesame is…',['One of the tracked allergens','Only a problem for children','Safe in small amounts','Not an allergen'],0),
     Q('q-a6','Before plating an allergy dish you should…',['Change gloves and wash hands','Wipe the knife on a towel','Use the same pan to save time','Ask the guest to sign a form'],0)
    ]},
    practical:P('Allergy order walk-through',['Take a mock allergy order and repeat the allergen back to the guest','Flag the ticket and tell the pass out loud','Use the purple board, clean gloves and a fresh pan','Carry the dish to the table yourself and name the allergen again'],'Done on a quiet shift with the chef or a manager watching.',{trainers:true,roles:['Head chef'],people:[]}),
    cards:[['Cross-contact','Allergen transferred by shared tools, oil or hands'],['Danger zone','41–135°F, where bacteria grow fastest'],['Purple board','The board and knives reserved for allergy orders'],['Sulphites','Allergen found in wine, dried fruit and some sauces'],['Red flag','Mark on a ticket that tells the pass it is an allergy order']],
    sequence:['Guest mentions an allergy','Repeat the allergen back to the guest','Check every ingredient with the kitchen','Flag the ticket at the pass','Plate with the purple board and fresh gloves','Carry it to the table yourself']},
   {...base,id:'c-service',emoji:'🍽️',cover:'brigly-table-welcome',stage:'core',title:'Steps of service',description:'From the greeting to the goodbye: the Copper Room sequence, timing targets and how to read a table.',audience:['Server','Host'],required:true,minutes:30,xp:220,skill:'Server',order:3,prereq:'c-welcome',
    objectives:['Run the six steps in order with the timing targets','Set a table to the standard','Read a table before they wave','Handle a split check without stress'],
    lessons:[
     L('l-s1','text','The sequence','1. Greet within 30 seconds, water on the table.\n2. Drinks order within 2 minutes; drinks down within 5.\n3. Specials and the 86 list before the food order.\n4. Fire courses with the kitchen; check back two minutes after each drop.\n5. Clear together, offer dessert and coffee.\n6. Present the check when asked, close within 3 minutes, say goodbye by name.',{takeaways:['Greet 30 s · drinks 5 min · check 3 min','Specials and 86s before the food order']}),
     L('l-s2','image','Setting the table','Fork left, knife right with the blade in, water glass above the knife, wine glass to its right. Menus stand in the host’s hand, never on the table before the guest sits.',{image:'brigly-table-welcome',caption:'Table 4 set for the Bennetts’ anniversary. Note the card by the water glass.'}),
     L('l-s3','video','Reading the table','A four-minute walk-through of body language: the glance toward the door, the closed menu, the empty glass. Watch for the tells that a table needs you before they wave.',{url:'',takeaways:['Closed menu = ready to order','Glance to the door = check time']}),
     L('l-s4','scenario','The split check','',{situation:'A party of six asks for separate checks after dessert, during the busiest part of the night. Two of them have already left.',choices:[{text:'Say “Of course”, ask who had what, and split it at the POS while a teammate watches your other tables.',outcome:'Right. A calm yes and a quick handoff keeps the table happy and your section covered.',grade:'best'},{text:'Explain that split checks aren’t possible this late.',outcome:'We can always split a check. Saying no turns a good night into a review.',grade:'bad'},{text:'Split it evenly six ways to save time.',outcome:'Fast, but two people didn’t drink and will notice. Ask first.',grade:'ok'}]})
    ],
    quiz:{passMark:80,questions:[
     Q('q-s1','Drinks should be on the table within…',['5 minutes','10 minutes','15 minutes','Whenever the bar is ready'],0),
     Q('q-s2','When do you mention specials and the 86 list?',['Before taking the food order','After the food arrives','Only if asked','At the end'],0),
     Q('q-s3','How soon after a course lands do you check back?',['About two minutes','Ten minutes','When they finish','Never, let them eat'],0),
     Q('q-s4','Where does the water glass go?',['Above the knife','Above the fork','Centre of the setting','Left of the plate'],0),
     Q('q-s5','A guest asks for the check. You close it within…',['3 minutes','10 minutes','When the kitchen is quiet','After the next table is seated'],0)
    ]},
    practical:P('Run a full table',['Greet, water and drinks inside the timing targets','Present specials and the 86 list unprompted','Fire and check back on two courses','Close the check and say goodbye by name'],'Shadowed by a trainer on a real table during a quiet service.'),
    cards:[['Check back','Return two minutes after a course lands'],['Fire','Tell the kitchen to start a course'],['Drop','Deliver food or drinks to a table'],['Close','Settle the check and say goodbye']],
    sequence:['Greet and water within 30 seconds','Take the drinks order','Specials and the 86 list','Take the food order and fire','Check back after each course','Clear, offer dessert and coffee','Present and close the check','Say goodbye by name']},
   {...base,id:'c-wine',emoji:'🍷',cover:'brigly-wine-comparison',stage:'advanced',title:'Wine & pairing basics',description:'The six bottles we pour by the glass, how to describe them in one sentence each and what to pair with the autumn menu.',audience:['Server','Bartender'],required:false,minutes:20,xp:160,skill:'',order:4,prereq:'c-service',
    objectives:['Describe each by-the-glass wine in one sentence','Pair every main with a glass','Present and pour a bottle correctly','Spot a corked or cooked bottle'],
    lessons:[
     L('l-v1','image','The by-the-glass list','Sancerre: crisp, citrus, pairs with the halibut. Chablis: lean and mineral, oysters. Pinot Noir: red fruit, light, duck and the mushroom risotto. Côtes du Rhône: warm spice, the lamb. Malbec: dark fruit, the ribeye. Prosecco: happy hour and dessert.',{image:'brigly-wine-comparison',caption:'Hold the glass by the stem when you present, label facing the guest.'}),
     L('l-v2','text','Describing a wine in one sentence','Guests want confidence, not a lecture. Name a flavour, a texture and a pairing: “The Pinot is light with red cherry; it’s lovely with the duck.” If someone asks something you don’t know, say so and offer a taste.\n\nPresent the bottle label-out, pour a taste for the host, then clockwise, ladies first only if the table clearly expects it.',{takeaways:['Flavour + texture + pairing','Offer a taste when unsure']}),
     L('l-v3','text','Corked, cooked or just not for them','Corked smells like wet cardboard; cooked tastes flat and jammy. Both get replaced, no questions. If a guest simply doesn’t like it, offer to swap for a glass of something else and tell a manager, who decides on the bottle.')
    ],
    quiz:{passMark:70,questions:[
     Q('q-v1','Which wine pairs with the halibut?',['Sancerre','Malbec','Côtes du Rhône','Prosecco'],0),
     Q('q-v2','A corked wine smells like…',['Wet cardboard','Fresh fruit','Vinegar','Nothing'],0),
     Q('q-v3','Who tastes the wine first?',['The host who ordered it','The youngest guest','Whoever is closest','Nobody, just pour'],0),
     Q('q-v4','A guest dislikes the wine but it isn’t faulty. You…',['Offer a swap and tell a manager','Insist it is fine','Replace the bottle without telling anyone','Charge for both'],0)
    ]},
    practical:null,
    cards:[['Sancerre','Crisp, citrus, pairs with the halibut'],['Pinot Noir','Light, red cherry, pairs with the duck'],['Corked','Faulty wine smelling of wet cardboard'],['Malbec','Dark fruit, pairs with the ribeye']],
    sequence:['Present the bottle label-out','Open at the table','Pour a taste for the host','Wait for the nod','Pour clockwise','Top up before glasses empty']},
   {...base,id:'c-complaints',emoji:'💬',cover:'brigly-service-editorial',stage:'advanced',title:'Turning a complaint around',description:'LAST: listen, apologise, solve, thank. Practise the conversations that matter, including the ones you can’t fix.',audience:['Server','Host','Bartender','Managers'],required:false,minutes:15,xp:140,skill:'',order:5,
    objectives:['Use LAST in every complaint','Know what you can offer without asking','Give real wait times, never guesses'],
    lessons:[
     L('l-c1','text','LAST','Listen without interrupting. Apologise for the experience, not for blame. Solve it at the table, then tell a manager. Thank them for telling you.\n\nWhat you can offer without asking: a replacement dish, a drink while they wait, dessert on the house. What needs a manager: comping a main, a refund, anything about another guest.',{takeaways:['Listen · Apologise · Solve · Thank','Refunds and comped mains need a manager']}),
     L('l-c2','scenario','The long wait','',{situation:'Table 9 has waited 35 minutes for mains on a packed night. The guest says, politely but firmly, “We’re about to walk out.”',choices:[{text:'Apologise, go straight to the pass for a real time, come back with the answer and a round of drinks on us.',outcome:'This is LAST in action. A true time and a gesture keeps the table and the tip.',grade:'best'},{text:'Explain that the kitchen is slammed tonight and it isn’t your fault.',outcome:'True, and completely useless to the guest. They don’t need the reason, they need the food.',grade:'bad'},{text:'Say “It’ll be two minutes” to calm them down.',outcome:'If it’s not two minutes you have made it worse. Never guess a time.',grade:'ok'}]}),
     L('l-c3','scenario','The guest who is wrong','',{situation:'A guest insists they ordered the ribeye medium-rare. The ticket says medium-well. The steak is exactly medium-well.',choices:[{text:'“I’m sorry, let me get that fixed for you,” refire it, and tell a manager it was a miscommunication.',outcome:'Nobody wins an argument with a guest. A refire costs us a steak; an argument costs the table.',grade:'best'},{text:'Show the guest the ticket to prove they said medium-well.',outcome:'You may be right. You will also be remembered as the server who argued over a steak.',grade:'bad'},{text:'Offer a discount on the steak as it is.',outcome:'They still have a steak they didn’t want. Refire first, discounts are the manager’s call.',grade:'ok'}]})
    ],
    quiz:{passMark:75,questions:[
     Q('q-c1','The A in LAST stands for…',['Apologise','Argue','Ask','Accept'],0),
     Q('q-c2','Which of these can you offer without a manager?',['A drink while they wait','A refund','Comping a main','A free bottle of wine'],0),
     Q('q-c3','A guest asks how long their food will take. You…',['Check at the pass and give a real time','Say two minutes','Say you don’t know','Blame the kitchen'],0),
     Q('q-c4','Who decides on a refund?',['A manager','The server','The guest','The chef'],0)
    ]},
    practical:null,
    cards:[['Listen','Let the guest finish before you respond'],['Comp','Remove a charge from the check; a manager decides'],['Refire','Cook a dish again from scratch']],
    sequence:['Listen without interrupting','Apologise for the experience','Solve it at the table','Tell a manager','Thank them for telling you']},
   {...base,id:'c-door',emoji:'🚪',cover:'brigly-restaurant-frontage',stage:'core',title:'The front door',description:'Reservations, the wait list, seating logic and the welcome that sets the tone for the whole visit.',audience:['Host'],required:true,minutes:18,xp:160,skill:'Host',order:6,prereq:'c-welcome',
    objectives:['Welcome every arrival before they reach the stand','Quote waits honestly','Seat without overloading one server','Handle a no-show by the policy'],
    lessons:[
     L('l-d1','text','The welcome','Stand, smile, greet before they reach the stand. Use the name on the booking. If the table isn’t ready, give a real time and offer the bar.\n\nWalk-ins get the same welcome as bookings. Quote waits honestly: a 20-minute wait that takes 15 is a win; a 10-minute quote that takes 25 is a complaint.',{takeaways:['Greet before they reach the stand','Over-quote the wait, never under']}),
     L('l-d2','text','Seating logic','Spread parties across sections so no server gets three tables at once. Keep two-tops for pairs. Large parties sit near the back room. Note every request in Brigly’s reservation notes so the server sees it without asking.\n\nBrigly’s Reservations screen shows the live table status: tap a booking to seat it, then it turns green on the floor view.'),
     L('l-d3','scenario','The no-show table','',{situation:'It’s 7:15. The 7:00 party of four hasn’t arrived or called, and a walk-in party of four is waiting at the bar.',choices:[{text:'Call the booking once, wait until 7:20, then seat the walk-in and mark the booking a no-show.',outcome:'Our policy: 15 minutes and a call. You filled the table and kept it fair.',grade:'best'},{text:'Seat the walk-in immediately.',outcome:'The booking walks in at 7:16 to find their table gone. Call first.',grade:'bad'},{text:'Hold the table all night in case they come.',outcome:'An empty four-top on a Friday costs real money. Call, wait, release.',grade:'ok'}]})
    ],
    quiz:{passMark:80,questions:[
     Q('q-d1','How long do we hold a booking before marking a no-show?',['15 minutes, after a call','5 minutes','An hour','Until closing'],0),
     Q('q-d2','Where do you write a guest’s special request?',['The reservation notes in Brigly','A sticky note at the stand','Tell the server verbally','Nowhere'],0),
     Q('q-d3','Quoting a wait, you should…',['Round up and be honest','Say ten minutes to keep them','Not quote at all','Send them away'],0),
     Q('q-d4','Three parties arrive together. You should…',['Spread them across sections','Seat them all in one section','Seat only bookings','Ask them to wait at the bar'],0)
    ]},
    practical:P('Run the door for a service',['Greet every arrival before they reach the stand','Seat bookings against the floor plan without double-seating a section','Quote and update two waits honestly','Record one guest note that the server uses'],'A manager or trainer watches the first hour of a service.'),
    cards:[['No-show','A booking that never arrived; released after 15 minutes and a call'],['Two-top','A table for two'],['Double seating','Giving one server several new tables at once']],
    sequence:['Greet before they reach the stand','Find the booking by name','Quote the wait honestly if needed','Seat against the floor plan','Hand menus and introduce the server','Update the table status in Brigly']},
   {...base,id:'c-cocktails',emoji:'🍸',cover:'brigly-bar-preparation',stage:'core',title:'Classic cocktails',description:'The ten drinks we are asked for every night, specs, glassware and the house twists.',audience:['Bartender'],required:true,minutes:35,xp:240,skill:'Bartender',order:7,prereq:'c-welcome',
    objectives:['Set the well the same way every day','Make the six classics to spec from memory','Know when to shake, stir or build'],
    lessons:[
     L('l-b1','image','Setting the well','Speed rail left to right: vodka, gin, rum, tequila, bourbon, triple sec. Garnish tray prepped before doors, ice wells full, every tin and strainer in its spot. A clean well is a fast well.',{image:'brigly-bar-preparation',caption:'Noah’s well before Friday dinner. Everything within one arm’s reach.'}),
     L('l-b2','text','The specs','Old Fashioned: 2 oz bourbon, ¼ oz demerara syrup, 2 dashes Angostura, orange twist, rocks.\nNegroni: 1 oz gin, 1 oz Campari, 1 oz sweet vermouth, stirred, orange peel.\nMargarita: 2 oz tequila, 1 oz lime, ¾ oz triple sec, shaken, salt rim optional.\nDaiquiri: 2 oz white rum, 1 oz lime, ¾ oz simple, shaken, coupe.\nWhiskey Sour: 2 oz bourbon, 1 oz lemon, ¾ oz simple, egg white, dry shake then shake.\nHouse spritz: 3 oz prosecco, 2 oz Aperol, 1 oz soda, orange slice.',{takeaways:['Negroni is equal parts, stirred','Sour gets a dry shake first']}),
     L('l-b3','text','Shake, stir, build','Shake anything with citrus, juice, dairy or egg. Stir spirit-only drinks so they stay clear and silky. Build long drinks in the glass over ice. Taste with a straw before every new batch of syrup.')
    ],
    quiz:{passMark:80,questions:[
     Q('q-b1','A Negroni is…',['Stirred','Shaken','Built in the glass','Blended'],0),
     Q('q-b2','Which drink gets a dry shake first?',['Whiskey Sour','Negroni','Old Fashioned','Spritz'],0,'The egg white needs a shake without ice to foam.'),
     Q('q-b3','How much lime in a Daiquiri?',['1 oz','½ oz','2 oz','None'],0),
     Q('q-b4','You shake a drink when it contains…',['Citrus, juice, dairy or egg','Only spirits','Soda','Vermouth'],0),
     Q('q-b5','The house spritz uses…',['Prosecco, Aperol and soda','Gin, Campari and vermouth','Bourbon and bitters','Rum and lime'],0)
    ]},
    practical:P('Five drinks, five minutes',['Make an Old Fashioned, Negroni, Margarita, Daiquiri and Whiskey Sour to spec','Finish all five inside five minutes','Correct glassware and garnish on each','Well left clean and restocked'],'Timed by a trainer or the bar manager.'),
    cards:[['Dry shake','Shake without ice so egg white foams'],['Speed rail','The row of house spirits in front of the bartender'],['Coupe','Stemmed, shallow glass for shaken drinks served up'],['Build','Make a drink directly in the serving glass']],
    sequence:['Chill the glass','Measure every pour with a jigger','Add ice to the tin','Shake or stir','Strain into the glass','Garnish and serve']},
   {...base,id:'c-alcohol',emoji:'🪪',cover:'brigly-bar-preparation',stage:'core',title:'Responsible alcohol service',description:'ID checks, signs of intoxication, how to cut someone off kindly and what the law expects of you.',audience:['Bar','Server','Managers'],required:true,minutes:20,xp:180,skill:'',order:8,prereq:'c-welcome',
    objectives:['Check ID for anyone who looks under 30','Spot the signs and act on two','Cut someone off with care and a manager'],
    lessons:[
     L('l-r1','text','Check every ID that looks under 30','Accept a driver’s licence, passport or state ID. Check the photo, the date of birth and the expiry. Feel the card. If anything is off, say “I can’t accept this ID” and offer a soft drink. A manager backs you every time.',{takeaways:['Under 30 → check','Photo, date, expiry, feel']}),
     L('l-r2','text','Signs and the cut-off','Slurred speech, loud or slow, spilling, losing balance, over-friendly or aggressive. One sign: slow down and offer water and food. Two signs: tell a manager and stop serving alcohol.\n\nCut someone off with care: “I can’t serve you any more alcohol tonight, but I’d love to get you some water or food.” Never argue; get a manager. Offer to call a cab.',{takeaways:['One sign: slow down','Two signs: stop and tell a manager']}),
     L('l-r3','scenario','The birthday table','',{situation:'A guest at a birthday table of eight is swaying and has knocked over a glass. Her friends laugh and order another round of shots.',choices:[{text:'Bring water for the table, tell a manager, and serve the round without a shot for her.',outcome:'Two signs means she is done. Everyone else can continue, and the manager is already aware.',grade:'best'},{text:'Serve the round; it’s a birthday and her friends are looking after her.',outcome:'Serving a visibly intoxicated guest is illegal, and we are liable for what happens after she leaves.',grade:'bad'},{text:'Refuse the whole table any more alcohol.',outcome:'Only one guest showed signs. Punishing the table creates a scene you don’t need.',grade:'ok'}]})
    ],
    quiz:{passMark:100,questions:[
     Q('q-r1','You check ID for anyone who looks under…',['30','21','25','40'],0),
     Q('q-r2','A guest shows two signs of intoxication. You…',['Stop serving alcohol and tell a manager','Serve one more then stop','Ask them to leave','Serve water with the next drink'],0),
     Q('q-r3','An ID feels wrong but the photo matches. You…',['Decline it and offer a soft drink','Accept it','Ask for a second opinion from the guest','Serve one drink only'],0),
     Q('q-r4','When cutting someone off you should…',['Stay kind, offer water and food, get a manager','Explain the law in detail','Take their drink away','Tell their friends'],0)
    ]},
    practical:null,
    cards:[['Two signs','Stop serving alcohol and tell a manager'],['Valid ID','Driver’s licence, passport or state ID, unexpired'],['Dram shop','Laws that make the venue liable for over-serving']],
    sequence:['Notice the first sign','Slow the service down','Offer water and food','Spot a second sign','Tell a manager','Stop serving alcohol kindly']},
   {...base,id:'c-mise',emoji:'🔪',cover:'brigly-kitchen-service',stage:'core',title:'Station setup & mise en place',description:'How every station is built before service, the prep sheet, labelling and the two-hour rule.',audience:['Kitchen'],required:true,minutes:25,xp:200,skill:'Line cook',order:9,prereq:'c-welcome',
    objectives:['Build your station to the diagram in 45 minutes','Label, date and rotate every container','Read and tick off the prep sheet','Request stock before it runs out'],
    lessons:[
     L('l-k1','image','Build the station the same way every day','Sixth pans in the same slots, towels folded, sanitizer bucket at 200 PPM, tools on the right. When you can find anything with your eyes closed, you are ready for a rush.',{image:'brigly-kitchen-service',caption:'Sauté station at 4:30. Tape and marker on every container.'}),
     L('l-k2','text','Label, date, rotate','Every container: item, date made, initials. First in, first out, no exceptions. Anything older than its shelf life goes in the bin and on the prep sheet.\n\nThe two-hour rule: nothing sits in the danger zone on the line longer than two hours. Swap pans from the reach-in instead of topping up.',{takeaways:['Item · date · initials on everything','Swap pans, never top up']}),
     L('l-k3','text','The prep sheet','Read it before you touch a knife. Pull proteins for the first seating, start long jobs first (stocks, braises), then the knife work. Tick off as you go so the chef can see the picture without asking. Request stock in Brigly the moment you open the last case of anything.')
    ],
    quiz:{passMark:80,questions:[
     Q('q-k1','Every labelled container shows…',['Item, date and initials','Just the item','Item and price','The chef’s name'],0),
     Q('q-k2','FIFO means…',['First in, first out','Fast in, fast out','Fry it, flip it, oil','Finish, inspect, file, organise'],0),
     Q('q-k3','A pan has been on the line for two hours. You…',['Swap it for a fresh pan from the reach-in','Top it up','Leave it until it’s empty','Move it to the back'],0),
     Q('q-k4','Sanitizer buckets are tested at…',['200 PPM','50 PPM','1000 PPM','Any strength'],0),
     Q('q-k5','When do you request stock in Brigly?',['When you open the last case','When it runs out','On Mondays','Never, the chef does it'],0)
    ]},
    practical:P('Build a station from empty',['Full station built to the diagram in 45 minutes','Every container labelled and dated','Sanitizer tested and logged','Prep sheet ticked off and stock request sent'],'Checked by the head chef before the first ticket.',{trainers:true,roles:['Head chef'],people:[]}),
    cards:[['Mise en place','Everything in its place before service starts'],['Sixth pan','The small insert pan used on the line'],['FIFO','First in, first out rotation'],['Two-hour rule','Nothing sits in the danger zone on the line over two hours']],
    sequence:['Read the prep sheet','Pull proteins for the first seating','Start the long jobs','Knife work and portioning','Label, date and initial every pan','Build the line to the diagram','Test the sanitizer bucket']},
   {...base,id:'c-temps',emoji:'🌡️',cover:'brigly-kitchen-service',stage:'core',title:'Temperature logs & HACCP',description:'The log, the limits, what to do when a reading is wrong and how the health inspector reads our records.',audience:['Kitchen','Managers'],required:true,minutes:15,xp:150,skill:'',order:10,
    objectives:['Log every reading as you take it','Know the cooking temperatures by heart','Act fast when a fridge reads high'],
    lessons:[
     L('l-t1','text','The log','Walk-in and every reach-in at opening and closing. Cooking temperatures on every protein: chicken 165°F, ground beef 155°F, fish and steak 145°F, reheats to 165°F. Write it down as you check it. A log filled in at the end of the night is a story, not a record.',{takeaways:['Chicken 165 · beef 155 · fish 145','Write it as you check it']}),
     L('l-t2','text','When a reading is wrong','Walk-in above 41°F: tell the chef immediately, check the door seal, move dairy and proteins to a reach-in, log the time. Food above 41°F for more than four hours is thrown out. The chef decides; you report.')
    ],
    quiz:{passMark:80,questions:[
     Q('q-t1','Chicken is cooked to…',['165°F','145°F','135°F','120°F'],0),
     Q('q-t2','When do you fill in the temperature log?',['As you check each reading','At the end of the night','Once a week','When the inspector comes'],0),
     Q('q-t3','The walk-in reads 46°F at opening. First, you…',['Tell the chef and move proteins to a reach-in','Close the door and wait','Throw everything out','Note it and carry on'],0),
     Q('q-t4','Food held above 41°F for more than four hours is…',['Thrown out','Reheated','Served quickly','Frozen'],0)
    ]},
    practical:null,
    cards:[['165°F','Safe cooking temperature for chicken and reheats'],['HACCP','The system of checks that keeps food safe at each step'],['41°F','Upper limit for cold holding']],
    sequence:['Walk-in reads above 41°F','Tell the chef immediately','Check the door seal','Move dairy and proteins to a reach-in','Log the time and reading','Chef decides what is kept']},
   {...base,id:'c-plating',emoji:'🎨',cover:'brigly-seasonal-menu',stage:'advanced',title:'Plating standards',description:'Every plate leaves the pass looking like the photo. Portions, placement and the wipe.',audience:['Kitchen'],required:false,minutes:12,xp:120,skill:'',order:11,prereq:'c-mise',
    objectives:['Plate to the reference photo every time','Portion by the scale, not by eye'],
    lessons:[
     L('l-p1','image','The reference plate','Protein at six o’clock, starch at ten, vegetables at two. Sauce under, not over. Wipe the rim before it goes up. If it doesn’t look like the photo, it doesn’t go.',{image:'brigly-seasonal-menu',caption:'The squash risotto as it should leave the pass.'}),
     L('l-p2','text','Portions','Use the scale for proteins and the scoop sizes on the chart. Over-portioning costs us margin; under-portioning costs us guests. Both are mistakes.')
    ],
    quiz:{passMark:70,questions:[
     Q('q-p1','Protein sits at…',['Six o’clock','Twelve o’clock','The centre','Wherever fits'],0),
     Q('q-p2','Before a plate goes up you…',['Wipe the rim','Add extra sauce','Cover it','Call the server'],0),
     Q('q-p3','Proteins are portioned by…',['The scale','Eye','The server’s request','The size of the plate'],0)
    ]},
    practical:null,cards:[['Six o’clock','Where the protein sits on the plate'],['Rim wipe','Cleaning the plate edge before it leaves the pass']],sequence:[]},
   {...base,id:'c-closing',emoji:'🔐',cover:'brigly-week-together',stage:'lead',title:'Closing lead',description:'Running the close: the walkthrough, the cash drop, the alarm and the handover note that sets up tomorrow.',audience:['Server','Bartender','Head chef','Managers'],required:false,minutes:20,xp:220,skill:'Closing lead',order:12,
    objectives:['Run a close in the right order','Count and drop cash with two signatures','Leave a handover note that sets up tomorrow'],
    lessons:[
     L('l-x1','text','The order of a close','1. Last table cleared, kitchen told “last call”.\n2. Closing checklists in Brigly for every station; you check them, you don’t do them all.\n3. Bar: Z-report, count the drawer, drop in the safe, two signatures.\n4. Walkthrough: gas off, fridges closed, taps capped, patio locked.\n5. Handover note on Today: what ran out, what broke, who was great.\n6. Alarm, lights, lock.',{takeaways:['You check the lists, you don’t do them all','Two people count, two people sign']}),
     L('l-x2','scenario','The drawer is short','',{situation:'The bar drawer is $38 short at close. The bartender is sure the count is right and wants to go home.',choices:[{text:'Recount together, check the Z-report for voids, log the difference in the daily close and tell the manager in the note.',outcome:'Right. Most shorts are a void or a mis-keyed tip. Log it, don’t accuse.',grade:'best'},{text:'Make it up from tips so the paperwork is clean.',outcome:'Never. A clean record of a short is fine; a hidden one is a firing offence.',grade:'bad'},{text:'Send the bartender home and recount alone.',outcome:'Two people count, two people sign. Keep them five more minutes.',grade:'ok'}]})
    ],
    quiz:{passMark:80,questions:[
     Q('q-x1','Who signs the cash drop?',['Two people','The closing lead alone','The bartender alone','Nobody'],0),
     Q('q-x2','The handover note goes…',['On Today for the next shift','In a text to the manager','On the fridge','Nowhere'],0),
     Q('q-x3','A $38 short at close is…',['Logged in the daily close and reported','Covered from tips','Ignored if small','Taken from the bartender’s pay'],0),
     Q('q-x4','As closing lead you…',['Check every station’s checklist','Do every task yourself','Only close the bar','Leave first'],0)
    ]},
    practical:P('Lead a close',['Every station’s closing checklist complete in Brigly','Cash drop counted and signed by two people','Walkthrough done with nothing missed','Handover note posted before leaving'],'A manager stays for your first two closes.',{trainers:true,roles:[],people:[]}),
    cards:[['Z-report','End-of-day sales report from the POS'],['Cash drop','Counted cash sealed and put in the safe'],['Walkthrough','The final check of every area before locking up']],
    sequence:['Last table cleared, last call to the kitchen','Check every station’s closing list','Z-report and count the drawer','Drop the cash with two signatures','Walkthrough: gas, fridges, taps, patio','Post the handover note','Alarm, lights, lock']},
   {...base,id:'c-briefing',emoji:'📣',cover:'brigly-week-together',stage:'lead',title:'Running a pre-shift briefing',description:'Three minutes that set up the whole service: what to cover, how to say it and how Brigly tracks who heard it.',audience:['Managers','Head chef'],required:false,minutes:10,xp:120,skill:'Opening lead',order:13,
    objectives:['Cover the five things every briefing needs','Keep it to three minutes','Post it in Brigly before you say it'],
    lessons:[
     L('l-m1','text','The three-minute briefing','Who is where. Reservations to know about. Specials and the 86 list. One thing to do better than yesterday. One thank-you.\n\nPost it in Brigly before you say it out loud, so the team can confirm they read it and late arrivals catch up without asking.',{takeaways:['Who · guests · menu · one focus · one thanks']}),
     L('l-m2','text','Make it land','Stand where everyone can see you. Ask one person a question (“Noah, what’s the happy hour tonight?”). Keep it to three minutes; if it needs longer, it’s a meeting, not a briefing.')
    ],
    quiz:{passMark:75,questions:[
     Q('q-m1','A briefing should take about…',['Three minutes','Fifteen minutes','As long as needed','Thirty seconds'],0),
     Q('q-m2','Why post the briefing in Brigly first?',['So everyone can confirm they read it','To save paper','Because it’s required by law','To replace saying it out loud'],0),
     Q('q-m3','A good briefing ends with…',['A thank-you','The schedule','A warning','Nothing'],0)
    ]},
    practical:null,cards:[['Acknowledge','Confirm in Brigly that you read the briefing']],sequence:['Post the briefing in Brigly','Who is where tonight','Guests to know about','Specials and the 86 list','One thing to do better','One thank-you']}
  ];
 }
 // The demo team: finished courses, one waiting for sign-off, one returned, XP across the last three weeks, games, duels and ratings.
 function seed(state){
  const s=upgrade(state),t=s.training;if(t.seeded===2)return s;
  const d=today(),fresh=!t.seeded;t.seeded=2;
  const created=B.addDays(d,-180)+'T09:00:00.000Z';
  if(!t.courses.length||fresh)t.courses=library(created).map(c=>({...c,qa:[]}));
  else for(const c of t.courses){const lib=library(created).find(x=>x.id===c.id);if(lib)for(const k of ['objectives','cover','stage','sequence','prereq'])if(c[k]===undefined||(Array.isArray(c[k])&&!c[k].length))c[k]=lib[k];if(c.createdAt>created)c.createdAt=created;}
  if(!fresh){seedExtras(s,d);return s;}
  const stamp=(daysAgo,h=15)=>new Date(new Date(B.addDays(d,-daysAgo)+'T12:00:00').getTime()+h*3600000).toISOString();
  const give=(pid,amount,reason,ref,daysAgo,h=15)=>{(t.xp[pid]||=[]).push({at:stamp(daysAgo,h),amount,reason,ref});};
  const done=(pid,cid,daysAgo,best=100,withPractical=true)=>{const c=course(s,cid);if(!c)return;const pr=(t.progress[pid]||={})[cid]={lessons:{}};
   c.lessons.forEach((l,i)=>{pr.lessons[l.id]=stamp(daysAgo+1,10+i);give(pid,XP.lesson,'Lesson · '+l.title,cid,daysAgo+1,10+i);});
   if(c.quiz?.questions?.length){const wrong=best===100?[]:c.quiz.questions.slice(0,Math.max(1,Math.round(c.quiz.questions.length*(1-best/100)))).map(q=>q.id);pr.quiz={best,attempts:best===100?1:2,passedAt:stamp(daysAgo,14),last:best,lastAt:stamp(daysAgo,14),history:best===100?[{at:stamp(daysAgo,14),score:100,wrong:[]}]:[{at:stamp(daysAgo,13),score:Math.max(0,best-30),wrong:wrong.concat(c.quiz.questions.slice(-1).map(q=>q.id))},{at:stamp(daysAgo,14),score:best,wrong}]};give(pid,XP.quizPass+(best===100?XP.quizPerfect:0),'Quiz · '+c.title,cid,daysAgo,14);}
   if(c.practical&&withPractical){const boss=s.team.find(p=>p.active&&p.access==='manager'&&p.id!==pid)?.id||s.managerId;pr.practical={status:'Approved',requestedAt:stamp(daysAgo,15),note:'',checked:c.practical.steps.map((x,i)=>i),by:boss,at:stamp(daysAgo,17),feedback:'Smooth. Keep it up.',tries:1};t.signoffs.push({course:cid,person:pid,by:boss,at:stamp(daysAgo,17),decision:'Approved'});give(pid,XP.practical,'Signed off · '+c.practical.title,cid,daysAgo,17);}
   if(!c.practical||withPractical){pr.completedAt=stamp(daysAgo,17);give(pid,c.xp,'Finished '+c.title,cid,daysAgo,17);if(c.skill&&s.business?.skills?.list?.includes(c.skill)){const lv=s.business.skills.levels[pid]||={};if((lv[c.skill]||0)<2)lv[c.skill]=2;}}};
  const started=(pid,cid,lessons,daysAgo)=>{const c=course(s,cid);if(!c)return;const pr=(t.progress[pid]||={})[cid]={lessons:{}};c.lessons.slice(0,lessons).forEach((l,i)=>{pr.lessons[l.id]=stamp(daysAgo,11+i);give(pid,XP.lesson,'Lesson · '+l.title,cid,daysAgo,11+i);});};
  const people=s.team.filter(p=>p.active),byRole=r=>people.filter(p=>p.role===r&&p.access==='crew');
  for(const p of people){const h=hash(p.id);
   if(p.access==='manager'){done(p.id,'c-welcome',40);done(p.id,'c-allergen',38);done(p.id,'c-alcohol',30);done(p.id,'c-briefing',20);done(p.id,'c-closing',25);continue;}
   if(p.id==='priya'){started(p.id,'c-welcome',2,1);continue;}
   done(p.id,'c-welcome',30+h%10,100);
   if(p.role==='Server'){done(p.id,'c-allergen',20+h%5,h%2?100:83);done(p.id,'c-service',12+h%6,h%3?100:80);if(h%2)started(p.id,'c-wine',1,2);}
   if(p.role==='Host'){done(p.id,'c-allergen',18,100);done(p.id,'c-door',9,100);started(p.id,'c-complaints',1,3);}
   if(p.role==='Bartender'){done(p.id,'c-allergen',22,83);done(p.id,'c-cocktails',15,100);done(p.id,'c-alcohol',14,100);started(p.id,'c-closing',1,2);}
   if(p.role==='Head chef'){done(p.id,'c-allergen',35,100);done(p.id,'c-mise',28,100);done(p.id,'c-temps',26,100);done(p.id,'c-plating',20,100);done(p.id,'c-briefing',10,100);}
   if(p.role==='Line cook'){done(p.id,'c-allergen',16,83);done(p.id,'c-mise',10,80);started(p.id,'c-temps',1,2);}
  }
  const waiter=byRole('Server')[0]||people.find(p=>p.access==='crew');
  if(waiter){const c=course(s,'c-allergen');if(c){const pr=(t.progress[waiter.id]||={})['c-allergen']||={lessons:{}};c.lessons.forEach((l,i)=>{pr.lessons[l.id]||=stamp(3,10+i);});pr.quiz||={best:100,attempts:1,passedAt:stamp(2,14),last:100,lastAt:stamp(2,14),history:[{at:stamp(2,14),score:100,wrong:[]}]};delete pr.completedAt;pr.practical={status:'Pending',requestedAt:stamp(1,16),note:'Did the walk-through with Sam on Tuesday lunch.',checked:[0,1,2,3],tries:1};t.signoffs=t.signoffs.filter(x=>!(x.course==='c-allergen'&&x.person===waiter.id));t.xp[waiter.id]=t.xp[waiter.id].filter(x=>!(x.ref==='c-allergen'&&/Signed off|Finished/.test(x.reason)));}}
  const cook=byRole('Line cook')[0];
  if(cook){const pr=(t.progress[cook.id]||={})['c-mise'];if(pr){const boss=s.team.find(p=>p.role==='Head chef'&&p.active)?.id||s.managerId;pr.practical={status:'Returned',requestedAt:stamp(5,15),note:'',checked:[0,1],by:boss,at:stamp(4,15),feedback:'Labels were missing initials on three pans. Run it again on Thursday.',tries:1};delete pr.completedAt;t.xp[cook.id]=t.xp[cook.id].filter(x=>!(x.ref==='c-mise'&&/Signed off|Finished/.test(x.reason)));t.signoffs=t.signoffs.filter(x=>!(x.course==='c-mise'&&x.person===cook.id));}}
  people.forEach((p,i)=>{const h=hash(p.id+'g');if(p.id==='priya')return;
   for(let k=0;k<3+h%3;k++){const ago=1+((h>>k)%12),correct=6+((h>>(k+2))%10),combo=2+((h>>k)%5);(t.games[p.id]||=[]).push({game:'speed',correct,total:correct+2,misses:0,bestCombo:combo,score:correct*XP.gameCorrect+combo*XP.gameCombo,at:stamp(ago,21)});give(p.id,correct*XP.gameCorrect+combo*XP.gameCombo,'Speed round · '+correct+' right','speed',ago,21);}
   if(h%2){const misses=1+h%6;(t.games[p.id]||=[]).push({game:'pairs',correct:6,total:6,misses,bestCombo:0,score:Math.max(10,60-misses*5),at:stamp(2,20)});give(p.id,Math.max(10,60-misses*5),'Pair up · '+misses+' misses','pairs',2,20);}
   if(h%3===1){(t.games[p.id]||=[]).push({game:'order',correct:5,total:6,misses:0,bestCombo:0,score:40,at:stamp(3,19)});give(p.id,40,'In order · 5 right','order',3,19);}
   for(let ago=0;ago<(i%3===0?8:4);ago++){if(ago===0&&h%3!==0)continue;(t.daily[p.id]||={})[B.addDays(d,-ago)]=true;give(p.id,XP.daily,'Question of the day','daily',ago,9);}
  });
  const boss=s.team.find(p=>p.active&&p.access==='manager')?.id||s.managerId;
  if(cook)t.assignments.push({id:'as-cook-1',course:'c-temps',person:cook.id,by:boss,at:stamp(6),due:B.addDays(d,-1),note:'Before the inspection.'});
  seedExtras(s,d);
  for(const list of Object.values(t.xp))list.sort((a,b)=>a.at.localeCompare(b.at));
  return s;
 }
 // Ratings, questions and duels that make the demo feel lived in.
 function seedExtras(s,d){
  const t=s.training,stamp=(daysAgo,h=15)=>new Date(new Date(B.addDays(d,-daysAgo)+'T12:00:00').getTime()+h*3600000).toISOString();
  const people=s.team.filter(p=>p.active),crew=people.filter(p=>p.access==='crew'),boss=people.find(p=>p.access==='manager');
  if(!t.ratings.length){const notes=['Short and useful. The scenario was spot on.','Wish there was a video of the full sequence.','Clear. I use the LAST steps every night now.','The specs page is my cheat sheet.','Good refresher before the inspection.'];let i=0;for(const [pid,courses] of Object.entries(t.progress))for(const cid of Object.keys(courses)){if(!courses[cid].completedAt||hash(pid+cid)%3)continue;t.ratings.push({course:cid,person:pid,stars:4+(hash(pid+cid)%2),comment:notes[i++%notes.length],at:courses[cid].completedAt});if(i>7)break;}}
  const ask=(cid,author,text,daysAgo,answer)=>{const c=course(s,cid);if(!c||c.qa.some(q=>q.text===text))return;c.qa.push({id:'qa-'+hash(cid+text),author,text,at:stamp(daysAgo,16),answer:answer?{author:boss?.id||s.managerId,text:answer,at:stamp(daysAgo-1,10)}:null});};
  const server=crew.find(p=>p.role==='Server'),bar=crew.find(p=>p.role==='Bartender'),cook=crew.find(p=>p.role==='Line cook');
  if(server)ask('c-allergen',server.id,'If a guest says “mild intolerance”, do we still flag the ticket?',6,'Yes. Every allergy or intolerance gets the red flag and the purple board. The kitchen decides nothing else.');
  if(bar)ask('c-cocktails',bar.id,'Do we salt-rim the Margarita by default or ask?',4,'Ask. Default is no rim, offer it when you take the order.');
  if(cook)ask('c-mise',cook.id,'Where do the sanitizer test strips live now?',2,null);
  if(!t.duels.length&&crew.length>=3){const a=crew[0],b=crew[1],c=crew[2];const qs=pid=>bank(s,pid).slice(0,5).map(q=>({course:q.course,id:q.id}));
   if(qs(a.id).length===5){t.duels.push({id:'duel-1',from:a.id,to:b.id,questions:qs(a.id),scores:{[a.id]:{correct:4,at:stamp(2,20),seconds:38},[b.id]:{correct:3,at:stamp(1,21),seconds:44}},status:'Done',at:stamp(2,20),settledAt:stamp(1,21),winner:a.id});(t.xp[a.id]||=[]).push({at:stamp(1,21),amount:XP.duelWin,reason:'Won a duel against '+b.name.split(' ')[0],ref:'duel'});(t.xp[b.id]||=[]).push({at:stamp(1,21),amount:XP.duelLose,reason:'Duel against '+a.name.split(' ')[0],ref:'duel'});}
   if(qs(c.id).length===5)t.duels.push({id:'duel-2',from:c.id,to:a.id,questions:qs(c.id),scores:{[c.id]:{correct:5,at:stamp(0,11),seconds:29}},status:'Open',at:stamp(0,11)});}
 }
 B.starter=(...args)=>seed(prev.starter(...args));
 B.load=storage=>seed(prev.load(storage));
 B.change=change;
 B.training={XP,levels,level,stages,lessonKinds,images,emojis,games,badges,defaults,settings,library,course,published,pathFor,progress,xp,ledger,streak,earned,leaderboard,challenge,canApprove,canAnswer,pending,bank,dailyQuestion,cards,sequences,rating,finishers,certificates,team,report,weekSeries,audienceOf,dueFor};
})();
