<script setup>
const CONTACT_EMAIL = 'michaelomaleson@gmail.com'
const PHONE = '+2349052175710'
const GITHUB = 'https://github.com/Micheal-Omale'

const scrollTop = () => {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}
</script>

<template>
  <footer
    class="bg-ink px-[clamp(20px,5vw,72px)] pb-8 pt-[clamp(48px,7vh,80px)] text-paper"
  >
    <div
      class="flex flex-wrap items-start justify-between gap-8 border-t border-paper/[0.16] pt-10"
    >
      <div class="max-w-[38ch]">
        <div class="mb-4 flex items-center gap-2.5">
          <span class="font-display text-[22px] font-extrabold">Michael Omale</span>
          <span class="h-[7px] w-[7px] rounded-full bg-accent"></span>
        </div>
        <p class="text-[15px] leading-[1.55] text-paper/65">
          Open to contract work, full-time roles, and interesting conversations
          about hard interface problems.
        </p>
      </div>

      <div class="flex flex-wrap gap-12">
        <div
          class="flex flex-col gap-3 font-mono text-xs tracking-[0.12em]"
        >
          <span class="text-paper/40">SITEMAP</span>
          <RouterLink to="/" data-cursor>HOME</RouterLink>
          <RouterLink to="/about" data-cursor>ABOUT</RouterLink>
          <RouterLink to="/work" data-cursor>WORK</RouterLink>
        </div>
        <div
          class="flex flex-col gap-3 font-mono text-xs tracking-[0.12em]"
        >
          <span class="text-paper/40">ELSEWHERE</span>
          <a :href="GITHUB" data-cursor target="_blank" rel="noopener"
            >GITHUB ↗</a
          >
          <a :href="`mailto:${CONTACT_EMAIL}`" data-cursor>EMAIL ↗</a>
          <a :href="`tel:${PHONE}`" data-cursor>PHONE ↗</a>
        </div>
      </div>
    </div>

    <div
      class="mt-12 flex flex-wrap items-center justify-between gap-3 font-mono text-[11px] tracking-[0.14em] text-paper/50"
    >
      <span>© 2026 MICHAEL OMALE</span>
      <button type="button" data-cursor class="text-paper/50" @click="scrollTop">
        BACK TO TOP ↑
      </button>
    </div>
  </footer>
</template>
