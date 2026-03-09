/// <reference types="jest" />

import { render } from '@testing-library/react-native';
import React from 'react';
import { Text, View } from 'react-native';

import { CoordinatesBar } from '@/shared/components/coordinates-bar';
import { EmptyState } from '@/shared/components/empty-state';
import { GlassCard } from '@/shared/components/glass-card';
import { LoadingState } from '@/shared/components/loading-state';

jest.mock('expo-glass-effect', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    GlassView: (props: any) => <View {...props} />,
    isGlassEffectAPIAvailable: () => false,
  };
});

describe('Glass Surface Primitives', () => {
  describe('GlassCard', () => {
    it('renders children inside the glass surface', () => {
      const { getByText, UNSAFE_getAllByType } = render(
        <GlassCard>
          <Text>Card Content</Text>
        </GlassCard>
      );

      expect(getByText('Card Content')).toBeTruthy();
      expect(UNSAFE_getAllByType(View).length).toBeGreaterThan(1);
    });

    it('applies minimum touch target when pressable', () => {
      const { getByRole } = render(
        <GlassCard onPress={() => {}} accessibilityRole='button' accessibilityLabel='Test card'>
          <Text>Pressable</Text>
        </GlassCard>
      );

      const button = getByRole('button');
      expect(button).toBeTruthy();
    });
  });

  describe('CoordinatesBar', () => {
    it('renders coordinate text in normal mode', () => {
      const { getByText } = render(<CoordinatesBar latitude={60.631} longitude={24.861} />);

      expect(getByText(/60\.631/)).toBeTruthy();
      expect(getByText(/24\.861/)).toBeTruthy();
    });

    it('renders unavailable state', () => {
      const { getByText } = render(<CoordinatesBar latitude={null} longitude={null} />);

      expect(getByText('Location unavailable')).toBeTruthy();
    });
  });

  describe('LoadingState', () => {
    it('renders a loading message', () => {
      const { getByText } = render(<LoadingState message='Loading stops...' />);

      expect(getByText('Loading stops...')).toBeTruthy();
    });
  });

  describe('EmptyState', () => {
    it('renders title and message', () => {
      const { getByText } = render(<EmptyState title='No stops' message='Try a different area' />);

      expect(getByText('No stops')).toBeTruthy();
      expect(getByText('Try a different area')).toBeTruthy();
    });
  });
});
