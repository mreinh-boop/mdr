<script setup>
import { computed } from 'vue'
import { S, app } from '../data/store.js'
import { MALER } from '../lib/katalog.js'
import { fmtDate } from '../lib/tid.js'
import { vurderTemp, problemer, statusFor } from '../lib/vurdering.js'
import FotoBilde from '../components/FotoBilde.vue'

const r = computed(() => S.runder.find((x) => x.id === app.route.r))
const av = computed(() => S.avvik.filter((a) => a.runde === r.value?.id))
const temps = (rs) => rs.def.items.map((it, i) => [it, i]).filter(([it]) => it.t === 'temp')
const bilder = (rs) => Object.values(rs.svar || {}).map((a) => a.photo).filter(Boolean)
</script>

<template>
  <template v-if="r">
    <section class="kort flex flex-col gap-2">
      <span class="overtekst">{{ MALER[r.tpl].navn }}</span>
      <h2 class="tittel">{{ r.event }}</h2>
      <div class="kv">
        <span class="muted">Dato</span><span class="mono">{{ fmtDate(r.dato) }}</span>
        <span class="muted">Kontrollør</span><span>{{ r.kontrollor }}</span>
        <span class="muted">Kontrollert</span><span class="mono">{{ r.steder.filter((s) => s.ferdig).length }} av {{ r.steder.length }} steder</span>
        <span class="muted">Avvik</span><span class="mono">{{ av.length }} ({{ av.filter((a) => a.lvl === 'crit').length }} kritiske)</span>
        <span class="muted">Status</span><span>{{ r.last ? 'Låst' + (r.lastTid ? ' kl. ' + r.lastTid : '') : 'Pågår' }}</span>
      </div>
    </section>
    <section v-for="rs in r.steder" :key="rs.id" class="flex flex-col gap-2">
      <div class="flex items-center gap-2">
        <h2 class="tittel flex-1">{{ rs.def.navn }}</h2>
        <span class="pille" :class="statusFor(rs).c">{{ statusFor(rs).t }}</span>
        <span v-if="rs.tid" class="liten muted mono">kl. {{ rs.tid }}</span>
      </div>
      <div v-if="rs.ferdig && temps(rs).length" class="kort" style="padding: 4px 8px">
        <table class="w-full liten">
          <thead><tr class="overtekst text-left"><th class="py-1">Målepunkt</th><th>Verdi</th><th>Krav</th></tr></thead>
          <tbody>
            <tr v-for="[it, i] in temps(rs)" :key="i" style="border-top: 1px solid var(--a-line)">
              <td class="py-1.5 pr-2">{{ it.l }}</td>
              <td class="mono"><span class="dom" :class="vurderTemp(it, rs.svar[i]?.v)">{{ rs.svar[i]?.v ?? '–' }} {{ it.unit || '°C' }}</span></td>
              <td class="muted">{{ it.krav }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <template v-if="rs.ferdig">
        <div v-for="p in problemer(rs.def.items, rs.svar)" :key="p.i" class="liten">
          <span class="pille" :class="p.lvl === 'crit' ? 'crit' : 'warn'">{{ p.lvl === 'crit' ? 'Kritisk' : 'Avvik' }}</span>
          {{ p.tekst }}: <b>{{ p.verdi }}</b><template v-if="rs.svar[p.i]?.note"> – {{ rs.svar[p.i].note }}</template>
        </div>
        <div v-if="bilder(rs).length" class="foto flex gap-2 flex-wrap"><FotoBilde v-for="b in bilder(rs)" :key="b.slice(0, 80)" :kilde="b" /></div>
      </template>
    </section>
    <span class="liten muted">PDF for hele stevnet lages under «Rapporter».</span>
  </template>
</template>
