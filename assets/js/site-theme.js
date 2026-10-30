/* Runs before paint so the page never flashes the wrong theme.
   Shares the `brigly-theme` key with the workspace app; the chalkboard (dark) is the default,
   the paper menu card (light) is the alternative. */
(function(){
  var theme='dark';
  try{if(localStorage.getItem('brigly-theme')==='light')theme='light';}catch(e){}
  document.documentElement.dataset.theme=theme;
  var meta=document.querySelector('meta[name="theme-color"]');
  if(meta)meta.content=theme==='light'?'#F4EFE3':'#121413';
})();
