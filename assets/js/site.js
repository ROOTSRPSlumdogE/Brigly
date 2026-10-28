(() => {
  'use strict';
  const $=s=>document.querySelector(s), all=s=>[...document.querySelectorAll(s)];
  const root=document.documentElement;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const desktop=matchMedia('(min-width: 900px)');
  if(!reduced)root.classList.add('motion');

  /* ---------- Theme (shared `brigly-theme` key with the workspace app) ---------- */
  function themeLabels(){
    const dark=root.dataset.theme!=='light';
    const label='Switch to '+(dark?'light':'dark')+' mode';
    all('[data-action="theme"]').forEach(b=>{
      b.setAttribute('aria-label',label);
      if(b.classList.contains('theme-toggle-text'))b.textContent=label;
    });
    const meta=$('meta[name="theme-color"]');
    if(meta)meta.content=dark?'#0F1412':'#F6F4EF';
  }
  function setTheme(next){
    root.dataset.theme=next;
    try{localStorage.setItem('brigly-theme',next);}catch{}
    themeLabels();
  }
  document.addEventListener('click',e=>{
    const b=e.target.closest('[data-action="theme"]');
    if(!b)return;
    setTheme(root.dataset.theme==='light'?'dark':'light');
  });
  themeLabels();

  /* ---------- Header, mobile menu ---------- */
  const header=$('#site-header'), menu=$('#mobile-menu'), toggle=$('.menu-toggle');
  let scrim=null;
  function closeMenu(){
    if(!menu||menu.hidden)return;
    menu.hidden=true;
    toggle?.setAttribute('aria-expanded','false');
    toggle?.setAttribute('aria-label','Open navigation');
    scrim?.remove();scrim=null;
    document.body.style.overflow='';
  }
  function openMenu(){
    menu.hidden=false;
    toggle.setAttribute('aria-expanded','true');
    toggle.setAttribute('aria-label','Close navigation');
    scrim=document.createElement('div');
    scrim.className='scrim';
    scrim.addEventListener('click',closeMenu);
    document.body.appendChild(scrim);
    document.body.style.overflow='hidden';
  }
  toggle?.addEventListener('click',()=>menu.hidden?openMenu():closeMenu());
  menu?.querySelectorAll('a').forEach(a=>a.addEventListener('click',closeMenu));
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&menu&&!menu.hidden){closeMenu();toggle?.focus();}});
  desktop.addEventListener('change',e=>{if(e.matches)closeMenu();});

  /* ---------- Scroll: header state, hero tilt, parallax ---------- */
  const heroApp=$('#hero-app');
  const parallax=all('[data-parallax]');
  let ticking=false;
  function frame(){
    ticking=false;
    const y=window.scrollY||0;
    header?.classList.toggle('scrolled',y>12);
    if(heroApp&&!reduced){
      // Flatten the mockup as it scrolls into view: 12deg tilt at top → 0deg after ~420px.
      const t=Math.min(1,Math.max(0,y/420));
      const ease=1-Math.pow(1-t,3);
      heroApp.style.setProperty('--tilt',(12-12*ease).toFixed(2)+'deg');
      heroApp.style.setProperty('--scale',(0.96+0.04*ease).toFixed(3));
    }
    if(!reduced&&parallax.length){
      const vh=window.innerHeight;
      parallax.forEach(el=>{
        const r=el.getBoundingClientRect();
        if(r.bottom<0||r.top>vh)return;
        const mid=(r.top+r.height/2-vh/2)/vh;
        el.style.transform=`translate3d(0,${(mid*-100*Number(el.dataset.parallax||0)).toFixed(1)}px,0) scale(1.1)`;
      });
    }
  }
  window.addEventListener('scroll',()=>{if(!ticking){ticking=true;requestAnimationFrame(frame);}},{passive:true});
  window.addEventListener('resize',frame);
  frame();

  /* ---------- Reveal on scroll ---------- */
  if('IntersectionObserver' in window){
    const io=new IntersectionObserver(entries=>{
      entries.forEach(en=>{if(en.isIntersecting){en.target.classList.add('in');io.unobserve(en.target);}});
    },{rootMargin:'0px 0px -10% 0px',threshold:.08});
    all('.reveal,.stagger').forEach(el=>io.observe(el));
  }else{
    all('.reveal,.stagger').forEach(el=>el.classList.add('in'));
  }

  /* ---------- Story: sticky phone follows the step in view ---------- */
  const steps=all('.story-step'), screens=all('#story-phone .screen');
  function showStep(i){
    steps.forEach(s=>s.classList.toggle('active',Number(s.dataset.step)===i));
    screens.forEach(s=>s.classList.toggle('on',Number(s.dataset.screen)===i));
  }
  if(steps.length&&'IntersectionObserver' in window){
    const so=new IntersectionObserver(entries=>{
      // Pick the step closest to the vertical centre among those intersecting.
      let best=null,bestD=Infinity;
      const mid=window.innerHeight*(desktop.matches?0.5:0.78);
      steps.forEach(s=>{
        const r=s.getBoundingClientRect();
        if(r.bottom<0||r.top>window.innerHeight)return;
        const d=Math.abs(r.top+r.height/2-mid);
        if(d<bestD){bestD=d;best=s;}
      });
      if(best)showStep(Number(best.dataset.step));
    },{threshold:[0,.25,.5,.75,1]});
    steps.forEach(s=>so.observe(s));
    window.addEventListener('scroll',()=>{
      let best=null,bestD=Infinity;
      const mid=window.innerHeight*(desktop.matches?0.5:0.78);
      steps.forEach(s=>{
        const r=s.getBoundingClientRect();
        const d=Math.abs(r.top+r.height/2-mid);
        if(d<bestD){bestD=d;best=s;}
      });
      if(best&&!best.classList.contains('active'))showStep(Number(best.dataset.step));
    },{passive:true});
  }
  steps.forEach(s=>s.addEventListener('click',()=>showStep(Number(s.dataset.step))));

  /* ---------- Ticker: duplicate once so the loop is seamless ---------- */
  const track=$('#ticker-track');
  if(track)track.innerHTML+=track.innerHTML;

  /* ---------- Details: close siblings for a tidy FAQ ---------- */
  all('details').forEach(d=>d.addEventListener('toggle',()=>{
    if(d.open)all('details').forEach(o=>{if(o!==d)o.open=false;});
  }));
})();
