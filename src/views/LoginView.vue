<script setup>
import { ref } from 'vue'
import { BccButton, BccInput, BccMessage } from '@bcc-code/component-library-vue'
import { loggInn } from '../data/store.js'

const epost = ref(localStorage.getItem('ikmat-epost') || '')
const passord = ref('')
const feil = ref('')
const venter = ref(false)

async function send() {
  feil.value = ''
  if (!/\S+@\S+\.\S+/.test(epost.value) || !passord.value) { feil.value = 'Skriv inn e-post og passord'; return }
  venter.value = true
  try {
    await loggInn(epost.value.trim(), passord.value)
    localStorage.setItem('ikmat-epost', epost.value.trim())
    passord.value = ''
  } catch (e) {
    feil.value = /invalid/i.test(e.message) ? 'Feil e-post eller passord.' : 'Innlogging feilet: ' + e.message
  } finally { venter.value = false }
}
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <header class="text-white" style="background: var(--a-brand); padding-top: env(safe-area-inset-top)">
      <div class="wrap py-6">
        <div class="overtekst" style="color: #DBE1C0">BCC Event · F&B</div>
        <h1 class="text-2xl font-bold" style="font-family: Archivo, sans-serif">IK-mat Kontroll</h1>
      </div>
    </header>
    <div class="wrap py-6 flex flex-col gap-4">
      <form class="kort flex flex-col gap-3" @submit.prevent="send">
        <h2 class="tittel">Logg inn</h2>
        <label class="felt">E-post
          <BccInput v-model="epost" type="email" inputmode="email" autocomplete="username" placeholder="fornavn.etternavn@bcc.no" />
        </label>
        <label class="felt">Passord
          <BccInput v-model="passord" type="password" autocomplete="current-password" />
        </label>
        <BccButton type="submit" label="Logg inn" :loading="venter" />
        <span class="liten muted">Tilgang og passord får du av IK-mat-ansvarlig.</span>
        <BccMessage v-if="feil" severity="error" :message="feil" />
      </form>
    </div>
  </div>
</template>
