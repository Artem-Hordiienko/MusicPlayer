import React from 'react';

const Playlist = ({ tracks, current, onSelect }) => {
  const formatDate = (d) => {
    if (!d) return '—';
    try {
      const dt = new Date(d);
      return dt.toLocaleDateString();
    } catch {
      return d;
    }
  };

  return (
    <div className="list-wrap">
      {/* Заголовок-стрічка (sticky) */}
      <div className="list-header">
        <div className="col idx">#</div>
        <div className="col title">Назва</div>
        <div className="col album">Альбом</div>
        <div className="col added">Дата додано</div>
        <div className="col dur">Час</div>
      </div>

      <ul className="playlist table">
        {tracks.map((t, idx) => (
          <li
            key={t.id || t.src || idx}
            className={`row ${idx === current ? 'active' : ''}`}
            onClick={() => onSelect(idx)}
            title={t.title}
            role="button"
            aria-selected={idx === current}
          >
            <div className="col idx">{idx + 1}</div>

            <div className="col title">
              <img
                className="thumb"
                src={t.image || '/images/default-cover.png'}
                alt={t.title || 'cover'}
                loading="lazy"
                width={40}
                height={40}
                onError={(e) => { e.currentTarget.src = '/images/default-cover.png'; }}
              />
              <div className="meta">
                <div className="name">{t.title}</div>
                <div className="artist">{t.artist || '—'}</div>
              </div>
            </div>

            <div className="col album">{t.album || '—'}</div>
            <div className="col added">{formatDate(t.addedAt)}</div>
            <div className="col dur">{t.duration || '—'}</div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Playlist;
