<script setup>
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'

const CONTACT_EMAIL = 'michaelomaleson@gmail.com'

const menuOpen = ref(false)
const route = useRoute()

// Close the overlay whenever navigation lands on a new route.
watch(
  () => route.fullPath,
  () => {
    menuOpen.value = false
  },
)

const links = [
  { label: 'HOME', to: '/' },
  { label: 'ABOUT', to: '/about' },
  { label: 'WORK', to: '/work' },
]
</script>

<template>
  <header
    class="fixed inset-x-0 top-0 z-50 flex items-center justify-between px-[clamp(20px,5vw,72px)] py-5 mix-blend-multiply"
  >
    <RouterLink
      to="/"
      data-cursor
      class="flex items-center gap-2.5"
      aria-label="Michael Omale — home"
    >
      <span
        class="font-display text-xl font-extrabold tracking-[-0.03em]"
        >Michael Omale</span
      >
      <span
        class="h-[7px] w-[7px] rounded-full bg-accent animate-[mo-pulse_2.4s_ease-in-out_infinite]"
      ></span>
    </RouterLink>

    <nav class="hidden items-center gap-[34px] min-[861px]:flex">
      <RouterLink
        v-for="link in links"
        :key="link.to"
        :to="link.to"
        data-cursor
        class="font-mono text-xs tracking-[0.16em] transition-colors hover:text-accent"
      >
        {{ link.label }}
      </RouterLink>
      <a
        :href="`mailto:${CONTACT_EMAIL}`"
        data-cursor
        class="rounded-full border border-ink px-4 py-2 font-mono text-xs tracking-[0.16em] transition-colors hover:bg-ink hover:text-paper"
      >
        CONTACT
      </a>
    </nav>

    <button
      type="button"
      data-cursor
      class="font-mono text-xs tracking-[0.16em] min-[861px]:hidden"
      @click="menuOpen = true"
    >
      MENU
    </button>
  </header>

  <!-- Fullscreen mobile menu -->
  <Transition name="mo-menu">
    <div
      v-if="menuOpen"
      class="fixed inset-0 z-[60] flex flex-col bg-ink px-[clamp(20px,5vw,72px)] py-6 text-paper"
    >
      <div class="flex items-center justify-between">
        <span class="font-display text-xl font-extrabold">Michael Omale</span>
        <button
          type="button"
          data-cursor
          class="font-mono text-xs tracking-[0.16em]"
          @click="menuOpen = false"
        >
          CLOSE
        </button>
      </div>

      <nav class="flex flex-1 flex-col justify-center gap-2">
        <RouterLink
          v-for="link in links"
          :key="link.to"
          :to="link.to"
          data-cursor
          class="font-display text-[clamp(48px,14vw,96px)] font-bold leading-[0.95] tracking-[-0.03em] transition-colors hover:text-accent"
        >
          {{ link.label.charAt(0) + link.label.slice(1).toLowerCase() }}
        </RouterLink>
      </nav>

      <a
        :href="`mailto:${CONTACT_EMAIL}`"
        data-cursor
        class="font-mono text-[13px] tracking-[0.14em] text-accent"
      >
        {{ CONTACT_EMAIL }}
      </a>
    </div>
  </Transition>
</template>

<style scoped>
.mo-menu-enter-active,
.mo-menu-leave-active {
  transition: opacity 0.35s ease;
}
.mo-menu-enter-from,
.mo-menu-leave-to {
  opacity: 0;
}
</style>
