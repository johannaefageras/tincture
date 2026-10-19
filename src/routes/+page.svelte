<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { resolve } from '$app/paths';
	import brandMark from '#lib/assets/favicon.svg';
	import crotonSvg from '#lib/assets/croton-v2.svg?raw';
	import { createMatcher } from '#lib/color.ts';
	import ColorList, { type Row } from '#lib/components/ColorList.svelte';
	import DownloadControls from '#lib/components/DownloadControls.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import PalettePanel from '#lib/components/PalettePanel.svelte';
	import Stage, { type Backdrop } from '#lib/components/Stage.svelte';
	import { DEFAULT_PALETTE, NONE, paletteColors, type Palette } from '#lib/palette.ts';
	import type { Mapping, RecolorDoc } from '#lib/svg-doc.ts';

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
	let narrow = $state(false);
	const mobileEditor = $derived(narrow && doc !== null);
	type MobilePanel = 'colors' | 'palette';
	let mobilePanel = $state<MobilePanel>('colors');
	let colorsTab: HTMLButtonElement | undefined = $state();
	let paletteTab: HTMLButtonElement | undefined = $state();
	let fileMenu: HTMLDetailsElement | undefined = $state();
	let fileMenuSummary: HTMLElement | undefined = $state();
	let fileMenuOpen = $state(false);

	onMount(() => {
		const media = window.matchMedia('(max-width: 56rem)');
		const update = () => {
			narrow = media.matches;
			fileMenuOpen = false;
			previewTarget = null;
			located = null;
		};
		update();
		media.addEventListener('change', update);
		return () => media.removeEventListener('change', update);
	});

	async function showPanel(panel: MobilePanel, focus = false) {
		mobilePanel = panel;
		previewTarget = null;
		located = null;
		if (focus) {
			await tick();
			(panel === 'colors' ? colorsTab : paletteTab)?.focus();
		}
	}

	function onTabKeydown(event: KeyboardEvent, panel: MobilePanel) {
		let next: MobilePanel;
		if (event.key === 'Home') next = 'colors';
		else if (event.key === 'End') next = 'palette';
		else if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
			next = panel === 'colors' ? 'palette' : 'colors';
		} else return;
		event.preventDefault();
		event.stopPropagation();
		showPanel(next, true);
	}

	function closeFileMenu() {
		fileMenuOpen = false;
		fileMenuSummary?.focus();
	}

	function onFileMenuKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape' && fileMenuOpen) {
			event.preventDefault();
			event.stopPropagation();
			closeFileMenu();
		}
	}

	function dismissFileMenu(event: PointerEvent) {
		if (fileMenuOpen && event.target instanceof Node && !fileMenu?.contains(event.target)) {
			fileMenuOpen = false;
		}
	}

	// Color changes and area separation share the same undo history.
	interface Edit {
		mapping: Mapping;
		separated: string[];
	}
	let history = $state.raw<Edit[]>([{ mapping: {}, separated: [] }]);
	let cursor = $state(0);
	const mapping = $derived(history[cursor].mapping);
	const separated = $derived(history[cursor].separated);
	const colors = $derived(doc?.listColors(separated) ?? []);
	const matchColor = $derived(createMatcher(swatches, colors.map((color) => color.hex)));

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
		if (!first) return null;
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
			doc.apply(preview, separated);
		} else {
			doc.apply(mapping, separated);
		}
	});

	$effect(() => {
		doc?.locate(located ? [located] : null);
	});

	// Undoing separation can remove the selected area rows.
	$effect(() => {
		const available = new Set(colors.map((color) => color.key));
		if (selected.some((key) => !available.has(key))) {
			selected = selected.filter((key) => available.has(key));
		}
	});

	// --- Opening files -------------------------------------------------------

	function loadSvg(source: string, name: string): boolean {
		if (!stage) return false;
		try {
			const next = stage.mount(source);
			doc = next;
		} catch (cause) {
			say(cause instanceof Error ? cause.message : 'That file could not be opened.');
			return false;
		}
		fileName = name;
		editingName = false;
		fileMenuOpen = false;
		mobilePanel = 'colors';
		history = [{ mapping: {}, separated: [] }];
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
		fileName = '';
		editingName = false;
		fileMenuOpen = false;
		mobilePanel = 'colors';
		history = [{ mapping: {}, separated: [] }];
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
		}
	}

	// --- Changing colors -----------------------------------------------------

	function commit(next: Mapping, nextSeparated = separated) {
		const before = JSON.stringify([Object.entries(mapping).sort(), separated]);
		const after = JSON.stringify([Object.entries(next).sort(), nextSeparated]);
		if (before === after) return;
		history = [...history.slice(0, cursor + 1), { mapping: next, separated: nextSeparated }];
		cursor = history.length - 1;
	}

	function separateAreas(key: string) {
		if (!doc || separated.includes(key)) return;
		const nextSeparated = [...separated, key];
		const areas = doc.listColors(nextSeparated).filter((color) => color.parentKey === key);
		if (areas.length < 2) return;
		const next = { ...mapping };
		// Carry the group's current replacement over without changing the artwork.
		for (const area of areas) {
			if (mapping[key] !== undefined) next[area.key] = mapping[key];
		}
		if (!doc.colors.find((color) => color.key === key)?.stops) delete next[key];
		commit(next, nextSeparated);
		selected = [areas[0].key];
		anchor = areas[0].key;
		previewTarget = null;
		located = null;
		say(`Separated into ${areas.length} areas. Click an area in the artwork or list to recolor it.`);
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
		if (mobileEditor && !event.shiftKey && !event.metaKey && !event.ctrlKey) {
			showPanel('palette', true);
		}
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
		doc.apply(mapping, separated);
		doc.locate(null);
		return doc.serialize();
	}

	const exportName = () => `${fileStem}.svg`;

	function download(closeAfter = true) {
		finishRename();
		previewTarget = null;
		located = null;
		const svg = serialize();
		if (svg === null) return;
		const name = exportName();
		const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
		const link = document.createElement('a');
		link.href = url;
		link.download = name;
		link.click();
		setTimeout(() => URL.revokeObjectURL(url), 1000);
		if (closeAfter) closeFile();
		say(`Downloaded ${name}. ${closeAfter ? 'Ready for the next SVG.' : 'You can keep editing.'}`);
	}

	async function copy() {
		const svg = serialize();
		if (svg === null) return;
		try {
			await navigator.clipboard.writeText(svg);
			say('Copied the SVG code');
		} catch {
			say('The browser blocked copying. Use a download option instead.');
		}
	}

	// --- Window-level input --------------------------------------------------

	const isTyping = (target: EventTarget | null) =>
		target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement;

	function onKeydown(event: KeyboardEvent) {
		if (event.target instanceof Element && event.target.closest('.clr-picker')) return;
		const command = event.metaKey || event.ctrlKey;
		const key = event.key.toLowerCase();
		if (command && key === 's' && (!isTyping(event.target) || event.target === nameInput)) {
			event.preventDefault();
			download(!event.shiftKey);
			return;
		}
		if (isTyping(event.target)) return;
		if (command && key === 'z') {
			event.preventDefault();
			if (event.shiftKey) redo();
			else undo();
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
	onpointerdown={dismissFileMenu}
	onpaste={onPaste}
	ondragover={onDragOver}
	ondragleave={onDragLeave}
	ondrop={onDrop}
/>

<div class="app" class:editing={doc !== null}>
	<header class="bar">
		<div class="identity">
			<a class="brand display" href={resolve('/')} aria-label="Tincture home">
				<img src={brandMark} width="28" height="28" alt="" />
				<strong>Tincture</strong>
			</a>
			<div class="file-heading">
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
				{#if doc}
					<button type="button" class="button icon-only close-file file-action" aria-label="Close file" title="Close file" onclick={closeFile}>
						<Icon name="reset" />
					</button>
				{/if}
			</div>
		</div>
		{#if doc}
			<div class="actions">
				<div class="action-group" role="group" aria-label="Edit history">
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
				</div>
				<div class="action-group file-actions" role="group" aria-label="File actions">
					<button type="button" class="button file-action" onclick={() => fileInput?.click()}>
						<Icon name="open" />Open
					</button>
					<button type="button" class="button file-action" disabled={!doc} onclick={copy}>
						<Icon name="copy" />Copy SVG
					</button>
					<details class="file-menu" bind:this={fileMenu} bind:open={fileMenuOpen}>
						<summary bind:this={fileMenuSummary} aria-label="File actions" onkeydown={onFileMenuKeydown}>File</summary>
						<div class="file-menu-panel">
							<button type="button" onkeydown={onFileMenuKeydown} onclick={() => { closeFileMenu(); fileInput?.click(); }}>
								<Icon name="open" />Open SVG
							</button>
							<button type="button" onkeydown={onFileMenuKeydown} onclick={() => { closeFileMenu(); copy(); }}>
								<Icon name="copy" />Copy SVG
							</button>
							<a href={resolve('/docs/palettes')} target="_blank" rel="noopener" onkeydown={onFileMenuKeydown} onclick={closeFileMenu}>
								<Icon name="document" />Palette guide<span class="visually-hidden"> (opens in a new tab)</span>
							</a>
							<button type="button" onkeydown={onFileMenuKeydown} onclick={closeFile}>
								<Icon name="reset" />Close file
							</button>
						</div>
					</details>
				</div>
				<DownloadControls compact={mobileEditor} onnext={() => download()} onkeep={() => download(false)} />
			</div>
		{/if}
		<input
			bind:this={fileInput}
			type="file"
			hidden
			accept=".svg,image/svg+xml"
			onchange={onChosen}
		/>
	</header>

	<main class="work">
		<Stage bind:this={stage} {backdrop} {selected} onclear={() => { selected = []; located = null; previewTarget = null; }} onbackdrop={(next) => (backdrop = next)} onpick={pickOnCanvas}>
			{#if !doc}
				<div class="empty">
					<p class="lead display">Drop an SVG here to <em>recolor</em> it.</p>
					<div class="choices">
						<button type="button" class="button primary" onclick={() => fileInput?.click()}>
							<Icon name="open" />Open SVG
						</button>
						<button type="button" class="button" onclick={() => loadSvg(crotonSvg, 'croton-v2.svg')}>
							Try the example
						</button>
					</div>
					<p class="hint">You can also paste SVG code with ⌘V.</p>
					<p class="privacy">Your SVG stays in your browser.</p>
				</div>
			{/if}
		</Stage>

		{#if dragging}<div class="drop display" aria-hidden="true">Drop to open</div>{/if}
		<p class="notice" class:shown={notice !== ''} role="status">{notice}</p>
	</main>

	<div class="inspector">
		{#if mobileEditor}
			<div class="mobile-tabs" role="tablist" aria-label="Editing tools">
				<button bind:this={colorsTab} id="mobile-colors-tab" type="button" role="tab" aria-selected={mobilePanel === 'colors'} aria-controls="colors-panel" tabindex={mobilePanel === 'colors' ? 0 : -1} onclick={() => showPanel('colors')} onkeydown={(event) => onTabKeydown(event, 'colors')}>Colors</button>
				<button bind:this={paletteTab} id="mobile-palette-tab" type="button" role="tab" aria-selected={mobilePanel === 'palette'} aria-controls="palette-panel" tabindex={mobilePanel === 'palette' ? 0 : -1} onclick={() => showPanel('palette')} onkeydown={(event) => onTabKeydown(event, 'palette')}>Palette</button>
			</div>
			{#if mobilePanel === 'palette'}
				<div class="selection-context" role="status">
					{#if selectedRows.length === 1}
						<span class="selection-chip" class:removed={selectedRows[0].current === NONE} style:background={selectedRows[0].current === NONE ? null : selectedRows[0].current} aria-hidden="true"></span>
						<span class="selection-copy">
							<span>Replace <strong>{selectedRows[0].current === NONE ? 'None' : selectedRows[0].current}</strong></span>
							<span class="selection-hint">Tap a swatch to apply.</span>
						</span>
					{:else if selectedRows.length}
						<span class="selection-copy">
							<span>Replace <strong>{selectedRows.length} selected colors</strong></span>
							<span class="selection-hint">Tap a swatch to apply to all.</span>
						</span>
					{:else}
						<span>Tap a color in the artwork or Colors.</span>
					{/if}
				</div>
			{/if}
		{/if}
		<aside id="colors-panel" class="found" role={mobileEditor ? 'tabpanel' : undefined} aria-labelledby={mobileEditor ? 'mobile-colors-tab' : undefined} hidden={mobileEditor && mobilePanel !== 'colors'}>
			{#if doc}
				<ColorList
					{rows}
					{selected}
					compact={mobileEditor}
					visible={!mobileEditor || mobilePanel === 'colors'}
					onselect={select}
					onhover={(key) => (located = key)}
					onreset={resetOne}
					onseparate={separateAreas}
					onmatchall={matchAll}
					onresetall={() => commit({})}
				/>
			{:else}
				<section class="getting-started" aria-labelledby="getting-started-title">
					<h2 id="getting-started-title">How it works</h2>
					<ol>
						<li>
							<strong>Select</strong>
							<p>Open an SVG, then click a color in the artwork or color list.</p>
						</li>
						<li>
							<strong>Replace</strong>
							<p>Choose a palette swatch to recolor the matching shapes.</p>
						</li>
						<li>
							<strong>Download</strong>
							<p>Save your recolored SVG when you’re happy with it.</p>
						</li>
					</ol>
				</section>
			{/if}
		</aside>

		<aside id="palette-panel" class="palette" role={mobileEditor ? 'tabpanel' : undefined} aria-labelledby={mobileEditor ? 'mobile-palette-tab' : undefined} hidden={mobileEditor && mobilePanel !== 'palette'}>
			<PalettePanel
				bind:palette
				compact={mobileEditor}
				active={activeSwatch}
				suggested={suggestedSwatch}
				hasArtwork={doc !== null}
				canMatch={rows.some((row) => !row.resolved)}
				onmatch={matchAll}
				onpick={pick}
				onpreview={(target) => (previewTarget = target)}
			/>
		</aside>
	</div>

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
		grid-template-columns: 14rem minmax(0, 1fr) 21rem;
		grid-template-rows: auto minmax(0, 1fr) auto;
		grid-template-areas:
			'palette bar bar'
			'palette work found'
			'footer footer footer';
		height: 100dvh;
		min-height: 36rem;
	}

	.inspector {
		display: contents;
	}

	.file-menu {
		display: none;
	}

	.found[hidden],
	.palette[hidden] {
		display: none;
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
		height: 2.5rem;
		color: var(--ink);
		font-size: 2rem;
		font-weight: var(--weight-regular);
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

	h1 {
		flex: 0 1 auto;
		min-width: 0;
		font-size: 0.875rem;
		font-weight: var(--weight-medium);
		white-space: nowrap;
	}

	.file-heading {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		width: 100%;
		min-width: 0;
	}

	.close-file {
		width: 1.5rem;
		min-height: 1.5rem;
		height: 1.5rem;
		border-color: transparent;
		background: none;
		color: var(--ink-muted);
	}

	.close-file:hover {
		background: var(--wash);
		color: var(--ink);
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

	.action-group {
		display: flex;
		flex: none;
		gap: var(--space-2);
	}

	.file-actions {
		padding-inline-start: var(--space-3);
		border-inline-start: 1px solid var(--rule);
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

	.getting-started {
		padding: var(--space-6);
	}

	.getting-started h2 {
		font-size: var(--text-l);
		font-weight: var(--weight-medium);
	}

	.getting-started ol {
		margin: var(--space-6) 0 0;
		padding-inline-start: 1.25rem;
	}

	.getting-started li {
		padding-inline-start: var(--space-2);
	}

	.getting-started li + li {
		margin-top: var(--space-6);
	}

	.getting-started li::marker {
		color: var(--ink-muted);
		font-family: var(--font-mono);
		font-size: var(--text-s);
	}

	.getting-started strong {
		font-weight: var(--weight-medium);
	}

	.getting-started p {
		margin-top: var(--space-1);
		color: var(--ink-muted);
		font-size: var(--text-s);
		line-height: 1.5;
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
		max-width: 14ch;
		font-size: clamp(3.5rem, 6vw, 5.5rem);
		font-weight: var(--weight-regular);
		line-height: 0.98;
		letter-spacing: -0.02em;
		text-wrap: balance;
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

	.privacy {
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
		font-size: clamp(2.5rem, 4vw, 3rem);
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

		.app.editing {
			grid-template-rows: auto minmax(8rem, 36dvh) minmax(0, 1fr);
			grid-template-areas: 'bar' 'work' 'inspector';
			height: 100dvh;
			min-height: 0;
			overflow: hidden;
		}

		.editing .bar {
			flex-wrap: nowrap;
			gap: var(--space-1);
			min-height: 3.75rem;
			padding: var(--space-2);
			padding-top: max(var(--space-2), env(safe-area-inset-top));
		}

		.editing .identity {
			flex: 1 1 0;
			flex-direction: row;
			align-items: center;
			gap: var(--space-2);
		}

		.editing .brand strong,
		.editing .file-action,
		.editing .footer {
			display: none;
		}

		.editing h1 {
			flex: 1;
			width: auto;
			overflow: hidden;
			font-size: var(--text-s);
		}

		.editing .actions {
			flex: none;
			flex-wrap: nowrap;
			gap: var(--space-1);
		}

		.editing .action-group {
			gap: var(--space-1);
		}

		.editing .file-actions {
			padding: 0;
			border: 0;
		}

		.editing .file-heading {
			flex: 1;
			width: auto;
		}

		.editing .work {
			--stage-canvas-inset: 0.75rem 1rem 3.75rem;
		}

		.editing .inspector {
			grid-area: inspector;
			display: flex;
			flex-direction: column;
			min-height: 0;
			padding-bottom: env(safe-area-inset-bottom);
			overflow: hidden;
			border-top: 1px solid var(--rule);
			background: var(--paper);
		}

		.editing .found,
		.editing .palette {
			flex: 1;
			min-height: 0;
			overflow: hidden;
			border: 0;
		}

		.mobile-tabs {
			flex: none;
			display: grid;
			grid-template-columns: repeat(2, minmax(0, 1fr));
			border-bottom: 1px solid var(--rule);
		}

		.mobile-tabs button {
			min-height: 2.75rem;
			padding: var(--space-2) var(--space-4);
			border: 0;
			background: var(--paper);
			color: var(--ink-muted);
			font-size: var(--text-s);
			font-weight: var(--weight-medium);
		}

		.mobile-tabs button[aria-selected='true'] {
			box-shadow: inset 0 -2px 0 var(--ink);
			color: var(--ink);
		}

		.mobile-tabs button:focus-visible {
			outline-offset: -3px;
		}

		.selection-context {
			flex: none;
			display: flex;
			align-items: center;
			gap: var(--space-2);
			min-height: 2.75rem;
			padding: var(--space-2) var(--space-3);
			border-bottom: 1px solid var(--rule);
			font-size: var(--text-s);
		}

		.selection-context strong {
			font-family: var(--font-mono);
			font-weight: var(--weight-medium);
		}

		.selection-copy {
			display: grid;
			gap: 2px;
		}

		.selection-hint {
			color: var(--ink-muted);
		}

		.selection-chip {
			flex: none;
			width: 1.25rem;
			height: 1.25rem;
			border: 1px solid var(--rule);
			border-radius: var(--radius);
		}

		.selection-chip.removed {
			background: linear-gradient(to top right, transparent 47%, var(--ink) 48% 52%, transparent 53%);
		}

		.editing .file-menu {
			position: relative;
			display: block;
		}

		.file-menu summary {
			min-width: 3.25rem;
			min-height: 2.75rem;
			padding: 0.8125rem var(--space-1);
			border: 1px solid var(--rule);
			border-radius: var(--radius);
			background: var(--paper);
			font-size: var(--text-s);
			font-weight: var(--weight-medium);
			cursor: pointer;
		}

		.file-menu summary::marker {
			font-size: 0.75em;
		}

		.file-menu-panel {
			position: absolute;
			z-index: 5;
			top: calc(100% + var(--space-1));
			inset-inline-end: 0;
			width: 11rem;
			padding: var(--space-1);
			border: 1px solid var(--rule);
			border-radius: var(--radius);
			background: var(--paper);
			box-shadow: 0 4px 12px var(--wash-strong);
		}

		.file-menu-panel button,
		.file-menu-panel a {
			display: flex;
			align-items: center;
			gap: var(--space-2);
			width: 100%;
			min-height: 2.75rem;
			padding: var(--space-2);
			border: 0;
			border-radius: var(--radius);
			background: none;
			color: var(--ink);
			font-size: var(--text-s);
			text-align: left;
			text-decoration: none;
		}

		.file-menu-panel button:hover,
		.file-menu-panel a:hover {
			background: var(--wash);
		}
	}

	@media (max-width: 56rem) and (max-height: 36rem) {
		.app.editing {
			grid-template-rows: auto minmax(6rem, 28dvh) minmax(0, 1fr);
		}

		.editing .work {
			--stage-canvas-inset: 0.5rem 0.75rem 3.5rem;
		}
	}

	@media (min-width: 32rem) and (max-width: 56rem) and (max-height: 30rem) {
		.app.editing {
			grid-template-columns: minmax(0, 1fr) minmax(17.5rem, 1fr);
			grid-template-rows: auto minmax(0, 1fr);
			grid-template-areas: 'bar bar' 'work inspector';
		}

		.editing .inspector {
			border-top: 0;
			border-left: 1px solid var(--rule);
		}
	}

	@media (min-width: 32rem) and (max-width: 40rem) and (max-height: 30rem) {
		.editing .work {
			--stage-canvas-inset: 0.5rem 0.75rem 6.75rem;
		}
	}

	@media (max-width: 56rem), (pointer: coarse) {
		.close-file {
			width: 2.75rem;
			min-height: 2.75rem;
			height: 2.75rem;
		}

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
