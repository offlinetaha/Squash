# Squash — Tab Optimizer & Memory Saver

> **"Click one button, and it collapses all your open tabs into a clean, single list. It frees up to 95% of your computer's memory (RAM) and prevents your browser from slowing down or crashing."**

---

## Quick Start (Installation)

1. Open Google Chrome (or any Chromium browser such as Brave, Edge, or Arc).
2. Navigate to `chrome://extensions` in your address bar.
3. Enable **Developer mode** using the toggle switch in the top right corner.
4. Click **Load unpacked** in the top left.
5. Select this folder:
   ```
   C:\Users\Yasee\Desktop\Squash
   ```
6. **Squash** is now installed! Pin it to your Chrome toolbar for instant one-click access.

---

## How to Use

### 1. One-Click Collapse
- Simply click the **Squash** toolbar icon at any time.
- All tabs in your active window will be safely committed to storage and closed.
- The **Squash Dashboard** (`list.html`) opens instantly showing your newly created tab session.

### 2. Keyboard Shortcuts
- <kbd>Alt</kbd> + <kbd>S</kbd>: Collapse open tabs in the current window.
- <kbd>Alt</kbd> + <kbd>Shift</kbd> + <kbd>S</kbd>: Open the Squash Dashboard directly (without closing tabs).
- <kbd>/</kbd>: Focus the dashboard search bar.
- <kbd>Esc</kbd>: Close open modals.

### 3. Right-Click Context Menu
Right-click on the Squash extension icon or anywhere on a web page to access:
- **Squash Current Window Tabs**
- **Squash Tabs to the Right**
- **Squash All Windows**
- **Open Squash Dashboard**

---

## Features

- **95% Memory Optimization**: Halts resource consumption and background scripts by closing heavyweight tabs and displaying a single ultra-lightweight dashboard.
- **Fail-Safe Data Preservation**: Tab URLs, titles, and favicons are guaranteed to be written to `chrome.storage.local` *before* the tabs are closed.
- **Protected Tabs**: Pinned tabs and media-playing tabs (audio/video) are preserved by default.
- **Interactive Dashboard**:
  - **Restore All**: Reopen all links in a group in one click.
  - **Inline Renaming**: Rename any session (e.g. *"AI Research"*, *"Trip Planning"*).
  - **Drag & Drop**: Reorder tabs or drag links between groups.
  - **Instant Search**: Real-time filtering by title or URL.
  - **Backup & Share**: Export to Markdown, Plain Text, or JSON backup, and import anytime.
  - **Undo Safety**: 6-second undo toast for any deleted group or tab.
  - **Dark & Light Mode**: Tailored glassmorphism theme with automatic system matching.

---

## Project Structure

```
Squash/
├── manifest.json       # Chrome Manifest V3 configuration
├── background.js       # Background Service Worker (event triggers, tab filtering, safe storage)
├── list.html           # Modern dashboard UI
├── list.css            # Dark/light theme styles, glassmorphism, responsive layout
├── list.js             # Dashboard reactive state, drag & drop, search, and storage sync
├── icons/              # Extension icons (16px, 32px, 48px, 128px)
│   ├── icon-16.png
│   ├── icon-32.png
│   ├── icon-48.png
│   └── icon-128.png
├── claude.md           # Original project specification
├── CHROMEWEBSTORE.md   # Chrome Web Store listing metadata & privacy disclosures
└── README.md           # Instructions & documentation
```
