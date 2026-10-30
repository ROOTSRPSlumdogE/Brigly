/* Shared preference: light on first visit; preserve an explicit dark choice. */
(function(){
  var theme='light';
  try{if(localStorage.getItem('brigly-theme')==='dark')theme='dark';}catch(e){}
  document.documentElement.dataset.theme=theme;
  var meta=document.querySelector('meta[name="theme-color"]');
  if(meta)meta.content=theme==='light'?'#F4EFE3':'#121413';
})();
