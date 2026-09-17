// Graceful mock fallback for standalone preview / browser testing
if (typeof window.chrome === 'undefined' || !window.chrome.storage || !window.chrome.storage.local) {
  const initialDemoGroups = [
    {
      id: 'demo_group_1',
      title: 'Research: AI Agents & Modern Tooling',
      createdAt: Date.now() - 1000 * 60 * 25,
      starred: true,
      collapsed: false,
      tabs: [
        { id: 't1', title: 'Chrome Extensions Documentation - Manifest V3 Architecture', url: 'https://developer.chrome.com/docs/extensions/', favIconUrl: 'https://www.google.com/s2/favicons?domain=developer.chrome.com&sz=32' },
        { id: 't2', title: 'GitHub - GoogleChrome/chrome-extensions-samples', url: 'https://github.com/GoogleChrome/chrome-extensions-samples', favIconUrl: 'https://www.google.com/s2/favicons?domain=github.com&sz=32' },
        { id: 't3', title: 'Hacker News - High Performance Browser Memory Management', url: 'https://news.ycombinator.com', favIconUrl: 'https://www.google.com/s2/favicons?domain=news.ycombinator.com&sz=32' },
        { id: 't4', title: 'MDN Web Docs - JavaScript Memory Life Cycle & Garbage Collection', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Memory_Management', favIconUrl: 'https://www.google.com/s2/favicons?domain=developer.mozilla.org&sz=32' }
      ]
    },
    {
      id: 'demo_group_2',
      title: 'UI Design System & Aesthetics',
      createdAt: Date.now() - 1000 * 60 * 60 * 2.5,
      starred: false,
      collapsed: false,
      tabs: [
        { id: 't5', title: 'Vibrant Glassmorphism & Tokenized Styling Guide', url: 'https://css-tricks.com', favIconUrl: 'https://www.google.com/s2/favicons?domain=css-tricks.com&sz=32' },
        { id: 't6', title: 'Figma Community - Modern Dark Mode Palette Tokens', url: 'https://figma.com', favIconUrl: 'https://www.google.com/s2/favicons?domain=figma.com&sz=32' },
        { id: 't7', title: 'Web.dev - Optimize Core Web Vitals & RAM Footprint', url: 'https://web.dev', favIconUrl: 'https://www.google.com/s2/favicons?domain=web.dev&sz=32' }
      ]
    }
  ];

  let mockStore = {
    groups: JSON.parse(localStorage.getItem('squash_groups') || 'null') || initialDemoGroups,
    settings: JSON.parse(localStorage.getItem('squash_settings') || 'null') || {
      ignorePinned: true,
      ignoreAudible: true,
      removeOnOpen: true,
      deduplicateUrls: true,
      ramPerTabMb: 75,
      theme: 'dark'
    },
    totalTabsSaved: parseInt(localStorage.getItem('squash_total_saved') || '14', 10)
  };

  window.chrome = {
    storage: {
      local: {
        get: async (keys) => {
          if (Array.isArray(keys)) {
            const res = {};
            keys.forEach(k => res[k] = mockStore[k]);
            return res;
          }
          if (typeof keys === 'string') return { [keys]: mockStore[keys] };
          return { ...mockStore };
        },
        set: async (items) => {
          Object.assign(mockStore, items);
          if (items.groups) localStorage.setItem('squash_groups', JSON.stringify(items.groups));
          if (items.settings) localStorage.setItem('squash_settings', JSON.stringify(items.settings));
          if (items.totalTabsSaved) localStorage.setItem('squash_total_saved', String(items.totalTabsSaved));
        }
      },
      onChanged: { addListener: () => {} }
    },
    tabs: {
      create: async ({ url }) => { window.open(url, '_blank'); return { id: Date.now() }; },
      query: async () => []
    },
    runtime: {
      getURL: (path) => path,
      sendMessage: async (msg) => {
        if (msg.action === 'squash-window') {
          return { count: 3 };
        }
        return { success: true };
      }
    }
  };
}

// State Management
let currentGroups = [];
let currentSettings = {
  ignorePinned: true,
  ignoreAudible: true,
  removeOnOpen: true,
  deduplicateUrls: true,
  ramPerTabMb: 75,
  theme: 'dark'
};
let allTimeTabsSaved = 0;
let activeFilter = 'all';
let searchQuery = '';
let undoStack = [];
let draggedTabInfo = null;

// DOM Elements
const groupsContainer = document.getElementById('groups-container');
const emptyState = document.getElementById('empty-state');
const searchInput = document.getElementById('search-input');
const btnSearchClear = document.getElementById('btn-search-clear');
const statRamSaved = document.getElementById('stat-ram-saved');
const statSavedTabs = document.getElementById('stat-saved-tabs');
const statGroupsCount = document.getElementById('stat-groups-count');
const statAlltimeTabs = document.getElementById('stat-alltime-tabs');
const filterPills = document.querySelectorAll('.filter-pill');
const toastContainer = document.getElementById('toast-container');

// Modals
const modalSettings = document.getElementById('modal-settings');
const modalExport = document.getElementById('modal-export');
const modalShortcuts = document.getElementById('modal-shortcuts');
const exportTextarea = document.getElementById('export-textarea');
const exportCopiedIndicator = document.getElementById('export-copied-indicator');
const fileImport = document.getElementById('file-import');

// ==========================================================================
// Initialization & Storage Sync
// ==========================================================================

document.addEventListener('DOMContentLoaded', async () => {
  await loadStateFromStorage();
  applyTheme(currentSettings.theme);
  renderDashboard();
  setupEventListeners();
});

// Listen for storage changes from background worker or other tabs
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== 'local') return;

  let needsRerender = false;
  if (changes.groups) {
    currentGroups = changes.groups.newValue || [];
    needsRerender = true;
  }
  if (changes.settings) {
    currentSettings = { ...currentSettings, ...changes.settings.newValue };
    applyTheme(currentSettings.theme);
    needsRerender = true;
  }
  if (changes.totalTabsSaved) {
    allTimeTabsSaved = changes.totalTabsSaved.newValue || 0;
    updateStatsBar();
  }

  if (needsRerender) {
    renderDashboard();
  }
});

