# Tincture

Swap the colors in an SVG for colors from a built-in or imported palette.

Live at https://johannaefageras.github.io/tincture/

Open an SVG and it keeps its original colors. Use **Match colors** to match
its colors to the nearest palette swatches, or select a color and click a palette
swatch to change every shape in that color.

Everything runs in the browser, so the build is a static site that can be
hosted on GitHub Pages.

## Run it

```sh
npm install
npm run dev
```

Then open http://localhost:5173.

Needs Node 22.17 or newer.

## Publish it

`npm run build` writes the whole site as static files to `build/`.

On GitHub, [.github/workflows/deploy.yml](.github/workflows/deploy.yml) tests,
builds and deploys the site on every push to `main`. Before the first push, set
**Settings → Pages → Source** to **GitHub Actions**. The workflow asks GitHub
Pages for the site's base path, so it needs no changes for a renamed repo or a
custom domain.

GitHub Pages serves a project site from a subfolder named after the repo, such
as `https://<user>.github.io/tincture/`. To build for that address by hand, set
the subfolder as the base path:

```sh
BASE_PATH=/tincture npm run build
```

Leave `BASE_PATH` unset when the site is served from the root of a domain: a
custom domain, or a repo named `<user>.github.io`. `static/.nojekyll` stops
GitHub Pages from hiding the `_app` folder.

## Using it

- **Open**: drop a file on the window, choose Open SVG (or Open while editing), or paste SVG code with ⌘V.
  Only SVG files can be opened. Colors stay as they are; use **Match colors**
  when you want to match them to the palette.
- **Select a color**: click it in the list or click a shape in the artwork.
  ⌘-click adds to the selection, shift-click selects a range, ↑/↓ steps through the list.
  Contrasting frames keep the selected shapes visible while you preview or apply
  colors, zoom, and switch panels. Gradient colors mark the shapes using that gradient.
  Use **Clear selection**, Escape, or empty space in the artwork to clear the frames.
  Selection frames are editor controls and are never included in SVG exports.
- **Swap**: choose a swatch to apply it. With a mouse, hovering previews the color;
  keyboard focus also previews it. On touch screens, tap to apply.
  A diamond and dashed outline mark the **Suggested** match. A check and solid
  outline mark the **Applied** swatch; applying the suggestion replaces its diamond
  with a check. These indicators describe the selected color, and previews do not
  change which swatch is applied.
- **Read the colors**: hex values use monospace text. Split color chips show the
  original on the left and the current color on the right. A hollow circle marks
  an off-palette row, matching the count in the summary; a check means on palette.
- **Separate areas**: colors used by multiple shapes have a Separate areas button.
  Click it to give each shape its own row, then select an area in the artwork or
  list and choose a swatch. Existing replacements are kept. Undo reverses separation;
  Reset all restores the original colors while keeping the areas separate.
  Areas follow the SVG's shapes, so disconnected parts of one path stay together.
  Gradient stops remain shared.
