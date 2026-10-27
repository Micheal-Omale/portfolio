/* ==========================================================================
   study.js — the print comes off the pile.
   Click a case's print: the card's own paper spreads to fill the screen, the
   print lifts off and flies into a browser frame, re-developing as it lands,
   and the case reads beside it — scroll, and the whole live page scrolls by.
   Previous / next move between cases without leaving; Close, Esc or the
   browser's Back put it back on the pile. Built from the cases' own markup,
   so there is one source of truth for every word.
   ========================================================================== */
(() => {
  const DR = (window.DR = window.DR || {});

  const CFG = {
    open: { sheet: 0.95, fly: 1.15, story: 0.55, stagger: 0.07 },
    close: { out: 0.22, sheet: 0.6 }, // exits ~3x faster than entrances
    swap: { out: 0.22, in: 0.7 },
    radius: 28, // the case cards' corner radius
    develop: {
      from: "brightness(1.5) contrast(0.7) saturate(0.3) blur(3px)",
      to: "brightness(1) contrast(1) saturate(1) blur(0px)",
    },
    landWait: 1500, // ms to wait for the full page image before handing over anyway
  };

  DR.study = {
    init({ gsap, lenis, reduced, caseScroll }) {
      const root = document.documentElement;
      const cases = [...document.querySelectorAll(".case[data-slug]")];
      if (!cases.length) return;

      // ---------- the cases, read from the page --------------------------------
      const data = cases.map((el, i) => {
        const meta = el.querySelector(".case-meta");
        const no = meta.querySelector("span").textContent;
        const fig = el.querySelector(".print");
        const img = fig.querySelector("img");
        const links = [...el.querySelectorAll(".case-link")].map((a) => ({ href: a.href, text: a.textContent }));
        return {
          el, i, fig, img,
          slug: el.dataset.slug,
          media: el.querySelector(".case-media"),
          win: () => fig.querySelector(".print-win") || fig,
          tint: el.style.getPropertyValue("--tint").trim() || "#2b45ff",
          no,
          kind: meta.textContent.replace(no, "").trim(),
          title: el.querySelector(".case-title").textContent.trim(),
          lede: el.querySelector(".case-lede").innerHTML,
          desc: el.querySelector(".case-desc").innerHTML,
          chips: [...el.querySelectorAll(".chips li")].map((li) => li.textContent),
          links,
          host: links[0] ? new URL(links[0].href).hostname : "",
          base: img.getAttribute("src"),
          full: fig.dataset.full || null,
          shots: (el.dataset.shots || "").split(",").filter(Boolean),
        };
      });

      // ---------- the study, built once ---------------------------------------
      const st = document.createElement("div");
      st.className = "study";
      st.hidden = true;
      st.setAttribute("role", "dialog");
      st.setAttribute("aria-modal", "true");
      st.setAttribute("aria-labelledby", "studyTitle");
      st.innerHTML = `
        <div class="study-sheet"></div>
        <div class="study-scroll" data-lenis-prevent>
          <div class="study-grid">
            <div class="study-story">
              <p class="study-meta mono"><b></b><span></span></p>
              <h2 class="study-title" id="studyTitle"></h2>
              <p class="study-lede"></p>
              <div class="study-block"><p class="study-label mono">The product</p><p class="study-desc"></p></div>
              <div class="study-block"><p class="study-label mono">Built with</p><ul class="chips mono study-chips"></ul></div>
              <div class="study-links"></div>
              <nav class="study-nav" aria-label="More case studies">
                <button type="button" class="mono study-prev" data-cursor="link"></button>
                <button type="button" class="mono study-next" data-cursor="link"></button>
              </nav>
            </div>
            <div class="study-shots">
              <figure class="study-browser">
                <div class="study-bar" aria-hidden="true"><i></i><i></i><i></i><span class="study-url mono"></span></div>
                <div class="study-page"><img alt=""></div>
              </figure>
              <div class="study-more"></div>
            </div>
          </div>
        </div>
        <button type="button" class="btn btn--small study-close" data-cursor="link">Close <span aria-hidden="true">✕</span></button>`;
      document.body.appendChild(st);
      const $ = (s) => st.querySelector(s);
      const Q = {
        sheet: $(".study-sheet"), scroll: $(".study-scroll"), story: $(".study-story"),
        metaNo: $(".study-meta b"), metaKind: $(".study-meta span"), title: $(".study-title"), lede: $(".study-lede"),
        desc: $(".study-desc"), chips: $(".study-chips"), links: $(".study-links"),
        prev: $(".study-prev"), next: $(".study-next"),
        shots: $(".study-shots"), browser: $(".study-browser"), url: $(".study-url"), pageWrap: $(".study-page"), page: $(".study-page img"),
        more: $(".study-more"), close: $(".study-close"),
      };

      const fill = (d) => {
        st.style.setProperty("--study-bg", `color-mix(in srgb, var(--card) 94%, ${d.tint})`);
        Q.metaNo.textContent = d.no;
        Q.metaKind.textContent = d.kind;
        Q.title.textContent = d.title;
        Q.lede.innerHTML = d.lede;
        Q.desc.innerHTML = d.desc;
        Q.chips.replaceChildren(...d.chips.map((t) => Object.assign(document.createElement("li"), { textContent: t })));
        Q.links.replaceChildren(...d.links.map((l, k) => Object.assign(document.createElement("a"), {
          className: k ? "btn btn--ghost btn--small" : "btn btn--small",
          href: l.href, target: "_blank", rel: "noopener", textContent: k ? l.text : `Visit ${l.text}`,
        })));
        Q.links.querySelectorAll("a").forEach((a) => (a.dataset.cursor = "link"));
        Q.url.textContent = d.host;
        Q.page.src = d.full || d.base;
        Q.page.alt = d.img.alt;
        Q.more.replaceChildren(...d.shots.map((src) => {
          const f = document.createElement("figure");
          f.innerHTML = `<img src="${src}" alt="" loading="lazy"><figcaption class="mono">More from ${d.title}</figcaption>`;
          return f;
        }));
        const p = data[(d.i - 1 + data.length) % data.length], n = data[(d.i + 1) % data.length];
        Q.prev.innerHTML = `← <b>${p.title}</b>`;
        Q.next.innerHTML = `Next <b>${n.title}</b> →`;
        Q.scroll.scrollTop = 0;
        if (DR.light) DR.light.extra = 0;
      };

      // ---------- open: the paper spreads, the print flies --------------------
      let cur = -1, busy = false, pushed = false;
      // the paper's edge, tweened as plain numbers and written each frame: a
      // computed clip-path drops zero terms, so GSAP can't tween the string itself.
      // The content layer wears the same edge, so nothing shows past the paper.
      const clip = { t: 0, r: 0, b: 0, l: 0, rad: 0 };
      const paintClip = () => {
        const v = `inset(${clip.t.toFixed(1)}px ${clip.r.toFixed(1)}px ${clip.b.toFixed(1)}px ${clip.l.toFixed(1)}px round ${clip.rad.toFixed(1)}px)`;
        Q.sheet.style.clipPath = Q.scroll.style.clipPath = v;
      };
      const clearClip = () => (Q.sheet.style.clipPath = Q.scroll.style.clipPath = "");
      const edgeOf = (r, rad) => ({ t: r.top, r: innerWidth - r.right, b: innerHeight - r.bottom, l: r.left, rad });
      const FULL = { t: 0, r: 0, b: 0, l: 0, rad: 0 };
      const onScreen = (r) => r.bottom > 0 && r.top < innerHeight;
      const tiltOf = (el) => {
        const m = new DOMMatrixReadOnly(getComputedStyle(el).transform);
        return (Math.atan2(m.b, m.a) * 180) / Math.PI;
      };
      const storyBits = () => [...Q.story.children];

      function open(i, fly = true) {
        if (busy || cur === i) return;
        busy = true;
        cur = i;
        const d = data[i];
        fill(d);
        const landed = Promise.race([Q.page.decode().catch(() => {}), new Promise((r) => setTimeout(r, CFG.landWait))]);
        st.hidden = false;
        root.classList.add("study-open");
        lenis.stop();
        gsap.set(storyBits(), { y: 30, opacity: 0 });
        gsap.set([Q.browser, Q.more, Q.close], { y: 0, opacity: 0 });
        gsap.set(Q.shots, { y: 0, opacity: 1 });
        gsap.set(Q.page, { opacity: 0, filter: "none" });
        gsap.set(Q.sheet, { opacity: 1 });

        const O = CFG.open;
        const card = d.el.getBoundingClientRect();
        const tl = gsap.timeline({ onComplete: () => { busy = false; Q.close.focus({ preventScroll: true }); } });
        if (fly && !reduced && onScreen(card)) {
          // the card's own paper spreads out to fill the screen
          Object.assign(clip, edgeOf(card, CFG.radius));
          paintClip();
          tl.to(clip, { ...FULL, duration: O.sheet, ease: "hop", onUpdate: paintClip, onComplete: clearClip }, 0);

          // the print lifts off the pile and flies into the browser frame (FLIP)
          const win = d.win();
          const src = win.getBoundingClientRect();
          const tgt = Q.pageWrap.getBoundingClientRect();
          const k = src.width / tgt.width;
          const fl = document.createElement("div");
          fl.className = "study-flyer";
          fl.style.cssText = `left:${tgt.left}px;top:${tgt.top}px;width:${tgt.width}px;height:${(src.height / k).toFixed(1)}px`;
          const fi = fl.appendChild(new Image());
          fi.src = d.img.currentSrc || d.img.src;
          st.appendChild(fl);
          // carry over how far the print had scrolled its page; it scrolls home in flight
          gsap.set(fi, { y: (+gsap.getProperty(d.img, "y") || 0) / k });
          tl.fromTo(fl, { x: src.left - tgt.left, y: src.top - tgt.top, scale: k, rotation: tiltOf(d.fig) },
            { x: 0, y: 0, scale: 1, rotation: 0, duration: O.fly, ease: "hop" }, 0.06)
            .to(fi, { y: 0, duration: O.fly, ease: "power3.inOut" }, 0.06)
            // it re-develops as it lands: a wash of light, then the colour comes back
            .to(fi, { filter: CFG.develop.from, duration: 0.35, ease: "power2.out" }, 0.1)
            .to(fi, { filter: CFG.develop.to, duration: 1.0, ease: "develop" }, 0.45)
            .to(Q.browser, { opacity: 1, duration: 0.35, ease: "power2.out" }, O.fly - 0.2)
            .add(() => landed.then(() => {
              gsap.set(Q.page, { opacity: 1 });
              gsap.to(fl, { opacity: 0, duration: 0.25, onComplete: () => fl.remove() });
            }), O.fly + 0.1);
        } else {
          clearClip();
          tl.fromTo(Q.sheet, { opacity: 0 }, { opacity: 1, duration: 0.4, ease: "power2.out" }, 0)
            .to(Q.browser, { opacity: 1, duration: 0.4 }, 0.1)
            .add(() => landed.then(() => gsap.to(Q.page, { opacity: 1, duration: 0.3 })), 0.1);
        }
        const at = fly && !reduced ? O.story : 0.15;
        tl.to(storyBits(), { y: 0, opacity: 1, duration: 0.9, stagger: O.stagger, ease: "power3.out" }, at)
          .to([Q.more, Q.close], { opacity: 1, duration: 0.5, ease: "power2.out" }, at + 0.4);

        const state = { study: d.slug };
        if (history.state?.study) history.replaceState(state, "", `#${d.slug}`);
        else { history.pushState(state, "", `#${d.slug}`); pushed = true; }
      }

      // ---------- close: back onto the pile -----------------------------------
      function close() {
        if (busy || cur < 0) return;
        busy = true;
        const d = data[cur];
        const card = d.el.getBoundingClientRect();
        const C = CFG.close;
        const tl = gsap.timeline({
          onComplete: () => {
            st.hidden = true;
            root.classList.remove("study-open");
            if (DR.light) DR.light.extra = 0;
            lenis.start();
            clearClip();
            gsap.set(Q.sheet, { clearProps: "opacity" });
            busy = false;
            cur = -1;
            d.media.focus({ preventScroll: true });
          },
        });
        tl.to([...storyBits(), Q.shots, Q.close], { y: 16, opacity: 0, duration: C.out, stagger: -0.02, ease: "power2.in" });
        if (!reduced && onScreen(card)) {
          Object.assign(clip, FULL);
          tl.to(clip, { ...edgeOf(card, CFG.radius), duration: C.sheet, ease: "hop", onUpdate: paintClip }, 0.1);
        }
        else tl.to(Q.sheet, { opacity: 0, duration: 0.3, ease: "power2.in" }, 0.1);
      }
      // Close, Esc and Back all go through history when we added an entry
      const leave = () => {
        if (cur < 0) return;
        if (pushed && history.state?.study) { history.back(); return; }
        history.replaceState(null, "", location.pathname + location.search);
        close();
      };
      window.addEventListener("popstate", (e) => {
        const slug = e.state?.study;
        const i = data.findIndex((d) => d.slug === slug);
        if (i >= 0 && cur < 0) { caseScroll && lenis.scrollTo(caseScroll(i), { immediate: true, force: true }); open(i, false); }
        else if (i < 0 && cur >= 0) { pushed = false; close(); }
      });

      // ---------- previous / next, without leaving ----------------------------
      function go(dir) {
        if (busy || cur < 0) return;
        busy = true;
        const n = (cur + dir + data.length) % data.length;
        const S = CFG.swap;
        gsap.timeline({ onComplete: () => (busy = false) })
          .to([...storyBits(), Q.shots], { y: -14, opacity: 0, duration: S.out, stagger: 0.015, ease: "power2.in" })
          .add(() => {
            cur = n;
            fill(data[n]);
            history.replaceState({ study: data[n].slug }, "", `#${data[n].slug}`);
            // the page underneath follows, so closing lands on this case
            if (caseScroll) lenis.scrollTo(caseScroll(n), { immediate: true, force: true });
            gsap.set(Q.page, { opacity: 1, filter: CFG.develop.from });
          })
          .fromTo(storyBits(), { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: S.in, stagger: 0.06, ease: "power3.out" })
          .fromTo(Q.shots, { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: S.in + 0.1, ease: "power3.out" }, "<")
          .to(Q.page, { filter: CFG.develop.to, duration: 1.3, ease: "develop" }, "<");
      }

      // ---------- wiring --------------------------------------------------------
      data.forEach((d) => d.media.addEventListener("click", (e) => {
        if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return; // new-tab clicks still visit the site
        e.preventDefault();
        open(d.i);
      }));
      Q.close.addEventListener("click", leave);
      Q.prev.addEventListener("click", () => go(-1));
      Q.next.addEventListener("click", () => go(1));
      document.addEventListener("keydown", (e) => {
        if (cur < 0) return;
        if (e.key === "Escape") leave();
        else if (e.key === "ArrowRight") go(1);
        else if (e.key === "ArrowLeft") go(-1);
        else if (e.key === "Tab") {
          // keep focus inside the study
          const f = [...st.querySelectorAll("a[href], button")].filter((el) => el.offsetParent);
          const first = f[0], last = f[f.length - 1];
          if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
          else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        }
      });
      // the window's light keeps moving as you read down the case
      Q.scroll.addEventListener("scroll", () => { if (DR.light) DR.light.extra = Q.scroll.scrollTop; }, { passive: true });

      // a shared link (#bidcentra) opens straight onto that case
      const deep = data.findIndex((d) => `#${d.slug}` === location.hash);
      if (deep >= 0) {
        history.replaceState(null, "", location.pathname + location.search);
        setTimeout(() => { caseScroll && lenis.scrollTo(caseScroll(deep), { immediate: true, force: true }); open(deep, false); }, 1600);
      }

      DR.debug = Object.assign(DR.debug || {}, { study: { open, close: leave, go } });
    },
  };
})();
