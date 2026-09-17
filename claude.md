# 📑 Project Documentation: Tab Optimizer Extension

## 1. Executive Summary & Core Proposition
**The Problem:** Modern web browsing encourages opening dozens of tabs simultaneously. This leads to severe memory (RAM) consumption, CPU throttling, reduced battery life, and cognitive overload for the user. 
**The Solution:** A lightweight browser extension that acts as a panic button for tab overload.

> **"Click one button, and it collapses all your open tabs into a clean, single list. It frees up to 95% of your computer's memory (RAM) and prevents your browser from slowing down or crashing."**

---

## 2. How It Works (The Mechanics)

### A. The "One Button" Trigger
When the user clicks the extension icon in the browser toolbar, the Background Script is triggered. 
1. The extension queries the browser's API for all active tabs in the current window (excluding pinned tabs or actively playing audio/video tabs, based on user preferences).
2. It extracts the `Title`, `URL`, and `Favicon` of each open tab.

### B. The Collapsing Process
1. **Data Storage:** The extracted tab data is instantly saved to the browser's local storage (e.g., `chrome.storage.local` or IndexedDB) as a new "Tab Group" object containing a timestamp and the array of tab URLs.
2. **Tab Closure:** The extension programmatically closes all the queried tabs using the `chrome.tabs.remove()` API.
3. **List Generation:** Simultaneously, it opens a single, lightweight local HTML page (`list.html`) injected with the saved data.

### C. The Memory Optimization (The "95%" Claim)
* **Why it saves RAM:** Browsers allocate separate processes and memory blocks for every open tab to run JavaScript, render the DOM, and maintain active connections. 
* **The Result:** By closing 50 heavy tabs (which might consume 2-4 GB of RAM) and replacing them with a single static local HTML list (which consumes <10 MB of RAM), the system instantly reclaims resources. The garbage collector wipes the closed tabs from memory, halting background scripts, animations, and ads.

---

## 3. User Interface (UI) / The "Clean Single List"

The local `list.html` page acts as the user's dashboard.
* **Chronological Grouping:** Collapsed tabs are grouped by the date and time they were saved.
* **Actions per Group:**
  * `Restore All`: Reopens all tabs in that specific group.
  * `Delete All`: Permanently removes the group from storage.
  * `Share as Web Page`: Generates a shareable public link of the URLs.
  * `Name Group`: Allows the user to rename "Saved on Sept 16" to "Research for Project X".
* **Actions per Tab:**
  * Users can click an individual link to open it (which removes it from the list by default).
  * A small "X" next to each link allows individual deletion.

---

## 4. Technical Architecture Requirements

### 1. `manifest.json` (V3)
Required permissions:
* `"tabs"`: To read titles, URLs, and close them.
* `"storage"`: To save the lists of collapsed tabs.
* `"favicon"`: To load site icons natively.

### 2. `background.js` (Service Worker)
* Listens for the `chrome.action.onClicked` event.
* Executes the logic to read tabs, store their data, close them, and open the dashboard URL.

### 3. `list.html` & `list.js` (The Dashboard)
* A vanilla JS or React-based static page.
* Fetches data from `chrome.storage.local`.
* Renders the UI and handles user events (restoring, deleting, dragging/dropping links).

---

## 5. Edge Cases & Safeguards
* **Data Loss Prevention:** The extension MUST successfully write the array of URLs to local storage *before* calling the API to close the tabs.
* **Pinned Tabs:** By default, pinned tabs should be ignored to prevent disrupting the user's permanent workflow (like webmail or music players).
* **Duplicate Handling:** The extension should ideally filter out duplicate URLs within the same collapsed session to further reduce clutter.
