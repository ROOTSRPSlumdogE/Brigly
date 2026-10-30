(() => {
  'use strict';
  const $=s=>document.querySelector(s), all=s=>[...document.querySelectorAll(s)];
  const root=document.documentElement;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const desktop=matchMedia('(min-width: 1000px)');
  if(!reduced)root.classList.add('motion');

  const themeNow=()=>root.dataset.theme==='light'?'light':'dark';

  /* ---------- Theme (shared `brigly-theme` key with the app) ---------- */
  /* Screenshots ship with the chalkboard (dark) variant as src and the paper (light) one on data-light. */
  function swapShots(scope){
    const light=themeNow()==='light';
    (scope||document).querySelectorAll('img[data-light],img[data-dark]').forEach(img=>{
      if(!img.dataset.dark)img.dataset.dark=img.getAttribute('src');
      if(!img.dataset.light)img.dataset.light=img.getAttribute('src');
      const want=light?img.dataset.light:img.dataset.dark;
      if(img.getAttribute('src')!==want)img.setAttribute('src',want);
    });
  }
  function themeLabels(){
    const dark=themeNow()==='dark';
    const label='Switch to '+(dark?'paper':'chalkboard')+' theme';
    all('[data-action="theme"]').forEach(b=>{b.setAttribute('aria-label',label);if(b.classList.contains('theme-toggle-text'))b.textContent=label;});
    const meta=$('meta[name="theme-color"]');if(meta)meta.content=dark?'#121413':'#F4EFE3';
  }
  function setTheme(next){
    root.dataset.theme=next;
    try{localStorage.setItem('brigly-theme',next);}catch{}
    swapShots();themeLabels();stageSync();
  }
  document.addEventListener('click',e=>{const b=e.target.closest('[data-action="theme"]');if(b)setTheme(themeNow()==='light'?'dark':'light');});
  themeLabels();swapShots();

  /* ---------- Chalk writing: split [data-write] into letters, write them on when in view ---------- */
  function splitLetters(el){
    if(el.dataset.split)return;
    let i=0;
    const walk=node=>{
      [...node.childNodes].forEach(child=>{
        if(child.nodeType===3){
          const frag=document.createDocumentFragment();
          child.nodeValue.split(/(\s+)/).forEach(part=>{
            if(!part)return;
            if(/^\s+$/.test(part)){frag.appendChild(document.createTextNode(' '));return;}
            const w=document.createElement('span');w.className='w-word';
            for(const ch of part){const s=document.createElement('span');s.className='w-ch';s.textContent=ch;s.style.setProperty('--i',i++);w.appendChild(s);}
            frag.appendChild(w);
          });
          child.replaceWith(frag);
        }else if(child.nodeType===1&&!child.classList.contains('w-ch'))walk(child);
      });
    };
    walk(el);
    el.dataset.split='1';el.dataset.letters=i;
  }
  const writers=all('[data-write]');
  if(!reduced){
    writers.forEach(splitLetters);
    const wio=new IntersectionObserver(entries=>entries.forEach(en=>{
      if(!en.isIntersecting)return;
      const el=en.target;wio.unobserve(el);
      el.classList.add('is-writing');
      const n=Number(el.dataset.letters||20),speed=Number(getComputedStyle(el).getPropertyValue('--w-speed').replace('ms',''))||28;
      setTimeout(()=>{el.classList.add('is-written');el.classList.remove('is-writing');el.dispatchEvent(new CustomEvent('written',{bubbles:true}));},n*speed+400);
    }),{threshold:.4});
    writers.forEach(el=>wio.observe(el));
    /* drawn strokes */
    const dio=new IntersectionObserver(entries=>entries.forEach(en=>{if(en.isIntersecting){en.target.classList.add('is-drawn');dio.unobserve(en.target);}}),{threshold:.5});
    all('svg.draw').forEach(svg=>{
      const after=svg.dataset.after?document.getElementById(svg.dataset.after):null;
      if(after&&!after.classList.contains('is-written'))after.addEventListener('written',()=>svg.classList.add('is-drawn'),{once:true});
      else dio.observe(svg);
    });
  }else{
    writers.forEach(el=>el.classList.add('is-written'));
    all('svg.draw').forEach(svg=>svg.classList.add('is-drawn'));
  }

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

  /* ---------- Hero stage: one pinned photo, five tabs ---------- */
  const hero=$('[data-stage]');
  let stageSync=()=>{};
  if(hero){
    const tabs=[...hero.querySelectorAll('[role="tab"]')];
    const stage=hero.querySelector('.stage'), frame=hero.querySelector('.shot-frame'), img=$('#hero-shot');
    let current=0;
    function show(i,focus){
      current=i;
      tabs.forEach((t,j)=>{const on=j===i;t.setAttribute('aria-selected',on?'true':'false');t.tabIndex=on?0:-1;});
      const t=tabs[i];
      stage.dataset.tint=t.dataset.tint;
      img.dataset.light=t.dataset.light;img.dataset.dark=t.dataset.dark;img.alt=t.dataset.alt||'';
      const want=themeNow()==='light'?t.dataset.light:t.dataset.dark;
      if(img.getAttribute('src')!==want){
        frame.classList.add('is-switching');
        const next=new Image();
        next.onload=next.onerror=()=>{img.setAttribute('src',want);requestAnimationFrame(()=>frame.classList.remove('is-switching'));};
        next.src=want;
      }
      if(focus)t.focus();
    }
    stageSync=()=>show(current);
    tabs.forEach((t,i)=>{
      t.addEventListener('click',()=>show(i));
      t.addEventListener('keydown',e=>{
        const n=tabs.length;let j=null;
        if(e.key==='ArrowRight')j=(i+1)%n;else if(e.key==='ArrowLeft')j=(i-1+n)%n;else if(e.key==='Home')j=0;else if(e.key==='End')j=n-1;
        if(j!==null){e.preventDefault();show(j,true);}
      });
    });
  }

  /* ---------- The 86 flow: one record, five places, written on in sequence ---------- */
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
    [1,2,3,4,5].forEach((n,i)=>flowTimers.push(setTimeout(()=>flow.querySelector(`[data-node="${n}"]`)?.classList.add('lit'),700+i*460)));
    flowTimers.push(setTimeout(()=>flow.classList.add('done'),700+5*460+800));
  }
  if(flow){
    let played=false;
    new IntersectionObserver(entries=>entries.forEach(en=>{if(en.isIntersecting&&!played){played=true;flowPlay();}}),{threshold:.35}).observe(flow);
    $('[data-flow-replay]')?.addEventListener('click',flowPlay);
    desktop.addEventListener('change',()=>{if(played)flowPlay();});
  }

  /* ---------- Scroll choreography ---------- */
  const sticky=$('#sticky-cta');
  const heroEnd=()=>{const h=$('.hero');return h?h.offsetTop+h.offsetHeight-120:600;};
  let ticking=false;
  function frame(){
    ticking=false;
    const y=scrollY||0,vh=innerHeight;
    header?.classList.toggle('scrolled',y>12);
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

  /* ---------- Feature popups (the all-features grid) ---------- */
  const fd=$('#feature-dialog');
  if(fd&&typeof fd.showModal==='function'){
    const fdBody=fd.querySelector('.fd-body');let fdOpener=null;
    function openFeature(link){
      const tpl=$('template[data-feature="'+link.dataset.feature+'"]');if(!tpl)return false;
      fdBody.replaceChildren(tpl.content.cloneNode(true));
      const h=fdBody.querySelector('h2');if(h){h.id='fd-title';h.classList.add('is-written');}
      swapShots(fdBody);
      fdOpener=link;fd.showModal();document.body.style.overflow='hidden';
      fd.querySelector('.fd-inner').scrollTop=0;fd.querySelector('.fd-close').focus();
      return true;
    }
    document.addEventListener('click',e=>{
      const link=e.target.closest('.all-grid a[data-feature]');
      if(link){if(e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;if(openFeature(link))e.preventDefault();return;}
      if(e.target.closest('[data-fd-close]')){fd.close();return;}
      if(e.target===fd)fd.close();
    });
    fd.addEventListener('close',()=>{document.body.style.overflow='';fdBody.replaceChildren();fdOpener?.focus();fdOpener=null;});
  }
})();
