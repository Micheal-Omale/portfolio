/* ==========================================================================
   light.js — the studio is lit by the real sun in Lagos.
   · One full-screen fragment shader, drawn at a quarter of the resolution and
     multiplied over the page: the window's image falls across the paper —
     panes, mullions and a tree's leaves swaying outside.
   · The sun is read from the clock in Africa/Lagos: cool morning light, a
     short hard noon, long amber golden hour, then a desk lamp after dark
     (never dark — the page stays bright).
   · Scrolling walks you down the studio past a row of tall windows; scroll
     speed is a breeze in the leaves.
   · The same sun writes --sun-x / --sun-y / --shade on :root, so every cast
     shadow on the page leans the same way and lengthens with the hour.
   · First visit: a venetian blind tilts open and the light comes in through
     the slats before the window does (see main.js intro).
   ========================================================================== */
(() => {
  const DR = (window.DR = window.DR || {});

  const CFG = {
    scale: 0.25, // canvas resolution vs CSS pixels — the upscale is the penumbra
    strength: 0.56, // how much of the light reaches the page: atmosphere, never a filter
    parallax: 0.55, // the window's image moves at this fraction of the scroll
    period: 1.38, // viewport heights between windows down the wall
    ease: 3.2, // how fast the light settles on a new hour (per second)
    wind: { gain: 0.03, settle: 1.6 },
    // the day, keyed by minutes past midnight in Lagos. dir: where shadows fall
    // (screen space, y down); len: how long they are; soft: penumbra
    day: [
      { m: 0, win: 0, lamp: 1, dir: [0.35, 0.94], len: 0.7, soft: 0.6, lit: [1, 1, 1], shade: [0.93, 0.92, 0.93], css: [60, 40, 20] },
      { m: 345, win: 0, lamp: 1, dir: [0.35, 0.94], len: 0.7, soft: 0.6, lit: [1, 1, 1], shade: [0.93, 0.92, 0.93], css: [60, 40, 20] },
      { m: 400, win: 0.65, lamp: 0.2, dir: [0.92, 0.4], len: 1.55, soft: 0.95, lit: [1, 0.96, 0.95], shade: [0.91, 0.91, 0.96], css: [70, 60, 110] },
      { m: 510, win: 1, lamp: 0, dir: [0.62, 0.78], len: 1.05, soft: 0.5, lit: [1, 0.995, 0.985], shade: [0.905, 0.912, 0.94], css: [30, 40, 80] },
      { m: 750, win: 0.9, lamp: 0, dir: [0.08, 1], len: 0.55, soft: 0.28, lit: [1, 1, 0.99], shade: [0.905, 0.905, 0.92], css: [40, 30, 10] },
      { m: 930, win: 1, lamp: 0, dir: [-0.58, 0.81], len: 0.95, soft: 0.42, lit: [1, 0.978, 0.945], shade: [0.9, 0.895, 0.92], css: [55, 35, 20] },
      { m: 1060, win: 1, lamp: 0, dir: [-0.9, 0.44], len: 1.6, soft: 0.72, lit: [1, 0.94, 0.85], shade: [0.9, 0.875, 0.885], css: [110, 50, 20] },
      { m: 1135, win: 0.5, lamp: 0.45, dir: [-0.95, 0.32], len: 1.75, soft: 1, lit: [1, 0.945, 0.925], shade: [0.9, 0.885, 0.915], css: [80, 40, 70] },
      { m: 1215, win: 0, lamp: 1, dir: [0.35, 0.94], len: 0.7, soft: 0.6, lit: [1, 1, 1], shade: [0.93, 0.92, 0.93], css: [60, 40, 20] },
      { m: 1440, win: 0, lamp: 1, dir: [0.35, 0.94], len: 0.7, soft: 0.6, lit: [1, 1, 1], shade: [0.93, 0.92, 0.93], css: [60, 40, 20] },
    ],
    names: [[0, "lamplight"], [360, "first light"], [450, "morning light"], [690, "midday sun"], [870, "afternoon light"], [1010, "golden hour"], [1110, "dusk"], [1190, "lamplight"]],
  };

  const VERT = "attribute vec2 p; void main() { gl_Position = vec4(p, 0.0, 1.0); }";
  const FRAG = `
precision mediump float;
uniform vec2 uRes;
uniform float uTime, uScroll, uWind, uWin, uLamp, uLen, uSoft, uIntro, uBlind, uPeriod;
uniform vec2 uDir;
uniform vec3 uLit, uShade;

float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int k = 0; k < 4; k++) { v += a * noise(p); p = p * 2.03 + 17.1; a *= 0.5; }
  return v;
}

void main() {
  // screen in viewport-height units, y running down the page
  vec2 s = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y) / uRes.y;
  float aspect = uRes.x / uRes.y;

  // the window's image on the wall: sheared along the light, stretched as the sun drops
  float shx = uDir.x * uLen * 0.5;
  float stretch = 0.78 + uLen * 0.4;
  vec2 q = vec2(s.x - aspect * 0.5 - shx * (s.y - 0.5), (s.y + uScroll) / stretch);

  // a row of tall windows down a long wall
  float cell = floor(q.y / uPeriod);
  float f = q.y - cell * uPeriod;
  float h = hash(vec2(cell, 3.7));
  float W = clamp(aspect * 0.6, 0.4, 1.02);
  float x0 = -W * 0.5 + uDir.x * 0.16 * aspect + (h - 0.5) * 0.14;
  vec2 l = vec2((q.x - x0) / W, f / 1.04);

  // penumbra widens away from the sill
  float soft = uSoft * (0.03 + 0.05 * clamp(l.y, 0.0, 1.0));
  float sx = soft / W + 0.004, sy = soft + 0.004;
  float frame = smoothstep(0.0, sx, l.x) * smoothstep(1.0, 1.0 - sx, l.x) * smoothstep(0.0, sy, l.y) * smoothstep(1.0, 1.0 - sy, l.y);
  float bar = 0.016;
  float mv = 1.0 - smoothstep(bar, bar + sx, abs(l.x - 0.5));
  float mh = 1.0 - smoothstep(bar * 1.15, bar * 1.15 + sy, min(abs(l.y - 0.34), abs(l.y - 0.68)));
  float lit = frame * (1.0 - max(mv, mh));

  // leaves outside, crowding in from one top corner, swaying in the breeze
  float t = uTime;
  vec2 sway = vec2(sin(t * 0.55 + q.y * 1.7) + 0.5 * sin(t * 1.3 + q.x * 3.0), cos(t * 0.42 + q.x * 1.3)) * (0.01 + uWind);
  vec2 lq = (q + sway) * 6.0 + vec2(h * 11.0, cell * 7.0);
  float n = fbm(lq + 0.6 * vec2(fbm(lq * 0.5), fbm(lq * 0.5 + 5.2))); // warped: clusters, not blobs
  vec2 corner = vec2(step(0.5, h), 0.0);
  float branch = smoothstep(1.15, 0.2, length((l - corner) * vec2(1.0, 1.3)));
  float leaf = smoothstep(0.5, 0.55 + soft * 1.5, n) * branch;
  lit *= 1.0 - leaf * 0.82;

  vec3 col = mix(uShade, uLit, lit);
  col = mix(vec3(1.0), col, uWin);

  // after dark: a desk lamp up in the corner
  float ld = length((s - vec2(aspect * 0.14, -0.12)) * vec2(0.75, 1.0));
  vec3 lamp = mix(vec3(1.0, 0.975, 0.935), vec3(0.925, 0.905, 0.89), smoothstep(0.1, 1.45, ld));
  col *= mix(vec3(1.0), lamp, uLamp);

  // first visit: light through the slats of a blind
  float slat = smoothstep(0.18, 0.42, abs(fract(s.y * 15.0 - 0.25) - 0.5) * 2.0);
  col *= mix(1.0, mix(0.86, 1.0, slat), uBlind);

  col = mix(vec3(1.0), col, uIntro);
  col += (hash(gl_FragCoord.xy + fract(t) * 61.0) - 0.5) / 255.0; // no banding
  gl_FragColor = vec4(col, 1.0);
}`;

  const lerp = (a, b, k) => a + (b - a) * k;
  const smooth = (k) => k * k * (3 - 2 * k);

  // the light at a minute of the day, between the two keyframes around it
  function at(min) {
    const D = CFG.day;
    let i = 0;
    while (i < D.length - 2 && D[i + 1].m <= min) i++;
    const a = D[i], b = D[i + 1];
    const k = smooth(Math.min(1, Math.max(0, (min - a.m) / (b.m - a.m))));
    const mix3 = (x, y) => x.map((v, j) => lerp(v, y[j], k));
    const dir = mix3(a.dir, b.dir);
    const dl = Math.hypot(dir[0], dir[1]) || 1;
    return {
      win: lerp(a.win, b.win, k), lamp: lerp(a.lamp, b.lamp, k), len: lerp(a.len, b.len, k), soft: lerp(a.soft, b.soft, k),
      dir: [dir[0] / dl, dir[1] / dl], lit: mix3(a.lit, b.lit), shade: mix3(a.shade, b.shade), css: mix3(a.css, b.css),
    };
  }
  const nameAt = (min) => CFG.names.reduce((n, [m, label]) => (min >= m ? label : n), "lamplight");

  const fmt = new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Lagos", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  const lagosNow = () => { const [h, m] = fmt.format(new Date()).split(":").map(Number); return (h % 24) * 60 + m; };
  const clock = (min) => `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(Math.round(min) % 60).padStart(2, "0")}`;

  // ?t=18:10 pins the hour (handy for checking every light)
  const pinned = (() => {
    const m = /[?&]t=(\d{1,2}):?(\d{2})/.exec(location.search);
    return m ? (+m[1] % 24) * 60 + +m[2] : null;
  })();

  DR.light = {
    CFG, at, nameAt, clock,
    minute: pinned ?? lagosNow(),
    live: pinned === null,
    intro: { v: 0, blind: 0, dim: 1 }, // driven by main.js
    listeners: [],
    onChange(fn) { this.listeners.push(fn); fn(this.minute, nameAt(this.minute), this.live); },
    set(min, live = false) {
      this.minute = ((min % 1440) + 1440) % 1440;
      this.live = live;
      this.listeners.forEach((fn) => fn(this.minute, nameAt(this.minute), live));
    },
    now() { this.set(lagosNow(), true); },

    init({ lenis, reduced, tickers }) {
      const root = document.documentElement;
      const target = at(this.minute);
      const cur = JSON.parse(JSON.stringify(target));
      setInterval(() => { if (this.live) this.set(lagosNow(), true); }, 30000);

      // shadows on the page: one sun, every element
      let lastCss = "";
      const writeCss = (L) => {
        const x = (L.dir[0] * L.len).toFixed(3), y = (L.dir[1] * L.len).toFixed(3);
        const c = L.css.map((v) => Math.round(v)).join(", ");
        const key = `${x}|${y}|${c}`;
        if (key === lastCss) return;
        this.sun = { x: +x, y: +y }; // for things drawn in canvas (the paper planes)
        lastCss = key;
        root.style.setProperty("--sun-x", x);
        root.style.setProperty("--sun-y", y);
        root.style.setProperty("--shade", c);
      };
      writeCss(cur);

      const cvs = document.createElement("canvas");
      cvs.className = "daylight";
      cvs.setAttribute("aria-hidden", "true");
      const gl = cvs.getContext("webgl", { alpha: false, antialias: false, depth: false, premultipliedAlpha: false, powerPreference: "low-power" });
      if (!gl) return; // shadows still follow the sun; only the window's image is lost

      const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
      const prog = gl.createProgram();
      try {
        gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
        gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
        gl.linkProgram(prog);
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
      } catch (err) {
        console.warn("[portfolio] daylight shader failed", err);
        return;
      }
      gl.useProgram(prog);
      gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      const loc = gl.getAttribLocation(prog, "p");
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      const U = {};
      ["uRes", "uTime", "uScroll", "uWind", "uWin", "uLamp", "uLen", "uSoft", "uIntro", "uBlind", "uPeriod", "uDir", "uLit", "uShade"].forEach((n) => (U[n] = gl.getUniformLocation(prog, n)));
      gl.uniform1f(U.uPeriod, CFG.period);
      document.body.appendChild(cvs);

      const size = () => {
        cvs.width = Math.max(2, Math.ceil(innerWidth * CFG.scale));
        cvs.height = Math.max(2, Math.ceil(innerHeight * CFG.scale));
        gl.viewport(0, 0, cvs.width, cvs.height);
        gl.uniform2f(U.uRes, cvs.width, cvs.height);
      };
      size();
      window.addEventListener("resize", size);

      let wind = 0, drawn = "";
      const flying = () => root.classList.contains("is-flying");
      tickers.push((t, dt, v) => {
        if (flying()) return;
        // settle toward the hour (a scrub through the day glides, it doesn't jump)
        const T = at(this.minute);
        const k = Math.min(1, dt * CFG.ease);
        ["win", "lamp", "len", "soft"].forEach((p) => (cur[p] += (T[p] - cur[p]) * k));
        ["dir", "lit", "shade", "css"].forEach((p) => cur[p].forEach((_, j) => (cur[p][j] += (T[p][j] - cur[p][j]) * k)));
        writeCss(cur);

        wind += (Math.min(1, Math.abs(v) / 45) * CFG.wind.gain - wind) * Math.min(1, dt * CFG.wind.settle);
        // extra: a scrolled overlay (the case study) walks you past the windows too
        const scroll = (((lenis ? lenis.scroll : scrollY) + (this.extra || 0)) / innerHeight) * CFG.parallax;
        const time = reduced ? 0 : t;
        // reduced motion: redraw only when something actually changed
        if (reduced) {
          const key = `${scroll.toFixed(4)}|${cur.len.toFixed(3)}|${(this.intro.v * this.intro.dim).toFixed(3)}|${cur.win.toFixed(3)}`;
          if (key === drawn) return;
          drawn = key;
        }
        gl.uniform1f(U.uTime, time);
        gl.uniform1f(U.uScroll, scroll);
        gl.uniform1f(U.uWind, reduced ? 0 : wind);
        gl.uniform1f(U.uWin, cur.win);
        gl.uniform1f(U.uLamp, cur.lamp);
        gl.uniform1f(U.uLen, cur.len);
        gl.uniform1f(U.uSoft, cur.soft);
        gl.uniform1f(U.uIntro, this.intro.v * this.intro.dim * CFG.strength);
        gl.uniform1f(U.uBlind, this.intro.blind);
        gl.uniform2f(U.uDir, cur.dir[0], cur.dir[1]);
        gl.uniform3f(U.uLit, ...cur.lit);
        gl.uniform3f(U.uShade, ...cur.shade);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      });
    },
  };
})();
