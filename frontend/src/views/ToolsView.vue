<template>
  <div class="max-w-[1100px] mx-auto space-y-4">
    <div class="c-card p-4 tools-context" role="note"><strong>碳计算器</strong><span>输入即席估算，不写入企业核算台账。页面内置因子仅供参考；电网因子标注为 2023 年资料，其余因子未提供独立版本，请核实适用地区与年份。</span></div>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
    <!-- 电力碳排放 -->
    <div class="c-card p-4 space-y-3">
      <div class="c-card-title">⚡ 电力碳排放计算</div>
      <p class="text-[11px] text-[var(--c-text-3)]">根据用电量和所在电网区域计算 Scope 2 排放</p>
      <el-input v-model="elec.kwh" type="number" inputmode="decimal" placeholder="用电量 (kWh)" size="small" aria-label="用电量" />
      <el-select v-model="elec.grid" size="small" aria-label="电网区域">
        <el-option label="南方电网 (0.5703)" value="south" />
        <el-option label="华东电网 (0.5890)" value="east" />
        <el-option label="华北电网 (0.7410)" value="north" />
        <el-option label="华中电网 (0.5250)" value="central" />
        <el-option label="西北电网 (0.6120)" value="northwest" />
        <el-option label="东北电网 (0.7760)" value="northeast" />
      </el-select>
      <el-button type="primary" size="small" @click="calcElec">计算</el-button>
      <p v-if="errors.elec" class="calc-error" role="alert">{{ errors.elec }}</p>
      <div v-if="elec.result" class="calc-result" role="status" v-html="elec.result" />
    </div>

    <!-- 燃料燃烧 -->
    <div class="c-card p-4 space-y-3">
      <div class="c-card-title">🔥 燃料燃烧排放</div>
      <p class="text-[11px] text-[var(--c-text-3)]">计算煤/油/气等燃料燃烧产生的 Scope 1 排放</p>
      <el-select v-model="fuel.type" size="small" aria-label="燃料类型">
        <el-option label="烟煤 (1.9003 tCO₂/t)" value="烟煤" />
        <el-option label="无烟煤 (2.53 tCO₂/t)" value="无烟煤" />
        <el-option label="柴油 (3.1605 tCO₂/t)" value="柴油" />
        <el-option label="汽油 (2.9251 tCO₂/t)" value="汽油" />
        <el-option label="天然气 (21.84 tCO₂/万m³)" value="天然气" />
      </el-select>
      <el-input v-model="fuel.qty" type="number" inputmode="decimal" :placeholder="`消耗量（${fuelUnitHint}）`" size="small" aria-label="燃料消耗量" />
      <el-button type="primary" size="small" @click="calcFuel">计算</el-button>
      <p v-if="errors.fuel" class="calc-error" role="alert">{{ errors.fuel }}</p>
      <div v-if="fuel.result" class="calc-result" role="status" v-html="fuel.result" />
    </div>

    <!-- 通勤 -->
    <div class="c-card p-4 space-y-3">
      <div class="c-card-title">🚌 通勤碳足迹</div>
      <p class="text-[11px] text-[var(--c-text-3)]">员工通勤碳排放估算（年排放）</p>
      <el-input v-model="commute.dist" type="number" inputmode="decimal" placeholder="单程通勤距离 (km)" size="small" aria-label="单程通勤距离" />
      <el-select v-model="commute.mode" size="small" aria-label="通勤方式">
        <el-option label="私家车(汽油) (0.20 kg/km)" value="私家车(汽油)" />
        <el-option label="公交车 (0.05)" value="公交车" />
        <el-option label="地铁 (0.035)" value="地铁" />
        <el-option label="电动车 (0.04)" value="电动车" />
      </el-select>
      <el-button type="primary" size="small" @click="calcCommute">计算</el-button>
      <p v-if="errors.commute" class="calc-error" role="alert">{{ errors.commute }}</p>
      <div v-if="commute.result" class="calc-result" role="status" v-html="commute.result" />
    </div>

    <!-- 飞行 -->
    <div class="c-card p-4 space-y-3">
      <div class="c-card-title">✈️ 差旅飞行碳足迹</div>
      <p class="text-[11px] text-[var(--c-text-3)]">商务飞行碳排放计算（单程）· 因子来源 ICAO CORSIA</p>
      <el-select v-model="flight.route" size="small" aria-label="飞行航线">
        <el-option label="北京-上海 (1200km)" value="1200" />
        <el-option label="上海-深圳 (1350km)" value="1350" />
        <el-option label="广州-成都 (1300km)" value="1300" />
        <el-option label="深圳-伦敦 (9600km)" value="9600" />
        <el-option label="香港-纽约 (13000km)" value="13000" />
      </el-select>
      <el-select v-model="flight.cls" size="small" aria-label="舱位等级">
        <el-option label="经济舱 (0.115 kg/人·km)" value="eco" />
        <el-option label="商务舱 (0.18 kg/人·km)" value="biz" />
      </el-select>
      <el-button type="primary" size="small" @click="calcFlight">计算</el-button>
      <p v-if="errors.flight" class="calc-error" role="alert">{{ errors.flight }}</p>
      <div v-if="flight.result" class="calc-result" role="status" v-html="flight.result" />
    </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive } from 'vue'

