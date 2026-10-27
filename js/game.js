/* ==========================================================================
   game.js — Paper Flight. A folded print flies through the studio: thread
   the cobalt film frames, dodge the drying lines of hanging prints, and pass
   the real projects hanging in the haze. In the cabinet it plays itself
   (attract mode); Press start and the screen opens to fullscreen.

   The world scrolls toward the camera; the plane only moves in x/y. Every
   object is pooled. Collisions are tested once, as an object crosses z = 0.
   ========================================================================== */
(() => {
  const DR = (window.DR = window.DR || {});

  const CFG = {
    bounds: { x: 6.2, yMin: -2.3, yMax: 3.4 },
    floorY: -3.6,
    speed: { start: 25, max: 58, ramp: 0.38, boost: 1.45 },
    spawnZ: -175,
    fog: [34, 168],
    lives: 3,
    maxCombo: 6,
    // the combo climbs one step per `per` frames in a row, so ×6 is earned, not given
    combo: { per: 3 },
    // difficulty: seconds flown, plus a jump at every checkpoint
    difficulty: { time: 95, zone: 0.14 },
    // the opening in a drying line narrows as the run goes on (half-width)
    gap: [1.4, 1.0],
    // a lure: the trail of frames leads at the wall, and the gap is yours to find
    bait: { start: 6, p: [0.22, 0.5] },
    // a risky frame: small, threaded just over the line or under the prints, worth double
    risk: { p: [0.2, 0.45], scale: 0.72, points: 2 },
    // frames thin out as they reach the lens, so they never hide what's next
    fade: { from: -7, min: 0.3 },
    tally: 0.7, // seconds a points pop keeps adding before it floats away
    points: { frame: 10, gold: 60, close: 25, perUnit: 0.2 },
    boostTime: 3.5,
    invuln: 1.6,
    hitbox: { w: 0.55, h: 0.22 },
    frameWindow: { w: 1.12, h: 0.72 },
    row: { sheetW: 1.5, sheetH: 2.0, pitch: 1.62, gap: 1.35, span: 11.5, max: 16 },
    billboardEvery: 54,
    camera: { fov: 60, boostFov: 14, z: 7.8, height: 1.9 },
    dpr: { attract: 1.25, play: 1.75 },
    color: { haze: 0xefe9dc, paper: 0xfffdf9, ink: 0x17150f, accent: 0x2b45ff, gold: 0xe8b04a, wood: 0xcfac80 },
    bestKey: "mo-flight-best",
    skinKey: "mo-flight-skin",
    // barrel roll: a short invulnerable spin on a cooldown — the skill move
    roll: { time: 0.55, cooldown: 2.2, bonus: 50 },
    // skim something and the world slows for a beat
    slow: { time: 0.34, scale: 0.28 },
    // the flight runs through a day; every zone is a checkpoint. Never dark.
    zones: [
      { at: 0, name: "Morning studio", top: "#dfe6ff", mid: "#f3efe7", bot: "#efe9dc", haze: "#efe9dc", sun: "#fff4e2", hemi: 1.5 },
      { at: 800, name: "Golden hour", top: "#ffd6a1", mid: "#fde8cd", bot: "#f2dbbd", haze: "#f2dbbd", sun: "#ffbb63", hemi: 1.35 },
      { at: 1700, name: "Blue hour", top: "#b6bff6", mid: "#efdbe5", bot: "#ecd7d5", haze: "#e9d6d9", sun: "#cbb9ff", hemi: 1.25 },
      { at: 2700, name: "Lamplight", top: "#a3b3ff", mid: "#dcdef5", bot: "#e4e1ef", haze: "#e1deef", sun: "#f1f4ff", hemi: 1.35 },
    ],
    zoneBlend: 320,
    checkpoint: 250,
    // the hangar: planes unlocked by best score
    skins: [
      { id: "paper", name: "Paper", need: 0, body: 0xfffdf9, edge: 0x17150f, trail: 0x2b45ff, rough: 0.9, metal: 0 },
      { id: "cobalt", name: "Cobalt", need: 3000, body: 0x3550ff, edge: 0x0b1466, trail: 0xe8b04a, rough: 0.6, metal: 0.1 },
      { id: "gold", name: "Gold leaf", need: 10000, body: 0xe2a93c, edge: 0x6b4508, trail: 0x2b45ff, rough: 0.32, metal: 0.75 },
    ],
  };

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[(Math.random() * arr.length) | 0];
  const fmt = (n) => Math.floor(n).toLocaleString("en-GB");

  // ---------- canvas painting ------------------------------------------------
  function cnv(w, h) {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    return [c, c.getContext("2d")];
  }
  function rr(x, cx, cy, w, h, r) { x.beginPath(); x.roundRect(cx, cy, w, h, r); }
  function cover(x, img, dx, dy, dw, dh) {
    const s = Math.max(dw / img.width, dh / img.height);
    const sw = dw / s, sh = dh / s;
    x.drawImage(img, (img.width - sw) / 2, 0, sw, sh, dx, dy, dw, dh); // top-aligned: screenshots read from the top
  }
  // stand-in for a screenshot we may not use: paper, a cobalt initial
  function blank(x, name, dx, dy, dw, dh) {
    x.fillStyle = "#e9e3d6";
    x.fillRect(dx, dy, dw, dh);
    x.fillStyle = "#2b45ff";
    x.font = `italic 400 ${Math.round(dh * 0.62)}px "Instrument Serif", Georgia, serif`;
    x.textAlign = "center";
    x.textBaseline = "middle";
    x.fillText(name.charAt(0), dx + dw / 2, dy + dh / 2);
    x.textAlign = "left";
    x.textBaseline = "alphabetic";
  }
  const loadImg = (src) => new Promise((res) => {
    const i = new Image();
    i.decoding = "async";
    i.onload = () => res(i);
    i.onerror = () => res(null);
    i.src = src;
  });

  DR.flight = {
    init({ THREE, gsap, lenis, reduced, tickers }) {
      const root = document.getElementById("flight");
      if (!root) return;
      const $ = (s) => root.querySelector(s);
      const ui = {
        canvas: $(".fl-canvas"), title: $(".fl-title"), start: $(".fl-start"),
        hud: $(".fl-hud"), score: $(".fl-score"), combo: $(".fl-combo"), dist: $(".fl-dist"),
        lives: $(".fl-lives"), close: $(".fl-close"), caption: $(".fl-caption"),
        count: $(".fl-count"), pops: $(".fl-pops"), flash: $(".fl-flash"), boost: $(".fl-boost"),
        over: $(".fl-over"), final: $(".fl-final b"), newBest: $(".fl-newbest"), again: $(".fl-again"), hire: $(".fl-hire"),
        sFrames: $(".fl-s-frames"), sDist: $(".fl-s-dist"), sCombo: $(".fl-s-combo"), sProj: $(".fl-s-proj"),
        paused: $(".fl-paused"), resume: $(".fl-resume"),
        overKicker: $(".fl-over-kicker"), unlock: $(".fl-unlock"), share: $(".fl-share"), hangar: $(".fl-hangar"),
        zone: $(".fl-zone"), zoneNo: $(".fl-zone span"), zoneName: $(".fl-zone b"), roll: $(".fl-roll"),
        bests: [...document.querySelectorAll(".fl-best b, .fl-best-line b, .deck-hi")],
      };
      const slot = root.parentElement; // the cabinet's screen well; keeps its size while we go fullscreen

      let best = 0;
      try { best = +localStorage.getItem(CFG.bestKey) || 0; } catch {}
      const showBest = () => ui.bests.forEach((b) => (b.textContent = b.classList.contains("deck-hi") ? String(Math.floor(best)).padStart(5, "0") : fmt(best)));
      showBest();

      const hasGL = (() => {
        try {
          const gl = document.createElement("canvas").getContext("webgl2") || document.createElement("canvas").getContext("webgl");
          gl?.getExtension("WEBGL_lose_context")?.loseContext();
          return !!gl;
        } catch { return false; }
      })();
      if (!hasGL) { root.dataset.state = "nogl"; return; }
      // the page hands us three.js, except on file:// or after a failed fetch: then we fetch it
      const getThree = () => (THREE ? Promise.resolve(THREE) : DR.importThree());
      // local files can't be WebGL textures, so on file:// the prints carry names, not screenshots
      const local = location.protocol === "file:";

      // projects and archive frames, read from the page so the game never drifts from it
      const projects = [...document.querySelectorAll(".case[data-reel]")].map((c) => ({
        src: c.querySelector(".print img").getAttribute("src"),
        name: c.querySelector(".case-title").textContent.trim(),
        kind: c.dataset.kind,
      }));
      const archive = [...document.querySelectorAll(".frame")].map((f) => ({
        src: f.querySelector("img").getAttribute("src"),
        name: f.dataset.name.split(" · ")[0],
        kind: "Studio archive",
      }));

      let booted = false, visible = false;
      new IntersectionObserver((es) => {
        visible = es[0].isIntersecting;
        if (visible && !booted) { booted = true; load(); }
      }, { rootMargin: "500px 0px" }).observe(slot);

      function load() {
        root.dataset.state = "loading";
        getThree().then((T) => {
          if (T) { THREE = T; root.dataset.state = "attract"; boot(); }
          else root.dataset.state = "offline";
        });
      }
      root.querySelector(".fl-retry").addEventListener("click", load);

      function boot() {
        // ---------- renderer, scene, camera ---------------------------------
        const renderer = new THREE.WebGLRenderer({ canvas: ui.canvas, antialias: true, powerPreference: "high-performance" });
        renderer.setClearColor(CFG.color.haze);
        const maxAniso = renderer.capabilities.getMaxAnisotropy();
        const tex = (c) => {
          const t = new THREE.CanvasTexture(c);
          t.colorSpace = THREE.SRGBColorSpace;
          t.anisotropy = maxAniso;
          return t;
        };

        const scene = new THREE.Scene();
        scene.fog = new THREE.Fog(CFG.color.haze, CFG.fog[0], CFG.fog[1]);
        const camera = new THREE.PerspectiveCamera(CFG.camera.fov, 16 / 9, 0.1, 400);
        camera.position.set(0, CFG.camera.height, CFG.camera.z);

        // sky: a gradient dome that follows the camera; its three colours move with the time of day
        const skyU = { uTop: { value: new THREE.Color() }, uMid: { value: new THREE.Color() }, uBot: { value: new THREE.Color() } };
        const sky = new THREE.Mesh(new THREE.SphereGeometry(300, 32, 16), new THREE.ShaderMaterial({
          uniforms: skyU,
          vertexShader: "varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
          fragmentShader: `uniform vec3 uTop, uMid, uBot; varying vec3 vDir;
            void main(){
              float h = vDir.y;
              vec3 c = h > 0.0 ? mix(uMid, uTop, smoothstep(0.0, 0.42, h)) : mix(uMid, uBot, smoothstep(0.0, 0.12, -h));
              gl_FragColor = vec4(c, 1.0);
              #include <colorspace_fragment>
            }`,
          side: THREE.BackSide, depthWrite: false, fog: false,
        }));
        sky.renderOrder = -1;
        scene.add(sky);

        const hemi = new THREE.HemisphereLight(0xffffff, 0xd8ccb4, 1.5);
        scene.add(hemi);
        const sun = new THREE.DirectionalLight(0xfff4e2, 1.9);
        sun.position.set(5, 10, 7);
        scene.add(sun);

        // time of day: zone colours blended by distance flown
        const zones = CFG.zones.map((z) => ({ ...z, c: ["top", "mid", "bot", "haze", "sun"].map((k) => new THREE.Color(z[k])) }));
        const mixed = zones[0].c.map((c) => c.clone());
        let lightAt = -1;
        function light(d) {
          if (Math.abs(d - lightAt) < 0.5) return;
          lightAt = d;
          let i = 0;
          while (i < zones.length - 1 && d >= zones[i + 1].at) i++;
          const cur = zones[i], prev = zones[Math.max(0, i - 1)];
          let t = i === 0 ? 1 : clamp((d - cur.at) / CFG.zoneBlend, 0, 1);
          t = t * t * (3 - 2 * t);
          mixed.forEach((m, k) => m.copy(prev.c[k]).lerp(cur.c[k], t));
          skyU.uTop.value.copy(mixed[0]);
          skyU.uMid.value.copy(mixed[1]);
          skyU.uBot.value.copy(mixed[2]);
          scene.fog.color.copy(mixed[3]);
          sun.color.copy(mixed[4]);
          hemi.intensity = lerp(prev.hemi, cur.hemi, t);
        }
        light(0);

        // ---------- the cutting-mat floor --------------------------------------
        const matTex = (() => {
          const [c, x] = cnv(320, 320);
          x.fillStyle = "#ebe5d7";
          x.fillRect(0, 0, 320, 320);
          x.strokeStyle = "rgba(23,21,15,0.10)";
          x.lineWidth = 1.5;
          for (let i = 1; i < 5; i++) {
            x.beginPath(); x.moveTo(i * 64, 0); x.lineTo(i * 64, 320); x.moveTo(0, i * 64); x.lineTo(320, i * 64); x.stroke();
          }
          x.strokeStyle = "rgba(43,69,255,0.2)";
          x.lineWidth = 2.5;
          x.beginPath(); x.moveTo(1.5, 0); x.lineTo(1.5, 320); x.moveTo(0, 1.5); x.lineTo(320, 1.5); x.stroke();
          const t = tex(c);
          t.wrapS = t.wrapT = THREE.RepeatWrapping;
          t.repeat.set(24, 52);
          return t;
        })();
        const floor = new THREE.Mesh(new THREE.PlaneGeometry(120, 260), new THREE.MeshLambertMaterial({ map: matTex }));
        floor.rotation.x = -Math.PI / 2;
        floor.position.set(0, CFG.floorY, -110);
        scene.add(floor);

        const softTex = (rgba) => {
          const [c, x] = cnv(128, 128);
          const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
          g.addColorStop(0, rgba);
          g.addColorStop(1, "rgba(0,0,0,0)");
          x.fillStyle = g;
          x.fillRect(0, 0, 128, 128);
          return tex(c);
        };
        const shadow = new THREE.Mesh(
          new THREE.PlaneGeometry(2.6, 1.8),
          new THREE.MeshBasicMaterial({ map: softTex("rgba(23,21,15,0.45)"), transparent: true, depthWrite: false })
        );
        shadow.rotation.x = -Math.PI / 2;
        shadow.position.y = CFG.floorY + 0.01;
        scene.add(shadow);

        // ---------- the paper plane --------------------------------------------
        const bodyMat = new THREE.MeshStandardMaterial({ color: CFG.color.paper, roughness: 0.9, side: THREE.DoubleSide, flatShading: true });
        const edgeMat = new THREE.LineBasicMaterial({ color: CFG.color.ink, transparent: true, opacity: 0.4 });
        const trailColor = new THREE.Color(CFG.color.accent);
        const plane = new THREE.Group();
        plane.rotation.order = "YXZ";
        const tips = [new THREE.Vector3(-0.95, 0.14, 0.6), new THREE.Vector3(0.95, 0.14, 0.6)];
        {
          const N = [0, 0.02, -1.3], WL = [-0.95, 0.14, 0.6], WR = [0.95, 0.14, 0.6];
          const FL = [-0.09, 0, 0.6], FR = [0.09, 0, 0.6], K = [0, -0.34, 0.6];
          const tris = [N, FL, WL, N, WR, FR, N, K, FL, N, FR, K];
          const g = new THREE.BufferGeometry();
          g.setAttribute("position", new THREE.Float32BufferAttribute(tris.flat(), 3));
          g.computeVertexNormals();
          plane.add(new THREE.Mesh(g, bodyMat), new THREE.LineSegments(new THREE.EdgesGeometry(g, 1), edgeMat));
          plane.scale.setScalar(0.95);
        }
        scene.add(plane);

        // wingtip ribbons — the vapour trail, in cobalt. A fixed length behind the
        // plane; only x/y carry history, so a fast world can't stretch it past the lens
        function makeTrail() {
          const N = 18, STEP = 0.2;
          const pts = Array.from({ length: N }, () => new THREE.Vector3());
          const pos = new Float32Array(N * 6), alpha = new Float32Array(N * 2);
          const idx = [];
          for (let i = 0; i < N - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
          const g = new THREE.BufferGeometry();
          g.setIndex(idx);
          g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
          g.setAttribute("alpha", new THREE.BufferAttribute(alpha, 1));
          const m = new THREE.ShaderMaterial({
            uniforms: { uColor: { value: trailColor } }, // shared, so a new skin recolours both trails
            vertexShader: "attribute float alpha; varying float vA; void main(){ vA = alpha; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
            fragmentShader: "uniform vec3 uColor; varying float vA; void main(){ gl_FragColor = vec4(uColor, vA); }",
            transparent: true, depthWrite: false, side: THREE.DoubleSide,
          });
          const mesh = new THREE.Mesh(g, m);
          mesh.frustumCulled = false;
          scene.add(mesh);
          let primed = false;
          return {
            update(head, strength) {
              if (!primed) { pts.forEach((p) => p.copy(head)); primed = true; }
              for (let i = N - 1; i > 0; i--) pts[i].copy(pts[i - 1]);
              pts[0].copy(head);
              for (let i = 0; i < N; i++) {
                const t = i / (N - 1), w = 0.05 * (1 - t), p = pts[i];
                p.z = head.z + i * STEP;
                pos.set([p.x, p.y + w, p.z, p.x, p.y - w, p.z], i * 6);
                alpha[i * 2] = alpha[i * 2 + 1] = (1 - t) * 0.55 * strength;
              }
              g.attributes.position.needsUpdate = true;
              g.attributes.alpha.needsUpdate = true;
            },
            reset() { primed = false; },
          };
        }
        const trails = [makeTrail(), makeTrail()];
        const tipW = new THREE.Vector3();

        // ---------- film frames (collectables) -----------------------------------
        const frameTex = (color) => {
          const [c, x] = cnv(512, 384);
          x.fillStyle = color;
          rr(x, 0, 0, 512, 384, 30); x.fill();
          x.globalCompositeOperation = "destination-out";
          rr(x, 52, 62, 408, 260, 12); x.fill();
          for (let px = 26; px < 490; px += 46) { rr(x, px, 18, 24, 28, 6); x.fill(); rr(x, px, 338, 24, 28, 6); x.fill(); }
          return tex(c);
        };
        const frameGeo = new THREE.PlaneGeometry(2.8, 2.1);
        const frameMat = new THREE.MeshBasicMaterial({ map: frameTex("#2b45ff"), alphaTest: 0.02, transparent: true, side: THREE.DoubleSide });
        const goldMat = new THREE.MeshBasicMaterial({ map: frameTex("#e8b04a"), alphaTest: 0.02, transparent: true, side: THREE.DoubleSide });
        const glowMat = new THREE.SpriteMaterial({ map: softTex("rgba(255,214,120,0.9)"), transparent: true, depthWrite: false });
        const frames = Array.from({ length: 44 }, () => {
          const mats = { blue: frameMat.clone(), gold: goldMat.clone() };
          const mesh = new THREE.Mesh(frameGeo, mats.blue);
          const glow = new THREE.Sprite(glowMat);
          glow.scale.set(5, 4, 1);
          glow.visible = false;
          mesh.add(glow);
          mesh.visible = false;
          scene.add(mesh);
          return { mesh, glow, mats, alive: false, taken: false, x: 0, y: 0, z: 0, row: null, gold: false, risk: false, s: 1, ph: 0 };
        });
        function spawnFrame(x, y, z, row = null, gold = false, risk = false) {
          const f = frames.find((o) => !o.alive);
          if (!f) return;
          Object.assign(f, { alive: true, taken: false, x, y, z, row, gold, risk, s: risk ? CFG.risk.scale : 1, ph: Math.random() * 6 });
          f.mesh.material = gold ? f.mats.gold : f.mats.blue;
          f.mesh.material.opacity = 1;
          f.glow.visible = gold;
          f.mesh.scale.setScalar((gold ? 1.08 : 1) * f.s);
          f.mesh.visible = true;
        }

        // ---------- checkpoint gates: a film frame big enough to fly through ------------
        // window covers the whole corridor; the zone's name is painted on the top band
        const GATE = { w: 22, h: 12.1, y: 0.55 };
        const gateTexFor = (zone, i) => {
          const [c, x] = cnv(1024, 563);
          x.fillStyle = "#2b45ff";
          rr(x, 0, 0, 1024, 563, 34); x.fill();
          x.globalCompositeOperation = "destination-out";
          rr(x, 84, 120, 856, 360, 18); x.fill();
          for (let px = 40; px < 990; px += 52) { rr(x, px, 500, 26, 34, 7); x.fill(); }
          x.globalCompositeOperation = "source-over";
          x.fillStyle = "#fffdf9";
          x.font = '500 22px "IBM Plex Mono", monospace';
          x.fillText(`ZONE ${i + 1}  ·  CHECKPOINT  +${CFG.checkpoint}`, 86, 50);
          x.font = 'italic 400 64px "Instrument Serif", Georgia, serif';
          x.fillText(zone.name, 84, 104);
          x.textAlign = "right";
          x.font = '500 22px "IBM Plex Mono", monospace';
          x.fillText(`${fmt(zone.at)} M`, 940, 50);
          return tex(x.canvas);
        };
        const gateTexs = CFG.zones.map((z, i) => (i ? gateTexFor(z, i) : null));
        const gate = new THREE.Mesh(new THREE.PlaneGeometry(GATE.w, GATE.h), new THREE.MeshBasicMaterial({ alphaTest: 0.5, side: THREE.DoubleSide }));
        gate.visible = false;
        scene.add(gate);
        const G = { alive: false, z: 0, zone: 0 };

        // ---------- hanging prints, billboards ---------------------------------------
        const printTexs = [], boardTexs = [];
        const placeholder = new THREE.MeshLambertMaterial({ color: CFG.color.paper, side: THREE.DoubleSide });
        Promise.all([...projects, ...archive].map((p) => (local ? null : loadImg(p.src)))).then((imgs) => {
          imgs.forEach((img, i) => {
            const p = i < projects.length ? projects[i] : archive[i - projects.length];
            // a print: white border, the shot, a caption
            const [c, x] = cnv(320, 400);
            x.fillStyle = "#fffdf9"; x.fillRect(0, 0, 320, 400);
            img ? cover(x, img, 16, 16, 288, 296) : blank(x, p.name, 16, 16, 288, 296);
            x.fillStyle = "#17150f";
            x.font = '400 34px "Instrument Serif", Georgia, serif';
            x.fillText(p.name, 18, 352);
            x.fillStyle = "#8a8378";
            x.font = '500 12px "IBM Plex Mono", monospace';
            x.fillText(p.kind.toUpperCase(), 18, 378);
            printTexs.push(tex(c));
            if (i < projects.length) {
              const [b, y] = cnv(1024, 760);
              y.fillStyle = "#fffdf9"; y.fillRect(0, 0, 1024, 760);
              img ? cover(y, img, 22, 22, 980, 612) : blank(y, p.name, 22, 22, 980, 612);
              y.fillStyle = "#17150f";
              y.font = '400 66px "Instrument Serif", Georgia, serif';
              y.fillText(p.name, 26, 714);
              y.fillStyle = "#2b45ff";
              y.font = '500 20px "IBM Plex Mono", monospace';
              y.textAlign = "right";
              y.fillText(p.kind.toUpperCase(), 998, 708);
              boardTexs[i] = tex(b);
            }
          });
          boards.forEach((b) => b.alive && dress(b));
        });

        const R = CFG.row;
        const sheetGeo = new THREE.PlaneGeometry(R.sheetW, R.sheetH).translate(0, -R.sheetH / 2, 0);
        const lineGeo = new THREE.CylinderGeometry(0.024, 0.024, R.span * 2 + 3, 6);
        const pinGeo = new THREE.BoxGeometry(0.09, 0.28, 0.07);
        const inkMat = new THREE.MeshLambertMaterial({ color: 0x5a544a });
        const woodMat = new THREE.MeshLambertMaterial({ color: CFG.color.wood });
        const rows = Array.from({ length: 6 }, () => {
          const g = new THREE.Group();
          const line = new THREE.Mesh(lineGeo, inkMat);
          line.rotation.z = Math.PI / 2;
          g.add(line);
          const sheets = Array.from({ length: R.max }, () => {
            const m = new THREE.Mesh(sheetGeo, placeholder);
            const pin = new THREE.Mesh(pinGeo, woodMat);
            pin.position.set(0, 0.02, 0.04);
            m.add(pin);
            g.add(m);
            return m;
          });
          g.visible = false;
          scene.add(g);
          return { g, sheets, alive: false, z: 0, yL: 0, offset: 0, swing: 0, ph: 0, crossed: false };
        });
        function spawnRow(z, yL, gapX, swing, gapW = R.gap) {
          const r = rows.find((o) => !o.alive);
          if (!r) return null;
          Object.assign(r, { alive: true, z, yL, swing, ph: Math.random() * 6, offset: 0, crossed: false, gapX, gapY: 0 });
          r.g.position.set(0, yL, z);
          let k = 0;
          for (let x = -R.span; x <= R.span && k < R.max; x += R.pitch) {
            if (Math.abs(x - gapX) < gapW + R.sheetW / 2) continue;
            const s = r.sheets[k++];
            s.visible = true;
            s.position.set(x, 0, 0);
            s.rotation.set(0, 0, rand(-0.05, 0.05));
            s.material = printTexs.length ? sheetMat(pick(printTexs)) : placeholder;
            s.userData.hit = false;
          }
          for (; k < R.max; k++) r.sheets[k].visible = false;
          r.g.visible = true;
          return r;
        }
        const sheetMats = new Map();
        const sheetMat = (t) => {
          if (!sheetMats.has(t)) sheetMats.set(t, new THREE.MeshLambertMaterial({ map: t, side: THREE.DoubleSide }));
          return sheetMats.get(t);
        };

        const boardGeo = new THREE.PlaneGeometry(7.2, 5.34);
        const stringGeo = new THREE.BufferGeometry().setAttribute("position", new THREE.Float32BufferAttribute([-3.4, 2.67, 0, -3.4, 40, 0, 3.4, 2.67, 0, 3.4, 40, 0], 3));
        const stringMat = new THREE.LineBasicMaterial({ color: CFG.color.ink, transparent: true, opacity: 0.3 });
        const boards = Array.from({ length: 5 }, () => {
          const m = new THREE.Mesh(boardGeo, new THREE.MeshBasicMaterial({ color: CFG.color.paper, side: THREE.DoubleSide }));
          m.add(new THREE.LineSegments(stringGeo, stringMat));
          m.visible = false;
          scene.add(m);
          return { m, alive: false, z: 0, idx: 0, side: 1, told: false };
        });
        function dress(b) {
          const t = boardTexs[b.idx];
          b.m.material.map = t || null;
          b.m.material.color.set(t ? 0xffffff : CFG.color.paper);
          b.m.material.needsUpdate = true;
        }

        // ---------- ambient paper scraps + collect sparks ------------------------------
        const dummy = new THREE.Object3D();
        const palette = [0xfffdf9, 0xfffdf9, 0xfffdf9, 0x2b45ff, 0xe8b04a, 0xd9d1c2].map((c) => new THREE.Color(c));

        // the canyon: giant cards of paper standing on the mat either side of the route
        const MONOS = 74;
        const monos = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), new THREE.MeshLambertMaterial(), MONOS);
        const monoTones = [0xfbf8f2, 0xfbf8f2, 0xfbf8f2, 0xf3ede1, 0xe9e1d1, 0x2b45ff, 0xe8b04a].map((c) => new THREE.Color(c));
        const seedMono = (m, i, z) => {
          const side = Math.random() < 0.5 ? -1 : 1;
          const far = Math.random();
          Object.assign(m, {
            x: side * lerp(9.5, 34, far), z,
            w: rand(2.4, 7), h: rand(3, 11) * (1 + far * 1.4), d: rand(0.14, 0.32),
            ry: rand(-0.6, 0.6), rz: Math.random() < 0.15 ? side * rand(0.05, 0.16) : 0,
          });
          monos.setColorAt(i, Math.random() < 0.16 ? pick(monoTones.slice(5)) : pick(monoTones.slice(0, 5)));
          if (monos.instanceColor) monos.instanceColor.needsUpdate = true;
          return m;
        };
        const monoData = Array.from({ length: MONOS }, (_, i) => seedMono({}, i, rand(CFG.spawnZ, 16)));
        scene.add(monos);
        const SCRAPS = 150;
        const scraps = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.17, 0.12), new THREE.MeshLambertMaterial({ side: THREE.DoubleSide }), SCRAPS);
        const scrapData = Array.from({ length: SCRAPS }, (_, i) => {
          scraps.setColorAt(i, pick(palette));
          return { x: rand(-18, 18), y: rand(-3.4, 9), z: rand(CFG.spawnZ, 12), rx: rand(0, 6), ry: rand(0, 6), s: rand(0.6, 1.6), spin: rand(0.5, 2.5) };
        });
        scene.add(scraps);

        const SPARKS = 160;
        const sparks = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.16, 0.1), new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }), SPARKS);
        sparks.frustumCulled = false;
        const sparkData = Array.from({ length: SPARKS }, (_, i) => {
          sparks.setColorAt(i, palette[3]);
          return { life: 0, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, r: 0 };
        });
        scene.add(sparks);
        function burst(x, y, z, n, colors) {
          let made = 0;
          for (let i = 0; i < SPARKS && made < n; i++) {
            const s = sparkData[i];
            if (s.life > 0) continue;
            const a = Math.random() * Math.PI * 2, v = rand(3, 9);
            Object.assign(s, { life: rand(0.5, 0.9), x, y, z, vx: Math.cos(a) * v, vy: Math.sin(a) * v, vz: rand(-4, 4), r: rand(0, 6) });
            sparks.setColorAt(i, pick(colors));
            made++;
          }
          sparks.instanceColor.needsUpdate = true;
        }

        // ---------- state ----------------------------------------------------------
        const B = { ...CFG.bounds };
        const S = {
          state: "attract", t: 0, run: 0, speed: CFG.speed.start, speedMul: 1, dist: 0,
          score: 0, shown: -1, combo: 1, chain: 0, bestCombo: 1, frames: 0, lives: CFG.lives,
          invuln: 0, boost: 0, shake: 0, safe: { x: 0, y: 0.6 }, spawnIn: 20, boardIn: 6, boardIdx: 0,
          passed: new Set(), fov: CFG.camera.fov, baseFov: CFG.camera.fov, auto: { x: 0, y: 0.6 },
          roll: 0, rollCd: 0, rollDir: 1, slow: 0, ts: 1, punch: 0, zone: 0, amb: 0, lastTap: 0, seen: { rows: 0, lures: 0 },
        };

        // ---------- the hangar ------------------------------------------------------------
        const SKINS = CFG.skins;
        let skin = SKINS[0];
        try { skin = SKINS.find((s) => s.id === localStorage.getItem(CFG.skinKey) && best >= s.need) || SKINS[0]; } catch {}
        function wear(s) {
          skin = s;
          bodyMat.color.set(s.body);
          bodyMat.roughness = s.rough;
          bodyMat.metalness = s.metal;
          edgeMat.color.set(s.edge);
          trailColor.set(s.trail);
          try { localStorage.setItem(CFG.skinKey, s.id); } catch {}
          renderHangar();
        }
        function renderHangar() {
          ui.hangar.innerHTML = SKINS.map((s) => {
            const open = best >= s.need, on = s === skin;
            const hex = `#${new THREE.Color(s.body).getHexString()}`;
            return `<button class="fl-skin${on ? " is-on" : ""}" type="button" data-id="${s.id}" data-cursor="link" aria-pressed="${on}" ${open ? "" : "disabled"}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 11 22 3l-6 18-4-7-10-3Z" fill="${open ? hex : "none"}"/><path d="m12 14 10-11"/></svg>
              <span>${s.name}</span><small>${open ? (on ? "Flying" : "Ready") : `Score ${fmt(s.need)}`}</small>
            </button>`;
          }).join("");
        }
        ui.hangar.addEventListener("click", (e) => {
          const b = e.target.closest(".fl-skin");
          if (b && !b.disabled) wear(SKINS.find((s) => s.id === b.dataset.id));
        });
        wear(skin);
        const P = { x: 0, y: 0.6, vx: 0, vy: 0, tumble: 0 };
        const input = { x: 0, y: 0.6, kx: 0, ky: 0 };
        root.dataset.state = "attract";

        // ---------- sizing ------------------------------------------------------------
        let W = 1;
        function resize() {
          const w = root.clientWidth, h = root.clientHeight;
          if (!w || !h) return;
          const full = root.classList.contains("is-full");
          renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, full ? CFG.dpr.play : CFG.dpr.attract));
          renderer.setSize(w, h, false);
          camera.aspect = w / h;
          // narrow screens: a tighter corridor and a wider lens, so the edges stay in view
          W = clamp(camera.aspect / 1.6, 0.42, 1);
          B.x = CFG.bounds.x * W;
          S.baseFov = CFG.camera.fov + (1 - Math.min(1, camera.aspect)) * 30;
          camera.updateProjectionMatrix();
        }
        new ResizeObserver(resize).observe(root);
        resize();

        // ---------- the level generator -------------------------------------------------
        function nextSafe(step) {
          return {
            x: clamp(S.safe.x + rand(-1, 1) * step, -B.x + 0.9, B.x - 0.9),
            y: clamp(S.safe.y + rand(-1, 1) * step * 0.7, B.yMin + 0.6, B.yMax - 0.6),
          };
        }
        function pathChunk(z0, d) {
          const a = S.safe, b = nextSafe(4.2), n = 5, sign = Math.random() < 0.5 ? 1 : -1;
          for (let i = 0; i < n; i++) {
            const t = (i + 1) / n, e = t * t * (3 - 2 * t);
            spawnFrame(lerp(a.x, b.x, e), clamp(lerp(a.y, b.y, e) + Math.sin(t * Math.PI) * 0.9 * sign, B.yMin + 0.4, B.yMax - 0.3), z0 - i * 9);
          }
          S.safe = b;
          return n * 9 + lerp(20, 10, d);
        }
        function rowAt(z, d, from, signpost = true) {
          const kind = pick(["high", "mid", "low"]);
          let yL = kind === "high" ? B.yMax + 0.5 : kind === "mid" ? rand(1.4, 2.2) : rand(-0.2, 0.5);
          // some lines are hung where the player is flying, more as the run goes on: keep moving
          if (S.state === "play" && Math.random() < 0.35 + 0.4 * d) yL = clamp(P.y + rand(0.4, 1.6), -0.2, B.yMax + 0.5);
          const gap = {
            x: clamp(from.x + rand(-3, 3), -B.x + 1, B.x - 1),
            y: clamp(yL - 1.0, B.yMin + 0.5, B.yMax - 0.4),
          };
          const swing = S.state === "play" && d > 0.3 && Math.random() < 0.25 + 0.35 * d ? rand(0.8, 1.4) * W : 0;
          const r = spawnRow(z, yL, gap.x, swing, lerp(CFG.gap[0], CFG.gap[1], d));
          if (r) {
            r.gapY = gap.y;
            if (signpost) spawnFrame(gap.x, gap.y, z, r);
            // a risky frame, threaded just over the line or just under the prints
            if (S.state === "play" && Math.random() < lerp(CFG.risk.p[0], CFG.risk.p[1], d)) {
              const over = yL + 0.62, under = yL - R.sheetH - 0.62;
              const ry = over < B.yMax - 0.2 ? over : under > B.yMin + 0.3 ? under : null;
              if (ry !== null) spawnFrame(clamp(gap.x + rand(-4, 4) * W, -B.x + 0.8, B.x - 0.8), ry, z, r, false, true);
            }
          }
          return gap;
        }
        function rowChunk(z0, d) {
          const a = S.safe;
          // the trail can lie: it leads at the wall, and there's no frame in the gap —
          // read the hanging prints and find the opening yourself
          const luring = S.state === "play" && S.run > CFG.bait.start && Math.random() < lerp(CFG.bait.p[0], CFG.bait.p[1], d);
          let gap = rowAt(z0 - 32, d, a, !luring);
          S.seen.rows++; // tuning counters (DR.debug.flight.S.seen)
          if (luring) S.seen.lures++;
          const lure = luring ? { x: clamp(gap.x - Math.sign(gap.x || 1) * rand(2.4, 3.6) * W, -B.x + 0.8, B.x - 0.8), y: gap.y } : gap;
          for (let i = 0; i < 3; i++) {
            const t = (i + 1) / 4;
            spawnFrame(lerp(a.x, lure.x, t), lerp(a.y, lure.y, t), z0 - i * 9);
          }
          let len = 32, after = luring ? lure : gap; // a lure's trail picks up again on its own side
          if (S.state === "play" && d > 0.35 && Math.random() < 0.3 + 0.4 * d) {
            gap = rowAt(z0 - 46, d, gap);
            after = gap;
            len += 14;
          }
          S.safe = after;
          return len + lerp(24, 12, d);
        }
        function goldChunk(z0) {
          const g = nextSafe(4.5);
          spawnFrame(g.x, g.y, z0, null, true);
          S.safe = g;
          return 26;
        }
        function spawnChunk() {
          const d = clamp(S.run / CFG.difficulty.time + S.zone * CFG.difficulty.zone, 0, 1);
          const r = Math.random();
          if (S.state === "play" && S.run < 5) return pathChunk(CFG.spawnZ, d);
          // drying lines are the game: most stretches have one, nearly all of them late on
          if (r < 0.58 + 0.27 * d) return rowChunk(CFG.spawnZ, d);
          if (r > 0.93) return goldChunk(CFG.spawnZ);
          return pathChunk(CFG.spawnZ, d);
        }
        function clearWorld() {
          G.alive = false;
          gate.visible = false;
          frames.forEach((f) => { f.alive = false; f.mesh.visible = false; });
          rows.forEach((r) => { r.alive = false; r.g.visible = false; });
          S.safe = { x: 0, y: 0.6 };
        }

        // ---------- HUD ------------------------------------------------------------------
        const v3 = new THREE.Vector3();
        function pop(text, x, y, z, cls = "") {
          v3.set(x, y, z).project(camera);
          const el = document.createElement("span");
          el.className = `fl-pop ${cls}`;
          el.textContent = text;
          el.style.left = `${((v3.x + 1) / 2) * 100}%`;
          el.style.top = `${((1 - v3.y) / 2) * 100}%`;
          ui.pops.appendChild(el);
          gsap.fromTo(el, { yPercent: -50, y: 0, scale: 0.6, opacity: 0 }, { y: -26, scale: 1, opacity: 1, duration: 0.28, ease: "back.out(2.5)" });
          gsap.to(el, { y: -70, opacity: 0, duration: 0.5, delay: 0.45, ease: "power2.in", onComplete: () => el.remove() });
        }
        // one running total per burst of frames: "+60 +60 +60" becomes a single "+180"
        const tally = { el: null, sum: 0, t: -9, out: null };
        function popTally(pts, x, y, z, cls) {
          if (tally.el && S.t - tally.t < CFG.tally) {
            tally.sum += pts;
            tally.t = S.t;
            tally.el.textContent = `+${fmt(tally.sum)}`;
            if (cls) tally.el.classList.add(cls);
            gsap.fromTo(tally.el, { scale: 1.3 }, { scale: 1, duration: 0.3, ease: "back.out(3)", overwrite: "auto" });
            tally.out.restart(true);
            return;
          }
          v3.set(x, y, z).project(camera);
          const el = document.createElement("span");
          el.className = `fl-pop ${cls}`;
          el.textContent = `+${fmt(pts)}`;
          el.style.left = `${((v3.x + 1) / 2) * 100}%`;
          el.style.top = `${((1 - v3.y) / 2) * 100}%`;
          ui.pops.appendChild(el);
          gsap.fromTo(el, { yPercent: -50, y: 0, scale: 0.6, opacity: 0 }, { y: -26, scale: 1, opacity: 1, duration: 0.28, ease: "back.out(2.5)" });
          tally.out = gsap.to(el, { y: -70, opacity: 0, duration: 0.5, delay: CFG.tally, ease: "power2.in", onComplete: () => { el.remove(); if (tally.el === el) tally.el = null; } });
          Object.assign(tally, { el, sum: pts, t: S.t });
        }
        function showCombo() {
          const per = CFG.combo.per;
          ui.combo.style.setProperty("--chain", S.combo >= CFG.maxCombo ? 1 : ((S.chain % per) / per).toFixed(3));
          ui.combo.textContent = `×${S.combo}`;
          ui.combo.classList.toggle("is-on", S.combo > 1 || S.chain > 0);
          if (S.combo > 1 && S.chain % CFG.combo.per === 0) gsap.fromTo(ui.combo, { scale: 1.5 }, { scale: 1, duration: 0.4, ease: "back.out(3)" });
        }
        function showLives() {
          ui.lives.innerHTML = Array.from({ length: CFG.lives }, (_, i) =>
            `<svg viewBox="0 0 24 24" class="${i < S.lives ? "" : "is-lost"}"><path d="M2 11 22 3l-6 18-4-7-10-3Z"/><path d="m12 14 10-11"/></svg>`).join("");
        }
        let captionTl = null;
        function caption(text) {
          captionTl?.kill();
          ui.caption.textContent = text;
          captionTl = gsap.timeline()
            .fromTo(ui.caption, { y: 12, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, ease: "power3.out" })
            .to(ui.caption, { opacity: 0, duration: 0.3, ease: "power2.in" }, "+=2.2");
        }
        function flash(color) {
          ui.flash.style.background = color;
          gsap.fromTo(ui.flash, { opacity: 0.55 }, { opacity: 0, duration: 0.5, ease: "power2.out" });
        }
        // a new zone: the light has turned; a banner, a bonus, a burst
        // a tap of feedback on phones that support it
        const buzz = (p) => { if (!reduced && root.classList.contains("is-full")) navigator.vibrate?.(p); };
        function checkpoint(i) {
          buzz([18, 40, 26]);
          flash("rgba(255,253,249,0.9)");
          S.zone = i;
          S.score += CFG.checkpoint;
          ui.zoneNo.textContent = `Zone ${i + 1} · Checkpoint +${CFG.checkpoint}`;
          ui.zoneName.textContent = zones[i].name;
          gsap.timeline()
            .fromTo(ui.zone, { y: -30, opacity: 0, scale: 0.9 }, { y: 0, opacity: 1, scale: 1, duration: 0.6, ease: "back.out(1.8)" })
            .to(ui.zone, { y: -16, opacity: 0, duration: 0.35, ease: "power2.in" }, "+=1.8");
          burst(P.x, P.y + 1.5, -6, 60, [palette[3], palette[4], palette[0]]);
        }
        function roll() {
          if (S.state !== "play" || S.rollCd > 0 || S.roll > 0) return;
          S.roll = CFG.roll.time;
          S.rollCd = CFG.roll.cooldown;
          S.rollDir = P.vx > 0.4 ? -1 : 1;
          buzz(12);
        }
        function setState(s) {
          S.state = s;
          root.dataset.state = s;
        }

        // ---------- fullscreen ------------------------------------------------------------
        const html = document.documentElement;
        function openScreen() {
          const r = root.getBoundingClientRect();
          root.classList.add("is-full");
          html.classList.add("is-flying");
          lenis.stop();
          gsap.fromTo(root,
            { left: r.left, top: r.top, width: r.width, height: r.height, borderRadius: 16 },
            { left: 0, top: 0, width: innerWidth, height: innerHeight, borderRadius: 0, duration: 0.85, ease: "hop", onUpdate: resize,
              onComplete: () => { gsap.set(root, { clearProps: "left,top,width,height,borderRadius" }); resize(); } });
        }
        function closeScreen(done) {
          const r = slot.getBoundingClientRect();
          gsap.fromTo(root,
            { left: 0, top: 0, width: innerWidth, height: innerHeight, borderRadius: 0 },
            { left: r.left, top: r.top, width: r.width, height: r.height, borderRadius: 16, duration: 0.7, ease: "hop", onUpdate: resize,
              onComplete: () => {
                root.classList.remove("is-full");
                html.classList.remove("is-flying");
                gsap.set(root, { clearProps: "left,top,width,height,borderRadius" });
                lenis.start();
                resize();
                done?.();
              } });
        }

        // ---------- game flow --------------------------------------------------------------
        function resetRun() {
          gsap.killTweensOf(P); // a crash still tumbling must not finish into a game over
          gsap.killTweensOf(S);
          clearWorld();
          Object.assign(S, { run: 0, speed: CFG.speed.start, speedMul: 1, dist: 0, score: 0, shown: -1, combo: 1, chain: 0, bestCombo: 1, frames: 0,
            lives: CFG.lives, invuln: 0, boost: 0, spawnIn: 34, passed: new Set(), seen: { rows: 0, lures: 0 }, roll: 0, rollCd: 0, slow: 0, ts: 1, punch: 0, zone: 0 });
          lightAt = -1;
          P.tumble = 0;
          plane.visible = true;
          showLives();
          showCombo();
          ui.score.textContent = "0";
          trails.forEach((t) => t.reset());
        }
        function countdown() {
          setState("count");
          const tl = gsap.timeline({ onComplete: () => setState("play") });
          ["3", "2", "1", "Fly!"].forEach((n, i) => {
            tl.add(() => (ui.count.textContent = n), i * 0.6)
              .fromTo(ui.count, { scale: 1.6, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.3, ease: "back.out(2)" }, i * 0.6)
              .to(ui.count, { opacity: 0, scale: 0.85, duration: 0.2, ease: "power2.in" }, i * 0.6 + 0.4);
          });
        }
        function start() {
          if (S.state !== "attract") return;
          resetRun();
          input.x = P.x; input.y = P.y;
          openScreen();
          gsap.delayedCall(0.5, countdown);
          root.focus({ preventScroll: true });
        }
        function again() {
          gsap.to(ui.over, { opacity: 0, duration: 0.2, onComplete: () => { ui.over.style.opacity = ""; resetRun(); countdown(); } });
        }
        function quit(then) {
          if (!root.classList.contains("is-full")) return;
          gsap.killTweensOf(ui.count);
          setState("attract");
          resetRun();
          closeScreen(then);
        }
        function hit(sheet) {
          if (S.invuln > 0 || S.state !== "play") return;
          buzz(70);
          S.lives--;
          S.combo = 1;
          S.chain = 0;
          showCombo();
          showLives();
          S.invuln = CFG.invuln;
          S.shake = reduced ? 0 : 0.7;
          flash("rgba(255,122,89,0.9)");
          burst(P.x, P.y, 0, 26, [palette[0], palette[4], palette[5]]);
          if (sheet) gsap.to(sheet.rotation, { x: -1.4, y: rand(-0.6, 0.6), duration: 0.5, ease: "power2.out" });
          if (S.lives <= 0) crash();
        }
        function crash() {
          setState("crash");
          gsap.to(S, { speedMul: 0.15, duration: 1.4, ease: "power2.out" });
          gsap.to(P, { tumble: 1, duration: 1.4, ease: "power2.in", onComplete: gameOver });
        }
        function gameOver() {
          setState("over");
          const fresh = S.score > best;
          const before = best;
          if (fresh) {
            best = S.score;
            try { localStorage.setItem(CFG.bestKey, String(Math.floor(best))); } catch {}
            showBest();
          }
          // planes this run opened up in the hangar
          const opened = SKINS.filter((s) => s.need > before && s.need <= best);
          ui.unlock.hidden = !opened.length;
          if (opened.length) ui.unlock.textContent = `New plane unlocked: ${opened.map((s) => s.name).join(" & ")} — pick it in the hangar`;
          renderHangar();
          ui.overKicker.textContent = `Crash landing · ${zones[S.zone].name}`;
          ui.share.querySelector("span").textContent = "Share score";
          ui.newBest.hidden = !fresh;
          ui.sFrames.textContent = fmt(S.frames);
          ui.sDist.textContent = `${fmt(S.dist)} m`;
          ui.sCombo.textContent = `×${S.bestCombo}`;
          ui.sProj.textContent = `${S.passed.size} / ${projects.length}`;
          const n = { v: 0 };
          gsap.timeline()
            .fromTo(".fl-card", { y: 40, scale: 0.94, opacity: 0 }, { y: 0, scale: 1, opacity: 1, duration: 0.6, ease: "back.out(1.6)" })
            .to(n, { v: S.score, duration: 1.1, ease: "power2.out", onUpdate: () => (ui.final.textContent = fmt(n.v)) }, 0.2)
            .fromTo(".fl-stats > div", { y: 12, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, stagger: 0.06, ease: "power3.out" }, 0.35)
            .fromTo(ui.newBest, { scale: 0, rotation: -12 }, { scale: 1, rotation: -4, duration: 0.5, ease: "back.out(3)" }, 1.1);
          if (fresh) gsap.delayedCall(1.1, () => burst(P.x, 0.6, -2, 90, palette));
          ui.again.focus({ preventScroll: true });
        }
        function pause(on) {
          if (on && (S.state === "play" || S.state === "count")) { S.resumeTo = S.state; setState("paused"); }
          else if (!on && S.state === "paused") setState(S.resumeTo);
        }

        ui.start.addEventListener("click", start);
        ui.again.addEventListener("click", again);
        ui.close.addEventListener("click", () => quit());
        ui.hire.addEventListener("click", () => quit(() => lenis.scrollTo("#contact", { offset: -40, duration: 1.4 })));
        ui.resume.addEventListener("click", () => pause(false));
        // share: the native sheet on phones, the clipboard elsewhere
        ui.share.addEventListener("click", async () => {
          const url = `${location.origin}${location.pathname}#play`;
          const text = `I flew ${fmt(S.score)} points through ${zones[S.zone].name} in Paper Flight on Michael Omale’s portfolio. Beat that →`;
          const label = ui.share.querySelector("span");
          try {
            if (navigator.share) await navigator.share({ title: "Paper Flight", text, url });
            else { await navigator.clipboard.writeText(`${text} ${url}`); label.textContent = "Copied — paste it anywhere"; }
          } catch { /* the visitor closed the share sheet */ }
        });
        document.addEventListener("visibilitychange", () => document.hidden && pause(true));

        // ---------- input ------------------------------------------------------------------
        const steer = (e) => {
          if (!root.classList.contains("is-full")) return;
          const r = root.getBoundingClientRect();
          const nx = ((e.clientX - r.left) / r.width) * 2 - 1;
          const ny = (e.clientY - r.top) / r.height;
          input.x = nx * B.x * 1.12;
          input.y = lerp(B.yMax + 0.4, B.yMin - 0.4, ny);
        };
        root.addEventListener("pointermove", steer);
        root.addEventListener("pointerdown", (e) => {
          steer(e);
          // double-tap (or double-click) to barrel roll
          if (e.timeStamp - S.lastTap < 300) roll();
          S.lastTap = e.timeStamp;
        });
        const keys = { ArrowLeft: [-1, 0], KeyA: [-1, 0], ArrowRight: [1, 0], KeyD: [1, 0], ArrowUp: [0, 1], KeyW: [0, 1], ArrowDown: [0, -1], KeyS: [0, -1] };
        const held = new Set();
        window.addEventListener("keydown", (e) => {
          const full = root.classList.contains("is-full");
          if (!full) {
            if ((e.key === "Enter" || e.key === " ") && document.activeElement === root) { e.preventDefault(); start(); }
            return;
          }
          if (e.key === "Escape") { e.preventDefault(); quit(); return; }
          if (e.key === "p" || e.key === "P") { pause(S.state !== "paused"); return; }
          if ((e.key === "Enter" || e.key === " ") && S.state === "over") { e.preventDefault(); again(); return; }
          if (e.key === " " || e.key === "Shift") { e.preventDefault(); roll(); return; }
          if (keys[e.code]) { e.preventDefault(); held.add(e.code); }
        });
        window.addEventListener("keyup", (e) => held.delete(e.code));

        // ---------- the frame ------------------------------------------------------------------
        const camGoal = new THREE.Vector3();
        tickers.push((t, dtRaw) => {
          const full = root.classList.contains("is-full");
          if (!full && !visible) return;
          if (S.state === "paused") return;
          const dt = Math.min(dtRaw, 1 / 30);
          S.t += dt;

          const playing = S.state === "play";
          if (playing) S.run += dt;
          S.boost = Math.max(0, S.boost - dt);
          S.invuln = Math.max(0, S.invuln - dt);
          S.roll = Math.max(0, S.roll - dt);
          S.rollCd = Math.max(0, S.rollCd - dt);
          S.slow = Math.max(0, S.slow - dt);
          S.ts = lerp(S.ts, S.slow > 0 ? CFG.slow.scale : 1, 1 - Math.exp(-(S.slow > 0 ? 30 : 6) * dt));
          const base = playing || S.state === "crash" ? Math.min(CFG.speed.max, CFG.speed.start + CFG.speed.ramp * S.run) : CFG.speed.start;
          S.speed = lerp(S.speed, base * (S.boost > 0 ? CFG.speed.boost : 1), 1 - Math.exp(-3 * dt));
          const dz = S.speed * S.speedMul * dt * S.ts;
          if (playing) {
            S.dist += dz;
            S.score += dz * CFG.points.perUnit * (S.boost > 0 ? 2 : 1);
            const next = zones[S.zone + 1];
            if (next && S.dist >= next.at) checkpoint(S.zone + 1);
          } else if (S.state === "attract") S.amb += dz;
          // the light follows distance flown; in attract it swings slowly through the whole day and back
          light(S.state === "attract" ? (1 - Math.cos(S.amb / 1400)) * 0.5 * (zones[zones.length - 1].at + CFG.zoneBlend) : S.dist);

          // the floor runs under us
          matTex.offset.y = (matTex.offset.y + dz / 5) % 1;

          // ----- steering
          let tx, ty;
          if (S.state === "attract" || S.autoplay) {
            // autopilot: aim for the nearest frame ahead, else drift
            // a drying line close ahead wins: fly for its gap, whatever the frames say
            let goal = null, wall = null;
            for (const r of rows) if (r.alive && r.z < -1 && r.z > -26 && (!wall || r.z > wall.z)) wall = r;
            for (const f of frames) if (f.alive && !f.taken && !f.risk && f.z < -2 && (!goal || f.z > goal.z)) goal = f;
            // (DR.debug.flight.autoplay("greedy") chases frames only — to test the lures)
            if (wall && S.autoplay !== "greedy") { S.auto.x = wall.gapX + wall.offset; S.auto.y = wall.gapY; }
            else if (goal) { S.auto.x = goal.x + (goal.row ? goal.row.offset : 0); S.auto.y = goal.y; }
            else { S.auto.x = Math.sin(S.t * 0.5) * B.x * 0.5; S.auto.y = 0.6 + Math.sin(S.t * 0.8) * 1.2; }
            tx = S.auto.x; ty = S.auto.y;
          } else {
            let kx = 0, ky = 0;
            held.forEach((c) => { kx += keys[c][0]; ky += keys[c][1]; });
            if (kx || ky) { input.x += kx * 10 * dt; input.y += ky * 8 * dt; }
            input.x = clamp(input.x, -B.x, B.x);
            input.y = clamp(input.y, B.yMin, B.yMax);
            tx = input.x; ty = input.y;
          }
          tx = clamp(tx, -B.x, B.x);
          ty = clamp(ty, B.yMin, B.yMax);
          const k = 1 - Math.exp(-(S.state === "attract" ? 3.2 : 7) * dt);
          const nx = P.x + (tx - P.x) * k, ny = P.y + (ty - P.y) * k;
          P.vx = lerp(P.vx, (nx - P.x) / dt, 0.3);
          P.vy = lerp(P.vy, (ny - P.y) / dt, 0.3);
          P.x = nx; P.y = ny;
          const fall = P.tumble * P.tumble * (P.y - CFG.floorY - 0.3);
          plane.position.set(P.x, P.y + Math.sin(S.t * 3.1) * 0.05 - fall, 0);
          const rp = S.roll > 0 ? 1 - S.roll / CFG.roll.time : 0;
          plane.rotation.z = clamp(-P.vx * 0.07, -0.95, 0.95) + P.tumble * 7 + S.rollDir * Math.PI * 2 * (rp * rp * (3 - 2 * rp));
          plane.rotation.x = clamp(P.vy * 0.05, -0.45, 0.45) - P.tumble * 0.8;
          plane.rotation.y = clamp(-P.vx * 0.02, -0.3, 0.3);
          plane.visible = S.invuln > 0 && playing ? Math.floor(S.t * 14) % 2 === 0 : true;

          const lift = clamp((plane.position.y - CFG.floorY) / 7, 0, 1);
          shadow.position.x = P.x;
          shadow.scale.setScalar(1 + lift * 0.8);
          shadow.material.opacity = 0.9 - lift * 0.6;

          plane.updateMatrixWorld();
          trails.forEach((tr, i) => tr.update(plane.localToWorld(tipW.copy(tips[i])), S.boost > 0 ? 1 : 0.6));

          // ----- frames
          for (const f of frames) {
            if (!f.alive) continue;
            const z0 = f.z;
            f.z += dz;
            const fx = f.x + (f.row ? f.row.offset : 0);
            f.mesh.position.set(fx, f.y + Math.sin(S.t * 2 + f.ph) * 0.08, f.z);
            if (!f.taken) {
              f.mesh.rotation.z = Math.sin(S.t * 1.3 + f.ph) * 0.06 + (f.gold ? S.t * 0.8 : 0);
              f.mesh.material.opacity = f.z > CFG.fade.from ? Math.max(CFG.fade.min, f.z / CFG.fade.from) : 1;
            }
            if (z0 < 0 && f.z >= 0 && !f.taken) {
              const inside = Math.abs(P.x - fx) < CFG.frameWindow.w * f.s && Math.abs(P.y - f.y) < CFG.frameWindow.h * f.s;
              if (inside && (playing || S.state === "attract")) collect(f, fx);
              // missing a frame breaks the chain; passing up a risky one is a fair choice
              else if (playing && !f.gold && !f.risk) { S.combo = 1; S.chain = 0; showCombo(); }
            }
            if (f.z > 0.3 && !f.taken) { f.alive = false; f.mesh.visible = false; } // gone the moment it's behind the plane
          }

          // ----- rows
          for (const r of rows) {
            if (!r.alive) continue;
            const z0 = r.z;
            r.z += dz;
            r.offset = r.swing ? Math.sin(S.t * 1.25 + r.ph) * r.swing : 0;
            r.g.position.set(r.offset, r.yL, r.z);
            r.sheets.forEach((s, i) => { if (s.visible && !s.userData.hit) s.rotation.x = Math.sin(S.t * 2.2 + i * 0.7 + r.ph) * 0.07; });
            if (z0 < 0 && r.z >= 0 && playing) collide(r);
            if (r.z > 2.5) { r.alive = false; r.g.visible = false; } // never sweep across the lens
          }

          // ----- billboards: the real work, hanging in the haze
          S.boardIn -= dz;
          if (S.boardIn <= 0) {
            const b = boards.find((o) => !o.alive);
            if (b) {
              const side = S.boardIdx % 2 ? 1 : -1;
              Object.assign(b, { alive: true, z: CFG.spawnZ, idx: S.boardIdx % projects.length, side, told: false });
              b.m.position.set(side * (7.2 + 3.2 * W), rand(1.6, 2.6), b.z);
              b.m.rotation.set(0, -side * 0.5, side * rand(0.01, 0.03));
              b.m.scale.setScalar(1.25);
              dress(b);
              b.m.visible = true;
              S.boardIdx++;
            }
            S.boardIn = CFG.billboardEvery;
          }
          for (const b of boards) {
            if (!b.alive) continue;
            b.z += dz;
            b.m.position.z = b.z;
            if (!b.told && b.z > -22) {
              b.told = true;
              const p = projects[b.idx];
              if (playing) S.passed.add(p.name);
              if (S.state !== "attract") caption(`Passing — ${p.name} · ${p.kind}`);
            }
            if (b.z > 30) { b.alive = false; b.m.visible = false; }
          }

          // ----- the next checkpoint gate, timed to arrive as the zone begins
          if (playing && !G.alive) {
            const nz = zones[S.zone + 1];
            if (nz && nz.at - S.dist < -CFG.spawnZ) {
              Object.assign(G, { alive: true, z: -(nz.at - S.dist), zone: S.zone + 1 });
              gate.material.map = gateTexs[G.zone];
              gate.material.needsUpdate = true;
              gate.visible = true;
            }
          }
          if (G.alive) {
            G.z += dz;
            gate.position.set(0, GATE.y, G.z);
            if (G.z > 7) { G.alive = false; gate.visible = false; }
          }

          // ----- spawner
          if (S.state !== "count" && S.state !== "crash" && S.state !== "over") {
            S.spawnIn -= dz;
            if (S.spawnIn <= 0) S.spawnIn += spawnChunk();
          }

          // ----- the canyon, scraps and sparks
          for (let i = 0; i < MONOS; i++) {
            const m = monoData[i];
            m.z += dz;
            if (m.z > 22) seedMono(m, i, CFG.spawnZ - rand(0, 30));
            dummy.position.set(m.x, CFG.floorY, m.z);
            dummy.rotation.set(0, m.ry, m.rz);
            dummy.scale.set(m.w, m.h, m.d);
            dummy.updateMatrix();
            monos.setMatrixAt(i, dummy.matrix);
          }
          monos.instanceMatrix.needsUpdate = true;
          for (let i = 0; i < SCRAPS; i++) {
            const s = scrapData[i];
            s.z += dz * 0.92;
            if (s.z > 12) { s.z = CFG.spawnZ; s.x = rand(-18, 18); s.y = rand(-3.4, 9); }
            s.rx += s.spin * dt; s.ry += s.spin * 0.7 * dt;
            dummy.position.set(s.x + Math.sin(S.t * 0.6 + i) * 0.4, s.y + Math.sin(S.t * 0.9 + i * 1.7) * 0.3, s.z);
            dummy.rotation.set(s.rx, s.ry, 0);
            dummy.scale.setScalar(s.s);
            dummy.updateMatrix();
            scraps.setMatrixAt(i, dummy.matrix);
          }
          scraps.instanceMatrix.needsUpdate = true;
          for (let i = 0; i < SPARKS; i++) {
            const s = sparkData[i];
            if (s.life <= 0) { dummy.scale.setScalar(0); dummy.updateMatrix(); sparks.setMatrixAt(i, dummy.matrix); continue; }
            s.life -= dt;
            s.vy -= 9 * dt;
            s.x += s.vx * dt; s.y += s.vy * dt; s.z += s.vz * dt + dz;
            s.r += 8 * dt;
            dummy.position.set(s.x, s.y, s.z);
            dummy.rotation.set(s.r, s.r * 0.7, 0);
            dummy.scale.setScalar(Math.max(0, s.life) * 1.8);
            dummy.updateMatrix();
            sparks.setMatrixAt(i, dummy.matrix);
          }
          sparks.instanceMatrix.needsUpdate = true;

          // ----- camera: trails the plane, kicks wide on boost, shakes on a hit
          S.shake = Math.max(0, S.shake - dt * 1.6);
          const sh = S.shake * S.shake;
          camGoal.set(P.x * 0.55 + rand(-1, 1) * sh * 0.5, P.y * 0.4 + CFG.camera.height + rand(-1, 1) * sh * 0.4, CFG.camera.z);
          camera.position.lerp(camGoal, 1 - Math.exp(-4 * dt));
          camera.lookAt(P.x * 0.7, P.y * 0.55 + 0.3, -14);
          camera.rotateZ(clamp(-P.vx * 0.006, -0.08, 0.08));
          const speedK = clamp((S.speed - CFG.speed.start) / (CFG.speed.max - CFG.speed.start), 0, 1);
          S.punch = lerp(S.punch, 0, 1 - Math.exp(-5 * dt));
          const fovGoal = S.baseFov + (reduced ? 0 : speedK * 6 + (S.boost > 0 ? CFG.camera.boostFov : 0) + S.punch);
          if (Math.abs(fovGoal - S.fov) > 0.01) {
            S.fov = lerp(S.fov, fovGoal, 1 - Math.exp(-5 * dt));
            camera.fov = S.fov;
            camera.updateProjectionMatrix();
          }
          ui.boost.style.opacity = S.boost > 0 ? Math.min(1, S.boost) : 0;
          sky.position.copy(camera.position);
          if (playing) ui.roll.style.setProperty("--cd", (1 - S.rollCd / CFG.roll.cooldown).toFixed(3));
          ui.roll.classList.toggle("is-ready", S.rollCd === 0);

          // ----- HUD
          if (playing && Math.floor(S.score) !== S.shown) {
            S.shown = Math.floor(S.score);
            ui.score.textContent = fmt(S.score);
            ui.dist.textContent = `${fmt(S.dist)} m`;
          }

          renderer.render(scene, camera);
        });

        function collect(f, fx) {
          f.taken = true;
          // the frame snaps shut into its sparks rather than flying at the lens
          gsap.to(f.mesh.scale, { x: 0, y: 0, duration: 0.22, ease: "back.in(2)", onComplete: () => { f.alive = false; f.mesh.visible = false; } });
          gsap.to(f.mesh.rotation, { z: f.mesh.rotation.z + 1.2, duration: 0.22, ease: "power2.in" });
          burst(fx, f.y, f.z - 0.5, f.gold ? 40 : 18, f.gold ? [palette[4], palette[0]] : [palette[3], palette[0]]);
          if (S.state !== "play") return;
          const pts = (f.gold ? CFG.points.gold : CFG.points.frame) * (f.risk ? CFG.risk.points : 1) * S.combo * (S.boost > 0 ? 2 : 1);
          S.score += pts;
          buzz(f.gold ? 30 : f.risk ? 16 : 8);
          S.frames++;
          popTally(pts, fx, f.y + 0.9, f.z, f.gold ? "is-gold" : "");
          if (f.risk) pop("Risky ×2", fx, f.y + 1.5, f.z, "is-close");
          S.chain++;
          S.combo = Math.min(CFG.maxCombo, 1 + Math.floor(S.chain / CFG.combo.per));
          S.bestCombo = Math.max(S.bestCombo, S.combo);
          showCombo();
          gsap.fromTo(ui.score, { scale: 1.18 }, { scale: 1, duration: 0.35, ease: "back.out(3)" });
          if (f.gold) {
            S.boost = CFG.boostTime;
            flash("rgba(232,176,74,0.7)");
            caption("Boost — double points");
          }
        }
        function slowmo() {
          S.slow = CFG.slow.time;
          if (!reduced) S.punch = -7;
        }
        function collide(r) {
          const hw = CFG.hitbox.w, hh = CFG.hitbox.h;
          const px = P.x - r.offset, py = P.y;
          let struck = Math.abs(py - r.yL) < 0.1 + hh ? "line" : null;
          let near = Infinity;
          for (const s of r.sheets) {
            if (struck || !s.visible) continue;
            const dx = Math.abs(px - s.position.x) - (R.sheetW / 2 + hw);
            const dy = Math.max(py - hh - r.yL, r.yL - R.sheetH - (py + hh));
            if (dx < 0 && dy < 0) struck = s;
            else near = Math.min(near, Math.max(dx, dy));
          }
          if (struck && S.roll > 0) {
            // rolled clean through it
            if (struck !== "line") gsap.to(struck.rotation, { x: -1.1, duration: 0.45, ease: "power2.out" });
            S.score += CFG.roll.bonus;
            pop(`Barrel roll! +${CFG.roll.bonus}`, P.x, P.y + 1.9, -1, "is-roll");
            slowmo();
            return;
          }
          if (struck) {
            if (struck !== "line") struck.userData.hit = true;
            return hit(struck === "line" ? null : struck);
          }
          near = Math.min(near, Math.abs(py - r.yL) - 0.1 - hh);
          if (near < 0.45) {
            S.score += CFG.points.close;
            pop(`Close call +${CFG.points.close}`, P.x, P.y + 1.9, -1, "is-close");
            slowmo();
          }
        }

        DR.debug = Object.assign(DR.debug || {}, { flight: { S, P, start, quit, autoplay: (on = true) => (S.autoplay = on), gameOver: () => { S.lives = 1; hit(null); } } });
      }
    },
  };
})();