async function loadStateFromStorage() {
  const data = await chrome.storage.local.get(['groups', 'settings', 'totalTabsSaved']);
  currentGroups = data.groups || [];
  if (data.settings) {
    currentSettings = { ...currentSettings, ...data.settings };
  }
  allTimeTabsSaved = data.totalTabsSaved || 0;
}

async function saveGroups() {
  await chrome.storage.local.set({ groups: currentGroups });
}

async function saveSettings(newSettings) {
  currentSettings = { ...currentSettings, ...newSettings };
  await chrome.storage.local.set({ settings: currentSettings });
  applyTheme(currentSettings.theme);
}

// ==========================================================================
// Rendering Engine
// ==========================================================================

function renderDashboard() {
  updateStatsBar();

  // Filter groups
  let visibleGroups = filterGroups(currentGroups);

  if (currentGroups.length === 0) {
    emptyState.style.display = 'flex';
    groupsContainer.style.display = 'none';
    return;
  }

  emptyState.style.display = 'none';
  groupsContainer.style.display = 'flex';
  groupsContainer.innerHTML = '';

  if (visibleGroups.length === 0) {
    groupsContainer.innerHTML = `
      <div class="empty-state" style="padding: 40px 20px;">
        <p class="empty-desc">No saved tabs match your search or active filter.</p>
        <button class="btn btn-secondary" id="btn-reset-filters">Clear Filter</button>
      </div>
    `;
    document.getElementById('btn-reset-filters')?.addEventListener('click', () => {
      searchInput.value = '';
      searchQuery = '';
      btnSearchClear.style.display = 'none';
      setActiveFilter('all');
    });
    return;
  }

  visibleGroups.forEach(group => {
    const card = createGroupCardElement(group);
    groupsContainer.appendChild(card);
  });
}

function updateStatsBar() {
  const totalActiveTabs = currentGroups.reduce((acc, g) => acc + (g.tabs ? g.tabs.length : 0), 0);
  const ramMb = totalActiveTabs * (currentSettings.ramPerTabMb || 75);
  
  if (ramMb >= 1024) {
    statRamSaved.textContent = (ramMb / 1024).toFixed(2) + ' GB';
  } else {
    statRamSaved.textContent = ramMb + ' MB';
  }

  statSavedTabs.textContent = totalActiveTabs;
  statGroupsCount.textContent = currentGroups.length;
  statAlltimeTabs.textContent = allTimeTabsSaved;
}

