import { onMounted, onBeforeUnmount } from 'vue'
import gsap from 'gsap'

/**
 * Trailing custom cursor: a lagging accent ring plus a near-instant dot.
 * Grows and fills over any `[data-cursor]` element. Only runs on precise
 * pointers (mouse/trackpad) and stays out of the way under reduced-motion.
 */
export function useCustomCursor() {
  let quickTo
  let ring
  let dot
  let onMove
  let onOver
  let onLeave

  onMounted(() => {
    const finePointer =
      window.matchMedia && window.matchMedia('(pointer: fine)').matches
    const reducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches
    if (!finePointer || reducedMotion) return

    document.body.setAttribute('data-custom-cursor', '')

    ring = document.createElement('div')
    ring.setAttribute('data-cursor-ring', '')
    Object.assign(ring.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      width: '34px',
      height: '34px',
      border: '1.5px solid var(--accent)',
      borderRadius: '50%',
      pointerEvents: 'none',
      zIndex: '99999',
      transform: 'translate(-50%, -50%)',
      transition:
        'width .28s cubic-bezier(.16,1,.3,1), height .28s cubic-bezier(.16,1,.3,1), background-color .28s, opacity .3s',
      opacity: '0',
    })

    dot = document.createElement('div')
    Object.assign(dot.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      width: '5px',
      height: '5px',
      background: 'var(--accent)',
      borderRadius: '50%',
      pointerEvents: 'none',
      zIndex: '99999',
      transform: 'translate(-50%, -50%)',
      opacity: '0',
    })

    document.body.appendChild(ring)
    document.body.appendChild(dot)

    // gsap.quickTo gives us a cheap, framerate-independent trailing lerp.
    const ringX = gsap.quickTo(ring, 'left', { duration: 0.5, ease: 'power3' })
    const ringY = gsap.quickTo(ring, 'top', { duration: 0.5, ease: 'power3' })
    const dotX = gsap.quickTo(dot, 'left', { duration: 0.12, ease: 'power3' })
    const dotY = gsap.quickTo(dot, 'top', { duration: 0.12, ease: 'power3' })
    quickTo = { ringX, ringY, dotX, dotY }

    onMove = (event) => {
      ringX(event.clientX)
      ringY(event.clientY)
      dotX(event.clientX)
      dotY(event.clientY)
      ring.style.opacity = '1'
      dot.style.opacity = '1'
    }

    onLeave = () => {
      ring.style.opacity = '0'
      dot.style.opacity = '0'
    }

    onOver = (event) => {
      const interactive = event.target.closest?.('[data-cursor], a, button')
      if (interactive) {
        ring.style.width = '58px'
        ring.style.height = '58px'
        ring.style.backgroundColor = 'var(--accent)'
        ring.style.opacity = '0.18'
      } else {
        ring.style.width = '34px'
        ring.style.height = '34px'
        ring.style.backgroundColor = 'transparent'
        ring.style.opacity = '1'
      }
    }

    window.addEventListener('mousemove', onMove, { passive: true })
    document.addEventListener('mouseleave', onLeave)
    document.addEventListener('mouseover', onOver)
  })

  onBeforeUnmount(() => {
    if (onMove) window.removeEventListener('mousemove', onMove)
    if (onLeave) document.removeEventListener('mouseleave', onLeave)
    if (onOver) document.removeEventListener('mouseover', onOver)
    ring?.remove()
    dot?.remove()
    document.body.removeAttribute('data-custom-cursor')
  })
}
