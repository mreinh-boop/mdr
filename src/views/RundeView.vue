<script setup>
import { ref, computed, watch } from 'vue'
import { BccButton, BccInput, BccMessage } from '@bcc-code/component-library-vue'
import { S, app, go, melding, valgtStevne, startRunde, lasRunde } from '../data/store.js'
import { MALER, GRUPPE_REKKEFOLGE } from '../lib/katalog.js'
import { huskFor } from '../lib/plan.js'
import { today, fmtDate, sorterSteder, aapenNaa } from '../lib/tid.js'
import { statusFor } from '../lib/vurdering.js'
import HuskBoks from '../components/HuskBoks.vue'

/* ---------- aktiv runde ---------- */
const aktiv = computed(() => S.runder.find((r) => r.id === S.aktiv && !r.last))
const ferdige = computed(() => (aktiv.value ? aktiv.value.steder.filter((x) => x.ferdig).length : 0))
const bekreftLas = ref(false)
function las() {
  const r = aktiv.value
  lasRunde(r); bekreftLas.value = false; melding('Runden er låst og lagret')
  go({ tab: 'rapporter', view: 'rapport', r: r.id, back: { tab: 'rapporter' }, tittel: 'Rapport · ' + fmtDate(r.dato) })
}
function apneSted(rs) {
  go({ tab: 'runde', view: 'stasjon', r: aktiv.value.id, rs: rs.id, back: { tab: 'runde' }, tittel: rs.def.navn })
}

/* ---------- ny runde ---------- */
const st = computed(() => valgtStevne())
const tpl = ref('kiosk')
const dato = ref(null)
watch(st, (s) => {
  if (!s) return
  const t = today()
  if (!s.dager.some((d) => d.dato === dato.value)) dato.value = (s.dager.find((d) => d.dato === t) || s.dager.find((d) => d.dato > t) || s.dager[0])?.dato
}, { immediate: true })
const dag = computed(() => st.value?.dager.find((d) => d.dato === dato.value))
const kandidater = computed(() => {
  if (dag.value) return sorterSteder(dag.value.steder.filter((s) => s.gruppe === tpl.value && s.aktiv)).map((s) => ({ ...s, fraPlan: true }))
  return MALER[tpl.value].stasjoner.map((s) => ({ id: s.id, gruppe: tpl.value, navn: s.navn, tider: '', vindu: '', notes: [], kort: [], mal: { tpl: tpl.value, id: s.id } }))
})
const valgt = ref(new Set())
watch(kandidater, (k) => { valgt.value = new Set(k.map((s) => s.id)) }, { immediate: true })
const antall = (g) => (dag.value ? dag.value.steder.filter((s) => s.gruppe === g && s.aktiv).length : MALER[g].stasjoner.length)
const husk = computed(() => (dag.value ? huskFor(dag.value) : []))
const navn = ref(S.navn || app.bruker?.user_metadata?.navn || '')

function veksle(id) { const v = new Set(valgt.value); v.has(id) ? v.delete(id) : v.add(id); valgt.value = v }
function alleIngen() { valgt.value = valgt.value.size ? new Set() : new Set(kandidater.value.map((s) => s.id)) }
function start() {
  if (!navn.value.trim()) { melding('Skriv inn navnet ditt først'); return }
  startRunde({ tpl: tpl.value, dato: dag.value ? dato.value : today(), stevne: st.value, steder: kandidater.value.filter((s) => valgt.value.has(s.id)), kontrollor: navn.value.trim() })
}
</script>

