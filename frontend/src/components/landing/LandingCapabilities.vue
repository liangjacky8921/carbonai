<template>
  <section id="capabilities" class="capabilities" data-story-section data-story-reveal aria-labelledby="capabilities-title">
    <div class="section-intro">
      <p class="chapter">02 / 07 · 数据能力</p>
      <h2 id="capabilities-title">从一项数据，<br />到完整的碳管理视角。</h2>
      <p class="intro-copy">为日常核算、空间研判与报告准备建立清晰的工作路径。具体数据范围和来源，以业务页面的标注为准。</p>
    </div>
    <div class="capability-list">
      <RouterLink :to="{ name: 'accounting' }" class="capability-row"><span class="index">01</span><div><h3>碳排放核算</h3><p>组织活动数据、排放因子与核算结果。</p></div><span class="link-label">查看核算模块</span></RouterLink>
      <RouterLink :to="{ name: 'gis' }" class="capability-row"><span class="index">02</span><div><h3>GIS 时空分析</h3><p>结合地图图层、排放点位与轨迹，观察空间关系。</p></div><span class="link-label">查看空间模块</span></RouterLink>
      <RouterLink :to="{ name: 'report' }" class="capability-row"><span class="index">03</span><div><h3>核算与报告衔接</h3><p>汇集计算结果，准备可检查的软件报告。</p></div><span class="link-label">查看报告模块</span></RouterLink>
    </div>
  </section>
</template>

<style scoped>
.capabilities { display: grid; grid-template-columns: minmax(0, .82fr) minmax(0, 1.18fr); gap: 96px; max-width: 1240px; margin: auto; padding: 120px 32px; scroll-margin-top: 24px; }
.section-intro { align-self: start; }
.chapter { margin: 0 0 28px; color: #82968a; font-size: 10px; letter-spacing: .12em; text-transform: uppercase; }
h2 { margin: 0; font-size: clamp(28px, 3vw, 42px); font-weight: 500; line-height: 1.4; letter-spacing: -0.03em; text-wrap: balance; }
.intro-copy { max-width: 390px; margin: 30px 0 0; color: var(--landing-muted); font-size: 15px; line-height: 1.9; }
.capability-row { display: grid; grid-template-columns: 44px minmax(0, 1fr) auto; align-items: center; gap: 22px; min-height: 142px; padding: 26px 18px 26px 0; border-top: 1px solid var(--landing-line); transition: background-color 200ms, transform 200ms; }
.capability-row:last-child { border-bottom: 1px solid var(--landing-line); }
.capability-row:hover { background: #18231c; transform: translateX(8px); }
.index { color: #70857a; font-size: 10px; font-variant-numeric: tabular-nums; }
.capability-row h3 { margin: 0; font-size: 19px; font-weight: 500; }
.capability-row p { margin: 10px 0 0; color: var(--landing-muted); font-size: 13px; line-height: 1.8; }
.link-label { color: #c6d9cb; font-size: 11px; }
@media (max-width: 900px) { .capabilities { grid-template-columns: 1fr; gap: 52px; } }
@media (max-width: 600px) { .capabilities { gap: 38px; padding: 76px 24px; }.capability-row { grid-template-columns: 30px 1fr; min-height: 124px; padding-right: 0; }.link-label { grid-column: 2; } }
@media (prefers-reduced-motion: reduce) { .capability-row { transition-duration: 0.001ms; }.capability-row:hover { transform: none; } }
</style>