function filterGroups(groups) {
  const now = Date.now();
  const ONE_DAY = 24 * 60 * 60 * 1000;

  return groups.filter(group => {
    // Starred filter
    if (activeFilter === 'starred' && !group.starred) return false;

    // Today filter
    if (activeFilter === 'today' && (now - group.createdAt > ONE_DAY)) return false;

    // Older filter
    if (activeFilter === 'older' && (now - group.createdAt <= ONE_DAY)) return false;

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const titleMatch = (group.title || '').toLowerCase().includes(q);
      const tabMatch = (group.tabs || []).some(t => 
        (t.title || '').toLowerCase().includes(q) || (t.url || '').toLowerCase().includes(q)
      );
      return titleMatch || tabMatch;
    }

    return true;
  });
}

function createGroupCardElement(group) {
  const card = document.createElement('div');
  card.className = `tab-group-card ${group.starred ? 'starred' : ''} ${group.collapsed ? 'collapsed' : ''}`;
  card.dataset.groupId = group.id;

  const tabCount = group.tabs ? group.tabs.length : 0;
  const groupRam = tabCount * (currentSettings.ramPerTabMb || 75);
  const formattedRam = groupRam >= 1024 ? (groupRam / 1024).toFixed(1) + ' GB' : groupRam + ' MB';
  const timeFormatted = formatTimestamp(group.createdAt);
  const groupTitle = group.title || `Saved on ${timeFormatted}`;

  // Filter tabs if there is an active search query
  let tabsToDisplay = group.tabs || [];
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase().trim();
    tabsToDisplay = tabsToDisplay.filter(t => 
      (t.title || '').toLowerCase().includes(q) || (t.url || '').toLowerCase().includes(q)
    );
  }

  card.innerHTML = `
    <div class="tab-group-header">
      <div class="group-header-left">
        <button class="group-collapse-btn" title="Toggle group collapse">
          <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        <button class="group-star-btn ${group.starred ? 'active' : ''}" title="${group.starred ? 'Unstar group' : 'Star & pin group to top'}">
          <svg class="icon" viewBox="0 0 24 24" fill="${group.starred ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        </button>

        <div class="group-title-container">
          <input type="text" class="group-title-input" value="${escapeHtml(groupTitle)}" placeholder="Name this group (e.g., Research)..." title="Click to rename group">
          <span class="group-time-tag">• ${timeFormatted}</span>
        </div>
      </div>

      <div class="group-header-right">
        <div class="group-badge-pills">
          <span class="pill-tabs-count">${tabCount} tabs</span>
          <span class="pill-ram-saved">~${formattedRam} RAM</span>
        </div>

        <button class="group-action-btn restore btn-restore-all" title="Restore all tabs in this group">
          <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" />
          </svg>
          Restore
        </button>

        <button class="group-action-btn btn-share-group" title="Share or export this group">
          <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" />
          </svg>
        </button>

        <button class="group-action-btn danger btn-delete-group" title="Delete this group">
          <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
          </svg>
        </button>
      </div>
    </div>

    <ul class="tab-list" data-group-id="${group.id}">
      ${tabsToDisplay.map((tab, idx) => createTabItemHtml(tab, group.id, idx)).join('')}
    </ul>
  `;

  attachGroupCardEvents(card, group);
  return card;
}

