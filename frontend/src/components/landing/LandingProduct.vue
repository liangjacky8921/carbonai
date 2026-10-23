<script setup lang="ts">
import dashboardPreview from '@/assets/landing/dashboard-preview.webp'
import LandingApplications from './LandingApplications.vue'
import LandingRoles from './LandingRoles.vue'
</script>

<template>
  <section id="product" class="product" data-story-section data-story-reveal aria-labelledby="product-title">
    <header class="product-heading">
      <p class="chapter">05 / 06 · 产品界面</p>
      <h2 id="product-title">让复杂的碳数据<br />变得清晰可见</h2>
      <p>数据大厅汇集排放趋势、Scope 分布与区域对比，并连接核算和 GIS 工作流。界面中的数据性质以页面标注为准。</p>
    </header>

    <div class="product-stage">
      <figure class="product-preview">
        <div class="window-bar" aria-hidden="true">
          <div class="window-controls"><span /><span /><span /></div>
          <span class="window-route">carbontool.cn / dashboard</span>
          <span class="window-state">示例数据</span>
        </div>
        <div class="preview-viewport">
          <img
            :src="dashboardPreview"
            width="1440"
            height="900"
            loading="lazy"
            decoding="async"
            alt="CarbonAI 数据大屏当前界面截图，页面标注为示例数据"
          />
        </div>
        <figcaption><span>当前 CarbonAI 数据大厅</span><span>本地界面截图 · 2026-10-14 · 示例数据</span></figcaption>
      </figure>
      <ol class="feature-callouts" aria-label="数据大厅关键能力">
        <li>
          <span>01</span>
          <div><strong>排放趋势分析</strong><p>查看碳市场走势、年度排放趋势与 Scope 分布。</p></div>
        </li>
        <li>
          <span>02</span>
          <div><strong>数据来源与核算依据</strong><p>沿用当前核算数据状态。来源与低置信提示以业务页面标注为准。</p></div>
        </li>
        <li>
          <span>03</span>
          <div><strong>GIS 空间可视化</strong><p>查看区域对比，并继续进入 GIS 工作台核对地图图层。</p></div>
        </li>
      </ol>
      <div class="stage-footer">
        <p>当前界面展示排放统计、碳市场趋势、区域对比与异常指标等已有模块。</p>
        <RouterLink :to="{ name: 'dashboard' }">进入数据大厅 <span aria-hidden="true">↗</span></RouterLink>
      </div>
    </div>

    <div class="product-details">
      <LandingApplications />
      <LandingRoles />
    </div>
  </section>
</template>

