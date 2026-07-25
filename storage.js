(function (global) {
    'use strict';

    function createStorage(options) {
        const {
            getStorage,
            characterKey,
            recoveryKey,
            formatVersion,
            now = () => new Date()
        } = options;

        function readRaw() {
            try {
                return { ok: true, raw: getStorage().getItem(characterKey) };
            } catch (error) {
                return { ok: false, error };
            }
        }

        function writeDocument(document) {
            try {
                const raw = JSON.stringify(document);
                getStorage().setItem(characterKey, raw);
                return { ok: true, raw };
            } catch (error) {
                return { ok: false, error };
            }
        }

        function preserveRecoveryCopy(raw, reason) {
            try {
                getStorage().setItem(recoveryKey, JSON.stringify({
                    capturedAt: now().toISOString(),
                    reason: reason instanceof Error ? reason.message : String(reason),
                    raw
                }));
                return { ok: true };
            } catch (error) {
                return { ok: false, error };
            }
        }

        function clearCharacterData() {
            try {
                const storage = getStorage();
                storage.removeItem(characterKey);
                storage.removeItem(recoveryKey);
                return { ok: true };
            } catch (error) {
                return { ok: false, error };
            }
        }

        function loadCharacter(parseDocument) {
            const stored = readRaw();
            if (!stored.ok) return { status: 'unavailable', error: stored.error };
            if (!stored.raw) return { status: 'empty' };

            let result;
            try {
                result = parseDocument(stored.raw);
            } catch (error) {
                return {
                    status: 'invalid',
                    raw: stored.raw,
                    error,
                    recovery: preserveRecoveryCopy(stored.raw, error)
                };
            }

            const recovery = result.migratedFrom === null
                ? null
                : preserveRecoveryCopy(
                    stored.raw,
                    `Backup taken before migrating format ${result.migratedFrom} to ${formatVersion}.`
                );

            return { status: 'loaded', raw: stored.raw, result, recovery };
        }

        return Object.freeze({
            readRaw,
            writeDocument,
            preserveRecoveryCopy,
            clearCharacterData,
            loadCharacter
        });
    }

    global.RangersStorage = Object.freeze({ create: createStorage });
})(globalThis);
