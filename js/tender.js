/* The tender desk: a sample tender moving through the bid pipeline (5 stages,
   autoplays once on entry, every stage is also clickable), plus a working
   back-planner that turns a closing date into a working-day schedule and an
   .ics calendar file. Plain DOM + GSAP; GSAP only for discrete timelines. */
(() => {
  const DR = (window.DR = window.DR || {});

  // tunable constants, kept out of the tweens
  const CONFIG = {
    dwell: 1100,        // ms a stage rests after its timeline ends, when autoplaying
    minHold: 3600,      // ms a stage is held at minimum
    verdictBid: 70,     // qualify score thresholds
    verdictMaybe: 50,
    preset: [4, 4, 3, 4, 3], // the sample tender's qualify scores
    // back-planner: working days before the close, for a "medium" bid
    milestones: [
      ["Go / no-go decision", 14, "Score it on evidence. Walk away early if it's weak."],
      ["Kick-off & win themes", 12, "Owners assigned, every question mapped, what makes you different agreed."],
      ["Answers drafted", 8, "Every question has a first full answer, with evidence attached."],
      ["Red-team review", 5, "Someone who didn't write it scores it as the buyer would."],
      ["Final edit & price lock", 3, "Word limits, formatting, pricing reconciled to the schedule."],
      ["Sign-off", 2, "The authorised signatory approves the final pack."],
      ["Submit via portal", 1, "A full working day early. Portals fail at 11:58."],
    ],
    scale: { small: 0.5, medium: 1, large: 1.7 },
  };

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const pad = (n) => String(n).padStart(2, "0");

  DR.desk = {
    init({ gsap, ScrollTrigger, reduced }) {
      const board = $("#deskBoard");
      if (!board || !gsap) return;
      initPipeline({ gsap, ScrollTrigger, reduced, board });
      initPlanner({ gsap, reduced });
    },
  };

  /* ------------------------------------------------------------------ pipeline */
  function initPipeline({ gsap, ScrollTrigger, reduced, board }) {
    const tabs = $$(".pipe-tab", board);
    const panels = $$(".panel", board);
    const ink = $(".pipe-ink", board);
    const stage = $(".desk-stage", board);
    const N = tabs.length;

    let cur = -1;
    let tl = null;
    let timer = 0;
    let autoplay = false;
    let sliderTween = null;

    const stopAuto = () => {
      autoplay = false;
      clearTimeout(timer);
    };

    // ---- stamp: a soft thud, never a shake that moves the layout
    function thud(el) {
      if (reduced) return;
      gsap.fromTo(el, { scale: 1.7, opacity: 0, rotation: -14 }, { scale: 1, opacity: 1, rotation: -6, duration: 0.42, ease: "power4.in", overwrite: true });
      gsap.fromTo(stage, { y: 0 }, { y: 3, duration: 0.05, delay: 0.42, yoyo: true, repeat: 3, ease: "none", clearProps: "transform" });
    }

    // ---- stage 1: sourcing
    function buildSource() {
      const rows = $$(".notice", board);
      const t = gsap.timeline();
      rows.forEach((row) => {
        row.classList.remove("is-pass", "is-pursue");
        gsap.set(row, { opacity: 0, y: 16 });
        gsap.set($(".match-bar i", row), { scaleX: 0 });
        gsap.set($(".tag", row), { opacity: 0, scale: 0.6 });
        $(".match-n", row).textContent = "0";
      });
      rows.forEach((row, i) => {
        const m = +row.dataset.match;
        const o = { v: 0 };
        const at = i * 0.16;
        t.to(row, { opacity: 1, y: 0, duration: 0.5, ease: "power3.out" }, at);
        t.to($(".match-bar i", row), { scaleX: m / 100, duration: 0.9, ease: "power3.out" }, at + 0.15);
        t.to(o, { v: m, duration: 0.9, ease: "power2.out", onUpdate: () => ($(".match-n", row).textContent = Math.round(o.v)) }, at + 0.15);
      });
      // the decision lands row by row after everything has been read
      rows.forEach((row, i) => {
        const pursue = +row.dataset.match >= 70;
        t.add(() => row.classList.add(pursue ? "is-pursue" : "is-pass"), 1.9 + i * 0.12);
        t.to($(".tag", row), { opacity: 1, scale: 1, duration: 0.3, ease: "back.out(2)" }, 1.9 + i * 0.12);
      });
      return t;
    }

    // ---- stage 2: qualify (real sliders, live verdict)
    const qs = $$(".qs", board);
    const ring = $(".ring-fg", board);
    const ringN = $(".serif-n", board);
    const verdict = $(".verdict", board);
    const stamp = $(".stamp", verdict);
    const weak = $(".weak", board);
    const R = 2 * Math.PI * 52;
    ring.style.strokeDasharray = R;
    ring.style.strokeDashoffset = R;
    const NAMES = ["Sector fit", "Capability & references", "Competition", "Margin & price risk", "Time to deadline"];
    let lastKind = "";

    function qualScore() {
      return qs.reduce((sum, el) => sum + (+$("input", el).value / 5) * +el.dataset.w, 0);
    }
    function paintQual(commit) {
      qs.forEach((el) => {
        const inp = $("input", el);
        $(".qs-v", el).textContent = `${inp.value}/5`;
        inp.style.setProperty("--p", `${(+inp.value / 5) * 100}%`);
      });
      const s = qualScore();
      ringN.textContent = Math.round(s);
      ring.style.strokeDashoffset = R * (1 - s / 100);
      const kind = s >= CONFIG.verdictBid ? "bid" : s >= CONFIG.verdictMaybe ? "maybe" : "no";
      const label = { bid: "Bid", maybe: "Bid with conditions", no: "No-bid" }[kind];
      verdict.dataset.v = kind;
      stamp.textContent = label;
      if (kind !== lastKind && commit) thud(stamp);
      lastKind = kind;
      // weakest link: lowest score, ties go to the heavier weight
      let w = 0;
      qs.forEach((el, i) => {
        const a = +$("input", el).value, b = +$("input", qs[w]).value;
        if (a < b || (a === b && +el.dataset.w > +qs[w].dataset.w)) w = i;
      });
      const lowest = +$("input", qs[w]).value;
      weak.textContent = s <= 0 ? "" : lowest >= 4 ? "No weak spots. Go." : `Weakest link: ${NAMES[w]} (${lowest}/5). Fix it or walk away.`;
    }
    qs.forEach((el) => {
      const inp = $("input", el);
      inp.addEventListener("input", () => {
        stopAuto();
        sliderTween?.kill();
        paintQual(false);
      });
      inp.addEventListener("change", () => paintQual(true));
    });
    function buildQualify() {
      sliderTween?.kill();
      const o = qs.map(() => ({ v: 0 }));
      lastKind = "";
      qs.forEach((el) => ($("input", el).value = 0));
      paintQual(false);
      const t = gsap.timeline();
      o.forEach((x, i) => {
        t.to(x, {
          v: CONFIG.preset[i],
          duration: 0.85,
          ease: "power3.out",
          onUpdate: () => {
            $("input", qs[i]).value = Math.round(x.v);
            paintQual(false);
          },
        }, 0.2 + i * 0.28);
      });
      t.add(() => paintQual(true), "+=0.05");
      sliderTween = t;
      return t;
    }

    // ---- stage 3: shape (compliance matrix fills itself)
    function buildShape() {
      const rows = $$(".mrow:not(.mrow--head)", board);
      const state = rows.map(() => 0);
      const totalN = $(".mt-n", board);
      const totalBar = $(".mt-bar b", board);
      const paint = () => {
        const avg = state.reduce((a, b) => a + b, 0) / state.length;
        totalN.textContent = `${Math.round(avg * 100)}%`;
        gsap.set(totalBar, { scaleX: avg });
      };
      rows.forEach((row) => {
        const chip = $(".chip", row);
        chip.textContent = "Open";
        chip.dataset.s = "open";
        $(".mwords", row).textContent = row.hasAttribute("data-price") ? "–" : `0 / ${row.dataset.cap}`;
        gsap.set($(".mbar b", row), { scaleX: 0 });
        gsap.set(row, { opacity: 0, y: 10 });
      });
      state.fill(0);
      paint();
      const t = gsap.timeline();
      rows.forEach((row, i) => {
        const o = { v: 0 };
        const price = row.hasAttribute("data-price");
        const words = +row.dataset.words;
        const at = 0.15 + i * 0.42;
        t.to(row, { opacity: 1, y: 0, duration: 0.4, ease: "power3.out" }, at);
        t.to(o, {
          v: 1,
          duration: 1.1,
          ease: "power1.inOut",
          onUpdate: () => {
            state[i] = o.v;
            const chip = $(".chip", row);
            chip.dataset.s = o.v >= 1 ? "ready" : o.v > 0.02 ? "draft" : "open";
            chip.textContent = o.v >= 1 ? "Ready" : o.v > 0.02 ? "Drafting" : "Open";
            if (!price) $(".mwords", row).textContent = `${Math.round(o.v * words)} / ${row.dataset.cap}`;
            gsap.set($(".mbar b", row), { scaleX: o.v });
            paint();
          },
        }, at + 0.1);
      });
      return t;
    }

    // ---- stage 4: review checklist + mock score
    function buildReview() {
      const items = $$(".checks li", board);
      const path = (li) => $("path", li);
      const mockN = $(".mock-n", board);
      mockN.textContent = "0";
      items.forEach((li) => {
        li.classList.remove("is-ok");
        const p = path(li);
        const len = p.getTotalLength();
        p.style.strokeDasharray = len;
        p.style.strokeDashoffset = len;
        gsap.set(li, { opacity: 0, x: -12 });
        gsap.set($("circle", li), { opacity: 0.35 });
      });
      const t = gsap.timeline();
      items.forEach((li, i) => {
        const at = 0.2 + i * 0.5;
        t.to(li, { opacity: 1, x: 0, duration: 0.35, ease: "power3.out" }, at);
        t.to(path(li), { strokeDashoffset: 0, duration: 0.4, ease: "power2.out" }, at + 0.25);
        t.add(() => li.classList.add("is-ok"), at + 0.3);
        t.to($("circle", li), { opacity: 1, duration: 0.2 }, at + 0.3);
      });
      const o = { v: 0 };
      t.to(o, { v: 82, duration: 1, ease: "power2.out", onUpdate: () => (mockN.textContent = Math.round(o.v)) }, 0.2 + items.length * 0.5);
      return t;
    }

    // ---- stage 5: submit
    function buildSubmit() {
      const lines = $$(".submit-lines li", board);
      const st = $(".stamp--big", board);
      gsap.set(st, { opacity: 0 });
      gsap.set(lines, { opacity: 0, y: 10 });
      const t = gsap.timeline();
      t.to(lines, { opacity: 1, y: 0, duration: 0.45, stagger: 0.14, ease: "power3.out" }, 0.1);
      t.add(() => thud(st), 0.9);
      return t;
    }

    const builders = [buildSource, buildQualify, buildShape, buildReview, buildSubmit];

    // ---- stage switching
    function show(i, { force = false, instant = false } = {}) {
      if (i === cur && !force) return;
      const prevPanel = panels[cur];
      cur = i;
      tl?.kill();
      sliderTween?.kill();
      tabs.forEach((tab, k) => {
        tab.setAttribute("aria-selected", String(k === i));
        tab.tabIndex = k === i ? 0 : -1;
        tab.classList.toggle("is-done", k < i);
      });
      gsap.to(ink, { scaleX: (i + 1) / N, duration: reduced || instant ? 0 : 0.8, ease: "power3.out" });
      panels.forEach((p, k) => (p.hidden = k !== i));
      const panel = panels[i];
      if (!reduced && !instant && prevPanel !== panel) gsap.fromTo(panel, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.5, ease: "power3.out", clearProps: "transform" });
      tl = builders[i]();
      if (reduced || instant) tl.progress(1);
      else if (autoplay) schedule(i, tl.duration());
    }

    function schedule(i, dur) {
      clearTimeout(timer);
      if (i >= N - 1) return;
      timer = setTimeout(() => autoplay && show(i + 1), Math.max(CONFIG.minHold, dur * 1000 + CONFIG.dwell));
    }

    // ---- input: tabs (click + arrow keys), replay
    tabs.forEach((tab, i) => {
      tab.addEventListener("click", () => {
        stopAuto();
        show(i);
      });
      tab.addEventListener("keydown", (e) => {
        const k = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
        if (!k) return;
        e.preventDefault();
        const n = (i + k + N) % N;
        tabs[n].focus();
        stopAuto();
        show(n);
      });
    });
    $(".desk-replay", board).addEventListener("click", () => {
      autoplay = !reduced;
      show(0, { force: true });
    });

    // ---- first view: start with stage 1 and let it run itself
    show(0, { instant: true });
    // (stage 1 is in its finished state until the section is seen)
    ScrollTrigger.create({
      trigger: board,
      start: "top 70%",
      once: true,
      onEnter: () => {
        if (reduced) return;
        autoplay = true;
        show(0, { force: true });
      },
    });
  }

  /* ------------------------------------------------------------------ planner */
  function initPlanner({ gsap, reduced }) {
    const dl = $("#planDeadline");
    const nameEl = $("#planName");
    const sum = $("#planSum");
    const bar = $("#planBar");
    const list = $("#planList");
    if (!dl) return;

    const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const isWork = (d) => d.getDay() !== 0 && d.getDay() !== 6;
    const subWD = (d, n) => {
      const x = startOfDay(d);
      while (n > 0) {
        x.setDate(x.getDate() - 1);
        if (isWork(x)) n--;
      }
      return x;
    };
    // working days from tomorrow up to and including the closing date
    const wdBetween = (a, b) => {
      const x = startOfDay(a), end = startOfDay(b);
      let n = 0;
      while (x < end) {
        x.setDate(x.getDate() + 1);
        if (isWork(x)) n++;
      }
      return n;
    };
    const fmt = (d) => d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
    const fmtDT = (d) => `${fmt(d)}, ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    const local = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

    // default: three weeks out, closing at noon
    const def = new Date();
    def.setDate(def.getDate() + 21);
    def.setHours(12, 0, 0, 0);
    dl.value = local(def);
    dl.min = local(new Date());

    let current = null;

    function compute() {
      const close = new Date(dl.value);
      if (isNaN(close)) return null;
      const size = ($('input[name="planSize"]:checked') || {}).value || "medium";
      const today = startOfDay(new Date());
      const available = wdBetween(today, close);
      const base = CONFIG.milestones;
      const k = CONFIG.scale[size];
      // raw offsets scaled by size, kept strictly decreasing
      let d = base.map(([, n]) => Math.max(1, Math.round(n * k)));
      for (let i = d.length - 2; i >= 0; i--) d[i] = Math.max(d[i], d[i + 1] + 1);
      d[d.length - 1] = 1;
      const needed = d[0];
      let compressed = false;
      if (available < needed) {
        compressed = true;
        const f = Math.max(0, available) / needed;
        d = d.map((n, i) => (i === d.length - 1 ? Math.min(1, available) : Math.round(n * f)));
        for (let i = d.length - 2; i >= 0; i--) d[i] = Math.max(d[i], d[i + 1]);
        d[0] = Math.min(d[0], available);
      }
      const rows = base.map(([label, , note], i) => ({ label, note, wd: d[i], date: subWD(close, d[i]) }));
      rows.push({ label: "Closing", note: "Doors shut. Nothing after this counts.", wd: 0, date: close, final: true });
      return { close, size, today, available, needed, compressed, rows };
    }

    function render(animate) {
      const p = compute();
      current = p;
      list.textContent = "";
      bar.querySelectorAll(".plan-dot").forEach((n) => n.remove());
      if (!p) {
        sum.textContent = "Pick a closing date to see the plan.";
        return;
      }
      if (p.available < 1) {
        sum.innerHTML = "<b>Closes today or already closed.</b> Unless the pack is already written, that is a no-bid.";
        return;
      }
      const days = Math.round((p.close - new Date()) / 864e5);
      const tight = p.compressed;
      sum.innerHTML = tight
        ? `<b>${p.available} working day${p.available === 1 ? "" : "s"} to close</b>, against ${p.needed} recommended for a ${p.size} bid. The plan below is compressed. Cut scope or bid only if the evidence already exists.`
        : `<b>${p.available} working days to close</b> (${days} calendar). Recommended runway for a ${p.size} bid is ${p.needed}, so there is room to do it properly.`;
      sum.dataset.tight = tight ? "1" : "0";

      const span = Math.max(1, p.close - p.today);
      p.rows.forEach((r, i) => {
        const li = document.createElement("li");
        li.className = "plan-row" + (r.final ? " is-final" : r.label.startsWith("Submit") ? " is-submit" : "");
        const rel = r.final ? "" : r.wd === 0 ? "Close of play" : `${r.wd} working day${r.wd === 1 ? "" : "s"} before close`;
        li.innerHTML = `<span class="plan-date mono">${r.final ? fmtDT(r.date) : fmt(r.date)}</span><span class="plan-dot-i" aria-hidden="true"></span><div><strong></strong><p></p><span class="plan-rel mono">${rel}</span></div>`;
        $("strong", li).textContent = r.label;
        $("p", li).textContent = r.note;
        list.appendChild(li);
        const dot = document.createElement("i");
        dot.className = "plan-dot" + (r.final ? " is-final" : "");
        dot.style.left = `${Math.min(100, Math.max(0, ((r.date - p.today) / span) * 100))}%`;
        dot.title = `${r.label}: ${fmt(r.date)}`;
        bar.appendChild(dot);
      });
      if (animate && !reduced) {
        gsap.fromTo(list.children, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.45, stagger: 0.06, ease: "power3.out", clearProps: "transform" });
        gsap.fromTo(bar.querySelectorAll(".plan-dot"), { scale: 0 }, { scale: 1, duration: 0.4, stagger: 0.06, ease: "back.out(2.5)" });
      }
    }

    dl.addEventListener("input", () => render(true));
    $$('input[name="planSize"]').forEach((r) => r.addEventListener("change", () => render(true)));
    nameEl.addEventListener("input", () => {});
    render(false);

    // ---- exports
    const ics = (s) => String(s).replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
    const dstr = (d) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
    const tstr = (d) => `${dstr(d)}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
    function makeIcs() {
      if (!current) return "";
      const title = nameEl.value.trim() || "Tender";
      const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");
      const out = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Michael Omale//Bid back-planner//EN", "CALSCALE:GREGORIAN"];
      current.rows.forEach((r, i) => {
        const next = new Date(r.date.getFullYear(), r.date.getMonth(), r.date.getDate() + 1);
        out.push("BEGIN:VEVENT", `UID:bid-${Date.now()}-${i}@michael-omale`, `DTSTAMP:${stamp}`);
        if (r.final) {
          const end = new Date(r.date.getTime() + 30 * 60000);
          out.push(`DTSTART:${tstr(r.date)}`, `DTEND:${tstr(end)}`);
        } else {
          out.push(`DTSTART;VALUE=DATE:${dstr(r.date)}`, `DTEND;VALUE=DATE:${dstr(next)}`);
        }
        out.push(`SUMMARY:${ics(`${title} - ${r.label}`)}`, `DESCRIPTION:${ics(r.note)}`, "END:VEVENT");
      });
      out.push("END:VCALENDAR");
      return out.join("\r\n");
    }
    function makeText() {
      if (!current) return "";
      const title = nameEl.value.trim() || "Tender";
      return [`${title}: bid plan (${current.size})`, ...current.rows.map((r) => `${r.final ? fmtDT(r.date) : fmt(r.date)}  ${r.label}`)].join("\n");
    }
    const flash = (btn, msg) => {
      const old = btn.dataset.label || btn.innerHTML;
      btn.dataset.label = old;
      btn.textContent = msg;
      clearTimeout(btn._t);
      btn._t = setTimeout(() => (btn.innerHTML = old), 1800);
    };
    $("#planIcs").addEventListener("click", (e) => {
      const text = makeIcs();
      if (!text) return;
      const url = URL.createObjectURL(new Blob([text], { type: "text/calendar;charset=utf-8" }));
      const a = Object.assign(document.createElement("a"), { href: url, download: "bid-plan.ics" });
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      flash(e.currentTarget, "Downloaded ✓");
    });
    $("#planCopy").addEventListener("click", async (e) => {
      const btn = e.currentTarget;
      const text = makeText();
      try {
        await navigator.clipboard.writeText(text);
      } catch {
        const ta = Object.assign(document.createElement("textarea"), { value: text });
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        ta.remove();
      }
      flash(btn, "Copied ✓");
    });
  }
})();