<template>
  <!-- AKTIV RUNDE -->
  <template v-if="aktiv">
    <section class="flex flex-col gap-2">
      <div class="flex items-center gap-2">
        <span class="overtekst flex-1">{{ MALER[aktiv.tpl].navn }} · {{ fmtDate(aktiv.dato) }} · {{ aktiv.kontrollor }}</span>
        <span class="liten mono">{{ ferdige }}/{{ aktiv.steder.length }}</span>
      </div>
      <div class="fremdrift"><i :style="{ width: (aktiv.steder.length ? (ferdige / aktiv.steder.length) * 100 : 0) + '%' }" /></div>
      <span class="liten muted">{{ aktiv.event }}</span>
    </section>
    <div class="liste">
      <button v-for="rs in aktiv.steder" :key="rs.id" class="rad" @click="apneSted(rs)">
        <span class="flex-1 min-w-0">
          <b class="block font-semibold">{{ rs.def.navn }}</b>
          <span class="mono">{{ rs.tid ? 'kontrollert kl. ' + rs.tid : rs.def.tider || rs.def.items.length + ' punkter' }}</span>
          <span v-if="!rs.ferdig && rs.def.vindu" class="liten muted"> · kontroll {{ rs.def.vindu }}</span>
        </span>
        <template v-if="!rs.ferdig && rs.def.tider">
          <span v-if="aapenNaa(rs.def.tider, aktiv.dato) === true" class="pille ok">Åpen nå</span>
          <span v-else-if="aapenNaa(rs.def.tider, aktiv.dato) === false" class="pille todo">Stengt nå</span>
        </template>
        <span class="pille" :class="statusFor(rs).c">{{ statusFor(rs).t }}</span>
      </button>
    </div>
    <div v-if="bekreftLas" class="bekreft flex flex-col gap-2">
      <b>Låse runden?</b>
      <span class="liten">{{ ferdige }} av {{ aktiv.steder.length }} steder er kontrollert. Etterpå kan ingen svar endres.</span>
      <div class="flex gap-2"><BccButton label="Lås runden" @click="las" /><BccButton label="Avbryt" severity="secondary" @click="bekreftLas = false" /></div>
    </div>
    <BccButton v-else label="Avslutt og lås runden" severity="secondary" fluid @click="bekreftLas = true" />
    <span class="liten muted">Etter avslutning kan svarene ikke endres. Steder som ikke er kontrollert, står som «Ikke kontrollert» i rapporten.</span>
  </template>

  <!-- NY RUNDE -->
  <template v-else>
    <section v-if="st" class="flex flex-col gap-2">
      <span class="overtekst">{{ st.navn }}</span>
      <div class="chips">
        <button v-for="d in st.dager" :key="d.dato" class="chip" :aria-pressed="d.dato === dato" @click="dato = d.dato">
          {{ d.ukedag.slice(0, 3) }} {{ fmtDate(d.dato).slice(0, 5) }}{{ d.dato === today() ? ' · i dag' : '' }}
        </button>
      </div>
    </section>
    <div v-else class="husk">Ingen plan for stevnet ennå – alle steder i katalogen vises. Legg inn dagsplanen under «Plan».</div>

    <section class="grid gap-2" role="group" aria-label="Velg kontroll">
      <button v-for="g in GRUPPE_REKKEFOLGE" :key="g" class="kort text-left flex flex-col" :style="g === tpl ? 'border-color: var(--a-brand); box-shadow: inset 0 0 0 1px var(--a-brand)' : ''" :aria-pressed="g === tpl" @click="tpl = g">
        <b style="font-family: Archivo, sans-serif">{{ MALER[g].navn }}</b>
        <span class="liten muted">{{ antall(g) }} {{ st ? 'åpne steder denne dagen' : 'steder' }}</span>
      </button>
    </section>
    <HuskBoks :husk="husk" />

    <section class="flex flex-col gap-2">
      <div class="flex items-center"><span class="overtekst flex-1">Ta med i runden ({{ valgt.size }} av {{ kandidater.length }})</span>
        <button v-if="kandidater.length" class="chip" @click="alleIngen">Alle / ingen</button></div>
      <div v-if="kandidater.length" class="chips">
        <button v-for="s in kandidater" :key="s.id" class="chip" :aria-pressed="valgt.has(s.id)" @click="veksle(s.id)">
          {{ s.navn }}<small v-if="s.tider">{{ s.tider }}</small>
        </button>
      </div>
      <div v-else class="kort liten muted">Ingen {{ MALER[tpl].navn.toLowerCase() }}-steder er åpne denne dagen. Endre under «Plan».</div>
    </section>

    <section class="kort flex flex-col gap-2">
      <label class="felt">Kontrollør <BccInput v-model="navn" placeholder="Fornavn Etternavn" autocomplete="name" /></label>
    </section>
    <BccButton label="Start runde" :disabled="!valgt.size" fluid @click="start" />
  </template>
</template>
