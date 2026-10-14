<script setup lang="ts">
import { computed, ref } from 'vue'

const steps = [
  { number: '01', title: '数据采集', summary: '整理活动数据', description: '导入并整理业务活动数据，保留时间、范围与计量单位等核算上下文。', iconPath: 'M4 7h16M7 4v16M17 4v16M4 17h16' },
  { number: '02', title: '数据校验', summary: '核对边界与单位', description: '检查字段完整性、统计边界与计量单位，并呈现已有的低置信提示。', iconPath: 'm5 12 4 4L19 6' },
  { number: '03', title: '排放核算', summary: '匹配因子并计算', description: '匹配排放因子来源与版本，执行现有核算流程并形成可复核的核算明细。', iconPath: 'M5 5h14v14H5zM8 9h8M8 13h8' },
  { number: '04', title: 'GIS 时空分析', summary: '理解空间关系', description: '结合现有地图图层、排放点位与轨迹，在地理上下文中查看位置关系。', iconPath: 'M12 21s6-5.1 6-11a6 6 0 1 0-12 0c0 5.9 6 11 6 11zM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z' },
  { number: '05', title: '预警与报告', summary: '复核提示与输出', description: '复核已有阈值提示，并衔接报告查看与导出；具体内容以实际配置为准。', iconPath: 'M6 3h9l3 3v15H6zM15 3v4h4M9 12h6M9 16h6' },
] as const

const activeIndex = ref(0)
const activeStep = computed(() => steps[activeIndex.value])
</script>

<template>
  <section id="provenance" class="provenance" data-story-section data-story-reveal aria-labelledby="provenance-title">
    <svg class="contour-field" viewBox="0 0 1376 760" preserveAspectRatio="none" aria-hidden="true">
      <g class="contour-field__lines">
        <path d="M-92 178C92 54 247 68 348 164s198 113 310 37 237-71 335 38 236 108 467-29" />
        <path d="M-78 220C98 100 251 110 351 200s198 106 311 36 237-65 334 37 236 101 454-28" />
        <path d="M-60 264C106 150 256 153 354 238s198 98 312 34 237-58 333 35 235 94 435-26" />
        <path d="M-42 310C116 202 261 198 359 276s198 91 312 32 236-51 331 34 232 86 414-25" />
        <path d="M46 590c104-112 214-142 318-82s193 55 286-32 203-108 302-27 203 93 378 7" />
        <path d="M70 628c101-104 209-130 309-76s187 50 278-30 197-99 292-25 195 84 360 6" />
        <path d="M98 666c97-96 201-118 297-69s181 44 268-28 189-89 280-23 186 76 342 6" />
      </g>
    </svg>
    <div class="provenance-heading">
      <p class="chapter">03 / 06 · DATA INTELLIGENCE</p>
      <h2 id="provenance-title">让每一步核算，<br />都有清楚的<span>来路。</span></h2>
      <p class="intro">平台将数据整理、边界校验、排放核算、空间分析与报告衔接放进同一条可检查的工作路径。</p>
      <nav class="process-actions" aria-label="数据链路相关功能">
        <RouterLink :to="{ name: 'accounting' }">核算模块</RouterLink>
        <RouterLink :to="{ name: 'gis' }">GIS 模块</RouterLink>
        <RouterLink :to="{ name: 'report' }">报告模块</RouterLink>
      </nav>
    </div>

    <div class="process-stage">
      <ol class="process-list" aria-label="CarbonAI 数据工作路径">
        <li v-for="(step, index) in steps" :key="step.number" :class="{ active: activeIndex === index }">
          <button type="button" :aria-pressed="activeIndex === index" aria-controls="process-detail" @click="activeIndex = index" @focus="activeIndex = index">
            <span class="node-mark" aria-hidden="true"><svg viewBox="0 0 24 24"><path :d="step.iconPath" /></svg></span>
            <span class="node-number">{{ step.number }}</span>
            <strong>{{ step.title }}</strong>
            <small>{{ step.summary }}</small>
          </button>
        </li>
      </ol>

      <div id="process-detail" class="process-detail" aria-live="polite">
        <span class="detail-number">{{ activeStep.number }}</span>
        <div>
          <p>当前步骤</p>
          <h3>{{ activeStep.title }}</h3>
          <p>{{ activeStep.description }}</p>
        </div>
      </div>
      <p class="scope-note">具体核算边界、因子版本、提示条件和输出内容，以业务页面与实际配置为准。</p>
    </div>
  </section>
