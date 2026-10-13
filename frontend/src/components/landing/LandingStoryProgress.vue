<script setup lang="ts">
defineProps<{
  activeSection: string
  items: ReadonlyArray<{ id: string; label: string; index: string }>
}>()
</script>

<template>
  <nav class="story-progress" aria-label="首页章节">
    <a
      v-for="item in items"
      :key="item.id"
      :href="`#${item.id}`"
      :class="{ active: activeSection === item.id }"
      :aria-current="activeSection === item.id ? 'location' : undefined"
    >
      <span>{{ item.index }}</span>
      <strong>{{ item.label }}</strong>
    </a>
  </nav>
</template>

<style scoped>
.story-progress {
  position: fixed;
  top: 50%;
  right: max(18px, calc((100vw - 1440px) / 2 + 18px));
  z-index: 8;
  display: grid;
  gap: 2px;
  width: 116px;
  transform: translateY(-50%);
}

a {
  display: grid;
  grid-template-columns: 24px 1fr;
  align-items: center;
  min-height: 36px;
  color: #7f9187 !important;
  font-size: 10px;
  letter-spacing: 0.04em;
  transition: color 180ms, transform 180ms;
}

a::before {
  position: absolute;
  left: 0;
  width: 1px;
  height: 12px;
  background: #53645a;
  content: '';
  transition: height 180ms, background-color 180ms;
}

a:hover,
a.active { color: #e9f1eb !important; }
a:hover { transform: translateX(-3px); }
a.active::before { height: 28px; background: #c7e4cc; }
a span { padding-left: 10px; font-variant-numeric: tabular-nums; }
a strong { font-weight: 500; }

@media (max-width: 1540px) and (min-width: 1181px) {
  .story-progress { right: 8px; width: 30px; }
  a { grid-template-columns: 1fr; }
  a strong { display: none; }
}
@media (max-width: 1180px) { .story-progress { display: none; } }
@media (prefers-reduced-motion: reduce) { a, a::before { transition-duration: 0.001ms; } a:hover { transform: none; } }
</style>
