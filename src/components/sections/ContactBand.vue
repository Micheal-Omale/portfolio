<script setup>
const CONTACT_EMAIL = 'michaelomaleson@gmail.com'
const PHONE = '+2349052175710'
const PHONE_DISPLAY = '+234 905 217 5710'
</script>

<template>
  <section
    id="contact"
    class="bg-ink px-[clamp(20px,5vw,72px)] py-[clamp(80px,14vh,180px)] text-paper"
  >
    <div
      data-reveal
      class="mb-8 font-mono text-[11px] tracking-[0.24em] text-accent"
    >
      [ 02 ] — LET'S TALK
    </div>

    <a
      :href="`mailto:${CONTACT_EMAIL}`"
      data-reveal
      data-cursor
      class="block font-display text-[clamp(2.6rem,11vw,10rem)] font-extrabold leading-[0.86] tracking-[-0.045em] text-paper transition-colors hover:text-accent"
    >
      LET'S<br />
      <span class="inline-flex items-center gap-[0.12em]">
        BUILD
        <svg
          class="h-[0.42em] w-[1.5em] shrink-0"
          viewBox="0 0 48 14"
          fill="none"
          stroke="currentColor"
          stroke-width="1.6"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M0 7h40M34 1.5 46 7l-12 5.5" />
        </svg>
      </span>
    </a>

    <p
      data-reveal
      class="mt-10 max-w-[56ch] text-[clamp(17px,1.6vw,21px)] leading-[1.55] text-paper/75"
    >
      Open to new work. Most energized by interfaces where speed, motion, and
      reliability actually matter. Email is the fastest way to reach me.
    </p>

    <div
      data-reveal
      class="mt-9 flex flex-wrap gap-[26px] font-mono text-xs tracking-[0.14em]"
    >
      <a :href="`mailto:${CONTACT_EMAIL}`" data-cursor class="text-paper">{{
        CONTACT_EMAIL
      }}</a>
      <a :href="`tel:${PHONE}`" data-cursor class="text-paper">{{
        PHONE_DISPLAY
      }}</a>
    </div>
  </section>
</template>