function createTabItemHtml(tab, groupId, index) {
  const domain = getDomainFromUrl(tab.url);
  const faviconUrl = tab.favIconUrl || getFaviconUrl(tab.url);

  return `
    <li class="tab-item" draggable="true" data-tab-id="${tab.id}" data-group-id="${groupId}" data-index="${index}">
      <div class="tab-item-left">
        <span class="tab-drag-handle" title="Drag to reorder or move to another group">
          <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="9" cy="5" r="1" /><circle cx="9" cy="12" r="1" /><circle cx="9" cy="19" r="1" />
            <circle cx="15" cy="5" r="1" /><circle cx="15" cy="12" r="1" /><circle cx="15" cy="19" r="1" />
          </svg>
        </span>

        <img class="tab-favicon" src="${escapeHtml(faviconUrl)}" alt="" loading="lazy" onerror="this.onerror=null; this.src='icons/icon-16.png';">

        <div class="tab-link-wrapper">
          <a class="tab-title-link" href="${escapeHtml(tab.url)}" title="${escapeHtml(tab.title || tab.url)}">
            ${escapeHtml(tab.title || tab.url || 'Untitled Tab')}
          </a>
          <span class="tab-domain">${escapeHtml(domain)}</span>
        </div>
      </div>

      <div class="tab-item-right">
        <button class="tab-btn-action btn-copy-tab" title="Copy URL" data-url="${escapeHtml(tab.url)}">
          <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2" />
            <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
          </svg>
        </button>

        <button class="tab-btn-action btn-open-tab" title="Open in new tab">
          <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" />
          </svg>
        </button>

        <button class="tab-btn-action delete btn-delete-tab" title="Remove tab">
          <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </li>
  `;
}

// ==========================================================================
// Event Listeners & Interactions
// ==========================================================================

function attachGroupCardEvents(card, group) {
  // Collapse toggle
  const collapseBtn = card.querySelector('.group-collapse-btn');
  collapseBtn.addEventListener('click', async () => {
    group.collapsed = !group.collapsed;
    card.classList.toggle('collapsed', group.collapsed);
    await saveGroups();
  });

  // Star toggle
  const starBtn = card.querySelector('.group-star-btn');
  starBtn.addEventListener('click', async () => {
    group.starred = !group.starred;
    // If starring, move towards top
    if (group.starred) {
      currentGroups = [group, ...currentGroups.filter(g => g.id !== group.id)];
    }
    await saveGroups();
    renderDashboard();
    showToast(group.starred ? 'Group starred and pinned' : 'Group unstarred');
  });

  // Rename Group Title
  const titleInput = card.querySelector('.group-title-input');
  titleInput.addEventListener('change', async () => {
    group.title = titleInput.value.trim();
    await saveGroups();
  });
  titleInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      titleInput.blur();
    }
  });

  // Restore All
  const restoreBtn = card.querySelector('.btn-restore-all');
  restoreBtn.addEventListener('click', async () => {
    await restoreGroupTabs(group);
  });

  // Share Group
  const shareBtn = card.querySelector('.btn-share-group');
  shareBtn.addEventListener('click', () => {
    openExportModal(group);
  });

  // Delete Group
  const deleteBtn = card.querySelector('.btn-delete-group');
  deleteBtn.addEventListener('click', async () => {
    await deleteGroupWithUndo(group.id);
  });

  // Tab Item actions
  const tabItems = card.querySelectorAll('.tab-item');
  tabItems.forEach(tabEl => {
    const tabId = tabEl.dataset.tabId;
    const tabObj = (group.tabs || []).find(t => t.id === tabId);

    // Click Link
    const linkEl = tabEl.querySelector('.tab-title-link');
    linkEl.addEventListener('click', async (e) => {
      e.preventDefault();
      await openTab(tabObj, group);
    });

    // Open button
    const openBtn = tabEl.querySelector('.btn-open-tab');
    openBtn.addEventListener('click', async () => {
      await openTab(tabObj, group);
    });

    // Copy URL
    const copyBtn = tabEl.querySelector('.btn-copy-tab');
    copyBtn.addEventListener('click', async () => {
      await copyToClipboard(tabObj.url);
      showToast('URL copied to clipboard');
    });

    // Delete Tab
    const delTabBtn = tabEl.querySelector('.btn-delete-tab');
    delTabBtn.addEventListener('click', async () => {
      await deleteTab(tabId, group.id);
    });

    // Drag and drop handlers
    setupTabDragAndDrop(tabEl, group.id);
  });
}

