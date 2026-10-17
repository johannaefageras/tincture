import { describe, expect, it } from 'vitest';
import { distance, formatWithAlpha, nearest, parseColor, readableOn, toHex, toKey } from './color.ts';
import { DEFAULT_PALETTE, paletteColors } from './palette.ts';

const PALETTE = paletteColors(DEFAULT_PALETTE);

describe('parseColor', () => {
	it('reads hex in every length', () => {
		expect(toKey(parseColor('#f00')!)).toBe('#FF0000');
		expect(toKey(parseColor('#Ff0000')!)).toBe('#FF0000');
		expect(toKey(parseColor('#f008')!)).toBe('#FF000088');
		expect(toKey(parseColor('#ff000080')!)).toBe('#FF000080');
	});

	it('reads rgb() and hsl() in comma and space syntax', () => {
		expect(toHex(parseColor('rgb(188, 58, 58)')!)).toBe('#BC3A3A');
		expect(toHex(parseColor('rgb(100% 0% 0%)')!)).toBe('#FF0000');
		expect(toKey(parseColor('rgba(0,0,0,0.5)')!)).toBe('#00000080');
		expect(toKey(parseColor('rgb(0 0 0 / 50%)')!)).toBe('#00000080');
		expect(toHex(parseColor('hsl(120, 100%, 50%)')!)).toBe('#00FF00');
		expect(toHex(parseColor('hsl(0 0% 100%)')!)).toBe('#FFFFFF');
	});

	it('ignores values that are not a color to swap', () => {
		for (const value of ['none', 'transparent', 'url(#gradient)', 'inherit', '', '#12', 'rgb(a,b,c)']) {
			expect(parseColor(value)).toBeNull();
		}
	});
});

describe('formatWithAlpha', () => {
	it('keeps opaque colors as hex and translucent ones as rgba', () => {
		expect(formatWithAlpha('#BC3A3A', 1)).toBe('#BC3A3A');
		expect(formatWithAlpha('#BC3A3A', 0.5)).toBe('rgba(188,58,58,0.5)');
	});
});

describe('nearest', () => {
	it('returns the color itself when it is already in the palette', () => {
		for (const hex of PALETTE) expect(nearest(hex, PALETTE)).toBe(hex);
	});

	it('matches near-misses to the obvious swatch', () => {
		expect(nearest('#BE3B39', PALETTE)).toBe('#BC3A3A');
		expect(nearest('#FEFEFE', PALETTE)).toBe('#FFFFFF');
		expect(nearest('#0A0A0A', PALETTE)).toBe('#000000');
		expect(nearest('#7ACC47', PALETTE)).toBe('#7CCB45');
	});

	it('keeps a far-off color in its own hue family', () => {
		expect(nearest('#000080', PALETTE)).toBe('#0B5FA5');
		expect(nearest('#00FFFF', PALETTE)).toBe('#58B8E8');
		expect(nearest('#FF0000', PALETTE)).toBe('#BC3A3A');
		expect(nearest('#777777', PALETTE)).toBe('#6E6E6E');
	});

	it('measures zero distance for identical colors', () => {
		expect(distance('#58B8E8', '#58b8e8')).toBe(0);
	});
});

describe('readableOn', () => {
	it('picks white text on dark swatches and black on light ones', () => {
		expect(readableOn('#000000')).toBe('#FFFFFF');
		expect(readableOn('#0B5FA5')).toBe('#FFFFFF');
		expect(readableOn('#FFE48A')).toBe('#000000');
		expect(readableOn('#FFFFFF')).toBe('#000000');
	});
});
