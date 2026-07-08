<script setup>
import { RouterLink } from 'vue-router'

import { projects } from '../../data/projects'
import ProjectCard from './ProjectCard.vue'

const featured = projects.slice(0, 4)
</script>

<template>
  <section class="px-[clamp(20px,5vw,72px)] pb-[clamp(80px,12vh,160px)]">
    <div
      class="mb-14 flex flex-wrap items-end justify-between gap-4 border-t border-ink/[0.16] pt-8"
    >
      <h2
        data-reveal
        class="font-display text-[clamp(2.6rem,8vw,7rem)] font-extrabold leading-[0.86] tracking-[-0.04em]"
      >
        FEATURED<br />WORKS
      </h2>
      <p
        data-reveal
        class="max-w-[34ch] text-right font-mono text-xs leading-[1.7] tracking-[0.06em] text-ink/60"
      >
        Payments, search, AI, education. Products built end to end and kept
        running.
      </p>
    </div>

    <div
      class="grid grid-cols-[repeat(auto-fit,minmax(min(100%,420px),1fr))] gap-[clamp(24px,3vw,44px)]"
    >
      <ProjectCard
        v-for="(project, index) in featured"
        :key="project.id"
        :project="project"
        :index="index"
      />
    </div>

    <div data-reveal class="mt-14 flex justify-center">
      <RouterLink
        to="/work"
        data-cursor
        class="inline-flex items-center gap-3 rounded-full border border-ink px-[30px] py-4 font-mono text-[13px] tracking-[0.18em] transition-colors hover:bg-ink hover:text-paper"
      >
        ALL WORK <span>→</span>
      </RouterLink>
    </div>
  </section>
</template>
