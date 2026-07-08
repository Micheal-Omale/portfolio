<script setup>
import { computed, ref } from 'vue'

import ImagePlaceholder from '../ui/ImagePlaceholder.vue'

const props = defineProps({
  project: { type: Object, required: true },
  index: { type: Number, required: true },
})

const number = computed(() => String(props.index + 1).padStart(2, '0'))
// Stagger every other card, as in the reference.
const revealDelay = computed(() => (props.index % 2 === 1 ? 80 : 0))

// Fall back to the placeholder slot if a real screenshot fails to load.
const imageFailed = ref(false)
</script>

<template>
  <a
    :href="project.link"
    target="_blank"
    rel="noopener noreferrer"
    data-reveal
    data-cursor
    :data-reveal-delay="revealDelay"
    class="group flex flex-col gap-5"
  >
    <div class="flex items-baseline justify-between">
      <span class="font-mono text-[11px] tracking-[0.16em]"
        >PROJECT {{ number }}</span
      >
      <span class="font-mono text-[11px] tracking-[0.16em] text-ink/50">{{
        project.tag
      }}</span>
    </div>

    <div
      v-if="project.image && !imageFailed"
      class="relative w-full overflow-hidden rounded-lg bg-ink/[0.06] shadow-[0_18px_45px_-24px_rgba(23,21,14,0.45)] transition-[transform,box-shadow] duration-500 ease-out group-hover:-translate-y-1 group-hover:shadow-[0_30px_65px_-24px_rgba(23,21,14,0.55)]"
      style="aspect-ratio: 4 / 3"
    >
      <img
        :src="project.image"
        :alt="`${project.title} — screenshot`"
        loading="lazy"
        decoding="async"
        class="h-full w-full object-cover object-top transition-transform duration-700 ease-out group-hover:scale-[1.03]"
        @error="imageFailed = true"
      />
    </div>
    <ImagePlaceholder
      v-else
      :label="`Drop ${project.title} screenshot`"
      ratio="4 / 3"
    />

    <div>
      <h3
        class="mb-2 font-display text-[clamp(28px,3.4vw,40px)] font-bold tracking-[-0.02em]"
      >
        {{ project.title }}
      </h3>
      <p class="max-w-[42ch] text-[16px] leading-[1.5] text-ink/[0.68]">
        {{ project.lead }}
      </p>
    </div>
  </a>
</template>