const elec = reactive({ kwh: '', grid: 'south', result: '' })
const fuel = reactive({ type: '烟煤', qty: '', result: '' })
const commute = reactive({ dist: '', mode: '私家车(汽油)', result: '' })
const flight = reactive({ route: '1200', cls: 'eco', result: '' })
const errors = reactive({ elec: '', fuel: '', commute: '', flight: '' })

function validAmount(value: string, key: 'elec' | 'fuel' | 'commute') {
  const number = Number(value)
  errors[key] = value.trim() && Number.isFinite(number) && number >= 0 ? '' : '请输入有效的非负数值。'
  return !errors[key]
}

const fuelUnitHint = computed(() => fuel.type === '天然气' ? '万m³' : '吨')
const gridFactor: Record<string, number> = { south: 0.5703, east: 0.589, north: 0.741, central: 0.525, northwest: 0.612, northeast: 0.776 }
const fuelFactor: Record<string, number> = { 烟煤: 1.9003, 无烟煤: 2.53, 柴油: 3.1605, 汽油: 2.9251, 天然气: 21.84 }
const commuteFactor: Record<string, number> = { '私家车(汽油)': 0.2, 公交车: 0.05, 地铁: 0.035, 电动车: 0.04 }

function calcElec() {
  elec.result = ''
  if (!validAmount(elec.kwh, 'elec')) return
  const kwh = parseFloat(elec.kwh) || 0
  const ef = gridFactor[elec.grid]
  const co2 = (kwh * ef) / 1000
  elec.result = `碳排放量：<b class="text-green">${co2.toFixed(3)} tCO₂e</b><br><span class="text-[11px]">因子: ${ef} kgCO₂e/kWh · 来源: 中国电网 2023</span>`
}
function calcFuel() {
  fuel.result = ''
  if (!validAmount(fuel.qty, 'fuel')) return
  const qty = parseFloat(fuel.qty) || 0
  const ef = fuelFactor[fuel.type]
  const co2 = qty * ef
  fuel.result = `碳排放量：<b class="text-green">${co2.toFixed(3)} tCO₂e</b><br><span class="text-[11px]">因子: ${ef} · 来源: IPCC 2006 / 国家发改委</span>`
}
function calcCommute() {
  commute.result = ''
  if (!validAmount(commute.dist, 'commute')) return
  const dist = parseFloat(commute.dist) || 0
  const ef = commuteFactor[commute.mode]
  const annual = (dist * 2 * 250 * ef) / 1000
  commute.result = `年碳排放：<b class="text-green">${annual.toFixed(3)} tCO₂e</b> /年<br><span class="text-[11px]">按 250 个工作日、每日往返计算</span>`
}
function calcFlight() {
  errors.flight = ''
  const dist = parseInt(flight.route)
  const ef = flight.cls === 'biz' ? 0.18 : 0.115
  const co2 = (dist * ef) / 1000
  flight.result = `单程碳排放：<b class="text-green">${co2.toFixed(3)} tCO₂e</b>（往返 ×2 = ${(co2 * 2).toFixed(3)}）<br><span class="text-[11px]">来源: ICAO CORSIA</span>`
}
</script>

<style scoped>
.tools-context { display: grid; gap: .35rem; }
.tools-context strong { color: var(--c-text); }
.tools-context span { color: var(--c-text-3); font-size: .76rem; line-height: 1.65; }
.calc-error { color: var(--c-amber); font-size: .76rem; }
.calc-result {
  padding: 10px 12px; border-radius: 8px; font-size: 13px; line-height: 1.8;
  background: var(--c-green-soft); border: 1px solid rgba(16, 185, 129, 0.25);
}
</style>
