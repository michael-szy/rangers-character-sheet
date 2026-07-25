(function (global) {
    'use strict';

    function createPersistence(options) {
        const {
            formatVersion,
            maxSlots,
            maxMissionRows,
            maxMissionHistory,
            maxChangeHistory,
            maxChangesPerEntry,
            maxHistoryValueLength,
            defaultHeroicSlots,
            defaultInnateSlots,
            modes,
            objectiveTypes,
            historyCategories,
            fieldIds,
            knownArchetypes,
            newId,
            historyEntryCategory
        } = options;

        const validModes = new Set(modes);
        const validObjectiveTypes = new Set(objectiveTypes);
        const validHistoryCategories = new Set(historyCategories);
        const validFieldIds = new Set(fieldIds);
        const validArchetypes = new Set(knownArchetypes);

        function isPlainObject(value) {
            return typeof value === 'object' && value !== null && !Array.isArray(value);
        }

        function blankSlots(count) {
            return Array.from({ length: count }, () => ({ value: '', used: false }));
        }

        function blankConditions() {
            return { poisoned: false, diseased: false, hungerThirst: 0 };
        }

        function normalizeConditions(rawConditions) {
            if (rawConditions === undefined || rawConditions === null) return blankConditions();
            if (!isPlainObject(rawConditions)) throw new Error('Character conditions are not stored as a record.');

            for (const key of ['poisoned', 'diseased']) {
                if (rawConditions[key] !== undefined && typeof rawConditions[key] !== 'boolean') {
                    throw new Error(`The "${key}" condition must be true or false.`);
                }
            }

            const rawLevel = rawConditions.hungerThirst === undefined ? 0 : rawConditions.hungerThirst;
            const hungerThirst = Number(rawLevel);
            if (!Number.isInteger(hungerThirst) || hungerThirst < 0 || hungerThirst > 99) {
                throw new Error('Hunger and Thirst levels must be a whole number from 0 to 99.');
            }

            return {
                poisoned: rawConditions.poisoned === true,
                diseased: rawConditions.diseased === true,
                hungerThirst
            };
        }

        function createBlankDocument() {
            return {
                formatVersion,
                character: {
                    fields: {},
                    heroicSlots: blankSlots(defaultHeroicSlots),
                    innateSlots: blankSlots(defaultInnateSlots),
                    conditions: blankConditions()
                },
                uiState: { showInnateSection: false, missionSectionExpanded: true, mode: 'edit' },
                activeMission: null,
                missionHistory: [],
                changeHistory: []
            };
        }

        function normalizeFields(rawFields) {
            if (rawFields === undefined || rawFields === null) return {};
            if (!isPlainObject(rawFields)) throw new Error('The character fields are not stored as an object.');

            const fields = {};
            validFieldIds.forEach(id => {
                const value = rawFields[id];
                if (value === undefined || value === null) return;
                if (typeof value === 'string') fields[id] = value;
                else if (typeof value === 'number' || typeof value === 'boolean') fields[id] = String(value);
                else throw new Error(`The value stored for "${id}" is not a text value.`);
            });
            return fields;
        }

        function normalizeSlotEntry(entry, label) {
            if (typeof entry === 'string') return { value: entry, used: false };
            if (!isPlainObject(entry)) throw new Error(`${label} contain an entry that is not a slot.`);

            const value = entry.value === undefined || entry.value === null ? '' : entry.value;
            if (typeof value !== 'string') throw new Error(`${label} contain a slot value that is not text.`);

            return { value, used: entry.used === true };
        }

        function normalizeSlots(rawSlots, defaultCount, label) {
            if (rawSlots === undefined || rawSlots === null) return blankSlots(defaultCount);
            if (!Array.isArray(rawSlots)) throw new Error(`${label} must be stored as a list.`);
            if (rawSlots.length > maxSlots) {
                throw new Error(`${label} exceed the supported maximum of ${maxSlots} slots.`);
            }
            return rawSlots.map(entry => normalizeSlotEntry(entry, label));
        }

        function legacySlotCount(rawCount, defaultCount, label) {
            if (rawCount === undefined || rawCount === null || rawCount === '') return defaultCount;
            const count = Number(rawCount);
            if (!Number.isInteger(count) || count < 0 || count > maxSlots) {
                throw new Error(`The stored ${label} count is outside the supported range.`);
            }
            return count || defaultCount;
        }

        function migrateLegacyDocument(legacy) {
            const readSlots = (prefix, count) => {
                const slots = [];
                for (let i = 1; i <= count; i++) {
                    const value = legacy[prefix + i];
                    slots.push({
                        value: typeof value === 'string' ? value : '',
                        used: legacy[prefix + i + '_used'] === true
                    });
                }
                return slots;
            };

            return {
                formatVersion,
                character: {
                    fields: legacy,
                    heroicSlots: readSlots(
                        'ab',
                        legacySlotCount(legacy.heroicSlotsCount, defaultHeroicSlots, 'heroic slot')
                    ),
                    innateSlots: readSlots(
                        'in',
                        legacySlotCount(legacy.innateSlotsCount, defaultInnateSlots, 'innate slot')
                    ),
                    conditions: blankConditions()
                },
                uiState: { showInnateSection: legacy.showInnateSection === true, missionSectionExpanded: true },
                changeHistory: []
            };
        }

        function normalizeText(value, label) {
            if (value === undefined || value === null) return '';
            if (typeof value === 'string') return value;
            if (typeof value === 'number' || typeof value === 'boolean') return String(value);
            throw new Error(`${label} is not a text value.`);
        }

        function normalizeNullableText(value, label) {
            if (value === undefined || value === null || value === '') return null;
            if (typeof value === 'string') return value;
            throw new Error(`${label} is not a text value.`);
        }

        function normalizeNumber(value, label) {
            if (value === undefined || value === null || value === '') return 0;
            const number = Number(value);
            if (!Number.isFinite(number)) throw new Error(`${label} is not a number.`);
            return number;
        }

        function normalizeCount(value, label) {
            const number = Math.trunc(normalizeNumber(value, label));
            if (number < 0 || number > 9999) throw new Error(`${label} is outside the supported range.`);
            return number;
        }

        function normalizeRows(raw, label, mapper) {
            if (raw === undefined || raw === null) return [];
            if (!Array.isArray(raw)) throw new Error(`${label} must be stored as a list.`);
            if (raw.length > maxMissionRows) {
                throw new Error(`${label} hold more than ${maxMissionRows} entries.`);
            }
            return raw.map((entry, index) => {
                if (!isPlainObject(entry)) throw new Error(`${label} contain an entry that is not a record.`);
                return mapper(entry, index);
            });
        }

        function normalizeMission(raw, label) {
            if (!isPlainObject(raw)) throw new Error(`${label} is not a record.`);

            return {
                id: typeof raw.id === 'string' && raw.id ? raw.id : newId(),
                title: normalizeText(raw.title, `${label} title`),
                date: normalizeText(raw.date, `${label} date`),
                scenario: normalizeText(raw.scenario, `${label} scenario`),
                notes: normalizeText(raw.notes, `${label} notes`),
                status: raw.status === 'complete' ? 'complete' : 'active',
                appliedXp: normalizeNumber(raw.appliedXp, `${label} applied XP`),
                kills: normalizeRows(raw.kills, `${label} kills`, entry => ({
                    id: typeof entry.id === 'string' && entry.id ? entry.id : newId(),
                    enemyId: normalizeNullableText(entry.enemyId, 'A kill enemy id'),
                    catalogVersion: normalizeNullableText(entry.catalogVersion, 'A kill catalog version'),
                    name: normalizeText(entry.name, 'A kill name'),
                    count: normalizeCount(entry.count, 'A kill count'),
                    value: normalizeNumber(entry.value, 'A kill value')
                })),
                objectives: normalizeRows(raw.objectives, `${label} objectives`, entry => ({
                    id: typeof entry.id === 'string' && entry.id ? entry.id : newId(),
                    title: normalizeText(entry.title, 'An objective title'),
                    type: validObjectiveTypes.has(entry.type) ? entry.type : 'custom',
                    completed: entry.completed === true,
                    value: normalizeNumber(entry.value, 'An objective value')
                })),
                adjustments: normalizeRows(raw.adjustments, `${label} adjustments`, entry => ({
                    id: typeof entry.id === 'string' && entry.id ? entry.id : newId(),
                    label: normalizeText(entry.label, 'An adjustment reason'),
                    value: normalizeNumber(entry.value, 'An adjustment value')
                }))
            };
        }

        function normalizeMissionHistory(raw) {
            if (raw === undefined || raw === null) return [];
            if (!Array.isArray(raw)) throw new Error('The mission history must be stored as a list.');
            if (raw.length > maxMissionHistory) {
                throw new Error(`The mission history holds more than ${maxMissionHistory} missions.`);
            }
            return raw.map((entry, index) => {
                const mission = normalizeMission(entry, `Mission ${index + 1}`);
                mission.status = 'complete';
                return mission;
            });
        }

        function normalizeHistoryString(value, label, maxLength, allowEmpty = false) {
            if (typeof value !== 'string') throw new Error(`${label} is not text.`);
            if (!allowEmpty && !value) throw new Error(`${label} is empty.`);
            if (value.length > maxLength) throw new Error(`${label} is too long.`);
            return value;
        }

        function normalizeChangeHistory(raw) {
            if (raw === undefined || raw === null) return [];
            if (!Array.isArray(raw)) throw new Error('The change history must be stored as a list.');
            if (raw.length > maxChangeHistory) {
                throw new Error(`The change history holds more than ${maxChangeHistory} entries.`);
            }

            const ids = new Set();
            return raw.map((entry, entryIndex) => {
                if (!isPlainObject(entry)) {
                    throw new Error(`Change history entry ${entryIndex + 1} is not a record.`);
                }

                const id = normalizeHistoryString(entry.id, `Change history entry ${entryIndex + 1} id`, 100);
                if (ids.has(id)) throw new Error(`The change history contains duplicate id "${id}".`);
                ids.add(id);

                const timestamp = normalizeHistoryString(
                    entry.timestamp,
                    `Change history entry ${entryIndex + 1} timestamp`,
                    40
                );
                if (!Number.isFinite(new Date(timestamp).getTime())) {
                    throw new Error(`Change history entry ${entryIndex + 1} has an invalid timestamp.`);
                }
                if (!validHistoryCategories.has(entry.category)) {
                    throw new Error(`Change history entry ${entryIndex + 1} has an invalid category.`);
                }
                const summary = normalizeHistoryString(
                    entry.summary,
                    `Change history entry ${entryIndex + 1} summary`,
                    240
                );
                if (!Array.isArray(entry.changes)) {
                    throw new Error(`Change history entry ${entryIndex + 1} changes must be a list.`);
                }
                if (entry.changes.length > maxChangesPerEntry) {
                    throw new Error(`Change history entry ${entryIndex + 1} has too many changes.`);
                }

                const changes = entry.changes.map((change, changeIndex) => {
                    if (!isPlainObject(change)) {
                        throw new Error(
                            `Change ${changeIndex + 1} in history entry ${entryIndex + 1} is not a record.`
                        );
                    }
                    if (!validHistoryCategories.has(change.category) || change.category === 'mixed') {
                        throw new Error(
                            `Change ${changeIndex + 1} in history entry ${entryIndex + 1} has an invalid category.`
                        );
                    }
                    return {
                        category: change.category,
                        path: normalizeHistoryString(change.path, 'A change history path', 240),
                        label: normalizeHistoryString(change.label, 'A change history label', 240),
                        before: normalizeHistoryString(
                            change.before,
                            'A previous change history value',
                            maxHistoryValueLength,
                            true
                        ),
                        after: normalizeHistoryString(
                            change.after,
                            'A new change history value',
                            maxHistoryValueLength,
                            true
                        )
                    };
                });

                if (entry.category !== 'system' && !changes.length) {
                    throw new Error(`Change history entry ${entryIndex + 1} has no changes.`);
                }
                const expectedCategory = changes.length ? historyEntryCategory(changes) : 'system';
                if (entry.category !== expectedCategory) {
                    throw new Error(`Change history entry ${entryIndex + 1} category does not match its changes.`);
                }

                return { id, timestamp, category: entry.category, summary, changes };
            });
        }

        function normalizeDocument(parsed) {
            if (!isPlainObject(parsed)) throw new Error('The character data is not a JSON object.');

            let version;
            if (parsed.formatVersion === undefined) version = 0;
            else if (Number.isInteger(parsed.formatVersion) && parsed.formatVersion >= 0) {
                version = parsed.formatVersion;
            } else {
                throw new Error('The format version is not a whole number.');
            }

            if (version > formatVersion) {
                throw new Error(
                    `This character uses format version ${version}, which is newer than this sheet (${formatVersion}).`
                );
            }

            const upgraded = version === 0 ? migrateLegacyDocument(parsed) : parsed;

            if (!isPlainObject(upgraded.character)) {
                throw new Error('The character section is missing or invalid.');
            }
            if (upgraded.uiState !== undefined && upgraded.uiState !== null && !isPlainObject(upgraded.uiState)) {
                throw new Error('The interface state is invalid.');
            }

            const warnings = [];
            const fields = normalizeFields(upgraded.character.fields);

            if (fields.char_arch && !validArchetypes.has(fields.char_arch)) {
                warnings.push(`The archetype "${fields.char_arch}" is unknown and was left empty.`);
                fields.char_arch = '';
            }

            return {
                document: {
                    formatVersion,
                    character: {
                        fields,
                        heroicSlots: normalizeSlots(
                            upgraded.character.heroicSlots,
                            defaultHeroicSlots,
                            'Heroic ability slots'
                        ),
                        innateSlots: normalizeSlots(
                            upgraded.character.innateSlots,
                            defaultInnateSlots,
                            'Innate ability slots'
                        ),
                        conditions: normalizeConditions(upgraded.character.conditions)
                    },
                    uiState: {
                        showInnateSection: !!(upgraded.uiState && upgraded.uiState.showInnateSection === true),
                        missionSectionExpanded: !(
                            upgraded.uiState && upgraded.uiState.missionSectionExpanded === false
                        ),
                        mode: validModes.has(upgraded.uiState && upgraded.uiState.mode)
                            ? upgraded.uiState.mode
                            : 'edit'
                    },
                    activeMission: upgraded.activeMission === undefined || upgraded.activeMission === null
                        ? null
                        : Object.assign(
                            normalizeMission(upgraded.activeMission, 'The active mission'),
                            { status: 'active' }
                        ),
                    missionHistory: normalizeMissionHistory(upgraded.missionHistory),
                    changeHistory: normalizeChangeHistory(upgraded.changeHistory)
                },
                warnings,
                migratedFrom: version === formatVersion ? null : version
            };
        }

        function parseDocument(raw) {
            return normalizeDocument(JSON.parse(raw));
        }

        return Object.freeze({
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
        });
    }

    global.RangersPersistence = Object.freeze({ create: createPersistence });
})(globalThis);
