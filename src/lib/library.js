import { parseBlob } from 'music-metadata-browser';
import { createStore, get, set } from 'idb-keyval';

const store = createStore('player-db', 'tracks');

const KEYS = {
  TRACKS: 'tracks-list',
  ITEM: (id) => `track:${id}`,
  BLOB: (id) => `blob:${id}`,
  COVER: (id) => `cover:${id}`,
};

// вибираємо найкращу картинку з тегів
function pickBestPicture(common) {
  const pics = common?.picture || [];
  if (!pics.length) return null;
  const front = pics.find(
    (p) =>
      (typeof p.type === 'string' && /front/i.test(p.type)) ||
      (typeof p.name === 'string' && /cover|front/i.test(p.name))
  );
  return front || pics[0];
}

// читаємо теги файлу (title/artist/album/duration/cover)
async function extractMetaAndCover(file) {
  const mm = await parseBlob(file);
  const common = mm.common || {};
  const title  = common.title  || file.name.replace(/\.[^.]+$/, '');
  const artist = common.artist || common.artists?.[0] || '—';
  const album  = common.album  || '—';

  const d = (mm.format?.duration || 0);
  const duration = `${Math.floor(d/60)}:${Math.floor(d%60).toString().padStart(2,'0')}`;

  let coverBlob = null;
  const pic = pickBestPicture(common);
  if (pic?.data) coverBlob = new Blob([pic.data], { type: pic.format || 'image/jpeg' });

  return { title, artist, album, duration, coverBlob };
}

export async function addFilesToLibrary(files) {
  const order = (await get(KEYS.TRACKS, store)) || [];
  const addedIds = [];

  for (const file of files) {
    if (!file.type.startsWith('audio/')) continue;
    const id = `t_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;

    let meta;
    try { meta = await extractMetaAndCover(file); }
    catch { meta = { title: file.name.replace(/\.[^.]+$/, ''), artist:'—', album:'—', duration:'0:00', coverBlob:null }; }

    await set(KEYS.BLOB(id), file, store);
    if (meta.coverBlob) await set(KEYS.COVER(id), meta.coverBlob, store);

    await set(KEYS.ITEM(id), {
      id,
      title: meta.title,
      artist: meta.artist,
      album: meta.album,
      duration: meta.duration,
      hasCover: Boolean(meta.coverBlob),
      addedAt: new Date().toISOString().slice(0,10),
      mime: file.type || undefined,
      // src/image робимо пізніше як objectURL
      src: null,
      image: null
    }, store);

    order.push(id);
    addedIds.push(id);
  }

  await set(KEYS.TRACKS, order, store);

  const all = await loadAllTracks();
  return all.filter(t => addedIds.includes(t.id));
}

export async function loadAllTracks() {
  const order = (await get(KEYS.TRACKS, store)) || [];
  const result = [];
  for (const id of order) {
    const item = await get(KEYS.ITEM(id), store);
    if (!item) continue;

    const audioBlob = await get(KEYS.BLOB(id), store);
    const coverBlob = item.hasCover ? await get(KEYS.COVER(id), store) : null;

    const src = audioBlob ? URL.createObjectURL(audioBlob) : item.src;
    const image = coverBlob
      ? URL.createObjectURL(coverBlob)
      : (item.image || '/images/default-cover.png');

    result.push({ ...item, id, src, image });
  }
  return result;
}
