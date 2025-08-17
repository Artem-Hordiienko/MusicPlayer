import React, { useState, useEffect, useRef } from 'react';
import Player from './components/Player';
import Playlist from './components/Playlist';
import LoginForm from './components/LoginForm';
import DropZone from './components/DropZone';
import { loadAllTracks, addFilesToLibrary } from './lib/library';
import './style.css';

// Твої "вшиті" треки з /music + /images
const staticTracks = [
  { title: "01 Iggy Azalea - Black Widow feat Rita Ora", src: "01 Iggy Azalea - Black Widow feat Rita Ora.mp3", image: "/images/Black Widow.jpg" },
  { title: "02 Delirious (Boneless) feat Kid Ink", src: "02 Delirious (Boneless) feat Kid Ink.mp3", image: "/images/Delirious (Boneless) (feat. Kid Ink).jpg" },
  { title: "03 Vai Sentando feat Skrillex & Duki", src: "03 Vai Sentando feat Skrillex & Duki.mp3", image: "/images/Vai Sentando.jpg" },
  { title: "30 Seconds to Mars - A Beautiful Lie", src: "30 Seconds to Mars - A Beautiful Lie.mp3", image: "/images/A_beautiful_lie.jpg" },
  { title: "30 Seconds to Mars - This Is War", src: "30 Seconds to Mars - This Is War.mp3", image: "/images/This is War.jpg" },
  { title: "Limp Bizkit - Gold Cobra", src: "Limp Bizkit - Gold Cobra.mp3", image: "/images/Gold Cobra.jpg" },
  { title: "Limp Bizkit - Take a Look Around", src: "Limp Bizkit - Take a Look Around.mp3", image: "/images/LBTakealookaround.jpg" },
  { title: "Armin van Buuren feat. Sharon Den Adel - In and Out of Love", src: "Armin van Buuren feat. Sharon Den Adel - In and Out of Love.mp3", image: "/images/Armin van Buuren.jpg" },
  { title: "Aydakar - She Will", src: "Aydakar - She Will.m4a", image: "/images/Aydakar - She Will.jpg" },
  { title: "Adele - Skyfall", src: "Adele - Skyfall.mp3", image: "/images/Adele.jpg" },
  { title: "Can You Feel My Heart - Bring Me The Horizon", src: "Can You Feel My Heart - Bring Me The Horizon.mp3", image: "/images/BMTH.jpg" },
  { title: "Chihiiro (feat. Aaron Hibell) - Khordal", src: "Chihiiro (feat. Aaron Hibell) - Khordal.m4a", image: "/images/Chihiro.jpg" },
  { title: "Espresso Macchiato - Tommy Cash", src: "Espresso Macchiato - Tommy Cash.m4a", image: "/images/Tommy.jpg" },
  { title: "Hounds Mannymore BASTL - Disturbia", src: "Hounds Mannymore BASTL - Disturbia.mp3", image: "/images/2HoundsMannymore.jpg" },
  { title: "I Need To Feel Loved - DJ Frankie Wilde", src: "I Need To Feel Loved - DJ Frankie Wilde.mp3", image: "/images/DJ Frankie Wilde.jpg" },
  { title: "Juicy J Katy Perry - Dark Horse", src: "Juicy J Katy Perry - Dark Horse.mp3", image: "/images/DarkHorse.jpg" },
  { title: "LUNA BALA - ARIIS Yb Wasgood", src: "LUNA BALA - ARIIS Yb Wasgood.mp3", image: "/images/lunabala.jpg" },
  { title: "M83 - My Tears Are Becoming A Sea", src: "M83 - My Tears Are Becoming A Sea.mp3", image: "/images/M83.jpg" },
  { title: "Mannymore - Dont Go", src: "Mannymore - Dont Go.mp3", image: "/images/dontgo.jpg" },
  { title: "Midnight City - M83", src: "Midnight City - M83.mp3", image: "/images/M83.jpg" },
  { title: "Pink - Try", src: "Pink - Try.mp3", image: "/images/try.jpg" },
  { title: "Ariana Grande - Save Your Tears", src: "Ariana Grande - Save Your Tears.mp3", image: "/images/saveyourtears.jpg" },
  { title: "One-T - The Magic Key", src: "One-T - The Magic Key.mp3", image: "/images/onet.jpg" },
  { title: "Valentyn Strykalo LETO", src: "Valentyn Strykalo LETO.mp3", image: "/images/leto.jpg" }
];

function App() {
  // логін
  const [user, setUser] = useState(null);

  // бібліотека треків (статичні + додані через dnd)
  const [tracks, setTracks] = useState(staticTracks);
const loadedRef = useRef(false);

  // поточний трек
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);

  // аналайзер з нижнього плеєра для правого еквалайзера
  const [analyser, setAnalyser] = useState(null);
  const vizRef = useRef(null);
  const rafRef = useRef(null);

  // завантажити користувача
  useEffect(() => {
    const saved = localStorage.getItem('user');
    if (saved) setUser(JSON.parse(saved));
  }, []);

  // підвантажити треки з IndexedDB і додати до статичних
