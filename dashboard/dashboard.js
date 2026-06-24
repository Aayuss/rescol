import { db } from '../background/db.js';

let currentFolderId = null;
let allFolders = [];
let pendingParentId = null;

const folderTreeEl = document.getElementById('folder-tree');
const itemsGridEl = document.getElementById('items-grid');
const currentFolderTitle = document.getElementById('current-folder-title');
const addSubfolderBtn = document.getElementById('add-subfolder-btn');
const exportBtn = document.getElementById('export-btn');
const deleteFolderBtn = document.getElementById('delete-folder-btn');
const collectionCount = document.getElementById('collection-count');

const modal = document.getElementById('folder-modal');
const modalTitle = document.getElementById('modal-title');
const folderNameInput = document.getElementById('folder-name-input');
const modalSaveBtn = document.getElementById('modal-save-btn');
const modalCancelBtn = document.getElementById('modal-cancel-btn');

async function init() {
  await loadFolders();
  setupEventListeners();
}

async function loadFolders() {
  allFolders = await db.getFolders();
  renderFolderTree();
}

function renderFolderTree() {
  folderTreeEl.innerHTML = '';
  if (allFolders.length === 0) {
    folderTreeEl.innerHTML = '<div class="tree-empty">Create a collection to begin saving references.</div>';
    return;
  }

  function renderNode(parentId, level) {
    const children = allFolders.filter(f => f.parentId === parentId);
    children.forEach(folder => {
      const div = document.createElement('div');
      div.className = `folder-item ${currentFolderId === folder.id ? 'active' : ''}`;
      
      let indents = '';
      for (let i=0; i<level; i++) indents += '<span class="folder-indent"></span>';
      
      div.innerHTML = `${indents}<span class="folder-glyph">↳</span><span>${folder.name}</span>`;
      div.onclick = () => selectFolder(folder.id, folder.name);
      
      folderTreeEl.appendChild(div);
      renderNode(folder.id, level + 1);
    });
  }

  renderNode(null, 0);
}

async function selectFolder(folderId, folderName) {
  currentFolderId = folderId;
  currentFolderTitle.textContent = folderName;
  collectionCount.textContent = 'Loading saved material…';
  
  addSubfolderBtn.classList.remove('hidden');
  exportBtn.classList.remove('hidden');
  deleteFolderBtn.classList.remove('hidden');

  renderFolderTree();
  await loadItems();
}

async function loadItems() {
  itemsGridEl.innerHTML = '';
  if (!currentFolderId) return;

  const allItems = await db.getItems();
  const folderItems = allItems.filter(item => item.folderId === currentFolderId);
  collectionCount.textContent = `${folderItems.length} ${folderItems.length === 1 ? 'saved reference' : 'saved references'}`;

  if (folderItems.length === 0) {
    itemsGridEl.innerHTML = '<div class="empty-state"><div><span class="empty-mark">+</span><p>This collection is ready for its first reference.</p><small>Right-click text or an image on any webpage to save it here.</small></div></div>';
    return;
  }

  folderItems.forEach(item => {
    const card = document.createElement('div');
    card.className = 'item-card';

    let contentHtml = '';
    if (item.type === 'image') {
      contentHtml = `<img src="${item.content}" alt="Saved Image">`;
    } else {
      contentHtml = `<div class="text-preview">${item.content.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>`;
    }

    card.innerHTML = `
      <div class="item-content">
        ${contentHtml}
      </div>
      <div class="item-footer">
        <span class="item-type">${item.type === 'image' ? 'Image reference' : 'Text note'}</span>
        <button class="delete-item-btn" data-id="${item.id}">×</button>
      </div>
    `;

    card.querySelector('.delete-item-btn').onclick = async (e) => {
      e.stopPropagation();
      await db.deleteItem(item.id);
      await loadItems();
    };

    itemsGridEl.appendChild(card);
  });
}

function openModal(isRoot) {
  pendingParentId = isRoot ? null : currentFolderId;
  modalTitle.textContent = isRoot ? 'New collection' : 'New section';
  folderNameInput.value = '';
  modal.classList.remove('hidden');
  folderNameInput.focus();
}

function closeModal() {
  modal.classList.add('hidden');
}

async function saveFolder() {
  const name = folderNameInput.value.trim();
  if (!name) return;

  const id = `folder_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  await db.addFolder(id, name, pendingParentId);
  
  chrome.runtime.sendMessage({ action: 'rebuildMenus' });

  closeModal();
  await loadFolders();
  
  if (!pendingParentId) {
    selectFolder(id, name);
  }
}

async function exportFolder() {
  if (!currentFolderId) return;
  const folder = allFolders.find(f => f.id === currentFolderId);
  if (!folder) return;

  exportBtn.textContent = 'Preparing...';
  exportBtn.disabled = true;

  try {
    const zip = new JSZip();
    const allItems = await db.getItems();

    function addFolderToZip(folderId, currentZipFolder) {
      const items = allItems.filter(i => i.folderId === folderId);
      let imgCount = 1;
      let textCount = 1;

      items.forEach(item => {
        if (item.type === 'image') {
          const parts = item.content.split(',');
          if (parts.length === 2) {
            const base64Data = parts[1];
            const mime = parts[0].match(/:(.*?);/)[1];
            let ext = mime.split('/')[1] || 'png';
            if (ext === 'jpeg') ext = 'jpg';
            
            currentZipFolder.file(`image_${imgCount}.${ext}`, base64Data, {base64: true});
            imgCount++;
          }
        } else {
          currentZipFolder.file(`text_${textCount}.txt`, item.content);
          textCount++;
        }
      });

      const subfolders = allFolders.filter(f => f.parentId === folderId);
      subfolders.forEach(sub => {
        const subZip = currentZipFolder.folder(sub.name.replace(/[\/\\?%*:|"<>]/g, '-'));
        addFolderToZip(sub.id, subZip);
      });
    }

    addFolderToZip(currentFolderId, zip);

    const content = await zip.generateAsync({type:"blob"});
    const url = URL.createObjectURL(content);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `${folder.name.replace(/[\/\\?%*:|"<>]/g, '-')}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
  } catch (err) {
    console.error("Export failed", err);
    alert("Export failed: " + err.message);
  } finally {
    exportBtn.textContent = 'Export to ZIP';
    exportBtn.disabled = false;
  }
}

function setupEventListeners() {
  document.getElementById('add-root-folder-btn').onclick = () => openModal(true);
  addSubfolderBtn.onclick = () => openModal(false);
  modalCancelBtn.onclick = closeModal;
  modalSaveBtn.onclick = saveFolder;
  
  folderNameInput.addEventListener('keyup', (e) => {
    if (e.key === 'Enter') saveFolder();
    if (e.key === 'Escape') closeModal();
  });

  deleteFolderBtn.onclick = async () => {
    if (confirm("Are you sure you want to delete this folder and ALL its subfolders and items?")) {
      await db.deleteFolder(currentFolderId);
      chrome.runtime.sendMessage({ action: 'rebuildMenus' });
      currentFolderId = null;
      currentFolderTitle.textContent = 'Select a collection';
      collectionCount.textContent = 'Choose a collection';
      addSubfolderBtn.classList.add('hidden');
      exportBtn.classList.add('hidden');
      deleteFolderBtn.classList.add('hidden');
      itemsGridEl.innerHTML = '<div class="empty-state"><p>Select a collection to view its contents.</p></div>';
      await loadFolders();
    }
  };

  exportBtn.onclick = exportFolder;
}

document.addEventListener('DOMContentLoaded', init);
