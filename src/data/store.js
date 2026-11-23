/* App-tilstand + handlinger. Lokal modus (uten Supabase) eller sky-modus med offline-kø. */
import { reactive, watch } from 'vue'
import { sb, rad, hentAlt, utfor } from './sky.js'
import { uid, today, nowTime } from '../lib/tid.js'
import { sjekkpunkter } from '../lib/katalog.js'
import { problemer } from '../lib/vurdering.js'

const CACHE = 'ikmat-v1'
const KO = 'ikmat-ko-v1'

export const S = reactive({ stevner: [], runder: [], avvik: [], valgtStevne: null, aktiv: null, navn: '' })
export const app = reactive({
  modus: sb ? 'sky' : 'lokal', bruker: null, klar: false, online: navigator.onLine,
  ko: [], synker: false, feil: [], sistSynk: null, route: { tab: 'runde' },
  meldinger: [],
})

/* ---------- melding (toast) ---------- */
export function melding(tekst) {
  const id = uid(); app.meldinger.push({ id, tekst })
  setTimeout(() => { const i = app.meldinger.findIndex((m) => m.id === id); if (i >= 0) app.meldinger.splice(i, 1) }, 3000)
}
export function go(route) { app.route = route; window.scrollTo(0, 0) }

/* ---------- lokal lagring ---------- */
function lagreLokalt() {
  try {
    const ventendeFoto = new Set(app.ko.filter((o) => o.kind === 'foto').map((o) => o.path))
    // bilder som allerede er lastet opp, lagres bare som sti (sparer plass)
    const kopi = JSON.parse(JSON.stringify(S))
    if (app.modus === 'sky') kopi.runder.forEach((r) => r.steder.forEach((rs) => Object.values(rs.svar || {}).forEach((a) => {
      if (a.fotoPath && !ventendeFoto.has(a.fotoPath)) a.photo = a.fotoPath
    })))
    localStorage.setItem(CACHE, JSON.stringify(kopi))
    localStorage.setItem(KO, JSON.stringify(app.ko))
  } catch (e) { melding('Kunne ikke lagre på enheten (fullt minne?)') }
}
let lagreTimer = null
watch(S, () => { clearTimeout(lagreTimer); lagreTimer = setTimeout(lagreLokalt, 300) }, { deep: true })

function lesLokalt() {
  try {
    const c = JSON.parse(localStorage.getItem(CACHE) || 'null')
    if (c) Object.assign(S, c)
    app.ko = JSON.parse(localStorage.getItem(KO) || '[]')
  } catch (e) { /* tom start */ }
}

/* ---------- kø mot Supabase ---------- */
function leggIKo(op) {
  if (app.modus !== 'sky') return
  op.key = op.kind === 'foto' ? 'foto:' + op.path
    : op.kind === 'upsert' ? `u:${op.table}:${(op.pkVal || op.row.id || '')}`
    : `d:${op.table}:${JSON.stringify(op.match)}`
  // Samme rad flere ganger: nyeste versjon på samme plass i køen (forelder før barn).
  // Unntak: runde-hodet legges alltid sist, ellers kan låsingen komme før de siste svarene.
  const i = op.table === 'runde' ? -1 : app.ko.findIndex((o) => o.key === op.key)
  if (i >= 0 && op.kind === 'upsert') app.ko[i] = op
  else app.ko.push(op)
  lagreLokalt()
  planleggSynk()
}
const upsert = (table, row, pkVal) => leggIKo({ kind: 'upsert', table, row, pkVal })
const slett = (table, match) => leggIKo({ kind: 'delete', table, match })

let synkTimer = null
function planleggSynk(ms = 800) { clearTimeout(synkTimer); synkTimer = setTimeout(synk, ms) }

const erNettfeil = (e) => !navigator.onLine || /fetch|network|timeout|Load failed/i.test(String(e?.message || e))

export async function synk() {
  if (app.modus !== 'sky' || !app.bruker || app.synker) return
  if (!app.ko.length) return
  app.synker = true
  try {
    while (app.ko.length) {
      const op = app.ko[0]
      try { await utfor(op) }
      catch (e) {
        if (erNettfeil(e)) { planleggSynk(15000); break }
        app.feil.unshift({ tid: nowTime(), tekst: `${op.table || 'bilde'}: ${e.message || e}` })
        app.feil.splice(10)
      }
      app.ko.shift()
      lagreLokalt()
    }
    if (!app.ko.length) app.sistSynk = nowTime()
  } finally { app.synker = false }
}