</template>

<style scoped>
.provenance { position: relative; display: grid; grid-template-columns: minmax(270px, .72fr) minmax(0, 1.28fr); gap: clamp(64px, 8vw, 132px); max-width: 1376px; margin: auto; padding: 124px 7% 110px; overflow: hidden; border-bottom: 1px solid var(--landing-line); background: linear-gradient(135deg, #0b110e 0%, #0e1613 54%, #090e0c 100%); scroll-margin-top: 24px; }
.provenance::before { position: absolute; inset: 0; background: linear-gradient(rgb(106 148 118 / 3%) 1px, transparent 1px), linear-gradient(90deg, rgb(106 148 118 / 3%) 1px, transparent 1px), radial-gradient(circle at 78% 42%, rgb(64 128 82 / 11%), transparent 38%), radial-gradient(circle at 12% 82%, rgb(50 105 68 / 7%), transparent 31%); background-size: 76px 76px, 76px 76px, auto, auto; content: ''; pointer-events: none; }
.contour-field { position: absolute; z-index: 0; inset: 0; width: 100%; height: 100%; opacity: .42; mask-image: linear-gradient(90deg, transparent, #000 11%, #000 89%, transparent); pointer-events: none; animation: contour-drift 34s ease-in-out infinite alternate; }
.contour-field__lines { fill: none; stroke: rgb(113 176 130 / 23%); stroke-width: 1; vector-effect: non-scaling-stroke; }
.contour-field__lines path:nth-child(2n) { stroke: rgb(139 194 151 / 14%); }
.provenance-heading, .process-stage { position: relative; z-index: 1; }
.provenance-heading { align-self: start; }
.chapter { margin: 6px 0 30px; color: #82978a; font-size: 10px; letter-spacing: .14em; }
h2 { margin: 0; font-size: clamp(38px, 4.2vw, 62px); font-weight: 470; line-height: 1.22; letter-spacing: -.045em; text-wrap: balance; }
h2 span { color: #a8cfb2; }
.intro { max-width: 420px; margin: 34px 0 0; color: var(--landing-muted); font-size: 14px; line-height: 1.95; }
.process-actions { display: flex; flex-wrap: wrap; gap: 10px 22px; margin-top: 42px; }
.process-actions a { display: inline-flex; align-items: center; min-height: 42px; border-bottom: 1px solid #556d5e; color: #adc2b3; font-size: 11px; transition: color 180ms, border-color 180ms; }
.process-actions a:hover, .process-actions a:focus-visible { border-color: #b9d8c0; color: #eef8f0; }
.process-stage { align-self: center; min-width: 0; }
.process-list { position: relative; display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 12px; margin: 0; padding: 0; list-style: none; }
.process-list::before { position: absolute; top: 33px; right: 8%; left: 8%; height: 1px; background: linear-gradient(90deg, transparent, #44604f 8%, #688674 50%, #44604f 92%, transparent); content: ''; }
.process-list li { position: relative; min-width: 0; }
.process-list button { position: relative; display: grid; width: 100%; min-height: 178px; padding: 0 10px 18px; border: 0; border-bottom: 1px solid #26372d; color: inherit; background: transparent; text-align: left; cursor: pointer; transition: border-color 180ms, background-color 180ms; }
.process-list button:hover { background: rgb(70 108 81 / 7%); }
.process-list button:focus-visible { outline: 1px solid #84a88f; outline-offset: 4px; }
.node-mark { position: relative; z-index: 1; display: grid; width: 66px; height: 66px; margin-bottom: 25px; place-items: center; border: 1px solid #405849; border-radius: 50%; background: #0d1511; box-shadow: 0 0 0 7px rgb(14 22 18 / 82%); transition: border-color 180ms, background-color 180ms, box-shadow 180ms; }
.node-mark svg { width: 23px; height: 23px; fill: none; stroke: #82998a; stroke-width: 1.25; stroke-linecap: round; stroke-linejoin: round; transition: stroke 180ms; }
.node-number { position: absolute; top: 5px; right: 10px; color: #52675a; font-size: 9px; letter-spacing: .1em; font-variant-numeric: tabular-nums; }
.process-list strong { display: block; min-height: 44px; font-size: 14px; font-weight: 520; line-height: 1.45; }
.process-list small { display: block; margin-top: 8px; color: #718379; font-size: 10px; line-height: 1.55; }
.process-list li.active button { border-color: #70927b; background: linear-gradient(180deg, rgb(77 124 91 / 8%), transparent); }
.process-list li.active .node-mark { border-color: #94bea0; background: #132119; box-shadow: 0 0 0 7px rgb(14 22 18 / 90%), 0 0 30px rgb(83 153 103 / 18%); }
.process-list li.active .node-mark svg { stroke: #b9d9c0; }
.process-list li.active strong { color: #eaf4ec; }
.process-detail { display: grid; grid-template-columns: 56px minmax(0, 1fr); gap: 22px; min-height: 154px; margin-top: 42px; padding: 28px 30px; border: 1px solid #293b30; background: rgb(8 14 11 / 72%); }
.detail-number { padding-top: 3px; color: #73927c; font-size: 11px; letter-spacing: .12em; font-variant-numeric: tabular-nums; }
.process-detail p { max-width: 590px; margin: 0; color: var(--landing-muted); font-size: 12px; line-height: 1.8; }
.process-detail div > p:first-child { margin-bottom: 6px; color: #71867a; font-size: 9px; letter-spacing: .12em; }
.process-detail h3 { margin: 0 0 10px; font-size: 19px; font-weight: 520; }
.scope-note { max-width: 680px; margin: 17px 0 0; color: #72857a; font-size: 10px; line-height: 1.7; }
@keyframes contour-drift { from { transform: translate3d(-1%, 0, 0) scale(1.01); } to { transform: translate3d(1%, -.8%, 0) scale(1.025); } }
@media (max-width: 960px) { .provenance { grid-template-columns: 1fr; gap: 74px; }.provenance-heading { max-width: 700px; }.intro { max-width: 600px; }.process-stage { width: 100%; } }
@media (max-width: 700px) { .provenance { gap: 58px; padding: 88px 24px 78px; }.contour-field { opacity: .25; }.contour-field__lines path:nth-child(even) { display: none; }.process-list { grid-template-columns: 1fr; gap: 0; }.process-list::before { top: 28px; bottom: 28px; left: 28px; width: 1px; height: auto; background: linear-gradient(180deg, transparent, #56705f 8%, #56705f 92%, transparent); }.process-list button { grid-template-columns: 58px 36px minmax(0, 1fr); grid-template-rows: auto auto; column-gap: 12px; min-height: 94px; padding: 10px 8px 16px 0; align-items: center; border-bottom-color: #233229; }.node-mark { grid-row: 1 / 3; width: 56px; height: 56px; margin: 0; }.node-number { position: static; grid-column: 2; grid-row: 1 / 3; align-self: center; }.process-list strong { grid-column: 3; min-height: 0; align-self: end; }.process-list small { grid-column: 3; margin-top: 2px; align-self: start; }.process-detail { grid-template-columns: 42px minmax(0, 1fr); min-height: 170px; margin-top: 30px; padding: 24px 20px; } }
@media (prefers-reduced-motion: reduce) { .contour-field { animation: none; }.process-list button, .node-mark, .node-mark svg, .process-actions a { transition: none; } }
</style>
