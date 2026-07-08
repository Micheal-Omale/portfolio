import { onMounted, onBeforeUnmount } from 'vue'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * Reveals every `[data-reveal]` element inside `rootRef` as it scrolls into
 * view — a soft rise + fade. Honours an optional `data-reveal-delay` (ms) on
 * each element. All ScrollTriggers are killed on unmount.
 */
export function useScrollReveal(rootRef) {
  let context

  onMounted(() => {
    const root = rootRef.value
    if (!root) return

    if (prefersReducedMotion()) return

    context = gsap.context(() => {
      const elements = root.querySelectorAll('[data-reveal]')
      elements.forEach((element) => {
        const delay =
          parseInt(element.getAttribute('data-reveal-delay') || '0', 10) / 1000

        gsap.fromTo(
          element,
          { opacity: 0, y: 26 },
          {
            opacity: 1,
            y: 0,
            duration: 0.85,
            delay,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: element,
              start: 'top 94%',
              toggleActions: 'play none none none',
            },
          },
        )
      })
    }, root)
  })

  onBeforeUnmount(() => {
    context?.revert()
  })
}
