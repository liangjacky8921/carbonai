<template>
  <section id="provenance" class="provenance" data-story-section data-story-reveal aria-labelledby="provenance-title">
    <div class="section-index" aria-hidden="true">05 / 07</div>
    <div class="provenance-heading">
      <p class="eyebrow">从输入到输出</p>
      <h2 id="provenance-title">让每一步核算，<br />都有清楚的来路。</h2>
      <p>平台把活动数据、排放因子、核算检查与报告输出放进同一条工作路径，便于在业务页面中逐项核对。</p>
    </div>
    <ol class="process-list">
      <li><span>01</span><div><h3>整理活动数据</h3><p>上传业务活动数据，并保留文件中对应的时间、范围和单位信息。</p></div></li>
      <li><span>02</span><div><h3>匹配排放因子</h3><p>在因子库与现有配置中选择适用因子，查看来源与版本信息。</p></div></li>
      <li><span>03</span><div><h3>复核核算结果</h3><p>查看核算明细、低置信提示和统计边界，再确认可用的结果。</p></div></li>
      <li><span>04</span><div><h3>衔接报告输出</h3><p>汇集已确认的数据，为后续报告查看和导出提供依据。</p></div></li>
    </ol>
    <p class="scope-note">具体核算边界、因子版本和输出内容，以业务页面与实际配置为准。</p>
  </section>
</template>

<style scoped>
.provenance { position: relative; display: grid; grid-template-columns: minmax(0, .85fr) minmax(0, 1.15fr); gap: 96px; max-width: 1240px; margin: auto; padding: 120px 32px; border-top: 1px solid var(--landing-line); scroll-margin-top: 24px; }
.section-index { position: absolute; top: 30px; left: 32px; color: #718278; font-size: 10px; letter-spacing: .12em; font-variant-numeric: tabular-nums; }
.eyebrow { margin: 0 0 24px; color: var(--landing-muted); font-size: 13px; }
h2 { margin: 0; font-size: clamp(30px, 3.2vw, 46px); font-weight: 500; line-height: 1.38; letter-spacing: -.035em; text-wrap: balance; }
.provenance-heading > p:last-child { max-width: 430px; margin: 28px 0 0; color: var(--landing-muted); font-size: 15px; line-height: 1.9; }
.process-list { margin: 0; padding: 0; list-style: none; counter-reset: process; }
.process-list li { display: grid; grid-template-columns: 48px 1fr; gap: 18px; padding: 24px 0; border-top: 1px solid var(--landing-line); }
.process-list li:last-child { border-bottom: 1px solid var(--landing-line); }
.process-list span { color: #8fa197; font-size: 11px; font-variant-numeric: tabular-nums; }
.process-list h3 { margin: 0 0 8px; font-size: 17px; font-weight: 500; }
.process-list p { margin: 0; color: var(--landing-muted); font-size: 13px; line-height: 1.75; }
.scope-note { grid-column: 2; margin: -66px 0 0 66px; color: #83958a; font-size: 11px; line-height: 1.7; }
@media (max-width: 800px) { .provenance { grid-template-columns: 1fr; gap: 48px; }.scope-note { grid-column: auto; margin: -28px 0 0 66px; } }
@media (max-width: 600px) { .provenance { padding: 88px 24px 72px; }.section-index { left: 24px; }.process-list li { grid-template-columns: 38px 1fr; }.scope-note { margin-left: 56px; } }
</style>
