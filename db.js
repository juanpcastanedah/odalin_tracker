// IndexedDB Database Abstraction
class Database {
    constructor() {
        this.db = null;
    }

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('odalin_tracker', 2);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve(this.db);
            };

            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                const transaction = e.target.transaction;

                // Characters store
                if (!db.objectStoreNames.contains('characters')) {
                    const charStore = db.createObjectStore('characters', { keyPath: 'id' });
                    charStore.createIndex('name', 'name', { unique: false });
                }

                // Images store
                if (!db.objectStoreNames.contains('images')) {
                    db.createObjectStore('images', { keyPath: 'id', autoIncrement: true });
                }

                // Inventory items store
                if (!db.objectStoreNames.contains('items')) {
                    const itemStore = db.createObjectStore('items', { keyPath: 'id', autoIncrement: true });
                    itemStore.createIndex('assignedTo', 'assignedTo', { unique: false });
                }

                // Migrate legacy store name 'inventory' -> 'items' if present
                if (db.objectStoreNames.contains('inventory') && transaction && transaction.objectStore('inventory')) {
                    const legacyStore = transaction.objectStore('inventory');
                    const itemsStore = transaction.objectStore('items');
                    const getAllReq = legacyStore.getAll();

                    getAllReq.onsuccess = () => {
                        const legacyItems = getAllReq.result || [];
                        for (const legacyItem of legacyItems) {
                            const migrated = {
                                id: legacyItem.id,
                                photoId: legacyItem.photoId || null,
                                type: legacyItem.type || 'equipamiento',
                                assignedTo: legacyItem.assignedTo ?? null
                            };
                            itemsStore.put(migrated);
                        }
                    };
                }
            };
        });
    }

    // ============ CHARACTERS ============
    async getCharacters() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['characters'], 'readonly');
            const store = transaction.objectStore('characters');
            const request = store.getAll();

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
        });
    }

    async getCharacter(id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['characters'], 'readonly');
            const store = transaction.objectStore('characters');
            const request = store.get(id);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
        });
    }

    async saveCharacter(character) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['characters'], 'readwrite');
            const store = transaction.objectStore('characters');
            const request = character.id ? store.put(character) : store.add(character);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
        });
    }

    async deleteCharacter(id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['characters'], 'readwrite');
            const store = transaction.objectStore('characters');
            const request = store.delete(id);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve();
        });
    }

    // ============ IMAGES ============
    async saveImage(blob) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['images'], 'readwrite');
            const store = transaction.objectStore('images');
            const request = store.add({
                blob: blob,
                timestamp: Date.now()
            });

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
        });
    }

    async getImage(id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['images'], 'readonly');
            const store = transaction.objectStore('images');
            const request = store.get(id);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
        });
    }

    async getImageUrl(id) {
        const image = await this.getImage(id);
        if (!image) return null;
        return URL.createObjectURL(image.blob);
    }

    async deleteImage(id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['images'], 'readwrite');
            const store = transaction.objectStore('images');
            const request = store.delete(id);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve();
        });
    }

    // ============ INVENTORY ITEMS ============
    async getItems() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['items'], 'readonly');
            const store = transaction.objectStore('items');
            const request = store.getAll();

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
        });
    }

    async getUnassignedItems() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['items'], 'readonly');
            const store = transaction.objectStore('items');
            const request = store.getAll();

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                const allItems = request.result || [];
                const unassigned = allItems.filter(item => item.assignedTo == null);
                resolve(unassigned);
            };
        });
    }

    async getCharacterItems(characterId) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['items'], 'readonly');
            const store = transaction.objectStore('items');
            const index = store.index('assignedTo');
            const request = index.getAll(characterId);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
        });
    }

    async getItem(id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['items'], 'readonly');
            const store = transaction.objectStore('items');
            const request = store.get(id);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
        });
    }

    async saveItem(item) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['items'], 'readwrite');
            const store = transaction.objectStore('items');
            const request = item.id ? store.put(item) : store.add(item);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
        });
    }

    async deleteItem(id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['items'], 'readwrite');
            const store = transaction.objectStore('items');
            const request = store.delete(id);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve();
        });
    }

    // ============ EXPORT/IMPORT ============
    async exportData() {
        const characters = await this.getCharacters();
        const items = await this.getItems();

        // Convert images to base64
        const charactersWithPhotos = await Promise.all(characters.map(async (char) => {
            let photoData = null;
            if (char.photoId) {
                const image = await this.getImage(char.photoId);
                if (image) {
                    photoData = await this._blobToBase64(image.blob);
                }
            }
            return { ...char, photoData };
        }));

        const itemsWithPhotos = await Promise.all(items.map(async (item) => {
            let photoData = null;
            if (item.photoId) {
                const image = await this.getImage(item.photoId);
                if (image) {
                    photoData = await this._blobToBase64(image.blob);
                }
            }
            return { ...item, photoData };
        }));

        return {
            version: 1,
            exportDate: new Date().toISOString(),
            characters: charactersWithPhotos,
            items: itemsWithPhotos
        };
    }

    async importData(data) {
        if (!data.characters || !data.items) {
            throw new Error('Invalid export format');
        }

        // Clear existing data
        await this.clearAll();

        // Import images and map old IDs to new IDs
        const imageIdMap = {};

        for (const char of data.characters) {
            if (char.photoData) {
                const blob = await this._base64ToBlob(char.photoData);
                const newId = await this.saveImage(blob);
                imageIdMap[char.photoId] = newId;
                char.photoId = newId;
            }
        }

        for (const item of data.items) {
            if (item.photoData) {
                const blob = await this._base64ToBlob(item.photoData);
                const newId = await this.saveImage(blob);
                imageIdMap[item.photoId] = newId;
                item.photoId = newId;
            }
        }

        // Save characters and items
        for (const char of data.characters) {
            delete char.photoData;
            await this.saveCharacter(char);
        }

        for (const item of data.items) {
            delete item.photoData;
            await this.saveItem(item);
        }
    }

    async clearAll() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['characters', 'images', 'items'], 'readwrite');

            transaction.objectStore('characters').clear();
            transaction.objectStore('images').clear();
            transaction.objectStore('items').clear();

            transaction.onerror = () => reject(transaction.error);
            transaction.oncomplete = () => resolve();
        });
    }

    // ============ UTILITIES ============
    _blobToBase64(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }

    _base64ToBlob(base64) {
        const arr = base64.split(',');
        const mime = arr[0].match(/:(.*?);/)[1];
        const bstr = atob(arr[1]);
        const n = bstr.length;
        const u8arr = new Uint8Array(n);
        for (let i = 0; i < n; i++) {
            u8arr[i] = bstr.charCodeAt(i);
        }
        return new Blob([u8arr], { type: mime });
    }
}

// Initialize database instance (actual init is awaited in app.js)
const db = new Database();
