<template>
  <div class="max-w-[1100px] mx-auto">
    <div class="c-card flex flex-col" style="height: calc(100vh - 150px)">
      <div class="c-card-title py-3">
        AI 碳管理顾问
        <el-tag size="small" type="success" effect="plain" style="margin-left: 8px">登录后可用</el-tag>
        <span class="ml-auto text-[11px] text-[var(--c-text-3)]">🛡️ 服务器代理 · 密钥安全（后端接入后启用）</span>
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
]

const LOCAL_KB: { kw: string[]; answer: string }[] = [
  { kw: ['cbam', '碳边境'], answer: 'EU CBAM（碳边境调节机制）2026年进入正式期：年进口 >50 吨覆盖产品的进口商须申报隐含碳排放并购买 CBAM 证书。覆盖钢铁、铝、水泥、化肥、氢、电力六大类。证书价格与 EUA 挂钩（当前约 €75/t），可按原产国已付碳价（如中国 CEA）抵扣。2026年 Omnibus 条例下证书覆盖率降至 50%。您可在「多标准报告」模块一键生成 CBAM 申报报告。' },
  { kw: ['scope', '范围一', '范围二', '范围三', '范围1', '划分'], answer: '温室气体核算三范围（GHG Protocol）：\n• Scope 1 直接排放 — 自有锅炉、窑炉、车辆、逸散等；\n• Scope 2 间接排放 — 外购电力、热力（按电网区域因子核算）；\n• Scope 3 价值链排放 — 上下游 15 类（采购、运输、商务出行、员工通勤、废弃物等）。\n建议先用本平台「碳排放核算」上传活动数据，系统自动按因子库匹配范围并核算。' },
  { kw: ['碳价', 'cea', '走势', '碳市场'], answer: '当前全国碳市场 CEA 约 ¥81/t（¥78-88 区间震荡），CCER 约 ¥82.6/t，复旦碳价指数预测中值 ¥80.4/t。欧盟 EUA €75/t（¥等值约 658）。建议关注：① 2026 第三履约周期清缴（12.31）；② 行业扩围（钢铁/水泥/铝冶炼纳入）；③ CCER 重启供给。详见「数据大屏」碳价走势与「碳资产管理」模块。' },
  { kw: ['减排', '路径', '碳中和', 'net zero'], answer: '科学减排路径建议（SBTi 1.5°C）：① 基线盘查（Scope 1-3 全面核算）；② 优先级排序 — 能效提升与燃料替代（Scope 1）、绿电采购 PPA/分布式光伏（Scope 2）、供应链协同（Scope 3）；③ 设定近期目标（2030 较基准年 -35%~50%）与净零目标（2050 前）；④ 内部碳定价机制驱动投资决策。可结合本平台「轨迹核算」优化物流排放、「因子库」选择低碳因子。' },
  { kw: ['esg', '披露', 'hkex', 'issb', '报告'], answer: '主流披露标准：中国沪深交易所《可持续发展报告指引》（2026.1 修订）、港交所 ESG Code Part D（LargeCap 强制 IFRS S2）、ISSB IFRS S1/S2、EU CSRD/ESRS E1、CBAM。本平台「多标准报告」模块支持 12 项标准一键生成合规报告（PDF/Word），排放数据自动填充。' },
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
    answer = r.code === 200 ? String(r.data) : `后端暂不可用：${r.message}（已回退本地知识库）`
  }
  if (!answer) {
    // 本地知识库回退（后端 AI 代理未接入时）
    await new Promise((res) => setTimeout(res, 700))
    const lower = text.toLowerCase()
    const hit = LOCAL_KB.find((k) => k.kw.some((w) => lower.includes(w)))
    answer = hit?.answer || `收到您的问题：「${text}」\n\n当前为前端独立模式，AI 大模型代理（DeepSeek，经服务器安全代理）将在后端接入后启用。您可以在本地知识库范围内提问：CBAM、Scope 划分、碳价走势、减排路径、ESG 披露等。\n\n💡 提示：启动 FastAPI 后端并配置 AI 接口后，本模块将自动切换为真实大模型对话。`
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
