<template>
  <div class="icp-record">
    <a
      class="icp-link"
      href="https://beian.miit.gov.cn/"
      target="_blank"
      rel="noopener noreferrer"
    >{{ icp }}</a>
    <span class="author-credit" aria-label="作者署名">Lam Jacky梁家深</span>
  </div>
</template>

<script setup lang="ts">
/**
 * 已由站点主体确认的唯一 ICP 备案信息。
 */
const icp = '粤ICP备2026140571号'
</script>

<style scoped>
.icp-record {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: center;
  align-items: center;
  font-size: 12px;
  color: var(--c-text-3, #8a94a6);
}
.icp-link {
  color: var(--c-text-3, #8a94a6);
  text-decoration: none;
}
.icp-link:hover {
  color: var(--c-text-2, #b8c0cc);
}
.author-credit {
  display: inline-flex;
  align-items: center;
  color: var(--c-text-3, #8a94a6);
  white-space: nowrap;
}
.author-credit::before {
  margin-right: 12px;
  color: color-mix(in srgb, currentColor 52%, transparent);
  content: '·';
}
</style>
