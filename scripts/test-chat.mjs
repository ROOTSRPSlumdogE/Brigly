import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const c=vm.createContext({crypto,console});for(const file of ['workspace-state','schedule-state','shift-operations-state','demo-history','restaurant-history','planner-state','duties-state','checklist-history','team-chat-state'])vm.runInContext(readFileSync(new URL('../assets/js/'+file+'.js',import.meta.url),'utf8'),c);
const B=c.Brigly,C=B.chat;
const as=(s,id)=>{const p=s.team.find(x=>x.id===id);s.role=p.access;if(p.access==='manager')s.managerId=id;else s.crewId=id;return s;};

// Private notes and to-dos from earlier versions become direct messages, keeping read and done state.
let s=B.starter('2026-10-25');
s.privateItems=[{id:'p1',author:'jamie',recipient:'alex',kind:'todo',body:'Restock your station',due:'2026-10-26',done:true,read:true,archived:false,created:'2026-10-24T10:00:00.000Z'},{id:'p2',author:'jamie',recipient:'mia',kind:'note',body:'Thank you for covering',due:'',done:false,read:false,archived:true,created:'2026-10-24T11:00:00.000Z'}];
const loaded=B.load({getItem:()=>JSON.stringify(s)});
assert(B.validState(loaded));assert(!('privateItems' in loaded));
const todo=loaded.chat.messages.find(m=>m.id==='private-p1');
assert.equal(todo.thread,C.dm('alex','jamie'));assert.equal(todo.kind,'todo');assert.equal(todo.todo.for,'alex');assert(todo.todo.done);
assert.equal(C.unread(loaded,'alex',todo.thread),0);assert.equal(C.unread(loaded,'mia',C.dm('jamie','mia')),1);
console.log('PASS: private notes and to-dos migrate into direct messages with read and done state.');

// Channels: everyone shares the team channel, stations hold their crew plus managers.
s=as(B.starter('2026-10-25'),'alex');
assert(C.members(s,'team').includes('noah'));
assert(C.members(s,'station:Floor').includes('alex')&&C.members(s,'station:Floor').includes('jamie')&&!C.members(s,'station:Floor').includes('noah'));
assert.equal(C.threads(s).map(t=>t.id).join(),'team,station:Floor');
assert.equal(C.threads(as(s,'jamie')).map(t=>t.id).join(),'team,station:Floor,station:Bar,station:Kitchen');
assert.throws(()=>B.change(as(s,'alex'),{type:'chat:send',id:'x',thread:'station:Bar',kind:'text',body:'Hi bar'}),/not part/);
console.log('PASS: team and station channel membership.');

// Messages, unread counts and read markers.
s=B.change(as(s,'alex'),{type:'chat:send',id:'m1',thread:'team',kind:'text',body:'  Running five minutes late  '});
assert.equal(s.chat.messages[0].body,'Running five minutes late');assert.equal(s.chat.messages[0].author,'alex');
assert.equal(C.unread(s,'alex','team'),0);assert.equal(C.unread(s,'noah','team'),1);
as(s,'noah');assert.equal(C.threads(s).find(t=>t.id==='team').unread,1);
s=B.change(s,{type:'chat:read',thread:'team'});assert.equal(C.unread(s,'noah','team'),0);
assert.throws(()=>B.change(s,{type:'chat:send',id:'m2',thread:'team',kind:'text',body:'   '}),/Write a message/);
assert.throws(()=>B.change(s,{type:'chat:send',id:'m1',thread:'team',kind:'text',body:'Duplicate'}),/already exists/);
console.log('PASS: sending, unread counts and read markers.');

// Direct messages stay between two people and appear once they have a message.
const dm=C.dm('noah','mia');
s=B.change(s,{type:'chat:send',id:'m3',thread:dm,kind:'text',body:'Can you swap Friday?'});
assert(C.threads(s).some(t=>t.id===dm));assert(!C.threads(as(s,'alex')).some(t=>t.id===dm));
assert.throws(()=>B.change(s,{type:'chat:send',id:'m4',thread:dm,kind:'text',body:'Let me in'}),/not part/);
assert.throws(()=>B.change(s,{type:'chat:read',thread:dm}),/not part/);
console.log('PASS: direct messages are private to their two members.');

