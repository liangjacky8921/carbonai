<template>
  <div class="max-w-[1100px] mx-auto">
    <div class="c-card flex flex-col" style="height: calc(100vh - 150px)">
      <div class="c-card-title py-3">
        AI 碳管理顾问
        <el-tag size="small" type="success" effect="plain" style="margin-left: 8px">登录后可用</el-tag>
        <span class="ml-auto text-[11px] text-[var(--c-text-3)]">{{ backendOnline ? '🛡️ 服务器安全代理 · 密钥不出服务器' : '本地知识库模式' }}</span>
      </div>

      <div class="flex-1 min-h-0 overflow-auto px-4 py-3 space-y-4" ref="chatBox">
        <div class="text-center py-8">
          <div class="w-14 h-14 mx-auto rounded-2xl flex items-center justify-center mb-3"
            style="background: var(--c-green-soft); border: 1px solid rgba(16,185,129,0.3); animation: pulseGlow 2.4s infinite">
            <el-icon :size="26" color="#10b981"><ChatDotRound /></el-icon>
          </div>
          <p class="text-sm text-[var(--c-text)] font-medium">CarbonAI 碳管理顾问</p>
          <p class="text-xs text-[var(--c-text-3)] mt-1">碳核算 · CBAM · ESG 披露 · 碳市场 · 减排路径 — 任何碳管理问题都可以问我</p>
          <div class="flex flex-wrap justify-center gap-2 mt-4">
            <el-button v-for="q in quickQuestions" :key="q" size="small" round plain @click="send(q)">{{ q }}</el-button>
          </div>
        </div>

        <div v-for="(m, i) in messages" :key="i" class="msg" :class="m.role">
          <div class="bubble">{{ m.content }}</div>
        </div>
        <div v-if="thinking" class="msg assistant">
          <div class="bubble typing"><span /><span /><span /></div>
        </div>
      </div>

      <div class="p-3 border-t" style="border-color: var(--c-border)">
        <div class="flex gap-2">
          <el-input v-model="input" placeholder="输入碳管理问题…（Enter 发送）" :disabled="thinking"
            @keyup.enter="send(input)" clearable />
          <el-button type="primary" :loading="thinking" @click="send(input)">发送</el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { nextTick, ref } from 'vue'
import { ChatDotRound } from '@element-plus/icons-vue'
import { useToast } from '@/composables/useToast'
import { bizApi, backendOnline } from '@/api/client'
import { useDataStore } from '@/stores/data'

const toast = useToast()
const dataStore = useDataStore()
const input = ref('')
const thinking = ref(false)
const chatBox = ref<HTMLElement | null>(null)
const messages = ref<{ role: 'user' | 'assistant'; content: string }[]>([])

const quickQuestions = [
  '什么是 CBAM？哪些企业需要申报？',
  'Scope 1/2/3 如何划分？',
  'CEA 碳价走势如何研判？',
  '如何制定科学的减排路径？',
  '企业碳核算分几步？',
  'PCF/LCA 用什么数据库？',
  '绿电 PPA 和 I-REC 怎么选？',
  'CCER 2.0 有哪些方法学？',
  '第三方碳核查要准备什么？',
  'ISO 14064 和 GHG Protocol 什么关系？',
]

