<script lang="ts">
	import { tick } from 'svelte';
	import { resolve } from '$app/paths';
	import brandMark from '#lib/assets/favicon.svg';
	import crotonSvg from '#lib/assets/croton-v2.svg?raw';
	import { createMatcher } from '#lib/color.ts';
	import ColorList, { type Row } from '#lib/components/ColorList.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import PalettePanel from '#lib/components/PalettePanel.svelte';
	import Stage, { type Backdrop } from '#lib/components/Stage.svelte';
	import { DEFAULT_PALETTE, NONE, paletteColors, type Palette } from '#lib/palette.ts';
	import type { DocColor, Mapping, RecolorDoc } from '#lib/svg-doc.ts';

	let stage: Stage | undefined = $state();
	let fileInput: HTMLInputElement | undefined = $state();
	let palette = $state.raw<Palette>(DEFAULT_PALETTE);
	const swatches = $derived(paletteColors(palette));
	const paletteSet = $derived(new Set(swatches));
	const inPalette = (hex: string) => paletteSet.has(hex.toUpperCase());

	let doc = $state.raw<RecolorDoc | null>(null);
	let fileName = $state('');
	const fileStem = $derived(fileName.replace(/\.[^.]+$/, '') || 'recolored');
	let editingName = $state(false);
	let nameDraft = $state('');
	let nameInput: HTMLInputElement | undefined = $state();
	let nameButton: HTMLButtonElement | undefined = $state();
	let colors = $state.raw<DocColor[]>([]);
	const matchColor = $derived(createMatcher(swatches, colors.map((color) => color.hex)));

	// Every change is a new mapping, so undo is just stepping back through them.
	let history = $state.raw<Mapping[]>([{}]);
	let cursor = $state(0);
	const mapping = $derived(history[cursor]);

	let selected = $state.raw<string[]>([]);
	let anchor: string | null = null;
	/** Palette swatch under the pointer: shown on the artwork before it is applied. */
	let previewTarget = $state<string | null>(null);
	/** Row under the pointer: its shapes are pointed out on the artwork. */
	let located = $state<string | null>(null);

	let backdrop = $state<Backdrop>('white');
	let dragging = $state(false);
	let notice = $state('');
	let noticeTimer: ReturnType<typeof setTimeout> | undefined;

	function say(message: string) {
		notice = message;
		clearTimeout(noticeTimer);
		noticeTimer = setTimeout(() => (notice = ''), 5000);
	}

	const rows = $derived(
		colors.map((color): Row => {
			const target = mapping[color.key];
			const current = target ?? color.hex;
			return {
				...color,
				current,
				changed: target !== undefined,
				resolved: current === NONE || inPalette(current)
			};
		})
	);

	const selectedRows = $derived(rows.filter((row) => selected.includes(row.key)));

	/** The swatch to mark in the palette: where the whole selection currently points. */
	const activeSwatch = $derived.by(() => {
		const [first] = selectedRows;
		if (!first || !first.resolved) return null;
		return selectedRows.every((row) => row.current === first.current) ? first.current : null;
	});

	const suggestedSwatch = $derived.by(() => {
		if (selectedRows.length !== 1 || inPalette(selectedRows[0].hex)) return null;
		return matchColor(selectedRows[0].hex);
	});

	// Keep the artwork in step with the mapping, plus the swatch being previewed.
	$effect(() => {
		if (!doc) return;
		if (previewTarget && selected.length) {
			const preview = { ...mapping };
			for (const key of selected) preview[key] = previewTarget;
			doc.apply(preview);
		} else {
			doc.apply(mapping);
		}
	});

	$effect(() => {
		doc?.locate(located ? [located] : null);
	});

	// --- Opening files -------------------------------------------------------

	function loadSvg(source: string, name: string): boolean {
		if (!stage) return false;
		try {
			const next = stage.mount(source);
			doc = next;
			colors = next.colors;
		} catch (cause) {
			say(cause instanceof Error ? cause.message : 'That file could not be opened.');
			return false;
		}
		fileName = name;
		editingName = false;
		history = [{}];
		cursor = 0;
		selected = [];
		anchor = null;
		previewTarget = null;
		located = null;
		notice = '';
		return true;
	}

	async function openFile(file: File) {
		const isSvg = file.type === 'image/svg+xml' || /\.svg$/i.test(file.name);
		if (isSvg) loadSvg(await file.text(), file.name);
		else say('Tincture only opens SVG files.');
	}

	/** Back to the empty state. Swaps that were not downloaded or copied are gone. */
	function closeFile() {
		stage?.clear();
		doc = null;
		colors = [];
		fileName = '';
		editingName = false;
		history = [{}];
		cursor = 0;
		selected = [];
		anchor = null;
		previewTarget = null;
		located = null;
		notice = '';
	}

	// --- Renaming the export -------------------------------------------------

	async function beginRename() {
		nameDraft = fileStem;
		editingName = true;
		await tick();
		nameInput?.focus();
		nameInput?.select();
	}

	function finishRename(save = true) {
		if (!editingName) return;
		editingName = false;
		// Accept a pasted full SVG filename without duplicating the fixed suffix.
		const stem = nameDraft.trim().replace(/\.svg$/i, '').trim();
		if (save && stem) fileName = `${stem}.svg`;
	}

	async function onNameKeydown(event: KeyboardEvent) {
		if (event.isComposing) return;
		if (event.key === 'Enter' || event.key === 'Escape') {
			event.preventDefault();
			finishRename(event.key === 'Enter');
			await tick();
			nameButton?.focus();
		} else if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
			event.preventDefault();
			download();
		}
	}

	// --- Changing colors -----------------------------------------------------

	function commit(next: Mapping) {
		const before = JSON.stringify(Object.entries(mapping).sort());
		const after = JSON.stringify(Object.entries(next).sort());
		if (before === after) return;
		history = [...history.slice(0, cursor + 1), next];
		cursor = history.length - 1;
	}

	function pick(target: string) {
		if (!doc) return;
		if (!selected.length) {
			say('Select a color in the SVG first, then pick its replacement.');
			return;
		}
		const next = { ...mapping };
		for (const row of selectedRows) {
			// Picking a color's own original value is the same as putting it back.
			if (target === row.hex) delete next[row.key];
			else next[row.key] = target;
		}
		commit(next);
	}

	function matchAll() {
		const next = { ...mapping };
		for (const row of rows) {
			if (row.resolved) continue;
			const match = matchColor(row.hex);
			if (match) next[row.key] = match;
		}
		commit(next);
	}

	function resetOne(key: string) {
		const next = { ...mapping };
		delete next[key];
		commit(next);
	}

	const undo = () => (cursor = Math.max(0, cursor - 1));
	const redo = () => (cursor = Math.min(history.length - 1, cursor + 1));

	// --- Selecting -----------------------------------------------------------

	function select(key: string, event: { shiftKey: boolean; metaKey: boolean; ctrlKey: boolean }) {
		const order = rows.map((row) => row.key);
		if (event.shiftKey && anchor && order.includes(anchor)) {
			const from = order.indexOf(anchor);
			const to = order.indexOf(key);
			selected = order.slice(Math.min(from, to), Math.max(from, to) + 1);
			return;
		}
		if (event.metaKey || event.ctrlKey) {
			selected = selected.includes(key) ? selected.filter((k) => k !== key) : [...selected, key];
		} else {
			selected = [key];
		}
		anchor = key;
	}

	function pickOnCanvas(key: string | null, event: MouseEvent) {
		if (key && colors.some((color) => color.key === key)) select(key, event);
		else if (!event.shiftKey && !event.metaKey && !event.ctrlKey) selected = [];
	}

	function step(direction: 1 | -1) {
		if (!rows.length) return;
		const last = selected.at(-1);
		const index = last ? rows.findIndex((row) => row.key === last) : -1;
		const next = index === -1 ? (direction === 1 ? 0 : rows.length - 1) : index + direction;
		const row = rows[Math.min(rows.length - 1, Math.max(0, next))];
		selected = [row.key];
		anchor = row.key;
	}

	// --- Getting the result out ----------------------------------------------

	function serialize(): string | null {
		if (!doc) return null;
		// Export exactly what was applied, without a hover preview or pointing-out in it.
		doc.apply(mapping);
		doc.locate(null);
		return doc.serialize();
	}

	const exportName = () => `${fileStem}.svg`;

	function download() {
		finishRename();
		const svg = serialize();
		if (svg === null) return;
		const name = exportName();
		const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
		const link = document.createElement('a');
		link.href = url;
		link.download = name;
		link.click();
		setTimeout(() => URL.revokeObjectURL(url), 1000);
		closeFile();
		say(`Downloaded ${name}`);
	}

	async function copy() {
		const svg = serialize();
		if (svg === null) return;
		try {
			await navigator.clipboard.writeText(svg);
			say('Copied the SVG code');
		} catch {
			say('The browser blocked copying. Use Download SVG instead.');
		}
	}

	// --- Window-level input --------------------------------------------------

	const isTyping = (target: EventTarget | null) =>
		target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement;

	function onKeydown(event: KeyboardEvent) {
		if (isTyping(event.target)) return;
		const command = event.metaKey || event.ctrlKey;
		const key = event.key.toLowerCase();
		if (command && key === 'z') {
			event.preventDefault();
			if (event.shiftKey) redo();
			else undo();
		} else if (command && key === 's') {
			event.preventDefault();
			download();
		} else if (key === 'escape') {
			selected = [];
		} else if (doc && (key === 'arrowdown' || key === 'arrowup')) {
			event.preventDefault();
			step(key === 'arrowdown' ? 1 : -1);
		}
	}

	function onPaste(event: ClipboardEvent) {
		if (isTyping(event.target)) return;
		const file = event.clipboardData?.files[0];
		if (file) {
			openFile(file);
			return;
		}
		const text = event.clipboardData?.getData('text/plain') ?? '';
		if (text.includes('<svg')) loadSvg(text, 'pasted.svg');
	}

	const carriesFiles = (event: DragEvent) => event.dataTransfer?.types.includes('Files') ?? false;

	function onDragOver(event: DragEvent) {
		if (!carriesFiles(event)) return;
		event.preventDefault();
		dragging = true;
	}

	function onDragLeave(event: DragEvent) {
		if (event.relatedTarget === null) dragging = false;
	}

	function onDrop(event: DragEvent) {
		if (!carriesFiles(event)) return;
		event.preventDefault();
		dragging = false;
		const file = event.dataTransfer?.files[0];
		if (file) openFile(file);
	}

	function onChosen() {
		const file = fileInput?.files?.[0];
		if (file) openFile(file);
		if (fileInput) fileInput.value = '';
	}
