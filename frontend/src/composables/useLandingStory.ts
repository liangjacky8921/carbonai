import { onBeforeUnmount, onMounted, readonly, shallowRef, type Ref } from 'vue'

export function useLandingStory(root: Ref<HTMLElement | null>, initialSection = 'overview') {
  const activeSection = shallowRef(initialSection)
  const enhanced = shallowRef(false)
  let sectionObserver: IntersectionObserver | undefined
  let revealObserver: IntersectionObserver | undefined
  let reducedMotion: MediaQueryList | undefined

  const prepareRevealItems = (sections: HTMLElement[]) => {
    sections.forEach((section) => {
      Array.from(section.children).forEach((child, index) => {
        if (!(child instanceof HTMLElement) || child.getAttribute('aria-hidden') === 'true') return
        child.classList.add('story-reveal-item')
        child.style.setProperty('--story-item-order', String(index))
      })
    })
  }

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

  const focusAnchorTarget = (event: MouseEvent) => {
    const link = (event.target as Element | null)?.closest<HTMLAnchorElement>('a[href^="#"]')
    if (!link || !root.value?.contains(link)) return
    const id = decodeURIComponent(link.hash.slice(1))
    const target = id ? document.getElementById(id) : undefined
    if (!target) return
    window.requestAnimationFrame(() => {
      const hadTabIndex = target.hasAttribute('tabindex')
      if (!hadTabIndex) target.setAttribute('tabindex', '-1')
      target.focus({ preventScroll: true })
      if (!hadTabIndex) target.addEventListener('blur', () => target.removeAttribute('tabindex'), { once: true })
    })
  }

  onMounted(() => {
    const storyRoot = root.value
    if (!storyRoot) return

    document.documentElement.classList.add('landing-scroll')
    reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')

    const sections = Array.from(storyRoot.querySelectorAll<HTMLElement>('[data-story-section]'))
    const revealSections = Array.from(storyRoot.querySelectorAll<HTMLElement>('[data-story-reveal]'))
    prepareRevealItems(revealSections)

    const hashId = window.location.hash ? decodeURIComponent(window.location.hash.slice(1)) : ''
    const hashTarget = hashId ? document.getElementById(hashId) : null
    const hashSection = hashTarget?.closest<HTMLElement>('[data-story-section]')
    hashSection?.classList.add('is-story-visible')
    if (hashSection?.id) activeSection.value = hashSection.id
    if (hashTarget) {
      const previousBehavior = document.documentElement.style.scrollBehavior
      document.documentElement.style.scrollBehavior = 'auto'
      hashTarget.scrollIntoView({ block: 'start' })
      window.requestAnimationFrame(() => {
        document.documentElement.style.scrollBehavior = previousBehavior
      })
    }

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
    storyRoot.addEventListener('click', focusAnchorTarget)
    enhanced.value = true
  })

  onBeforeUnmount(() => {
    document.documentElement.classList.remove('landing-scroll')
    sectionObserver?.disconnect()
    revealObserver?.disconnect()
    reducedMotion?.removeEventListener('change', handleMotionPreference)
    root.value?.removeEventListener('click', focusAnchorTarget)
  })

  return { activeSection: readonly(activeSection), enhanced: readonly(enhanced) }
}
