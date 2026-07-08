<script setup>
import { ref } from 'vue'

import { projects, projectCount } from '../data/projects'
import { useScrollReveal } from '../composables/useScrollReveal'
import WorkRow from '../components/sections/WorkRow.vue'

const root = ref(null)
useScrollReveal(root)
</script>

<template>
  <main ref="root">
    <section
      class="px-[clamp(20px,5vw,72px)] pb-[clamp(50px,7vh,90px)] pl-[clamp(72px,7vw,120px)] pt-[160px]"
    >
      <div
        data-reveal
        class="mb-7 font-mono text-[11px] tracking-[0.24em] text-accent"
      >
        SELECTED WORK — {{ projectCount }} PROJECTS
      </div>
      <h1
        data-reveal
        class="font-display text-[clamp(3rem,12vw,11rem)] font-extrabold leading-[0.86] tracking-[-0.045em]"
      >
        THE<br />WORK<span class="text-accent">.</span>
      </h1>
    </section>

    <section class="px-[clamp(20px,5vw,72px)] pb-[clamp(80px,12vh,160px)]">
      <div class="border-t border-ink/20">
        <WorkRow
          v-for="(project, index) in projects"
          :key="project.id"
          :project="project"
          :index="index"
        />
      </div>

      <a
        href="https://github.com/Micheal-Omale"
        target="_blank"
        rel="noopener noreferrer"
        data-reveal
        data-cursor
        class="mt-10 inline-flex items-center gap-2.5 font-mono text-[12px] tracking-[0.16em] text-ink/60 transition-colors hover:text-accent"
      >
        FULL ARCHIVE ON GITHUB <span>↗</span>
      </a>
    </section>
  </main>
</template>
