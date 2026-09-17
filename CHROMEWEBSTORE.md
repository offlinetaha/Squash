# Chrome Web Store Listing — Squash

> Last Updated: 2026-09-16

## Store Listing

**Extension Name**
Squash - Tab Optimizer & Memory Saver

**Short Description**
Collapse open tabs into a clean list with a single click. Save up to 95% RAM and prevent browser slowdowns.

**Detailed Description**
Squash is your instant panic button for tab overload.

Modern web browsing encourages opening dozens of tabs simultaneously. Each tab runs its own background processes, consuming gigabytes of system memory, draining your battery, and slowing down your entire computer.

Click the Squash icon in your toolbar or press Alt+S, and all your open tabs instantly collapse into a clean, beautifully organized dashboard. By replacing 50+ resource-heavy tabs with a lightweight local list, Squash reclaims up to 95% of your computer's RAM in a fraction of a second.

KEY FEATURES
- Instant One-Click Tab Collapse: Collapse active tabs in your window with a single click or keyboard shortcut (Alt+S).
- Up to 95% Memory Recovery: Instantly halt memory hogging, CPU throttling, and background animations.
- Safe by Default: Pinned tabs and tabs actively playing music or video streams are automatically preserved.
- Chronological Tab Groups: Revisit collapsed tabs organized by date and time, with inline renaming (e.g. "Research for Project X").
- Flexible Restoration: Reopen an entire group at once, or restore individual links with a single click.
- Drag-and-Drop Organization: Easily reorder tabs or drag links between different groups.
- Instant Search: Quickly locate any tab across all your saved sessions by title or URL.
- Export & Share: Copy your saved tabs as formatted Markdown, plain text, or download a full JSON backup.
- Privacy-First & Offline: All your tab data stays strictly on your machine in local storage. Zero tracking, zero third-party analytics.

HOW TO USE IT
1. Click the Squash button in your browser toolbar (or press Alt+S) whenever you have too many tabs open.
2. Your tabs close immediately and your Squash dashboard opens with your newly collapsed group.
3. When you're ready to pick up where you left off, click "Restore" on any group or click any tab to reopen it.
4. Right-click the extension icon anytime to open the dashboard without squashing tabs.

**Category**
Productivity

**Single Purpose**
Collapses open browser tabs into an organized dashboard to instantly free system memory and eliminate tab clutter.

**Primary Language**
English

---

## Graphics & Assets

| Asset | Dimensions | Status | Filename |
|-------|-----------|--------|----------|
| Store Icon [REQUIRED] | 128×128 PNG | ✅ Ready | `icons/icon-128.png` |
| Extension Icon 16 | 16×16 PNG | ✅ Ready | `icons/icon-16.png` |
| Extension Icon 32 | 32×32 PNG | ✅ Ready | `icons/icon-32.png` |
| Extension Icon 48 | 48×48 PNG | ✅ Ready | `icons/icon-48.png` |
| Screenshot 1 [REQUIRED] | 1280×800 or 640×400 | ⬜ To be captured | `screenshots/dashboard-overview.png` |
| Screenshot 2 [RECOMMENDED] | 1280×800 or 640×400 | ⬜ To be captured | `screenshots/one-click-collapse.png` |
| Screenshot 3 [RECOMMENDED] | 1280×800 or 640×400 | ⬜ To be captured | `screenshots/search-and-export.png` |

---

## Permissions Justification

| Permission | Type | Justification |
|------------|------|---------------|
| `tabs` | permissions | Required to read the URL, title, and favicon of open tabs to collapse them into your list, and to close them to reclaim memory. |
| `storage` | permissions | Required to save collapsed tab groups, user preferences, and memory statistics locally on your device. |
| `contextMenus` | permissions | Provides quick right-click actions ("Squash Current Window", "Open Dashboard", "Squash Tabs to the Right"). |
| `favicon` | permissions | Allows the extension to display native website favicons beside each saved tab for easy visual recognition. |

---

## Privacy & Data Use

### Data Collection

**Does the extension collect user data?** No

All tab titles, URLs, and settings are saved exclusively in your browser's `chrome.storage.local`. No data is ever transmitted off your device or sent to remote servers.

| Data Type | Collected? | Transmitted Off-Device? | Purpose | Shared with Third Parties? |
|-----------|-----------|------------------------|---------|---------------------------|
| Personally identifiable info | No | No | N/A | No |
| Health info | No | No | N/A | No |
| Financial info | No | No | N/A | No |
| Authentication info | No | No | N/A | No |
| Personal communications | No | No | N/A | No |
| Location | No | No | N/A | No |
| Web history | No | No | N/A | No |
| User activity | No | No | N/A | No |
| Website content | No | No | N/A | No |

### Data Use Certification
- [x] Data is NOT sold to third parties
- [x] Data is NOT used for purposes unrelated to the extension's core functionality
- [x] Data is NOT used for creditworthiness or lending purposes

---

## Distribution

**Visibility**: Public
**Regions**: All regions

## Version History

| Version | Date | Changes | Status |
|---------|------|---------|--------|
| 1.0.0 | 2026-09-16 | Initial release of Squash with one-click tab collapse, dark/light dashboard, memory recovery metrics, drag-and-drop reordering, and backup export/import. | Draft |
