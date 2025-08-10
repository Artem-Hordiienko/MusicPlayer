import React, { useRef, useState, useEffect } from 'react';

const Player = ({ track, onEnded }) => {
  const audioRef = useRef(null);
  const canvasRef = useRef(null);
  const rafRef = useRef(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.5);

  const audioCtxRef = useRef(null);
  const sourceRef = useRef(null);
  const analyserRef = useRef(null);

  // --- Події аудіо ---
  useEffect(() => {
    const audio = audioRef.current;
    const updateTime = () => setCurrentTime(audio.currentTime);
    const setTotalDuration = () => setDuration(audio.duration || 0);

    audio.volume = volume;
    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', setTotalDuration);
    audio.addEventListener('ended', onEnded);

    // Коли міняємо трек – скинути таймер
    setCurrentTime(0);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', setTotalDuration);
      audio.removeEventListener('ended', onEnded);
    };
  }, [track, volume, onEnded]);

  useEffect(() => {
    if (isPlaying) {
      const p = audioRef.current.play();
      if (p !== undefined) p.catch((e) => console.error('Playback error:', e));
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying, track]);

  // --- Адаптивний canvas ---
  const resizeCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    const dpr = Math.max(1, window.devicePixelRatio || 1);

    // стилі для CSS-розмірів
    canvas.style.width = '100%';
    // фактичні пікселі під dpr
    const cssWidth = parent.clientWidth;        // ширина секції
    const cssHeight = Math.max(140, Math.min(220, Math.round(parent.clientWidth * 0.33))); // розумна висота

    canvas.width = Math.floor(cssWidth * dpr);
    canvas.height = Math.floor(cssHeight * dpr);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);     // нормалізуємо систему координат
  };

  useEffect(() => {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, []);

  // --- Візуалізатор ---
  const startVisualizer = (analyser) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.85;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      rafRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      const { width, height } = canvas;
      // Ми малюємо в «css»-координатах, тому переводимо
      const cssW = width / (window.devicePixelRatio || 1);
      const cssH = height / (window.devicePixelRatio || 1);

      const time = Date.now() * 0.001;

      // фон з градієнтом
      const bg = ctx.createLinearGradient(0, 0, cssW, cssH);
      bg.addColorStop(0.6, `hsl(${(time * 20 + 200) % 360}, 80%, 20%)`);
      bg.addColorStop(1.0, `hsl(${(time * 20 + 330) % 360}, 85%, 25%)`);
      bg.addColorStop(0.0, `hsl(${(time * 20 + 300) % 360}, 100%, 10%)`);
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, cssW, cssH);

      const barWidth = (cssW / bufferLength) * 1.6;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const raw = dataArray[i];
        const scaled = Math.pow(raw / 255, 2);
        const barHeight = scaled * cssH * 0.8;
        if (barHeight < 4) { x += barWidth + 1; continue; }

        const hue = 260 + ((time * 10 + i * 2) % 40);
        const lightness = Math.min(4 + barHeight / 4, 50);
        ctx.fillStyle = `hsl(${hue}, 100%, ${lightness}%)`;
        ctx.shadowColor = `hsl(${hue}, 100%, 70%)`;
        ctx.shadowBlur = 12;

        ctx.fillRect(x, cssH - barHeight, barWidth, barHeight);
        x += barWidth + 1;
      }
      ctx.shadowBlur = 0;
    };

    // старт і зачистка при анмаунті/зміні
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    draw();
  };

  // --- Play/Pause + ініц. AudioContext лише після взаємодії ---
  const togglePlay = () => {
    if (!audioCtxRef.current) {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioCtx.createMediaElementSource(audioRef.current);
      const analyser = audioCtx.createAnalyser();

      source.connect(analyser);
      analyser.connect(audioCtx.destination);

      audioCtxRef.current = audioCtx;
      sourceRef.current = source;
      analyserRef.current = analyser;

      resizeCanvas();           // на випадок, якщо ще не розміряли
      startVisualizer(analyser);
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    setIsPlaying((p) => !p);
  };

  // прибираємо анімацію при демонтажі
  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const formatTime = (sec) => {
    if (isNaN(sec)) return '00:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="player">
      <audio ref={audioRef} src={`/music/${track.src}`} preload="metadata" />

      <div className="track-info">
        <img src={track.image} alt={track.title} className="track-image" />
        <p className="track-title">🎶 {track.title}</p>
      </div>

      {/* canvas без жорсткої ширини — керує css + resize */}
      <canvas ref={canvasRef} className="visualizer"></canvas>

      <div className="time-info">
        <span>{formatTime(currentTime)}</span>
        <input
          type="range"
          min="0"
          max={Number.isFinite(duration) ? duration : 0}
          value={currentTime}
          onChange={(e) => {
            const v = parseFloat(e.target.value) || 0;
            audioRef.current.currentTime = v;
            setCurrentTime(v);
          }}
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
