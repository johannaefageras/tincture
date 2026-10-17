<script lang="ts">
	import { tick } from 'svelte';
	import Icon from './Icon.svelte';

	interface Props {
		compact: boolean;
		onnext: () => void;
		onkeep: () => void;
	}

	let { compact, onnext, onkeep }: Props = $props();
	let root: HTMLDivElement | undefined = $state();
	let trigger: HTMLElement | undefined = $state();
	let nextOption: HTMLButtonElement | undefined = $state();
	let keepOption: HTMLButtonElement | undefined = $state();
	let open = $state(false);

	function dismiss(event: PointerEvent | FocusEvent) {
		if (open && event.target instanceof Node && !root?.contains(event.target)) open = false;
	}

	function choose(next: boolean) {
		open = false;
		trigger?.focus();
		(next ? onnext : onkeep)();
	}

	async function onKeydown(event: KeyboardEvent) {
		if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
			event.preventDefault();
			event.stopPropagation();
			choose(!event.shiftKey);
		} else if (event.key === 'Escape' && open) {
			event.preventDefault();
			event.stopPropagation();
			open = false;
			trigger?.focus();
		} else if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
			event.preventDefault();
			event.stopPropagation();
			const fromOption = event.target === nextOption || event.target === keepOption;
			const first = event.key === 'Home' || (event.key !== 'End' && (
				fromOption ? event.target === keepOption : event.key === 'ArrowDown'
			));
			open = true;
			await tick();
			(first ? nextOption : keepOption)?.focus();
		}
	}
</script>

<svelte:window onpointerdown={dismiss} onfocusin={dismiss} onresize={() => (open = false)} />

<div class="downloads" class:compact bind:this={root}>
	<button type="button" class="button primary next" title="Download & next (⌘S)" onclick={onnext}>
		<Icon name="download" />Download &amp; next
	</button>
	<details bind:open>
		<summary bind:this={trigger} class="button primary options" aria-label="Download options" title="Download options" onkeydown={onKeydown}>
			{#if compact}<Icon name="download" />{/if}
			<Icon name={open ? 'caret-up' : 'caret-down'} />
		</summary>
		<div class="menu" role="group" aria-label="Download options">
			<button bind:this={nextOption} type="button" class="option" aria-label="Download & next" aria-describedby="download-next-description" onkeydown={onKeydown} onclick={() => choose(true)}>
				<span class="heading"><span>Download &amp; next</span><kbd aria-hidden="true">⌘S</kbd></span>
				<span id="download-next-description" class="description">Save SVG and close this file.</span>
			</button>
			<button bind:this={keepOption} type="button" class="option" aria-label="Download and keep editing" aria-describedby="download-keep-description" onkeydown={onKeydown} onclick={() => choose(false)}>
				<span class="heading"><span>Download and keep editing</span><kbd aria-hidden="true">⇧⌘S</kbd></span>
				<span id="download-keep-description" class="description">Save SVG and keep your artwork open.</span>
			</button>
		</div>
	</details>
</div>

<style>
	.downloads {
		position: relative;
		display: flex;
		flex: none;
	}

	.next {
		border-start-end-radius: 0;
		border-end-end-radius: 0;
	}

	summary {
		list-style: none;
		cursor: pointer;
	}

	summary::-webkit-details-marker {
		display: none;
	}

	.options {
		justify-content: center;
		width: 2rem;
		height: 100%;
		padding: 0;
		border-inline-start-color: var(--ink-muted);
		border-start-start-radius: 0;
		border-end-start-radius: 0;
	}

	.menu {
		position: absolute;
		z-index: 7;
		top: calc(100% + var(--space-1));
		inset-inline-end: 0;
		width: 21rem;
		max-width: calc(100vw - 1.5rem);
		padding: var(--space-1);
		border: 1px solid var(--rule);
		border-radius: var(--radius);
		background: var(--paper);
		box-shadow: 0 4px 12px var(--wash-strong);
	}

	.option {
		display: grid;
		gap: var(--space-1);
		width: 100%;
		min-height: 2.75rem;
		padding: var(--space-3) var(--space-2);
		border: 0;
		border-radius: var(--radius);
		background: none;
		color: var(--ink);
		text-align: start;
		font-size: var(--text-s);
	}

	.option:hover {
		background: var(--wash);
	}

	.heading {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: var(--space-2);
		font-weight: var(--weight-semibold);
	}

	.description,
	kbd {
		color: var(--ink-muted);
		font-weight: var(--weight-regular);
	}

	kbd {
		flex: none;
		font: inherit;
	}

	.compact .next {
		display: none;
	}

	.compact .options {
		gap: var(--space-1);
		width: 3.25rem;
		border-color: var(--ink);
		border-radius: var(--radius);
	}

	@media (pointer: coarse) {
		.options {
			width: 2.75rem;
		}
	}
</style>
