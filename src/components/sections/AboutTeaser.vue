<script setup>
import { RouterLink } from 'vue-router'

import PillTag from '../ui/PillTag.vue'

const topics = ['Interfaces', 'Motion', 'AI', 'Full-stack']
</script>

<template>
  <section
    class="px-[clamp(20px,5vw,72px)] py-[clamp(80px,12vh,160px)] pl-[clamp(72px,7vw,120px)]"
  >
    <div
      data-reveal
      class="mb-10 font-mono text-[11px] tracking-[0.24em] text-accent"
    >
      [ 01 ] — ABOUT ME
    </div>

    <div
      class="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] items-start gap-[clamp(32px,5vw,80px)]"
    >
      <p
        data-reveal
        class="max-w-[20ch] font-display text-[clamp(24px,3vw,40px)] font-medium leading-[1.22] tracking-[-0.02em]"
      >
        I take complicated systems apart and rebuild them so they
        <span class="text-accent">just work.</span>
      </p>

      <div
        data-reveal
        data-reveal-delay="120"
        class="flex flex-col gap-6"
      >
        <p class="max-w-[52ch] text-[17px] leading-[1.6] text-ink/[0.72]">
          I'm a website developer with 5+ years of Vue.js experience and
          full-stack capability across the Nuxt ecosystem. I ship complete
          products end to end — from an AI job-search copilot to a digital
          logbook serving 200+ Nigerian university students.
        </p>
        <p class="max-w-[52ch] text-[17px] leading-[1.6] text-ink/[0.72]">
          My focus: performance, animation-rich interfaces, AI integration, and
          building things people actually rely on.
        </p>
        <div class="mt-1 flex flex-wrap gap-2.5">
          <PillTag v-for="topic in topics" :key="topic" variant="soft">
            {{ topic }}
          </PillTag>
        </div>
        <RouterLink
          to="/about"
          data-cursor
          class="mt-2 inline-flex items-center gap-2.5 font-mono text-xs tracking-[0.16em]"
        >
          MORE ABOUT ME <span>→</span>
        </RouterLink>
      </div>
    </div>
  </section>
</template>
