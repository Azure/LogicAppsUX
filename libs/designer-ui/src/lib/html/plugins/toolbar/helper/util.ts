export interface Position {
  x: number;
  y: number;
}

export interface RGB {
  blue: number;
  green: number;
  red: number;
}
export interface HSV {
  hue: number;
  saturation: number;
  value: number;
}
export interface Color {
  hex: string;
  hsv: HSV;
  rgb: RGB;
}

export const hex2rgb = (hex: string): RGB => {
  const rbgArr = (
    hex
      .replace(/^#?([a-f\d])([a-f\d])([a-f\d])$/i, (m, r, g, b) => '#' + r + r + g + g + b + b)
      .substring(1)
      .match(/.{2}/g) || []
  ).map((x) => parseInt(x, 16));

  return {
    blue: rbgArr[2],
    green: rbgArr[1],
    red: rbgArr[0],
  };
};

const rgb2hsv = ({ red, green, blue }: RGB): HSV => {
  const newRed = red / 255;
  const newGreen = green / 255;
  const newBlue = blue / 255;

  const max = Math.max(newRed, newGreen, newBlue);
  const difference = max - Math.min(newRed, newGreen, newBlue);

  const hue = difference
    ? (max === newRed
        ? (newGreen - newBlue) / difference + (newGreen < newBlue ? 6 : 0)
        : max === newGreen
        ? 2 + (newBlue - newRed) / difference
        : 4 + (newRed - newGreen) / difference) * 60
    : 0;
  const saturation = max ? (difference / max) * 100 : 0;
  const value = max * 100;

  return { hue, saturation, value };
};

export const hsv2rgb = ({ hue, saturation, value }: HSV): RGB => {
  const currSaturation = saturation / 100;
  const currValue = value / 100;

  const i = ~~(hue / 60);
  const f = hue / 60 - i;
  const p = currValue * (1 - currSaturation);
  const q = currValue * (1 - currSaturation * f);
  const t = currValue * (1 - currSaturation * (1 - f));
  const index = i % 6;

  const red = Math.round([currValue, q, p, p, t, currValue][index] * 255);
  const green = Math.round([t, currValue, currValue, q, p, p][index] * 255);
  const blue = Math.round([p, p, t, currValue, currValue, q][index] * 255);

  return { blue, green, red };
};

export const rgb2hex = ({ blue, green, red }: RGB): string => {
  return '#' + [red, green, blue].map((x) => x.toString(16).padStart(2, '0')).join('');
};

export function transformColor<M extends keyof Color, C extends Color[M]>(format: M, color: C): Color {
  let hex: Color['hex'] = toHex('#121212');
  let rgb: Color['rgb'] = hex2rgb(hex);
  let hsv: Color['hsv'] = rgb2hsv(rgb);

  if (format === 'hex') {
    const value = color as Color['hex'];

    hex = toHex(value);
    rgb = hex2rgb(hex);
    hsv = rgb2hsv(rgb);
  } else if (format === 'rgb') {
    const value = color as Color['rgb'];

    rgb = value;
    hex = rgb2hex(rgb);
    hsv = rgb2hsv(rgb);
  } else if (format === 'hsv') {
    const value = color as Color['hsv'];

    hsv = value;
    rgb = hsv2rgb(hsv);
    hex = rgb2hex(rgb);
  }

  return { hex, hsv, rgb };
}

export const toHex = (value: string): string => {
  let currValue = value;
  if (!value.startsWith('#')) {
    const ctx = document.createElement('canvas').getContext('2d');

    if (!ctx) {
      throw new Error('2d context not supported or canvas already initialized');
    }

    ctx.fillStyle = value;

    return ctx.fillStyle;
  } else if (currValue.length === 4 || currValue.length === 5) {
    currValue = value
      .split('')
      .map((v, i) => (i ? v + v : '#'))
      .join('');

    return currValue;
  } else if (currValue.length === 7 || currValue.length === 9) {
    return currValue;
  }

  return '#000000';
};

export const dropDownActiveClass = (active: boolean) => {
  if (active) return 'active msla-dropdown-item-active';
  else return '';
};
