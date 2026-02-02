import { render, fireEvent } from '@testing-library/react';
import { vi, expect } from 'vitest';
import Player from './Player';
import '@testing-library/jest-dom';

describe('Player', () => {
  beforeAll(() => {
    class MockAudioContext {
      constructor() { this.destination = {}; this.state = 'running'; }
      createMediaElementSource() { return { connect() {} }; }
      createAnalyser() { return { connect() {} }; }
      resume() {}
    }
    window.AudioContext = MockAudioContext;
    window.webkitAudioContext = MockAudioContext;
    HTMLMediaElement.prototype.play = vi.fn();
    HTMLMediaElement.prototype.pause = vi.fn();
    HTMLMediaElement.prototype.load = vi.fn();
  });

  it('renders and controls playback', () => {
    const onPrev = vi.fn();
    const onNext = vi.fn();
    const track = { src: 'test.mp3', image: '/images/default-cover.png', title: 'Song' };
    const { getByLabelText, container } = render(
      <Player track={track} onPrev={onPrev} onNext={onNext} />
    );

    const playBtn = getByLabelText('Play');
    fireEvent.click(playBtn);
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalled();
    fireEvent.click(playBtn);
    expect(HTMLMediaElement.prototype.pause).toHaveBeenCalled();

    fireEvent.click(getByLabelText('Previous'));
    expect(onPrev).toHaveBeenCalled();
    fireEvent.click(getByLabelText('Next'));
    expect(onNext).toHaveBeenCalled();

    const audio = container.querySelector('audio');
    audio.currentTime = 30;
    fireEvent.timeUpdate(audio);
    expect(container.querySelector('.np-time').textContent).toBe('0:30');
  });
});
