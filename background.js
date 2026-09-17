/**
 * Squash - Tab Optimizer & Memory Saver
 * Background Service Worker (Manifest V3)
 */

const DEFAULT_SETTINGS = {
  ignorePinned: true,
  ignoreAudible: true,
  removeOnOpen: true,
  deduplicateUrls: true,
  ramPerTabMb: 75,
  theme: 'dark'
};

// Initialize settings and context menus on install
chrome.runtime.onInstalled.addListener(async () => {
  const data = await chrome.storage.local.get(['settings', 'groups', 'totalTabsSaved']);
  if (!data.settings) {
    await chrome.storage.local.set({ settings: DEFAULT_SETTINGS });
  }
  if (!data.groups) {
    await chrome.storage.local.set({ groups: [] });
  }
  if (typeof data.totalTabsSaved !== 'number') {
    await chrome.storage.local.set({ totalTabsSaved: 0 });
  }

  // Create Context Menus
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: 'squash-current-window',
      title: 'Squash Current Window Tabs',
      contexts: ['action', 'page']
    });

    chrome.contextMenus.create({
      id: 'squash-tabs-to-right',
      title: 'Squash Tabs to the Right',
      contexts: ['action', 'page']
    });

    chrome.contextMenus.create({
      id: 'squash-all-windows',
      title: 'Squash All Windows',
      contexts: ['action']
    });

    chrome.contextMenus.create({
      id: 'open-dashboard',
      title: 'Open Squash Dashboard',
      contexts: ['action', 'page']
    });
  });
});

/**
 * Handle Toolbar Icon Click
 * Directly triggers squashing the current window tabs and opens dashboard
 */
chrome.action.onClicked.addListener(async (tab) => {
  await squashTabs({ windowId: tab.windowId, currentTabId: tab.id });
});

/**
 * Handle Keyboard Shortcuts
 */
chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'squash-tabs') {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (activeTab) {
      await squashTabs({ windowId: activeTab.windowId, currentTabId: activeTab.id });
    }
  } else if (command === 'open-dashboard') {
    await openDashboard();
  }
});

/**
 * Handle Context Menu Clicks
 */
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'squash-current-window') {
    await squashTabs({ windowId: tab?.windowId });
  } else if (info.menuItemId === 'squash-tabs-to-right') {
    await squashTabs({ windowId: tab?.windowId, currentTabId: tab?.id, scope: 'to-right' });
  } else if (info.menuItemId === 'squash-all-windows') {
    await squashAllWindows();
  } else if (info.menuItemId === 'open-dashboard') {
    await openDashboard(tab?.windowId);
  }
});

/**
 * Handle Messages from Dashboard UI (list.js)
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    try {
      if (message.action === 'squash-window') {
        const windowId = message.windowId || sender.tab?.windowId;
        const result = await squashTabs({ windowId, excludeDashboard: true });
        sendResponse({ success: true, count: result?.count || 0 });
      } else if (message.action === 'open-dashboard') {
        await openDashboard();
        sendResponse({ success: true });
      } else if (message.action === 'restore-tabs') {
        const urls = message.urls || [];
        const currentWindow = await chrome.windows.getCurrent();
        for (const url of urls) {
          await chrome.tabs.create({ windowId: currentWindow.id, url, active: false });
        }
        sendResponse({ success: true, count: urls.length });
      } else if (message.action === 'get-stats') {
        const data = await chrome.storage.local.get(['groups', 'totalTabsSaved', 'settings']);
        sendResponse({
          groupsCount: (data.groups || []).length,
          totalTabsSaved: data.totalTabsSaved || 0,
          settings: data.settings || DEFAULT_SETTINGS
        });
      } else {
        sendResponse({ error: 'Unknown action' });
      }
    } catch (err) {
      console.error('Error handling runtime message:', err);
      sendResponse({ error: err.message });
    }
  })();
  return true; // Keep message channel open for async response
});

/**
 * Core Squashing Routine
 * Safely persists tab data to storage before closing them
 */