/** Hent alt fra databasen (bare når køen er tom, ellers vinner lokale endringer først). */
export async function oppdaterFraSky() {
  if (app.modus !== 'sky' || !app.bruker) return
  await synk()
  if (app.ko.length) return
  try {
    const d = await hentAlt()
    S.stevner = d.stevner; S.runder = d.runder; S.avvik = d.avvik
    if (!S.stevner.some((s) => s.id === S.valgtStevne)) S.valgtStevne = S.stevner[0]?.id || null
    if (S.aktiv && !S.runder.some((r) => r.id === S.aktiv && !r.last)) S.aktiv = null
    app.sistSynk = nowTime()
  } catch (e) {
    if (!erNettfeil(e)) app.feil.unshift({ tid: nowTime(), tekst: 'Henting: ' + (e.message || e) })
  }
}

/* ---------- oppstart ---------- */
export async function start() {
  lesLokalt()
  window.addEventListener('online', () => { app.online = true; synk().then(oppdaterFraSky) })
  window.addEventListener('offline', () => { app.online = false })
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') oppdaterFraSky() })
  if (app.modus === 'sky') {
    const { data } = await sb.auth.getSession()
    app.bruker = data.session?.user || null
    sb.auth.onAuthStateChange((_e, session) => {
      const før = app.bruker?.id
      app.bruker = session?.user || null
      if (app.bruker && app.bruker.id !== før) oppdaterFraSky()
    })
    if (app.bruker) await oppdaterFraSky()
  }
  if (!S.navn && app.bruker?.user_metadata?.navn) S.navn = app.bruker.user_metadata.navn
  if (!S.stevner.length && !S.runder.some((r) => !r.last)) app.route = { tab: 'plan' }
  app.klar = true
}

/* ---------- PLAN ---------- */
export const finnStevne = (id) => S.stevner.find((s) => s.id === id)
export const valgtStevne = () => finnStevne(S.valgtStevne) || S.stevner[0] || null

function lagreHeleStevnet(st) {
  upsert('stevne', rad.stevne(st))
  st.dager.forEach((d) => { upsert('stevne_dag', rad.dag(st, d)); d.steder.forEach((s, n) => upsert('plan_sted', rad.sted(d, s, n))) })
}

export function importerStevne(ny) {
  const gml = S.stevner.find((x) => x.nr && x.nr === ny.nr)
  if (gml) {
    // samme stevnenummer: planen erstattes (runder og avvik blir liggende)
    slett('stevne', { id: gml.id })
    S.stevner.splice(S.stevner.indexOf(gml), 1, ny)
    lagreHeleStevnet(ny)
    S.runder.filter((r) => r.stevneId === gml.id).forEach((r) => { r.stevneId = ny.id; upsertRundeHode(r) })
  } else { S.stevner.push(ny); lagreHeleStevnet(ny) }
  S.valgtStevne = ny.id
}

export function leggTilStevne(st) { S.stevner.push(st); lagreHeleStevnet(st); S.valgtStevne = st.id }

export function slettStevne(st) {
  S.stevner.splice(S.stevner.indexOf(st), 1)
  slett('stevne', { id: st.id })
  S.valgtStevne = S.stevner[0]?.id || null
}

export function lagreSted(st, dag, s) { upsert('plan_sted', rad.sted(dag, s, dag.steder.indexOf(s))) }
export function leggTilSted(st, dag, s) { dag.steder.push(s); lagreSted(st, dag, s) }
export function fjernSted(st, dag, s) { dag.steder.splice(dag.steder.indexOf(s), 1); slett('plan_sted', { id: s.id }) }
export function kopierDag(st, dag, fra) {
  dag.steder.forEach((s) => slett('plan_sted', { id: s.id }))
  dag.steder = fra.steder.map((s) => ({ ...JSON.parse(JSON.stringify(s)), id: uid() }))
  dag.steder.forEach((s, n) => upsert('plan_sted', rad.sted(dag, s, n)))
}

