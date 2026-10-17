/** Color parsing, formatting and perceptual distance. No DOM access in here. */

export interface RGBA {
	r: number; // 0–255
	g: number;
	b: number;
	a: number; // 0–1
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const byte = (value: number) => clamp(Math.round(value), 0, 255);

/** Keywords that are valid paint values but are not a color to swap. */
const NON_COLORS = new Set([
	'none',
	'transparent',
	'inherit',
	'initial',
	'unset',
	'revert',
	'context-fill',
	'context-stroke'
]);

export function isNonColor(token: string): boolean {
	const value = token.trim().toLowerCase();
	return value === '' || NON_COLORS.has(value) || value.startsWith('url(');
}

function parseHex(value: string): RGBA | null {
	const hex = value.slice(1);
	if (!/^[0-9a-f]+$/i.test(hex)) return null;
	if (hex.length === 3 || hex.length === 4) {
		const [r, g, b, a = 'f'] = hex.split('');
		return {
			r: parseInt(r + r, 16),
			g: parseInt(g + g, 16),
			b: parseInt(b + b, 16),
			a: parseInt(a + a, 16) / 255
		};
	}
	if (hex.length === 6 || hex.length === 8) {
		return {
			r: parseInt(hex.slice(0, 2), 16),
			g: parseInt(hex.slice(2, 4), 16),
			b: parseInt(hex.slice(4, 6), 16),
			a: hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1
		};
	}
	return null;
}

function parseAlpha(part: string | undefined): number | null {
	if (part === undefined) return 1;
	const number = parseFloat(part);
	if (Number.isNaN(number)) return null;
	return clamp(part.endsWith('%') ? number / 100 : number, 0, 1);
}

function splitArgs(body: string): string[] {
	return body
		.replace(/\//g, ' ')
		.split(/[\s,]+/)
		.filter(Boolean);
}

function parseRgbFunction(body: string): RGBA | null {
	const parts = splitArgs(body);
	if (parts.length !== 3 && parts.length !== 4) return null;
	const channels = parts.slice(0, 3).map((part) => {
		const number = parseFloat(part);
		if (Number.isNaN(number)) return NaN;
		return part.endsWith('%') ? (number / 100) * 255 : number;
	});
	const a = parseAlpha(parts[3]);
	if (channels.some(Number.isNaN) || a === null) return null;
	return { r: byte(channels[0]), g: byte(channels[1]), b: byte(channels[2]), a };
}

function parseHslFunction(body: string): RGBA | null {
	const parts = splitArgs(body);
	if (parts.length !== 3 && parts.length !== 4) return null;
	const h = parseFloat(parts[0]);
	const s = parseFloat(parts[1]) / 100;
	const l = parseFloat(parts[2]) / 100;
	const a = parseAlpha(parts[3]);
	if ([h, s, l].some(Number.isNaN) || a === null) return null;
	const sat = clamp(s, 0, 1);
	const light = clamp(l, 0, 1);
	const chroma = (1 - Math.abs(2 * light - 1)) * sat;
	const hue = (((h % 360) + 360) % 360) / 60;
	const x = chroma * (1 - Math.abs((hue % 2) - 1));
	const [r1, g1, b1] =
		hue < 1
			? [chroma, x, 0]
			: hue < 2
				? [x, chroma, 0]
				: hue < 3
					? [0, chroma, x]
					: hue < 4
						? [0, x, chroma]
						: hue < 5
							? [x, 0, chroma]
							: [chroma, 0, x];
	const m = light - chroma / 2;
	return { r: byte((r1 + m) * 255), g: byte((g1 + m) * 255), b: byte((b1 + m) * 255), a };
}

/**
 * Parse hex, rgb()/rgba() and hsl()/hsla(). Named colors and newer color
 * functions return null here; the browser resolves those (see svg-doc.ts).
 */
export function parseColor(token: string): RGBA | null {
	const value = token.trim().toLowerCase();
	if (isNonColor(value)) return null;
	if (value.startsWith('#')) return parseHex(value);
	const fn = /^(rgba?|hsla?)\(\s*(.*?)\s*\)$/.exec(value);
	if (!fn) return null;
	return fn[1].startsWith('rgb') ? parseRgbFunction(fn[2]) : parseHslFunction(fn[2]);
}

const hex2 = (value: number) => byte(value).toString(16).padStart(2, '0').toUpperCase();

/** Opaque #RRGGBB, ignoring alpha. */
export function toHex(color: RGBA): string {
	return `#${hex2(color.r)}${hex2(color.g)}${hex2(color.b)}`;
}

/** Identity of a color in the artwork: #RRGGBB, or #RRGGBBAA when translucent. */
export function toKey(color: RGBA): string {
	return color.a >= 0.999 ? toHex(color) : `${toHex(color)}${hex2(color.a * 255)}`;
}

/** Write a palette color back into the SVG, keeping the original alpha. */
export function formatWithAlpha(hex: string, alpha: number): string {
	if (alpha >= 0.999) return hex;
	const color = parseColor(hex);
	if (!color) return hex;
	return `rgba(${color.r},${color.g},${color.b},${Math.round(alpha * 1000) / 1000})`;
}

// --- Perceptual palette matching ------------------------------------------

type Lab = [number, number, number];

const toLinear = (channel: number) => {
	const c = channel / 255;
	return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};

/**
 * Plain OKLab stretches near-black tones, so #0A0A0A would sit as far from
 * black as from a mid-dark gray. This is Ottosson's lightness correction, which
 * brings dark tones back in line with how they look.
 */
const K1 = 0.206;
const K2 = 0.03;
const K3 = (1 + K1) / (1 + K2);
const toe = (l: number) => 0.5 * (K3 * l - K1 + Math.sqrt((K3 * l - K1) ** 2 + 4 * K2 * K3 * l));

export function toOklab(color: RGBA): Lab {
	const r = toLinear(color.r);
	const g = toLinear(color.g);
	const b = toLinear(color.b);
	const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
	const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
	const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
	return [
		0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
		1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
		0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s
	];
}

// These are palette-recoloring weights, not a standard Delta E formula.
const LIGHTNESS_WEIGHT = 0.65;
const HUE_WEIGHT = 0.35;
const LOST_HUE_PENALTY = 1.25;

interface MatchColor {
	key: string;
	lightness: number;
	a: number;
	b: number;
	chroma: number;
	hueA: number;
	hueB: number;
	strength: number;
	band: number;
}

interface Candidate {
	hex: string;
	color: MatchColor;
}

function smoothstep(start: number, end: number, value: number): number {
	const amount = clamp((value - start) / (end - start), 0, 1);
	return amount * amount * (3 - 2 * amount);
}

/** RGB hue groups stay the same when a color is tinted or shaded. */
function hueBand({ r, g, b }: RGBA): number {
	const max = Math.max(r, g, b);
	const range = max - Math.min(r, g, b);
	if (range === 0) return -1;
	const hue =
		max === r ? ((g - b) / range + 6) % 6 : max === g ? (b - r) / range + 2 : (r - g) / range + 4;
	// Narrow 15-degree bands keep neighboring families from flattening each
	// other's shadows. Red is centered on the circular 0/360 boundary.
	return Math.round(hue * 4) % 24;
}

/**
 * Absolute chroma shrinks toward black, even for a saturated red. A plain
 * Lab distance therefore makes dark colors look like good matches for black.
 * Keep hue direction separate from saturation: muted red should be able to
 * match a stronger red without an extra hue penalty. Fade hue importance for
 * minute neutral casts, considering both dark colors and pale tints.
 *
 * Oklab conversion: https://bottosson.github.io/posts/oklab/
 * The relative saturation and extra hue weight are application heuristics.
 */
function matchingColor(color: RGBA): MatchColor {
	const [l, a, b] = toOklab(color);
	const chroma = Math.hypot(a, b);
	const saturation = chroma / Math.max(0.1, Math.min(l, 1 - l));
	const strength = smoothstep(0.025, 0.1, saturation) * smoothstep(0.008, 0.03, chroma);
	return {
		key: toHex(color),
		lightness: toe(l),
		a,
		b,
		chroma,
		hueA: chroma > 1e-8 ? a / chroma : 0,
		hueB: chroma > 1e-8 ? b / chroma : 0,
		strength,
		band: strength < 0.1 ? -1 : hueBand(color)
	};
}

/** Squared, directional score: how well a candidate replaces this source. */
function matchingScore(source: MatchColor, candidate: MatchColor): number {
	if (source.key === candidate.key) return 0;
	const l = (source.lightness - candidate.lightness) * LIGHTNESS_WEIGHT;
	const a = source.a - candidate.a;
	const b = source.b - candidate.b;
	const cosine = clamp(source.hueA * candidate.hueA + source.hueB * candidate.hueB, -1, 1);
	// A candidate can be stronger than the source without changing its hue.
	// Only a substantial loss of chroma makes its hue direction unreliable.
	const retainedHue = smoothstep(0.1, 0.6, candidate.chroma / Math.max(source.chroma, 1e-8));
	const hue = 2 * retainedHue * (1 - cosine) + (LOST_HUE_PENALTY * (1 - retainedHue)) ** 2;
	return l * l + a * a + b * b + (HUE_WEIGHT * source.strength) ** 2 * hue;
}

/** Directional palette-matching score. Alpha is preserved separately. */
export function distance(a: string, b: string): number {
	const first = parseColor(a);
	const second = parseColor(b);
	if (!first || !second) return Infinity;
	return Math.sqrt(matchingScore(matchingColor(first), matchingColor(second)));
}

const byTone = (a: MatchColor, b: MatchColor) =>
	a.lightness - b.lightness || a.key.localeCompare(b.key);

/**
 * Find the lowest total replacement cost for each band of related shades,
 * requiring lighter source colors to map to equal or lighter swatches.
 * Existing palette colors are fixed anchors. Prefix minima keep this O(n*m),
 * where n is the number of artwork colors and m is the palette size.
 */
function matchArtwork(candidates: Candidate[], artwork: readonly string[]): Map<string, string> {
	const sources = new Map<string, MatchColor>();
	for (const token of artwork) {
		const color = parseColor(token);
		if (!color) continue;
		const source = matchingColor(color);
		sources.set(source.key, source);
	}
	const bands = new Map<number, MatchColor[]>();
	for (const source of sources.values()) {
		const band = bands.get(source.band) ?? [];
		band.push(source);
		bands.set(source.band, band);
	}
	const targets = candidates.toSorted((a, b) => byTone(a.color, b.color));
	const width = targets.length;
	const targetIndices = new Map(targets.map((target, index) => [target.color.key, index]));
	const matches = new Map<string, string>();
	for (const band of bands.values()) {
		band.sort(byTone);
		const previousIndices = new Uint32Array(band.length * width);
		let costs = new Float64Array(width);
		for (let row = 0; row < band.length; row++) {
			const source = band[row];
			const fixed = targetIndices.get(source.key);
			const nextCosts = new Float64Array(width);
			let bestCost = Infinity;
			let bestIndex = 0;
			for (let column = 0; column < width; column++) {
				if (costs[column] < bestCost) {
					bestCost = costs[column];
					bestIndex = column;
				}
				nextCosts[column] =
					fixed !== undefined && fixed !== column
						? Infinity
						: bestCost + matchingScore(source, targets[column].color);
				previousIndices[row * width + column] = bestIndex;
			}
			costs = nextCosts;
		}
		let column = 0;
		for (let index = 1; index < width; index++) {
			if (costs[index] < costs[column]) column = index;
		}
		for (let row = band.length - 1; row >= 0; row--) {
			matches.set(band[row].key, targets[column].hex);
			column = previousIndices[row * width + column];
		}
	}
	return matches;
}

/** Prepare shared suggestions, optionally keeping an artwork's shades ordered. */
export function createMatcher(
	palette: readonly string[],
	artwork: readonly string[] = []
): (color: string) => string | null {
	const unique = new Map<string, Candidate>();
	for (const hex of palette) {
		const parsed = parseColor(hex);
		if (!parsed) continue;
		const color = matchingColor(parsed);
		if (!unique.has(color.key)) unique.set(color.key, { hex, color });
	}
	const candidates = [...unique.values()];
	if (!candidates.length) return () => null;
	const matches = matchArtwork(candidates, artwork);
	return (token) => {
		const color = parseColor(token);
		if (!color) return null;
		const source = matchingColor(color);
		const matched = matches.get(source.key);
		if (matched) return matched;
		let best: string | null = null;
		let bestScore = Infinity;
		for (const candidate of candidates) {
			const score = matchingScore(source, candidate.color);
			if (score < bestScore) {
				bestScore = score;
				best = candidate.hex;
			}
		}
		return best;
	};
}

/** The closest palette swatch, favoring hue retention for colorful artwork. */
export function nearest(hex: string, palette: readonly string[]): string | null {
	return createMatcher(palette)(hex);
}

/** Black or white, whichever is readable on top of `hex`. */
export function readableOn(hex: string): '#000000' | '#FFFFFF' {
	const color = parseColor(hex);
	if (!color) return '#000000';
	const luminance = 0.2126 * toLinear(color.r) + 0.7152 * toLinear(color.g) + 0.0722 * toLinear(color.b);
	return luminance > 0.36 ? '#000000' : '#FFFFFF';
}
