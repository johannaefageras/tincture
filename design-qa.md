# Tincture navbrand QA

Rename verified 2026-10-17: the editor wordmark, accessible home-link name,
empty and loaded document titles, palette-guide title/description/copy and README
use Tincture. The editor header remains 80px high at the default 1455px desktop
viewport; the 390px mobile view has no horizontal page overflow. Existing palette
and tracing-preference storage keys are retained for compatibility.

Evidence: `/tmp/tincture-rename-review/desktop.png`,
`/tmp/tincture-rename-review/mobile.png` and
`/tmp/tincture-rename-review/palette-guide.png`. `npm run check` passes with zero
errors or warnings, all 55 unit tests pass, and `npm run build` passes. No browser
console errors were captured. Temporary viewport overrides were reset.

The review below records the header before the rename from Recolor to Tincture.
Its reference images and typography notes describe that earlier branding.

final result: passed

Reviewed 2026-10-17. Scope: the third, stacked brand-and-filename direction, retaining the four-square brand mark and the existing palette grid. The editor panels, artwork handling, palette grid and color-list behavior remain the existing implementation.

## Visual evidence

- Selected third concept: `/Users/johanna/.codex/generated_images/01a146fe-0abd-7550-9edc-16340c302e21/exec-da813a62-15c1-42e4-a628-c0baea1c3e46.png`.
- Revised visual truth with the retained mark and grid: `/Users/johanna/.codex/generated_images/01a146fe-0abd-7550-9edc-16340c302e21/exec-1d2927e3-2a37-4028-865c-2718eb6e22f4.png`.
- Implementation: `/tmp/svg-recolor-review/brand-desktop-explicit.jpg`.
- Combined full-view comparison: `/tmp/svg-recolor-review/brand-comparison.png`.
- Combined focused brand comparison: `/tmp/svg-recolor-review/brand-focused-comparison.png`.
- Compact desktop and mobile: `/tmp/svg-recolor-review/brand-900.jpg` and `/tmp/svg-recolor-review/brand-mobile.jpg`.
- Empty state: `/tmp/svg-recolor-review/brand-empty.jpg`.
- Measured layout checks: `/tmp/svg-recolor-review/brand-metrics.json`.

The main CSS viewport and implementation capture are 1440 × 640, at one output pixel per CSS pixel. The generated source is 1881 × 836 and is normalized uniformly to 1440 × 640 in the full-view comparison. The focused comparison additionally normalizes the source header to the existing 32px toolbar-control scale. This component update retains the application's current control density rather than enlarging the entire interface to match generated mock text.

State: light theme, `2nd-place-medal.svg` loaded and explicitly matched to the existing Ocean check palette. The actual source SVG includes 15 original color entries; the mock's invented seven-row color list is not used to replace those entries.

## Findings

No actionable P0, P1 or P2 findings remain within the requested header scope.

- **Fonts and typography:** permanent Recolor wordmark uses the existing font family at 30px, with regular `Re` and a loaded 700-weight `color`. The editable filename is a separate 14px line below. The brand has a clear hierarchy over the document name; long names truncate or scroll inside their field while `.svg` stays visible.
- **Spacing and layout:** desktop header measures 80px high. Brand, filename and 32px toolbar controls remain separate. At 900px there is no brand/toolbar overlap. At 390px the actions wrap below the identity; no horizontal page overflow was observed. Palette sidebar width and its three-column grid are retained.
- **Colors and tokens:** existing paper, ink, muted text, rule and radius tokens remain in use. The mark reuses the actual favicon's four colors; generated mock color differences are not adopted.
- **Images and assets:** the brand is the existing SVG favicon rendered as a 28px image, not a rasterized wordmark or a CSS approximation. The loaded medal is the real source SVG. The contiguous palette grid is intentionally retained instead of the mock's separated tiles or strips.
- **Copy and content:** product name stays Recolor; filename editing, fixed `.svg`, toolbar labels, real color counts and palette metadata remain accurate. The empty document label is `No file open`, beneath the permanent brand.

## Comparison history

The first saved desktop image was a partial 1093 × 640 browser capture despite a 1440px CSS viewport. That capture was discarded for comparison, and the full viewport was recaptured explicitly at 1440 × 640. This was capture normalization, not a product mismatch or a UI-fix iteration.

The valid full-view and focused comparisons were reviewed together. No P0/P1/P2 code changes were needed following that comparison. Differences outside the header are intentional preservation of the existing editor, including its contiguous swatch grid, palette-panel position, actual color rows and artwork fitting.

## Interaction and validation checklist

- [x] Brand visible with no document and with an SVG loaded.
- [x] Brand home link remains keyboard-accessible and does not discard the loaded document on same-route navigation.
- [x] Filename edit saves with Enter and cancels with Escape.
- [x] Long filename remains separate from branding; immutable extension remains visible at 900px and 390px.
- [x] Explicit palette matching still works, and the swatches remain in three columns.
- [x] Browser console contains no captured errors.
- [x] `npm run check`: zero errors or warnings.
- [x] `npm test`: all 55 tests pass.
- [x] `npm run build`: passes.
- [x] Temporary viewport overrides reset after review.

SVG browser validation used paste; the native file chooser was not retested in this change. No palette import or personal artwork files were modified for these checks.

## Follow-up polish

No blocking or proposed P3 refinements. This pass keeps the selected branding change scoped to the current editor.
