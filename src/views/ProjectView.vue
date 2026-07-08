<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'

import { getProject } from '../data/projects'

const props = defineProps({
  project: { type: String, required: true },
})

const active = computed(() => getProject(props.project))
</script>

<template>
  <main
    class="flex min-h-screen flex-col justify-center px-[clamp(20px,5vw,72px)] pb-[clamp(80px,12vh,160px)] pl-[clamp(72px,7vw,120px)] pt-[160px]"
  >
    <RouterLink
      to="/work"
      data-cursor
      class="mb-11 inline-flex items-center gap-2.5 font-mono text-xs tracking-[0.16em] text-ink/60"
    >
      ← ALL WORK
    </RouterLink>

    <template v-if="active">
      <div class="font-mono text-[11px] tracking-[0.18em] text-accent">
        {{ active.tag }} / {{ active.year }}
      </div>
      <h1
        class="mt-5 font-display text-[clamp(3.4rem,13vw,13rem)] font-extrabold leading-[0.84] tracking-[-0.045em]"
      >
        {{ active.title }}
      </h1>
      <p
        class="mt-7 max-w-[34ch] text-[clamp(19px,2vw,28px)] font-medium leading-[1.4]"
      >
        {{ active.lead }}
      </p>
    </template>

    <template v-else>
      <h1
        class="font-display text-[clamp(2.6rem,7.5vw,7rem)] font-extrabold leading-[0.9] tracking-[-0.04em]"
      >
        Project not found.
      </h1>
    </template>
  </main>
</template>