</script>

<svelte:head>
	<title>{fileName ? `${fileName} – Tincture` : 'Tincture'}</title>
</svelte:head>

<svelte:window
	onkeydown={onKeydown}
	onpaste={onPaste}
	ondragover={onDragOver}
	ondragleave={onDragLeave}
	ondrop={onDrop}
/>

<div class="app">
	<header class="bar">
		<div class="identity">
			<a class="brand display" href={resolve('/')} aria-label="Tincture home">
				<img src={brandMark} width="28" height="28" alt="" />
				<strong>Tincture</strong>
			</a>
			<h1>
				{#if doc}
					{#if editingName}
						<span class="filename-editor">
							<input
								bind:this={nameInput}
								bind:value={nameDraft}
								aria-label="File name (without extension)"
								aria-describedby="filename-extension"
								size={Math.max(1, nameDraft.length)}
								spellcheck="false"
								autocomplete="off"
								onkeydown={onNameKeydown}
								onblur={() => finishRename()}
							/>
							<span id="filename-extension" class="extension">.svg</span>
						</span>
					{:else}
						<button
							bind:this={nameButton}
							type="button"
							class="filename-button"
							aria-label={`Rename ${fileName}`}
							title="Rename file"
							onclick={beginRename}
						>
							<span class="filename-stem">{fileStem}</span><span class="extension">.svg</span>
						</button>
					{/if}
				{:else}
					<span class="filename-placeholder">No file open</span>
				{/if}
			</h1>
		</div>
		<div class="actions">
			<button type="button" class="button icon-only" aria-label="Undo" title="Undo (⌘Z)" disabled={cursor === 0} onclick={undo}>
				<Icon name="undo" />
			</button>
			<button
				type="button"
				class="button icon-only"
				aria-label="Redo"
				title="Redo (⇧⌘Z)"
				disabled={cursor >= history.length - 1}
				onclick={redo}
			>
				<Icon name="redo" />
			</button>
			<button type="button" class="button" onclick={() => fileInput?.click()}>
				<Icon name="open" />Open
			</button>
			<button type="button" class="button" disabled={!doc} onclick={closeFile}>
				<Icon name="reset" />Close file
			</button>
			<button type="button" class="button" disabled={!doc} onclick={copy}>
				<Icon name="copy" />Copy SVG
			</button>
			<button type="button" class="button primary" disabled={!doc} title="Download SVG (⌘S)" onclick={download}>
				<Icon name="download" />Download SVG
			</button>
		</div>
		<input
			bind:this={fileInput}
			type="file"
			hidden
			accept=".svg,image/svg+xml"
			onchange={onChosen}
		/>
	</header>

	<main class="work">
		<Stage bind:this={stage} {backdrop} onbackdrop={(next) => (backdrop = next)} onpick={pickOnCanvas}>
			{#if !doc}
				<div class="empty">
					<p class="lead display">Drop an SVG here to recolor it.</p>
					<div class="choices">
						<button type="button" class="button primary" onclick={() => fileInput?.click()}>Choose a file</button>
						<button type="button" class="button" onclick={() => loadSvg(crotonSvg, 'croton-v2.svg')}>
							Try the example
						</button>
					</div>
					<p class="hint">You can also paste SVG code with ⌘V.</p>
				</div>
			{/if}
		</Stage>

		{#if dragging}<div class="drop display" aria-hidden="true">Drop to open</div>{/if}
		<p class="notice" class:shown={notice !== ''} role="status">{notice}</p>
	</main>

	<aside class="found">
		{#if doc}
			<ColorList
				{rows}
				{selected}
				onselect={select}
				onhover={(key) => (located = key)}
				onreset={resetOne}
				onmatchall={matchAll}
				onresetall={() => commit({})}
			/>
		{:else}
			<p class="placeholder">The colors found in your SVG are listed here.</p>
		{/if}
	</aside>

	<aside class="palette">
		<PalettePanel
			bind:palette
			active={activeSwatch}
			suggested={suggestedSwatch}
			onpick={pick}
			onpreview={(target) => (previewTarget = target)}
		/>
	</aside>

	<footer class="footer">
		<a href={resolve('/docs/palettes')} target="_blank" rel="noopener">
			<span>Palette format guide<span class="visually-hidden"> (opens in a new tab)</span></span>
			<Icon name="document" />
		</a>
	</footer>
</div>

<style>
	.app {
		display: grid;
		grid-template-columns: 12rem minmax(0, 1fr) 21rem;
		grid-template-rows: auto minmax(0, 1fr) auto;
		grid-template-areas:
			'palette bar bar'
			'palette work found'
			'footer footer footer';
		height: 100dvh;
		min-height: 36rem;
	}

	.palette {
		grid-area: palette;
		min-width: 0;
		min-height: 0;
		overflow-y: auto;
		border-right: 1px solid var(--rule);
	}

	.bar {
		grid-area: bar;
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-4);
		min-height: 5rem;
		padding: var(--space-2) var(--space-4);
		border-bottom: 1px solid var(--rule);
		background: var(--paper);
	}

	.identity {
		display: flex;
		flex: 1 1 9rem;
		flex-direction: column;
		align-items: flex-start;
		gap: 2px;
		min-width: 0;
	}

	.brand {
		display: inline-flex;
		flex: none;
		align-items: center;
		gap: var(--space-2);
		height: 2rem;
		color: var(--ink);
		font-size: 1.875rem;
		font-weight: var(--weight-regular);
		line-height: 1;
		letter-spacing: -0.04em;
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

	h1 {
		width: 100%;
		min-width: 0;
		font-size: 0.875rem;
		font-weight: var(--weight-medium);
		white-space: nowrap;
	}

	.filename-placeholder {
		display: flex;
		align-items: center;
		height: 1.5rem;
		color: var(--ink-muted);
		font-weight: var(--weight-regular);
	}

	.filename-button,
	.filename-editor {
		display: flex;
		align-items: center;
		max-width: 100%;
		height: 1.5rem;
		border-radius: var(--radius);
	}

	.filename-button {
		padding: 0;
		border: 0;
		background: none;
		font: inherit;
		text-align: left;
		cursor: text;
	}

	.filename-stem {
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.filename-button:hover .filename-stem {
		text-decoration: underline dotted;
		text-underline-offset: 4px;
	}

	.extension {
		flex: none;
		color: var(--ink-muted);
	}

	.filename-editor {
		padding-inline: var(--space-1);
		border: 1px solid var(--ink);
		background: var(--paper);
	}

	.filename-editor:focus-within {
		outline: 2px solid var(--ink);
		outline-offset: -1px;
	}

	.filename-editor input {
		min-width: 0;
		padding: 0;
		border: 0;
		outline: none;
		background: none;
		font: inherit;
	}

	.actions {
		display: flex;
		flex: 0 1 auto;
		flex-wrap: wrap;
		max-width: 100%;
		gap: var(--space-2);
	}

	.work {
		grid-area: work;
		position: relative;
		min-width: 0;
		min-height: 0;
	}

	.found {
		grid-area: found;
		min-width: 0;
		min-height: 0;
		border-left: 1px solid var(--rule);
		background: var(--paper);
	}

	.footer {
		grid-area: footer;
		display: flex;
		align-items: center;
		justify-content: flex-end;
		padding: var(--space-2) var(--space-4);
		border-top: 1px solid var(--rule);
		background: var(--bench);
		font-size: var(--text-s);
	}

	.footer a {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		padding-block: var(--space-1);
		color: var(--ink);
		font-weight: var(--weight-medium);
		text-decoration: underline;
		text-decoration-color: var(--rule);
		text-underline-offset: 3px;
	}

	.footer a:hover,
	.footer a:focus-visible {
		text-decoration-color: currentColor;
	}

	.placeholder {
		padding: var(--space-4);
		color: var(--ink-muted);
		font-size: var(--text-s);
	}

	.empty {
		position: absolute;
		inset: 0;
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		justify-content: safe center;
		gap: var(--space-2);
		overflow-y: auto;
		padding: var(--space-6) clamp(var(--space-6), 10%, 6rem);
		background: var(--bench);
	}

	.lead {
		font-size: 1.75rem;
		font-weight: var(--weight-semibold);
		line-height: 1.15;
		letter-spacing: -0.01em;
	}

	.choices {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2);
		margin-top: var(--space-4);
	}

	.hint {
		margin-top: var(--space-2);
		color: var(--ink-muted);
		font-size: var(--text-s);
	}

	.drop {
		position: absolute;
		inset: var(--space-3);
		display: grid;
		place-items: center;
		border: 2px dashed var(--ink);
		background: color-mix(in srgb, var(--bench) 90%, transparent);
		font-size: var(--text-l);
		font-weight: var(--weight-semibold);
		pointer-events: none;
	}

	.notice {
		position: absolute;
		right: var(--space-3);
		bottom: var(--space-3);
		max-width: calc(100% - 16rem);
		padding: var(--space-2) var(--space-3);
		border-radius: var(--radius);
		background: var(--ink);
		color: var(--paper);
		font-size: var(--text-s);
		font-weight: var(--weight-medium);
		opacity: 0;
		pointer-events: none;
		transition: opacity 120ms;
	}

	.notice.shown {
		opacity: 1;
	}

	/* Narrow the sidebars before the workspace needs to stack. */
	@media (max-width: 70rem) {
		.app {
			grid-template-columns: 11rem minmax(0, 1fr) 18rem;
		}

		.notice {
			max-width: calc(100% - 1.5rem);
			bottom: 4.5rem;
		}
	}

	@media (max-width: 56rem) {
		.app {
			grid-template-columns: minmax(0, 1fr);
			grid-template-rows: auto clamp(18rem, 50dvh, 34rem) auto auto auto;
			grid-template-areas: 'bar' 'work' 'found' 'palette' 'footer';
			height: auto;
			min-height: 100dvh;
		}

		.actions {
			flex: 1 1 100%;
		}

		.found {
			border-left: 0;
			border-top: 1px solid var(--rule);
		}

		.palette {
			border-right: 0;
			border-top: 1px solid var(--rule);
		}

		.empty {
			padding: var(--space-6);
		}
	}

	@media (max-width: 56rem), (pointer: coarse) {
		.filename-button,
		.filename-editor {
			height: 2.75rem;
		}

		.filename-editor input {
			font-size: 1rem;
		}

		.footer a {
			min-height: 2.75rem;
		}
	}
</style>
