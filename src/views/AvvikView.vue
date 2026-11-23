<script setup>
import { ref, computed } from 'vue'
import { BccButton, BccTextarea } from '@bcc-code/component-library-vue'
import { S, melding, lagreAvvik, lukkAvvik } from '../data/store.js'
import { fmtDate } from '../lib/tid.js'
import { telegramTekst } from '../lib/vurdering.js'

const filter = ref('åpen')
const liste = computed(() => S.avvik.filter((a) => filter.value === 'alle' || a.status === filter.value)
  .slice().sort((a, b) => (b.lvl === 'crit') - (a.lvl === 'crit') || b.dato.localeCompare(a.dato) || (b.tid || '').localeCompare(a.tid || '')))
const antall = (k) => (k === 'alle' ? S.avvik.length : S.avvik.filter((a) => a.status === k).length)

let timer = null
function settTiltak(a, v) { a.tiltak = v; clearTimeout(timer); timer = setTimeout(() => lagreAvvik(a), 600) }
function lukk(a) {
  if (!a.tiltak.trim()) { melding('Skriv hvilket tiltak som er gjort'); return }
  clearTimeout(timer); lukkAvvik(a); melding('Avvik lukket')
}
async function kopier(a) {
  try { await navigator.clipboard.writeText(telegramTekst(a)); melding('Kopiert – lim inn i Telegram') }
  catch (e) { melding('Kunne ikke kopiere automatisk') }
}
</script>

<template>
  <div class="chips">
    <button v-for="[k, l] in [['åpen', 'Åpne'], ['lukket', 'Lukket'], ['alle', 'Alle']]" :key="k" class="chip" :aria-pressed="filter === k" @click="filter = k">{{ l }} ({{ antall(k) }})</button>
  </div>
  <article v-for="a in liste" :key="a.id" class="kort flex flex-col gap-2">
    <div class="flex items-center gap-2">
      <span class="pille" :class="a.lvl === 'crit' ? 'crit' : 'warn'">{{ a.lvl === 'crit' ? 'Kritisk' : 'Avvik' }}</span>
      <b class="flex-1 min-w-0">{{ a.navn }}</b>
      <span class="liten muted mono">{{ fmtDate(a.dato) }} {{ a.tid }}</span>
    </div>
    <div>{{ a.tekst }}: <b class="mono">{{ a.verdi }}</b><span v-if="a.krav" class="muted liten"> (krav {{ a.krav }})</span></div>
    <div v-if="a.notat" class="liten muted">Notat: {{ a.notat }}</div>
    <div class="liten muted">Kontrollør: {{ a.av }}</div>
    <template v-if="a.status === 'åpen'">
      <details>
        <summary class="liten">Telegram-melding</summary>
        <pre class="tg mt-2">{{ telegramTekst(a) }}</pre>
        <button class="chip mt-2" @click="kopier(a)">Kopier melding</button>
      </details>
      <label class="felt">Tiltak som er gjort
        <BccTextarea :model-value="a.tiltak" rows="2" auto-resize placeholder="F.eks. varer flyttet til annen fryser, målt på nytt −19 °C" @update:model-value="(v) => settTiltak(a, v)" />
      </label>
      <BccButton label="Lukk avvik" severity="secondary" @click="lukk(a)" />
    </template>
    <div v-else class="liten"><span class="pille ok">Lukket {{ a.lukket ? fmtDate(a.lukket) : '' }}</span> {{ a.tiltak }}</div>
  </article>
  <div v-if="!liste.length" class="kort muted">Ingen {{ filter === 'åpen' ? 'åpne ' : '' }}avvik.</div>
</template>
