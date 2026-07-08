<script setup>
import { computed } from 'vue'

const props = defineProps({
  project: { type: Object, required: true },
  index: { type: Number, required: true },
})

// Gentle stagger as rows scroll into view.
const revealDelay = computed(() => props.index * 60)
const ariaLabel = computed(
  () =>
    `${props.project.title} — ${props.project.tag}` +
    (props.project.comingSoon ? ', coming soon' : '') +
    ', opens in a new tab',
)
</script>

<template>
  <a
    :href="project.link"
    target="_blank"
    rel="noopener noreferrer"
    data-reveal
    data-cursor
    :data-reveal-delay="revealDelay"
    :aria-label="ariaLabel"
    class="grid grid-cols-[88px_1fr_auto] items-center gap-5 border-b border-ink/20 px-2 py-[clamp(22px,3.4vw,40px)] pl-2 transition-[padding] duration-[400ms] ease-[cubic-bezier(0.16,1,0.3,1)] hover:pl-6"
  >
    <span class="font-mono text-[13px] tracking-[0.1em] text-ink/50">
      {{ project.n }}
    </span>

    <div class="flex flex-wrap items-baseline gap-x-5 gap-y-1">
      <h3
        class="font-display text-[clamp(30px,6vw,68px)] font-bold leading-none tracking-[-0.03em]"
      >
        {{ project.title }}
      </h3>
      <span class="font-mono text-[11px] tracking-[0.14em] text-ink/50">
        {{ project.tag }}
      </span>
    </div>

    <div class="flex items-center gap-5">
      <span
        v-if="project.comingSoon"
        class="whitespace-nowrap rounded-full bg-accent px-3 py-1 font-mono text-[11px] font-medium tracking-[0.16em] text-paper"
      >
        COMING SOON
      </span>
      <span class="text-[26px] leading-none text-accent">↗</span>
    </div>
  </a>
</template>
