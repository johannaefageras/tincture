<script lang="ts">
	import undoSvg from '#lib/assets/icons/undo.svg?raw';
	import redoSvg from '#lib/assets/icons/redo.svg?raw';

	const ASSETS = { undo: undoSvg, redo: redoSvg } as const;

	const PATHS = {
		open: 'M2.5 14.5v-10h4l1.5 2h7.5v8z',
		copy: 'M6.5 6.5h8v8h-8z M3.5 11.5v-8h8',
		download: 'M9 2.5v9 M5 8l4 4 4-4 M3 15.5h12',
		reset: 'M4.5 4.5l9 9 M13.5 4.5l-9 9',
		check: 'M3.5 9.5l3.5 3.5 7.5-8',
		plus: 'M9 4v10 M4 9h10',
		minus: 'M4 9h10'
	} as const;

	interface Props {
		name: keyof typeof PATHS | keyof typeof ASSETS;
	}

	let { name }: Props = $props();
</script>

{#if name === 'undo' || name === 'redo'}
	<span class="asset-icon" aria-hidden="true">{@html ASSETS[name]}</span>
{:else}
	<svg
		viewBox="0 0 18 18"
		width="16"
		height="16"
		fill="none"
		stroke="currentColor"
		stroke-width="1.6"
		stroke-linecap="round"
		stroke-linejoin="round"
		aria-hidden="true"
	>
		<path d={PATHS[name]} />
	</svg>
{/if}

<style>
	svg,
	.asset-icon {
		flex: none;
	}

	.asset-icon {
		display: inline-flex;
		width: 1rem;
		height: 1rem;
	}

	.asset-icon :global(svg) {
		width: 100%;
		height: 100%;
	}
</style>
