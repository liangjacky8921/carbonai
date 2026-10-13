<template>
  <section id="roles" class="roles" data-story-section data-story-reveal aria-labelledby="roles-title">
    <header>
      <p>不同职责，同一份数据语境</p>
      <h2 id="roles-title">让管理、核算与空间分析，<br />在各自需要的尺度上工作。</h2>
    </header>
    <div class="role-lines">
      <article><span>管理视角</span><h3>掌握汇总与变化</h3><p>查看已有看板、统计结果和报告信息，为管理判断提供一致的数据入口。</p></article>
      <article><span>核算视角</span><h3>核对数据与因子</h3><p>处理活动数据、因子匹配和核算过程，关注输入、计算与结果之间的联系。</p></article>
      <article><span>空间视角</span><h3>观察位置与关联</h3><p>通过现有 GIS 图层、点位和轨迹功能，补充排放数据的空间上下文。</p></article>
    </div>
  </section>
</template>

<style scoped>
.roles { max-width: 1240px; margin: auto; padding: 112px 32px 128px; scroll-margin-top: 24px; }
header { display: grid; grid-template-columns: .7fr 1.3fr; gap: 70px; align-items: start; margin-bottom: 70px; }
header p { margin: 8px 0 0; color: var(--landing-muted); font-size: 13px; }
h2 { margin: 0; font-size: clamp(30px, 3.2vw, 46px); font-weight: 500; line-height: 1.38; letter-spacing: -.035em; text-wrap: balance; }
.role-lines { border-top: 1px solid var(--landing-line); }
article { display: grid; grid-template-columns: .7fr .65fr 1fr; gap: 40px; align-items: baseline; padding: 30px 0; border-bottom: 1px solid var(--landing-line); }
article:nth-child(2) { margin-left: 8%; }
article span { color: #91a298; font-size: 11px; letter-spacing: .08em; }
article h3 { margin: 0; font-size: 18px; font-weight: 500; }
article p { margin: 0; color: var(--landing-muted); font-size: 13px; line-height: 1.8; }
@media (max-width: 800px) { header { grid-template-columns: 1fr; gap: 24px; } article { grid-template-columns: .55fr 1fr; } article p { grid-column: 2; } article:nth-child(2) { margin-left: 0; } }
@media (max-width: 600px) { .roles { padding: 72px 24px 88px; } header { margin-bottom: 46px; } article { grid-template-columns: 1fr; gap: 10px; padding: 24px 0; } article p { grid-column: auto; } }
</style>
