<script setup lang="ts">
import { shallowRef } from 'vue'
import AuroraBackdrop from './AuroraBackdrop.vue'
import PointCloudGlobe from './PointCloudGlobe.vue'

const paused = shallowRef(false)
</script>

<template>
  <section id="overview" class="hero" data-story-section aria-labelledby="hero-title">
    <AuroraBackdrop :paused="paused" />
    <div class="hero-visual">
      <PointCloudGlobe :paused="paused" />
    </div>
    <div class="hero-content">
      <p class="product-line">时空智能碳管理平台</p>
      <h1 id="hero-title">看清排放<br />理解空间<br />让决策有据</h1>
      <p class="hero-description">
        连接碳核算、地理空间分析与报告工作流，<br class="desktop-break" />把分散的数据，转化为可追溯的管理依据。
      </p>
      <div class="hero-actions">
        <RouterLink class="primary-action" :to="{ name: 'dashboard' }" aria-describedby="platform-access-note">
          进入平台工作台
          <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
            <path d="M3 10h13m-5-5 5 5-5 5" fill="none" stroke="currentColor" stroke-width="1.4" />
          </svg>
        </RouterLink>
        <a class="text-action" href="#capabilities">了解平台能力</a>
      </div>
      <p id="platform-access-note" class="access-note">工作台可直接浏览；账户功能会在使用时提示登录。</p>
    </div>
    <div class="hero-foot">
      <span>核算 · 空间分析 · 报告</span>
      <button type="button" :aria-pressed="paused" @click="paused = !paused">
        {{ paused ? '播放背景动效' : '暂停背景动效' }}
      </button>
    </div>
  </section>
</template>

<style scoped>
.hero { position: relative; isolation: isolate; max-width: 1440px; min-height: 720px; margin: auto; border-top: 1px solid var(--landing-line); border-bottom: 1px solid var(--landing-line); }
.hero::after { position: absolute; inset: 0; z-index: 0; content: ''; pointer-events: none; background: linear-gradient(90deg, rgba(16, 23, 21, .98) 0%, rgba(16, 23, 21, .91) 30%, rgba(16, 23, 21, .32) 58%, transparent 78%); }
.hero-visual { position: absolute; z-index: 0; top: 0; right: -1%; width: 64%; height: 100%; }
.hero-content { position: relative; z-index: 2; max-width: 700px; padding: 66px 7% 120px; animation: arrival 850ms ease-out both; }
.product-line { margin: 0 0 26px; color: var(--landing-muted); font-size: 14px; }
h1 { margin: 0; font-size: clamp(44px, 5.3vw, 76px); font-weight: 500; line-height: 1.19; letter-spacing: -0.045em; text-wrap: balance; }
.hero-description { margin: 30px 0 32px; color: #c0ccc4; font-size: 16px; line-height: 1.9; }
.hero-actions { display: flex; align-items: center; gap: 30px; }
.access-note { margin: 14px 0 0; color: #8fa298; font-size: 11px; line-height: 1.6; }
.primary-action { display: inline-flex; align-items: center; justify-content: space-between; gap: 26px; padding: 18px 24px; border-radius: 4px; color: #16221a !important; background: var(--landing-accent); font-size: 14px; font-weight: 600; transition: transform 200ms, background-color 200ms; }
.primary-action:hover { background: #e0f1e3; transform: translateY(-2px); }
.primary-action:active { transform: translateY(1px); }
.text-action { display: inline-flex; align-items: center; min-height: 44px; border-bottom: 1px solid #708a77; font-size: 14px; transition: color 200ms; }
.text-action:hover { color: #fff; }
.hero-foot { position: absolute; right: 7%; bottom: 28px; left: 7%; z-index: 2; display: flex; align-items: center; justify-content: space-between; color: var(--landing-muted); font-size: 12px; }
.hero-foot button { min-height: 44px; padding: 0 14px; border: 1px solid #667a6d; border-radius: 4px; color: inherit; background: transparent; font: inherit; cursor: pointer; transition: color 200ms, background-color 200ms; }
.hero-foot button:hover { color: #fff; background: #24392b; }
@keyframes arrival { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
@media (max-width: 1100px) {
  .hero::after { background: linear-gradient(90deg, rgba(16, 23, 21, .98) 0%, rgba(16, 23, 21, .88) 46%, rgba(16, 23, 21, .28) 78%, transparent); }
  .hero-visual { right: -16%; width: 70%; opacity: .82; }
  .hero-content { max-width: 640px; }
}
@media (max-width: 600px) {
  .hero { min-height: 780px; }
  .hero::after { background: linear-gradient(180deg, rgba(16, 23, 21, .98) 0%, rgba(16, 23, 21, .88) 55%, rgba(16, 23, 21, .3) 100%); }
  .hero-visual { right: -7%; width: 108%; opacity: .66; }
  .hero-content { padding: 58px 24px 120px; }
  .hero-description { font-size: 14px; }
  .desktop-break { display: none; }
  .hero-actions { flex-direction: column; align-items: flex-start; gap: 12px; }
  .hero-foot { right: 24px; bottom: 22px; left: 24px; flex-direction: column; align-items: flex-start; gap: 14px; }
}
@media (prefers-reduced-motion: reduce) {
  .hero-content { animation: none; }
  .primary-action, .text-action, .hero-foot button { transition-duration: 0.001ms; }
  .primary-action:hover, .primary-action:active { transform: none; }
}
</style>
