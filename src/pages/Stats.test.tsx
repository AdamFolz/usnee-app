import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { Stats } from './Stats';

describe('Stats', () => {
  it('redirects to /progress', () => {
    render(
      <MemoryRouter initialEntries={['/stats']}>
        <Routes>
          <Route path="/stats" element={<Stats />} />
          <Route path="/progress" element={<div>Сводка на прогрессе</div>} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByText('Сводка на прогрессе')).toBeInTheDocument();
  });
});
