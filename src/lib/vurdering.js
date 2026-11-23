/* Vurdering av svar: grenseverdier, påkrevde felt, status og avvik. */
import { fmtDate } from './tid.js'

export function vurderTemp(it, v) {
  if (v === '' || v == null || isNaN(+v)) return null
  const x = +v
  if (it.critMax != null && x > it.critMax) return 'crit'
  if (it.max != null && x > it.max) return 'warn'
  if (it.min != null && x < it.min) return it.min >= 60 ? 'crit' : 'warn'
  return 'ok'
}

export function verdictTekst(v) {
  return v === 'ok' ? 'Innenfor krav' : v === 'warn' ? 'Utenfor krav – avvik' : v === 'crit' ? 'KRITISK – meld skiftleder nå' : ''
}

/** items = sjekkpunkter, svar = {idx:{v,note,photo}} */
export function problemer(items, svar) {
  const out = []
  items.forEach((it, i) => {
    const a = svar[i] || {}
    if (it.t === 'yn' && a.v === 'nei') out.push({ i, lvl: 'warn', tekst: it.l, verdi: 'Nei' })
    if (it.t === 'temp') {
      const v = vurderTemp(it, a.v)
      if (v === 'warn' || v === 'crit') out.push({ i, lvl: v, tekst: it.l, verdi: a.v + ' ' + (it.unit || '°C'), krav: it.krav })
    }
    if (it.t === 'crit' && a.v === 'ja') out.push({ i, lvl: 'crit', tekst: 'Kritisk avvik meldt', verdi: 'Ja' })
  })
  return out
}

export function kravFor(it, a) {
  if (it.t === 'photo') return { photo: true }
  if (it.t === 'yn' && a.v === 'nei') return { note: true }
  if (it.t === 'temp') {
    const v = vurderTemp(it, a.v)
    if (v === 'warn') return { note: true }
    if (v === 'crit') return { note: true, photo: true }
  }
  if (it.t === 'crit' && a.v === 'ja') return { note: true, photo: true }
  return {}
}

export function mangler(items, svar) {
  const m = []
  items.forEach((it, i) => {
    const a = svar[i] || {}
    if ((it.t === 'yn' || it.t === 'crit') && !a.v) m.push(i)
    if (it.t === 'temp' && (a.v === undefined || a.v === '')) m.push(i)
    const need = kravFor(it, a)
    if (need.note && !(a.note || '').trim()) m.push(i)
    if (need.photo && !a.photo) m.push(i)
  })
  return [...new Set(m)]
}

export function statusFor(rs) {
  const svar = rs.svar || {}
  if (!rs.ferdig) return Object.keys(svar).length ? { c: 'todo', t: 'Påbegynt' } : { c: 'todo', t: 'Ikke kontrollert' }
  const p = problemer(rs.def.items, svar)
  if (p.some((x) => x.lvl === 'crit')) return { c: 'crit', t: 'Kritisk' }
  if (p.length) return { c: 'warn', t: p.length + ' avvik' }
  return { c: 'ok', t: 'OK' }
}

export function telegramTekst(a) {
  return `${a.lvl === 'crit' ? 'KRITISK AVVIK' : 'AVVIK'} – ${a.navn}\n${a.tekst}: ${a.verdi}${a.krav ? ' (krav ' + a.krav + ')' : ''}\nNotat: ${a.notat || '–'}\nTid: ${fmtDate(a.dato)} kl. ${a.tid}\nKontrollør: ${a.av}`
}
