/* Katalog: sjekklister per sted (fra Mitti-malene). Grenseverdier fra IK-mat-fasit (02_ccp). */
export const Q = (l) => ({ t: 'yn', l })
export const KJ = (l) => ({ t: 'temp', l, min: -1, max: 4, critMax: 7, krav: '−1 til +4 °C' })
export const FR = (l) => ({ t: 'temp', l, max: -18, critMax: -15, krav: '≤ −18 °C' })
export const TP = (l, o) => ({ t: 'temp', l, ...o })

const LISTE = Q('Daglig IK-MAT-liste utfylt, signert og synlig?')
const HYG = Q('Hygiene: håndvask-utstyr på plass, hansker ved direkte arbeid med mat, personell friskt (ingen symptom siste 48 t)?')
const REN = Q('Renhold: disk/benker/maskiner/gulv rent, ren/uren sone adskilt?')
const ALL = Q('Allergener: 14 merkepliktige synlig merket, egne redskaper?')
const FOTO = { t: 'photo', l: 'Bilde av disk/område/maskiner' }
const KRIT = { t: 'crit', l: 'KRITISK avvik? (frys > −15 °C, kjøl > +7 °C, sykdom hos personell, allergen-krysskontaminering, skadedyr)' }
const kiosk = (id, navn, midt) => ({ id, navn, items: [LISTE, HYG, REN, ...midt, FOTO, KRIT] })

export const GRUPPER = { kiosk: 'Kiosksalg', utlevering: 'Utlevering', kjokken: 'Sentralkjøkken' }
export const GRUPPE_REKKEFOLGE = ['kiosk', 'utlevering', 'kjokken']

