<template>
  <section id="applications" class="applications" data-story-section data-story-reveal aria-labelledby="applications-title">
    <header>
      <p class="chapter">04 / 07 · 环境业务场景</p>
      <h2 id="applications-title">从排放清单，<br />进入具体环境场景。</h2>
      <p class="intro">平台已设置网格、土壤与污水处理相关模块。各模块的数据范围、时间和来源以其页面标注及实际配置为准。</p>
    </header>

    <div class="application-list">
      <RouterLink :to="{ name: 'grid' }" class="application-row">
        <span class="index">A</span>
        <div><h3>网格化监测</h3><p>查看已有网格数据分布、统计结果与阈值信息。</p></div>
        <span class="link-label">进入模块</span>
      </RouterLink>
      <RouterLink :to="{ name: 'soil' }" class="application-row">
        <span class="index">B</span>
        <div><h3>土壤高光谱 SOC</h3><p>查看光谱数据、分组信息与现有分析图表。</p></div>
        <span class="link-label">进入模块</span>
      </RouterLink>
      <RouterLink :to="{ name: 'sewage' }" class="application-row">
        <span class="index">C</span>
        <div><h3>污水厂运维</h3><p>汇总污水处理环节已有的运行和碳相关数据。</p></div>
        <span class="link-label">进入模块</span>
      </RouterLink>
    </div>
  </section>
</template>

<style scoped>
.applications { max-width: 1240px; margin: auto; padding: 120px 32px; scroll-margin-top: 24px; }
header { display: grid; grid-template-columns: .72fr 1.1fr .9fr; gap: 54px; align-items: start; padding-bottom: 58px; border-bottom: 1px solid var(--landing-line); }
.chapter { margin: 8px 0 0; color: #82968a; font-size: 10px; letter-spacing: .12em; text-transform: uppercase; }
h2 { margin: 0; font-size: clamp(30px, 3.2vw, 46px); font-weight: 500; line-height: 1.38; letter-spacing: -.035em; text-wrap: balance; }
.intro { max-width: 390px; margin: 5px 0 0; color: var(--landing-muted); font-size: 14px; line-height: 1.9; }
.application-list { padding-top: 18px; }
.application-row { display: grid; grid-template-columns: 54px minmax(0, 1fr) auto; align-items: center; gap: 22px; width: 91%; min-height: 126px; padding: 22px 18px 22px 0; border-bottom: 1px solid var(--landing-line); transition: color 180ms, transform 180ms, background-color 180ms; }
.application-row:nth-child(2) { width: 86%; margin-left: 9%; }
.application-row:nth-child(3) { width: 82%; margin-left: 18%; }
.application-row:hover { color: #fff; background: #142019; transform: translateX(8px); }
.index { color: #70857a; font-size: 10px; letter-spacing: .12em; }
h3 { margin: 0 0 8px; font-size: 20px; font-weight: 500; }
.application-row p { margin: 0; color: var(--landing-muted); font-size: 13px; line-height: 1.75; }
.link-label { color: #bcd3c3; font-size: 11px; }
@media (max-width: 900px) {
  header { grid-template-columns: .55fr 1.45fr; }
  .intro { grid-column: 2; }
  .application-row, .application-row:nth-child(2), .application-row:nth-child(3) { width: 100%; margin-left: 0; }
}
@media (max-width: 600px) {
  .applications { padding: 76px 24px; }
  header { grid-template-columns: 1fr; gap: 22px; padding-bottom: 38px; }
  .intro { grid-column: auto; }
  .application-row { grid-template-columns: 30px 1fr; min-height: 118px; padding-right: 0; }
  .link-label { grid-column: 2; }
}
@media (prefers-reduced-motion: reduce) { .application-row { transition-duration: .001ms; }.application-row:hover { transform: none; } }
</style>
