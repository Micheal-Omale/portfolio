<script setup>
import { computed } from 'vue'

import { useScrollProgress } from '../../composables/useScrollProgress'

const { progress, percent } = useScrollProgress()

// Marker travels between 6% and 92% of the rail, matching the reference.
const markerTop = computed(() => `${6 + progress.value * 86}%`)
</script>

<template>
  <div
    class="pointer-events-none fixed left-0 top-0 z-40 hidden h-screen w-16 flex-col items-center justify-between border-r border-ink/[0.12] pb-8 pt-24 mix-blend-multiply min-[861px]:flex"
    aria-hidden="true"
  >
    <div
      class="font-mono text-[9px] tracking-[0.24em] text-ink/50 [writing-mode:vertical-rl]"
    >
      SCROLL POSITION
    </div>

    <div class="relative my-5 w-px flex-1 bg-ink/[0.16]">
      <div
        class="absolute left-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-1.5"
        :style="{ top: markerTop }"
      >
        <div class="h-px w-3.5 bg-accent"></div>
        <div class="h-[7px] w-[7px] rounded-full bg-accent"></div>
      </div>
    </div>

    <div class="flex flex-col items-center gap-1">
      <div class="font-mono text-xs font-bold text-accent">{{ percent }}</div>
      <div class="font-mono text-[8px] tracking-[0.2em] text-ink/45">PCT</div>
    </div>
  </div>
</template>
