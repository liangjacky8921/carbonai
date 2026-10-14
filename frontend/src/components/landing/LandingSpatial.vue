<script setup lang="ts">
import gisPreview from '@/assets/landing/gis-preview.webp'
import SpatialContour from './SpatialContour.vue'
</script>

<template>
  <section id="spatial" class="spatial-section" data-story-section data-story-reveal aria-labelledby="spatial-heading">
    <div class="spatial-copy">
      <p class="product-line">04 / 06 · SPATIAL INTELLIGENCE</p>
      <h2 id="spatial-heading">让环境与碳数据<br />拥有空间坐标。</h2>
      <p>将林地边界、排放点位与区域数据放回地图语境，查看位置、图层与核算结果之间可核对的关系。</p>
      <ul class="spatial-capabilities" aria-label="现有 GIS 能力">
        <li><span>01</span><div><strong>林地边界与碳汇</strong><small>支持边界上传、手动圈定及现有 NDVI 与碳汇结果查看。</small></div></li>
        <li><span>02</span><div><strong>排放点位热力图</strong><small>导入 Excel 或 CSV 点位，调整热力半径与模糊度。</small></div></li>
        <li><span>03</span><div><strong>区域城市视图</strong><small>在现有 GBA 看板中查看城市标记与对应数据。</small></div></li>
      </ul>
      <RouterLink class="text-action" :to="{ name: 'gis' }">探索 GIS 分析 <span aria-hidden="true">↗</span></RouterLink>
      <div class="contour-accent" aria-hidden="true"><SpatialContour /></div>
    </div>
    <figure class="workspace-preview">
      <div class="preview-toolbar">
        <span>GIS 工作台 / 当前界面</span>
        <div aria-label="截图内可见分析模式"><span>林地碳汇</span><span>碳源热力图</span><span>GBA 看板</span></div>
      </div>
      <div class="preview-frame">
        <img
          :src="gisPreview"
          width="1440"
          height="900"
          loading="lazy"
          decoding="async"
          alt="CarbonAI GIS 工作台当前界面截图，页面标注为示例数据"
        />
        <span class="coordinate-label coordinate-label--top" aria-hidden="true">22°N · 114°E</span>
        <span class="coordinate-label coordinate-label--bottom" aria-hidden="true">MAP LAYERS / SAMPLE VIEW</span>
      </div>
      <figcaption><span>真实产品界面预览</span><span>本地截图 · 2026-10-14 · 示例数据</span></figcaption>
    </figure>
  </section>
</template>

<style scoped>
.spatial-section { display: grid; grid-template-columns: minmax(300px, .72fr) minmax(0, 1.28fr); align-items: center; gap: clamp(52px, 7vw, 104px); max-width: 1376px; margin: 0 auto; padding: 118px 7%; border-bottom: 1px solid var(--landing-line); background: linear-gradient(110deg, #0d1412 0%, #121c17 100%); scroll-margin-top: 24px; }
.product-line { margin: 0 0 26px; color: #82968a; font-size: 10px; letter-spacing: .12em; text-transform: uppercase; }
h2 { margin: 0; font-size: clamp(34px, 4vw, 58px); font-weight: 500; line-height: 1.3; letter-spacing: -0.04em; text-wrap: balance; }
.spatial-copy > p:not(.product-line) { max-width: 390px; margin: 24px 0; color: var(--landing-muted); font-size: 15px; line-height: 1.9; }
.spatial-capabilities { max-width: 420px; margin: 34px 0 30px; padding: 0; list-style: none; }
.spatial-capabilities li { display: grid; grid-template-columns: 30px minmax(0, 1fr); gap: 14px; padding: 16px 0; border-top: 1px solid #293a31; }
.spatial-capabilities li:last-child { border-bottom: 1px solid #293a31; }
.spatial-capabilities li > span { padding-top: 2px; color: #647b6d; font-size: 9px; font-variant-numeric: tabular-nums; }
.spatial-capabilities strong, .spatial-capabilities small { display: block; }
.spatial-capabilities strong { color: #d8e7dc; font-size: 13px; font-weight: 520; }
.spatial-capabilities small { margin-top: 7px; color: #83968b; font-size: 11px; line-height: 1.7; }
.text-action { display: inline-flex; align-items: center; gap: 28px; min-height: 44px; border-bottom: 1px solid #708a77; font-size: 13px; transition: color 200ms; }
.text-action:hover { color: #fff; }
.contour-accent { max-width: 320px; margin-top: 46px; opacity: .48; }
.contour-accent :deep(.spatial-figure) { margin: 0; }
.workspace-preview { min-width: 0; margin: 0; overflow: hidden; border: 1px solid #3a4c42; background: #08100d; box-shadow: 0 34px 90px rgba(0, 0, 0, .28); }
.preview-toolbar { display: flex; justify-content: space-between; align-items: center; gap: 20px; min-height: 50px; padding: 0 16px; border-bottom: 1px solid #304238; color: #9eb2a5; font-size: 10px; letter-spacing: .06em; }
.preview-toolbar > div { display: flex; gap: 6px; }
.preview-toolbar > div span { padding: 5px 8px; border: 1px solid #31453a; color: #7f9588; font-size: 9px; letter-spacing: 0; }
.preview-frame { position: relative; overflow: hidden; }
.workspace-preview img { display: block; width: 100%; height: auto; aspect-ratio: 16 / 10; object-fit: contain; object-position: left top; }
.coordinate-label { position: absolute; padding: 5px 7px; color: rgb(188 220 197 / 74%); background: rgb(5 12 9 / 74%); font-size: 8px; letter-spacing: .12em; pointer-events: none; }
.coordinate-label--top { top: 14px; right: 14px; }
.coordinate-label--bottom { right: 14px; bottom: 14px; }
.workspace-preview figcaption { display: flex; justify-content: space-between; gap: 24px; padding: 16px 18px; border-top: 1px solid var(--landing-line); color: #9eb0a5; font-size: 11px; line-height: 1.6; }
.workspace-preview figcaption span:last-child { color: #778b80; text-align: right; }
@media (max-width: 900px) { .spatial-section { grid-template-columns: 1fr; gap: 58px; padding-right: 32px; padding-left: 32px; }.spatial-copy { max-width: 720px; }.contour-accent { display: none; } }
@media (max-width: 600px) { .spatial-section { gap: 42px; padding: 84px 24px; }.preview-toolbar { align-items: flex-start; flex-direction: column; gap: 10px; padding-top: 13px; padding-bottom: 13px; }.preview-toolbar > div { flex-wrap: wrap; }.workspace-preview figcaption { flex-direction: column; gap: 4px; }.workspace-preview figcaption span:last-child { text-align: left; }.coordinate-label--top { display: none; } }
@media (prefers-reduced-motion: reduce) { .text-action { transition-duration: 0.001ms; } }
</style>
