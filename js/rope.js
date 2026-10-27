/* ==========================================================================
   rope.js — the drying line.
   Verlet rope (one-sided constraints, so it can go slack), pinned at the
   walls. Each print is a pendulum hung from one rope point: it reads that
   point's acceleration, so a scroll kick or a pull makes it swing.
   ========================================================================== */
(() => {
  const DR = (window.DR = window.DR || {});

  const CFG = {
    points: 30,
    gravity: 2400,
    damping: 0.986,
    iterations: 14,
    slack: 1.008,
    weight: 2.0,      // extra gravity at the points that carry a print
    swingDamp: 2.4,
    maxSwing: 0.75,
    inertia: 0.7,     // how much the pivot's acceleration throws the print
    anchorY: 54,
    rowGap: 130,
    step: 1 / 120,
  };

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  class DryingLine {
    constructor(stage) {
      this.stage = stage;
      this.canvas = stage.querySelector(".line-canvas");
      this.ctx = this.canvas.getContext("2d");
      this.cards = [...stage.querySelectorAll(".hang")];
      this.ropes = [];
      this.hangs = [];
      this.grab = null;
      this.acc = 0;
      this.active = false;
      this.color = "#ccc";
      this.bind();
      this.layout();
      new IntersectionObserver(([e]) => (this.active = e.isIntersecting), { rootMargin: "200px" }).observe(stage);
    }

    layout() {
      const W = this.stage.clientWidth;
      const cw = this.cards[0].offsetWidth;
      const ch = Math.max(...this.cards.map((c) => c.offsetHeight));
      const narrow = W < 700;
      const gap = narrow ? 14 : Math.max(36, W * 0.035);
      const per = clamp(Math.floor((W - 24 + gap) / (cw + gap)), 1, this.cards.length);
      const rows = Math.ceil(this.cards.length / per);
      const rowH = ch + (narrow ? 84 : CFG.rowGap);
      const H = rows * rowH + CFG.anchorY + 30;

      this.stage.style.height = `${H}px`;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      this.canvas.width = Math.round(W * dpr);
      this.canvas.height = Math.round(H * dpr);
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.W = W;
      this.H = H;

      this.ropes = [];
      this.hangs = [];
      const n = CFG.points;
      for (let r = 0; r < rows; r++) {
        const y = CFG.anchorY + r * rowH;
        const x0 = -24, span = W + 48;
        const pts = Array.from({ length: n }, (_, i) => {
          const x = x0 + (span * i) / (n - 1);
          return { x, y, px: x, py: y, pin: i === 0 || i === n - 1, held: false, w: 1 };
        });
        const rope = { pts, rest: (span / (n - 1)) * CFG.slack };
        this.ropes.push(rope);

        const row = this.cards.slice(r * per, r * per + per);
        row.forEach((card, j) => {
          const cx = W / 2 + (j - (row.length - 1) / 2) * (cw + gap);
          const idx = clamp(Math.round(((cx - x0) / span) * (n - 1)), 1, n - 2);
          pts[idx].w = CFG.weight;
          const p = pts[idx];
          this.hangs.push({
            card, rope, idx,
            theta: 0, omega: 0,
            vx: 0, vy: 0, lastX: p.x, lastY: p.y,
            L: ch * 0.55, w: cw,
            lean: (j % 2 ? 1 : -1) * (0.012 + ((r * 7 + j * 3) % 5) * 0.004),
          });
        });
      }

      // let it settle before anyone sees it
      for (let i = 0; i < 360; i++) this.step(CFG.step);
      this.hangs.forEach((h) => { h.omega = 0; h.theta = 0; h.vx = h.vy = 0; });
      this.draw();
    }

    bind() {
      const local = (e) => {
        const r = this.stage.getBoundingClientRect();
        return [e.clientX - r.left, e.clientY - r.top];
      };

      this.cards.forEach((card) => {
        card.addEventListener("pointerdown", (e) => {
          if (e.button) return;
          const h = this.hangs.find((x) => x.card === card);
          if (!h) return;
          const p = h.rope.pts[h.idx];
          const [x, y] = local(e);
          this.grab = { h, ox: p.x - x, oy: p.y - y, tx: p.x, ty: p.y };
          p.held = true;
          card.setPointerCapture?.(e.pointerId);
          card.classList.add("is-held");
          DR.onGrab?.(true);
        });
      });

      window.addEventListener("pointermove", (e) => {
        if (!this.grab) return;
        const [x, y] = local(e);
        const g = this.grab;
        g.tx = clamp(x + g.ox, 10, this.W - 10);
        g.ty = clamp(y + g.oy, 0, this.H - 40);
      });

      const release = () => {
        if (!this.grab) return;
        const { h } = this.grab;
        h.rope.pts[h.idx].held = false;
        h.card.classList.remove("is-held");
        this.grab = null;
        DR.onGrab?.(false);
      };
      window.addEventListener("pointerup", release);
      window.addEventListener("pointercancel", release);
    }

    // scroll acceleration → the line lags behind the page, then springs back
    kick(dv) {
      if (!this.active || !dv) return;
      const k = clamp(dv, -40, 40) * 0.5;
      this.ropes.forEach(({ pts }) => {
        const n = pts.length;
        pts.forEach((p, i) => {
          if (p.pin || p.held) return;
          p.py -= k * Math.sin((i / (n - 1)) * Math.PI);
        });
      });
    }

    step(dt) {
      const gdt = CFG.gravity * dt * dt;

      if (this.grab) {
        const { h, tx, ty } = this.grab;
        const p = h.rope.pts[h.idx];
        p.px = p.x;
        p.py = p.y;
        p.x += (tx - p.x) * 0.35;
        p.y += (ty - p.y) * 0.35;
      }

      for (const rope of this.ropes) {
        const pts = rope.pts;
        for (const p of pts) {
          if (p.pin || p.held) continue;
          const vx = (p.x - p.px) * CFG.damping;
          const vy = (p.y - p.py) * CFG.damping;
          p.px = p.x;
          p.py = p.y;
          p.x += vx;
          p.y += vy + gdt * p.w;
        }
        for (let it = 0; it < CFG.iterations; it++) {
          for (let i = 0; i < pts.length - 1; i++) {
            const a = pts[i], b = pts[i + 1];
            const dx = b.x - a.x, dy = b.y - a.y;
            const d = Math.hypot(dx, dy) || 1e-4;
            if (d <= rope.rest) continue; // string goes slack, never pushes
            const ma = a.pin || a.held ? 0 : 1 / a.w;
            const mb = b.pin || b.held ? 0 : 1 / b.w;
            const tot = ma + mb;
            if (!tot) continue;
            const diff = (d - rope.rest) / d;
            a.x += dx * diff * (ma / tot);
            a.y += dy * diff * (ma / tot);
            b.x -= dx * diff * (mb / tot);
            b.y -= dy * diff * (mb / tot);
          }
        }
      }

      for (const h of this.hangs) {
        const p = h.rope.pts[h.idx];
        const vx = (p.x - h.lastX) / dt, vy = (p.y - h.lastY) / dt;
        const ax = clamp((vx - h.vx) / dt, -30000, 30000);
        const ay = clamp((vy - h.vy) / dt, -30000, 30000);
        h.vx = vx; h.vy = vy; h.lastX = p.x; h.lastY = p.y;
        // CSS rotate(+θ) swings the bottom left, hence the sign on ax
        const geff = Math.max(200, CFG.gravity - ay);
        const alpha = -(geff / h.L) * Math.sin(h.theta) + (CFG.inertia * ax / h.L) * Math.cos(h.theta) - CFG.swingDamp * h.omega;
        h.omega += alpha * dt;
        h.theta = clamp(h.theta + h.omega * dt, -CFG.maxSwing, CFG.maxSwing);
      }
    }

    draw() {
      const ctx = this.ctx;
      ctx.clearRect(0, 0, this.W, this.H);
      ctx.strokeStyle = this.color;
      ctx.lineWidth = 1.4;
      for (const { pts } of this.ropes) {
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length - 1; i++) {
          const mx = (pts[i].x + pts[i + 1].x) / 2, my = (pts[i].y + pts[i + 1].y) / 2;
          ctx.quadraticCurveTo(pts[i].x, pts[i].y, mx, my);
        }
        const last = pts[pts.length - 1];
        ctx.lineTo(last.x, last.y);
        ctx.stroke();
      }
      for (const h of this.hangs) {
        const pts = h.rope.pts, p = pts[h.idx];
        const a = pts[h.idx - 1], b = pts[h.idx + 1];
        const tangent = Math.atan2(b.y - a.y, b.x - a.x);
        const angle = h.theta + h.lean + tangent * 0.4;
        h.card.style.transform = `translate3d(${(p.x - h.w / 2).toFixed(2)}px, ${p.y.toFixed(2)}px, 0) rotate(${angle.toFixed(4)}rad)`;
      }
    }

    update(dt) {
      if (!this.active && !this.grab) return;
      this.acc = Math.min(this.acc + dt, 0.1);
      while (this.acc >= CFG.step) {
        this.step(CFG.step);
        this.acc -= CFG.step;
      }
      this.draw();
    }

    setColor(c) {
      this.color = c;
      this.draw();
    }
  }

  DR.DryingLine = DryingLine;
})();
