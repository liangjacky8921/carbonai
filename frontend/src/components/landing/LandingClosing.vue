<template>
  <section id="enter" class="closing" data-story-section data-story-reveal aria-labelledby="closing-title">
    <div class="closing-orbit" aria-hidden="true">
      <svg viewBox="0 0 620 420" preserveAspectRatio="none">
        <ellipse class="orbit orbit--outer" cx="310" cy="210" rx="270" ry="152" />
        <ellipse class="orbit orbit--middle" cx="310" cy="210" rx="212" ry="116" />
        <ellipse class="orbit orbit--inner" cx="310" cy="210" rx="142" ry="76" />
        <path class="orbit-axis" d="M70 210h480M310 68v284" />
      </svg>
      <i class="orbit-dot orbit-dot--one" />
      <i class="orbit-dot orbit-dot--two" />
    </div>
    <div class="closing-copy">
      <p class="chapter">06 / 06 · CARBONAI PLATFORM</p>
      <h2 id="closing-title">从每一份数据开始，<br />看见更清晰的碳管理未来。</h2>
      <p class="closing-intro">连接排放核算、GIS 时空分析与报告工作流，让已有数据进入可检查的管理路径。</p>
      <div class="actions">
        <RouterLink class="primary-action" :to="{ name: 'dashboard' }">进入 CarbonAI 平台</RouterLink>
        <a class="secondary-action" href="#capabilities">探索平台能力</a>
      </div>
      <p class="access-note">工作台可直接浏览；账户功能会在使用时提示登录。</p>
    </div>
  </section>
</template>

<style scoped>
.closing { position: relative; display: grid; align-items: center; max-width: 1376px; min-height: 620px; margin: 0 auto 72px; padding: 110px 8%; overflow: hidden; border: 1px solid var(--landing-line); background: radial-gradient(circle at 76% 52%, rgb(54 125 73 / 13%), transparent 34%), linear-gradient(135deg, #101914 0%, #090e0c 72%); scroll-margin-top: 24px; }
.closing::before { position: absolute; inset: 0; background: linear-gradient(rgb(116 163 128 / 3%) 1px, transparent 1px), linear-gradient(90deg, rgb(116 163 128 / 3%) 1px, transparent 1px); background-size: 76px 76px; mask-image: linear-gradient(90deg, transparent, #000 22%, #000 88%, transparent); content: ''; pointer-events: none; }
.closing-copy { position: relative; z-index: 2; max-width: 780px; }
.chapter { margin: 0 0 34px; color: #8da095; font-size: 11px; letter-spacing: .13em; }
h2 { position: relative; z-index: 1; max-width: 790px; margin: 0; font-size: clamp(36px, 4.7vw, 68px); font-weight: 500; line-height: 1.3; letter-spacing: -.045em; text-wrap: balance; }
.closing-intro { max-width: 590px; margin: 30px 0 0; color: #91a398; font-size: 14px; line-height: 1.9; }
.actions { position: relative; z-index: 1; display: flex; align-items: center; gap: 28px; margin-top: 46px; }
.access-note { position: relative; z-index: 1; margin: 18px 0 0 !important; color: #8da095 !important; font-size: 11px !important; letter-spacing: 0 !important; line-height: 1.7; text-transform: none !important; }
.primary-action, .secondary-action { display: inline-flex; align-items: center; justify-content: center; min-height: 52px; padding: 0 24px; font-size: 13px; transition: color 180ms, background-color 180ms, transform 180ms; }
.primary-action { color: #152019 !important; background: var(--landing-accent); }
.secondary-action { border-bottom: 1px solid #708a77; }
.primary-action:hover { background: #e0f1e3; transform: translateY(-2px); }
.secondary-action:hover { color: #fff; }
.closing-orbit { position: absolute; z-index: 1; top: 50%; right: 2%; width: min(47vw, 620px); height: min(32vw, 420px); opacity: .72; transform: translateY(-50%); pointer-events: none; }
.closing-orbit svg { display: block; width: 100%; height: 100%; }
.orbit { fill: none; stroke: #3f5d49; stroke-width: 1; vector-effect: non-scaling-stroke; stroke-dasharray: 10 8 42 12; stroke-dashoffset: 0; transition: stroke-dashoffset 1100ms cubic-bezier(.22, 1, .36, 1), opacity 800ms ease; }
.orbit--middle { stroke: #54735c; opacity: .72; transition-delay: 120ms; }
.orbit--inner { stroke: #769a7e; opacity: .54; transition-delay: 220ms; }
.orbit-axis { fill: none; stroke: rgb(98 137 108 / 16%); stroke-width: 1; vector-effect: non-scaling-stroke; }
:global(.story-enhanced .closing:not(.is-story-visible) .orbit) { opacity: 0; stroke-dashoffset: 150; }
.orbit-dot { position: absolute; width: 6px; height: 6px; border-radius: 50%; background: #b6d9bd; box-shadow: 0 0 18px rgb(112 202 135 / 72%); offset-path: ellipse(43.5% 36% at 50% 50%); offset-rotate: 0deg; animation: orbit-travel 24s linear infinite; animation-play-state: running; }
.orbit-dot--two { width: 4px; height: 4px; opacity: .72; offset-path: ellipse(34% 27.5% at 50% 50%); animation-duration: 31s; animation-direction: reverse; }
:global(.story-enhanced .closing:not(.is-story-visible) .orbit-dot) { animation-play-state: paused; opacity: 0; }
@keyframes orbit-travel { to { offset-distance: 100%; } }
@media (max-width: 1440px) { .closing { margin-right: 32px; margin-left: 32px; } }
@media (max-width: 760px) { .closing { min-height: 650px; margin: 0 20px 48px; padding: 72px 24px 280px; }.closing-copy { align-self: start; }.actions { flex-direction: column; align-items: flex-start; gap: 16px; }.closing-orbit { top: auto; right: 50%; bottom: 18px; width: calc(100% - 32px); height: 235px; opacity: .5; transform: translateX(50%); }.orbit-dot { width: 5px; height: 5px; } }
@media (prefers-reduced-motion: reduce) { .orbit { opacity: .7 !important; stroke-dashoffset: 0 !important; transition: none; }.orbit-dot { animation: none; opacity: .72 !important; offset-distance: 18%; }.orbit-dot--two { offset-distance: 68%; }.primary-action, .secondary-action { transition-duration: .001ms; }.primary-action:hover { transform: none; } }
</style>