/* ---------- RUNDE ---------- */
function upsertRundeHode(r) { upsert('runde', rad.runde(r)) }

export function startRunde({ tpl, dato, stevne, steder, kontrollor }) {
  const r = {
    id: uid(), tpl, dato, event: stevne ? stevne.navn : 'Uten stevne', stevneId: stevne?.id || null, kontrollor, last: false, lastTid: null,
    steder: steder.map((s) => ({
      id: uid(), planStedId: s.fraPlan ? s.id : null, ferdig: false, tid: null, svar: {},
      def: { navn: s.navn, items: sjekkpunkter(s), tider: s.tider || '', vindu: s.vindu || '', notes: s.notes || [] },
    })),
  }
  S.runder.unshift(r); S.aktiv = r.id; S.navn = kontrollor
  upsertRundeHode(r)
  r.steder.forEach((rs, n) => upsert('runde_sted', rad.rundeSted(r, rs, n)))
  return r
}

export function settSvar(r, rs, i, patch) {
  if (r.last) return
  const a = { ...(rs.svar[i] || {}), ...patch }
  if (patch.photo === undefined && 'photo' in patch) { delete a.photo; delete a.fotoPath }
  rs.svar[i] = a
  upsert('svar', rad.svar(rs, i, a), `${rs.id}:${i}`)
}

export function settFoto(r, rs, i, dataUrl) {
  if (app.modus === 'sky') {
    const path = `${r.id}/${rs.id}_${i}_${Date.now()}.jpg`
    leggIKo({ kind: 'foto', path, data: dataUrl })
    settSvar(r, rs, i, { photo: dataUrl, fotoPath: path })
  } else settSvar(r, rs, i, { photo: dataUrl })
}

/** Stedet er ferdig kontrollert: lås svarene for stedet, registrer avvik. */
export function fullforSted(r, rs) {
  rs.ferdig = true
  rs.tid = rs.tid || nowTime()
  upsert('runde_sted', rad.rundeSted(r, rs, r.steder.indexOf(rs)))
  const nye = problemer(rs.def.items, rs.svar)
  // eksisterende åpne avvik for stedet: behold id når samme punkt, slett de som ikke lenger gjelder
  const gamle = S.avvik.filter((a) => a.rs === rs.id && a.status === 'åpen')
  gamle.filter((a) => !nye.some((p) => p.i === a.i)).forEach((a) => { S.avvik.splice(S.avvik.indexOf(a), 1); slett('avvik', { id: a.id }) })
  nye.forEach((p) => {
    let a = gamle.find((x) => x.i === p.i)
    if (!a) { a = { id: uid(), runde: r.id, rs: rs.id, status: 'åpen', tiltak: '' }; S.avvik.push(a) }
    Object.assign(a, { navn: rs.def.navn, i: p.i, lvl: p.lvl, tekst: p.tekst, verdi: p.verdi, krav: p.krav || '', notat: (rs.svar[p.i] || {}).note || '', dato: r.dato, tid: rs.tid, av: r.kontrollor })
    upsert('avvik', rad.avvik(a))
  })
  return nye
}

export function lasRunde(r) {
  r.last = true; r.lastTid = nowTime(); S.aktiv = null
  upsertRundeHode(r)
  planleggSynk(100)
}

/* ---------- AVVIK ---------- */
export function lagreAvvik(a) { upsert('avvik', rad.avvik(a)) }
export function lukkAvvik(a) { a.status = 'lukket'; a.lukket = today(); lagreAvvik(a) }

/* ---------- innlogging ---------- */
export async function loggInn(epost, passord) {
  const { error } = await sb.auth.signInWithPassword({ email: epost, password: passord })
  if (error) throw error
}
export async function sendKode(epost) {
  const { error } = await sb.auth.signInWithOtp({ email: epost, options: { shouldCreateUser: false, emailRedirectTo: window.location.origin } })
  if (error) throw error
}
export async function bekreftKode(epost, kode) {
  const { error } = await sb.auth.verifyOtp({ email: epost, token: kode, type: 'email' })
  if (error) throw error
}
export async function loggUt() {
  await synk()
  if (app.ko.length && !confirm('Noen endringer er ikke sendt ennå. Logge ut likevel? De blir liggende på enheten.')) return
  await sb.auth.signOut()
}
