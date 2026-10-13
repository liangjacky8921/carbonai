<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, shallowRef, useTemplateRef, watch } from 'vue'
import globeFallback from '@/assets/globe/globe-fallback.svg'

const props = defineProps<{ paused: boolean }>()
const host = useTemplateRef<HTMLElement>('host')
const canvasHost = useTemplateRef<HTMLElement>('canvasHost')
const ready = shallowRef(false)
const failed = shallowRef(false)
const visible = shallowRef(false)
const pageHidden = shallowRef(false)
const reduced = shallowRef(false)
const canAnimate = computed(() => ready.value && !props.paused && visible.value && !pageHidden.value && !reduced.value)

let observer: IntersectionObserver | undefined
let resizeObserver: ResizeObserver | undefined
let motionQuery: MediaQueryList | undefined
let pointerQuery: MediaQueryList | undefined
let loadTimer = 0
let frame = 0
let destroyed = false
let initialized = false
let lastTime = 0
let baseRotation = 0.22
let pointerX = 0
let pointerY = 0
let targetX = 0
let targetY = 0
let renderer: import('three').WebGLRenderer | undefined
let scene: import('three').Scene | undefined
let camera: import('three').PerspectiveCamera | undefined
let globe: import('three').Group | undefined

function supportsWebGL() {
  try {
    const canvas = document.createElement('canvas')
    return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'))
  } catch {
    return false
  }
}

function render() {
  if (renderer && scene && camera) renderer.render(scene, camera)
}

function resize() {
  if (!renderer || !camera || !canvasHost.value) return
  const { width, height } = canvasHost.value.getBoundingClientRect()
  if (!width || !height) return
  renderer.setSize(width, height, false)
  camera.aspect = width / height
  camera.updateProjectionMatrix()
  render()
}

function stopLoop() {
  if (frame) cancelAnimationFrame(frame)
  frame = 0
}

function tick(now: number) {
  frame = 0
  if (!canAnimate.value || !globe) return
  const delta = Math.min(40, now - (lastTime || now))
  lastTime = now
  baseRotation += delta * 0.000035
  pointerX += (targetX - pointerX) * 0.035
  pointerY += (targetY - pointerY) * 0.035
  globe.rotation.y = baseRotation + pointerX
  globe.rotation.x = 0.06 + pointerY
  render()
  frame = requestAnimationFrame(tick)
}

function syncLoop() {
  if (canAnimate.value) {
    if (!frame) {
      lastTime = performance.now()
      frame = requestAnimationFrame(tick)
    }
  } else {
    stopLoop()
    render()
  }
}

function handlePointer(event: PointerEvent) {
  if (!host.value || !pointerQuery?.matches || reduced.value || props.paused) return
  const rect = host.value.getBoundingClientRect()
  targetX = ((event.clientX - rect.left) / rect.width - 0.5) * 0.12
  targetY = ((event.clientY - rect.top) / rect.height - 0.5) * 0.07
}

function resetPointer() {
  targetX = 0
  targetY = 0
}

function handleVisibility() {
  pageHidden.value = document.hidden
}

function handleMotionPreference() {
  reduced.value = motionQuery?.matches ?? false
}

function handleContextLost(event: Event) {
  event.preventDefault()
  failed.value = true
  ready.value = false
  stopLoop()
}

function disposeScene() {
  stopLoop()
  if (scene) {
    scene.traverse((object) => {
      const mesh = object as import('three').Mesh
      const geometry = mesh.geometry as import('three').BufferGeometry | undefined
      const material = mesh.material as import('three').Material | import('three').Material[] | undefined
      geometry?.dispose()
      if (Array.isArray(material)) material.forEach((item) => item.dispose())
      else material?.dispose()
    })
  }
  if (renderer) {
    renderer.domElement.removeEventListener('webglcontextlost', handleContextLost)
    renderer.dispose()
    renderer.forceContextLoss()
    renderer.domElement.remove()
  }
  renderer = undefined
  scene = undefined
  camera = undefined
  globe = undefined
}

