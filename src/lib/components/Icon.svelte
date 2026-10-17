<script lang="ts">
	import undoSvg from '#lib/assets/icons/undo.svg?raw';
	import redoSvg from '#lib/assets/icons/redo.svg?raw';
	import folderOpenSvg from '#lib/assets/icons/folder-open.svg?raw';
	import copySvg from '#lib/assets/icons/copy.svg?raw';
	import downloadSvg from '#lib/assets/icons/arrow-down-to-bracket.svg?raw';
	import importSvg from '#lib/assets/icons/arrow-up-from-bracket.svg?raw';
	import xmarkSvg from '#lib/assets/icons/xmark.svg?raw';
	import fileTextSvg from '#lib/assets/icons/file-text.svg?raw';
	import objectUngroupSvg from '#lib/assets/icons/object-ungroup.svg?raw';

	const ASSETS = {
		undo: undoSvg,
		redo: redoSvg,
		open: folderOpenSvg,
		copy: copySvg,
		download: downloadSvg,
		import: importSvg,
		reset: xmarkSvg,
		document: fileTextSvg,
		separate: objectUngroupSvg
	} as const;

	const PATHS = {
		check: 'M3.5 9.5l3.5 3.5 7.5-8',
		plus: 'M9 4v10 M4 9h10',
		minus: 'M4 9h10'
	} as const;

	type Name = keyof typeof PATHS | keyof typeof ASSETS;

	interface Props {
		name: Name;
	}

	let { name }: Props = $props();

	const isAsset = (n: Name): n is keyof typeof ASSETS => n in ASSETS;
</script>

{#if isAsset(name)}
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
