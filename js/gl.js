/* ==========================================================================
   gl.js — a print developing in a white enamel tray.
   One canvas, the corpus's orthographic 1×1 plane rig (PATTERNS §7).
   GSAP drives the uniforms; the shader does the chemistry: the image comes
   up out of warm white paper — darks first, out of grain, as a warm tone
   that blooms into full colour — under clear water the pointer disturbs.
   ========================================================================== */
(() => {
  const DR = (window.DR = window.DR || {});
  const THREE_URL = "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.min.js";
  const RIPPLES = 6;

  const VERT = /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = vec4(position.xy * 2.0, 0.0, 1.0);
    }
  `;

  const FRAG = /* glsl */ `
    precision highp float;
    varying vec2 vUv;

    uniform sampler2D uTex;
    uniform vec2 uRes;
    uniform vec2 uImageRes;
    uniform float uMargin;
    uniform float uDevelop;
    uniform float uAgitate;
    uniform float uLift;
    uniform float uTime;
    uniform vec3 uRipples[${RIPPLES}];

    const vec3 PAPER = vec3(1.0, 0.992, 0.972);
    const vec3 WARM = vec3(1.0, 0.93, 0.84);

    float hash(vec2 p) {
      p = fract(p * vec2(123.34, 456.21));
      p += dot(p, p + 45.32);
      return fract(p.x * p.y);
    }

    float noise(vec2 p) {
      vec2 i = floor(p), f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
                 mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
    }

    // cover-fit, anchored to the top of the page (screenshots read top-down)
    vec2 coverUv(vec2 uv, vec2 box, vec2 img) {
      float rb = box.x / box.y, ri = img.x / img.y;
      vec2 s = rb > ri ? vec2(1.0, ri / rb) : vec2(rb / ri, 1.0);
      vec2 o = rb > ri ? vec2(0.5, 1.0 - s.y * 0.5) : vec2(0.5);
      return (uv - 0.5) * s + o;
    }

    void main() {
      float aspect = uRes.x / uRes.y;
      vec2 p = vec2(vUv.x * aspect, vUv.y);
      float t = uTime;
      float wet = 1.0 - uLift;

      // the water: layered sines (never value noise — a surface must not step)
      vec2 disp = vec2(
        sin(p.y * 7.0 + t * 1.2) + 0.6 * sin(p.x * 11.0 - p.y * 5.0 + t * 0.8) + 0.35 * sin(p.y * 23.0 + p.x * 3.0 - t * 1.7),
        cos(p.x * 6.0 - t * 0.9) + 0.6 * cos(p.y * 9.0 + p.x * 4.0 - t * 1.1) + 0.35 * cos(p.x * 19.0 - p.y * 6.0 + t * 1.5)
      ) * 0.0016;
      disp *= 0.35 + uAgitate * 2.4;

      float shine = 0.0;
      for (int i = 0; i < ${RIPPLES}; i++) {
        vec3 r = uRipples[i];
        float age = t - r.z;
        if (age < 0.0 || age > 3.5) continue;
        vec2 d = p - vec2(r.x * aspect, r.y);
        float dist = length(d);
        float k = dist - age * 0.3;
        float wave = sin(k * 70.0) * exp(-abs(k) * 15.0) * exp(-age * 1.25);
        disp += d / (dist + 1e-4) * wave * 0.0095;
        shine += wave;
      }
      disp *= wet;
      vec2 uv = vUv + disp;

      // paper border + image area (antialiased: the water tilts this edge)
      vec2 m = vec2(uMargin) / uRes;
      vec2 inner = (uv - m) / (1.0 - 2.0 * m);
      vec2 aa = 1.25 / (uRes * (1.0 - 2.0 * m));
      vec2 inside = smoothstep(vec2(0.0), aa, inner) * smoothstep(vec2(0.0), aa, 1.0 - inner);
      float inImg = inside.x * inside.y;
      vec2 iuv = clamp(coverUv(inner, uRes * (1.0 - 2.0 * m), uImageRes), 0.001, 0.999);

      vec3 tex = texture2D(uTex, iuv).rgb;
      float lum = dot(tex, vec3(0.299, 0.587, 0.114));
      float dens = (1.0 - lum) * inImg;

      // development: darks arrive first, out of grain
      float g = hash(floor(vUv * uRes / 1.25));
      float dt = uDevelop * 1.35 - (1.0 - dens) * 0.6 - g * 0.3;
      float k = smoothstep(0.0, 0.45, dt) * inImg;
      // ...as a warm monochrome that blooms into colour
      float bloom = smoothstep(0.35, 1.0, uDevelop);
      vec3 tone = mix(vec3(lum) * WARM, tex, bloom);

      vec3 paper = PAPER * (0.985 + noise(vUv * uRes / 220.0) * 0.015);
      vec3 col = mix(paper, tone, k);

      // clear water: a faint cool cast, and window light glinting off ripples
      float spec = smoothstep(0.62, 1.0, noise(p * 5.0 + disp * 140.0 + t * 0.1)) * 0.05;
      col = mix(col, col * vec3(0.975, 0.985, 1.0), wet);
      col += (spec + max(shine, 0.0) * 0.06) * wet;

      // a breath of grain, the paper's own tooth
      col += (hash(vUv * uRes + fract(t) * 91.0) - 0.5) * 0.018;

      gl_FragColor = vec4(col, 1.0);
    }
  `;

  const defaults = () => ({
    uDevelop: { value: 0 },
    uAgitate: { value: 0.15 },
    uLift: { value: 0 },
    uTime: { value: 0 },
  });

  const sizeOf = (src) => [src.naturalWidth || src.width, src.naturalHeight || src.height];

  // pointer → ripples, throttled so a sweep leaves a trail rather than a smear
  function watchPointer(el, print) {
    let last = 0, lx = -1, ly = -1;
    el.addEventListener("pointermove", (e) => {
      const now = performance.now();
      if (now - last < 70) return;
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width;
      const y = 1 - (e.clientY - r.top) / r.height;
      if (Math.hypot(x - lx, y - ly) < 0.025) return;
      last = now; lx = x; ly = y;
      print.ripple(x, y);
    });
  }

  class PrintGL {
    constructor(THREE, el, { margin = () => 0 } = {}) {
      this.THREE = THREE;
      this.el = el;
      this.margin = margin;
      this.cache = new Map();
      this.time = 0;
      this.ri = 0;
      this.visible = true;

      const renderer = (this.renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, powerPreference: "high-performance" }));
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
      el.appendChild(renderer.domElement);

      this.scene = new THREE.Scene();
      this.camera = new THREE.OrthographicCamera(-0.5, 0.5, 0.5, -0.5, 0.01, 10);
      this.camera.position.z = 1;

      this.u = Object.assign(defaults(), {
        uTex: { value: null },
        uRes: { value: new THREE.Vector2(1, 1) },
        uImageRes: { value: new THREE.Vector2(1, 1) },
        uMargin: { value: 0 },
        uRipples: { value: Array.from({ length: RIPPLES }, () => new THREE.Vector3(0, 0, -100)) },
      });

      const material = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms: this.u });
      this.scene.add(new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material));

      new ResizeObserver(() => this.resize()).observe(el);
      new IntersectionObserver(([e]) => (this.visible = e.isIntersecting), { rootMargin: "120px" }).observe(el);
      watchPointer(el, this);
      this.resize();
    }

    use(src) {
      let tex = this.cache.get(src);
      if (!tex) {
        const T = this.THREE;
        tex = new T.Texture(src);
        tex.colorSpace = T.NoColorSpace;
        tex.minFilter = tex.magFilter = T.LinearFilter;
        tex.wrapS = tex.wrapT = T.ClampToEdgeWrapping;
        tex.generateMipmaps = false;
        tex.needsUpdate = true;
        this.cache.set(src, tex);
      }
      this.u.uTex.value = tex;
      this.u.uImageRes.value.set(...sizeOf(src));
    }

    ripple(x, y) {
      this.u.uRipples.value[this.ri].set(x, y, this.time);
      this.ri = (this.ri + 1) % RIPPLES;
    }

    resize() {
      const w = this.el.clientWidth, h = this.el.clientHeight;
      if (!w || !h) return;
      this.renderer.setSize(w, h, false);
      this.u.uRes.value.set(w, h);
      this.u.uMargin.value = this.margin(w, h);
    }

    render(t) {
      this.time = t;
      this.u.uTime.value = t;
      if (this.visible && this.u.uTex.value) this.renderer.render(this.scene, this.camera);
    }
  }

  // No WebGL, or opened from file:// (local images can't become textures there):
  // the same interface, done with CSS.
  class FlatPrint {
    constructor(el) {
      this.el = el;
      this.u = defaults();
      this.img = null;
    }
    use(src) {
      if (this.img) this.img.remove();
      const img = src.cloneNode ? src.cloneNode() : src;
      img.classList.add("flat");
      img.alt = "";
      this.el.appendChild(img);
      this.img = img;
    }
    ripple() {}
    render() {
      this.el.style.setProperty("--dev", this.u.uDevelop.value.toFixed(3));
    }
  }

  let threeP = null;
  // three.js itself, wherever the page runs; a failed fetch is forgotten so a retry can try again
  DR.importThree = () => {
    if (!threeP) {
      const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error("three.js timed out")), 15000));
      threeP = Promise.race([import(THREE_URL), timeout]).catch(() => null).then((m) => {
        if (!m) threeP = null;
        return m;
      });
    }
    return threeP;
  };
  // the hero tray skips WebGL on file://, where local images can't become textures
  DR.loadThree = () => (location.protocol === "file:" ? Promise.resolve(null) : DR.importThree());

  DR.makePrint = (THREE, el, opts) => {
    if (THREE) {
      try { return new PrintGL(THREE, el, opts); } catch (err) { console.warn("[portfolio] WebGL unavailable, using flat prints", err); }
    }
    return new FlatPrint(el);
  };
})();
