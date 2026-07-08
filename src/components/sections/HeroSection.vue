<script setup>
import PillTag from '../ui/PillTag.vue'

const CONTACT_EMAIL = 'michaelomaleson@gmail.com'
const tech = ['VUE', 'NUXT', 'REACT', 'NEXT.JS']
</script>

<template>
  <section
    class="flex min-h-screen flex-col justify-end px-[clamp(20px,5vw,72px)] pb-12 pl-[clamp(72px,7vw,120px)] pt-[120px]"
  >
    <!-- Status row -->
    <div class="mb-auto flex flex-wrap items-start justify-between gap-4">
      <div class="font-mono text-[11px] leading-[1.9] tracking-[0.2em] text-ink/55">
        MOST RECENTLY — FREELANCE<br />PREVIOUSLY — DIGITAL LOGBOOK
      </div>
      <div
        class="flex items-center gap-2.5 font-mono text-[11px] tracking-[0.2em] text-accent"
      >
        <span
          class="h-[7px] w-[7px] rounded-full bg-accent animate-[mo-pulse_2s_ease-in-out_infinite]"
        ></span>
        AVAILABLE FOR NEW WORK
      </div>
    </div>

    <!-- Name: "MICHAEL" sits in paper on a coral panel; "OMALE." drops below
         in ink and overlaps the panel's lower edge. -->
    <div data-reveal class="mt-[6vh]">
      <div
        class="mb-1.5 pl-1 font-serif text-[clamp(20px,3vw,32px)] italic text-ink/55"
      >
        my name is
      </div>
      <h1 class="mo-hero-name m-0 font-display font-extrabold">
        <span class="mo-hero-panel">MICHAEL</span>
        <span class="mo-hero-line-2"
          >OMALE<span class="text-accent">.</span></span
        >
      </h1>
    </div>

    <!-- Meta + intro + CTA -->
    <div
      class="mt-[6vh] grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] items-end gap-8"
    >
      <div>
        <div
          class="mb-1.5 font-mono text-[11px] tracking-[0.2em] text-ink/50"
        >
          NIGERIA · WAT
        </div>
        <div class="font-mono text-[11px] tracking-[0.2em]">
          FRONTEND ENGINEER
        </div>
      </div>

      <p
        class="max-w-[44ch] text-[clamp(18px,1.7vw,23px)] font-medium leading-[1.4]"
      >
        I build fast, animation-rich interfaces — and the systems behind them —
        for
        <span class="font-serif font-normal italic"
          >real users in underserved markets.</span
        >
      </p>

      <div class="flex flex-col items-start gap-3.5">
        <a
          :href="`mailto:${CONTACT_EMAIL}`"
          data-cursor
          class="inline-flex items-center gap-3 rounded-full bg-ink px-[26px] py-4 font-mono text-xs tracking-[0.18em] text-paper transition-colors hover:bg-accent hover:text-paper"
        >
          CONTACT ME <span class="text-[15px]">↗</span>
        </a>
        <div class="flex flex-wrap gap-2">
          <PillTag v-for="item in tech" :key="item">{{ item }}</PillTag>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.mo-hero-name {
  font-size: clamp(3.2rem, 15vw, 15rem);
  line-height: 0.84;
  letter-spacing: -0.045em;
}

/* "MICHAEL" — ink, no background panel. */
.mo-hero-panel {
  display: block;
  color: var(--color-ink);
}

/* "OMALE." — ink, on its own line. */
.mo-hero-line-2 {
  display: block;
  color: var(--color-ink);
}
</style>
