<script lang="ts">
	import { readableOn } from '#lib/color.ts';
	import { NONE, paletteRows, type Palette } from '#lib/palette.ts';
	import CustomColorSwatch from './CustomColorSwatch.svelte';
	import Icon from './Icon.svelte';

	interface Props {
		palette: Palette;
		compact?: boolean;
		/** The swatch the selected colors currently map to. */
		active: string | null;
		/** The closest swatch to the selected color. */
		suggested: string | null;
		onpick: (target: string) => void;
		onpreview: (target: string | null) => void;
	}

	let { palette, compact = false, active, suggested, onpick, onpreview }: Props = $props();
	const rows = $derived(paletteRows(palette));
	const customApplied = $derived(active !== null && active !== NONE && !rows.some((row) => row.some((swatch) => swatch.hex === active)));

	function previewOnPointer(event: PointerEvent, target: string) {
		// A finger crossing a swatch while scrolling should not recolor the preview.
		if (event.pointerType !== 'touch') onpreview(target);
	}

	function previewOnFocus(event: FocusEvent, target: string) {
		if (event.currentTarget instanceof HTMLElement && event.currentTarget.matches(':focus-visible')) {
			onpreview(target);
		}
	}

	// Long groups wrap instead of pushing the fixed-width sidebar off screen.
	const columns = $derived(Math.min(5, Math.max(...rows.map((row) => row.length))));

	type Cell =
		| { kind: 'swatch'; hex: string; label: string }
		| { kind: 'none' }
		| { kind: 'custom' }
		| { kind: 'blank' };

	const gridRows = $derived.by(() => {
		const result: Cell[][] = [];
		let toolsPlaced = false;
		for (const [index, row] of rows.entries()) {
			const rowColumns = index === 0 && palette.groups[index].name === 'Black and white' && row.length === 2
				? 4 : columns;
			for (let start = 0; start < row.length; start += rowColumns) {
				const cells: Cell[] = row.slice(start, start + rowColumns).map((swatch) => ({ kind: 'swatch', ...swatch }));
				if (!toolsPlaced && rowColumns - cells.length >= 2) {
					cells.push({ kind: 'none' }, { kind: 'custom' });
					toolsPlaced = true;
				}
				while (cells.length < rowColumns) {
					cells.push({ kind: 'blank' });
				}
				result.push(cells);
			}
		}
		if (!toolsPlaced) {
			const cells: Cell[] = [{ kind: 'none' }, { kind: 'custom' }];
			for (let i = 2; i < columns; i++) cells.push({ kind: 'blank' });
			result.push(cells);
		}
		return result;
	});
</script>