const LOCAL_KB: { kw: string[]; answer: string }[] = [
  { kw: ['cbam', '碳边境', '边境调节', 'border'], answer: 'EU CBAM（碳边境调节机制）2026年进入正式期：年进口 >50 吨覆盖产品的进口商须申报隐含碳排放并购买 CBAM 证书。覆盖钢铁、铝、水泥、化肥、氢、电力六大类。证书价格与 EUA 挂钩（当前约 €75/t），可按原产国已付碳价（如中国 CEA）抵扣。2026年 Omnibus 条例下证书覆盖率降至 50%。您可在「多标准报告」模块一键生成 CBAM 申报报告。' },
  { kw: ['scope', '范围一', '范围二', '范围三', '范围1', '范围2', '范围3', '范围划分', 'scope划分', '直接排放', '间接排放', '价值链'], answer: '温室气体核算三范围（GHG Protocol）：\n• Scope 1 直接排放 — 自有锅炉、窑炉、车辆、逸散（制冷剂/甲烷泄漏）等；\n• Scope 2 间接排放 — 外购电力、热力（按电网区域因子核算，南方电网 0.5703 kgCO₂/kWh）；\n• Scope 3 价值链排放 — 上下游 15 类（采购、运输、商务出行、员工通勤、废弃物等），通常占企业总排放 60-80%。\n建议先用本平台「碳排放核算」上传活动数据，系统自动按因子库匹配范围并核算。' },
  { kw: ['碳价', 'cea', '走势', '碳市场', '配额', 'eua', 'ccer', '核证', '全国碳', '上海环交'], answer: '全国碳市场行情参考（实时数据请在「数据大屏」查看后端拉取快照）：CEA ≈ ¥81/t（¥78-88区间震荡），CCER ≈ ¥82.6/t，EUA €75/t（¥等值约 658）。关键政策窗口：① 2026 第三履约周期清缴（12.31）；② 钢铁/水泥/铝冶炼纳入扩围；③ CCER 重启供给。建议关注本平台「碳资产管理」模块的配额盈缺分析。' },
  { kw: ['减排', '路径', '碳中和', 'net zero', '目标设定', 'scti', '科学碳目标', 'sbti'], answer: '科学减排路径（SBTi 1.5°C 标准）：① 基线盘查（Scope 1-3 全面核算 + 排放点源定位）；② 优先级排序 — 能效提升（电机变频 / LED 改造，节电 20-30%）、燃料替代（电代油 / 绿氢）、绿电采购（PPA / 分布式光伏，单厂 5MW 光伏年减排 ≈ 5000 tCO₂）、供应链协同（Scope 3 通常占 60-80%）；③ 设定近期目标（2030 较基准年 -35%~50%）与净零目标（2050 前）；④ 内部碳定价（¥100-300/t）驱动投资决策。' },
  { kw: ['esg', '披露', 'hkex', 'issb', '报告', 'csrd', 'esrs', '碳披露项目', 'cdp', '碳审计'], answer: '主流披露标准速查：中国沪深交易所《可持续发展报告指引》（2026.1 修订，强制气候相关财务披露）、港交所 ESG Code Part D（LargeCap 强制 IFRS S2 气候指标）、ISSB IFRS S1/S2（全球可持续 + 气候）、EU CSRD/ESRS E1（欧盟企业可持续发展，2026 年起分阶段强制）、CDP（碳披露项目，9000+ 企业参评）。本平台「多标准报告」模块支持 12 项标准一键生成合规报告（PDF/Word）。' },
  { kw: ['核算', '标准', 'ghg', 'iso 14064', '核算标准', '指南', 'protocole'], answer: '碳核算核心标准：\n• GHG Protocol（温室气体核算体系）— 企业级核算的全球通用框架，含 Scope 1/2/3 划分方法论；\n• ISO 14064-1:2018 — 组织层面温室气体排放核查，明确边界设定与实质性原则；\n• ISAE 3410 — 第三方核查标准（合理保证 vs. 有限保证）；\n• GB/T 32150 — 中国工业企业温室气体排放核算与报告通用要求。\n本平台因子库含 22 项标准因子（电网/燃料/运输/工艺等），自动匹配 Scope 归属。' },
  { kw: ['pcf', 'lca', '产品碳足迹', '产品碳', 'iso 14067', '生命周期', 'ecoinvent', 'ELCD', '数据库', '中国lca'], answer: '产品碳足迹（PCF/LCA）核心方法：\n• ISO 14067:2018 — 产品温室气体排放量化要求，规定 BOM/BOL-TO-BOL 系统边界；\n• ILCD Handbook — 国际参考生命周期数据系统（免费）；\n• Ecoinvent 3.9 — 最常用商业数据库（覆盖 18,000+ 过程）；\n• 中国产品全生命周期温室气体排放系数库 — 国产免费数据源（2024 年更新）。\n本平台「产品碳足迹 LCA」模块支持 BOM 级建模与三阶段排放拆解。' },
  { kw: ['绿电', 'ppa', '可再生', 'i-rec', '认证', '绿色电力', '光伏', '风电', '水电'], answer: '绿电采购与认证体系：\n• PPA（购电协议）— 企业直签新能源电站购电，长期锁定电价与绿电属性；\n• I-REC（国际可再生能源证书）— 全球可交易的绿电证书（1 张 = 1 MWh），支持企业 EAC 与 SBTi 目标；\n• GB/T 38775 绿色电力证书 — 中国绿电交易凭证；\n• 绿电配额合规 — 2026 年绿电交易均价约 ¥120/MWh，绿电替代网电每 MWh 减排 ≈ 0.57 tCO₂。' },
  { kw: ['ccer', '方法学', '核证减排', '自愿减排', '国家核证', 'ccer2'], answer: 'CCER（国家核证自愿减排量）方法学概览：\n• CCER 2.0 重启（2025 年）— 首批开放 18 个方法学，含林业碳汇、风电/光伏、甲烷回收利用、能效提升等；\n• 核证流程 — 项目设计（PDD）→ 审定 → 注册 → 监测 → 核查核证 → 注册登记；\n• 价格参考：¥82-85/t，历史峰值 ¥130/t（2021），当前主要用于重点排放单位履约抵消（最高 5%）。' },
  { kw: ['范围三', 'scope3', '供应链', '下游', '上游', '类别', '类别一', '类别二', '范围3数据'], answer: 'Scope 3 数据获取策略（价值链 15 类）：\n• Upstream（8 类）— 采购物料排放（Ecoinvent / ELCD 过程数据库）、资本货物、燃料相关、运输配送、废弃物处理、商务出行、员工通勤、租赁资产；\n• Downstream（7 类）— 运输配送、加工、使用、废弃处理、租赁资产、特许经营、投资；\n• 数据层级：Primary（供应商自报）> Generic（数据库平均）> Spend-based（支出法估算）；\n• 质量提升：推动 5-10 家核心供应商提供 Scope 1/2 自报数据（CDP 供应链问卷）。' },
  { kw: ['核查', '第三方', '审定', '保证', 'isae 3410', 'gb/t 23646', '审验'], answer: '第三方碳核查体系：\n• ISAE 3410 — 国际通用的温室气体排放核查保证标准，分"合理保证"（审计级）与"有限保证"；\n• GB/T 23646 — 中国组织温室气体排放核查标准，与 ISO 14064 对应；\n• 核查周期：重点排放单位每年需提交第三方核查报告供主管部门清缴；\n• 核查准备：提前整理活动数据台账（燃料/电力/运输/工艺）、排放因子来源文档、边界设定依据。' },
  { kw: ['数据质量', 'dqr', '置信度', 'gap', '不确定性', '数据管理'], answer: '碳数据质量评估（DQR / Data Quality Rating）：\n• IPCC DQR 框架 — 数据代表性 + 方法学 + 数据源 + 完整性 × 可靠性，每项 1-5 分；\n• 高置信度（DQR ≥ 4）— 计量设备直接读数 + 直接监测；\n• 低置信度（DQR < 3）— 默认因子 + 专家估算；\n• 本平台因子库标注 DQR 评级，核算报告自动区分置信度；\n• 不确定性来源：活动数据计量误差（±2-5%）、因子差异（±5-15%）、边界设定（±10-30%）。' },
  { kw: ['企业', '组织', '核算', '报告', '企业碳', '企业级'], answer: '企业碳核算 5 步标准流程：\n① 组织边界设定（股权比例法 / 运营控制法 / 财务控制法，GHG Protocol 推荐运营控制）；\n② 运营边界设定（Scope 1 直接排放、Scope 2 外购电力热力、Scope 3 价值链上下游）；\n③ 活动数据收集（燃料消耗量、用电量、运输里程、原材料消耗、制冷剂使用量等）；\n④ 排放因子匹配（区域电网因子 / IPCC 默认因子 / Ecoinvent 过程因子，本平台因子库自动匹配）；\n⑤ 核算与报告（各 Scope 加总 + 不确定性评估 + 关键排放源识别）。' },
  { kw: ['标准', '分类', '方法学', '协议', 'protocol'], answer: '常用碳管理标准分类索引：\n【核算框架】GHG Protocol（企业/项目/产品）、ISO 14064-1（组织）、ISO 14067（产品）、ISO 14065（核查机构）\n【披露】ISSB IFRS S1/S2、EU CSRD/ESRS E1、港交所 ESG Code、沪深指引、CDP\n【方法学】CCER 2.0 方法学集、CDM 方法学（已过期但仍有参考）、Gold Standard（自愿减排）\n【验证】ISAE 3410（核查保证）、GB/T 23646（中国核查）\n【目标设定】SBTi 1.5°C / 2°C / 净零标准、Science Based Targets。' },
]