<style scoped>
.product { position: relative; max-width: 1376px; margin: auto; padding: 126px 7% 132px; overflow: hidden; background: radial-gradient(circle at 50% 42%, rgb(48 112 68 / 9%), transparent 38%), linear-gradient(180deg, #0a0f0c, #090d0b); scroll-margin-top: 24px; }
.product::before { position: absolute; inset: 0; background: linear-gradient(90deg, transparent, rgb(106 151 118 / 3%) 50%, transparent); content: ''; pointer-events: none; }
.product-heading { display: grid; grid-template-columns: .55fr 1.15fr .9fr; gap: 54px; align-items: start; }
.chapter { margin: 8px 0 0; color: #8da095; font-size: 11px; letter-spacing: .12em; }
h2 { margin: 0; font-size: clamp(34px, 4vw, 58px); font-weight: 500; line-height: 1.28; letter-spacing: -.04em; text-wrap: balance; }
.product-heading > p:last-child { max-width: 410px; margin: 5px 0 0; color: var(--landing-muted); font-size: 14px; line-height: 1.9; }
.product-heading, .product-stage, .product-details { position: relative; z-index: 1; }
.product-stage { margin-top: 82px; }
.product-preview { margin: 0; overflow: hidden; border: 1px solid #3a4c42; background: #07100d; box-shadow: 0 42px 120px rgba(0, 0, 0, .36), 0 0 70px rgb(57 128 77 / 7%); backface-visibility: hidden; transform: perspective(1400px) translate3d(0, 0, 0) rotateX(0deg) scale(1); transform-origin: center top; transition: opacity 820ms cubic-bezier(.22, 1, .36, 1), transform 960ms cubic-bezier(.22, 1, .36, 1), border-color 820ms ease; }
:global(.story-enhanced .product:not(.is-story-visible) .product-preview) { opacity: .7; border-color: #2d3a33; transform: perspective(1400px) translate3d(0, 36px, 0) rotateX(5deg) scale(.94); will-change: opacity, transform; }
:global(.story-enhanced .product.is-story-visible .product-preview) { will-change: auto; }
.window-bar { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; min-height: 48px; padding: 0 16px; border-bottom: 1px solid #2e4036; background: #0b1310; color: #71867a; font-size: 11px; letter-spacing: .08em; }
.window-controls { display: flex; gap: 7px; }
.window-controls span { width: 7px; height: 7px; border: 1px solid #53695b; border-radius: 50%; }
.window-route { justify-self: center; }
.window-state { justify-self: end; padding: 5px 7px; border: 1px solid #30463a; color: #8daa95; }
.preview-viewport { overflow: hidden; background: #07100d; }
.product-preview img { display: block; width: 100%; height: auto; aspect-ratio: 16 / 10; object-fit: contain; object-position: left top; }
.product-preview figcaption { display: flex; justify-content: space-between; gap: 24px; padding: 16px 18px; border-top: 1px solid var(--landing-line); color: #9eb0a5; font-size: 12px; line-height: 1.6; }
.product-preview figcaption span:last-child { color: #778b80; text-align: right; }
.feature-callouts { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); margin: 28px 0 0; padding: 0; border-top: 1px solid #293a31; list-style: none; }
.feature-callouts li { position: relative; display: grid; grid-template-columns: 34px minmax(0, 1fr); gap: 14px; min-height: 126px; padding: 24px 26px 20px 0; border-right: 1px solid #293a31; opacity: 1; transform: translate3d(0, 0, 0); transition: opacity 560ms cubic-bezier(.22, 1, .36, 1), transform 560ms cubic-bezier(.22, 1, .36, 1); }
.feature-callouts li:not(:first-child) { padding-left: 24px; }
.feature-callouts li:last-child { border-right: 0; }
.feature-callouts li::before { position: absolute; top: -3px; left: 0; width: 5px; height: 5px; border-radius: 50%; background: #79a986; box-shadow: 0 0 12px rgb(91 171 111 / 38%); content: ''; }
.feature-callouts li:not(:first-child)::before { left: 24px; }
.feature-callouts li > span { padding-top: 2px; color: #668071; font-size: 11px; letter-spacing: .1em; font-variant-numeric: tabular-nums; }
.feature-callouts strong { display: block; color: #d5e4d9; font-size: 12px; font-weight: 520; }
.feature-callouts p { max-width: 300px; margin: 8px 0 0; color: #7e9186; font-size: 12px; line-height: 1.7; }
:global(.story-enhanced .product:not(.is-story-visible) .feature-callouts li) { opacity: 0; transform: translate3d(0, 12px, 0); }
.feature-callouts li:nth-child(1) { transition-delay: 320ms; }
.feature-callouts li:nth-child(2) { transition-delay: 410ms; }
.feature-callouts li:nth-child(3) { transition-delay: 500ms; }
.stage-footer { display: flex; justify-content: space-between; align-items: center; gap: 32px; margin-top: 22px; padding: 0 2px; }
.stage-footer p { max-width: 670px; margin: 0; color: #7f9287; font-size: 11px; line-height: 1.8; }
.stage-footer a { display: inline-flex; flex: none; align-items: center; gap: 26px; min-height: 44px; border-bottom: 1px solid #6b8874; color: #c6d9cb; font-size: 12px; }
.product-details { display: grid; grid-template-columns: 1.05fr .95fr; gap: clamp(56px, 8vw, 116px); margin-top: 78px; }
@media (max-width: 900px) { .product { padding-right: 32px; padding-left: 32px; }.product-heading { grid-template-columns: .45fr 1fr; }.product-heading > p:last-child { grid-column: 2; }.product-details { grid-template-columns: 1fr; } }
@media (max-width: 600px) { .product { padding: 88px 24px 96px; }.product-heading { grid-template-columns: 1fr; gap: 24px; }.product-heading > p:last-child { grid-column: auto; }.product-stage { margin-top: 54px; }.window-bar { grid-template-columns: 1fr auto; }.window-route { display: none; }.product-preview img { aspect-ratio: 4 / 3; }.product-preview figcaption { flex-direction: column; gap: 4px; }.product-preview figcaption span:last-child { text-align: left; }.feature-callouts { grid-template-columns: 1fr; }.feature-callouts li, .feature-callouts li:not(:first-child) { min-height: 0; padding: 20px 0; border-right: 0; border-bottom: 1px solid #293a31; }.feature-callouts li::before, .feature-callouts li:not(:first-child)::before { left: 0; }.stage-footer { align-items: flex-start; flex-direction: column; gap: 18px; }.product-details { gap: 68px; margin-top: 58px; }:global(.story-enhanced .product:not(.is-story-visible) .product-preview) { opacity: .82; transform: translate3d(0, 14px, 0) scale(.985); } }
@media (prefers-reduced-motion: reduce) { .product-preview, :global(.story-enhanced .product:not(.is-story-visible) .product-preview), .feature-callouts li, :global(.story-enhanced .product:not(.is-story-visible) .feature-callouts li) { opacity: 1; border-color: #3a4c42; transform: none; transition: none; } }
</style>
