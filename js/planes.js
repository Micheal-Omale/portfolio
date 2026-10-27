/* ==========================================================================
   planes.js — paper planes that travel down the page with you, and that
   you can play with.
   · A cobalt wingman follows the cursor, circles you when you stop, perches
     on buttons you hover, and loops when you click empty space.
   · A small flock wanders the viewport; a scroll is a gust that sweeps them
     past, and they fly back. Click one to catch it (it bursts into confetti).
   · Press and drag on empty space, then let go: you throw a new plane. It
     glides on lift and gravity, and loops if you throw it hard.
   · Press and hold: the flock falls into a V behind the wingman. Let go and
     they scatter.
   One fixed 2D canvas over the page; it never takes a click itself.
   ========================================================================== */
(() => {
  const DR = (window.DR = window.DR || {});

  const CFG = {
    flock: { fine: 3, touch: 2 }, // a few, so they're a delight rather than weather
    wander: { speed: 62, turn: 2.2, spring: 1.8 },
    wingman: { max: 560, force: 1500, offset: [-54, -34], orbit: 70, idle: 1.1, loop: 0.95 },
    // scrolling: the wingman leaves you and rides a curve tied to scroll position
    ride: { threshold: 1.2, linger: 0.9, max: 1150, force: 3200, fx: 640, fy: 410, trail: 72 },
    // headings arriving mid-scroll get underlined in grease pencil, with a loop at the end
    flourish: {
      speed: 820, width: 2.6, hold: 2.2, fade: 1.4, again: 30,
      targets: ".work .sec-head h2, .services .sec-head h2, .process-head h3, .archive h2, .story h2, .arcade h2, .contact-title, .manifesto-text",
      // [fraction of text width, px across, px below the text's bottom]
      // swoop in, underline, curl a small loop at the end, then climb away
      // (the text box already includes the font's descent, so the line rides just under the letters)
      path: [[0, -46, -44], [0, -12, -2], [0.25, 0, 5], [0.5, 0, 1], [0.75, 0, 7], [1, 0, 2], [1, 30, -12], [1, 30, -40], [1, 6, -38], [1, 6, -14], [1, 36, 0], [1, 84, -12], [1, 130, -64]],
      ink: [0.08, 0.84], // the part of the path that leaves pencil behind
    },
    flee: { radius: 150, force: 1600 },
    gust: 0.62, // scroll velocity → displacement, scaled by each plane's depth
    trail: { wingman: 44, flock: 14, thrown: 22, every: 0.018 },
    // a thrown plane: gravity pulls down, lift acts across the flight path (∝ speed²)
    glide: { gravity: 520, lift: 0.0034, drag: 0.0005, min: 260, max: 1500, life: 14, cap: 14 },
    hold: 0.38, // seconds held still before the flock forms up
    dragStart: 10, // px of travel before a press becomes a throw
    catchRadius: 24,
    formation: { back: 34, side: 28 },
    color: {
      paper: "#fffdf9", fold: "#e7e0d2", ink: "rgba(23,21,15,0.55)", shadow: "rgba(23,21,15,0.13)",
      cobalt: "#2b45ff", cobaltDeep: "#1b2fd0", lime: "#d9ff5a", limeDeep: "#b9df2c", ochre: "#e8b04a", ochreDeep: "#c48f2c",
    },
  };
  // things a press should leave alone: text, media, controls and the page's own toys
  const BUSY = "a, button, input, textarea, select, label, p, h1, h2, h3, h4, li, dt, dd, figcaption, img, svg, canvas, video, kbd, .screen, .sheet, .hang, .case-media, .print, .tray, .marquee, .pill, .mw, [data-cursor]";

  const TAU = Math.PI * 2;
  const rand = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const angleTo = (a, b) => Math.atan2(Math.sin(b - a), Math.cos(b - a)); // shortest signed turn

  DR.planes = {
    init({ gsap, reduced, finePointer, tickers }) {
      if (reduced) return;
      const C = CFG.color;
      const cvs = document.createElement("canvas");
      cvs.className = "planes";
      cvs.setAttribute("aria-hidden", "true");
      document.body.appendChild(cvs);
      const ctx = cvs.getContext("2d");
      const html = document.documentElement;
      const contact = document.querySelector(".contact");

      let W = 0, H = 0, dpr = 1;
      const size = () => {
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        W = innerWidth;
        H = innerHeight;
        cvs.width = W * dpr;
        cvs.height = H * dpr;
      };
      size();
      window.addEventListener("resize", size);

      const make = (o) => Object.assign({ vx: 0, vy: 0, heading: 0, bank: 0, trail: [], trailT: 0 }, o);
      const SKINS = [
        [C.paper, C.fold, C.ink], [C.paper, C.fold, C.ink],
        [C.cobalt, C.cobaltDeep, "rgba(255,253,249,0.55)"], [C.ochre, C.ochreDeep, "rgba(23,21,15,0.45)"],
      ];

      // ---------- the flock --------------------------------------------------
      const flock = Array.from({ length: finePointer ? CFG.flock.fine : CFG.flock.touch }, () => {
        const s = rand(0.75, 1.45);
        const p = make({ x: rand(0, W), y: rand(H * 0.1, H * 0.9), s, depth: s / 1.45, wa: rand(0, TAU), band: rand(0.14, 0.86), away: 0 });
        p.vx = Math.cos(p.wa) * CFG.wander.speed * s;
        p.vy = Math.sin(p.wa) * CFG.wander.speed * s;
        return p;
      });
      // back in from a random edge, a moment after being caught
      const reenter = (p) => {
        const e = (Math.random() * 4) | 0;
        p.x = e === 0 ? -30 : e === 1 ? W + 30 : rand(0, W);
        p.y = e === 2 ? -30 : e === 3 ? H + 30 : rand(H * 0.15, H * 0.85);
        p.wa = Math.atan2(H / 2 - p.y, W / 2 - p.x);
        p.vx = Math.cos(p.wa) * 120;
        p.vy = Math.sin(p.wa) * 120;
        p.trail.length = 0;
      };

      // ---------- thrown planes ------------------------------------------------
      const thrown = [];
      function launch(x, y, vx, vy) {
        const sp = Math.hypot(vx, vy);
        const G = CFG.glide;
        if (sp < G.min) {
          const d = sp > 1 ? sp : 1;
          vx = (vx / d || 1) * G.min;
          vy = (vy / d) * G.min - 60;
        } else if (sp > G.max) {
          vx *= G.max / sp;
          vy *= G.max / sp;
        }
        const skin = SKINS[(Math.random() * SKINS.length) | 0];
        // the belly side stays fixed for the whole flight, so a hard throw loops instead of wobbling
        thrown.push(make({ x, y, vx, vy, s: 1.25, heading: Math.atan2(vy, vx), belly: vx >= 0 ? 1 : -1, life: G.life, skin }));
        if (thrown.length > G.cap) thrown.shift();
      }
      function glide(p, dt) {
        const G = CFG.glide;
        const sp = Math.hypot(p.vx, p.vy) || 1;
        const dx = p.vx / sp, dy = p.vy / sp;
        const nx = dy * p.belly, ny = -dx * p.belly; // perpendicular to the path, toward the belly's "up"
        const lift = G.lift * sp * sp;
        p.vx += (nx * lift - G.drag * p.vx * sp) * dt;
        p.vy += (ny * lift - G.drag * p.vy * sp + G.gravity) * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
      }

      // ---------- the wingman ------------------------------------------------
      const wing = make({ x: -60, y: H * 0.3, s: 1.55, loop: 0, loopA: 0 });
      const M = { x: W * 0.6, y: H * 0.4, seen: false, still: 0, tapT: 0 };
      let perch = null;

      // ---------- scroll choreography: ride, and sign the headings ---------------
      let rideT = 0, scrolledT = 0, flo = null;
      const inks = [];
      const signed = new Map(); // heading → when it was last signed
      const signable = [...document.querySelectorAll(CFG.flourish.targets)];
      const range = document.createRange();
      // the box around a heading's actual glyphs — only text nodes count, so the
      // full-width line wrappers SplitText adds can't stretch it
      const textBox = (el) => {
        const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
        let l = Infinity, tp = Infinity, rt = -Infinity, bt = -Infinity;
        for (let n = walk.nextNode(); n; n = walk.nextNode()) {
          if (!n.nodeValue.trim()) continue;
          range.selectNodeContents(n);
          for (const r of range.getClientRects()) {
            if (!r.width) continue;
            l = Math.min(l, r.left); tp = Math.min(tp, r.top); rt = Math.max(rt, r.right); bt = Math.max(bt, r.bottom);
          }
        }
        return rt > l ? { left: l, top: tp, right: rt, bottom: bt, width: rt - l, height: bt - tp } : null;
      };
      // Catmull-Rom through the flourish's control points, sampled densely, in heading-relative units
      const flourishPath = (() => {
        const P = CFG.flourish.path, out = [];
        for (let i = 0; i < P.length - 1; i++) {
          const p0 = P[i - 1] || P[i], p1 = P[i], p2 = P[i + 1], p3 = P[i + 2] || p2;
          for (let s = 0; s < 12; s++) {
            const t = s / 12, t2 = t * t, t3 = t2 * t;
            out.push([0, 1, 2].map((k) => 0.5 * (2 * p1[k] + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3)));
          }
        }
        out.push(P[P.length - 1]);
        return out;
      })();
      const place = (q, r) => [r.left + q[0] * r.width + q[1], r.bottom + q[2]];
      function startFlourish(el, r) {
        signed.set(el, performance.now() / 1000);
        // cumulative lengths in screen space, measured once at the start
        const L = [0];
        for (let i = 1; i < flourishPath.length; i++) {
          const a = place(flourishPath[i - 1], r), b = place(flourishPath[i], r);
          L.push(L[i - 1] + Math.hypot(b[0] - a[0], b[1] - a[1]));
        }
        const ink = { el, pts: [], age: -1, blue: false };
        inks.push(ink);
        flo = { el, L, d: 0, ink, approach: 1.4 }; // fly to the start first, never teleport
      }
      const loopWing = () => {
        if (wing.loop > 0) return;
        wing.loop = CFG.wingman.loop;
        wing.loopA = Math.atan2(wing.vy, wing.vx);
      };

      // ---------- confetti + little notes -------------------------------------
      const bits = [];
      function burst(x, y, colors, n = 18) {
        for (let i = 0; i < n; i++) {
          const a = rand(0, TAU), v = rand(80, 320);
          bits.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 120, r: rand(0, TAU), vr: rand(-12, 12), life: rand(0.6, 1.1), c: colors[i % colors.length], w: rand(3, 6), h: rand(2, 4) });
        }
      }
      const notes = [];
      const note = (x, y, text) => notes.push({ x, y, text, life: 1.1 });
      let caught = 0;

      // catch whatever is under the pointer (a flock plane or a thrown one)
      function tryCatch(x, y) {
        let best = null, bd = CFG.catchRadius;
        for (const p of flock) { const d = Math.hypot(p.x - x, p.y - y); if (!p.away && d < bd) { best = p; bd = d; } }
        for (const p of thrown) { const d = Math.hypot(p.x - x, p.y - y); if (d < bd) { best = p; bd = d; } }
        if (!best) return false;
        caught++;
        burst(best.x, best.y, best.skin ? [best.skin[0], best.skin[1], C.cobalt] : [C.paper, C.cobalt, C.ochre, C.fold]);
        note(best.x, best.y - 14, `+1 · ${caught} caught`);
        if (best.skin) thrown.splice(thrown.indexOf(best), 1);
        else best.away = 1.4;
        return true;
      }

      // ---------- input -----------------------------------------------------------
      const D = { down: false, mode: null, x0: 0, y0: 0, t0: 0, hist: [] };
      const now = () => performance.now() / 1000;
      const flick = () => {
        const h = D.hist, last = h[h.length - 1];
        let old = h[0];
        for (const s of h) if (last.t - s.t <= 0.08) { old = s; break; }
        const dt = Math.max(0.016, last.t - old.t);
        let vx = (last.x - old.x) / dt, vy = (last.y - old.y) / dt;
        // a slow or paused drag aims like a slingshot: the drag itself sets direction and strength
        if (Math.hypot(vx, vy) < 200) { vx = (last.x - D.x0) * 5; vy = (last.y - D.y0) * 5; }
        return [vx, vy];
      };

      if (finePointer) {
        window.addEventListener("pointermove", (e) => {
          if (e.pointerType !== "mouse") return;
          M.x = e.clientX; M.y = e.clientY; M.seen = true; M.still = 0;
          if (!D.down) return;
          D.hist.push({ x: e.clientX, y: e.clientY, t: now() });
          while (D.hist.length > 2 && now() - D.hist[0].t > 0.2) D.hist.shift();
          if (D.mode === "pending" && Math.hypot(e.clientX - D.x0, e.clientY - D.y0) > CFG.dragStart) D.mode = "throw";
        }, { passive: true });
        document.addEventListener("pointerdown", (e) => {
          if (e.pointerType !== "mouse" || e.button !== 0 || html.classList.contains("is-flying")) return;
          if (e.target.closest(BUSY)) return;
          e.preventDefault(); // no text selection while you wind up a throw
          Object.assign(D, { down: true, mode: "pending", x0: e.clientX, y0: e.clientY, t0: now(), hist: [{ x: e.clientX, y: e.clientY, t: now() }] });
        });
        window.addEventListener("pointerup", (e) => {
          if (!D.down) return;
          D.down = false;
          if (D.mode === "throw") {
            const [vx, vy] = flick();
            launch(e.clientX, e.clientY, vx, vy);
          } else if (D.mode === "rally") {
            // scatter: every plane bursts away from the cursor
            flock.forEach((p) => {
              const dx = p.x - M.x, dy = p.y - M.y, d = Math.hypot(dx, dy) || 1;
              p.vx = (dx / d) * 520; p.vy = (dy / d) * 520; p.wa = Math.atan2(dy, dx);
            });
            loopWing();
          } else if (!tryCatch(e.clientX, e.clientY)) loopWing();
          D.mode = null;
        });
        // the wingman perches on the button you're hovering
        document.addEventListener("pointerover", (e) => {
          const b = e.target.closest(".btn");
          perch = b && !b.closest(".screen.is-full") ? b : null;
        });
      } else {
        // touch: a tap catches a plane, or calls the wingman over for a loop
        document.addEventListener("click", (e) => {
          if (e.target.closest("a, button, input, .screen, .sheet, .hang")) return;
          if (tryCatch(e.clientX, e.clientY)) return;
          M.x = e.clientX; M.y = e.clientY; M.tapT = 1.8;
          loopWing();
        });
      }

      // ---------- a one-time hint, so people find the toys ------------------------
      const tip = document.createElement("p");
      tip.className = "plane-tip mono";
      tip.setAttribute("aria-hidden", "true");
      tip.innerHTML = finePointer
        ? "Psst — <b>drag</b> on empty space to throw a plane.<br><b>Hold</b> to fly in formation. <b>Click</b> one to catch it."
        : "Psst — <b>tap</b> the little planes to catch them.";
      document.body.appendChild(tip);
      let tipOn = false;
      try {
        if (!sessionStorage.getItem("mo-plane-tip")) {
          gsap.delayedCall(7, () => {
            if (html.classList.contains("is-flying")) return;
            tipOn = true;
            sessionStorage.setItem("mo-plane-tip", "1");
            gsap.fromTo(tip, { opacity: 0, scale: 0.8 }, { opacity: 1, scale: 1, duration: 0.5, ease: "back.out(2)" });
            gsap.to(tip, { opacity: 0, duration: 0.4, delay: 6.5, onComplete: () => (tipOn = false) });
          });
        }
      } catch {}
      // it's a whisper, not a sign: the moment you scroll on, it gets out of the way
      window.addEventListener("scroll", () => {
        if (!tipOn) return;
        tipOn = false;
        gsap.to(tip, { opacity: 0, scale: 0.92, duration: 0.18, ease: "power2.in", overwrite: true });
      }, { passive: true });

      // fade in once the intro has played
      const layer = { a: 0 };
      gsap.to(layer, { a: 1, duration: 1.6, delay: 1.8, ease: "power2.out" });

      // ---------- drawing ------------------------------------------------------
      const PLANE = (c) => { c.beginPath(); c.moveTo(13, 0); c.lineTo(-10, -9); c.lineTo(-5, 0); c.lineTo(-10, 9); c.closePath(); };
      function drawPlane(p, fillA, fillB, stroke, alpha = 1) {
        ctx.save();
        ctx.globalAlpha *= alpha;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.heading);
        // banking: foreshorten across the wings, and the dipped wing darkens
        ctx.scale(p.s, p.s * (1 - Math.min(0.55, Math.abs(p.bank) * 0.5)));
        const up = p.bank > 0 ? fillB : fillA, down = p.bank > 0 ? fillA : fillB;
        // the shadow falls where the sun says (screen space), so undo the plane's turn
        const sun = DR.light?.sun || { x: 0.45, y: 0.85 };
        const sx = sun.x * 7, sy = sun.y * 7, ch = Math.cos(p.heading), sh = Math.sin(p.heading);
        ctx.save();
        ctx.translate((sx * ch + sy * sh) / p.s, (sy * ch - sx * sh) / p.s);
        ctx.fillStyle = C.shadow;
        PLANE(ctx); ctx.fill();
        ctx.restore();
        ctx.fillStyle = up;
        ctx.beginPath(); ctx.moveTo(13, 0); ctx.lineTo(-10, -9); ctx.lineTo(-5, 0); ctx.closePath(); ctx.fill();
        ctx.fillStyle = down;
        ctx.beginPath(); ctx.moveTo(13, 0); ctx.lineTo(-5, 0); ctx.lineTo(-10, 9); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = stroke;
        ctx.lineWidth = 0.9 / p.s;
        ctx.lineJoin = "round";
        PLANE(ctx); ctx.moveTo(13, 0); ctx.lineTo(-5, 0); ctx.stroke();
        ctx.restore();
      }
      function drawTrail(p, rgb, alpha, dash) {
        const T = p.trail;
        if (T.length < 2) return;
        ctx.lineWidth = 1.6;
        ctx.lineCap = "round";
        ctx.setLineDash(dash);
        let off = 0;
        for (let i = 0; i < T.length - 1; i++) {
          const a = T[i], b = T[i + 1];
          ctx.strokeStyle = `rgba(${rgb},${(alpha * (1 - i / T.length)).toFixed(3)})`;
          ctx.lineDashOffset = -off;
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          off += Math.hypot(b.x - a.x, b.y - a.y);
        }
        ctx.setLineDash([]);
      }
      function record(p, dt, max) {
        p.trailT -= dt;
        if (p.trailT > 0) return;
        p.trailT = CFG.trail.every;
        p.trail.unshift({ x: p.x - Math.cos(p.heading) * 9 * p.s, y: p.y - Math.sin(p.heading) * 9 * p.s });
        if (p.trail.length > max) p.trail.length = max;
      }
      function face(p, dt, rate = 8) {
        const want = Math.atan2(p.vy, p.vx);
        const turn = angleTo(p.heading, want);
        p.heading += turn * Math.min(1, dt * rate);
        p.bank += (clamp(turn * 2.2, -1, 1) - p.bank) * Math.min(1, dt * 6);
      }
      const shift = (p, dy) => { p.y += dy; p.trail.forEach((q) => (q.y += dy)); };

      // ---------- the frame ----------------------------------------------------
      tickers.push((t, dtRaw, v) => {
        if (html.classList.contains("is-flying")) return; // the game has the screen
        const dt = Math.min(dtRaw, 1 / 30);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, W, H);
        if (layer.a <= 0.001) return;
        ctx.globalAlpha = layer.a;

        // a press held still becomes a rally
        if (D.down && D.mode === "pending" && now() - D.t0 > CFG.hold) D.mode = "rally";
        const rally = D.down && D.mode === "rally";

        // over the cobalt contact section the wingman goes lime and the trails cream
        const ct = contact ? contact.getBoundingClientRect().top : Infinity;
        const flooded = contact && contact.classList.contains("is-flooded");
        const onBlue = (y) => flooded && y > ct;

        // ----- flock: wander, keep to a band, dodge the cursor, ride the scroll — or form up
        flock.forEach((p, i) => {
          if (p.away > 0) {
            p.away -= dt;
            if (p.away <= 0) { p.away = 0; reenter(p); }
            return;
          }
          let ax, ay;
          if (rally) {
            // a V behind the wingman: alternate sides, one rank further back each pair
            const rank = (i >> 1) + 1, side = i % 2 ? 1 : -1;
            const bx = -CFG.formation.back * rank, by = side * CFG.formation.side * rank;
            const ch = Math.cos(wing.heading), sh = Math.sin(wing.heading);
            const tx = wing.x + bx * ch - by * sh, ty = wing.y + bx * sh + by * ch;
            const dx = tx - p.x, dy = ty - p.y, d = Math.hypot(dx, dy) || 1;
            const want = Math.min(700, d * 6);
            ax = ((dx / d) * want - p.vx) * 6;
            ay = ((dy / d) * want - p.vy) * 6;
          } else {
            p.wa += rand(-1, 1) * CFG.wander.turn * dt;
            const sp = CFG.wander.speed * p.s;
            ax = (Math.cos(p.wa) * sp - p.vx) * 1.2;
            ay = (Math.sin(p.wa) * sp - p.vy) * 1.2 + (p.band * H - p.y) * CFG.wander.spring * 0.02 * p.s;
            if (M.seen) {
              const dx = p.x - M.x, dy = p.y - M.y, d = Math.hypot(dx, dy);
              if (d < CFG.flee.radius && d > 0.1) {
                const k = (1 - d / CFG.flee.radius) * CFG.flee.force;
                ax += (dx / d) * k;
                ay += (dy / d) * k;
              }
            }
          }
          p.vx += ax * dt;
          p.vy += ay * dt;
          const vmax = rally ? 900 : CFG.wander.speed * p.s * 3.2, vl = Math.hypot(p.vx, p.vy);
          if (vl > vmax) { p.vx *= vmax / vl; p.vy *= vmax / vl; }
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          if (!rally) shift(p, -v * CFG.gust * p.depth); // the gust: nearer planes are swept further
          // fly off one edge, come back in on the other (and drop the trail across the jump)
          let wrapped = false;
          if (p.x < -40) { p.x = W + 40; wrapped = true; } else if (p.x > W + 40) { p.x = -40; wrapped = true; }
          if (p.y < -60) { p.y = H + 50; wrapped = true; } else if (p.y > H + 60) { p.y = -50; wrapped = true; }
          if (wrapped) p.trail.length = 0;
          face(p, dt, rally ? 12 : 8);
          record(p, dt, CFG.trail.flock);
          drawTrail(p, onBlue(p.y) ? "255,253,249" : "23,21,15", rally ? 0.35 : 0.22, [1.5, 6]);
          drawPlane(p, C.paper, C.fold, C.ink);
        });

        // ----- thrown planes: glide, loop, leave
        for (let i = thrown.length - 1; i >= 0; i--) {
          const p = thrown[i];
          p.life -= dt;
          glide(p, dt);
          shift(p, -v * CFG.gust * 0.8);
          face(p, dt, 14);
          record(p, dt, CFG.trail.thrown);
          const out = p.x < -120 || p.x > W + 120 || p.y > H + 120 || p.y < -400;
          if (out || p.life <= 0) { thrown.splice(i, 1); continue; }
          const fade = Math.min(1, p.life);
          drawTrail(p, p.skin[0] === C.paper ? "23,21,15" : p.skin[0] === C.cobalt ? "43,69,255" : "232,176,74", 0.4 * fade, [2, 5]);
          drawPlane(p, p.skin[0], p.skin[1], p.skin[2], fade);
        }

        // ----- wingman: rides the scroll, signs headings, follows you, perches, loops
        const G = CFG.wingman, RD = CFG.ride, FL = CFG.flourish;
        M.still += dt;
        M.tapT = Math.max(0, M.tapT - dt);
        rideT = Math.abs(v) > RD.threshold ? RD.linger : Math.max(0, rideT - dt);
        scrolledT = Math.abs(v) > 0.2 ? 0.8 : Math.max(0, scrolledT - dt);

        // a heading arriving mid-scroll gets signed
        // (not during a fast fling of the page: the heading would be gone before the pencil lands)
        if (!flo && scrolledT > 0 && Math.abs(v) < 28 && !rally && !D.down) {
          const clock = performance.now() / 1000;
          for (const el of signable) {
            if (clock - (signed.get(el) ?? -1e9) < FL.again) continue;
            const r = textBox(el);
            if (r && r.top > H * 0.2 && r.bottom < H * 0.72) { startFlourish(el, r); break; }
          }
        }

        // the ink: pinned to its heading, so it scrolls with the text, then fades
        for (let i = inks.length - 1; i >= 0; i--) {
          const k = inks[i];
          if (k.age >= 0) k.age += dt;
          const a = k.age < 0 ? 1 : 1 - Math.max(0, k.age - FL.hold) / FL.fade;
          if (a <= 0) { inks.splice(i, 1); continue; }
          const r = textBox(k.el);
          if (!r || k.pts.length < 2) continue;
          ctx.strokeStyle = k.blue ? `rgba(217,255,90,${a.toFixed(3)})` : `rgba(43,69,255,${a.toFixed(3)})`;
          ctx.lineWidth = FL.width;
          ctx.lineCap = ctx.lineJoin = "round";
          ctx.beginPath();
          k.pts.forEach((q, j) => { const [x, y] = place(q, r); j ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
          ctx.stroke();
        }

        let tx = 0, ty = 0, perched = false, maxSp = G.max, force = G.force;
        // one mode a frame decides where the wingman goes
        let mode = "follow";
        const offscreen = (y) => y < -24 || y > H + 24;
        if (flo) {
          const r = textBox(flo.el);
          if (!r) { flo.ink.age = 0; flo = null; } // the heading left the page
          else if (flo.approach > 0) {
            flo.approach -= dt;
            [tx, ty] = place(flourishPath[0], r);
            // never got there, or the heading has scrolled out of reach: let it go
            if (flo.approach <= 0 || offscreen(ty)) { inks.splice(inks.indexOf(flo.ink), 1); flo = null; mode = "follow"; }
            else if (Math.hypot(tx - wing.x, ty - wing.y) < 26) flo.approach = 0;
            if (flo) { mode = "approach"; maxSp = 1600; force = 7000; }
          } else {
            // signing: fly the flourish exactly, leaving pencil on the middle stretch
            mode = "sign";
            flo.d += FL.speed * dt;
            const L = flo.L, total = L[L.length - 1];
            let i = 1;
            while (i < L.length - 1 && L[i] < flo.d) i++;
            const f = clamp((flo.d - L[i - 1]) / (L[i] - L[i - 1] || 1), 0, 1);
            const qa = flourishPath[i - 1], qb = flourishPath[i];
            const q = [0, 1, 2].map((c) => qa[c] + (qb[c] - qa[c]) * f);
            const [nx, ny] = place(q, r);
            wing.vx = (nx - wing.x) / dt;
            wing.vy = (ny - wing.y) / dt;
            const prog = flo.d / total;
            if (prog > FL.ink[0] && prog < FL.ink[1]) {
              flo.ink.pts.push(q);
              flo.ink.blue = onBlue(ny);
            }
            // done — or the heading scrolled away mid-signature: keep the ink, stop chasing
            if (flo.d >= total || offscreen(ny)) { flo.ink.age = 0; flo = null; }
          }
        }
        if (mode === "follow") {
          if (perch && perch.isConnected && !rally) {
            const r = perch.getBoundingClientRect();
            tx = r.right - 22;
            // sit on top of the button; one hugging the top of the screen gets a perch underneath
            ty = (r.top < 44 ? r.bottom + 12 : r.top - 9) + Math.sin(t * 3) * 1.5;
            perched = Math.hypot(tx - wing.x, ty - wing.y) < 14;
          } else if (rideT > 0 && !rally) {
            // riding the scroll: a Lissajous curve keyed to scroll position — scroll back and it flies back
            const sY = window.scrollY;
            tx = W * (0.5 + 0.36 * Math.sin(sY / RD.fx + 0.4));
            ty = H * (0.5 + 0.27 * Math.sin(sY / RD.fy));
            maxSp = RD.max;
            force = RD.force;
          } else if (finePointer && M.seen) {
            if (M.still > G.idle && !rally) {
              // idle: a lazy sideways figure-eight above the cursor
              const a = t * 1.15;
              tx = M.x + Math.sin(a) * G.orbit * 1.35;
              ty = M.y - 24 + Math.sin(2 * a) * G.orbit * 0.42;
            } else {
              tx = M.x + G.offset[0];
              ty = M.y + G.offset[1];
            }
          } else if (M.tapT > 0) {
            tx = M.x; ty = M.y;
          } else {
            // no cursor: cruise down the right-hand side
            tx = W * 0.86 + Math.sin(t * 0.7) * 26;
            ty = H * 0.3 + Math.sin(t * 1.1) * 30;
          }
        }
        if (mode === "sign") {
          // position already set along the flourish
        } else if (wing.loop > 0 && mode === "follow") {
          // a loop-the-loop: swing the velocity round one full turn
          wing.loop -= dt;
          wing.loopA += (TAU / G.loop) * dt;
          wing.vx = Math.cos(wing.loopA) * 380;
          wing.vy = Math.sin(wing.loopA) * 380;
        } else {
          const dx = tx - wing.x, dy = ty - wing.y, d = Math.hypot(dx, dy) || 1;
          const want = Math.min(maxSp, d * 4.2); // arrive, don't overshoot
          let ax = (dx / d) * want - wing.vx, ay = (dy / d) * want - wing.vy;
          const al = Math.hypot(ax, ay), amax = force * dt;
          if (al > amax) { ax *= amax / al; ay *= amax / al; }
          wing.vx += ax;
          wing.vy += ay;
        }
        wing.x += wing.vx * dt;
        wing.y += wing.vy * dt;
        if (perched) {
          // sitting on the button: level out, nose right, no trail
          wing.heading += angleTo(wing.heading, 0) * Math.min(1, dt * 10);
          wing.bank *= 0.8;
          wing.trail.length = Math.max(0, wing.trail.length - 2);
        } else if (Math.hypot(wing.vx, wing.vy) > 12) {
          face(wing, dt, flo ? 16 : 8);
          record(wing, dt, rideT > 0 || flo ? RD.trail : CFG.trail.wingman);
        }
        const blue = onBlue(wing.y);
        drawTrail(wing, blue ? "217,255,90" : "43,69,255", 0.55, [3, 5]);
        drawPlane(wing, blue ? C.lime : C.cobalt, blue ? C.limeDeep : C.cobaltDeep, blue ? "rgba(23,21,15,0.5)" : "rgba(255,253,249,0.55)");

        // ----- winding up a throw: the plane in hand, and where it would go
        if (D.down && D.mode === "throw" && D.hist.length > 1) {
          const [vx, vy] = flick();
          const sp = Math.hypot(vx, vy);
          if (sp > 40) {
            const ghost = make({ x: M.x, y: M.y, vx, vy, s: 1.25, heading: Math.atan2(vy, vx), belly: vx >= 0 ? 1 : -1 });
            const k = Math.min(1, CFG.glide.max / sp);
            ghost.vx *= k; ghost.vy *= k;
            for (let i = 0; i < 70; i++) {
              glide(ghost, 1 / 60);
              if (i % 4 === 0) {
                // the preview arc: dots shrink and fade the further ahead they predict
                ctx.fillStyle = `rgba(43,69,255,${(0.8 * (1 - i / 80)).toFixed(3)})`;
                ctx.beginPath(); ctx.arc(ghost.x, ghost.y, 3 - i / 40, 0, TAU); ctx.fill();
              }
            }
          }
          drawPlane(make({ x: M.x, y: M.y, s: 1.25, heading: Math.atan2(vy, vx) }), C.paper, C.fold, C.ink, 0.9);
        }

        // ----- rally: a word by the cursor
        if (rally) {
          ctx.font = '500 10px "IBM Plex Mono", monospace';
          ctx.fillStyle = "rgba(43,69,255,0.85)";
          ctx.fillText("FORMATION", M.x + 14, M.y + 22);
        }

        // ----- confetti and notes
        for (let i = bits.length - 1; i >= 0; i--) {
          const b = bits[i];
          b.life -= dt;
          if (b.life <= 0) { bits.splice(i, 1); continue; }
          b.vy += 700 * dt;
          b.x += b.vx * dt; b.y += b.vy * dt; b.r += b.vr * dt;
          ctx.save();
          ctx.globalAlpha = layer.a * Math.min(1, b.life * 2);
          ctx.translate(b.x, b.y);
          ctx.rotate(b.r);
          ctx.scale(1, Math.cos(b.r * 1.7));
          ctx.fillStyle = b.c;
          ctx.fillRect(-b.w / 2, -b.h / 2, b.w, b.h);
          ctx.restore();
        }
        ctx.font = 'italic 400 20px "Instrument Serif", Georgia, serif';
        ctx.textAlign = "center";
        for (let i = notes.length - 1; i >= 0; i--) {
          const n = notes[i];
          n.life -= dt;
          if (n.life <= 0) { notes.splice(i, 1); continue; }
          n.y -= 40 * dt;
          ctx.globalAlpha = layer.a * Math.min(1, n.life * 2);
          ctx.fillStyle = "#2b45ff";
          ctx.fillText(n.text, n.x, n.y);
        }
        ctx.textAlign = "left";

        // the hint rides alongside the wingman
        // (the translate property, so it never fights GSAP's scale on transform)
        tip.style.visibility = D.down ? "hidden" : ""; // never cover the aim
        if (tipOn) {
          const tx = clamp(wing.x + 22, 12, W - tip.offsetWidth - 12), ty = clamp(wing.y - 70, 84, H - tip.offsetHeight - 12);
          tip.style.translate = `${tx.toFixed(1)}px ${ty.toFixed(1)}px`;
        }

        ctx.globalAlpha = 1;
      });

      DR.debug = Object.assign(DR.debug || {}, { planes: { flock, wing, M, thrown, launch, tryCatch, D } });
    },
  };
})();
