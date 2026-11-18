# Optimalisatie & Architectuurplan · We All Breathe The Same Air

Dit overzicht bundelt de technische analyse, root-cause diagnoses en het uitvoeringsplan voor **We All Breathe The Same Air** (`https://thesameair.nl` en `https://maartenvanderglas-com-2hv.pages.dev/room/`).

De opbouw volgt het principe **makkelijke dingen eerst (Quick Wins → iOS Media/Audio → State & Architectuur → Farsi Vertaling)** zodat zichtbare en hoorbare bugs direct opgelost kunnen worden zonder te wachten op grotere refactors.

---

## Hoe de twee live URL's overeenkomen met deze repo

| Live omgeving | Bronmap / Build script | Pad-mapping |
| :--- | :--- | :--- |
| **`https://thesameair.nl`** | [`Deploy_Cloudflare_Pages.command`](file:///Users/maarten/Github_may_be_deleted/LikeDust_Part2/Deploy_Cloudflare_Pages.command) | Publiceert `Capacitor_Apps/app-room/www/` rechtstreeks als root (`/` = homepagina, `/intro/` = losse intro, `/room/` = 2D kamer). |
| **`https://maartenvanderglas-com-2hv.pages.dev/room/`** | [`build_cloudflare_pages.py`](file:///Users/maarten/Github_may_be_deleted/LikeDust_Part2/build_cloudflare_pages.py) → `dist_pages/` | Zet het review-dashboard op `/` en kopieert `Capacitor_Apps/app-room/www/` naar `/room/` (`/room/` = homepagina, `/room/room/` = 2D kamer). |
| **iOS & Android Capacitor App** | `Capacitor_Apps/app-room/www/` (`npm run sync`) | Gebruikt exact dezelfde `www/` bundel in `WKWebView` / Android `WebView`. |

> [!IMPORTANT]
> Alle wijzigingen vinden plaats in **`Capacitor_Apps/app-room/www/`**, waarna `python3 build_cloudflare_pages.py` en `npm run sync` de review-build (`dist_pages/`) en native apps synchroniseren.

---

## Geprioriteerde Roadmap (Makkelijke dingen eerst)

*(Zie ook [`docs/TERMINOLOGY_AND_STATE_MAP.md`](file:///Users/maarten/Github_may_be_deleted/LikeDust_Part2/docs/TERMINOLOGY_AND_STATE_MAP.md) voor alle afgesproken termen.)*

| Fase | Onderdeel | Complexiteit | Impact | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Fase 1A** | **Hoofdstuk 1 (`mother` & `wall`):** alle losse hardcoded Farsi onderregels verwijderen (zodat Farsi straks alleen via de taalkeuze getoond wordt) | ⚡ Zeer makkelijk | Direct zichtbaar | ✅ Geïmplementeerd & Browser-getest (Q3) |
| **Fase 1B** | **Window Scene (`#scene`):** reflectie van jonge Sam continu laten flikkeren i.p.v. blijven hangen | ⚡ Makkelijk | Sterk visueel effect op desktop & mobiel | ✅ Geïmplementeerd & Browser-getest (Q2) |
| **Fase 1C** | **`Doors` achtergrondvideo's op iOS/mobiel:** silent autoplay zonder native play-knoppen | ⚡ Makkelijk | Homepagina leeft ook op iOS & Android | ✅ Geïmplementeerd & Browser-getest (Q1) |
| **Fase 2A** | **Tussen-animaties & dode assets opruimen + `SamPose` fix:** alleen `Stand-Up` (begin), `Think Pose` (hele middenstuk) en `Window Gaze` (eind); `money.png` & `reject_rolled.png` blijven als stille props; verwijder `think.webp`, geld tellen, poster uitrollen (`reject_roll.png`), silhouet-zoom & ongebruikte MP3/PNG's; lost **Dubbele Sam** 100% op | 🟢 Middel | Schonere kamer, snellere load (~2 MB minder), geen Dubbele Sam meer | ✅ Geïmplementeerd & Browser-getest (Q4 & Q7) |
| **Fase 2B** | **iOS audio-bugs (`ldPrime` & `wake()` race):** geen 12 `<audio>`-elementen meer starten in verborgen hoofdstuk-iframes; gedeelde WebAudio SFX-engine | 🟢 Middel | Geen kloppend/doorlopend geluid of hapering op iOS meer | ✅ Geïmplementeerd & Browser-getest (Q5) |
| **Fase 3** | **State, Flow & Terug-navigatie:** lichtgewicht expliciete FSM (`room/shared/fsm.js`) + deterministische `history.state` + ontdubbelde hoofdstuk-runtime | 🟡 Middel | Voorspelbare state, back-knop & deep-links | ✅ Geïmplementeerd & Browser-getest (Q5 · [ADR-0001](file:///Users/maarten/Github_may_be_deleted/LikeDust_Part2/docs/adr/0001-zero-dependency-fsm-and-shared-chapter-runtime.md)) |
| **Fase 4** | **Uniforme Vertaal-JSON (`en` / `nl` / `fa`):** volledig ingevulde `www/i18n/{en,nl,fa}.json` + `EN · NL · فارسی` schakelaar + offline `Vazirmatn` (`RTL`); op `en` géén video-ondertitels, op `nl`/`fa` **standaard aan** + `#cc` toggleknop | 🟠 Middel-Groot | Volledig meertalig (EN / NL / FA) | ✅ Geïmplementeerd & Browser-getest (Q6, Q8 & Q9) |

---

## Documenten in deze map

1. [**01 · Bugs, iOS Audio & Video Analyse**](file:///Users/maarten/Github_may_be_deleted/LikeDust_Part2/docs/optimalisation/01-BUGS-AND-MEDIA-ANALYSIS.md)
   - Exacte root-cause per gemeld punt (met bestandspaden en regelnummers).
   - Uitleg waarom silent video-autoplay op iOS werkt zonder play-overlays (incl. Low Power Mode fallback).
   - Waarom op iOS `beat.mp3` (hartslag / kloppend) en `riot.mp3` / `s1.mp4` onbedoeld afgaan bij klikken op Sam of een hoofdstuk.
   - Waarom er twee Sams tegelijk zichtbaar worden na *Back to room*.

2. [**02 · State, Flow & Terug-navigatie Architectuur (XState vs. FSM)**](file:///Users/maarten/Github_may_be_deleted/LikeDust_Part2/docs/optimalisation/02-STATE-AND-FLOW-ARCHITECTURE.md)
   - Analyse van de huidige 5 versnipperde state-lagen en race-conditions.
   - Waarom sommige gedocumenteerde kamer-animaties (silhouet-zoom, poster uitrollen, geld tellen) momenteel overgeslagen worden in `app.js`.
   - Afweging **XState v5** vs. **Zero-dependency expliciete FSM + History-stack**.

3. [**03 · Vertaal-JSON & Farsi (`fa`) Plan**](file:///Users/maarten/Github_may_be_deleted/LikeDust_Part2/docs/optimalisation/03-I18N-FARSI-PLAN.md)
   - Volledige inventarisatie van alle teksten, interacties en ondertitels (`T` en `CUES`).
   - Voorstel voor `i18n/{en,nl,fa}.json`, RTL-typografie (`Vazirmatn` is al aanwezig!) en omgang met ingebrande Engelse intro-ondertitels.
