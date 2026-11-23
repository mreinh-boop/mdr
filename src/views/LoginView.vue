<script setup>
import { ref } from 'vue'
import { BccButton, BccInput, BccMessage } from '@bcc-code/component-library-vue'
import { sendKode, bekreftKode } from '../data/store.js'

const epost = ref(localStorage.getItem('ikmat-epost') || '')
const kode = ref('')
const sendt = ref(false)
const feil = ref('')
const venter = ref(false)

async function send() {
  feil.value = ''
  if (!/\S+@\S+\.\S+/.test(epost.value)) { feil.value = 'Skriv inn en gyldig e-postadresse'; return }
  venter.value = true
  try { await sendKode(epost.value.trim()); localStorage.setItem('ikmat-epost', epost.value.trim()); sendt.value = true }
  catch (e) { feil.value = /not allowed|signups/i.test(e.message) ? 'Denne e-postadressen har ikke tilgang. Spør IK-mat-ansvarlig.' : e.message }
  finally { venter.value = false }
}
async function bekreft() {
  feil.value = ''; venter.value = true
  try { await bekreftKode(epost.value.trim(), kode.value.trim()) }
  catch (e) { feil.value = 'Koden stemmer ikke eller er utløpt. Be om en ny.' }
  finally { venter.value = false }
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
      <div class="kort flex flex-col gap-3">
        <template v-if="!sendt">
          <h2 class="tittel">Logg inn</h2>
          <label class="felt">E-post
            <BccInput v-model="epost" type="email" inputmode="email" autocomplete="email" placeholder="fornavn.etternavn@bcc.no" @keyup.enter="send" />
          </label>
          <BccButton label="Send kode" :loading="venter" @click="send" />
          <span class="liten muted">Du får en e-post med en kode. I testfasen har bare inviterte adresser tilgang.</span>
        </template>
        <template v-else>
          <h2 class="tittel">Skriv inn koden</h2>
          <span class="liten muted">Sendt til {{ epost }}. Du kan også trykke på lenken i e-posten.</span>
          <label class="felt">Kode fra e-posten
            <BccInput v-model="kode" inputmode="numeric" autocomplete="one-time-code" placeholder="123456" @keyup.enter="bekreft" />
          </label>
          <BccButton label="Logg inn" :loading="venter" @click="bekreft" />
          <button class="liten underline muted self-start" @click="sendt = false">Annen e-post / send på nytt</button>
        </template>
        <BccMessage v-if="feil" severity="error" :message="feil" />
      </div>
    </div>
  </div>
</template>
