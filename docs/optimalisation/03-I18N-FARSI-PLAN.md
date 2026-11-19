# 03 · Vertaal-JSON & Farsi (`fa` / RTL) Architectuurplan

Dit document beschrijft hoe we **We All Breathe The Same Air** volledig vertaalbaar maken via overzichtelijke JSON-bestanden voor **Engels (`en`)**, **Nederlands (`nl`)** en **Farsi (`fa`)**.

---

## 1. Goed nieuws uit de huidige codebase

Een groot deel van de meertalige basis is in de hoofdstukken **al aanwezig**:
1. **Farsi lettertype (`Vazirmatn`) wordt al geladen** in Hoofdstuk 1–4 (`--f-fa: "Vazirmatn", Tahoma, sans-serif;`).
2. **Hoofdstuk 1–4 hebben al sleutel-gebaseerde UI-vertalingen (`T = { nl: {...}, en: {...} }`)** met `[data-t="..."]` attributen en `t("key", ...args)`.
3. **Hoofdstuk 1–4 hebben al tijdgecodeerde ondertitels (`CUES`)** in zowel Engels als Nederlands (`[start, end, enText, nlText]`).
4. **Intro-video tijdstempels (`CUES`, 20 regels)** zijn bewaard gebleven in de originele bron (`Begin Intro HTML zip - WeAllBreatheTheSameAir-website/intro/index.html`).

Wat nog **hardcoded in het Engels** staat zonder vertaallaag:
- De homepagina (`www/index.html`) en losse intro (`www/intro/index.html`).
- De 2D Kamer UI & captions (`www/room/index.html`, `www/room/app.js`, `www/room/shared/shared.js`).
- De intro-video zelf (`vid/intro.mp4`) heeft ingebrande Engelse ondertitels (zie sectie 4).

---

## 2. Inventarisatie van alle te vertalen onderdelen

| Onderdeel | Bestand(en) | Aantal strings / cues | Opmerking |
| :--- | :--- | :--- | :--- |
| **Homepagina (`/`)** | `www/index.html` | ~38 UI- & verhaalteksten | Boektitels, beschrijvingen, knoppen (`Start`, `Enter`, `Watch the trailer`), credits-rollen (`Script`, `Illustrations`, `Sound`, …). |
| **Intro & Raamscène (`#stage`)** | `www/index.html`, `www/intro/index.html` | ~8 UI-strings + **20 intro-cues** | `← Home`, `Skip ›`, `Click young Sam to begin`, + 20 gesproken intro-zinnen. |
| **De Kamer (Three.js Hub)** | `room/index.html`, `room/app.js`, `room/shared/shared.js` | ~22 strings | Startkaart, Eindkaart (`The End`, `Start again`, `← Home`), `← Back to room`, 4 object-captions (`Click the passport to begin.`, …). *Krijtbord op de muur blijft Nederlands (onderdeel van Sams verhaal: Nederlands leren in het AZC).* |
| **Hoofdstuk 1 · Schiphol** | `Hoofdstuk_1_Schiphol/index.html` | ~36 UI/stem-keys + **40 ondertitel-cues** | Inclusief celmuur-prompt, verhoor-prompt, gele pasje (`Naam` / `Nummer`), stempel (`FALSE` / `VALS` / `جعلی`). |
| **Hoofdstuk 2 · The AZC** | `Hoofdstuk_2_The_AZC/index.html` | ~24 UI/stem-keys + **31 ondertitel-cues** | Telefoon naar huis, brief, verstoppen onder deken, slot, vogeltje. |
| **Hoofdstuk 3 · Amsterdam** | `Hoofdstuk_3_Amsterdam/index.html` | ~20 UI/stem-keys + **28 ondertitel-cues** | Verblijfspasje verbranden, fietsroute kaart, brood/werk. |
| **Hoofdstuk 4 · The Letter** | `Hoofdstuk_4_The_Letter/index.html` | ~18 UI/stem-keys + **36 ondertitel-cues** | Afwijzingsbrief, munten tellen, uitwissen, einde. |

**Totaal:** ~166 korte UI-/interactiestrings en ~155 ondertitelregels (waarvan EN + NL voor de 4 hoofdstukken al geschreven zijn!).

---

## 3. Voorgestelde JSON-structuur (`www/i18n/`)

Eén overzichtelijke map `Capacitor_Apps/app-room/www/i18n/` die zowel op web als offline in de iOS/Android Capacitor-app werkt zonder externe API:

