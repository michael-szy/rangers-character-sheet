import { spawn, spawnSync } from 'node:child_process';
import { createServer } from 'node:http';
import { createServer as createNetServer } from 'node:net';
import { access, mkdtemp, readFile, rm } from 'node:fs/promises';
import { constants as fsConstants } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptFile = fileURLToPath(import.meta.url);
const testsDir = dirname(scriptFile);
const projectRoot = resolve(testsDir, '..');
const fixtureDir = join(testsDir, 'fixtures');
const isWindowsReexec = process.argv.includes('--windows-reexec');

if (Number(process.versions.node.split('.')[0]) < 22) {
    throw new Error('The browser tests require Node.js 22 or newer.');
}

async function exists(file) {
    try {
        await access(file, fsConstants.X_OK);
        return true;
    } catch {
        return false;
    }
}

async function findBrowser() {
    if (process.env.CHROME_PATH) {
        if (await exists(process.env.CHROME_PATH)) return process.env.CHROME_PATH;
        throw new Error(`CHROME_PATH does not exist or is not executable: ${process.env.CHROME_PATH}`);
    }

    const candidates = process.platform === 'win32'
        ? [
            'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
            'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
            'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
        ]
        : process.platform === 'darwin'
            ? [
                '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
                '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge'
            ]
            : [
                '/usr/bin/google-chrome',
                '/usr/bin/google-chrome-stable',
                '/usr/bin/chromium',
                '/usr/bin/chromium-browser'
            ];

    for (const candidate of candidates) {
        if (await exists(candidate)) return candidate;
    }
    return null;
}

async function reexecForWindowsChrome() {
    if (process.platform !== 'linux' || isWindowsReexec) return false;

    const windowsNode = '/mnt/c/Program Files/nodejs/node.exe';
    const windowsChrome = '/mnt/c/Program Files/Google/Chrome/Application/chrome.exe';
    const windowsEdge = '/mnt/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';

    if (!(await exists(windowsNode)) || (!(await exists(windowsChrome)) && !(await exists(windowsEdge)))) {
        return false;
    }

    const converted = spawnSync('wslpath', ['-w', scriptFile], { encoding: 'utf8' });
    if (converted.status !== 0 || !converted.stdout.trim()) {
        throw new Error('Could not convert the test runner path for Windows Node.');
    }

    const result = spawnSync(windowsNode, [converted.stdout.trim(), '--windows-reexec'], {
        cwd: '/mnt/c',
        env: process.env,
        stdio: 'inherit'
    });
    process.exit(result.status ?? 1);
}

const nativeBrowser = await findBrowser();
if (!nativeBrowser && await reexecForWindowsChrome()) process.exit(0);
const browserPath = nativeBrowser || await findBrowser();
if (!browserPath) {
    throw new Error('No Chromium-family browser found. Set CHROME_PATH and try again.');
}

function contentType(file) {
    if (extname(file) === '.html') return 'text/html; charset=utf-8';
    if (extname(file) === '.json') return 'application/json; charset=utf-8';
    return 'text/plain; charset=utf-8';
}

async function startStaticServer() {
    const server = createServer(async (request, response) => {
        const pathname = new URL(request.url, 'http://127.0.0.1').pathname;
        const file = pathname === '/' || pathname === '/index.html'
            ? join(projectRoot, 'index.html')
            : pathname.startsWith('/tests/fixtures/')
                ? join(projectRoot, pathname.slice(1))
                : null;

        if (!file) {
            response.writeHead(404);
            response.end('Not found');
            return;
        }

        try {
            const body = await readFile(file);
            response.writeHead(200, {
                'Content-Type': contentType(file),
                'Cache-Control': 'no-store'
            });
            response.end(body);
        } catch {
            response.writeHead(404);
            response.end('Not found');
        }
    });

    await new Promise((resolveListen, reject) => {
        server.once('error', reject);
        server.listen(0, '127.0.0.1', resolveListen);
    });

    return {
        server,
        url: `http://127.0.0.1:${server.address().port}/`
    };
}

async function availablePort() {
    const server = createNetServer();
    await new Promise((resolveListen, reject) => {
        server.once('error', reject);
        server.listen(0, '127.0.0.1', resolveListen);
    });
    const port = server.address().port;
    await new Promise(resolveClose => server.close(resolveClose));
    return port;
}

async function waitForEndpoint(url, timeoutMs = 12000) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        try {
            const response = await fetch(url);
            if (response.ok) return response;
        } catch {
            // Browser startup is expected to refuse connections briefly.
        }
        await new Promise(resolveWait => setTimeout(resolveWait, 100));
    }
    throw new Error(`Timed out waiting for ${url}`);
}

class CdpClient {
    constructor(socket) {
        this.socket = socket;
        this.sequence = 0;
        this.pending = new Map();
        this.events = [];

        socket.addEventListener('message', event => {
            const message = JSON.parse(event.data);
            if (message.id) {
                const pending = this.pending.get(message.id);
                if (!pending) return;
                this.pending.delete(message.id);
                if (message.error) pending.reject(new Error(message.error.message));
                else pending.resolve(message.result);
                return;
            }

            this.events.push(message);
            if (message.method === 'Page.javascriptDialogOpening') {
                this.send('Page.handleJavaScriptDialog', { accept: true }).catch(() => {});
            }
        });
    }

    send(method, params = {}) {
        return new Promise((resolveSend, reject) => {
            const id = ++this.sequence;
            this.pending.set(id, { resolve: resolveSend, reject });
            this.socket.send(JSON.stringify({ id, method, params }));
        });
    }

    async evaluate(expression) {
        const result = await this.send('Runtime.evaluate', {
            expression,
            awaitPromise: true,
            returnByValue: true
        });
        if (result.exceptionDetails) {
            throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
        }
        return result.result.value;
    }

    close() {
        this.socket.close();
    }
}

async function openCdp(endpoint, appUrl) {
    const target = await fetch(`${endpoint}/json/new?${encodeURIComponent(appUrl)}`, {
        method: 'PUT'
    }).then(response => response.json());
    const socket = new WebSocket(target.webSocketDebuggerUrl);

    await new Promise((resolveOpen, reject) => {
        socket.addEventListener('open', resolveOpen, { once: true });
        socket.addEventListener('error', reject, { once: true });
    });

    const client = new CdpClient(socket);
    await client.send('Page.enable');
    await client.send('Runtime.enable');
    await client.send('Network.enable');
    await client.send('Network.setCacheDisabled', { cacheDisabled: true });
    return client;
}

async function waitFor(client, expression, timeoutMs = 5000) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        try {
            if (await client.evaluate(expression)) return;
        } catch {
            // Navigation can briefly invalidate the execution context.
        }
        await new Promise(resolveWait => setTimeout(resolveWait, 50));
    }
    throw new Error(`Timed out waiting for: ${expression}`);
}

async function freshBrowserState(client) {
    await client.evaluate('localStorage.clear(); sessionStorage.clear(); location.reload();');
    await waitFor(client, `document.readyState === 'complete' && typeof FORMAT_VERSION !== 'undefined'`);
}

const fixtures = {};
for (const name of [
    'format-0-legacy',
    'format-1-character',
    'format-2-mission',
    'format-3-catalog-snapshot',
    'format-4-conditions',
    'enemy-catalog'
]) {
    fixtures[name] = JSON.parse(await readFile(join(fixtureDir, `${name}.json`), 'utf8'));
}

let checks = 0;
let failed = false;

function check(condition, message) {
    checks++;
    if (!condition) throw new Error(`Check ${checks} failed: ${message}`);
}

function equal(actual, expected, message) {
    check(Object.is(actual, expected), `${message} (expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)})`);
}

async function suite(name, callback) {
    const before = checks;
    process.stdout.write(`• ${name} ... `);
    try {
        await callback();
        console.log(`${checks - before} checks`);
    } catch (error) {
        failed = true;
        console.log('FAILED');
        throw error;
    }
}

