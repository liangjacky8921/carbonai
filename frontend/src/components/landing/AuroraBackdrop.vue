<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, shallowRef, useTemplateRef } from 'vue'

const props = defineProps<{ paused: boolean }>()
const field = useTemplateRef<HTMLElement>('field')
const visible = shallowRef(true)
const pageHidden = shallowRef(false)
const reduced = shallowRef(false)
const running = computed(() => !props.paused && visible.value && !pageHidden.value && !reduced.value)
let observer: IntersectionObserver | undefined
let media: MediaQueryList | undefined
let finePointer: MediaQueryList | undefined
let pointerFrame = 0
let pointerEvent: PointerEvent | undefined

function syncVisibility() { pageHidden.value = document.hidden }
function syncPreference() { reduced.value = media?.matches ?? false }
function resetPointer() {
  if (!field.value) return
  field.value.style.setProperty('--pointer-x', '72%')
  field.value.style.setProperty('--pointer-y', '42%')
}
function renderPointer() {
  pointerFrame = 0
  if (!field.value || !pointerEvent || reduced.value || !finePointer?.matches) return
  const rect = field.value.getBoundingClientRect()
  if (!rect.width || !rect.height) return
  const x = Math.min(100, Math.max(0, ((pointerEvent.clientX - rect.left) / rect.width) * 100))
  const y = Math.min(100, Math.max(0, ((pointerEvent.clientY - rect.top) / rect.height) * 100))
  field.value.style.setProperty('--pointer-x', `${x.toFixed(2)}%`)
  field.value.style.setProperty('--pointer-y', `${y.toFixed(2)}%`)
}
function trackPointer(event: PointerEvent) {
  if (!running.value || reduced.value || !finePointer?.matches) return
  pointerEvent = event
  if (!pointerFrame) pointerFrame = requestAnimationFrame(renderPointer)
}

onMounted(() => {
  media = window.matchMedia('(prefers-reduced-motion: reduce)')
  finePointer = window.matchMedia('(pointer: fine)')
  syncPreference()
  syncVisibility()
  resetPointer()
  media.addEventListener('change', syncPreference)
  document.addEventListener('visibilitychange', syncVisibility)
  window.addEventListener('pointermove', trackPointer, { passive: true })
  document.documentElement.addEventListener('mouseleave', resetPointer)
  if ('IntersectionObserver' in window && field.value) {
    observer = new IntersectionObserver(([entry]) => { visible.value = entry.isIntersecting })
    observer.observe(field.value)
  }
})

onBeforeUnmount(() => {
  observer?.disconnect()
  if (pointerFrame) cancelAnimationFrame(pointerFrame)
  media?.removeEventListener('change', syncPreference)
  document.removeEventListener('visibilitychange', syncVisibility)
  window.removeEventListener('pointermove', trackPointer)
  document.documentElement.removeEventListener('mouseleave', resetPointer)
})
</script>

<template>
  <div ref="field" class="aurora" :data-running="running" aria-hidden="true">
    <div class="aurora-ribbon ribbon-one" />
    <div class="aurora-ribbon ribbon-two" />
    <div class="aurora-grid" />
    <div class="aurora-focus" />
    <div class="aurora-grain" />
  </div>
</template>

<style scoped>
.aurora { --pointer-x: 72%; --pointer-y: 42%; position: absolute; inset: 0; overflow: hidden; pointer-events: none; background: radial-gradient(ellipse at 75% 45%, #153c2b 0, transparent 55%), #101715; }
.aurora-ribbon { position: absolute; top: 7%; right: -28%; width: 110%; height: 85%; border-radius: 50%; background: radial-gradient(ellipse, transparent 32%, rgba(79, 154, 116, 0.3) 47%, rgba(41, 96, 67, 0.12) 61%, transparent 72%); transform: rotate(-24deg) scaleY(0.62); animation: drift 24s ease-in-out infinite alternate; animation-play-state: paused; }
.ribbon-two { top: 24%; right: -38%; opacity: 0.7; background: radial-gradient(ellipse, transparent 33%, rgba(115, 178, 149, 0.19) 47%, transparent 67%); animation-duration: 31s; animation-delay: -13s; }
.aurora-grid { position: absolute; inset: 18% -16% -34% 42%; opacity: 0.09; background-image: linear-gradient(rgba(164, 207, 177, 0.34) 1px, transparent 1px), linear-gradient(90deg, rgba(164, 207, 177, 0.34) 1px, transparent 1px); background-size: 68px 68px; mask-image: radial-gradient(ellipse at 52% 46%, #000 0 28%, transparent 72%); transform: perspective(620px) rotateX(59deg) rotateZ(-13deg) translate3d(0, 0, 0); transform-origin: 55% 55%; animation: grid-drift 26s ease-in-out infinite alternate; animation-play-state: paused; }
.aurora-focus { position: absolute; inset: 0; opacity: 0.72; background: radial-gradient(circle 270px at var(--pointer-x) var(--pointer-y), rgba(169, 222, 183, 0.13), rgba(63, 131, 85, 0.045) 45%, transparent 72%); transition: opacity 500ms ease; }
.aurora[data-running="true"] .aurora-ribbon,
.aurora[data-running="true"] .aurora-grid { animation-play-state: running; }
.aurora[data-running="false"] .aurora-focus { opacity: 0.42; }
.aurora-grain { position: absolute; inset: 0; opacity: 0.045; background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 128 128' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.82' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Cpath fill='%23fff' filter='url(%23n)' d='M0 0h128v128H0z'/%3E%3C/svg%3E"); }
@keyframes drift { from { opacity: 0.65; transform: translate3d(-2%, 2%, 0) rotate(-24deg) scaleY(0.62); } to { opacity: 1; transform: translate3d(4%, -4%, 0) rotate(-13deg) scaleY(0.76); } }
@keyframes grid-drift { from { transform: perspective(620px) rotateX(59deg) rotateZ(-13deg) translate3d(-1.5%, 1%, 0); } to { transform: perspective(620px) rotateX(57deg) rotateZ(-10deg) translate3d(2.5%, -2%, 0); } }
@media (max-width: 600px) {
  .aurora-ribbon { right: -75%; width: 150%; opacity: 0.55; }
  .aurora-grid { inset: 34% -70% -28% 18%; opacity: 0.055; background-size: 54px 54px; }
  .aurora-focus { display: none; }
}
@media (prefers-reduced-motion: reduce) {
  .aurora-ribbon, .aurora-grid { animation: none; }
  .aurora-focus { opacity: 0.38; transition: none; }
}
</style>
