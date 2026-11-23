<script setup>
import { computed } from 'vue'
import { BccButton, BccTag, BccToggle } from '@bcc-code/component-library-vue'
import { lagreSted, fjernSted } from '../data/store.js'
import { kontrollTekst } from '../lib/tid.js'
import { malNavn, sjekkpunkter } from '../lib/katalog.js'

const props = defineProps({ sted: Object, stevne: Object, dag: Object, apen: Boolean })
defineEmits(['veksle'])
const s = props.sted
const lagre = () => lagreSted(props.stevne, props.dag, s)
const punkter = computed(() => sjekkpunkter(s).length)
function settAktiv(v) { s.aktiv = v; lagre() }
function settTider(v) { s.tider = v; if (v.trim()) s.aktiv = true; lagre() }
</script>

<template>
  <div>
    <div class="rad" :class="{ av: !s.aktiv }" role="button" tabindex="0" :aria-expanded="apen" @click="$emit('veksle')" @keyup.enter="$emit('veksle')">
      <span @click.stop><BccToggle :model-value="s.aktiv" :aria-label="s.aktiv ? 'Åpen' : 'Stengt'" @update:model-value="settAktiv" /></span>
      <span class="flex-1 min-w-0">
        <b class="block font-semibold">{{ s.navn }}</b>
        <span class="mono">{{ s.tider || '' }}</span><span v-if="!s.tider" class="liten muted">ingen tid</span>
        <span v-if="kontrollTekst(s)" class="liten muted"> · {{ kontrollTekst(s) }}</span>
        <span v-if="s.ubekreftet || s.kort?.length" class="flex flex-wrap gap-1 mt-1">
          <span v-if="s.ubekreftet" class="pille warn">ubekreftet</span>
          <BccTag v-for="k in s.kort" :key="k" :text="k" size="sm" context="neutral" />
        </span>
      </span>
      <span class="muted">{{ apen ? '▴' : '▾' }}</span>
    </div>
    <div v-if="apen" class="grid grid-cols-2 gap-2 px-3.5 pb-3.5">
      <label class="felt">Åpent (f.eks. 16:00–23:00)<input :value="s.tider" @change="settTider($event.target.value)" /></label>
      <label class="felt">Kontrollvindu<input :value="s.vindu" placeholder="valgfritt" @change="s.vindu = $event.target.value; lagre()" /></label>
      <label class="col-span-2 flex items-center gap-2 liten"><input type="checkbox" :checked="s.ubekreftet" @change="s.ubekreftet = $event.target.checked; lagre()" /> Tid ikke bekreftet</label>
      <span class="col-span-2 liten muted">Sjekkliste: {{ malNavn(s) }}{{ s.kort?.length ? ' + tillegg for ' + s.kort.join(', ') : '' }} · {{ punkter }} punkter</span>
      <span v-if="s.notes?.length" class="col-span-2 liten"><span v-for="n in s.notes" :key="n" class="block">{{ n }}</span></span>
      <div class="col-span-2"><BccButton :label="`Fjern ${s.navn} fra denne dagen`" size="small" severity="secondary" text @click="fjernSted(stevne, dag, s)" /></div>
    </div>
  </div>
</template>
