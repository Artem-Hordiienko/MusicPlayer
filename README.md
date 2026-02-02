# MusicPlayer

Веб-плеєр на React з розширеним аудіографом (5-смуговий еквалайзер, преамп, аналайзер для візуалізації), дроп-зоною для локальних файлів, окремим міні-плеєром і базовою авторизацією у браузері.

## TL;DR
- React + Vite, Web Audio API, IndexedDB (`idb-keyval`), `music-metadata-browser`.
- Аудіоланцюг із преампом та 5 фільтрами, що переключаються без розриву звуку.
- Локальна бібліотека з тегами й обкладинками, drag&drop без дублікатів.
- Канвас-візуалізація, міні-плеєр у новому вікні, shuffle/repeat/seek/volume/mute/fullscreen.

## Технології та інфраструктура
- React 18, Vite 5.
- Web Audio API (`AudioContext`, `BiquadFilterNode`, `AnalyserNode`).
- IndexedDB через `idb-keyval` для треків/обкладинок/порядку, `localStorage` для користувача.
- Тестування: Vitest + Testing Library; лінтинг: ESLint + Stylelint; PurgeCSS для аудиту CSS.

## Можливості
- Відтворення локальних аудіо (drag&drop або file picker) з уникненням дублікатів.
- Зчитування метаданих/обкладинок із `music-metadata-browser`; fallback на `<audio>` для тривалості.
- Еквалайзер 5 смуг (60/170/1000/3500/10000 Гц), преамп (0.5–1.5), миттєве перемикання EQ on/off.
- Транспорт: play/pause, prev/next, shuffle, repeat, seekbar з підсвіткою, volume/mute, fullscreen.
- Канвас-візуалізація на базі `AnalyserNode`; міні-плеєр (окреме вікно, `postMessage` синхронізація).
- UI: sticky header плейлиста, окремий скрол для списку і правої панелі, фіксований нижній бар.

## Архітектура та потоки
```
[LoginForm] -> user in localStorage -> App state
[DropZone] -> addFilesToLibrary() -> IndexedDB (audio, cover, meta)
[IndexedDB + staticTracks] --mergeUnique--> tracks state
tracks -> Playlist (list) & Player (current track)
Player -> AudioContext -> Preamp -> [Biquad x5]* -> Analyser -> destination
Analyser -> canvas (правий прев’ю) + canvas (card-варіант)
MiniPlayer window <-> postMessage <-> Player state/actions
```
- Ледачий старт аудіографа: `AudioContext` та вузли створюються лише при першому `play`.
- При зміні EQ або bypass вся мережа безпечно реконектиться без ривків.
- Стейт керується у `App` (user, tracks, currentTrackIndex, shuffle, analyser ref).

## Головні ролі компонентів
- `src/App.jsx` – авторизація, завантаження треків (static + IndexedDB), дроп-зона, плейлист, прев’ю-візуалізація, нижній плеєр.
- `src/components/Player.jsx` – аудіограф, транспорт, EQ-модалка, міні-плеєр, fullscreen, варіанти `bar`/`card`.
- `src/components/Playlist.jsx` – таблиця треків зі стікнутим хедером та активним рядком.
- `src/components/DropZone.jsx` – drag&drop / file picker для аудіо.
- `src/components/LoginForm.jsx` – локальна реєстрація/логін (`localStorage`).
- `src/lib/library.js` – IndexedDB: зберігання аудіо/обкладинок/порядку, парсинг тегів.
- `src/utils/db.js` – користувачі та поточний користувач у `localStorage`.
- `public/miniPlayer.html` – UI окремого вікна міні-плеєра.

## Аудіограф, EQ і візуалізація
- Ланцюг: `MediaElementSource -> Preamp(Gain) -> [BiquadFilters x5]* -> Analyser -> destination`. Зірочка означає, що при вимкненому EQ фільтри обходяться.
- Преамп: 0.5–1.5 (рекомендовано 0.9–1.1 при бустах).
- Смуги: lowshelf 60 Гц, peaking 170 Гц, peaking 1 кГц, peaking 3.5 кГц, highshelf 10 кГц. Gain ±12 dB, Advanced: freq 30–16000 Гц, Q 0.3–3.0.
- Візуалізація: `AnalyserNode` з `fftSize=256/512`, `smoothingTimeConstant=0.85`; канвас масштабується під DPR, градієнт фон + динамічні бари.
- Mini-player: відкривається через `window.open`, отримує трек/статус через `postMessage`, надсилає команди `togglePlay/next/prev` назад.

## Зберігання даних
- IndexedDB (`player-db`):
  - `tracks-order` – масив id у порядку додавання.
  - `track:<id>` – метадані треку (title/artist/album/duration/hasCover/fp/mime/addedAt).
  - `blob:<id>` – аудіофайл; `cover:<id>` – обкладинка.
- `localStorage`: користувач (`user`, `currentUser`), масив користувачів (`users`), кеш авторизації.
- Запобігання дублікатам через fingerprint `name__size`.

## UI/UX та доступність
- Тайтли/aria-label для основних кнопок (Play/Prev/Next/Equalizer/Volume/Repeat).
- Sticky header плейлиста, окремі скроли для центру й правої панелі, фіксований bottom-bar.
- Seek/volume range з CSS `--fill` для візуального прогресу, адаптивні стилі у `responsive.css`.
- Гарячі клавіші: стрілки вліво/вправо (компонент `Controls`, за потреби підключити).
- Міні-плеєр з мінімалістичним UI для виступів/демо.

