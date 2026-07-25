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

        equal(await client.evaluate('FORMAT_VERSION'), 3, 'current document format');
        equal(await client.evaluate(`document.querySelectorAll('#abilities-list .ability-group').length`), 5, 'default heroic slots');
        equal(await client.evaluate(`document.querySelectorAll('#innate-list .ability-group').length`), 4, 'default innate slots');
        equal(await client.evaluate('currentMode()'), 'edit', 'blank sheet mode');
        equal(await client.evaluate('MISSION.active'), null, 'blank active mission');
        equal(await client.evaluate('MISSION.history.length'), 0, 'blank mission history');
        equal(await client.evaluate('ENEMY_CATALOG'), null, 'catalog is optional');
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
                history: result.document.missionHistory.length
            };
        })()`);
        equal(legacy.migratedFrom, 0, 'legacy migration source');
        equal(legacy.version, 3, 'legacy migration target');
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
        equal(format1.version, 3, 'format 1 migration target');
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
        equal(format2.version, 3, 'format 2 migration target');
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
                status: result.document.missionHistory[0].status
            };
        })()`);
        equal(format3.migratedFrom, null, 'format 3 needs no migration');
        equal(format3.enemyId, 'fixture-ogre', 'format 3 enemy id');
        equal(format3.catalogVersion, 'fixture@1', 'format 3 catalog version');
        equal(format3.value, 5, 'format 3 XP snapshot');
        equal(format3.status, 'complete', 'history status normalized');

        equal(await client.evaluate(`(() => {
            try { normalizeDocument({ ...createBlankDocument(), formatVersion: 4 }); return false; }
            catch { return true; }
        })()`), true, 'newer character format refused');
        equal(await client.evaluate(`(() => {
            try { normalizeDocument({ formatVersion: 3, character: null }); return false; }
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
    });

    await suite('storage recovery and file import', async () => {
        await freshBrowserState(client);

        await client.evaluate(`localStorage.setItem(STORAGE_KEY, ${JSON.stringify(JSON.stringify(fixtures['format-0-legacy']))}); location.reload();`);
        await waitFor(client, `document.readyState === 'complete' && document.getElementById('char_name').value === 'Legacy Ranger'`);
        equal(await client.evaluate(`JSON.parse(localStorage.getItem(STORAGE_KEY)).formatVersion`), 3, 'stored legacy data upgraded');
        equal(await client.evaluate(`JSON.parse(localStorage.getItem(STORAGE_RECOVERY_KEY)).raw.length > 0`), true, 'pre-migration recovery stored');
        equal(await client.evaluate(`document.querySelectorAll('#abilities-list .ability-group').length`), 6, 'migrated slot count applied');
        equal(await client.evaluate(`document.querySelector('#abilities-list .numbered-row').classList.contains('used')`), true, 'migrated used state applied');

        await client.evaluate(`localStorage.setItem(STORAGE_KEY, '{broken'); location.reload();`);
        await waitFor(client, `document.readyState === 'complete' && document.getElementById('char_name').value === ''`);
        equal(await client.evaluate(`document.getElementById('save_status').textContent`), 'Recovery needed', 'corrupt storage status');
        equal(await client.evaluate(`JSON.parse(localStorage.getItem(STORAGE_RECOVERY_KEY)).raw`), '{broken', 'corrupt raw data preserved');
        equal(await client.evaluate(`localStorage.getItem(STORAGE_KEY)`), '{broken', 'corrupt primary data not silently removed');

        await freshBrowserState(client);
        await client.evaluate(`setAllyModifier('s_arm', 2)`);
        await client.evaluate(`(() => {
            const file = new File([${JSON.stringify(JSON.stringify(fixtures['format-1-character']))}], 'format-1.json', { type: 'application/json' });
            importJSONFile({ target: { files: [file], value: 'selected' } });
        })()`);
        await waitFor(client, `document.getElementById('char_name').value === 'Format One'`);
        equal(await client.evaluate('currentMode()'), 'play', 'file import applies UI mode');
        equal(await client.evaluate(`JSON.parse(localStorage.getItem(STORAGE_KEY)).formatVersion`), 3, 'file import persists current format');
        equal(await client.evaluate(`sessionStorage.getItem(ALLY_MODIFIER_STORAGE_KEY)`), null, 'file import clears temporary Ally modifiers');

        const beforeInvalid = await client.evaluate(`localStorage.getItem(STORAGE_KEY)`);
        await client.evaluate(`(() => {
            const file = new File(['{"formatVersion":99}'], 'bad.json', { type: 'application/json' });
            importJSONFile({ target: { files: [file], value: 'selected' } });
        })()`);
        await new Promise(resolveWait => setTimeout(resolveWait, 150));
        equal(await client.evaluate(`localStorage.getItem(STORAGE_KEY)`), beforeInvalid, 'invalid file leaves storage unchanged');
        equal(await client.evaluate(`document.getElementById('char_name').value`), 'Format One', 'invalid file leaves sheet unchanged');

        await client.evaluate(`localStorage.setItem('unrelated_test_key', 'keep'); localStorage.setItem(ENEMY_CATALOG_STORAGE_KEY, ${JSON.stringify(JSON.stringify(fixtures['enemy-catalog']))}); setAllyModifier('s_fig', 3); window.confirm = () => true; clearSheet();`);
        await waitFor(client, `document.readyState === 'complete' && document.getElementById('char_name').value === ''`);
        equal(await client.evaluate(`localStorage.getItem('unrelated_test_key')`), 'keep', 'obliterate keeps unrelated storage');
        equal(await client.evaluate(`localStorage.getItem(ENEMY_CATALOG_STORAGE_KEY) !== null`), true, 'obliterate keeps catalog');
        equal(await client.evaluate(`localStorage.getItem(STORAGE_KEY)`), null, 'obliterate removes character');
        equal(await client.evaluate(`localStorage.getItem(STORAGE_RECOVERY_KEY)`), null, 'obliterate removes recovery');
        equal(await client.evaluate(`sessionStorage.getItem(ALLY_MODIFIER_STORAGE_KEY)`), null, 'obliterate clears temporary Ally modifiers');
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

    await suite('temporary Ally stat modifiers', async () => {
        await freshBrowserState(client);

        equal(await client.evaluate(`document.querySelectorAll('[data-ally-stat]').length`), 7, 'seven base stats offer Ally modifiers');
        equal(await client.evaluate(`document.querySelector('[data-ally-stat="s_hpc"]')`), null, 'Current Health has no modifier control');
        equal(await client.evaluate(`document.getElementById('s_fig_ally').offsetParent !== null`), true, 'modifier control is visible in edit mode');
        equal(await client.evaluate(`document.getElementById('s_fig_ally').disabled`), true, 'modifier waits for a base stat value');

        await client.evaluate(`(() => {
            const fight = document.getElementById('s_fig');
            fight.value = '3';
            fight.dispatchEvent(new InputEvent('input', { bubbles: true }));
            const armour = document.getElementById('s_arm');
            armour.value = '12';
            armour.dispatchEvent(new InputEvent('input', { bubbles: true }));
        })()`);
        equal(await client.evaluate(`document.getElementById('s_fig_ally').disabled`), false, 'modifier becomes available with a base stat');

        await client.evaluate(`document.getElementById('s_fig_ally').click()`);
        equal(await client.evaluate(`document.getElementById('ally_modifier_dialog').open`), true, 'stat button opens shared modifier dialog');
        equal(await client.evaluate(`document.getElementById('ally_modifier_title').textContent.includes('Fight')`), true, 'dialog names selected stat');
        equal(await client.evaluate(`document.getElementById('ally_modifier_value').closest('.num-stepper')`), null, 'dialog value is not wrapped in stat steppers');
        await client.evaluate(`(() => {
            document.getElementById('ally_modifier_value').value = '4';
            document.querySelector('#ally_modifier_dialog button[type="submit"]').click();
        })()`);
        equal(await client.evaluate(`document.getElementById('ally_modifier_dialog').open`), false, 'Apply closes modifier dialog');
        equal(await client.evaluate(`document.querySelector('[data-ally-stat="s_fig"]').classList.contains('temp-active')`), true, 'active Fight bonus is visibly marked');
        equal(await client.evaluate(`document.getElementById('s_fig_effective').textContent`), '7', 'effective Fight uses arbitrary bonus');
        equal(await client.evaluate(`document.getElementById('s_fig_breakdown').textContent`), 'TEMP · Base 3 + Ally 4', 'Fight equation stays explicit');
        equal(await client.evaluate(`document.getElementById('s_fig_ally').getAttribute('aria-pressed')`), 'true', 'active Fight bonus is announced');
        equal(await client.evaluate(`document.getElementById('s_fig').value`), '3', 'base Fight is unchanged');

        await client.evaluate(`setAllyModifier('s_arm', 2)`);
        equal(await client.evaluate(`document.getElementById('s_arm_effective').textContent`), '14', 'Armour keeps configurable effective value');
        equal(await client.evaluate(`sessionStorage.getItem(ALLY_MODIFIER_STORAGE_KEY)`), '{"s_fig":4,"s_arm":2}', 'multiple modifiers are session-scoped');
        equal(await client.evaluate(`collectDocument().character.fields.s_fig`), '3', 'character document keeps base Fight');
        equal(await client.evaluate(`collectDocument().character.fields.s_arm`), '12', 'character document keeps base Armour');
        equal(await client.evaluate(`JSON.stringify(collectDocument()).includes(ALLY_MODIFIER_STORAGE_KEY)`), false, 'character export excludes temporary modifiers');

        await client.evaluate(`setMode('play')`);
        equal(await client.evaluate(`document.getElementById('s_fig_ally').offsetParent !== null`), true, 'modifier control remains visible in play mode');

        await client.evaluate(`saveNow(); location.reload();`);
        await waitFor(client, `document.readyState === 'complete' && document.getElementById('s_fig_effective').textContent === '7'`);
        equal(await client.evaluate(`document.getElementById('s_arm_effective').textContent`), '14', 'multiple modifiers survive an accidental reload');
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
        check(await client.evaluate(`document.getElementById('s_fig_ally').getBoundingClientRect().height >= 44`), 'Ally modifier target is touch-sized');
        check(await client.evaluate(`document.documentElement.scrollWidth <= document.documentElement.clientWidth`), 'Ally modifiers cause no phone overflow');
        await client.send('Emulation.clearDeviceMetricsOverride');
        await client.send('Emulation.setTouchEmulationEnabled', { enabled: false });

        await client.evaluate(`(() => {
            document.getElementById('s_fig_ally').click();
            document.querySelector('#ally_modifier_dialog button[onclick="clearSelectedAllyModifier()"]').click();
        })()`);
        equal(await client.evaluate(`document.querySelector('[data-ally-stat="s_fig"]').classList.contains('temp-active')`), false, 'Clear removes selected Fight bonus');
        equal(await client.evaluate(`document.getElementById('s_fig').value`), '3', 'Clear never changes base Fight');
        equal(await client.evaluate(`JSON.parse(sessionStorage.getItem(ALLY_MODIFIER_STORAGE_KEY)).s_arm`), 2, 'Clear keeps other Ally modifiers');

        await client.evaluate(`(() => {
            document.getElementById('s_arm_ally').click();
            document.querySelector('#ally_modifier_dialog .ally-dialog-clear-all').click();
        })()`);
        equal(await client.evaluate(`document.querySelectorAll('.ally-stat.temp-active').length`), 0, 'Clear all removes every visible modifier');
        equal(await client.evaluate(`sessionStorage.getItem(ALLY_MODIFIER_STORAGE_KEY)`), null, 'Clear all removes session modifier record');
        equal(await client.evaluate(`document.getElementById('s_arm').value`), '12', 'Clear all never changes base Armour');

        await client.evaluate(`sessionStorage.setItem(LEGACY_ROUND_ARMOR_STORAGE_KEY, '2'); location.reload();`);
        await waitFor(client, `document.readyState === 'complete' && document.getElementById('s_arm_effective').textContent === '14'`);
        equal(await client.evaluate(`JSON.parse(sessionStorage.getItem(ALLY_MODIFIER_STORAGE_KEY)).s_arm`), 2, 'legacy Armour bonus migrates to modifier record');
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

        await client.evaluate(`updateMissionRow(MISSION.active.id, 'kills', MISSION.active.kills[0].id, 'count', 2)`);
        kill = await client.evaluate(`MISSION.active.kills[0]`);
        equal(kill.count, 2, 'kill count updates');
        equal(kill.enemyId, 'fixture-ghoul', 'count edit preserves enemy linkage');
        equal(kill.catalogVersion, 'fixture-enemies@1', 'count edit preserves version linkage');

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
        equal(totals.kills, 13, 'kill total derived');
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
                nameWidth: document.querySelector('.mission-kill-row .mission-grow').getBoundingClientRect().width
            }))()`);
            check(layout.overflow <= 0, `${width}px has no horizontal overflow`);
            equal(layout.mainColumns, width <= 899 ? 1 : 2, `${width}px main column count`);
            equal(layout.statColumns, width <= 899 ? 4 : 8, `${width}px stat column count`);
            check(layout.addHeight >= 44, `${width}px add target is touch-sized`);
            check(layout.stepHeight >= 44, `${width}px mission step target is touch-sized`);
            if (width <= 430) check(layout.nameWidth >= 180, `${width}px enemy name remains usable`);
        }

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
