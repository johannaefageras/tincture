<script lang="ts">
	import { asset, resolve } from '$app/paths';
	import brandMark from '#lib/assets/favicon.svg';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	const template = $derived(data.template);

	let copyNotice = $state('');

	async function copyExample() {
		try {
			await navigator.clipboard.writeText(template);
			copyNotice = 'JSON copied. Paste it into a text editor and save it as a .json file.';
		} catch {
			copyNotice = 'Copying was blocked. Download the template or select the example below.';
		}
	}
</script>

<svelte:head>
	<title>Palette JSON format – Tincture</title>
	<meta name="description" content="Create a custom palette for Tincture: a complete JSON example, required fields, hex color rules and fixes for common import errors." />
</svelte:head>

<a class="skip" href="#guide">Skip to the guide</a>

<header class="topbar">
	<div class="topbar-inner">
		<a class="brand display" href={resolve('/')} aria-label="Tincture home">
			<img src={brandMark} width="28" height="28" alt="" />
			<strong>Tincture</strong>
		</a>
		<a class="button editor-link" href={resolve('/')}>Open editor</a>
	</div>
</header>

<main id="guide">
	<header class="intro">
		<p class="eyebrow">Palette guide</p>
		<h1 class="display">Import your own <em>palette</em>.</h1>
		<p class="lead">Give your palette a name, arrange its colors into groups, and save it as a JSON file. Importing it replaces the swatches in Tincture.</p>
		<a class="button primary" href={asset('palette-template.json')} download>Download JSON template</a>
	</header>

	<nav class="contents" aria-label="On this page">
		<a href="#get-started">Get started</a>
		<a href="#example">JSON example</a>
		<a href="#fields">Required fields</a>
		<a href="#rules">Color &amp; file rules</a>
		<a href="#errors">Common errors</a>
		<a href="#after-import">After importing</a>
	</nav>

	<section aria-labelledby="get-started">
		<h2 id="get-started">Get started</h2>
		<ol>
			<li><strong>Download the template.</strong> You can also use <strong>Export</strong> in the editor to start from your current palette.</li>
			<li><strong>Edit it in a text editor.</strong> Change the palette name, group names and hex colors. Save as plain UTF-8 text with a <code>.json</code> extension, such as <code>my-palette.json</code>.</li>
			<li><strong>Choose Import palette in Tincture.</strong> Select your JSON file. The app checks the whole file before replacing the palette.</li>
		</ol>
	</section>

	<section aria-labelledby="example">
		<h2 id="example">A complete JSON example</h2>
		<p>This is the same file as the downloadable template. Keep the structure and replace the names and colors with your own.</p>
		<p>Each group in the template has five shades, ordered from lightest (1) to darkest (5), with the main color in the middle (3).</p>
		<div class="example">
			<div class="example-bar">
				<span>palette-template.json</span>
				<button type="button" class="button" onclick={copyExample}>Copy JSON</button>
			</div>
			<pre><code>{template.trim()}</code></pre>
		</div>
		<p class="copy-notice" role="status">{copyNotice}</p>
	</section>

	<section aria-labelledby="fields">
		<h2 id="fields">Required fields</h2>
		<p>Every palette needs these fields. A group is a named list of related colors.</p>
		<table class="fields-table">
			<thead><tr><th scope="col">Field</th><th scope="col">What to put there</th></tr></thead>
			<tbody>
				<tr><th scope="row"><code>version</code></th><td>The number <code>1</code>, without quotation marks.</td></tr>
				<tr><th scope="row"><code>name</code></th><td>A nonempty name for the palette, such as <code>"Soft colors"</code>.</td></tr>
				<tr><th scope="row"><code>groups</code></th><td>An array containing at least one group, enclosed in square brackets <code>[]</code>.</td></tr>
				<tr><th scope="row"><code>groups[].name</code></th><td>A nonempty name for each group, such as <code>"Pink"</code> or <code>"Neutrals"</code>.</td></tr>
				<tr><th scope="row"><code>groups[].colors</code></th><td>An array of one or more unique six-digit hex color strings, such as <code>["#B02E6C", "#E0569A"]</code>.</td></tr>
			</tbody>
		</table>
		<p class="note">In this table, <code>groups[]</code> means each group inside the <code>groups</code> array. The JSON example shows how to write it.</p>
	</section>

	<section aria-labelledby="rules">
		<h2 id="rules">Color &amp; file rules</h2>
		<ul>
			<li><strong>Use six-digit hex colors with a leading #.</strong> Write <code>"#E0569A"</code>. Short hex, eight-digit hex, RGB functions and color names are not accepted.</li>
			<li><strong>Keep every color unique across the whole palette.</strong> A color cannot appear twice, even in different groups. <code>"#e0569a"</code> and <code>"#E0569A"</code> count as the same color.</li>
			<li><strong>Lowercase and surrounding spaces are accepted.</strong> Tincture converts hex colors to uppercase and trims surrounding whitespace from names and colors. Names containing only spaces are empty.</li>
			<li><strong>Keep at least one group and one color in each group.</strong> Groups can contain different numbers of colors. A single-color palette is valid.</li>
			<li><strong>Put colors in the order you want to see them.</strong> Tincture preserves both group order and color order. Up to five colors fit on each row; longer groups wrap within the palette sidebar. The template and built-in families run from lightest to darkest, with the main shade in the middle.</li>
			<li><strong>Leave transparency out of the palette.</strong> Tincture preserves the SVG’s existing opacity. The editor supplies its own <strong>None</strong> swatch, so do not include <code>"none"</code>, <code>"transparent"</code> or alpha values.</li>
			<li><strong>Use valid JSON.</strong> Put field names and text values in double quotes. Separate items with commas, but leave out comments and trailing commas.</li>
		</ul>
	</section>

	<section aria-labelledby="errors">
		<h2 id="errors">Common errors and how to fix them</h2>
		<table>
			<thead><tr><th scope="col">Problem</th><th scope="col">Fix</th></tr></thead>
			<tbody>
				<tr><th scope="row">Missing #</th><td>Change <code>"E0569A"</code> to <code>"#E0569A"</code>.</td></tr>
				<tr><th scope="row">Short hex</th><td>Expand <code>"#ABC"</code> to <code>"#AABBCC"</code>.</td></tr>
				<tr><th scope="row">Color name</th><td>Replace a name such as <code>"red"</code> with its six-digit hex value, such as <code>"#FF0000"</code>.</td></tr>
				<tr><th scope="row">Duplicate color</th><td>Remove the repeated color or choose another hex value. The error identifies its group and position.</td></tr>
				<tr><th scope="row">Quoted version</th><td>Use <code>"version": 1</code>, rather than <code>"version": "1"</code>.</td></tr>
				<tr><th scope="row">Trailing comma</th><td>Change <code>["#FFFFFF",]</code> to <code>["#FFFFFF"]</code>. Check the last item in each object and array.</td></tr>
			</tbody>
		</table>
		<p class="note">If import fails, the existing palette and artwork stay as they are. Fix the file and import it again.</p>
	</section>

	<section aria-labelledby="after-import">
		<h2 id="after-import">What happens after importing?</h2>
		<ul>
			<li>The imported palette replaces all the editor’s palette swatches and is remembered in this browser after a refresh.</li>
			<li>Newly opened SVGs keep their original colors. Use <strong>Match colors</strong> below the color summary to match off-palette colors to their nearest palette swatches.</li>
			<li>An SVG already open keeps its current colors and undo history. Choose <strong>Match to [palette name]</strong> below the palette chooser when you want to apply it, or use <strong>Match colors</strong> in the color panel.</li>
			<li><strong>Restore default</strong> brings back the built-in palette and clears the saved import. It also keeps an open SVG’s colors as they are.</li>
		</ul>
		<p class="note">If browser storage is unavailable, you can still import a palette for the current page. Tincture will tell you that it may not be remembered after a refresh.</p>
	</section>

	<footer>
		<p>Start with the template, then edit your colors.</p>
		<a class="button primary" href={asset('palette-template.json')} download>Download JSON template</a>
	</footer>
