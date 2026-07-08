<script setup>
import { ref } from 'vue'

import HeroSection from '../components/sections/HeroSection.vue'
import MarqueeBand from '../components/sections/MarqueeBand.vue'
import AboutTeaser from '../components/sections/AboutTeaser.vue'
import FeaturedWorks from '../components/sections/FeaturedWorks.vue'
import ContactBand from '../components/sections/ContactBand.vue'
import { useScrollReveal } from '../composables/useScrollReveal'

const root = ref(null)
useScrollReveal(root)
</script>

<template>
  <main ref="root">
    <HeroSection />
    <MarqueeBand />
    <AboutTeaser />
    <FeaturedWorks />
    <ContactBand />
  </main>
</template>
