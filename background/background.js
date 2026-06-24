import { db } from './db.js';

const ROOT_MENU_ID = 'rescol-root';
const NEW_FOLDER_MENU_ID = 'rescol-new-folder';

async function setupContextMenus() {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: ROOT_MENU_ID,
      title: 'Save to ResCol',
      contexts: ['image', 'selection']
    });

    chrome.contextMenus.create({
      id: NEW_FOLDER_MENU_ID,
      title: '+ Create a folder first (via Dashboard)',
      parentId: ROOT_MENU_ID,
      contexts: ['image', 'selection']
    });

    rebuildFolderMenus();
  });
}

async function rebuildFolderMenus() {
  const folders = await db.getFolders();
  
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: ROOT_MENU_ID,
      title: 'Save to ResCol',
      contexts: ['image', 'selection']
    });

    if (folders.length === 0) {
      chrome.contextMenus.create({
        id: NEW_FOLDER_MENU_ID,
        title: '+ Create a folder first (via Dashboard)',
        parentId: ROOT_MENU_ID,
        contexts: ['image', 'selection']
      });
      return;
    }

    function createMenuNode(parentId, menuParentId) {
      const children = folders.filter(f => f.parentId === parentId);
      children.forEach(folder => {
        chrome.contextMenus.create({
          id: `folder_${folder.id}`,
          title: folder.name,
          parentId: menuParentId,
          contexts: ['image', 'selection']
        });
        createMenuNode(folder.id, `folder_${folder.id}`);
      });
    }

    createMenuNode(null, ROOT_MENU_ID);
  });
}

chrome.runtime.onInstalled.addListener(() => {
  setupContextMenus();
});

chrome.runtime.onStartup.addListener(() => {
  rebuildFolderMenus();
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'rebuildMenus') {
    rebuildFolderMenus().then(() => sendResponse({success: true}));
    return true; 
  }
});

chrome.action.onClicked.addListener((tab) => {
  chrome.tabs.create({ url: 'dashboard/dashboard.html' });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === NEW_FOLDER_MENU_ID) {
    chrome.tabs.create({ url: 'dashboard/dashboard.html' });
    return;
  }

  if (info.menuItemId.startsWith('folder_')) {
    const folderId = info.menuItemId.replace('folder_', '');
    const itemId = `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const sourceUrl = info.pageUrl;

    if (info.mediaType === 'image') {
      try {
        const response = await fetch(info.srcUrl);
        const blob = await response.blob();
        const reader = new FileReader();
        reader.onloadend = async () => {
          await db.addItem(itemId, folderId, 'image', reader.result, sourceUrl);
        };
        reader.readAsDataURL(blob);
      } catch (err) {
        console.error('Failed to fetch image:', err);
      }
    } else if (info.selectionText) {
      await db.addItem(itemId, folderId, 'text', info.selectionText, sourceUrl);
    }
  }
});
