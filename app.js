class CharacterTracker {
    constructor() {
        this.currentCharacter = null;
        this.currentItem = null;
        this.itemModal = null;
        this.setupEventListeners();
        this.loadCharacters();
    }

    setupEventListeners() {
        // Header buttons
        document.getElementById('exportBtn').addEventListener('click', () => this.exportData());
        document.getElementById('importBtn').addEventListener('click', () => {
            document.getElementById('fileImport').click();
        });
        document.getElementById('fileImport').addEventListener('change', (e) => this.importData(e));

        // Character tab
        document.getElementById('addCharacterBtn').addEventListener('click', () => this.createNewCharacter());

        // Inventory tab
        document.getElementById('inventory-tab').addEventListener('shown.bs.tab', () => this.loadInventory());
        document.getElementById('addItemBtn').addEventListener('click', () => this.createNewItem());

        // Item modal
        this.itemModal = new bootstrap.Modal(document.getElementById('itemModal'));
        const removeBtn = document.getElementById('itemModalRemoveBtn');
        if (removeBtn) {
            removeBtn.addEventListener('click', () => this.removeItemFromCharacter());
        }
    }

    // ============ CHARACTER METHODS ============
    async loadCharacters() {
        const characters = await db.getCharacters();
        const container = document.getElementById('charactersContainer');
        container.innerHTML = '';

        if (characters.length === 0) {
            container.innerHTML = '<div class="col-12 no-items-message">No hay personajes. ¡Agrega uno!</div>';
            return;
        }

        for (const char of characters) {
            const col = document.createElement('div');
            col.className = 'col-lg-4 col-md-6';
            
            let photoHtml = '';
            if (char.photoId) {
                const url = await db.getImageUrl(char.photoId);
                photoHtml = `<img src="${url}" alt="${char.name}" class="character-card-photo">`;
            } else {
                photoHtml = `<div class="character-card-photo" style="background: #333; display: flex; align-items: center; justify-content: center;"><i class="fas fa-user" style="font-size: 64px; color: #666;"></i></div>`;
            }

            let itemsHtml = '';
            if (char.items && char.items.length > 0) {
                itemsHtml = `
                    <div class="character-items-section">
                        <h6>Objetos Equipados</h6>
                        <div class="character-items-grid">
                            ${char.items.map(itemId => {
                                const typeClass = char.itemTypes && char.itemTypes[itemId] ? char.itemTypes[itemId] : 'equipamiento';
                                const icon = typeClass === 'consumible' ? 'fa-vial' : 'fa-shield-halved';
                                const title = typeClass === 'consumible' ? 'Consumible' : 'Equipamiento';
                                return `<button class="item-icon-btn ${typeClass}" title="${title}" aria-label="${title}" data-item-id="${itemId}" onclick="tracker.showItemModal(${char.id}, ${itemId})">
                                    <i class="fas ${icon}"></i>
                                </button>`;
                            }).join('')}
                        </div>
                    </div>
                `;
            }

            col.innerHTML = `
                <div class="character-card">
                    ${photoHtml}
                    <div class="character-card-info">
                        <input type="text" class="character-name-input mb-2" value="${char.name}" onchange="tracker.updateCharacterName(${char.id}, this.value)">
                        
                        <div class="character-stats-row">
                            <div class="stat-badge alma">
                                <i class="fas fa-circle-notch"></i>
                                <input type="number" min="0" max="10" value="${char.alma}" onchange="tracker.updateCharacterStat(${char.id}, 'alma', this.value)" style="width: 30px; background: transparent; border: none; color: inherit; padding: 0; text-align: center;">
                            </div>
                            <div class="stat-badge corruption">
                                <i class="fas fa-circle"></i>
                                <input type="number" min="0" max="10" value="${char.corrupcion}" onchange="tracker.updateCharacterStat(${char.id}, 'corrupcion', this.value)" style="width: 30px; background: transparent; border: none; color: inherit; padding: 0; text-align: center;">
                            </div>
                            <div class="stat-badge health">
                                <i class="fas fa-heart"></i>
                                <input type="number" min="25" max="100" step="5" value="${char.saludMax}" onchange="tracker.updateCharacterStat(${char.id}, 'saludMax', this.value)" style="width: 35px; background: transparent; border: none; color: inherit; padding: 0; text-align: center;">
                            </div>
                        </div>

                        <div class="character-attributes">
                            ${this.renderAttributeBox('Mente', 'fa-brain', char.atributos.mente, char.id, 'mente')}
                            ${this.renderAttributeBox('Espíritu', 'fa-star', char.atributos.espiritu, char.id, 'espiritu')}
                            ${this.renderAttributeBox('Vigor', 'fa-dumbbell', char.atributos.vigor, char.id, 'vigor')}
                            ${this.renderAttributeBox('Fuerza', 'fa-bolt', char.atributos.fuerza, char.id, 'fuerza')}
                            ${this.renderAttributeBox('Suerte', 'fa-dice', char.atributos.suerte, char.id, 'suerte')}
                            ${this.renderAttributeBox('Agilidad', 'fa-person-running', char.atributos.agilidad, char.id, 'agilidad')}
                        </div>

                        ${itemsHtml}

                        <div style="margin-top: 0.75rem; display: flex; gap: 0.5rem;">
                            <button class="btn btn-sm btn-primary flex-grow-1" onclick="tracker.addPhotoToCharacter(${char.id})">
                                <i class="fas fa-image"></i> Foto
                            </button>
                            <button class="btn btn-sm btn-danger" onclick="tracker.deleteCharacter(${char.id})">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
            container.appendChild(col);
        }
    }

    renderAttributeBox(label, icon, value, characterId, attrName) {
        return `
            <div class="attr-box">
                <i class="fas ${icon} attr-icon"></i>
                <span class="attr-label">${label}</span>
                <div style="display: flex; gap: 0.3rem; align-items: center;">
                    <button class="stat-control-btn" onclick="tracker.updateAttribute(${characterId}, '${attrName}', ${value - 1})">−</button>
                    <span class="attr-value" style="min-width: 30px; text-align: center;">${value}</span>
                    <button class="stat-control-btn" onclick="tracker.updateAttribute(${characterId}, '${attrName}', ${value + 1})">+</button>
                </div>
            </div>
        `;
    }

    async createNewCharacter() {
        const characters = await db.getCharacters();
        const newId = Math.max(...characters.map(c => c.id || 0), 0) + 1;

        const newCharacter = {
            id: newId,
            name: `Personaje ${newId}`,
            photoId: null,
            alma: 0,
            corrupcion: 0,
            saludMax: 25,
            atributos: {
                mente: 0,
                espiritu: 0,
                vigor: 0,
                fuerza: 0,
                suerte: 0,
                agilidad: 0
            },
            items: [],
            itemTypes: {}
        };

        await db.saveCharacter(newCharacter);
        this.loadCharacters();
    }

    async updateCharacterName(characterId, name) {
        const char = await db.getCharacter(characterId);
        if (char) {
            char.name = name;
            await db.saveCharacter(char);
        }
    }

    async updateCharacterStat(characterId, stat, value) {
        const char = await db.getCharacter(characterId);
        if (char) {
            char[stat] = parseInt(value);
            await db.saveCharacter(char);
        }
    }

    async updateAttribute(characterId, attrName, value) {
        const char = await db.getCharacter(characterId);
        if (char) {
            if (value < 0) value = 0;
            char.atributos[attrName] = value;
            await db.saveCharacter(char);
            this.loadCharacters();
        }
    }

    async addPhotoToCharacter(characterId) {
        const file = await this.promptFileUpload();
        if (!file) return;

        const blob = await this.compressImage(file);
        const imageId = await db.saveImage(blob);

        const char = await db.getCharacter(characterId);
        if (char.photoId) {
            await db.deleteImage(char.photoId);
        }
        char.photoId = imageId;
        await db.saveCharacter(char);
        this.loadCharacters();
    }

    async deleteCharacter(characterId) {
        if (!confirm('¿Eliminar este personaje y todos sus datos?')) return;

        const char = await db.getCharacter(characterId);
        if (char.photoId) {
            await db.deleteImage(char.photoId);
        }
        if (char.items) {
            for (const itemId of char.items) {
                const item = await db.getItem(itemId);
                if (item) {
                    item.assignedTo = null;
                    await db.saveItem(item);
                }
            }
        }
        await db.deleteCharacter(characterId);
        this.loadCharacters();
    }

    // ============ ITEM METHODS ============
    async loadInventory() {
        const items = await db.getUnassignedItems();
        const container = document.getElementById('inventoryContainer');
        container.innerHTML = '';

        if (items.length === 0) {
            container.innerHTML = '<div class="col-12 no-items-message">No hay objetos sin asignar.</div>';
            return;
        }

        for (const item of items) {
            const col = document.createElement('div');
            col.className = 'col-lg-3 col-md-4 col-sm-6';

            let photoHtml = '';
            if (item.photoId) {
                const url = await db.getImageUrl(item.photoId);
                photoHtml = `<img src="${url}" alt="Objeto" class="inventory-item-photo">`;
            } else {
                photoHtml = `<div class="inventory-item-photo" style="background: #333; display: flex; align-items: center; justify-content: center;"><i class="fas fa-box" style="font-size: 48px; color: #666;"></i></div>`;
            }

            const icon = item.type === 'consumible' ? 'fa-vial' : 'fa-sword';

            col.innerHTML = `
                <div class="inventory-item-card" onclick="tracker.assignItemModal(${item.id})">
                    ${photoHtml}
                    <div class="inventory-item-info">
                        <div class="inventory-item-type ${item.type}">
                            <i class="fas ${icon}"></i> ${item.type}
                        </div>
                    </div>
                </div>
            `;
            container.appendChild(col);
        }
    }

    async createNewItem() {
        try {
            const file = await this.promptFileUpload();
            if (!file) return;

            const blob = await this.compressImage(file);
            const imageId = await db.saveImage(blob);

            const newItem = {
                photoId: imageId,
                type: 'equipamiento',
                assignedTo: null
            };

            await db.saveItem(newItem);
            await this.loadInventory();
        } catch (error) {
            console.error('Error al agregar objeto al inventario:', error);
            alert('No se pudo agregar el objeto. Recarga la página e intenta nuevamente.');
        }
    }

    async assignItemModal(itemId) {
        const characters = await db.getCharacters();
        const item = await db.getItem(itemId);

        // Temporarily show in modal
        const modalBody = document.querySelector('#itemModal .modal-body');
        const photo = document.getElementById('itemModalPhoto');
        const type = document.getElementById('itemModalType');
        const originalBody = modalBody.innerHTML;
        const footer = document.querySelector('#itemModal .modal-footer');
        const originalFooter = footer.innerHTML;

        const url = await db.getImageUrl(item.photoId);
        photo.src = url;
        type.value = item.type;
        type.onchange = async () => {
            item.type = type.value;
            await db.saveItem(item);
        };

        let assignmentHtml = '';
        if (characters.length === 0) {
            assignmentHtml = `
                <div class="mt-3 p-2 border rounded border-secondary text-center">
                    <div class="small text-muted mb-2">No hay personajes para asignar este objeto.</div>
                    <button type="button" class="btn btn-sm btn-outline-light" onclick="tracker.goToCharactersTab()">
                        <i class="fas fa-users"></i> Ir a Personajes
                    </button>
                </div>
            `;
        } else {
            const characterButtons = characters
                .map(char => `<button class="btn btn-sm btn-outline-light" onclick="tracker.assignItemToCharacter(${itemId}, ${char.id})">${char.name}</button>`)
                .join('');

            assignmentHtml = `
                <div class="mt-3 p-2 border rounded border-secondary">
                    <div class="small text-muted mb-2">Asignar a personaje:</div>
                    <div style="display: flex; flex-direction: column; gap: 0.5rem;">${characterButtons}</div>
                </div>
            `;
        }

        modalBody.innerHTML = `${originalBody}${assignmentHtml}`;
        footer.innerHTML = `
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
        `;

        this.currentItem = { id: itemId, characterId: null };

        this.itemModal.show();
        
        // Restore modal body when modal is hidden
        document.getElementById('itemModal').addEventListener('hidden.bs.modal', () => {
            modalBody.innerHTML = originalBody;
            footer.innerHTML = originalFooter;
        }, { once: true });
    }

    goToCharactersTab() {
        this.itemModal.hide();
        const charactersTab = document.getElementById('characters-tab');
        if (charactersTab) {
            const tab = new bootstrap.Tab(charactersTab);
            tab.show();
        }
    }

    async assignItemToCharacter(itemId, characterId) {
        const item = await db.getItem(itemId);
        const char = await db.getCharacter(characterId);

        item.assignedTo = characterId;
        await db.saveItem(item);

        if (!char.items) char.items = [];
        if (!char.itemTypes) char.itemTypes = {};
        char.items.push(itemId);
        char.itemTypes[itemId] = item.type;
        await db.saveCharacter(char);

        this.itemModal.hide();
        this.loadInventory();
        this.loadCharacters();
    }

    async showItemModal(characterId, itemId) {
        const item = await db.getItem(itemId);
        const photo = document.getElementById('itemModalPhoto');
        const type = document.getElementById('itemModalType');

        const url = await db.getImageUrl(item.photoId);
        photo.src = url;
        type.value = item.type;

        this.currentItem = { id: itemId, characterId: characterId };

        // Show the default footer
        const footer = document.querySelector('#itemModal .modal-footer');
        footer.innerHTML = `
            <button id="itemModalRemoveBtn" class="btn btn-danger me-auto">
                <i class="fas fa-trash"></i> Quitar
            </button>
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
        `;

        document.getElementById('itemModalRemoveBtn').addEventListener('click', () => this.removeItemFromCharacter());

        this.itemModal.show();
    }

    async removeItemFromCharacter() {
        if (!this.currentItem || !this.currentItem.characterId) return;

        const char = await db.getCharacter(this.currentItem.characterId);
        char.items = char.items.filter(id => id !== this.currentItem.id);
        if (char.itemTypes) {
            delete char.itemTypes[this.currentItem.id];
        }
        await db.saveCharacter(char);

        const item = await db.getItem(this.currentItem.id);
        item.assignedTo = null;
        await db.saveItem(item);

        this.itemModal.hide();
        this.loadCharacters();
    }

    closeItemModal() {
        this.itemModal.hide();
    }

    // ============ UTILITIES ============
    async compressImage(file) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;

                    if (width > 1280) {
                        height = (height * 1280) / width;
                        width = 1280;
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    canvas.toBlob((blob) => {
                        resolve(blob);
                    }, 'image/jpeg', 0.8);
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        });
    }

    promptFileUpload() {
        return new Promise((resolve) => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.onchange = (e) => {
                const file = e.target.files[0];
                resolve(file || null);
            };
            input.click();
        });
    }

    async exportData() {
        try {
            const data = await db.exportData();
            const json = JSON.stringify(data, null, 2);
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `odalin_backup_${new Date().toISOString().slice(0, 10)}.json`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (err) {
            alert('Error al exportar: ' + err.message);
        }
    }

    async importData(event) {
        const file = event.target.files[0];
        if (!file) return;

        try {
            const text = await file.text();
            const data = JSON.parse(text);
            await db.importData(data);
            this.loadCharacters();
            alert('Datos importados correctamente');
        } catch (err) {
            alert('Error al importar: ' + err.message);
        }

        event.target.value = '';
    }
}

// Initialize app when DOM is ready
let tracker;
document.addEventListener('DOMContentLoaded', async () => {
    await db.init();
    tracker = new CharacterTracker();
});
