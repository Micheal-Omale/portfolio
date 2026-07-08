import { ref, onMounted, onBeforeUnmount } from 'vue'

/**
 * Tracks how far the document is scrolled, as a 0–1 ratio and a padded
 * percentage string ("000"–"100"). Drives the scroll ruler.
 */
export function useScrollProgress() {
  const progress = ref(0)
  const percent = ref('000')

  const update = () => {
    const doc = document.documentElement
    const max = doc.scrollHeight - doc.clientHeight
    const ratio = max > 0 ? doc.scrollTop / max : 0
    progress.value = ratio
    percent.value = String(Math.round(ratio * 100)).padStart(3, '0')
  }

  onMounted(() => {
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update, { passive: true })
    update()
  })

  onBeforeUnmount(() => {
    window.removeEventListener('scroll', update)
    window.removeEventListener('resize', update)
  })

  return { progress, percent }
}
