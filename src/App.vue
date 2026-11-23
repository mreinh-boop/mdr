<script setup>
import { computed } from 'vue'
import { BccAppNavigation } from '@bcc-code/component-library-vue'
import { EventNoteIcon, FactCheckIcon, WarningIcon, DescriptionIcon } from '@bcc-code/icons-vue'
import { S, app, go, oppdaterFraSky, loggUt } from './data/store.js'
import LoginView from './views/LoginView.vue'
import PlanView from './views/PlanView.vue'
import RundeView from './views/RundeView.vue'
import StasjonView from './views/StasjonView.vue'
import AvvikView from './views/AvvikView.vue'
import RapporterView from './views/RapporterView.vue'
import RapportView from './views/RapportView.vue'

const apneAvvik = computed(() => S.avvik.filter((a) => a.status === 'åpen').length)
const faner = computed(() => [
  { key: 'plan', title: 'Plan', icon: EventNoteIcon },
  { key: 'runde', title: 'Runde', icon: FactCheckIcon },
  { key: 'avvik', title: apneAvvik.value ? `Avvik (${apneAvvik.value})` : 'Avvik', icon: WarningIcon },
  { key: 'rapporter', title: 'Rapporter', icon: DescriptionIcon },
])
const visning = computed(() => ({
  plan: PlanView, runde: RundeView, stasjon: StasjonView, avvik: AvvikView, rapporter: RapporterView, rapport: RapportView,
}[app.route.view || app.route.tab]))
const tittel = computed(() => app.route.tittel || { plan: 'Plan', runde: 'Runde', avvik: 'Avvik', rapporter: 'Rapporter' }[app.route.tab] || 'IK-mat Kontroll')
const trengerLogin = computed(() => app.modus === 'sky' && !app.bruker)
</script>

<template>
  <div v-if="!app.klar" class="wrap py-10 muted">Laster …</div>
  <LoginView v-else-if="trengerLogin" />
  <template v-else>
    <header class="sticky top-0 z-20 text-white" style="background: var(--a-brand); padding-top: env(safe-area-inset-top)">
      <div class="wrap flex items-center gap-3 py-3">
        <button v-if="app.route.back" class="text-2xl leading-none px-1" aria-label="Tilbake" @click="go(app.route.back)">‹</button>
        <h1 class="flex-1 min-w-0 truncate font-bold text-lg" style="font-family: Archivo, sans-serif">{{ tittel }}</h1>
        <button v-if="app.modus === 'sky'" class="liten opacity-90" @click="oppdaterFraSky" :title="'Sist synkronisert ' + (app.sistSynk || '–')">
          <span v-if="!app.online">Frakoblet</span>
          <span v-else-if="app.synker">Sender …</span>
          <span v-else-if="app.ko.length">{{ app.ko.length }} venter</span>
          <span v-else>Synkronisert</span>
        </button>
      </div>
    </header>
    <div v-if="app.modus === 'lokal'" class="liten" style="background: var(--color-default-yellow-100)">
      <div class="wrap py-1.5">Lokal testmodus: data lagres bare på denne enheten. Koble til Supabase for felles data.</div>
    </div>
    <div v-if="app.feil.length" class="liten" style="background: var(--a-crit-bg); color: var(--a-crit)">
      <div class="wrap py-1.5">Ikke lagret i databasen: {{ app.feil[0].tekst }} <button class="underline ml-1" @click="app.feil.splice(0)">Skjul</button></div>
    </div>

    <main style="padding-bottom: calc(96px + env(safe-area-inset-bottom))">
      <div class="wrap py-4 flex flex-col gap-4">
        <component :is="visning" :key="(app.route.view || app.route.tab) + (app.route.r || '') + (app.route.rs || '')" />
        <div v-if="app.modus === 'sky' && app.route.tab === 'rapporter' && !app.route.view" class="liten muted flex gap-2 items-center">
          Innlogget som {{ app.bruker?.email }} · <button class="underline" @click="loggUt">Logg ut</button>
        </div>
      </div>
    </main>

    <nav class="fixed inset-x-0 bottom-0 z-20" style="background: var(--a-surface); border-top: 1px solid var(--a-line); padding-bottom: env(safe-area-inset-bottom)">
      <div class="wrap">
        <BccAppNavigation :items="faner" :active-key="app.route.tab" @select="(f) => go({ tab: f.key })" />
      </div>
    </nav>
    <div v-for="m in app.meldinger" :key="m.id" class="toast" role="status">{{ m.tekst }}</div>
  </template>
</template>
