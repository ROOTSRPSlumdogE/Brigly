(() => {
  'use strict';
  const $=s=>document.querySelector(s), all=s=>[...document.querySelectorAll(s)];
  const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const menu=$('#mobile-menu'), toggle=$('.menu-toggle'), header=$('#site-header'), progressBar=$('#scroll-progress');

  // Mobile Menu
  const closeMenu=()=>{
    if(!menu||!toggle)return;
    menu.hidden=true;
    toggle.setAttribute('aria-expanded','false');
    toggle.setAttribute('aria-label','Open navigation');
  };
  toggle?.addEventListener('click',()=>{
    const opening=menu.hidden;
    menu.hidden=!opening;
    toggle.setAttribute('aria-expanded',String(opening));
    toggle.setAttribute('aria-label',opening?'Close navigation':'Open navigation');
  });
  menu?.querySelectorAll('a').forEach(a=>a.addEventListener('click',closeMenu));
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape'&&menu&&!menu.hidden){closeMenu();toggle?.focus();}
  });
  matchMedia('(min-width: 851px)').addEventListener('change',e=>{if(e.matches)closeMenu();});

  // Scroll Progress, Sticky Header & Subtle Desktop Hero Parallax
  const parallaxItems=all('[data-parallax]');
  function onScroll(){
    const y=window.scrollY||0;
    header?.classList.toggle('scrolled',y>18);
    if(progressBar){
      const max=Math.max(1,document.documentElement.scrollHeight-window.innerHeight);
      const pct=Math.min(100,Math.max(0,(y/max)*100));
      progressBar.style.width=pct+'%';
    }
    if(!reducedMotion&&matchMedia('(min-width: 851px)').matches&&y<950){
      parallaxItems.forEach(el=>{
        const speed=Number(el.dataset.parallax||0);
        el.style.transform=`translate3d(0,${(y*speed).toFixed(1)}px,0)`;
      });
    }else if(parallaxItems.length){
      parallaxItems.forEach(el=>{el.style.transform='';});
    }
  }
  window.addEventListener('scroll',onScroll,{passive:true});
  onScroll();

  // Accessible Tabs Helper
  function tabs(selector,run){
    const list=all(selector);
    list.forEach((tab,i)=>{
      tab.addEventListener('click',()=>{
        list.forEach(t=>{
          t.tabIndex=t===tab?0:-1;
          t.setAttribute('aria-selected',String(t===tab));
        });
        run(tab);
      });
      tab.addEventListener('keydown',e=>{
        if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;
        e.preventDefault();
        const n=e.key==='Home'?0:e.key==='End'?list.length-1:(i+(e.key==='ArrowRight'?1:-1)+list.length)%list.length;
        list[n].focus();
        list[n].click();
      });
    });
  }

  // Toast Notification
  let toastTimer;
  function toast(text){
    const t=$('#site-toast');
    if(!t)return;
    t.textContent=text;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer=setTimeout(()=>t.classList.remove('show'),3200);
  }

  const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  // Interactive Homepage Core Preview (Connected Team & Manager State)
  const mini={
    role:'employee',
    view:'briefing',
    version:1,
    ackVersion:0,
    checked:[true,false,false],
    taskStatus:'working',
    swapStatus:'pending',
    limeStatus:'pending',
    notes:['Patio tables set for Friday. Verify fresh lime delivery before 4:00 PM opening.']
  };

  function syncMiniChrome(){
    const isMgr=mini.role==='manager';
    all('[data-mini-role]').forEach(btn=>{
      const active=btn.dataset.miniRole===mini.role;
      btn.classList.toggle('active',active);
      btn.setAttribute('aria-pressed',String(active));
    });
    const sub=$('#mini-venue-sub');
    if(sub)sub.textContent=isMgr?'Manager Command':'Team Member View';
    const grp=$('#mini-nav-group');
    if(grp)grp.textContent=isMgr?'MANAGER COMMAND':'SHIFT WORKSPACE';
    const av=$('#mini-user-avatar');
    if(av)av.textContent=isMgr?'JC':'AL';
    const nm=$('#mini-user-name');
    if(nm)nm.textContent=isMgr?'Jamie Chen':'Alex Morgan';
    const rl=$('#mini-user-role');
    if(rl)rl.textContent=isMgr?'General Manager':'Server · 16:00–23:00';
    const ctx=$('#mini-toolbar-context');
    if(ctx)ctx.textContent=`/ Evening service · ${isMgr?'Manager':'Team'}`;

    const acked=mini.ackVersion===mini.version;
    const ackCount=(mini.version===1?5:0)+(acked?1:0);
    const bBadge=$('#mini-badge-brief');
    if(bBadge)bBadge.textContent=isMgr?`${ackCount}/8`:(acked?'Read':`v${mini.version}`);
    const tBadge=$('#mini-badge-tasks');
    if(tBadge)tBadge.textContent=mini.taskStatus==='approved'?'Done':mini.taskStatus==='submitted'?'Review':`${mini.checked.filter(Boolean).length}/3`;
    const sBadge=$('#mini-badge-swap');
    if(sBadge)sBadge.textContent=mini.swapStatus==='approved'?'Done':mini.swapStatus==='pending'?'1':'Fri';
  }

  function renderPreview(){
    const panel=$('#preview-panel');
    if(!panel)return;
    syncMiniChrome();
    panel.setAttribute('aria-labelledby','tab-'+mini.view);
    const isMgr=mini.role==='manager';
    const acked=mini.ackVersion===mini.version;
    const ackCount=(mini.version===1?5:0)+(acked?1:0);
    const avatars='<div class="avatar-stack"><span class="avatar">JC</span><span class="avatar">SK</span><span class="avatar">JL</span><span class="avatar">AL</span><span class="avatar">+4</span></div>';
    const header=(label,title,status)=>`<div class="preview-head"><div><small>${label}</small><h3>${title}</h3></div><span>${status}</span></div>`;
    let content='';

    if(mini.view==='briefing'){
      content=header(
        'FRIDAY, OCT 23 · EVENING BRIEFING',
        isMgr?'Briefing Studio':'Tonight’s service briefing',
        `Published · v${mini.version}`
      )+`<div class="preview-columns">
        <div class="preview-list">
          <div class="preview-row"><span class="row-icon">01</span><div><strong>New Paso Robles Cabernet</strong><small>By the glass ($16) · Tasting notes in Knowledge</small></div></div>
          <div class="preview-row"><span class="row-icon">02</span><div><strong>Ribeye &amp; Squash Risotto specials</strong><small>18 Ribeye · 22 Risotto · Confirm dairy mods with pass</small></div></div>
          <div class="preview-row"><span class="row-icon">03</span><div><strong>7:00 PM private table (Table 14)</strong><small>8 guests · Jordan &amp; Alex assigned to section</small></div></div>
          ${mini.version>1?`<div class="preview-row"><span class="row-icon">04</span><div><strong>v${mini.version} Update: Pour Mosel Riesling</strong><small>House white running low · Riesling approved as primary pour</small></div></div>`:''}
        </div>
        <div class="preview-side">
          <small>${isMgr?'TEAM READ RECEIPTS':'READINESS'}</small>
          <div class="readiness">${ackCount}<span> / 8 read</span></div>
          <p>${isMgr
            ?`Version ${mini.version} is live. Publish v${mini.version+1} to require fresh confirmation.`
            :(acked?`You acknowledged v${mini.version}.`:`Confirm you have read v${mini.version} before doors open.`)}</p>
          ${avatars}
          ${isMgr
            ?`<button type="button" class="mini-action" data-mini="publish-v2">Publish v${mini.version+1} revision</button>`
            :`<button type="button" class="mini-action ${acked?'done':''}" data-mini="ack" ${acked?'disabled':''}>${acked?`Acknowledged v${mini.version}`:`Acknowledge briefing`}</button>`}
        </div>
      </div>`;
    }

    if(mini.view==='checklist'){
      const count=mini.checked.filter(Boolean).length;
      const tasks=['Sanitize bar station & speed rails','Prep citrus twists & check ice wells','Log low-boy cooler temp (3.7°C)'];
      content=header(
        'BRIGLY OPS · STATION VERIFICATION',
        isMgr?'Bar Opening Verification':'Bar Opening Checklist',
        mini.taskStatus==='approved'?'Approved':mini.taskStatus==='submitted'?'Pending Review':'In Progress'
      )+`<div class="preview-columns">
        <div class="preview-list">
          ${tasks.map((t,i)=>`
            <label class="preview-task">
              <input type="checkbox" data-mini-task="${i}" ${mini.checked[i]?'checked':''} ${mini.taskStatus==='approved'?'disabled':''}>
              <span>${t}</span>
            </label>
          `).join('')}
        </div>
        <div class="preview-side">
          <small>${isMgr?'MANAGER REVIEW':'PROGRESS'}</small>
          <div class="readiness">${count}<span> / 3</span></div>
          <p>${mini.taskStatus==='approved'
            ?'Signed off by Jamie Chen.'
            :mini.taskStatus==='submitted'
              ?(isMgr?'Alex submitted all 3 tasks for review.':'Submitted to Manager Jamie for sign-off.')
              :'Check off station tasks to submit for review.'}</p>
          ${isMgr
            ?(mini.taskStatus==='approved'
              ?`<button type="button" class="mini-action" data-mini="reset-tasks">Reset checklist</button>`
              :`<button type="button" class="mini-action" data-mini="approve-tasks">Approve station</button>`)
            :(mini.taskStatus==='approved'
              ?`<button type="button" class="mini-action done" disabled>Approved by Manager</button>`
              :mini.taskStatus==='submitted'
                ?`<button type="button" class="mini-action" data-mini="switch-to-mgr">Review as Manager</button>`
                :`<button type="button" class="mini-action" data-mini="submit-tasks">${count===3?'Submit for review':'Complete & submit'}</button>`)}
        </div>
      </div>`;
    }

    if(mini.view==='schedule'){
      content=header(
        'BRIGLY SHIFTS · ROTA & SWAPS',
        isMgr?'Friday Roster & Swap Request':'Friday Evening Schedule',
        mini.swapStatus==='approved'?'Swap Approved':'1 Swap Request'
      )+`<div class="preview-columns">
        <div class="preview-list">
          <div class="preview-row"><span class="row-icon">JC</span><div><strong>Jamie Chen · General Manager</strong><small>Fri 14:00–23:00 · Floor &amp; Duty Lead</small></div></div>
          <div class="preview-row"><span class="row-icon">AM</span><div><strong>Alex Morgan · Server</strong><small>${mini.swapStatus==='approved'?'Fri 16:00–23:00 covered by Chris Taylor':'Fri 16:00–23:00 · Swap requested with Chris Taylor'}</small></div></div>
          <div class="preview-row"><span class="row-icon">SK</span><div><strong>Sam Kim · Bar Lead</strong><small>Fri 15:00–23:30 · Service Bar</small></div></div>
        </div>
        <div class="preview-side">
          <small>${isMgr?'APPROVAL':'SHIFT SWAP'}</small>
          <div class="readiness">${mini.swapStatus==='approved'?'Covered':'Pending'}</div>
          <p>${mini.swapStatus==='approved'
            ?'Chris Taylor is confirmed on the Friday evening roster.'
            :(isMgr?'Chris Taylor is eligible and has no overtime conflict.':'Waiting for Manager Jamie to approve coverage.')}</p>
          ${isMgr
            ?(mini.swapStatus==='approved'
              ?`<button type="button" class="mini-action" data-mini="reset-swap">Reset swap</button>`
              :`<button type="button" class="mini-action" data-mini="approve-swap">Approve swap</button>`)
            :(mini.swapStatus==='approved'
              ?`<button type="button" class="mini-action done" disabled>Swap approved</button>`
              :`<button type="button" class="mini-action" data-mini="switch-to-mgr">Review as Manager</button>`)}
        </div>
      </div>`;
    }

    if(mini.view==='handover'){
      content=header(
        'SUPPLY & HANDOVER',
        isMgr?'Supply Approval & Log':'Stock & Shift Handover',
        `Limes: ${mini.limeStatus==='approved'?'Approved':'Pending'}`
      )+`<div class="preview-columns">
        <div>
          <div class="preview-note"><strong>SUPPLY REQUEST · SAM (BAR)</strong>2 cases Fresh limes (Valley Produce) — <b>${mini.limeStatus==='approved'?'Approved for morning order':'Pending approval'}</b></div>
          ${mini.notes.map(n=>`<div class="preview-note"><strong>SHIFT HANDOVER</strong>${escape(n)}</div>`).join('')}
          <label class="note-label" for="mini-note">Add a handover note</label>
          <textarea class="note-input" id="mini-note" maxlength="200" placeholder="Note for tomorrow’s opening lead..."></textarea>
        </div>
        <div class="preview-side">
          <small>${isMgr?'MORNING ORDER':'SHIFT LOG'}</small>
          <div class="readiness">${mini.notes.length}<span> note${mini.notes.length===1?'':'s'}</span></div>
          <p>${isMgr&&mini.limeStatus==='pending'?'Approve Sam’s lime request for tomorrow’s order.':'Handovers and supply requests stay attached to the shift.'}</p>
          ${isMgr&&mini.limeStatus==='pending'
            ?`<button type="button" class="mini-action" data-mini="approve-limes" style="margin-bottom:8px">Approve lime order</button>`
            :''}
          <button type="button" class="mini-action" data-mini="save-note">Save note</button>
        </div>
      </div>`;
    }

    panel.innerHTML='<div class="preview-body">'+content+'</div>';
  }

  tabs('[data-preview]',tab=>{mini.view=tab.dataset.preview;renderPreview();});

  all('[data-mini-role]').forEach(btn=>{
    btn.addEventListener('click',()=>{
      mini.role=btn.dataset.miniRole;
      renderPreview();
      toast(`Viewing as ${mini.role==='manager'?'Manager (Jamie)':'Team Member (Alex)'}`);
    });
  });

  $('#preview-panel')?.addEventListener('click',e=>{
    const b=e.target.closest('[data-mini]');
    if(!b)return;
    const act=b.dataset.mini;
    if(act==='ack'){
      mini.ackVersion=mini.version;
      renderPreview();
      toast(`Briefing v${mini.version} acknowledged.`);
    }
    if(act==='publish-v2'){
      mini.version++;
      renderPreview();
      toast(`Published Briefing v${mini.version}. Read receipts reset.`);
    }
    if(act==='submit-tasks'){
      mini.checked=[true,true,true];
      mini.taskStatus='submitted';
      renderPreview();
      toast('Checklist submitted for manager review.');
    }
    if(act==='approve-tasks'){
      mini.checked=[true,true,true];
      mini.taskStatus='approved';
      renderPreview();
      toast('Bar Opening checklist approved.');
    }
    if(act==='reset-tasks'){
      mini.checked=[false,false,false];
      mini.taskStatus='working';
      renderPreview();
    }
    if(act==='approve-swap'){
      mini.swapStatus='approved';
      renderPreview();
      toast('Friday shift swap approved.');
    }
    if(act==='reset-swap'){
      mini.swapStatus='pending';
      renderPreview();
    }
    if(act==='approve-limes'){
      mini.limeStatus='approved';
      renderPreview();
      toast('2 cases of Fresh limes approved.');
    }
    if(act==='switch-to-mgr'){
      mini.role='manager';
      renderPreview();
      toast('Switched to Manager (Jamie).');
    }
    if(act==='save-note'){
      const input=$('#mini-note');
      const n=(input?.value||'').trim();
      if(!n){input?.focus();toast('Write a short handover note first.');return;}
      mini.notes.push(`${mini.role==='manager'?'Jamie':'Alex'}: ${n.slice(0,200)}`);
      mini.notes=mini.notes.slice(-2);
      renderPreview();
      toast('Handover note saved.');
    }
  });

  $('#preview-panel')?.addEventListener('change',e=>{
    if(!e.target.matches('[data-mini-task]'))return;
    const i=Number(e.target.dataset.miniTask);
    mini.checked[i]=e.target.checked;
    renderPreview();
    $(`[data-mini-task="${i}"]`)?.focus();
  });

  const tabbar=$('.preview-tabs'), mobileSlot=$('.mini-main'), previewPanel=$('#preview-panel'), desktopSlot=$('.mini-sidebar'), member=$('.mini-member');
  function placeTabs(){
    if(!tabbar||!mobileSlot||!previewPanel||!desktopSlot||!member)return;
    if(matchMedia('(max-width:850px)').matches){
      mobileSlot.insertBefore(tabbar,previewPanel);
      tabbar.classList.add('mobile-tabs');
    }else{
      desktopSlot.insertBefore(tabbar,member);
      tabbar.classList.remove('mobile-tabs');
    }
  }
  matchMedia('(max-width:850px)').addEventListener('change',placeTabs);
  placeTabs();
  renderPreview();

  // Role Perspective Tabs (#for-teams)
  const roles={
    employee:[
      'Your shift, without the guesswork.',
      'Open your phone to see tonight’s schedule, acknowledge the briefing, check off station tasks, look up wine or allergen notes, and request a shift swap or restock.',
      'Open Team View in the workspace',
      'demo.html'
    ],
    manager:[
      'Less chasing. More leading on the floor.',
      'Publish pre-shift briefings with versioned read receipts, review submitted station checklists, approve shift swaps, and consolidate supply requests from one command inbox.',
      'Open Manager Command in the workspace',
      'demo.html#inbox'
    ],
    owner:[
      'Consistent house standards across every service.',
      'Give managers and staff a calm, repeatable operating rhythm—from opening checklists and cooler temp logs to verified allergen procedures and end-of-night handovers.',
      'Explore the full workspace',
      'demo.html'
    ]
  };
  tabs('.role-tab',tab=>{
    const r=roles[tab.dataset.role],p=$('#role-panel');
    if(!r||!p)return;
    p.setAttribute('aria-labelledby',tab.id);
    p.innerHTML=`<h3>${r[0]}</h3><p>${r[1]}</p><a class="text-link" href="${r[3]}">${r[2]} <span>↗</span></a>`;
  });

  // Scrollytelling Phone Stages (#one-shift)
  const screens=[
    `<small>FRIDAY 15:30 · BRIEFING</small>
     <h3>Start aligned<br>before 4:00 PM.</h3>
     <div class="phone-card orange">
       <strong>Tonight’s Briefing · v1</strong>
       New Paso Robles Cabernet ($16/gl) · 18 Ribeye specials · 8-top at 19:00.<br>
       <small>Published by Jamie Chen</small>
     </div>
     <div class="phone-card sage">
       <strong>✓ 6 of 8 team members ready</strong>
       Read receipts update live before doors open.
     </div>`,
    `<small>FRIDAY 16:15 · STATION OPS</small>
     <h3>Every station<br>accounted for.</h3>
     <div class="phone-check"><i>✓</i> Sanitize bar speed rails &amp; mats</div>
     <div class="phone-check"><i>✓</i> Prep citrus twists &amp; check ice</div>
     <div class="phone-check"><i>✓</i> Cooler temp logged (3.7°C)</div>
     <div class="phone-card orange">
       <strong>Supply flagged · Fresh limes</strong>
       2 cases · Sent to Manager Inbox
     </div>`,
    `<small>FRIDAY 23:15 · HANDOVER</small>
     <h3>Tomorrow’s team<br>starts ahead.</h3>
     <div class="phone-card">
       <strong>Jamie · Closing Handover</strong>
       Patio reset complete. Approved 2 cases limes &amp; 3 packs napkins for morning delivery.
     </div>
     <div class="phone-card sage">
       <strong>✓ Morning order consolidated</strong>
       Grouped by vendor with staff attribution.
     </div>`
  ];
  let activeStage=-1;
  function setStep(i){
    if(activeStage===i)return;
    activeStage=i;
    all('[data-stage]').forEach(b=>{
      const sel=Number(b.dataset.stage)===i;
      b.classList.toggle('selected',sel);
      b.setAttribute('aria-pressed',String(sel));
    });
    const screen=$('#journey-screen');
    if(screen)screen.innerHTML='<div class="phone-content">'+screens[i]+'</div>';
    all('.journey-step').forEach((s,n)=>s.classList.toggle('is-current',n===i));
  }
  setStep(0);
  all('[data-stage]').forEach(b=>b.addEventListener('click',()=>setStep(Number(b.dataset.stage))));

  // IntersectionObservers for Scroll Reveal, Phone Scrollytelling & Nav Scroll-Spy
  if('IntersectionObserver' in window){
    if(!reducedMotion)document.documentElement.classList.add('motion-ready');
    const revealObs=new IntersectionObserver(entries=>entries.forEach(e=>{
      if(e.isIntersecting){
        e.target.classList.add('revealed');
        revealObs.unobserve(e.target);
      }
    }),{threshold:0.08,rootMargin:'0px 0px -40px 0px'});
    all('.reveal').forEach(x=>revealObs.observe(x));

    const journeyObs=new IntersectionObserver(entries=>entries.forEach(e=>{
      if(e.isIntersecting&&!matchMedia('(max-width:600px)').matches){
        setStep(Number(e.target.dataset.step));
      }
    }),{rootMargin:'-25% 0px -35% 0px',threshold:0});
    all('.journey-step').forEach(x=>journeyObs.observe(x));

    const navLinks=all('.desktop-nav a[href^="#"]');
    const spyObs=new IntersectionObserver(entries=>{
      entries.forEach(e=>{
        if(e.isIntersecting){
          const id='#'+e.target.id;
          navLinks.forEach(a=>a.classList.toggle('is-active',a.getAttribute('href')===id));
        }
      });
    },{rootMargin:'-30% 0px -55% 0px',threshold:0});
    navLinks.forEach(a=>{
      const target=document.getElementById(a.getAttribute('href').slice(1));
      if(target)spyObs.observe(target);
    });
  }

  // Smooth Anchor Scrolling
  document.addEventListener('click',e=>{
    const link=e.target.closest('a[href^="#"]');
    if(!link||link.classList.contains('skip-link'))return;
    const target=document.getElementById(link.hash.slice(1));
    if(!target)return;
    e.preventDefault();
    closeMenu();
    target.scrollIntoView({behavior:reducedMotion?'instant':'smooth',block:'start'});
  });
})();
