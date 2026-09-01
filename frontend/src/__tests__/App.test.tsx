import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

describe('Frontend Base Setup', () => {
  it('renders a dummy test container cleanly', () => {
    render(<div data-testid="app-container">ACM Competition Platform</div>);
    expect(screen.getByTestId('app-container')).toHaveTextContent('ACM Competition Platform');
  });
});
