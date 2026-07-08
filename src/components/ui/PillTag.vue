<script setup>
// Small mono label pill. `outline` = bordered (hero tech tags),
// `soft` = filled tint (about-teaser topic tags).
defineProps({
  variant: {
    type: String,
    default: 'outline',
    validator: (value) => ['outline', 'soft'].includes(value),
  },
})
</script>

<template>
  <span
    class="inline-block rounded-full font-mono uppercase"
    :class="
      variant === 'outline'
        ? 'border border-ink/25 px-3 py-1.5 text-[10px] tracking-[0.14em]'
        : 'bg-ink/[0.06] px-3.5 py-2 text-[11px] tracking-[0.12em]'
    "
  >
    <slot />
  </span>
</template>
