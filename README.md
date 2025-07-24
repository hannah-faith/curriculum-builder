

# Curriculum Builder

The Hello World Curriculum Builder is a browser-based tool for building and editing JSON-formatted curriculum documents. It enables curriculum designers to visually compose courses made of sections, steps, block groups, and blocks using a hierarchical, card-based UI.

---

## Features

- 📁 Import/export curriculum as JSON
- 🧱 Drag-and-drop support for rubric items
- ✏️ Add and configure block types including text, media, checkpoints, and more
- 🗂 Organized structure with support for section groups, sections, steps, and block groups
- 🧪 Built-in rubric and scoring criteria editor
- 🎯 Vocabulary tagging
- 📐 Responsive design for large and small screens

---

## File Structure

- `index.html` – Main HTML layout with header, cards for each curriculum component, and links to scripts and styles
- `style.css` – Visual styling and layout definitions
- `script.js` – Main JavaScript logic for rendering, editing, and exporting curriculum content

---

## How It Works

### Hierarchical Structure

1. **Course**
   - Contains metadata, vocabulary tags, and language selection.
2. **Section Groups**
   - Logical groupings of curriculum sections.
3. **Sections**
   - Each section contains steps and metadata.
4. **Steps**
   - Steps include one or more block groups.
5. **Block Groups**
   - Container for related content blocks.
6. **Blocks**
   - Smallest editable unit (text, code, media, rubric reference, checkpoint, etc.)

### Rubric Editor

- Each rubric item includes:
  - Title, type, weight
  - Optional subtitle
  - Reorderable list of requirements (with optional audio)

### Scoring

- Criteria can be linked to checkpoints or activities.
- Contexts can include multiple references for assessment.

---

## Usage

1. Open `index.html` in a modern browser.
2. Use the interface to create or modify curriculum structures.
3. Click **Export JSON** to download the resulting file.
4. Click **Import JSON** to load and edit existing curriculum files.

---

### Dependencies

- [Dragula](https://bevacqua.github.io/dragula/) for drag-and-drop behavior

### Local Development

Open `index.html` in your browser directly from the filesystem (no build step required).

### Customization Tips

- To add new block types, extend the logic in `renderBlockTypeFields()` in `script.js`.
- Modify the CSS in `style.css` to match brand or UX needs.

---

## License

© Hello World CS. For internal use only.