async function initScene() {
  if (initialized || destroyed || failed.value || !canvasHost.value) return
  initialized = true
  if (!supportsWebGL()) {
    failed.value = true
    return
  }

  try {
    const [THREE, pointsModule] = await Promise.all([
      import('./globeThree'),
      import('@/assets/globe/land-points.json'),
    ])
    if (destroyed || !canvasHost.value) return
    const landPoints = pointsModule.default as number[]
    scene = new THREE.Scene()
    camera = new THREE.PerspectiveCamera(36, 1, 0.1, 20)
    camera.position.set(0, 0, 3.65)

    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false, powerPreference: 'high-performance' })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, window.innerWidth <= 768 ? 1.25 : 1.5))
    renderer.setClearColor(0x000000, 0)
    renderer.domElement.className = 'globe-canvas'
    renderer.domElement.setAttribute('aria-hidden', 'true')
    renderer.domElement.addEventListener('webglcontextlost', handleContextLost)
    canvasHost.value.appendChild(renderer.domElement)

    globe = new THREE.Group()
    globe.rotation.set(0.06, baseRotation, -0.08)
    scene.add(globe)

    const coreGeometry = new THREE.SphereGeometry(1.03, 40, 28)
    const coreMaterial = new THREE.MeshBasicMaterial({ color: 0x07110c })
    globe.add(new THREE.Mesh(coreGeometry, coreMaterial))

    const gridGeometry = new THREE.SphereGeometry(1.065, 32, 20)
    const gridMaterial = new THREE.MeshBasicMaterial({ color: 0x69b780, wireframe: true, transparent: true, opacity: 0.075 })
    globe.add(new THREE.Mesh(gridGeometry, gridMaterial))

    const positions = new Float32Array((landPoints.length / 2) * 3)
    for (let source = 0, target = 0; source < landPoints.length; source += 2, target += 3) {
      const lon = (landPoints[source] / 100) * Math.PI / 180
      const lat = (landPoints[source + 1] / 100) * Math.PI / 180
      const radius = 1.075
      positions[target] = radius * Math.cos(lat) * Math.cos(lon)
      positions[target + 1] = radius * Math.sin(lat)
      positions[target + 2] = radius * Math.cos(lat) * Math.sin(lon)
    }
    const landGeometry = new THREE.BufferGeometry()
    landGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    const landMaterial = new THREE.PointsMaterial({ color: 0x9bea9f, size: 0.018, sizeAttenuation: true, transparent: true, opacity: 0.88 })
    globe.add(new THREE.Points(landGeometry, landMaterial))

    const orbitMaterial = new THREE.LineBasicMaterial({ color: 0xb7f4c1, transparent: true, opacity: 0.22 })
    const orbitTilts = [[1.18, -0.28], [0.92, 0.42], [1.48, 0.16]]
    orbitTilts.forEach(([x, z], index) => {
      const curve = new THREE.EllipseCurve(0, 0, 1.25 + index * 0.055, 1.25 + index * 0.055)
      const geometry = new THREE.BufferGeometry().setFromPoints(curve.getPoints(150))
      const line = new THREE.LineLoop(geometry, index === 0 ? orbitMaterial : orbitMaterial.clone())
      line.rotation.set(x, 0, z)
      globe?.add(line)
    })

    const particlePositions = new Float32Array(108 * 3)
    let seed = 4317
    const random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296)
    for (let index = 0; index < 108; index += 1) {
      const y = random() * 2 - 1
      const angle = random() * Math.PI * 2
      const radius = 1.18 + random() * 0.36
      const horizontal = Math.sqrt(1 - y * y)
      particlePositions[index * 3] = radius * horizontal * Math.cos(angle)
      particlePositions[index * 3 + 1] = radius * y
      particlePositions[index * 3 + 2] = radius * horizontal * Math.sin(angle)
    }
    const particleGeometry = new THREE.BufferGeometry()
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3))
    const particleMaterial = new THREE.PointsMaterial({ color: 0xb9efbd, size: 0.012, transparent: true, opacity: 0.34 })
    globe.add(new THREE.Points(particleGeometry, particleMaterial))

    resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(canvasHost.value)
    resize()
    ready.value = true
    syncLoop()
  } catch (error) {
    console.warn('[CarbonAI globe] WebGL scene unavailable; static fallback retained.', error)
    failed.value = true
    disposeScene()
  }
}

