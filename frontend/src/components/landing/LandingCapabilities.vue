<template>
  <section id="capabilities" class="capabilities" data-story-section data-story-reveal aria-labelledby="capabilities-title">
    <svg class="flowing-lines" viewBox="0 0 1440 760" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id="capability-flow-fade" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="#79d89a" stop-opacity="0" />
          <stop offset="0.24" stop-color="#79d89a" stop-opacity="0.18" />
          <stop offset="0.72" stop-color="#b4efc4" stop-opacity="0.1" />
          <stop offset="1" stop-color="#79d89a" stop-opacity="0" />
        </linearGradient>
      </defs>
      <g class="flowing-lines__stream">
        <path d="M-90 172 C 160 40, 310 292, 560 156 S 980 40, 1530 220" />
        <path d="M-110 238 C 180 104, 340 342, 590 212 S 1010 92, 1540 284" />
        <path d="M-120 308 C 170 174, 360 398, 620 270 S 1040 150, 1550 346" />
        <path d="M-120 382 C 190 242, 390 452, 650 334 S 1070 216, 1550 414" />
        <path d="M-100 458 C 220 312, 420 510, 690 402 S 1100 288, 1540 486" />
        <path d="M-70 534 C 250 386, 460 570, 730 474 S 1130 364, 1510 560" />
      </g>
    </svg>
    <div class="manifesto-copy">
      <p class="chapter">02 / 06 · 空间宣言</p>
      <h2 id="capabilities-title">让碳数据<br />拥有<span>空间维度。</span></h2>
      <p class="intro-copy">每一项排放都发生在具体的时间、位置与业务边界中。CarbonAI 将核算结果放回地理上下文，帮助管理者理解数据之间可以核对的关系。</p>
    </div>
    <div class="capability-index" aria-label="平台能力入口">
      <RouterLink :to="{ name: 'accounting' }" class="capability-row"><span class="index">01</span><div><h3>核算</h3><p>组织活动数据、排放因子与核算结果。</p></div><span class="link-label">进入</span></RouterLink>
      <RouterLink :to="{ name: 'gis' }" class="capability-row"><span class="index">02</span><div><h3>空间</h3><p>结合地图图层、排放点位与轨迹观察关系。</p></div><span class="link-label">进入</span></RouterLink>
      <RouterLink :to="{ name: 'report' }" class="capability-row"><span class="index">03</span><div><h3>报告</h3><p>汇集已确认的结果，准备可检查的软件报告。</p></div><span class="link-label">进入</span></RouterLink>
    </div>
  </section>
</template>

<style scoped>
.capabilities { position: relative; isolation: isolate; display: grid; grid-template-columns: minmax(0, 1.32fr) minmax(330px, .68fr); gap: clamp(64px, 9vw, 150px); align-items: end; max-width: 1376px; min-height: 760px; margin: auto; padding: 132px 7%; overflow: hidden; border-bottom: 1px solid var(--landing-line); background: linear-gradient(180deg, rgb(10 17 13 / 78%) 0%, #090e0b 16%, #080c0a 100%); scroll-margin-top: 24px; }
.capabilities::before { position: absolute; z-index: -2; inset: 0; background: linear-gradient(rgb(104 155 119 / 4%) 1px, transparent 1px), linear-gradient(90deg, rgb(104 155 119 / 4%) 1px, transparent 1px), radial-gradient(circle at 24% 42%, rgb(52 112 72 / 13%), transparent 46%); background-size: 72px 72px, 72px 72px, auto; mask-image: linear-gradient(90deg, transparent, #000 13%, #000 87%, transparent), linear-gradient(180deg, transparent, #000 16%, #000 88%, transparent); mask-composite: intersect; content: ''; pointer-events: none; }
.capabilities::after { position: absolute; z-index: -1; inset: 0; background: radial-gradient(ellipse at 52% 48%, transparent 38%, rgb(4 8 6 / 54%) 100%); content: ''; pointer-events: none; }
.flowing-lines { position: absolute; z-index: -1; inset: 0; width: 100%; height: 100%; color: #79d89a; opacity: .72; mask-image: linear-gradient(90deg, transparent, #000 10%, #000 90%, transparent); pointer-events: none; }
.flowing-lines__stream { fill: none; stroke: url(#capability-flow-fade); stroke-width: 1; vector-effect: non-scaling-stroke; animation: flow-drift 18s ease-in-out infinite alternate; }
.flowing-lines__stream path { stroke-dasharray: 12 10 46 14; animation: flow-trace 22s linear infinite; }
.flowing-lines__stream path:nth-child(2n) { animation-duration: 28s; animation-direction: reverse; }
.flowing-lines__stream path:nth-child(3n) { opacity: .58; }
.manifesto-copy { align-self: center; }
.chapter { margin: 0 0 34px; color: #8da095; font-size: 11px; letter-spacing: .12em; }
h2 { max-width: 900px; margin: 0; font-size: clamp(48px, 7vw, 100px); font-weight: 450; line-height: 1.08; letter-spacing: -.055em; text-wrap: balance; }
h2 span { color: #a8cfb2; }
.intro-copy { max-width: 600px; margin: 44px 0 0; color: var(--landing-muted); font-size: 16px; line-height: 2; text-wrap: pretty; }
.capability-index { align-self: end; }
.capability-row { display: grid; grid-template-columns: 36px minmax(0, 1fr) auto; align-items: center; gap: 18px; min-height: 118px; padding: 22px 12px 22px 0; border-top: 1px solid var(--landing-line); transition: background-color 200ms, transform 200ms; }
.capability-row:last-child { border-bottom: 1px solid var(--landing-line); }
.capability-row:hover { background: #18231c; transform: translateX(5px); }
.index { color: #70857a; font-size: 10px; font-variant-numeric: tabular-nums; }
.capability-row h3 { margin: 0; font-size: 18px; font-weight: 500; }
.capability-row p { margin: 8px 0 0; color: var(--landing-muted); font-size: 12px; line-height: 1.75; }
.link-label { color: #c6d9cb; font-size: 11px; }
@keyframes flow-drift { from { transform: translate3d(-1.5%, -1%, 0) scale(1.02); } to { transform: translate3d(1.5%, 1%, 0) scale(1.04); } }
@keyframes flow-trace { to { stroke-dashoffset: -164; } }
@media (max-width: 900px) { .capabilities { grid-template-columns: 1fr; gap: 68px; min-height: auto; padding-right: 32px; padding-left: 32px; }.capability-index { width: min(100%, 620px); margin-left: auto; }.flowing-lines { opacity: .55; }.flowing-lines__stream path:nth-child(even) { display: none; } }
@media (max-width: 600px) { .capabilities { gap: 48px; padding: 96px 24px 82px; }.chapter { margin-bottom: 26px; }.intro-copy { margin-top: 30px; font-size: 14px; line-height: 1.9; }.capability-row { grid-template-columns: 30px 1fr auto; min-height: 112px; padding-right: 0; }.flowing-lines { opacity: .42; } }
@media (prefers-reduced-motion: reduce) { .flowing-lines__stream, .flowing-lines__stream path { animation: none; }.capability-row { transition-duration: 0.001ms; }.capability-row:hover { transform: none; } }
</style>
