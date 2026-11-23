/* PDF-eksport av et helt stevne (dokumentasjon for Mattilsynet). */
import { jsPDF } from 'jspdf'
import { autoTable } from 'jspdf-autotable'
import { MALER } from './katalog.js'
import { fmtDate, today, nowTime, ukedag } from './tid.js'
import { vurderTemp, statusFor } from './vurdering.js'

// jsPDF-standardfonter kan bare WinAnsi: bytt ut tegn som ellers forsvinner
const P = (s) => String(s ?? '').replace(/−/g, '-').replace(/≤/g, '<=').replace(/≥/g, '>=').replace(/[–—]/g, '-')
  .replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[^\x00-\xFF]/g, '')

function svarPdf(it, a) {
  a = a || {}
  if (it.t === 'yn') return { t: { ja: 'Ja', nei: 'Nei', ia: 'Ikke aktuelt' }[a.v] || 'Ikke besvart', lvl: a.v === 'nei' ? 'warn' : a.v ? '' : 'none' }
  if (it.t === 'crit') return { t: { ja: 'JA', nei: 'Nei' }[a.v] || 'Ikke besvart', lvl: a.v === 'ja' ? 'crit' : a.v ? '' : 'none' }
  if (it.t === 'temp') {
    if (a.v === undefined || a.v === '') return { t: 'Ikke målt', lvl: 'none' }
    const v = vurderTemp(it, a.v)
    return { t: a.v + ' ' + (it.unit || '°C') + (v === 'ok' ? '  OK' : v === 'warn' ? '  AVVIK' : v === 'crit' ? '  KRITISK' : ''), lvl: v === 'ok' ? '' : v }
  }
  if (it.t === 'photo') return { t: a.photo ? 'Bilde (se under)' : 'Ikke tatt', lvl: a.photo ? '' : 'none' }
  return { t: '', lvl: '' }
}

/**
 * gruppe = {navn, runder[]}, avvik = alle avvik, hentBilde(photo) → dataURL
 * Returnerer {blob, filnavn}.
 */
