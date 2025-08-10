import React, { useState, useEffect } from 'react';
import Player from './components/Player';
import Controls from './components/Controls';
import Playlist from './components/Playlist';
import LoginForm from './components/LoginForm';
import './style.css';

const tracks = [
  {
    title: "01 Iggy Azalea - Black Widow feat Rita Ora",
    src: "01 Iggy Azalea - Black Widow feat Rita Ora.mp3",
    image: "/images/Black Widow.jpg"
  },
  {
    title: "02 Delirious (Boneless) feat Kid Ink",
    src: "02 Delirious (Boneless) feat Kid Ink.mp3",
    image: "/images/Delirious (Boneless) (feat. Kid Ink).jpg"
  },
  {
    title: "03 Vai Sentando feat Skrillex & Duki",
    src: "03 Vai Sentando feat Skrillex & Duki.mp3",
    image: "/images/Vai Sentando.jpg"
  },
  {
    title: "30 Seconds to Mars - A Beautiful Lie",
    src: "30 Seconds to Mars - A Beautiful Lie.mp3",
    image: "/images/A_beautiful_lie.jpg"
  },
  {
    title: "30 Seconds to Mars - This Is War",
    src: "30 Seconds to Mars - This Is War.mp3",
    image: "/images/This is War.jpg"
  },
  {
    title: "Limp Bizkit - Gold Cobra",
    src: "Limp Bizkit - Gold Cobra.mp3",
    image: "/images/Gold Cobra.jpg"
  },
  {
    title: "Limp Bizkit - Take a Look Around",
    src: "Limp Bizkit - Take a Look Around.mp3",
    image: "/images/LBTakealookaround.jpg"
  },
  {
    title: "Armin van Buuren feat. Sharon Den Adel - In and Out of Love",
    src: "Armin van Buuren feat. Sharon Den Adel - In and Out of Love.mp3",
    image: "/images/Armin van Buuren.jpg"
  },
  {
    title: "Aydakar - She Will",
    src: "Aydakar - She Will.m4a",
    image: "/images/Aydakar - She Will.jpg"
  },
  {
    title: "Adele - Skyfall",
    src: "Adele - Skyfall.mp3",
    image: "/images/Adele.jpg"
  },
  {
    title: "Can You Feel My Heart - Bring Me The Horizon",
    src: "Can You Feel My Heart - Bring Me The Horizon.mp3",
    image: "/images/BMTH.jpg"
  },
  {
    title: "Chihiiro (feat. Aaron Hibell) - Khordal",
    src: "Chihiiro (feat. Aaron Hibell) - Khordal.m4a",
    image: "/images/Chihiro.jpg"
  },
  {
    title: "Espresso Macchiato - Tommy Cash",
    src: "Espresso Macchiato - Tommy Cash.m4a",
    image: "/images/Tommy.jpg"
  },
  {
    title: "Hounds Mannymore BASTL - Disturbia",
    src: "Hounds Mannymore BASTL - Disturbia.mp3",
    image: "/images/2HoundsMannymore.jpg"
  },
  {
    title: "I Need To Feel Loved - DJ Frankie Wilde",
    src: "I Need To Feel Loved - DJ Frankie Wilde.mp3",
    image: "/images/DJ Frankie Wilde.jpg"
  },
  {
    title: "Juicy J Katy Perry - Dark Horse",
    src: "Juicy J Katy Perry - Dark Horse.mp3",
    image: "/images/DarkHorse.jpg"
  },
  {
    title: "LUNA BALA - ARIIS Yb Wasgood",
    src: "LUNA BALA - ARIIS Yb Wasgood.mp3",
    image: "/images/lunabala.jpg"
  },
  {
    title: "M83 - My Tears Are Becoming A Sea",
    src: "M83 - My Tears Are Becoming A Sea.mp3",
    image: "/images/M83.jpg"
  },
  {
    title: "Mannymore - Dont Go",
    src: "Mannymore - Dont Go.mp3",
    image: "/images/dontgo.jpg"
  },
  {
    title: "Midnight City - M83",
    src: "Midnight City - M83.mp3",
    image: "/images/M83.jpg"
  },
  {
    title: "Pink - Try",
    src: "Pink - Try.mp3",
    image: "/images/try.jpg"
  },
  {
    title: "Ariana Grande - Save Your Tears",
    src: "Ariana Grande - Save Your Tears.mp3",
    image: "/images/saveyourtears.jpg"
  },
  {
    title: "One-T - The Magic Key",
    src: "One-T - The Magic Key.mp3",
    image: "/images/onet.jpg"
  },
  {
    title: "Valentyn Strykalo LETO",
    src: "Valentyn Strykalo LETO.mp3",
    image: "/images/leto.jpg"
  }
];


function App() {
  const [user, setUser] = useState(null);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);

  const nextTrack = () => setCurrentTrackIndex(i => (i + 1) % tracks.length);
  const prevTrack = () => setCurrentTrackIndex(i => (i - 1 + tracks.length) % tracks.length);

  useEffect(() => {
    const saved = localStorage.getItem('user');
    if (saved) setUser(JSON.parse(saved));
  }, []);

  if (!user) return <LoginForm onLogin={setUser} />;

  const logout = () => { localStorage.removeItem('user'); setUser(null); };

  const current = tracks[currentTrackIndex];

  return (
    <div className="shell">
      {/* Topbar */}
      <header className="topbar">
        <div></div>
        <h1>🎵 My Music Player</h1>
        <button className="logout-btn" onClick={logout}>Log out</button>
      </header>

      {/* Center grid: list (center) + right panel (art + viz) */}
      <main className="main">
        <section className="center-list">
          <Playlist
            tracks={tracks}
            current={currentTrackIndex}
            onSelect={setCurrentTrackIndex}
          />
        </section>

        <aside className="right-pane">
          <div className="track-info">
            <img src={current.image} alt={current.title} className="track-image" />
            <p className="track-title">🎶 {current.title}</p>
          </div>
          {/* Візуалізатор + аудіо керуємо цим самим Player знизу — візу тут декоративний.
              Якщо хочеш, можна винести окремий Preview-візуалізатор; поки що залишимо
              просто canvas як фон-стаб, або додай свій <canvas> */}
          <div className="preview-visualizer">
            <canvas className="visualizer"></canvas>
          </div>
        </aside>
      </main>

      {/* Bottom player */}
      <footer className="bottom-player">
        <div className="bottom-inner">
          <Player track={current} onEnded={nextTrack} />
          <Controls onNext={nextTrack} onPrev={prevTrack} />
        </div>
      </footer>
    </div>
  );
}

export default App;