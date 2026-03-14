# Progress Log

## 2026-03-14

### Completed Today
- Added dynamic "Heroic Abilities & Spells" slots, easily expandable by clicking `+ Add Ability Slot`.
- Implemented a dedicated "Innate Spells & Abilities" section directly above the selection preview.
- Enabled custom text entering for innate spell/ability slots (with independent tracking).
- Added a collapsible toggle for the "Innate Spells & Abilities" section (default hidden) to save screen space depending on character archetype.
- Upgraded save/load system to support exact serialization and preservation of dynamically added slot limits and their visual states across reloads.

## 2026-03-12

### Project
- Rangers Character Sheet
- Working file: `index.html`

### Completed Today
- Added structured equipment support based on the local equipment source file.
- Replaced plain equipment text inputs with selectable equipment entries.
- Preserved support for custom equipment entries that are not part of the predefined list.
- Added description handling for equipment entries, matching the existing archetype and spell behavior.
- Kept save/load compatibility for existing local data and imported character files.

- Added searchable selection fields for:
  - Heroic Abilities
  - Spells
  - Equipment
- Added keyboard-friendly search behavior for the new selectors.
- Added a shared selection preview panel for the currently selected entry.
- Added visible autosave status feedback:
  - `Unsaved`
  - `Saving...`
  - `Saved`

- Improved mobile usability:
  - larger tap targets
  - cleaner spacing
  - better field interaction behavior
- Reverted the mobile footer action bar from sticky behavior after UX review.

- Refined interaction behavior for descriptions and preview:
  - preview is now triggered from the selected field itself
  - preview can be dismissed by clicking outside
  - the inline description toggle is now separate from the preview behavior
  - the inline description remains available as an expandable section

- Improved readability of expanded rule text:
  - less decorative presentation
  - better spacing
  - better contrast
  - cleaner left alignment

- Updated labels and copy:
  - `Quest Chronicles` renamed to `Quest Log`
  - improved placeholder text for ranger name
  - improved placeholder text for the quest log

- Adjusted icon behavior:
  - restored the `ℹ` icon for collapsed inline descriptions
  - kept the expanded state indicator as `^`

### Notes
- `index.html` remains the best entry-point filename for now.
- The file has grown significantly and is now handling layout, styling, UI state, search behavior, save/load logic, and data definitions in one place.
- This is still workable, but future changes will become slower and riskier if everything stays inside one file.

### Recommended Future Improvements
- Split `index.html` into:
  - `index.html`
  - `styles.css`
  - `app.js`
- Move rule data into dedicated data files such as:
  - `data/archetypes.json`
  - `data/spells.json`
  - `data/equipment.json`
- Keep the original markdown source files in a separate `source/` folder.
- Add lightweight validation or warnings for incompatible builds, for example:
  - archetypes that cannot use spells
  - incompatible equipment combinations
- Improve preview behavior further with a smoother open/close transition.
- Consider a clearer visual distinction between:
  - selection field
  - preview panel
  - expandable inline rules text
- Add a small changelog/version field to exported JSON files for better long-term compatibility.
- Add a dedicated desktop pass for spacing and hierarchy once the structure is split into CSS and JS files.

### Suggested Project Structure
```text
rangers-character-sheet/
  index.html
  styles.css
  app.js
  data/
    archetypes.json
    spells.json
    equipment.json
  source/
    Archetypes.md
    Equipment.md
    Spell List.md
  README.md
  PROGRESS_LOG.md
```
