<template>
  <div id="applications" class="applications" aria-labelledby="applications-title">
    <h3 id="applications-title">环境业务入口</h3>
    <p class="intro">各模块的数据范围、时间和来源以其页面标注及实际配置为准。</p>
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
  </div>
</template>

<style scoped>
.applications { min-width: 0; scroll-margin-top: 24px; }
.applications > h3 { margin: 0; font-size: 17px; font-weight: 500; }
.intro { max-width: 480px; margin: 12px 0 30px; color: var(--landing-muted); font-size: 12px; line-height: 1.8; }
.application-list { border-top: 1px solid var(--landing-line); }
.application-row { display: grid; grid-template-columns: 38px minmax(0, 1fr) auto; align-items: center; gap: 18px; min-height: 112px; padding: 20px 12px 20px 0; border-bottom: 1px solid var(--landing-line); transition: color 180ms, background-color 180ms; }
.application-row:hover { color: #fff; background: #142019; }
.index { color: #70857a; font-size: 10px; letter-spacing: .12em; }
.application-row h3 { margin: 0 0 8px; font-size: 17px; font-weight: 500; }
.application-row p { margin: 0; color: var(--landing-muted); font-size: 13px; line-height: 1.75; }
.link-label { color: #bcd3c3; font-size: 11px; }
@media (max-width: 600px) {
  .application-row { grid-template-columns: 30px 1fr; min-height: 118px; padding-right: 0; }
  .link-label { grid-column: 2; }
}
@media (prefers-reduced-motion: reduce) { .application-row { transition-duration: .001ms; } }
</style>