export const MALER = {
  kiosk: { navn: 'Kiosksalg', beskr: 'Kiosker og salgssteder', stasjoner: [
    kiosk('ksn', 'SnackStop KSN', [Q('Varer i fryseboks ikke for høyt stablet?'), FR('Is-disk 1'), FR('Is-disk 2')]),
    kiosk('midten', 'SnackStop i Midten', [ALL, Q('FIFO fulgt (gamle varer foran)?'), KJ('Kjøl'), FR('Frys'), TP('Slushis', { max: 4, krav: '≤ +4 °C' }), TP('Softis', { max: -12, krav: '≤ −12 °C' })]),
    kiosk('odden', 'SnackStop Odden (Oddys)', [FR('Is-disk'), FR('Frys')]),
    kiosk('snadder', 'Snadder', [ALL, Q('Grill/olje/frys i god stand, rått og ferdig adskilt?'), TP('Burger steking kjerne', { min: 72, krav: '≥ 72 °C' }), TP('Varmholdt burger', { min: 60, krav: '≥ 60 °C' }), KJ('Kjøleskuff'), FR('Fryseskuff'), FR('Pommes-frys'), FR('Fryserom'), KJ('Kjølerom')]),
    kiosk('brygga', 'Snadder Brygga', [ALL, Q('Grill/olje/frys i god stand, rått og ferdig adskilt?'), KJ('Kjøleskap drikke'), FR('Frysedisk'), FR('Fryseskap')]),
    kiosk('popstrand', 'Snadder Pop Up strandsonen', [ALL, Q('Is og drikke lagret kaldt og forsvarlig?'), Q('Grill ren / steketemp ≥ 72 °C (om grilling)?'), TP('Kjøl/frys mobil', { krav: 'notér' })]),
    kiosk('popfest', 'Snadder Pop Up festplassen', [ALL, Q('Is og drikke lagret kaldt og forsvarlig?'), Q('Grill ren / steketemp ≥ 72 °C (om grilling)?'), TP('Kjøl/frys mobil', { krav: 'notér' })]),
    kiosk('lecafe', 'Le Café', [Q('Maskiner, benk og salgsområde rent?'), KJ('Kjøl'), FR('Frys 1'), FR('Frys 2')]),
    kiosk('gullkornet', 'Gullkornet', [Q('Svinn notert og gamle varer fjernet?'), Q('Område rundt bakevarene rent?'), KJ('Eksponerings-kjøl'), FR('Eksponerings-frys'), FR('Is-disk gjesteareal'), KJ('Kjølerom'), FR('Fryserom')]),
    kiosk('sporty', 'Sporty', [ALL, Q('Softis-/slushmaskin ren?'), Q('Oppvaskmaskin ren sone?'), FR('Fryseskap 1'), FR('Fryseskap 2'), FR('Is-disk 1'), FR('Is-disk 2'), KJ('Kjølerom 1'), TP('Softis', { max: 4, krav: '≤ +4 °C' }), FR('Frysedisk 3. etg')]),
    kiosk('iccfest', 'Ice Cream Corner Festplassen', [Q('Vann til isskje byttet (hver 30. min) og softismaskin ren?'), FR('Is-disk 1'), FR('Is-disk 2'), FR('Is-disk 3'), TP('Softis fryser', { max: -14, krav: '≤ −14 °C' })]),
    kiosk('iccbrygga', 'Ice Cream Corner Brygga', [Q('Vann til isskje byttet (hver 30. min) og softismaskin ren?'), FR('Is-disk'), FR('Frys'), TP('Softis', { max: 4, krav: '≤ +4 °C' })]),
    kiosk('sommer', 'Sommerkiosken', [Q('Vann til isskje byttet (hver 30. min)?'), FR('Is-disk'), FR('Frys')]),
    kiosk('salgsbrett', 'Mobilt salgssted (Salgsbrett)', [FR('Frys 1'), KJ('Kjøl 1–2'), TP('Oppvarming/varmholdt (om varm mat)', { min: 60, krav: '≥ 60 °C' })]),
    kiosk('fotball', 'Fotballbanen', [Q('Is og drikke lagret kaldt og forsvarlig?'), Q('Desinfeksjon og hansker tilgjengelig?')]),
  ] },
  kjokken: { navn: 'Sentralkjøkken', beskr: 'Kjøkken, oppvask, lager og oppvarming', stasjoner: [
    { id: 'sk', navn: 'Sentralkjøkken', items: [Q('Dagens sjekkliste og IK-MAT-dokumentasjon utfylt og tilgjengelig?'), Q('Riktig bekledning (hår dekket, ingen smykker)?'), Q('Rent og ryddig i alle produksjonsområder?'), Q('Såpe, papir og håndvask tilgjengelig og fylt opp?'), TP('Støynivå (dB)', { max: 78, krav: '≤ 78 dB', unit: 'dB' }), Q('Hansker i bruk under pakking, riktig og konsekvent?'), Q('Skille mellom rene og urene soner?'), Q('Ferdige pakker raskt på kjøl?'), { t: 'photo', l: 'Bilde av arbeidsområde og ferdige pakker med synlig vekt' }, KRIT] },
    { id: 'oppvask', navn: 'Oppvask', items: [Q('Rent og ryddig område?'), Q('Såpe, papir og håndvask tilgjengelig og fylt opp?'), Q('Riktig soneskille: ren oppvask aldri i uren sone?'), Q('Daglig sjekkliste fylt ut av personalet?'), { t: 'photo', l: 'Bilde av ferdig ryddet område' }, KRIT] },
    { id: 'lager', navn: 'Lager / megakjøl', items: [Q('Varer riktig plassert (kjølevarer ikke ute av kjøl)?'), Q('Ingen matvarer på gulvet?'), Q('All mat tildekket og merket med dato og innhold?'), Q('Rent og ryddig i hele rommet?'), KJ('Megakjøl'), { t: 'photo', l: 'Bilde av hyller og eventuelle feilplasseringer' }, KRIT] },
    { id: 'oppvarming', navn: 'Oppvarming av eventmat', items: [Q('Området rundt oppvarming rent og ryddig?'), Q('Temperatur målt og ført i skjema?'), TP('Kjernetemperatur etter oppvarming', { min: 72, krav: '≥ 72 °C (fisk 62)' }), TP('Maten før varmeskap', { min: 60, krav: '≥ 60 °C' }), Q('Maten satt raskt inn etter oppvarming?'), { t: 'photo', l: 'Bilde av temperaturskjemaet' }, KRIT] },
  ] },
  utlevering: { navn: 'Utlevering', beskr: 'Servering og utlevering av måltider', stasjoner: [
    { id: 'frokost', navn: 'Frokost', items: [Q('Utleveringsområdet ryddig og klart for gjester?'), Q('Matvarer står trygt (ikke i direkte sol/varme)?'), Q('Allergenmerking synlig og riktig plassert?'), { t: 'photo', l: 'Bilde av matoppsett' }, KRIT] },
    { id: 'kaffe', navn: 'Kaffe, drikke og snacks', items: [Q('Området ryddig og innbydende?'), Q('Kaffemaskin ren og uten søl?'), Q('Søppelbøtte og gulv rent?'), { t: 'photo', l: 'Bilde av hele området' }, KRIT] },
    { id: 'oasen', navn: 'Buffet Oasen', items: [Q('Dagens IK-MAT-sjekkliste dokumentert?'), Q('Disk og område ryddig og rent?'), Q('Allergener synlig merket?'), Q('Oppvaskmaskin: rent vann, ren sone kun med ren oppvask?'), { t: 'photo', l: 'Bilde av salgsområdet' }, KRIT] },
    { id: 'lunsj', navn: 'Lunsjservering', items: [Q('Utleveringsområdet ryddig og presentabelt?'), Q('Allergenmerking synlig, særlig ved salater og brød?'), Q('Allergistasjon på plass og adskilt?'), Q('Hansker ved håndtering av åpen mat?'), { t: 'photo', l: 'Bilde av matoppsett og porsjoner' }, KRIT] },
    { id: 'middag', navn: 'Middagsservering', items: [Q('Utleveringsområdet ryddig og klart?'), Q('Allergenmerking synlig og riktig plassert?'), Q('Allergistasjon tilgjengelig og adskilt?'), TP('Varmeskap', { min: 60, krav: '≥ 60 °C' }), TP('Ferdig porsjon', { min: 60, krav: '≥ 60 °C' }), Q('Maten holdes varm, står ikke åpent for lenge?'), { t: 'photo', l: 'Bilde av matoppsett og porsjoner' }, KRIT] },
    { id: 'kveld', navn: 'Kveldssnack', items: [Q('Utleveringsområdet ryddig og klart?'), Q('Dessert presentabel og hygienisk?'), Q('Allergenmerking synlig og riktig plassert?'), { t: 'photo', l: 'Bilde av oppsett' }, KRIT] },
  ] },
}

