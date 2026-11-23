<script setup>
import { ref, computed, watch } from 'vue'
import { BccButton, BccInput, BccMessage } from '@bcc-code/component-library-vue'
import { S, melding, valgtStevne, importerStevne, leggTilStevne, slettStevne, leggTilSted, kopierDag } from '../data/store.js'
import { importerPlan, nyttStevne, nyttSted, huskFor } from '../lib/plan.js'
import { GRUPPER, GRUPPE_REKKEFOLGE } from '../lib/katalog.js'
import { today, leggTilDager, fmtDate, sorterSteder } from '../lib/tid.js'
import StedRad from '../components/StedRad.vue'
import HuskBoks from '../components/HuskBoks.vue'

const st = computed(() => valgtStevne())
const valgtDag = ref(null)
const apen = ref(null)
const nyttSkjema = ref(false)
const ns = ref({ navn: '', fra: today(), til: leggTilDager(today(), 2) })
const bekreftSlett = ref(false)
const nyNavn = ref({ kiosk: '', utlevering: '', kjokken: '' })

function standardDag(s) { const t = today(); return (s.dager.find((d) => d.dato === t) || s.dager.find((d) => d.dato > t) || s.dager[0])?.dato }
watch(st, (s) => { if (s && !s.dager.some((d) => d.dato === valgtDag.value)) valgtDag.value = standardDag(s) }, { immediate: true })
const dag = computed(() => st.value?.dager.find((d) => d.dato === valgtDag.value))
const dagIndeks = computed(() => (st.value && dag.value ? st.value.dager.indexOf(dag.value) : -1))
const husk = computed(() => (dag.value ? huskFor(dag.value) : []))
const stederI = (g) => sorterSteder(dag.value.steder.filter((s) => s.gruppe === g))

function lesFil(e) {
  const f = e.target.files[0]; if (!f) return
  const fr = new FileReader()
  fr.onload = () => {
    try {
      const ny = importerPlan(JSON.parse(String(fr.result).replace(/^﻿/, '')))
      importerStevne(ny); valgtDag.value = null
      melding(`Importert: ${ny.navn} · ${ny.dager.length} dager`)
    } catch (err) { melding('Kunne ikke lese fila: ' + err.message) }
    e.target.value = ''
  }
  fr.readAsText(f, 'utf-8')
}
function lagStevne() {
  const { navn, fra, til } = ns.value
  if (!navn.trim() || !fra || !til || til < fra) { melding('Fyll inn navn og gyldige datoer'); return }
  leggTilStevne(nyttStevne(navn.trim(), fra, til)); nyttSkjema.value = false; valgtDag.value = null
}
function leggTil(g) {
  const navn = nyNavn.value[g].trim(); if (!navn) return
  const s = nyttSted(g, navn); leggTilSted(st.value, dag.value, s); apen.value = s.id; nyNavn.value[g] = ''
}
function kopier() { const f = st.value.dager[dagIndeks.value - 1]; kopierDag(st.value, dag.value, f); melding('Kopiert fra ' + f.ukedag) }
function slett() { slettStevne(st.value); bekreftSlett.value = false; valgtDag.value = null }
</script>

