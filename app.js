    // --- LIBRARIES ---
    const {
        abilities: ABILITY_LIBRARY,
        archetypes: ARCHETYPE_LIBRARY,
        equipment: EQUIPMENT_LIBRARY,
        equipmentCustomValue: EQUIPMENT_CUSTOM_VALUE
    } = RangersRules;
    const SCENARIO_LIBRARY = RangersScenarios;
    const SCENARIO_ENEMY_LIBRARY = RangersScenarioEnemies;
    const SCENARIO_CATALOG_VERSION = `${SCENARIO_LIBRARY.catalogId}@${SCENARIO_LIBRARY.catalogVersion}`;
    const STARTER_SCENARIOS = Object.freeze(SCENARIO_LIBRARY.missions.flatMap(mission =>
        mission.scenarios.map(scenario => Object.freeze({ ...scenario, mission }))
    ));
    const STARTER_SCENARIOS_BY_ID = new Map(STARTER_SCENARIOS.map(scenario => [scenario.id, scenario]));
    const SCENARIO_ENEMY_CONTEXT_LABELS = Object.freeze({
        setup: 'Set-up',
        events: 'Events',
        searches: 'Search results',
        rooms: 'Room cards',
        challenge: 'Challenge'
    });

    const saveFields = document.querySelectorAll('.save-field');
    const STORAGE_KEY = 'rosd_ranger_v_archetypes';
    const STORAGE_RECOVERY_KEY = `${STORAGE_KEY}_recovery`;
    const ENEMY_CATALOG_STORAGE_KEY = 'rosd_ranger_enemy_catalog';
    const TEMP_EFFECT_STORAGE_KEY = 'rosd_ranger_round_stat_effects';
    const LEGACY_ALLY_MODIFIER_STORAGE_KEY = 'rosd_ranger_round_stat_modifiers';
    const LEGACY_ROUND_ARMOR_STORAGE_KEY = 'rosd_ranger_round_armor_bonus';
    const MAX_TEMP_EFFECT = 99;
    const ENEMY_CATALOG_FORMAT_VERSION = 1;
    const FORMAT_VERSION = 6;
    const MAX_SLOTS = 50;
    const MAX_MISSION_ROWS = 200;
    const MAX_MISSION_HISTORY = 100;
    const MAX_CHANGE_HISTORY = 200;
    const MAX_CHANGES_PER_ENTRY = 100;
    const MAX_HISTORY_VALUE_LENGTH = 180;
    const HISTORY_COALESCE_MS = 3000;
    const HISTORY_CATEGORIES = ['character', 'abilities', 'mission', 'conditions', 'system', 'mixed'];
    const OBJECTIVE_TYPES = ['primary', 'optional', 'custom'];
    const DEFAULT_HEROIC_SLOTS = 5;
    const DEFAULT_INNATE_SLOTS = 4;
    const SLOT_TYPES = {
        heroic: {
            prefix: 'ab',
            containerId: 'abilities-list',
            label: 'Ability Slot',
            placeholder: 'Search ability or spell...',
            allowCustom: false,
            minSlots: DEFAULT_HEROIC_SLOTS
        },
        innate: {
            prefix: 'in',
            containerId: 'innate-list',
            label: 'Innate Slot',
            placeholder: 'Search innate spell or type custom...',
            allowCustom: true,
            minSlots: DEFAULT_INNATE_SLOTS
        }
    };
    const MODES = ['edit', 'play'];
    const ALLY_STAT_CONFIG = {
        s_mov: { label: 'Movement', shortLabel: 'Mov' },
        s_fig: { label: 'Fight', shortLabel: 'Fig' },
        s_sho: { label: 'Shoot', shortLabel: 'Sho' },
        s_arm: { label: 'Armour', shortLabel: 'Arm' },
        s_wil: { label: 'Will', shortLabel: 'Wil' },
        s_hpm: { label: 'Health', shortLabel: 'Health' },
        s_rec: { label: 'Recruitment', shortLabel: 'Recr' }
    };
    const CONDITION_LIBRARY = {
        poisoned: {
            label: 'Poisoned',
            source: 'Standard Edition, p. 32',
            effect: () => 'Maximum one action per activation. Clear after healing back to starting Health, a specific cure, or the end of the scenario.'
        },
        diseased: {
            label: 'Diseased',
            source: 'Standard Edition, pp. 32–33',
            effect: () => 'After a failed Disease test, there is no immediate penalty. In the next scenario of the same mission, start at −3 Health and suffer −1 to all rolls; clear at that scenario’s end.'
        },
        hungerThirst: {
            label: 'Hunger & Thirst',
            source: 'Standard Edition, p. 33',
            stackable: true,
            effect: level => `Next scenario starts at −${level * 2} Health (${level} × −2). Clear when the mission ends or a rule removes all levels.`
        }
    };
    const HISTORY_FIELD_LABELS = {
        char_name: 'Ranger Name',
        char_lvl: 'Level',
        char_xp: 'Experience',
        char_arch: 'Archetype',
        s_mov: 'Movement',
        s_fig: 'Fight',
        s_sho: 'Shoot',
        s_arm: 'Armour',
        s_wil: 'Will',
        s_hpm: 'Maximum Health',
        s_hpc: 'Current Health',
        s_rec: 'Recruitment',
        it1: 'Equipment I',
        it2: 'Equipment II',
        it3: 'Equipment III',
        it4: 'Equipment IV',
        it5: 'Equipment V',
        it6: 'Equipment VI',
        sk_ac: 'Acrobatics',
        sk_al: 'Ancient Lore',
        sk_ar: 'Armoury',
        sk_cl: 'Climb',
        sk_le: 'Leadership',
        sk_na: 'Navigation',
        sk_pe: 'Perception',
        sk_pl: 'Pick Lock',
        sk_rr: 'Read Runes',
        sk_st: 'Stealth',
        sk_sr: 'Strength',
        sk_sv: 'Survival',
        sk_sw: 'Swimming',
        sk_tr: 'Track',
        sk_tp: 'Traps',
        quest_notes: 'Quest Log'
    };
    const HISTORY_CATEGORY_LABELS = {
        character: 'Character',
        abilities: 'Abilities',
        mission: 'Mission',
        conditions: 'Conditions',
        system: 'System',
        mixed: 'Mixed'
    };
    const PERSISTENCE = RangersPersistence.create({
        formatVersion: FORMAT_VERSION,
        maxSlots: MAX_SLOTS,
        maxMissionRows: MAX_MISSION_ROWS,
        maxMissionHistory: MAX_MISSION_HISTORY,
        maxChangeHistory: MAX_CHANGE_HISTORY,
        maxChangesPerEntry: MAX_CHANGES_PER_ENTRY,
        maxHistoryValueLength: MAX_HISTORY_VALUE_LENGTH,
        defaultHeroicSlots: DEFAULT_HEROIC_SLOTS,
        defaultInnateSlots: DEFAULT_INNATE_SLOTS,
        modes: MODES,
        objectiveTypes: OBJECTIVE_TYPES,
        historyCategories: HISTORY_CATEGORIES,
        fieldIds: Array.from(saveFields, field => field.id),
        knownArchetypes: Object.keys(ARCHETYPE_LIBRARY),
        newId: newMissionId,
        historyEntryCategory
    });
    const {
        isPlainObject,
        blankSlots,
        blankConditions,
        normalizeConditions,
        createBlankDocument,
        normalizeFields,
        normalizeSlotEntry,
        normalizeSlots,
        legacySlotCount,
        migrateLegacyDocument,
        normalizeText,
        normalizeNullableText,
        normalizeNumber,
        normalizeCount,
        normalizeRows,
        normalizeMission,
        normalizeMissionHistory,
        normalizeHistoryString,
        normalizeChangeHistory,
        normalizeDocument,
        parseDocument
    } = PERSISTENCE;
    const STORAGE = RangersStorage.create({
        getStorage: () => localStorage,
        characterKey: STORAGE_KEY,
        recoveryKey: STORAGE_RECOVERY_KEY,
        formatVersion: FORMAT_VERSION
    });
    const SEARCHABLE_STATE = {};
    /*
       Missions are nested records rather than flat fields, so they live in a state object instead
       of being read back out of the DOM like the rest of the sheet. The rendered block writes into
       this object; collectDocument() serializes it.
    */
    let MISSION = { active: null, history: [] };
    let ENEMY_CATALOG = null;
    let CONDITIONS = blankConditions();
    let CHANGE_HISTORY = [];
    let lastTrackedState = null;
    let temporaryStatEffects = {};
    let activeEffectStatId = null;
    let lastMissionRemoval = null;
    let missionSequence = 0;
    let activePreviewId = null;
    let saveTimer = null;
    let slotSequence = 0;
    const EFFECT_TIMERS = new WeakMap();

    function stopEffect(target, effectName) {
        if (!target) return;

        const className = `fx-${effectName}`;
        const targetTimers = EFFECT_TIMERS.get(target);
        if (targetTimers) {
            clearTimeout(targetTimers.get(className));
            targetTimers.delete(className);
        }
        target.classList.remove(className);
    }

    function playEffect(target, effectName, duration = 900) {
        if (!target) return;

        const className = `fx-${effectName}`;
        let targetTimers = EFFECT_TIMERS.get(target);
        if (!targetTimers) {
            targetTimers = new Map();
            EFFECT_TIMERS.set(target, targetTimers);
        }

        stopEffect(target, effectName);
        void target.offsetWidth;
        target.classList.add(className);

        const timer = setTimeout(() => {
            target.classList.remove(className);
            targetTimers.delete(className);
        }, duration);
        targetTimers.set(className, timer);
    }

    function toRoman(num) {
        const lookup = {M:1000,CM:900,D:500,CD:400,C:100,XC:90,L:50,XL:40,X:10,IX:9,V:5,IV:4,I:1};
        let roman = '';
        for (let i in lookup) {
            while (num >= lookup[i]) {
                roman += i;
                num -= lookup[i];
            }
        }
        return roman;
    }

    function buildAbilityOptions() {
        const options = [];

        for (let key in ABILITY_LIBRARY.heroic) {
            options.push({
                value: key,
                label: key,
                desc: ABILITY_LIBRARY.heroic[key],
                badges: ['Heroic Ability'],
                group: 'Heroic Abilities'
            });
        }

        for (let key in ABILITY_LIBRARY.archetypeHeroic) {
            const ability = ABILITY_LIBRARY.archetypeHeroic[key];
            options.push({
                value: key,
                label: key,
                desc: ability.desc,
                badges: ['Heroic Ability', 'Archetype'],
                group: `Archetype Heroic Ability · ${ability.archetypes.join(' · ')}`
            });
        }

        for (let key in ABILITY_LIBRARY.spells) {
            options.push({
                value: key,
                label: key,
                desc: ABILITY_LIBRARY.spells[key],
                badges: ['Spell'],
                group: 'Spells'
            });
        }

        return options;
    }

    function buildEquipmentOptions() {
        const groupBadges = {
            'Basic Weapons': ['Equipment', 'Weapon'],
            'Basic Armour': ['Equipment', 'Armour'],
            'Basic Equipment': ['Equipment'],
            'Magical Equipment': ['Equipment', 'Magical Equipment']
        };
        const options = [];

        for (let group in EQUIPMENT_LIBRARY) {
            for (let key in EQUIPMENT_LIBRARY[group]) {
                options.push({
                    value: key,
                    label: key,
                    desc: EQUIPMENT_LIBRARY[group][key],
                    badges: groupBadges[group] || ['Equipment'],
                    group
                });
            }
        }

        return options;
    }

    function populateDropdowns() {
        const archSel = document.getElementById('char_arch');
        for (let key in ARCHETYPE_LIBRARY) {
            let opt = document.createElement('option');
            opt.value = key; opt.innerHTML = key === "" ? "None / Custom" : key;
            archSel.appendChild(opt);
        }
    }

    function normalizeEnemyCatalog(parsed) {
        if (!isPlainObject(parsed)) throw new Error('The enemy catalog is not a JSON object.');
        if (parsed.formatVersion !== ENEMY_CATALOG_FORMAT_VERSION) {
            throw new Error(`The enemy catalog must use format version ${ENEMY_CATALOG_FORMAT_VERSION}.`);
        }
        if (typeof parsed.catalogId !== 'string' || !parsed.catalogId.trim()) {
            throw new Error('The enemy catalog has no catalog id.');
        }
        if (typeof parsed.catalogVersion !== 'string' || !parsed.catalogVersion.trim()) {
            throw new Error('The enemy catalog has no catalog version.');
        }
        if (!Array.isArray(parsed.enemies) || parsed.enemies.length > MAX_MISSION_ROWS) {
            throw new Error(`The enemy catalog must contain at most ${MAX_MISSION_ROWS} enemies.`);
        }

        const ids = new Set();
        const enemies = parsed.enemies.map((entry, index) => {
            if (!isPlainObject(entry)) throw new Error(`Enemy ${index + 1} is not a record.`);
            const id = typeof entry.id === 'string' ? entry.id.trim() : '';
            const name = typeof entry.name === 'string' ? entry.name.trim() : '';
            const xp = Number(entry.xp);

            if (!id || ids.has(id)) throw new Error(`Enemy ${index + 1} has a missing or duplicate id.`);
            if (!name) throw new Error(`Enemy ${index + 1} has no name.`);
            if (!Number.isFinite(xp) || xp < 0 || xp > 9999) {
                throw new Error(`Enemy ${index + 1} has an invalid XP value.`);
            }

            ids.add(id);
            return {
                id,
                name,
                xp,
                source: typeof entry.source === 'string' ? entry.source.trim() : '',
                page: Number.isInteger(entry.page) && entry.page > 0 ? entry.page : null
            };
        });

        return {
            formatVersion: ENEMY_CATALOG_FORMAT_VERSION,
            catalogId: parsed.catalogId.trim(),
            catalogVersion: parsed.catalogVersion.trim(),
            title: typeof parsed.title === 'string' && parsed.title.trim() ? parsed.title.trim() : 'Enemy catalog',
            enemies
        };
    }

    function updateEnemyCatalogStatus(message = '') {
        const status = document.getElementById('enemy-catalog-status');
        if (message) status.textContent = message;
        else if (ENEMY_CATALOG) {
            status.textContent = `${ENEMY_CATALOG.title}: ${ENEMY_CATALOG.enemies.length} enemies loaded.`;
        } else {
            status.textContent = 'No enemy catalog loaded. Custom entries remain available.';
        }
    }

    function loadEnemyCatalog() {
        let raw;
        try {
            raw = localStorage.getItem(ENEMY_CATALOG_STORAGE_KEY);
            ENEMY_CATALOG = raw ? normalizeEnemyCatalog(JSON.parse(raw)) : null;
        } catch (error) {
            console.error('The stored enemy catalog could not be loaded.', error);
            ENEMY_CATALOG = null;
            refreshEnemyPickerOptions();
            updateEnemyCatalogStatus('The stored enemy catalog is invalid. Load it again to replace it.');
            return;
        }
        refreshEnemyPickerOptions();
    }

    function refreshEnemyPickerOptions() {
        const select = document.getElementById('enemy_picker_select');
        if (!select) return;

        select.innerHTML = '';
        const placeholder = document.createElement('option');
        placeholder.value = '';
        placeholder.textContent = ENEMY_CATALOG && ENEMY_CATALOG.enemies.length
            ? 'Choose an enemy…'
            : 'Load an enemy catalog first…';
        select.appendChild(placeholder);

        if (ENEMY_CATALOG) {
            ENEMY_CATALOG.enemies.forEach(enemy => {
                const option = document.createElement('option');
                option.value = enemy.id;
                option.textContent = `${enemy.name} · ${enemy.xp} XP`;
                select.appendChild(option);
            });
        }

        select.value = '';
        select.disabled = !ENEMY_CATALOG || !ENEMY_CATALOG.enemies.length;
        updateEnemyPickerAction();
        updateEnemyCatalogStatus();
    }

    function updateEnemyPickerAction() {
        const select = document.getElementById('enemy_picker_select');
        const button = document.getElementById('enemy_picker_add');
        if (!select || !button) return;
        button.disabled = !MISSION.active || !select.value;
    }

    function importEnemyCatalog(event) {
        const input = event.target;
        const file = input.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = e => {
            input.value = '';
            try {
                const catalog = normalizeEnemyCatalog(JSON.parse(e.target.result));
                localStorage.setItem(ENEMY_CATALOG_STORAGE_KEY, JSON.stringify(catalog));
                ENEMY_CATALOG = catalog;
                refreshEnemyPickerOptions();
                alert(`${catalog.title} was loaded with ${catalog.enemies.length} enemies.`);
            } catch (error) {
                console.error('The enemy catalog could not be imported.', error);
                alert(`The enemy catalog could not be imported.\n\n${describeDataError(error)}`);
            }
        };
        reader.onerror = () => {
            input.value = '';
            console.error('The enemy catalog file could not be read.', reader.error);
            alert('The enemy catalog file could not be read.');
        };
        reader.readAsText(file);
    }

    function initSearchables() {
        const equipmentOptions = buildEquipmentOptions();

        for (let i = 1; i <= 6; i++) {
            SEARCHABLE_STATE['it' + i] = {
                id: 'it' + i,
                options: equipmentOptions,
                allowCustom: true,
                slotLabel: `Equipment Slot ${i}`,
                renderedOptions: [],
                selectedOption: null,
                selectedValue: '',
                highlightIndex: -1
            };
        }

    }

    function slotGroups(type) {
        const container = document.getElementById(SLOT_TYPES[type].containerId);
        return Array.from(container.querySelectorAll('.ability-group'));
    }

    // Slot ids come from a sequence that never counts down, so a removed id is never handed out again.
    function addSlot(type) {
        const config = SLOT_TYPES[type];
        const id = `${config.prefix}_${++slotSequence}`;

        SEARCHABLE_STATE[id] = {
            id: id,
            options: buildAbilityOptions(),
            allowCustom: config.allowCustom,
            slotLabel: config.label,
            renderedOptions: [],
            selectedOption: null,
            selectedValue: '',
            highlightIndex: -1
        };

        document.getElementById(config.containerId).insertAdjacentHTML('beforeend', `
            <div class="ability-group" id="group_${id}" data-slot-id="${id}" data-slot-type="${type}">
                <div class="numbered-row" id="row_${id}">
                    <button type="button" class="ability-toggle" onclick="toggleUse('${id}')" aria-pressed="false"></button>
                    <span class="row-number" aria-hidden="true"></span>
                    <div class="search-select" id="${id}_box" onclick="activatePreview('${id}')">
                        <input type="text" id="${id}_search" class="search-select-input" placeholder="${config.placeholder}" autocomplete="off" role="combobox" aria-expanded="false" aria-controls="${id}_menu" aria-autocomplete="list" oninput="handleSearchInput('${id}')" onfocus="handleSearchFocus('${id}')" onkeydown="handleSearchKeydown(event, '${id}')" onblur="handleSearchBlur('${id}')">
                        <div id="${id}_menu" class="search-select-menu" role="listbox"></div>
                    </div>
                    <button type="button" class="info-toggle" data-info-for="${id}" aria-expanded="false" aria-controls="desc_${id}" disabled onclick="toggleDescVisibility('${id}', this)">ℹ</button>
                    <button type="button" class="remove-slot-btn setup-only" onclick="removeSlot('${id}', '${type}')">✕</button>
                </div>
                <div id="meta_${id}" class="selection-meta"></div>
                <div id="desc_${id}" class="ability-desc"></div>
                <input type="hidden" id="${id}" class="save-field">
            </div>
        `);

        renumberSlots(type);
        return id;
    }

    // Position-derived presentation only: the numeral and whether a slot may be removed.
    function renumberSlots(type) {
        const config = SLOT_TYPES[type];

        slotGroups(type).forEach((group, index) => {
            const position = index + 1;
            const roman = toRoman(position);
            const label = `${config.label} ${roman}`;
            const state = SEARCHABLE_STATE[group.dataset.slotId];
            const removeBtn = group.querySelector('.remove-slot-btn');

            group.querySelector('.row-number').textContent = roman;
            if (state) {
                state.slotLabel = label;
                if (activePreviewId === state.id) renderPreviewPanel(state.id);
            }

            // The numeral is decorative, so every control in the row has to carry the position itself.
            group.querySelector('.ability-toggle').setAttribute('aria-label', label);
            group.querySelector('.search-select-input').setAttribute('aria-label', label);
            group.querySelector('.info-toggle').setAttribute('aria-label', `Rule text for ${label}`);
            removeBtn.setAttribute('aria-label', `Remove ${label}`);
            removeBtn.title = `Remove ${label}`;

            removeBtn.style.display = position > config.minSlots ? '' : 'none';
        });
    }

    function addHeroicSlot() {
        addSlot('heroic');
        scheduleSave();
    }

    function addInnateSlot() {
        addSlot('innate');
        scheduleSave();
    }

    function removeSlot(id, type) {
        if (slotGroups(type).length <= SLOT_TYPES[type].minSlots) return;

        const group = document.getElementById('group_' + id);
        if (group) group.remove();
        delete SEARCHABLE_STATE[id];
        if (activePreviewId === id) hidePreviewPanel();

        renumberSlots(type);
        scheduleSave();
    }

    function clearSlots(type) {
        slotGroups(type).forEach(group => delete SEARCHABLE_STATE[group.dataset.slotId]);
        document.getElementById(SLOT_TYPES[type].containerId).innerHTML = '';
    }

    function normalizeSearchValue(value) {
        return (value || '').toLowerCase().trim();
    }

    function escapeHtml(value) {
        return (value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function badgeClass(label) {
        return label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    }

    function renderBadges(target, badges) {
        target.innerHTML = (badges || [])
            .map(badge => `<span class="tag-badge ${badgeClass(badge)}">${escapeHtml(badge)}</span>`)
            .join('');
    }

    function setSaveStatus(state, text) {
        const status = document.getElementById('save_status');
        status.className = `save-status ${state}`;
        status.textContent = text;
    }

    function scheduleSave() {
        setSaveStatus('unsaved', 'Unsaved');
        clearTimeout(saveTimer);
        saveTimer = setTimeout(() => {
            setSaveStatus('saving', 'Saving...');
            saveNow();
        }, 180);
    }

    function shortenHistoryValue(value, suffix = '') {
        const text = value === undefined || value === null ? '' : String(value);
        if (text.length + suffix.length <= MAX_HISTORY_VALUE_LENGTH) return text + suffix;
        return text.slice(0, MAX_HISTORY_VALUE_LENGTH - suffix.length - 1) + '…' + suffix;
    }

    function makeHistoryChange(category, path, label, before, after) {
        const rawPrevious = before === undefined || before === null ? '' : String(before);
        const rawNext = after === undefined || after === null ? '' : String(after);
        if (rawPrevious === rawNext) return null;

        let previous = shortenHistoryValue(rawPrevious);
        let next = shortenHistoryValue(rawNext);
        if (previous === next) {
            previous = shortenHistoryValue(rawPrevious, ' · before');
            next = shortenHistoryValue(rawNext, ' · after');
        }
        return { category, path, label, before: previous, after: next };
    }

    function pushHistoryChange(changes, category, path, label, before, after) {
        const change = makeHistoryChange(category, path, label, before, after);
        if (change) changes.push(change);
    }

    function describeHistorySlot(slot) {
        if (!slot) return '';
        const value = slot.value || 'Empty slot';
        return slot.used ? `${value} · Used` : value;
    }

    function diffHistorySlots(changes, type, beforeSlots, afterSlots) {
        const label = type === 'heroic' ? 'Heroic Ability' : 'Innate Ability';
        const length = Math.max(beforeSlots.length, afterSlots.length);

        for (let index = 0; index < length; index++) {
            const before = beforeSlots[index];
            const after = afterSlots[index];
            const slotLabel = `${label} ${toRoman(index + 1)}`;
            const path = `character.${type}Slots.${index}`;

            if (!before || !after) {
                pushHistoryChange(changes, 'abilities', path, slotLabel,
                    describeHistorySlot(before), describeHistorySlot(after));
                continue;
            }

            pushHistoryChange(changes, 'abilities', `${path}.value`, slotLabel, before.value, after.value);
            pushHistoryChange(changes, 'abilities', `${path}.used`, `${slotLabel} status`,
                before.used ? 'Used' : 'Available', after.used ? 'Used' : 'Available');
        }
    }

    function historyMissionMap(state) {
        const map = new Map();
        if (state.activeMission) map.set(state.activeMission.id, { status: 'active', mission: state.activeMission });
        state.missionHistory.forEach(mission => map.set(mission.id, { status: 'complete', mission }));
        return map;
    }

    function historyRowMap(rows) {
        return new Map((rows || []).map(row => [row.id, row]));
    }

    function diffHistoryRows(changes, missionId, kind, beforeRows, afterRows, describeRow, describeState, fields) {
        const beforeMap = historyRowMap(beforeRows);
        const afterMap = historyRowMap(afterRows);
        const ids = new Set([...beforeMap.keys(), ...afterMap.keys()]);

        ids.forEach(id => {
            const before = beforeMap.get(id);
            const after = afterMap.get(id);
            const row = after || before;
            const basePath = `missions.${missionId}.${kind}.${id}`;
            const rowLabel = describeRow(row);

            if (!before || !after) {
                pushHistoryChange(changes, 'mission', basePath, rowLabel,
                    before ? describeState(before) : '', after ? describeState(after) : '');
                return;
            }

            fields.forEach(field => {
                pushHistoryChange(
                    changes,
                    'mission',
                    `${basePath}.${field.key}`,
                    `${rowLabel} · ${field.label}`,
                    field.format ? field.format(before[field.key]) : before[field.key],
                    field.format ? field.format(after[field.key]) : after[field.key]
                );
            });
        });
    }

    function diffHistoryMissions(changes, beforeState, afterState) {
        const beforeMap = historyMissionMap(beforeState);
        const afterMap = historyMissionMap(afterState);
        const ids = new Set([...beforeMap.keys(), ...afterMap.keys()]);

        ids.forEach(id => {
            const beforeRecord = beforeMap.get(id);
            const afterRecord = afterMap.get(id);
            const before = beforeRecord && beforeRecord.mission;
            const after = afterRecord && afterRecord.mission;
            const mission = after || before;
            const missionName = mission.title || 'Untitled mission';
            const basePath = `missions.${id}`;

            if (!before || !after) {
                pushHistoryChange(changes, 'mission', basePath, `Mission · ${missionName}`,
                    before ? 'Present' : '', after ? 'Present' : '');
                return;
            }

            pushHistoryChange(changes, 'mission', `${basePath}.status`, `Mission · ${missionName}`,
                beforeRecord.status === 'complete' ? 'Completed' : 'Active',
                afterRecord.status === 'complete' ? 'Completed' : 'Active');

            [
                ['title', 'Title'],
                ['date', 'Date'],
                ['scenario', 'Scenario'],
                ['notes', 'Notes'],
                ['appliedXp', 'Applied XP']
            ].forEach(([key, fieldLabel]) => {
                pushHistoryChange(changes, 'mission', `${basePath}.${key}`,
                    `Mission · ${missionName} · ${fieldLabel}`, before[key], after[key]);
            });

            diffHistoryRows(
                changes,
                id,
                'kills',
                before.kills,
                after.kills,
                row => `Enemy · ${row.name || 'Unnamed'}`,
                row => `${row.count} × ${row.value} XP`,
                [
                    { key: 'name', label: 'Name' },
                    { key: 'count', label: 'Count' },
                    { key: 'value', label: 'XP each' }
                ]
            );
            diffHistoryRows(
                changes,
                id,
                'objectives',
                before.objectives,
                after.objectives,
                row => `Objective · ${row.title || 'Untitled'}`,
                row => `${row.completed ? 'Completed' : 'Open'} · ${row.value} XP`,
                [
                    { key: 'title', label: 'Title' },
                    { key: 'type', label: 'Type' },
                    { key: 'completed', label: 'Status', format: value => value ? 'Completed' : 'Open' },
                    { key: 'value', label: 'XP' }
                ]
            );
            diffHistoryRows(
                changes,
                id,
                'adjustments',
                before.adjustments,
                after.adjustments,
                row => `Adjustment · ${row.label || 'Untitled'}`,
                row => `${row.value} XP`,
                [
                    { key: 'label', label: 'Label' },
                    { key: 'value', label: 'XP' }
                ]
            );
        });
    }

    function snapshotTrackedDocument(document) {
        return JSON.parse(JSON.stringify({
            character: document.character,
            activeMission: document.activeMission,
            missionHistory: document.missionHistory
        }));
    }

    function diffTrackedDocuments(before, after) {
        const changes = [];
        const beforeFields = before.character.fields;
        const afterFields = after.character.fields;
        const fieldIds = new Set([...Object.keys(beforeFields), ...Object.keys(afterFields)]);

        fieldIds.forEach(id => {
            pushHistoryChange(
                changes,
                'character',
                `character.fields.${id}`,
                HISTORY_FIELD_LABELS[id] || id,
                beforeFields[id] || '',
                afterFields[id] || ''
            );
        });

        diffHistorySlots(changes, 'heroic', before.character.heroicSlots, after.character.heroicSlots);
        diffHistorySlots(changes, 'innate', before.character.innateSlots, after.character.innateSlots);

        Object.keys(CONDITION_LIBRARY).forEach(key => {
            const beforeValue = before.character.conditions[key];
            const afterValue = after.character.conditions[key];
            const format = value => key === 'hungerThirst'
                ? (value ? `Level ${value}` : 'Inactive')
                : (value ? 'Active' : 'Inactive');
            pushHistoryChange(
                changes,
                'conditions',
                `character.conditions.${key}`,
                `Condition · ${CONDITION_LIBRARY[key].label}`,
                format(beforeValue),
                format(afterValue)
            );
        });

        diffHistoryMissions(changes, before, after);
        return changes.slice(0, MAX_CHANGES_PER_ENTRY);
    }

    function historyEntryCategory(changes) {
        const categories = new Set(changes.map(change => change.category));
        return categories.size === 1 ? changes[0].category : 'mixed';
    }

    function historySummary(changes, category) {
        if (changes.length === 1) {
            const change = changes[0];
            if (!change.before && change.after) return `${change.label} added`;
            if (change.before && !change.after) return `${change.label} removed`;
            if (/notes|quest log/i.test(change.label)) return `${change.label} updated`;
            return `${change.label}: ${change.after || 'Empty'}`;
        }
        return `${changes.length} changes · ${HISTORY_CATEGORY_LABELS[category] || 'Mixed'}`;
    }

    function newHistoryId() {
        if (window.crypto && typeof window.crypto.randomUUID === 'function') return window.crypto.randomUUID();
        return `change-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    }

    function updatedChangeHistory(history, changes, now = new Date()) {
        if (!changes.length) return history;

        const next = history.map(entry => ({ ...entry, changes: entry.changes.map(change => ({ ...change })) }));
        const timestamp = now.toISOString();
        const category = historyEntryCategory(changes);
        const latest = next[0];
        const canMerge = latest &&
            latest.category === category &&
            category !== 'system' &&
            now.getTime() - new Date(latest.timestamp).getTime() <= HISTORY_COALESCE_MS;

        if (canMerge) {
            const merged = new Map(latest.changes.map(change => [change.path, { ...change }]));
            changes.forEach(change => {
                const existing = merged.get(change.path);
                if (existing) {
                    existing.after = change.after;
                    if (existing.before === existing.after) merged.delete(change.path);
                } else {
                    merged.set(change.path, { ...change });
                }
            });

            latest.changes = Array.from(merged.values()).slice(0, MAX_CHANGES_PER_ENTRY);
            if (!latest.changes.length) {
                next.shift();
            } else {
                latest.timestamp = timestamp;
                latest.summary = historySummary(latest.changes, category);
            }
        } else {
            next.unshift({
                id: newHistoryId(),
                timestamp,
                category,
                summary: historySummary(changes, category),
                changes: changes.map(change => ({ ...change }))
            });
        }

        return next.slice(0, MAX_CHANGE_HISTORY);
    }

    function collectSlots(type) {
        return slotGroups(type).map(group => {
            const field = group.querySelector('input.save-field');
            const row = group.querySelector('.numbered-row');
            return {
                value: field ? field.value : '',
                used: !!(row && row.classList.contains('used'))
            };
        });
    }

    function collectDocument() {
        const fields = {};
        saveFields.forEach(f => fields[f.id] = f.value);

        return {
            formatVersion: FORMAT_VERSION,
            character: {
                fields: fields,
                heroicSlots: collectSlots('heroic'),
                innateSlots: collectSlots('innate'),
                conditions: CONDITIONS
            },
            uiState: {
                showInnateSection: document.getElementById('innate-section').style.display === 'block',
                missionSectionExpanded: !document.getElementById('mission_section_content').hidden,
                mode: currentMode()
            },
            activeMission: MISSION.active,
            missionHistory: MISSION.history,
            changeHistory: CHANGE_HISTORY
        };
    }

    function saveNow(options = {}) {
        clearTimeout(saveTimer);

        refreshEmptyMarkers();

        try {
            const nextDocument = collectDocument();
            const nextTrackedState = snapshotTrackedDocument(nextDocument);
            const shouldTrack = options.track !== false && lastTrackedState !== null;
            const changes = shouldTrack ? diffTrackedDocuments(lastTrackedState, nextTrackedState) : [];
            const nextHistory = updatedChangeHistory(CHANGE_HISTORY, changes);

            nextDocument.changeHistory = nextHistory;
            const stored = STORAGE.writeDocument(nextDocument);
            if (!stored.ok) throw stored.error;
            CHANGE_HISTORY = nextHistory;
            lastTrackedState = nextTrackedState;
            renderChangeHistory();
            setSaveStatus('saved', 'Saved');
        } catch (error) {
            console.error('Character data could not be saved.', error);
            setSaveStatus('unsaved', 'Not saved');
        }
    }

    function formatHistoryTime(timestamp) {
        const date = new Date(timestamp);
        if (!Number.isFinite(date.getTime())) return timestamp;
        try {
            return new Intl.DateTimeFormat(undefined, {
                dateStyle: 'medium',
                timeStyle: 'short'
            }).format(date);
        } catch {
            return date.toLocaleString();
        }
    }

    function historyValueMarkup(value, className) {
        const display = value === '' ? 'Empty' : value;
        return `<span class="${className}">${escapeHtml(display)}</span>`;
    }

    function renderChangeHistory() {
        const list = document.getElementById('history_list');
        const filterControl = document.getElementById('history_filter');
        const count = document.getElementById('history_count');
        const clear = document.getElementById('history_clear');
        if (!list || !filterControl || !count || !clear) return;

        const filter = filterControl.value;
        const entries = CHANGE_HISTORY.filter(entry =>
            filter === 'all' ||
            entry.category === filter ||
            entry.changes.some(change => change.category === filter)
        );

        count.textContent = String(CHANGE_HISTORY.length);
        document.getElementById('history_open').setAttribute(
            'aria-label',
            `Open change history, ${CHANGE_HISTORY.length} ${CHANGE_HISTORY.length === 1 ? 'entry' : 'entries'}`
        );
        clear.disabled = CHANGE_HISTORY.length === 0;

        if (!entries.length) {
            list.innerHTML = `<p class="history-empty">${
                CHANGE_HISTORY.length
                    ? 'No changes match this filter.'
                    : 'No changes recorded yet. The first meaningful saved edit will appear here.'
            }</p>`;
            return;
        }

        list.innerHTML = entries.map(entry => {
            const visibleChanges = filter === 'all' || entry.category === filter
                ? entry.changes
                : entry.changes.filter(change => change.category === filter);
            const changes = visibleChanges.length
                ? `<ul class="history-changes">${visibleChanges.map(change => `
                    <li class="history-change">
                        <span class="history-change-label">${escapeHtml(change.label)}</span>
                        <span class="history-values">
                            ${historyValueMarkup(change.before, 'history-before')}
                            <span class="history-arrow" aria-hidden="true">→</span>
                            ${historyValueMarkup(change.after, 'history-after')}
                        </span>
                    </li>
                `).join('')}</ul>`
                : '';

            return `
                <article class="history-entry" data-category="${escapeHtml(entry.category)}">
                    <div class="history-entry-head">
                        <span class="history-summary">${escapeHtml(entry.summary)}</span>
                        <time class="history-time" datetime="${escapeHtml(entry.timestamp)}">${escapeHtml(formatHistoryTime(entry.timestamp))}</time>
                    </div>
                    <span class="history-category">${escapeHtml(HISTORY_CATEGORY_LABELS[entry.category] || entry.category)}</span>
                    ${changes}
                </article>
            `;
        }).join('');
    }

    function openChangeHistory() {
        const dialog = document.getElementById('history_dialog');
        // Flush a pending debounced edit so the timeline is current when it opens.
        saveNow();
        renderChangeHistory();
        if (typeof dialog.showModal === 'function') dialog.showModal();
        else dialog.setAttribute('open', '');
        document.getElementById('history_filter').focus();
    }

    function closeChangeHistory() {
        const dialog = document.getElementById('history_dialog');
        if (dialog.open && typeof dialog.close === 'function') dialog.close();
        else dialog.removeAttribute('open');
    }

    function clearChangeHistory(requireConfirmation = true) {
        if (!CHANGE_HISTORY.length) return;
        if (requireConfirmation && !confirm('Clear the complete change history for this Ranger? The current character data will be kept.')) {
            return;
        }

        CHANGE_HISTORY = [];
        renderChangeHistory();
        saveNow({ track: false });
    }

    function recordHistoryEvent(category, summary) {
        const entry = {
            id: newHistoryId(),
            timestamp: new Date().toISOString(),
            category,
            summary,
            changes: []
        };
        CHANGE_HISTORY = [entry, ...CHANGE_HISTORY].slice(0, MAX_CHANGE_HISTORY);
        renderChangeHistory();
    }

    function normalizeTemporaryEffects(value) {
        if (!isPlainObject(value)) throw new Error('Temporary stat effects are not a record.');
        const normalized = {};

        const readAmount = (rawAmount, label) => {
            const amount = Number(rawAmount === undefined ? 0 : rawAmount);
            if (!Number.isInteger(amount) || amount < 0 || amount > MAX_TEMP_EFFECT) {
                throw new Error(`${label} is invalid.`);
            }
            return amount;
        };

        Object.entries(value).forEach(([statId, rawEffect]) => {
            if (!ALLY_STAT_CONFIG[statId]) throw new Error(`Unknown temporary stat "${statId}".`);

            const effect = typeof rawEffect === 'number'
                ? { buff: readAmount(rawEffect, `Temporary Ally bonus for ${statId}`), debuff: 0 }
                : isPlainObject(rawEffect)
                    ? {
                        buff: readAmount(rawEffect.buff, `Temporary Ally bonus for ${statId}`),
                        debuff: readAmount(rawEffect.debuff, `Temporary Debuff for ${statId}`)
                    }
                    : null;

            if (!effect) throw new Error(`Temporary effects for ${statId} are invalid.`);
            if (effect.buff || effect.debuff) normalized[statId] = effect;
        });

        return normalized;
    }

    function persistTemporaryEffects() {
        try {
            const hasEffects = Object.keys(temporaryStatEffects).length > 0;
            if (hasEffects) sessionStorage.setItem(TEMP_EFFECT_STORAGE_KEY, JSON.stringify(temporaryStatEffects));
            else sessionStorage.removeItem(TEMP_EFFECT_STORAGE_KEY);
            sessionStorage.removeItem(LEGACY_ALLY_MODIFIER_STORAGE_KEY);
            sessionStorage.removeItem(LEGACY_ROUND_ARMOR_STORAGE_KEY);
        } catch (error) {
            console.error('Temporary stat effects could not be stored.', error);
        }
    }

    function loadTemporaryEffects() {
        try {
            const raw = sessionStorage.getItem(TEMP_EFFECT_STORAGE_KEY);
            const legacyAlly = sessionStorage.getItem(LEGACY_ALLY_MODIFIER_STORAGE_KEY);

            if (raw) {
                temporaryStatEffects = normalizeTemporaryEffects(JSON.parse(raw));
            } else if (legacyAlly) {
                temporaryStatEffects = normalizeTemporaryEffects(JSON.parse(legacyAlly));
            } else if (sessionStorage.getItem(LEGACY_ROUND_ARMOR_STORAGE_KEY) === '2') {
                temporaryStatEffects = { s_arm: { buff: 2, debuff: 0 } };
            } else {
                temporaryStatEffects = {};
            }
            persistTemporaryEffects();
        } catch (error) {
            console.error('Temporary stat effects could not be restored.', error);
            temporaryStatEffects = {};
            try {
                sessionStorage.removeItem(TEMP_EFFECT_STORAGE_KEY);
                sessionStorage.removeItem(LEGACY_ALLY_MODIFIER_STORAGE_KEY);
                sessionStorage.removeItem(LEGACY_ROUND_ARMOR_STORAGE_KEY);
            } catch {
                // The controls still work for this page even when session storage is unavailable.
            }
        }
        renderAllTemporaryEffects();
    }

    function clampTemporaryEffect(rawAmount) {
        return Math.min(MAX_TEMP_EFFECT, Math.max(0, Math.trunc(Number(rawAmount) || 0)));
    }

    function setTemporaryEffects(statId, rawBuff, rawDebuff) {
        if (!ALLY_STAT_CONFIG[statId]) return;
        const effect = {
            buff: clampTemporaryEffect(rawBuff),
            debuff: clampTemporaryEffect(rawDebuff)
        };

        if (effect.buff || effect.debuff) temporaryStatEffects[statId] = effect;
        else delete temporaryStatEffects[statId];

        persistTemporaryEffects();
        renderTemporaryEffects(statId);
    }

    function clearAllTemporaryEffects(closeDialog = false) {
        temporaryStatEffects = {};
        persistTemporaryEffects();
        renderAllTemporaryEffects();
        if (closeDialog) closeTemporaryEffects();
    }

    function renderAllTemporaryEffects() {
        Object.keys(ALLY_STAT_CONFIG).forEach(renderTemporaryEffects);
    }

    function renderTemporaryEffects(statId) {
        const config = ALLY_STAT_CONFIG[statId];
        const field = document.getElementById(statId);
        const card = document.querySelector(`[data-ally-stat="${statId}"]`);
        const output = document.getElementById(`${statId}_effective`);
        const breakdown = document.getElementById(`${statId}_breakdown`);
        const button = document.getElementById(`${statId}_ally`);
        if (!config || !field || !card || !output || !breakdown || !button) return;

        const baseText = field.value.trim();
        const base = Number(baseText);
        const hasBase = baseText !== '' && Number.isFinite(base);
        const effect = temporaryStatEffects[statId] || { buff: 0, debuff: 0 };
        const active = effect.buff > 0 || effect.debuff > 0;
        const effective = hasBase ? base + effect.buff - effect.debuff : null;

        card.classList.toggle('buff-active', effect.buff > 0);
        card.classList.toggle('debuff-active', effect.debuff > 0);
        output.textContent = active && hasBase ? String(effective) : '';
        output.setAttribute('aria-label', active && hasBase ? `Effective ${config.label} ${effective}` : '');

        const equation = [`<span>Base ${hasBase ? base : '—'}</span>`];
        if (effect.buff) equation.push(`<span class="effect-buff">+ Ally ${effect.buff}</span>`);
        if (effect.debuff) equation.push(`<span class="effect-debuff">− Debuff ${effect.debuff}</span>`);
        breakdown.innerHTML = active ? `TEMP · ${equation.join(' ')}` : '';

        if (effect.buff && effect.debuff) button.textContent = `+${effect.buff} / −${effect.debuff}`;
        else if (effect.buff) button.textContent = `Ally +${effect.buff}`;
        else if (effect.debuff) button.textContent = `Debuff −${effect.debuff}`;
        else button.textContent = 'Effects ±';
        button.setAttribute('aria-pressed', String(active));
        button.setAttribute('aria-label', active
            ? `Change temporary effects for ${config.label}: Ally plus ${effect.buff}, Debuff minus ${effect.debuff}`
            : `Set temporary effects for ${config.label}`);
        button.disabled = !active && !hasBase;
    }

    function openTemporaryEffects(statId) {
        if (!ALLY_STAT_CONFIG[statId]) return;
        activeEffectStatId = statId;

        const dialog = document.getElementById('ally_modifier_dialog');
        const buffInput = document.getElementById('ally_bonus_value');
        const debuffInput = document.getElementById('debuff_penalty_value');
        const config = ALLY_STAT_CONFIG[statId];
        const effect = temporaryStatEffects[statId] || { buff: 0, debuff: 0 };
        document.getElementById('ally_modifier_title').textContent = `Temporary effects · ${config.label}`;
        buffInput.value = effect.buff;
        debuffInput.value = effect.debuff;

        if (typeof dialog.showModal === 'function') dialog.showModal();
        else dialog.setAttribute('open', '');
        buffInput.focus();
        buffInput.select();
    }

    function closeTemporaryEffects() {
        const dialog = document.getElementById('ally_modifier_dialog');
        if (dialog.open && typeof dialog.close === 'function') dialog.close();
        else dialog.removeAttribute('open');
        activeEffectStatId = null;
    }

    function stepTemporaryEffect(inputId, delta) {
        const input = document.getElementById(inputId);
        input.value = String(clampTemporaryEffect(Number(input.value) + delta));
    }

    function applyTemporaryEffects(event) {
        event.preventDefault();
        if (!activeEffectStatId) return;
        const statId = activeEffectStatId;
        const buff = clampTemporaryEffect(document.getElementById('ally_bonus_value').value);
        const debuff = clampTemporaryEffect(document.getElementById('debuff_penalty_value').value);
        setTemporaryEffects(statId, buff, debuff);
        closeTemporaryEffects();

        if (buff || debuff) {
            const card = document.querySelector(`[data-ally-stat="${statId}"]`);
            ['stat-buff', 'stat-debuff', 'stat-mixed'].forEach(effectName => stopEffect(card, effectName));
            playEffect(card, buff && debuff ? 'stat-mixed' : buff ? 'stat-buff' : 'stat-debuff', 800);
        }
    }

    function clearSelectedTemporaryEffects() {
        if (!activeEffectStatId) return;
        setTemporaryEffects(activeEffectStatId, 0, 0);
        closeTemporaryEffects();
    }

    function hasActiveConditions() {
        return CONDITIONS.poisoned || CONDITIONS.diseased || CONDITIONS.hungerThirst > 0;
    }

    function renderConditions() {
        const list = document.getElementById('condition_list');
        const active = Object.entries(CONDITION_LIBRARY).filter(([key, config]) =>
            config.stackable ? CONDITIONS[key] > 0 : CONDITIONS[key] === true
        );

        if (!active.length) {
            list.innerHTML = '<p class="condition-empty">No active conditions.</p>';
        } else {
            list.innerHTML = active.map(([key, config]) => {
                const level = config.stackable ? CONDITIONS[key] : 1;
                const title = config.stackable ? `${config.label} · Level ${level}` : config.label;
                const stepper = config.stackable ? `
                    <button type="button" class="condition-step" aria-label="Decrease ${escapeHtml(config.label)} level"
                        onclick="stepCondition('${key}', -1)">−</button>
                    <output class="condition-level" aria-label="${escapeHtml(config.label)} level ${level}">${level}</output>
                    <button type="button" class="condition-step" aria-label="Increase ${escapeHtml(config.label)} level"
                        onclick="stepCondition('${key}', 1)">+</button>
                ` : '';

                return `
                    <article class="condition-card" data-condition="${key}">
                        <div class="condition-card-head">
                            <div class="condition-title">${escapeHtml(title)}</div>
                            <div class="condition-controls">
                                ${stepper}
                                <button type="button" class="condition-clear" aria-label="Clear ${escapeHtml(config.label)}"
                                    onclick="clearCondition('${key}')">Clear</button>
                            </div>
                        </div>
                        <p class="condition-rule">${escapeHtml(config.effect(level))}</p>
                        <span class="condition-source">${escapeHtml(config.source)}</span>
                    </article>
                `;
            }).join('');
        }

        refreshEmptyMarkers();
    }

    function openConditionDialog() {
        const dialog = document.getElementById('condition_dialog');
        document.getElementById('condition_option_poisoned').disabled = CONDITIONS.poisoned;
        document.getElementById('condition_option_diseased').disabled = CONDITIONS.diseased;
        document.getElementById('condition_option_hungerThirst').disabled = CONDITIONS.hungerThirst >= 99;

        if (typeof dialog.showModal === 'function') dialog.showModal();
        else dialog.setAttribute('open', '');

        const firstAvailable = dialog.querySelector('.condition-option:not(:disabled)');
        if (firstAvailable) firstAvailable.focus();
    }

    function closeConditionDialog() {
        const dialog = document.getElementById('condition_dialog');
        if (dialog.open && typeof dialog.close === 'function') dialog.close();
        else dialog.removeAttribute('open');
    }

    function addCondition(key) {
        const config = CONDITION_LIBRARY[key];
        if (!config) return;

        if (config.stackable) CONDITIONS[key] = Math.min(99, CONDITIONS[key] + 1);
        else CONDITIONS[key] = true;

        renderConditions();
        scheduleSave();
        closeConditionDialog();
        playEffect(document.querySelector(`[data-condition="${key}"]`), 'condition-marked', 850);
    }

    function stepCondition(key, delta) {
        const config = CONDITION_LIBRARY[key];
        if (!config || !config.stackable) return;
        CONDITIONS[key] = Math.min(99, Math.max(0, CONDITIONS[key] + delta));
        renderConditions();
        scheduleSave();
    }

    function clearCondition(key) {
        const config = CONDITION_LIBRARY[key];
        if (!config) return;
        CONDITIONS[key] = config.stackable ? 0 : false;
        renderConditions();
        scheduleSave();
    }

    function updateArchetype(skipSave = false) {
        const val = document.getElementById('char_arch').value;
        const detailsDiv = document.getElementById('arch_details');
        const container = document.getElementById('arch_toggle_container');

        // Play mode hides the selector but keeps the name and the traits/limitations disclosure,
        // because several archetype traits change how a scenario is played.
        document.getElementById('arch_name_play').textContent = val || '';
        document.querySelector('.archetype-section').classList.toggle('is-empty', !val);

        if (val && val !== "") {
            container.style.display = "block";
            let html = '<div class="type-label">Traits:</div><ul class="trait-list">';
            ARCHETYPE_LIBRARY[val].traits.forEach(t => html += `<li class="trait-item">${t}</li>`);
            html += '</ul><div class="type-label" style="color:var(--danger-red)">Limitations:</div><ul class="trait-list">';
            ARCHETYPE_LIBRARY[val].limits.forEach(l => html += `<li class="limit-item">${l}</li>`);
            html += '</ul>';
            detailsDiv.innerHTML = html;
        } else {
            container.style.display = "none";
        }
        if (!skipSave) scheduleSave();
    }

    function toggleArchDetails() {
        const div = document.getElementById('arch_details');
        const btn = document.getElementById('arch_btn');
        const expanded = div.style.display !== "block";

        div.style.display = expanded ? "block" : "none";
        btn.textContent = expanded ? "Hide Archetype Details" : "Show Archetype Details";
        btn.setAttribute('aria-expanded', String(expanded));
    }

    function toggleInnateSection() {
        setInnateSectionExpanded(document.getElementById('innate-section').style.display === "none");
        scheduleSave();
    }

    function setMissionSectionExpanded(expanded) {
        const content = document.getElementById('mission_section_content');
        const button = document.getElementById('mission_section_toggle');
        const chevron = document.getElementById('mission_section_chevron');

        content.hidden = !expanded;
        button.setAttribute('aria-expanded', String(expanded));
        button.setAttribute('aria-label', expanded ? 'Collapse Mission section' : 'Expand Mission section');
        chevron.textContent = expanded ? '▾' : '▸';
    }

    function toggleMissionSection() {
        const content = document.getElementById('mission_section_content');
        setMissionSectionExpanded(content.hidden);
        scheduleSave();
    }

    function currentMode() {
        return document.body.dataset.mode === 'play' ? 'play' : 'edit';
    }

    // Play mode hides what is not needed mid-scenario; it never locks a field, so a correction
    // at the table is always one tap away.
    function setMode(mode, persist = true) {
        const next = MODES.includes(mode) ? mode : 'edit';
        const previous = document.activeElement;

        // Anything open may belong to a row that is about to disappear.
        Object.keys(SEARCHABLE_STATE).forEach(closeSearchMenu);

        document.body.dataset.mode = next;
        orderStatBoxes(next);

        MODES.forEach(name => {
            const btn = document.getElementById('mode_' + name);
            btn.setAttribute('aria-pressed', String(name === next));
            btn.classList.toggle('active', name === next);
        });

        refreshEmptyMarkers();

        if (activePreviewId && !isVisible(getSearchBox(activePreviewId))) hidePreviewPanel();

        if (previous && previous !== document.body && isVisible(previous)) {
            previous.focus({ preventScroll: true });
            previous.scrollIntoView({ block: 'center' });
        } else {
            window.scrollTo({ top: 0 });
        }

        if (persist) scheduleSave();
    }

    function isVisible(element) {
        return !!element && element.offsetParent !== null;
    }

    // Current Health leads the stat row in play mode. Moving the node rather than using CSS
    // `order` keeps the tab sequence matching what is on screen.
    function orderStatBoxes(mode) {
        const grid = document.getElementById('stat-grid');
        const current = grid.querySelector('.current-hp');

        if (mode === 'play') grid.insertBefore(current, grid.firstElementChild);
        else grid.insertBefore(current, document.getElementById('s_rec').closest('.stat-box'));
    }

    function toggleUntrainedSkills() {
        const block = document.getElementById('skills-block');
        const btn = document.getElementById('untrained_btn');
        const shown = block.classList.toggle('show-untrained');

        btn.textContent = shown ? 'Hide untrained skills' : 'Show untrained skills';
        btn.setAttribute('aria-expanded', String(shown));
    }

    // Marks what play mode may hide. Nothing else reads these classes.
    function refreshEmptyMarkers() {
        document.querySelectorAll('.ability-group, .equipment-group').forEach(group => {
            const field = group.querySelector('input.save-field');
            group.classList.toggle('is-empty', !field || !field.value.trim());
        });

        document.querySelectorAll('.skill-row').forEach(row => {
            const value = (row.querySelector('input.save-field') || {}).value || '';
            row.classList.toggle('is-empty', !value.trim() || Number(value) === 0);
        });

        const blocks = ['abilities-block', 'equipment-block', 'skills-block', 'innate-container'];
        const rowSelectors = ['.ability-group', '.equipment-group', '.skill-row', '.ability-group'];
        blocks.forEach((blockId, index) => markBlockEmpty(blockId, rowSelectors[index]));

        document.body.classList.toggle('play-empty',
            !hasActiveConditions() &&
            blocks.every(blockId => document.getElementById(blockId).classList.contains('is-empty')));
    }

    function markBlockEmpty(blockId, rowSelector) {
        const block = document.getElementById(blockId);
        const rows = Array.from(block.querySelectorAll(rowSelector));
        block.classList.toggle('is-empty', rows.every(row => row.classList.contains('is-empty')));
    }

    function setInnateSectionExpanded(expanded) {
        const btn = document.getElementById('innate_toggle_btn');

        document.getElementById('innate-section').style.display = expanded ? 'block' : 'none';
        btn.textContent = expanded ? 'Hide Innate Spells & Abilities' : 'Show Innate Spells & Abilities';
        btn.setAttribute('aria-expanded', String(expanded));
    }

    function getEquipmentDescription(value) {
        for (let group in EQUIPMENT_LIBRARY) {
            if (EQUIPMENT_LIBRARY[group][value]) return EQUIPMENT_LIBRARY[group][value];
        }
        return "";
    }

    function setDescription(id, desc) {
        const descDiv = document.getElementById('desc_' + id);
        const infoBtn = document.querySelector(`[data-info-for="${id}"]`);

        descDiv.innerHTML = desc;
        setDescExpanded(id, false, infoBtn);

        // Nothing to expand without rule text, so the control stops being a focus stop.
        if (infoBtn) infoBtn.disabled = !desc;

        if (activePreviewId === id) renderPreviewPanel(id);
    }

    function getSearchInput(id) {
        return document.getElementById(id + '_search');
    }

    function getSearchBox(id) {
        return document.getElementById(id + '_box');
    }

    function findOptionByValue(id, value) {
        return SEARCHABLE_STATE[id].options.find(option => option.value === value) || null;
    }

    function findOptionByLabel(id, label) {
        const normalized = normalizeSearchValue(label);
        return SEARCHABLE_STATE[id].options.find(option => normalizeSearchValue(option.label) === normalized) || null;
    }

    function buildCustomOption(label, id) {
        const state = SEARCHABLE_STATE[id];
        return {
            value: label,
            label,
            desc: '',
            badges: state.customBadges || ['Equipment', 'Custom'],
            group: state.customGroup || `Custom Entry for ${state.slotLabel}`,
            isCustom: true
        };
    }

    function getSearchPreviewOption(id) {
        const inputValue = getSearchInput(id).value.trim();
        if (!inputValue) return SEARCHABLE_STATE[id].selectedOption;

        const exactOption = findOptionByLabel(id, inputValue);
        if (exactOption) return exactOption;
        if (SEARCHABLE_STATE[id].allowCustom) return buildCustomOption(inputValue, id);
        return SEARCHABLE_STATE[id].selectedOption;
    }

    function hidePreviewPanel() {
        activePreviewId = null;
        document.querySelectorAll('.search-select.preview-active').forEach(node => node.classList.remove('preview-active'));
        document.getElementById('selection_preview').classList.remove('visible');
    }

    function renderPreviewPanel(id) {
        const state = SEARCHABLE_STATE[id];
        if (!state) {
            hidePreviewPanel();
            return;
        }

        const option = getSearchPreviewOption(id);
        const panel = document.getElementById('selection_preview');
        const title = document.getElementById('preview_title');
        const badges = document.getElementById('preview_badges');
        const description = document.getElementById('preview_description');
        const context = document.getElementById('preview_context');

        if (!option) {
            hidePreviewPanel();
            return;
        }

        panel.classList.add('visible');
        title.textContent = option.label;
        renderBadges(badges, option.badges);
        description.textContent = option.desc || 'Custom entry without a linked rule text.';
        context.textContent = `${state.slotLabel}${option.group ? ' • ' + option.group : ''}`;
    }

    function setActivePreview(id) {
        document.querySelectorAll('.search-select.preview-active').forEach(node => node.classList.remove('preview-active'));
        activePreviewId = id;
        getSearchBox(id).classList.add('preview-active');
        renderPreviewPanel(id);
    }

    function activatePreview(id) {
        const state = SEARCHABLE_STATE[id];
        if (!state || !state.selectedOption) {
            hidePreviewPanel();
            return;
        }
        setActivePreview(id);
    }

    function renderSelectionMeta(id, option) {
        const meta = document.getElementById('meta_' + id);
        meta.innerHTML = '';
    }

    function applySearchableValue(id, value, skipSave = true, showPreview = false) {
        const state = SEARCHABLE_STATE[id];
        const hiddenField = document.getElementById(id);
        const input = getSearchInput(id);
        const previousValue = state.selectedValue;
        let option = findOptionByValue(id, value);

        if (!option && state.allowCustom && value) option = buildCustomOption(value, id);

        state.selectedOption = option;
        state.selectedValue = option ? option.value : '';
        hiddenField.value = state.selectedValue;
        input.value = option ? option.label : '';
        renderSelectionMeta(id, option);
        setDescription(id, option ? option.desc : '');

        if (showPreview && option) setActivePreview(id);
        else if (activePreviewId === id) renderPreviewPanel(id);
        if (!skipSave && previousValue !== state.selectedValue && state.persistSelection !== false) scheduleSave();
    }

    function closeSearchMenu(id) {
        const box = getSearchBox(id);
        const input = getSearchInput(id);
        SEARCHABLE_STATE[id].highlightIndex = -1;
        box.classList.remove('open');
        input.setAttribute('aria-expanded', 'false');
        input.removeAttribute('aria-activedescendant');
    }

    function getFilteredOptions(id, query) {
        const normalized = normalizeSearchValue(query);
        const state = SEARCHABLE_STATE[id];
        if (!normalized) return state.options.slice();

        return state.options.filter(option => {
            const haystack = [
                option.label,
                option.group,
                ...(option.badges || [])
            ].join(' ');
            return normalizeSearchValue(haystack).includes(normalized);
        });
    }

    function renderSearchMenu(id) {
        const state = SEARCHABLE_STATE[id];
        const menu = document.getElementById(id + '_menu');
        const query = getSearchInput(id).value.trim();
        const filtered = getFilteredOptions(id, query);
        const exactMatch = query ? filtered.some(option => normalizeSearchValue(option.label) === normalizeSearchValue(query)) : false;

        state.renderedOptions = filtered.slice();
        if (state.allowCustom && query && !exactMatch) {
            state.renderedOptions.unshift(buildCustomOption(query, id));
        }

        if (!state.renderedOptions.length) {
            menu.innerHTML = '<div class="search-option"><div class="search-option-title">No matches found</div></div>';
            getSearchInput(id).removeAttribute('aria-activedescendant');
            return;
        }

        if (state.highlightIndex < 0 || state.highlightIndex >= state.renderedOptions.length) state.highlightIndex = 0;

        menu.innerHTML = '';
        state.renderedOptions.forEach((option, index) => {
            const item = document.createElement('div');
            item.className = `search-option${index === state.highlightIndex ? ' active' : ''}`;
            item.id = `${id}_opt${index}`;
            item.setAttribute('role', 'option');
            item.setAttribute('aria-selected', String(index === state.highlightIndex));
            item.innerHTML = `
                <div class="search-option-title">${escapeHtml(option.label)}</div>
                <div class="search-option-meta">
                    <span>${escapeHtml(option.group || '')}</span>
                    ${(option.badges || []).map(badge => `<span>${escapeHtml(badge)}</span>`).join('')}
                </div>
            `;
            item.addEventListener('mousedown', event => {
                event.preventDefault();
                applySearchableValue(id, option.value, false, state.showPreview !== false);
                closeSearchMenu(id);
            });
            menu.appendChild(item);
        });

        const active = menu.children[state.highlightIndex];
        getSearchInput(id).setAttribute('aria-activedescendant', active ? active.id : '');
        if (active) active.scrollIntoView({ block: 'nearest' });
    }

    function openSearchMenu(id) {
        Object.keys(SEARCHABLE_STATE).forEach(otherId => {
            if (otherId !== id) closeSearchMenu(otherId);
        });
        getSearchBox(id).classList.add('open');
        getSearchInput(id).setAttribute('aria-expanded', 'true');
        renderSearchMenu(id);
    }

    // Focus is the keyboard equivalent of clicking the field, so it does what the click does.
    function handleSearchFocus(id) {
        openSearchMenu(id);
        if (SEARCHABLE_STATE[id].selectedOption && SEARCHABLE_STATE[id].showPreview !== false) setActivePreview(id);
    }

    function commitSearchInput(id, showPreview = false) {
        const inputValue = getSearchInput(id).value.trim();
        const state = SEARCHABLE_STATE[id];

        if (!inputValue) {
            applySearchableValue(id, '', false, false);
            return;
        }

        const exact = findOptionByLabel(id, inputValue);
        if (exact) {
            applySearchableValue(id, exact.value, false, showPreview);
            return;
        }

        if (state.allowCustom) {
            applySearchableValue(id, inputValue, false, showPreview);
            return;
        }

        applySearchableValue(id, state.selectedValue || '', true);
    }

    function handleSearchInput(id) {
        openSearchMenu(id);
        renderSearchMenu(id);
    }

    function handleSearchBlur(id) {
        window.setTimeout(() => {
            commitSearchInput(id, false);
            closeSearchMenu(id);
        }, 120);
    }

    function handleSearchKeydown(event, id) {
        const state = SEARCHABLE_STATE[id];

        if (event.key === 'ArrowDown') {
            event.preventDefault();
            openSearchMenu(id);
            state.highlightIndex = Math.min(state.highlightIndex + 1, Math.max(state.renderedOptions.length - 1, 0));
            renderSearchMenu(id);
            return;
        }

        if (event.key === 'ArrowUp') {
            event.preventDefault();
            openSearchMenu(id);
            state.highlightIndex = Math.max(state.highlightIndex - 1, 0);
            renderSearchMenu(id);
            return;
        }

        if (event.key === 'Enter') {
            event.preventDefault();
            if (state.renderedOptions.length && state.highlightIndex >= 0) {
                applySearchableValue(id, state.renderedOptions[state.highlightIndex].value, false, state.showPreview !== false);
                closeSearchMenu(id);
            } else {
                commitSearchInput(id, state.showPreview !== false);
            }
            return;
        }

        if (event.key === 'Escape') {
            event.preventDefault();
            applySearchableValue(id, state.selectedValue || '', true);
            closeSearchMenu(id);
        }
    }

    function setSlotUsed(id, used) {
        const row = document.getElementById('row_' + id);
        row.classList.toggle('used', used);
        row.querySelector('.ability-toggle').setAttribute('aria-pressed', String(used));
    }

    function toggleUse(id) {
        const row = document.getElementById('row_' + id);
        const used = !row.classList.contains('used');
        setSlotUsed(id, used);
        const group = document.getElementById('group_' + id);
        stopEffect(group, used ? 'ability-restored' : 'ability-spent');
        playEffect(group, used ? 'ability-spent' : 'ability-restored', 700);
        scheduleSave();
    }

    function toggleDescVisibility(id, infoBtn) {
        const descDiv = document.getElementById('desc_' + id);
        const button = infoBtn || document.querySelector(`[data-info-for="${id}"]`);

        if (!descDiv.innerHTML.trim()) return;

        setDescExpanded(id, descDiv.style.display !== 'block', button);
    }

    function setDescExpanded(id, expanded, infoBtn) {
        const descDiv = document.getElementById('desc_' + id);
        const button = infoBtn || document.querySelector(`[data-info-for="${id}"]`);

        descDiv.style.display = expanded ? 'block' : 'none';

        if (button) {
            button.classList.toggle('active', expanded);
            button.textContent = expanded ? '^' : 'ℹ';
            button.setAttribute('aria-expanded', String(expanded));
        }
    }

    function describeDataError(error) {
        if (error instanceof SyntaxError) return 'The data is not valid JSON.';
        return error instanceof Error ? error.message : String(error);
    }

    // --- Mission report ---

    function newMissionId() {
        return `${Date.now().toString(36)}-${++missionSequence}`;
    }

    function createMission() {
        const now = new Date();
        const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

        return {
            id: newMissionId(),
            title: '',
            date: date,
            scenario: '',
            scenarioId: null,
            scenarioCatalogVersion: null,
            notes: '',
            status: 'active',
            appliedXp: 0,
            kills: [],
            objectives: [],
            adjustments: []
        };
    }

    // Totals are always derived, never stored, so a corrected row cannot leave a stale number behind.
    function missionTotals(mission) {
        const killCount = mission.kills.reduce((sum, row) => sum + row.count, 0);
        const killXp = mission.kills.reduce((sum, row) => sum + row.count * row.value, 0);
        const objectives = mission.objectives.reduce((sum, row) => sum + (row.completed ? row.value : 0), 0);
        const adjustments = mission.adjustments.reduce((sum, row) => sum + row.value, 0);

        return { killCount, killXp, objectives, adjustments, total: killXp + objectives + adjustments };
    }

    function missionRowLists(mission) {
        return { kills: mission.kills, objectives: mission.objectives, adjustments: mission.adjustments };
    }

    function findMission(id) {
        if (MISSION.active && MISSION.active.id === id) return MISSION.active;
        return MISSION.history.find(mission => mission.id === id) || null;
    }

    function findMissionRow(missionId, kind, rowId) {
        const mission = findMission(missionId);
        if (!mission) return null;
        return missionRowLists(mission)[kind].find(row => row.id === rowId) || null;
    }

    function starterScenarioForMission(mission) {
        return mission && mission.scenarioId
            ? STARTER_SCENARIOS_BY_ID.get(mission.scenarioId) || null
            : null;
    }

    function starterScenarioReference(scenario) {
        return `Mission ${scenario.mission.number}: ${scenario.mission.title} · Scenario ${scenario.number}`;
    }

    function renderScenarioOptions(selectedId) {
        return SCENARIO_LIBRARY.missions.map(mission => `
            <optgroup label="Mission ${mission.number} · ${escapeHtml(mission.title)}">
                ${mission.scenarios.map(scenario => `
                    <option value="${scenario.id}"${scenario.id === selectedId ? ' selected' : ''}>
                        Scenario ${scenario.number} — ${escapeHtml(scenario.title)}
                    </option>
                `).join('')}
            </optgroup>
        `).join('');
    }

    function selectMissionScenario(missionId, scenarioId) {
        const mission = findMission(missionId);
        if (!mission || mission.status !== 'active') return;

        const previousScenario = starterScenarioForMission(mission);
        const scenario = STARTER_SCENARIOS_BY_ID.get(scenarioId) || null;
        if (scenario) {
            mission.scenarioId = scenario.id;
            mission.scenarioCatalogVersion = SCENARIO_CATALOG_VERSION;
            mission.scenario = starterScenarioReference(scenario);
            mission.title = scenario.title;
        } else {
            if (previousScenario && mission.title === previousScenario.title) mission.title = '';
            if (previousScenario && mission.scenario === starterScenarioReference(previousScenario)) mission.scenario = '';
            mission.scenarioId = null;
            mission.scenarioCatalogVersion = null;
        }

        renderMissions();
        scheduleSave();

        const select = document.getElementById('mission_scenario_select');
        if (select) select.focus();
    }

    function renderScenarioBriefing(mission) {
        const scenario = starterScenarioForMission(mission);
        if (!scenario) return '';

        const timing = scenario.turnLimit
            ? `${scenario.turnLimit} turns`
            : 'No fixed turn limit';

        return `
            <aside class="scenario-brief" aria-labelledby="scenario_brief_title">
                <div class="scenario-brief-head">
                    <div>
                        <span class="scenario-kicker">Mission ${scenario.mission.number} · Scenario ${scenario.number}</span>
                        <strong id="scenario_brief_title">${escapeHtml(scenario.title)}</strong>
                    </div>
                    <span class="scenario-page">Rulebook p. ${scenario.page}</span>
                </div>
                <p>${escapeHtml(scenario.brief)}</p>
                <div class="scenario-brief-facts">
                    <span>${escapeHtml(timing)}</span>
                    <span>${escapeHtml(scenario.eventCue)}</span>
                </div>
                <ul>${scenario.reminders.map(reminder => `<li>${escapeHtml(reminder)}</li>`).join('')}</ul>
                <small>Quick reference only — use the scenario pages for set-up, events, special rules, and rewards.</small>
            </aside>
        `;
    }

    function signedStat(value) {
        return value >= 0 ? `+${value}` : String(value);
    }

    function renderScenarioEnemies(mission) {
        const scenario = starterScenarioForMission(mission);
        const encounters = scenario ? SCENARIO_ENEMY_LIBRARY.scenarios[scenario.id] : null;
        if (!encounters || !encounters.length) return '';

        const statLabels = [
            ['Mov', 'move', false],
            ['Fig', 'fight', true],
            ['Sho', 'shoot', true],
            ['Arm', 'armour', false],
            ['Wil', 'will', true],
            ['HP', 'health', false]
        ];

        const cards = encounters.map(encounter => {
            const profile = SCENARIO_ENEMY_LIBRARY.profiles[encounter.enemyId];
            if (!profile) return '';
            const contexts = encounter.contexts
                .map(context => SCENARIO_ENEMY_CONTEXT_LABELS[context])
                .filter(Boolean)
                .map(label => `<span>${escapeHtml(label)}</span>`)
                .join('');
            const stats = statLabels.map(([label, key, signed]) => `
                <div><dt>${label}</dt><dd>${signed ? signedStat(profile.stats[key]) : profile.stats[key]}</dd></div>
            `).join('');
            const notes = profile.notes.map(note => `<span>${escapeHtml(note)}</span>`).join('');
            const rules = profile.rules.length
                ? `<ul>${profile.rules.map(rule => `<li>${escapeHtml(rule)}</li>`).join('')}</ul>`
                : '';

            return `
                <article class="scenario-enemy-card" data-enemy-id="${escapeHtml(encounter.enemyId)}">
                    <div class="scenario-enemy-head">
                        <strong>${escapeHtml(profile.name)}</strong>
                        <span>${profile.xp} XP</span>
                    </div>
                    <div class="scenario-enemy-contexts">${contexts}</div>
                    <dl class="scenario-enemy-stats">${stats}</dl>
                    <div class="scenario-enemy-notes">${notes}</div>
                    ${rules}
                    <small>Bestiary p. ${profile.page}</small>
                </article>
            `;
        }).join('');

        return `
            <section class="scenario-enemies" aria-labelledby="scenario_enemy_title">
                <div class="scenario-enemies-head">
                    <div>
                        <span class="scenario-kicker">Encounter reference</span>
                        <strong id="scenario_enemy_title">Enemies in this scenario</strong>
                    </div>
                    <span>${encounters.length} ${encounters.length === 1 ? 'profile' : 'profiles'}</span>
                </div>
                <div class="scenario-enemy-grid">${cards}</div>
                <small>Profiles are always available. Placement, quantities, events, and scenario-specific behavior remain on the scenario pages.</small>
            </section>
        `;
    }

    function renderScenarioProgress() {
        const completed = new Set(
            MISSION.history
                .map(mission => mission.scenarioId)
                .filter(id => STARTER_SCENARIOS_BY_ID.has(id))
        );
        const activeId = MISSION.active && STARTER_SCENARIOS_BY_ID.has(MISSION.active.scenarioId)
            ? MISSION.active.scenarioId
            : null;

        if (!completed.size && !activeId) return '';

        const nodes = STARTER_SCENARIOS.map(scenario => {
            const state = scenario.id === activeId ? ' current' : completed.has(scenario.id) ? ' complete' : '';
            const status = scenario.id === activeId ? 'current' : completed.has(scenario.id) ? 'completed' : 'not completed';
            return `<span class="scenario-progress-node${state}" aria-label="Mission ${scenario.mission.number}, Scenario ${scenario.number}, ${escapeHtml(scenario.title)}: ${status}">${scenario.mission.number}.${scenario.number}</span>`;
        }).join('');

        return `
            <section class="scenario-progress" aria-label="Standard mission progress">
                <div><span>Standard Missions</span><strong>${completed.size} / ${STARTER_SCENARIOS.length} complete</strong></div>
                <div class="scenario-progress-track">${nodes}</div>
            </section>
        `;
    }

    function startMission() {
        if (MISSION.active) return;
        MISSION.active = createMission();
        renderMissions();
        scheduleSave();
        const scenario = document.getElementById('mission_scenario_select');
        if (scenario) scenario.focus();
    }

    function addMissionRow(kind) {
        const mission = MISSION.active;
        if (!mission) return;

        const rows = missionRowLists(mission)[kind];
        if (rows.length >= MAX_MISSION_ROWS) {
            alert(`A mission can hold at most ${MAX_MISSION_ROWS} entries of one kind.`);
            return;
        }

        const id = newMissionId();
        if (kind === 'kills') rows.push({ id, enemyId: null, catalogVersion: null, name: '', count: 1, value: 0 });
        else if (kind === 'objectives') rows.push({ id, title: '', type: 'primary', completed: false, value: 0 });
        else rows.push({ id, label: '', value: 0 });

        renderMissions();
        const field = document.querySelector(`[data-row="${id}"] input[type="text"]`);
        if (field) field.focus();
        scheduleSave();
    }

    function addSelectedMissionEnemy() {
        const mission = MISSION.active;
        if (!mission) return;
        if (mission.kills.length >= MAX_MISSION_ROWS) {
            alert(`A mission can hold at most ${MAX_MISSION_ROWS} enemies.`);
            return;
        }

        const select = document.getElementById('enemy_picker_select');
        const enemy = ENEMY_CATALOG
            ? ENEMY_CATALOG.enemies.find(entry => entry.id === select.value)
            : null;

        if (!enemy) {
            select.focus();
            return;
        }

        mission.kills.push({
            id: newMissionId(),
            enemyId: enemy.id,
            catalogVersion: `${ENEMY_CATALOG.catalogId}@${ENEMY_CATALOG.catalogVersion}`,
            name: enemy.name,
            count: 1,
            value: enemy.xp
        });

        select.value = '';
        updateEnemyPickerAction();
        renderMissions();
        scheduleSave();
    }

    // Removal is undoable rather than confirmed: a wrong tap at the table should cost one tap back.
    function removeMissionRow(kind, rowId) {
        const mission = MISSION.active;
        if (!mission) return;

        const rows = missionRowLists(mission)[kind];
        const index = rows.findIndex(row => row.id === rowId);
        if (index < 0) return;

        const [row] = rows.splice(index, 1);
        lastMissionRemoval = { kind, index, row, label: row.name || row.title || row.label || 'entry' };

        renderMissions();
        scheduleSave();
    }

    function undoMissionRemoval() {
        if (!lastMissionRemoval || !MISSION.active) return;

        const { kind, index, row } = lastMissionRemoval;
        missionRowLists(MISSION.active)[kind].splice(index, 0, row);
        lastMissionRemoval = null;

        renderMissions();
        scheduleSave();
    }

    function updateMissionField(missionId, field, value) {
        const mission = findMission(missionId);
        if (!mission) return;
        mission[field] = value;
        scheduleSave();
    }

    function updateMissionRow(missionId, kind, rowId, field, value) {
        const row = findMissionRow(missionId, kind, rowId);
        if (!row) return;

        if (field === 'count') row.count = Math.max(0, Math.trunc(Number(value) || 0));
        else if (field === 'value') row.value = Number(value) || 0;
        else if (field === 'completed') row.completed = value === true;
        else row[field] = value;

        // Name and XP are snapshots. A manual correction makes the row custom, while changing
        // only the count preserves where the suggested value originally came from.
        if (kind === 'kills' && (field === 'name' || field === 'value')) {
            row.enemyId = null;
            row.catalogVersion = null;
        }

        updateMissionTotals();
        scheduleSave();
    }

    // Toggled in place rather than through a re-render, so the control keeps focus.
    function toggleObjective(missionId, rowId) {
        const row = findMissionRow(missionId, 'objectives', rowId);
        if (!row) return;

        row.completed = !row.completed;

        const btn = document.querySelector(`[data-row="${rowId}"] .mission-check`);
        if (btn) {
            btn.classList.toggle('done', row.completed);
            btn.setAttribute('aria-pressed', String(row.completed));
        }

        updateMissionTotals();
        scheduleSave();
    }

    function stepMissionCount(missionId, rowId, delta) {
        const row = findMissionRow(missionId, 'kills', rowId);
        if (!row) return;

        row.count = Math.max(0, row.count + delta);
        const field = document.querySelector(`[data-row="${rowId}"] [data-field="count"]`);
        if (field) field.value = row.count;

        updateMissionTotals();
        scheduleSave();
    }

    function completeMission() {
        const mission = MISSION.active;
        if (!mission) return;

        const totals = missionTotals(mission);
        const name = mission.title.trim() || 'this mission';
        const confirmed = confirm(
            `Complete ${name} with a proposed total of ${totals.total} XP?\n\n` +
            'The report moves to the mission history and stops accepting edits until you reopen it. ' +
            'No XP is applied to your Ranger until you choose Apply XP.'
        );
        if (!confirmed) return;

        mission.status = 'complete';
        MISSION.history.unshift(mission);
        MISSION.active = null;
        lastMissionRemoval = null;

        if (MISSION.history.length > MAX_MISSION_HISTORY) MISSION.history.length = MAX_MISSION_HISTORY;

        renderMissions();
        saveNow();

        if (confirm('Mark every used Heroic Ability and Innate Spell as available again for the next scenario?')) {
            restoreAllAbilities();
        }

        const completedCard = document.querySelector(`.mission-card.past[data-mission="${mission.id}"]`);
        playEffect(completedCard, 'mission-sealed', 950);
    }

    function restoreAllAbilities() {
        ['heroic', 'innate'].forEach(type => {
            slotGroups(type).forEach(group => setSlotUsed(group.dataset.slotId, false));
        });
        saveNow();
    }

    function reopenMission(missionId) {
        if (MISSION.active) {
            alert('Finish or complete the mission you already have open before reopening an older report.');
            return;
        }

        const index = MISSION.history.findIndex(mission => mission.id === missionId);
        if (index < 0) return;

        const [mission] = MISSION.history.splice(index, 1);
        mission.status = 'active';
        MISSION.active = mission;

        renderMissions();
        scheduleSave();
    }

    // XP is never transferred silently; this is the only path from a report into the Ranger.
    function applyMissionXp(missionId) {
        const mission = findMission(missionId);
        if (!mission) return;

        const totals = missionTotals(mission);
        const outstanding = totals.total - mission.appliedXp;
        if (!outstanding) return;

        const xpField = document.getElementById('char_xp');
        const current = Number(xpField.value) || 0;
        const name = mission.title.trim() || 'this mission';

        const confirmed = confirm(
            `Add ${outstanding} XP from ${name} to your Ranger?\n\n` +
            `Experience goes from ${current} to ${current + outstanding}. You can still edit the field by hand afterwards.`
        );
        if (!confirmed) return;

        xpField.value = current + outstanding;
        mission.appliedXp = totals.total;

        renderMissions();
        saveNow();

        playEffect(document.querySelector(`.mission-card.past[data-mission="${missionId}"]`), 'xp-applied', 950);
        playEffect(xpField.closest('.stat-box'), 'xp-total', 950);
    }

    function renderMissions() {
        const block = document.getElementById('mission-block');
        const active = MISSION.active;

        const parts = [renderScenarioProgress()];

        if (active) parts.push(renderActiveMission(active));
        else parts.push(`
            <div class="mission-empty">
                <p>No mission is running. Start one to record kills, objectives and the experience they add up to.</p>
                <button type="button" class="mission-primary" onclick="startMission()">Start a mission</button>
            </div>
        `);

        if (MISSION.history.length) parts.push(renderMissionHistory());

        block.innerHTML = parts.join('');
        block.classList.toggle('is-empty', !active && !MISSION.history.length);
        document.getElementById('mission-enemy-tools').style.display = active ? 'block' : 'none';
        if (!active) document.getElementById('enemy_picker_select').value = '';
        updateEnemyPickerAction();
        refreshEmptyMarkers();
    }

    function renderActiveMission(mission) {
        const totals = missionTotals(mission);
        const id = mission.id;

        return `
            <div class="mission-card" data-mission="${id}">
                <div class="mission-head">
                    <label class="mission-scenario-picker"><span>Scenario</span>
                        <select id="mission_scenario_select" aria-label="Published scenario"
                            onchange="selectMissionScenario('${id}', this.value)">
                            <option value="">Custom / unlisted scenario</option>
                            ${renderScenarioOptions(mission.scenarioId)}
                        </select>
                    </label>
                    <input type="text" id="mission_title" class="mission-title-input" placeholder="Mission title"
                        value="${escapeHtml(mission.title)}" aria-label="Mission title"
                        oninput="updateMissionField('${id}', 'title', this.value)">
                    <div class="mission-head-meta">
                        <label class="mission-inline"><span>Date</span>
                            <input type="date" value="${escapeHtml(mission.date)}" aria-label="Mission date"
                                onchange="updateMissionField('${id}', 'date', this.value)"></label>
                        <label class="mission-inline"><span>${mission.scenarioId ? 'Reference' : 'Custom reference'}</span>
                            <input type="text" value="${escapeHtml(mission.scenario)}" placeholder="optional"
                                aria-label="Scenario reference"${mission.scenarioId ? ' readonly' : ''}
                                oninput="updateMissionField('${id}', 'scenario', this.value)"></label>
                    </div>
                </div>

                ${renderScenarioBriefing(mission)}
                ${renderScenarioEnemies(mission)}

                ${renderKills(mission)}
                ${renderObjectives(mission)}
                ${renderAdjustments(mission)}

                <label class="mission-notes-label" for="mission_notes">Mission notes</label>
                <textarea id="mission_notes" class="mission-notes" placeholder="What happened out there?"
                    oninput="updateMissionField('${id}', 'notes', this.value)">${escapeHtml(mission.notes)}</textarea>

                ${renderTotals(totals)}
                ${renderUndoNotice()}

                <div class="mission-actions">
                    <button type="button" class="mission-primary" onclick="completeMission()">Complete Mission</button>
                </div>
                <p class="mission-note">Completing a mission only freezes the report. Experience is applied afterwards, and only when you say so.</p>
            </div>
        `;
    }

    function renderKills(mission) {
        const id = mission.id;
        const rows = mission.kills.map(row => `
            <div class="mission-row mission-kill-row" data-row="${row.id}">
                <input type="text" class="mission-grow" placeholder="Enemy" value="${escapeHtml(row.name)}"
                    aria-label="Enemy name" oninput="updateMissionRow('${id}', 'kills', '${row.id}', 'name', this.value)">
                <div class="mission-count">
                    <button type="button" class="mission-step" aria-label="One fewer ${escapeHtml(row.name || 'enemy')}"
                        onclick="stepMissionCount('${id}', '${row.id}', -1)">−</button>
                    <input type="number" data-field="count" value="${row.count}" min="0" aria-label="Number defeated"
                        oninput="updateMissionRow('${id}', 'kills', '${row.id}', 'count', this.value)">
                    <button type="button" class="mission-step" aria-label="One more ${escapeHtml(row.name || 'enemy')}"
                        onclick="stepMissionCount('${id}', '${row.id}', 1)">+</button>
                </div>
                <input type="number" class="mission-value" value="${row.value}" aria-label="Experience each"
                    oninput="updateMissionRow('${id}', 'kills', '${row.id}', 'value', this.value)">
                <button type="button" class="mission-remove" aria-label="Remove ${escapeHtml(row.name || 'this enemy')}"
                    onclick="removeMissionRow('kills', '${row.id}')">✕</button>
            </div>
        `).join('');

        return `
            <div class="mission-group">
                <div class="mission-group-head"><h3>Kills</h3><span class="mission-hint">enemy · number · XP each</span></div>
                ${rows || '<p class="mission-none">Nothing recorded yet.</p>'}
                <button type="button" class="mission-add" onclick="addMissionRow('kills')">+ Add blank enemy</button>
            </div>
        `;
    }

    function renderObjectives(mission) {
        const id = mission.id;
        const rows = mission.objectives.map(row => `
            <div class="mission-row" data-row="${row.id}">
                <button type="button" class="mission-check${row.completed ? ' done' : ''}" aria-pressed="${row.completed}"
                    aria-label="${escapeHtml(row.title || 'Objective')} completed"
                    onclick="toggleObjective('${id}', '${row.id}')">✓</button>
                <input type="text" class="mission-grow" placeholder="Objective" value="${escapeHtml(row.title)}"
                    aria-label="Objective" oninput="updateMissionRow('${id}', 'objectives', '${row.id}', 'title', this.value)">
                <select class="mission-type" aria-label="Objective type"
                    onchange="updateMissionRow('${id}', 'objectives', '${row.id}', 'type', this.value)">
                    ${OBJECTIVE_TYPES.map(type => `<option value="${type}"${type === row.type ? ' selected' : ''}>${type}</option>`).join('')}
                </select>
                <input type="number" class="mission-value" value="${row.value}" aria-label="Experience when completed"
                    oninput="updateMissionRow('${id}', 'objectives', '${row.id}', 'value', this.value)">
                <button type="button" class="mission-remove" aria-label="Remove ${escapeHtml(row.title || 'this objective')}"
                    onclick="removeMissionRow('objectives', '${row.id}')">✕</button>
            </div>
        `).join('');

        return `
            <div class="mission-group">
                <div class="mission-group-head"><h3>Objectives</h3><span class="mission-hint">only completed ones count</span></div>
                ${rows || '<p class="mission-none">Nothing recorded yet.</p>'}
                <button type="button" class="mission-add" onclick="addMissionRow('objectives')">+ Add objective</button>
            </div>
        `;
    }

    function renderAdjustments(mission) {
        const id = mission.id;
        const rows = mission.adjustments.map(row => `
            <div class="mission-row" data-row="${row.id}">
                <input type="text" class="mission-grow" placeholder="Reason" value="${escapeHtml(row.label)}"
                    aria-label="Adjustment reason" oninput="updateMissionRow('${id}', 'adjustments', '${row.id}', 'label', this.value)">
                <input type="number" class="mission-value" value="${row.value}" aria-label="Experience change"
                    oninput="updateMissionRow('${id}', 'adjustments', '${row.id}', 'value', this.value)">
                <button type="button" class="mission-remove" aria-label="Remove ${escapeHtml(row.label || 'this adjustment')}"
                    onclick="removeMissionRow('adjustments', '${row.id}')">✕</button>
            </div>
        `).join('');

        return `
            <div class="mission-group">
                <div class="mission-group-head"><h3>Adjustments</h3><span class="mission-hint">bonuses or penalties, negative allowed</span></div>
                ${rows || '<p class="mission-none">Nothing recorded yet.</p>'}
                <button type="button" class="mission-add" onclick="addMissionRow('adjustments')">+ Add adjustment</button>
            </div>
        `;
    }

    /*
       Deliberately not a live region: the total changes on every keystroke in the fields next to
       it, and announcing each intermediate value would talk over the user.
    */
    function renderTotals(totals) {
        const killLabel = totals.killCount === 1 ? 'kill' : 'kills';
        return `
            <div class="mission-total">
                <span>${totals.killCount} ${killLabel}</span>
                <span>Kill XP ${totals.killXp}</span>
                <span>Objective XP ${totals.objectives}</span>
                <span>Adjustments ${totals.adjustments} XP</span>
                <strong>Proposed total ${totals.total} XP</strong>
            </div>
        `;
    }

    function renderUndoNotice() {
        if (!lastMissionRemoval) return '';
        return `
            <div class="mission-undo" role="status">
                <span>Removed “${escapeHtml(lastMissionRemoval.label)}”.</span>
                <button type="button" onclick="undoMissionRemoval()">Undo</button>
            </div>
        `;
    }

    function renderMissionHistory() {
        const cards = MISSION.history.map(mission => {
            const totals = missionTotals(mission);
            const outstanding = totals.total - mission.appliedXp;

            return `
                <div class="mission-card past" data-mission="${mission.id}">
                    <div class="mission-past-head">
                        <strong>${escapeHtml(mission.title.trim() || 'Untitled mission')}</strong>
                        <span>${escapeHtml(mission.date)}${mission.scenario ? ' · ' + escapeHtml(mission.scenario) : ''}</span>
                    </div>
                    <div class="mission-past-summary">
                        <span>${totals.killCount} ${totals.killCount === 1 ? 'kill' : 'kills'}</span>
                        <span>${mission.objectives.filter(row => row.completed).length} of ${mission.objectives.length} objectives</span>
                        <strong>${totals.total} XP</strong>
                        ${mission.appliedXp ? `<span class="mission-applied">${mission.appliedXp} applied</span>` : ''}
                    </div>
                    ${mission.notes ? `<p class="mission-past-notes">${escapeHtml(mission.notes)}</p>` : ''}
                    <div class="mission-actions">
                        ${outstanding
                            ? `<button type="button" class="mission-primary" onclick="applyMissionXp('${mission.id}')">Apply ${outstanding} XP to Ranger</button>`
                            : '<span class="mission-note">Experience already applied.</span>'}
                        <button type="button" class="mission-secondary setup-only" onclick="reopenMission('${mission.id}')">Reopen to correct</button>
                    </div>
                </div>
            `;
        }).join('');

        return `<div class="mission-history"><h3>Mission history</h3>${cards}</div>`;
    }

    function updateMissionTotals() {
        const mission = MISSION.active;
        const holder = document.querySelector('.mission-card .mission-total');
        if (!mission || !holder) return;
        holder.outerHTML = renderTotals(missionTotals(mission));
    }

    // Only ever called with a normalized document, so the sheet is never left half-written.
    function applyDocument(doc, persist = true, historyEvent = '') {
        const fields = doc.character.fields;

        saveFields.forEach(f => {
            if (SEARCHABLE_STATE[f.id] && f.id.startsWith('it')) return;
            f.value = Object.prototype.hasOwnProperty.call(fields, f.id) ? fields[f.id] : '';
            if (f.id === 'char_arch') updateArchetype(true);
        });
        renderAllTemporaryEffects();

        clearSlots('heroic');
        clearSlots('innate');

        setInnateSectionExpanded(doc.uiState.showInnateSection);
        setMissionSectionExpanded(doc.uiState.missionSectionExpanded);

        applySlots('heroic', doc.character.heroicSlots);
        applySlots('innate', doc.character.innateSlots);

        for (let i = 1; i <= 6; i++) applySearchableValue('it' + i, fields['it' + i] || '', true);

        CONDITIONS = doc.character.conditions;
        renderConditions();

        MISSION = { active: doc.activeMission, history: doc.missionHistory };
        lastMissionRemoval = null;
        renderMissions();

        setMode(doc.uiState.mode, false);
        CHANGE_HISTORY = doc.changeHistory.map(entry => ({
            ...entry,
            changes: entry.changes.map(change => ({ ...change }))
        }));
        lastTrackedState = snapshotTrackedDocument(collectDocument());
        if (historyEvent) recordHistoryEvent('system', historyEvent);
        else renderChangeHistory();

        if (persist) saveNow({ track: false });
    }

    function applySlots(type, slots) {
        slots.forEach(slot => {
            const id = addSlot(type);
            applySearchableValue(id, slot.value, true);
            setSlotUsed(id, slot.used);
        });
    }

    function initializeBlankSheet() {
        applyDocument(createBlankDocument(), false);
    }

    function load() {
        const stored = STORAGE.loadCharacter(parseDocument);

        if (stored.status === 'unavailable') {
            console.error('Browser storage is unavailable.', stored.error);
            initializeBlankSheet();
            setSaveStatus('unsaved', 'Storage unavailable');
            alert('Browser storage is unavailable. You can use the sheet, but changes may not be saved.');
            return;
        }

        if (stored.status === 'empty') {
            initializeBlankSheet();
            return;
        }

        if (stored.status === 'invalid') {
            console.error('Saved character data could not be loaded.', stored.error);
            if (!stored.recovery.ok) {
                console.error('Could not preserve the recovery copy.', stored.recovery.error);
            }
            initializeBlankSheet();
            setSaveStatus('unsaved', 'Recovery needed');
            alert(
                `Saved character data could not be loaded, so a blank sheet was opened.\n\n${describeDataError(stored.error)}\n\n` +
                (stored.recovery.ok
                    ? 'The original data was preserved in a browser recovery copy. Do not use Obliterate if you still need it.'
                    : 'The original storage value was not deliberately removed.')
            );
            return;
        }

        const result = stored.result;
        if (result.migratedFrom !== null) {
            console.info(`Migrated stored character data from format version ${result.migratedFrom} to ${FORMAT_VERSION}.`);
            if (stored.recovery && !stored.recovery.ok) {
                console.error('Could not preserve the recovery copy.', stored.recovery.error);
            }
        }

        result.warnings.forEach(warning => console.warn(warning));
        applyDocument(result.document);
    }

    function handleDocumentClick(event) {
        const clickedPreviewTrigger = event.target.closest('.search-select') || event.target.closest('.info-toggle') || event.target.closest('.preview-panel');
        Object.keys(SEARCHABLE_STATE).forEach(id => {
            if (!getSearchBox(id).contains(event.target)) closeSearchMenu(id);
        });
        if (!clickedPreviewTrigger) hidePreviewPanel();
    }

    function attachSaveListeners() {
        saveFields.forEach(f => {
            if (SEARCHABLE_STATE[f.id]) return;
            f.addEventListener('input', scheduleSave);
            f.addEventListener('change', scheduleSave);
        });
    }

    // --- Stepper buttons for number inputs ---
    // Always built; CSS decides whether they are shown, so switching between mouse and touch
    // on a convertible does not need a reload.
    function initNumberSteppers() {
        document.querySelectorAll('input[type=number]').forEach(input => {
            // Avoid double-wrapping
            if (input.closest('.num-stepper') || input.hasAttribute('data-no-stepper')) return;

            const wrapper = document.createElement('div');
            wrapper.className = 'num-stepper';

            const btnMinus = document.createElement('button');
            btnMinus.type = 'button';
            btnMinus.tabIndex = -1;
            btnMinus.className = 'stepper-btn stepper-minus';
            btnMinus.textContent = '−';
            btnMinus.setAttribute('aria-label', 'Decrease');
            btnMinus.addEventListener('click', () => {
                const step = parseFloat(input.step) || 1;
                const val = parseFloat(input.value) || 0;
                input.value = val - step;
                input.dispatchEvent(new Event('input', { bubbles: true }));
                input.dispatchEvent(new Event('change', { bubbles: true }));
                if (input.id === 's_hpc') {
                    const healthBox = input.closest('.current-hp');
                    stopEffect(healthBox, 'health-heal');
                    playEffect(healthBox, 'health-damage', 650);
                }
                btnMinus.blur();
            });

            const btnPlus = document.createElement('button');
            btnPlus.type = 'button';
            btnPlus.tabIndex = -1;
            btnPlus.className = 'stepper-btn stepper-plus';
            btnPlus.textContent = '+';
            btnPlus.setAttribute('aria-label', 'Increase');
            btnPlus.addEventListener('click', () => {
                const step = parseFloat(input.step) || 1;
                const val = parseFloat(input.value) || 0;
                input.value = val + step;
                input.dispatchEvent(new Event('input', { bubbles: true }));
                input.dispatchEvent(new Event('change', { bubbles: true }));
                if (input.id === 's_hpc') {
                    const healthBox = input.closest('.current-hp');
                    stopEffect(healthBox, 'health-damage');
                    playEffect(healthBox, 'health-heal', 700);
                }
                btnPlus.blur();
            });

            // Insert wrapper before the input, then move input inside, add buttons
            input.parentNode.insertBefore(wrapper, input);
            wrapper.appendChild(btnMinus);
            wrapper.appendChild(input);
            wrapper.appendChild(btnPlus);
        });
    }

    function initializeApp() {
        populateDropdowns();
        loadEnemyCatalog();
        initSearchables();
        loadTemporaryEffects();
        attachSaveListeners();
        load();
        initNumberSteppers();
        document.getElementById('ally_modifier_dialog').addEventListener('close', () => {
            activeEffectStatId = null;
        });
        document.addEventListener('click', handleDocumentClick);
        hidePreviewPanel();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeApp, { once: true });
    } else {
        initializeApp();
    }

    function downloadJSON() {
        saveNow();
        const name = document.getElementById('char_name').value || 'Ranger';
        const now = new Date();
        const dateStr = `${now.getDate().toString().padStart(2, '0')}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
        const timeStr = `${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}`;
        const blob = new Blob([JSON.stringify(collectDocument(), null, 2)], {type: 'application/json'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `RoSD_${name}_${dateStr}_${timeStr}.json`; a.click();
        setTimeout(() => URL.revokeObjectURL(url), 0);
    }

    function importJSONFile(event) {
        const input = event.target;
        const file = input.files[0];
        if (!file) return;

        const reader = new FileReader();

        reader.onload = e => {
            input.value = '';
            let result;

            try {
                result = parseDocument(e.target.result);
            } catch (error) {
                console.error('The character file could not be imported.', error);
                alert(`This character file could not be imported, so the current Ranger was kept.\n\n${describeDataError(error)}`);
                return;
            }

            clearAllTemporaryEffects();
            applyDocument(result.document, true, 'Character file imported');

            if (result.warnings.length) {
                alert(`The character file was loaded with notes:\n\n• ${result.warnings.join('\n• ')}`);
            }
        };

        reader.onerror = () => {
            input.value = '';
            console.error('The character file could not be read.', reader.error);
            alert('This character file could not be read, so the current Ranger was kept.');
        };

        reader.readAsText(file);
    }

    function clearSheet() {
        const confirmed = confirm(
            'Obliterate this Ranger from this browser? This removes the current sheet and any recovery copy. ' +
            'Save a Character File first if you may need this data again.'
        );
        if (!confirmed) return;

        clearAllTemporaryEffects();
        const cleared = STORAGE.clearCharacterData();
        if (cleared.ok) {
            location.reload();
        } else {
            console.error('Could not clear application data.', cleared.error);
            alert('The Ranger could not be removed from browser storage. Check this browser’s storage permissions.');
        }
    }