async function send(q?: string) {
  const text = (q || input.value).trim()
  if (!text) return
  if (thinking.value) return
  input.value = ''
  messages.value.push({ role: 'user', content: text })
  thinking.value = true
  await nextTick()
  chatBox.value?.scrollTo({ top: chatBox.value.scrollHeight, behavior: 'smooth' })

  let answer = ''
  if (backendOnline) {
    const r = await bizApi.chat(text, messages.value.slice(-8))
    answer = r.code === 200 ? String(r.data) : `后端暂不可用：${r.message}\n\n已自动回退到本地碳管理知识库。`
  }
  if (!answer) {
    await new Promise((res) => setTimeout(res, 700))
    const lower = text.toLowerCase()
    const hit = LOCAL_KB.find((k) => k.kw.some((w) => lower.includes(w)))
    if (hit) {
      answer = hit.answer
    } else {
      const topics = ['CBAM', 'Scope 1/2/3 划分', '碳价走势', '减排路径（SBTi）', 'ESG 披露标准', '企业碳核算流程', '产品碳足迹 LCA', '绿电认证', 'CCER 方法学', '第三方核查', '数据质量 DQR', '标准分类索引']
      answer = `收到您的问题：「${text}」\n\n当前运行于本地碳管理知识库模式，可覆盖 ${topics.join('、')} 等专题。\n\n如需接入真实大模型（服务器端代理，密钥不暴露），请联系管理员在服务器 /etc/carbonai/carbonai.env 配置 AI_API_KEY（支持 DeepSeek / SiliconFlow / Moonshot 等 OpenAI 兼容协议）。`
    }
  }

  messages.value.push({ role: 'assistant', content: answer })
  thinking.value = false
  await nextTick()
  chatBox.value?.scrollTo({ top: chatBox.value.scrollHeight, behavior: 'smooth' })
}
</script>

<style scoped>
.msg { display: flex; }
.msg.user { justify-content: flex-end; }
.bubble {
  max-width: 76%; padding: 10px 14px; border-radius: 12px; font-size: 13px; line-height: 1.8;
  white-space: pre-wrap;
}
.msg.user .bubble { background: var(--c-green-deep); color: #fff; border-bottom-right-radius: 4px; }
.msg.assistant .bubble {
  background: var(--c-surface-2); border: 1px solid var(--c-border); color: var(--c-text);
  border-bottom-left-radius: 4px;
}
.typing { display: flex; gap: 5px; align-items: center; padding: 14px; }
.typing span { width: 7px; height: 7px; border-radius: 50%; background: var(--c-green); animation: blink 1.2s infinite; }
.typing span:nth-child(2) { animation-delay: 0.2s; }
.typing span:nth-child(3) { animation-delay: 0.4s; }
@keyframes blink { 0%, 80%, 100% { opacity: 0.25; } 40% { opacity: 1; } }
</style>
