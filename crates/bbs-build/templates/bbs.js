/* bbs.js — shared client-side runtime for every page in a bbs-build site.
 *
 * Responsibilities:
 *   1. Web Audio sound engine (DTMF, ring, modem squeal, disconnect).
 *   2. Terminate-style intro dialer (landing page only, first visit only).
 *   3. Quit overlay (any page) with redial back to landing.
 *   4. Hotkey navigation that follows real <a href> links by data-key.
 *   5. Focus management for keyboard navigation.
 */
(function () {
  'use strict';

  // ===================================================================
  // Web Audio sound engine
  // ===================================================================
  var ctx = null;
  function audio() {
    if (!ctx) {
      try {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
      } catch (e) { ctx = null; }
    }
    return ctx;
  }
  // Call this from inside a user-gesture handler (click/keydown) before the
  // first setTimeout that will play sound. Chrome's autoplay policy requires
  // the AudioContext to be created or resumed during the gesture itself —
  // creating it later inside a deferred callback leaves it suspended.
  function primeAudio() {
    var a = audio();
    if (a && a.state === 'suspended' && typeof a.resume === 'function') {
      a.resume();
    }
  }

  function playTone(freq, duration, type, gainVal) {
    var a = audio(); if (!a) return;
    var osc = a.createOscillator();
    var gain = a.createGain();
    osc.type = type || 'sine';
    osc.frequency.value = freq;
    gain.gain.value = gainVal == null ? 0.1 : gainVal;
    osc.connect(gain);
    gain.connect(a.destination);
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.001, a.currentTime + duration);
    osc.stop(a.currentTime + duration);
  }

  var DTMF = {
    1: [697, 1209], 2: [697, 1336], 3: [697, 1477],
    4: [770, 1209], 5: [770, 1336], 6: [770, 1477],
    7: [852, 1209], 8: [852, 1336], 9: [852, 1477],
    0: [941, 1336]
  };
  function playDTMF(d, dur) {
    var pair = DTMF[d]; if (!pair) return;
    playTone(pair[0], dur, 'sine', 0.15);
    playTone(pair[1], dur, 'sine', 0.15);
  }
  function playRing() {
    playTone(440, 0.4, 'sine', 0.1);
    playTone(480, 0.4, 'sine', 0.1);
    setTimeout(function () {
      playTone(440, 0.4, 'sine', 0.1);
      playTone(480, 0.4, 'sine', 0.1);
    }, 600);
  }
  function playModemNoise(duration) {
    var a = audio(); if (!a) return;
    var bufferSize = a.sampleRate * duration;
    var buffer = a.createBuffer(1, bufferSize, a.sampleRate);
    var data = buffer.getChannelData(0);
    var third = Math.floor(bufferSize / 3);
    for (var i = 0; i < third; i++) {
      var t = i / a.sampleRate;
      data[i] = 0.08 * Math.sin(2 * Math.PI * 1200 * t) +
                0.06 * Math.sin(2 * Math.PI * 2400 * t);
    }
    for (var i = third; i < third * 2; i++) {
      var t = i / a.sampleRate;
      var freq = 600 + 2000 * Math.sin(t * 50);
      data[i] = 0.07 * Math.sin(2 * Math.PI * freq * t) +
                0.04 * (Math.random() * 2 - 1);
    }
    for (var i = third * 2; i < bufferSize; i++) {
      var t = i / a.sampleRate;
      var sweep = 1800 + 600 * Math.sin(t * 30);
      data[i] = 0.06 * Math.sin(2 * Math.PI * sweep * t) +
                0.03 * Math.sin(2 * Math.PI * (sweep * 1.5) * t);
    }
    var src = a.createBufferSource();
    src.buffer = buffer;
    var gain = a.createGain();
    gain.gain.value = 0.5;
    src.connect(gain); gain.connect(a.destination);
    gain.gain.exponentialRampToValueAtTime(0.001, a.currentTime + duration);
    src.start();
  }
  function playDisconnect() {
    playTone(480, 0.3, 'sine', 0.15);
    playTone(620, 0.3, 'sine', 0.15);
    setTimeout(function () {
      playTone(480, 0.3, 'sine', 0.12);
      playTone(620, 0.3, 'sine', 0.12);
    }, 500);
  }

  // ===================================================================
  // Intro dialer (landing page only)
  // ===================================================================
  var dialStarted = false;

  function pad(text, width) {
    while (text.length < width) text += ' ';
    return text.substring(0, width);
  }
  function setLog(n, text, cls) {
    var el = document.getElementById('modem-log' + (n === 1 ? '' : n));
    if (el) {
      el.className = cls || 'd';
      el.textContent = pad(text, 60);
    }
  }
  function setDialStatus(text, cls) {
    var el = document.getElementById('dial-status'); if (!el) return;
    el.className = cls || 'Y';
    el.textContent = pad(text, 60);
  }

  function startDial(phoneDigits) {
    if (dialStarted) return;
    dialStarted = true;

    setDialStatus('Dialing...', 'G');
    setLog(1, 'ATZ', 'w');
    setTimeout(function () { setLog(1, 'OK', 'G'); }, 300);
    setTimeout(function () {
      setLog(2, 'ATDT ' + (phoneDigits || []).join(''), 'w');
    }, 600);

    for (var i = 0; i < phoneDigits.length; i++) {
      (function (idx) {
        setTimeout(function () { playDTMF(phoneDigits[idx], 0.12); }, 800 + idx * 120);
      })(i);
    }

    setTimeout(function () { setLog(3, 'RINGING...', 'Y'); playRing(); }, 2400);
    setTimeout(function () { playRing(); }, 4400);
    setTimeout(function () {
      setLog(3, 'CONNECT', 'G');
      setLog(4, 'Negotiating...', 'Y');
      playModemNoise(3.5);
    }, 6000);
    setTimeout(function () {
      setLog(4, 'CONNECT 14400/ARQ/V.32bis/LAPM/V.42bis', 'G');
      setDialStatus('Connected!', 'G');
    }, 8500);

    // After dial completes, navigate to the main BBS page.
    setTimeout(function () {
      window.location.href = '/main/';
    }, 9800);
  }

  function bootIntro() {
    var intro = document.getElementById('intro');
    if (!intro) return; // not on intro page
    var phoneAttr = intro.getAttribute('data-phone-digits') || '';
    var digits = phoneAttr.split('').filter(function (c) { return c >= '0' && c <= '9'; })
      .map(function (c) { return parseInt(c, 10); });

    // Prime the audio context on the first user gesture anywhere on the
    // page (click, key, tap). Browsers gate AudioContext creation/resume
    // on user activation; without this, the auto-dial's setTimeout-driven
    // sound calls would hit a suspended context and play nothing. Capture
    // phase + once-only so this fires before any other handler and unbinds.
    function primeOnce() {
      audio();        // create the context inside the user gesture
      primeAudio();   // resume it if Chrome started it suspended
      document.removeEventListener('pointerdown', primeOnce, true);
      document.removeEventListener('keydown', primeOnce, true);
      document.removeEventListener('touchstart', primeOnce, true);
    }
    document.addEventListener('pointerdown', primeOnce, true);
    document.addEventListener('keydown', primeOnce, true);
    document.addEventListener('touchstart', primeOnce, true);

    // Auto-dial countdown — Terminate's auto-redial behavior. Tick once per
    // second; at zero, dial. Any click or keypress short-circuits it.
    var countdown = 5;
    var countdownTimer = null;
    function tickCountdown() {
      if (dialStarted) return;
      if (countdown > 0) {
        setDialStatus('Auto-dialing in ' + countdown + ' seconds... (or press any key)', 'Y');
        countdown--;
        countdownTimer = setTimeout(tickCountdown, 1000);
      } else {
        startDial(digits);
      }
    }
    function cancelCountdown() {
      if (countdownTimer) { clearTimeout(countdownTimer); countdownTimer = null; }
    }
    tickCountdown();

    intro.addEventListener('click', function () {
      cancelCountdown();
      startDial(digits);
    });
    document.addEventListener('keydown', function (e) {
      if (!dialStarted) {
        cancelCountdown();
        startDial(digits);
      }
    });
  }

  // ===================================================================
  // Quit overlay (any page)
  // ===================================================================
  // Per-position timing and color palette tuned to match the original BBS
  // pacing. Index N applies to the Nth message in site.yaml. Past the end of
  // the array the runtime falls back to a uniform 1200ms delay and gray.
  var QUIT_DELAYS  = [0, 800, 2000, 3200, 4500, 5800, 7000, 8200, 9200, 10000, 11500, 14000];
  var QUIT_COLORS  = ['Y','w','d','d','d','d','G','C','w','R','Y','G'];
  var QUIT_PRELINES= [2,   1,  1,  1,  1,  1,  2,  2,  1,  2,  3,  2];

  function fillQuitTokens(text) {
    return text
      .replace(/\{caller\}/g, String(Math.floor(Math.random() * 9000) + 1000))
      .replace(/\{minutes\}/g, String(Math.floor(Math.random() * 45) + 5));
  }

  function showQuit() {
    var qs = document.getElementById('quit-screen');
    var t = document.getElementById('t');
    var intro = document.getElementById('intro');
    if (!qs) return;
    if (qs.style.display === 'block') return;
    // Prime the audio context inside the user gesture so the deferred
    // disconnect tone (fired ~10s later via setTimeout) is allowed to play.
    primeAudio();
    if (t) t.style.display = 'none';
    qs.style.display = 'block';
    qs.innerHTML = '';

    var sb = document.getElementById('statusbar');
    if (sb) sb.textContent = ' NO CARRIER';

    var raw = qs.getAttribute('data-messages') || '';
    var msgs = raw ? JSON.parse(raw) : ['Goodbye.'];

    msgs.forEach(function (msg, i) {
      var delay = (i < QUIT_DELAYS.length) ? QUIT_DELAYS[i] : (QUIT_DELAYS[QUIT_DELAYS.length - 1] + (i - QUIT_DELAYS.length + 1) * 1200);
      setTimeout(function () {
        var span = document.createElement('span');
        var isNoCarrier = msg === 'NO CARRIER';
        var isLast = i === msgs.length - 1;
        var color = isNoCarrier ? 'R' : (QUIT_COLORS[i] || 'd');
        span.className = color;
        var preCount = (i < QUIT_PRELINES.length) ? QUIT_PRELINES[i] : 1;
        var prefix = '';
        for (var p = 0; p < preCount; p++) prefix += '\n';
        span.textContent = prefix + ' ' + fillQuitTokens(msg);
        if (isNoCarrier) playDisconnect();
        if (isLast) {
          span.classList.add('ml');
          span.style.cursor = 'pointer';
          span.onclick = function () { window.location.href = '/'; };
        }
        qs.appendChild(span);
      }, delay);
    });
  }

  // ===================================================================
  // Main-menu arrow-key navigation
  // ===================================================================
  // Highlight bar that follows arrow keys / j/k / mouse hover. Only active
  // when the page has elements marked [data-menu-item] (currently: the main
  // menu on the landing page). Sub-pages have hotkeys but no highlight bar.
  var menuItems = [];
  var focusedIdx = -1;
  // 'vertical' (use up/down), 'horizontal' (use left/right and free up/down
  // for browser scrolling), or 'none' (single item — arrows scroll freely).
  var menuOrientation = 'none';

  function detectMenuOrientation() {
    if (menuItems.length < 2) return 'none';
    var t1 = menuItems[0].getBoundingClientRect().top;
    var t2 = menuItems[menuItems.length - 1].getBoundingClientRect().top;
    // > 5px apart vertically → stacked vertically. Otherwise on one line.
    return Math.abs(t1 - t2) > 5 ? 'vertical' : 'horizontal';
  }

  function refreshMenuFocus() {
    for (var i = 0; i < menuItems.length; i++) {
      if (i === focusedIdx) menuItems[i].classList.add('focused');
      else menuItems[i].classList.remove('focused');
    }
  }
  function moveMenuFocus(delta) {
    if (!menuItems.length) return;
    if (focusedIdx < 0) focusedIdx = 0;
    else focusedIdx = (focusedIdx + delta + menuItems.length) % menuItems.length;
    refreshMenuFocus();
  }
  function activateFocusedMenu() {
    if (focusedIdx < 0 || focusedIdx >= menuItems.length) return;
    var el = menuItems[focusedIdx];
    if (!el) return;
    // Anchors navigate via href; spans (the [Q]uit row) trigger their onclick.
    if (el.tagName === 'A' && el.href) {
      window.location.href = el.href;
    } else {
      el.click();
    }
  }
  function initMenuNav() {
    menuItems = Array.prototype.slice.call(
      document.querySelectorAll('[data-menu-item]')
    );
    if (!menuItems.length) return;

    // Pick the initial focus.
    //   - On /blog/, prefer the first numbered blog post link.
    //   - Otherwise prefer a menu item whose href matches the current path.
    //   - Otherwise default to the first item.
    focusedIdx = 0;
    var here = window.location.pathname;
    if (here === '/blog/') {
      for (var i = 0; i < menuItems.length; i++) {
        if (menuItems[i].hasAttribute('data-blog-number')) {
          focusedIdx = i;
          break;
        }
      }
    } else {
      for (var j = 0; j < menuItems.length; j++) {
        var href = menuItems[j].getAttribute('href');
        if (!href) continue;
        try {
          var resolved = new URL(href, window.location.origin).pathname;
          if (resolved === here) { focusedIdx = j; break; }
        } catch (e) {}
      }
    }
    refreshMenuFocus();
    menuOrientation = detectMenuOrientation();

    menuItems.forEach(function (el, idx) {
      el.addEventListener('mouseenter', function () {
        focusedIdx = idx;
        refreshMenuFocus();
      });
    });
  }

  // ===================================================================
  // Numeric blog selection (/blog/ only)
  // ===================================================================
  // The bottom prompt becomes the input field while active. Triggered by
  // clicking [G] Go to post number, or pressing G, on the blog index.
  var blogInputActive = false;
  var blogBuffer = '';

  function bbsBlogPrompt() {
    blogInputActive = true;
    blogBuffer = '';
    refreshPrompt();
  }

  function tryBlogNumberKey(e) {
    if (!blogInputActive) return false;

    if (/^[0-9]$/.test(e.key)) {
      e.preventDefault();
      if (blogBuffer.length < 6) blogBuffer += e.key;
      refreshPrompt();
      return true;
    }
    if (e.key === 'Backspace') {
      e.preventDefault();
      blogBuffer = blogBuffer.slice(0, -1);
      refreshPrompt();
      return true;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (blogBuffer.length > 0) {
        var n = parseInt(blogBuffer, 10);
        var link = document.querySelector('[data-blog-number="' + n + '"]');
        if (link) { window.location.href = link.href; return true; }
      }
      // No input or no match: just exit input mode.
      blogBuffer = '';
      blogInputActive = false;
      refreshPrompt();
      return true;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      blogBuffer = '';
      blogInputActive = false;
      refreshPrompt();
      return true;
    }
    // Swallow everything else while in input mode so menu nav doesn't
    // intercept the user's typing accidentally.
    return false;
  }

  // ===================================================================
  // Keyboard navigation: data-key hotkeys click their <a>
  // ===================================================================
  function bindKeys() {
    document.addEventListener('keydown', function (e) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      var qs = document.getElementById('quit-screen');
      if (qs && qs.style.display === 'block') {
        if (e.key.toUpperCase() === 'R') {
          e.preventDefault();
          window.location.href = '/';
        }
        return;
      }

      // Numeric blog selection takes priority on /blog/ so digits/Enter/
      // Backspace/Esc-with-buffer feed the input rather than the menu.
      if (tryBlogNumberKey(e)) return;

      // Esc navigates up one level: blog post → /blog/, page → /main/.
      // On /main/ or / there's nowhere to go, so do nothing.
      if (e.key === 'Escape') {
        var p = window.location.pathname.replace(/\/+$/, '') || '/';
        if (p === '/' || p === '/main') return;
        var parent = p.substring(0, p.lastIndexOf('/'));
        // Top-level pages like /about → go to /main
        if (!parent || parent === '') parent = '/main';
        e.preventDefault();
        window.location.href = parent + '/';
        return;
      }

      // Menu navigation keys.
      //
      // Vertical menus (main menu, blog index): up/down moves focus.
      // Horizontal menus (blog post nav strip): left/right moves focus,
      //   and up/down is left alone so the browser can scroll the page.
      // Single-item / no menu: all arrow keys fall through to the browser.
      if (menuItems.length) {
        switch (e.key) {
          case 'ArrowUp':
            if (menuOrientation === 'vertical') {
              e.preventDefault(); moveMenuFocus(-1); return;
            }
            break;
          case 'ArrowDown':
            if (menuOrientation === 'vertical') {
              e.preventDefault(); moveMenuFocus(1); return;
            }
            break;
          case 'ArrowLeft':
            if (menuOrientation !== 'none') {
              e.preventDefault(); moveMenuFocus(-1); return;
            }
            break;
          case 'ArrowRight':
            if (menuOrientation !== 'none') {
              e.preventDefault(); moveMenuFocus(1); return;
            }
            break;
          case 'Home':
            if (menuOrientation !== 'none') {
              e.preventDefault(); focusedIdx = 0; refreshMenuFocus(); return;
            }
            break;
          case 'End':
            if (menuOrientation !== 'none') {
              e.preventDefault(); focusedIdx = menuItems.length - 1; refreshMenuFocus(); return;
            }
            break;
          case 'Enter':
            if (menuOrientation !== 'none') {
              e.preventDefault(); activateFocusedMenu(); return;
            }
            break;
          // Space intentionally NOT intercepted — the browser uses it as
          // page-down scroll, which is the BBS-friendly behavior here.
        }
      }

      var k = e.key.toUpperCase();
      if (k === 'Q') { e.preventDefault(); showQuit(); return; }
      if (k === 'G' && window.location.pathname === '/blog/') {
        e.preventDefault(); bbsBlogPrompt(); return;
      }
      // Hotkey letters: find an <a> with a matching data-key and navigate.
      var el = document.querySelector('a[data-key="' + k + '"]');
      if (el && el.href) { e.preventDefault(); window.location.href = el.href; }
    });
  }

  function bindFocus() {
    var t = document.getElementById('t');
    if (!t) return;
    document.addEventListener('click', function (e) {
      if (e.target.tagName !== 'A') t.focus();
    });
    t.focus();
  }

  // ===================================================================
  // Bottom prompt: rotates atmospheric "Command >" lines, or shows the
  // active blog-number input. Single source of truth for the prompt's HTML.
  // ===================================================================
  var promptIdx = 0;
  var PROMPT_TEXTS = [
    'Command &gt;', 'Your choice, caller? &gt;',
    'Select option &gt;', 'Press a key... &gt;'
  ];

  function refreshPrompt() {
    var el = document.getElementById('bbs-prompt');
    if (!el) return;
    if (blogInputActive) {
      el.innerHTML = '<span class="G">Blog number &gt;</span> ' +
                     '<span class="W">' + escHtml(blogBuffer) + '</span>' +
                     '<span class="cur"></span>';
    } else {
      el.innerHTML = '<span class="G">' + PROMPT_TEXTS[promptIdx] + '</span> ' +
                     '<span class="cur"></span>';
    }
  }
  function escHtml(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function bootPromptRotation() {
    if (!document.getElementById('bbs-prompt')) return;
    refreshPrompt();
    setInterval(function () {
      if (blogInputActive) return;
      promptIdx = (promptIdx + 1) % PROMPT_TEXTS.length;
      refreshPrompt();
    }, 8000);
  }

  // ===================================================================
  // Boot
  // ===================================================================
  function boot() {
    bootIntro();
    bindKeys();
    bindFocus();
    bootPromptRotation();
    initMenuNav();

    // Expose globals used by inline onclick handlers in the rendered HTML.
    window.bbsQuit = showQuit;
    window.bbsBlogPrompt = bbsBlogPrompt;
  }

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () {
      document.body.classList.remove('loading');
      boot();
    });
  } else {
    document.body.classList.remove('loading');
    boot();
  }
})();
