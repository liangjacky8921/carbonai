<template>
  <div class="auth-page">
    <!-- 背景动效：碳环 + 粒子网格 -->
    <div class="bg-fx">
      <div class="ring ring-1" />
      <div class="ring ring-2" />
      <div class="ring ring-3" />
      <div class="grid-overlay" />
    </div>

    <div class="auth-shell">
      <div class="brand">
        <img src="/favicon.svg" class="w-14 h-14 mb-3" alt="CarbonAI" />
        <h1 class="text-2xl font-bold tracking-wide">CarbonAI</h1>
        <p class="text-[12px] text-[var(--c-text-3)] mt-1 tracking-[3px]">时空智能碳管理平台 · V5.2</p>
      </div>
      <router-view v-slot="{ Component }">
        <transition name="page" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
      <p class="footer-note">© 2026 CarbonAI · carbontool.cn · 深色碳主题大屏数据可视化平台</p>
    </div>
  </div>
</template>

<style scoped>
.auth-page {
  min-height: 100vh; display: flex; align-items: center; justify-content: center;
  position: relative; overflow: hidden; padding: 24px;
}
.bg-fx { position: absolute; inset: 0; pointer-events: none; }
.ring {
  position: absolute; border-radius: 50%;
  border: 1px solid rgba(16, 185, 129, 0.15);
}
.ring-1 { width: 620px; height: 620px; top: -180px; right: -140px; animation: spin 60s linear infinite; border-style: dashed; }
.ring-2 { width: 420px; height: 420px; bottom: -140px; left: -120px; animation: spin 45s linear infinite reverse; border-color: rgba(14, 165, 233, 0.14); }
.ring-3 { width: 900px; height: 900px; top: 50%; left: 50%; transform: translate(-50%, -50%); border-color: rgba(16, 185, 129, 0.06); }
.grid-overlay {
  position: absolute; inset: 0;
  background-image:
    linear-gradient(rgba(16, 185, 129, 0.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(16, 185, 129, 0.04) 1px, transparent 1px);
  background-size: 44px 44px;
  mask-image: radial-gradient(ellipse at center, black 30%, transparent 75%);
}
@keyframes spin { to { transform: rotate(360deg); } }
.auth-shell {
  position: relative; z-index: 2; width: 100%; max-width: 420px;
  display: flex; flex-direction: column; align-items: center;
  animation: rise 0.6s ease both;
}
@keyframes rise { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: none; } }
.brand { text-align: center; margin-bottom: 26px; }
.footer-note { margin-top: 26px; font-size: 11px; color: var(--c-text-3); text-align: center; }
</style>
