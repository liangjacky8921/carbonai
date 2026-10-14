<template>
  <div id="roles" class="roles" aria-labelledby="roles-title">
    <h3 id="roles-title">不同职责，同一份数据语境</h3>
    <div class="role-lines">
      <article><span>管理视角</span><div><h4>掌握汇总与变化</h4><p>查看已有看板、统计结果和报告信息，为管理判断提供一致的数据入口。</p></div></article>
      <article><span>核算视角</span><div><h4>核对数据与因子</h4><p>处理活动数据、因子匹配和核算过程，关注输入、计算与结果之间的联系。</p></div></article>
      <article><span>空间视角</span><div><h4>观察位置与关联</h4><p>通过现有 GIS 图层、点位和轨迹功能，补充排放数据的空间上下文。</p></div></article>
    </div>
  </div>
</template>

<style scoped>
.roles { min-width: 0; scroll-margin-top: 24px; }
.roles > h3 { margin: 0 0 30px; font-size: 17px; font-weight: 500; }
.role-lines { border-top: 1px solid var(--landing-line); }
article { display: grid; grid-template-columns: 112px 1fr; gap: 24px; padding: 23px 0; border-bottom: 1px solid var(--landing-line); }
article span { color: #91a298; font-size: 11px; letter-spacing: .08em; }
article h4 { margin: 0 0 8px; font-size: 16px; font-weight: 500; }
article p { margin: 0; color: var(--landing-muted); font-size: 13px; line-height: 1.8; }
@media (max-width: 600px) { article { grid-template-columns: 1fr; gap: 10px; } }
</style>