<template>
  <section v-if="nyttSkjema" class="kort flex flex-col gap-3">
    <h2 class="tittel">Nytt stevne</h2>
    <label class="felt">Navn <BccInput v-model="ns.navn" placeholder="F.eks. Søstrestevne · 2705" /></label>
    <div class="flex gap-3 flex-wrap">
      <label class="felt flex-1 min-w-[130px]">Fra <input v-model="ns.fra" type="date" /></label>
      <label class="felt flex-1 min-w-[130px]">Til <input v-model="ns.til" type="date" /></label>
    </div>
    <span class="liten muted">Alle steder fra katalogen legges inn som «stengt». Slå på de som er åpne og skriv inn tidene.</span>
    <div class="flex gap-2"><BccButton label="Lag stevne" @click="lagStevne" /><BccButton label="Avbryt" severity="secondary" @click="nyttSkjema = false" /></div>
  </section>

  <section v-if="!st" class="kort flex flex-col gap-3">
    <h2 class="tittel">Ingen stevne planlagt</h2>
    <p class="liten muted">Importer dagsplanen som IK-MAT-generatoren lager (<code>_plan_model.json</code>), eller legg inn et stevne for hånd.</p>
    <div class="flex gap-2 flex-wrap">
      <span class="filknapp"><BccButton label="Importer _plan_model.json" size="small" /><input type="file" accept=".json,application/json" aria-label="Importer plan" @change="lesFil" /></span>
      <BccButton label="Nytt stevne" size="small" severity="secondary" @click="nyttSkjema = true" />
    </div>
  </section>

  <template v-else>
    <label v-if="S.stevner.length > 1" class="felt">Stevne
      <select v-model="S.valgtStevne"><option v-for="s in S.stevner" :key="s.id" :value="s.id">{{ s.navn }}</option></select>
    </label>
    <section class="kort flex flex-col gap-2">
      <span class="overtekst">Stevne</span>
      <h2 class="tittel">{{ st.navn }}</h2>
      <span class="liten muted">{{ st.kilde }}</span>
      <div class="flex gap-2 flex-wrap pt-1">
        <span class="filknapp"><BccButton label="Importer plan" size="small" severity="secondary" /><input type="file" accept=".json,application/json" aria-label="Importer plan" @change="lesFil" /></span>
        <BccButton label="Nytt stevne" size="small" severity="secondary" @click="nyttSkjema = true" />
        <BccButton label="Slett" size="small" severity="secondary" text @click="bekreftSlett = true" />
      </div>
      <div v-if="bekreftSlett" class="bekreft flex flex-col gap-2 liten">
        <span>Slette planen for «{{ st.navn }}»? Runder og rapporter som er gjort, blir liggende.</span>
        <div class="flex gap-2"><BccButton label="Slett planen" severity="danger" size="small" @click="slett" /><BccButton label="Avbryt" severity="secondary" size="small" @click="bekreftSlett = false" /></div>
      </div>
    </section>

    <div class="chips" role="tablist" aria-label="Dag">
      <button v-for="d in st.dager" :key="d.dato" class="chip" :aria-pressed="d.dato === valgtDag" @click="valgtDag = d.dato; apen = null">
        {{ d.ukedag.slice(0, 3) }} {{ fmtDate(d.dato).slice(0, 5) }}<small>{{ d.steder.filter((s) => s.aktiv).length }} steder</small>
      </button>
    </div>

    <template v-if="dag">
      <section class="flex flex-col gap-2">
        <div class="flex items-center gap-2">
          <h2 class="tittel flex-1">{{ dag.ukedag }} {{ fmtDate(dag.dato) }}</h2>
          <BccButton v-if="dagIndeks > 0" label="Kopier fra dagen før" size="small" severity="secondary" @click="kopier" />
        </div>
        <span v-if="dag.info" class="liten muted">{{ dag.info }}</span>
        <HuskBoks :husk="husk" />
      </section>

      <section v-for="g in GRUPPE_REKKEFOLGE" :key="g" class="flex flex-col gap-2">
        <div class="flex items-center"><h3 class="tittel flex-1">{{ GRUPPER[g] }}</h3><span class="liten muted mono">{{ dag.steder.filter((s) => s.gruppe === g && s.aktiv).length }} åpne</span></div>
        <div class="liste">
          <StedRad v-for="s in stederI(g)" :key="s.id" :sted="s" :stevne="st" :dag="dag" :apen="apen === s.id" @veksle="apen = apen === s.id ? null : s.id" />
          <div v-if="!stederI(g).length" class="rad muted liten">Ingen steder</div>
          <div class="flex gap-2 p-3" style="border-top: 1px solid var(--a-line)">
            <input v-model="nyNavn[g]" class="inp flex-1 min-w-0" placeholder="Legg til sted …" @keyup.enter="leggTil(g)" />
            <BccButton label="Legg til" size="small" severity="secondary" @click="leggTil(g)" />
          </div>
        </div>
      </section>

      <details v-if="st.qa?.length" class="kort">
        <summary class="liten font-semibold">Åpne spørsmål fra planen ({{ st.qa.length }})</summary>
        <ul class="liten mt-2 pl-5 list-disc"><li v-for="q in st.qa" :key="q">{{ q }}</li></ul>
      </details>
      <span class="liten muted">Tidene her styrer hvilke steder som foreslås når en runde startes, og i hvilken rekkefølge.</span>
    </template>
  </template>
</template>
