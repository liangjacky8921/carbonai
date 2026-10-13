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
      :aria-label="`${item.index} ${item.label}`"
      :aria-current="activeSection === item.id ? 'location' : undefined"
    >
      <span>{{ item.index }}</span>
      <strong aria-hidden="true">{{ item.label }}</strong>
    </a>
  </nav>
</template>

<style scoped>
.story-progress {
  position: fixed;
  top: 50%;
  right: max(0px, env(safe-area-inset-right));
  z-index: 8;
  display: grid;
  gap: 2px;
  width: 46px;
  padding: 8px 0;
  border: 1px solid rgba(91, 113, 99, .42);
  border-right: 0;
  border-radius: 6px 0 0 6px;
  background: rgba(14, 22, 18, .92);
  transform: translateY(-50%);
}

a {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 46px;
  min-height: 38px;
  color: #7f9187 !important;
  font-size: 10px;
  letter-spacing: 0.04em;
  transition: color 180ms, background-color 180ms;
}

a::before {
  position: absolute;
  left: 6px;
  width: 1px;
  height: 12px;
  background: #53645a;
  content: '';
  transition: height 180ms, background-color 180ms;
}

a:hover,
a:focus-visible,
a.active { color: #e9f1eb !important; }
a:hover,
a:focus-visible { background: #1a2720; }
a.active::before { height: 28px; background: #c7e4cc; }
a span { padding-left: 4px; font-variant-numeric: tabular-nums; }
a strong {
  position: absolute;
  top: 50%;
  right: 56px;
  min-width: max-content;
  padding: 7px 10px;
  border: 1px solid #44564b;
  border-radius: 4px;
  color: #dce7df;
  background: #17211c;
  font-size: 11px;
  font-weight: 500;
  letter-spacing: .02em;
  opacity: 0;
  pointer-events: none;
  transform: translate(5px, -50%);
  visibility: hidden;
  transition: opacity 160ms, transform 160ms, visibility 160ms;
}
a:hover strong,
a:focus-visible strong { opacity: 1; transform: translate(0, -50%); visibility: visible; }

@media (max-width: 1180px) { .story-progress { display: none; } }
@media (prefers-reduced-motion: reduce) { a, a::before, a strong { transition-duration: 0.001ms; } }
</style>
