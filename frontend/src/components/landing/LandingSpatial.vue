<script setup lang="ts">
import SpatialContour from './SpatialContour.vue'
</script>

<template>
  <section id="spatial" class="spatial-section" data-story-section data-story-reveal aria-labelledby="spatial-heading">
    <div class="spatial-copy">
      <p class="product-line">数据的另一种尺度</p>
      <h2 id="spatial-heading">理解位置，<br />才能看清关联。</h2>
      <p>排放点位、轨迹与区域图层构成空间分析的上下文。进入 GIS 工作台，查看现有地图与数据来源。</p>
      <RouterLink class="text-action" :to="{ name: 'gis' }">打开 GIS 工作台</RouterLink>
    </div>
    <SpatialContour />
  </section>
</template>

<style scoped>
.spatial-section { display: grid; grid-template-columns: 0.9fr 1.1fr; align-items: center; gap: 80px; max-width: 1240px; margin: auto; padding: 20px 32px 100px; scroll-margin-top: 24px; }
.product-line { margin: 0 0 26px; color: var(--landing-muted); font-size: 14px; }
h2 { margin: 0; font-size: clamp(28px, 3vw, 42px); font-weight: 500; line-height: 1.4; letter-spacing: -0.03em; text-wrap: balance; }
.spatial-copy > p:not(.product-line) { max-width: 390px; margin: 24px 0; color: var(--landing-muted); font-size: 15px; line-height: 1.9; }
.text-action { display: inline-flex; align-items: center; min-height: 44px; border-bottom: 1px solid #708a77; font-size: 14px; transition: color 200ms; }
.text-action:hover { color: #fff; }
@media (max-width: 900px) { .spatial-section { gap: 30px; } }
@media (max-width: 600px) { .spatial-section { grid-template-columns: 1fr; gap: 28px; padding: 0 24px 64px; } }
@media (prefers-reduced-motion: reduce) { .text-action { transition-duration: 0.001ms; } }
</style>
