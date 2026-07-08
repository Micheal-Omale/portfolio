<script setup>
// Stands in for a project screenshot until real assets are dropped in.
// Mirrors the mockup's empty slot: a softly tinted, rounded box with a
// centered image-icon glyph above a label.
defineProps({
  label: { type: String, default: 'Image' },
  ratio: { type: String, default: '4 / 3' },
})
</script>

<template>
  <div
    class="relative w-full overflow-hidden rounded-lg bg-ink/[0.06]"
    :style="{ aspectRatio: ratio }"
  >
    <div
      class="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center"
    >
      <svg
        class="h-7 w-7 text-ink/25"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <path d="m21 15-4.5-4.5L5 21" />
      </svg>
      <span class="font-mono text-[11px] tracking-[0.14em] text-ink/35">
        {{ label }}
      </span>
    </div>
  </div>
</template>
