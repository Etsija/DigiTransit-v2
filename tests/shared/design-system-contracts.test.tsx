/// <reference types="jest" />

import { render } from '@testing-library/react-native';
import React from 'react';

import { ThemedText } from '@/components/themed-text';
import * as colorSchemeModule from '@/hooks/use-color-scheme';
import { theme } from '@/shared/theme/theme';

describe('Design System Contract Assertions', () => {
  beforeEach(() => {
    jest.spyOn(colorSchemeModule, 'useColorScheme').mockReturnValue('dark');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Font scaling', () => {
    it('does not disable font scaling on ThemedText', () => {
      const { getByText } = render(<ThemedText>Test text</ThemedText>);

      const textEl = getByText('Test text');
      // allowFontScaling defaults to true; verify it's not explicitly set to false
      expect(textEl.props.allowFontScaling).not.toBe(false);
    });

    it('preserves font scaling across all text types', () => {
      const types = ['default', 'title', 'small', 'smallBold', 'subtitle', 'link', 'code'] as const;

      for (const type of types) {
        const { getByText, unmount } = render(
          <ThemedText type={type}>{`text-${type}`}</ThemedText>
        );

        const el = getByText(`text-${type}`);
        expect(el.props.allowFontScaling).not.toBe(false);
        unmount();
      }
    });
  });

  describe('Token exclusivity', () => {
    it('theme spacing uses multiples of 4', () => {
      const spacingValues = Object.values(theme.spacing);
      for (const v of spacingValues) {
        expect(v % 4).toBe(0);
      }
    });

    it('theme defines all required transport modes', () => {
      expect(theme.colors.transport).toHaveProperty('bus');
      expect(theme.colors.transport).toHaveProperty('tram');
      expect(theme.colors.transport).toHaveProperty('train');
      expect(theme.colors.transport).toHaveProperty('metro');
      expect(theme.colors.transport).toHaveProperty('ferry');
    });

    it('layout.minTouchTarget is at least 44pt', () => {
      expect(theme.layout.minTouchTarget).toBeGreaterThanOrEqual(44);
    });
  });
});
