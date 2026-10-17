<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { BUILT_IN_PALETTES, serializePalette, type Palette } from '#lib/palette.ts';
	import Icon from './Icon.svelte';

	interface Props {
		palette: Palette;
		disabled?: boolean;
		onchange: (id: string) => void;
		onopen: () => void;
	}

	let { palette, disabled = false, onchange, onopen }: Props = $props();
	let root: HTMLDivElement | undefined = $state();
	let trigger: HTMLButtonElement | undefined = $state();
	let list: HTMLDivElement | undefined = $state();
	let open = $state(false);
	let focused = $state(0);
	let popupStyle = $state('');

	const selectedPreset = $derived(
		BUILT_IN_PALETTES.find((preset) => serializePalette(preset.palette) === serializePalette(palette))
	);
	const selectedId = $derived(selectedPreset?.id ?? 'imported');
	const options = $derived(
		selectedPreset
			? BUILT_IN_PALETTES
			: [{ id: 'imported', description: 'Your imported palette.', palette }, ...BUILT_IN_PALETTES]
	);

	function close(restoreFocus = false) {
		open = false;
		if (restoreFocus) trigger?.focus();
	}

	function dismiss(event: PointerEvent | FocusEvent) {
		if (open && event.target instanceof Node && !root?.contains(event.target)) close();
	}

	onMount(() => {
		const onScroll = (event: Event) => {
			if (open && event.target !== list) close();
		};
		window.addEventListener('scroll', onScroll, true);
		return () => window.removeEventListener('scroll', onScroll, true);
	});

	async function show(index = options.findIndex((option) => option.id === selectedId)) {
		if (disabled || !trigger) return;
		const bounds = trigger.getBoundingClientRect();
		const below = Math.max(0, window.innerHeight - bounds.bottom - 16);
		const above = Math.max(0, bounds.top - 16);
		const width = Math.min(bounds.width, window.innerWidth - 24);
		const left = Math.max(12, Math.min(bounds.left, window.innerWidth - width - 12));
		const position = above > below
			? `bottom: ${window.innerHeight - bounds.top + 4}px; --available-height: ${above}px;`
			: `top: ${bounds.bottom + 4}px; --available-height: ${below}px;`;
		popupStyle = `left: ${left}px; width: ${width}px; ${position}`;
		onopen();
		focused = Math.max(0, index);
		open = true;
		await tick();
		if (!open) return;
		trigger?.focus();
		focusOption(focused);
	}

	function focusOption(index: number) {
		focused = index;
		const option = list?.querySelectorAll<HTMLButtonElement>('[role="option"]')[index];
		if (!list || !option) return;
		const bounds = list.getBoundingClientRect();
		const optionBounds = option.getBoundingClientRect();
		if (optionBounds.top < bounds.top) list.scrollTop -= bounds.top - optionBounds.top;
		else if (optionBounds.bottom > bounds.bottom) list.scrollTop += optionBounds.bottom - bounds.bottom;
	}

	function choose(id: string) {
		close(true);
		if (id !== 'imported' && id !== selectedId) onchange(id);
	}

	function onTriggerKeydown(event: KeyboardEvent) {
		if (open) {
			onOptionKeydown(event, focused);
			return;
		}
		if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
			event.preventDefault();
			event.stopPropagation();
			show();
		}
	}

	function onOptionKeydown(event: KeyboardEvent, index: number) {
		if (event.key === 'ArrowDown' || event.key === 'ArrowUp') event.stopPropagation();
		if (event.isComposing || event.metaKey || event.ctrlKey || event.altKey) return;
		let next: number | undefined;
		if (event.key === 'ArrowDown') next = (index + 1) % options.length;
		else if (event.key === 'ArrowUp') next = (index - 1 + options.length) % options.length;
		else if (event.key === 'Home') next = 0;
		else if (event.key === 'End') next = options.length - 1;
		else if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			event.stopPropagation();
			choose(options[index].id);
			return;
		} else if (event.key === 'Escape' || event.key === 'Tab') {
			if (event.key === 'Escape') event.preventDefault();
			event.stopPropagation();
			close(true);
			return;
		} else if (event.key.length === 1) {
			for (let offset = 1; offset <= options.length; offset++) {
				const candidate = (index + offset) % options.length;
				if (options[candidate].palette.name.toLowerCase().startsWith(event.key.toLowerCase())) {
					next = candidate;
					break;
				}
			}
		}
		if (next !== undefined) {
			event.preventDefault();
			event.stopPropagation();
			focusOption(next);
		}
	}