export async function lagStevnePdf(gruppe, alleAvvik, hentBilde) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const G = [0, 78, 72], RED = [179, 38, 30], ORA = [163, 91, 0], MUT = [91, 104, 99], W = 210, M = 14
  const runder = gruppe.runder
  const ids = new Set(runder.map((r) => r.id))
  const av = alleAvvik.filter((a) => ids.has(a.runde)).sort((a, b) => a.dato.localeCompare(b.dato) || (a.tid || '').localeCompare(b.tid || ''))
  const fra = runder[0].dato, til = runder[runder.length - 1].dato
  const farge = (data, lvl) => {
    if (lvl === 'crit') { data.cell.styles.textColor = RED; data.cell.styles.fontStyle = 'bold' }
    else if (lvl === 'warn') { data.cell.styles.textColor = ORA; data.cell.styles.fontStyle = 'bold' }
    else if (lvl === 'none') data.cell.styles.textColor = MUT
  }
  const base = {
    margin: { left: M, right: M, top: 20, bottom: 16 },
    styles: { font: 'helvetica', fontSize: 8.5, cellPadding: 1.8, lineColor: [215, 221, 207], lineWidth: 0.2, overflow: 'linebreak' },
    headStyles: { fillColor: G, textColor: 255, fontStyle: 'bold' }, alternateRowStyles: { fillColor: [247, 248, 243] },
  }
  const tabell = (o) => { autoTable(doc, o); return doc.lastAutoTable.finalY }

  // forside
  doc.setFillColor(...G); doc.rect(0, 0, W, 42, 'F')
  doc.setTextColor(255); doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.text('BCC EVENT  ·  F&B  ·  INTERNKONTROLL MAT', M, 14)
  doc.setFontSize(20); doc.text(doc.splitTextToSize(P(gruppe.navn), W - 2 * M), M, 25)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.text(P(`Periode ${fmtDate(fra)}${til !== fra ? ' - ' + fmtDate(til) : ''}`), M, 36)
  doc.setTextColor(0)
  const kontrollert = runder.reduce((n, r) => n + r.steder.filter((x) => x.ferdig).length, 0)
  const planlagt = runder.reduce((n, r) => n + r.steder.length, 0)
  let y = tabell({
    ...base, startY: 52, theme: 'plain', styles: { ...base.styles, fontSize: 10, cellPadding: 2 },
    columnStyles: { 0: { textColor: MUT, cellWidth: 60 }, 1: { fontStyle: 'bold' } },
    body: [['Kontrollrunder', `${runder.length} (${runder.filter((r) => r.last).length} avsluttet og låst)`], ['Steder kontrollert', `${kontrollert} av ${planlagt} planlagte`],
      ['Avvik totalt', String(av.length)], ['  herav kritiske', String(av.filter((a) => a.lvl === 'crit').length)], ['  herav åpne', String(av.filter((a) => a.status === 'åpen').length)],
      ['Kontrollører', [...new Set(runder.map((r) => r.kontrollor))].join(', ')], ['Eksportert', `${fmtDate(today())} kl. ${nowTime()}`]].map((r) => r.map(P)),
  }) + 8
  doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(...G); doc.text('Oversikt over runder', M, y); doc.setTextColor(0)
  tabell({
    ...base, startY: y + 3, head: [['Dato', 'Kontroll', 'Kontrollør', 'Steder', 'Avvik', 'Status']],
    body: runder.map((r) => {
      const a = alleAvvik.filter((x) => x.runde === r.id)
      return [fmtDate(r.dato), MALER[r.tpl].navn, r.kontrollor, `${r.steder.filter((x) => x.ferdig).length}/${r.steder.length}`, `${a.length}${a.some((x) => x.lvl === 'crit') ? ' (kritisk)' : ''}`, r.last ? 'Låst' : 'Ikke avsluttet'].map(P)
    }),
    didParseCell: (d) => { if (d.section === 'body' && d.column.index === 4) farge(d, d.cell.raw.includes('kritisk') ? 'crit' : d.cell.raw !== '0' ? 'warn' : '') },
  })

  // avvikslogg
  doc.addPage(); y = 20
  doc.setFont('helvetica', 'bold'); doc.setFontSize(14); doc.setTextColor(...G); doc.text('Avvikslogg', M, y); doc.setTextColor(0)
  if (av.length) tabell({
    ...base, startY: y + 4, head: [['Dato/tid', 'Sted', 'Kontrollpunkt', 'Verdi', 'Nivå', 'Notat', 'Status / tiltak']],
    columnStyles: { 0: { cellWidth: 20 }, 1: { cellWidth: 26 }, 3: { cellWidth: 18 }, 4: { cellWidth: 15 } },
    body: av.map((a) => [`${fmtDate(a.dato)}\n${a.tid}`, a.navn, a.tekst + (a.krav ? `\n(krav ${a.krav})` : ''), a.verdi, a.lvl === 'crit' ? 'KRITISK' : 'Avvik', a.notat || '-',
      a.status === 'åpen' ? 'ÅPEN' : `Lukket ${a.lukket ? fmtDate(a.lukket) : ''}\n${a.tiltak}`].map(P)),
    didParseCell: (d) => { if (d.section === 'body' && (d.column.index === 4 || d.column.index === 6)) farge(d, d.cell.raw === 'KRITISK' || d.cell.raw === 'ÅPEN' ? 'crit' : d.cell.raw === 'Avvik' ? 'warn' : '') },
  })
  else { doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.text('Ingen avvik registrert i dette stevnet.', M, y + 8) }

  // én side (eller flere) per runde
  for (const r of runder) {
    doc.addPage(); y = 20
    doc.setFont('helvetica', 'bold'); doc.setFontSize(14); doc.setTextColor(...G); doc.text(P(`${MALER[r.tpl].navn} · ${ukedag(r.dato)} ${fmtDate(r.dato)}`), M, y)
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...MUT)
    doc.text(P(`Kontrollør: ${r.kontrollor}   ·   ${r.last ? 'Låst' + (r.lastTid ? ' kl. ' + r.lastTid : '') : 'Runden er ikke avsluttet'}`), M, y + 5); doc.setTextColor(0)
    y += 10
    for (const rs of r.steder) {
      const st = rs.def, sv = rs.svar || {}, sta = statusFor(rs)
      if (y > 255) { doc.addPage(); y = 20 }
      const body = rs.ferdig
        ? st.items.map((it, i) => { const a = sv[i] || {}, p = svarPdf(it, a); return { row: [it.l + (it.t === 'temp' && it.krav ? `  (krav ${it.krav})` : ''), p.t, a.note || ''].map(P), lvl: p.lvl } })
        : [{ row: ['Stedet ble ikke kontrollert i denne runden', '', ''], lvl: 'none' }]
      const tittel = `${st.navn}${st.tider ? '   åpent ' + st.tider : ''}${rs.tid ? '   kontrollert kl. ' + rs.tid : ''}`
      y = tabell({
        ...base, startY: y, head: [[{ content: P(tittel), colSpan: 2 }, P(sta.t)]],
        columnStyles: { 0: { cellWidth: 95 }, 1: { cellWidth: 35 } }, body: body.map((b) => b.row),
        didParseCell: (d) => {
          if (d.section === 'body' && d.column.index === 1) farge(d, body[d.row.index].lvl)
          if (d.section === 'head' && d.column.index === 2) { d.cell.styles.halign = 'right'; if (sta.c === 'crit') d.cell.styles.fillColor = RED; else if (sta.c === 'warn') d.cell.styles.fillColor = ORA }
        },
      }) + 3
      const bilder = rs.ferdig ? st.items.map((it, i) => (sv[i] || {}).photo).filter(Boolean) : []
      if (bilder.length) {
        let x = M; const SZ = 34
        if (y + SZ > 282) { doc.addPage(); y = 20 }
        for (const b of bilder) {
          if (x + SZ > W - M) { x = M; y += SZ + 3; if (y + SZ > 282) { doc.addPage(); y = 20 } }
          try { doc.addImage(await hentBilde(b), 'JPEG', x, y, SZ, SZ, undefined, 'FAST') } catch (e) { /* bilde mangler */ }
          x += SZ + 3
        }
        y += SZ + 3
      }
      y += 4
    }
  }
  const n = doc.getNumberOfPages()
  for (let i = 1; i <= n; i++) {
    doc.setPage(i); doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(...MUT)
    doc.text(P(`IK-mat kontroll · ${gruppe.navn}`), M, 290); doc.text(`Side ${i} av ${n}`, W - M, 290, { align: 'right' })
  }
  const filnavn = `IK-mat_${P(gruppe.navn).replace(/[^\w\-æøåÆØÅ]+/g, '_').replace(/^_+|_+$/g, '')}_${fra}.pdf`
  return { doc, filnavn }
}

