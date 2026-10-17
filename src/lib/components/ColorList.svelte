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
		compact?: boolean;
		visible?: boolean;
		onselect: (key: string, event: MouseEvent) => void;
		onhover: (key: string | null) => void;
		onreset: (key: string) => void;
		onseparate: (key: string) => void;
		onmatchall: () => void;
		onresetall: () => void;
	}

	let { rows, selected, compact = false, visible = true, onselect, onhover, onreset, onseparate, onmatchall, onresetall }: Props = $props();

	const offCount = $derived(rows.filter((row) => !row.resolved).length);
	const changedCount = $derived(rows.filter((row) => row.changed).length);
	const areaCount = $derived(rows.filter((row) => row.parentKey).length);

	const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`;

	const colorCount = $derived(new Set(rows.map((row) => row.parentKey ?? row.key)).size);

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
	let container: HTMLElement | undefined = $state();

	// A color picked on the canvas may be scrolled out of view here.
	$effect(() => {
		if (!visible) return;
		const last = selected.at(-1);
		if (!last || !list) return;
		const scroller = compact ? container : list;
		const row = list.querySelector<HTMLElement>(`[data-key="${last}"]`);
		if (!row || !scroller?.clientHeight || scroller.scrollHeight <= scroller.clientHeight) return;
		// Reveal the selection inside the list without moving the whole mobile page.
		const bounds = scroller.getBoundingClientRect();
		const selectedBounds = row.getBoundingClientRect();
		if (selectedBounds.top < bounds.top) scroller.scrollTop -= bounds.top - selectedBounds.top;
		else if (selectedBounds.bottom > bounds.bottom) scroller.scrollTop += selectedBounds.bottom - bounds.bottom;
	});
</script>

<section class="found" class:compact bind:this={container} aria-labelledby="found-title">
	<header>
		<h2 id="found-title">Colors in this SVG</h2>
		<p id="found-summary" class="summary" aria-live="polite">
			{#if rows.length}
				<span>{plural(colorCount, 'color')}{areaCount ? ` · ${plural(areaCount, 'separate area')}` : ''}</span>
				<span class="summary-state">
					{#if offCount}
						<span class="status-dot" aria-hidden="true"></span>{offCount} off palette
					{:else}
						<Icon name="check" />All on palette
					{/if}
				</span>
			{:else}
				No colors found in this SVG.
			{/if}
		</p>
		<div class="actions">
			<button
				type="button"
				class="button primary match"
				aria-describedby="found-summary"
				title={offCount === 0 ? 'No off-palette colors to match' : 'Match off-palette colors to their nearest palette swatches'}
				disabled={offCount === 0}
				onclick={onmatchall}
			>
				<span class="wand" aria-hidden="true">{@html magicWandSvg}</span>
				Match colors
			</button>
			<button type="button" class="reset" disabled={changedCount === 0} onclick={onresetall}>
				Reset all
			</button>
		</div>
		{#if rows.length}
			<p class="hint">
				{compact
					? 'Select a color to open its replacement palette.'
					: selected.length
					? 'Choose a palette swatch to apply its color.'
					: offCount > 0
						? 'Match all colors at once, or select a color to change it yourself.'
						: 'Select a color here or in the artwork to change it.'}
			</p>
		{/if}
		{#if areaCount}
			<p class="area-hint">Areas follow the SVG’s shapes. Parts of a single path stay together.</p>
		{/if}
		{#if rows.length}
			<p id="color-chip-key" class="chip-key">
				<span class="chip chip-sample" aria-hidden="true"><span></span><span></span></span>
				<span>Original (left) → current (right)</span>
			</p>
		{/if}
	</header>

	<ul bind:this={list} aria-describedby={rows.length ? 'color-chip-key' : undefined}>
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
						onpointerenter={(event) => { if (event.pointerType !== 'touch') onhover(row.key); }}
						onpointerleave={() => onhover(null)}
					>
						<span class="chip" aria-hidden="true">
							<span style:background={row.hex}></span>
							<span class:removed={row.current === NONE} style:background={row.current === NONE ? null : row.current}
							></span>
						</span>
						<span class="text">
							<span class="hex">{#if row.areaIndex}<span class="area-name">Area {row.areaIndex}</span>{' · '}{/if}<span class:hex-value={row.current !== NONE}>{name(row.current)}</span></span>
							<span class="meta">{#if row.changed}was <span class="hex-value">{row.hex}</span>{/if}{row.changed ? `, ${usage(row)}` : usage(row)}</span>
						</span>
						{#if row.resolved}
							<span class="state on" title="On palette"><Icon name="check" /><span class="visually-hidden">on palette</span></span>
						{:else}
							<span class="state off" title="Off palette"><span class="status-dot" aria-hidden="true"></span><span class="visually-hidden">off palette</span></span>
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
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-1) var(--space-3);
		margin-top: 2px;
		color: var(--ink-muted);
		font-size: var(--text-s);
	}

	.summary-state {
		display: inline-flex;
		align-items: center;
		gap: var(--space-1);
	}

	.status-dot {
		flex: none;
		width: 0.5rem;
		height: 0.5rem;
		border: 1.5px solid currentColor;
		border-radius: 50%;
	}

	.chip-key {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		margin-top: var(--space-2);
		color: var(--ink-muted);
		font-size: var(--text-s);
	}

	.chip.chip-sample {
		width: 1.375rem;
		height: 0.875rem;
	}

	.chip-sample > :first-child {
		background: var(--rule);
	}

	.chip-sample > :last-child {
		background: var(--ink-muted);
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

	.hex-value {
		font-family: var(--font-mono);
		font-variant-numeric: tabular-nums;
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
		justify-content: center;
		width: 1rem;
		font-size: var(--text-s);
	}

	.state.on {
		color: var(--ink-muted);
	}

	.state.off {
		color: var(--ink-muted);
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

	.actions {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		margin-top: var(--space-3);
	}

	.match {
		flex: 1;
		justify-content: center;
	}

	.reset {
		flex: none;
		min-height: 2rem;
		padding: 0.375rem var(--space-1);
		border: 0;
		border-radius: var(--radius);
		background: none;
		color: var(--ink-muted);
		font-size: var(--text-s);
		text-decoration: underline;
		text-decoration-color: var(--rule);
		text-underline-offset: 3px;
	}

	.reset:hover:not(:disabled) {
		color: var(--ink);
		text-decoration-color: currentColor;
	}

	.reset:disabled {
		opacity: 0.55;
		text-decoration: none;
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

	.found.compact {
		display: block;
		height: 100%;
		overflow-y: auto;
		overscroll-behavior: contain;
	}

	.compact header {
		padding: var(--space-3);
	}

	.compact h2 {
		display: none;
	}

	.compact .actions {
		margin-top: var(--space-2);
	}

	.compact ul {
		max-height: none;
		overflow: visible;
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
		.separate,
		.reset {
			min-height: 2.75rem;
		}

		.undo {
			width: 2.75rem;
		}
	}
</style>