</main>

<style>
	.topbar {
		border-bottom: 1px solid var(--rule);
		background: var(--paper);
	}

	.topbar-inner {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-4);
		max-width: 50rem;
		margin-inline: auto;
		padding: var(--space-3) var(--space-6);
	}

	.brand {
		display: inline-flex;
		flex: none;
		align-items: center;
		gap: var(--space-2);
		height: 2.5rem;
		font-size: 2rem;
		line-height: 1;
		letter-spacing: -0.01em;
		text-decoration: none;
		white-space: nowrap;
	}

	.brand img {
		flex: none;
		border-radius: 2px;
	}

	.brand strong {
		font-weight: var(--weight-bold);
	}

	a {
		color: var(--ink);
		text-underline-offset: 3px;
	}

	a.button {
		justify-content: center;
		text-decoration: none;
	}

	a.primary {
		color: var(--paper);
	}

	main {
		max-width: 50rem;
		margin-inline: auto;
		padding: 3rem var(--space-6) 4rem;
		line-height: 1.65;
	}

	.intro {
		display: grid;
		justify-items: start;
		gap: var(--space-4);
	}

	.eyebrow {
		color: var(--ink-muted);
		font-size: var(--text-s);
		font-weight: var(--weight-medium);
	}

	h1 {
		font-size: clamp(3.5rem, 8vw, 5.5rem);
		font-weight: var(--weight-regular);
		line-height: 1.04;
		letter-spacing: -0.02em;
		text-wrap: balance;
	}

	.lead {
		max-width: 40rem;
		font-size: var(--text-l);
	}

	.contents {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2) var(--space-4);
		margin-block: 2rem;
		padding-block: var(--space-4);
		border-block: 1px solid var(--rule);
		font-size: var(--text-s);
	}

	section + section {
		margin-top: 2.75rem;
	}

	h2 {
		margin-bottom: var(--space-3);
		font-size: 1.5rem;
		font-weight: var(--weight-medium);
		line-height: 1.3;
		scroll-margin-top: var(--space-6);
	}

	ol,
	ul {
		margin: 0;
		padding-left: 1.4rem;
	}

	li + li {
		margin-top: var(--space-3);
	}

	strong {
		font-weight: var(--weight-semibold);
	}

	code {
		font-size: 0.875em;
		overflow-wrap: anywhere;
	}

	p code,
	li code,
	td code {
		padding: 0.1em 0.25em;
		border-radius: var(--radius);
		background: var(--wash);
	}

	.example {
		margin-top: var(--space-4);
		border: 1px solid var(--rule);
		border-radius: var(--radius);
		overflow: hidden;
		background: var(--paper);
	}

	.example-bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: var(--space-2);
		padding: var(--space-2) var(--space-4);
		border-bottom: 1px solid var(--rule);
		font-size: var(--text-s);
	}

	pre {
		margin: 0;
		padding: var(--space-4);
		line-height: 1.65;
		white-space: pre-wrap;
		overflow-wrap: anywhere;
	}

	.copy-notice {
		min-height: 1.65em;
		margin-top: var(--space-2);
		color: var(--ink-muted);
		font-size: var(--text-s);
	}

	table {
		width: 100%;
		margin-top: var(--space-4);
		border-collapse: collapse;
		text-align: left;
	}

	th,
	td {
		padding: var(--space-3);
		border-bottom: 1px solid var(--rule);
		vertical-align: top;
		overflow-wrap: anywhere;
	}

	th {
		font-weight: var(--weight-medium);
	}

	thead {
		background: var(--wash);
	}

	tbody th {
		width: 30%;
	}

	.note {
		margin-top: var(--space-4);
		color: var(--ink-muted);
		font-size: var(--text-s);
	}

	footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: var(--space-4);
		margin-top: 3rem;
		padding-top: var(--space-6);
		border-top: 1px solid var(--rule);
	}

	.skip {
		position: fixed;
		top: var(--space-2);
		left: var(--space-2);
		z-index: 1;
		padding: var(--space-2) var(--space-3);
		transform: translateY(-200%);
		background: var(--ink);
		color: var(--paper);
	}

	.skip:focus {
		transform: none;
	}

	@media (max-width: 30rem) {
		main {
			padding: 2rem var(--space-4) 3rem;
		}

		.topbar-inner {
			padding-inline: var(--space-4);
		}

		th,
		td {
			padding: var(--space-2);
		}

		.fields-table tbody th {
			width: 9rem;
		}
	}
</style>
