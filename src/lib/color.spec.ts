import { describe, expect, it } from 'vitest';
import {
	createMatcher,
	distance,
	formatWithAlpha,
	nearest,
	parseColor,
	readableOn,
	toHex,
	toKey,
	toOklab
} from './color.ts';
import { BUILT_IN_PALETTES, DEFAULT_PALETTE, paletteColors } from './palette.ts';

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
	it.each(BUILT_IN_PALETTES)('preserves every existing swatch in $palette.name', ({ palette }) => {
		const colors = paletteColors(palette);
		for (const hex of colors) expect(nearest(hex, colors)).toBe(hex);
	});

	it('matches near-misses to the obvious swatch', () => {
		expect(nearest('#BE3B39', PALETTE)).toBe('#BC3A3A');
		expect(nearest('#FEFEFE', PALETTE)).toBe('#FFFFFF');
		expect(nearest('#0A0A0A', PALETTE)).toBe('#000000');
		expect(nearest('#7ACC47', PALETTE)).toBe('#7CCB45');
	});

	it('keeps a far-off color in its own hue family', () => {
		expect(nearest('#000080', PALETTE)).toBe('#014075');
		expect(nearest('#00FFFF', PALETTE)).toBe('#A8DFFE');
		expect(nearest('#FF0000', PALETTE)).toBe('#BC3A3A');
		expect(nearest('#777777', PALETTE)).toBe('#6E6E6E');
	});

	it.each(['#100000', '#200000', '#330000', '#320D10', '#4F151B', '#401818'])(
		'keeps dark red %s red instead of turning it black or gray',
		(hex) => {
			expect(nearest(hex, PALETTE)).toBe('#5C0208');
		}
	);

	it.each([
		['#302020', '#5C0208'], ['#3A2828', '#5C0208'], ['#4B3434', '#5C0208'],
		['#604848', '#8A2020'], ['#785656', '#8A2020']
	])(
		'keeps muted red %s red instead of treating it as neutral',
		(hex, expected) => {
			expect(nearest(hex, PALETTE)).toBe(expected);
		}
	);

	it.each(BUILT_IN_PALETTES)(
		'avoids neutral matches for dark reds in $palette.name',
		({ palette }) => {
			const neutrals = palette.groups
				.filter((group) => ['Black and white', 'Light gray', 'Dark gray'].includes(group.name))
				.flatMap((group) => group.colors);
			for (const hex of ['#200000', '#320D10', '#4F151B', '#61272B', '#302020', '#3A2828', '#785656']) {
				const match = nearest(hex, paletteColors(palette));
				expect(match).not.toBeNull();
				expect(neutrals).not.toContain(match);
			}
		}
	);

	it('keeps other dark and muted hues away from grayscale when suitable swatches exist', () => {
		expect(nearest('#001000', PALETTE)).toBe('#366B04');
		expect(nearest('#003300', PALETTE)).toBe('#366B04');
		expect(nearest('#000033', PALETTE)).toBe('#014075');
		expect(nearest('#008080', ['#000000', '#777777', '#109090'])).toBe('#109090');
	});

	it('still matches black, white, grays and slight neutral casts by tone', () => {
		for (const [source, expected] of [
			['#000000', '#000000'],
			['#101010', '#000000'],
			['#131211', '#000000'],
			['#201A18', '#2B2B2B'],
			['#303030', '#2B2B2B'],
			['#7D8280', '#8A8A8A'],
			['#B0B8C0', '#BDBDBD'],
			['#FEFDFB', '#FFFFFF']
		]) {
			expect(nearest(source, PALETTE)).toBe(expected);
		}
	});

	it('does not brighten neutral artwork when a palette has tinted grays', () => {
		const pastel = paletteColors(BUILT_IN_PALETTES[1].palette);
		expect(nearest('#101010', pastel)).toBe('#3A3640');
		expect(nearest('#303030', pastel)).toBe('#3A3640');
		expect(nearest('#777777', pastel)).toBe('#7B7782');
	});

	it('retains color in pale reds and muted browns', () => {
		expect(nearest('#FFD0D0', PALETTE)).toBe('#FFBBB6');
		expect(nearest('#9F8170', PALETTE)).toBe('#A0622A');
	});

	it('still prefers a close muted custom swatch over a more saturated alternative', () => {
		expect(nearest('#6D5757', ['#000000', '#6E6E6E', '#6E5757', '#8A2020'])).toBe('#6E5757');
	});

	it('measures zero distance for identical colors', () => {
		expect(distance('#58B8E8', '#58b8e8')).toBe(0);
	});

	it('matches the underlying color independently of its opacity', () => {
		expect(nearest('#320D1080', PALETTE)).toBe('#5C0208');
		expect(nearest('rgba(50, 13, 16, 0.2)', PALETTE)).toBe('#5C0208');
	});

	it('falls back to the available colors in limited custom palettes', () => {
		expect(nearest('#320D10', ['#000000', '#2B2B2B', '#FFFFFF'])).toBe('#2B2B2B');
		expect(nearest('#320D10', ['#FFFFFF'])).toBe('#FFFFFF');
		expect(nearest('#320D10', [])).toBeNull();
		expect(nearest('#320D10', ['none', 'invalid'])).toBeNull();
		expect(nearest('invalid', PALETTE)).toBeNull();
	});
});

