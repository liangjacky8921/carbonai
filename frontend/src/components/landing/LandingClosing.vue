<template>
  <section id="enter" class="closing" data-story-section data-story-reveal aria-labelledby="closing-title">
    <div class="closing-mark" aria-hidden="true"><i /><i /><i /></div>
    <p>07 / 07 · CarbonAI Platform</p>
    <h2 id="closing-title">从数据开始，<br />建立可追溯的碳管理路径。</h2>
    <div class="actions">
      <RouterLink class="primary-action" :to="{ name: 'dashboard' }">进入平台工作台</RouterLink>
      <RouterLink class="secondary-action" :to="{ name: 'gis' }">查看 GIS 空间分析</RouterLink>
    </div>
  </section>
</template>

<style scoped>
.closing { position: relative; max-width: 1376px; min-height: 560px; margin: 0 auto 72px; padding: 110px 8%; overflow: hidden; border: 1px solid var(--landing-line); background: linear-gradient(135deg, #17231d 0%, #101715 64%); scroll-margin-top: 24px; }
.closing > p { margin: 0 0 34px; color: #8da095; font-size: 11px; letter-spacing: .13em; text-transform: uppercase; }
h2 { position: relative; z-index: 1; max-width: 790px; margin: 0; font-size: clamp(36px, 4.7vw, 68px); font-weight: 500; line-height: 1.3; letter-spacing: -.045em; text-wrap: balance; }
.actions { position: relative; z-index: 1; display: flex; align-items: center; gap: 28px; margin-top: 46px; }
.primary-action, .secondary-action { display: inline-flex; align-items: center; justify-content: center; min-height: 52px; padding: 0 24px; font-size: 13px; transition: color 180ms, background-color 180ms, transform 180ms; }
.primary-action { color: #152019 !important; background: var(--landing-accent); }
.secondary-action { border-bottom: 1px solid #708a77; }
.primary-action:hover { background: #e0f1e3; transform: translateY(-2px); }
.secondary-action:hover { color: #fff; }
.closing-mark { position: absolute; right: 5%; bottom: -20%; width: min(42vw, 520px); aspect-ratio: 1; border: 1px solid #32473a; border-radius: 50%; }
.closing-mark i { position: absolute; inset: 14%; border: 1px solid #2a3d32; border-radius: 50%; }
.closing-mark i:nth-child(2) { inset: 30%; }.closing-mark i:nth-child(3) { inset: 46%; background: #9cc2a7; box-shadow: 0 0 80px rgba(107, 166, 122, .22); }
@media (max-width: 1440px) { .closing { margin-right: 32px; margin-left: 32px; } }
@media (max-width: 600px) { .closing { min-height: 540px; margin: 0 20px 48px; padding: 72px 24px; }.actions { flex-direction: column; align-items: flex-start; gap: 16px; }.closing-mark { right: -42%; bottom: -12%; width: min(118vw, 460px); opacity: .72; } }
@media (prefers-reduced-motion: reduce) { .primary-action, .secondary-action { transition-duration: .001ms; }.primary-action:hover { transform: none; } }
</style>
