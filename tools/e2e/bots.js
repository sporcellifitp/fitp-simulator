// robot dentro la pagina del computer: quando arriva la palla preme il mouse (eventi veri sul canvas) con un errore di
// tempo come una persona (deviazione sd secondi). Serve solo alle prove automatiche.
window.__mouseBot = function ({ sd = .05 } = {}){
  const R = window.__racchetta, cv = document.querySelector('#app canvas'), log = window.__botLog = { clicks: 0 };
  const gauss = () => { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v); };
  const click = () => { cv.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, pointerType: 'mouse', clientX: innerWidth/2, clientY: innerHeight*.45, button: 0, bubbles: true })); log.clicks++; };
  let planned = null, serve = null, tossT = 0;     // serve: null → 'tossing' (clic per lanciare) → t0 del lancio (colpo programmato)
  const at = (tc, core) => R.A.frameT + (tc - core.t)*1000 + gauss()*sd*1000;
  const tick = () => {
    const A = R.A, core = A.core;
    if (core && A.state === 'play'){
      const h = core.players.find(p => p.id === A.myId);
      if (core.phase === 'serve' && core.serverP === h){
        if (!core.toss && serve !== 'tossing' || serve === 'tossing' && !core.toss && performance.now() - tossT > 3000){ serve = 'tossing'; tossT = performance.now(); click(); }
        else if (core.toss && serve !== core.toss.t0){ serve = core.toss.t0; const w = at(core.toss.t0 + 5.1/9.81, core); setTimeout(click, Math.max(0, w - performance.now())); }
        else if (!core.toss && typeof serve === 'number') serve = null;     // lancio ripreso: si rilancia
      } else serve = null;
      if (core.phase === 'live' && h.inc && !h.done && planned !== h.inc.Tc && h.inc.Tc - core.t < .5){ planned = h.inc.Tc; const w = at(h.inc.Tc, core); setTimeout(click, Math.max(0, w - performance.now())); }
    }
    requestAnimationFrame(tick);
  };
  tick();
};
// lo stesso robot per chi è stato invitato: guarda ciò che disegna (lo stato dell'host un attimo indietro)
window.__guestMouseBot = function ({ sd = .05 } = {}){
  const R = window.__racchetta, cv = document.querySelector('#app canvas'), log = window.__botLog = { clicks: 0 };
  const gauss = () => { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v); };
  const click = () => { cv.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, pointerType: 'mouse', clientX: innerWidth/2, clientY: innerHeight*.45, button: 0, bubbles: true })); log.clicks++; };
  let planned = null, serve = null, tossT = 0;
  const tick = () => {
    const A = R.A, M = A.mirror;
    if (M && M.last && A.state === 'play' && A.guest){
      const now = performance.now(), Rt = M.renderTime(now, A.guest.clock), v = M.view(Rt), g = v.players[1];
      const at = tc => now + (tc - Rt)/M.rate*1000 + gauss()*sd*1000;      // quando la palla arriverà sullo schermo (anche se la partita va più piano)
      if (v.phase === 'serve' && v.serverId === 'g'){
        if (!v.toss && serve !== 'tossing' || serve === 'tossing' && !v.toss && now - tossT > 3000){ serve = 'tossing'; tossT = now; click(); }
        else if (v.toss && serve !== v.toss.t0){ serve = v.toss.t0; setTimeout(click, Math.max(0, at(v.toss.t0 + 5.1/9.81) - performance.now())); }
        else if (!v.toss && typeof serve === 'number') serve = null;
      } else serve = null;
      if (v.phase === 'live' && g.inc && planned !== g.inc.Tc && g.inc.Tc - Rt < .5){ planned = g.inc.Tc; setTimeout(click, Math.max(0, at(g.inc.Tc) - performance.now())); }
    }
    requestAnimationFrame(tick);
  };
  tick();
};
