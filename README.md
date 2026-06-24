<p align="center">
  <img src="rescol.png" width="120" alt="ResCol logo" />
</p>

<h1 align="center">ResCol</h1>
<p align="center"><strong>Research Collection - save images & text from any webpage into organized folders.</strong></p>

<p align="center">
  <img src="https://img.shields.io/badge/manifest-v3-blue" alt="Manifest V3" />
  <img src="https://img.shields.io/badge/chrome-extension-green" alt="Chrome Extension" />
  <img src="https://img.shields.io/badge/license-MIT-lightgrey" alt="MIT License" />
</p>

---

## ✨ What it does

ResCol adds a **"Save to ResCol"** option to the right-click context menu. Right-click any image or selected text on the web to instantly save it into a folder of your choice - no new tabs, no copy-pasting, no friction.

Everything is stored locally in IndexedDB, so your data never leaves your browser.

## 🎯 Key Features

| Feature | Description |
|---|---|
| **Right-click save** | Save images and highlighted text directly from the context menu |
| **Nested folders** | Organize references into collections and sub-sections |
| **Dashboard UI** | Browse, manage, and preview all saved material in a clean interface |
| **ZIP export** | Export an entire collection (including subfolders) as a `.zip` file |
| **Offline & private** | All data lives in IndexedDB - nothing is sent to any server |
| **Unlimited storage** | Uses the `unlimitedStorage` permission so you're never capped |

## 📸 How it works

1. **Right-click** an image or select some text on any webpage.
2. Choose **Save to ResCol → [Your Folder]** from the context menu.
3. Click the extension icon to open the **Dashboard** and view your collections.

## 🛠 Installation

1. Clone or download this repository.
2. Open `chrome://extensions` in Chrome (or any Chromium-based browser).
3. Enable **Developer mode** (top-right toggle).
4. Click **Load unpacked** and select the `ResCol-extension` directory.
5. The ResCol icon will appear in your toolbar - you're ready to go.

## 📁 Project Structure

```
ResCol-extension/
├── manifest.json            # Chrome extension manifest (v3)
├── rescol.png               # Extension icon
├── background/
│   ├── background.js        # Service worker - context menu & save logic
│   └── db.js                # IndexedDB wrapper (folders + items CRUD)
├── dashboard/
│   ├── dashboard.html        # Dashboard page
│   ├── dashboard.css         # Dashboard styles
│   └── dashboard.js          # Dashboard UI logic (tree view, grid, export)
└── lib/
    └── jszip.min.js          # JSZip for ZIP export
```

## 🔐 Permissions

| Permission | Why |
|---|---|
| `contextMenus` | Adds the "Save to ResCol" right-click menu |
| `storage` | Stores folder/item metadata |
| `unlimitedStorage` | Allows saving large image data without hitting quota limits |

## 🧰 Tech Stack

- **Manifest V3** service worker architecture
- **IndexedDB** for high-performance local storage
- **JSZip** for client-side ZIP generation
- Vanilla HTML / CSS / JavaScript - zero build step

## 📄 License

MIT - free to use, modify, and distribute.
