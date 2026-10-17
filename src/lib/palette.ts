/** Palette file format, validation and the built-in fallback. No browser state. */

export interface PaletteGroup {
	name: string;
	colors: string[];
}

export interface Palette {
	version: 1;
	name: string;
	groups: PaletteGroup[];
}

// Keep the original key so saved palettes survive the rename to Tincture.
export const PALETTE_STORAGE_KEY = 'recolor:palette';

export const DEFAULT_PALETTE: Palette = {
	version: 1,
	name: 'Default palette',
	groups: [
		{ name: 'Black and white', colors: ['#000000', '#FFFFFF'] },
		{ name: 'Red', colors: ['#8A2020', '#BC3A3A', '#E07A76'] },
		{ name: 'Orange', colors: ['#C96A12', '#F59A2E', '#FFCB80'] },
		{ name: 'Yellow', colors: ['#D19A0C', '#FFC612', '#FFE48A'] },
		{ name: 'Green', colors: ['#579A27', '#7CCB45', '#B4E48C'] },
		{ name: 'Blue', colors: ['#0B5FA5', '#0A84C9', '#58B8E8'] },
		{ name: 'Purple', colors: ['#6235A8', '#8660C9', '#B7A1E6'] },
		{ name: 'Pink', colors: ['#B02E6C', '#E0569A', '#F4A3C8'] },
		{ name: 'Brown', colors: ['#A0622A', '#C48444', '#DDAA78'] },
		{ name: 'Light gray', colors: ['#8A8A8A', '#BDBDBD', '#E6E6E6'] },
		{ name: 'Dark gray', colors: ['#2B2B2B', '#4A4A4A', '#6E6E6E'] }
	]
};

export interface Swatch {
	hex: string;
	/** Spoken name, e.g. "Red, #BC3A3A". */
	label: string;
}

export function paletteRows(palette: Palette): Swatch[][] {
	return palette.groups.map((group) =>
		group.colors.map((hex) => ({ hex, label: `${group.name}, ${hex}` }))
	);
}

export function paletteColors(palette: Palette): string[] {
	return palette.groups.flatMap((group) => group.colors);
}

const isObject = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null && !Array.isArray(value);

/** Validate the whole file before returning a normalized, independent palette. */
export function parsePalette(source: string): Palette {
	const text = source.replace(/^\uFEFF/, '').trim();
	if (!text) throw new Error('That palette file is empty. Download the template to get started.');
	let value: unknown;
	try {
		value = JSON.parse(text);
	} catch {
		throw new Error('That file is not valid JSON. Check for missing quotes, comments or trailing commas.');
	}
	if (!isObject(value)) throw new Error('The palette must be a JSON object with version, name and groups.');
	if (value.version !== 1) throw new Error('The palette version must be the number 1.');
	if (typeof value.name !== 'string' || !value.name.trim()) {
		throw new Error('The palette must have a nonempty name.');
	}
	if (!Array.isArray(value.groups) || value.groups.length === 0) {
		throw new Error('The palette must contain at least one group.');
	}
	const seen = new Map<string, string>();
	const groups = value.groups.map((group: unknown, index: number): PaletteGroup => {
		if (!isObject(group) || typeof group.name !== 'string' || !group.name.trim()) {
			throw new Error(`Group ${index + 1} must have a nonempty name.`);
		}
		const name = group.name.trim();
		if (!Array.isArray(group.colors) || group.colors.length === 0) {
			throw new Error(`Group “${name}” must contain at least one color.`);
		}
		const colors = group.colors.map((color: unknown, colorIndex: number): string => {
			const location = `Group “${name}”, color ${colorIndex + 1}`;
			if (typeof color !== 'string' || !/^#[0-9a-f]{6}$/i.test(color.trim())) {
				throw new Error(`${location}: ${JSON.stringify(color)} must be a six-digit hex color, such as #E0569A.`);
			}
			const hex = color.trim().toUpperCase();
			const previous = seen.get(hex);
			if (previous) throw new Error(`${location}: ${hex} is already used in ${previous}.`);
			seen.set(hex, `group “${name}”, color ${colorIndex + 1}`);
			return hex;
		});
		return { name, colors };
	});
	return { version: 1, name: value.name.trim(), groups };
}

/** Export the same format accepted by the importer and local storage. */
export function serializePalette(palette: Palette): string {
	return `${JSON.stringify(palette, null, 2)}\n`;
}

/** Mapping target that removes a color from the artwork (fill/stroke "none"). */
export const NONE = 'none';