function setupEventListeners() {
  // Header: Squash Current Window Button
  document.getElementById('btn-squash-window')?.addEventListener('click', async () => {
    const res = await chrome.runtime.sendMessage({ action: 'squash-window' });
    if (res?.count > 0) {
      showToast(`Squashed ${res.count} tab${res.count === 1 ? '' : 's'}!`);
    } else {
      showToast('No eligible tabs to squash in this window.');
    }
  });

  // Empty state button
  document.getElementById('btn-empty-squash')?.addEventListener('click', async () => {
    document.getElementById('btn-squash-window')?.click();
  });

  // New Group Button
  document.getElementById('btn-new-group')?.addEventListener('click', async () => {
    const newGroup = {
      id: crypto.randomUUID ? crypto.randomUUID() : ('group_' + Date.now()),
      title: 'New Tab Group',
      createdAt: Date.now(),
      tabs: [],
      starred: false,
      collapsed: false
    };
    currentGroups.unshift(newGroup);
    await saveGroups();
    renderDashboard();
    // Focus new group title input
    const firstTitleInput = document.querySelector('.group-title-input');
    firstTitleInput?.focus();
    firstTitleInput?.select();
  });

  // Search Input
  searchInput?.addEventListener('input', () => {
    searchQuery = searchInput.value;
    btnSearchClear.style.display = searchQuery ? 'block' : 'none';
    renderDashboard();
  });

  btnSearchClear?.addEventListener('click', () => {
    searchInput.value = '';
    searchQuery = '';
    btnSearchClear.style.display = 'none';
    renderDashboard();
    searchInput.focus();
  });

  // Keyboard shortcut '/' to focus search
  window.addEventListener('keydown', (e) => {
    if (e.key === '/' && document.activeElement !== searchInput && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
      e.preventDefault();
      searchInput.focus();
      searchInput.select();
    }
    if (e.key === 'Escape') {
      closeAllModals();
    }
  });

  // Filter Pills
  filterPills.forEach(pill => {
    pill.addEventListener('click', () => {
      const filter = pill.dataset.filter;
      setActiveFilter(filter);
    });
  });

  // Expand / Collapse All
  document.getElementById('btn-expand-all')?.addEventListener('click', async () => {
    currentGroups.forEach(g => g.collapsed = false);
    await saveGroups();
    renderDashboard();
  });

  document.getElementById('btn-collapse-all')?.addEventListener('click', async () => {
    currentGroups.forEach(g => g.collapsed = true);
    await saveGroups();
    renderDashboard();
  });

  // Theme Toggle Button
  document.getElementById('btn-theme-toggle')?.addEventListener('click', async () => {
    const nextTheme = document.body.dataset.theme === 'dark' ? 'light' : 'dark';
    await saveSettings({ theme: nextTheme });
    showToast(`Switched to ${nextTheme} theme`);
  });

  // Modals Open / Close
  document.getElementById('btn-settings')?.addEventListener('click', openSettingsModal);
  document.getElementById('btn-export-share')?.addEventListener('click', () => openExportModal(null));
  document.getElementById('btn-shortcuts')?.addEventListener('click', openShortcutsModal);

  document.querySelectorAll('[data-close-modal]').forEach(btn => {
    btn.addEventListener('click', closeAllModals);
  });

  // Close modal when clicking overlay background
  document.querySelectorAll('.modal-overlay').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeAllModals();
    });
  });

  // Settings Save
  document.getElementById('btn-save-settings')?.addEventListener('click', async () => {
    const newSettings = {
      ignorePinned: document.getElementById('setting-ignore-pinned').checked,
      ignoreAudible: document.getElementById('setting-ignore-audible').checked,
      removeOnOpen: document.getElementById('setting-remove-on-open').checked,
      deduplicateUrls: document.getElementById('setting-deduplicate').checked,
      ramPerTabMb: parseInt(document.getElementById('setting-ram-per-tab').value, 10) || 75,
      theme: document.getElementById('setting-theme').value
    };
    await saveSettings(newSettings);
    closeAllModals();
    showToast('Preferences saved successfully!');
    renderDashboard();
  });

  // Export Modal Tabs & Actions
  document.querySelectorAll('.export-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.export-tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      generateExportContent(btn.dataset.exportFormat);
    });
  });

  document.getElementById('btn-copy-export')?.addEventListener('click', async () => {
    await copyToClipboard(exportTextarea.value);
    exportCopiedIndicator.style.display = 'inline';
    setTimeout(() => {
      exportCopiedIndicator.style.display = 'none';
    }, 2500);
  });

  document.getElementById('btn-download-export')?.addEventListener('click', downloadExportFile);

  // Import Backup
  document.getElementById('btn-import-backup')?.addEventListener('click', () => {
    fileImport.click();
  });

  fileImport?.addEventListener('change', handleBackupFileImport);
}

