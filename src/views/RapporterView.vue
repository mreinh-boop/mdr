<script setup>
import { ref, computed } from 'vue'
import { BccButton } from '@bcc-code/component-library-vue'
import { S, app, go, melding } from '../data/store.js'
import { MALER } from '../lib/katalog.js'
import { fmtDate } from '../lib/tid.js'
import { fotoDataUrl } from '../data/sky.js'

/** Runder gruppert per stevne (event-navn), nyeste stevne først. */
const grupper = computed(() => {
  const m = new Map()
  S.runder.forEach((r) => { const k = (r.event || 'Uten navn').trim(); if (!m.has(k)) m.set(k, []); m.get(k).push(r) })
  return [...m.entries()].map(([navn, runder]) => ({ navn, runder: runder.slice().sort((a, b) => a.dato.localeCompare(b.dato) || a.tpl.localeCompare(b.tpl)) }))
    .sort((a, b) => b.runder[b.runder.length - 1].dato.localeCompare(a.runder[a.runder.length - 1].dato))
})
const avvikFor = (g) => { const ids = new Set(g.runder.map((r) => r.id)); return S.avvik.filter((a) => ids.has(a.runde)) }
const lager = ref(null)

function apne(r) {
  if (!r.last) { S.aktiv = r.id; go({ tab: 'runde' }); return }
  go({ tab: 'rapporter', view: 'rapport', r: r.id, back: { tab: 'rapporter' }, tittel: 'Rapport · ' + fmtDate(r.dato) })
}
async function pdf(g) {
  lager.value = g.navn
  try {
    const { lagStevnePdf } = await import('../lib/pdf.js')
    const { doc, filnavn } = await lagStevnePdf(g, S.avvik, (p) => (app.modus === 'sky' ? fotoDataUrl(p) : p))
    doc.save(filnavn)
  } catch (e) { melding('PDF kunne ikke lages: ' + (e.message || e)) }
  finally { lager.value = null }
}
</script>

<template>
  <section v-for="g in grupper" :key="g.navn" class="flex flex-col gap-3">
    <div class="kort flex flex-col gap-2">
      <span class="overtekst">Stevne</span>
      <h2 class="tittel">{{ g.navn }}</h2>
      <div class="kv">
        <span class="muted">Periode</span><span class="mono">{{ fmtDate(g.runder[0].dato) }}{{ g.runder.at(-1).dato !== g.runder[0].dato ? ' – ' + fmtDate(g.runder.at(-1).dato) : '' }}</span>
        <span class="muted">Runder</span><span class="mono">{{ g.runder.length }} ({{ g.runder.filter((r) => !r.last).length }} pågår)</span>
        <span class="muted">Avvik</span><span class="mono">{{ avvikFor(g).length }} · {{ avvikFor(g).filter((a) => a.lvl === 'crit').length }} kritiske · {{ avvikFor(g).filter((a) => a.status === 'åpen').length }} åpne</span>
      </div>
      <BccButton :label="lager === g.navn ? 'Lager PDF …' : 'Eksporter hele stevnet som PDF'" :loading="lager === g.navn" fluid @click="pdf(g)" />
    </div>
    <div class="liste">
      <button v-for="r in g.runder" :key="r.id" class="rad" @click="apne(r)">
        <span class="flex-1 min-w-0">
          <b class="block font-semibold">{{ MALER[r.tpl].navn }} · {{ fmtDate(r.dato) }}</b>
          <span class="liten muted">{{ r.kontrollor }} · {{ r.steder.filter((x) => x.ferdig).length }}/{{ r.steder.length }} steder</span>
        </span>
        <span v-if="!r.last" class="pille todo">Pågår</span>
        <span v-else-if="S.avvik.some((a) => a.runde === r.id && a.lvl === 'crit')" class="pille crit">{{ S.avvik.filter((a) => a.runde === r.id).length }} avvik</span>
        <span v-else-if="S.avvik.some((a) => a.runde === r.id)" class="pille warn">{{ S.avvik.filter((a) => a.runde === r.id).length }} avvik</span>
        <span v-else class="pille ok">OK</span>
      </button>
    </div>
  </section>
  <div v-if="!grupper.length" class="kort muted">Ingen runder ennå. Start en runde under «Runde».</div>
</template>
