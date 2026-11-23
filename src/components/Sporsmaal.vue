<script setup>
import { computed } from 'vue'
import { BccTextarea } from '@bcc-code/component-library-vue'
import { vurderTemp, verdictTekst, kravFor } from '../lib/vurdering.js'
import { komprimer } from '../lib/bilde.js'
import FotoBilde from './FotoBilde.vue'

const props = defineProps({ it: Object, i: Number, svar: Object, ro: Boolean, mangler: Boolean })
const emit = defineEmits(['svar', 'foto'])

const valg = computed(() => props.it.t === 'crit'
  ? [['nei', 'Nei', 'ja'], ['ja', 'Ja', 'nei']]
  : [['ja', 'Ja', 'ja'], ['nei', 'Nei', 'nei'], ['ia', 'Ikke aktuelt', 'ia']])
const dom = computed(() => (props.it.t === 'temp' ? vurderTemp(props.it, props.svar.v) : null))
const krav = computed(() => kravFor(props.it, props.svar))
const klasse = computed(() => {
  if (props.it.t === 'yn' && props.svar.v === 'nei') return 'bad'
  if (props.it.t === 'crit' && props.svar.v === 'ja') return 'critq'
  if (dom.value === 'warn') return 'bad'
  if (dom.value === 'crit') return 'critq'
  return ''
})
async function velgFoto(e) {
  const f = e.target.files[0]; if (!f) return
  const d = await komprimer(f)
  if (d) emit('foto', d)
  e.target.value = ''
}
</script>

<template>
  <div class="sp" :class="klasse" :data-mangler="mangler">
    <span class="font-medium">{{ it.l }}<span v-if="it.t === 'temp' && it.krav" class="muted liten"> · krav {{ it.krav }}</span></span>

    <div v-if="it.t === 'yn' || it.t === 'crit'" class="seg" :style="{ gridTemplateColumns: `repeat(${valg.length},1fr)` }">
      <button v-for="[v, l, c] in valg" :key="v" :class="c" :aria-pressed="svar.v === v" :disabled="ro" @click="emit('svar', { v })">{{ l }}</button>
    </div>

    <div v-else-if="it.t === 'temp'" class="flex items-center gap-3">
      <input class="inp mono" style="max-width: 130px; font-size: 18px; text-align: right" type="text" inputmode="decimal" :value="svar.v ?? ''" :disabled="ro" :aria-label="it.l"
        @input="emit('svar', { v: $event.target.value.replace(',', '.').replace(/[^\d.\-−]/g, '').replace('−', '-') })" />
      <span class="mono muted">{{ it.unit || '°C' }}</span>
      <span class="dom" :class="dom">{{ verdictTekst(dom) }}</span>
    </div>

    <label v-if="krav.note || svar.note" class="felt">
      <span>Notat <span v-if="krav.note" class="krav">påkrevd</span></span>
      <BccTextarea :model-value="svar.note || ''" :disabled="ro" rows="2" auto-resize placeholder="Hva er galt, og hva er gjort?" @update:model-value="(v) => emit('svar', { note: v })" />
    </label>

    <div v-if="krav.photo || svar.photo" class="foto flex items-center gap-2 flex-wrap">
      <FotoBilde v-if="svar.photo" :kilde="svar.photo" />
      <button v-if="svar.photo && !ro" class="chip" @click="emit('svar', { photo: undefined })">Fjern</button>
      <span v-if="!svar.photo && !ro" class="filknapp chip" style="color: var(--a-fg)">📷 Ta bilde<input type="file" accept="image/*" capture="environment" aria-label="Ta bilde" @change="velgFoto" /></span>
      <span v-if="krav.photo && !svar.photo && it.t !== 'photo'" class="krav">bilde påkrevd</span>
    </div>

    <span v-if="it.t === 'crit' && svar.v === 'ja'" class="liten">Ring skiftleder umiddelbart.</span>
    <span v-if="mangler" class="krav">Mangler</span>
  </div>
</template>
