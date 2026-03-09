/// <reference types="jest" />

import { theme } from '@/shared/theme/theme';

describe('Design Token System', () => {
  describe('color tokens', () => {
    it('exposes dark theme text colors', () => {
      expect(theme.colors.text.primary).toBe('#F1F5F9');
      expect(theme.colors.text.secondary).toBe('#94A3B8');
      expect(theme.colors.text.muted).toBe('#64748B');
    });

    it('exposes transport type colors', () => {
      expect(theme.colors.transport.bus).toBe('#3B82F6');
      expect(theme.colors.transport.tram).toBe('#22C55E');
      expect(theme.colors.transport.train).toBe('#A855F7');
      expect(theme.colors.transport.metro).toBe('#F97316');
      expect(theme.colors.transport.ferry).toBe('#06B6D4');
    });

    it('exposes status colors', () => {
      expect(theme.colors.status.realtime).toBe('#4ADE80');
      expect(theme.colors.status.estimated).toBe('#FBBF24');
      expect(theme.colors.status.error).toBe('#F87171');
    });

    it('exposes glass card surface tokens', () => {
      expect(theme.colors.card.bg).toBe('rgba(18, 20, 26, 0.78)');
      expect(theme.colors.card.border).toBe('rgba(255, 255, 255, 0.10)');
    });
  });

  describe('spacing tokens', () => {
    it('uses a 4px base unit scale', () => {
      expect(theme.spacing.xs).toBe(4);
      expect(theme.spacing.sm).toBe(8);
      expect(theme.spacing.md).toBe(12);
      expect(theme.spacing.lg).toBe(16);
      expect(theme.spacing.xl).toBe(24);
      expect(theme.spacing['2xl']).toBe(32);
    });
  });

  describe('typography tokens', () => {
    it('defines the full type scale', () => {
      expect(theme.typography.xs.fontSize).toBe(11);
      expect(theme.typography.sm.fontSize).toBe(13);
      expect(theme.typography.base.fontSize).toBe(15);
      expect(theme.typography.lg.fontSize).toBe(17);
      expect(theme.typography.xl.fontSize).toBe(20);
      expect(theme.typography['2xl'].fontSize).toBe(28);
      expect(theme.typography.heading.fontSize).toBe(22);
    });

    it('assigns correct font weights', () => {
      expect(theme.typography.xs.fontWeight).toBe('400');
      expect(theme.typography.lg.fontWeight).toBe('600');
      expect(theme.typography.xl.fontWeight).toBe('700');
      expect(theme.typography['2xl'].fontWeight).toBe('700');
      expect(theme.typography.heading.fontWeight).toBe('600');
    });
  });

  describe('radius tokens', () => {
    it('defines card, bar, badge, and pill radii', () => {
      expect(theme.radius.card).toBe(16);
      expect(theme.radius.bar).toBe(12);
      expect(theme.radius.badge).toBe(6);
      expect(theme.radius.pill).toBe(999);
    });
  });

  describe('layout tokens', () => {
    it('defines key layout constants', () => {
      expect(theme.layout.screenPadding).toBe(16);
      expect(theme.layout.coordinatesBarHeight).toBe(44);
      expect(theme.layout.tabBarHeight).toBe(64);
      expect(theme.layout.cardListGap).toBe(12);
      expect(theme.layout.minTouchTarget).toBe(44);
    });
  });

  describe('transport type mapping', () => {
    it('provides a type-safe list of all transport modes', () => {
      const modes = Object.keys(theme.colors.transport);
      expect(modes).toEqual(expect.arrayContaining(['bus', 'tram', 'train', 'metro', 'ferry']));
      expect(modes).toHaveLength(5);
    });
  });
});
