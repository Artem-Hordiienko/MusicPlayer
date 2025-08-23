import { createStore, get, set, del } from 'idb-keyval';

// одна база для всього застосунку
const store = createStore('player-db', 'tracks');

const KEYS = {
  ORDER: 'tracks-order',        // масив id у порядку додавання
  ITEM:  (id) => `track:${id}`, // метадані
  AUDIO: (id) => `blob:${id}`,  // аудіо-блоб
  COVER: (id) => `cover:${id}`, // обкладинка-блоб
};

const fmtTime = (sec) => {
  if (!Number.isFinite(sec) || sec <= 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

// fallback: визначити тривалість через <audio>
const readDurationWithAudio = (file) =>
  new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const a = document.createElement('audio');
    a.preload = 'metadata';
    a.src = url;
    a.onloadedmetadata = () => {
      resolve(fmtTime(a.duration));
      URL.revokeObjectURL(url);
    };
    a.onerror = () => {
      resolve('0:00');
      URL.revokeObjectURL(url);
    };
  });

// витягнути title/artist/album/duration/cover
async function extractMetaAndCover(file) {
  let title = file.name.replace(/\.[^.]+$/, '');
  let artist = '—';
  let album = '—';
  let duration = '0:00';
  let coverBlob = null;

  try {
    // динамічний імпорт — з Vite працює стабільно
    const { parseBlob } = await import('music-metadata-browser');
    const mm = await parseBlob(file);      // <- без читання всього файлу у пам’ять

    const common = mm.common ?? {};
    title  = common.title  || title;
    artist = common.artist || common.artists?.[0] || artist;
    album  = common.album  || album;

    if (Number.isFinite(mm.format?.duration)) {
      duration = fmtTime(mm.format.duration);
    }

    // обкладинка
    const pics = common.picture || [];
    const front = pics.find(p =>
      (typeof p.type === 'string' && /front/i.test(p.type)) ||
      (typeof p.name === 'string' && /cover|front/i.test(p.name))
    ) || pics[0];

    if (front?.data) {
      coverBlob = new Blob([front.data], { type: front.format || 'image/jpeg' });
    }
  } catch (e) {
    // ok, підстрахуємось нижче
    console.warn('metadata parse fallback:', e?.message || e);
  }

  if (duration === '0:00') {
    // якщо не змогли дістати з контейнера — порахувати через <audio>
    duration = await readDurationWithAudio(file);
  }

  return { title, artist, album, duration, coverBlob };
}

const fingerprint = (file) => `${file.name}__${file.size}`;

// === API ===

// зберегти файли у бібліотеку, повернути масив нових треків
export async function addFilesToLibrary(files) {
  const order = (await get(KEYS.ORDER, store)) || [];
  // завантажити існуючі fp, щоб не додавати дублікати
  const existingFP = new Set();
  for (const id of order) {
    const it = await get(KEYS.ITEM(id), store);
    if (it?.fp) existingFP.add(it.fp);
  }

  const addedIds = [];

  for (const file of files) {
    if (!file.type.startsWith('audio/')) continue;

    const fp = fingerprint(file);
    if (existingFP.has(fp)) continue; // дубль — пропускаємо

    const id = `t_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const meta = await extractMetaAndCover(file);

    // основні блоби
    await set(KEYS.AUDIO(id), file, store);
    if (meta.coverBlob) await set(KEYS.COVER(id), meta.coverBlob, store);

    await set(
      KEYS.ITEM(id),
      {
        id,
        fp,
        title: meta.title,
        artist: meta.artist,
        album: meta.album,
        duration: meta.duration,
        hasCover: Boolean(meta.coverBlob),
        addedAt: new Date().toISOString().slice(0, 10),
        mime: file.type,
      },
      store
    );

    order.push(id);
    addedIds.push(id);
    existingFP.add(fp);
  }

  if (addedIds.length) {
    await set(KEYS.ORDER, order, store);
  }

  // повертаємо тільки додані ( вже зі src/image як blob: )
  const all = await loadAllTracks();
  return all.filter(t => addedIds.includes(t.id));
}

// повернути всі треки (зі згенерованими blob: URL)
export async function loadAllTracks() {
  const order = (await get(KEYS.ORDER, store)) || [];
  const res = [];
  for (const id of order) {
    const item = await get(KEYS.ITEM(id), store);
    if (!item) continue;

    const audioBlob = await get(KEYS.AUDIO(id), store);
    const coverBlob = item.hasCover ? await get(KEYS.COVER(id), store) : null;

    const src = audioBlob ? URL.createObjectURL(audioBlob) : '';
    const image = coverBlob
      ? URL.createObjectURL(coverBlob)
      : '/images/default-cover.png';

    res.push({ ...item, src, image });
  }
  return res;
}

// перерахувати відсутні метадані у вже доданих (обкладинка/тривалість)
export async function rescanMissingMeta() {
  const order = (await get(KEYS.ORDER, store)) || [];
  for (const id of order) {
    const item = await get(KEYS.ITEM(id), store);
    if (!item) continue;

    const audioBlob = await get(KEYS.AUDIO(id), store);
    if (!audioBlob) continue;

    let needUpdate = false;
    let hasCover = item.hasCover;

    // якщо немає обкладинки або duration "0:00" — дочитати
    if (!hasCover || item.duration === '0:00') {
      const { title, artist, album, duration, coverBlob } =
        await extractMetaAndCover(audioBlob);

      const next = { ...item };

      if (!item.title || item.title === item.fp?.split('__')[0]) next.title = title;
      if (!item.artist || item.artist === '—') next.artist = artist;
      if (!item.album || item.album === '—') next.album = album;

      if (item.duration === '0:00' && duration !== '0:00') {
        next.duration = duration;
        needUpdate = true;
      }

      if (!hasCover && coverBlob) {
        await set(KEYS.COVER(id), coverBlob, store);
        next.hasCover = true;
        hasCover = true;
        needUpdate = true;
      }

      if (needUpdate) {
        await set(KEYS.ITEM(id), next, store);
      }
    }
  }
}

// повністю очистити бібліотеку (на випадок зламаної БД)
export async function wipeLibrary() {
  const order = (await get(KEYS.ORDER, store)) || [];
  for (const id of order) {
    await del(KEYS.ITEM(id), store);
    await del(KEYS.AUDIO(id), store);
    await del(KEYS.COVER(id), store);
  }
  await set(KEYS.ORDER, [], store);
}
