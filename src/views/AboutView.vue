<script setup>
import { ref } from 'vue'
import { RouterLink } from 'vue-router'

import ImagePlaceholder from '../components/ui/ImagePlaceholder.vue'
import { useScrollReveal } from '../composables/useScrollReveal'

const CONTACT_EMAIL = 'michaelomaleson@gmail.com'
const GITHUB = 'https://github.com/Micheal-Omale'

const experience = [
  {
    period: '2024 — NOW',
    role: 'Freelance Website Developer',
    org: 'SELF',
    blurb:
      'Building animation-rich product interfaces and AI features for startups across Africa and beyond.',
  },
  {
    period: '2023 — 2024',
    role: 'Website Developer',
    org: 'EDTECH',
    blurb:
      'Shipped the digital SIWES logbook and a fintech analytics dashboard; owned the Vue/Nuxt frontend end to end.',
  },
  {
    period: '2020 — 2023',
    role: 'Junior → Mid Website Dev',
    org: 'AGENCY',
    blurb:
      'Learned the craft on production Vue apps — components, state, performance budgets, and shipping under real constraints.',
  },
]

const capabilities = [
  { group: 'Frontend', items: ['Vue 3 / Nuxt', 'React / Next.js', 'TypeScript', 'Tailwind / CSS'] },
  { group: 'Motion', items: ['GSAP', 'Three.js / WebGL', 'Lenis', 'SVG / Canvas'] },
  { group: 'Backend', items: ['Node / Nitro', 'Supabase', 'Insforge', 'Firebase', 'REST & APIs', 'AI / LLM APIs'] },
  { group: 'Tooling', items: ['Vite', 'Git / CI', 'Storybook'] },
]

const root = ref(null)
useScrollReveal(root)

// Portrait photo — falls back to the placeholder slot if the file is missing.
const portrait = '/work/profile.webp'
const portraitFailed = ref(false)
</script>