function setActiveFilter(filter) {
  activeFilter = filter;
  filterPills.forEach(p => p.classList.toggle('active', p.dataset.filter === filter));
  renderDashboard();
}

// ==========================================================================
// Tab & Group Action Helpers
// ==========================================================================

async function openTab(tab, group) {
  if (!tab || !tab.url) return;

  // Open the tab
  await chrome.tabs.create({ url: tab.url, active: true });

  // If remove on open is configured
  if (currentSettings.removeOnOpen) {
    await deleteTab(tab.id, group.id, false);
  }
}

async function restoreGroupTabs(group) {
  if (!group || !group.tabs || group.tabs.length === 0) {
    showToast('No tabs to restore in this group.');
    return;
  }

  const urls = group.tabs.map(t => t.url).filter(Boolean);
  for (const url of urls) {
    await chrome.tabs.create({ url, active: false });
  }

  showToast(`Restored ${urls.length} tabs`);

  // Optionally delete group or keep
  // In claude.md: "Restore All: Reopens all tabs in that specific group"
  // Let's prompt with undo option: remove group and provide 8-sec undo
  await deleteGroupWithUndo(group.id, `Restored ${urls.length} tabs and cleared group`);
}

async function deleteTab(tabId, groupId, showUndoToast = true) {
  const group = currentGroups.find(g => g.id === groupId);
  if (!group) return;

  const tabIndex = group.tabs.findIndex(t => t.id === tabId);
  if (tabIndex === -1) return;

  const [removedTab] = group.tabs.splice(tabIndex, 1);

  // If group is now empty, remove group as well
  let groupRemoved = false;
  if (group.tabs.length === 0) {
    currentGroups = currentGroups.filter(g => g.id !== groupId);
    groupRemoved = true;
  }

  await saveGroups();
  renderDashboard();

  if (showUndoToast) {
    showToast('Tab removed', async () => {
      // Undo callback
      if (groupRemoved) {
        group.tabs.push(removedTab);
        currentGroups.unshift(group);
      } else {
        group.tabs.splice(tabIndex, 0, removedTab);
      }
      await saveGroups();
      renderDashboard();
    });
  }
}

async function deleteGroupWithUndo(groupId, customMessage = 'Group deleted') {
  const groupIndex = currentGroups.findIndex(g => g.id === groupId);
  if (groupIndex === -1) return;

  const [deletedGroup] = currentGroups.splice(groupIndex, 1);
  await saveGroups();
  renderDashboard();

  showToast(customMessage, async () => {
    // Undo callback
    currentGroups.splice(groupIndex, 0, deletedGroup);
    await saveGroups();
    renderDashboard();
  });
}

// ==========================================================================
// Drag and Drop Management
// ==========================================================================

