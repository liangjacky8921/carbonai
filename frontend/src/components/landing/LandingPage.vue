<script setup lang="ts">
import { ref } from 'vue'
import IcpRecord from '@/components/IcpRecord.vue'
import { useLandingStory } from '@/composables/useLandingStory'
import LandingCapabilities from './LandingCapabilities.vue'
import LandingClosing from './LandingClosing.vue'
import LandingHero from './LandingHero.vue'
import LandingProvenance from './LandingProvenance.vue'
import LandingRoles from './LandingRoles.vue'
import LandingSpatial from './LandingSpatial.vue'
import LandingStoryProgress from './LandingStoryProgress.vue'

const storyRoot = ref<HTMLElement | null>(null)
const storyItems = [
  { id: 'overview', index: '01', label: '首页' },
  { id: 'capabilities', index: '02', label: '平台能力' },
  { id: 'spatial', index: '03', label: '空间视角' },
  { id: 'provenance', index: '04', label: '核算路径' },
  { id: 'roles', index: '05', label: '应用角色' },
  { id: 'enter', index: '06', label: '进入平台' },
] as const
const { activeSection, enhanced } = useLandingStory(storyRoot)
</script>

<template>
  <a class="skip-link" href="#landing-main">跳转到主要内容</a>
  <div ref="storyRoot" class="landing-page" :class="{ 'story-enhanced': enhanced }">
    <header class="masthead">
      <RouterLink class="wordmark" :to="{ name: 'home' }" translate="no" aria-label="CarbonAI 首页">
        <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true">
          <path d="M23 5C9 4 4 11 6 20c9 3 17-3 17-15Z" fill="none" stroke="currentColor" stroke-width="1.4" />
          <path d="M6 22 19 9" stroke="currentColor" stroke-width="1.4" />
        </svg>
        CarbonAI
      </RouterLink>
      <nav class="navigation" aria-label="首页导航">
        <a href="#capabilities">平台能力</a>
        <a href="#spatial">空间视角</a>
        <a href="#provenance">核算路径</a>
      </nav>
      <RouterLink class="header-entry" :to="{ name: 'dashboard' }">进入平台</RouterLink>
    </header>

    <LandingStoryProgress :items="storyItems" :active-section="activeSection" />

    <main id="landing-main" tabindex="-1">
      <LandingHero />
      <LandingCapabilities />
      <LandingSpatial />
      <LandingProvenance />
      <LandingRoles />
      <LandingClosing />
    </main>

    <footer class="landing-footer">
      <span class="footer-brand" translate="no">CarbonAI</span>
      <IcpRecord class="footer-record" />
      <a href="#landing-main">返回顶部</a>
    </footer>
  </div>
</template>

<style scoped>
.landing-page {
  --landing-bg: #101715;
  --landing-ink: #eef3ee;
  --landing-muted: #b2c0b7;
  --landing-line: #344039;
  --landing-accent: #c7e4cc;
  min-height: 100vh;
  overflow-x: hidden;
  color: var(--landing-ink);
  background: var(--landing-bg);
  font-family: var(--font-head);
  -webkit-font-smoothing: antialiased;
}

.landing-page :deep(a) {
  color: inherit;
  text-decoration: none;
  touch-action: manipulation;
  -webkit-tap-highlight-color: rgba(199, 228, 204, 0.15);
}

.story-enhanced :deep([data-story-reveal]) {
  opacity: 0;
  transform: translateY(26px);
  transition: opacity 720ms cubic-bezier(0.22, 1, 0.36, 1), transform 720ms cubic-bezier(0.22, 1, 0.36, 1);
}

.story-enhanced :deep([data-story-reveal].is-story-visible) {
  opacity: 1;
  transform: translateY(0);
}

:global(html.landing-scroll) { scroll-behavior: smooth; }

.landing-page :deep(a:focus-visible),
.landing-page :deep(button:focus-visible),
#landing-main:focus-visible {
  outline: 2px solid var(--landing-accent);
  outline-offset: 6px;
}

.skip-link {
  position: fixed;
  top: 10px;
  left: 10px;
  z-index: 20;
  padding: 14px 20px;
  color: #101715;
  background: #d9eddf;
  transform: translateY(-160%);
}

.skip-link:focus { transform: none; }

.masthead {
  display: flex;
  align-items: center;
  gap: 48px;
  max-width: 1440px;
  min-height: 96px;
  margin: auto;
  padding: 20px max(32px, env(safe-area-inset-left));
}

.wordmark {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 24px;
  font-weight: 600;
  letter-spacing: -0.7px;
}

.navigation {
  display: flex;
  gap: 32px;
  margin-left: auto;
  color: var(--landing-muted);
  font-size: 14px;
}

.navigation a,
.header-entry,
.landing-footer > a {
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  transition: color 200ms, background-color 200ms;
}

.navigation a:hover,
.landing-footer > a:hover { color: #fff; }

.header-entry {
  padding: 0 22px;
  border: 1px solid #65756a;
  border-radius: 4px;
  font-size: 13px;
}

.header-entry:hover { background: #24392b; }

.landing-footer {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 30px;
  max-width: 1376px;
  margin: auto;
  padding: 28px 32px max(28px, env(safe-area-inset-bottom));
  border-top: 1px solid var(--landing-line);
  color: var(--landing-muted);
  font-size: 12px;
}

.footer-brand { color: var(--landing-ink); font-size: 18px; }
.footer-record { --c-text-3: #9fb3a7; --c-text-2: #d4e0d8; justify-self: center; }

@media (max-width: 600px) {
  .masthead { min-height: 80px; padding: 18px 20px; gap: 12px; }
  .wordmark { gap: 8px; font-size: 21px; }
  .navigation { display: none; }
  .header-entry { margin-left: auto; padding: 0 14px; }
  .landing-footer { grid-template-columns: 1fr auto; margin: 0 24px; padding: 24px 0; gap: 16px; }
  .footer-record { grid-column: 1 / -1; grid-row: 2; justify-self: start; }
}

@media (prefers-reduced-motion: reduce) {
  .landing-page :deep(a) { transition-duration: 0.001ms; }
  .story-enhanced :deep([data-story-reveal]) { opacity: 1; transform: none; transition: none; }
  :global(html.landing-scroll) { scroll-behavior: auto; }
}
</style>
