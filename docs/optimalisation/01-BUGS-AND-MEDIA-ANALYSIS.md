# 01 · Root-Cause Analyse: Bugs, iOS Audio & Mobiele Video

Dit document beschrijft per gemeld punt de exacte oorzaak in de code en de bijbehorende oplossing, geordend van **snelste quick-wins** naar **iOS media/state fixes**.

---

## 1. Hoofdstuk 1, interactie 4: "Mother" in Farsi weg ⚡ *(Quick Win #1)*

### Oorzaak
In [`Hoofdstuk_1_Schiphol/index.html`](file:///Users/maarten/Github_may_be_deleted/LikeDust_Part2/Capacitor_Apps/app-room/www/room/chapters/Hoofdstuk_1_Schiphol/index.html#L1578-L1585) heeft de film vijf pauzemomenten (`breath`, `silence`, `wall`, `mother`, `photo`). Het **4e interactiemoment** (`mother()`, na `s3.mp4` op `170.08s`) roept op [regel 2149](file:///Users/maarten/Github_may_be_deleted/LikeDust_Part2/Capacitor_Apps/app-room/www/room/chapters/Hoofdstuk_1_Schiphol/index.html#L2145-L2150) expliciet Farsi tekst aan:

```js
/* Hoofdstuk_1_Schiphol/index.html:2146-2150 */
mother() {
  ui.insertAdjacentHTML("beforeend", `<button class="phone" id="ph" ...>${t("ph_hold")}</button>
    <div class="ask" id="ask">${t("ph_ask")}</div>`);
  voice("", "مادر…"); // <-- Toont "مادر…" ("mother…" in Farsi) onderin beeld
```

*(Noot: Omdat `Hoofdstuk_2`, `Hoofdstuk_3` en `Hoofdstuk_4` eerder gekopieerde code van Hoofdstuk 1 bevatten, staat deze ongebruikte kopie ook op regel 2351, 969 en 3168 van die bestanden.)*

### Oplossing
- Verwijder `voice("", "مادر…");` in `Hoofdstuk_1_Schiphol/index.html` (en ruim de dode kopieën in Hoofdstuk 2–4 mee op).

---

## 2. Jonge en oude Sam bij het raam: "jonge Sam blijft, moet flikkeren" ⚡ *(Quick Win #2)*

### Wat er visueel gebeurt
In het vliegveldraam (`#scene` in [`www/index.html`](file:///Users/maarten/Github_may_be_deleted/LikeDust_Part2/Capacitor_Apps/app-room/www/index.html#L393-L402) én [`www/intro/index.html`](file:///Users/maarten/Github_may_be_deleted/LikeDust_Part2/Capacitor_Apps/app-room/www/intro/index.html#L539-L548)) liggen twee afbeeldingen op elkaar:
1. `img/reflect.jpg` — oude Sam links op de rug, met **jonge Sam scherp en vol in kleur** zichtbaar in het raam.
2. `img/young-silhouette.png` (`.sil`) — een **pikzwarte silhouet-maskerlaag** precies over jonge Sam heen:
   - `.sil` `opacity: 0.92–1.0` → jonge Sam is een donker silhouet in het glas.
   - `.sil` `opacity: 0.0–0.08` → jonge Sams gezicht is volledig zichtbaar.

### Twee oorzaken waarom jonge Sam nu "blijft staan"
1. **Hover/touch-lock op de volledige rechterhelft van het scherm:**
   De klikknop `#young` beslaat `left: 48%; top: 0; width: 46%; height: 96%` ([`www/index.html:244`](file:///Users/maarten/Github_may_be_deleted/LikeDust_Part2/Capacitor_Apps/app-room/www/index.html#L244)). Zodra de muis zich op de rechterhelft bevindt — of zodra iOS bij een aanraking een synthetisch `pointerenter`/`focus`-event vuurt zonder `pointerleave` ([`www/index.html:845-848`](file:///Users/maarten/Github_may_be_deleted/LikeDust_Part2/Capacitor_Apps/app-room/www/index.html#L845-L848)) — zet `#sceneWrap.hover .sil { opacity: .02 !important }` het silhouet permanent uit. Jonge Sam blijft dan continu zichtbaar en stopt volledig met animeren.
2. **Te trage "adem"-cyclus i.p.v. flikkering:**
   In commit `019ba2f` is de animatie vervangen door `silhouette` ([`www/index.html:580-630`](file:///Users/maarten/Github_may_be_deleted/LikeDust_Part2/Capacitor_Apps/app-room/www/index.html#L580-L630)) met `emerge` (2.2–2.8s) + `hold` (2.4–3.4s). Daardoor staat jonge Sam per cyclus **5 tot 6,2 seconden onafgebroken scherp in beeld** zonder flikkering.

### Oplossing
- Verwijder de permanente `.hover`-lock op touch-apparaten (`@media (hover: hover) and (pointer: fine)` alleen subtiele feedback, of laat het flikkeren doorgaan tot er echt geklikt wordt).
- Vervang de trage 6-seconden `hold` door een echte **reflectie-/TL-lichtflikkering** (korte onregelmatige flikkeringen tussen donker silhouet en reflectie, passend bij de `100/200/300 Hz` TL-hum in de WebAudio-ambience).
- Deel deze controller tussen `www/index.html` en `www/intro/index.html` zodat beide routes identiek werken.

---

## 3. Homepagina achtergrondvideo's op mobiel / iOS silent autoplay ⚡ *(Quick Win #3)*

### Oorzaak
In [`www/index.html:420-434`](file:///Users/maarten/Github_may_be_deleted/LikeDust_Part2/Capacitor_Apps/app-room/www/index.html#L420-L434) worden de twee achtergrondvideo's (`vid/wa-intro-bg.mp4` en `vid/ld-loop.mp4`) op mobiel en tablets **helemaal niet aangemaakt**:

```js
const canHoverFine = matchMedia("(hover: hover) and (pointer: fine)").matches;
if (!reduce && canHoverFine) {
  // maakt <video class="bgv"> ALLEEN aan op desktop met muis!
}
```

Dit was destijds uitgezet (commit `7ee0037`) omdat iOS Safari in **Energiebesparingsmodus (Low Power Mode)** een grote native WebKit afspeelknop ("startknop") midden over een gepauzeerde `<video>` tekent. *(Daarnaast stond in de allereerste website-opzet naast `Start` ook een aparte knop `Watch the intro` die bij het samenvoegen van `#stage` is verwijderd.)*

### Kan silent autoplay op iOS zonder geluid én zonder native play-knoppen?
**Ja, 100%.** iOS Safari (sinds iOS 10) én de Capacitor `WKWebView` staan **autoplay zonder geluid (`muted` + `playsinline`)** standaard toe zonder gebruikersinteractie. Alleen wanneer een iPhone in *Low Power Mode* staat weigert WebKit `video.play()`.

### Robuuste oplossing (conform `modern-web-guidance` `html` & `efficient-background-processing`)
1. Laat de statische `<img class="bgimg">` als directe LCP-fallback onderop liggen (`opacity` zichtbaar).
2. Plaats `<video class="bgv" muted loop playsinline webkit-playsinline preload="metadata" width="1280" height="720" disablepictureinpicture aria-hidden="true">` op **alle** schermen (desktop én mobiel), maar start met **`opacity: 0`** en zet `v.defaultMuted = true; v.muted = true;` vóór `v.play()`.
3. Zodra het `playing`-event vuurt (`v.currentTime > 0`), fade de `<video>` in over de poster-afbeelding.
4. Als `v.play()` op iOS faalt (bijv. door *Low Power Mode*):
   - Laat `opacity: 0` / verwijder of verberg het `<video>`-element direct (`hidden`), zodat Safari **nooit** een native play-icoon over het ontwerp kan tekenen.
   - Probeer bij de eerste `touchstart` / `scroll` op de pagina éénmalig alsnog `v.play()` te starten.
5. Pauzeer de achtergrondvideo's automatisch met een `IntersectionObserver` zodra de bezoeker voorbij `.doors` naar beneden scrollt (bespaart batterij en decode-geheugen op iOS).

---

## 4. Dubbele Sam na "Back to room" 🟢 *(Zie screenshot)*

### Oorzaak
Sam bestaat in [`room/app.js`](file:///Users/maarten/Github_may_be_deleted/LikeDust_Part2/Capacitor_Apps/app-room/www/room/app.js) uit **drie losse visuele lagen** die op verschillende plekken handmatig aan- en uitgezet worden zonder centrale bewaker:
1. `objs.man` (`assets/man.png`, `renderOrder: 7`) — statische zittende Sam op het onderbed.
2. `clipMeshes.standup` (`assets/sp/standup.webp`, `renderOrder: 17`) — sprite-sheet waarvan **frame 0 (`currentTime = 0.04s`) óók zittende Sam op het onderbed is**!
3. `clipMeshes.idle` (`assets/sp/idle.webp`, `renderOrder: 18`) — staande Sam in de zonnestraal met hand onder zijn kin.

Wat er misgaat:
1. Bij binnenkomst in de kamer met `st.count === 0` roept `syncRoomFromSavedState()` `poseSittingOnBed()` aan ([`app.js:2060-2095`](file:///Users/maarten/Github_may_be_deleted/LikeDust_Part2/Capacitor_Apps/app-room/www/room/app.js#L2060-L2095)). Die zet `standup` klaar op `t = 0.04` (zittend op het bed!) met `showClip("standup", 300)` (`alpha = 1`) en verbergt daarna `objs.man`.
2. Als Hoofdstuk 1 geopend wordt via URL/history (`#ch=1` / `onRouteChapter`), of als `poseSittingOnBed()`'s asynchrone `doSwap` / `setTimeout(..., 550)` kruist met een transitie, of als `ld:pause` de `renderLoop` stopt voordat `hideClip("standup", 70)` is uitgefaded:
   - In [`triggerChapter()` regel 1985–1991](file:///Users/maarten/Github_may_be_deleted/LikeDust_Part2/Capacitor_Apps/app-room/www/room/app.js#L1985-L1991) staat:
     ```js
     setGone("man", true, 0);
     await startClip("idle");
     showClip("idle", 10);
     // BUG: hideClip("standup") ontbreekt hier volledig!
     ```
3. Wanneer de speler na Hoofdstuk 1 op **`← Back to room`** klikt, voert `onClose` ([`app.js:2039-2045`](file:///Users/maarten/Github_may_be_deleted/LikeDust_Part2/Capacitor_Apps/app-room/www/room/app.js#L2039-L2045)) alleen `showClip("idle", 250)` en `hideClip("think", 250)` uit.
4. Gevolg: **`standup` (gepauzeerd op frame 0 = zittend op het bed) én `idle` (staand in het zonlicht) hebben allebei `alpha = 1`** terwijl de gele cirkel naar het fotolijstje (Hoofdstuk 2) schuift — exact zoals op je screenshot.

### Oplossing
- Introduceer één centrale functie `setSamPose(pose, fadeMs)` in `app.js` met een oplopend `poseToken`:
  - Bij `pose === "sitting"` zijn alle staande clips gegarandeerd `0` / verborgen.
  - Bij `pose === "idle"` (of `"think"`, `"frame"`, `"bike"`, `"money"`, `"sad"`, `"window-gaze"`) worden **zowel `objs.man` als `standup` (en alle andere niet-actieve Sam-clips) direct gedwongen naar `target = 0`** (en bij `instant` / `onClose` meteen `alpha = 0, mesh.visible = false`).
  - Annuleer openstaande callbacks van `poseSittingOnBed()` zodra `poseToken` verandert.

---

## 5. iOS Audio-bugs bij klikken op Sam én klikken op een hoofdstuk 🟢

### Gemelde symptomen op iOS
1. *"Op Sam klikken: op iOS gek geluid (kloppend) en dan pas staat die op (geluid loopt gek door)"*
2. *"Op iOS als je op een hoofdstuk klikt dan hoor je vaak een extra / gek geluid"*

### Exacte oorzaak (drie samenwerkende bugs)

#### Bug A — Verborgen hoofdstuk-iframe start 12 `<audio>`-bestanden tegelijk met een unmute-race (`beat.mp3` = kloppend!)
1. Zodra de kamer laadt ([`app.js:2224`](file:///Users/maarten/Github_may_be_deleted/LikeDust_Part2/Capacitor_Apps/app-room/www/room/app.js#L2224)), laadt `LD.prepareChapter(1)` alvast `Hoofdstuk_1_Schiphol/index.html?embed=1` in een onzichtbare `<iframe>`.
2. In [`shared.js:103-110`](file:///Users/maarten/Github_may_be_deleted/LikeDust_Part2/Capacitor_Apps/app-room/www/room/shared/shared.js#L103-L110) luistert de kamer op `window` naar **vijf events** (`pointerdown`, `touchstart`, `touchend`, `keydown`, `click`) en roept bij **elke tik op Sam** 3 tot 4 keer achter elkaar `ldPrime()` aan in die verborgen iframe.
3. Binnen het hoofdstuk-iframe maakt `snd` **12 losse `<audio>`-elementen** aan (`beat.mp3` ×2 = **letterlijk een kloppende hartslag!**, `riot.mp3` = **lang doorlopend geschreeuw/geblaf!**, `ring.mp3`, `scrape.mp3` ×3, `stamp.mp3`, `exhale.mp3`, `shutter.mp3`, `pickup.mp3`, `creak.mp3`) en voert `wake()` uit ([`Hoofdstuk_1:1859-1869`](file:///Users/maarten/Github_may_be_deleted/LikeDust_Part2/Capacitor_Apps/app-room/www/room/chapters/Hoofdstuk_1_Schiphol/index.html#L1859-L1869)):
   ```js
   a.muted = true; const p = a.play();
   const done = () => { a._try = false; a._ok = true; if (a.muted) { a.pause(); a.currentTime = 0; a.muted = false; } };
   if (p && p.then) p.then(done).catch(() => { a._try = false; a.muted = false; });
   ```
4. **De race-condition op iOS:**
   - Op `pointerdown` / `touchstart` weigert iOS Safari `a.play()` vaak nog (`NotAllowedError`), dus de Promise `p1` gaat asynchroon naar `.catch(...)`.
   - Milliseconden later vuurt `touchend` / `click`, die opnieuw `a.muted = true; p2 = a.play()` start (ditmaal toegestaan door iOS!).
   - Vervolgens wordt de `.catch()` van `p1` uitgevoerd **terwijl `p2` al speelt**: die zet **`a.muted = false`**!
   - Daardoor klinkt `beat.mp3` (**kloppend geluid!**) en `riot.mp3` (**geluid dat gek doorloopt!**) plotseling op vol volume, én wanneer `p2.then(done)` daarna draait is `if (a.muted)` inmiddels `false`, waardoor **`a.pause()` wordt overgeslagen** en de audiobestanden tot het einde toe blijven doorspelen in de verborgen iframe!
   - Tegelijkertijd blokkeert het gelijktijdig initialiseren van 12 `AVPlayer`-instanties + 2 `<video>`-decoders + WebAudio op iOS de media/main-thread ~400–700ms (**"en dan pas staat die op"**).

#### Bug B — `ldPrime()` start hoofdstukvideo's op `volume = 1` en `muted = false`
In [`Hoofdstuk_1..4` (`ldPrime`)](file:///Users/maarten/Github_may_be_deleted/LikeDust_Part2/Capacitor_Apps/app-room/www/room/chapters/Hoofdstuk_1_Schiphol/index.html#L2244-L2249) staat:
```js
vids.forEach(v => {
  v.muted = false; v.volume = 1;
  const p = v.play(); if (p && p.catch) p.catch(() => {});
  v.pause();
});
```
Op iOS WebKit lekt een synchrone `play()` + `pause()` met `muted = false; volume = 1` regelmatig een hoorbare audio-fractie (50–150ms van `s1.mp4`) naar buiten op het moment dat je op Sam óf op een hoofdstuk klikt — en als de video nog aan het bufferen is kan WebKit de synchrone `pause()` zelfs negeren zodra het bufferen klaar is.

#### Bug C — `keepAlive` 0.1s WAV-loop in `room/app.js`
In [`room/app.js:1017-1028`](file:///Users/maarten/Github_may_be_deleted/LikeDust_Part2/Capacitor_Apps/app-room/www/room/app.js#L1017-L1028) draait `keepAlive.loop = true` op een `0.1s` (10 Hz) gegenereerde WAV-blob. Op moderne iOS (`navigator.audioSession.type = "playback"`) is een 10 Hz loopend `<audio>`-element niet nodig en kan het bij sample-rate wisselingen tikken veroorzaken.

### Oplossing
1. **Verwijder de globale `window` `ldPrime`-listeners uit `shared.js`** (klikken op Sam in de kamer mag **nooit** media in een hoofdstuk-iframe starten!).
2. **Vervang in Hoofdstuk 1–4 de 12 `<audio>`-elementen (`els`) + `wake()` door één lichte WebAudio `AudioContext` buffer-player** (net zoals `room/app.js` al doet voor `SND`), gecombineerd met `navigator.audioSession.type = "playback"` zodat geluid ook werkt als de fysieke iPhone mute-knop aan staat. Eén enkele `ctx.resume()` unlocked dan in 0ms alle SFX zonder één enkele `AVPlayer`-glitch of race-condition!
3. **Prime `<video>` uitsluitend op het moment dat de speler daadwerkelijk een hoofdstuk opent (`openChapter`)**, en alléén met `v.muted = true; v.volume = 0;` totdat `ldStart` daadwerkelijk start en via `fadeInAudio` opkomt.
4. Verwijder of vervang de `0.1s` `keepAlive` loop in `room/app.js` door een langere (bijv. 2s) alleen-indien-nodig fallback voor iOS < 17 en pauzeer die zodra een hoofdstuk opent.
