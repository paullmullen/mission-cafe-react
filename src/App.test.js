import { createRoot, screen } from '@testing-library/react';
import App from './App';
import { createRoot } from 'react-dom/client';

test('renders learn react link', () => {
  createRoot(<App />);
  const linkElement = screen.getByText(/learn react/i);
  expect(linkElement).toBeInTheDocument();
});