</script>

<svelte:window onpointerdown={dismiss} onfocusin={dismiss} onresize={() => close()} />

{#snippet strip(value: Palette)}
	<span class="strip" aria-hidden="true">
		{#each value.groups.flatMap(({ colors }) => colors.length === 5 ? [colors[2]] : colors) as hex (hex)}
			<span style:background={hex}></span>
		{/each}
	</span>
{/snippet}

<div class="chooser" bind:this={root}>
	<button
		bind:this={trigger}
		type="button"
		class="choice"
		role="combobox"
		aria-label={`Choose palette, ${palette.name}${selectedPreset ? '' : ', imported'}`}
		aria-haspopup="listbox"
		aria-expanded={open}
		aria-controls="palette-options"
		aria-activedescendant={open ? `palette-option-${options[focused].id}` : undefined}
		title={`${palette.name}${selectedPreset ? '' : ' (imported)'}`}
		{disabled}
		onclick={() => open ? close() : show()}
		onkeydown={onTriggerKeydown}
	>
		<span class="choice-heading">
			<span class="name">{palette.name}{selectedPreset ? '' : ' (imported)'}</span>
			<Icon name={open ? 'caret-up' : 'caret-down'} />
		</span>
		{@render strip(palette)}
	</button>
	{#if open}
		<div id="palette-options" class="options" style={popupStyle} role="listbox" aria-label="Palettes" bind:this={list}>
			{#each options as option, index (option.id)}
				<button
					id={`palette-option-${option.id}`}
					type="button"
					class="option"
					role="option"
					aria-selected={selectedId === option.id}
					aria-label={`${option.palette.name}${option.id === 'imported' ? ', imported' : ''}`}
					data-focused={focused === index}
					tabindex="-1"
					title={option.description}
					onfocus={() => focused = index}
					onclick={() => choose(option.id)}
					onkeydown={(event) => onOptionKeydown(event, index)}
				>
					<span class="option-name">
						<span class="name">{option.palette.name}</span>
						{#if selectedId === option.id}<span class="current">{option.id === 'imported' ? 'Imported' : 'Current'}</span>{/if}
					</span>
					{@render strip(option.palette)}
				</button>
			{/each}
		</div>
	{/if}
</div>

<style>
	.chooser {
		position: relative;
		margin-top: var(--palette-choice-margin, var(--space-1));
	}

	.choice {
		position: relative;
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		width: 100%;
		min-width: 0;
		min-height: 3.25rem;
		padding: var(--space-2);
		border: 1px solid var(--rule);
		border-radius: var(--radius);
		background: var(--paper);
		font-weight: var(--weight-semibold);
		text-align: left;
	}

	.choice-heading {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-2);
		width: 100%;
		min-width: 0;
	}

	.choice-heading .name {
		flex: 1;
	}

	.name {
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.choice:hover:not(:disabled),
	.choice[aria-expanded='true'] {
		border-color: var(--ink);
	}

	.strip {
		display: flex;
		flex: none;
		width: 100%;
		height: 0.5rem;
		overflow: hidden;
		border-radius: 1px;
	}

	.strip > span {
		flex: 1;
	}

	.options {
		position: fixed;
		z-index: 3;
		max-height: min(32rem, 60dvh, var(--available-height));
		padding: var(--space-1);
		overflow-y: auto;
		overscroll-behavior: contain;
		border: 1px solid var(--rule);
		border-radius: var(--radius);
		background: var(--paper);
		box-shadow: 0 4px 12px var(--wash-strong);
	}

	.option {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		width: 100%;
		min-width: 0;
		padding: var(--space-2) var(--space-1);
		border: 0;
		border-radius: var(--radius);
		background: none;
		font-size: var(--text-s);
		text-align: left;
	}

	.option + .option {
		margin-top: 2px;
	}

	.option-name {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: var(--space-1);
		width: 100%;
	}

	.current {
		flex: none;
		color: var(--ink-muted);
		font-size: 0.6875rem;
	}

	.option[aria-selected='true'] {
		background: var(--wash);
		font-weight: var(--weight-semibold);
	}

	.option:hover,
	.option[data-focused='true'],
	.option:focus-visible {
		background: var(--wash-strong);
	}

	.option:focus-visible {
		outline-offset: -2px;
	}

	@media (max-width: 56rem), (pointer: coarse) {
		.option {
			min-height: 3rem;
		}
	}
</style>
