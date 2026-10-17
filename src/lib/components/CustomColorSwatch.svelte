<script lang="ts">
	import { onMount } from 'svelte';
	import type Coloris from '@melloware/coloris';
	import '@melloware/coloris/dist/coloris.css';
	import './custom-color-picker.css';
	import { parseColor, readableOn, toHex } from '#lib/color.ts';
	import Icon from './Icon.svelte';

	interface Props {
		current: string | null;
		applied: boolean;
		onpick: (target: string) => void;
		onpreview: (target: string | null) => void;
	}

	let { current, applied, onpick, onpreview }: Props = $props();
	let button: HTMLButtonElement;
	let field: HTMLInputElement;
	// The npm build exposes setColor, but omits it from its declarations.
	type ColorisApi = typeof Coloris & { setColor: (color: string, target: HTMLInputElement) => void };
	let coloris: ColorisApi | undefined;
	let ready = $state(false);
	let open = $state(false);
	let custom = $state<string | null>(null);
	let confirmed = false;
	const color = $derived(applied ? current : custom);

	function show() {
		if (!coloris) return;
		onpreview(null);
		confirmed = false;
		field.value = current && /^#[\dA-F]{6}$/i.test(current) ? current : custom ?? '#BC3A3A';
		open = true;
		field.click();
	}

	onMount(() => {
		let destroyed = false;
		let picker: HTMLElement | null = null;
		let hexInput: HTMLInputElement | null = null;
		let applyButton: HTMLButtonElement | null = null;
		let cancelButton: HTMLButtonElement | null = null;
		let frame = 0;
		let layoutWidth = window.innerWidth;
		let fullHeight = window.visualViewport?.height ?? window.innerHeight;
		const viewport = window.visualViewport;
		const host = document.createElement('div');
		host.id = 'custom-color-picker-host';
		host.hidden = true;
		const dismiss = document.createElement('button');
		dismiss.type = 'button';
		dismiss.className = 'custom-color-picker-dismiss';
		dismiss.tabIndex = -1;
		dismiss.setAttribute('aria-label', 'Dismiss custom color picker');
		host.append(dismiss);
		document.body.append(host);

		const normalize = (value: string) => {
			const parsed = parseColor(value);
			return parsed ? toHex(parsed) : null;
		};

		function layout() {
			if (!open || !picker) return;
			const width = viewport?.width ?? window.innerWidth;
			const height = viewport?.height ?? window.innerHeight;
			// A keyboard changes height without changing the phone's orientation.
			if (layoutWidth !== window.innerWidth) {
				layoutWidth = window.innerWidth;
				fullHeight = height;
				picker.dataset.sheet = String(window.matchMedia('(max-width: 56rem) and (orientation: portrait)').matches);
			}
			fullHeight = Math.max(fullHeight, height);
			host.style.left = `${viewport?.offsetLeft ?? 0}px`;
			host.style.top = `${viewport?.offsetTop ?? 0}px`;
			host.style.width = `${width}px`;
			host.style.height = `${height}px`;
			host.style.setProperty('--picker-viewport-height', `${height}px`);
			picker.dataset.keyboard = String(document.activeElement === hexInput && (fullHeight - height > 120 || height < 360));
			if (picker.dataset.sheet !== 'true') {
				const anchor = field.getBoundingClientRect();
				const below = anchor.bottom - (viewport?.offsetTop ?? 0) + 8;
				const above = anchor.top - (viewport?.offsetTop ?? 0) - picker.offsetHeight - 8;
				const left = Math.max(8, Math.min(anchor.left - (viewport?.offsetLeft ?? 0), width - picker.offsetWidth - 8));
				const top = below + picker.offsetHeight <= height - 8 ? below : Math.max(8, Math.min(above, height - picker.offsetHeight - 8));
				picker.style.setProperty('--picker-left', `${left}px`);
				picker.style.setProperty('--picker-top', `${top}px`);
				picker.dataset.positioned = 'true';
			}
			coloris?.updatePosition();
			// Refresh marker coordinates after the spectrum changes size.
			const next = hexInput && normalize(hexInput.value);
			if (next) coloris?.setColor(next, field);
		}

		function scheduleLayout() {
			cancelAnimationFrame(frame);
			frame = requestAnimationFrame(layout);
		}

		function prepare() {
			host.hidden = false;
			layoutWidth = window.innerWidth;
			fullHeight = viewport?.height ?? window.innerHeight;
			if (picker) {
				picker.dataset.sheet = String(window.matchMedia('(max-width: 56rem) and (orientation: portrait)').matches);
				picker.dataset.keyboard = 'false';
				picker.dataset.positioned = 'false';
			}
			// Set the viewport bounds before Coloris measures its container.
			host.style.left = `${viewport?.offsetLeft ?? 0}px`;
			host.style.top = `${viewport?.offsetTop ?? 0}px`;
			host.style.width = `${viewport?.width ?? window.innerWidth}px`;
			host.style.height = `${fullHeight}px`;
			host.style.setProperty('--picker-viewport-height', `${fullHeight}px`);
		}

		function opened() {
			const touchLayout = window.matchMedia('(max-width: 56rem), (pointer: coarse)').matches;
			if (touchLayout) picker?.focus({ preventScroll: true });
			else {
				hexInput?.focus({ preventScroll: true });
				hexInput?.select();
			}
			scheduleLayout();
		}

		function preview() {
			if (open && /^#[\dA-F]{6}$/i.test(field.value)) onpreview(field.value.toUpperCase());
		}

		function close() {
			open = false;
			onpreview(null);
			// Enter can close Coloris before its text field has fired change.
			const next = normalize(hexInput?.value ?? field.value);
			if (confirmed && next) {
				custom = next;
				onpick(custom);
			}
			confirmed = false;
			host.hidden = true;
			cancelAnimationFrame(frame);
			// Return focus to the visible swatch after Coloris finishes closing.
			queueMicrotask(() => { if (!destroyed) button.focus({ preventScroll: true }); });
		}

		function keydown(event: KeyboardEvent) {
			if (!open || !(event.target instanceof Element) || !picker?.contains(event.target)) return;
			if (event.key === 'Tab' && event.target === picker) {
				event.preventDefault();
				(event.shiftKey ? applyButton : hexInput)?.focus();
			} else if (event.key === 'Enter' && event.target.tagName !== 'BUTTON') confirmed = true;
			else if (event.key === 'Escape') confirmed = false;
		}

		function confirm() {
			confirmed = true;
		}

		function cancel(event: Event) {
			event.stopPropagation();
			confirmed = false;
			coloris?.close(true);
		}

		function keepFocus(event: PointerEvent) {
			// Keep the hex field from blurring into Coloris before cancelling.
			event.preventDefault();
			event.stopPropagation();
		}

		function previewText(event: Event) {
			if (!open || !(event.target instanceof HTMLInputElement) || event.target.id !== 'clr-color-value') return;
			onpreview(normalize(event.target.value));
		}

		field.addEventListener('click', prepare, true);
		field.addEventListener('open', opened);
		field.addEventListener('input', preview);
		field.addEventListener('close', close);
		dismiss.addEventListener('pointerdown', keepFocus);
		dismiss.addEventListener('click', cancel);
		document.addEventListener('keydown', keydown, true);
		document.addEventListener('input', previewText);
		document.addEventListener('focusin', scheduleLayout);
		document.addEventListener('focusout', scheduleLayout);
		window.addEventListener('resize', scheduleLayout);
		window.addEventListener('scroll', scheduleLayout, { passive: true });
		viewport?.addEventListener('resize', scheduleLayout);
		viewport?.addEventListener('scroll', scheduleLayout);

		// Coloris reads the DOM on import, so load it only in the browser.
		void import('@melloware/coloris').then(({ default: Coloris }) => {
			if (destroyed) return;
			coloris = Coloris as ColorisApi;
			Coloris.init();
			picker = document.getElementById('clr-picker');
			Coloris({
				parent: host,
				el: field,
				wrap: false,
				format: 'hex',
				alpha: false,
				themeMode: 'auto',
				closeButton: true,
				closeLabel: 'Apply color',
				focusInput: false,
				selectInput: false,
				margin: 8,
				a11y: {
					open: 'Open color picker',
					close: 'Apply custom color',
					clear: 'Clear the selected color',
					marker: 'Saturation: {s}. Brightness: {v}.',
					hueSlider: 'Hue slider',
					alphaSlider: 'Opacity slider',
					input: 'Custom color value',
					format: 'Color format',
					swatch: 'Color swatch',
					instruction: 'Saturation and brightness selector. Use up, down, left and right arrow keys to select.'
				}
			});
			if (picker && !document.getElementById('custom-color-picker-title')) {
				const title = document.createElement('h2');
				title.id = 'custom-color-picker-title';
				title.textContent = 'Custom color';
				picker.prepend(title);

				const label = document.createElement('label');
				label.className = 'custom-color-picker-label';
				label.htmlFor = 'clr-color-value';
				label.textContent = 'Hex color';
				picker.append(label);
			}
			hexInput = document.getElementById('clr-color-value') as HTMLInputElement;
			applyButton = document.getElementById('clr-close') as HTMLButtonElement;
			let actions = picker?.querySelector('.custom-color-picker-actions');
			if (!actions) {
				actions = document.createElement('div');
				actions.className = 'custom-color-picker-actions';
				picker?.append(actions);
			}
			cancelButton = document.getElementById('custom-color-picker-cancel') as HTMLButtonElement | null;
			if (!cancelButton) {
				cancelButton = document.createElement('button');
				cancelButton.id = 'custom-color-picker-cancel';
				cancelButton.type = 'button';
				cancelButton.textContent = 'Cancel';
			}
			actions.append(cancelButton, applyButton);
			picker?.setAttribute('role', 'dialog');
			picker?.setAttribute('aria-labelledby', 'custom-color-picker-title');
			picker?.setAttribute('aria-modal', 'true');
			picker?.setAttribute('tabindex', '-1');
			applyButton.addEventListener('click', confirm, true);
			cancelButton.addEventListener('pointerdown', keepFocus);
			cancelButton.addEventListener('click', cancel);
			ready = true;
		});

		return () => {
			destroyed = true;
			confirmed = false;
			if (open) coloris?.close(true);
			cancelAnimationFrame(frame);
			field.removeEventListener('click', prepare, true);
			field.removeEventListener('open', opened);
			field.removeEventListener('input', preview);
			field.removeEventListener('close', close);
			document.removeEventListener('keydown', keydown, true);
			document.removeEventListener('input', previewText);
			document.removeEventListener('focusin', scheduleLayout);
			document.removeEventListener('focusout', scheduleLayout);
			window.removeEventListener('resize', scheduleLayout);
			window.removeEventListener('scroll', scheduleLayout);
			viewport?.removeEventListener('resize', scheduleLayout);
			viewport?.removeEventListener('scroll', scheduleLayout);
			applyButton?.removeEventListener('click', confirm, true);
			cancelButton?.removeEventListener('pointerdown', keepFocus);
			cancelButton?.removeEventListener('click', cancel);
			// Coloris is a singleton. Retain its closed DOM for the next mount.
			coloris?.({ parent: document.body, el: [], wrap: false });
			host.remove();
		};
	});
</script>

<div class="custom-swatch">
	<button
		bind:this={button}
		type="button"
		class:applied
		style:--on={color ? readableOn(color) : 'var(--ink)'}
		aria-label="Custom color"
		aria-pressed={applied}
		aria-expanded={open}
		aria-controls={ready ? 'clr-picker' : undefined}
		aria-describedby={applied ? 'palette-applied-key' : undefined}
		title={color ? `Choose a custom color · ${color}${applied ? ' · Applied to selection' : ''}` : 'Choose a custom color'}
		disabled={!ready}
		onclick={show}
	>
		<span class="label">Custom</span>
		{#if applied}<span class="mark" aria-hidden="true"><Icon name="check" /></span>{/if}
	</button>
	<input bind:this={field} type="text" tabindex="-1" aria-hidden="true" readonly />
</div>

<style>
	.custom-swatch {
		position: relative;
		min-width: 0;
		display: grid;
	}

	button {
		position: relative;
		min-width: 0;
		padding: 0;
		border: 0;
		border-radius: 0;
		/* Solid middle shades from the default Crayon Box palette. */
		background: repeating-linear-gradient(
			135deg,
			#BC3A3A 0 8px,
			#F59A2E 8px 16px,
			#FFC612 16px 24px,
			#7CCB45 24px 32px,
			#0A84C9 32px 40px,
			#8660C9 40px 48px,
			#E0569A 48px 56px
		);
		color: var(--on);
		font-size: 0.6875rem;
		font-weight: var(--weight-semibold);
	}

	.label {
		padding: 2px 4px;
		border-radius: var(--radius);
		background: var(--paper);
		color: var(--ink);
	}

	.applied {
		box-shadow: inset 0 0 0 3px var(--on);
	}

	button:focus-visible {
		outline: 2px solid var(--on);
		outline-offset: -5px;
	}

	.mark {
		position: absolute;
		top: 3px;
		inset-inline-end: 3px;
		display: flex;
		width: 0.75rem;
		height: 0.75rem;
	}

	.mark :global(svg) {
		width: 100%;
		height: 100%;
	}

	input {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		opacity: 0;
		pointer-events: none;
	}
</style>
