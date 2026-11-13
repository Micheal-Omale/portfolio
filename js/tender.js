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
    verdictMaybe: 50,
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
    const logBox = $(".desk-log", board);
    const logList = $(".log-lines", board);
    const N = tabs.length;

    let cur = -1;
    let tl = null;
    let inkTween = null;
    let timer = 0;
    let autoplay = false;   // the board is playing itself
    let parked = false;     // autoplay paused because the board left the screen
    let runClock = 0;       // seconds into the sample run, for the log timestamps

    const stopAuto = () => {
      autoplay = false;
      parked = false;
      clearTimeout(timer);
      logBox.classList.remove("is-live");
    };

    // ---- run log: one line at a time, the old one slides up and out
    const stamp = (s) => `+${pad(Math.floor(s / 60))}:${pad(Math.floor(s % 60))}`;
    function log(html, dt = 3) {
      runClock += dt;
      const li = document.createElement("li");
      li.innerHTML = `<time>${stamp(runClock)}</time>${html}`;
      const old = [...logList.children];
      logList.appendChild(li);
      if (reduced) {
        old.forEach((o) => o.remove());
        return;
      }
      gsap.fromTo(li, { yPercent: 110, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.45, ease: "power3.out" });
      old.forEach((o) => gsap.to(o, { yPercent: -110, opacity: 0, duration: 0.3, ease: "power2.in", onComplete: () => o.remove() }));
    }
    // log lines a stage writes as it plays (sample run; shape follows the real job)
    const LOG = [
      [[0.1, "run started · searching <b>8</b> care phrases, newest first"], [1.3, "<b>5</b> new notices · checked against the site for duplicates"], [2.9, "<b>2</b> picked · 3 skipped with a one-line reason"]],
      [[0.1, "registered interest · <b>6</b> documents downloaded"], [1.4, "PDF, Word and Excel converted to text"], [2.4, "facts digest written · <b>6</b> key facts"]],
      [[0.1, "filling the Tender Eligibility Form from the digest"], [2.0, "insurance levels conflict · cell flagged amber"], [3.6, "form complete · <b>33</b> rows, every answer sourced"]],
      [[0.1, "checking every figure and date against the documents"], [2.6, "all checks passed · <b>2</b> missing fields listed"]],
      [[0.1, "documents and form filed to the Drive folder"], [0.9, "draft created on bidcentra.co.uk · <b>ready for review</b>"], [2.2, "run finished · waiting for a person to approve"]],
    ];
    const addLog = (t, i) => LOG[i].forEach(([at, line]) => t.add(() => log(line), at));

    // ---- stamp: a soft thud, never a shake that moves the layout
    function thud(el) {
      if (reduced) return;
      gsap.fromTo(el, { scale: 1.7, opacity: 0, rotation: -14 }, { scale: 1, opacity: 1, rotation: -6, duration: 0.42, ease: "power4.in", overwrite: true });
      gsap.fromTo(stage, { y: 0 }, { y: 3, duration: 0.05, delay: 0.42, yoyo: true, repeat: 3, ease: "none", clearProps: "transform" });
    }

    // ---- 01 source: find the notices, then judge each one against the rules
    function buildSource() {
      const rows = $$(".notice", board);
      const t = gsap.timeline();
      rows.forEach((row) => {
        row.classList.remove("is-pass", "is-pursue");
        gsap.set(row, { opacity: 0, y: 14 });
        gsap.set([$(".why", row), $(".tag", row)], { opacity: 0 });
        gsap.set($(".tag", row), { scale: 0.6 });
      });
      rows.forEach((row, i) => t.to(row, { opacity: 1, y: 0, duration: 0.5, ease: "power3.out" }, 0.1 + i * 0.14));
      rows.forEach((row, i) => {
        const pick = row.dataset.pick === "1";
        const at = 1.5 + i * 0.32;
        t.add(() => row.classList.add(pick ? "is-pursue" : "is-pass"), at);
        t.to($(".why", row), { opacity: 1, duration: 0.3 }, at);
        t.to($(".tag", row), { opacity: 1, scale: 1, duration: 0.3, ease: "back.out(2)" }, at);
      });
      return t;
    }

    // ---- 02 read: every document read, then the facts digest
    function buildRead() {
      const files = $$(".files li", board);
      const lines = $$(".digest-lines li", board);
      const n = $(".digest-n", board);
      n.textContent = "0";
      files.forEach((li) => {
        gsap.set(li, { opacity: 0, x: -14 });
        gsap.set($("b", li), { opacity: 0 });
      });
      gsap.set(lines, { opacity: 0, y: 8 });
      const t = gsap.timeline();
      files.forEach((li, i) => {
        t.to(li, { opacity: 1, x: 0, duration: 0.35, ease: "power3.out" }, 0.1 + i * 0.2);
        t.to($("b", li), { opacity: 1, duration: 0.25 }, 0.5 + i * 0.2);
      });
      const base = 0.3 + files.length * 0.2;
      lines.forEach((li, i) => {
        t.to(li, { opacity: 1, y: 0, duration: 0.35, ease: "power3.out" }, base + i * 0.2);
        t.add(() => (n.textContent = i + 1), base + i * 0.2);
      });
      return t;
    }

    // ---- 03 write: answers type in, each one shows where it came from
    function buildWrite() {
      const rows = $$(".frow:not(.frow--head)", board);
      const totalN = $(".mt-n", board);
      const totalBar = $(".mt-bar b", board);
      const TOTAL = 33;
      const paint = (v) => {
        totalN.textContent = `${Math.round(v * TOTAL)} / ${TOTAL}`;
        gsap.set(totalBar, { scaleX: v });
      };
      rows.forEach((row) => {
        const fa = $(".fa", row), src = $(".src", row);
        fa.textContent = "";
        fa.classList.remove("is-typing");
        src.textContent = row.dataset.src;
        src.classList.remove("is-on");
        row.classList.remove("is-flag");
        gsap.set(row, { opacity: 0.35 });
      });
      paint(0);
      const t = gsap.timeline();
      const step = 0.62;
      rows.forEach((row, i) => {
        const text = row.dataset.fill;
        const fa = $(".fa", row);
        const o = { v: 0 };
        const at = 0.15 + i * step;
        t.to(row, { opacity: 1, duration: 0.25 }, at);
        t.add(() => fa.classList.add("is-typing"), at);
        t.to(o, { v: 1, duration: 0.55, ease: "none", onUpdate: () => (fa.textContent = text.slice(0, Math.round(o.v * text.length))) }, at);
        t.add(() => {
          fa.classList.remove("is-typing");
          $(".src", row).classList.add("is-on");
          if (row.hasAttribute("data-flag")) row.classList.add("is-flag");
        }, at + 0.58);
      });
      const prog = { v: 0 };
      t.to(prog, { v: 1, duration: 0.15 + rows.length * step + 0.4, ease: "none", onUpdate: () => paint(prog.v) }, 0.1);
      return t;
    }

    // ---- 04 verify: checklist, then gaps handed to the approver
    function buildVerify() {
      const items = $$(".checks li", board);
      const gapN = $(".mock-n", board);
      gapN.textContent = "0";
      items.forEach((li) => {
        li.classList.remove("is-ok");
        const p = $("path", li);
        const len = p.getTotalLength();
        p.style.strokeDasharray = len;
        p.style.strokeDashoffset = len;
        gsap.set(li, { opacity: 0, x: -12 });
        gsap.set($("circle", li), { opacity: 0.35 });
      });
      const t = gsap.timeline();
      items.forEach((li, i) => {
        const at = 0.15 + i * 0.42;
        t.to(li, { opacity: 1, x: 0, duration: 0.35, ease: "power3.out" }, at);
        t.to($("path", li), { strokeDashoffset: 0, duration: 0.35, ease: "power2.out" }, at + 0.2);
        t.add(() => li.classList.add("is-ok"), at + 0.25);
        t.to($("circle", li), { opacity: 1, duration: 0.2 }, at + 0.25);
      });
      const end = 0.15 + items.length * 0.42;
      t.add(() => (gapN.textContent = "1"), end + 0.1);
      t.add(() => (gapN.textContent = "2"), end + 0.4);
      return t;
    }

    // ---- 05 file: the draft lands in the admin, waiting for a person
    function buildFile() {
      const draft = $(".draft", board);
      const lines = $$(".submit-lines li", board);
      const st = $(".stamp--big", board);
      gsap.set(st, { opacity: 0 });
      gsap.set(draft, { opacity: 0, y: 26, rotation: 1.2 });
      gsap.set(lines, { opacity: 0 });
      const t = gsap.timeline();
      t.to(draft, { opacity: 1, y: 0, rotation: 0, duration: 0.7, ease: "power3.out" }, 0.1);
      t.to(lines, { opacity: 1, duration: 0.3, stagger: 0.1 }, 0.5);
      t.add(() => thud(st), 1.4);
      return t;
    }

    const builders = [buildSource, buildRead, buildWrite, buildVerify, buildFile];

    // ---- lock the stage to its tallest panel so nothing below jumps
    function lockHeight() {
      stage.style.minHeight = "";
      const visible = panels.map((p) => p.hidden);
      let max = 0;
      panels.forEach((p) => {
        p.hidden = false;
        p.style.position = "absolute";
        p.style.visibility = "hidden";
        p.style.width = `${stage.clientWidth - parseFloat(getComputedStyle(stage).paddingLeft) * 2}px`;
        max = Math.max(max, p.offsetHeight);
      });
      panels.forEach((p, k) => {
        p.style.position = p.style.visibility = p.style.width = "";
        p.hidden = visible[k];
      });
      const pad = parseFloat(getComputedStyle(stage).paddingTop) + parseFloat(getComputedStyle(stage).paddingBottom);
      stage.style.minHeight = `${Math.ceil(max + pad)}px`;
    }

    // ---- stage switching
    function show(i, { force = false, instant = false } = {}) {
      if (i === cur && !force) return;
      const prevPanel = panels[cur];
      cur = i;
      tl?.kill();
      inkTween?.kill();
      tabs.forEach((tab, k) => {
        tab.setAttribute("aria-selected", String(k === i));
        tab.tabIndex = k === i ? 0 : -1;
        tab.classList.toggle("is-done", k < i);
      });
      panels.forEach((p, k) => (p.hidden = k !== i));
      const panel = panels[i];
      if (!reduced && !instant && prevPanel !== panel) gsap.fromTo(panel, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.5, ease: "power3.out", clearProps: "transform" });
      tl = builders[i]();
      if (!instant) addLog(tl, i);
      if (reduced || instant) {
        tl.progress(1);
        gsap.set(ink, { scaleX: (i + 1) / N });
        return;
      }
      // while playing itself the ink fills across the stage; on a click it jumps to the stage
      const hold = Math.max(CONFIG.minHold, tl.duration() * 1000 + CONFIG.dwell) / 1000;
      if (autoplay) {
        gsap.set(ink, { scaleX: i / N });
        inkTween = gsap.to(ink, { scaleX: (i + 1) / N, duration: hold, ease: "none" });
        clearTimeout(timer);
        if (i < N - 1) timer = setTimeout(() => autoplay && show(i + 1), hold * 1000);
        else timer = setTimeout(() => logBox.classList.remove("is-live"), hold * 1000);
      } else {
        inkTween = gsap.to(ink, { scaleX: (i + 1) / N, duration: 0.6, ease: "power3.out" });
      }
    }

    function startRun() {
      if (reduced) return;
      autoplay = true;
      parked = false;
      runClock = 0;
      logList.textContent = "";
      logBox.classList.add("is-live");
      show(0, { force: true });
    }

    // ---- input: tabs (click + arrow keys), replay
    tabs.forEach((tab, i) => {
      tab.addEventListener("click", () => {
        stopAuto();
        show(i, { force: true });
      });
      tab.addEventListener("keydown", (e) => {
        const k = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
        if (!k) return;
        e.preventDefault();
        const n = (i + k + N) % N;
        tabs[n].focus();
        stopAuto();
        show(n, { force: true });
      });
    });
    $(".desk-replay", board).addEventListener("click", startRun);

    // ---- first paint: stage 1 finished, so a still screenshot reads fine
    lockHeight();
    show(0, { instant: true });
    log("sample run · ready", 0);
    let rz = 0;
    addEventListener("resize", () => {
      clearTimeout(rz);
      rz = setTimeout(lockHeight, 200);
    });
    document.fonts?.ready.then(lockHeight);

    // ---- plays itself once the stage itself is on screen; parks when you scroll away
    let started = false;
    ScrollTrigger.create({
      trigger: stage,
      start: "top 75%",
      end: "bottom 25%",
      onEnter: () => {
        if (!started) {
          started = true;
          startRun();
        } else if (parked) resume();
      },
      onEnterBack: () => parked && resume(),
      onLeave: park,
      onLeaveBack: park,
    });
    function park() {
      if (!autoplay) return;
      clearTimeout(timer);
      tl?.pause();
      inkTween?.pause();
      parked = true;
    }
    function resume() {
      parked = false;
      // pick the stage up again from its start, so nothing is missed
      show(cur, { force: true });
    }
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
