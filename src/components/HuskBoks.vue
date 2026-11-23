<script setup>
defineProps({ husk: { type: Array, default: () => [] } })
</script>

<template>
  <div v-if="husk.length" class="husk">
    <b>HUSK</b>
    <ul><li v-for="h in husk" :key="h">{{ h }}</li></ul>
  </div>
</template>
