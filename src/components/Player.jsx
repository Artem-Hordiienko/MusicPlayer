import React, { useRef, useState, useEffect } from 'react';

const Player = ({ track, onEnded }) => {
  const audioRef = useRef(null);
  const canvasRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.5);

  const audioCtxRef = useRef(null);
  const sourceRef = useRef(null);
  const analyserRef = useRef(null);

  useEffect(() => {
    const audio = audioRef.current;
    const updateTime = () => setCurrentTime(audio.currentTime);
    const setTotalDuration = () => setDuration(audio.duration);

    audio.volume = volume;
    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', setTotalDuration);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', setTotalDuration);
      audio.removeEventListener('ended', onEnded);
    };
  }, [track, volume, onEnded]);

  useEffect(() => {
    if (isPlaying) {
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch((error) => console.error("Playback error:", error));
      }
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying, track]);

  const startVisualizer = (analyser) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    analyser.fftSize = 256;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      const time = Date.now() * 0.001;

      const bgGradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      
      
      bgGradient.addColorStop(0.6, `hsl(${(time * 20 + 200) % 360}, 80%, 20%)`);   // фиолетовый
      bgGradient.addColorStop(1, `hsl(${(time * 20 + 330) % 360}, 85%, 25%)`);     // розово-фиолетовый
      bgGradient.addColorStop(0, `hsl(${(time * 20 + 300) % 360}, 100%, 10%)`);   // тёмно-синий

      ctx.fillStyle = bgGradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / bufferLength) * 1.6;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const raw = dataArray[i];

        const scaled = Math.pow(raw / 255, 2); // подавление слабого сигнала сильнее
        const barHeight = scaled * canvas.height * 0.8; // max 40% высоты холста

        if (barHeight < 5) continue;

        const hue = 260 + ((time * 10 + i * 2) % 40);  
        const lightness = Math.min(4 + barHeight / 4, 50);
        ctx.fillStyle = `hsl(${hue}, 100%, ${lightness}%)`;

        // ✨ Мягкое свечение
        ctx.shadowColor = `hsl(${hue}, 100%, 70%)`;
        ctx.shadowBlur = 15;

        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
        x += barWidth + 1;
      }

      // Сбросить свечение для следующего кадра (иначе будет залипание)
      ctx.shadowBlur = 0;
    };

    draw();
  };


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

      startVisualizer(analyser);
    }

    if (audioCtxRef.current.state === "suspended") {
      audioCtxRef.current.resume();
    }

    setIsPlaying(prev => !prev);
  };

  const formatTime = (sec) => {
    if (isNaN(sec)) return '00:00';
    const minutes = Math.floor(sec / 60);
    const seconds = Math.floor(sec % 60).toString().padStart(2, '0');
    return `${minutes}:${seconds}`;
  };

  return (
    <div className="player">
      <audio ref={audioRef} src={`/music/${track.src}`} preload="metadata" />

      <div className="track-info">
        <img src={track.image} alt={track.title} className="track-image" />
        <p className="track-title">🎶 {track.title}</p>
      </div>

      <canvas ref={canvasRef} className="visualizer" width={600} height={200}></canvas>

      <div className="time-info">
        <span>{formatTime(currentTime)}</span>
        <input
          type="range"
          min="0"
          max={duration || 0}
          value={currentTime}
          onChange={(e) => {
            audioRef.current.currentTime = e.target.value;
            setCurrentTime(e.target.value);
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
          onChange={(e) => setVolume(parseFloat(e.target.value))}
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