describe('createMatcher', () => {
	it('shares the same matches as single-color matching and respects palette changes', () => {
		const match = createMatcher(PALETTE);
		const matchCustom = createMatcher(['#000000', '#FFFFFF', '#601010']);
		for (const color of ['#320D10', '#7D8280', '#000033', '#FEFDFB']) {
			expect(match(color)).toBe(nearest(color, PALETTE));
		}
		expect(match('#320D10')).toBe('#5C0208');
		expect(matchCustom('#320D10')).toBe('#601010');
		expect(match('none')).toBeNull();
	});

	it.each(BUILT_IN_PALETTES)(
		'keeps related shades ordered in $palette.name across 36 hue ramps',
		({ palette }) => {
			const swatches = paletteColors(palette);
			for (let hue = 0; hue < 360; hue += 10) {
				const ramp = Array.from({ length: 19 }, (_, index) =>
					toHex(parseColor(`hsl(${hue} 100% ${(index + 1) * 5}%)`)!)
				);
				const match = createMatcher(swatches, ramp);
				let previousLightness = -1;
				for (const color of ramp) {
					const target = match(color)!;
					expect(swatches).toContain(target);
					const [lightness] = toOklab(parseColor(target)!);
					expect(lightness, `${color} → ${target}, hue ${hue}`).toBeGreaterThanOrEqual(previousLightness - 1e-8);
					previousLightness = lightness;
				}
			}
		}
	);

	it.each(BUILT_IN_PALETTES)(
		'preserves existing swatches while matching surrounding artwork in $palette.name',
		({ palette }) => {
			const swatches = paletteColors(palette);
			const artwork = [...swatches, '#3A2828', '#FFBF80', '#FFCC99', '#000033', '#7D8280'];
			const match = createMatcher(swatches, artwork);
			for (const color of swatches) expect(match(color)).toBe(color);
		}
	);

	it('matches consistently regardless of artwork order, duplicate notation or alpha', () => {
		const artwork = ['#320D10', '#320D1080', 'rgba(50,13,16,0.2)', '#3A2828', '#FFBF80', '#FFCC99'];
		const forward = createMatcher(PALETTE, artwork);
		const backward = createMatcher(PALETTE, artwork.toReversed());
		for (const color of artwork) expect(forward(color)).toBe(backward(color));
		expect(forward('#320D1080')).toBe(forward('#320D10'));
		expect(forward('rgba(50,13,16,0.2)')).toBe(forward('#320D10'));
		expect(forward('#BE3B39')).toBe(nearest('#BE3B39', PALETTE));
	});

	it('does not let neighboring olive greens flatten a separate gold shadow', () => {
		const artwork = ['#A49803', '#B98F03', '#93A005', '#9FA407', '#D8A801'];
		const match = createMatcher(PALETTE, artwork);
		expect(match('#D8A801')).toBe('#D19A0C');
	});

	it('handles empty palettes and invalid artwork colors', () => {
		expect(createMatcher([], ['#3A2828'])('#3A2828')).toBeNull();
		expect(createMatcher(PALETTE, ['invalid', 'none', '#3A2828'])('#3A2828')).toBe('#5C0208');
	});
});

describe('toOklab', () => {
	it('returns standard Oklab coordinates before the matching lightness correction', () => {
		const [l, a, b] = toOklab(parseColor('#FF0000')!);
		expect(l).toBeCloseTo(0.627955, 6);
		expect(a).toBeCloseTo(0.224863, 6);
		expect(b).toBeCloseTo(0.125846, 6);
		expect(toOklab(parseColor('#000000')!)).toEqual([0, 0, 0]);
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
