/**
 * Browser-only. Mounts an SVG in a shadow root, finds every place a color is
 * written (attributes, style attributes, <style> blocks, and the implicit black
 * of shapes with no fill at all), and rewrites those places when colors are
 * swapped. The mounted element is also what gets exported, so what you see is
 * what you download.
 */

import {
	COLOR_PROPS,
	findCssColorRefs,
	parseDeclarations,
	serializeDeclarations,
	type Declaration
} from './css.ts';
import { formatWithAlpha, isNonColor, parseColor, toKey, type RGBA } from './color.ts';
import { NONE } from './palette.ts';

const SVG_NS = 'http://www.w3.org/2000/svg';
const SHAPES = 'path,rect,circle,ellipse,polygon,polyline,line,text';
/** Colors inside these only shape a clip or mask; they are not artwork colors. */
const NOT_ARTWORK = 'clipPath, mask';
/** Stand-in color used to find shapes that are black only because nothing set a fill. */
const SENTINEL = 'rgb(3, 141, 59)';
const SENTINEL_KEY = '#038D3B';

const HOST_CSS = `
:host { display: block; color: #000; }
:host > svg { display: block; width: 100%; height: 100%; }
:host > svg[data-rc-locate] :is(${SHAPES}):not([data-rc-hit]):not(clipPath *):not(mask *) {
	opacity: 0.08 !important;
}
`;

/** One color found in the artwork. */
export interface DocColor {
	/** Identity: the original color as #RRGGBB, or #RRGGBBAA when translucent. */
	key: string;
	/** The original color without alpha, for display and matching. */
	hex: string;
	alpha: number;
	/** How many shapes are painted with it. */
	shapes: number;
	/** How many gradient stops use it. */
	stops: number;
	/** Rough painted area, used to list the dominant colors first. */
	weight: number;
}

/** Original color key → replacement (#RRGGBB, or NONE to remove the color). */
export type Mapping = Record<string, string>;

interface Slot {
	key: string;
	alpha: number;
	/** Whether "none" is a valid value here (true for fill and stroke). */
	paint: boolean;
	isStop: boolean;
	/** What is currently written; null means the original value. */
	current: string | null;
	write(value: string | null): void;
}

interface StyleAttr {
	el: Element;
	declarations: Declaration[];
	dirty: boolean;
}

interface Sheet {
	el: Element;
	/** Alternating literal text and color values: [text, color, text, color, …, text]. */
	pieces: string[];
	dirty: boolean;
}

let scratch: CanvasRenderingContext2D | null = null;
const browserParsed = new Map<string, RGBA | null>();

/** Let the browser resolve named colors and color functions we do not parse ourselves. */
function parseWithBrowser(token: string): RGBA | null {
	const cached = browserParsed.get(token);
	if (cached !== undefined) return cached;
	scratch ??= document.createElement('canvas').getContext('2d');
	let result: RGBA | null = null;
	if (scratch) {
		// An invalid value leaves fillStyle untouched, so try it over two different colors.
		scratch.fillStyle = '#000000';
		scratch.fillStyle = token;
		const overBlack = scratch.fillStyle;
		scratch.fillStyle = '#ffffff';
		scratch.fillStyle = token;
		const overWhite = scratch.fillStyle;
		if (typeof overBlack === 'string' && overBlack === overWhite) result = parseColor(overBlack);
	}
	browserParsed.set(token, result);
	return result;
}

function sanitize(root: Element) {
	for (const el of root.querySelectorAll('script, iframe, object, embed')) el.remove();
	for (const el of [root, ...root.querySelectorAll('*')]) {
		for (const attr of [...el.attributes]) {
			const name = attr.name.toLowerCase();
			const isScriptUrl = /^\s*javascript:/i.test(attr.value);
			if (name.startsWith('on') || ((name === 'href' || name === 'xlink:href') && isScriptUrl)) {
				el.removeAttribute(attr.name);
			}
		}
	}
}

