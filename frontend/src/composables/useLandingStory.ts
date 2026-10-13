import { onBeforeUnmount, onMounted, readonly, shallowRef, type Ref } from 'vue'

export function useLandingStory(root: Ref<HTMLElement | null>, initialSection = 'overview') {
  const activeSection = shallowRef(initialSection)
  const enhanced = shallowRef(false)
  let sectionObserver: IntersectionObserver | undefined
  let revealObserver: IntersectionObserver | undefined
  let reducedMotion: MediaQueryList | undefined

  const showAllSections = () => {
    root.value
      ?.querySelectorAll<HTMLElement>('[data-story-reveal]')
      .forEach((element) => element.classList.add('is-story-visible'))
  }

  const handleMotionPreference = (event: MediaQueryListEvent) => {
    if (!event.matches) return
    revealObserver?.disconnect()
    showAllSections()
  }

  onMounted(() => {
    const storyRoot = root.value
    if (!storyRoot) return

    document.documentElement.classList.add('landing-scroll')
    reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')

    const sections = Array.from(storyRoot.querySelectorAll<HTMLElement>('[data-story-section]'))
    const revealSections = Array.from(storyRoot.querySelectorAll<HTMLElement>('[data-story-reveal]'))

    if ('IntersectionObserver' in window) {
      const visibleSections = new Set<HTMLElement>()
      sectionObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            const section = entry.target as HTMLElement
            if (entry.isIntersecting) visibleSections.add(section)
            else visibleSections.delete(section)
          })

          const nearest = [...visibleSections].sort(
            (a, b) =>
              Math.abs(a.getBoundingClientRect().top - window.innerHeight * 0.36) -
              Math.abs(b.getBoundingClientRect().top - window.innerHeight * 0.36),
          )[0]
          if (nearest?.id) activeSection.value = nearest.id
        },
        { rootMargin: '-28% 0px -58% 0px', threshold: 0 },
      )
      sections.forEach((section) => sectionObserver?.observe(section))
    }

    if (reducedMotion.matches || !('IntersectionObserver' in window)) {
      showAllSections()
    } else {
      revealObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return
            const element = entry.target as HTMLElement
            element.classList.add('is-story-visible')
            revealObserver?.unobserve(element)
          })
        },
        { rootMargin: '0px 0px -12% 0px', threshold: 0.12 },
      )
      revealSections.forEach((section) => revealObserver?.observe(section))
    }

    reducedMotion.addEventListener('change', handleMotionPreference)
    enhanced.value = true
  })

  onBeforeUnmount(() => {
    document.documentElement.classList.remove('landing-scroll')
    sectionObserver?.disconnect()
    revealObserver?.disconnect()
    reducedMotion?.removeEventListener('change', handleMotionPreference)
  })

  return { activeSection: readonly(activeSection), enhanced: readonly(enhanced) }
}
