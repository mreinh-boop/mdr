# IK-mat Kontroll

Handy-Web-App für die IK-mat-Kontrollrunden bei BCC Event (Ersatz für Mitti/SafetyCulture).
Stack nach BCC-Vorgabe: **Vue 3 + Tailwind + BCC Component Library** (`@bcc-code/component-library-vue`), **PostgreSQL über Supabase**, Hosting auf **Vercel**, Code auf **GitHub**.

| Reiter | Inhalt |
|---|---|
| Plan | Stevne importieren (`_plan_model.json` aus dem IK-MAT-Generator) oder anlegen; pro Tag Stellen auf/zu, Öffnungszeit, Kontrollfenster, HUSK-Hinweise |
| Runde | Tag + Bereich wählen → offene Stellen in Kontrollreihenfolge → Checkliste mit Grenzwertprüfung, Pflicht-Notiz/-Foto, Sperren |
| Avvik | offene/geschlossene Abweichungen, Telegram-Text kopieren, Maßnahme + Schließen |
| Rapporter | Runden je Stevne, PDF-Export des ganzen Stevne (Nachweis Mattilsynet) |

Zwei Betriebsarten:
- **Lokaler Testmodus** (ohne Supabase-Schlüssel): alles nur im Browser des Geräts.
- **Sky-Modus** (mit Supabase): gemeinsame Daten für alle Kontrollører, Login per E-Mail-Code, Fotos im Storage. Änderungen gehen in eine Warteschlange auf dem Gerät und werden gesendet, sobald Netz da ist (Strandsonen/Festplassen).

---

## Einrichtung für den ADV-Test (einmalig, ca. 30 Minuten)

### 1. GitHub: Repository anlegen
1. Auf github.com → **New repository** → Name `ik-mat-kontroll`, **Private**, ohne README.
2. Auf diesem PC im Ordner `C:\Claude\Mitti_Eigenbau\app`:
   ```bash
   git init -b main
   git add .
   git commit -m "IK-mat Kontroll: erste Version für ADV-Test"
   git remote add origin https://github.com/<DEIN-NAME>/ik-mat-kontroll.git
   git push -u origin main
   ```

### 2. Supabase: Datenbank
1. Auf supabase.com Konto anlegen → **New project**: Name `ik-mat-kontroll`, Region **Frankfurt (eu-central-1)**, sicheres DB-Passwort (nur im Passwortmanager ablegen).
2. **SQL Editor** → Inhalt von `supabase/migrations/0001_ikmat_schema.sql` einfügen → **Run**. (Darf mehrfach laufen.)
3. **Authentication → Sign In / Providers → Email**: aktiviert lassen. **„Allow new users to sign up" ausschalten** – nur eingeladene Adressen kommen rein.
4. **Authentication → Emails → Magic Link**: in die Vorlage den Code einfügen, z. B.
   `<p>Koden din: <b>{{ .Token }}</b></p>` (dann geht Login auch per Code, nicht nur per Link – wichtig, wenn die App vom Startbildschirm geöffnet wird).
5. **Authentication → Users → Invite user**: die Kontrollører einladen (zuerst nur dich selbst).
6. **Project Settings → API**: `Project URL` und `anon public`-Key kopieren (der anon-Key ist öffentlich, kein Geheimnis – die Regeln in der Datenbank schützen die Daten).

### 3. Vercel: Hosting
1. Auf vercel.com mit GitHub anmelden → **Add New → Project** → Repository `ik-mat-kontroll` importieren.
2. Framework wird als **Vite** erkannt. Unter **Environment Variables** eintragen:
   - `VITE_SUPABASE_URL` = Project URL
   - `VITE_SUPABASE_ANON_KEY` = anon public key
3. **Deploy** → Adresse z. B. `https://ik-mat-kontroll.vercel.app`.
4. Zurück in Supabase → **Authentication → URL Configuration** → **Site URL** = diese Vercel-Adresse.

Danach: Handy → Adresse öffnen → einloggen → „Zum Startbildschirm hinzufügen".

### 4. ADV-Plan laden
Reiter **Plan → Importer plan** → `testdata/2665_ADV1_plan_model.json` (bzw. `2670_ADV2_…`).
Die Dateien erzeugt der IK-MAT-Generator (`C:\Claude\IK-MAT\_build\gen_ikmat_plan_*.ps1`) ohnehin; bei geänderten Öffnungszeiten neu erzeugen und erneut importieren (gleiche Stevne-Nr. ersetzt die Planung, Runden bleiben).

---

## Entwicklung auf diesem PC
Node liegt portabel unter `C:\Claude\_tools\node` (kein Installer nötig).
```bash
cd C:\Claude\Mitti_Eigenbau\app
C:\Claude\_tools\node\npm.cmd install
C:\Claude\_tools\node\npm.cmd run dev     # http://localhost:5173
C:\Claude\_tools\node\npm.cmd run build   # Ergebnis in dist/
```
Für den Sky-Modus lokal: `.env.example` nach `.env.local` kopieren und die zwei Werte eintragen (`.env.local` wird nicht eingecheckt).

## Aufbau
```
src/lib/katalog.js     Checklisten je Stelle (aus den Mitti-Vorlagen), Grenzwerte, Zuordnung Plan → Checkliste
src/lib/plan.js        Import _plan_model.json, manuelles Stevne, HUSK-Regeln
src/lib/tid.js         Zeitfenster, „åpen nå", Sortierung
src/lib/vurdering.js   Grenzwertprüfung, Pflichtfelder, Status, Telegram-Text
src/lib/pdf.js         PDF-Export (jsPDF), wird erst beim Export geladen
src/data/store.js      Zustand + Aktionen + Offline-Warteschlange
src/data/sky.js        Supabase-Client, Abbildung App ↔ Tabellen
src/views/*.vue        Plan, Runde, Station, Avvik, Rapporter, Login
supabase/migrations/   Datenbankschema, Zugriffsregeln (RLS), Sperr-Trigger, Foto-Bucket
testdata/              _plan_model.json für ADV1 (2665) und ADV2 (2670)
```

## Regeln, die die Datenbank selbst durchsetzt
- Gesperrte Runden: Antworten, Stellen und Rundenkopf lassen sich nicht mehr ändern (Trigger) – nur noch das Schließen von Avvik mit Maßnahme.
- Nur eingeloggte, eingeladene Nutzer lesen/schreiben (Row Level Security). Runden kann die App nicht löschen.
- Fotos liegen im privaten Bucket `foto`, Anzeige nur über zeitlich begrenzte Links.

## Bewusst noch nicht drin (nach dem Test / mit IT)
- Login mit BCC-Konto (Entra ID oder BCC Login) statt E-Mail-Code
- Telegram-Meldung bei kritischem Avvik automatisch (braucht kleinen Server-Teil, z. B. .NET auf Cloud Run oder Supabase Edge Function)
- Plan direkt aus Åpningstider/Kjøreplan in SharePoint lesen
- App offline neu starten (Service Worker): Eingaben ohne Netz funktionieren, die App darf ohne Netz aber nicht neu geladen werden
- Archiv der 336 alten Mitti-Inspektionen
