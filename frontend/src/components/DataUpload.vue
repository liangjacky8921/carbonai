<template>
  <div class="upload-zone" :class="{ dragover }" @click="$emit('pick')"
    @dragover.prevent="dragover = true" @dragleave.prevent="dragover = false"
    @drop.prevent="onDrop">
    <el-icon :size="34" class="mb-1"><UploadFilled /></el-icon>
    <p class="text-[13px] font-medium">{{ title }}</p>
    <p class="text-[11px] mt-1 leading-5 opacity-75">{{ hint }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { UploadFilled } from '@element-plus/icons-vue'

const props = withDefaults(defineProps<{
  title?: string
  hint?: string
}>(), { title: '点击或拖拽上传', hint: '' })
const emit = defineEmits<{ (e: 'file', file: File): void; (e: 'pick'): void }>()

const dragover = ref(false)
function onDrop(e: DragEvent) {
  dragover.value = false
  const file = e.dataTransfer?.files?.[0]
  if (file) emit('file', file)
}
</script>
