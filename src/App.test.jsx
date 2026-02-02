import { render, fireEvent, waitFor } from '@testing-library/react';
import { vi, expect } from 'vitest';
import App from './App';
import '@testing-library/jest-dom';

vi.mock('./lib/library', () => ({
  loadAllTracks: vi.fn().mockResolvedValue([]),
  addFilesToLibrary: vi.fn().mockResolvedValue([])
}));

beforeEach(() => {
  HTMLMediaElement.prototype.play = vi.fn();
  HTMLMediaElement.prototype.pause = vi.fn();
  HTMLMediaElement.prototype.load = vi.fn();
  localStorage.setItem('user', JSON.stringify({ name: 'tester' }));
});
afterEach(() => {
  localStorage.clear();
});

test('renders DropZone and allows selecting track', async () => {
  const { getByText, container } = render(<App />);
  expect(getByText(/Drag MP3\/M4A here/i)).toBeInTheDocument();
  const rows = container.querySelectorAll('li.row');
  expect(rows.length).toBeGreaterThan(1);
  fireEvent.click(rows[1]);
  await waitFor(() => expect(rows[1].classList.contains('active')).toBe(true));
});