// Photos and voice notes carry a media reference; to-dos come from managers and are checked off by their assignee.
s=B.change(as(s,'alex'),{type:'chat:send',id:'m5',thread:'team',kind:'image',body:'Spill by table 4',media:{id:'m5',width:1200,height:900}});
s=B.change(s,{type:'chat:send',id:'m6',thread:'station:Floor',kind:'voice',body:'',media:{id:'m6',duration:12.34}});
assert.equal(s.chat.messages.find(m=>m.id==='m6').media.duration,12.3);
assert.throws(()=>B.change(s,{type:'chat:send',id:'m7',thread:'team',kind:'image',body:'No photo'}),/Attach/);
assert.throws(()=>B.change(s,{type:'chat:send',id:'m8',thread:'team',kind:'todo',body:'Polish glasses'}),/Only managers/);
s=B.change(as(s,'jamie'),{type:'chat:send',id:'t1',thread:C.dm('jamie','alex'),kind:'todo',body:'Restock napkins',due:'2026-10-26'});
assert.equal(s.chat.messages.find(m=>m.id==='t1').todo.for,'alex');
s=B.change(s,{type:'chat:send',id:'t2',thread:'team',kind:'todo',body:'Check the patio heaters',for:'noah'});
assert.throws(()=>B.change(s,{type:'chat:send',id:'t3',thread:'station:Floor',kind:'todo',body:'Wrong station',for:'noah'}),/Choose someone/);
assert.equal(C.todos(as(s,'alex')).map(m=>m.id).join(),'t1');assert.equal(C.todos(as(s,'jamie')).map(m=>m.id).sort().join(),'t1,t2');
assert.throws(()=>B.change(as(s,'alex'),{type:'chat:todo',id:'t2'}),/Only Noah/);
s=B.change(as(s,'alex'),{type:'chat:todo',id:'t1'});const done=s.chat.messages.find(m=>m.id==='t1').todo;
assert(done.done&&done.by==='alex'&&done.doneAt);assert.equal(C.todos(s).length,0);
s=B.change(s,{type:'chat:todo',id:'t1'});assert(!s.chat.messages.find(m=>m.id==='t1').todo.done);
console.log('PASS: photos, voice notes and to-dos.');

// Crew remove their own messages; managers can remove any.
assert.throws(()=>B.change(as(s,'noah'),{type:'chat:delete',id:'m5'}),/your own/);
s=B.change(as(s,'alex'),{type:'chat:delete',id:'m5'});const removed=s.chat.messages.find(m=>m.id==='m5');
assert(removed.deleted&&!removed.media&&removed.body==='');
s=B.change(as(s,'jamie'),{type:'chat:delete',id:'m1'});assert(s.chat.messages.find(m=>m.id==='m1').deleted);
assert.throws(()=>B.change(s,{type:'chat:delete',id:'m1'}),/not found/);
console.log('PASS: removing messages.');

// Other actions still flow through the chain, and the workspace survives storage.
s=B.change(s,{type:'checklist:add',area:'Bar',list:'Opening',titles:'Check ice supply'});
assert(B.work.tasks(s).some(t=>t.title==='Check ice supply'));assert.equal(s.chat.messages.length,6);
const again=B.load({getItem:()=>JSON.stringify(s)});assert(B.validState(again));assert.equal(again.chat.messages.length,6);
const broken=JSON.parse(JSON.stringify(s));broken.chat.messages.push({id:'bad',thread:'team',author:'alex',at:'2026-10-25T10:00:00.000Z',kind:'image',body:'',media:{src:'https://example.com/x.png'}});
assert(!B.validState(broken));
console.log('PASS: action chain, storage round-trip and media validation.');

// Role channels: strictly role-specific, separating Servers from Head Servers, Bartenders, and other roles.
let rState=as(B.starter('2026-10-25'),'alex');
assert(C.members(rState,'role:Server').includes('alex')&&!C.members(rState,'role:Server').includes('noah')&&!C.members(rState,'role:Server').includes('jamie'));
assert.equal(C.threads(as(rState,'alex'),'crew',true).map(t=>t.id).join(),'team,station:Floor,role:Server');
assert.equal(C.threads(as(rState,'noah'),'crew',true).map(t=>t.id).join(),'team,station:Bar,role:Bartender');
rState=B.change(as(rState,'alex'),{type:'chat:send',id:'rm1',thread:'role:Server',kind:'text',body:'Server sidework done'});
assert.equal(rState.chat.messages.find(m=>m.id==='rm1').body,'Server sidework done');
assert.throws(()=>B.change(as(rState,'noah'),{type:'chat:send',id:'rm2',thread:'role:Server',kind:'text',body:'Sneak in'}),/not part/);
rState=B.change(as(rState,'jamie'),{type:'ops:catalog',catalog:'roles',name:'Head Server'});
rState=B.change(rState,{type:'ops:member',id:'kelly',name:'Kelly Head',role:'Head Server',area:'Floor',access:'crew',rate:22,active:true});
assert(!C.members(rState,'role:Server').includes('kelly')&&C.members(rState,'role:Head Server').includes('kelly'));
assert.throws(()=>B.change(as(rState,'kelly'),{type:'chat:send',id:'rm3',thread:'role:Server',kind:'text',body:'Head server note'}),/not part/);
rState=B.change(as(rState,'kelly'),{type:'chat:send',id:'rm4',thread:'role:Head Server',kind:'text',body:'Head server update'});
assert.equal(rState.chat.messages.find(m=>m.id==='rm4').body,'Head server update');
console.log('PASS: role-specific channels strictly isolate roles (e.g. Server vs Head Server).');
