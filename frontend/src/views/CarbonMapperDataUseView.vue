<template>
  <article class="data-use c-card p-5" aria-labelledby="data-use-title">
    <p class="kicker">DATA PROVENANCE</p>
    <h2 id="data-use-title">Carbon Mapper 遥感数据使用说明</h2>
    <p>Source: <a href="https://data.carbonmapper.org/" target="_blank" rel="noopener noreferrer">Carbon Mapper</a>。本平台仅在获授权的免费研究预览中展示已发布的 CH₄／CO₂ 羽流观测；平台其他数据不因此成为 Carbon Mapper 数据。</p>
    <h3>观测含义与引用</h3>
    <p>每条记录应保留观测 ID、气体、观测时间、发布时间、仪器及获取时间。学术引用请注明“Source: Carbon Mapper (data.carbonmapper.org)”、所用记录 ID、观测时间、访问日期，并参考 <a href="https://carbonmapper.org/articles/product-guide" target="_blank" rel="noopener noreferrer">官方产品指南</a>。缺失的排放率不补零，未知质量不视为合格。离散观测不等于连续实时监测、企业责任认定或年度排放量。</p>
    <h3>下游非商业条件</h3>
    <p>Carbon Mapper 数据及基于这些数据的衍生内容只可在其<a href="https://carbonmapper.org/terms" target="_blank" rel="noopener noreferrer">当前使用条款</a>允许的非商业、温室气体减排／认知／政策用途内使用。若您再分发数据或衍生内容，须向接收方保留相同或实质相同的非商业和署名条件；不得将其纳入收费产品或付费会员权益。商业用途须先与 Carbon Mapper 协商适用许可。</p>
    <h3>许可终止与数据副本</h3>
    <p>若许可终止，本平台将关闭观测接口及图层，停止获取与分发，并核查、删除自身持有的相关数据副本。浏览器或其他接收方持有的副本仍须遵循官方条款；请以官方条款原文为准。</p>
  </article>
</template>

<style scoped>
.data-use { max-width: 900px; margin: 0 auto; color: var(--c-text-2); line-height: 1.8; }
.data-use h2 { margin: 4px 0 22px; color: var(--c-text); font-size: clamp(23px, 3vw, 32px); }
.data-use h3 { margin: 22px 0 5px; color: var(--c-text); font-size: 16px; }
.data-use p { margin: 0 0 12px; }
.data-use a { color: #93daba; text-decoration: underline; text-underline-offset: 3px; }
.data-use .kicker { color: var(--c-green); font-size: 11px; letter-spacing: .12em; }
</style>
