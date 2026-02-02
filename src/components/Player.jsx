import React, { useRef, useState, useEffect } from 'react';
import Icon from './Icon';
import { set } from 'idb-keyval';

const resolveSrc = (s) => {
  if (!s) return '';
  if (s.startsWith('blob:') || s.startsWith('data:') || s.startsWith('http')) return s;
  return `/music/${s}`;
};

const Player = ({
  track,
  onEnded,
  onPrev,
  onNext,
  variant = 'bar',
  onAnalyserReady,
  isShuffle,
  setIsShuffle
}) => {
  const audioRef = useRef(null);
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const containerRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isRepeat, setIsRepeat] = useState(false);


  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.5);
  const [isMuted, setIsMuted] = useState(false);
  const [prevVolume, setPrevVolume] = useState(0.5);

  // Equalizer state
  const [isEqOpen, setIsEqOpen] = useState(false);
  const [eqEnabled, setEqEnabled] = useState(true);
  const [bands, setBands] = useState([
    { label: '60 Hz', type: 'lowshelf', freq: 60, gain: 0, q: 0.707 },
    { label: '170 Hz', type: 'peaking', freq: 170, gain: 0, q: 1.0 },
    { label: '1 kHz', type: 'peaking', freq: 1000, gain: 0, q: 1.0 },
    { label: '3.5 kHz', type: 'peaking', freq: 3500, gain: 0, q: 1.0 },
    { label: '10 kHz', type: 'highshelf', freq: 10000, gain: 0, q: 0.707 },
  ]);

  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const sourceRef = useRef(null);
  const preGainRef = useRef(null);
  const filtersRef = useRef([]);

  const audioSrc = resolveSrc(track?.src);

  // ⬇️ ПРИ ЗМІНІ ДЖЕРЕЛА — навмисно перевантажуємо
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !audioSrc) return;

    // знімаємо подію ended і поставимо знову нижче в іншому ефекті
    audio.pause();
    audio.src = audioSrc;     // оновили джерело
    audio.load();             // форс перезавантаження метаданих
    setCurrentTime(0);
    setDuration(0);

    // якщо був Play — продовжуємо грати новий трек
    if (isPlaying) {
      const p = audio.play();
      if (p?.catch) p.catch((e) => console.error('Playback error:', e));
    }
  }, [audioSrc]); // важливо залежність саме від сформованого шляху

  // події плеєра
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime || 0);
    const setTotalDuration = () => setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);

    const handleEnded = () => {
      if (isRepeat) {
        audio.currentTime = 0;
        audio.play();
      } else
        if (typeof onEnded === 'function') {
          onEnded();
        }
    }




    audio.volume = volume;
    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', setTotalDuration);
    if (onEnded) audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', setTotalDuration);
      if (onEnded) audio.removeEventListener('ended', handleEnded);
    };
  }, [volume, isRepeat, onEnded]);

  // play/pause від стану
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      const p = audio.play();
      if (p?.catch) p.catch((e) => console.error('Playback error:', e));
    } else {
      audio.pause();
    }
  }, [isPlaying]);

  // Build or resume audio graph with EQ chain
  const connectEqChain = () => {
    if (!audioCtxRef.current || !sourceRef.current || !preGainRef.current || !analyserRef.current) return;
    // Disconnect everything first
    try { sourceRef.current.disconnect(); } catch { }
    try { preGainRef.current.disconnect(); } catch { }
    filtersRef.current.forEach(n => { try { n.disconnect(); } catch { } });

    // source -> preGain -> (filters | bypass) -> analyser -> destination
    sourceRef.current.connect(preGainRef.current);

    if (eqEnabled && filtersRef.current.length) {
      // chain filters
      let prev = preGainRef.current;
      filtersRef.current.forEach(f => { prev.connect(f); prev = f; });
      prev.connect(analyserRef.current);
    } else {
      preGainRef.current.connect(analyserRef.current);
    }
  };

  const ensureAudioGraph = () => {
    if (!audioCtxRef.current) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      const ctx = new Ctx();
      const source = ctx.createMediaElementSource(audioRef.current);
      const preGain = ctx.createGain();
      preGain.gain.value = 1.0; // avoid clipping
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      // Destination
      analyser.connect(ctx.destination);

      audioCtxRef.current = ctx;
      sourceRef.current = source;
      preGainRef.current = preGain;
      analyserRef.current = analyser;

      // Create filters from current bands
      filtersRef.current = bands.map(b => {
        const f = ctx.createBiquadFilter();
        f.type = b.type;
        f.frequency.value = b.freq;
        f.Q.value = b.q ?? 1.0;
        f.gain.value = b.gain;
        return f;
      });

      connectEqChain();
      onAnalyserReady && onAnalyserReady(analyser);
    }
    if (audioCtxRef.current?.state === 'suspended') audioCtxRef.current.resume();
  };

  const togglePlay = () => {
    ensureAudioGraph();
    setIsPlaying(p => !p);
  };


  const toggleMute = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isMuted) {
      audio.volume = prevVolume;
      setVolume(prevVolume);
      setIsMuted(false);
    } else {
      setPrevVolume(audio.volume);
      audio.volume = 0;
      setVolume(0);
      setIsMuted(true);
    }
  };

  const toggleFullscreen = () => {
    // Если не в полноэкранном режиме — включаем для всей страницы
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error('Fullscreen error:', err);
      });
      setIsFullscreen(true);
    } else {
      // Выходим из fullscreen
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  /* --- MINI PLAYER LOGIC (Refactored) --- */
  const miniWindowRef = useRef(null);

  const openMiniPlayer = () => {
    // If already open, focus it
    if (miniWindowRef.current && !miniWindowRef.current.closed) {
      miniWindowRef.current.focus();
      return;
    }

    // Open new window
    const mini = window.open(
      '/miniPlayer.html',
      'MiniPlayer',
      'width=350,height=350,menubar=no,toolbar=no,status=no,resizable=yes'
    );
    // learn how to do it with pip
    miniWindowRef.current = mini;
  };

  // Sync state TO Mini Player
  useEffect(() => {
    const mini = miniWindowRef.current;
    if (mini && !mini.closed && track) {
      const imageUrl = track?.image?.startsWith('http')
        ? track.image
        : `${window.location.origin}/${track.image.replace(/^\/+/, '')}`;

      mini.postMessage({
        track: { ...track, image: imageUrl },
        isPlaying
      }, '*');
    }
  }, [track, isPlaying]);

  // Listen for messages FROM Mini Player
  useEffect(() => {
    const handleMessage = (e) => {
      // Security check (optional but good practice): 
      // if (e.origin !== window.location.origin) return;

      const { action } = e.data;
      if (action === 'togglePlay') setIsPlaying(p => !p);
      if (action === 'next' && typeof onNext === 'function') onNext();
      if (action === 'prev' && typeof onPrev === 'function') onPrev();

      // Initial sync when mini player says it's ready
      if (e.data === 'ready' && miniWindowRef.current && track) {
        const imageUrl = track?.image?.startsWith('http')
          ? track.image
          : `${window.location.origin}/${track.image.replace(/^\/+/, '')}`;

        miniWindowRef.current.postMessage({
          track: { ...track, image: imageUrl },
          isPlaying
        }, '*');
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [track, isPlaying, onNext, onPrev]); // Deps needed for initial sync & callbacks

  useEffect(() => {
    const handler = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);


  const handleSeek = (v) => {
    const val = parseFloat(v) || 0;
    const audio = audioRef.current;
    audio.currentTime = val;
    setCurrentTime(val);
  };

  const formatTime = (sec) => {
    if (!Number.isFinite(sec)) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // Update filters when bands change
  useEffect(() => {
    if (!audioCtxRef.current || !filtersRef.current.length) return;
    filtersRef.current.forEach((f, i) => {
      const b = bands[i];
      if (!b) return;
      try {
        f.type = b.type;
        f.frequency.value = b.freq;
        f.Q.value = b.q ?? 1.0;
        f.gain.value = b.gain;
      } catch { }
    });
  }, [bands]);

  // Bypass toggle
  useEffect(() => { connectEqChain(); }, [eqEnabled]);

  // Preamp update
  const [preamp, setPreamp] = useState(1.0);
  useEffect(() => {
    if (preGainRef.current) preGainRef.current.gain.value = preamp;
  }, [preamp]);

  const setBandGain = (idx, gain) => {
    setBands(bs => bs.map((b, i) => i === idx ? { ...b, gain } : b));
  };

  const setBandFreq = (idx, freq) => {
    setBands(bs => bs.map((b, i) => i === idx ? { ...b, freq } : b));
  };

  const setBandQ = (idx, q) => {
    setBands(bs => bs.map((b, i) => i === idx ? { ...b, q } : b));
  };


  const handleShuffle = () => {
    setIsShuffle(prev => !prev);
    console.log("Shuffle toggled:", !isShuffle);
  };

  const handleRepeat = () => {
    setIsRepeat(prev => !prev);
    console.log("Repeat toggled:", !isRepeat);
  };


  // картковий візуалізатор (якщо використовуєш)
  useEffect(() => {
    if (variant !== 'card') return;
    if (!canvasRef.current || !analyserRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const dpr = Math.max(1, window.devicePixelRatio || 1);

    const resize = () => {
      const cssW = canvas.clientWidth || 600;
      const cssH = canvas.clientHeight || 180;
      canvas.width = Math.floor(cssW * dpr);
      canvas.height = Math.floor(cssH * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const analyser = analyserRef.current;
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
  }, [variant]);

  // ===== MARKUP =====
  const AudioTag = (
    <audio ref={audioRef} src={audioSrc} preload="metadata" />
  );

  if (variant === 'bar') {
    return (
      <div className="npbar" ref={containerRef}>
        {AudioTag}

        {/* ЛІВА КОЛОНКА: обкладинка + назва/артист + (за бажанням) liked */}
        <div className="np-left">
          <img className="np-cover" src={track.image} alt={track.title} />
          <div className="np-meta">
            <div className="np-title">{track.title}</div>
            <div className="np-sub">{track.artist || '—'}</div>
          </div>
        </div>

        {/* ЦЕНТРАЛЬНА КОЛОНКА: транспорт + прогрес (завжди по центру) */}
        <div className="np-center">
          <div className="np-controls">
            <button className={`np-ghost ${isShuffle ? 'active' : ''}`} title="Shuffle" aria-label="Shuffle" onClick={handleShuffle}><Icon name="shuffle" size={16} /></button>
            <button className="np-ghost" onClick={onPrev} title="Previous" aria-label="Previous"><Icon name="skip-previous" size={16} /></button>
            <button
              className="np-play"
              onClick={togglePlay}
              title={isPlaying ? 'Pause' : 'Play'}
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Icon name="pause" size={20} /> : <Icon name="play" size={20} />}
            </button>
            <button className="np-ghost" onClick={onNext} title="Next" aria-label="Next"><Icon name="skip-next" size={16} /></button>
            <button className={`np-ghost ${isRepeat ? 'active' : ''}`} title="Repeat" aria-label="Repeat" onClick={handleRepeat}><Icon name="repeat" size={16} /></button>
          </div>

          <div className="np-progress">
            <span className="np-time">{formatTime(currentTime)}</span>
            <input
              type="range"
              min="0"
              max={Number.isFinite(duration) ? duration : 0}
              value={currentTime}
              onInput={(e) => {
                const el = e.target;
                const max = Number(el.max) || 0;
                const val = Number(el.value) || 0;
                const fill = max > 0 ? (val / max) * 100 : 0;
                el.style.setProperty('--fill', `${fill}%`);
              }}
              onChange={(e) => handleSeek(e.target.value)}
              aria-label="Seek"
              style={{ ['--fill']: duration > 0 ? `${(currentTime / duration) * 100}%` : '0%' }}
            />
            <span className="np-time">{formatTime(duration)}</span>
          </div>
        </div>

        {/* ПРАВА КОЛОНКА: додаткові дії + гучність */}
        <div className="np-right">
          <button
            className="np-ghost"
            title="Equalizer"
            aria-label="Equalizer"
            onClick={() => {
              ensureAudioGraph();
              setIsEqOpen(true);
            }}
          >
            <Icon name="equalizer" size={16} />
          </button>
          <button
            className="np-ghost"
            title="Mini Player"
            aria-label="Mini Player"
            onClick={openMiniPlayer} >
            <Icon name="devices" size={16} />
          </button>


          <div className="np-volume" style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '-6px', filter: 'inherit' }}>
            <button
              className="np-ghost"
              aria-label={isMuted ? "Unmute" : "Mute"}
              onClick={toggleMute}
              style={{
                fontSize: '20px',
                lineHeight: '1',
                filter: 'invert(1) brightness(2) saturate(0)',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              {isMuted ? '🔇' : '🔊'}
            </button>


            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              onInput={(e) => {
                const el = e.target;
                const max = Number(el.max) || 1;
                const val = Number(el.value) || 0;
                const fill = Math.min(100, Math.max(0, (val / max) * 100));
                el.style.setProperty('--fill', `${fill}%`);
              }}
              onChange={(e) => {
                const newVol = parseFloat(e.target.value) || 0;
                setVolume(newVol);
                const audio = audioRef.current;
                if (audio) audio.volume = newVol;
                setIsMuted(newVol === 0);
              }}
              aria-label="Volume"
              style={{ ['--fill']: `${volume * 100}%` }}
            />
          </div>
          <button
            className="np-ghost"
            title={isFullscreen ? "Exit full screen" : "Full screen"}
            aria-label={isFullscreen ? "Exit full screen" : "Full screen"}
            onClick={toggleFullscreen}
          >
            <Icon name="fullscreen" size={16} />
          </button>
        </div>

        {/* EQ Modal */}
        {isEqOpen && (
          <div className="eq-overlay" role="dialog" aria-modal="true" aria-label="Equalizer">
            <div className="eq-card">
              <div className="eq-head">
                <div className="eq-title"> Equalizer</div>
                <button className="eq-close" onClick={() => setIsEqOpen(false)}>Close ✕</button>
              </div>

              <div className="eq-controls">
                <button className={`eq-chip ${eqEnabled ? 'active' : ''}`} onClick={() => setEqEnabled(v => !v)}>{eqEnabled ? 'EQ On' : 'EQ Off'}</button>
                <span className="eq-chip">Preamp</span>
                <input type="range" min="0.5" max="1.5" step="0.01" value={preamp}
                  onChange={(e) => setPreamp(parseFloat(e.target.value) || 1)}
                  style={{ width: 160, ['--fill']: `${((preamp - 0.5) / 1) * 100}%` }} />
                <span className="eq-note">Avoid clipping: 0.9–1.1 is safe</span>
              </div>

              {bands.map((b, i) => (
                <div className="eq-row" key={i}>
                  <div className="eq-label">{b.label}</div>
                  <input
                    type="range"
                    min="-12" max="12" step="0.5"
                    value={b.gain}
                    onChange={(e) => setBandGain(i, parseFloat(e.target.value) || 0)}
                    style={{ ['--fill']: `${((b.gain + 12) / 24) * 100}%` }}
                  />
                  <div style={{ textAlign: 'right', opacity: .85 }}>{b.gain > 0 ? '+' : ''}{b.gain} dB</div>
                </div>
              ))}

              <div className="eq-controls" style={{ marginTop: 8 }}>
                <span className="eq-note">Advanced</span>
                {bands.map((b, i) => (
                  <div key={`adv-${i}`} style={{ display: 'grid', gridTemplateColumns: '70px 120px 70px 120px', gap: 8, alignItems: 'center' }}>
                    <small style={{ opacity: .8 }}>Freq</small>
                    <input type="range" min="30" max="16000" step="1" value={b.freq}
                      onChange={(e) => setBandFreq(i, parseFloat(e.target.value) || b.freq)} />
                    <small style={{ opacity: .8 }}>Q</small>
                    <input type="range" min="0.3" max="3" step="0.01" value={b.q}
                      onChange={(e) => setBandQ(i, parseFloat(e.target.value) || b.q)} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="player">
      {AudioTag}

      <div className="track-info">
        <img src={track.image} alt={track.title} className="track-image" />
        <p className="track-title">🎶 {track.title}</p>
      </div>

      <canvas ref={canvasRef} className="visualizer" />

      <div className="time-info">
        <span>{formatTime(currentTime)}</span>
        <input
          type="range"
          min="0"
          max={Number.isFinite(duration) ? duration : 0}
          value={currentTime}
          onChange={(e) => handleSeek(e.target.value)}
        />
        <span>{formatTime(duration)}</span>
      </div>

      <div className="volume-control">
        <label>🔊</label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={volume}
          onChange={(e) => setVolume(parseFloat(e.target.value) || 0)}
        />
      </div>

      <div className="controls">
        <button onClick={togglePlay}>
          {isPlaying ? 'Pause ⏸️' : 'Play ▶️'}
        </button>
      </div>
    </div>
  );
};

export default Player;
