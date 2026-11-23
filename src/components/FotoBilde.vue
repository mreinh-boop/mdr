<script setup>
import { ref, watchEffect } from 'vue'
import { fotoUrl } from '../data/sky.js'

const props = defineProps({ kilde: String })
const url = ref('')
watchEffect(async () => {
  const k = props.kilde
  if (!k || k.startsWith('data:')) { url.value = k; return }
  try { url.value = await fotoUrl(k) } catch (e) { url.value = '' }
})
</script>

<template>
  <a v-if="url" :href="url" target="_blank" rel="noopener"><img :src="url" alt="Bilde" /></a>
  <span v-else class="liten muted">Bilde lastes …</span>
</template>
