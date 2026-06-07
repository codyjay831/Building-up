import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { App } from '@/app/App';
import { AppProviders } from '@/app/providers';
import { createInitialGameStoreState, useGameStore } from '@/game/store/gameStore';

function renderApp() {
  return render(
    <AppProviders>
      <App />
    </AppProviders>,
  );
}

describe('App shell', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    useGameStore.setState(createInitialGameStoreState());
  });

  it('renders the primary layout regions', () => {
    renderApp();

    expect(screen.getByTestId('app-shell')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /oak hollow — suburb starter/i }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Build and actions')).toBeInTheDocument();
    expect(screen.getByLabelText('Property board')).toBeInTheDocument();
    expect(screen.getByLabelText('Property inspector')).toBeInTheDocument();
    expect(screen.getByText('South Road')).toBeInTheDocument();
    expect(screen.getByLabelText('Build catalog')).toBeInTheDocument();
  });

  it('inspects the starter house when its tile is selected', () => {
    renderApp();

    fireEvent.click(screen.getByTestId('tile-1-1'));

    expect(screen.getByRole('heading', { name: 'Suburb House' })).toBeInTheDocument();
    expect(screen.getByText('Leasing')).toBeInTheDocument();
    expect(screen.getByText('72 / 100')).toBeInTheDocument();
  });

  it('does not scenario-lock corner shop at approval level 1', () => {
    renderApp();

    expect(screen.getByRole('button', { name: 'Build Corner Shop' })).toBeEnabled();
    expect(screen.queryByText('Locked in this scenario')).not.toBeInTheDocument();
  });

  it('previews invalid placement with a reason and can cancel', () => {
    renderApp();

    fireEvent.click(screen.getByRole('button', { name: 'Build Small House' }));
    fireEvent.click(screen.getByTestId('tile-1-1'));

    expect(screen.getByTestId('placement-invalid-reason')).toHaveTextContent(/overlap/i);
    expect(screen.getByTestId('placement-preview-status')).toHaveTextContent(/overlap/i);

    fireEvent.click(screen.getByRole('button', { name: 'Cancel placement' }));

    expect(screen.queryByTestId('placement-invalid-reason')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Property summary' })).toBeInTheDocument();
  });

  it('locks placement on tile click so hover no longer moves the preview', () => {
    renderApp();

    fireEvent.click(screen.getByRole('button', { name: 'Build Small Park' }));
    fireEvent.mouseEnter(screen.getByTestId('tile-0-15'));
    expect(screen.getByText('(1, 16)')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('tile-0-15'));
    expect(screen.getByText('(1, 16)')).toBeInTheDocument();
    expect(screen.getByTestId('commit-project-button')).toBeEnabled();

    fireEvent.mouseEnter(screen.getByTestId('tile-5-5'));
    expect(screen.getByText('(1, 16)')).toBeInTheDocument();
    expect(screen.getByTestId('commit-project-button')).toBeEnabled();
  });
});
