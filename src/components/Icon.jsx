import React from 'react';

const Icon = ({ name, size = 24, className = '', style = {} }) => {
  // Шляхи до файлів
  const iconSvg = `/icons/${name}.svg`;
  const iconPng = `/icons/${name}.png`;

  return (
    <img
      src={iconSvg} // спершу пробуємо SVG
      onError={(e) => {
        e.target.onerror = null;
        e.target.src = iconPng; // fallback на PNG
      }}
      alt={name}
      width={size}
      height={size}
      className={`icon ${className}`}
      style={{
        display: 'inline-block',
        objectFit: 'contain',
        userSelect: 'none',
        pointerEvents: 'none'
      }}
    />
  );
};

export default Icon;
