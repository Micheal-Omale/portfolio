<script setup>
const phrases = [
  'FRONTEND DEVELOPMENT',
  'MOTION & INTERACTION',
  'AI INTEGRATION',
  'WEBGL & THREE.JS',
]
// Rendered twice so the -50% translate loops seamlessly.
const track = [...phrases, ...phrases]
</script>

<template>
  <div class="overflow-hidden whitespace-nowrap bg-ink py-[22px] text-paper">
    <div
      class="mo-marquee inline-flex items-center will-change-transform"
    >
      <template v-for="(phrase, index) in track" :key="index">
        <span
          class="px-7 font-display text-[clamp(26px,4vw,44px)] font-semibold tracking-[-0.02em]"
          >{{ phrase }}</span
        >
        <span class="text-[26px] text-accent">✦</span>
      </template>
    </div>
  </div>
</template>

<style scoped>
.mo-marquee {
  animation: mo-marquee 34s linear infinite;
}
@media (prefers-reduced-motion: reduce) {
  .mo-marquee {
    animation: none;
  }
}
</style>
