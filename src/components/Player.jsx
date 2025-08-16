import React, { useRef, useState, useEffect } from 'react';

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
}) => {
  const audioRef = useRef(null);
  const canvasRef = useRef(null);
  const rafRef = useRef(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.5);

  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);

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

    audio.volume = volume;
    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', setTotalDuration);
    if (onEnded) audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', setTotalDuration);
      if (onEnded) audio.removeEventListener('ended', onEnded);
    };
  }, [volume, onEnded]);

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

  // ініт аудіографа
  const ensureAudioGraph = () => {
    if (!audioCtxRef.current) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      const ctx = new Ctx();
      const source = ctx.createMediaElementSource(audioRef.current);
      const analyser = ctx.createAnalyser();
      source.connect(analyser);
      analyser.connect(ctx.destination);
      audioCtxRef.current = ctx;
      analyserRef.current = analyser;
      onAnalyserReady && onAnalyserReady(analyser);
    }
    if (audioCtxRef.current?.state === 'suspended') audioCtxRef.current.resume();
  };

  const togglePlay = () => {
    ensureAudioGraph();
    setIsPlaying(p => !p);
  };

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
      <div className="npbar">
        {AudioTag}

        <div className="np-left">
          <img className="np-cover" src={track.image} alt={track.title} />
          <div className="np-meta">
            <div className="np-title">{track.title}</div>
            <div className="np-sub">{track.artist || '—'}</div>
          </div>
       
        </div>

        <div className="np-center">
          <div className="np-controls">
            <button className="np-ghost" title="Shuffle">🔀</button>
            <button className="np-ghost" onClick={onPrev} title="Prev">⏮</button>
            <button className="np-play" onClick={togglePlay} title={isPlaying ? 'Pause' : 'Play'}>
              {isPlaying ? '⏸' : '▶'}
            </button>
            <button className="np-ghost" onClick={onNext} title="Next">⏭</button>
            <button className="np-ghost" title="Repeat">🔁</button>
          </div>

          <div className="np-progress">
            <span className="np-time">{formatTime(currentTime)}</span>
            <input
              type="range"
              min="0"
              max={Number.isFinite(duration) ? duration : 0}
              value={currentTime}
              onChange={(e) => handleSeek(e.target.value)}
            />
            <span className="np-time">{formatTime(duration)}</span>
          </div>
        </div>

        <div className="np-right">
          <button className="np-ghost" title="Queue">≡</button>
          <button className="np-ghost" title="Devices">🖥️</button>
          <div className="np-volume">
            <span>🔊</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value) || 0)}
            />
          </div>
          <button className="np-ghost" title="Full screen">⤢</button>
        </div>
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