<div class="swatches">
	<p class="palette-key">
		<span id="palette-suggested-key" class="key-item"><span class="suggested-mark" aria-hidden="true"></span>Suggested</span>
		<span id="palette-applied-key" class="key-item"><Icon name="check" />Applied</span>
	</p>
	<div class="wall" class:compact role="group" aria-label="Palette">
		{#each gridRows as row, rowIndex (rowIndex)}
			<div class="row" style:--columns={row.length}>
				{#each row as cell, index (index)}
					{#if cell.kind === 'swatch'}
						<button
							type="button"
							class="tile"
							class:active={active === cell.hex}
							class:suggested={suggested === cell.hex}
							style:--swatch={cell.hex}
							style:--on={readableOn(cell.hex)}
							aria-label={cell.label}
							aria-describedby={active === cell.hex ? 'palette-applied-key' : suggested === cell.hex ? 'palette-suggested-key' : undefined}
							title={`${cell.label}${active === cell.hex ? ' · Applied to selection' : suggested === cell.hex ? ' · Suggested match' : ''}`}
							aria-pressed={active === cell.hex}
							onclick={() => onpick(cell.hex)}
							onpointerenter={(event) => previewOnPointer(event, cell.hex)}
							onpointerleave={() => onpreview(null)}
							onfocus={(event) => previewOnFocus(event, cell.hex)}
							onblur={() => onpreview(null)}
						>
							<span class="hex"><span class="prefix">#</span>{cell.hex.slice(1)}</span>
							{#if active === cell.hex}
								<span class="mark" aria-hidden="true"><Icon name="check" /></span>
							{:else if suggested === cell.hex}
								<span class="mark" aria-hidden="true"><span class="suggested-mark"></span></span>
							{/if}
						</button>
					{:else if cell.kind === 'none'}
						<button
							type="button"
							class="tile none"
							class:active={active === NONE}
							aria-label="None, removes the color"
							aria-describedby={active === NONE ? 'palette-applied-key' : undefined}
							aria-pressed={active === NONE}
							onclick={() => onpick(NONE)}
							onpointerenter={(event) => previewOnPointer(event, NONE)}
							onpointerleave={() => onpreview(null)}
							onfocus={(event) => previewOnFocus(event, NONE)}
							onblur={() => onpreview(null)}
						>
							<span class="none-label">None</span>
							{#if active === NONE}<span class="mark" aria-hidden="true"><Icon name="check" /></span>{/if}
						</button>
					{:else if cell.kind === 'custom'}
						<CustomColorSwatch current={active} applied={customApplied} {onpick} {onpreview} />
					{:else}
						<span class="blank"></span>
					{/if}
				{/each}
			</div>
		{/each}
	</div>
</div>

<style>
	.swatches {
		display: flex;
		flex: 1;
		flex-direction: column;
		min-height: 0;
	}

	.palette-key {
		display: flex;
		flex: none;
		align-items: center;
		justify-content: center;
		gap: var(--space-3);
		padding: 6px var(--space-2);
		border-bottom: 1px solid var(--rule);
		color: var(--ink-muted);
		font-size: 0.75rem;
	}

	.key-item {
		display: inline-flex;
		align-items: center;
		gap: var(--space-1);
	}

	.key-item :global(svg) {
		width: 0.75rem;
		height: 0.75rem;
	}

	.suggested-mark {
		flex: none;
		width: 0.4375rem;
		height: 0.4375rem;
		margin-inline: 2px;
		border: 1.5px solid currentColor;
		transform: rotate(45deg);
	}

	.wall {
		flex: 1;
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		grid-auto-rows: minmax(2.5rem, 1fr);
		background: var(--paper);
	}

	.row {
		display: grid;
		grid-template-columns: repeat(var(--columns), minmax(0, 1fr));
	}

	.tile {
		container-type: inline-size;
		position: relative;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 1px;
		min-width: 0;
		padding: 0;
		border: 0;
		border-radius: 0;
		background: var(--swatch);
		color: var(--on);
		font-size: 0.6875rem;
		line-height: 1.15;
	}

	.hex {
		font-family: var(--font-mono);
		font-size: min(0.6875rem, 24cqi);
		font-weight: var(--weight-semibold);
		letter-spacing: 0.02em;
		opacity: 0;
	}

	@container (max-width: 3rem) {
		.prefix {
			display: none;
		}
	}

	.tile:hover .hex,
	.tile:focus-visible .hex,
	.tile.active .hex {
		opacity: 1;
	}

	.mark {
		position: absolute;
		top: 3px;
		inset-inline-end: 3px;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 0.75rem;
		height: 0.75rem;
	}

	.mark :global(svg) {
		width: 100%;
		height: 100%;
	}

	.tile.suggested:not(.active) {
		outline: 1px dashed var(--on);
		outline-offset: -3px;
	}

	.tile.active,
	.tile.none.active {
		box-shadow: inset 0 0 0 3px var(--on);
	}

	.tile:focus-visible {
		outline: 2px solid var(--on);
		outline-offset: -5px;
	}

	.tile.none {
		--on: var(--ink);
		box-shadow: inset 0 0 0 1px var(--rule);
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

	.none-label {
		padding: 0 0.25rem;
		background: var(--paper);
		font-weight: var(--weight-semibold);
	}

	.blank {
		background: var(--paper);
	}

	.wall.compact {
		min-height: 0;
		grid-auto-rows: 2.75rem;
		align-content: start;
		overflow-y: auto;
		overscroll-behavior: contain;
	}

	.wall.compact .hex {
		opacity: 1;
	}

	@media (hover: none), (pointer: coarse) {
		.hex {
			opacity: 1;
		}
	}

	@media (max-height: 24rem) {
		.wall.compact {
			overflow: visible;
		}
	}

	@media (max-width: 56rem), (pointer: coarse) {
		.wall {
			grid-auto-rows: minmax(2.75rem, 1fr);
		}
	}
</style>
