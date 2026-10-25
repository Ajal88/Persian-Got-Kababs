/* Setup page glue: setup <-> friend screen <-> preview of the slides. */
(function () {
  'use strict';
  const Setup = window.KASetup, $ = (s) => document.querySelector(s);
  const setupEl = $('#setup'), presEl = $('#present');

  function openPresent() {
    const st = Setup.state;
    try {
      setupEl.hidden = true;
      window.KAPresent.start({ cfg: st.cfg, images: st.images, resolved: Setup.resolved(), onExit: openSetup });
    } catch (e) { console.error(e); setupEl.hidden = false; alert('Something went wrong building the slides: ' + e.message); return; }
    location.hash = 'preview';
  }
  function openSetup() {
    window.KAPresent.stop(); setupEl.hidden = false; Setup.render(); location.hash = ''; window.scrollTo(0, 0);
  }
  function openFriend() {
    const st = Setup.state, friendEl = $('#friend');
    setupEl.hidden = true; setupEl.innerHTML = ''; // nothing of the setup stays in the page
    friendEl.hidden = false; window.scrollTo(0, 0);
    window.KAFriend.open(friendEl, st.raw2.kababNos, (res) => {
      if (res && res !== true) { st.privateMap = res; Setup.save(); }
      if (res === true) { friendEl.hidden = true; friendEl.innerHTML = ''; setupEl.hidden = false; Setup.render(); window.scrollTo(0, 0); }
    });
  }

  Setup.init(setupEl, openPresent, openFriend).then(() => {
    if (location.hash === '#preview' && Setup.validate().errors.length === 0) openPresent();
    document.body.classList.add('ready');
  });
})();
