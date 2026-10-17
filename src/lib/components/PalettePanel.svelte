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
		serializePalette,
		type Palette
	} from '#lib/palette.ts';
	import PaletteGrid from './PaletteGrid.svelte';

	interface Props {
		palette: Palette;
		active: string | null;
		suggested: string | null;
		onpick: (target: string) => void;
		onpreview: (target: string | null) => void;
	}

	let { palette = $bindable(), active, suggested, onpick, onpreview }: Props = $props();
	let input: HTMLInputElement | undefined = $state();
	let importing = $state(false);
	let feedback = $state('');
	let feedbackTimer: ReturnType<typeof setTimeout> | undefined;
	let problem = $state(false);
	let hasSaved = $state(false);

	const count = $derived(paletteColors(palette).length);
	const isDefault = $derived(serializePalette(palette) === serializePalette(DEFAULT_PALETTE));
	const selectedPreset = $derived(
		BUILT_IN_PALETTES.find(({ palette: preset }) => serializePalette(preset) === serializePalette(palette))
	);

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
			palette = parsePalette(saved);
		} catch {
			showFeedback('The saved palette could not be read. Using the default palette; import your file again.', true);
		}
	});

	function replace(next: Palette, message: string, restore = false) {
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
		showFeedback(message, storageProblem);
	}

	function choosePreset(event: Event) {
		const id = (event.currentTarget as HTMLSelectElement).value;
		const preset = BUILT_IN_PALETTES.find((preset) => preset.id === id);
		if (preset) replace(preset.palette, `Selected “${preset.palette.name}”.`, preset.palette === DEFAULT_PALETTE);
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

<section class="panel" aria-labelledby="palette-title">
	<header>
		<label id="palette-title" class="eyebrow" for="palette-choice">Palette</label>
		<div class="palette-choice">
			<select id="palette-choice" value={selectedPreset?.id ?? ''} disabled={importing} onchange={choosePreset}>
				{#if !selectedPreset}<option value="" disabled>{palette.name} (imported)</option>{/if}
				{#each BUILT_IN_PALETTES as preset (preset.id)}
					<option value={preset.id}>{preset.palette.name}</option>
				{/each}
			</select>
		</div>
		<p class="summary">{count} {count === 1 ? 'color' : 'colors'} · {palette.groups.length} {palette.groups.length === 1 ? 'group' : 'groups'}</p>
		<div class="actions">
			<button type="button" class="button primary import" disabled={importing} onclick={() => input?.click()}>
				{importing ? 'Importing…' : 'Import palette'}
			</button>
			<button type="button" class="button" aria-label="Export palette" onclick={exportFile}>Export</button>
			<a class="button" href={asset('palette-template.json')} download aria-label="Download palette template">Template</a>
		</div>
		<button type="button" class="restore" disabled={(isDefault && !hasSaved) || importing} onclick={() => replace(DEFAULT_PALETTE, 'Default palette restored.', true)}>
			Restore default
		</button>
		{#if feedback}
			<p class="feedback" class:problem role={problem ? 'alert' : 'status'} out:feedbackExit>{feedback}</p>
		{/if}
		<input bind:this={input} type="file" hidden accept=".json,application/json" onchange={importFile} />
	</header>
	<PaletteGrid {palette} {active} {suggested} {onpick} {onpreview} />
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

	.palette-choice {
		position: relative;
		margin-top: var(--space-1);
	}

	.palette-choice::after {
		position: absolute;
		top: 50%;
		inset-inline-end: var(--space-3);
		width: 0.375rem;
		height: 0.375rem;
		border-right: 1.5px solid currentColor;
		border-bottom: 1.5px solid currentColor;
		transform: translateY(-75%) rotate(45deg);
		content: '';
		pointer-events: none;
	}

	select {
		appearance: none;
		display: block;
		width: 100%;
		min-width: 0;
		min-height: 2rem;
		padding: 0.375rem var(--space-2);
		padding-inline-end: 2rem;
		border: 1px solid var(--rule);
		border-radius: var(--radius);
		background: var(--paper);
		font-weight: var(--weight-semibold);
		cursor: pointer;
	}

	select:hover:not(:disabled) {
		border-color: var(--ink);
	}

	.summary {
		margin-top: 6px;
	}

	.actions {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: var(--space-2);
		margin-top: var(--space-3);
	}

	.actions .button {
		justify-content: center;
		padding-inline: var(--space-2);
		text-decoration: none;
	}

	.actions a {
		color: var(--ink);
	}

	.import {
		grid-column: 1 / -1;
	}

	.restore {
		width: 100%;
		min-height: 2rem;
		margin-top: var(--space-1);
		padding: var(--space-1);
		border: 0;
		background: none;
		font-size: var(--text-s);
		text-decoration: underline;
		text-underline-offset: 3px;
	}

	.restore:disabled {
		color: var(--ink-muted);
		cursor: default;
		text-decoration: none;
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

	@media (max-width: 56rem), (pointer: coarse) {
		select,
		.restore {
			min-height: 2.75rem;
		}
	}
</style>