/** Turn SVG source into an element. Throws a readable message when it is not an SVG. */
export function parseSvg(text: string): SVGSVGElement {
	const source = text.trim();
	if (!source) throw new Error('That file is empty.');

	let root: Element | null = null;
	const xml = new DOMParser().parseFromString(source, 'image/svg+xml');
	const top = xml.documentElement;
	if (!xml.querySelector('parsererror') && top.namespaceURI === SVG_NS && top.localName === 'svg') {
		root = top;
	} else {
		// Lenient second try, e.g. for a pasted snippet without the xmlns attribute.
		root = new DOMParser().parseFromString(source, 'text/html').querySelector('svg');
	}
	if (!root) throw new Error('That is not an SVG. Open a file that starts with an <svg> tag.');

	sanitize(root);
	return document.importNode(root, true) as unknown as SVGSVGElement;
}

export class RecolorDoc {
	readonly root: SVGSVGElement;
	readonly colors: DocColor[];

	#slots: Slot[] = [];
	#styleAttrs: StyleAttr[] = [];
	#sheets: Sheet[] = [];
	#shapesByKey = new Map<string, Element[]>();
	#keysByShape = new WeakMap<Element, { fill?: string; stroke?: string }>();
	#located: Element[] = [];
	#addedViewBox = false;
	#hadXmlDeclaration: boolean;

	/** `root` must already be attached to the page: the analysis reads computed styles. */
	constructor(root: SVGSVGElement, source: string) {
		this.root = root;
		this.#hadXmlDeclaration = source.trimStart().startsWith('<?xml');
		this.#ensureViewBox();
		this.#collectSlots();
		const weights = this.#measureShapes();
		this.colors = this.#summarize(weights);
	}