async function squashTabs({ windowId, currentTabId, scope = 'all', excludeDashboard = true } = {}) {
  const dashboardUrl = chrome.runtime.getURL('list.html');
  const { settings = DEFAULT_SETTINGS } = await chrome.storage.local.get('settings');

  // Query tabs
  const queryInfo = windowId ? { windowId } : { currentWindow: true };
  const allTabs = await chrome.tabs.query(queryInfo);

  if (!allTabs || allTabs.length === 0) {
    await openDashboard(windowId);
    return { count: 0 };
  }

  let activeTab = null;
  if (currentTabId) {
    activeTab = allTabs.find(t => t.id === currentTabId);
  } else {
    activeTab = allTabs.find(t => t.active);
  }

  // Filter tabs based on criteria
  let targetTabs = allTabs.filter(tab => {
    // Never close Squash dashboard
    if (tab.url && tab.url.startsWith(dashboardUrl)) {
      return false;
    }

    // Ignore pinned tabs if setting is enabled
    if (settings.ignorePinned && tab.pinned) {
      return false;
    }

    // Ignore audible/video playing tabs if setting is enabled
    if (settings.ignoreAudible && tab.audible) {
      return false;
    }

    // Tabs to the right scope
    if (scope === 'to-right' && activeTab && tab.index <= activeTab.index) {
      return false;
    }

    // Ignore empty chrome new tab if it's the only one
    if (allTabs.length === 1 && (tab.url === 'chrome://newtab/' || tab.url === 'about:blank')) {
      return false;
    }

    return true;
  });

  // URL deduplication if enabled
  if (settings.deduplicateUrls) {
    const seenUrls = new Set();
    targetTabs = targetTabs.filter(tab => {
      if (!tab.url) return true;
      if (seenUrls.has(tab.url)) return false;
      seenUrls.add(tab.url);
      return true;
    });
  }

  if (targetTabs.length === 0) {
    // If no eligible tabs to close, just show/open dashboard
    await openDashboard(windowId);
    return { count: 0 };
  }

  // Extract clean tab data
  const tabItems = targetTabs.map(tab => ({
    id: crypto.randomUUID ? crypto.randomUUID() : ('tab_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8)),
    title: tab.title || tab.url || 'Untitled Tab',
    url: tab.url || '',
    favIconUrl: tab.favIconUrl || '',
    pinned: tab.pinned || false
  }));

  const newGroup = {
    id: crypto.randomUUID ? crypto.randomUUID() : ('group_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8)),
    title: '',
    createdAt: Date.now(),
    tabs: tabItems,
    starred: false,
    collapsed: false
  };

  // SAFEGUARD: Persist to storage BEFORE closing tabs
  const { groups = [], totalTabsSaved = 0 } = await chrome.storage.local.get(['groups', 'totalTabsSaved']);
  const updatedGroups = [newGroup, ...groups];
  await chrome.storage.local.set({
    groups: updatedGroups,
    totalTabsSaved: totalTabsSaved + tabItems.length
  });

  // Open or focus the dashboard BEFORE closing tabs so the window doesn't close
  await openDashboard(windowId);

  // Now safely remove the squashed tabs
  const tabIdsToClose = targetTabs.map(t => t.id).filter(Boolean);
  if (tabIdsToClose.length > 0) {
    try {
      await chrome.tabs.remove(tabIdsToClose);
    } catch (closeErr) {
      console.warn('Some tabs could not be closed immediately:', closeErr);
    }
  }

  return { count: tabItems.length, group: newGroup };
}

/**
 * Squash all windows tabs into separate or unified groups
 */
async function squashAllWindows() {
  const windows = await chrome.windows.getAll({ populate: true });
  for (const win of windows) {
    await squashTabs({ windowId: win.id });
  }
}

/**
 * Open or activate the Squash Dashboard (list.html)
 */
async function openDashboard(preferredWindowId) {
  const dashboardUrl = chrome.runtime.getURL('list.html');

  // Check if dashboard is already open
  const tabs = await chrome.tabs.query({});
  const existingTab = tabs.find(t => t.url && t.url.startsWith(dashboardUrl));

  if (existingTab) {
    await chrome.tabs.update(existingTab.id, { active: true });
    if (existingTab.windowId) {
      await chrome.windows.update(existingTab.windowId, { focused: true });
    }
    return existingTab;
  }

  // Otherwise create a new dashboard tab
  const createProperties = { url: dashboardUrl, active: true };
  if (preferredWindowId) {
    createProperties.windowId = preferredWindowId;
  }
  return await chrome.tabs.create(createProperties);
}
