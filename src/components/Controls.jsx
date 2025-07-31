import React, { useEffect } from 'react';

const Controls = ({ onNext, onPrev }) => {
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'ArrowRight') onNext();
      if (e.key === 'ArrowLeft') onPrev();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onNext, onPrev]);

  return (
    <div className="controls">
      
      
      <button onClick={onPrev}>Prev ◀️</button>
      <button onClick={onNext}>Next ▶️</button>
    </div>
  );
};

export default Controls;
