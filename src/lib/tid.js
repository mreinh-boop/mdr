/* Tid og dato. Alle datoer er lokale ISO-datoer (YYYY-MM-DD). */
export const uid = () => (crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
  const r = (Math.random() * 16) | 0
  return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
}))

export const isoLocal = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10)
export const today = () => isoLocal(new Date())
export const nowTime = () => new Date().toTimeString().slice(0, 5)
export const fmtDate = (d) => (d ? d.split('-').reverse().join('.') : '')
const UKEDAG = ['Søndag', 'Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lørdag']
export const ukedag = (iso) => UKEDAG[new Date(iso + 'T12:00').getDay()]
export const leggTilDager = (iso, n) => isoLocal(new Date(new Date(iso + 'T12:00').getTime() + n * 864e5))

const tilMin = (s) => { const [h, m] = s.split(':').map(Number); return h * 60 + m }
export const hm = (m) => `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`

/** "16:00–23:00 · 21:30–00:00" → [{f,t}] i minutter (over midnatt +1440). */
export function intervaller(txt) {
  const out = []
  String(txt || '').replace(/(\d{1,2}:\d{2})\s*[–-]\s*(\d{1,2}:\d{2})/g, (_, a, b) => {
    const f = tilMin(a); let t = tilMin(b)
    if (t <= f) t += 1440
    out.push({ f, t })
  })
  return out
}

/** Når kontrollen tidligst bør skje (sortering). Kiosker: 30 min etter åpning. */
export function kontrollFra(sted) {
  const v = intervaller(sted.vindu)[0]
  if (v) return v.f
  const i = intervaller(sted.tider)[0]
  return i ? i.f + (sted.gruppe === 'kiosk' ? 30 : 0) : 9999
}

export function kontrollTekst(sted) {
  if (sted.vindu) return 'kontroll ' + sted.vindu.replace(/-/g, '–')
  const i = intervaller(sted.tider)[0]
  if (!i) return ''
  return sted.gruppe === 'kiosk' ? `kontroll tidligst ${hm(i.f + 30)}` : ''
}

/** true/false hvis datoen er i dag, ellers null. */
export function aapenNaa(tider, dato) {
  if (dato !== today()) return null
  const n = new Date(); const m = n.getHours() * 60 + n.getMinutes()
  return intervaller(tider).some((i) => (m >= i.f && m < i.t) || (m + 1440 >= i.f && m + 1440 < i.t))
}

export const sorterSteder = (l) => l.slice().sort((a, b) => kontrollFra(a) - kontrollFra(b) || a.navn.localeCompare(b.navn, 'no'))