function setupTabDragAndDrop(tabEl, groupId) {
  tabEl.addEventListener('dragstart', (e) => {
    draggedTabInfo = {
      tabId: tabEl.dataset.tabId,
      sourceGroupId: groupId,
      sourceIndex: parseInt(tabEl.dataset.index, 10)
    };
    tabEl.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', tabEl.dataset.tabId);
  });

  tabEl.addEventListener('dragend', () => {
    tabEl.classList.remove('dragging');
    document.querySelectorAll('.tab-item').forEach(el => {
      el.classList.remove('drag-over-top', 'drag-over-bottom');
    });
    draggedTabInfo = null;
  });

  tabEl.addEventListener('dragover', (e) => {
    e.preventDefault();
    if (!draggedTabInfo) return;
    e.dataTransfer.dropEffect = 'move';

    const rect = tabEl.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    if (e.clientY < midY) {
      tabEl.classList.add('drag-over-top');
      tabEl.classList.remove('drag-over-bottom');
    } else {
      tabEl.classList.add('drag-over-bottom');
      tabEl.classList.remove('drag-over-top');
    }
  });

  tabEl.addEventListener('dragleave', () => {
    tabEl.classList.remove('drag-over-top', 'drag-over-bottom');
  });

  tabEl.addEventListener('drop', async (e) => {
    e.preventDefault();
    tabEl.classList.remove('drag-over-top', 'drag-over-bottom');
    if (!draggedTabInfo) return;

    const targetGroupId = groupId;
    const targetIndex = parseInt(tabEl.dataset.index, 10);
    const rect = tabEl.getBoundingClientRect();
    const insertAfter = e.clientY >= (rect.top + rect.height / 2);

    const sourceGroup = currentGroups.find(g => g.id === draggedTabInfo.sourceGroupId);
    const targetGroup = currentGroups.find(g => g.id === targetGroupId);
    if (!sourceGroup || !targetGroup) return;

    // Find and remove dragged tab
    const [draggedTab] = sourceGroup.tabs.splice(draggedTabInfo.sourceIndex, 1);
    if (!draggedTab) return;

    // Determine target insertion index
    let destIndex = insertAfter ? targetIndex + 1 : targetIndex;
    if (sourceGroup.id === targetGroup.id && draggedTabInfo.sourceIndex < destIndex) {
      destIndex--;
    }

    targetGroup.tabs.splice(destIndex, 0, draggedTab);

    // Clean up empty source group if needed
    if (sourceGroup.tabs.length === 0 && sourceGroup.id !== targetGroup.id) {
      currentGroups = currentGroups.filter(g => g.id !== sourceGroup.id);
    }

    await saveGroups();
    renderDashboard();
  });
}

// ==========================================================================
// Modals & Export/Import
// ==========================================================================

let activeExportGroup = null;

function openSettingsModal() {
  document.getElementById('setting-ignore-pinned').checked = currentSettings.ignorePinned;
  document.getElementById('setting-ignore-audible').checked = currentSettings.ignoreAudible;
  document.getElementById('setting-remove-on-open').checked = currentSettings.removeOnOpen;
  document.getElementById('setting-deduplicate').checked = currentSettings.deduplicateUrls;
  document.getElementById('setting-ram-per-tab').value = currentSettings.ramPerTabMb || 75;
  document.getElementById('setting-theme').value = currentSettings.theme || 'dark';

  modalSettings.style.display = 'flex';
}

function openExportModal(specificGroup = null) {
  activeExportGroup = specificGroup;
  document.querySelectorAll('.export-tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelector('.export-tab-btn[data-export-format="markdown"]')?.classList.add('active');
  generateExportContent('markdown');
  modalExport.style.display = 'flex';
}

function openShortcutsModal() {
  modalShortcuts.style.display = 'flex';
}

function closeAllModals() {
  modalSettings.style.display = 'none';
  modalExport.style.display = 'none';
  modalShortcuts.style.display = 'none';
  activeExportGroup = null;
}

function generateExportContent(format) {
  const groupsToExport = activeExportGroup ? [activeExportGroup] : currentGroups;

  if (format === 'markdown') {
    let md = `# Squash Tab Export\n*Exported on ${new Date().toLocaleString()}*\n\n`;
    groupsToExport.forEach(g => {
      const gTitle = g.title || `Saved on ${formatTimestamp(g.createdAt)}`;
      md += `## ${gTitle}\n`;
      (g.tabs || []).forEach(t => {
        md += `- [${t.title || t.url}](${t.url})\n`;
      });
      md += '\n';
    });
    exportTextarea.value = md;
  } else if (format === 'text') {
    let text = '';
    groupsToExport.forEach(g => {
      const gTitle = g.title || `Saved on ${formatTimestamp(g.createdAt)}`;
      text += `=== ${gTitle} ===\n`;
      (g.tabs || []).forEach(t => {
        text += `${t.title || 'Untitled'} - ${t.url}\n`;
      });
      text += '\n';
    });
    exportTextarea.value = text;
  } else if (format === 'html') {
    let html = `<!DOCTYPE html>\n<html>\n<head><meta charset="utf-8"><title>Squash Tab Export</title></head>\n<body>\n<h1>Squash Tab Export</h1>\n`;
    groupsToExport.forEach(g => {
      const gTitle = g.title || `Saved on ${formatTimestamp(g.createdAt)}`;
      html += `  <h2>${escapeHtml(gTitle)}</h2>\n  <ul>\n`;
      (g.tabs || []).forEach(t => {
        html += `    <li><a href="${escapeHtml(t.url)}">${escapeHtml(t.title || t.url)}</a></li>\n`;
      });
      html += `  </ul>\n`;
    });
    html += `</body>\n</html>`;
    exportTextarea.value = html;
  } else if (format === 'json') {
    const backupData = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      groups: groupsToExport
    };
    exportTextarea.value = JSON.stringify(backupData, null, 2);
  }
}

