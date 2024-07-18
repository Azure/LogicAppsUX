import { lighten } from '../color';
import { describe, vi, beforeEach, afterEach, beforeAll, afterAll, it, test, expect } from 'vitest';
describe('lib/helpers/color', () => {
  it.each<[number, number, number, number, number, number, number]>([
    [0, 0, 0, 0.5, 128, 128, 128],
    [100, 150, 200, 0, 100, 150, 200],
    [100, 150, 200, 0.2, 131, 171, 211],
    [100, 150, 200, 0.4, 162, 192, 222],
    [100, 150, 200, 0.6, 193, 213, 233],
    [100, 150, 200, 0.8, 224, 234, 244],
    [100, 150, 200, 1.0, 255, 255, 255],
  ])('lighten (%i,%i,%i) by %d', (inputR, inputG, inputB, amount, expectedR, expectedG, expectedB) => {
    expect(lighten({ blue: inputB, green: inputG, red: inputR }, amount)).toMatchObject({
      blue: expectedB,
      green: expectedG,
      red: expectedR,
    });
  });
});
