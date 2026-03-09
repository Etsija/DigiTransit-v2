/// <reference types="jest" />

import { render } from '@testing-library/react-native';
import React from 'react';

import { AppIcon, TransportIcon } from '@/shared/icons';

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');

  return {
    Ionicons: (props: any) => <Text testID={props.testID}>{`ion:${props.name}`}</Text>,
    MaterialCommunityIcons: (props: any) => (
      <Text testID={props.testID}>{`mci:${props.name}`}</Text>
    ),
  };
});

describe('Icon Wrappers', () => {
  describe('AppIcon', () => {
    it('renders an Ionicons icon by name', () => {
      const { getByText } = render(<AppIcon name='map' size={24} color='#fff' />);

      expect(getByText('ion:map')).toBeTruthy();
    });
  });

  describe('TransportIcon', () => {
    it('renders the bus icon', () => {
      const { getByText } = render(<TransportIcon mode='bus' size={22} color='#fff' />);

      expect(getByText('mci:bus')).toBeTruthy();
    });

    it('renders the tram icon', () => {
      const { getByText } = render(<TransportIcon mode='tram' size={22} color='#fff' />);

      expect(getByText('mci:tram')).toBeTruthy();
    });

    it('renders the train icon', () => {
      const { getByText } = render(<TransportIcon mode='train' size={22} color='#fff' />);

      expect(getByText('mci:train')).toBeTruthy();
    });

    it('renders the metro icon', () => {
      const { getByText } = render(<TransportIcon mode='metro' size={22} color='#fff' />);

      expect(getByText('mci:subway-variant')).toBeTruthy();
    });

    it('renders the ferry icon', () => {
      const { getByText } = render(<TransportIcon mode='ferry' size={22} color='#fff' />);

      expect(getByText('mci:ferry')).toBeTruthy();
    });
  });
});
