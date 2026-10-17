<script lang="ts">
	import type { Snippet } from 'svelte';
	import { mountSvg, unmountSvg, type RecolorDoc } from '#lib/svg-doc.ts';
	import Icon from './Icon.svelte';

	export type Backdrop = 'white' | 'dark' | 'checker';

	interface Props {
		backdrop: Backdrop;
		onbackdrop: (backdrop: Backdrop) => void;
		/** A shape was clicked (its original color key), or empty space (null). */
		onpick: (key: string | null, event: MouseEvent) => void;
		/** Shown on top of the stage: the empty state. */
		children?: Snippet;
	}

	let { backdrop, onbackdrop, onpick, children }: Props = $props();

	const MIN_SCALE = 0.25;
	const MAX_SCALE = 40;
	const DRAG_THRESHOLD = 4;

	let viewport: HTMLDivElement | undefined = $state();
	let host: HTMLDivElement | undefined = $state();
	let doc = $state.raw<RecolorDoc | null>(null);

	let scale = $state(1);
	let x = $state(0);
	let y = $state(0);
	let panning = $state(false);

	/** Show an SVG. Throws when the source is not an SVG; the previous one then stays up. */
	export function mount(source: string): RecolorDoc {
		if (!host) throw new Error('The stage is not ready yet.');
		doc = mountSvg(host, source);
		resetView();
		return doc;
	}

	export function clear() {
		if (host) unmountSvg(host);
		doc = null;
		resetView();
	}

	function resetView() {
		scale = 1;
		x = 0;
		y = 0;
	}

	const clamp = (value: number) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, value));

	/** Zoom so the point (px, py), measured from the viewport center, stays put. */
	function zoomAt(next: number, px = 0, py = 0) {
		const target = clamp(next);
		const ratio = target / scale;
		x = px - (px - x) * ratio;
		y = py - (py - y) * ratio;
		scale = target;
	}

	$effect(() => {
		const el = viewport;
		if (!el) return;

		let start: { x: number; y: number; originX: number; originY: number } | null = null;
		let dragged = false;

		// Scroll pans, pinch or ⌘/Ctrl + scroll zooms.
		const wheel = (event: WheelEvent) => {
			if (!doc) return;
			event.preventDefault();
			if (event.ctrlKey || event.metaKey) {
				const rect = el.getBoundingClientRect();
				const px = event.clientX - rect.left - rect.width / 2;
				const py = event.clientY - rect.top - rect.height / 2;
				zoomAt(scale * Math.exp(-event.deltaY * 0.01), px, py);
			} else {
				x -= event.deltaX;
				y -= event.deltaY;
			}
		};

		const down = (event: PointerEvent) => {
			// Let touch gestures scroll and zoom the page; the buttons zoom the artwork.
			if (!doc || event.button !== 0 || event.pointerType === 'touch') return;
			start = { x: event.clientX, y: event.clientY, originX: x, originY: y };
			dragged = false;
		};

		const move = (event: PointerEvent) => {
			if (!start) return;
			const dx = event.clientX - start.x;
			const dy = event.clientY - start.y;
			if (!dragged && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
			if (!dragged) {
				dragged = true;
				panning = true;
				el.setPointerCapture(event.pointerId);
			}
			x = start.originX + dx;
			y = start.originY + dy;
		};

		const up = () => {
			start = null;
			panning = false;
		};

		const click = (event: MouseEvent) => {
			if (!doc) return;
			if (dragged) {
				dragged = false;
				return;
			}
			// The artwork lives in a shadow root, so the real target is first in the composed path.
			onpick(doc.keyAt(event.composedPath()[0] ?? null, event.clientX, event.clientY), event);
		};

		el.addEventListener('wheel', wheel, { passive: false });
		el.addEventListener('pointerdown', down);
		el.addEventListener('pointermove', move);
		el.addEventListener('pointerup', up);
		el.addEventListener('pointercancel', up);
		el.addEventListener('click', click);
		el.addEventListener('dblclick', resetView);
		return () => {
			el.removeEventListener('wheel', wheel);
			el.removeEventListener('pointerdown', down);
			el.removeEventListener('pointermove', move);
			el.removeEventListener('pointerup', up);
			el.removeEventListener('pointercancel', up);
			el.removeEventListener('click', click);
			el.removeEventListener('dblclick', resetView);
		};
	});

	const BACKDROPS: { value: Backdrop; label: string }[] = [
		{ value: 'white', label: 'White background' },
		{ value: 'dark', label: 'Dark background' },
		{ value: 'checker', label: 'Checkerboard background' }
	];
</script>

<div class="stage" data-backdrop={doc ? backdrop : null}>
	<div class="viewport" class:panning class:loaded={doc !== null} bind:this={viewport}>
		<div class="canvas" style:transform={`translate(${x}px, ${y}px) scale(${scale})`}>
			<div class="host" bind:this={host}></div>
		</div>
	</div>

	{#if doc}
		<div class="controls">
			<div class="group" role="group" aria-label="Background">
				{#each BACKDROPS as option (option.value)}
					<button
						type="button"
						class="backdrop"
						data-backdrop={option.value}
						aria-label={option.label}
						title={option.label}
						aria-pressed={backdrop === option.value}
						onclick={() => onbackdrop(option.value)}
					></button>
				{/each}
			</div>
			<div class="group" role="group" aria-label="Zoom">
				<button type="button" aria-label="Zoom out" onclick={() => zoomAt(scale / 1.5)}>
					<Icon name="minus" />
				</button>
				<button type="button" class="percent" title="Back to fit" onclick={resetView}>
					{Math.round(scale * 100)}%
				</button>
				<button type="button" aria-label="Zoom in" onclick={() => zoomAt(scale * 1.5)}>
					<Icon name="plus" />
				</button>
			</div>
		</div>
	{/if}

	{@render children?.()}
</div>

<style>
	.stage {
		position: relative;
		min-width: 0;
		min-height: 0;
		height: 100%;
		overflow: hidden;
		background: var(--bench);
		--checker-a: hsl(0 0% 100%);
		--checker-b: hsl(0 0% 88%);
	}

	.stage[data-backdrop='white'] {
		background: hsl(0 0% 100%);
	}

	.stage[data-backdrop='dark'] {
		background: hsl(0 0% 10%);
	}

	.stage[data-backdrop='checker'] {
		background: repeating-conic-gradient(var(--checker-b) 0% 25%, var(--checker-a) 0% 50%) 0 0 / 20px 20px;
	}

	.viewport {
		position: absolute;
		inset: 0;
		touch-action: pan-y pinch-zoom;
	}

	.viewport.loaded {
		cursor: crosshair;
	}

	.viewport.panning {
		cursor: grabbing;
	}

	.canvas {
		position: absolute;
		inset: 2.5rem 2.5rem 4rem;
		transform-origin: center;
	}

	.host {
		width: 100%;
		height: 100%;
	}

	.controls {
		position: absolute;
		left: var(--space-3);
		bottom: var(--space-3);
		display: flex;
		flex-wrap: wrap;
		max-width: calc(100% - 1.5rem);
		gap: var(--space-2);
	}

	.group {
		display: flex;
		align-items: center;
		height: 2rem;
		padding: 0 var(--space-1);
		gap: var(--space-1);
		border: 1px solid var(--rule);
		border-radius: var(--radius);
		background: var(--paper);
	}

	.group button {
		display: grid;
		place-items: center;
		min-width: 1.5rem;
		height: 1.5rem;
		padding: 0;
		border: 0;
		border-radius: 2px;
		background: none;
		font-size: var(--text-s);
		font-weight: var(--weight-medium);
	}

	.group button:hover {
		background: var(--wash-strong);
	}

	.group .percent {
		min-width: 3rem;
	}

	.group .backdrop {
		width: 1.5rem;
		box-shadow: inset 0 0 0 1px var(--rule);
	}

	.backdrop[data-backdrop='white'],
	.backdrop[data-backdrop='white']:hover {
		background: hsl(0 0% 100%);
	}

	.backdrop[data-backdrop='dark'],
	.backdrop[data-backdrop='dark']:hover {
		background: hsl(0 0% 10%);
	}

	.backdrop[data-backdrop='checker'],
	.backdrop[data-backdrop='checker']:hover {
		background: repeating-conic-gradient(hsl(0 0% 78%) 0% 25%, hsl(0 0% 100%) 0% 50%) 0 0 / 8px 8px;
	}

	.backdrop[aria-pressed='true'] {
		outline: 2px solid var(--ink);
		outline-offset: 1px;
	}

	@media (max-width: 56rem), (pointer: coarse) {
		.canvas {
			inset: var(--space-6) var(--space-4) 4.5rem;
		}

		.group {
			height: auto;
			gap: 0;
			padding: 0;
		}

		.group button {
			min-width: 2.75rem;
			height: 2.75rem;
		}

		.group .backdrop {
			width: 2.75rem;
		}

		.backdrop[aria-pressed='true'] {
			outline-offset: -3px;
		}
	}
</style>
