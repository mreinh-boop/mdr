/* Supabase-klient og mapping mellom app-modell og tabeller. */
import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY
export const sb = url && key ? createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true } }) : null

/* ---------- app → rader ---------- */
export const rad = {
  stevne: (st) => ({ id: st.id, nr: st.nr || '', navn: st.navn, kilde: st.kilde || '', qa: st.qa || [] }),
  dag: (st, d) => ({ id: d.id, stevne_id: st.id, dato: d.dato, ukedag: d.ukedag || '', info: d.info || '' }),
  sted: (d, s, n) => ({
    id: s.id, dag_id: d.id, gruppe: s.gruppe, navn: s.navn, tider: s.tider || '', vindu: s.vindu || '',
    ubekreftet: !!s.ubekreftet, aktiv: !!s.aktiv, notes: s.notes || [], kort: s.kort || [],
    mal_tpl: s.mal?.tpl || null, mal_id: s.mal?.id || null, sortering: n,
  }),
  runde: (r) => ({ id: r.id, stevne_id: r.stevneId || null, event: r.event, tpl: r.tpl, dato: r.dato, kontrollor_navn: r.kontrollor, last: !!r.last, last_tid: r.lastTid || null }),
  rundeSted: (r, rs, n) => ({ id: rs.id, runde_id: r.id, plan_sted_id: rs.planStedId || null, sortering: n, def: rs.def, ferdig: !!rs.ferdig, kontrollert_kl: rs.tid || null }),
  svar: (rs, i, a) => ({ runde_sted_id: rs.id, idx: +i, verdi: a.v ?? null, notat: a.note ?? null, foto: a.fotoPath || null, endret: new Date().toISOString() }),
  avvik: (a) => ({
    id: a.id, runde_id: a.runde, runde_sted_id: a.rs, sted_navn: a.navn, idx: a.i, niva: a.lvl, tekst: a.tekst,
    verdi: a.verdi || '', krav: a.krav || '', notat: a.notat || '', dato: a.dato, tid: a.tid || '', av: a.av || '',
    status: a.status, tiltak: a.tiltak || '', lukket: a.lukket || null,
  }),
}
export const pk = {
  stevne: ['id'], stevne_dag: ['id'], plan_sted: ['id'], runde: ['id'], runde_sted: ['id'], svar: ['runde_sted_id', 'idx'], avvik: ['id'],
}

/* ---------- hent alt (små datamengder i testfasen; side for side forbi 1000-grensen) ---------- */
async function alle(tabell, order) {
  const ut = []
  for (let fra = 0; ; fra += 1000) {
    let q = sb.from(tabell).select('*').range(fra, fra + 999)
    if (order) q = q.order(order)
    const { data, error } = await q
    if (error) throw error
    ut.push(...data)
    if (data.length < 1000) return ut
  }
}

/* ---------- rader → app ---------- */
export async function hentAlt() {
  const [stevner, dager, steder, runder, rsteder, svar, avvik] = await Promise.all([
    alle('stevne', 'opprettet'), alle('stevne_dag', 'dato'), alle('plan_sted', 'sortering'),
    alle('runde', 'opprettet'), alle('runde_sted', 'sortering'), alle('svar'), alle('avvik', 'dato'),
  ])
  const svarPer = new Map()
  svar.forEach((s) => {
    if (!svarPer.has(s.runde_sted_id)) svarPer.set(s.runde_sted_id, {})
    const a = {}
    if (s.verdi != null) a.v = s.verdi
    if (s.notat != null) a.note = s.notat
    if (s.foto) { a.photo = s.foto; a.fotoPath = s.foto }
    svarPer.get(s.runde_sted_id)[s.idx] = a
  })
  return {
    stevner: stevner.map((st) => ({
      id: st.id, nr: st.nr, navn: st.navn, kilde: st.kilde, qa: st.qa || [],
      dager: dager.filter((d) => d.stevne_id === st.id).map((d) => ({
        id: d.id, dato: d.dato, ukedag: d.ukedag, info: d.info,
        steder: steder.filter((s) => s.dag_id === d.id).map((s) => ({
          id: s.id, gruppe: s.gruppe, navn: s.navn, tider: s.tider, vindu: s.vindu, ubekreftet: s.ubekreftet,
          aktiv: s.aktiv, notes: s.notes || [], kort: s.kort || [], mal: s.mal_tpl ? { tpl: s.mal_tpl, id: s.mal_id } : null,
        })),
      })),
    })),
    runder: runder.slice().reverse().map((r) => ({
      id: r.id, stevneId: r.stevne_id, event: r.event, tpl: r.tpl, dato: r.dato, kontrollor: r.kontrollor_navn,
      last: r.last, lastTid: r.last_tid,
      steder: rsteder.filter((x) => x.runde_id === r.id).map((x) => ({
        id: x.id, planStedId: x.plan_sted_id, def: x.def, ferdig: x.ferdig, tid: x.kontrollert_kl, svar: svarPer.get(x.id) || {},
      })),
    })),
    avvik: avvik.map((a) => ({
      id: a.id, runde: a.runde_id, rs: a.runde_sted_id, navn: a.sted_navn, i: a.idx, lvl: a.niva, tekst: a.tekst,
      verdi: a.verdi, krav: a.krav, notat: a.notat, dato: a.dato, tid: a.tid, av: a.av, status: a.status, tiltak: a.tiltak, lukket: a.lukket,
    })),
  }
}

/* ---------- én operasjon fra køen ---------- */
export async function utfor(op) {
  if (op.kind === 'foto') {
    const blob = await (await fetch(op.data)).blob()
    const { error } = await sb.storage.from('foto').upload(op.path, blob, { contentType: 'image/jpeg', upsert: true })
    if (error) throw error
    return
  }
  if (op.kind === 'upsert') {
    const { error } = await sb.from(op.table).upsert(op.row, { onConflict: pk[op.table].join(',') })
    if (error) throw error
    return
  }
  if (op.kind === 'delete') {
    let q = sb.from(op.table).delete()
    Object.entries(op.match).forEach(([k, v]) => { q = q.eq(k, v) })
    const { error } = await q
    if (error) throw error
  }
}

const urlCache = new Map()
export async function fotoUrl(path) {
  if (!path || path.startsWith('data:')) return path
  if (urlCache.has(path)) return urlCache.get(path)
  const { data, error } = await sb.storage.from('foto').createSignedUrl(path, 3600)
  if (error) throw error
  urlCache.set(path, data.signedUrl)
  return data.signedUrl
}

export async function fotoDataUrl(path) {
  if (!path || path.startsWith('data:')) return path
  const { data, error } = await sb.storage.from('foto').download(path)
  if (error) throw error
  return await new Promise((res) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.readAsDataURL(data) })
}
