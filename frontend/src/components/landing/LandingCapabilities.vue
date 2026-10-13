<template>
  <section id="capabilities" class="capabilities" data-story-section data-story-reveal aria-labelledby="capabilities-title">
    <div class="section-intro">
      <h2 id="capabilities-title">从一项数据，<br />到完整的碳管理视角。</h2>
      <p>为日常核算、空间研判与报告准备建立清晰的工作路径。具体数据范围和来源，以业务页面的标注为准。</p>
    </div>
    <div class="capability-list">
      <RouterLink :to="{ name: 'accounting' }" class="capability-row"><h3>碳排放核算</h3><p>组织活动数据、排放因子与核算结果。</p><span>查看核算模块</span></RouterLink>
      <RouterLink :to="{ name: 'gis' }" class="capability-row"><h3>GIS 时空分析</h3><p>结合地图图层、排放点位与轨迹，观察空间关系。</p><span>查看空间模块</span></RouterLink>
      <RouterLink :to="{ name: 'report' }" class="capability-row"><h3>核算与报告衔接</h3><p>汇集计算结果，准备可检查的软件报告。</p><span>查看报告模块</span></RouterLink>
    </div>
  </section>
</template>

<style scoped>
.capabilities { max-width: 1240px; margin: auto; padding: 100px 32px; scroll-margin-top: 24px; }
.section-intro { display: grid; grid-template-columns: 1.2fr 1fr; align-items: end; gap: 90px; margin-bottom: 48px; }
h2 { margin: 0; font-size: clamp(28px, 3vw, 42px); font-weight: 500; line-height: 1.4; letter-spacing: -0.03em; text-wrap: balance; }
.section-intro p { max-width: 390px; margin: 0; color: var(--landing-muted); font-size: 15px; line-height: 1.9; }
.capability-row { display: grid; grid-template-columns: 1fr 1.6fr auto; align-items: center; gap: 30px; padding: 28px 0; border-top: 1px solid var(--landing-line); transition: background-color 200ms; }
.capability-row:last-child { border-bottom: 1px solid var(--landing-line); }
.capability-row:hover { background: #18231c; }
.capability-row h3 { margin: 0; font-size: 19px; font-weight: 500; }
.capability-row p { margin: 0; color: var(--landing-muted); font-size: 14px; line-height: 1.8; }
.capability-row span { color: #c6d9cb; font-size: 12px; }
@media (max-width: 900px) { .section-intro { gap: 30px; }.capability-row { grid-template-columns: 1fr 1.5fr; }.capability-row span { grid-column: 2; } }
@media (max-width: 600px) { .capabilities { padding: 64px 24px; }.section-intro { grid-template-columns: 1fr; gap: 28px; }.capability-row { grid-template-columns: 1fr; gap: 10px; padding: 24px 0; }.capability-row span { grid-column: auto; } }
@media (prefers-reduced-motion: reduce) { .capability-row { transition-duration: 0.001ms; } }
</style>
