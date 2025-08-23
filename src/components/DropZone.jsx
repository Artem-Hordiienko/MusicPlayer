import React, { useCallback, useState } from 'react';

export default function DropZone({ onFiles }) {
  const [isOver, setIsOver] = useState(false);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOver(false);
    const files = Array.from(e.dataTransfer.files || []);
    if (files.length) onFiles(files);
  }, [onFiles]);

  const onDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOver(true);
  };

  const onDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOver(false);
  };

  const onPick = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length) onFiles(files);
  };

  return (
    <div
      className={`dropzone ${isOver ? 'over' : ''}`}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onClick={() => document.getElementById('filePick').click()}
      title="Перетягни сюди треки або натисни"
    >
      <input id="filePick" type="file" accept="audio/*" multiple hidden onChange={onPick} />
      <div className="dz-inner">
        <div className="dz-icon">⬇️</div>
        <div className="dz-text">Drag MP3/M4A here or click to select</div>
      </div>
    </div>
  );
}
