export const db = {
  dbName: 'ResColDB',
  version: 1,
  
  async openDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);
      
      request.onerror = (event) => reject(event.target.error);
      
      request.onsuccess = (event) => resolve(event.target.result);
      
      request.onupgradeneeded = (event) => {
        const database = event.target.result;
        
        if (!database.objectStoreNames.contains('folders')) {
          const folderStore = database.createObjectStore('folders', { keyPath: 'id' });
          folderStore.createIndex('parentId', 'parentId', { unique: false });
        }
        
        if (!database.objectStoreNames.contains('items')) {
          const itemStore = database.createObjectStore('items', { keyPath: 'id' });
          itemStore.createIndex('folderId', 'folderId', { unique: false });
        }
      };
    });
  },

  async addFolder(id, name, parentId) {
    const database = await this.openDB();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(['folders'], 'readwrite');
      const store = transaction.objectStore('folders');
      const request = store.put({ id, name, parentId });
      
      request.onsuccess = () => resolve();
      request.onerror = (event) => reject(event.target.error);
    });
  },

  async getFolders() {
    const database = await this.openDB();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(['folders'], 'readonly');
      const store = transaction.objectStore('folders');
      const request = store.getAll();
      
      request.onsuccess = (event) => resolve(event.target.result);
      request.onerror = (event) => reject(event.target.error);
    });
  },

  async addItem(id, folderId, type, content, sourceUrl) {
    const database = await this.openDB();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(['items'], 'readwrite');
      const store = transaction.objectStore('items');
      const request = store.put({ 
        id, 
        folderId, 
        type, 
        content, 
        sourceUrl,
        timestamp: Date.now()
      });
      
      request.onsuccess = () => resolve();
      request.onerror = (event) => reject(event.target.error);
    });
  },

  async getItems() {
    const database = await this.openDB();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(['items'], 'readonly');
      const store = transaction.objectStore('items');
      const request = store.getAll();
      
      request.onsuccess = (event) => resolve(event.target.result);
      request.onerror = (event) => reject(event.target.error);
    });
  },

  async deleteFolder(id) {
    const database = await this.openDB();
    const allFolders = await this.getFolders();
    const childrenIds = this._getAllChildFolders(id, allFolders);
    childrenIds.push(id);

    return new Promise((resolve, reject) => {
      const transaction = database.transaction(['folders', 'items'], 'readwrite');
      const folderStore = transaction.objectStore('folders');
      const itemStore = transaction.objectStore('items');

      childrenIds.forEach(folderId => {
        folderStore.delete(folderId);
        const index = itemStore.index('folderId');
        const req = index.getAllKeys(IDBKeyRange.only(folderId));
        req.onsuccess = () => {
          req.result.forEach(itemId => itemStore.delete(itemId));
        };
      });

      transaction.oncomplete = () => resolve();
      transaction.onerror = (e) => reject(e);
    });
  },

  _getAllChildFolders(parentId, folders) {
    let children = folders.filter(f => f.parentId === parentId).map(f => f.id);
    for (let childId of children) {
      children = children.concat(this._getAllChildFolders(childId, folders));
    }
    return children;
  },

  async deleteItem(id) {
    const database = await this.openDB();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(['items'], 'readwrite');
      const store = transaction.objectStore('items');
      const request = store.delete(id);
      
      request.onsuccess = () => resolve();
      request.onerror = (event) => reject(event.target.error);
    });
  }
};