function downloadExportFile() {
  const activeBtn = document.querySelector('.export-tab-btn.active');
  const format = activeBtn ? activeBtn.dataset.exportFormat : 'markdown';
  const content = exportTextarea.value;

  const extensions = {
    markdown: 'md',
    text: 'txt',
    html: 'html',
    json: 'json'
  };
  const ext = extensions[format] || 'txt';
  const mimeTypes = {
    markdown: 'text/markdown;charset=utf-8',
    text: 'text/plain;charset=utf-8',
    html: 'text/html;charset=utf-8',
    json: 'application/json;charset=utf-8'
  };

  const blob = new Blob([content], { type: mimeTypes[format] || 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `squash-tabs-${new Date().toISOString().slice(0, 10)}.${ext}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('Download started');
}

async function handleBackupFileImport(e) {
  const file = e.target.files?.[0];
  if (!file) return;

  try {
    const text = await file.text();
    const json = JSON.parse(text);

    let importedGroups = [];
    if (Array.isArray(json)) {
      importedGroups = json;
    } else if (json.groups && Array.isArray(json.groups)) {
      importedGroups = json.groups;
    } else {
      throw new Error('Invalid backup file format');
    }

    // Assign new IDs if needed and sanitize
    importedGroups = importedGroups.map(g => ({
      id: g.id || ('group_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6)),
      title: g.title || 'Imported Group',
      createdAt: g.createdAt || Date.now(),
      tabs: (g.tabs || []).map(t => ({
        id: t.id || ('tab_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6)),
        title: t.title || t.url || 'Untitled Tab',
        url: t.url,
        favIconUrl: t.favIconUrl || '',
        pinned: !!t.pinned
      })),
      starred: !!g.starred,
      collapsed: !!g.collapsed
    }));

    currentGroups = [...importedGroups, ...currentGroups];
    await saveGroups();
    renderDashboard();
    showToast(`Successfully imported ${importedGroups.length} group${importedGroups.length === 1 ? '' : 's'}!`);
  } catch (err) {
    console.error('Import failed:', err);
    showToast('Failed to parse backup file: ' + err.message);
  } finally {
    fileImport.value = '';
  }
}

// ==========================================================================
// Utilities & Helpers
// ==========================================================================

function applyTheme(theme) {
  if (theme === 'system') {
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.body.dataset.theme = prefersDark ? 'dark' : 'light';
  } else {
    document.body.dataset.theme = theme || 'dark';
  }
}

function formatTimestamp(timestamp) {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  const now = new Date();

  const isToday = date.toDateString() === now.toDateString();
  const timeStr = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

  if (isToday) {
    return `Today at ${timeStr}`;
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return `Yesterday at ${timeStr}`;
  }

  return `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })} at ${timeStr}`;
}

function getDomainFromUrl(url) {
  if (!url) return '';
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

function getFaviconUrl(url) {
  if (!url) return 'icons/icon-16.png';
  try {
    const domain = new URL(url).hostname;
    // Standard Google favicon fallback service
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=32`;
  } catch {
    return 'icons/icon-16.png';
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  }
}

function showToast(message, undoCallback = null, duration = 6000) {
  const toast = document.createElement('div');
  toast.className = 'toast toast-success';

  const msgSpan = document.createElement('span');
  msgSpan.className = 'toast-message';
  msgSpan.textContent = message;
  toast.appendChild(msgSpan);

  if (undoCallback) {
    const undoBtn = document.createElement('button');
    undoBtn.className = 'toast-undo-btn';
    undoBtn.textContent = 'Undo';
    undoBtn.addEventListener('click', async () => {
      toast.remove();
      await undoCallback();
    });
    toast.appendChild(undoBtn);
  }

  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(12px)';
    toast.style.transition = 'all 0.25s ease';
    setTimeout(() => toast.remove(), 250);
  }, duration);
}
