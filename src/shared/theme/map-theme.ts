import type { MapStyleElement } from 'react-native-maps';

type MapColor = `oklch(${string})`;

type MapPalette = {
  base: MapColor;
  land: MapColor;
  water: MapColor;
  park: MapColor;
  roadMinor: MapColor;
  roadMajor: MapColor;
  roadHighway: MapColor;
  roadHighwayStroke: MapColor;
  transit: MapColor;
  railway: MapColor;
  railwayStroke: MapColor;
  railwayLabel: MapColor;
  adminBoundary: MapColor;
  labelPrimary: MapColor;
  labelSecondary: MapColor;
};

type OklchComponents = {
  lightness: number;
  chroma: number;
  hue: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function parseOklch(color: MapColor): OklchComponents {
  const match = color.match(
    /^oklch\(\s*([+-]?(?:\d+\.?\d*|\.\d+))\s+([+-]?(?:\d+\.?\d*|\.\d+))\s+([+-]?(?:\d+\.?\d*|\.\d+))\s*\)$/i
  );

  if (!match) {
    throw new Error(`Invalid OKLCH color: ${color}`);
  }

  return {
    lightness: Number(match[1]),
    chroma: Number(match[2]),
    hue: Number(match[3]),
  };
}

function linearToSrgb(channel: number) {
  const clampedChannel = clamp(channel, 0, 1);

  if (clampedChannel <= 0.0031308) {
    return 12.92 * clampedChannel;
  }

  return 1.055 * Math.pow(clampedChannel, 1 / 2.4) - 0.055;
}

function toHexChannel(channel: number) {
  return Math.round(clamp(channel, 0, 1) * 255)
    .toString(16)
    .padStart(2, '0')
    .toUpperCase();
}

export function oklchToHex(color: MapColor): `#${string}` {
  const { lightness, chroma, hue } = parseOklch(color);
  const hueRadians = (hue * Math.PI) / 180;
  const a = chroma * Math.cos(hueRadians);
  const b = chroma * Math.sin(hueRadians);

  const lPrime = lightness + 0.3963377774 * a + 0.2158037573 * b;
  const mPrime = lightness - 0.1055613458 * a - 0.0638541728 * b;
  const sPrime = lightness - 0.0894841775 * a - 1.291485548 * b;

  const l = lPrime ** 3;
  const m = mPrime ** 3;
  const s = sPrime ** 3;

  const redLinear = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const greenLinear = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const blueLinear = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;

  const red = toHexChannel(linearToSrgb(redLinear));
  const green = toHexChannel(linearToSrgb(greenLinear));
  const blue = toHexChannel(linearToSrgb(blueLinear));

  return `#${red}${green}${blue}`;
}

function mapColor(color: MapColor) {
  return oklchToHex(color);
}

// Author map colors once in OKLCH, then derive provider-safe hex automatically.
export const darkMapPalette: MapPalette = {
  base: 'oklch(0.18 0.03 255)',
  land: 'oklch(0.22 0.03 255)',
  water: 'oklch(0.15 0.03 252)',
  park: 'oklch(0.20 0.03 180)',
  roadMinor: 'oklch(0.33 0.03 255)',
  roadMajor: 'oklch(0.35 0.02 255)',
  roadHighway: 'oklch(0.39 0.06 215)',
  roadHighwayStroke: 'oklch(0.31 0.05 215)',
  transit: 'oklch(0.25 0.03 250)',
  railway: 'oklch(0.44 0.03 220)',
  railwayStroke: 'oklch(0.35 0.02 220)',
  railwayLabel: 'oklch(0.66 0.02 235)',
  adminBoundary: 'oklch(0.31 0.02 255)',
  labelPrimary: 'oklch(0.74 0.03 250)',
  labelSecondary: 'oklch(0.18 0.03 255)',
};

export const nativeDarkMapStyle: MapStyleElement[] = [
  { elementType: 'geometry', stylers: [{ color: mapColor(darkMapPalette.base) }] },
  {
    elementType: 'labels.text.fill',
    stylers: [{ color: mapColor(darkMapPalette.labelPrimary) }],
  },
  {
    elementType: 'labels.text.stroke',
    stylers: [{ color: mapColor(darkMapPalette.labelSecondary) }],
  },
  {
    featureType: 'administrative',
    elementType: 'geometry.stroke',
    stylers: [{ color: mapColor(darkMapPalette.adminBoundary) }],
  },
  {
    featureType: 'landscape',
    elementType: 'geometry',
    stylers: [{ color: mapColor(darkMapPalette.land) }],
  },
  {
    featureType: 'poi',
    elementType: 'geometry',
    stylers: [{ color: mapColor(darkMapPalette.base) }],
  },
  {
    featureType: 'poi.park',
    elementType: 'geometry',
    stylers: [{ color: mapColor(darkMapPalette.park) }],
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: mapColor(darkMapPalette.roadMinor) }],
  },
  {
    featureType: 'road',
    elementType: 'geometry.stroke',
    stylers: [{ color: mapColor(darkMapPalette.base) }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: mapColor(darkMapPalette.roadHighway) }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry.stroke',
    stylers: [{ color: mapColor(darkMapPalette.roadHighwayStroke) }],
  },
  {
    featureType: 'transit',
    elementType: 'geometry',
    stylers: [{ color: mapColor(darkMapPalette.transit) }],
  },
  {
    featureType: 'transit.line',
    elementType: 'geometry',
    stylers: [{ color: mapColor(darkMapPalette.railway) }],
  },
  {
    featureType: 'transit.line',
    elementType: 'geometry.stroke',
    stylers: [{ color: mapColor(darkMapPalette.railwayStroke) }],
  },
  {
    featureType: 'transit.station',
    elementType: 'labels.text.fill',
    stylers: [{ color: mapColor(darkMapPalette.railwayLabel) }],
  },
  {
    featureType: 'transit.station',
    elementType: 'labels.text.stroke',
    stylers: [{ color: mapColor(darkMapPalette.labelSecondary) }],
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: mapColor(darkMapPalette.water) }],
  },
];
