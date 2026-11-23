/* Dagsplan: import fra IK-MAT-generatoren (_plan_model.json), manuelt stevne, HUSK-regler. */
import { MALER, finnMal } from './katalog.js'
import { uid, ukedag, leggTilDager, intervaller, hm } from './tid.js'

/** Leser _plan_model.json (gen_ikmat_plan_*.ps1) og lager et stevne med dager og steder. */
export function importerPlan(j) {
  const serTilIso = (ser) => new Date(Date.UTC(1899, 11, 30) + ser * 864e5).toISOString().slice(0, 10)
  if (!j || !Array.isArray(j.dager)) throw new Error('Fant ikke «dager» i fila. Er det en _plan_model.json?')
  const dm = j.dagmodell || []
  const dager = j.dager.map((ser, i) => {
    const d = dm.find((x) => x.ser === ser) || {}
    const steder = []
    ;(j.kiosker || []).forEach((k, ki) => {
      const raw = String((k.tider || [])[i] || '')
      if (!raw.trim()) return
      const ub = /ubekreftet/i.test(raw)
      const tider = raw.replace(/·?\s*⚠?\s*ubekreftet/gi, '').trim().replace(/·\s*$/, '').trim()
      steder.push(nyttSted('kiosk', k.navn, { tider, vindu: (d.kioskVindu || [])[ki] || '', ubekreftet: ub || !!k.ukjent }))
    })
    const sett = new Map()
    ;(j.mat || []).filter((m) => m.ser === ser).forEach((m) => {
      const key = m.label
      if (sett.has(key)) { sett.get(key).tider += ' · ' + m.tid; return }
      const s = nyttSted('utlevering', m.label, {
        tider: m.tid || '',
        ubekreftet: (m.kort || []).some((k) => /ubekreftet/.test(k)),
        notes: (m.notes || []).filter((n) => !/ubekreftet/.test(n)),
        kort: (m.kort || []).filter((k) => !/ubekreftet/.test(k)),
      })
      const iv = intervaller(s.tider)[0]
      if (iv) {
        const w = (d.vinduerA || []).find((v) => { const x = intervaller(v)[0]; return x && Math.min(x.t, iv.t) - Math.max(x.f, iv.f) >= 30 })
        if (w) s.vindu = w
      }
      sett.set(key, s); steder.push(s)
    })
    ;(j.kjokkenTider || []).forEach((k) => {
      const t = String((k.tider || [])[i] || '').trim()
      if (!t) return
      const oppv = /oppvarming/i.test(k.navn)
      steder.push(nyttSted('kjokken', k.navn.replace(/\s*\(bemannet\)/, ''), {
        tider: t, vindu: oppv ? d.kjokken || '' : '', notes: oppv && j.kjNote ? [j.kjNote] : [],
      }))
    })
    const iso = serTilIso(ser)
    return { id: uid(), dato: iso, ukedag: d.ukedag || ukedag(iso), info: d.info || '', steder }
  })
  const nr = String(j.eventNr || '')
  return {
    id: uid(), nr,
    navn: String(j.eventNavn || j.event || 'Stevne').replace(/\s+·\s+\d+$/, '') + (nr ? ' · ' + nr : ''),
    kilde: `Importert fra _plan_model.json${j.kilder && j.kilder.generert ? ' (generert ' + j.kilder.generert + ')' : ''}`,
    dager, qa: j.qa || [],
  }
}

export function nyttSted(gruppe, navn, o = {}) {
  return { id: uid(), gruppe, navn, tider: '', vindu: '', ubekreftet: false, notes: [], kort: [], aktiv: true, mal: finnMal(gruppe, navn), ...o }
}

/** Stevne lagt inn for hånd: alle steder fra katalogen, først stengt. */
export function nyttStevne(navn, fra, til) {
  const dager = []
  for (let d = fra; d <= til && dager.length < 21; d = leggTilDager(d, 1)) {
    const steder = []
    Object.entries(MALER).forEach(([g, m]) => m.stasjoner.forEach((s) => steder.push({ ...nyttSted(g, s.navn), aktiv: false, mal: { tpl: g, id: s.id } })))
    dager.push({ id: uid(), dato: d, ukedag: ukedag(d), info: '', steder })
  }
  return { id: uid(), nr: '', navn, kilde: 'Lagt inn manuelt', dager, qa: [] }
}

/** HUSK-hinweise for en dag (regler fra IK-mat-kontrollslots). */
export function huskFor(dag) {
  const h = []
  dag.steder.filter((s) => s.aktiv).forEach((s) => {
    const iv = intervaller(s.tider)
    if (s.ubekreftet) h.push(`${s.navn}: åpningstid ikke bekreftet – sjekk før runden`)
    if (!iv.length) return
    const sum = iv.reduce((a, i) => a + i.t - i.f, 0)
    if (s.gruppe === 'kiosk' && iv.some((i) => i.f >= 21 * 60)) h.push(`${s.navn} åpner ${hm(iv.find((i) => i.f >= 21 * 60).f)} – trenger kveldskontroll (ca. 22–23)`)
    else if (s.gruppe === 'kiosk' && sum <= 180) h.push(`${s.navn} er bare åpent ${s.tider} – lett å gå glipp av`)
    if (s.gruppe === 'kjokken' && /oppvarming/i.test(s.navn)) h.push(`Oppvarming kontrolleres FØR servering${s.vindu ? ' (' + s.vindu + ')' : ''} – etterpå ser man bare varmholding`)
  })
  return h
}
