<script setup>
import TheNav from './components/layout/TheNav.vue'
import ScrollRuler from './components/layout/ScrollRuler.vue'
import SiteFooter from './components/layout/SiteFooter.vue'
import { useCustomCursor } from './composables/useCustomCursor'

// Global chrome: the trailing custom cursor lives for the whole session.
useCustomCursor()
</script>

<template>
  <div class="relative min-h-screen">
    <TheNav />
    <ScrollRuler />

    <RouterView v-slot="{ Component }">
      <component :is="Component" />
    </RouterView>

    <SiteFooter />
  </div>
</template>
