(function (global) {
    'use strict';

    function deepFreeze(value) {
        if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
        Object.values(value).forEach(deepFreeze);
        return Object.freeze(value);
    }

    const profiles = {
        'burrow-worm': {
            name: 'Burrow Worm', xp: 8, page: 172,
            stats: { move: 5, fight: 3, shoot: 0, armour: 10, will: 3, health: 14 },
            notes: ['Animal', 'Burrowing'],
            rules: ['Moves through solid terrain as though it were not there.']
        },
        'flesh-golem': {
            name: 'Flesh Golem', xp: 5, page: 174,
            stats: { move: 5, fight: 4, shoot: 0, armour: 10, will: 0, health: 16 },
            notes: ['Undead', 'Horrific (TN8)'],
            rules: ['A hero moving into combat must pass Will (TN8) or stop 2” away and end its activation.']
        },
        'giant-fly': {
            name: 'Giant Fly', xp: 2, page: 176,
            stats: { move: 6, fight: 0, shoot: 0, armour: 6, will: 0, health: 5 },
            notes: ['Animal', 'Flying', 'Disease (TN8)'], rules: []
        },
        'giant-rat': {
            name: 'Giant Rat', xp: 2, page: 176,
            stats: { move: 6, fight: 0, shoot: 0, armour: 6, will: 0, health: 1 },
            notes: ['Animal', 'Disease (TN8)'], rules: []
        },
        'giant-spider': {
            name: 'Giant Spider', xp: 2, page: 176,
            stats: { move: 6, fight: 0, shoot: 0, armour: 8, will: 0, health: 4 },
            notes: ['Animal', 'Poison'],
            rules: ['No movement penalty for rough ground or climbing.']
        },
        'gnoll-fighter': {
            name: 'Gnoll Fighter', xp: 3, page: 178,
            stats: { move: 6, fight: 2, shoot: 0, armour: 11, will: 0, health: 10 },
            notes: ['Hand Weapon', 'Light Armour'], rules: []
        },
        'gnoll-archer': {
            name: 'Gnoll Archer', xp: 3, page: 178,
            stats: { move: 6, fight: 1, shoot: 2, armour: 11, will: 0, health: 10 },
            notes: ['Dagger', 'Bow', 'Quiver', 'Light Armour'], rules: []
        },
        'gnoll-sergeant': {
            name: 'Gnoll Sergeant', xp: 3, page: 178,
            stats: { move: 6, fight: 3, shoot: 0, armour: 11, will: 0, health: 12 },
            notes: ['Two-Handed Weapon', 'Light Armour'], rules: []
        },
        'gnoll-shaman': {
            name: 'Gnoll Shaman', xp: 5, page: 178,
            stats: { move: 6, fight: 1, shoot: 0, armour: 11, will: 5, health: 12 },
            notes: ['Hand Weapon', 'Poison'],
            rules: ['Inspiring: all gnolls within 6” receive +2 Will.']
        },
        ogre: {
            name: 'Ogre', xp: 5, page: 180,
            stats: { move: 6, fight: 3, shoot: 0, armour: 12, will: 0, health: 14 },
            notes: ['Large', 'Two-Handed Weapon'], rules: []
        },
        'shadow-knight': {
            name: 'Shadow Knight', xp: 10, page: 180,
            stats: { move: 6, fight: 4, shoot: 0, armour: 12, will: 0, health: 14 },
            notes: ['Undead'],
            rules: ['Halve damage from non-magic weapons, rounding down.']
        },
        'swamp-zombie': {
            name: 'Swamp Zombie', xp: 2, page: 182,
            stats: { move: 4, fight: 0, shoot: 0, armour: 12, will: 0, health: 6 },
            notes: ['Undead', 'Amphibious'],
            rules: ['Makes no Swimming Rolls and suffers no movement penalty in water.']
        },
        troll: {
            name: 'Troll', xp: 8, page: 185,
            stats: { move: 4, fight: 4, shoot: 0, armour: 14, will: 2, health: 16 },
            notes: ['Large', 'Two-Handed Weapon'],
            rules: ['When placed, a natural 20 makes it two-headed; attackers count one fewer supporting figure.']
        },
        vulture: {
            name: 'Vulture', xp: 3, page: 185,
            stats: { move: 6, fight: 0, shoot: 0, armour: 14, will: 0, health: 4 },
            notes: ['Animal', 'Flying'], rules: []
        },
        zombie: {
            name: 'Zombie', xp: 2, page: 187,
            stats: { move: 4, fight: 0, shoot: 0, armour: 12, will: 0, health: 6 },
            notes: ['Undead'], rules: []
        }
    };

    const scenarios = {
        'starter-m1-s1': [
            { enemyId: 'zombie', contexts: ['setup', 'events', 'searches'] },
            { enemyId: 'giant-rat', contexts: ['setup', 'events', 'challenge'] }
        ],
        'starter-m1-s2': [
            { enemyId: 'giant-spider', contexts: ['setup', 'events', 'challenge'] },
            { enemyId: 'zombie', contexts: ['searches'] }
        ],
        'starter-m2-s1': [
            { enemyId: 'gnoll-fighter', contexts: ['setup', 'events'] },
            { enemyId: 'gnoll-archer', contexts: ['setup'] },
            { enemyId: 'gnoll-sergeant', contexts: ['setup'] },
            { enemyId: 'vulture', contexts: ['events'] },
            { enemyId: 'ogre', contexts: ['challenge'] }
        ],
        'starter-m2-s2': [
            { enemyId: 'gnoll-fighter', contexts: ['rooms'] },
            { enemyId: 'gnoll-archer', contexts: ['rooms'] },
            { enemyId: 'gnoll-sergeant', contexts: ['rooms', 'challenge'] },
            { enemyId: 'gnoll-shaman', contexts: ['rooms'] },
            { enemyId: 'flesh-golem', contexts: ['rooms'] }
        ],
        'starter-m2-s3': [
            { enemyId: 'shadow-knight', contexts: ['setup', 'challenge'] },
            { enemyId: 'gnoll-fighter', contexts: ['setup', 'challenge'] },
            { enemyId: 'gnoll-archer', contexts: ['setup'] }
        ],
        'starter-m3-s1': [
            { enemyId: 'giant-fly', contexts: ['setup', 'events', 'challenge'] }
        ],
        'starter-m3-s2': [
            { enemyId: 'swamp-zombie', contexts: ['setup', 'events', 'challenge'] },
            { enemyId: 'gnoll-fighter', contexts: ['events'] },
            { enemyId: 'gnoll-archer', contexts: ['events'] },
            { enemyId: 'giant-fly', contexts: ['events', 'challenge'] }
        ],
        'starter-m3-s3': [
            { enemyId: 'gnoll-fighter', contexts: ['events'] },
            { enemyId: 'gnoll-archer', contexts: ['events', 'challenge'] },
            { enemyId: 'gnoll-sergeant', contexts: ['events'] },
            { enemyId: 'zombie', contexts: ['events'] },
            { enemyId: 'giant-fly', contexts: ['events'] },
            { enemyId: 'troll', contexts: ['events'] },
            { enemyId: 'burrow-worm', contexts: ['events'] },
            { enemyId: 'giant-spider', contexts: ['events'] }
        ]
    };

    global.RangersScenarioEnemies = deepFreeze({
        catalogId: 'rosd-starter-scenario-enemies',
        catalogVersion: '1',
        title: 'Standard Mission Enemy Reference',
        source: 'Rangers of Shadow Deep: A Gathering of Heroes',
        profiles,
        scenarios
    });
})(globalThis);