const { server, url: appUrl } = await startStaticServer();
const debugPort = await availablePort();
const profileDir = await mkdtemp(join(tmpdir(), 'rosd-browser-tests-'));
const browser = spawn(browserPath, [
    '--headless=new',
    '--disable-background-networking',
    '--disable-component-update',
    '--disable-default-apps',
    '--disable-extensions',
    '--disable-gpu',
    '--no-default-browser-check',
    '--no-first-run',
    `--remote-debugging-port=${debugPort}`,
    `--user-data-dir=${profileDir}`,
    'about:blank'
], {
    stdio: 'ignore',
    windowsHide: true
});

const endpoint = `http://127.0.0.1:${debugPort}`;
let client;

try {
    await waitForEndpoint(`${endpoint}/json/version`);
    client = await openCdp(endpoint, appUrl);
    await waitFor(client, `document.readyState === 'complete' && typeof FORMAT_VERSION !== 'undefined'`);

    await suite('blank sheet and schema migrations', async () => {
        await freshBrowserState(client);

        equal(await client.evaluate('FORMAT_VERSION'), 4, 'current document format');
        equal(await client.evaluate(`document.querySelectorAll('#abilities-list .ability-group').length`), 5, 'default heroic slots');
        equal(await client.evaluate(`document.querySelectorAll('#innate-list .ability-group').length`), 4, 'default innate slots');
        equal(await client.evaluate('currentMode()'), 'edit', 'blank sheet mode');
        equal(await client.evaluate('MISSION.active'), null, 'blank active mission');
        equal(await client.evaluate('MISSION.history.length'), 0, 'blank mission history');
        equal(await client.evaluate('ENEMY_CATALOG'), null, 'catalog is optional');
        equal(await client.evaluate('JSON.stringify(CONDITIONS)'), '{"poisoned":false,"diseased":false,"hungerThirst":0}', 'blank conditions');
        equal(await client.evaluate(`document.getElementById('mission_section_content').hidden`), false, 'blank Mission section is expanded');

        const legacy = await client.evaluate(`(() => {
            const result = normalizeDocument(${JSON.stringify(fixtures['format-0-legacy'])});
            return {
                migratedFrom: result.migratedFrom,
                version: result.document.formatVersion,
                name: result.document.character.fields.char_name,
                heroicCount: result.document.character.heroicSlots.length,
                innateCount: result.document.character.innateSlots.length,
                firstUsed: result.document.character.heroicSlots[0].used,
                lastValue: result.document.character.heroicSlots[5].value,
                innateUsed: result.document.character.innateSlots[0].used,
                shown: result.document.uiState.showInnateSection,
                missionExpanded: result.document.uiState.missionSectionExpanded,
                mode: result.document.uiState.mode,
                active: result.document.activeMission,
                history: result.document.missionHistory.length,
                conditions: result.document.character.conditions
            };
        })()`);
        equal(legacy.migratedFrom, 0, 'legacy migration source');
        equal(legacy.version, 4, 'legacy migration target');
        equal(legacy.name, 'Legacy Ranger', 'legacy character field');
        equal(legacy.heroicCount, 6, 'legacy heroic count');
        equal(legacy.innateCount, 5, 'legacy innate count');
        equal(legacy.firstUsed, true, 'legacy used marker');
        equal(legacy.lastValue, 'Focus', 'legacy final slot value');
        equal(legacy.innateUsed, true, 'legacy innate used marker');
        equal(legacy.shown, true, 'legacy innate visibility');
        equal(legacy.missionExpanded, true, 'legacy Mission section defaults expanded');
        equal(legacy.mode, 'edit', 'legacy safe mode default');
        equal(legacy.active, null, 'legacy active mission default');
        equal(legacy.history, 0, 'legacy history default');
        equal(JSON.stringify(legacy.conditions), '{"poisoned":false,"diseased":false,"hungerThirst":0}', 'legacy conditions default');

        const format1 = await client.evaluate(`(() => {
            const result = normalizeDocument(${JSON.stringify(fixtures['format-1-character'])});
            return {
                migratedFrom: result.migratedFrom,
                version: result.document.formatVersion,
                name: result.document.character.fields.char_name,
                missionExpanded: result.document.uiState.missionSectionExpanded,
                mode: result.document.uiState.mode,
                active: result.document.activeMission,
                history: result.document.missionHistory.length
            };
        })()`);
        equal(format1.migratedFrom, 1, 'format 1 migration source');
        equal(format1.version, 4, 'format 1 migration target');
        equal(format1.name, 'Format One', 'format 1 character');
        equal(format1.missionExpanded, true, 'older version Mission section defaults expanded');
        equal(format1.mode, 'play', 'format 1 mode preserved');
        equal(format1.active, null, 'format 1 active mission default');
        equal(format1.history, 0, 'format 1 history default');

        const format2 = await client.evaluate(`(() => {
            const result = normalizeDocument(${JSON.stringify(fixtures['format-2-mission'])});
            const kill = result.document.activeMission.kills[0];
            return {
                migratedFrom: result.migratedFrom,
                version: result.document.formatVersion,
                enemyId: kill.enemyId,
                catalogVersion: kill.catalogVersion,
                name: kill.name,
                count: kill.count,
                value: kill.value
            };
        })()`);
        equal(format2.migratedFrom, 2, 'format 2 migration source');
        equal(format2.version, 4, 'format 2 migration target');
        equal(format2.enemyId, null, 'format 2 enemy id default');
        equal(format2.catalogVersion, null, 'format 2 catalog version default');
        equal(format2.name, 'Old Beast', 'format 2 name snapshot');
        equal(format2.count, 2, 'format 2 count snapshot');
        equal(format2.value, 3, 'format 2 XP snapshot');

        const format3 = await client.evaluate(`(() => {
            const result = normalizeDocument(${JSON.stringify(fixtures['format-3-catalog-snapshot'])});
            const kill = result.document.missionHistory[0].kills[0];
            return {
                migratedFrom: result.migratedFrom,
                enemyId: kill.enemyId,
                catalogVersion: kill.catalogVersion,
                value: kill.value,
                status: result.document.missionHistory[0].status,
                conditions: result.document.character.conditions
            };
        })()`);
        equal(format3.migratedFrom, 3, 'format 3 migration source');
        equal(format3.enemyId, 'fixture-ogre', 'format 3 enemy id');
        equal(format3.catalogVersion, 'fixture@1', 'format 3 catalog version');
        equal(format3.value, 5, 'format 3 XP snapshot');
        equal(format3.status, 'complete', 'history status normalized');
        equal(JSON.stringify(format3.conditions), '{"poisoned":false,"diseased":false,"hungerThirst":0}', 'format 3 conditions default');

        const format4 = await client.evaluate(`(() => {
            const result = normalizeDocument(${JSON.stringify(fixtures['format-4-conditions'])});
            return {
                migratedFrom: result.migratedFrom,
                version: result.document.formatVersion,
                mode: result.document.uiState.mode,
                conditions: result.document.character.conditions
            };
        })()`);
        equal(format4.migratedFrom, null, 'format 4 needs no migration');
        equal(format4.version, 4, 'format 4 remains current');
        equal(format4.mode, 'play', 'format 4 mode preserved');
        equal(JSON.stringify(format4.conditions), '{"poisoned":true,"diseased":false,"hungerThirst":2}', 'format 4 conditions preserved');

        equal(await client.evaluate(`(() => {
            try { normalizeDocument({ ...createBlankDocument(), formatVersion: 5 }); return false; }
            catch { return true; }
        })()`), true, 'newer character format refused');
        equal(await client.evaluate(`(() => {
            try { normalizeDocument({ formatVersion: 4, character: null }); return false; }
            catch { return true; }
        })()`), true, 'missing character section refused');
        equal(await client.evaluate(`(() => {
            const doc = createBlankDocument();
            doc.character.heroicSlots = Array.from({ length: 51 }, () => ({ value: '', used: false }));
            try { normalizeDocument(doc); return false; }
            catch { return true; }
        })()`), true, 'excessive slots refused');
        equal(await client.evaluate(`(() => {
            const doc = ${JSON.stringify(fixtures['format-3-catalog-snapshot'])};
            doc.missionHistory[0].kills[0].enemyId = 7;
            try { normalizeDocument(doc); return false; }
            catch { return true; }
        })()`), true, 'non-text catalog linkage refused');
        equal(await client.evaluate(`(() => {
            const doc = ${JSON.stringify(fixtures['format-4-conditions'])};
            doc.character.conditions.hungerThirst = 100;
            try { normalizeDocument(doc); return false; }
            catch { return true; }
        })()`), true, 'excessive condition level refused');
        equal(await client.evaluate(`(() => {
            const doc = ${JSON.stringify(fixtures['format-4-conditions'])};
            doc.character.conditions.poisoned = 'yes';
            try { normalizeDocument(doc); return false; }
            catch { return true; }
        })()`), true, 'invalid condition flag refused');
    });

    await suite('storage recovery and file import', async () => {
        await freshBrowserState(client);

        await client.evaluate(`localStorage.setItem(STORAGE_KEY, ${JSON.stringify(JSON.stringify(fixtures['format-0-legacy']))}); location.reload();`);
        await waitFor(client, `document.readyState === 'complete' && document.getElementById('char_name').value === 'Legacy Ranger'`);
        equal(await client.evaluate(`JSON.parse(localStorage.getItem(STORAGE_KEY)).formatVersion`), 4, 'stored legacy data upgraded');
        equal(await client.evaluate(`JSON.parse(localStorage.getItem(STORAGE_RECOVERY_KEY)).raw.length > 0`), true, 'pre-migration recovery stored');
        equal(await client.evaluate(`document.querySelectorAll('#abilities-list .ability-group').length`), 6, 'migrated slot count applied');
        equal(await client.evaluate(`document.querySelector('#abilities-list .numbered-row').classList.contains('used')`), true, 'migrated used state applied');

        await client.evaluate(`localStorage.setItem(STORAGE_KEY, '{broken'); location.reload();`);
        await waitFor(client, `document.readyState === 'complete' && document.getElementById('char_name').value === ''`);
        equal(await client.evaluate(`document.getElementById('save_status').textContent`), 'Recovery needed', 'corrupt storage status');
        equal(await client.evaluate(`JSON.parse(localStorage.getItem(STORAGE_RECOVERY_KEY)).raw`), '{broken', 'corrupt raw data preserved');
        equal(await client.evaluate(`localStorage.getItem(STORAGE_KEY)`), '{broken', 'corrupt primary data not silently removed');

        await freshBrowserState(client);
        await client.evaluate(`setTemporaryEffects('s_arm', 2, 1)`);
        await client.evaluate(`(() => {
            const file = new File([${JSON.stringify(JSON.stringify(fixtures['format-1-character']))}], 'format-1.json', { type: 'application/json' });
            importJSONFile({ target: { files: [file], value: 'selected' } });
        })()`);
        await waitFor(client, `document.getElementById('char_name').value === 'Format One'`);
        equal(await client.evaluate('currentMode()'), 'play', 'file import applies UI mode');
        equal(await client.evaluate(`JSON.parse(localStorage.getItem(STORAGE_KEY)).formatVersion`), 4, 'file import persists current format');
        equal(await client.evaluate(`sessionStorage.getItem(TEMP_EFFECT_STORAGE_KEY)`), null, 'file import clears temporary stat effects');

        const beforeInvalid = await client.evaluate(`localStorage.getItem(STORAGE_KEY)`);
        await client.evaluate(`(() => {
            const file = new File(['{"formatVersion":99}'], 'bad.json', { type: 'application/json' });
            importJSONFile({ target: { files: [file], value: 'selected' } });
        })()`);
        await new Promise(resolveWait => setTimeout(resolveWait, 150));
        equal(await client.evaluate(`localStorage.getItem(STORAGE_KEY)`), beforeInvalid, 'invalid file leaves storage unchanged');
        equal(await client.evaluate(`document.getElementById('char_name').value`), 'Format One', 'invalid file leaves sheet unchanged');

        await client.evaluate(`localStorage.setItem('unrelated_test_key', 'keep'); localStorage.setItem(ENEMY_CATALOG_STORAGE_KEY, ${JSON.stringify(JSON.stringify(fixtures['enemy-catalog']))}); setTemporaryEffects('s_fig', 3, 2); window.confirm = () => true; clearSheet();`);
        await waitFor(client, `document.readyState === 'complete' && document.getElementById('char_name').value === ''`);
        equal(await client.evaluate(`localStorage.getItem('unrelated_test_key')`), 'keep', 'obliterate keeps unrelated storage');
        equal(await client.evaluate(`localStorage.getItem(ENEMY_CATALOG_STORAGE_KEY) !== null`), true, 'obliterate keeps catalog');
        equal(await client.evaluate(`localStorage.getItem(STORAGE_KEY)`), null, 'obliterate removes character');
        equal(await client.evaluate(`localStorage.getItem(STORAGE_RECOVERY_KEY)`), null, 'obliterate removes recovery');
        equal(await client.evaluate(`sessionStorage.getItem(TEMP_EFFECT_STORAGE_KEY)`), null, 'obliterate clears temporary stat effects');
    });

    await suite('dynamic slots and searchable controls', async () => {
        await freshBrowserState(client);

        const slotResult = await client.evaluate(`(() => {
            addHeroicSlot();
            const first = slotGroups('heroic').at(-1).dataset.slotId;
            addHeroicSlot();
            const second = slotGroups('heroic').at(-1).dataset.slotId;
            addHeroicSlot();
            const third = slotGroups('heroic').at(-1).dataset.slotId;
            applySearchableValue(first, 'Dash', true);
            applySearchableValue(second, 'Focus', true);
            const before = slotGroups('heroic').map(group => group.dataset.slotId);
            removeSlot(second, 'heroic');
            addHeroicSlot();
            const replacement = slotGroups('heroic').at(-1).dataset.slotId;
            const after = slotGroups('heroic').map(group => group.dataset.slotId);
            return {
                first, second, third, replacement, before, after,
                values: collectSlots('heroic').map(slot => slot.value),
                numerals: slotGroups('heroic').map(group => group.querySelector('.row-number').textContent),
                ids: Array.from(document.querySelectorAll('[id]')).map(node => node.id)
            };
        })()`);
        check(slotResult.replacement !== slotResult.second, 'removed slot id is not reused');
        check(!slotResult.after.includes(slotResult.second), 'removed slot id is absent');
        check(slotResult.after.includes(slotResult.replacement), 'replacement slot id is present');
        equal(slotResult.values.includes('Dash'), true, 'remaining slot value kept');
        equal(slotResult.values.includes('Focus'), false, 'removed slot value gone');
        equal(slotResult.numerals.at(-1), 'VIII', 'slot presentation renumbered');
        equal(new Set(slotResult.ids).size, slotResult.ids.length, 'DOM ids remain unique');

        const archetypeAbilities = await client.evaluate(`(() => {
            const expected = [
                'Flashing Blade',
                'Quick Strike',
                'Tumble',
                'Double Shot',
                'Fire Shot',
                'Smoke Shot',
                'Whirling Death',
                'Sneak Attack'
            ];
            const options = buildAbilityOptions();
            const rare = options.filter(option => option.badges.includes('Archetype'));
            return {
                keys: Object.keys(ABILITY_LIBRARY.archetypeHeroic).join('|'),
                expected: expected.join('|'),
                rareValues: rare.map(option => option.value).join('|'),
                flashing: rare.find(option => option.value === 'Flashing Blade'),
                redHawk: options
                    .filter(option => [option.label, option.group, ...option.badges].join(' ').toLowerCase().includes('red hawk knight'))
                    .map(option => option.value).join('|'),
                varakian: options
                    .filter(option => [option.label, option.group, ...option.badges].join(' ').toLowerCase().includes('varakian archer'))
                    .map(option => option.value).join('|')
            };
        })()`);
        equal(archetypeAbilities.keys, archetypeAbilities.expected, 'all archetype Heroic Abilities are catalogued');
        equal(archetypeAbilities.rareValues, archetypeAbilities.expected, 'archetype abilities become searchable options');
        equal(archetypeAbilities.flashing.badges.join('|'), 'Heroic Ability|Archetype', 'archetype ability has clear badges');
        check(archetypeAbilities.flashing.group.includes('Red Hawk Knight'), 'Flashing Blade names Red Hawk Knight');
        check(archetypeAbilities.flashing.group.includes('River Shark'), 'Flashing Blade names River Shark');
        check(archetypeAbilities.flashing.group.includes('Wasteland Firesword'), 'Flashing Blade names Wasteland Firesword');
        equal(archetypeAbilities.redHawk, 'Flashing Blade|Quick Strike', 'Red Hawk Knight search finds its unique abilities');
        equal(archetypeAbilities.varakian, 'Double Shot|Fire Shot|Smoke Shot', 'Varakian Archer search finds its unique abilities');

        const selectedArchetypeAbility = await client.evaluate(`(() => {
            const slotId = slotGroups('heroic')[0].dataset.slotId;
            const input = document.getElementById(slotId + '_search');
            input.focus();
            input.value = 'Red Hawk Knight';
            input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: 'Red Hawk Knight' }));
            const redHawkRendered = SEARCHABLE_STATE[slotId].renderedOptions.map(option => option.value).join('|');
            input.value = 'Flashing Blade';
            input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: 'Flashing Blade' }));
            input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true }));
            return {
                redHawkRendered,
                value: document.getElementById(slotId).value,
                desc: document.getElementById('desc_' + slotId).textContent
            };
        })()`);
        equal(selectedArchetypeAbility.redHawkRendered, 'Flashing Blade|Quick Strike', 'combobox filters by archetype name');
        equal(selectedArchetypeAbility.value, 'Flashing Blade', 'keyboard selects archetype ability');
        check(selectedArchetypeAbility.desc.includes('free attack'), 'archetype ability description is shown');

        equal(await client.evaluate(`(() => {
            while (slotGroups('innate').length > SLOT_TYPES.innate.minSlots) removeSlot(slotGroups('innate').at(-1).dataset.slotId, 'innate');
            const before = slotGroups('innate').length;
            removeSlot(slotGroups('innate')[0].dataset.slotId, 'innate');
            return before === slotGroups('innate').length;
        })()`), true, 'minimum innate slots enforced');

        await client.evaluate(`(() => {
            const input = document.getElementById('it1_search');
            input.focus();
            input.value = 'Bow';
            input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: 'Bow' }));
            input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
        })()`);
        equal(await client.evaluate(`document.getElementById('it1').value`), 'Bow', 'keyboard selects equipment');
        equal(await client.evaluate(`document.getElementById('it1_search').getAttribute('aria-expanded')`), 'false', 'selection closes combobox');
        equal(await client.evaluate(`document.getElementById('it1_search').hasAttribute('aria-activedescendant')`), false, 'selection clears active descendant');

        await client.evaluate(`(() => {
            const input = document.getElementById('it1_search');
            input.focus();
            input.value = 'Changed but not committed';
            input.dispatchEvent(new InputEvent('input', { bubbles: true }));
            input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        })()`);
        equal(await client.evaluate(`document.getElementById('it1_search').value`), 'Bow', 'Escape restores selection');
        equal(await client.evaluate(`document.getElementById('it1').value`), 'Bow', 'Escape keeps hidden value');

        await client.evaluate(`saveNow(); location.reload();`);
        await waitFor(client, `document.readyState === 'complete' && document.getElementById('it1').value === 'Bow'`);
        equal(await client.evaluate(`document.querySelectorAll('#abilities-list .ability-group').length`), 8, 'added slots survive reload');
        equal(await client.evaluate(`document.getElementById('it1_search').value`), 'Bow', 'searchable selection survives reload');
    });

    await suite('play mode', async () => {
        await freshBrowserState(client);

        await client.evaluate(`(() => {
            document.getElementById('char_name').value = 'Play Ranger';
            document.getElementById('s_hpc').value = '11';
            document.getElementById('sk_ac').value = '2';
            const first = slotGroups('heroic')[0].dataset.slotId;
            applySearchableValue(first, 'Dash', true);
            setMode('play');
        })()`);
        equal(await client.evaluate('currentMode()'), 'play', 'play mode activated');
        equal(await client.evaluate(`document.body.dataset.mode`), 'play', 'body mode state');
        equal(await client.evaluate(`document.getElementById('mode_play').getAttribute('aria-pressed')`), 'true', 'play button announced');
        equal(await client.evaluate(`document.getElementById('char_arch').offsetParent === null`), true, 'archetype selector hidden');
        equal(await client.evaluate(`document.getElementById('s_hpc').disabled`), false, 'current health remains editable');
        equal(await client.evaluate(`document.getElementById('stat-grid').firstElementChild.classList.contains('current-hp')`), true, 'current health leads DOM order');
        equal(await client.evaluate(`document.getElementById('skills-block').offsetParent !== null`), true, 'skills disclosure remains reachable');
        equal(await client.evaluate(`document.querySelector('#abilities-list .ability-group:not(.is-empty)').offsetParent !== null`), true, 'filled ability remains visible');
        equal(await client.evaluate(`document.querySelector('#abilities-list .ability-group.is-empty').offsetParent === null`), true, 'empty ability hidden');

        await client.evaluate(`setMode('edit')`);
        equal(await client.evaluate(`document.getElementById('char_arch').offsetParent !== null`), true, 'edit mode restores setup control');
        equal(await client.evaluate(`document.querySelector('#abilities-list .ability-group.is-empty').offsetParent !== null`), true, 'edit mode restores empty slots');

        await freshBrowserState(client);
        await client.evaluate(`setMode('play')`);
        equal(await client.evaluate(`document.body.classList.contains('play-empty')`), true, 'empty play mode marked');
        equal(await client.evaluate(`document.querySelector('.play-hint').offsetParent !== null`), true, 'empty play hint visible');

        await client.evaluate(`setMode('edit'); openSearchMenu('it1'); setMode('play')`);
        equal(await client.evaluate(`document.getElementById('it1_box').classList.contains('open')`), false, 'mode switch closes combobox');
    });

    await suite('character conditions', async () => {
        await freshBrowserState(client);

        equal(await client.evaluate(`document.querySelectorAll('#condition_list .condition-card').length`), 0, 'blank Ranger has no active conditions');
        equal(await client.evaluate(`document.querySelector('#condition_list .condition-empty').textContent`), 'No active conditions.', 'blank condition state explained');
        equal(await client.evaluate(`document.getElementById('condition_add').offsetParent !== null`), true, 'condition add control is visible in edit mode');
        check(await client.evaluate(`document.getElementById('condition_add').getBoundingClientRect().height >= 44`), 'condition add control is touch-sized');

        await client.evaluate(`openConditionDialog()`);
        equal(await client.evaluate(`document.getElementById('condition_dialog').open`), true, 'condition dialog opens');
        equal(await client.evaluate(`document.querySelectorAll('#condition_dialog .condition-option').length`), 3, 'three core conditions offered');
        equal(await client.evaluate(`document.getElementById('condition_option_poisoned').disabled`), false, 'inactive Poisoned option is available');

        await client.evaluate(`document.getElementById('condition_option_poisoned').click()`);
        equal(await client.evaluate(`document.getElementById('condition_dialog').open`), false, 'adding a condition closes the dialog');
        equal(await client.evaluate(`CONDITIONS.poisoned`), true, 'Poisoned becomes active');
        equal(await client.evaluate(`document.querySelector('[data-condition="poisoned"] .condition-rule').textContent.includes('one action per activation')`), true, 'Poisoned rule reminder shown');

        await client.evaluate(`openConditionDialog()`);
        equal(await client.evaluate(`document.getElementById('condition_option_poisoned').disabled`), true, 'active Poisoned option is disabled');
        await client.evaluate(`closeConditionDialog(); addCondition('diseased'); addCondition('hungerThirst'); addCondition('hungerThirst');`);

        equal(await client.evaluate(`document.querySelectorAll('#condition_list .condition-card').length`), 3, 'all active core conditions render');
        equal(await client.evaluate(`CONDITIONS.diseased`), true, 'Diseased becomes active');
        equal(await client.evaluate(`CONDITIONS.hungerThirst`), 2, 'Hunger and Thirst stacks');
        equal(await client.evaluate(`document.querySelector('[data-condition="hungerThirst"] .condition-title').textContent`), 'Hunger & Thirst · Level 2', 'stack level appears in title');
        equal(await client.evaluate(`document.querySelector('[data-condition="hungerThirst"] .condition-rule').textContent.includes('−4 Health')`), true, 'stacked Health reminder is derived');
        equal(await client.evaluate(`document.querySelector('[data-condition="diseased"] .condition-source').textContent`), 'Standard Edition, pp. 32–33', 'rule source is shown');

        await client.evaluate(`document.getElementById('s_hpm').value = '14'; document.getElementById('s_hpc').value = '9'; setMode('play');`);
        equal(await client.evaluate(`document.getElementById('conditions_section').offsetParent !== null`), true, 'conditions remain visible in play mode');
        equal(await client.evaluate(`document.body.classList.contains('play-empty')`), false, 'active conditions count as play content');
        equal(await client.evaluate(`document.getElementById('s_hpm').value`), '14', 'conditions do not rewrite base Health');
        equal(await client.evaluate(`document.getElementById('s_hpc').value`), '9', 'conditions do not rewrite current Health');
        equal(await client.evaluate(`JSON.stringify(collectDocument().character.conditions)`), '{"poisoned":true,"diseased":true,"hungerThirst":2}', 'conditions enter the character document');

        await client.evaluate(`saveNow(); location.reload();`);
        await waitFor(client, `document.readyState === 'complete' && CONDITIONS.poisoned && CONDITIONS.hungerThirst === 2`);
        equal(await client.evaluate(`currentMode()`), 'play', 'condition reload preserves play mode');
        equal(await client.evaluate(`document.querySelectorAll('#condition_list .condition-card').length`), 3, 'conditions survive reload');

        await client.evaluate(`clearCondition('poisoned'); stepCondition('hungerThirst', -1);`);
        equal(await client.evaluate(`CONDITIONS.poisoned`), false, 'condition can be cleared');
        equal(await client.evaluate(`document.querySelector('[data-condition="poisoned"]')`), null, 'cleared condition card disappears');
        equal(await client.evaluate(`CONDITIONS.hungerThirst`), 1, 'stack can be decreased');
        equal(await client.evaluate(`document.querySelector('[data-condition="hungerThirst"] .condition-rule').textContent.includes('−2 Health')`), true, 'decreased stack reminder updates');
    });

    await suite('collapsible Mission section', async () => {
        await freshBrowserState(client);

        equal(await client.evaluate(`document.getElementById('mission_section_toggle').offsetParent !== null`), true, 'Mission toggle is visible in edit mode');
        check(await client.evaluate(`document.getElementById('mission_section_toggle').getBoundingClientRect().height >= 44`), 'Mission toggle is touch-sized');
        equal(await client.evaluate(`document.getElementById('mission_section_toggle').getAttribute('aria-expanded')`), 'true', 'expanded Mission section is announced');

        await client.evaluate(`(() => {
            startMission();
            updateMissionField(MISSION.active.id, 'title', 'Collapsed patrol');
            toggleMissionSection();
        })()`);
        equal(await client.evaluate(`document.getElementById('mission_section_content').hidden`), true, 'Mission section collapses');
        equal(await client.evaluate(`document.getElementById('mission_section_toggle').getAttribute('aria-expanded')`), 'false', 'collapsed Mission section is announced');
        equal(await client.evaluate(`document.getElementById('mission_section_chevron').textContent`), '▸', 'collapsed chevron updates');
        equal(await client.evaluate(`MISSION.active.title`), 'Collapsed patrol', 'collapse preserves active mission state');
        equal(await client.evaluate(`collectDocument().uiState.missionSectionExpanded`), false, 'collapsed preference enters document');

        await client.evaluate(`setMode('play')`);
        equal(await client.evaluate(`document.getElementById('mission_section_toggle').offsetParent !== null`), true, 'Mission toggle remains visible in play mode');
        equal(await client.evaluate(`document.getElementById('mission_section_content').hidden`), true, 'mode switch preserves collapsed state');

        await client.evaluate(`saveNow(); location.reload();`);
        await waitFor(client, `document.readyState === 'complete' && document.getElementById('mission_section_content').hidden`);
        equal(await client.evaluate(`currentMode()`), 'play', 'collapsed Mission section reload keeps mode');
        equal(await client.evaluate(`MISSION.active.title`), 'Collapsed patrol', 'collapsed mission survives reload');

        await client.evaluate(`toggleMissionSection()`);
        equal(await client.evaluate(`document.getElementById('mission_section_content').hidden`), false, 'Mission section expands again');
        equal(await client.evaluate(`document.getElementById('mission_section_toggle').getAttribute('aria-expanded')`), 'true', 're-expanded Mission section is announced');
        equal(await client.evaluate(`document.getElementById('mission_section_chevron').textContent`), '▾', 'expanded chevron updates');
        equal(await client.evaluate(`document.getElementById('mission_title').value`), 'Collapsed patrol', 'expanded view restores mission fields');

        await client.evaluate(`setMode('edit')`);
        equal(await client.evaluate(`document.getElementById('mission_section_toggle').offsetParent !== null`), true, 'Mission toggle remains visible after returning to edit');
    });

    await suite('temporary stat effects', async () => {
        await freshBrowserState(client);

        equal(await client.evaluate(`document.querySelectorAll('[data-ally-stat]').length`), 7, 'seven base stats offer temporary effects');
        equal(await client.evaluate(`document.querySelector('[data-ally-stat="s_hpc"]')`), null, 'Current Health has no effect control');
        equal(await client.evaluate(`document.getElementById('s_fig_ally').offsetParent !== null`), true, 'effect control is visible in edit mode');
        equal(await client.evaluate(`document.getElementById('s_fig_ally').disabled`), true, 'effect control waits for a base stat value');
        equal(await client.evaluate(`(() => {
            const valid = normalizeTemporaryEffects({ s_fig: { buff: 2, debuff: 1 }, s_arm: 3 });
            return valid.s_fig.buff === 2 && valid.s_fig.debuff === 1
                && valid.s_arm.buff === 3 && valid.s_arm.debuff === 0;
        })()`), true, 'effect record accepts current and legacy entry shapes');
        equal(await client.evaluate(`(() => {
            try { normalizeTemporaryEffects({ s_fig: { buff: -1, debuff: 0 } }); return false; }
            catch { return true; }
        })()`), true, 'invalid effect amounts are rejected');

        await client.evaluate(`(() => {
            const fight = document.getElementById('s_fig');
            fight.value = '3';
            fight.dispatchEvent(new InputEvent('input', { bubbles: true }));
            const armour = document.getElementById('s_arm');
            armour.value = '12';
            armour.dispatchEvent(new InputEvent('input', { bubbles: true }));
        })()`);
        equal(await client.evaluate(`document.getElementById('s_fig_ally').disabled`), false, 'effects become available with a base stat');

        await client.evaluate(`document.getElementById('s_fig_ally').click()`);
        equal(await client.evaluate(`document.getElementById('ally_modifier_dialog').open`), true, 'stat button opens shared effect dialog');
        equal(await client.evaluate(`document.getElementById('ally_modifier_title').textContent.includes('Fight')`), true, 'dialog names selected stat');
        equal(await client.evaluate(`document.getElementById('ally_bonus_value').closest('.num-stepper')`), null, 'buff input is not wrapped in stat steppers');
        equal(await client.evaluate(`document.getElementById('debuff_penalty_value').closest('.num-stepper')`), null, 'debuff input is not wrapped in stat steppers');
        await client.evaluate(`(() => {
            stepTemporaryEffect('ally_bonus_value', 1);
            stepTemporaryEffect('ally_bonus_value', 1);
            stepTemporaryEffect('ally_bonus_value', -1);
            stepTemporaryEffect('debuff_penalty_value', -1);
        })()`);
        equal(await client.evaluate(`document.getElementById('ally_bonus_value').value`), '1', 'dialog steppers change bonus without keyboard');
        equal(await client.evaluate(`document.getElementById('debuff_penalty_value').value`), '0', 'dialog steppers clamp at zero');
        await client.evaluate(`(() => {
            document.getElementById('ally_bonus_value').value = '4';
            document.getElementById('debuff_penalty_value').value = '2';
            document.querySelector('#ally_modifier_dialog button[type="submit"]').click();
        })()`);
        equal(await client.evaluate(`document.getElementById('ally_modifier_dialog').open`), false, 'Apply closes effect dialog');
        equal(await client.evaluate(`document.querySelector('[data-ally-stat="s_fig"]').classList.contains('buff-active')`), true, 'active Fight buff is visibly marked');
        equal(await client.evaluate(`document.querySelector('[data-ally-stat="s_fig"]').classList.contains('debuff-active')`), true, 'active Fight debuff is visibly marked');
        equal(await client.evaluate(`document.getElementById('s_fig_effective').textContent`), '5', 'effective Fight applies buff and debuff separately');
        equal(await client.evaluate(`document.getElementById('s_fig_breakdown').textContent`), 'TEMP · Base 3 + Ally 4 − Debuff 2', 'Fight equation keeps both sources explicit');
        equal(await client.evaluate(`document.getElementById('s_fig_ally').textContent`), '+4 / −2', 'mixed effect button summarizes both values');
        equal(await client.evaluate(`document.getElementById('s_fig_ally').getAttribute('aria-pressed')`), 'true', 'active Fight effects are announced');
        equal(await client.evaluate(`document.getElementById('s_fig').value`), '3', 'base Fight is unchanged');

        await client.evaluate(`setTemporaryEffects('s_arm', 0, 2)`);
        equal(await client.evaluate(`document.getElementById('s_arm_effective').textContent`), '10', 'Armour supports a debuff without a buff');
        equal(await client.evaluate(`document.querySelector('[data-ally-stat="s_arm"]').classList.contains('debuff-active')`), true, 'debuff-only card uses debuff state');
        equal(await client.evaluate(`document.querySelector('[data-ally-stat="s_arm"]').classList.contains('buff-active')`), false, 'debuff-only card has no buff state');
        equal(await client.evaluate(`document.getElementById('s_arm_ally').textContent`), 'Debuff −2', 'debuff-only button is explicit');
        equal(await client.evaluate(`sessionStorage.getItem(TEMP_EFFECT_STORAGE_KEY)`), '{"s_fig":{"buff":4,"debuff":2},"s_arm":{"buff":0,"debuff":2}}', 'multiple stat effects are session-scoped');
        equal(await client.evaluate(`collectDocument().character.fields.s_fig`), '3', 'character document keeps base Fight');
        equal(await client.evaluate(`collectDocument().character.fields.s_arm`), '12', 'character document keeps base Armour');
        equal(await client.evaluate(`JSON.stringify(collectDocument()).includes(TEMP_EFFECT_STORAGE_KEY)`), false, 'character export excludes temporary effects');

        await client.evaluate(`setMode('play')`);
        equal(await client.evaluate(`document.getElementById('s_fig_ally').offsetParent !== null`), true, 'effect control remains visible in play mode');

        await client.evaluate(`saveNow(); location.reload();`);
        await waitFor(client, `document.readyState === 'complete' && document.getElementById('s_fig_effective').textContent === '5'`);
        equal(await client.evaluate(`document.getElementById('s_arm_effective').textContent`), '10', 'multiple effects survive an accidental reload');
        equal(await client.evaluate(`document.getElementById('s_fig').value`), '3', 'reload still preserves base Fight');
        equal(await client.evaluate(`document.getElementById('s_arm').value`), '12', 'reload still preserves base Armour');

        await client.send('Emulation.setDeviceMetricsOverride', {
            width: 360,
            height: 900,
            deviceScaleFactor: 1,
            mobile: true
        });
        await client.send('Emulation.setTouchEmulationEnabled', {
            enabled: true,
            maxTouchPoints: 5
        });
        check(await client.evaluate(`document.getElementById('s_fig_ally').getBoundingClientRect().height >= 44`), 'temporary effect target is touch-sized');
        await client.evaluate(`document.getElementById('s_fig_ally').click()`);
        check(await client.evaluate(`document.querySelector('.effect-dialog-stepper button').getBoundingClientRect().height >= 44`), 'dialog effect stepper is touch-sized');
        check(await client.evaluate(`document.getElementById('ally_modifier_dialog').getBoundingClientRect().right <= document.documentElement.clientWidth`), 'effect dialog fits phone viewport');
        await client.evaluate(`closeTemporaryEffects()`);
        check(await client.evaluate(`document.documentElement.scrollWidth <= document.documentElement.clientWidth`), 'temporary effects cause no phone overflow');
        await client.send('Emulation.clearDeviceMetricsOverride');
        await client.send('Emulation.setTouchEmulationEnabled', { enabled: false });

        await client.evaluate(`(() => {
            document.getElementById('s_fig_ally').click();
            document.querySelector('#ally_modifier_dialog button[onclick="clearSelectedTemporaryEffects()"]').click();
        })()`);
        equal(await client.evaluate(`document.querySelector('[data-ally-stat="s_fig"]').classList.contains('buff-active')`), false, 'Clear removes selected Fight buff');
        equal(await client.evaluate(`document.querySelector('[data-ally-stat="s_fig"]').classList.contains('debuff-active')`), false, 'Clear removes selected Fight debuff');
        equal(await client.evaluate(`document.getElementById('s_fig').value`), '3', 'Clear never changes base Fight');
        equal(await client.evaluate(`JSON.parse(sessionStorage.getItem(TEMP_EFFECT_STORAGE_KEY)).s_arm.debuff`), 2, 'Clear keeps other stat effects');

        await client.evaluate(`(() => {
            document.getElementById('s_arm_ally').click();
            document.querySelector('#ally_modifier_dialog .ally-dialog-clear-all').click();
        })()`);
        equal(await client.evaluate(`document.querySelectorAll('.ally-stat.buff-active, .ally-stat.debuff-active').length`), 0, 'Clear all removes every visible effect');
        equal(await client.evaluate(`sessionStorage.getItem(TEMP_EFFECT_STORAGE_KEY)`), null, 'Clear all removes session effect record');
        equal(await client.evaluate(`document.getElementById('s_arm').value`), '12', 'Clear all never changes base Armour');

        await client.evaluate(`sessionStorage.setItem(LEGACY_ALLY_MODIFIER_STORAGE_KEY, '{"s_fig":4,"s_arm":2}'); location.reload();`);
        await waitFor(client, `document.readyState === 'complete' && document.getElementById('s_fig_effective').textContent === '7'`);
        equal(await client.evaluate(`JSON.parse(sessionStorage.getItem(TEMP_EFFECT_STORAGE_KEY)).s_fig.buff`), 4, 'legacy Ally record migrates to buff effects');
        equal(await client.evaluate(`JSON.parse(sessionStorage.getItem(TEMP_EFFECT_STORAGE_KEY)).s_fig.debuff`), 0, 'legacy Ally record gains zero debuff');
        equal(await client.evaluate(`sessionStorage.getItem(LEGACY_ALLY_MODIFIER_STORAGE_KEY)`), null, 'legacy Ally key removed after migration');

        await client.evaluate(`clearAllTemporaryEffects(); sessionStorage.setItem(LEGACY_ROUND_ARMOR_STORAGE_KEY, '2'); location.reload();`);
        await waitFor(client, `document.readyState === 'complete' && document.getElementById('s_arm_effective').textContent === '14'`);
        equal(await client.evaluate(`JSON.parse(sessionStorage.getItem(TEMP_EFFECT_STORAGE_KEY)).s_arm.buff`), 2, 'legacy Armour bonus migrates to buff effect');
        equal(await client.evaluate(`JSON.parse(sessionStorage.getItem(TEMP_EFFECT_STORAGE_KEY)).s_arm.debuff`), 0, 'legacy Armour bonus gains zero debuff');
        equal(await client.evaluate(`sessionStorage.getItem(LEGACY_ROUND_ARMOR_STORAGE_KEY)`), null, 'legacy Armour key removed after migration');
    });

    await suite('enemy catalog and mission lifecycle', async () => {
        await freshBrowserState(client);

        const catalogValidation = await client.evaluate(`(() => {
            const valid = normalizeEnemyCatalog(${JSON.stringify(fixtures['enemy-catalog'])});
            const invalids = [
                { formatVersion: 2, catalogId: 'x', catalogVersion: '1', enemies: [] },
                { formatVersion: 1, catalogId: '', catalogVersion: '1', enemies: [] },
                { formatVersion: 1, catalogId: 'x', catalogVersion: '', enemies: [] },
                { formatVersion: 1, catalogId: 'x', catalogVersion: '1', enemies: [{ id: 'a', name: '', xp: 1 }] },
                { formatVersion: 1, catalogId: 'x', catalogVersion: '1', enemies: [{ id: 'a', name: 'A', xp: -1 }] },
                { formatVersion: 1, catalogId: 'x', catalogVersion: '1', enemies: [{ id: 'a', name: 'A', xp: 1 }, { id: 'a', name: 'B', xp: 2 }] }
            ];
            return {
                count: valid.enemies.length,
                zero: valid.enemies[2].xp,
                rejected: invalids.map(value => {
                    try { normalizeEnemyCatalog(value); return false; }
                    catch { return true; }
                })
            };
        })()`);
        equal(catalogValidation.count, 3, 'synthetic catalog count');
        equal(catalogValidation.zero, 0, 'zero-XP enemy accepted');
        equal(catalogValidation.rejected.every(Boolean), true, 'invalid catalogs rejected');

        await client.evaluate(`(() => {
            ENEMY_CATALOG = normalizeEnemyCatalog(${JSON.stringify(fixtures['enemy-catalog'])});
            refreshEnemyPickerOptions();
            startMission();
        })()`);
        equal(await client.evaluate(`document.getElementById('enemy_picker_select').tagName`), 'SELECT', 'enemy picker is a native dropdown');
        equal(await client.evaluate(`document.getElementById('enemy_picker_select').options.length - 1`), 3, 'picker receives catalog options');
        equal(await client.evaluate(`document.getElementById('enemy_picker_add').disabled`), true, 'add waits for an enemy selection');
        equal(await client.evaluate(`getComputedStyle(document.getElementById('mission-enemy-tools')).display !== 'none'`), true, 'enemy tools visible');
        equal(await client.evaluate(`document.getElementById('enemy-catalog-status').textContent.includes('3 enemies')`), true, 'catalog status count');

        await client.evaluate(`(() => {
            const select = document.getElementById('enemy_picker_select');
            select.value = 'fixture-ghoul';
            select.dispatchEvent(new Event('change', { bubbles: true }));
            document.getElementById('enemy_picker_add').click();
        })()`);
        let kill = await client.evaluate(`MISSION.active.kills[0]`);
        equal(kill.name, 'Fixture Ghoul', 'catalog enemy name added');
        equal(kill.value, 3, 'catalog enemy XP added');
        equal(kill.enemyId, 'fixture-ghoul', 'catalog enemy id linked');
        equal(kill.catalogVersion, 'fixture-enemies@1', 'catalog version linked');
        equal(await client.evaluate(`document.querySelector('.mission-total').textContent.includes('1 kill')`), true, 'live summary shows one defeated enemy');
        equal(await client.evaluate(`document.querySelector('.mission-total').textContent.includes('Kill XP 3')`), true, 'live summary separates initial kill XP');

        await client.evaluate(`document.querySelector('[data-row="' + MISSION.active.kills[0].id + '"] .mission-count .mission-step:last-child').click()`);
        kill = await client.evaluate(`MISSION.active.kills[0]`);
        equal(kill.count, 2, 'kill count updates through plus button');
        equal(await client.evaluate(`document.querySelector('[data-row="' + MISSION.active.kills[0].id + '"] [data-field="count"]').value`), '2', 'visible kill counter updates through plus button');
        equal(await client.evaluate(`document.querySelector('.mission-total').textContent.includes('2 kills')`), true, 'live summary updates defeated-enemy count');
        equal(await client.evaluate(`document.querySelector('.mission-total').textContent.includes('Kill XP 6')`), true, 'live summary updates kill XP separately');
        equal(kill.enemyId, 'fixture-ghoul', 'count edit preserves enemy linkage');
        equal(kill.catalogVersion, 'fixture-enemies@1', 'count edit preserves version linkage');
        await client.evaluate(`document.querySelector('[data-row="' + MISSION.active.kills[0].id + '"] .mission-count .mission-step:first-child').click()`);
        equal(await client.evaluate(`MISSION.active.kills[0].count`), 1, 'minus button decreases kill count');
        equal(await client.evaluate(`document.querySelector('.mission-total').textContent.includes('1 kill')`), true, 'minus button updates defeated-enemy summary');
        await client.evaluate(`document.querySelector('[data-row="' + MISSION.active.kills[0].id + '"] .mission-count .mission-step:last-child').click()`);
        equal(await client.evaluate(`MISSION.active.kills[0].count`), 2, 'plus button restores kill count');

        await client.evaluate(`updateMissionRow(MISSION.active.id, 'kills', MISSION.active.kills[0].id, 'value', 4)`);
        kill = await client.evaluate(`MISSION.active.kills[0]`);
        equal(kill.value, 4, 'manual XP correction applies');
        equal(kill.enemyId, null, 'manual XP correction clears enemy link');
        equal(kill.catalogVersion, null, 'manual XP correction clears version link');

        await client.evaluate(`(() => {
            addMissionRow('kills');
            const row = MISSION.active.kills[1];
            updateMissionRow(MISSION.active.id, 'kills', row.id, 'name', 'Campaign Beast');
        })()`);
        const customKill = await client.evaluate(`MISSION.active.kills[1]`);
        equal(customKill.name, 'Campaign Beast', 'custom enemy name');
        equal(customKill.value, 0, 'custom enemy default XP');
        equal(customKill.enemyId, null, 'custom enemy has no link');

        await client.evaluate(`(() => {
            const select = document.getElementById('enemy_picker_select');
            select.value = 'fixture-ogre';
            select.dispatchEvent(new Event('change', { bubbles: true }));
            document.getElementById('enemy_picker_add').click();
            ENEMY_CATALOG.enemies.find(enemy => enemy.id === 'fixture-ogre').xp = 99;
        })()`);
        equal(await client.evaluate(`MISSION.active.kills[2].value`), 5, 'catalog change does not rewrite snapshot');

        await client.evaluate(`(() => {
            addMissionRow('objectives');
            const row = MISSION.active.objectives[0];
            updateMissionRow(MISSION.active.id, 'objectives', row.id, 'title', 'Find the marker');
            updateMissionRow(MISSION.active.id, 'objectives', row.id, 'value', 7);
            toggleObjective(MISSION.active.id, row.id);
            addMissionRow('adjustments');
            const adjustment = MISSION.active.adjustments[0];
            updateMissionRow(MISSION.active.id, 'adjustments', adjustment.id, 'label', 'Scenario penalty');
            updateMissionRow(MISSION.active.id, 'adjustments', adjustment.id, 'value', -2);
        })()`);
        const totals = await client.evaluate(`missionTotals(MISSION.active)`);
        equal(totals.killCount, 4, 'defeated-enemy count derived');
        equal(totals.killXp, 13, 'kill XP total derived');
        equal(totals.objectives, 7, 'completed objective total derived');
        equal(totals.adjustments, -2, 'negative adjustment total derived');
        equal(totals.total, 18, 'mission total derived');

        const removal = await client.evaluate(`(() => {
            const id = MISSION.active.kills[1].id;
            removeMissionRow('kills', id);
            const afterRemove = MISSION.active.kills.map(row => row.name);
            undoMissionRemoval();
            return {
                afterRemove,
                afterUndo: MISSION.active.kills.map(row => row.name)
            };
        })()`);
        equal(removal.afterRemove.includes('Campaign Beast'), false, 'row removal applies');
        equal(removal.afterUndo[1], 'Campaign Beast', 'undo restores original index');

        const roundTrip = await client.evaluate(`parseDocument(JSON.stringify(collectDocument())).document.activeMission`);
        equal(roundTrip.kills.length, 3, 'mission kills survive round-trip');
        equal(roundTrip.kills[2].enemyId, 'fixture-ogre', 'catalog linkage survives round-trip');
        equal(roundTrip.objectives[0].completed, true, 'objective state survives round-trip');
        equal(roundTrip.adjustments[0].value, -2, 'adjustment survives round-trip');

        await client.evaluate(`window.confirm = () => true; completeMission()`);
        equal(await client.evaluate(`MISSION.active`), null, 'completion clears active mission');
        equal(await client.evaluate(`MISSION.history.length`), 1, 'completion adds history');
        equal(await client.evaluate(`MISSION.history[0].kills[2].value`), 5, 'history keeps XP snapshot');
        equal(await client.evaluate(`document.querySelector('.mission-past-summary').textContent.includes('4 kills')`), true, 'history keeps defeated-enemy count');
        equal(await client.evaluate(`getComputedStyle(document.getElementById('mission-enemy-tools')).display`), 'none', 'tools hide after completion');
        equal(await client.evaluate(`document.getElementById('char_xp').value`), '', 'completion does not apply XP');

        await client.evaluate(`applyMissionXp(MISSION.history[0].id)`);
        equal(await client.evaluate(`Number(document.getElementById('char_xp').value)`), 18, 'explicit XP application updates ranger');
        equal(await client.evaluate(`MISSION.history[0].appliedXp`), 18, 'applied XP recorded');
        await client.evaluate(`applyMissionXp(MISSION.history[0].id)`);
        equal(await client.evaluate(`Number(document.getElementById('char_xp').value)`), 18, 'XP cannot double-apply');

        await client.evaluate(`reopenMission(MISSION.history[0].id)`);
        equal(await client.evaluate(`MISSION.active.status`), 'active', 'history can reopen');
        equal(await client.evaluate(`MISSION.history.length`), 0, 'reopened report leaves history');
    });

    await suite('responsive and touch layout', async () => {
        await freshBrowserState(client);
        await client.send('Emulation.setTouchEmulationEnabled', {
            enabled: true,
            maxTouchPoints: 5
        });

        await client.evaluate(`(() => {
            ENEMY_CATALOG = normalizeEnemyCatalog(${JSON.stringify(fixtures['enemy-catalog'])});
            refreshEnemyPickerOptions();
            startMission();
            const select = document.getElementById('enemy_picker_select');
            select.value = 'fixture-ghoul';
            select.dispatchEvent(new Event('change', { bubbles: true }));
            document.getElementById('enemy_picker_add').click();
            addCondition('hungerThirst');
        })()`);

        const widths = [360, 430, 712, 768, 800, 899, 900, 912, 1080];
        for (const width of widths) {
            await client.send('Emulation.setDeviceMetricsOverride', {
                width,
                height: 1000,
                deviceScaleFactor: 1,
                mobile: true
            });
            await client.send('Emulation.setTouchEmulationEnabled', {
                enabled: true,
                maxTouchPoints: 5
            });

            const layout = await client.evaluate(`(() => ({
                overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
                mainColumns: getComputedStyle(document.querySelector('.main-grid')).gridTemplateColumns.split(' ').length,
                statColumns: getComputedStyle(document.getElementById('stat-grid')).gridTemplateColumns.split(' ').length,
                addHeight: document.querySelector('.mission-enemy-picker > button').getBoundingClientRect().height,
                stepHeight: document.querySelector('.mission-step').getBoundingClientRect().height,
                conditionAddHeight: document.getElementById('condition_add').getBoundingClientRect().height,
                conditionStepHeight: document.querySelector('.condition-step').getBoundingClientRect().height,
                nameWidth: document.querySelector('.mission-kill-row .mission-grow').getBoundingClientRect().width,
                overflowElements: Array.from(document.querySelectorAll('body *'))
                    .filter(element => element.getBoundingClientRect().right > document.documentElement.clientWidth + 0.5)
                    .slice(0, 5)
                    .map(element => element.tagName.toLowerCase() + '#' + element.id + '.' + element.className)
            }))()`);
            check(layout.overflow <= 0, `${width}px has no horizontal overflow; offenders: ${layout.overflowElements.join(', ')}`);
            equal(layout.mainColumns, width <= 899 ? 1 : 2, `${width}px main column count`);
            equal(layout.statColumns, width <= 899 ? 4 : 8, `${width}px stat column count`);
            check(layout.addHeight >= 44, `${width}px add target is touch-sized`);
            check(layout.stepHeight >= 44, `${width}px mission step target is touch-sized`);
            check(layout.conditionAddHeight >= 44, `${width}px condition add target is touch-sized`);
            check(layout.conditionStepHeight >= 44, `${width}px condition step target is touch-sized`);
            if (width <= 430) check(layout.nameWidth >= 180, `${width}px enemy name remains usable`);
        }

        await client.send('Emulation.setDeviceMetricsOverride', {
            width: 360,
            height: 1000,
            deviceScaleFactor: 1,
            mobile: true
        });
        await client.evaluate(`openConditionDialog()`);
        check(await client.evaluate(`document.getElementById('condition_dialog').getBoundingClientRect().right <= document.documentElement.clientWidth`), 'condition dialog fits phone viewport');
        await client.evaluate(`closeConditionDialog()`);

        await client.send('Emulation.clearDeviceMetricsOverride');
        await client.send('Emulation.setTouchEmulationEnabled', { enabled: false });
    });

    const uncaught = client.events.filter(event => event.method === 'Runtime.exceptionThrown');
    check(uncaught.length === 0, 'no uncaught browser exceptions');

    console.log(`\n${checks} browser regression checks passed.`);
} catch (error) {
    console.error(`\n${error.stack || error.message}`);
    process.exitCode = 1;
} finally {
    if (client) client.close();
    browser.kill();
    if (browser.exitCode === null) {
        await Promise.race([
            new Promise(resolveExit => browser.once('exit', resolveExit)),
            new Promise(resolveWait => setTimeout(resolveWait, 3000))
        ]);
    }
    await new Promise(resolveClose => server.close(resolveClose));
    for (let attempt = 0; attempt < 20; attempt++) {
        try {
            await rm(profileDir, { recursive: true, force: true });
            break;
        } catch (error) {
            if (attempt === 19) throw error;
            await new Promise(resolveWait => setTimeout(resolveWait, 100));
        }
    }
}

if (failed) process.exitCode = 1;
