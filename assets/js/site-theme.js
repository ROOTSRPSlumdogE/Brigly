/* Runs before paint so the page never flashes the wrong theme.
   Shares the `brigly-theme` key with the workspace app; dark is the default. */
(function(){
  var theme='dark';
  try{if(localStorage.getItem('brigly-theme')==='light')theme='light';}catch(e){}
  document.documentElement.dataset.theme=theme;
  var meta=document.querySelector('meta[name="theme-color"]');
  if(meta)meta.content=theme==='light'?'#F6F4EF':'#0F1412';
})();
