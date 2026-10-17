# Tincture

Swap the colors in an SVG for colors from a built-in or imported palette.

Open an SVG and it keeps its original colors. Use the magic wand button to match
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

GitHub Pages serves a project site from a subfolder named after the repo, such
as `https://<user>.github.io/tincture/`. Build for that address by setting the
subfolder as the base path:

```sh
BASE_PATH=/tincture npm run build
```

Leave `BASE_PATH` unset when the site is served from the root of a domain: a
custom domain, or a repo named `<user>.github.io`. `static/.nojekyll` stops
GitHub Pages from hiding the `_app` folder.

## Using it

- **Open**: drop a file on the window, use Open, or paste SVG code with ⌘V.
  Only SVG files can be opened. Colors stay as they are; use the magic wand
  button when you want to match them to the palette.
- **Select a color**: click it in the list or click a shape in the artwork.
  ⌘-click adds to the selection, shift-click selects a range, ↑/↓ steps through the list.
- **Swap**: hover a swatch to preview it on the artwork, click to apply.
  The swatch tagged "nearest" is the closest match to the selected color.
- **None** removes a color (handy for an unwanted white background).
- **Magic wand**: the small icon button beside Reset all maps every off-palette
  color to its closest swatch in one go. Undo or Reset all restores the originals.
- **Undo / redo**: ⌘Z and ⇧⌘Z. The ✕ on a row puts that one color back.
- **Find a color**: hover a row and everything else in the artwork fades.
- **View**: scroll to pan, pinch or ⌘-scroll to zoom, double-click to fit again.
  The three squares bottom left switch the background.
  On touch screens, swipe to scroll the page and use the +/− buttons to zoom the artwork.
  On smaller screens the color list comes before the palette and scrolls independently.
- **Save**: Download SVG (⌘S) downloads the result and immediately closes the file,
  ready for the next SVG. Copy SVG keeps the file open.
- **Rename**: click the filename in the header to edit the export name. The `.svg`
  extension stays fixed. Enter or clicking away saves; Escape cancels. Blank names
  keep the previous name.
- **Close file** clears the artwork and brings back the drop area. It does not
  ask first, so download or copy before closing if you want to keep the swaps.

## Change the palette

Use **Import palette** in the left sidebar to replace the active palette with a
JSON file. The palette is remembered in this browser after a refresh. New SVGs
keep their original colors. Importing while an SVG is open keeps its current
colors and undo history; use the **magic wand button** to apply the new palette
to its off-palette colors.

- **Export** downloads the active palette as an editable JSON file.
- **Template** downloads [palette-template.json](static/palette-template.json).
- **Restore default** restores the built-in palette and clears the saved custom
  palette. It does not recolor an open SVG.
- **Palette format guide** in the footer opens `/docs/palettes` in a separate
  tab, keeping the current artwork open. The guide includes a copyable example,
  required fields, color/file rules and fixes for common errors.

Palette files use this structure:

```json
{
  "version": 1,
  "name": "My palette",
  "groups": [
    { "name": "Accent", "colors": ["#B02E6C", "#E0569A", "#F4A3C8"] },
    { "name": "Neutrals", "colors": ["#FFFFFF", "#2B2B2B"] }
  ]
}
```

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

The built-in fallback is defined in `src/lib/palette.ts`.

## How colors are found

Colors are read from `fill`, `stroke`, `stop-color`, `flood-color`,
`lighting-color` and `color`, wherever they are written: as attributes, in
`style="…"`, or in a `<style>` block (the way Illustrator exports classes).
Shapes with no fill at all, which render black, are found too. Colors inside
`<clipPath>` and `<mask>` are left alone. A swap rewrites only those values;
the rest of the file is untouched.

## Project layout

```
src/lib/palette.ts            default palette, JSON format and validation
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