- **None** removes a color (handy for an unwanted white background).
- **Custom** beside None opens the [Coloris color picker](https://coloris.js.org/).
  Choose a color or enter a hex value, then **Apply color** (or Enter) to use it for
  the selection. Changes preview live; **Cancel**, Escape, or tapping outside
  discards the preview. Portrait phones use a bottom sheet; the hex field opens
  the keyboard only when tapped, and the actions stay above the keyboard.
  Custom colors use the same
  undo / redo history as palette swatches and preserve the SVG's existing opacity.
- **Match colors**: the labeled button below the color summary maps every off-palette
  color to a palette swatch in one go, without needing a selection. Matching keeps dark and muted colors in
  similar hues, while neutral colors match by tone. Related shades are matched
  together so lighter areas do not become darker than their shadows. Colors
  already on the palette stay fixed, and original opacity is preserved.
  Undo or Reset all restores the originals.
- **Undo / redo**: ⌘Z and ⇧⌘Z. The ✕ on a row puts that one color back.
- **Find a color**: hover a row and everything else in the artwork fades.
- **View**: scroll to pan, pinch or ⌘-scroll to zoom, double-click to fit again.
  The three squares bottom left switch the background.
  On touch screens, use the +/− buttons to zoom the artwork.
- **Small screens**: the artwork stays visible with Colors / Palette tabs below it
  (beside it in landscape). Selecting
  a color opens its replacement palette; switch back to Colors to select another.
  Swatch hex values stay visible, and the selected color and tap instructions stay
  above the palette. Swiping through swatches scrolls without previewing colors.
  The active panel scrolls independently. Undo, redo, and download stay in the header;
  the File menu contains Open SVG, Copy SVG, the palette guide, and Close file.
- **Save**: **Download & next** (⌘S) saves the SVG and closes the file, ready for
  the next SVG. Open the arrow beside it for **Download and keep editing** (⇧⌘S),
  which preserves the artwork, selection, view, and undo history. On small screens,
  the download button opens both labeled choices. Copy SVG also keeps the file open.
- **Rename**: click the filename in the header to edit the export name. The `.svg`
  extension stays fixed. Enter or clicking away saves; Escape cancels. Blank names
  keep the previous name.
- **Close file** clears the artwork and brings back the drop area. It does not
  ask first, so download or copy before closing if you want to keep the swaps.
  On desktop, use the ✕ beside the filename; on small screens, use the File menu.
  Undo/redo are grouped separately from file actions in the header.

## Change the palette

Use the **Palette** chooser in the left sidebar to compare the ten built-in
palettes by their color strips, or open **Palette tools → Import palette** to use
a JSON file. The palette is remembered in this browser after a refresh.

Each built-in color family has five shades in one row, from lightest (1) to
darkest (5), with the original default shade in the middle (3). Black and white
share the first row with None. Each palette contains 52 colors.

Choosing or importing a palette changes the swatches and keeps the artwork's
current colors and undo history. With an SVG open, choose **Match to [palette name]**
below the chooser to match its off-palette colors when you're ready. **Match colors**
in the color panel does the same thing. Newly opened SVGs also keep their original colors.

The chooser works with a keyboard: open it with Enter, Space or ↑/↓, browse with
↑/↓ or Home/End, and type a first letter to jump to a palette. Enter or Space selects
the focused palette; Escape closes the chooser without changing the selection.

- **Palette tools → Export palette** downloads the active palette as an editable JSON file.
- **Palette tools → Download template** downloads [palette-template.json](static/palette-template.json).
- **Restore default** restores Crayon Box and clears the saved palette choice.
  It does not recolor an open SVG.
- **Palette format guide** in the footer opens `/docs/palettes` in a separate
  tab, keeping the current artwork open. The guide includes a copyable example,
  required fields, color/file rules and fixes for common errors.

Palette files use this structure:

```json
{
  "version": 1,
  "name": "My palette",
  "groups": [
    { "name": "Pink", "colors": ["#FED1E4", "#F4A3C8", "#E0569A", "#B02E6C", "#7E0247"] },
    { "name": "Green", "colors": ["#D1F6B4", "#B4E48C", "#7CCB45", "#579A27", "#366B04"] },
    { "name": "Neutrals", "colors": ["#FFFFFF", "#E6E6E6", "#BDBDBD", "#6E6E6E", "#2B2B2B"] }
  ]
}
```

The template uses five shades per group, from lightest (1) to darkest (5), with
the main color in the middle (3).

Rules:

- `version` must be the number `1`.
- The palette and every group need nonempty string names.
- `groups` must contain at least one group. Each group's `colors` must be a
  nonempty array of six-digit hex strings, including the leading `#`.
- Lowercase hex and surrounding whitespace are accepted and normalized.
- Colors must be unique across the whole palette, ignoring letter case.
- No shorthand hex, alpha, CSS color names, `none` or `transparent`. Original SVG
  opacity is preserved, and the app supplies its own **None** control.
- Group and color order are preserved. Group sizes may differ; longer groups
  wrap within the sidebar.
- Use valid JSON, without comments or trailing commas.

The entire file is validated before replacing the palette. Invalid files leave
the current palette and artwork untouched and report the offending group/color.
If browser storage is unavailable, importing still works for the current page
and a message explains that the change may not survive a refresh.

The ten built-in palettes are defined in `src/lib/palette-presets.ts` and adapted
to the JSON format in `src/lib/palette.ts`. Crayon Box is the default. Saved
selections of the original built-in palettes automatically use the expanded
shades; custom palettes keep their exact colors. The original definitions in
`palettes.ts` are retained to recognize those saved selections.

## How colors are found

Colors are read from `fill`, `stroke`, `stop-color`, `flood-color`,
`lighting-color` and `color`, wherever they are written: as attributes, in
`style="…"`, or in a `<style>` block (the way Illustrator exports classes).
Shapes with no fill at all, which render black, are found too. Colors inside
`<clipPath>` and `<mask>` are left alone. A swap rewrites only those values;
the rest of the file is untouched. Separately recolored areas use local fill/stroke
styles to override inherited colors or shared CSS without changing other shapes.

## Project layout

```
src/lib/palette-presets.ts     built-in five-shade palette sets
palettes.ts                   original presets for saved-selection compatibility
src/lib/palette.ts            built-in palettes, JSON format and validation
src/lib/color.ts              color parsing and nearest-color matching
src/lib/css.ts                finds color values in style attributes and <style> blocks
src/lib/svg-doc.ts            finds, swaps and exports the colors of a mounted SVG
src/lib/components/           palette grid, color list, stage
src/routes/+layout.ts         prerenders every page to static HTML
```

## Other commands

```sh
npm test         # unit tests
npm run check    # type check
npm run build    # static production build in build/
npm run preview  # serve the production build on http://localhost:4173
```

Run `npm run test:browser` and open `http://127.0.0.1:5174/svg-doc.html` for the SVG
area regression checks in a real browser (computed styles, selection and export).
