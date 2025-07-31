import React from 'react';

const Playlist = ({ tracks, current, onSelect }) => (
  <ul className="playlist">
    {tracks.map((track, idx) => (
      <li
        key={track.src} // або track.title, якщо src не унікальне
        className={idx === current ? 'active' : ''}
        onClick={() => onSelect(idx)}
      >
        {track.title}
      </li>
    ))}
  </ul>
);

export default Playlist;
