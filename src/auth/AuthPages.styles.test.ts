import { describe, expect, it } from 'vitest';
import stylesheet from '../styles.css?inline';

function luminance(hex: string) {
  const channels = hex.slice(1).match(/.{2}/g)!.map(channel => parseInt(channel, 16) / 255);
  const linear = channels.map(channel => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
  return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
}

function contrastRatio(first: string, second: string) {
  const values = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

describe('authentication presentation CSS', () => {
  it('keeps promotional panel heading and body text at WCAG AA contrast across the orange gradient', () => {
    const colors = stylesheet.match(/\.auth-page \.auth-promo\{color:(#[0-9a-f]{6})\}\.auth-page \.auth-promo>p\{color:(#[0-9a-f]{6})\}/i);
    expect(colors).toBeTruthy();
    const [, headingColor, bodyColor] = colors!;
    const gradient = stylesheet.match(/background:linear-gradient\(150deg,(#[0-9a-f]{6}),(#[0-9a-f]{6}) 60%,(#[0-9a-f]{6})\)/i);
    expect(gradient).toBeTruthy();
    const gradientStops = gradient!.slice(1);

    for (const background of gradientStops) {
      expect(contrastRatio(headingColor, background)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(bodyColor, background)).toBeGreaterThanOrEqual(4.5);
    }
  });
});
