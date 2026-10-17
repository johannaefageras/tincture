<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { prefersReducedMotion } from 'svelte/motion';
	import { slide } from 'svelte/transition';
	import { asset } from '$app/paths';
	import {
		BUILT_IN_PALETTES,
		DEFAULT_PALETTE,
		PALETTE_STORAGE_KEY,
		paletteColors,
		parsePalette,
		parseSavedPalette,
		serializePalette,
		type Palette
	} from '#lib/palette.ts';
	import Icon from './Icon.svelte';
	import PaletteChooser from './PaletteChooser.svelte';
	import PaletteGrid from './PaletteGrid.svelte';

	interface Props {
		palette: Palette;
		compact?: boolean;
		active: string | null;
		suggested: string | null;
		hasArtwork: boolean;
		canMatch: boolean;
		onmatch: () => void;
		onpick: (target: string) => void;
		onpreview: (target: string | null) => void;
	}

	let { palette = $bindable(), compact = false, active, suggested, hasArtwork, canMatch, onmatch, onpick, onpreview }: Props = $props();
	let input: HTMLInputElement | undefined = $state();
	let importing = $state(false);
	let feedback = $state('');
	let feedbackTimer: ReturnType<typeof setTimeout> | undefined;
	let problem = $state(false);
	let hasSaved = $state(false);
	let tools: HTMLDetailsElement | undefined = $state();
	let toolsSummary: HTMLElement | undefined = $state();
	let toolsOpen = $state(false);

	function closeTools() {
		toolsOpen = false;
		toolsSummary?.focus();
	}

	function dismissTools(event: PointerEvent) {
		if (toolsOpen && event.target instanceof Node && !tools?.contains(event.target)) {
			toolsOpen = false;
		}
	}

	function onToolsKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape' && toolsOpen) {
			event.preventDefault();
			event.stopPropagation();
			closeTools();
		}
	}

	const count = $derived(paletteColors(palette).length);
	const isDefault = $derived(serializePalette(palette) === serializePalette(DEFAULT_PALETTE));

	function clearFeedback() {
		clearTimeout(feedbackTimer);
		feedback = '';
	}

	function showFeedback(message: string, isProblem = false) {
		clearTimeout(feedbackTimer);
		problem = isProblem;
		feedback = message;
		feedbackTimer = setTimeout(clearFeedback, 4000);
	}

	function feedbackExit(node: Element) {
		const collapse = slide(node, { duration: prefersReducedMotion.current ? 0 : 300 });
		return {
			...collapse,
			css: (t: number, u: number) => `${collapse.css?.(t, u)};opacity: ${t}`
		};
	}

	onDestroy(() => clearTimeout(feedbackTimer));

	onMount(() => {
		let saved: string | null;
		try {
			saved = localStorage.getItem(PALETTE_STORAGE_KEY);
		} catch {
			// Recoloring still works when browser storage is unavailable.
			return;
		}
		if (saved === null) return;
		hasSaved = true;
		try {
			palette = parseSavedPalette(saved);
		} catch {
			showFeedback('The saved palette could not be read. Using the default palette; import your file again.', true);
		}
	});

	function replace(next: Palette, message: string, restore = false) {
		clearFeedback();
		onpreview(null);
		palette = next;
		let storageProblem = false;
		try {
			if (restore) localStorage.removeItem(PALETTE_STORAGE_KEY);
			else localStorage.setItem(PALETTE_STORAGE_KEY, serializePalette(next));
			hasSaved = !restore;
		} catch {
			storageProblem = true;
			message += ' Browser storage is unavailable, so this change may not be remembered after a refresh.';
		}
		if (message) showFeedback(message, storageProblem);
	}

	function choosePreset(id: string) {
		const preset = BUILT_IN_PALETTES.find((preset) => preset.id === id);
		if (preset) replace(preset.palette, '', preset.palette === DEFAULT_PALETTE);
	}

	async function importFile() {
		const file = input?.files?.[0];
		if (input) input.value = '';
		if (!file) return;
		importing = true;
		clearFeedback();
		try {
			const next = parsePalette(await file.text());
			replace(next, `Imported “${next.name}”.`);
		} catch (cause) {
			showFeedback(cause instanceof Error ? cause.message : 'That palette file could not be read.', true);
		} finally {
			importing = false;
		}
	}

	function exportFile() {
		const filename = palette.name.replace(/[^\p{L}\p{N}._-]+/gu, '-').replace(/^-+|-+$/g, '') || 'palette';
		const url = URL.createObjectURL(new Blob([serializePalette(palette)], { type: 'application/json' }));
		const link = document.createElement('a');
		link.href = url;
		link.download = `${filename}.json`;
		link.click();
		setTimeout(() => URL.revokeObjectURL(url), 1000);
		showFeedback(`Exported “${palette.name}”.`);
	}
</script>

<svelte:window onpointerdown={dismissTools} />