function scheduleInit() {
  if (initialized || failed.value) return
  loadTimer = window.setTimeout(initScene, 80)
}

watch([canAnimate, visible], syncLoop)

onMounted(() => {
  motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
  pointerQuery = window.matchMedia('(pointer: fine)')
  handleMotionPreference()
  handleVisibility()
  motionQuery.addEventListener('change', handleMotionPreference)
  document.addEventListener('visibilitychange', handleVisibility)
  window.addEventListener('pointermove', handlePointer, { passive: true })
  document.documentElement.addEventListener('mouseleave', resetPointer)

  if (reduced.value || window.matchMedia('(max-width: 600px)').matches) {
    failed.value = true
    return
  }
  if ('IntersectionObserver' in window && host.value) {
    observer = new IntersectionObserver(([entry]) => {
      visible.value = entry.isIntersecting
      if (entry.isIntersecting) scheduleInit()
    }, { rootMargin: '160px' })
    observer.observe(host.value)
  } else {
    visible.value = true
    scheduleInit()
  }
})

onBeforeUnmount(() => {
  destroyed = true
  window.clearTimeout(loadTimer)
  observer?.disconnect()
  resizeObserver?.disconnect()
  motionQuery?.removeEventListener('change', handleMotionPreference)
  document.removeEventListener('visibilitychange', handleVisibility)
  window.removeEventListener('pointermove', handlePointer)
  document.documentElement.removeEventListener('mouseleave', resetPointer)
  disposeScene()
})
</script>

<template>
  <figure
    ref="host"
    class="globe-visual"
    :class="{ 'is-ready': ready, 'is-static': failed || reduced }"
    role="img"
    aria-label="基于公开地理轮廓生成的空间地球视觉示意，点位不代表实时排放监测数据"
  >
    <div class="globe-halo" aria-hidden="true" />
    <img :src="globeFallback" class="globe-fallback" alt="" aria-hidden="true" />
    <div ref="canvasHost" class="canvas-host" aria-hidden="true" />
    <figcaption>基于公开地理轮廓生成的视觉示意，不代表实时排放监测点。</figcaption>
  </figure>
</template>

<style scoped>
.globe-visual { position: relative; width: 100%; height: 100%; margin: 0; overflow: hidden; pointer-events: none; }
.globe-halo { position: absolute; inset: 11% 7% 4% 6%; border-radius: 50%; opacity: .58; background: radial-gradient(circle, rgba(69, 192, 104, .19), rgba(24, 91, 50, .075) 44%, transparent 70%); filter: blur(28px); }
.globe-fallback, .canvas-host { position: absolute; inset: 2% 0 7%; width: 100%; height: 91%; object-fit: contain; }
.globe-fallback { opacity: .72; transition: opacity 700ms ease; }
.canvas-host { opacity: 0; transition: opacity 900ms ease; }
.is-ready .globe-fallback { opacity: 0; }
.is-ready .canvas-host { opacity: 1; }
.is-static .globe-fallback { opacity: .78; }
.canvas-host :deep(.globe-canvas) { display: block; width: 100%; height: 100%; }
figcaption { position: absolute; width: 1px; height: 1px; padding: 0; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
@media (max-width: 600px) {
  .globe-halo { inset: 25% -22% -6% 18%; opacity: .42; }
  .globe-fallback { inset: 25% -28% -7% 23%; width: 105%; height: 82%; opacity: .34; }
}
@media (prefers-reduced-motion: reduce) {
  .globe-fallback, .canvas-host { transition: none; }
}
</style>
