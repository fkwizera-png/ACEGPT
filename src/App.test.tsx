import { render, screen } from '@testing-library/react';
import App from './App';
import { describe, expect, it } from 'vitest';

describe('AceGPT app shell', () => {
  it('shows the setup screen before connection', () => {
    render(<App />);
    expect(screen.getByText(/Connect your Gemini API key/i)).toBeInTheDocument();
    expect(screen.getByText(/AceGPT/i)).toBeInTheDocument();
  });
});
