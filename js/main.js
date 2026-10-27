/* ==========================================================================
   main.js — Michael Omale's portfolio
   Hero tray (prints develop on a loop) → Work → Services → Contact sheet
   → Drying line → Contact
   ========================================================================== */
(async () => {
  const DR = window.DR;
  const root = document.documentElement;
  const cover = document.querySelector(".cover");

  // never leave anyone staring at a blank page if a CDN is down
  const bail = (err) => {
    if (err) console.error("[portfolio]", err);
    cover.style.opacity = "0";
    root.classList.add("is-ready");
  };
  if (!window.gsap || !window.ScrollTrigger || !window.SplitText || !window.Lenis) return bail(new Error("GSAP or Lenis failed to load"));

  try {
    await run();
  } catch (err) {
    bail(err);
  }

  async function run() {
    const { gsap, ScrollTrigger, SplitText, CustomEase, Lenis } = window;
    gsap.registerPlugin(ScrollTrigger, SplitText, CustomEase);
    CustomEase.create("hop", "0.9, 0, 0.1, 1");
    // chemistry: nothing, nothing, then everything at once, then it settles
    CustomEase.create("develop", "0.55, 0, 0.25, 1");
    ScrollTrigger.config({ ignoreMobileResize: true });

    const CONFIG = {
      reel: { slideIn: 1.0, develop: 2.6, hold: 2.6, liftOut: 0.8 },
      // CSS stand-in for the develop shader on the case-study prints
      develop: {
        from: "brightness(1.75) contrast(0.45) saturate(0) blur(8px)",
        to: "brightness(1) contrast(1) saturate(1) blur(0px)",
      },
      sheet: { magnify: 2.3, radius: 110 },
      // work: each case sinks into the pile as the next is laid on top
      pile: { scale: 0.07, shade: 0.16, tilt: [-2.2, 1.8, -1.5, 2.4, -1.9] },
      magnet: { pull: 0.32, settle: 0.9 },
      tilt: { max: 7, lerp: 0.12 },
      tray: { max: 5, lerp: 0.08 },
      // loading screen: run to `hold` while assets arrive, finish once they're in
      load: { hold: 86, run: 1.3, finish: 0.45 },
    };

    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const finePointer = matchMedia("(hover: hover) and (pointer: fine)").matches;
    const played = []; // splits whose reveal has run; reverted on resize so lines re-wrap
    const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
    const SVGNS = "http://www.w3.org/2000/svg";
    const relayouts = []; // re-measured after resize and late fonts

    // Catmull-Rom through the points, as cubic Béziers — every hand-drawn line on the page
    function smooth(pts) {
      let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
      for (let i = 0; i < pts.length - 1; i++) {
        const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
        const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
        const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
        d += `C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
      }
      return d;
    }

    // ---------- loading screen (first visit per session) ---------------------
    // the counter runs while fonts and three.js arrive, never faster than the
    // assets: it parks at `hold` until they're in, then finishes to 100
    const firstVisit = !root.classList.contains("skip-load") && !reduced;
    try { sessionStorage.setItem("mo-seen", "1"); } catch {}
    if (!firstVisit) root.classList.add("skip-load");
    const coverNum = cover.querySelector(".cover-num");
    const coverPips = [...cover.querySelectorAll(".cover-bar i")];
    const load = { v: 0 };
    const showLoad = () => {
      coverNum.textContent = String(Math.round(load.v)).padStart(2, "0");
      const lit = (load.v / 100) * coverPips.length;
      coverPips.forEach((p, k) => gsap.set(p, { scaleY: gsap.utils.clamp(0, 1, lit - k) }));
    };
    const L0 = CONFIG.load;
    const loading = firstVisit ? gsap.to(load, { v: L0.hold, duration: L0.run, ease: "power2.out", onUpdate: showLoad }) : null;

    // ---------- type + three.js ---------------------------------------------
    const fontsReady = Promise.race([
      Promise.all([
        document.fonts.load('400 100px "Instrument Serif"'),
        document.fonts.load('italic 400 100px "Instrument Serif"'),
        document.fonts.load('400 16px "Geist"'),
        document.fonts.load('400 12px "IBM Plex Mono"'),
      ]),
      new Promise((r) => setTimeout(r, 2500)),
    ]);
    const [THREE] = await Promise.all([DR.loadThree(), fontsReady]);

    // ---------- Lenis on GSAP's ticker (PATTERNS §0) ---------------------
    const lenis = new Lenis({ lerp: 0.1 });
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);

    // ---------- imagery ----------------------------------------------------
    document.querySelector(".paper-grain").style.backgroundImage = `url(${DR.art.grain(180)})`;
    document.querySelectorAll("img[data-motif]").forEach((img) => {
      img.src = DR.art.motif(+img.dataset.motif, 480, 300, img.dataset.glyph).toDataURL("image/jpeg", 0.86);
    });

    // ---------- the frame loop ---------------------------------------------
    let lastT = performance.now() / 1000;
    let lastV = 0;
    const tickers = [];
    gsap.ticker.add(() => {
      const t = performance.now() / 1000;
      const dt = Math.min(0.1, t - lastT);
      lastT = t;
      const v = lenis.velocity || 0;
      tickers.forEach((fn) => fn(t, dt, v, v - lastV));
      lastV = v;
    });

    // ---------- header -------------------------------------------------------
    const top = document.querySelector(".top");
    const topBar = top.querySelector(".top-progress");
    lenis.on("scroll", ({ scroll, limit }) => {
      top.classList.toggle("is-scrolled", scroll > 20);
      gsap.set(topBar, { scaleX: limit ? scroll / limit : 0 });
    });

    // ---------- cursor -------------------------------------------------------
    const cur = document.querySelector(".cursor");
    const curLabel = cur.querySelector(".cursor-label");
    const C = { x: innerWidth / 2, y: innerHeight / 2, tx: innerWidth / 2, ty: innerHeight / 2, lock: false };
    function setCursor(state, text = "") {
      cur.dataset.state = state;
      curLabel.textContent = text;
      cur.classList.toggle("has-label", !!text);
    }
    if (finePointer) {
      root.classList.add("has-cursor");
      window.addEventListener("pointermove", (e) => { C.tx = e.clientX; C.ty = e.clientY; }, { passive: true });
      document.addEventListener("pointerover", (e) => {
        if (C.lock) return;
        const t = e.target.closest("[data-cursor]");
        setCursor(t ? t.dataset.cursor : "", t ? t.dataset.cursorLabel || "" : "");
      });
      tickers.push(() => {
        C.x += (C.tx - C.x) * 0.3;
        C.y += (C.ty - C.y) * 0.3;
        cur.style.transform = `translate3d(${C.x.toFixed(1)}px, ${C.y.toFixed(1)}px, 0)`;
      });

      // buttons lean after the pointer, then spring home
      const M = CONFIG.magnet;
      document.querySelectorAll("[data-magnetic]").forEach((el) => {
        const toX = gsap.quickTo(el, "x", { duration: 0.5, ease: "power3.out" });
        const toY = gsap.quickTo(el, "y", { duration: 0.5, ease: "power3.out" });
        // large type pulls less than a button
        const pull = el.offsetWidth > 360 ? M.pull * 0.3 : M.pull;
        el.addEventListener("pointermove", (e) => {
          const r = el.getBoundingClientRect();
          toX((e.clientX - (r.left + r.width / 2)) * pull);
          toY((e.clientY - (r.top + r.height / 2)) * pull);
        });
        el.addEventListener("pointerleave", () =>
          gsap.to(el, { x: 0, y: 0, duration: M.settle, ease: "elastic.out(1, 0.45)", overwrite: true }));
      });
    }

    // ---------- marquee (scroll velocity drives it) ------------------------
    const track = document.querySelector(".marquee-track");
    let mx = 0, mdir = 1, mw = track.scrollWidth / 2, skew = 0;
    let wrap = gsap.utils.wrap(-mw, 0);
    tickers.push((t, dt, v) => {
      if (v) mdir = v > 0 ? 1 : -1;
      mx = wrap(mx - (40 + Math.abs(v) * 26) * dt * mdir);
      // the type leans into fast scrolls and straightens as they settle
      skew += (gsap.utils.clamp(-14, 14, -v * 0.5) - skew) * Math.min(1, dt * 8);
      track.style.transform = `translate3d(${mx.toFixed(2)}px,0,0) skewX(${reduced ? 0 : skew.toFixed(2)}deg)`;
    });

    // ---------- hero reel: the products develop in the tray, one by one -----
    const slot = document.getElementById("reelPrint");
    const reel = DR.makePrint(THREE, slot, { margin: (w, h) => Math.round(Math.min(w, h) * 0.036) });
    tickers.push((t) => reel.render(t));

    const cases = [...document.querySelectorAll(".case[data-reel]")];
    const shots = cases.map((c) => {
      const img = new Image();
      img.decoding = "async";
      img.src = c.querySelector(".print img").getAttribute("src");
      return {
        img,
        ready: img.decode().then(() => true, () => false),
        name: c.querySelector(".case-title").textContent,
        kind: c.dataset.kind,
      };
    });

    const capName = document.querySelector(".reel-name");
    const capKind = document.querySelector(".reel-kind");
    const capState = document.querySelector(".reel-state");
    const dotsEl = document.querySelector(".reel-dots");
    shots.forEach(() => dotsEl.appendChild(document.createElement("i")));
    const dots = [...dotsEl.children];

    function caption(i) {
      gsap.to([capName, capKind], {
        yPercent: -40, opacity: 0, duration: 0.25, ease: "power2.in", overwrite: true,
        onComplete: () => {
          capName.textContent = shots[i].name;
          capKind.textContent = shots[i].kind;
          gsap.fromTo([capName, capKind], { yPercent: 40, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.6, stagger: 0.06, ease: "power3.out" });
        },
      });
      dots.forEach((d, k) => d.style.setProperty("--p", k < i ? 1 : 0));
    }

    const R = CONFIG.reel;
    const u = reel.u;
    let reelTl = null;
    let reelOn = true;

    async function nextLoaded(from) {
      for (let k = 0; k < shots.length; k++) {
        const i = (from + k) % shots.length;
        if (await shots[i].ready) return i;
      }
      return -1;
    }

    async function playReel(from) {
      const i = await nextLoaded(from);
      if (i < 0) return;
      reel.use(shots[i].img);
      caption(i);
      const dot = dots[i];
      reelTl = gsap.timeline({
        paused: !reelOn,
        onUpdate() { dot.style.setProperty("--p", this.progress().toFixed(3)); },
        onComplete: () => playReel(i + 1),
      });
      if (reduced) {
        reelTl.set(u.uDevelop, { value: 1 }).set(u.uLift, { value: 0 }).to({}, { duration: R.hold + R.develop });
        return;
      }
      reelTl
        .set(u.uLift, { value: 0 })
        .set(u.uDevelop, { value: 0 })
        .add(() => (capState.textContent = "Developing"), 0)
        .fromTo(slot, { yPercent: 118, rotate: 5 }, { yPercent: 0, rotate: 0, duration: R.slideIn, ease: "power3.out" }, 0)
        .add(() => { reel.ripple(0.5, 0.5); reel.ripple(0.28, 0.62); }, R.slideIn * 0.7)
        .fromTo(u.uAgitate, { value: 1.2 }, { value: 0.15, duration: 2.8, ease: "power2.out" }, R.slideIn * 0.7)
        .to(u.uDevelop, { value: 1, duration: R.develop, ease: "develop" }, R.slideIn * 0.85)
        .add(() => (capState.textContent = "Fixed — live now"), R.slideIn * 0.85 + R.develop)
        .to({}, { duration: R.hold })
        .to(slot, { yPercent: -118, rotate: -4, duration: R.liftOut, ease: "power2.in" })
        .to(u.uLift, { value: 1, duration: 0.3, ease: "none" }, "<");
    }

    // only develop while the tray is on screen
    ScrollTrigger.create({
      trigger: ".hero-tray",
      start: "top bottom",
      end: "bottom top",
      onToggle: (self) => {
        reelOn = self.isActive;
        if (reelTl) reelOn ? reelTl.resume() : reelTl.pause();
      },
    });

    // ---------- proof: numbers roll up like a film-frame counter -------------
    const odos = [...document.querySelectorAll(".odo")].map((el) => {
      const text = el.textContent;
      const reels = [];
      const vis = document.createElement("span");
      vis.setAttribute("aria-hidden", "true");
      vis.style.display = "inline-flex";
      [...text].forEach((ch) => {
        if (!/\d/.test(ch)) {
          vis.appendChild(document.createElement("span")).textContent = ch;
          return;
        }
        const col = vis.appendChild(document.createElement("span"));
        col.className = "odo-col";
        col.innerHTML = `<span class="odo-size">${ch}</span><span class="odo-reel">${"0123456789".repeat(3).split("").map((d) => `<span>${d}</span>`).join("")}</span>`;
        reels.push({ reel: col.lastChild, digit: +ch });
      });
      el.innerHTML = `<span class="sr">${text}</span>`;
      el.appendChild(vis);
      return reels;
    });
    function rollOdometers(at, tl) {
      odos.forEach((reels, n) => {
        reels.forEach(({ reel, digit }, j) => {
          // the rightmost wheel spins furthest, like the real thing
          const rows = (j === reels.length - 1 ? 20 : 10) + digit;
          tl.fromTo(reel, { yPercent: 0 }, { yPercent: (-100 * rows) / 30, duration: 1.5 + j * 0.2, ease: "expo.out" }, at + n * 0.08);
        });
      });
    }

    // ---------- hero: a grease-pencil underline under "actually" -------------
    const heroCopy = document.querySelector(".hero-copy");
    const scribble = heroCopy.querySelector(".scribble");
    const scribblePath = document.createElementNS(SVGNS, "path");
    scribble.appendChild(scribblePath);
    function layoutScribble() {
      const box = heroCopy.getBoundingClientRect();
      // queried fresh: splitting/reverting the headline swaps the node out and
      // can leave an empty <em> shell ahead of the real one
      const em = [...document.querySelectorAll(".hero-title em")].find((e) => e.textContent.trim());
      const r = em.getBoundingClientRect();
      const x0 = r.left - box.left + r.width * 0.02;
      const x1 = r.right - box.left + r.width * 0.04;
      const y = r.bottom - box.top - r.height * 0.1;
      const w = x1 - x0, k = r.height / 100;
      // a long swoosh, a turn at the end, a shorter return stroke
      scribblePath.setAttribute("d", smooth([
        [x0, y + 3 * k], [x0 + w * 0.3, y + 7 * k], [x0 + w * 0.66, y + 5 * k], [x1, y - 3 * k],
        [x1 - w * 0.08, y + 4 * k], [x0 + w * 0.42, y + 12 * k], [x0 + w * 0.16, y + 14 * k],
      ]));
      return scribblePath.getTotalLength();
    }
    let scribbled = false;
    relayouts.push(() => { if (scribbled) gsap.set(scribblePath, { strokeDasharray: layoutScribble(), strokeDashoffset: 0 }); });

    // ---------- intro ------------------------------------------------------
    function intro() {
      root.classList.add("is-ready");
      const title = SplitText.create(".hero-title", { type: "lines", mask: "lines" });
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
      // first visit: the loading screen clears its HUD, then lifts like a blind
      let o = 0;
      if (firstVisit) {
        tl.to(".cover-inner > *", { yPercent: -40, opacity: 0, duration: 0.45, stagger: 0.04, ease: "power3.in" })
          .to(cover, { clipPath: "inset(0% 0% 100% 0%)", duration: 1.1, ease: "hop" }, 0.25);
        o = 0.7;
      } else {
        tl.to(cover, { opacity: 0, duration: 0.6, ease: "power2.out" });
      }
      tl.from(".top", { yPercent: -100, duration: 0.9 }, o + 0.15)
        .from(".hero .eyebrow", { y: 16, opacity: 0, duration: 0.8 }, o + 0.2)
        .from(title.lines, { yPercent: 100, duration: 1.1, stagger: 0.09, ease: "power4.out", onComplete: () => played.push(title) }, o + 0.25)
        .from(".hero-lede, .hero-ctas, .proof", { y: 22, opacity: 0, duration: 0.9, stagger: 0.08 }, o + 0.55)
        .from(".hero-tray", { y: 50, opacity: 0, duration: 1.2 }, o + 0.35)
        .add(() => playReel(0), o + 0.6);
      rollOdometers(o + 0.75, tl);
      // measured once the headline lines have landed, then drawn
      const drawScribble = (dur) => {
        scribbled = true;
        const len = layoutScribble();
        gsap.fromTo(scribblePath, { strokeDasharray: len, strokeDashoffset: len }, { strokeDashoffset: 0, duration: dur, ease: "power2.inOut" });
      };
      if (reduced) {
        tl.progress(1);
        drawScribble(0);
      } else {
        tl.add(() => drawScribble(0.9), o + 1.45);
      }
    }
    async function finishLoad() {
      if (!loading) return;
      await loading;
      await gsap.to(load, { v: 100, duration: CONFIG.load.finish, ease: "power2.inOut", onUpdate: showLoad });
    }
    finishLoad().then(intro).catch(bail);

    // ---------- section headings ------------------------------------------
    document.querySelectorAll("[data-reveal]").forEach((el) => {
      const split = SplitText.create(el, { type: "lines", mask: "lines" });
      gsap.set(split.lines, { yPercent: 100 });
      ScrollTrigger.create({
        trigger: el,
        start: "top 88%",
        once: true,
        onEnter: () =>
          gsap.to(split.lines, { yPercent: 0, duration: 1, stagger: 0.09, ease: "power3.out", onComplete: () => played.push(split) }),
      });
    });

    // ---------- manifesto: words light up as you read; the pills pop in place --
    {
      const text = document.querySelector(".manifesto-text");
      const split = SplitText.create(text, { type: "words", wordsClass: "mw" });
      const bits = [...text.querySelectorAll(".mw, .pill")].filter((el) => !el.closest(".pill") || el.classList.contains("pill"));
      // reduced motion: the sentence simply reads, fully lit
      if (!reduced) {
        gsap.set(split.words, { opacity: 0.14 });
        gsap.set(text.querySelectorAll(".pill"), { scale: 0, rotation: -12 });
        const tl = gsap.timeline({ scrollTrigger: { trigger: text, start: "top 78%", end: "bottom 42%", scrub: 0.6 } });
        bits.forEach((el, i) => {
          if (el.classList.contains("pill")) tl.to(el, { scale: 1, rotation: 0, duration: 1.4, ease: "back.out(2.2)" }, i * 0.5);
          else tl.to(el, { opacity: 1, duration: 0.8, ease: "none" }, i * 0.5);
        });
      }
    }

    // ---------- work: each print develops as it arrives ---------------------
    const D = CONFIG.develop;
    document.querySelectorAll(".case").forEach((c) => {
      const media = c.querySelector(".case-media");
      const img = c.querySelector(".print img");
      const title = SplitText.create(c.querySelector(".case-title"), { type: "chars", mask: "chars" });
      const rest = c.querySelectorAll(".case-meta, .case-lede, .case-desc, .chips, :scope > .case-link, .case-links");
      gsap.set(media, { y: 60, opacity: 0 });
      gsap.set(img, { filter: D.from });
      gsap.set(title.chars, { yPercent: 110 });
      gsap.set(rest, { y: 20, opacity: 0 });
      ScrollTrigger.create({
        trigger: c,
        start: "top 78%",
        once: true,
        onEnter: () => {
          gsap.timeline()
            .to(media, { y: 0, opacity: 1, duration: 1.1, ease: "power3.out" }, 0)
            .to(img, { filter: D.to, duration: 2.2, ease: "develop" }, 0.15)
            .to(title.chars, { yPercent: 0, duration: 0.9, stagger: 0.025, ease: "power3.out", onComplete: () => played.push(title) }, 0.2)
            .to(rest, { y: 0, opacity: 1, duration: 0.8, stagger: 0.07, ease: "power3.out" }, 0.35);
        },
      });
    });

    // ---------- work: the pile ------------------------------------------------
    // Cases are position:sticky (CSS). As case n+1 slides up over case n, case n
    // sinks: shrinks, takes a little tilt and falls into shade — prints dropped
    // on a pile. Starts/ends are computed from flow positions, because a stuck
    // element's rect lies about where it sits in the document.
    const pile = document.querySelector(".pile");
    const pileCases = [...pile.querySelectorAll(".case")];
    pileCases.forEach((c, i) => c.style.setProperty("--i", i));
    gsap.matchMedia().add("(min-width: 901px) and (min-height: 660px)", () => {
      const P = CONFIG.pile;
      const flowTop = (k) => {
        let y = pile.getBoundingClientRect().top + window.scrollY;
        for (let j = 0; j < k; j++) y += pileCases[j].offsetHeight + parseFloat(getComputedStyle(pileCases[j]).marginBottom);
        return y;
      };
      const stickTop = (k) => parseFloat(getComputedStyle(pileCases[k]).top);
      pileCases.slice(0, -1).forEach((c, i) => {
        const shade = c.querySelector(".case-shade");
        const tilt = P.tilt[i % P.tilt.length];
        ScrollTrigger.create({
          start: () => flowTop(i + 1) - window.innerHeight,
          end: () => flowTop(i + 1) - stickTop(i + 1),
          onUpdate: ({ progress: p }) => {
            gsap.set(c, { scale: 1 - P.scale * p, rotation: tilt * p });
            gsap.set(shade, { opacity: P.shade * p });
          },
        });
      });
      return () => gsap.set(pileCases, { clearProps: "transform" });
    });

    // ---------- services ----------------------------------------------------
    const services = [...document.querySelectorAll(".service")];
    let servicesIn = false;
    gsap.set(services, { y: 50, opacity: 0 });
    ScrollTrigger.create({
      trigger: ".service-grid",
      start: "top 82%",
      once: true,
      onEnter: () => gsap.to(services, { y: 0, opacity: 1, duration: 1, stagger: 0.1, ease: "power3.out", onComplete: () => (servicesIn = true) }),
    });
    // cards lean toward the pointer; a soft cobalt light follows it
    if (finePointer && !reduced) {
      const T = CONFIG.tilt;
      services.forEach((card) => {
        const s = { rx: 0, ry: 0, lift: 0, trx: 0, try: 0, tlift: 0 };
        card.addEventListener("pointermove", (e) => {
          const r = card.getBoundingClientRect();
          const nx = (e.clientX - r.left) / r.width, ny = (e.clientY - r.top) / r.height;
          s.try = (nx - 0.5) * T.max;
          s.trx = (0.5 - ny) * T.max;
          s.tlift = -8;
          card.style.setProperty("--mx", `${(nx * 100).toFixed(1)}%`);
          card.style.setProperty("--my", `${(ny * 100).toFixed(1)}%`);
        });
        card.addEventListener("pointerleave", () => { s.trx = s.try = s.tlift = 0; });
        tickers.push(() => {
          if (!servicesIn) return;
          const settled = Math.abs(s.trx - s.rx) + Math.abs(s.try - s.ry) + Math.abs(s.tlift - s.lift) < 0.01;
          if (settled) return;
          s.rx += (s.trx - s.rx) * T.lerp;
          s.ry += (s.try - s.ry) * T.lerp;
          s.lift += (s.tlift - s.lift) * T.lerp;
          gsap.set(card, { rotationX: s.rx, rotationY: s.ry, y: s.lift, transformPerspective: 900 });
        });
      });
    }

    // ---------- process: the pencil line runs through the steps --------------
    root.classList.add("has-steps");
    const stepsWrap = document.querySelector(".steps-wrap");
    const stepEls = [...stepsWrap.querySelectorAll(".step")];
    const stepsTrack = stepsWrap.querySelector(".steps-track");
    const stepsInk = stepsWrap.querySelector(".steps-ink");
    const steps = { len: 0, at: [], p: 0 };
    function layoutSteps() {
      const box = stepsWrap.getBoundingClientRect();
      const centres = stepEls.map((s) => {
        const d = s.querySelector(".step-dot").getBoundingClientRect();
        return [d.left - box.left + d.width / 2, d.top - box.top + d.height / 2];
      });
      // a waver between the dots so it reads as drawn, not ruled
      const pts = [];
      centres.forEach((c, k) => {
        pts.push(c);
        const n = centres[k + 1];
        if (!n) return;
        const dx = n[0] - c[0], dy = n[1] - c[1];
        const len = Math.hypot(dx, dy), wob = (k % 2 ? -1 : 1) * Math.min(9, len * 0.04);
        pts.push([c[0] + dx * 0.5 - (dy / len) * wob, c[1] + dy * 0.5 + (dx / len) * wob]);
      });
      const d = smooth(pts);
      stepsTrack.setAttribute("d", d);
      stepsInk.setAttribute("d", d);
      steps.len = stepsInk.getTotalLength();
      // how far along the line each dot sits, by straight-line distance
      const segs = centres.slice(1).map((c, k) => Math.hypot(c[0] - centres[k][0], c[1] - centres[k][1]));
      const total = segs.reduce((a, b) => a + b, 0) || 1;
      steps.at = centres.map((_, k) => segs.slice(0, k).reduce((a, b) => a + b, 0) / total);
      paintSteps();
    }
    function paintSteps() {
      gsap.set(stepsInk, { strokeDasharray: steps.len, strokeDashoffset: steps.len * (1 - steps.p) });
      stepEls.forEach((s, k) => s.classList.toggle("is-on", steps.p >= steps.at[k] - 0.001));
    }
    layoutSteps();
    relayouts.push(layoutSteps);
    ScrollTrigger.create({
      trigger: stepsWrap,
      start: "top 78%",
      end: "bottom 40%",
      onUpdate: (self) => { steps.p = reduced ? 1 : self.progress; paintSteps(); },
    });

    // ---------- contact sheet: loupe + grease pencil -----------------------
    const sheet = document.querySelector(".sheet");
    const content = sheet.querySelector(".sheet-content");
    const loupe = document.querySelector(".loupe");
    const lBody = loupe.querySelector(".loupe-body");
    const lens = loupe.querySelector(".loupe-lens");
    const MAG = CONFIG.sheet.magnify, LR = CONFIG.sheet.radius;
    document.getElementById("lensMap").setAttribute("href", DR.art.lensMap(LR * 2));

    // the frames develop as the sheet comes up
    const frameImgs = content.querySelectorAll(".frame img");
    gsap.set(frameImgs, { filter: D.from });
    ScrollTrigger.create({
      trigger: sheet,
      start: "top 75%",
      once: true,
      onEnter: () => gsap.to(frameImgs, { filter: D.to, duration: 1.8, ease: "develop", stagger: { each: 0.06, from: "random" }, onComplete: () => finePointer && reclone() }),
    });

    let clone = null;
    function reclone() {
      if (clone) clone.remove();
      clone = content.cloneNode(true);
      clone.classList.add("is-clone");
      clone.setAttribute("aria-hidden", "true");
      clone.querySelectorAll("button").forEach((b) => (b.tabIndex = -1));
      clone.querySelectorAll("img").forEach((i) => { i.loading = "eager"; i.style.filter = "none"; });
      clone.style.width = `${content.offsetWidth}px`;
      lens.appendChild(clone);
    }

    const L = { on: false, shown: false, x: 0, y: 0, tx: 0, ty: 0 };
    if (finePointer) {
      reclone();
      sheet.addEventListener("pointerenter", (e) => {
        L.on = true;
        if (!L.shown) { L.x = L.tx = e.clientX; L.y = L.ty = e.clientY; }
        L.shown = true;
        gsap.to(lBody, { opacity: 1, scale: 1, duration: 0.4, ease: "power3.out", overwrite: true });
      });
      sheet.addEventListener("pointerleave", () => {
        L.on = false;
        gsap.to(lBody, { opacity: 0, scale: 0.6, duration: 0.22, ease: "power2.in", overwrite: true, onComplete: () => (L.shown = L.on) });
      });
      sheet.addEventListener("pointermove", (e) => { L.tx = e.clientX; L.ty = e.clientY; });
      tickers.push(() => {
        if (!L.shown || !clone) return;
        L.x += (L.tx - L.x) * 0.26;
        L.y += (L.ty - L.y) * 0.26;
        const r = content.getBoundingClientRect();
        loupe.style.transform = `translate3d(${(L.x - LR).toFixed(1)}px, ${(L.y - LR).toFixed(1)}px, 0)`;
        clone.style.transform = `translate3d(${(LR - (L.x - r.left) * MAG).toFixed(1)}px, ${(LR - (L.y - r.top) * MAG).toFixed(1)}px, 0) scale(${MAG})`;
      });
    }

    function pencilPath(x, y, w, h, rand) {
      const cx = x + w / 2, cy = y + h / 2;
      const rx = w * 0.64, ry = h * 0.7;
      const a0 = -2.4 + rand() * 0.7;
      const turns = 1.08 + rand() * 0.14;
      const n = 24;
      const pts = [];
      for (let k = 0; k <= n; k++) {
        const a = a0 + Math.PI * 2 * turns * (k / n);
        const j = 1 + (rand() - 0.5) * 0.07 + (k / n) * 0.06;
        pts.push([cx + Math.cos(a) * rx * j, cy + Math.sin(a) * ry * j]);
      }
      return smooth(pts);
    }

    const capNo = document.querySelector(".cap-no");
    const capText = document.querySelector(".cap-text");
    const capLink = document.querySelector(".cap-link");
    const frames = [...content.querySelectorAll(".frame")];
    let marks = 0;
    function clearMarks() {
      [content, clone].forEach((r) => r && r.querySelectorAll(".pencil path").forEach((p) => p.remove()));
      marked = -1;
    }
    // first click marks a frame; clicking the marked frame again opens the site
    // (keyed to the mark, not dblclick timing, so two taps work on phones too)
    let marked = -1;
    frames.forEach((frame, idx) => {
      frame.addEventListener("click", () => {
        if (idx === marked) {
          window.open(frame.dataset.href, "_blank", "noopener");
          return;
        }
        marked = idx;
        const r = content.getBoundingClientRect(), f = frame.getBoundingClientRect();
        // the sheet is rotated slightly; offsets are close enough for a hand-drawn ring
        const d = pencilPath(f.left - r.left, f.top - r.top, f.width, f.height, DR.art.rng(idx * 31 + marks++));
        [content, clone].forEach((rootEl) => {
          if (!rootEl) return;
          const svg = rootEl.querySelector(".pencil");
          svg.querySelectorAll("path").forEach((old) => gsap.to(old, { opacity: 0, duration: 0.35, onComplete: () => old.remove() }));
          const path = document.createElementNS(SVGNS, "path");
          path.setAttribute("d", d);
          svg.appendChild(path);
          const len = path.getTotalLength();
          gsap.fromTo(path, { strokeDasharray: len, strokeDashoffset: len }, { strokeDashoffset: 0, duration: 0.6, ease: "power2.out" });
        });

        gsap.to([capNo, capText, capLink], {
          opacity: 0, y: -6, duration: 0.14, ease: "power2.in", overwrite: true,
          onComplete: () => {
            capNo.textContent = `Frame ${String(idx + 1).padStart(2, "0")}A — ${frame.dataset.name}`;
            capText.textContent = frame.dataset.note;
            capLink.href = frame.dataset.href;
            capLink.hidden = false;
            gsap.fromTo([capNo, capText, capLink], { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.45, stagger: 0.05, ease: "power3.out" });
          },
        });
      });
    });

    // ---------- the drying line ----------------------------------------------
    const line = new DR.DryingLine(document.querySelector(".line-stage"));
    line.setColor(getComputedStyle(root).getPropertyValue("--rope").trim());
    DR.onGrab = (on) => {
      C.lock = on;
      setCursor(on ? "grabbing" : "grab", on ? "" : "Pull");
    };
    tickers.push((t, dt, v, dv) => {
      if (!reduced) line.kick(dv);
      line.update(dt);
    });

    // ---------- footer: local time + the name, rising out of the floor --------
    const clock = document.querySelector(".clock");
    const fmt = new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Lagos", hour: "2-digit", minute: "2-digit" });
    const tick = () => (clock.textContent = fmt.format(new Date()));
    tick();
    setInterval(tick, 15000);

    const wordmark = document.querySelector(".wordmark");
    wordmark.querySelectorAll("em").forEach((em) => em.replaceWith(...[...em.textContent].map((ch) => Object.assign(document.createElement("em"), { textContent: ch }))));
    // wrap each letter in its own mask (spaces stay text, so the gap survives)
    [...wordmark.childNodes].forEach((node) => {
      if (node.nodeType === 3) {
        const frag = document.createDocumentFragment();
        [...node.textContent].forEach((ch) => frag.appendChild(ch.trim() ? Object.assign(document.createElement("span"), { textContent: ch }) : document.createTextNode(ch)));
        node.replaceWith(frag);
      }
    });
    const wmChars = [...wordmark.children].map((el) => {
      const mask = document.createElement("span");
      mask.className = "wm-c";
      el.replaceWith(mask);
      mask.appendChild(el);
      return el;
    });
    function fitWordmark() {
      wordmark.style.fontSize = "100px";
      const w = wordmark.parentElement.clientWidth;
      wordmark.style.fontSize = `${((100 * w) / wordmark.offsetWidth) * 0.99}px`;
    }
    fitWordmark();
    relayouts.push(fitWordmark);
    if (!reduced) {
      gsap.fromTo(wmChars, { yPercent: 105 }, {
        yPercent: 0,
        ease: "none",
        stagger: { each: 0.06, from: "center" },
        scrollTrigger: { trigger: wordmark, start: "top bottom", end: "bottom bottom", scrub: 0.8 },
      });
    }
    // the name answers the pointer: letters near it lift and lean, then settle
    if (finePointer && !reduced) {
      const masks = wmChars.map((c) => c.parentElement);
      const lift = masks.map((m) => ({ y: gsap.quickTo(m, "y", { duration: 0.5, ease: "power3.out" }), r: gsap.quickTo(m, "rotation", { duration: 0.6, ease: "power3.out" }) }));
      let centres = [];
      const measure = () => (centres = masks.map((m) => { const r = m.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }));
      wordmark.addEventListener("pointerenter", measure);
      wordmark.addEventListener("pointermove", (e) => {
        const reach = wordmark.offsetHeight * 0.9;
        centres.forEach(([cx, cy], i) => {
          const d = Math.hypot(e.clientX - cx, (e.clientY - cy) * 0.6);
          const k = Math.max(0, 1 - d / reach);
          lift[i].y(-k * k * wordmark.offsetHeight * 0.16);
          lift[i].r(((e.clientX - cx) / reach) * -8 * k);
        });
      });
      wordmark.addEventListener("pointerleave", () => lift.forEach((l) => { l.y(0); l.r(0); }));
    }

    // ---------- contact: copy the address in one click ----------------------
    {
      const btn = document.querySelector(".copy-mail");
      const label = btn.querySelector("span");
      btn.addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(btn.dataset.copy);
          label.textContent = "Copied ✓";
        } catch {
          label.textContent = btn.dataset.copy; // no clipboard: at least show it plainly
        }
        gsap.fromTo(btn, { scale: 0.94 }, { scale: 1, duration: 0.5, ease: "back.out(3)" });
        clearTimeout(btn._t);
        btn._t = setTimeout(() => (label.textContent = "Copy email"), 2200);
      });
    }

    // ---------- hero tray leans toward the pointer --------------------------
    if (finePointer && !reduced) {
      const T = CONFIG.tray;
      const trayEl = document.querySelector(".tray");
      const hero = document.querySelector(".hero");
      const s = { rx: 0, ry: 0, trx: 0, try: 0 };
      hero.addEventListener("pointermove", (e) => {
        const r = trayEl.getBoundingClientRect();
        s.try = gsap.utils.clamp(-1, 1, (e.clientX - (r.left + r.width / 2)) / r.width) * T.max;
        s.trx = gsap.utils.clamp(-1, 1, ((r.top + r.height / 2) - e.clientY) / r.height) * T.max;
      });
      hero.addEventListener("pointerleave", () => { s.trx = s.try = 0; });
      tickers.push(() => {
        if (Math.abs(s.trx - s.rx) + Math.abs(s.try - s.ry) < 0.005) return;
        s.rx += (s.trx - s.rx) * T.lerp;
        s.ry += (s.try - s.ry) * T.lerp;
        gsap.set(trayEl, { rotationX: s.rx, rotationY: s.ry, transformPerspective: 1400 });
      });
    }

    // ---------- paper planes that travel down the page with you (js/planes.js)
    DR.planes?.init({ gsap, lenis, reduced, finePointer, tickers });

    // ---------- play: Paper Flight (js/game.js) -----------------------------
    DR.flight?.init({ THREE, gsap, lenis, reduced, tickers });

    // ---------- contact: the final level floods cobalt ---------------------
    const contact = document.querySelector(".contact");
    const flood = contact.querySelector(".flood");
    let flooded = false;
    ScrollTrigger.create({
      trigger: contact,
      start: "top 85%",
      end: "top 10%",
      onUpdate: ({ progress: p }) => {
        const e = reduced ? (p > 0.4 ? 1 : 0) : p;
        gsap.set(flood, { clipPath: `circle(${(e * 150).toFixed(2)}% at 50% 18%)` });
        if (p > 0.4 !== flooded) {
          flooded = p > 0.4;
          contact.classList.toggle("is-flooded", flooded);
          cur.classList.toggle("is-inverse", flooded && contact.matches(":hover"));
        }
      },
    });
    // header and cursor flip to cream while they sit over the cobalt
    ScrollTrigger.create({
      trigger: contact,
      start: () => `top ${top.offsetHeight}px`,
      end: "bottom top",
      onToggle: (self) => top.classList.toggle("is-inverse", self.isActive),
    });
    contact.addEventListener("pointerenter", () => cur.classList.toggle("is-inverse", flooded));
    contact.addEventListener("pointerleave", () => cur.classList.remove("is-inverse"));

    // ---------- nav ------------------------------------------------------------
    document.querySelectorAll('a[href^="#"]').forEach((a) => {
      a.addEventListener("click", (e) => {
        const id = a.getAttribute("href");
        const target = id === "#top" ? 0 : document.querySelector(id);
        if (target === null) return;
        e.preventDefault();
        lenis.scrollTo(target, { offset: id === "#top" ? 0 : -40, duration: 1.6, easing: (t) => 1 - Math.pow(1 - t, 4) });
      });
    });
    ["work", "services", "archive", "story", "play"].forEach((id) => {
      const link = document.querySelector(`.top-nav a[href="#${id}"]`);
      ScrollTrigger.create({
        trigger: `#${id}`,
        start: "top 50%",
        end: "bottom 50%",
        onToggle: (self) => link && link.classList.toggle("is-active", self.isActive),
      });
    });

    // ---------- resize ---------------------------------------------------------
    let lastW = window.innerWidth;
    window.addEventListener("resize", debounce(() => {
      if (window.innerWidth === lastW) return; // mobile URL bar, ignore
      lastW = window.innerWidth;
      played.splice(0).forEach((s) => s.revert());
      line.layout();
      clearMarks();
      if (finePointer) reclone();
      mw = track.scrollWidth / 2;
      wrap = gsap.utils.wrap(-mw, 0);
      relayouts.forEach((fn) => fn());
      ScrollTrigger.refresh();
    }, 220));

    // late fonts change line lengths and card heights
    document.fonts.ready.then(() => { line.layout(); relayouts.forEach((fn) => fn()); ScrollTrigger.refresh(); });
    ScrollTrigger.refresh();

    // handles for poking at the page from the console
    Object.assign((DR.debug = DR.debug || {}), { lenis, reel, line });
    Object.defineProperty(DR.debug, "reelTl", { get: () => reelTl, configurable: true });
  }
})();
