(() => {
  'use strict';
  const STORAGE='brigly_site_concept_demo_v2_briefings';
  const menuLabels={dashboard:'Overview',shifts:'Shifts',briefings:'Briefings',checklists:'Checklists',chat:'Team chat',supply:'Supply requests',knowledge:'Knowledge',academy:'Academy',inbox:'Review inbox'};
  const checklist=['Sanitize bar counters and stations','Restock glassware and napkins','Inspect fresh garnishes','Check ice wells and equipment','Set up bar tools and garnishes','Review the evening service briefing'];
  const catalog=[
    {id:'limes',name:'Fresh limes',unit:'cases',department:'Bar',vendor:'Valley Produce'},
    {id:'napkins',name:'Cocktail napkins',unit:'packs',department:'Bar',vendor:'Metro Paper & Linen'},
    {id:'syrup',name:'Simple syrup',unit:'bottles',department:'Bar',vendor:'House Prep / Bar'},
    {id:'gloves',name:'Food-safe gloves',unit:'boxes',department:'Kitchen',vendor:'Metro Paper & Linen'},
    {id:'wine',name:'House white wine',unit:'bottles',department:'Bar',vendor:'Cellar Direct'},
    {id:'towels',name:'Bar towels',unit:'packs',department:'Bar',vendor:'Metro Paper & Linen'}
  ];
  const knowledge=[
    {id:'ribeye',title:'Ribeye Steak',type:'FOOD',verified:true,allergens:'Dairy (butter baste), Allium',pairing:'Cabernet Sauvignon, Syrah',description:'Sample service guidance: 12oz prime ribeye finished with herb butter. Explain the preparation method and check the restaurant-approved allergy record before answering dietary questions.',source:'Approved menu record · Verified by Kitchen Lead'},
    {id:'risotto',title:'Roasted Squash Risotto',type:'FOOD',verified:false,allergens:'Dairy (aged parmesan, brown butter) · Gluten-free prep',pairing:'Mosel Riesling, Pinot Gris',description:'Tonight’s seasonal special: carnaroli rice, roastedhoneynut squash, crispy sage, and browned butter. Verify dairy modification options with the kitchen pass before promising vegan prep.',source:'Imported seasonal draft · Awaiting manager verification'},
    {id:'old-fashioned',title:'House Old Fashioned',type:'COCKTAIL',verified:true,allergens:'None listed (check garnish)',pairing:'Charcuterie, Ribeye Steak',description:'2 oz bourbon, 0.25 oz rich demerara syrup (2:1), 2 dashes aromatic bitters, expressed orange peel over a clear king cube. Stir 30 revolutions for proper dilution.',source:'Approved beverage spec · Bar Bible v4'},
    {id:'riesling',title:'Mosel Riesling',type:'WINE',verified:true,allergens:'Contains sulfites',pairing:'Roasted Squash Risotto, Spicy Crudo',description:'Dry-style Kabinett with bright acidity, lime zest, white peach, and slate minerality. Primary recommendation while the house Pinot Grigio is running low.',source:'Approved wine note · Sommelier verified'},
    {id:'cabernet',title:'New Cabernet Sauvignon',type:'WINE',verified:true,allergens:'Contains sulfites',pairing:'Ribeye Steak, Braised Short Rib',description:'Paso Robles estate bottling added for Friday service. Blackcurrant, cedar, and fine-grained tannins. Available by the glass ($16) and bottle ($64).',source:'Approved wine note · Added Oct 23'},
    {id:'bar-open',title:'Bar Opening Procedure',type:'PROCEDURE',verified:true,allergens:'N/A — Operational SOP',pairing:'Bar Opening Checklist',description:'Sanitize speed rails and mats, verify ice wells are clean, prep citrus twists and dehydrates, log low-boy cooler temperature (must be under 4.0°C), and submit the opening checklist by 3:45 PM.',source:'Approved SOP · Operations Manual'},
    {id:'allergen-policy',title:'Allergen Response Protocol',type:'POLICY',verified:true,allergens:'Critical Food Safety Policy',pairing:'All FOH & BOH Roles',description:'Never promise an item is safe based on assumptions or memory. Check the current verified ingredient sheet, inform the floor manager, and ticket the allergy clearly for the kitchen pass.',source:'Mandatory safety policy · Management verified'},
    {id:'handover-sop',title:'Shift Handover Standard',type:'PROCEDURE',verified:true,allergens:'N/A — Operational SOP',pairing:'Briefings & Logbook',description:'Before clocking out, record 86’d items, late deliveries, equipment issues, and VIP notes in the Shift Debrief so tomorrow’s opening lead starts with full context.',source:'Approved SOP · Operations Manual'}
  ];
  const initialBriefingItems=()=>[
    {id:1,category:'Menu & beverages',title:'New Cabernet Sauvignon',body:'A new wine has been added to the approved beverage list. Review its tasting notes and service pairings before tonight’s service.'},
    {id:2,category:'Specials',title:'Ribeye special available',body:'Tonight’s ribeye special is available. Check the approved menu record for preparation details and allergy guidance.'},
    {id:3,category:'Supply notice',title:'House vodka running low',body:'Bar supply request is awaiting manager review. Check with the bar lead before promising substitute cocktails.'},
    {id:4,category:'Service notes',title:'Large party at 7:00 PM',body:'Coordinate section readiness with the shift lead. Guest details are only available to authorized roles.'}
  ];
  const initialMessages=()=>[
    {channel:'general',sender:'Sam · Bar lead',initials:'SJ',text:'Heads up! We have a new wine on the sample service briefing.',time:'3:42 PM'},
    {channel:'general',sender:'Jordan · Floor',initials:'JL',text:'I will review the notes before our shift starts.',time:'3:45 PM'},
    {channel:'general',sender:'Alex · Server',initials:'AL',text:'Thanks, just checked it. Ready for tonight!',time:'3:48 PM'},
    {channel:'friday-service',sender:'Jamie · Manager',initials:'JM',text:'Evening briefing v1 is live. Table 14 has the 8-top arriving at 7:00 PM — Jordan & Alex on section lead.',time:'3:20 PM'},
    {channel:'friday-service',sender:'Riley · Head Chef',initials:'RC',text:'We have 18 portions of the Ribeye special and 22 of the Roasted Squash Risotto tonight.',time:'3:34 PM'},
    {channel:'bar-team',sender:'Sam · Bar lead',initials:'SJ',text:'Put in a supply request for 2 cases of fresh limes. Using the Mosel Riesling as our main white pour alternative tonight.',time:'3:30 PM'},
    {channel:'front-of-house',sender:'Taylor · Host',initials:'TB',text:'Dining room tables 1–12 are set and polished. Patio heaters checked for early seating.',time:'3:40 PM'}
  ];
  const starter=()=>({
    role:'employee',
    view:'dashboard',
    briefing:{
      version:1,
      status:'published',
      items:initialBriefingItems(),
      draft:[],
      editId:null,
      ackVersion:0,
      questions:[{id:1,by:'Jordan · Server',text:'Will there be a pairing recommendation for the new Cabernet?',reply:'Yes. Use the approved tasting notes in Knowledge.',time:'3:42 PM'}],
      debrief:[{by:'Jamie · Manager',time:'Yesterday · 11:20 PM',text:'Patio tables reset for Friday. Check fresh lime delivery with morning receiver before 4 PM service.'}],
      publishedAt:'3:15 PM'
    },
    checked:[0,1],
    checklistStatus:'working',
    checklistNotes:'',
    checklistEvidence:'Sanitizer bucket tested (200 ppm) · Bar low-boy cooler at 3.7°C',
    requests:[
      {id:1,item:'limes',quantity:2,requester:'Sam · Bar',status:'pending'},
      {id:2,item:'napkins',quantity:3,requester:'Jordan · FOH',status:'pending'}
    ],
    messages:initialMessages(),
    academyDone:[false,false,false],
    skillSignedOff:false,
    draftVerified:false,
    openShiftAssigned:false,
    swapStatus:'none',
    selectedDay:4,
    events:[
      {text:'Evening briefing v1 published by Jamie · Manager',date:'3:15 PM'},
      {text:'Dining room opening checklist approved',date:'3:30 PM'},
      {text:'Sam · Bar requested 2 cases Fresh limes',date:'3:32 PM'},
      {text:'Sample workspace ready for exploration',date:'Demo'}
    ]
  });

  // Validate persisted data before using it in generated markup or workflows.
  function validState(d){
    if(!d || typeof d!=='object')return false;
    const text=x=>typeof x==='string'&&x.length<=1000;
    const num=x=>Number.isSafeInteger(x)&&x>=0;
    const rows=(a,check)=>Array.isArray(a)&&a.length<=1000&&a.every(x=>x&&check(x));
    const item=x=>num(x.id)&&text(x.category)&&text(x.title)&&text(x.body);
    const b=d.briefing;
    return ['employee','manager'].includes(d.role)&&Object.hasOwn(menuLabels,d.view)
      &&['working','submitted','approved','rejected'].includes(d.checklistStatus)
      &&['none','pending','approved','rejected'].includes(d.swapStatus)
      &&text(d.checklistNotes)&&num(d.selectedDay)&&d.selectedDay<7
      &&(d.checklistEvidence===undefined||text(d.checklistEvidence))
      &&(d.skillSignedOff===undefined||typeof d.skillSignedOff==='boolean')
      &&(d.draftVerified===undefined||typeof d.draftVerified==='boolean')
      &&(d.openShiftAssigned===undefined||typeof d.openShiftAssigned==='boolean')
      &&(d.closingChecked===undefined||(Array.isArray(d.closingChecked)&&d.closingChecked.every(num)))
      &&(d.closingStatus===undefined||['working','submitted','approved'].includes(d.closingStatus))
      &&(d.closingEvidence===undefined||text(d.closingEvidence))
      &&(d.fohChecked===undefined||(Array.isArray(d.fohChecked)&&d.fohChecked.every(num)))
      &&(d.kitchenChecked===undefined||(Array.isArray(d.kitchenChecked)&&d.kitchenChecked.every(num)))
      &&(d.rosterVersion===undefined||num(d.rosterVersion))
      &&(d.customShifts===undefined||(d.customShifts&&typeof d.customShifts==='object'&&!Array.isArray(d.customShifts)))
      &&(d.extraTasks===undefined||(d.extraTasks&&typeof d.extraTasks==='object'&&!Array.isArray(d.extraTasks)))
      &&Array.isArray(d.checked)&&d.checked.every(x=>num(x)&&x<20)
      &&new Set(d.checked).size===d.checked.length
      &&rows(d.requests,x=>num(x.id)&&catalog.some(c=>c.id===x.item)&&num(x.quantity)&&x.quantity>0&&x.quantity<=999&&text(x.requester)&&['pending','approved','declined'].includes(x.status))
      &&rows(d.messages,x=>text(x.sender)&&text(x.initials)&&text(x.text)&&text(x.time)&&(x.channel===undefined||text(x.channel)))
      &&Array.isArray(d.academyDone)&&d.academyDone.length===3&&d.academyDone.every(x=>typeof x==='boolean')
      &&rows(d.events,x=>text(x.text)&&text(x.date))&&b&&num(b.version)&&b.version>0
      &&['published','editing'].includes(b.status)&&num(b.ackVersion)&&text(b.publishedAt)
      &&(b.editId===null||num(b.editId))&&rows(b.items,item)&&rows(b.draft,item)
      &&rows(b.questions,x=>num(x.id)&&text(x.by)&&text(x.text)&&text(x.reply)&&text(x.time))
      &&rows(b.debrief,x=>text(x.by)&&text(x.time)&&text(x.text));
  }
  function load(){try{const data=JSON.parse(localStorage.getItem(STORAGE));if(validState(data))return {...starter(),...data};}catch(e){}return starter();}
  let state=load();
  let activeChannel='general';
  let activeKnowledgeFilter='ALL';
  let activeChecklistTab='bar-open';
  let activeRosterDept='ALL';
  let builderStaffIdx=6;
  let builderShiftPreset='17–23 · Bar';
  let toastTimer;

  const checklistCatalog={
    'bar-open':{
      id:'bar-open',
      phase:'OPENING · 15:00',
      kicker:'STATION 01 · BAR OPENING',
      title:'Bar opening · Friday evening',
      shortTitle:'Bar Opening',
      assignee:'Alex Morgan & Sam Kim',
      badge:'BAR',
      sopNote:'Bar coolers must read below 4.0°C prior to 4:00 PM service. Log any missing stock directly in Supply.',
      tasks:checklist
    },
    'bar-close':{
      id:'bar-close',
      phase:'CLOSING · 23:00',
      kicker:'STATION 01 · END-OF-NIGHT CLOSING',
      title:'Bar & floor closing · Friday night',
      shortTitle:'Bar & Floor Closing',
      assignee:'Sam Kim & Alex Morgan',
      badge:'CLOSE',
      sopNote:'Reconcile bar drawer, record safe drop envelope number, verify all coolers are under 4.0°C, and confirm patio heaters are shut off before lockup.',
      tasks:[
        'Break down & sanitize espresso machine and steam wands',
        'Burn ice wells, wipe speed rails, and cap all open spirits',
        'Count bar drawer, log safe drop, and lock high-value cellar',
        'Run final glasswasher cycle & restock clean coupe/rocks racks',
        'Record walk-in & low-boy closing temps (target < 4.0°C)',
        'Confirm patio heaters off, doors locked & alarm armed'
      ]
    },
    'foh-open':{
      id:'foh-open',
      phase:'OPENING · 15:15',
      kicker:'STATION 02 · DINING ROOM & HOST',
      title:'Dining room & host setup',
      shortTitle:'Dining Room Opening',
      assignee:'Jordan Lee & Taylor Brooks',
      badge:'FOH',
      sopNote:'Inspect all table settings 30 minutes prior to seating. Flag VIP tables and dietary notes on the host stand iPad.',
      tasks:[
        'Polish flatware, water carafes, and wine stems for Tables 1–18',
        'Align table settings, candles, and printed evening menus',
        'Sync reservation book & flag Table 14 (8-top VIP at 19:00)',
        'Inspect patio heaters, windscreens, and host stand iPad',
        'Stock server stations with linen napkins and check presenters',
        'Confirm allergen matrix & special counts with floor lead'
      ]
    },
    'kitchen-open':{
      id:'kitchen-open',
      phase:'OPENING · 15:30',
      kicker:'STATION 03 · KITCHEN PASS & TEMPS',
      title:'Kitchen pass & cold storage line check',
      shortTitle:'Kitchen Pass & Line',
      assignee:'Riley Chen · Head Chef',
      badge:'BOH',
      sopNote:'Walk-in and reach-in line coolers must be logged prior to 3:40 PM family meal and line tasting.',
      tasks:[
        'Calibrate probe thermometers & log walk-in cooler (3.4°C)',
        'Verify 18 Prime Ribeye portions & herb butter bain-marie',
        'Verify 22 Roasted Squash Risotto portions & vegan stock option',
        'Stock garnish pass, sani-buckets (200 ppm), and allergen tickets',
        'Conduct 15:40 line tasting with Head Chef Riley & GM Jamie'
      ]
    }
  };

  function getStationTasks(tabId){
    const base=checklistCatalog[tabId]?.tasks||checklist;
    const extras=Array.isArray(state.extraTasks?.[tabId])?state.extraTasks[tabId]:[];
    return [...base,...extras];
  }
  function getStationChecked(tabId){
    if(tabId==='bar-open')return state.checked;
    if(tabId==='bar-close')return Array.isArray(state.closingChecked)?state.closingChecked:[0,1,2];
    if(tabId==='foh-open')return Array.isArray(state.fohChecked)?state.fohChecked:[0,1,2,3,4,5];
    if(tabId==='kitchen-open')return Array.isArray(state.kitchenChecked)?state.kitchenChecked:[0,1,2,3,4];
    return [];
  }
  function setStationChecked(tabId,arr){
    if(tabId==='bar-open')state.checked=arr;
    else if(tabId==='bar-close')state.closingChecked=arr;
    else if(tabId==='foh-open')state.fohChecked=arr;
    else if(tabId==='kitchen-open')state.kitchenChecked=arr;
  }

  const el=document.getElementById('app-content');
  const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function persist(){try{localStorage.setItem(STORAGE,JSON.stringify(state));}catch(e){}}
  function nowTime(){return new Date().toLocaleTimeString([],{hour:'numeric',minute:'2-digit'});}
  function actLog(text){state.events.unshift({text,date:nowTime()});state.events=state.events.slice(0,30);persist();}
  function toast(msg){const t=document.getElementById('app-toast');if(!t)return;clearTimeout(toastTimer);t.textContent=msg;t.classList.add('show');toastTimer=setTimeout(()=>t.classList.remove('show'),3200);}
  const isManager=()=>state.role==='manager';
  const unansweredQuestions=()=>state.briefing.questions.filter(q=>!q.reply).length;
  const pendingCount=()=>state.requests.filter(x=>x.status==='pending').length
    + (state.checklistStatus==='submitted'?1:0)
    + (state.closingStatus==='submitted'?1:0)
    + (state.swapStatus==='pending'?1:0)
    + unansweredQuestions()
    + (!state.draftVerified?1:0)
    + (state.academyDone.every(Boolean)&&!state.skillSignedOff?1:0);

  const simpleButton=(label,view)=>`<button type="button" class="panel-link" data-goto="${view}">${label}</button>`;

  function formatTitle(eyebrow,title,subtitle,rightHtml=''){
    return `<div class="page-header-block">
      <div class="content-top">
        <div>
          <div class="section-eyebrow">${eyebrow}</div>
          <h1 class="page-title">${title}</h1>
          <p class="page-subtitle">${subtitle}</p>
        </div>
        ${rightHtml?`<div class="header-right-actions">${rightHtml}</div>`:''}
      </div>
    </div>`;
  }

  function overview(){
    const b=state.briefing;
    const acknowledged=b.ackVersion===b.version;
    const ackCount=(b.version===1?5:0)+(acknowledged?1:0);
    const openTasks=getStationTasks('bar-open');
    const remaining=Math.max(0,openTasks.length-state.checked.filter(i=>i<openTasks.length).length);
    const pendingSupply=state.requests.filter(r=>r.status==='pending');
    const approvedSupply=state.requests.filter(r=>r.status==='approved');
    const lessonsDone=state.academyDone.filter(Boolean).length;
    const pending=pendingCount();
    const cStatus=state.closingStatus||'working';
    const closeTasks=getStationTasks('bar-close');
    const closeDone=getStationChecked('bar-close').filter(i=>i<closeTasks.length).length;

    if(isManager()){
      return `<div class="app-content">
        ${formatTitle(
          'OPERATIONS COMMAND · FRIDAY, OCT 23',
          'Service Command',
          'Evening service readiness, station sign-offs, and pending team approvals.',
          `<button type="button" class="secondary-btn small-btn" data-goto="shifts">Schedule Studio</button>
           <button type="button" class="primary-btn small-btn" data-goto="briefings">Briefing v${b.version} · ${ackCount}/8 read</button>`
        )}
        <div class="dashboard-stats four-stats">
          <div class="card metric metric-highlight" data-goto="briefings" role="button" tabindex="0">
            <div class="metric-label">Briefing read (v${b.version})</div>
            <div class="metric-value">${ackCount}<span class="metric-sub"> / 8</span></div>
            <div class="task-progress"><div style="width:${ackCount/8*100}%"></div></div>
            <div class="metric-note">${8-ackCount} unread before 16:00</div>
          </div>
          <div class="card metric" data-goto="checklists" role="button" tabindex="0">
            <div class="metric-label">Opening checklists</div>
            <div class="metric-value">${state.checklistStatus==='approved'?'3':'2'}<span class="metric-sub"> / 3</span></div>
            <div class="metric-note">${state.checklistStatus==='submitted'?'Bar opening awaiting review':state.checklistStatus==='approved'?'All 3 opening lists signed off':'Bar opening ('+state.checked.length+'/'+openTasks.length+')'}</div>
          </div>
          <div class="card metric" data-goto="inbox" role="button" tabindex="0">
            <div class="metric-label">Pending decisions</div>
            <div class="metric-value">${String(pending).padStart(2,'0')}</div>
            <div class="metric-note">${pending?'Action items below':'All decisions cleared'}</div>
          </div>
          <div class="card metric" data-goto="shifts" role="button" tabindex="0">
            <div class="metric-label">Evening roster</div>
            <div class="metric-value">${state.openShiftAssigned?'13':'12'}</div>
            <div class="metric-note">${state.swapStatus==='approved'?'Friday swap covered by Chris':state.swapStatus==='pending'?'1 swap request pending':'FOH, Bar & Kitchen'}</div>
          </div>
        </div>

        <div class="dashboard-two">
          <section class="card panel manager-queue-card">
            <div class="panel-head">
              <div>
                <span class="panel-kicker">NEEDS REVIEW</span>
                <h2>Action queue</h2>
              </div>
              ${simpleButton('Full inbox →','inbox')}
            </div>
            <div class="action-queue-list">
              ${state.checklistStatus==='submitted'?`
                <div class="queue-item urgent">
                  <div class="activity-icon">☑</div>
                  <div class="queue-meta">
                    <strong>Bar opening checklist</strong>
                    <span>Submitted by Alex Morgan · "${esc(state.checklistEvidence||'Ready for review')}"</span>
                  </div>
                  <div class="queue-actions">
                    <button type="button" class="primary-btn small-btn" data-action="approve-checklist">Approve</button>
                    <button type="button" class="secondary-btn small-btn" data-action="reject-checklist">Return</button>
                  </div>
                </div>`:''}
              ${cStatus==='submitted'?`
                <div class="queue-item urgent">
                  <div class="activity-icon">☑</div>
                  <div class="queue-meta">
                    <strong>Bar &amp; floor closing checklist</strong>
                    <span>Submitted by Sam Kim · "${esc(state.closingEvidence||'Safe drop & temps logged')}"</span>
                  </div>
                  <div class="queue-actions">
                    <button type="button" class="primary-btn small-btn" data-action="approve-closing">Approve</button>
                  </div>
                </div>`:''}
              ${state.swapStatus==='pending'?`
                <div class="queue-item urgent">
                  <div class="activity-icon">▦</div>
                  <div class="queue-meta">
                    <strong>Shift swap · Friday 16:00</strong>
                    <span>Alex Morgan ↔ Chris Taylor (Server)</span>
                  </div>
                  <div class="queue-actions">
                    <button type="button" class="primary-btn small-btn" data-action="approve-swap">Approve</button>
                    <button type="button" class="secondary-btn small-btn" data-action="reject-swap">Decline</button>
                  </div>
                </div>`:''}
              ${pendingSupply.map(r=>{
                const c=catalog.find(x=>x.id===r.item);
                return `<div class="queue-item">
                  <div class="activity-icon">▣</div>
                  <div class="queue-meta">
                    <strong>${r.quantity} ${esc(c?.unit||'units')} ${esc(c?.name||r.item)}</strong>
                    <span>Requested by ${esc(r.requester)} · ${esc(c?.vendor||'Vendor')}</span>
                  </div>
                  <div class="queue-actions">
                    <button type="button" class="secondary-btn small-btn" data-action="approve-supply" data-id="${r.id}">Approve</button>
                    <button type="button" class="text-btn small-btn" data-action="reject-supply" data-id="${r.id}">Decline</button>
                  </div>
                </div>`;
              }).join('')}
              ${!state.draftVerified?`
                <div class="queue-item">
                  <div class="activity-icon">▤</div>
                  <div class="queue-meta">
                    <strong>Menu draft · Roasted Squash Risotto</strong>
                    <span>Verify seasonal record for floor reference</span>
                  </div>
                  <div class="queue-actions">
                    <button type="button" class="secondary-btn small-btn" data-action="verify-knowledge">Verify</button>
                  </div>
                </div>`:''}
              ${unansweredQuestions()?`
                <div class="queue-item">
                  <div class="activity-icon">◈</div>
                  <div class="queue-meta">
                    <strong>${unansweredQuestions()} unanswered briefing question</strong>
                    <span>Staff question awaiting response</span>
                  </div>
                  <div class="queue-actions">
                    <button type="button" class="secondary-btn small-btn" data-goto="briefings">Reply</button>
                  </div>
                </div>`:''}
              ${lessonsDone===3&&!state.skillSignedOff?`
                <div class="queue-item">
                  <div class="activity-icon">◇</div>
                  <div class="queue-meta">
                    <strong>Onboarding sign-off · Alex Morgan</strong>
                    <span>Completed all 3 Server Academy lessons</span>
                  </div>
                  <div class="queue-actions">
                    <button type="button" class="primary-btn small-btn" data-action="signoff-skill">Sign off</button>
                  </div>
                </div>`:''}
              ${pending===0?`
                <div class="callout">All pending checklists, supply requests, shift swaps, and menu records have been reviewed.</div>`:''}
            </div>
          </section>

          <div class="stack">
            <section class="card panel">
              <div class="panel-head">
                <h2>Opening &amp; closing stations</h2>
                ${simpleButton('All checklists →','checklists')}
              </div>
              <div class="station-grid">
                <div class="station-row station-row-clickable" data-open-station="bar-open" role="button" tabindex="0">
                  <div>
                    <strong>Bar Opening (15:00)</strong>
                    <small>Alex Morgan &amp; Sam Kim · ${state.checked.length}/${openTasks.length} tasks</small>
                  </div>
                  <span class="tag ${state.checklistStatus==='approved'?'':state.checklistStatus==='submitted'||state.checklistStatus==='rejected'?'tag-orange':'tag-gray'}">
                    ${state.checklistStatus==='approved'?'Approved':state.checklistStatus==='submitted'?'Needs Review':state.checklistStatus==='rejected'?'Returned':'In Progress'}
                  </span>
                </div>
                <div class="station-row station-row-clickable" data-open-station="foh-open" role="button" tabindex="0">
                  <div>
                    <strong>Dining Room Opening (15:15)</strong>
                    <small>Jordan Lee &amp; Taylor Brooks · 6/6 tasks</small>
                  </div>
                  <span class="tag">Approved</span>
                </div>
                <div class="station-row station-row-clickable" data-open-station="kitchen-open" role="button" tabindex="0">
                  <div>
                    <strong>Kitchen Pass &amp; Line (15:30)</strong>
                    <small>Riley Chen · 5/5 tasks · Walk-in 3.4°C</small>
                  </div>
                  <span class="tag">Approved</span>
                </div>
                <div class="station-row station-row-clickable" data-open-station="bar-close" role="button" tabindex="0">
                  <div>
                    <strong>Bar &amp; Floor Closing (23:00)</strong>
                    <small>Sam Kim &amp; Alex Morgan · ${closeDone}/${closeTasks.length} tasks</small>
                  </div>
                  <span class="tag ${cStatus==='approved'?'':cStatus==='submitted'?'tag-orange':'tag-gray'}">
                    ${cStatus==='approved'?'Signed Off':cStatus==='submitted'?'Needs Review':'Tonight 23:00'}
                  </span>
                </div>
              </div>
            </section>

            <section class="card panel dash-briefing">
              <div class="panel-head">
                <h2>Evening briefing · v${b.version}</h2>
                ${simpleButton('Briefing Studio →','briefings')}
              </div>
              <p class="mini-text">Published at ${esc(b.publishedAt)} · ${ackCount} of 8 staff acknowledged. Publishing v${b.version+1} resets read receipts.</p>
              <div class="inline-actions">
                <button type="button" class="primary-btn small-btn" data-goto="briefings">Edit briefing</button>
                <button type="button" class="secondary-btn small-btn" data-goto="supply">Vendor orders (${approvedSupply.length})</button>
              </div>
            </section>
          </div>
        </div>
      </div>`;
    }

    const readinessSteps=[
      {
        done:acknowledged,
        title:`Acknowledge Briefing v${b.version}`,
        sub:acknowledged?`Confirmed v${b.version} · ${ackCount} of 8 read`:`Published at ${b.publishedAt} · 4 service notes`,
        cta:acknowledged?'View':'Acknowledge',
        action:acknowledged?null:'ack-briefing',
        goto:'briefings'
      },
      {
        done:state.checklistStatus==='submitted'||state.checklistStatus==='approved',
        title:`Bar Opening Checklist (${state.checked.length}/${openTasks.length})`,
        sub:state.checklistStatus==='approved'?'Approved by Jamie Chen':state.checklistStatus==='submitted'?'Submitted for manager review':state.checklistStatus==='rejected'?`Returned: "${state.checklistNotes}"`:`${remaining} tasks remaining`,
        cta:state.checklistStatus==='working'&&remaining===0?'Submit':'Open',
        action:state.checklistStatus==='working'&&remaining===0?'submit-checklist':null,
        goto:'checklists'
      },
      {
        done:state.draftVerified,
        title:'Menu & allergen specifications',
        sub:state.draftVerified?'All seasonal dish & wine notes verified':'New Cabernet & Squash Risotto notes',
        cta:'View',
        action:null,
        goto:'knowledge'
      },
      {
        done:lessonsDone===3,
        title:`Server Onboarding (${lessonsDone}/3 lessons)`,
        sub:state.skillSignedOff?'Signed off by Jamie Chen':lessonsDone===3?'Ready for manager sign-off':'3 short lessons & checks',
        cta:'Open',
        action:null,
        goto:'academy'
      }
    ];
    const completedSteps=readinessSteps.filter(s=>s.done).length;

    return `<div class="app-content">
      ${formatTitle(
        'MY SHIFT WORKSPACE · FRIDAY, OCT 23',
        'Good evening, Alex',
        'Your 16:00 shift assignment, pre-service briefing, and station tasks.',
        `<span class="tag ${completedSteps===4?'':'tag-orange'}">${completedSteps}/4 pre-shift ready</span>`
      )}

      <div class="shift-feature">
        <div>
          <small>TONIGHT’S ASSIGNMENT · THE COPPER ROOM</small>
          <strong>${state.swapStatus==='approved'?'Friday Shift Covered by Chris Taylor':'Evening Dinner Service · Section A & Bar'}</strong>
          <p>Shift Lead: Jamie Chen · Doors open at 16:00 · 8-top VIP on Table 14 at 19:00</p>
          <div class="shift-badges-row">
            <span class="shift-mini-pill">◈ Briefing v${b.version}: ${acknowledged?'Read ✓':'Unread'}</span>
            <span class="shift-mini-pill">☑ Bar Opening: ${state.checked.length}/${openTasks.length}</span>
            <span class="shift-mini-pill">☾ Closing List: ${closeDone}/${closeTasks.length}</span>
          </div>
        </div>
        <div class="shift-time">16:00<span style="font-size:14px;color:#B4CBA8;font-weight:500">–23:00</span></div>
      </div>

      <div class="dashboard-two">
        <section class="card panel">
          <div class="panel-head">
            <h2>Pre-service readiness</h2>
            <span class="tag ${completedSteps===4?'':'tag-orange'}">${completedSteps} of 4 done</span>
          </div>
          <div class="readiness-checklist">
            ${readinessSteps.map(s=>`
              <div class="readiness-step ${s.done?'is-done':''}">
                <span class="r-step-check">${s.done?'✓':'◌'}</span>
                <div class="r-step-body">
                  <strong>${esc(s.title)}</strong>
                  <small>${esc(s.sub)}</small>
                </div>
                ${s.action?`<button type="button" class="primary-btn small-btn" data-action="${s.action}">${esc(s.cta)}</button>`:`<button type="button" class="secondary-btn small-btn" data-goto="${s.goto}">${esc(s.cta)}</button>`}
              </div>
            `).join('')}
          </div>
        </section>

        <div class="stack">
          <section class="card panel dash-briefing">
            <div class="panel-head">
              <h2>Tonight’s briefing · v${b.version}</h2>
              ${simpleButton('Full briefing →','briefings')}
            </div>
            <div class="mini-brief-preview">
              ${b.items.slice(0,3).map(item=>`
                <div class="mini-brief-row">
                  <span class="mini-brief-cat">${esc(item.category)}</span>
                  <strong>${esc(item.title)}</strong>
                </div>
              `).join('')}
            </div>
            ${acknowledged
              ?'<div class="callout">Acknowledged v'+b.version+' ✓</div>'
              :'<button type="button" class="primary-btn" data-action="ack-briefing">Acknowledge briefing</button>'}
          </section>

          <section class="card panel">
            <div class="panel-head">
              <h2>Team updates</h2>
              ${simpleButton('Open chat →','chat')}
            </div>
            ${state.messages.slice(-2).reverse().map(m=>`
              <div class="activity-row">
                <div class="activity-icon">◉</div>
                <div>
                  <strong>${esc(m.sender)} <small class="channel-badge">#${esc(m.channel||'general')}</small></strong>
                  <span>${esc(m.text.slice(0,85))}${m.text.length>85?'…':''}</span>
                </div>
              </div>
            `).join('')}
          </section>
        </div>
      </div>
    </div>`;
  }

  function schedule(){
    const days=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
    const now=new Date(),offset=(now.getDay()+6)%7,monday=new Date(now);
    monday.setDate(now.getDate()-offset);

    const rosterRows=[
      {init:'JC',name:'Jamie Chen',role:'General Manager',dept:'Kitchen',shifts:['10–18','14–22','Off','14–22','14–23','14–23','12–20']},
      {init:'AL',name:'Alex Morgan',role:'Server · FOH',dept:'FOH',shifts:['10–16','16–23','Off','16–23',state.swapStatus==='approved'?'Swapped ↔':'16–23','16–23:30','Off'],highlight:true},
      {init:'SK',name:'Sam Kim',role:'Bar Lead',dept:'Bar',shifts:['Off','15–23','15–23','15–23','15–23:30','15–23:30','Off']},
      {init:'JL',name:'Jordan Lee',role:'Server · FOH',dept:'FOH',shifts:['Off','16–23','16–22','Off','16–23','12–20','12–20']},
      {init:'RC',name:'Riley Chen',role:'Head Chef',dept:'Kitchen',shifts:['09–17','13–22','13–22','13–22','13–23','13–23','Off']},
      {init:'CT',name:'Chris Taylor',role:'Server · Float',dept:'FOH',shifts:['11–17','Off','16–22','Off',state.swapStatus==='approved'?'16–23 (Alex)':'On call','16–23','12–20']},
      {init:'MP',name:'Morgan Patel',role:'Bar Support',dept:'Bar',shifts:['Off','Off','17–22','17–22','17–23',state.openShiftAssigned?'17–23':'Open shift','Off']}
    ];

    const custom=state.customShifts||{};
    rosterRows.forEach((r,rIdx)=>{
      r.shifts=r.shifts.map((s,dIdx)=>custom[`${rIdx}:${dIdx}`]!==undefined?custom[`${rIdx}:${dIdx}`]:s);
    });

    const dayDetails=[
      {role:'Day Prep & Lunch Service',time:'10:00 AM – 4:00 PM',area:'Dining Room',lead:'Jamie Chen'},
      {role:'Evening Service',time:'4:00 PM – 11:00 PM',area:'Dining Room · Sec B',lead:'Jamie Chen'},
      {role:'Midweek Dinner Service',time:'4:00 PM – 10:00 PM',area:'Main Dining & Bar',lead:'Sam Kim'},
      {role:'Evening Service',time:'4:00 PM – 11:00 PM',area:'Bar Support & Patio',lead:'Jamie Chen'},
      {role:state.swapStatus==='approved'?'Swap Approved (Chris covering)':'Friday Peak Service',time:'4:00 PM – 11:00 PM',area:'Section A (Tables 1–6) & Bar',lead:'Jamie Chen'},
      {role:'Weekend Dinner Service',time:'4:00 PM – 11:30 PM',area:'Main Floor & Bar',lead:'Jamie Chen'},
      {role:'Sunday Supper Service',time:'12:00 PM – 8:00 PM',area:'Dining Room',lead:'Jamie Chen'}
    ].map((d,dIdx)=>{
      const activeTeam=rosterRows
        .filter(r=>r.shifts[dIdx]!=='Off'&&!r.shifts[dIdx].includes('Open')&&r.shifts[dIdx]!=='On call')
        .map(r=>`${r.name.split(' ')[0]} · ${r.role.split(' · ')[0]} (${r.shifts[dIdx]})`);
      return {...d,team:activeTeam};
    });

    const currentDay=dayDetails[state.selectedDay]||dayDetails[4];
    const alexShift=rosterRows[1].shifts[state.selectedDay];
    const isWorkingDay=alexShift!=='Off'&&!alexShift.includes('Open');

    const allShifts=rosterRows.flatMap(r=>r.shifts);
    const activeShiftCount=allShifts.filter(s=>s!=='Off'&&!s.includes('Open')&&s!=='On call').length;
    const openShiftCount=allShifts.filter(s=>s.includes('Open')).length;
    const estHours=Math.round(activeShiftCount*7.2);
    const rVer=state.rosterVersion||2;
    const hasCustomShifts=Object.keys(custom).length>0;

    const shiftPresets=[
      ['16–23 · Sec A','16–23 Floor'],
      ['15–23:30','15–23:30 Bar'],
      ['17–23','17–23 Support'],
      ['14–23','14–23 Lead'],
      ['13–23','13–23 Kitchen'],
      ['10–16','10–16 Prep'],
      ['Off','Day Off']
    ];

    const filteredRoster=activeRosterDept==='ALL'
      ?rosterRows.map((r,idx)=>({...r,idx}))
      :rosterRows.map((r,idx)=>({...r,idx})).filter(r=>r.dept===activeRosterDept);

    const selectedPerson=rosterRows[builderStaffIdx]||rosterRows[6];
    const selectedCellValue=selectedPerson.shifts[state.selectedDay];

    return `<div class="app-content">
      ${formatTitle(
        'BRIGLY SHIFTS · WEEKLY ROTA & SWAPS',
        isManager()?'Schedule Studio & Team Roster':'My Schedule & Shift Swaps',
        isManager()
          ?'Click any cell in the roster to assign shifts in one tap, filter by department, or approve swaps.'
          :'Your personal shift calendar, floor team, and shift swap requests.',
        `<span class="tag tag-dark">Roster v${rVer}</span>
         <span class="tag">${activeShiftCount} shifts · ~${estHours}h</span>
         ${isManager()?`<span class="tag ${openShiftCount?'tag-orange':''}">${openShiftCount===0?'All shifts filled':openShiftCount+' open shift Sat'}</span>`:''}`
      )}

      ${!isManager()?`
        <div class="week-grid">
          ${days.map((d,i)=>{
            const date=new Date(monday);date.setDate(monday.getDate()+i);
            const aShift=rosterRows[1].shifts[i];
            const work=aShift!=='Off'&&!aShift.includes('Open');
            const swappedFri=i===4&&state.swapStatus==='approved';
            return `<div role="button" tabindex="0" aria-label="Select ${d}" aria-pressed="${i===state.selectedDay}" class="day-column ${i===state.selectedDay?'today':''}" data-select-day="${i}" style="cursor:pointer">
              <div class="day-head-row">
                <div class="day-name">${d.toUpperCase()}</div>
                ${i===4?'<span class="today-pill">TONIGHT</span>':''}
              </div>
              <div class="day-date">${date.getDate()}</div>
              ${work
                ?`<div class="shift-chip ${i===4?'orange':''}">
                    <strong>${swappedFri?'Covered (Chris)':i===4?'Evening service':'Shift · '+esc(aShift)}</strong>
                    <small>${i===0?'10 AM – 4 PM':'4 PM – 11 PM'}</small>
                  </div>`
                :'<p class="no-shift-label">Day off</p>'}
              <small class="day-staff-count">${dayDetails[i].team.length} on floor</small>
            </div>`;
          }).join('')}
        </div>
      `:''}

      ${isManager()?`
        <section class="card panel" style="margin-top:6px">
          <div class="panel-head" style="flex-wrap:wrap;gap:10px">
            <div>
              <span class="panel-kicker">MANAGER ROSTER MATRIX · WEEK OF OCT 19–25</span>
              <h2>Interactive shift schedule</h2>
            </div>
            <div class="inline-actions" style="margin:0">
              <div class="filter-pills" role="group" aria-label="Filter roster by department">
                ${[['ALL','All (7)'],['FOH','FOH (3)'],['Bar','Bar (2)'],['Kitchen','Kitchen & GM (2)']].map(([dept,lbl])=>`
                  <button type="button" class="filter-pill ${activeRosterDept===dept?'active':''}" data-roster-dept="${dept}">${lbl}</button>
                `).join('')}
              </div>
              <button type="button" class="secondary-btn small-btn" data-action="toggle-open-shift">
                ${state.openShiftAssigned?'Reopen Sat shift':'Fill Sat open shift'}
              </button>
              <button type="button" class="primary-btn small-btn" data-action="publish-roster">Publish v${rVer+1}</button>
            </div>
          </div>

          <div class="quick-assign-bar">
            <div class="qa-target">
              <span class="qa-badge">SELECTED CELL</span>
              <strong>${esc(selectedPerson.name)}</strong>
              <span>· ${days[state.selectedDay]}</span>
              <code class="qa-current">${esc(selectedCellValue)}</code>
            </div>
            <div class="qa-presets" role="group" aria-label="One-tap shift presets">
              <span class="qa-hint">1-tap assign:</span>
              ${shiftPresets.map(([val,lbl])=>`
                <button type="button" class="qa-pill ${selectedCellValue===val?'active':''}" data-quick-shift="${esc(val)}">${esc(lbl)}</button>
              `).join('')}
              ${hasCustomShifts?`<button type="button" class="text-btn small-btn" data-action="reset-custom-shifts">Reset</button>`:''}
            </div>
          </div>

          <div class="roster-table-wrap">
            <table class="roster-table">
              <thead>
                <tr>
                  <th>Team member</th>
                  ${days.map((d,i)=>`
                    <th class="${i===state.selectedDay?'col-active':''}" data-select-day="${i}" style="cursor:pointer" title="View ${d} lineup">
                      ${d} ${i===4?'<span class="today-pill">FRI</span>':''}
                    </th>
                  `).join('')}
                  <th>Hrs</th>
                </tr>
              </thead>
              <tbody>
                ${filteredRoster.map(r=>{
                  const empShifts=r.shifts.filter(s=>s!=='Off'&&!s.includes('Open')&&s!=='On call').length;
                  return `<tr class="${r.highlight?'row-highlight':''}">
                    <td>
                      <div class="roster-person">
                        <span class="roster-avatar">${r.init}</span>
                        <div><strong>${esc(r.name)}</strong><small>${esc(r.role)}</small></div>
                      </div>
                    </td>
                    ${r.shifts.map((s,i)=>{
                      const isSelectedCell=r.idx===builderStaffIdx&&i===state.selectedDay;
                      return `<td class="${i===state.selectedDay?'col-active':''}">
                        <button type="button" data-roster-cell="${r.idx}:${i}" class="roster-cell roster-cell-btn ${s==='Off'?'is-off':s.includes('Open')?'is-open':s.includes('Swapped')||s.includes('Alex')?'is-swap':''} ${isSelectedCell?'is-editing':''}" title="Click to select ${esc(r.name)} on ${days[i]}">${esc(s)}</button>
                      </td>`;
                    }).join('')}
                    <td class="roster-hours-cell">${empShifts*7}h</td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>
        </section>
      `:''}

      <div class="split" style="margin-top:16px">
        <section class="card panel">
          <div class="panel-head">
            <h2>${days[state.selectedDay]} · ${currentDay.role}</h2>
            <span class="tag ${isWorkingDay?'':'tag-gray'}">${isWorkingDay?currentDay.time:'Day off'}</span>
          </div>
          <p class="mini-text" style="margin-top:6px">
            ${isWorkingDay
              ?`Area: <strong>${esc(currentDay.area)}</strong> · Duty Lead: <strong>${esc(currentDay.lead)}</strong>.`
              :'Alex Morgan is off duty on this day.'}
          </p>
          <div class="team-on-shift">
            <span class="field-label">FLOOR &amp; KITCHEN TEAM (${currentDay.team.length})</span>
            <div class="team-pills">
              ${currentDay.team.map(person=>`<span class="team-member-chip">${esc(person)}</span>`).join('')}
            </div>
          </div>
          <div class="inline-actions">
            <button type="button" class="primary-btn small-btn" data-goto="briefings">Shift briefing</button>
            <button type="button" class="secondary-btn small-btn" data-goto="checklists">Checklists (${state.checked.length}/${checklist.length})</button>
          </div>
        </section>

        <section class="card panel">
          <div class="panel-head">
            <h2>Shift swap request</h2>
            <span class="tag ${state.swapStatus==='approved'?'':state.swapStatus==='pending'?'tag-orange':'tag-gray'}">
              ${state.swapStatus==='none'?'Available':state.swapStatus==='pending'?'Pending review':state.swapStatus==='approved'?'Approved':'Declined'}
            </span>
          </div>
          <div class="swap-box">
            <strong>Friday, Oct 23 · 16:00 – 23:00 (Section A)</strong>
            <small>Alex Morgan ↔ Chris Taylor (Server · Eligible · No overtime conflict)</small>
          </div>
          <div class="inline-actions">
            ${state.swapStatus==='none'?`<button type="button" class="primary-btn small-btn" data-action="request-swap">Request Friday shift swap</button>`:''}
            ${state.swapStatus==='pending'&&isManager()?`
              <button type="button" class="primary-btn small-btn" data-action="approve-swap">Approve swap</button>
              <button type="button" class="secondary-btn small-btn" data-action="reject-swap">Decline</button>
            `:''}
            ${state.swapStatus==='pending'&&!isManager()?`
              <span class="tag tag-orange">Awaiting manager review</span>
              <button type="button" class="secondary-btn small-btn" data-action="switch-role" data-target-role="manager">Review as Manager</button>
            `:''}
            ${['approved','rejected'].includes(state.swapStatus)?`
              <span class="tag ${state.swapStatus==='approved'?'':'tag-orange'}">${state.swapStatus==='approved'?'Chris Taylor confirmed on roster':'Swap declined'}</span>
              <button type="button" class="text-btn small-btn" data-action="reset-swap">Reset</button>
            `:''}
          </div>
        </section>
      </div>
    </div>`;
  }

  function briefings(){
    const b=state.briefing,editing=isManager()&&b.status==='editing';
    const items=editing?b.draft:b.items;
    const acknowledged=b.ackVersion===b.version;
    const ackCount=(b.version===1?5:0)+(acknowledged?1:0);
    const safe=(v)=>esc(v);
    return `<div class="app-content briefing-page">
      ${formatTitle(
        'BRIGLY BRIEFINGS · PRE-SERVICE ALIGNMENT',
        isManager()?'Briefing Studio':'Tonight’s Shift Briefing',
        'Pre-service menu updates, service notes, and team read confirmations.'
      )}
      <div class="brief-hero card">
        <div>
          <span class="brief-hero-label">FRIDAY / EVENING SERVICE · THE COPPER ROOM</span>
          <h2>Tonight's team briefing</h2>
          <p>Front of house &amp; Bar · 4:00–11:00 PM · Duty Lead: Jamie Chen</p>
          <div class="brief-hero-chips">
            <span class="tag ${editing?'tag-orange':'tag-dark'}">${editing?'Unpublished edits':'Published · v'+b.version}</span>
            <span class="tag">4:00 PM service</span>
            <span class="tag">${ackCount} of 8 read</span>
          </div>
        </div>
        <div class="brief-hero-symbol">◈</div>
      </div>

      <div class="briefing-metrics">
        <div class="card metric">
          <div class="metric-label">Acknowledged</div>
          <div class="metric-value">${ackCount}<span class="metric-denominator"> / 8</span></div>
          <div class="task-progress"><div style="width:${ackCount/8*100}%"></div></div>
        </div>
        <div class="card metric">
          <div class="metric-label">Published version</div>
          <div class="metric-value">0${b.version}</div>
          <div class="metric-note">Last published ${safe(b.publishedAt)}</div>
        </div>
        <div class="card metric">
          <div class="metric-label">Questions</div>
          <div class="metric-value">${b.questions.length.toString().padStart(2,'0')}</div>
          <div class="metric-note">${unansweredQuestions()?unansweredQuestions()+' awaiting manager reply':'All questions answered'}</div>
        </div>
      </div>

      ${editing?`<div class="callout">Editing <strong>draft v${b.version+1}</strong>. Staff continue seeing v${b.version} until you publish.</div>`:''}

      <div class="split brief-columns">
        <div class="stack">
          <section class="card panel">
            <div class="panel-head">
              <h2>${editing?'Draft updates':'Pre-shift updates'}</h2>
              <span class="tag ${editing?'tag-orange':''}">${items.length} updates</span>
            </div>
            <div class="brief-items">
              ${items.map((x,i)=>`
                <article class="brief-item">
                  <div class="brief-item-marker">${i+1}</div>
                  <div class="brief-item-body">
                    <div class="brief-category">${safe(x.category)}</div>
                    <h3>${safe(x.title)}</h3>
                    <p>${safe(x.body)}</p>
                    <div class="brief-item-links">
                      ${x.category.includes('Menu')||x.category.includes('Specials')?`<button type="button" class="text-btn small-btn" data-goto="knowledge">View in Knowledge</button>`:''}
                      ${x.category.includes('Supply')?`<button type="button" class="text-btn small-btn" data-goto="supply">View in Supply</button>`:''}
                      ${editing?`
                        <button type="button" class="text-btn small-btn" data-action="edit-brief-item" data-id="${x.id}">Edit</button>
                        <button type="button" class="text-btn small-btn" data-action="remove-brief-item" data-id="${x.id}">Remove</button>
                      `:''}
                    </div>
                  </div>
                </article>
              `).join('')}
              ${!items.length?'<p class="empty-note">Add at least one update before publishing.</p>':''}
            </div>

            ${editing?`
              <div class="brief-compose">
                <div class="panel-head" style="margin-bottom:10px">
                  <h3 style="margin:0">${b.editId?'Edit update':'Add update'}</h3>
                  <button type="button" class="secondary-btn small-btn" data-action="pull-supply-brief">
                    Pull low-stock notice
                  </button>
                </div>
                <form data-form="briefing-item">
                  <div class="grid-two">
                    <div>
                      <label class="field-label" for="brief-kind">Category</label>
                      <select id="brief-kind" name="category" class="control">
                        ${['Menu & beverages','Specials','Service notes','Supply notice','Operations','Team announcement'].map(cat=>`<option ${b.draft.find(x=>x.id===b.editId)?.category===cat?'selected':''}>${cat}</option>`).join('')}
                      </select>
                    </div>
                    <div>
                      <label class="field-label" for="brief-title">Heading</label>
                      <input id="brief-title" class="control" name="title" maxlength="90" placeholder="e.g. 86 Pinot Grigio — pour Riesling" required value="${safe(b.draft.find(x=>x.id===b.editId)?.title||'')}">
                    </div>
                  </div>
                  <label class="field-label" for="brief-body">Details</label>
                  <textarea id="brief-body" name="body" class="control control-area" maxlength="600" required placeholder="Details for the shift team...">${safe(b.draft.find(x=>x.id===b.editId)?.body||'')}</textarea>
                  <div class="inline-actions">
                    <button class="primary-btn" type="submit">${b.editId?'Save update':'Add to draft'}</button>
                    ${b.editId?'<button class="secondary-btn" type="button" data-action="cancel-brief-edit">Cancel</button>':''}
                  </div>
                </form>
              </div>
              <div class="inline-actions">
                <button type="button" class="primary-btn" data-action="publish-briefing" ${!items.length?'disabled':''}>Publish v${b.version+1}</button>
                <button type="button" class="secondary-btn" data-action="discard-briefing">Discard draft</button>
              </div>
            `:''}

            ${!editing&&!isManager()?`
              <div class="brief-ack ${acknowledged?'brief-ack-done':''}">
                <span>${acknowledged?'✓':'◌'}</span>
                <div>
                  <strong>${acknowledged?'Acknowledged v'+b.version:'Confirm shift briefing'}</strong>
                  <p>${acknowledged?'Your read confirmation is recorded for tonight’s service.':'Confirm once you have reviewed all pre-service notes.'}</p>
                </div>
                ${!acknowledged?'<button type="button" class="primary-btn" data-action="ack-briefing">Acknowledge briefing</button>':'<span class="tag">Read</span>'}
              </div>
            `:''}

            ${!editing&&isManager()?`
              <div class="inline-actions">
                <button type="button" class="primary-btn" data-action="begin-brief-edit">Edit &amp; prepare v${b.version+1}</button>
              </div>
            `:''}
          </section>

          <section class="card panel">
            <div class="panel-head">
              <h2>Shift Q&amp;A</h2>
              <span class="tag">${b.questions.length} threads</span>
            </div>
            <div class="brief-questions">
              ${b.questions.map(q=>`
                <div class="brief-question">
                  <div class="brief-question-by">${safe(q.by)} <span>${safe(q.time)}</span></div>
                  <p>${safe(q.text)}</p>
                  ${q.reply
                    ?`<div class="brief-response"><strong>Jamie Chen · GM</strong><p>${safe(q.reply)}</p></div>`
                    :isManager()
                      ?`<form data-form="briefing-answer" data-id="${q.id}" class="brief-question-reply">
                          <label class="field-label" for="reply-${q.id}" hidden>Reply</label>
                          <input class="control" id="reply-${q.id}" name="reply" maxlength="400" required placeholder="Write clarification...">
                          <button class="primary-btn small-btn" type="submit">Post reply</button>
                        </form>`
                      :`<div class="inline-actions" style="margin-top:10px">
                          <span class="tag tag-orange">Awaiting manager reply</span>
                          <button type="button" class="text-btn small-btn" data-action="switch-role" data-target-role="manager">Reply as Manager</button>
                        </div>`}
                </div>
              `).join('')}
            </div>
            <form data-form="briefing-question" class="brief-question-compose">
              <label class="field-label" for="new-brief-question">Ask a question</label>
              <div class="brief-question-reply">
                <input id="new-brief-question" name="question" class="control" placeholder="e.g. Can the Squash Risotto be made dairy-free?" required maxlength="400">
                <button class="secondary-btn" type="submit">Post</button>
              </div>
            </form>
          </section>
        </div>

        <div class="stack">
          <section class="card panel">
            <div class="panel-head">
              <h2>Read receipts</h2>
              <span class="tag">${ackCount} of 8 read</span>
            </div>
            <div class="brief-readiness">
              ${[
                ['Jamie Chen','General Manager',b.version===1],
                ['Sam Kim','Bar lead',b.version===1],
                ['Jordan Lee','Server',b.version===1],
                ['Taylor Brooks','Host',b.version===1],
                ['Chris Taylor','Server',b.version===1],
                ['Alex Morgan','Server (You)',acknowledged],
                ['Morgan Patel','Bar support',false],
                ['Casey Rivera','Runner',false]
              ].map(row=>`
                <div class="brief-person">
                  <span class="brief-person-avatar">${row[0].slice(0,2).toUpperCase()}</span>
                  <div><strong>${row[0]}</strong><small>${row[1]}</small></div>
                  <span class="tag ${row[2]?'':'tag-orange'}">${row[2]?'Read':'Unread'}</span>
                </div>
              `).join('')}
            </div>
          </section>

          <section class="card panel">
            <div class="panel-head">
              <h2>Shift handover notes</h2>
              <span class="tag">${b.debrief.length} notes</span>
            </div>
            ${b.debrief.map(n=>`
              <div class="brief-debrief">
                <strong>${safe(n.by)}</strong><span>${safe(n.time)}</span>
                <p>${safe(n.text)}</p>
              </div>
            `).join('')}
            <form data-form="briefing-debrief" style="margin-top:14px">
              <label class="field-label" for="brief-debrief">Add handover note</label>
              <textarea id="brief-debrief" name="debrief" class="control control-area" maxlength="600" required placeholder="Note for the next shift..."></textarea>
              <button class="secondary-btn" type="submit" style="margin-top:10px">Save note</button>
            </form>
          </section>
        </div>
      </div>
    </div>`;
  }

  function checklists(){
    const statusText={working:'In progress',submitted:'Awaiting review',approved:'Approved',rejected:'Changes requested'};
    const activeTab=checklistCatalog[activeChecklistTab]?activeChecklistTab:'bar-open';
    const suite=checklistCatalog[activeTab];
    const tasks=getStationTasks(activeTab);
    const checkedArr=getStationChecked(activeTab);
    const doneCount=checkedArr.filter(i=>i<tasks.length).length;
    const cStatus=state.closingStatus||'working';

    const stationStatus=tabId=>{
      if(tabId==='bar-open')return state.checklistStatus;
      if(tabId==='bar-close')return cStatus;
      const tLen=getStationTasks(tabId).length;
      const cLen=getStationChecked(tabId).filter(i=>i<tLen).length;
      return cLen===tLen?'approved':'working';
    };

    const currentStatus=stationStatus(activeTab);

    return `<div class="app-content">
      ${formatTitle(
        'BRIGLY OPS · OPENING & CLOSING CHECKLISTS',
        isManager()?'Station Checklists & Sign-Off':'Opening & Closing Checklists',
        'Opening prep, cooler temperature logs, end-of-night closing procedures, and supervisor sign-off.',
        `<span class="tag ${currentStatus==='submitted'||currentStatus==='rejected'?'tag-orange':''}">${statusText[currentStatus]}</span>`
      )}

      <div class="station-tabs-bar" role="tablist" aria-label="Station checklists">
        ${Object.values(checklistCatalog).map(st=>{
          const stTasks=getStationTasks(st.id);
          const stDone=getStationChecked(st.id).filter(i=>i<stTasks.length).length;
          const stStat=stationStatus(st.id);
          const isSel=st.id===activeTab;
          return `<button type="button" class="station-tab-btn ${isSel?'active':''}" role="tab" aria-selected="${isSel}" data-checklist-tab="${st.id}">
            <span class="phase-pill ${st.id==='bar-close'?'phase-close':'phase-open'}">${st.phase}</span>
            <strong>${esc(st.shortTitle)}</strong>
            <span class="station-tab-count ${stStat==='approved'?'is-done':stStat==='submitted'||stStat==='rejected'?'is-alert':''}">${stDone}/${stTasks.length}${stStat==='approved'?' ✓':''}</span>
          </button>`;
        }).join('')}
      </div>

      <div class="split">
        <section class="card panel">
          <div class="panel-head">
            <div>
              <span class="panel-kicker">${esc(suite.kicker)} · ${esc(suite.phase)}</span>
              <h2>${esc(suite.title)}</h2>
            </div>
            <span class="tag ${currentStatus==='submitted'||currentStatus==='rejected'?'tag-orange':''}">${statusText[currentStatus]}</span>
          </div>
          <p class="mini-text">Assigned to ${esc(suite.assignee)} · ${doneCount} of ${tasks.length} completed</p>

          ${activeTab==='bar-open'&&state.checklistNotes?`
            <div class="callout danger" style="margin:14px 0">
              <strong>Manager feedback (Changes requested)</strong><br>${esc(state.checklistNotes)}
            </div>
          `:''}

          <div class="task-progress"><div style="width:${100*doneCount/Math.max(1,tasks.length)}%"></div></div>

          <div class="checklist-items-wrap">
            ${tasks.map((t,i)=>{
              const isChecked=checkedArr.includes(i);
              const locked=activeTab==='bar-open'&&['submitted','approved'].includes(state.checklistStatus);
              return `<label class="checklist-task ${isChecked?'done':''}">
                <input type="checkbox" ${activeTab==='bar-open'?`data-task="${i}"`:`data-station-task="${activeTab}:${i}"`} ${isChecked?'checked':''} ${locked?'disabled':''}>
                <span>${esc(t)}</span>
                <small>${esc(suite.badge)}</small>
              </label>`;
            }).join('')}
          </div>

          ${isManager()?`
            <form class="add-task-bar" data-form="add-checklist-task">
              <label class="field-label" for="new-station-task">Manager builder · Add task to ${esc(suite.shortTitle)}</label>
              <div class="brief-question-reply">
                <input id="new-station-task" name="taskTitle" class="control" maxlength="120" required placeholder="e.g. Verify sparkling water CO2 regulator pressure...">
                <button type="submit" class="secondary-btn small-btn">+ Add task</button>
              </div>
            </form>
          `:''}

          ${activeTab==='bar-open'?`
            <div class="evidence-box">
              <label class="field-label" for="checklist-evidence">Station note &amp; cooler temp log</label>
              <div class="brief-question-reply">
                <input id="checklist-evidence" class="control" maxlength="200" value="${esc(state.checklistEvidence||'')}" placeholder="e.g. Low-boy cooler at 3.7°C · Fresh citrus prepped" ${['submitted','approved'].includes(state.checklistStatus)?'disabled':''}>
                ${!['submitted','approved'].includes(state.checklistStatus)?`<button type="button" class="secondary-btn small-btn" data-action="save-evidence">Save note</button>`:''}
              </div>
            </div>

            <div class="inline-actions">
              ${['working','rejected'].includes(state.checklistStatus)&&doneCount<tasks.length?`
                <button type="button" class="secondary-btn" data-action="check-all-tasks">Complete remaining (${tasks.length-doneCount})</button>
              `:''}
              ${['working','rejected'].includes(state.checklistStatus)?`
                <button type="button" class="primary-btn" data-action="submit-checklist" ${doneCount!==tasks.length?'disabled style="opacity:.5;cursor:not-allowed"':''}>Submit for review</button>
              `:''}
              ${state.checklistStatus==='submitted'&&isManager()?`
                <button type="button" class="primary-btn" data-action="approve-checklist">Approve checklist</button>
                <button type="button" class="secondary-btn" data-action="reject-checklist">Request changes</button>
              `:''}
              ${state.checklistStatus==='submitted'&&!isManager()?`
                <span class="tag tag-orange">Awaiting manager review</span>
                <button type="button" class="secondary-btn small-btn" data-action="switch-role" data-target-role="manager">Review as Manager</button>
              `:''}
              ${state.checklistStatus==='approved'?`
                <div class="callout" style="width:100%">Approved by Jamie Chen and logged.</div>
              `:''}
            </div>
          `:activeTab==='bar-close'?`
            <div class="evidence-box">
              <label class="field-label" for="closing-evidence">Closing lockup &amp; safe drop note</label>
              <div class="brief-question-reply">
                <input id="closing-evidence" class="control" maxlength="200" value="${esc(state.closingEvidence||'Drawer #2 balanced · Safe drop #104 · Walk-in at 3.5°C')}" placeholder="Log safe drop #, cooler temp, and lockup check...">
              </div>
            </div>
            <div class="inline-actions">
              ${doneCount<tasks.length?`
                <button type="button" class="secondary-btn" data-action="check-all-station" data-station="bar-close">Complete all closing tasks (${tasks.length-doneCount})</button>
              `:''}
              ${cStatus==='working'?`
                <button type="button" class="primary-btn" data-action="submit-closing" ${doneCount!==tasks.length?'disabled style="opacity:.5;cursor:not-allowed"':''}>Submit closing checklist</button>
              `:''}
              ${cStatus==='submitted'&&isManager()?`
                <button type="button" class="primary-btn" data-action="approve-closing">Approve closing sign-off</button>
              `:''}
              ${cStatus==='submitted'&&!isManager()?`
                <span class="tag tag-orange">Closing submitted · Awaiting GM sign-off</span>
                <button type="button" class="secondary-btn small-btn" data-action="switch-role" data-target-role="manager">Sign off as Manager</button>
              `:''}
              ${cStatus==='approved'?`
                <div class="callout" style="width:100%">Closing checklist signed off by Jamie Chen. Venue ready for tomorrow’s opening team.</div>
              `:''}
            </div>
          `:`
            <div class="inline-actions">
              ${doneCount<tasks.length?`
                <button type="button" class="primary-btn" data-action="check-all-station" data-station="${activeTab}">Mark all ${tasks.length} tasks complete</button>
              `:`<div class="callout" style="width:100%">All ${tasks.length} station tasks verified and signed off for tonight’s service.</div>`}
            </div>
          `}
        </section>

        <div class="stack">
          <section class="card panel">
            <div class="panel-head">
              <h2>Station SOP &amp; Handover</h2>
              <span class="tag">${activeTab==='bar-close'?'CLOSING SOP':'OPENING SOP'}</span>
            </div>
            <p class="mini-text">${esc(suite.sopNote)}</p>
            <div class="inline-actions">
              <button type="button" class="secondary-btn small-btn" data-goto="knowledge">View SOP in Knowledge</button>
              <button type="button" class="secondary-btn small-btn" data-goto="supply">Request stock</button>
            </div>
          </section>

          <section class="card panel">
            <h2>Shift activity log</h2>
            <div class="log-list">
              ${state.events.slice(0,8).map(e=>`
                <div class="log-line">
                  <time>${esc(e.date)}</time>
                  <div>${esc(e.text)}</div>
                </div>
              `).join('')}
            </div>
          </section>
        </div>
      </div>
    </div>`;
  }

  function chat(){
    const channelMeta={
      'general':{label:'general',desc:'Venue-wide announcements · 12 members'},
      'friday-service':{label:'friday-service',desc:'Tonight’s 4:00 PM service · 8 on shift'},
      'bar-team':{label:'bar-team',desc:'Beverage prep & bar stock · 4 members'},
      'front-of-house':{label:'front-of-house',desc:'Dining room & host stand · 7 members'}
    };
    const channels=Object.keys(channelMeta);
    const messages=state.messages.filter(m=>(m.channel||'general')===activeChannel);
    const quickPrompts=isManager()
      ?['Briefing v'+state.briefing.version+' is live — please confirm before 3:55 PM.','Table 14 VIP arrival confirmed for 7:00 PM.','Bar supply order approved for tomorrow morning.']
      :['Acknowledged the briefing — ready for 4 PM.','Bar station sanitized and fresh citrus prepped.','Confirmed pairing notes for the Ribeye special.'];

    return `<div class="app-content">
      ${formatTitle(
        'BRIGLY CHAT · SCOPED TEAM CHANNELS',
        'Team Communication',
        'Channel-scoped messaging for the venue, departments, and active service.'
      )}
      <div class="card chat-wrap">
        <aside class="channel-list" aria-label="Chat channels">
          <div class="channel-heading">TEAM CHANNELS</div>
          ${channels.map(c=>{
            const count=state.messages.filter(m=>(m.channel||'general')===c).length;
            return `<button type="button" class="channel-item ${c===activeChannel?'active':''}" data-channel="${c}" aria-pressed="${c===activeChannel}">
              <span># ${c}</span>
              <small class="channel-count">${count}</small>
            </button>`;
          }).join('')}
        </aside>
        <section class="chat-main">
          <div class="chat-title">
            <div>
              <strong># ${activeChannel}</strong>
              <span>${esc(channelMeta[activeChannel]?.desc||'Team channel')}</span>
            </div>
            <span class="tag">${isManager()?'Jamie Chen · GM':'Alex Morgan · FOH'}</span>
          </div>
          <div class="chat-messages" id="message-list">
            ${messages.length
              ?messages.map(m=>`
                <div class="message ${m.sender.includes('Manager')?'is-manager-msg':''}">
                  <div class="message-avatar">${esc(m.initials)}</div>
                  <div class="message-bubble">
                    <div class="message-head">
                      <strong>${esc(m.sender)}</strong>
                      <time>${esc(m.time)}</time>
                    </div>
                    <p>${esc(m.text)}</p>
                  </div>
                </div>
              `).join('')
              :'<p class="empty-note">No messages in this channel yet.</p>'}
          </div>
          <div class="chat-quick-bar">
            <span>Quick reply:</span>
            ${quickPrompts.map(p=>`<button type="button" class="quick-chip" data-action="quick-chat" data-text="${esc(p)}">${esc(p.slice(0,38))}…</button>`).join('')}
          </div>
          <form class="chat-compose" data-form="chat">
            <input class="control" name="message" aria-label="Message" placeholder="Message #${activeChannel}…" maxlength="500" required>
            <button type="submit" class="primary-btn">Send</button>
          </form>
        </section>
      </div>
    </div>`;
  }

  function supply(){
    const pending=state.requests.filter(r=>r.status==='pending');
    const approved=state.requests.filter(r=>r.status==='approved');
    return `<div class="app-content">
      ${formatTitle(
        'BRIGLY SUPPLY · REQUESTS & CONSOLIDATION',
        isManager()?'Purchasing & Supply':'Supply Requests',
        'Flag low stock during prep and consolidate approved items by supplier.'
      )}
      <div class="split">
        <div class="stack">
          <section class="card panel">
            <div class="panel-head">
              <h2>New supply request</h2>
              <span class="tag">${isManager()?'Manager entry':'Staff request'}</span>
            </div>
            <form data-form="supply">
              <div class="form-grid" style="grid-template-columns:1fr 110px">
                <div>
                  <label class="field-label" for="supply-item">Catalog item</label>
                  <select id="supply-item" name="item" class="control">
                    ${catalog.map(c=>`<option value="${c.id}">${esc(c.name)} (${c.unit} · ${c.department})</option>`).join('')}
                  </select>
                </div>
                <div>
                  <label class="field-label" for="supply-quantity">Quantity</label>
                  <input id="supply-quantity" class="control" type="number" name="quantity" min="1" max="999" value="2" required>
                </div>
              </div>
              <button class="primary-btn" type="submit">Submit request</button>
            </form>
          </section>

          <section class="card panel">
            <div class="panel-head">
              <h2>Team requests</h2>
              <div class="inline-actions" style="margin:0">
                <span class="tag ${pending.length?'tag-orange':''}">${pending.length} pending</span>
                ${isManager()&&pending.length>1?`<button type="button" class="secondary-btn small-btn" data-action="approve-all-supply">Approve all (${pending.length})</button>`:''}
              </div>
            </div>
            ${state.requests.map(r=>{
              const c=catalog.find(x=>x.id===r.item);
              return `<div class="request-row">
                <div class="activity-icon">▣</div>
                <div class="request-meta">
                  <strong>${esc(c?.name||r.item)}</strong>
                  <small>${r.quantity} ${esc(c?.unit||'units')} · ${esc(r.requester)} · ${esc(c?.vendor||'Supplier')}</small>
                </div>
                <span class="tag ${r.status==='pending'?'tag-orange':r.status==='approved'?'':'tag-gray'}">${esc(r.status)}</span>
                ${isManager()&&r.status==='pending'?`
                  <div class="inline-actions" style="margin:0">
                    <button type="button" class="primary-btn small-btn request-action" data-action="approve-supply" data-id="${r.id}">Approve</button>
                    <button type="button" class="text-btn small-btn" data-action="reject-supply" data-id="${r.id}">Decline</button>
                  </div>
                `:''}
              </div>`;
            }).join('')}
          </section>
        </div>

        <div class="stack">
          <section class="card panel">
            <div class="panel-head">
              <h2>Consolidated vendor order</h2>
              <span class="tag">${approved.length} approved</span>
            </div>
            <p class="mini-text">Approved requests merge automatically by item and vendor while preserving requester attribution.</p>
            ${approved.length
              ?catalog.filter(c=>approved.some(r=>r.item===c.id)).map(c=>{
                const matching=approved.filter(r=>r.item===c.id);
                const total=matching.reduce((x,r)=>x+r.quantity,0);
                const attribution=matching.map(r=>`${r.requester} (${r.quantity})`).join(' + ');
                return `<div class="request-row">
                  <div class="request-meta">
                    <strong>${esc(c.name)} <span style="font-weight:500;color:#627456">· ${esc(c.vendor)}</span></strong>
                    <small>Requested by: ${esc(attribution)}</small>
                  </div>
                  <span class="tag tag-dark">${total} ${esc(c.unit)}</span>
                </div>`;
              }).join('')
              :'<p class="empty-note">Approve a pending request to build the consolidated vendor order list.</p>'}
            <div class="inline-actions">
              <button type="button" class="secondary-btn" data-action="copy-orders" ${approved.length?'':'disabled style="opacity:.5"'}>Copy vendor order</button>
              ${!isManager()&&pending.length?`<button type="button" class="text-btn small-btn" data-action="switch-role" data-target-role="manager">Review as Manager</button>`:''}
            </div>
          </section>
        </div>
      </div>
    </div>`;
  }

  function knowledgePage(){
    const categories=['ALL','FOOD','WINE','COCKTAIL','PROCEDURE','POLICY'];
    return `<div class="app-content">
      ${formatTitle(
        'BRIGLY KNOWLEDGE · VERIFIED RECIPES, WINE & SOPS',
        isManager()?'Knowledge Base & Verification':'Menu, Beverage & SOPs',
        'Verified dish specs, wine tasting notes, allergen records, and operating procedures.'
      )}

      ${!state.draftVerified?`
        <div class="callout" style="margin-bottom:16px;display:flex;justify-content:space-between;align-items:center;gap:14px;flex-wrap:wrap">
          <div>
            <strong>${isManager()?'1 imported menu draft awaiting verification':'Roasted Squash Risotto is currently an unverified draft'}</strong><br>
            <span>Only manager-verified records are marked authoritative for service.</span>
          </div>
          ${isManager()
            ?`<button type="button" class="primary-btn small-btn" data-action="verify-knowledge">Verify &amp; approve Squash Risotto</button>`
            :`<button type="button" class="secondary-btn small-btn" data-action="switch-role" data-target-role="manager">Verify as Manager</button>`}
        </div>
      `:''}

      <div class="knowledge-toolbar">
        <div class="search-bar">
          <span>⌕</span>
          <input id="knowledge-query" type="search" class="control" placeholder="Search dishes, cocktails, wines, allergens, or procedures…" aria-label="Search knowledge">
        </div>
        <div class="filter-pills" role="group" aria-label="Filter knowledge by category">
          ${categories.map(cat=>`<button type="button" class="filter-pill ${activeKnowledgeFilter===cat?'active':''}" data-kfilter="${cat}">${cat==='ALL'?'All ('+knowledge.length+')':cat}</button>`).join('')}
        </div>
      </div>

      <p id="search-status" role="status" class="empty-search" hidden></p>
      <div class="knowledge-grid" id="knowledge-results">
        ${knowledge.map(k=>knowledgeCard(k)).join('')}
      </div>
    </div>`;
  }

  function knowledgeCard(k){
    const isVerified=k.id==='risotto'?Boolean(state.draftVerified):k.verified;
    const hiddenByFilter=activeKnowledgeFilter!=='ALL'&&k.type!==activeKnowledgeFilter;
    return `<article class="knowledge-item ${!isVerified?'is-draft':''}" ${hiddenByFilter?'hidden':''} role="button" tabindex="0" aria-label="Open ${esc(k.title)}" data-kid="${esc(k.id)}" data-ktype="${esc(k.type)}" data-keywords="${esc([k.title,k.type,k.description,k.allergens,k.pairing].join(' ').toLowerCase())}">
      <div class="k-card-top">
        <small>${esc(k.type)}</small>
        <span class="tag ${isVerified?'':'tag-orange'}">${isVerified?'Verified':'Draft'}</span>
      </div>
      <h3>${esc(k.title)}</h3>
      <p>${esc(k.description)}</p>
      <div class="k-meta-row">
        <span><strong>Allergens:</strong> ${esc(k.allergens)}</span>
        <span><strong>Pairing:</strong> ${esc(k.pairing)}</span>
      </div>
      <div class="source">${esc(isVerified&&k.id==='risotto'?'Verified seasonal record · Approved by Jamie Chen':k.source)}</div>
    </article>`;
  }

  function academy(){
    const modules=[
      {t:'First day essentials',d:'Shift briefings, version acknowledgments, and communication standards',n:'Lesson + check'},
      {t:'The beverage introduction',d:'Approved wine notes, cocktail specs, and allergen escalation',n:'Lesson + check'},
      {t:'Ready for the floor',d:'Opening checklists, station verification, and shift handovers',n:'Lesson + check'}
    ];
    const doneCount=state.academyDone.filter(Boolean).length;
    return `<div class="app-content">
      ${formatTitle(
        'BRIGLY ACADEMY · ONBOARDING & SKILL SIGN-OFF',
        isManager()?'Team Onboarding & Sign-Offs':'Onboarding Academy',
        'Role-based micro-lessons connected to your restaurant’s knowledge base and supervisor sign-off.'
      )}

      <div class="split">
        <div class="stack">
          <div class="card panel">
            <div class="panel-head">
              <div>
                <span class="panel-kicker">ROLE LEARNING PATH · FRONT OF HOUSE</span>
                <h2>Alex Morgan · Server onboarding</h2>
              </div>
              <span class="tag ${doneCount===3?'':'tag-orange'}">${doneCount}/${modules.length} complete</span>
            </div>
            <div class="task-progress"><div style="width:${doneCount/modules.length*100}%"></div></div>
          </div>

          <div class="stack">
            ${modules.map((m,i)=>`
              <div class="card academy-card">
                <div class="academy-icon">0${i+1}</div>
                <div class="academy-body">
                  <h3>${m.t}</h3>
                  <p>${m.d}</p>
                </div>
                ${state.academyDone[i]
                  ?`<div class="inline-actions" style="margin:0"><span class="tag">Passed</span><button type="button" class="text-btn small-btn" data-lesson data-id="${i}">Review</button></div>`
                  :`<button type="button" class="primary-btn small-btn" data-lesson data-id="${i}">Start lesson</button>`}
              </div>
            `).join('')}
          </div>
        </div>

        <div class="stack">
          <section class="card panel">
            <div class="panel-head">
              <h2>Supervisor sign-off</h2>
              <span class="tag ${state.skillSignedOff?'':'tag-orange'}">${state.skillSignedOff?'Signed off':'Pending'}</span>
            </div>
            <div class="signoff-card ${state.skillSignedOff?'is-signed':''}">
              <div>
                <strong>Alex Morgan · Evening Floor &amp; Beverage Readiness</strong>
                <small>${state.skillSignedOff?'Verified by Jamie Chen (GM)':doneCount===3?'All 3 lessons passed · Ready for supervisor sign-off':'Complete all 3 lessons ('+doneCount+'/3) or sign off as Manager'}</small>
              </div>
              ${isManager()&&!state.skillSignedOff?`
                <button type="button" class="primary-btn small-btn" data-action="signoff-skill">Sign off competency</button>
              `:''}
              ${!isManager()&&!state.skillSignedOff&&doneCount===3?`
                <button type="button" class="secondary-btn small-btn" data-action="switch-role" data-target-role="manager">Sign off as Manager</button>
              `:''}
            </div>
          </section>

          <section class="card panel">
            <h2>Team progress</h2>
            <div class="brief-readiness">
              ${[
                ['Sam Kim','Bar Lead · Beverage & Safety','3/3 · Signed off',true],
                ['Jordan Lee','Server · Floor & Wine','3/3 · Signed off',true],
                ['Alex Morgan','Server · Onboarding Path',`${doneCount}/3 · ${state.skillSignedOff?'Signed off':'In progress'}`,state.skillSignedOff],
                ['Morgan Patel','Bar Support · Bar Prep','2/3 · In progress',false],
                ['Casey Rivera','Runner · Food Safety','1/3 · Assigned',false]
              ].map(r=>`
                <div class="brief-person">
                  <span class="brief-person-avatar">${r[0].slice(0,2).toUpperCase()}</span>
                  <div><strong>${r[0]}</strong><small>${r[1]}</small></div>
                  <span class="tag ${r[3]?'':'tag-orange'}">${r[2]}</span>
                </div>
              `).join('')}
            </div>
          </section>
        </div>
      </div>
    </div>`;
  }

  function inbox(){
    const pending=state.requests.filter(r=>r.status==='pending');
    const totalOpen=pendingCount();
    return `<div class="app-content">
      ${formatTitle(
        isManager()?'MANAGER INBOX · UNIFIED DECISION QUEUE':'MY SUBMISSIONS & APPROVAL STATUS',
        isManager()?'Review Inbox':'My Submissions',
        isManager()
          ?'Submitted checklists, supply requests, shift swaps, briefing questions, and menu drafts awaiting approval.'
          :'Live approval status for checklists, shift swaps, and supply requests.'
      )}

      <div class="split">
        <section class="card panel">
          <div class="panel-head">
            <h2>${isManager()?'Pending approvals':'Active items'}</h2>
            <span class="tag ${totalOpen?'tag-orange':''}">${totalOpen} open</span>
          </div>

          ${state.checklistStatus==='submitted'?`
            <div class="request-row">
              <div class="activity-icon">☑</div>
              <div class="request-meta">
                <strong>Bar opening checklist · Friday evening</strong>
                <small>All ${getStationTasks('bar-open').length} tasks submitted by Alex Morgan · Note: "${esc(state.checklistEvidence||'None')}"</small>
              </div>
              ${isManager()
                ?`<div class="inline-actions" style="margin:0"><button type="button" class="primary-btn small-btn" data-action="approve-checklist">Approve</button><button type="button" class="secondary-btn small-btn" data-action="reject-checklist">Return</button></div>`
                :'<span class="tag tag-orange">Awaiting manager</span>'}
            </div>
          `:''}

          ${state.closingStatus==='submitted'?`
            <div class="request-row">
              <div class="activity-icon">☑</div>
              <div class="request-meta">
                <strong>Bar &amp; floor closing checklist · 23:00 lockup</strong>
                <small>Submitted by Sam Kim &amp; Alex Morgan · Note: "${esc(state.closingEvidence||'Safe drop & cooler temps logged')}"</small>
              </div>
              ${isManager()
                ?`<div class="inline-actions" style="margin:0"><button type="button" class="primary-btn small-btn" data-action="approve-closing">Approve closing</button></div>`
                :'<span class="tag tag-orange">Awaiting GM sign-off</span>'}
            </div>
          `:''}

          ${pending.map(r=>{
            const item=catalog.find(c=>c.id===r.item);
            return `<div class="request-row">
              <div class="activity-icon">▣</div>
              <div class="request-meta">
                <strong>${esc(item?.name||r.item)} · ${r.quantity} ${esc(item?.unit||'units')}</strong>
                <small>Requested by ${esc(r.requester)} · ${esc(item?.vendor||'Vendor')}</small>
              </div>
              ${isManager()
                ?`<div class="inline-actions" style="margin:0"><button type="button" class="secondary-btn small-btn" data-action="approve-supply" data-id="${r.id}">Approve</button><button type="button" class="text-btn small-btn" data-action="reject-supply" data-id="${r.id}">Decline</button></div>`
                :'<span class="tag tag-orange">Pending</span>'}
            </div>`;
          }).join('')}

          ${state.swapStatus==='pending'?`
            <div class="request-row">
              <div class="activity-icon">▦</div>
              <div class="request-meta">
                <strong>Friday shift swap (Alex Morgan ↔ Chris Taylor)</strong>
                <small>Evening service 4:00–11:00 PM · Chris Taylor eligible</small>
              </div>
              ${isManager()
                ?`<div class="inline-actions" style="margin:0"><button type="button" class="primary-btn small-btn" data-action="approve-swap">Approve</button><button type="button" class="text-btn small-btn" data-action="reject-swap">Decline</button></div>`
                :'<span class="tag tag-orange">Pending</span>'}
            </div>
          `:''}

          ${!state.draftVerified?`
            <div class="request-row">
              <div class="activity-icon">▤</div>
              <div class="request-meta">
                <strong>Menu draft: Roasted Squash Risotto</strong>
                <small>Imported seasonal special awaiting manager verification</small>
              </div>
              ${isManager()
                ?`<button type="button" class="secondary-btn small-btn" data-action="verify-knowledge">Verify &amp; approve</button>`
                :'<span class="tag tag-orange">Draft</span>'}
            </div>
          `:''}

          ${unansweredQuestions()?`
            <div class="request-row">
              <div class="activity-icon">◈</div>
              <div class="request-meta">
                <strong>${unansweredQuestions()} unanswered question(s) on Tonight’s Briefing</strong>
                <small>Awaiting manager response before service</small>
              </div>
              <button type="button" class="secondary-btn small-btn" data-goto="briefings">Open briefing</button>
            </div>
          `:''}

          ${state.academyDone.every(Boolean)&&!state.skillSignedOff?`
            <div class="request-row">
              <div class="activity-icon">◇</div>
              <div class="request-meta">
                <strong>Academy skill sign-off · Alex Morgan</strong>
                <small>Passed all 3 Server Onboarding lessons</small>
              </div>
              ${isManager()
                ?`<button type="button" class="primary-btn small-btn" data-action="signoff-skill">Sign off</button>`
                :'<span class="tag tag-orange">Ready for sign-off</span>'}
            </div>
          `:''}

          ${totalOpen===0?'<p class="empty-note">All caught up. Every checklist, supply request, swap, and briefing question has been resolved.</p>':''}
        </section>

        <section class="card panel">
          <div class="panel-head">
            <h2>Activity log</h2>
            <span class="tag">${state.events.length} events</span>
          </div>
          <div class="log-list">
            ${state.events.slice(0,12).map(e=>`
              <div class="log-line">
                <time>${esc(e.date)}</time>
                <div>${esc(e.text)}</div>
              </div>
            `).join('')}
          </div>
        </section>
      </div>
    </div>`;
  }

  function syncRoleUI(){
    const mgr=isManager();
    document.body.dataset.roleMode=state.role;
    const pending=pendingCount();
    const b=state.briefing;
    const acknowledged=b.ackVersion===b.version;
    const ackCount=(b.version===1?5:0)+(acknowledged?1:0);
    const remainingTasks=checklist.length-state.checked.length;

    // Update topbar & sidebar role labels
    const crumbRole=document.getElementById('breadcrumb-role');
    if(crumbRole)crumbRole.textContent=mgr?'MANAGER COMMAND':'TEAM VIEW';
    const modeText=document.getElementById('sidebar-mode-text');
    if(modeText)modeText.textContent=mgr?'MANAGER COMMAND SETUP':'TEAM MEMBER SETUP';
    const profileName=document.getElementById('profile-name');
    if(profileName)profileName.textContent=mgr?'Jamie Chen':'Alex Morgan';
    const sidebarAvatar=document.getElementById('sidebar-avatar');
    if(sidebarAvatar)sidebarAvatar.textContent=mgr?'JC':'AL';
    const sidebarRole=document.getElementById('sidebar-role');
    if(sidebarRole)sidebarRole.textContent=mgr?'General Manager · Duty Lead':'Server & Bar · 16:00–23:00';
    const topBadge=document.getElementById('top-manager-badge');
    if(topBadge){topBadge.textContent=pending;topBadge.hidden=pending===0;}

    // Dynamically adapt sidebar navigation labels and order for Team vs Manager!
    const navConfig=mgr
      ?{
          primaryGroup:'OPERATIONS COMMAND',
          secondaryGroup:'VENUE MANAGEMENT',
          items:{
            dashboard:['Service Command',1],
            inbox:['Review Inbox',2],
            briefings:['Briefing Studio',3],
            shifts:['Schedule & Roster',4],
            checklists:['Ops & Checklists',5],
            supply:['Purchasing & Supply',7],
            knowledge:['Knowledge & Menus',8],
            academy:['Team & Sign-offs',9],
            chat:['Team Chat',10]
          }
        }
      :{
          primaryGroup:'MY SHIFT WORKSPACE',
          secondaryGroup:'TOOLS & GROWTH',
          items:{
            dashboard:['My Shift Today',1],
            briefings:['Shift Briefing',2],
            checklists:['My Tasks',3],
            shifts:['My Schedule',4],
            chat:['Team Chat',5],
            knowledge:['Menu & Knowledge',7],
            supply:['Supply Requests',8],
            academy:['Academy',9],
            inbox:['My Submissions',10]
          }
        };

    const g1=document.getElementById('nav-group-primary');
    const g2=document.getElementById('nav-group-secondary');
    if(g1)g1.textContent=navConfig.primaryGroup;
    if(g2)g2.textContent=navConfig.secondaryGroup;

    for(const [key,[label,order]] of Object.entries(navConfig.items)){
      const btn=document.querySelector(`.app-nav [data-view="${key}"]`);
      const lbl=document.getElementById(`nav-label-${key}`);
      if(btn)btn.style.order=String(order);
      if(lbl)lbl.textContent=label;
    }

    // Badges
    const revEl=document.getElementById('nav-review-count');
    if(revEl){revEl.textContent=pending;revEl.className='nav-count '+(pending?'badge-alert':'');}
    const taskEl=document.getElementById('nav-task-count');
    if(taskEl){
      taskEl.textContent=mgr?(state.checklistStatus==='submitted'?'1 rev':state.checklistStatus==='approved'?'✓':`${state.checked.length}/${checklist.length}`):(state.checklistStatus==='rejected'?'!':remainingTasks);
      taskEl.className='nav-count '+((mgr&&state.checklistStatus==='submitted')||(!mgr&&state.checklistStatus==='rejected')?'badge-alert':'');
    }
    const briefEl=document.getElementById('nav-brief-count');
    if(briefEl){
      briefEl.textContent=mgr?`${ackCount}/8`:(acknowledged?'✓':'1');
      briefEl.className='nav-count '+(!mgr&&!acknowledged?'badge-alert':'');
    }
    const knowEl=document.getElementById('nav-know-count');
    if(knowEl){
      knowEl.hidden=Boolean(state.draftVerified);
      knowEl.textContent='1 draft';
    }

    // Mobile Bottom Navigation adaptation
    const bnavDash=document.getElementById('bnav-label-dashboard');
    if(bnavDash)bnavDash.textContent=mgr?'Command':'Today';
    const bnavBriefBadge=document.getElementById('bnav-brief-badge');
    if(bnavBriefBadge){
      bnavBriefBadge.textContent=mgr?`${ackCount}/8`:(acknowledged?'✓':'1');
      bnavBriefBadge.hidden=!mgr&&acknowledged;
    }
    const bnavMidBadge=document.getElementById('bnav-mid-badge');
    if(bnavMidBadge){
      bnavMidBadge.textContent=mgr?(state.checklistStatus==='submitted'?'!':'✓'):remainingTasks;
      bnavMidBadge.hidden=!mgr&&remainingTasks===0&&state.checklistStatus!=='rejected';
    }
    const bnavInboxLabel=document.getElementById('bnav-inbox-label');
    if(bnavInboxLabel)bnavInboxLabel.textContent=mgr?'Inbox':'Status';
    const bnavInboxBadge=document.getElementById('bnav-inbox-badge');
    if(bnavInboxBadge){
      bnavInboxBadge.textContent=pending;
      bnavInboxBadge.hidden=pending===0;
    }
  }

  function setView(view){
    if(!Object.hasOwn(menuLabels,view))view='dashboard';
    state.view=view;
    persist();
    syncRoleUI();
    document.querySelectorAll('.app-nav button').forEach(b=>{
      b.classList.toggle('selected',b.dataset.view===view);
      b.setAttribute('aria-current',b.dataset.view===view?'page':'false');
    });
    document.querySelectorAll('[data-quick]').forEach(b=>{
      b.classList.toggle('active',b.dataset.quick===view);
      b.setAttribute('aria-current',b.dataset.quick===view?'page':'false');
    });
    const activeLabel=document.getElementById(`nav-label-${view}`)?.textContent||menuLabels[view];
    document.getElementById('breadcrumb-current').textContent=activeLabel;
    document.querySelectorAll('[data-role]').forEach(b=>{
      b.classList.toggle('active',b.dataset.role===state.role);
      b.setAttribute('aria-pressed',String(b.dataset.role===state.role));
    });
    el.innerHTML=({dashboard:overview,shifts:schedule,briefings,checklists,chat,supply,knowledge:knowledgePage,academy,inbox})[view]();
    closeSidebar();
    if(view==='chat'){
      const box=document.getElementById('message-list');
      if(box)box.scrollTop=box.scrollHeight;
    }
  }

  function update(view=state.view){
    const changed=view!==state.view;
    setView(view);
    document.title=menuLabels[state.view]+' — Brigly';
    window.dispatchEvent(new CustomEvent('brigly:view',{detail:{view:state.view,role:state.role}}));
    if(changed){
      window.scrollTo({top:0,behavior:'instant'});
      document.getElementById('demo-main')?.focus({preventScroll:true});
    }
  }

  // Sidebar & Mobile Drawer Management
  const sidebar=document.getElementById('app-sidebar');
  const toggle=document.getElementById('sidebar-toggle');
  const scrim=document.querySelector('.sidebar-scrim');
  function closeSidebar(){
    if(!sidebar)return;
    sidebar.classList.remove('open');
    document.body.classList.remove('navigation-open');
    if(scrim)scrim.hidden=true;
    if(toggle){
      toggle.setAttribute('aria-expanded','false');
      toggle.setAttribute('aria-label','Open navigation');
    }
  }
  function openSidebar(){
    if(!sidebar)return;
    sidebar.classList.add('open');
    document.body.classList.add('navigation-open');
    if(scrim)scrim.hidden=false;
    if(toggle){
      toggle.setAttribute('aria-expanded','true');
      toggle.setAttribute('aria-label','Close navigation');
    }
    sidebar.querySelector('.app-nav button.selected')?.focus();
  }
  toggle?.addEventListener('click',()=>{
    if(sidebar.classList.contains('open'))closeSidebar();
    else openSidebar();
  });
  document.querySelector('.sidebar-close')?.addEventListener('click',()=>{closeSidebar();toggle?.focus();});
  scrim?.addEventListener('click',()=>{closeSidebar();toggle?.focus();});
  matchMedia('(min-width:761px)').addEventListener('change',e=>{if(e.matches)closeSidebar();});

  // Modal Dialog System (Command Palette, Tour Guide, Lessons, Knowledge Details, Feedback, Reset)
  const dialog=document.getElementById('workspace-dialog');
  const dialogBody=document.getElementById('dialog-body');
  const dialogTitle=document.getElementById('dialog-title');
  let returnFocus=null;
  function openDialog(heading,html){
    if(!dialog||!dialogBody||!dialogTitle)return;
    returnFocus=document.activeElement;
    dialogTitle.textContent=heading;
    dialogBody.innerHTML=html;
    if(!dialog.open)dialog.showModal();
  }
  document.querySelector('.dialog-close')?.addEventListener('click',()=>dialog?.close());
  dialog?.addEventListener('click',e=>{
    if(e.target===dialog){
      const r=dialog.getBoundingClientRect();
      if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();
    }
  });
  dialog?.addEventListener('close',()=>{if(returnFocus?.isConnected)returnFocus.focus();});

  const routes={
    dashboard:['Today / Service Command','Personal shift readiness or Manager live cockpit'],
    briefings:['Shift Briefings','Read, acknowledge, or publish revised pre-shift updates'],
    checklists:['Daily Tasks & Ops','Complete station tasks, log temps, or approve checklists'],
    shifts:['Schedule & Roster','Personal week, team roster matrix, and shift swap workflow'],
    chat:['Team Chat','Scoped channels (#general, #friday-service, #bar-team, #front-of-house)'],
    knowledge:['Menu & Knowledge','Dishes, wines, cocktails, allergens, and record verification'],
    supply:['Supply Requests','Flag low stock, approve requests, and consolidate vendor orders'],
    academy:['Academy & Sign-offs','Micro-lessons, knowledge checks, and supervisor sign-off'],
    inbox:['Review Inbox','Unified decision queue and append-only audit log']
  };

  function openCommandPalette(){
    openDialog('Jump anywhere in The Copper Room',`
      <label class="field-label" for="command-query">Search views, workflows, or actions</label>
      <input class="control" type="search" id="command-query" placeholder="Try briefings, roster, supply, risotto, manager…" autocomplete="off">
      <div class="command-role-quick">
        <span>Active role: <strong>${isManager()?'Jamie Chen (Manager)':'Alex Morgan (Team Member)'}</strong></span>
        <button type="button" class="secondary-btn small-btn" data-action="dialog-switch-role">Switch to ${isManager()?'Team Member':'Manager'} ⇄</button>
      </div>
      <div class="command-list">
        ${Object.entries(routes).map(([key,[name,desc]])=>`
          <button type="button" data-route="${key}">
            <span><strong>${name}</strong><small>${desc}</small></span>
            <span>↗</span>
          </button>
        `).join('')}
      </div>
      <p id="command-empty" class="mini-text" hidden>No matching sections. Try another word.</p>
    `);
    document.getElementById('command-query')?.focus();
  }

  function openHelpGuide(){
    openDialog('How this connected demo works',`
      <p>Welcome to <strong>The Copper Room</strong> on Friday, October 23 before 4:00 PM evening service. Everything in this demo is connected across two real roles:</p>
      <div class="guide-grid">
        <div class="guide-card">
          <span class="tag">1 · TEAM MEMBER VIEW (ALEX)</span>
          <h3>Prep for your shift</h3>
          <ul>
            <li>Acknowledge <strong>Briefing v${state.briefing.version}</strong> and ask a question.</li>
            <li>Finish the 6 <strong>Bar Opening Tasks</strong> and submit for review.</li>
            <li>Request a <strong>Friday Shift Swap</strong> or flag low bar supplies.</li>
            <li>Complete the 3 <strong>Academy</strong> lessons.</li>
          </ul>
        </div>
        <div class="guide-card">
          <span class="tag tag-orange">2 · MANAGER VIEW (JAMIE)</span>
          <h3>Run the restaurant</h3>
          <ul>
            <li>Use <strong>Service Command</strong> or <strong>Review Inbox</strong> to approve or return Alex’s checklist with feedback.</li>
            <li>Publish <strong>Briefing v${state.briefing.version+1}</strong> — watch read receipts reset so staff re-acknowledge!</li>
            <li>Approve supply requests into a consolidated vendor order.</li>
          </ul>
        </div>
      </div>
      <p class="mini-text">All changes persist locally in your browser. Click <strong>↺</strong> in the sidebar at any time to reset.</p>
      <div class="inline-actions">
        <button type="button" class="primary-btn" data-route="dashboard">Explore ${isManager()?'Service Command':'My Shift Today'} ↗</button>
        <button type="button" class="secondary-btn" data-action="dialog-switch-role">Switch to ${isManager()?'Team View':'Manager View'} ⇄</button>
      </div>
    `);
  }

  function openResetDialog(){
    openDialog('Reset sample workspace?',`
      <p>This restores The Copper Room’s original Friday pre-service state (briefing v1, unsubmitted bar checklist, pending supply requests, and default chat messages). It only affects this browser.</p>
      <div class="inline-actions">
        <button type="button" class="primary-btn" data-confirm-reset>Reset sample workspace ↺</button>
        <button type="button" class="secondary-btn" data-close-detail>Keep exploring</button>
      </div>
    `);
  }

  function openCorrectionsDialog(){
    openDialog('Return checklist with feedback',`
      <p>Give Alex and the bar team a clear reason to revisit this checklist. Your feedback appears on their checklist and in the audit log.</p>
      <form id="correction-form">
        <label class="field-label" for="correction-note">What needs another look?</label>
        <textarea class="control control-area" id="correction-note" name="reason" maxlength="600" required placeholder="e.g. Please re-check the low-boy cooler temp log and restock bar towels before 4 PM."></textarea>
        <div class="inline-actions">
          <button class="primary-btn" type="submit">Return with feedback</button>
          <button class="secondary-btn" type="button" data-close-detail>Cancel</button>
        </div>
      </form>
    `);
    document.getElementById('correction-note')?.focus();
  }

  const lessons=[
    {
      title:'01. First day essentials',
      text:'Every shift starts with shared context. Read the published pre-shift briefing before service begins. If an item is unclear, ask in the briefing Q&A so the manager’s answer helps the whole floor. When a manager publishes a new version (for example, v2 after an 86’d wine), your previous v1 acknowledgment does not carry over — always review and acknowledge the latest version.',
      question:'The manager publishes a revised briefing (v2) at 3:50 PM. What should you do?',
      options:['Review the updated items and acknowledge version 2','Rely on your earlier v1 acknowledgment','Wait until after dinner service'],
      correct:0
    },
    {
      title:'02. The beverage introduction',
      text:'Always consult The Copper Room’s verified Knowledge records for the exact vintage, cocktail recipe, or dish preparation being served tonight. General hospitality knowledge is helpful, but house recipes and allergens change. Never guess on an allergy question: check the verified record and confirm with the kitchen pass or floor manager.',
      question:'A guest asks if a seasonal special can be prepared dairy-free for an allergy. What is the right step?',
      options:['Promise it is safe if it looks dairy-free','Check the verified record and confirm directly with the kitchen/manager','Check an older printed menu'],
      correct:1
    },
    {
      title:'03. Ready for the floor',
      text:'Complete your assigned station opening tasks, record any required verification notes (like cooler temperatures), and submit the checklist for supervisor review. At the end of the night, leave a concise handover note for tomorrow’s team covering late deliveries, low stock, or follow-ups.',
      question:'What makes a strong end-of-shift handover note?',
      options:['Assuming the morning lead will figure it out','Only listing tasks that went smoothly','Clear context on unresolved items, deliveries, or stock for the next shift'],
      correct:2
    }
  ];

  function openLessonModal(id){
    const l=lessons[id];
    if(!l)return;
    openDialog(l.title,`
      <p class="section-eyebrow">BRIGLY ACADEMY · INTERACTIVE MICRO-LESSON</p>
      <div class="lesson-reading-box"><p>${esc(l.text)}</p></div>
      <h3 style="margin:18px 0 8px;font-size:16px">Quick knowledge check</h3>
      <p style="margin:0 0 12px">${esc(l.question)}</p>
      <form id="lesson-check" data-lesson-id="${id}">
        ${l.options.map((o,i)=>`
          <label class="lesson-option">
            <input type="radio" name="answer" value="${i}" ${state.academyDone[id]&&i===l.correct?'checked':''} required>
            <span>${esc(o)}</span>
          </label>
        `).join('')}
        <div class="inline-actions">
          <button class="primary-btn" type="submit">Check my answer ✓</button>
          <button class="secondary-btn" type="button" data-close-detail>Close</button>
        </div>
        <div class="lesson-feedback" role="status"></div>
      </form>
    `);
  }

  function openKnowledgeModal(kid){
    const k=knowledge.find(x=>x.id===kid);
    if(!k)return;
    const isVerified=k.id==='risotto'?Boolean(state.draftVerified):k.verified;
    openDialog(k.title,`
      <div class="k-dialog-meta">
        <span class="tag">${esc(k.type)}</span>
        <span class="tag ${isVerified?'':'tag-orange'}">${isVerified?'✓ Verified House Record':'Draft · Needs Manager Verification'}</span>
      </div>
      <p style="margin-top:14px;font-size:14px;line-height:1.8">${esc(k.description)}</p>
      <div class="k-detail-grid">
        <div class="k-detail-box">
          <strong>Allergens &amp; Safety</strong>
          <p>${esc(k.allergens)}</p>
        </div>
        <div class="k-detail-box">
          <strong>Recommended Pairing / Scope</strong>
          <p>${esc(k.pairing)}</p>
        </div>
      </div>
      <div class="callout" style="margin-top:14px">
        <strong>Source:</strong> ${esc(isVerified&&k.id==='risotto'?'Verified seasonal record · Approved by Jamie Chen':k.source)}
      </div>
      <div class="inline-actions">
        ${!isVerified&&isManager()?`<button type="button" class="primary-btn" data-action="verify-knowledge-modal">Verify &amp; approve record ✓</button>`:''}
        <button type="button" class="secondary-btn" data-close-detail>Done</button>
      </div>
    `);
  }

  // Event Listeners
  function switchRoleTo(newRole){
    if(!['employee','manager'].includes(newRole)||state.role===newRole)return;
    state.role=newRole;
    actLog(`Switched to ${isManager()?'Manager (Jamie Chen)':'Team Member (Alex Morgan)'} view`);
    update();
    toast(`${isManager()?'Manager Command (Jamie Chen)':'Team Member View (Alex Morgan)'} active`);
  }

  document.querySelectorAll('.app-nav [data-view]').forEach(btn=>{
    btn.addEventListener('click',()=>{
      window.location.hash=btn.dataset.view;
      update(btn.dataset.view);
    });
  });

  document.querySelectorAll('.role-switch [data-role]').forEach(btn=>{
    btn.addEventListener('click',()=>switchRoleTo(btn.dataset.role));
  });

  document.getElementById('reset-demo')?.addEventListener('click',openResetDialog);

  document.addEventListener('click',e=>{
    const cmd=e.target.closest('[data-command]');
    if(cmd){
      const type=cmd.dataset.command;
      if(type==='help')openHelpGuide();
      else if(type==='reset')openResetDialog();
      else openCommandPalette();
      return;
    }
    const quick=e.target.closest('[data-quick]');
    if(quick){
      window.location.hash=quick.dataset.quick;
      update(quick.dataset.quick);
      return;
    }
    const route=e.target.closest('[data-route]');
    if(route){
      const target=route.dataset.route;
      dialog?.close();
      window.location.hash=target;
      update(target);
      return;
    }
    if(e.target.closest('[data-close-detail]')){
      dialog?.close();
      return;
    }
    if(e.target.closest('[data-confirm-reset]')){
      returnFocus=null;
      dialog?.close();
      state=starter();
      persist();
      update('dashboard');
      window.location.hash='dashboard';
      toast('Workspace reset to its original sample data');
      return;
    }
    if(e.target.closest('[data-action="dialog-switch-role"]')){
      dialog?.close();
      switchRoleTo(isManager()?'employee':'manager');
      return;
    }
    if(e.target.closest('[data-action="verify-knowledge-modal"]')){
      state.draftVerified=true;
      actLog('Manager verified menu record: Roasted Squash Risotto');
      persist();
      dialog?.close();
      update();
      toast('Roasted Squash Risotto verified for the team');
      return;
    }
  });

  document.addEventListener('keydown',e=>{
    if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){
      e.preventDefault();
      if(dialog?.open)dialog.close();
      else openCommandPalette();
    }
    if(e.key==='Escape'&&sidebar?.classList.contains('open')){
      closeSidebar();
      toggle?.focus();
    }
  });

  dialogBody?.addEventListener('input',e=>{
    if(e.target.id==='command-query'){
      const q=e.target.value.trim().toLowerCase();
      const buttons=[...dialogBody.querySelectorAll('[data-route]')];
      buttons.forEach(b=>{b.hidden=!b.textContent.toLowerCase().includes(q);});
      const empty=document.getElementById('command-empty');
      if(empty)empty.hidden=buttons.some(b=>!b.hidden);
    }
    if(e.target.id==='correction-note')e.target.setCustomValidity('');
  });

  dialogBody?.addEventListener('submit',e=>{
    if(e.target.id==='correction-form'){
      e.preventDefault();
      const field=document.getElementById('correction-note');
      const reason=(field?.value||'').trim();
      if(!reason||!isManager()||state.checklistStatus!=='submitted')return;
      returnFocus=null;
      dialog?.close();
      state.checklistStatus='rejected';
      state.checklistNotes=reason.slice(0,600);
      actLog('Manager requested checklist corrections: '+state.checklistNotes);
      persist();
      update();
      toast('Checklist returned to team with feedback');
      return;
    }
    if(e.target.id==='lesson-check'){
      e.preventDefault();
      const id=Number(e.target.dataset.lessonId);
      const answer=Number(new FormData(e.target).get('answer'));
      const feedback=e.target.querySelector('.lesson-feedback');
      if(answer!==lessons[id]?.correct){
        if(feedback){
          feedback.textContent='Not quite — review the lesson note above and try another option.';
          feedback.className='lesson-feedback is-error';
        }
        return;
      }
      state.academyDone[id]=true;
      actLog(`Completed Academy module: ${lessons[id].title}`);
      persist();
      if(feedback){
        feedback.textContent='✓ Correct! Lesson marked complete in your onboarding path.';
        feedback.className='lesson-feedback is-success';
      }
      setTimeout(()=>{
        dialog?.close();
        update('academy');
        toast('Academy lesson completed!');
      },550);
    }
  });

  el.addEventListener('click',e=>{
    const channel=e.target.closest('[data-channel]');
    if(channel){
      activeChannel=channel.dataset.channel;
      update('chat');
      return;
    }
    const kfilter=e.target.closest('[data-kfilter]');
    if(kfilter){
      activeKnowledgeFilter=kfilter.dataset.kfilter;
      update('knowledge');
      return;
    }
    const openSt=e.target.closest('[data-open-station]');
    if(openSt){
      activeChecklistTab=openSt.dataset.openStation;
      window.location.hash='checklists';
      update('checklists');
      return;
    }
    const ctab=e.target.closest('[data-checklist-tab]');
    if(ctab){
      activeChecklistTab=ctab.dataset.checklistTab;
      update('checklists');
      return;
    }
    const rdept=e.target.closest('[data-roster-dept]');
    if(rdept){
      activeRosterDept=rdept.dataset.rosterDept;
      update('shifts');
      return;
    }
    const qshift=e.target.closest('[data-quick-shift]');
    if(qshift&&isManager()){
      const staffNames=['Jamie Chen','Alex Morgan','Sam Kim','Jordan Lee','Riley Chen','Chris Taylor','Morgan Patel'];
      const dayNames=['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
      const shiftVal=qshift.dataset.quickShift;
      const sIdx=builderStaffIdx;
      const dIdx=state.selectedDay;
      builderShiftPreset=shiftVal;
      state.customShifts={...(state.customShifts||{}),[`${sIdx}:${dIdx}`]:shiftVal};
      if(sIdx===6&&dIdx===5)state.openShiftAssigned=shiftVal!=='Off'&&!shiftVal.includes('Open');
      actLog(`Assigned ${staffNames[sIdx]} to ${shiftVal} on ${dayNames[dIdx]}`);
      persist();
      update('shifts');
      toast(`${staffNames[sIdx]} → ${shiftVal} (${dayNames[dIdx]}) ✓`);
      return;
    }
    const rcell=e.target.closest('[data-roster-cell]');
    if(rcell&&isManager()){
      const [sIdx,dIdx]=rcell.dataset.rosterCell.split(':').map(Number);
      builderStaffIdx=sIdx;
      state.selectedDay=dIdx;
      const cellTxt=rcell.textContent.trim();
      if(cellTxt&&cellTxt!=='Open shift'&&cellTxt!=='On call'&&!cellTxt.includes('Swapped')){
        builderShiftPreset=cellTxt;
      }
      persist();
      update('shifts');
      return;
    }
    const lessonBtn=e.target.closest('[data-lesson]');
    if(lessonBtn){
      openLessonModal(Number(lessonBtn.dataset.id));
      return;
    }
    const kcard=e.target.closest('.knowledge-item');
    if(kcard){
      openKnowledgeModal(kcard.dataset.kid);
      return;
    }
    const button=e.target.closest('[data-action],[data-goto],[data-select-day]');
    if(!button)return;
    if(button.dataset.goto){
      window.location.hash=button.dataset.goto;
      update(button.dataset.goto);
      return;
    }
    if(button.dataset.selectDay!==undefined){
      state.selectedDay=Number(button.dataset.selectDay);
      persist();
      update();
      return;
    }
    const action=button.dataset.action,id=Number(button.dataset.id);
    if(action==='switch-role'){
      switchRoleTo(button.dataset.targetRole||(isManager()?'employee':'manager'));
      return;
    }
    if(action==='begin-brief-edit'&&isManager()){
      state.briefing.status='editing';
      state.briefing.draft=state.briefing.items.map(x=>({...x}));
      state.briefing.editId=null;
      toast('Draft opened. Employees still see v'+state.briefing.version+' until you publish.');
    }
    else if(action==='discard-briefing'&&isManager()){
      state.briefing.status='published';
      state.briefing.draft=[];
      state.briefing.editId=null;
      toast('Draft discarded; current briefing unchanged');
    }
    else if(action==='edit-brief-item'&&isManager()&&state.briefing.status==='editing'){
      state.briefing.editId=id;
    }
    else if(action==='cancel-brief-edit'&&isManager()){
      state.briefing.editId=null;
    }
    else if(action==='remove-brief-item'&&isManager()&&state.briefing.status==='editing'){
      state.briefing.draft=state.briefing.draft.filter(x=>x.id!==id);
      if(state.briefing.editId===id)state.briefing.editId=null;
      toast('Update removed from draft');
    }
    else if(action==='pull-supply-brief'&&isManager()&&state.briefing.status==='editing'){
      const pendingItems=state.requests.filter(r=>r.status==='pending').map(r=>catalog.find(c=>c.id===r.item)?.name||r.item);
      const summary=pendingItems.length?pendingItems.join(', '):'Fresh limes & cocktail napkins';
      state.briefing.draft.push({
        id:Date.now(),
        category:'Supply notice',
        title:`Stock watch: ${summary}`,
        body:`Restock request queued for ${summary}. Check with the bar lead on garnish and pour alternatives during peak hours.`
      });
      toast('Supply notice added to briefing draft');
    }
    else if(action==='publish-briefing'&&isManager()&&state.briefing.status==='editing'&&state.briefing.draft.length){
      state.briefing.items=state.briefing.draft.map(x=>({...x}));
      state.briefing.draft=[];
      state.briefing.status='published';
      state.briefing.editId=null;
      state.briefing.version++;
      state.briefing.publishedAt=nowTime();
      state.messages.push({
        channel:'friday-service',
        sender:'Jamie · Manager',
        initials:'JM',
        text:`Published Evening Briefing v${state.briefing.version} (${state.briefing.items.length} updates). Please review and re-acknowledge before service.`,
        time:state.briefing.publishedAt
      });
      actLog(`Manager published briefing version ${state.briefing.version}. Prior acknowledgments require renewal.`);
      toast(`Briefing v${state.briefing.version} published! Staff read receipts reset.`);
    }
    else if(action==='ack-briefing'){
      state.briefing.ackVersion=state.briefing.version;
      actLog(`Alex Morgan acknowledged briefing version ${state.briefing.version}`);
      toast(`Briefing v${state.briefing.version} acknowledged ✓`);
    }
    else if(action==='check-all-tasks'){
      const openTasks=getStationTasks('bar-open');
      state.checked=openTasks.map((_,i)=>i);
      if(state.checklistStatus==='rejected')state.checklistStatus='working';
      actLog(`Completed all ${openTasks.length} Bar Opening checklist tasks`);
      toast(`All ${openTasks.length} bar opening tasks checked ✓`);
    }
    else if(action==='check-all-station'){
      const stId=button.dataset.station||activeChecklistTab;
      const stTasks=getStationTasks(stId);
      setStationChecked(stId,stTasks.map((_,i)=>i));
      actLog(`Completed all ${stTasks.length} tasks on ${checklistCatalog[stId]?.shortTitle||stId}`);
      toast(`All ${stTasks.length} tasks marked complete ✓`);
    }
    else if(action==='submit-closing'){
      const closeInput=document.getElementById('closing-evidence');
      if(closeInput)state.closingEvidence=closeInput.value.trim().slice(0,200);
      state.closingStatus='submitted';
      actLog('Bar & Floor Closing checklist submitted for manager sign-off');
      toast('Closing checklist submitted to Manager Review Inbox ✓');
    }
    else if(action==='approve-closing'&&isManager()){
      state.closingStatus='approved';
      actLog('Manager Jamie Chen approved Bar & Floor Closing checklist');
      toast('Closing checklist signed off ✓');
    }
    else if(action==='save-evidence'){
      const input=document.getElementById('checklist-evidence');
      if(input){
        state.checklistEvidence=input.value.trim().slice(0,200);
        actLog('Updated station verification note on Bar Opening checklist');
        toast('Station verification note saved');
      }
    }
    else if(action==='submit-checklist'){
      const openTasks=getStationTasks('bar-open');
      if(state.checked.filter(i=>i<openTasks.length).length!==openTasks.length){
        toast(`Finish all ${openTasks.length} tasks before submitting for review`);
        return;
      }
      const input=document.getElementById('checklist-evidence');
      if(input)state.checklistEvidence=input.value.trim().slice(0,200);
      state.checklistStatus='submitted';
      actLog('Bar opening checklist submitted by Alex Morgan for manager review');
      toast('Checklist submitted to Manager Review Inbox ✓');
    }
    else if(action==='approve-checklist'&&isManager()&&state.checklistStatus==='submitted'){
      state.checklistStatus='approved';
      state.checklistNotes='';
      actLog('Manager Jamie Chen approved Bar Opening checklist');
      toast('Bar Opening checklist approved ✓');
    }
    else if(action==='reject-checklist'&&isManager()&&state.checklistStatus==='submitted'){
      openCorrectionsDialog();
      return;
    }
    else if(action==='request-swap'&&state.swapStatus==='none'){
      state.swapStatus='pending';
      actLog('Alex Morgan requested Friday shift swap with Chris Taylor');
      toast('Shift swap request sent to Manager Review Inbox');
    }
    else if(action==='approve-swap'&&isManager()&&state.swapStatus==='pending'){
      state.swapStatus='approved';
      actLog('Manager approved Friday shift swap (Chris Taylor covering Alex)');
      toast('Friday shift swap approved · Roster updated ✓');
    }
    else if(action==='reject-swap'&&isManager()&&state.swapStatus==='pending'){
      state.swapStatus='rejected';
      actLog('Manager declined Friday shift swap request');
      toast('Shift swap request declined');
    }
    else if(action==='reset-swap'){
      state.swapStatus='none';
      actLog('Reset Friday shift swap status');
      toast('Shift swap status reset');
    }
    else if(action==='toggle-open-shift'&&isManager()){
      state.openShiftAssigned=!state.openShiftAssigned;
      if(state.customShifts)delete state.customShifts['6:5'];
      actLog(state.openShiftAssigned?'Manager assigned Saturday open bar shift to Morgan Patel':'Manager reopened Saturday bar support shift');
      toast(state.openShiftAssigned?'Saturday bar shift assigned to Morgan ✓':'Saturday shift reopened');
    }
    else if(action==='publish-roster'&&isManager()){
      state.rosterVersion=(state.rosterVersion||2)+1;
      actLog(`Manager published Weekly Roster v${state.rosterVersion} to all staff`);
      toast(`Weekly Roster v${state.rosterVersion} published to staff phones ✓`);
    }
    else if(action==='reset-custom-shifts'&&isManager()){
      state.customShifts={};
      actLog('Reset custom schedule assignments');
      toast('Schedule edits reset to baseline');
    }
    else if(action==='approve-supply'&&isManager()){
      const r=state.requests.find(x=>x.id===id);
      if(r&&r.status==='pending'){
        r.status='approved';
        actLog(`Manager approved ${r.quantity} ${catalog.find(c=>c.id===r.item)?.name||'items'} (${r.requester})`);
        toast('Supply request approved & merged into purchasing list ✓');
      }
    }
    else if(action==='approve-all-supply'&&isManager()){
      let count=0;
      state.requests.forEach(r=>{if(r.status==='pending'){r.status='approved';count++;}});
      if(count){
        actLog(`Manager approved all ${count} pending supply requests`);
        toast(`${count} supply requests approved & consolidated ✓`);
      }
    }
    else if(action==='reject-supply'&&isManager()){
      const r=state.requests.find(x=>x.id===id);
      if(r&&r.status==='pending'){
        r.status='declined';
        actLog('Manager declined a supply request');
        toast('Supply request declined');
      }
    }
    else if(action==='verify-knowledge'&&isManager()){
      state.draftVerified=true;
      actLog('Manager verified seasonal menu record: Roasted Squash Risotto');
      toast('Roasted Squash Risotto verified for the team ✓');
    }
    else if(action==='signoff-skill'&&isManager()){
      state.skillSignedOff=true;
      state.academyDone=[true,true,true];
      actLog('Manager Jamie Chen signed off Alex Morgan’s floor & beverage competency');
      toast('Competency signed off for Alex Morgan ✓');
    }
    else if(action==='quick-chat'){
      const text=String(button.dataset.text||'').trim();
      if(text){
        state.messages.push({
          channel:activeChannel,
          sender:isManager()?'Jamie · Manager':'Alex · Team',
          initials:isManager()?'JM':'AL',
          text,
          time:nowTime()
        });
        actLog(`Posted message in #${activeChannel}`);
        toast(`Sent to #${activeChannel}`);
      }
    }
    else if(action==='copy-orders'){
      const app=state.requests.filter(r=>r.status==='approved');
      const txt=catalog.filter(c=>app.some(r=>r.item===c.id)).map(c=>`${c.name} (${c.vendor}): ${app.filter(r=>r.item===c.id).reduce((x,r)=>x+r.quantity,0)} ${c.unit}`).join('\n');
      if(navigator.clipboard&&txt){
        navigator.clipboard.writeText(txt).then(()=>toast('Consolidated vendor order copied to clipboard ✓')).catch(()=>window.prompt('Copy the purchasing list:',txt));
      }else if(txt){
        window.prompt('Copy the purchasing list:',txt);
      }
      return;
    }
    persist();
    update();
  });

  el.addEventListener('change',e=>{
    const stInput=e.target.closest('[data-station-task]');
    if(stInput){
      const [tabId,idxStr]=stInput.dataset.stationTask.split(':');
      const i=Number(idxStr);
      const current=new Set(getStationChecked(tabId));
      if(stInput.checked)current.add(i);
      else current.delete(i);
      setStationChecked(tabId,[...current]);
      if(tabId==='bar-close'&&state.closingStatus==='approved')state.closingStatus='working';
      const taskName=getStationTasks(tabId)[i]||'Station task';
      actLog(`${checklistCatalog[tabId]?.shortTitle||'Station'}: ${stInput.checked?'completed':'reopened'} "${taskName}"`);
      persist();
      update();
      el.querySelector(`[data-station-task="${tabId}:${i}"]`)?.focus();
      return;
    }
    const input=e.target.closest('[data-task]');
    if(!input||['submitted','approved'].includes(state.checklistStatus))return;
    const i=Number(input.dataset.task);
    if(input.checked&&!state.checked.includes(i))state.checked.push(i);
    if(!input.checked)state.checked=state.checked.filter(x=>x!==i);
    if(state.checklistStatus==='rejected')state.checklistStatus='working';
    const openTasks=getStationTasks('bar-open');
    actLog(`Task ${input.checked?'completed':'reopened'}: ${openTasks[i]||checklist[i]}`);
    update();
    el.querySelector('[data-task="'+i+'"]')?.focus();
  });

  el.addEventListener('submit',e=>{
    const form=e.target.closest('[data-form]');
    if(!form)return;
    e.preventDefault();
    const values=new FormData(form);
    if(form.dataset.form==='assign-shift'&&isManager()){
      const staffNames=['Jamie Chen','Alex Morgan','Sam Kim','Jordan Lee','Riley Chen','Chris Taylor','Morgan Patel'];
      const dayNames=['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
      const sIdx=Number(values.get('staffIdx'));
      const dIdx=Number(values.get('dayIdx'));
      const shiftVal=String(values.get('shiftVal')||'16–23').trim().slice(0,40);
      if(sIdx>=0&&sIdx<staffNames.length&&dIdx>=0&&dIdx<7){
        builderStaffIdx=sIdx;
        state.selectedDay=dIdx;
        builderShiftPreset=shiftVal;
        state.customShifts={...(state.customShifts||{}),[`${sIdx}:${dIdx}`]:shiftVal};
        if(sIdx===6&&dIdx===5)state.openShiftAssigned=shiftVal!=='Off'&&!shiftVal.includes('Open');
        actLog(`Assigned ${staffNames[sIdx]} to ${shiftVal} on ${dayNames[dIdx]}`);
        toast(`${staffNames[sIdx]} assigned to ${shiftVal} (${dayNames[dIdx]}) ✓`);
      }
    }
    if(form.dataset.form==='add-checklist-task'&&isManager()){
      const title=String(values.get('taskTitle')||'').trim().slice(0,120);
      const tabId=checklistCatalog[activeChecklistTab]?activeChecklistTab:'bar-open';
      if(!title){toast('Enter a task description');return;}
      const currentExtras=Array.isArray(state.extraTasks?.[tabId])?state.extraTasks[tabId]:[];
      if(currentExtras.length>=6){toast('Maximum custom tasks reached for this station');return;}
      state.extraTasks={...(state.extraTasks||{}),[tabId]:[...currentExtras,title]};
      actLog(`Manager added task to ${checklistCatalog[tabId].shortTitle}: "${title}"`);
      toast(`Task added to ${checklistCatalog[tabId].shortTitle} ✓`);
    }
    if(form.dataset.form==='briefing-item'&&isManager()&&state.briefing.status==='editing'){
      const category=String(values.get('category')||'').trim().slice(0,50);
      const title=String(values.get('title')||'').trim().slice(0,90);
      const body=String(values.get('body')||'').trim().slice(0,600);
      if(!category||!title||!body){toast('Fill out every update field');return;}
      if(state.briefing.editId){
        const item=state.briefing.draft.find(x=>x.id===state.briefing.editId);
        if(item){item.category=category;item.title=title;item.body=body;}
        state.briefing.editId=null;
        toast('Draft update saved');
      }else{
        state.briefing.draft.push({id:Date.now(),category,title,body});
        toast('Update added to draft');
      }
    }
    if(form.dataset.form==='briefing-question'){
      const text=String(values.get('question')||'').trim().slice(0,400);
      if(!text){toast('Enter a question');return;}
      state.briefing.questions.push({
        id:Date.now(),
        by:isManager()?'Jamie · Manager':'Alex · Server',
        text,
        reply:'',
        time:nowTime()
      });
      actLog('New question posted on evening shift briefing');
      toast('Question added to briefing discussion');
    }
    if(form.dataset.form==='briefing-answer'&&isManager()){
      const reply=String(values.get('reply')||'').trim().slice(0,400);
      const id=Number(form.dataset.id);
      const q=state.briefing.questions.find(x=>x.id===id);
      if(!reply||!q){toast('Enter a response');return;}
      q.reply=reply;
      actLog('Manager replied to a briefing question');
      toast('Official manager reply posted ✓');
    }
    if(form.dataset.form==='briefing-debrief'){
      const text=String(values.get('debrief')||'').trim().slice(0,600);
      if(!text){toast('Add a handover note');return;}
      state.briefing.debrief.unshift({
        by:isManager()?'Jamie · Manager':'Alex · Server',
        time:nowTime(),
        text
      });
      actLog('Added shift handover note for next service');
      toast('Handover note saved to shift logbook ✓');
    }
    if(form.dataset.form==='supply'){
      const item=String(values.get('item'));
      const quantity=Number(values.get('quantity'));
      if(!catalog.some(c=>c.id===item)||!Number.isInteger(quantity)||quantity<1||quantity>999){
        toast('Enter a valid item and quantity');
        return;
      }
      state.requests.unshift({
        id:Date.now(),
        item,
        quantity,
        requester:isManager()?'Jamie · Manager':'Alex · Team',
        status:'pending'
      });
      actLog(`Supply request submitted: ${quantity} ${catalog.find(c=>c.id===item).name}`);
      toast('Supply request added to Manager Review Inbox');
    }
    if(form.dataset.form==='chat'){
      const text=String(values.get('message')||'').trim();
      if(!text||text.length>500){toast('Please enter a valid message');return;}
      state.messages.push({
        channel:activeChannel,
        sender:isManager()?'Jamie · Manager':'Alex · Team',
        initials:isManager()?'JM':'AL',
        text,
        time:nowTime()
      });
      actLog(`Posted message in #${activeChannel}`);
      toast('Message posted to #' + activeChannel);
    }
    persist();
    update();
  });

  el.addEventListener('input',e=>{
    if(e.target.id!=='knowledge-query')return;
    const q=e.target.value.toLowerCase().trim();
    document.querySelectorAll('.knowledge-item').forEach(card=>{
      const matchesFilter=activeKnowledgeFilter==='ALL'||card.dataset.ktype===activeKnowledgeFilter;
      const matchesQuery=!q||card.dataset.keywords.includes(q);
      card.hidden=!(matchesFilter&&matchesQuery);
    });
    const count=[...document.querySelectorAll('.knowledge-item')].filter(c=>!c.hidden).length;
    const status=document.getElementById('search-status');
    if(status){
      status.hidden=!q&&activeKnowledgeFilter==='ALL';
      status.textContent=count?`${count} matching knowledge record${count===1?'':'s'}`:'No matching entries. Try searching for ribeye, riesling, risotto, or allergy.';
    }
  });

  el.addEventListener('keydown',e=>{
    if(e.target.matches('[data-select-day],[data-goto],[data-checklist-tab],.knowledge-item')&&['Enter',' '].includes(e.key)){
      e.preventDefault();
      e.target.click();
    }
  });

  window.addEventListener('hashchange',()=>{
    const view=window.location.hash.slice(1);
    if(view==='demo-main')return;
    update(view||'dashboard');
  });

  update(window.location.hash.replace('#','')||state.view);
})();