export const stasjon = (tpl, id) => MALER[tpl]?.stasjoner.find((s) => s.id === id)

export const GENERELL = {
  kiosk: [LISTE, HYG, REN, ALL, KJ('Kjøl'), FR('Frys'), FOTO, KRIT],
  utlevering: [Q('Utleveringsområdet ryddig og klart for gjester?'), Q('Allergenmerking synlig og riktig plassert?'), { t: 'photo', l: 'Bilde av oppsett' }, KRIT],
  kjokken: [Q('Rent og ryddig?'), Q('Såpe, papir og håndvask tilgjengelig og fylt opp?'), Q('Riktig soneskille ren/uren?'), { t: 'photo', l: 'Bilde av området' }, KRIT],
}

export const norm = (s) => String(s || '').toLowerCase().replace(/\s+/g, ' ').trim()

/** Finn riktig sjekkliste for et planlagt sted (navn fra Åpningstider/Kjøreplan). */
export function finnMal(gruppe, navn) {
  const n = norm(navn)
  if (gruppe === 'kiosk') {
    const hit = MALER.kiosk.stasjoner.slice().sort((a, b) => b.navn.length - a.navn.length)
      .find((s) => n.startsWith(norm(s.navn)) || norm(s.navn).startsWith(n))
    return hit ? { tpl: 'kiosk', id: hit.id } : null
  }
  const regler = gruppe === 'utlevering'
    ? [[/oasen/, 'oasen'], [/frokost/, 'frokost'], [/lunsj/, 'lunsj'], [/middag|pastabuffet/, 'middag'], [/kveld/, 'kveld'], [/kaffe|vann|snacks/, 'kaffe']]
    : [[/oppvarming/, 'oppvarming'], [/oppvask/, 'oppvask'], [/lager/, 'lager'], [/pakking|forberedelse|kjøkken/, 'sk']]
  const r = regler.find(([re]) => re.test(n))
  return r ? { tpl: gruppe, id: r[1] } : null
}

export function malNavn(sted) {
  return sted.mal ? stasjon(sted.mal.tpl, sted.mal.id)?.navn || 'generell sjekkliste' : 'generell sjekkliste'
}

/** Sjekkpunkter: grunnmal + tillegg ut fra hva som serveres (varm/kald/grill/allergen/zerofood). */
export function sjekkpunkter(sted) {
  const grunn = sted.mal ? stasjon(sted.mal.tpl, sted.mal.id)?.items : null
  const items = (grunn || GENERELL[sted.gruppe]).map((x) => ({ ...x }))
  const kort = (sted.kort || []).map(norm)
  const har = (f) => items.some(f)
  const inn = (it) => { const p = items.findIndex((x) => x.t === 'photo'); items.splice(p < 0 ? items.length - 1 : p, 0, it) }
  if (kort.includes('varm') && !har((x) => x.t === 'temp' && x.min >= 60)) inn(TP('Varmholding', { min: 60, krav: '≥ 60 °C' }))
  if (kort.includes('kald') && !har((x) => x.t === 'temp' && x.max === 4)) inn(KJ('Kald mat ved utlevering'))
  if (kort.includes('grill') && !har((x) => x.t === 'temp' && x.min >= 72)) inn(TP('Grill kjernetemperatur', { min: 72, krav: '≥ 72 °C' }))
  if (kort.includes('allergen')) inn(Q('Allergen: egne redskaper (kniv, folie, klype) for allergimat?'))
  if (kort.some((k) => k.includes('zerofood'))) inn(Q('Zerofood-regelen fulgt (dato sjekket, varmet/åpnet mat kastet, kjøl ≤ +4 °C)?'))
  return items
}