<section class="panel" class:compact aria-labelledby="palette-title">
	<header>
		<p id="palette-title" class="eyebrow">Palette</p>
		<PaletteChooser
			{palette}
			disabled={importing}
			onchange={choosePreset}
			onopen={() => { toolsOpen = false; onpreview(null); }}
		/>
		<p class="summary">{count} {count === 1 ? 'color' : 'colors'} · {palette.groups.length} {palette.groups.length === 1 ? 'group' : 'groups'}</p>
		{#if hasArtwork}
			<div class="apply-palette">
				<button
					type="button"
					class="button apply"
					disabled={!canMatch}
					title={canMatch ? `Match off-palette colors to ${palette.name}` : `All artwork colors are already on ${palette.name}`}
					onclick={onmatch}
				>
					Match to {palette.name}
				</button>
				<p class="apply-hint">Choosing a palette keeps your current colors.</p>
			</div>
		{/if}
		<details class="tools" bind:this={tools} bind:open={toolsOpen}>
			<summary bind:this={toolsSummary} onkeydown={onToolsKeydown}>
				<span>Palette tools</span>
				<Icon name={toolsOpen ? 'caret-up' : 'caret-down'} />
			</summary>
			<div class="tools-panel">
				<button type="button" disabled={importing} onkeydown={onToolsKeydown} onclick={() => { closeTools(); input?.click(); }}>
					<Icon name="import" />{importing ? 'Importing…' : 'Import palette'}
				</button>
				<button type="button" onkeydown={onToolsKeydown} onclick={() => { closeTools(); exportFile(); }}>
					<Icon name="download" />Export palette
				</button>
				<a href={asset('palette-template.json')} download onkeydown={onToolsKeydown} onclick={closeTools}>
					<Icon name="document" />Download template
				</a>
				<button type="button" class="restore" disabled={(isDefault && !hasSaved) || importing} onkeydown={onToolsKeydown} onclick={() => { closeTools(); replace(DEFAULT_PALETTE, 'Default palette restored.', true); }}>
					<Icon name="undo" />Restore default
				</button>
			</div>
		</details>
		{#if feedback}
			<p class="feedback" class:problem role={problem ? 'alert' : 'status'} out:feedbackExit>{feedback}</p>
		{/if}
		<input bind:this={input} type="file" hidden accept=".json,application/json" onchange={importFile} />
	</header>
	<PaletteGrid {palette} {compact} {active} {suggested} {onpick} {onpreview} />
</section>

<style>
	.panel {
		display: flex;
		flex-direction: column;
		min-height: 100%;
		background: var(--paper);
	}

	header {
		flex: none;
		padding: var(--space-3);
		border-bottom: 1px solid var(--rule);
	}

	.eyebrow,
	.summary {
		color: var(--ink-muted);
		font-size: var(--text-s);
	}

	.summary {
		margin-top: 6px;
	}

	.apply-palette {
		margin-top: var(--space-3);
	}

	.apply {
		justify-content: center;
		width: 100%;
		min-height: 2.75rem;
		overflow-wrap: anywhere;
	}

	.apply-hint {
		margin-top: var(--space-2);
		color: var(--ink-muted);
		font-size: var(--text-s);
		line-height: 1.4;
	}

	.tools {
		position: relative;
		margin-top: var(--space-3);
	}

	summary {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-2);
		min-height: 2rem;
		padding: 0.375rem var(--space-2);
		border: 1px solid var(--rule);
		border-radius: var(--radius);
		font-size: var(--text-s);
		font-weight: var(--weight-medium);
		list-style: none;
		cursor: pointer;
	}

	summary::-webkit-details-marker {
		display: none;
	}

	summary:hover,
	.tools[open] summary {
		border-color: var(--ink);
	}

	.tools-panel {
		position: absolute;
		z-index: 2;
		top: calc(100% + var(--space-1));
		inset-inline: 0;
		padding: var(--space-1);
		border: 1px solid var(--rule);
		border-radius: var(--radius);
		background: var(--paper);
		box-shadow: 0 4px 12px var(--wash-strong);
	}

	.tools-panel button,
	.tools-panel a {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		width: 100%;
		min-height: 2rem;
		padding: var(--space-2) var(--space-1);
		border: 0;
		border-radius: var(--radius);
		background: none;
		color: var(--ink);
		font-size: var(--text-s);
		line-height: 1.25;
		text-align: left;
		text-decoration: none;
	}

	.tools-panel button:hover:not(:disabled),
	.tools-panel a:hover {
		background: var(--wash);
	}

	.tools-panel .restore {
		margin-top: var(--space-1);
		border-top: 1px solid var(--rule);
		border-radius: 0;
	}

	.tools-panel button:disabled {
		color: var(--ink-muted);
		cursor: default;
	}

	.feedback {
		margin-top: var(--space-2);
		font-size: var(--text-s);
		overflow-wrap: anywhere;
	}

	.feedback.problem {
		padding: var(--space-2);
		border-left: 2px solid var(--ink);
		background: var(--wash);
	}

	.panel.compact {
		height: 100%;
		min-height: 0;
		--palette-choice-margin: 0;
	}

	.compact header {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 8rem;
		gap: var(--space-2);
	}

	.compact .eyebrow,
	.compact .summary,
	.compact .apply-hint {
		display: none;
	}

	.compact .tools {
		grid-column: 2;
		grid-row: 1;
		align-self: start;
		margin: 0;
	}

	.compact .apply-palette,
	.compact .feedback {
		grid-column: 1 / -1;
		margin: 0;
	}

	.compact .tools-panel {
		position: fixed;
		z-index: 6;
		top: auto;
		bottom: max(var(--space-3), env(safe-area-inset-bottom));
		inset-inline: var(--space-3);
		max-height: calc(100dvh - 1.5rem);
		overflow-y: auto;
	}

	@media (min-width: 32rem) and (max-width: 56rem) and (max-height: 30rem) {
		.compact .tools-panel {
			inset-inline-start: calc(50% + var(--space-3));
		}
	}

	@media (max-height: 24rem) {
		.panel.compact {
			display: block;
			overflow-y: auto;
			overscroll-behavior: contain;
		}
	}

	@media (max-width: 56rem), (pointer: coarse) {
		summary,
		.tools-panel button,
		.tools-panel a {
			min-height: 2.75rem;
		}
	}
</style>
