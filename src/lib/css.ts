/**
 * Just enough CSS parsing to find color values in `style="…"` attributes and
 * `<style>` blocks, and to write new values back without touching anything else.
 */

/** Properties whose value is a color we can swap. */
export const COLOR_PROPS = new Set([
	'fill',
	'stroke',
	'stop-color',
	'flood-color',
	'lighting-color',
	'color'
]);

export interface Declaration {
	prop: string;
	value: string;
	important: boolean;
}

/** Index of the first character from `stops` at or after `from`, skipping strings, comments and (…). */
function scan(text: string, from: number, stops: string): number {
	let depth = 0;
	for (let i = from; i < text.length; i++) {
		const char = text[i];
		if (char === '"' || char === "'") {
			const close = text.indexOf(char, i + 1);
			if (close === -1) return text.length;
			i = close;
		} else if (char === '/' && text[i + 1] === '*') {
			const close = text.indexOf('*/', i + 2);
			if (close === -1) return text.length;
			i = close + 1;
		} else if (char === '(') {
			depth++;
		} else if (char === ')') {
			depth = Math.max(0, depth - 1);
		} else if (depth === 0 && stops.includes(char)) {
			return i;
		}
	}
	return text.length;
}

function splitImportant(raw: string): { value: string; important: boolean } {
	const match = /\s*!\s*important\s*$/i.exec(raw);
	return match
		? { value: raw.slice(0, match.index).trim(), important: true }
		: { value: raw.trim(), important: false };
}

/** Parse the contents of a `style` attribute. */
export function parseDeclarations(text: string): Declaration[] {
	const declarations: Declaration[] = [];
	let position = 0;
	while (position < text.length) {
		const end = scan(text, position, ';');
		const chunk = text.slice(position, end);
		const colon = scan(chunk, 0, ':');
		if (colon > 0 && colon < chunk.length) {
			const prop = chunk.slice(0, colon).trim();
			const { value, important } = splitImportant(chunk.slice(colon + 1));
			if (prop && value) declarations.push({ prop, value, important });
		}
		position = end + 1;
	}
	return declarations;
}

export function serializeDeclarations(declarations: Declaration[]): string {
	return declarations
		.map(({ prop, value, important }) => `${prop}:${value}${important ? ' !important' : ''}`)
		.join(';');
}

export interface CssColorRef {
	prop: string;
	value: string;
	/** Range of `value` inside the stylesheet text. */
	start: number;
	end: number;
}

/** Find every color declaration in a stylesheet, including inside @media and friends. */
export function findCssColorRefs(css: string): CssColorRef[] {
	const refs: CssColorRef[] = [];
	let depth = 0;
	let position = 0;
	while (position < css.length) {
		const end = scan(css, position, ';{}');
		const terminator = css[end];
		if (terminator === '{') {
			depth++;
		} else {
			// A declaration ends at `;` or at the closing brace of its block.
			if (depth > 0) {
				const chunk = css.slice(position, end);
				const colon = scan(chunk, 0, ':');
				if (colon > 0 && colon < chunk.length) {
					const prop = chunk
						.slice(0, colon)
						.replace(/\/\*[\s\S]*?\*\//g, '')
						.trim()
						.toLowerCase();
					if (COLOR_PROPS.has(prop)) {
						const raw = chunk.slice(colon + 1);
						const { value } = splitImportant(raw);
						if (value) {
							const start = position + colon + 1 + raw.indexOf(value);
							refs.push({ prop, value, start, end: start + value.length });
						}
					}
				}
			}
			if (terminator === '}') depth = Math.max(0, depth - 1);
		}
		position = end + 1;
	}
	return refs;
}
