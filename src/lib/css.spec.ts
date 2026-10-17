import { describe, expect, it } from 'vitest';
import { findCssColorRefs, parseDeclarations, serializeDeclarations } from './css.ts';

describe('parseDeclarations', () => {
	it('splits a style attribute and round-trips it', () => {
		const declarations = parseDeclarations('fill: #f00; stroke:rgb(0, 0, 0) !important;opacity:.5');
		expect(declarations).toEqual([
			{ prop: 'fill', value: '#f00', important: false },
			{ prop: 'stroke', value: 'rgb(0, 0, 0)', important: true },
			{ prop: 'opacity', value: '.5', important: false }
		]);
		expect(serializeDeclarations(declarations)).toBe('fill:#f00;stroke:rgb(0, 0, 0) !important;opacity:.5');
	});

	it('does not split on semicolons inside url()', () => {
		const declarations = parseDeclarations('fill:url(data:image/png;base64,AAAA);stroke:red');
		expect(declarations.map((d) => d.prop)).toEqual(['fill', 'stroke']);
		expect(declarations[0].value).toBe('url(data:image/png;base64,AAAA)');
	});
});

describe('findCssColorRefs', () => {
	const pick = (css: string) => findCssColorRefs(css).map((ref) => [ref.prop, css.slice(ref.start, ref.end)]);

	it('finds Illustrator-style class rules', () => {
		const css = '.st0{fill:#E8A23F;}\n.st1{fill:none;stroke:#1A1A1A;stroke-width:2;}';
		expect(pick(css)).toEqual([
			['fill', '#E8A23F'],
			['fill', 'none'],
			['stroke', '#1A1A1A']
		]);
	});

	it('handles a last declaration without a semicolon, !important and comments', () => {
		const css = '/* a: b */ .a { /* fill: note */ fill : red !important } .b{stop-color:rgb(1, 2, 3)}';
		expect(pick(css)).toEqual([
			['fill', 'red'],
			['stop-color', 'rgb(1, 2, 3)']
		]);
	});

	it('looks inside @media blocks and ignores selectors with colons', () => {
		const css = '@media print{a:hover{color:#000}} svg:not(.x) path{stroke:#fff}';
		expect(pick(css)).toEqual([
			['color', '#000'],
			['stroke', '#fff']
		]);
	});

	it('reports ranges that can be spliced', () => {
		const css = '.cls-1{fill:#aabbcc}';
		const [ref] = findCssColorRefs(css);
		expect(css.slice(0, ref.start) + '#000000' + css.slice(ref.end)).toBe('.cls-1{fill:#000000}');
	});
});
