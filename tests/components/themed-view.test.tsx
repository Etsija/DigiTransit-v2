/// <reference types="jest" />

import { render } from '@testing-library/react-native';
import React from 'react';

import { ThemedView } from '@/components/themed-view';
import * as colorSchemeModule from '@/hooks/use-color-scheme';

describe('ThemedView', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('applies the light theme background color', () => {
    jest.spyOn(colorSchemeModule, 'useColorScheme').mockReturnValue('light');

    const { getByTestId } = render(<ThemedView testID='subject' />);

    expect(getByTestId('subject').props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ backgroundColor: '#ffffff' })])
    );
  });
});
