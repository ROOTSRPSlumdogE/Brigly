(() => {
  'use strict';
  const $=s=>document.querySelector(s), all=s=>[...document.querySelectorAll(s)];
  const root=document.documentElement;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const desktop=matchMedia('(min-width: 1000px)');
  const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
  if(!reduced)root.classList.add('motion');

  /* =====================================================================
     Live app previews. Every product visual is a static screenshot; the
     real app only boots into a `.live[data-src]` host when the visitor
     asks ("Make it live"), and only one instance runs at a time.
     ===================================================================== */
  const BASE={desktop:[1200,750],phone:[390,780]};
  const themeNow=()=>root.dataset.theme==='light'?'light':'dark';
  function applyTheme(frame){try{frame.contentDocument.documentElement.dataset.theme=themeNow();}catch{}}
  function fit(host){
    const screen=host.closest('.screen');if(!screen)return;
    const [w]=BASE[host.dataset.kind==='phone'?'phone':'desktop'];
    host.style.setProperty('--s',(screen.clientWidth/w).toFixed(4));
  }
  const fitter=new ResizeObserver(entries=>entries.forEach(en=>en.target.querySelectorAll('.live').forEach(fit)));
  all('.screen').forEach(s=>fitter.observe(s));

  let current=null;
  const openUrl=src=>src.replace(/embed=[^&]*&?/,'').replace(/[?&]$/,'');
  function unmount(host){
    if(!host||!host.dataset.state)return;
    host.querySelector('iframe')?.remove();
    delete host.dataset.state;
    const btn=host.parentElement.querySelector('[data-live-toggle]');
    if(btn){btn.replaceWith(liveButton());}
    if(current===host)current=null;
  }
  function liveButton(){
    const b=document.createElement('button');
    b.type='button';b.className='make-live';b.dataset.liveToggle='';b.setAttribute('aria-label','Make this preview live');
    b.innerHTML='Make it live <span aria-hidden="true">▸</span>';
    return b;
  }
  function mount(host,btn){
    if(!host||host.dataset.state)return;
    if(current&&current!==host)unmount(current);
    current=host;host.dataset.state='loading';
    if(btn){btn.dataset.state='loading';btn.innerHTML='Loading the app <span aria-hidden="true">◌</span>';btn.disabled=true;}
    const f=document.createElement('iframe');
    f.src=host.dataset.src;f.title=host.dataset.title||'Brigly app preview';
    f.setAttribute('tabindex','-1');f.loading='eager';
    let done=false;
    const ready=()=>{
      if(done)return;done=true;
      if(!f.isConnected)return;
      applyTheme(f);fit(host);host.dataset.state='ready';
      if(btn){
        const a=document.createElement('a');
        a.className='make-live';a.href=openUrl(host.dataset.src);a.target='_blank';a.rel='noopener';a.dataset.cta='live-open';
        a.innerHTML='Live · open in the demo <span aria-hidden="true">↗</span>';
        btn.replaceWith(a);
      }
    };
    f.addEventListener('load',()=>setTimeout(ready,120));
    setTimeout(ready,12000);
    fit(host);host.appendChild(f);
  }
  document.addEventListener('click',e=>{
    const btn=e.target.closest('[data-live-toggle]');if(!btn)return;
    const host=btn.parentElement.querySelector('.live[data-src]');
    mount(host,btn);
  });
  // A live instance inside a device the breakpoint hides is dropped.
  const visible=h=>h.getClientRects().length>0;
  desktop.addEventListener('change',()=>{if(current&&!visible(current))unmount(current);});

  /* ---------- Theme (shared `brigly-theme` key with the app) ---------- */
  function swapShots(){
    const light=themeNow()==='light';
    all('img[data-light]').forEach(img=>{
      if(!img.dataset.dark)img.dataset.dark=img.getAttribute('src');
      const want=light?img.dataset.light:img.dataset.dark;
      if(img.getAttribute('src')!==want)img.setAttribute('src',want);
    });
  }
  function themeLabels(){
    const dark=themeNow()==='dark';
    const label='Switch to '+(dark?'light':'dark')+' mode';
    all('[data-action="theme"]').forEach(b=>{b.setAttribute('aria-label',label);if(b.classList.contains('theme-toggle-text'))b.textContent=label;});
    const meta=$('meta[name="theme-color"]');if(meta)meta.content=dark?'#0F1412':'#F6F4EF';
  }
  function setTheme(next){
    root.dataset.theme=next;
    try{localStorage.setItem('brigly-theme',next);}catch{}
    all('.live iframe').forEach(applyTheme);
    swapShots();themeLabels();
  }
  document.addEventListener('click',e=>{const b=e.target.closest('[data-action="theme"]');if(b)setTheme(themeNow()==='light'?'dark':'light');});
  themeLabels();swapShots();

  /* ---------- Header & mobile menu ---------- */
  const header=$('#site-header'), menu=$('#mobile-menu'), toggle=$('.menu-toggle');
  let scrim=null;
  function closeMenu(){
    if(!menu||menu.hidden)return;
    menu.hidden=true;toggle?.setAttribute('aria-expanded','false');toggle?.setAttribute('aria-label','Open navigation');
    scrim?.remove();scrim=null;document.body.style.overflow='';
  }
  function openMenu(){
    menu.hidden=false;toggle.setAttribute('aria-expanded','true');toggle.setAttribute('aria-label','Close navigation');
    scrim=document.createElement('div');scrim.className='scrim';scrim.addEventListener('click',closeMenu);document.body.appendChild(scrim);
    document.body.style.overflow='hidden';
  }
  toggle?.addEventListener('click',()=>menu.hidden?openMenu():closeMenu());
  menu?.querySelectorAll('a').forEach(a=>a.addEventListener('click',closeMenu));
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&menu&&!menu.hidden){closeMenu();toggle?.focus();}});
  desktop.addEventListener('change',e=>{if(e.matches)closeMenu();});

  /* ---------- The 86 flow: one record, five screens, in sequence ---------- */
  const flow=$('[data-flow]');
  let flowTimers=[];
  function flowReset(){
    flowTimers.forEach(clearTimeout);flowTimers=[];
    flow.classList.remove('play','done');
    flow.querySelectorAll('.lit').forEach(el=>el.classList.remove('lit'));
  }
  function flowPlay(){
    if(!flow)return;
    flowReset();
    if(reduced||!desktop.matches){flow.classList.add('done');return;}
    flow.classList.add('play');
    const step=(n,ms)=>flowTimers.push(setTimeout(()=>{
      flow.querySelector(`[data-line="${n}"]`)?.classList.add('lit');
      flowTimers.push(setTimeout(()=>flow.querySelector(`[data-node="${n}"]`)?.classList.add('lit'),420));
    },ms));
    [1,2,3,4,5].forEach((n,i)=>step(n,700+i*520));
    flowTimers.push(setTimeout(()=>flow.classList.add('done'),700+5*520+900));
  }
  if(flow){
    let played=false;
    new IntersectionObserver(entries=>entries.forEach(en=>{if(en.isIntersecting&&!played){played=true;flowPlay();}}),{threshold:.35}).observe(flow);
    flow.querySelector('[data-flow-replay]')?.addEventListener('click',flowPlay);
    desktop.addEventListener('change',()=>{if(played)flowPlay();});
  }

  /* ---------- Chapters: tabs ---------- */
  const tabs=$('[data-tabs]');
  if(tabs){
    const list=[...tabs.querySelectorAll('[role="tab"]')];
    const panels=list.map(t=>document.getElementById(t.getAttribute('aria-controls')));
    function select(i,focus){
      list.forEach((t,j)=>{const on=j===i;t.setAttribute('aria-selected',on?'true':'false');t.tabIndex=on?0:-1;});
      panels.forEach((p,j)=>{const on=j===i;if(on&&p.hidden){p.hidden=false;p.classList.remove('enter');void p.offsetWidth;p.classList.add('enter');}else if(!on){p.hidden=true;p.querySelectorAll('.live[data-state]').forEach(unmount);}});
      if(focus)list[i].focus();
      list[i].scrollIntoView({block:'nearest',inline:'nearest',behavior:reduced?'auto':'smooth'});
    }
    list.forEach((t,i)=>{
      t.addEventListener('click',()=>select(i));
      t.addEventListener('keydown',e=>{
        const n=list.length;let j=null;
        if(e.key==='ArrowRight')j=(i+1)%n;else if(e.key==='ArrowLeft')j=(i-1+n)%n;else if(e.key==='Home')j=0;else if(e.key==='End')j=n-1;
        if(j!==null){e.preventDefault();select(j,true);}
      });
    });
  }

  /* ---------- Scroll choreography ---------- */
  const sticky=$('#sticky-cta');
  const heroEnd=()=>{const h=$('.hero');return h?h.offsetTop+h.offsetHeight-120:600;};
  const parallax=all('[data-parallax]');
  let ticking=false;
  function frame(){
    ticking=false;
    const y=scrollY||0,vh=innerHeight;
    header?.classList.toggle('scrolled',y>12);
    if(parallax.length&&!reduced){
      parallax.forEach(el=>{
        const r=el.getBoundingClientRect();if(r.bottom<0||r.top>vh)return;
        const mid=(r.top+r.height/2-vh/2)/vh;
        el.style.transform=`translate3d(0,${(mid*-100*Number(el.dataset.parallax||0)).toFixed(1)}px,0) scale(1.1)`;
      });
    }
    if(sticky){const closing=$('.closing');const past=y>heroEnd();const nearEnd=closing&&closing.getBoundingClientRect().top<vh;sticky.hidden=!(past&&!nearEnd&&!desktop.matches);}
  }
  const onScroll=()=>{if(!ticking){ticking=true;requestAnimationFrame(frame);}};
  addEventListener('scroll',onScroll,{passive:true});
  addEventListener('resize',onScroll);
  frame();

  /* ---------- Reveal on scroll ---------- */
  if('IntersectionObserver' in window){
    const io=new IntersectionObserver(entries=>entries.forEach(en=>{if(en.isIntersecting){en.target.classList.add('in');io.unobserve(en.target);}}),{rootMargin:'0px 0px -8% 0px',threshold:.08});
    all('.reveal,.stagger').forEach(el=>io.observe(el));
  }else all('.reveal,.stagger').forEach(el=>el.classList.add('in'));

  /* ---------- FAQ: one open at a time ---------- */
  all('details').forEach(d=>d.addEventListener('toggle',()=>{if(d.open)all('details').forEach(o=>{if(o!==d)o.open=false;});}));
})();
