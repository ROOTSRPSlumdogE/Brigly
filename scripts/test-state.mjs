import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const source=readFileSync(new URL('../assets/js/demo.js',import.meta.url),'utf8');
const setup=source.slice(source.indexOf("  'use strict';"),source.indexOf('  let state=load();'));
let stored=null,blocked=false;
const context=vm.createContext({localStorage:{getItem(){if(blocked)throw Error('Storage disabled');return stored;}}});
vm.runInContext(setup+'\n globalThis.testAPI={starter,validState,load};',context);
const api=context.testAPI;

assert.equal(api.validState(api.starter()),true);
for(const mutate of [
  d=>d.briefing.questions=null,
  d=>d.requests[0].quantity='<img>',
  d=>d.view='constructor',
  d=>d.academyDone=null,
  d=>d.checked=[1,1],
  d=>d.briefing.version=-1
]){
  const data=api.starter();
  mutate(data);
  assert.equal(Boolean(api.validState(data)),false);
  stored=JSON.stringify(data);
  assert.equal(api.load().view,'dashboard');
}

stored='{broken';
assert.equal(api.load().role,'employee');
blocked=true;
assert.equal(api.load().role,'employee');
blocked=false;

const edited=api.starter();
edited.briefing.version=2;
edited.role='manager';
stored=JSON.stringify(edited);
assert.equal(api.load().briefing.version,2);
assert.equal(api.load().role,'manager');
console.log('PASS: persisted state validation, malformed JSON recovery, unavailable storage, and valid revision restoration.');

const declined=api.starter();
declined.requests[0].status='declined';
stored=JSON.stringify(declined);
assert.equal(api.load().requests[0].status,'declined');

// Behavioral rendering checks for revision visibility, distinct Team vs Manager views, and interconnected modules.
const renderContext=vm.createContext({
  document:{getElementById(){return {};}},
  localStorage:{getItem(){return null;}}
});
const renderSetup=source.slice(source.indexOf("  'use strict';"),source.indexOf('  function setView('));
vm.runInContext(
  renderSetup+'\n globalThis.renderAPI={starter,overview,briefings,chat,checklists,schedule,supply,knowledgePage,academy,inbox,pendingCount,setState(d){state=d},setChannel(c){activeChannel=c}};',
  renderContext
);
const render=renderContext.renderAPI;

let sample=render.starter();
render.setState(sample);
assert.match(render.briefings(),/5 of 8 read/);
sample.briefing.version=2;
assert.match(render.briefings(),/0 of 8 read/);
sample.briefing.ackVersion=2;
assert.match(render.briefings(),/1 of 8 read/);

sample.briefing.status='editing';
sample.briefing.draft=[{id:10,category:'Service notes',title:'PRIVATE DRAFT ONLY',body:'Not yet published'}];
sample.role='employee';
assert.doesNotMatch(render.briefings(),/PRIVATE DRAFT ONLY/);
sample.role='manager';
assert.match(render.briefings(),/PRIVATE DRAFT ONLY/);

sample.messages.push({channel:'bar-team',sender:'Sample',initials:'ST',text:'<img src=x onerror=alert(1)>',time:'Demo'});
render.setChannel('general');
assert.doesNotMatch(render.chat(),/onerror/);
render.setChannel('bar-team');
assert.match(render.chat(),/&lt;img/);
assert.doesNotMatch(render.chat(),/<img src=x/);
console.log('PASS: revision counts, draft visibility, channel isolation and escaped message rendering.');

// Distinct Team Member vs Manager view verification across modules
const roleSample=render.starter();
render.setState(roleSample);
roleSample.role='employee';
assert.match(render.overview(),/MY SHIFT WORKSPACE/);
assert.match(render.schedule(),/My Schedule & Shift Swaps/);
assert.match(render.inbox(),/MY SUBMISSIONS & APPROVAL STATUS/);

roleSample.role='manager';
assert.match(render.overview(),/OPERATIONS COMMAND/);
assert.match(render.schedule(),/MANAGER ROSTER MATRIX/);
assert.match(render.inbox(),/MANAGER INBOX · UNIFIED DECISION QUEUE/);
assert.match(render.knowledgePage(),/Verify &amp; approve Squash Risotto/);
console.log('PASS: distinct Team Member vs Manager dashboards, schedules, knowledge controls, and approval queues.');

// Feedback survives a reload and renders as text, not executable markup.
const feedbackState=api.starter();
feedbackState.checklistStatus='rejected';
feedbackState.checklistNotes='<img src=x onerror=alert(1)> Recheck station';
stored=JSON.stringify(feedbackState);
assert.equal(api.load().checklistNotes,feedbackState.checklistNotes);
render.setState(api.load());
assert.match(render.checklists(),/Changes requested/);
assert.match(render.checklists(),/&lt;img/);
assert.doesNotMatch(render.checklists(),/<img src=x/);
console.log('PASS: correction feedback persistence and safe rendering.');
