<script setup lang="ts">
const contours = Array.from({ length: 13 }, (_, index) => {
  const y = 90 + index * 19
  return `M-50 ${y} C70 ${y - 110}, 145 ${y + 70}, 265 ${y - 25} S430 ${y - 50}, 620 ${y + 30}`
})
</script>

<template>
  <figure class="spatial-figure">
    <svg class="contour" viewBox="0 0 560 410" fill="none" role="img" aria-labelledby="landing-contour-title">
      <title id="landing-contour-title">抽象空间关系示意图，不代表实际监测数据</title>
      <defs>
        <linearGradient id="landing-line-color" x1="0" y1="0" x2="560" y2="410" gradientUnits="userSpaceOnUse">
          <stop stop-color="#4c7963" stop-opacity="0.2" /><stop offset="0.48" stop-color="#a6c9b2" /><stop offset="1" stop-color="#426754" stop-opacity="0.15" />
        </linearGradient>
      </defs>
      <g stroke="#8ab39c" stroke-opacity="0.12" stroke-width="1">
        <path d="M40 0V410 M160 0V410 M280 0V410 M400 0V410 M520 0V410 M0 85H560 M0 205H560 M0 325H560" />
      </g>
      <g stroke="url(#landing-line-color)" stroke-width="1.2">
        <path v-for="path in contours" :key="path" :d="path" />
      </g>
      <circle cx="280" cy="205" r="52" stroke="#91bca3" stroke-opacity="0.5" />
      <path d="M268 205H292 M280 193V217" stroke="#c6dfcf" />
      <circle cx="280" cy="205" r="4" fill="#c6dfcf" />
    </svg>
    <figcaption class="spatial-caption"><span>空间，让排放有迹可循。</span><span>空间关系示意图</span></figcaption>
  </figure>
</template>

<style scoped>
.spatial-figure { min-width: 0; margin: 0; }
.contour { display: block; width: 100%; height: auto; }
.spatial-caption { display: flex; justify-content: space-between; gap: 20px; padding: 18px 0; border-top: 1px solid var(--landing-line); color: #b1c1b7; font-size: 12px; }
</style>
