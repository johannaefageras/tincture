<script lang="ts">
	import { readableOn } from '#lib/color.ts';
	import { NONE, paletteRows, type Palette } from '#lib/palette.ts';

	interface Props {
		palette: Palette;
		/** The swatch the selected colors currently map to. */
		active: string | null;
		/** The closest swatch to the selected color. */
		suggested: string | null;
		onpick: (target: string) => void;
		onpreview: (target: string | null) => void;
	}

	let { palette, active, suggested, onpick, onpreview }: Props = $props();
	const rows = $derived(paletteRows(palette));
	// Long groups wrap instead of pushing the fixed-width sidebar off screen.
	const columns = $derived(Math.min(3, Math.max(...rows.map((row) => row.length))));

	type Cell =
		| { kind: 'swatch'; hex: string; label: string }
		| { kind: 'none' }
		| { kind: 'blank' };

	const cells = $derived.by(() => {
		const result: Cell[] = [];
		let nonePlaced = false;
		for (const row of rows) {
			for (const swatch of row) result.push({ kind: 'swatch', ...swatch });
			const padding = (columns - (row.length % columns)) % columns;
			for (let i = 0; i < padding; i++) {
				result.push(nonePlaced ? { kind: 'blank' } : { kind: 'none' });
				nonePlaced = true;
			}
		}
		if (!nonePlaced) {
			result.push({ kind: 'none' });
			for (let i = 1; i < columns; i++) result.push({ kind: 'blank' });
		}
		return result;
	});
</script>

<div class="wall" style:--columns={columns} role="group" aria-label="Palette">
	{#each cells as cell, index (index)}
		{#if cell.kind === 'swatch'}
			<button
				type="button"
				class="tile"
				class:active={active === cell.hex}
				style:--swatch={cell.hex}
				style:--on={readableOn(cell.hex)}
				aria-label={cell.label}
				aria-pressed={active === cell.hex}
				onclick={() => onpick(cell.hex)}
				onpointerenter={() => onpreview(cell.hex)}
				onpointerleave={() => onpreview(null)}
				onfocus={() => onpreview(cell.hex)}
				onblur={() => onpreview(null)}
			>
				<span class="hex">{cell.hex}</span>
				{#if suggested === cell.hex}<span class="tag">nearest</span>{/if}
			</button>
		{:else if cell.kind === 'none'}
			<button
				type="button"
				class="tile none"
				class:active={active === NONE}
				aria-label="None, removes the color"
				aria-pressed={active === NONE}
				onclick={() => onpick(NONE)}
				onpointerenter={() => onpreview(NONE)}
				onpointerleave={() => onpreview(null)}
				onfocus={() => onpreview(NONE)}
				onblur={() => onpreview(null)}
			>
				<span class="none-label">None</span>
			</button>
		{:else}
			<span class="blank"></span>
		{/if}
	{/each}
</div>

<style>
	.wall {
		flex: 1;
		display: grid;
		grid-template-columns: repeat(var(--columns), minmax(0, 1fr));
		grid-auto-rows: minmax(2.5rem, 1fr);
		background: var(--paper);
	}

	.tile {
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
		font-weight: var(--weight-semibold);
		letter-spacing: 0.02em;
		opacity: 0;
	}

	.tile:hover .hex,
	.tile:focus-visible .hex,
	.tile.active .hex {
		opacity: 1;
	}

	.tag {
		font-weight: var(--weight-medium);
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

	@media (max-width: 56rem), (pointer: coarse) {
		.wall {
			grid-auto-rows: minmax(2.75rem, 1fr);
		}
	}
</style>