```
Capacitor_Apps/app-room/www/
└── i18n/
    ├── i18n.js       # Kleine helper (~90 regels): laadt taal, past [data-i18n] & dir="rtl" toe, slaat keuze op
    ├── en.json       # Engels (volledig geëxtraheerd uit huidige app)
    ├── nl.json       # Nederlands (hoofdstukken al klaar + home/kamer aanvullen)
    └── fa.json       # Farsi (klaarstaande sleutel-structuur voor vertaler)
```

### Voorbeeld van `fa.json` / `en.json` opbouw

```json
{
  "meta": {
    "lang": "fa",
    "dir": "rtl",
    "label": "فارسی"
  },
  "landing": {
    "part1": "بخش ۱",
    "part2": "بخش ۲",
    "start": "شروع",
    "enter": "ورود",
    "windowHint": "برای شروع روی <b>سام جوان</b> کلیک کنید"
  },
  "room": {
    "backToRoom": "بازگشت به اتاق →",
    "backHome": "خانه →",
    "clickPassport": "برای شروع روی گذرنامه کلیک کنید.",
    "theEnd": "پایان",
    "startAgain": "شروع دوباره"
  },
  "chapters": {
    "1": {
      "title": "اسخیپول",
      "ui": {
        "b_lbl": "نفست را<br>حبس کن",
        "b_stamp": "جعلی",
        "b_held": "نفست را {0} ثانیه حبس کردی"
      },
      "cues": [
        [0.1, 6.1, "اسخیپول. هوا سنگین بود از قصه‌هایی که نمی‌خواستم بگویم."]
      ]
    }
  }
}
```

> [!TIP]
> Plaatsvervangers zoals `{0}` (bijv. `"Je hield je adem {0} seconden in"`) vervangen de huidige JS-functies in `T`, zodat het vertaalbestand **100% geldige, veilige JSON** is die een vertaler direct in elke teksteditor kan invullen zonder code aan te raken.

---

## 4. Afgestemde Regels voor Engels (`en`), Nederlands (`nl`) & Farsi (`fa`) (Q6, Q8 & Q9)

1. **Taalwisselaar, standaardtaal & `CC`-knop (Q8):**
   - Standaardtaal is **`en`** (met directe URL-override `?lang=nl|fa|en` en opslag in `localStorage`).
   - Een subtiele taalschakelaar **`EN · NL · فارسی`** staat rechtsboven op de **Doors** én in de bovenbalk van de video-/kamer-overlay.
   - Bij **`en`** staan video-**Subtitles** (`.big`) **uit** en is de `#cc`-toggle verborgen, omdat alle video's (`intro.mp4` + hoofdstuk-films) al **`Burned-in English`** tekst bevatten.
   - Zodra de speler **`nl`** of **`fa`** kiest, gaan de vertaalde **Subtitles** (`.big` met dekkende donkere balk `rgba(0,0,0,.86)` onderin het 16:9 kader) **standaard aan**, én verschijnt in de videobalk de **`#cc`-toggleknop** zodat kijkers de ondertitelbalk desgewenst nog zelf uit of aan kunnen zetten.

2. **Volledig ingevulde `en.json`, `nl.json` & `fa.json` (Q9):**
   - Alle drie de JSON-bestanden in `www/i18n/` worden direct compleet opgeleverd inclusief een volledige eerste Nederlandse en Farsi vertaling voor **Doors**, **Intro Film**, **Window Scene**, **The Room** en **Chapters 1–4**, zodat de hele ervaring meteen in alle drie de talen testbaar is en een vertaler/Sam alleen nog `fa.json` hoeft na te lopen.

2. **Gerichte `dir="rtl"` i.p.v. hele pagina spiegelen:**
   - In Farsi krijgen **tekstblokken, knoppen, formulieren (`textarea`/`input`), kaarten en ondertitels** `dir="rtl"` en `lang="fa"` met font `Vazirmatn` (lokaal gebundeld in `www/fonts/` zodat de Capacitor iOS/Android app ook offline het Farsi font heeft).
   - **Niet spiegelen (`dir="ltr"` behouden):**
     - De 16:9 kunst/illustraties, de **Window Scene** (`#young` op `left: 48%`), en de Three.js `1920 × 1080` kamer-coördinaten (`#hots`).
     - De video-tijdlijn / voortgangsbalk (`#tl` loopt van links `0:00` naar rechts `4:16`).

3. **Geen losse tweetalige Farsi-onderregels meer in `en`/`nl` (Q3):**
   - Alle hardcoded Farsi zinnen in `voice(lines, fa)` (`mother` én `wall`) worden verwijderd uit de code; elke taal toont straks zuiver haar eigen vertaling uit `i18n/{en,nl,fa}.json`.
