<script lang="ts">
	import magicWandSvg from '#lib/assets/icons/magic-wand.svg?raw';
	import { NONE } from '#lib/palette.ts';
	import Icon from './Icon.svelte';

	export interface Row {
		key: string;
		/** Original color, #RRGGBB. */
		hex: string;
		alpha: number;
		shapes: number;
		stops: number;
		areas: number;
		parentKey?: string;
		areaIndex?: number;
		/** What it shows as now: #RRGGBB or NONE. */
		current: string;
		changed: boolean;
		/** True when the current color is a palette color (or removed). */
		resolved: boolean;
	}

	interface Props {
		rows: Row[];
		selected: string[];
		onselect: (key: string, event: MouseEvent) => void;
		onhover: (key: string | null) => void;
		onreset: (key: string) => void;
		onseparate: (key: string) => void;
		onmatchall: () => void;
		onresetall: () => void;
	}

	let { rows, selected, onselect, onhover, onreset, onseparate, onmatchall, onresetall }: Props = $props();

	const offCount = $derived(rows.filter((row) => !row.resolved).length);
	const changedCount = $derived(rows.filter((row) => row.changed).length);
	const areaCount = $derived(rows.filter((row) => row.parentKey).length);

	const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`;

	function summary(): string {
		if (!rows.length) return 'No colors found in this SVG.';
		const colorCount = new Set(rows.map((row) => row.parentKey ?? row.key)).size;
		const counts = `${plural(colorCount, 'color')}${areaCount ? ` · ${plural(areaCount, 'separate area')}` : ''}`;
		if (offCount === 0) return `${counts}, all on palette`;
		return `${counts}, ${offCount} off palette`;
	}

	function usage(row: Row): string {
		const parts: string[] = [];
		if (row.shapes > 0) parts.push(plural(row.shapes, 'shape'));
		if (row.stops > 0) parts.push(plural(row.stops, 'gradient stop'));
		if (!parts.length) parts.push('not painted');
		if (row.alpha < 0.999) parts.push(`${Math.round(row.alpha * 100)}% opacity`);
		return parts.join(', ');
	}

	const name = (value: string) => (value === NONE ? 'None' : value);

	let list: HTMLElement | undefined = $state();

	// A color picked on the canvas may be scrolled out of view here.
	$effect(() => {
		const last = selected.at(-1);
		if (!last || !list) return;
		const row = list.querySelector<HTMLElement>(`[data-key="${last}"]`);
		if (!row || list.scrollHeight <= list.clientHeight) return;
		// Reveal the selection inside the list without moving the whole mobile page.
		const bounds = list.getBoundingClientRect();
		const selectedBounds = row.getBoundingClientRect();
		if (selectedBounds.top < bounds.top) list.scrollTop -= bounds.top - selectedBounds.top;
		else if (selectedBounds.bottom > bounds.bottom) list.scrollTop += selectedBounds.bottom - bounds.bottom;
	});
</script>

<section class="found" aria-labelledby="found-title">
	<header>
		<h2 id="found-title">Colors in this SVG</h2>
		<p class="summary" aria-live="polite">{summary()}</p>
		{#if rows.length}
			<p class="hint">
				{selected.length
					? 'Hover the palette to preview, click a swatch to apply.'
					: 'Select a color or area here, or click it in the artwork.'}
			</p>
		{/if}
		{#if areaCount}
			<p class="area-hint">Areas follow the SVG’s shapes. Parts of a single path stay together.</p>
		{/if}
	</header>

	<ul bind:this={list}>
		{#each rows as row (row.key)}
			{@const isSelected = selected.includes(row.key)}
			<li class:selected={isSelected} class:area={row.parentKey !== undefined}>
				<div class="row-main">
					<button
						type="button"
						class="row"
						data-key={row.key}
						aria-pressed={isSelected}
						onclick={(event) => onselect(row.key, event)}
						onpointerenter={() => onhover(row.key)}
						onpointerleave={() => onhover(null)}
					>
						<span class="chip" aria-hidden="true">
							<span style:background={row.hex}></span>
							<span class:removed={row.current === NONE} style:background={row.current === NONE ? null : row.current}
							></span>
						</span>
						<span class="text">
							<span class="hex">{#if row.areaIndex}<span class="area-name">Area {row.areaIndex}</span>{' · '}{/if}{name(row.current)}</span>
							<span class="meta">{row.changed ? `was ${row.hex}, ` : ''}{usage(row)}</span>
						</span>
						{#if row.resolved}
							<span class="state on"><Icon name="check" /><span class="visually-hidden">on palette</span></span>
						{:else}
							<span class="state off">off palette</span>
						{/if}
					</button>
					{#if row.changed}
						<button
							type="button"
							class="undo"
							aria-label={row.areaIndex ? `Put area ${row.areaIndex} back to ${row.hex}` : `Put ${row.hex} back`}
							title="Put the original color back"
							onclick={() => onreset(row.key)}
						>
							<Icon name="reset" />
						</button>
					{/if}
				</div>
				{#if row.areas > 1 && !row.parentKey}
					<button
						type="button"
						class="separate"
						aria-label={`Separate ${row.areas} areas of ${row.hex}`}
						title={`Recolor each of these ${row.areas} SVG shapes separately`}
						onclick={() => onseparate(row.key)}
					>
						<Icon name="separate" />Separate areas
					</button>
				{/if}
			</li>
		{/each}
	</ul>

	<footer>
		<button
			type="button"
			class="button icon-only"
			aria-label="Match all colors to palette"
			title="Match all colors to their nearest palette match"
			disabled={offCount === 0}
			onclick={onmatchall}
		>
			<span class="wand" aria-hidden="true">{@html magicWandSvg}</span>
		</button>
		<button type="button" class="button" disabled={changedCount === 0} onclick={onresetall}>
			Reset all
		</button>
	</footer>
</section>

<style>
	.found {
		display: flex;
		flex-direction: column;
		min-height: 0;
		min-width: 0;
		height: 100%;
		background: var(--paper);
	}

	header {
		flex: none;
		padding: var(--space-4) var(--space-4) var(--space-3);
		border-bottom: 1px solid var(--rule);
	}

	h2 {
		font-size: var(--text-m);
		font-weight: var(--weight-semibold);
	}

	.summary {
		margin-top: 2px;
		color: var(--ink-muted);
		font-size: var(--text-s);
	}

	.hint {
		margin-top: var(--space-2);
		font-size: var(--text-s);
	}

	.area-hint {
		margin-top: var(--space-2);
		color: var(--ink-muted);
		font-size: var(--text-s);
	}

	ul {
		flex: 1;
		min-height: 0;
		margin: 0;
		padding: 0;
		overflow-y: auto;
		list-style: none;
	}

	li {
		position: relative;
		display: flex;
		flex-direction: column;
		border-bottom: 1px solid var(--rule);
	}

	.row-main {
		display: flex;
		align-items: stretch;
	}

	.separate {
		display: inline-flex;
		align-items: center;
		align-self: flex-start;
		gap: var(--space-1);
		margin: 0 var(--space-4) var(--space-2);
		padding: var(--space-1) var(--space-2);
		border: 1px solid var(--rule);
		border-radius: var(--radius);
		background: var(--paper);
		font-size: var(--text-s);
	}

	.separate:hover {
		background: var(--wash);
	}

	.area .chip {
		width: 2rem;
	}

	.area-name {
		color: var(--ink-muted);
		font-size: var(--text-s);
		letter-spacing: normal;
	}

	li.selected {
		background: var(--wash-strong);
		box-shadow: inset 3px 0 0 var(--ink);
	}

	.row {
		flex: 1;
		display: flex;
		align-items: center;
		gap: var(--space-3);
		min-width: 0;
		padding: var(--space-2) var(--space-4);
		border: 0;
		background: none;
		text-align: left;
	}

	li:not(.selected) .row:hover {
		background: var(--wash);
	}

	.row:focus-visible {
		outline-offset: -3px;
	}

	/* Before on the left, after on the right. Unchanged colors read as one chip. */
	.chip {
		flex: none;
		display: grid;
		grid-template-columns: 1fr 1fr;
		width: 2.75rem;
		height: 1.75rem;
		border-radius: var(--radius);
		overflow: hidden;
		box-shadow: inset 0 0 0 1px var(--wash-strong);
	}

	.chip .removed {
		background:
			linear-gradient(
				to top right,
				transparent calc(50% - 0.75px),
				var(--ink) calc(50% - 0.75px),
				var(--ink) calc(50% + 0.75px),
				transparent calc(50% + 0.75px)
			),
			var(--paper);
	}

	.text {
		flex: 1;
		display: flex;
		flex-direction: column;
		min-width: 0;
	}

	.hex {
		font-weight: var(--weight-medium);
		letter-spacing: 0.02em;
	}

	.meta {
		overflow: hidden;
		color: var(--ink-muted);
		font-size: var(--text-s);
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.state {
		flex: none;
		display: inline-flex;
		font-size: var(--text-s);
	}

	.state.on {
		color: var(--ink-muted);
	}

	.state.off {
		font-weight: var(--weight-medium);
	}

	.undo {
		flex: none;
		display: grid;
		place-items: center;
		width: 2.25rem;
		border: 0;
		border-left: 1px solid var(--rule);
		background: none;
		color: var(--ink-muted);
	}

	.undo:hover {
		background: var(--wash);
		color: var(--ink);
	}

	.undo:focus-visible {
		outline-offset: -3px;
	}

	footer {
		flex: none;
		display: flex;
		gap: var(--space-2);
		padding: var(--space-3) var(--space-4);
		border-top: 1px solid var(--rule);
	}

	.wand {
		display: flex;
		width: 1.125rem;
		height: 1.125rem;
	}

	.wand :global(svg) {
		width: 100%;
		height: 100%;
	}

	@media (max-width: 56rem) {
		.found {
			height: auto;
		}

		ul {
			flex: auto;
			max-height: 20rem;
		}
	}

	@media (max-width: 56rem), (pointer: coarse) {
		.row,
		.undo,
		.separate {
			min-height: 2.75rem;
		}

		.undo {
			width: 2.75rem;
		}
	}
</style>