## Встановлення та запуск
- `npm install`
- Розробка: `npm run dev`
- Продакшн-збірка: `npm run build` та `npm run preview`

## Скрипти контролю якості
- `npm run lint` – ESLint + Stylelint.
- `npm test` – Vitest + Testing Library (моки `AudioContext`, `HTMLMediaElement`).
- `npm run css:audit` – dry-run PurgeCSS для виявлення потенційно зайвих стилів.

## Ключові фрагменти коду
```jsx
// src/components/Player.jsx – побудова/переконект аудіографа з EQ
const connectEqChain = () => {
  if (!audioCtxRef.current || !sourceRef.current || !preGainRef.current || !analyserRef.current) return;
  try { sourceRef.current.disconnect(); } catch {}
  try { preGainRef.current.disconnect(); } catch {}
  filtersRef.current.forEach(n => { try { n.disconnect(); } catch {} });

  sourceRef.current.connect(preGainRef.current);
  if (eqEnabled && filtersRef.current.length) {
    let prev = preGainRef.current;
    filtersRef.current.forEach(f => { prev.connect(f); prev = f; });
    prev.connect(analyserRef.current);
  } else {
    preGainRef.current.connect(analyserRef.current);
  }
};
```

```js
// src/lib/library.js – додавання файлів у бібліотеку та збереження порядку
export async function addFilesToLibrary(files) {
  const order = (await get(KEYS.ORDER, store)) || [];
  const existingFP = new Set();
  for (const id of order) {
    const it = await get(KEYS.ITEM(id), store);
    if (it?.fp) existingFP.add(it.fp);
  }

  const addedIds = [];
  for (const file of files) {
    if (!file.type.startsWith('audio/')) continue;
    const fp = fingerprint(file);
    if (existingFP.has(fp)) continue;

    const id = `t_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const meta = await extractMetaAndCover(file);
    await set(KEYS.AUDIO(id), file, store);
    if (meta.coverBlob) await set(KEYS.COVER(id), meta.coverBlob, store);
    await set(KEYS.ITEM(id), {
      id, fp,
      title: meta.title, artist: meta.artist, album: meta.album,
      duration: meta.duration, hasCover: Boolean(meta.coverBlob),
      addedAt: new Date().toISOString().slice(0, 10),
      mime: file.type,
    }, store);
    order.push(id);
    addedIds.push(id);
    existingFP.add(fp);
  }
  if (addedIds.length) await set(KEYS.ORDER, order, store);
  return (await loadAllTracks()).filter(t => addedIds.includes(t.id));
}
```

```jsx
// src/App.jsx – підключення аналайзера для прев’ю-візуалізації
<Player
  variant="bar"
  track={current}
  onEnded={nextTrack}
  onPrev={prevTrack}
  onNext={nextTrack}
  onAnalyserReady={setAnalyser}
  isShuffle={isShuffle}
  setIsShuffle={setIsShuffle}
/>;
```

## Готові тези для демо/презентації
1) Логін/реєстрація у браузері без бекенда; дані у `localStorage`.
2) Додавання треків drag&drop: автозчитування тегів, обкладинки, відсутність дублів.
3) Відтворення: показати seekbar, shuffle, repeat, mute, fullscreen.
4) EQ-модалка: показати преамп, смуги, Advanced; продемонструвати миттєве перемикання EQ On/Off без глітчів.
5) Візуалізація: канвас у правій панелі і card-варіант (за потреби).
6) Міні-плеєр: відкрити вікно, показати синхронізацію обкладинки/статусу та керування play/prev/next.
7) Збереження стану: після перезавантаження треки й порядок з IndexedDB, користувач лишається залогіненим.

## Підготовка активів
- Покладіть свої `.mp3/.m4a` у `public/music`, обкладинки у `public/images`, іконки у `public/icons`.
- Якщо `track.src` не містить `blob:`/`data:`/`http(s)`, він резолвиться як `/music/<file>` із публічної статики.

## Тестування та ручні перевірки
- Авто: `npm test` (моки `AudioContext`, `HTMLMediaElement`), `npm run lint`, `npm run css:audit`.
- Ручні сценарії: drag&drop без дублікатів; перемикання треків зупиняє попередній; sticky header; фіксований bottom-bar; EQ-модалка впливає на звук у реальному часі; міні-плеєр отримує/надсилає команди.

## Відомі обмеження та нотатки
- `AudioContext` може бути `suspended` до першого жесту користувача.
- Автовідтворення підкоряється політикам браузера.
- Великі бусти по EQ можуть кліпувати — знижуйте преамп (0.9–1.1).
- Очищення даних браузера видаляє акаунт та бібліотеку треків.

## Швидкий сценарій перевірки
1. Покладіть кілька файлів у `public/music`.
2. `npm run dev`, залогінтесь.
3. Оберіть трек у плейлисті, натисніть EQ, покрутіть gain/Q, зменшіть преамп.
4. Увімкніть shuffle/repeat, пошукайте по seekbar, вимкніть/увімкніть звук.
5. Відкрийте міні-плеєр, переконайтеся, що кнопки керують головним плеєром.