	/** Without a viewBox the artwork cannot scale to fit the stage, so add one for display. */
	#ensureViewBox() {
		const root = this.root;
		if (root.hasAttribute('viewBox')) return;
		const px = (name: string) => {
			const value = root.getAttribute(name) ?? '';
			return /^\s*[\d.]+(px)?\s*$/.test(value) ? parseFloat(value) : NaN;
		};
		let box: [number, number, number, number] | null = null;
		const width = px('width');
		const height = px('height');
		if (width > 0 && height > 0) {
			box = [0, 0, width, height];
		} else {
			try {
				const bounds = root.getBBox();
				if (bounds.width > 0 && bounds.height > 0) {
					box = [bounds.x, bounds.y, bounds.width, bounds.height];
				}
			} catch {
				// Nothing to measure; leave the SVG as it is.
			}
		}
		if (box) {
			root.setAttribute('viewBox', box.join(' '));
			this.#addedViewBox = true;
		}
	}

	#resolve(token: string, el: Element): { key: string; alpha: number } | null {
		const value = token.trim();
		if (isNonColor(value)) return null;
		const color =
			value.toLowerCase() === 'currentcolor'
				? parseColor(getComputedStyle(el).color)
				: (parseColor(value) ?? parseWithBrowser(value));
		if (!color || color.a === 0) return null;
		return { key: toKey(color), alpha: color.a };
	}

	#collectSlots() {
		const root = this.root;
		for (const el of [root, ...root.querySelectorAll('*')]) {
			if (el.closest(NOT_ARTWORK)) continue;

			if (el.localName === 'style') {
				this.#collectSheet(el);
				continue;
			}

			for (const prop of COLOR_PROPS) {
				const original = el.getAttribute(prop);
				if (original === null) continue;
				const found = this.#resolve(original, el);
				if (!found) continue;
				this.#slots.push({
					...found,
					paint: prop === 'fill' || prop === 'stroke',
					isStop: prop === 'stop-color',
					current: null,
					write: (value) => el.setAttribute(prop, value ?? original)
				});
			}

			const style = el.getAttribute('style');
			if (style) this.#collectStyleAttr(el, style);
		}
	}

	#collectStyleAttr(el: Element, style: string) {
		const declarations = parseDeclarations(style);
		const entry: StyleAttr = { el, declarations, dirty: false };
		let used = false;
		for (const declaration of declarations) {
			const prop = declaration.prop.toLowerCase();
			if (!COLOR_PROPS.has(prop)) continue;
			const found = this.#resolve(declaration.value, el);
			if (!found) continue;
			const original = declaration.value;
			used = true;
			this.#slots.push({
				...found,
				paint: prop === 'fill' || prop === 'stroke',
				isStop: prop === 'stop-color',
				current: null,
				write: (value) => {
					declaration.value = value ?? original;
					entry.dirty = true;
				}
			});
		}
		if (used) this.#styleAttrs.push(entry);
	}

	#collectSheet(el: Element) {
		const css = el.textContent ?? '';
		const refs = findCssColorRefs(css);
		if (!refs.length) return;

		const sheet: Sheet = { el, pieces: [], dirty: false };
		let position = 0;
		let used = false;
		for (const ref of refs) {
			const found = this.#resolve(ref.value, this.root);
			if (!found) continue;
			sheet.pieces.push(css.slice(position, ref.start), ref.value);
			position = ref.end;
			const index = sheet.pieces.length - 1;
			const original = ref.value;
			used = true;
			this.#slots.push({
				...found,
				paint: ref.prop === 'fill' || ref.prop === 'stroke',
				isStop: ref.prop === 'stop-color',
				current: null,
				write: (value) => {
					sheet.pieces[index] = value ?? original;
					sheet.dirty = true;
				}
			});
		}
		sheet.pieces.push(css.slice(position));
		if (used) this.#sheets.push(sheet);
	}

	/** Read what each shape is actually painted with, however that color reached it. */
	#measureShapes(): Map<string, number> {
		const root = this.root;
		const weights = new Map<string, number>();
		const computedKey = (value: string) => {
			const color = parseColor(value) ?? parseWithBrowser(value);
			return color && color.a > 0 ? toKey(color) : null;
		};
		const note = (key: string, el: Element, weight: number) => {
			const list = this.#shapesByKey.get(key);
			if (list) list.push(el);
			else this.#shapesByKey.set(key, [el]);
			weights.set(key, (weights.get(key) ?? 0) + weight);
		};

		// Shapes with no fill anywhere up the tree render black. Giving the root a
		// stand-in fill reveals exactly those shapes, because presentation
		// attributes lose to every other way of setting a fill.
		const probeImplicit = !root.hasAttribute('fill');
		if (probeImplicit) root.setAttribute('fill', SENTINEL);
		let implicit = 0;

		for (const el of root.querySelectorAll(SHAPES)) {
			if (el.closest(NOT_ARTWORK)) continue;
			const style = getComputedStyle(el);

			let width = 0;
			let height = 0;
			try {
				const bounds = (el as SVGGraphicsElement).getBBox();
				width = bounds.width;
				height = bounds.height;
			} catch {
				// Not rendered (inside <defs>, say); count it without a size.
			}

			const keys: { fill?: string; stroke?: string } = {};

			if (el.localName !== 'line') {
				let key = computedKey(style.fill);
				if (probeImplicit && key === SENTINEL_KEY) {
					key = '#000000';
					implicit++;
				}
				if (key) {
					keys.fill = key;
					note(key, el, width * height);
				}
			}

			const strokeWidth = parseFloat(style.strokeWidth) || 0;
			if (strokeWidth > 0) {
				const key = computedKey(style.stroke);
				if (key) {
					keys.stroke = key;
					if (key !== keys.fill) note(key, el, 2 * (width + height) * strokeWidth);
				}
			}

			if (keys.fill || keys.stroke) this.#keysByShape.set(el, keys);
		}

		if (probeImplicit) root.removeAttribute('fill');

		if (implicit > 0) {
			this.#slots.push({
				key: '#000000',
				alpha: 1,
				paint: true,
				isStop: false,
				current: null,
				write: (value) => {
					if (value === null) root.removeAttribute('fill');
					else root.setAttribute('fill', value);
				}
			});
		}

		return weights;
	}

	#summarize(weights: Map<string, number>): DocColor[] {
		const byKey = new Map<string, DocColor>();
		for (const slot of this.#slots) {
			let color = byKey.get(slot.key);
			if (!color) {
				color = {
					key: slot.key,
					hex: slot.key.slice(0, 7),
					alpha: slot.alpha,
					shapes: this.#shapesByKey.get(slot.key)?.length ?? 0,
					stops: 0,
					weight: weights.get(slot.key) ?? 0
				};
				byKey.set(slot.key, color);
			}
			if (slot.isStop) color.stops++;
		}
		return [...byKey.values()].sort(
			(a, b) => b.weight - a.weight || b.shapes - a.shapes || a.key.localeCompare(b.key)
		);
	}

	/** Rewrite the SVG so every mapped color shows its replacement. */
	apply(mapping: Mapping) {
		for (const slot of this.#slots) {
			const target = mapping[slot.key];
			let next: string | null = null;
			if (target === NONE) next = slot.paint ? 'none' : 'transparent';
			else if (target !== undefined) next = formatWithAlpha(target, slot.alpha);
			if (next !== slot.current) {
				slot.current = next;
				slot.write(next);
			}
		}
		for (const entry of this.#styleAttrs) {
			if (!entry.dirty) continue;
			entry.el.setAttribute('style', serializeDeclarations(entry.declarations));
			entry.dirty = false;
		}
		for (const sheet of this.#sheets) {
			if (!sheet.dirty) continue;
			sheet.el.textContent = sheet.pieces.join('');
			sheet.dirty = false;
		}
	}

	/** Fade everything except the shapes painted with these colors. Pass null to stop. */
	locate(keys: string[] | null) {
		for (const el of this.#located) el.removeAttribute('data-rc-hit');
		this.#located = [];
		for (const key of keys ?? []) {
			for (const el of this.#shapesByKey.get(key) ?? []) {
				el.setAttribute('data-rc-hit', '');
				this.#located.push(el);
			}
		}
		// Colors that only live in gradient stops have no shapes of their own to point at.
		this.root.toggleAttribute('data-rc-locate', this.#located.length > 0);
	}

	/** The original color of the shape under the pointer, or null for empty space. */
	keyAt(target: EventTarget | null, clientX: number, clientY: number): string | null {
		let node = target instanceof Element ? target : null;
		while (node && this.root.contains(node)) {
			const keys = this.#keysByShape.get(node);
			if (keys) {
				if (keys.fill && keys.stroke && keys.fill !== keys.stroke && this.#isOnStroke(node, clientX, clientY)) {
					return keys.stroke;
				}
				return keys.fill ?? keys.stroke ?? null;
			}
			node = node.parentElement;
		}
		return null;
	}

	#isOnStroke(el: Element, clientX: number, clientY: number): boolean {
		if (!(el instanceof SVGGeometryElement)) return false;
		const matrix = el.getScreenCTM();
		if (!matrix) return false;
		try {
			const point = new DOMPoint(clientX, clientY).matrixTransform(matrix.inverse());
			return el.isPointInStroke(point);
		} catch {
			return false;
		}
	}

	/** The recolored SVG as text, without any of the helper attributes used on screen. */
	serialize(): string {
		const clone = this.root.cloneNode(true) as SVGSVGElement;
		clone.removeAttribute('data-rc-locate');
		for (const el of clone.querySelectorAll('[data-rc-hit]')) el.removeAttribute('data-rc-hit');
		if (this.#addedViewBox) clone.removeAttribute('viewBox');
		const body = new XMLSerializer().serializeToString(clone);
		return `${this.#hadXmlDeclaration ? '<?xml version="1.0" encoding="UTF-8"?>\n' : ''}${body}\n`;
	}
}

/** Show `source` inside `host` and analyze it. Throws when `source` is not an SVG. */
export function mountSvg(host: HTMLElement, source: string): RecolorDoc {
	const root = parseSvg(source);
	const shadow = host.shadowRoot ?? host.attachShadow({ mode: 'open' });
	const style = document.createElement('style');
	style.textContent = HOST_CSS;
	shadow.replaceChildren(style, root);
	return new RecolorDoc(root, source);
}

export function unmountSvg(host: HTMLElement) {
	host.shadowRoot?.replaceChildren();
}
