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

// --- Perceptual distance (OKLab with corrected lightness) -------------------

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
		toe(0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s),
		1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
		0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s
	];
}

/**
 * Lightness counts half as much as hue and chroma, the same weighting color
 * difference formulas use for textiles (kL = 2). With a small palette that
 * keeps a color in its own family: navy goes to the dark blue, not to the dark
 * gray that happens to be closer in lightness.
 */
const LIGHTNESS_WEIGHT = 0.5;

export function distance(a: string, b: string): number {
	const first = parseColor(a);
	const second = parseColor(b);
	if (!first || !second) return Infinity;
	const [l1, a1, b1] = toOklab(first);
	const [l2, a2, b2] = toOklab(second);
	return Math.hypot((l1 - l2) * LIGHTNESS_WEIGHT, a1 - a2, b1 - b2);
}

/** The palette color that looks closest to `hex`. */
export function nearest(hex: string, palette: string[]): string | null {
	let best: string | null = null;
	let bestDistance = Infinity;
	for (const candidate of palette) {
		const d = distance(hex, candidate);
		if (d < bestDistance) {
			bestDistance = d;
			best = candidate;
		}
	}
	return best;
}

/** Black or white, whichever is readable on top of `hex`. */
export function readableOn(hex: string): '#000000' | '#FFFFFF' {
	const color = parseColor(hex);
	if (!color) return '#000000';
	const luminance = 0.2126 * toLinear(color.r) + 0.7152 * toLinear(color.g) + 0.0722 * toLinear(color.b);
	return luminance > 0.36 ? '#000000' : '#FFFFFF';
}