<template>
  <main ref="root">
    <!-- Intro: eyebrow + oversized headline. Editorial left indent, as on the
         hero. -->
    <section
      class="px-[clamp(20px,5vw,72px)] pl-[clamp(72px,7vw,120px)] pb-[clamp(40px,6vh,64px)] pt-[clamp(112px,17vh,180px)]"
    >
      <div
        data-reveal
        class="font-mono text-[11px] tracking-[0.24em] text-accent"
      >
        ABOUT — MICHAEL OMALE
      </div>
      <h1
        data-reveal
        class="mt-7 font-display text-[clamp(2.6rem,8vw,7rem)] font-extrabold leading-[0.92] tracking-[-0.04em]"
      >
        I build interfaces that<br />
        feel <span class="text-accent">fast</span> and behave<br />
        for <span class="font-serif font-normal italic">real people.</span>
      </h1>
    </section>

    <!-- Portrait + bio. Base padding so the divider and portrait sit flush
         left, slightly outside the headline indent — matching the reference. -->
    <section
      class="border-t border-ink/[0.16] px-[clamp(20px,5vw,72px)] pb-[clamp(56px,9vh,110px)] pt-[clamp(40px,6vh,64px)]"
    >
      <div
        class="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] items-start gap-[clamp(32px,5vw,80px)]"
      >
        <div data-reveal>
          <div
            v-if="!portraitFailed"
            class="relative w-full overflow-hidden rounded-lg bg-ink/[0.06]"
            style="aspect-ratio: 3 / 4"
          >
            <img
              :src="portrait"
              alt="Michael Omale — portrait"
              loading="lazy"
              decoding="async"
              class="h-full w-full object-cover object-top grayscale transition-[filter,transform] duration-700 ease-out hover:grayscale-0"
              @error="portraitFailed = true"
            />
          </div>
          <ImagePlaceholder v-else label="Drop a portrait" ratio="3 / 4" />
        </div>

        <div data-reveal data-reveal-delay="120" class="flex flex-col gap-7">
          <p
            class="max-w-[30ch] text-[clamp(19px,1.7vw,24px)] font-medium leading-[1.4]"
          >
            I'm Michael, a website developer in Nigeria who likes taking
            complicated systems apart and rebuilding them so they just work.
          </p>
          <p class="max-w-[52ch] text-[15px] leading-[1.65] text-ink/[0.62]">
            Over 5+ years I've gone deep on Vue and the Nuxt ecosystem, then
            broadened into React, Next.js, and the full stack behind them. I
            care most about performance, motion that means something, and
            shipping products people in underserved markets can actually rely
            on.
          </p>
          <p class="max-w-[52ch] text-[15px] leading-[1.65] text-ink/[0.62]">
            Recently that's meant an AI job-search copilot and a digital logbook
            serving 200+ university students — and a lot of GSAP, Three.js, and
            Lenis in between.
          </p>
          <div
            class="mt-2 flex flex-wrap gap-8 font-mono text-[11px] tracking-[0.16em]"
          >
            <a
              :href="GITHUB"
              data-cursor
              target="_blank"
              rel="noopener"
              class="inline-flex items-center gap-1.5 border-b border-ink/30 pb-1"
            >
              GITHUB <span>↗</span>
            </a>
            <a
              :href="`mailto:${CONTACT_EMAIL}`"
              data-cursor
              class="inline-flex items-center gap-1.5 border-b border-ink/30 pb-1"
            >
              EMAIL <span>↗</span>
            </a>
          </div>
        </div>
      </div>
    </section>

    <!-- Experience timeline -->
    <section
      class="px-[clamp(20px,5vw,72px)] pt-[clamp(48px,8vh,96px)]"
    >
      <div
        data-reveal
        class="mb-8 font-mono text-[11px] tracking-[0.22em] text-ink/45"
      >
        — EXPERIENCE
      </div>

      <ul>
        <li
          v-for="item in experience"
          :key="item.role"
          data-reveal
          class="grid grid-cols-1 items-start gap-x-8 gap-y-4 border-t border-ink/[0.16] py-[clamp(28px,4.5vh,48px)] min-[760px]:grid-cols-[130px_minmax(0,1fr)_auto]"
        >
          <span
            class="font-mono text-[11px] tracking-[0.14em] text-ink/50 min-[760px]:pt-2"
          >
            {{ item.period }}
          </span>
          <div>
            <h3
              class="font-display text-[clamp(22px,2.4vw,30px)] font-bold tracking-[-0.02em]"
            >
              {{ item.role }}
            </h3>
            <p class="mt-3 max-w-[46ch] text-[15px] leading-[1.6] text-ink/[0.6]">
              {{ item.blurb }}
            </p>
          </div>
          <span
            class="font-mono text-[11px] tracking-[0.14em] text-ink/40 min-[760px]:pt-2 min-[760px]:text-right"
          >
            {{ item.org }}
          </span>
        </li>
      </ul>
    </section>

    <!-- Capabilities -->
    <section class="px-[clamp(20px,5vw,72px)] pt-[clamp(56px,9vh,110px)]">
      <div
        data-reveal
        class="mb-10 font-mono text-[11px] tracking-[0.22em] text-ink/45"
      >
        — CAPABILITIES
      </div>

      <div
        class="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-x-8 gap-y-12"
      >
        <div v-for="col in capabilities" :key="col.group" data-reveal>
          <h3
            class="mb-5 font-display text-[19px] font-bold tracking-[-0.01em]"
          >
            {{ col.group }}
          </h3>
          <ul class="flex flex-col gap-2.5">
            <li
              v-for="item in col.items"
              :key="item"
              class="text-[15px] text-ink/[0.62]"
            >
              {{ item }}
            </li>
          </ul>
        </div>
      </div>
    </section>

    <!-- CTA -->
    <section
      class="px-[clamp(20px,5vw,72px)] pb-[clamp(80px,14vh,180px)] pt-[clamp(56px,10vh,120px)]"
    >
      <div data-reveal class="flex justify-center">
        <RouterLink
          to="/work"
          data-cursor
          class="inline-flex items-center gap-3 rounded-full border border-ink px-[30px] py-4 font-mono text-[13px] tracking-[0.18em] transition-colors hover:bg-ink hover:text-paper"
        >
          SEE THE WORK <span>→</span>
        </RouterLink>
      </div>
    </section>
  </main>
</template>
