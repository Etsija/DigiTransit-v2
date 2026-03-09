import { StyleSheet, Text, type TextProps } from 'react-native';

import { ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { theme } from '@/shared/theme/theme';

export type ThemedTextProps = TextProps & {
  type?: 'default' | 'title' | 'small' | 'smallBold' | 'subtitle' | 'link' | 'linkPrimary' | 'code';
  themeColor?: ThemeColor;
};

export function ThemedText({ style, type = 'default', themeColor, ...rest }: ThemedTextProps) {
  const colors = useTheme();

  return (
    <Text
      style={[
        { color: colors[themeColor ?? 'text'] },
        type === 'default' && styles.default,
        type === 'title' && styles.title,
        type === 'small' && styles.small,
        type === 'smallBold' && styles.smallBold,
        type === 'subtitle' && styles.subtitle,
        type === 'link' && styles.link,
        type === 'linkPrimary' && styles.linkPrimary,
        type === 'code' && styles.code,
        style,
      ]}
      {...rest}
    />
  );
}

const { typography, fonts } = theme;

const styles = StyleSheet.create({
  small: {
    fontSize: typography.sm.fontSize,
    fontWeight: typography.sm.fontWeight,
  },
  smallBold: {
    fontSize: typography.sm.fontSize,
    fontWeight: '700',
  },
  default: {
    fontSize: typography.base.fontSize,
    fontWeight: typography.base.fontWeight,
  },
  title: {
    fontSize: typography['2xl'].fontSize,
    fontWeight: typography['2xl'].fontWeight,
  },
  subtitle: {
    fontSize: typography.heading.fontSize,
    fontWeight: typography.heading.fontWeight,
  },
  link: {
    fontSize: typography.sm.fontSize,
  },
  linkPrimary: {
    fontSize: typography.sm.fontSize,
    color: theme.colors.link.primary,
  },
  code: {
    fontFamily: fonts.mono,
    fontSize: typography.xs.fontSize,
    fontWeight: typography.lg.fontWeight,
  },
});
