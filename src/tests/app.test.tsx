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

function openBuildDrawer() {
  fireEvent.click(screen.getByRole('button', { name: 'Build' }));
}

function openPropertyPanel() {
  fireEvent.click(screen.getByRole('button', { name: 'Property' }));
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
      screen.getByRole('heading', { name: /lot 12 — riverside starter/i }),
    ).toBeInTheDocument();
    expect(screen.getByTestId('scenario-objective-strip')).toBeInTheDocument();
    expect(screen.getByTestId('hud-residents')).toBeInTheDocument();
    expect(screen.getByTestId('hud-property-health')).toBeInTheDocument();
    expect(screen.getByLabelText('Property board')).toBeInTheDocument();
    expect(screen.getByTestId('board-legend')).toBeInTheDocument();
    expect(screen.getByTestId('monthly-event-strip')).toBeInTheDocument();
    openBuildDrawer();
    expect(screen.getByRole('heading', { name: 'Build catalog' })).toBeInTheDocument();
  });

  it('inspects the starter house when its tile is selected', () => {
    renderApp();

    fireEvent.click(screen.getByTestId('tile-3-6'));

    expect(screen.getByRole('heading', { name: 'Existing House' })).toBeInTheDocument();
    expect(screen.getByText('Operating')).toBeInTheDocument();
    expect(screen.getByText('72 / 100')).toBeInTheDocument();
  });

  it('previews invalid placement with a reason and can cancel', () => {
    renderApp();
    openBuildDrawer();

    fireEvent.click(screen.getByRole('button', { name: 'Build Small House' }));
    fireEvent.click(screen.getByTestId('tile-3-6'));

    expect(screen.getByTestId('placement-invalid-reason')).toHaveTextContent(/overlap/i);
    expect(screen.getByTestId('placement-preview-status')).toHaveTextContent(/overlap/i);

    fireEvent.click(screen.getByRole('button', { name: 'Cancel placement' }));

    expect(screen.queryByTestId('placement-invalid-reason')).not.toBeInTheDocument();
    openPropertyPanel();
    expect(screen.getByRole('heading', { name: 'Property summary' })).toBeInTheDocument();
  });

  it('locks placement on tile click so hover no longer moves the preview', () => {
    renderApp();
    openBuildDrawer();

    fireEvent.click(screen.getByRole('button', { name: 'Build Small Park' }));
    fireEvent.mouseEnter(screen.getByTestId('tile-0-0'));
    expect(screen.getByText('(1, 1)')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('tile-0-0'));
    expect(screen.getByText('(1, 1)')).toBeInTheDocument();
    expect(screen.getByTestId('commit-project-button')).toBeEnabled();

    fireEvent.mouseEnter(screen.getByTestId('tile-5-5'));
    expect(screen.getByText('(1, 1)')).toBeInTheDocument();
    expect(screen.getByTestId('commit-project-button')).toBeEnabled();
  });

  it('hides the onboarding guide when dismissed', () => {
    renderApp();

    expect(screen.getByTestId('onboarding-guide')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('dismiss-onboarding-guide'));
    expect(screen.queryByTestId('onboarding-guide')).not.toBeInTheDocument();
  });

  it('opens the driveway inspector and relocates driveway tiles', () => {
    renderApp();

    fireEvent.click(screen.getByTestId('tile-5-10'));

    expect(screen.getByTestId('access-tile-inspector')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Driveway' })).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('start-driveway-relocate-button'));
    fireEvent.click(screen.getByTestId('tile-4-10'));

    expect(screen.getByTestId('driveway-preview-status')).toHaveTextContent(/confirm in the inspector/i);
    fireEvent.click(screen.getByTestId('commit-driveway-relocate-button'));

    expect(useGameStore.getState().gameState.lot.drivewayTiles).toEqual([
      { x: 4, y: 10 },
      { x: 5, y: 10 },
    ]);
  });
});
