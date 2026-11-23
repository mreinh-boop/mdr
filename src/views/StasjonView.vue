<script setup>
import { ref, computed } from 'vue'
import { BccButton, BccMessage } from '@bcc-code/component-library-vue'
import { S, app, go, melding, settSvar, settFoto, fullforSted } from '../data/store.js'
import { mangler } from '../lib/vurdering.js'
import Sporsmaal from '../components/Sporsmaal.vue'

const r = computed(() => S.runder.find((x) => x.id === app.route.r))
const rs = computed(() => r.value?.steder.find((x) => x.id === app.route.rs))
const ro = computed(() => r.value?.last)
const mangel = ref([])

function lagre() {
  const m = mangler(rs.value.def.items, rs.value.svar)
  mangel.value = m
  if (m.length) {
    setTimeout(() => document.querySelector('[data-mangler="true"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50)
    return
  }
  const p = fullforSted(r.value, rs.value)
  melding(p.length ? `Lagret · ${p.length} avvik registrert` : 'Lagret · alt OK')
  go({ tab: 'runde' })
}
</script>

<template>
  <template v-if="rs">
    <section v-if="rs.def.tider || rs.def.notes?.length" class="kort flex flex-col gap-1 liten">
      <div v-if="rs.def.tider"><span class="muted">Åpent</span> <span class="mono">{{ rs.def.tider }}</span>
        <template v-if="rs.def.vindu"> · <span class="muted">kontroll</span> <span class="mono">{{ rs.def.vindu }}</span></template></div>
      <div v-for="n in rs.def.notes" :key="n">{{ n }}</div>
    </section>
    <div class="liste">
      <Sporsmaal v-for="(it, i) in rs.def.items" :key="i" :it="it" :i="i" :svar="rs.svar[i] || {}" :ro="ro" :mangler="mangel.includes(i)"
        @svar="(patch) => settSvar(r, rs, i, patch)" @foto="(d) => settFoto(r, rs, i, d)" />
    </div>
    <template v-if="!ro">
      <BccMessage v-if="mangel.length" severity="error" :message="`${mangel.length} punkt mangler svar, notat eller bilde. De er merket med «Mangler».`" />
      <BccButton :label="`Lagre ${rs.def.navn}`" fluid @click="lagre" />
      <span v-if="rs.ferdig" class="liten muted">Stedet er allerede lagret kl. {{ rs.tid }}. Endringer oppdaterer avvikene til runden låses.</span>
    </template>
  </template>
  <div v-else class="kort muted">Fant ikke stedet.</div>
</template>
