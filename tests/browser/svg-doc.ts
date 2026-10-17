import { mountSvg, type RecolorDoc } from '../../src/lib/svg-doc.ts';
import { NONE } from '../../src/lib/palette.ts';

// Browser-native checks: SVG computed paint, geometry and hit-testing need a real DOM.
const RED = '#FF0000';
const BLUE = '#0A84C9';
const GREEN = '#579A27';
const pair = '<rect id="a" x="10" y="10" width="30" height="30"/><rect id="b" x="60" y="10" width="30" height="30"/>';
let passed = 0;
let failed = 0;

function equal(actual: unknown, expected: unknown) {
	if (JSON.stringify(actual) !== JSON.stringify(expected)) {
		throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
	}
}

function check(name: string, content: string, verify: (doc: RecolorDoc) => void) {
	const host = document.createElement('div');
	host.style.cssText = 'position:absolute;left:-1000px;width:200px;height:200px';
	document.body.append(host);
	const result = document.createElement('li');
	try {
		const doc = mountSvg(host, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 60">${content}</svg>`);
		verify(doc);
		passed++;
		result.textContent = `PASS: ${name}`;
	} catch (error) {
		failed++;
		result.textContent = `FAIL: ${name}: ${error}`;
	}
	document.querySelector('#results')!.append(result);
	host.remove();
}

const shape = (doc: RecolorDoc, id: string) => doc.root.querySelector<SVGGraphicsElement>(`#${id}`)!;
const paint = (doc: RecolorDoc, id: string, prop: 'fill' | 'stroke' = 'fill') => getComputedStyle(shape(doc, id))[prop];
const areaKeys = (doc: RecolorDoc, key = RED) => doc.listColors([key]).filter((color) => color.parentKey === key).map((color) => color.key);

check('grouped is still the default', `<g fill="red">${pair}</g>`, (doc) => {
	equal(doc.listColors([]).map((color) => [color.key, color.areas]), [[RED, 2]]);
	doc.apply({ [RED]: BLUE });
	equal([paint(doc, 'a'), paint(doc, 'b')], ['rgb(10, 132, 201)', 'rgb(10, 132, 201)']);
});

check('shared important CSS can be overridden for just one area', `<style>rect{fill:red !important}</style>${pair}`, (doc) => {
	const [a] = areaKeys(doc);
	doc.apply({ [a]: BLUE }, [RED]);
	equal([paint(doc, 'a'), paint(doc, 'b')], ['rgb(10, 132, 201)', 'rgb(255, 0, 0)']);
});

check('splitting alone leaves the original markup intact', `<g fill="red">${pair}</g>`, (doc) => {
	const original = doc.serialize();
	doc.apply({}, [RED]);
	equal(doc.serialize(), original);
});

check('existing replacements carry into independent areas', `<g fill="red">${pair}</g>`, (doc) => {
	const [a, b] = areaKeys(doc);
	doc.apply({ [RED]: BLUE });
	doc.apply({ [a]: BLUE, [b]: BLUE }, [RED]);
	equal([paint(doc, 'a'), paint(doc, 'b')], ['rgb(10, 132, 201)', 'rgb(10, 132, 201)']);
	doc.apply({ [a]: GREEN, [b]: BLUE }, [RED]);
	equal([paint(doc, 'a'), paint(doc, 'b')], ['rgb(87, 154, 39)', 'rgb(10, 132, 201)']);
});

check('preview, reset and undo restore exact inline styles', pair.replaceAll('/>', ' style="fill:red !important;opacity:.6"/>'), (doc) => {
	const original = doc.serialize();
	const [a, b] = areaKeys(doc);
	doc.apply({ [a]: BLUE }, [RED]);
	doc.apply({ [a]: GREEN, [b]: BLUE }, [RED]);
	doc.apply({ [a]: BLUE }, [RED]);
	equal([paint(doc, 'a'), paint(doc, 'b')], ['rgb(10, 132, 201)', 'rgb(255, 0, 0)']);
	doc.apply({}, [RED]);
	equal(doc.serialize(), original);
	doc.apply({ [RED]: GREEN });
	equal([paint(doc, 'a'), paint(doc, 'b')], ['rgb(87, 154, 39)', 'rgb(87, 154, 39)']);
	doc.apply({});
	equal(doc.serialize(), original);
});

check('implicit black areas can be recolored separately', pair, (doc) => {
	const original = shape(doc, 'a').outerHTML;
	const [a] = areaKeys(doc, '#000000');
	doc.apply({ [a]: BLUE }, ['#000000']);
	equal([paint(doc, 'a'), paint(doc, 'b')], ['rgb(10, 132, 201)', 'rgb(0, 0, 0)']);
	doc.apply({});
	equal(shape(doc, 'a').outerHTML, original);
});

check('separated colors preserve alpha and element opacity', `<g fill="#ff000080" opacity=".7">${pair}</g>`, (doc) => {
	const originalPaint = paint(doc, 'b');
	const key = doc.colors[0].key;
	const [a] = areaKeys(doc, key);
	doc.apply({ [a]: BLUE }, [key]);
	equal(paint(doc, 'a'), originalPaint.replace('255, 0, 0', '10, 132, 201'));
	equal(paint(doc, 'b'), originalPaint);
	equal(doc.root.querySelector('g')!.getAttribute('opacity'), '.7');
});

check('matching fill and stroke stay together within one shape', `<g fill="red" stroke="red" stroke-width="2">${pair}</g>`, (doc) => {
	const [a] = areaKeys(doc);
	doc.apply({ [a]: BLUE }, [RED]);
	equal([paint(doc, 'a'), paint(doc, 'a', 'stroke'), paint(doc, 'b', 'stroke')], ['rgb(10, 132, 201)', 'rgb(10, 132, 201)', 'rgb(255, 0, 0)']);
});

check('different fill and stroke groups restore without leaking overrides', `<g fill="red" stroke="blue" stroke-width="2">${pair}</g>`, (doc) => {
	const original = doc.serialize();
	const [fill] = areaKeys(doc);
	const [stroke] = areaKeys(doc, '#0000FF');
	doc.apply({ [fill]: GREEN, [stroke]: BLUE }, [RED, '#0000FF']);
	equal([paint(doc, 'a'), paint(doc, 'a', 'stroke')], ['rgb(87, 154, 39)', 'rgb(10, 132, 201)']);
	doc.apply({});
	equal(doc.serialize(), original);
});

check('None removes only the selected area', `<g fill="red">${pair}</g>`, (doc) => {
	const [a] = areaKeys(doc);
	doc.apply({ [a]: NONE }, [RED]);
	equal([paint(doc, 'a'), paint(doc, 'b')], ['none', 'rgb(255, 0, 0)']);
});

check('canvas selection and locate use individual area keys', `<g fill="red">${pair}</g>`, (doc) => {
	const [a, b] = areaKeys(doc);
	doc.apply({}, [RED]);
	equal(doc.keyAt(shape(doc, 'a'), 0, 0), a);
	equal(doc.keyAt(shape(doc, 'b'), 0, 0), b);
	doc.locate([a]);
	equal([shape(doc, 'a').hasAttribute('data-rc-hit'), shape(doc, 'b').hasAttribute('data-rc-hit')], [true, false]);
	doc.apply({});
	equal(doc.keyAt(shape(doc, 'a'), 0, 0), RED);
});

check('shared gradient stops remain editable beside solid areas', `<defs><linearGradient id="gradient"><stop stop-color="red"/></linearGradient></defs><g fill="red">${pair}</g>`, (doc) => {
	const colors = doc.listColors([RED]);
	equal(colors.map((color) => [color.shapes, color.stops]), [[0, 1], [1, 0], [1, 0]]);
	const [a] = areaKeys(doc);
	doc.apply({ [RED]: BLUE, [a]: GREEN }, [RED]);
	equal([paint(doc, 'a'), paint(doc, 'b')], ['rgb(87, 154, 39)', 'rgb(255, 0, 0)']);
	equal(getComputedStyle(doc.root.querySelector('stop')!).stopColor, 'rgb(10, 132, 201)');
});

check('export keeps independent paints and strips editor highlighting', `<g fill="red">${pair}</g>`, (doc) => {
	const [a] = areaKeys(doc);
	doc.apply({ [a]: BLUE }, [RED]);
	doc.locate([a]);
	const svg = doc.serialize();
	equal(svg.includes('data-rc-'), false);
	const xml = new DOMParser().parseFromString(svg, 'image/svg+xml');
	equal(xml.querySelector('parsererror'), null);
	equal(xml.querySelector('#a')!.getAttribute('x'), '10');
	const host = document.createElement('div');
	document.body.append(host);
	try {
		const reopened = mountSvg(host, svg);
		equal([paint(reopened, 'a'), paint(reopened, 'b')], ['rgb(10, 132, 201)', 'rgb(255, 0, 0)']);
	} finally {
		host.remove();
	}
});

document.querySelector('#summary')!.textContent = `${passed} passed, ${failed} failed`;
document.title = `${failed ? 'FAIL' : 'PASS'}: SVG area regression checks`;
