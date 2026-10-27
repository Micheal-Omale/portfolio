/* ==========================================================================
   art.js — the few things painted rather than photographed: the early
   black-and-white prints on the drying line, the paper grain, and the
   displacement map behind the contact-sheet loupe.
   ========================================================================== */
(() => {
  const DR = (window.DR = window.DR || {});
  const TAU = Math.PI * 2;
  const SERIF = '"Instrument Serif", Georgia, serif';

  // ---------- helpers ----------------------------------------------------

  function rng(seed) {
    let s = (Math.imul(seed + 1, 2654435761) >>> 0) || 1;
    return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296;
  }

  function canvas(w, h) {
    const c = document.createElement("canvas");
    c.width = Math.round(w);
    c.height = Math.round(h);
    return [c, c.getContext("2d")];
  }

  const g = (v, a = 1) => {
    const n = Math.round(Math.max(0, Math.min(1, v)) * 255);
    return `rgba(${n},${n},${n},${a})`;
  };

  function linear(ctx, x0, y0, x1, y1, stops) {
    const gr = ctx.createLinearGradient(x0, y0, x1, y1);
    stops.forEach(([o, c]) => gr.addColorStop(o, c));
    return gr;
  }

  function glow(ctx, x, y, r, v = 1, a = 0.6) {
    const gr = ctx.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, g(v, a));
    gr.addColorStop(1, g(v, 0));
    ctx.fillStyle = gr;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }

  function vignette(ctx, x, y, w, h, amt = 0.55) {
    const cx = x + w / 2, cy = y + h / 2;
    const gr = ctx.createRadialGradient(cx, cy, Math.min(w, h) * 0.25, cx, cy, Math.hypot(w, h) * 0.62);
    gr.addColorStop(0, "rgba(0,0,0,0)");
    gr.addColorStop(1, `rgba(0,0,0,${amt})`);
    ctx.fillStyle = gr;
    ctx.fillRect(x, y, w, h);
  }

  function text(ctx, str, x, y, font, fill, align = "left", spacing = 0) {
    ctx.font = font;
    ctx.fillStyle = fill;
    ctx.textAlign = align;
    ctx.textBaseline = "alphabetic";
    if ("letterSpacing" in ctx) ctx.letterSpacing = `${spacing}px`;
    ctx.fillText(str, x, y);
    if ("letterSpacing" in ctx) ctx.letterSpacing = "0px";
  }

  // ---------- small "photographs" for frames + cards ----------------------

  function motif(seed, w, h, glyph = "") {
    const [c, ctx] = canvas(w, h);
    const rand = rng(seed * 97 + 13);
    const type = seed % 8;
    const base = 0.12 + rand() * 0.2;
    ctx.fillStyle = linear(ctx, 0, 0, w * rand(), h, [[0, g(base + 0.25)], [1, g(base * 0.4)]]);
    ctx.fillRect(0, 0, w, h);

    switch (type) {
      case 0: { // sun through haze
        const x = w * (0.3 + rand() * 0.4), y = h * (0.3 + rand() * 0.3);
        glow(ctx, x, y, w * 0.8, 1, 0.5);
        for (let i = 1; i < 7; i++) {
          ctx.strokeStyle = g(1, 0.12);
          ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.arc(x, y, i * h * 0.09, 0, TAU); ctx.stroke();
        }
        glow(ctx, x, y, h * 0.12, 1, 1);
        break;
      }
      case 1: { // light through blinds
        ctx.save();
        ctx.translate(w / 2, h / 2);
        ctx.rotate(-0.5 + rand() * 0.3);
        ctx.filter = `blur(${Math.round(w * 0.006)}px)`;
        for (let i = -12; i < 12; i++) {
          ctx.fillStyle = g(0.95, 0.5);
          ctx.fillRect(-w, i * h * 0.12, w * 2, h * 0.05);
        }
        ctx.restore();
        ctx.filter = "none";
        break;
      }
      case 2: { // horizon
        const hy = h * (0.55 + rand() * 0.15);
        ctx.fillStyle = linear(ctx, 0, 0, 0, hy, [[0, g(0.3)], [1, g(0.85)]]);
        ctx.fillRect(0, 0, w, hy);
        glow(ctx, w * (0.3 + rand() * 0.4), hy, h * 0.3, 1, 0.9);
        ctx.fillStyle = g(0.06);
        ctx.fillRect(0, hy, w, h - hy);
        for (let i = 0; i < 18; i++) {
          ctx.fillStyle = g(0.9, 0.25 * (1 - i / 18));
          ctx.fillRect(w * 0.2 + rand() * w * 0.6, hy + 4 + i * 6, 20 + rand() * 80, 2);
        }
        break;
      }
      case 3: { // receding floor
        const vy = h * 0.32, vx = w * (0.3 + rand() * 0.4);
        ctx.strokeStyle = g(0.9, 0.45);
        ctx.lineWidth = 1.2;
        for (let i = -14; i <= 14; i++) { ctx.beginPath(); ctx.moveTo(vx, vy); ctx.lineTo(vx + i * w * 0.12, h); ctx.stroke(); }
        for (let i = 1; i < 12; i++) { const y = vy + (h - vy) * Math.pow(i / 11, 2.2); ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
        glow(ctx, vx, vy, w * 0.5, 1, 0.4);
        break;
      }
      case 4: { // dunes
        for (let i = 0; i < 9; i++) {
          const y0 = h * (0.25 + i * 0.09);
          ctx.fillStyle = g(0.25 + i * 0.08);
          ctx.beginPath();
          ctx.moveTo(0, h);
          for (let x = 0; x <= w; x += 8) ctx.lineTo(x, y0 + Math.sin(x * 0.012 + i * 1.3 + seed) * h * 0.05 + Math.sin(x * 0.031 + i) * h * 0.015);
          ctx.lineTo(w, h);
          ctx.closePath();
          ctx.fill();
        }
        break;
      }
      case 5: { // concrete blocks
        let x = -10;
        while (x < w) {
          const bw = w * (0.08 + rand() * 0.14), bh = h * (0.3 + rand() * 0.6);
          ctx.fillStyle = g(0.65 + rand() * 0.3);
          ctx.fillRect(x, h - bh, bw * 0.6, bh);
          ctx.fillStyle = g(0.15 + rand() * 0.15);
          ctx.fillRect(x + bw * 0.6, h - bh, bw * 0.4, bh);
          x += bw + 2;
        }
        break;
      }
      case 6: { // a drop on still water
        const x = w * (0.35 + rand() * 0.3), y = h * (0.4 + rand() * 0.2);
        for (let i = 12; i > 0; i--) {
          ctx.strokeStyle = g(i % 2 ? 0.9 : 0.1, 0.35 * (1 - i / 13));
          ctx.lineWidth = 3;
          ctx.beginPath(); ctx.ellipse(x, y, i * w * 0.045, i * h * 0.022, 0, 0, TAU); ctx.stroke();
        }
        glow(ctx, x, y, w * 0.15, 1, 0.5);
        break;
      }
      default: { // leaf shadows on a lit wall
        ctx.fillStyle = g(0.78);
        ctx.fillRect(0, 0, w, h);
        glow(ctx, w * 0.6, h * 0.3, w * 0.7, 1, 0.5);
        ctx.filter = `blur(${Math.round(w * 0.01)}px)`;
        for (let i = 0; i < 26; i++) {
          ctx.fillStyle = g(0.1, 0.5);
          ctx.beginPath();
          ctx.ellipse(rand() * w, rand() * h, w * (0.03 + rand() * 0.05), h * (0.02 + rand() * 0.03), rand() * TAU, 0, TAU);
          ctx.fill();
        }
        ctx.filter = "none";
      }
    }

    if (glyph) {
      const fs = h * 0.44;
      ctx.save();
      ctx.shadowColor = "rgba(0,0,0,0.55)";
      ctx.shadowBlur = h * 0.06;
      text(ctx, glyph, w * 0.07, h * 0.9, `italic 400 ${fs}px ${SERIF}`, g(0.97), "left");
      ctx.restore();
    }

    vignette(ctx, 0, 0, w, h, 0.5);
    return c;
  }

  // ---------- film grain tile -------------------------------------------

  function grain(size = 160) {
    const [c, ctx] = canvas(size, size);
    const img = ctx.createImageData(size, size);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = (Math.random() * 255) | 0;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    return c.toDataURL("image/png");
  }

  // ---------- lens displacement map for the loupe ------------------------

  function lensMap(size = 220, power = 0.9) {
    const [c, ctx] = canvas(size, size);
    const img = ctx.createImageData(size, size);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const nx = (x / size) * 2 - 1, ny = (y / size) * 2 - 1;
        const r = Math.min(1, Math.hypot(nx, ny));
        // the rim squeezes more of the sheet into view, like a real loupe
        const k = Math.pow(r, 3) * power;
        const i = (y * size + x) * 4;
        img.data[i] = Math.round((0.5 + nx * k * 0.5) * 255);
        img.data[i + 1] = Math.round((0.5 + ny * k * 0.5) * 255);
        img.data[i + 2] = 128;
        img.data[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    return c.toDataURL("image/png");
  }

  DR.art = { motif, grain, lensMap, rng };
})();