useEffect(() => {
  if (loadedRef.current) return;     // захист від подвійного виклику в dev
  loadedRef.current = true;

  (async () => {
    const dbTracks = await loadAllTracks();
    setTracks(mergeUnique(staticTracks, dbTracks)); // без конкатенації prev
  })();
}, []);

  const addFiles = async (files) => {
    const added = await addFilesToLibrary(files);
    setTracks(prev => [...prev, ...added]);
    if (tracks.length === 0 && added.length > 0) setCurrentTrackIndex(0);
  };


  // допоміжна: як ми ідентифікуємо трек
  const keyOf = (t) =>
  String(t?.id || t?.fp || t?.src || t?.title || '').toLowerCase();

  const mergeUnique = (...arrays) => {
  const map = new Map();
  arrays.flat().forEach((t) => {
    if (!t) return;
    const k = keyOf(t);
    if (!map.has(k)) map.set(k, t);
  });
  return Array.from(map.values());
};



  const nextTrack = () => setCurrentTrackIndex(i => (tracks.length ? (i + 1) % tracks.length : 0));
  const prevTrack = () => setCurrentTrackIndex(i => (tracks.length ? (i - 1 + tracks.length) % tracks.length : 0));

  // малювання еквалайзера у правому блоці на базі analyser з плеєра
  useEffect(() => {
    if (!analyser || !vizRef.current) return;

    const canvas = vizRef.current;
    const ctx = canvas.getContext('2d');
    const dpr = Math.max(1, window.devicePixelRatio || 1);

    const resize = () => {
      const cssW = canvas.clientWidth || 400;
      const cssH = canvas.clientHeight || 220;
      canvas.width = Math.floor(cssW * dpr);
      canvas.height = Math.floor(cssH * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.85;
    const N = analyser.frequencyBinCount;
    const data = new Uint8Array(N);

    const draw = () => {
      rafRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(data);

      const cssW = canvas.width / dpr;
      const cssH = canvas.height / dpr;

      const t = Date.now() * 0.001;
      const bg = ctx.createLinearGradient(0, 0, cssW, cssH);
      bg.addColorStop(0.6, `hsl(${(t * 20 + 200) % 360}, 80%, 20%)`);
      bg.addColorStop(1.0, `hsl(${(t * 20 + 330) % 360}, 85%, 25%)`);
      bg.addColorStop(0.0, `hsl(${(t * 20 + 300) % 360}, 100%, 10%)`);
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, cssW, cssH);

      const barW = (cssW / N) * 1.6;
      let x = 0;
      for (let i = 0; i < N; i++) {
        const v = data[i];
        const scaled = Math.pow(v / 255, 2);
        const h = scaled * cssH * 0.8;
        if (h < 3) { x += barW + 1; continue; }
        const hue = 260 + ((t * 10 + i * 2) % 40);
        const light = Math.min(4 + h / 4, 50);
        ctx.fillStyle = `hsl(${hue}, 100%, ${light}%)`;
        ctx.shadowColor = `hsl(${hue}, 100%, 70%)`;
        ctx.shadowBlur = 12;
        ctx.fillRect(x, cssH - h, barW, h);
        x += barW + 1;
      }
      ctx.shadowBlur = 0;
    };

    draw();
    return () => {
      window.removeEventListener('resize', resize);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [analyser]);

  const logout = () => { localStorage.removeItem('user'); setUser(null); };
  const hasTracks = tracks && tracks.length > 0;
  const current = hasTracks ? tracks[currentTrackIndex] : null;

  return (
    <div className="shell">
      {!user ? (
        <LoginForm onLogin={setUser} />
      ) : (
        <>
          {/* Topbar */}
          <header className="topbar">
            <div></div>
            <h1>🎵 My Music Player</h1>
            <button className="logout-btn" onClick={logout}>Log out</button>
          </header>

          {/* Main: центр — список + DropZone; праворуч — обкладинка + еквалайзер */}
          <main className="main">
            <section className="center-list">
              <DropZone onFiles={addFiles} />
              <Playlist
                tracks={tracks}
                current={currentTrackIndex}
                onSelect={setCurrentTrackIndex}
              />
            </section>

            <aside className="right-pane">
              {current ? (
                <>
                  <div className="track-info">
                    <img src={current.image} alt={current.title} className="track-image" />
                    <p className="track-title">🎶 {current.title}</p>
                    {(current.artist || current.album || current.duration) && (
                      <p className="track-meta" style={{opacity:.8, marginTop: 4}}>
                        {current.artist || ''} • {current.album || ''} • {current.duration || ''}
                      </p>
                    )}
                  </div>
                  <div className="preview-visualizer">
                    <canvas ref={vizRef} className="visualizer"></canvas>
                  </div>
                </>
              ) : (
                <div style={{opacity:.8}}>Додай треки через drag&drop</div>
              )}
            </aside>
          </main>

          {/* Bottom player */}
          <footer className="bottom-player">
            <div className="bottom-inner">
              {current && (
                <Player
                  variant="bar"
                  track={current}
                  onEnded={nextTrack}
                  onPrev={prevTrack}
                  onNext={nextTrack}
                  onAnalyserReady={setAnalyser} // аналайзер для правого еквалайзера
                />
              )}
            </div>
          </footer>
        </>
      )}
    </div>
  );
}

export default App;
