import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { nearest } from './color.ts';
import { DEFAULT_PALETTE, paletteColors, paletteRows, parsePalette, serializePalette } from './palette.ts';

const valid = () => ({
	version: 1,
	name: 'Custom palette',
	groups: [
		{ name: 'Accent', colors: ['#BC3A3A', '#E07A76'] },
		{ name: 'Neutral', colors: ['#FFFFFF'] }
	]
});

describe('palette files', () => {
	it('normalizes names and hex without changing group or color order', () => {
		const source = valid();
		source.name = '  Custom palette  ';
		source.groups[0].name = ' Accent ';
		source.groups[0].colors = [' #bc3a3a ', '#e07a76'];
		expect(parsePalette(`\uFEFF${JSON.stringify(source)}`)).toEqual(valid());
	});

	it('accepts a single color and groups longer than the default three-column display', () => {
		expect(parsePalette(JSON.stringify({ version: 1, name: 'One', groups: [{ name: 'Only', colors: ['#123456'] }] })).groups[0].colors).toEqual(['#123456']);
		const source = valid();
		source.groups[0].colors.push('#579A27', '#7CCB45', '#B4E48C');
		expect(parsePalette(JSON.stringify(source)).groups[0].colors).toHaveLength(5);
	});

	it('round-trips both the built-in palette and the downloadable template', () => {
		expect(parsePalette(serializePalette(DEFAULT_PALETTE))).toEqual(DEFAULT_PALETTE);
		const template = readFileSync(new URL('../../static/palette-template.json', import.meta.url), 'utf8');
		const palette = parsePalette(template);
		expect(palette.name).toBe('Soft colors');
		expect(paletteColors(palette)).toHaveLength(9);
		expect(parsePalette(serializePalette(palette))).toEqual(palette);
	});

	it.each(['', '   ', '\uFEFF'])('rejects an empty file (%j)', (source) => {
		expect(() => parsePalette(source)).toThrow('file is empty');
	});

	it.each(['{', '{"version":1,}', '// comment\n{}'])('rejects invalid JSON (%j)', (source) => {
		expect(() => parsePalette(source)).toThrow('not valid JSON');
	});

	it.each([null, [], 'palette', 1])('rejects a non-object root (%j)', (value) => {
		expect(() => parsePalette(JSON.stringify(value))).toThrow('must be a JSON object');
	});

	it.each([undefined, 2, '1'])('rejects a missing or unsupported version (%j)', (version) => {
		expect(() => parsePalette(JSON.stringify({ ...valid(), version }))).toThrow('version must be the number 1');
	});

	it.each([undefined, '', '   ', 12])('requires a palette name (%j)', (name) => {
		expect(() => parsePalette(JSON.stringify({ ...valid(), name }))).toThrow('nonempty name');
	});

	it.each([undefined, [], {}])('requires a nonempty groups array (%j)', (groups) => {
		expect(() => parsePalette(JSON.stringify({ ...valid(), groups }))).toThrow('at least one group');
	});

	it.each([null, [], {}, { name: ' ' }])('identifies unnamed groups (%j)', (group) => {
		expect(() => parsePalette(JSON.stringify({ ...valid(), groups: [group] }))).toThrow('Group 1 must have a nonempty name');
	});

	it.each([undefined, [], '#FFFFFF'])('requires a nonempty color list (%j)', (colors) => {
		expect(() => parsePalette(JSON.stringify({ ...valid(), groups: [{ name: 'Pink', colors }] }))).toThrow('Group “Pink” must contain at least one color');
	});

	it.each(['E0569A', '#ABC', '#E0569A80', 'red', 'none', 'transparent', 123, null])('identifies invalid colors (%j)', (color) => {
		const source = { ...valid(), groups: [{ name: 'Pink', colors: ['#123456', color] }] };
		expect(() => parsePalette(JSON.stringify(source))).toThrow('Group “Pink”, color 2:');
	});

	it('rejects duplicates across groups, including case and whitespace differences', () => {
		const source = valid();
		source.groups[1].colors.push(' #bc3a3a ');
		expect(() => parsePalette(JSON.stringify(source))).toThrow('Group “Neutral”, color 2: #BC3A3A is already used in group “Accent”, color 1');
	});
});

describe('active palette values', () => {
	it('uses only the chosen palette for matching and swatch labels', () => {
		const palette = parsePalette(JSON.stringify(valid()));
		expect(paletteColors(palette)).toEqual(['#BC3A3A', '#E07A76', '#FFFFFF']);
		expect(nearest('#FEFEFE', paletteColors(palette))).toBe('#FFFFFF');
		expect(nearest('#000000', ['#123456'])).toBe('#123456');
		expect(paletteRows(palette)[1]).toEqual([{ hex: '#FFFFFF', label: 'Neutral, #FFFFFF' }]);
	});
});
