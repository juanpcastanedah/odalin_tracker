class CharacterTracker {
    constructor() {
        this.currentCharacter = null;
        this.currentItem = null;
        this.itemModal = null;
        this.positiveStatuses = ['potenciado', 'reforzado', 'revitalizado', 'acelerado'];
        this.negativeStatuses = ['debilitado', 'vulnerable', 'envenenado', 'ralentizado'];
        this.setupEventListeners();
        this.loadCharacters();
    }

    setupEventListeners() {
        // Header buttons
        document.getElementById('restBtn').addEventListener('click', () => this.applyRestToAllCharacters());
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
            const normalized = this.normalizeCharacter(char);
            if (normalized) {
                await db.saveCharacter(char);
            }

            const col = document.createElement('div');
            col.className = 'col-12';
            
            let photoHtml = '';
            if (char.photoId) {
                const url = await db.getImageUrl(char.photoId);
                photoHtml = `<img src="${url}" alt="${char.name}" class="character-card-photo">`;
            } else {
                photoHtml = `<div class="character-card-photo" style="background: #333; display: flex; align-items: center; justify-content: center;"><i class="fas fa-user" style="font-size: 64px; color: #666;"></i></div>`;
            }

            let itemsHtml = '';
            if (char.items && char.items.length > 0) {
                const itemTypeOrder = ['arma', 'armadura', 'accesorio', 'consumible'];
                const sortedItems = [...char.items].sort((a, b) => {
                    const typeA = this.normalizeItemType(char.itemTypes && char.itemTypes[a] ? char.itemTypes[a] : 'armadura');
                    const typeB = this.normalizeItemType(char.itemTypes && char.itemTypes[b] ? char.itemTypes[b] : 'armadura');
                    return itemTypeOrder.indexOf(typeA) - itemTypeOrder.indexOf(typeB);
                });

                itemsHtml = `
                    <div class="character-items-section">
                        <h6>Objetos Equipados</h6>
                        <div class="character-items-grid">
                            ${sortedItems.map(itemId => {
                                const rawType = char.itemTypes && char.itemTypes[itemId] ? char.itemTypes[itemId] : 'armadura';
                                const meta = this.getItemTypeMeta(rawType);
                                const typeClass = meta.type;
                                const icon = meta.icon;
                                const title = meta.label;
                                return `<button class="item-icon-btn ${typeClass}" title="${title}" aria-label="${title}" data-item-id="${itemId}" onclick="tracker.showItemModal(${char.id}, ${itemId})">
                                    <i class="fas ${icon}"></i>
                                </button>`;
                            }).join('')}
                        </div>
                    </div>
                `;
            }

            const statusHtml = `
                <div class="character-statuses-section">
                    <h6>Estados Positivos</h6>
                    <div class="status-pills">
                        ${this.positiveStatuses.map(status => this.renderStatusCounter(char, status, 'positivo')).join('')}
                    </div>
                    <h6 class="mt-2">Estados Negativos</h6>
                    <div class="status-pills">
                        ${this.negativeStatuses.map(status => this.renderStatusCounter(char, status, 'negativo')).join('')}
                    </div>
                </div>
            `;

            col.innerHTML = `
                <div class="character-card">
                    ${photoHtml}
                    <div class="character-card-info">
                        <div class="character-name-row mb-2">
                            <input type="text" class="character-name-input" value="${char.name}" onchange="tracker.updateCharacterName(${char.id}, this.value)">
                            <div class="name-actions-box icon-acciones">
                                <i class="fas fa-bolt icon-acciones"></i>
                                <span class="name-actions-label">Acciones</span>
                                <button class="stat-control-btn" onclick="tracker.updateCounter(${char.id}, 'acciones', -1, 0, null)">−</button>
                                <span class="name-actions-value">${char.acciones}</span>
                                <button class="stat-control-btn" onclick="tracker.updateCounter(${char.id}, 'acciones', 1, 0, null)">+</button>
                            </div>
                        </div>
                        
                        <div class="character-primary-counters">
                            ${this.renderCounterBox('Alma', 'fa-circle-notch', 'icon-alma', char.alma, char.id, 'alma', -1, 1, 0, 10)}
                            ${this.renderCounterBox('Corrupcion', 'fa-circle', 'icon-corrupcion', char.corrupcion, char.id, 'corrupcion', -1, 1, 0, 10)}
                            ${this.renderCounterBox('Salud Max', 'fa-heart', 'icon-salud', char.saludMax, char.id, 'saludMax', -5, 5, 25, 100)}
                            ${this.renderCounterBox('Habilidad', 'fa-star-of-life', 'icon-habilidad', char.habilidadEspecial, char.id, 'habilidadEspecial', -1, 1, 0, null)}
                        </div>

                        <div class="character-attributes">
                            ${this.renderAttributeBox('Mente', 'fa-brain', 'icon-mente', char.atributos.mente, char.id, 'mente')}
                            ${this.renderAttributeBox('Espíritu', 'fa-star', 'icon-espiritu', char.atributos.espiritu, char.id, 'espiritu')}
                            ${this.renderAttributeBox('Vigor', 'fa-dumbbell', 'icon-vigor', char.atributos.vigor, char.id, 'vigor')}
                            ${this.renderAttributeBox('Fuerza', 'fa-bolt', 'icon-fuerza', char.atributos.fuerza, char.id, 'fuerza')}
                            ${this.renderAttributeBox('Suerte', 'fa-dice', 'icon-suerte', char.atributos.suerte, char.id, 'suerte')}
                            ${this.renderAttributeBox('Agilidad', 'fa-person-running', 'icon-agilidad', char.atributos.agilidad, char.id, 'agilidad')}
                        </div>

                        ${statusHtml}

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

    normalizeCharacter(char) {
        let changed = false;

        if (!char.atributos) {
            char.atributos = {};
            changed = true;
        }

        const defaultAttrs = ['mente', 'espiritu', 'vigor', 'fuerza', 'suerte', 'agilidad'];
        for (const key of defaultAttrs) {
            if (typeof char.atributos[key] !== 'number') {
                char.atributos[key] = 0;
                changed = true;
            }
        }

        if (typeof char.alma !== 'number') {
            char.alma = 0;
            changed = true;
        }
        if (typeof char.corrupcion !== 'number') {
            char.corrupcion = 0;
            changed = true;
        }
        if (typeof char.saludMax !== 'number') {
            char.saludMax = 25;
            changed = true;
        }
        if (typeof char.acciones !== 'number') {
            char.acciones = 3;
            changed = true;
        }
        if (typeof char.habilidadEspecial !== 'number') {
            char.habilidadEspecial = 0;
            changed = true;
        }
        if (Array.isArray(char.estadosPositivos)) {
            const mapped = {};
            for (const status of char.estadosPositivos) {
                mapped[status] = (mapped[status] || 0) + 1;
            }
            char.estadosPositivos = mapped;
            changed = true;
        } else if (!char.estadosPositivos || typeof char.estadosPositivos !== 'object') {
            char.estadosPositivos = {};
            changed = true;
        }
        if (Array.isArray(char.estadosNegativos)) {
            const mapped = {};
            for (const status of char.estadosNegativos) {
                mapped[status] = (mapped[status] || 0) + 1;
            }
            char.estadosNegativos = mapped;
            changed = true;
        } else if (!char.estadosNegativos || typeof char.estadosNegativos !== 'object') {
            char.estadosNegativos = {};
            changed = true;
        }
        if (!Array.isArray(char.items)) {
            char.items = [];
            changed = true;
        }
        if (!char.itemTypes) {
            char.itemTypes = {};
            changed = true;
        }
        if (char.itemTypes && typeof char.itemTypes === 'object') {
            for (const key of Object.keys(char.itemTypes)) {
                const normalizedType = this.normalizeItemType(char.itemTypes[key]);
                if (char.itemTypes[key] !== normalizedType) {
                    char.itemTypes[key] = normalizedType;
                    changed = true;
                }
            }
        }

        return changed;
    }

    normalizeItemType(type) {
        if (type === 'equipamiento') return 'armadura';
        if (type === 'consumible') return 'consumible';
        if (type === 'arma') return 'arma';
        if (type === 'armadura') return 'armadura';
        if (type === 'accesorio') return 'accesorio';
        return 'armadura';
    }

    getItemTypeMeta(type) {
        const normalized = this.normalizeItemType(type);
        if (normalized === 'consumible') {
            return { type: 'consumible', icon: 'fa-vial', label: 'Consumible' };
        }
        if (normalized === 'arma') {
            return { type: 'arma', icon: 'fa-hammer', label: 'Arma' };
        }
        if (normalized === 'accesorio') {
            return { type: 'accesorio', icon: 'fa-ring', label: 'Accesorio' };
        }
        return { type: 'armadura', icon: 'fa-shield-halved', label: 'Armadura' };
    }

    renderCounterBox(label, icon, iconClass, value, characterId, field, dec, inc, min, max) {
        const minArg = min == null ? 'null' : String(min);
        const maxArg = max == null ? 'null' : String(max);
        return `
            <div class="counter-box ${iconClass}">
                <div class="counter-left">
                    <i class="fas ${icon} attr-icon ${iconClass}"></i>
                    <span class="counter-label">${label}</span>
                </div>
                <div class="counter-controls">
                    <button class="stat-control-btn" onclick="tracker.updateCounter(${characterId}, '${field}', ${dec}, ${minArg}, ${maxArg})">−</button>
                    <span class="counter-value">${value}</span>
                    <button class="stat-control-btn" onclick="tracker.updateCounter(${characterId}, '${field}', ${inc}, ${minArg}, ${maxArg})">+</button>
                </div>
            </div>
        `;
    }

    renderStatusCounter(char, status, type) {
        const prop = type === 'positivo' ? 'estadosPositivos' : 'estadosNegativos';
        const count = Number(char[prop][status] || 0);
        const active = count > 0;
        const cls = `${type} ${active ? 'active' : ''}`;
        const label = status.charAt(0).toUpperCase() + status.slice(1);
        return `
            <div class="status-counter ${cls}">
                <span class="status-label">${label}</span>
                <div class="status-controls">
                    <button class="status-btn" onclick="tracker.updateStatusCounter(${char.id}, '${type}', '${status}', -1)">−</button>
                    <span class="status-count">${count}</span>
                    <button class="status-btn" onclick="tracker.updateStatusCounter(${char.id}, '${type}', '${status}', 1)">+</button>
                </div>
            </div>
        `;
    }

    renderAttributeBox(label, icon, iconClass, value, characterId, attrName) {
        const buff = this.getAttributeBuffText(attrName, value);
        return `
            <div class="attr-box ${iconClass}">
                <div class="attr-left">
                    <div class="attr-main">
                        <i class="fas ${icon} attr-icon ${iconClass}"></i>
                        <span class="attr-label">${label}</span>
                    </div>
                    <span class="attr-buff">${buff}</span>
                </div>
                <div class="attr-controls">
                    <button class="stat-control-btn" onclick="tracker.updateAttribute(${characterId}, '${attrName}', ${value - 1})">−</button>
                    <span class="attr-value">${value}</span>
                    <button class="stat-control-btn" onclick="tracker.updateAttribute(${characterId}, '${attrName}', ${value + 1})">+</button>
                </div>
            </div>
        `;
    }

    getAttributeBuffText(attrName, value) {
        const v = Math.max(0, Number(value) || 0);

        if (attrName === 'mente') {
            if (v === 0) return 'Sin bono';
            if (v <= 3) return '+1 carta Inst/Hab';
            if (v <= 6) return '+2 cartas Inst/Hab';
            if (v <= 9) return '+3 cartas Inst/Hab';
            if (v <= 11) return '+4 cartas Inst/Hab';
            return '+5 cartas Inst/Hab';
        }

        if (attrName === 'espiritu') {
            if (v === 0) return 'Sin bono';
            if (v <= 3) return '+1 carta Aura/Ataque';
            if (v <= 6) return '+2 cartas Aura/Ataque';
            if (v <= 9) return '+3 cartas Aura/Ataque';
            if (v <= 11) return '+4 cartas Aura/Ataque';
            return '+5 cartas Aura/Ataque';
        }

        if (attrName === 'agilidad') {
            if (v === 0) return 'Sin escudo';
            if (v <= 2) return '+1 escudo';
            if (v <= 4) return '+2 escudos';
            if (v <= 6) return '+3 escudos';
            if (v === 7) return '+4 escudos';
            if (v === 8) return '+5 escudos';
            if (v === 9) return '+6 escudos';
            if (v === 10) return '+7 escudos';
            if (v === 11) return '+8 escudos';
            return '+10 escudos';
        }

        if (attrName === 'fuerza') {
            if (v === 0) return 'Sin dano';
            if (v <= 3) return '+1 dano';
            if (v <= 5) return '+2 dano';
            if (v <= 7) return '+3 dano';
            if (v <= 9) return '+4 dano';
            if (v === 10) return '+5 dano';
            if (v === 11) return '+6 dano';
            return '+8 dano';
        }

        if (attrName === 'suerte') {
            const critByValue = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 18];
            const idx = Math.min(v, 12);
            return `+${critByValue[idx]} critico`;
        }

        if (attrName === 'vigor') {
            if (v === 0) return 'Sin salud';
            if (v === 1) return '+5 salud';
            if (v <= 3) return '+10 salud';
            if (v <= 5) return '+15 salud';
            if (v <= 7) return '+20 salud';
            if (v <= 9) return '+25 salud';
            if (v === 10) return '+30 salud';
            if (v === 11) return '+40 salud';
            return '+50 salud';
        }

        return 'Sin bono';
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
            acciones: 3,
            habilidadEspecial: 0,
            atributos: {
                mente: 0,
                espiritu: 0,
                vigor: 0,
                fuerza: 0,
                suerte: 0,
                agilidad: 0
            },
            estadosPositivos: [],
            estadosNegativos: [],
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

    async updateCounter(characterId, field, delta, min, max) {
        const char = await db.getCharacter(characterId);
        if (char) {
            const current = Number(char[field] ?? 0);
            let next = current + Number(delta);
            if (min != null) next = Math.max(next, Number(min));
            if (max != null) next = Math.min(next, Number(max));
            char[field] = next;
            await db.saveCharacter(char);
            this.loadCharacters();
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

    async updateStatusCounter(characterId, type, status, delta) {
        const char = await db.getCharacter(characterId);
        if (!char) return;

        this.normalizeCharacter(char);
        const prop = type === 'positivo' ? 'estadosPositivos' : 'estadosNegativos';
        const current = Number(char[prop][status] || 0);
        const next = Math.max(0, current + Number(delta));
        char[prop][status] = next;

        await db.saveCharacter(char);
        this.loadCharacters();
    }

    async applyRestToAllCharacters() {
        const characters = await db.getCharacters();
        if (characters.length === 0) {
            alert('No hay personajes para aplicar descanso.');
            return;
        }

        const confirmed = confirm('Aplicar descanso a todos los personajes?\n\n- Estados positivos y negativos: 0\n- Acciones: 3\n- Habilidad especial: 0');
        if (!confirmed) return;

        for (const char of characters) {
            this.normalizeCharacter(char);
            char.estadosPositivos = {};
            char.estadosNegativos = {};
            char.acciones = 3;
            char.habilidadEspecial = 0;
            await db.saveCharacter(char);
        }

        await this.loadCharacters();
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

            const meta = this.getItemTypeMeta(item.type);
            const normalizedType = meta.type;
            if (item.type !== normalizedType) {
                item.type = normalizedType;
                await db.saveItem(item);
            }

            col.innerHTML = `
                <div class="inventory-item-card" onclick="tracker.assignItemModal(${item.id})">
                    ${photoHtml}
                    <div class="inventory-item-info">
                        <div class="inventory-item-type ${meta.type}">
                            <i class="fas ${meta.icon}"></i> ${meta.label}
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
                type: 'armadura',
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
        const normalizedType = this.normalizeItemType(item.type);
        if (normalizedType !== item.type) {
            item.type = normalizedType;
            await db.saveItem(item);
        }
        type.value = normalizedType;
        type.onchange = async () => {
            item.type = this.normalizeItemType(type.value);
            await db.saveItem(item);
            await this.loadInventory();
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
        char.itemTypes[itemId] = this.normalizeItemType(item.type);
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
        const normalizedType = this.normalizeItemType(item.type);
        if (normalizedType !== item.type) {
            item.type = normalizedType;
            await db.saveItem(item);
        }
        type.value = normalizedType;
        type.onchange = async () => {
            const newType = this.normalizeItemType(type.value);
            item.type = newType;
            await db.saveItem(item);

            const char = await db.getCharacter(characterId);
            if (char) {
                if (!char.itemTypes) char.itemTypes = {};
                char.itemTypes[itemId] = newType;
                await db.saveCharacter(char);
            }

            await this.loadCharacters();
        };

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
