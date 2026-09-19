<template>
  <div class="icp-record">
    <a
      v-if="icp"
      class="icp-link"
      href="https://beian.miit.gov.cn/"
      target="_blank"
      rel="noopener noreferrer"
    >{{ icp }}</a>
    <a
      v-if="police"
      class="icp-link police"
      href="https://beian.mps.gov.cn/"
      target="_blank"
      rel="noopener noreferrer"
    >{{ police }}</a>
  </div>
</template>

<script setup lang="ts">
/**
 * ICP 备案信息展示组件。
 * 备案通过后，把备案号写入环境变量 VITE_ICP_BEIAN（如 粤ICP备2026xxxxxx号-1），
 * 本组件会自动在页脚展示并链接到工信部备案系统。
 * 已办理公安联网备案的，可再填 VITE_POLICE_BEIAN。
 */
const icp = import.meta.env.VITE_ICP_BEIAN as string | undefined
const police = import.meta.env.VITE_POLICE_BEIAN as string | undefined
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
</style>
