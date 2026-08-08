(function (global) {
    'use strict';

    function deepFreeze(value) {
        if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
        Object.values(value).forEach(deepFreeze);
        return Object.freeze(value);
    }

    const profiles = {
        'blood-bat': {
            name: 'Blood Bat', xp: 1, page: 172,
            stats: { move: 8, fight: 1, shoot: 0, armour: 12, will: 3, health: 1 },
            notes: ['Animal', 'Flying'], rules: []
        },
        'burrow-worm': {
            name: 'Burrow Worm', xp: 8, page: 172,
            stats: { move: 5, fight: 3, shoot: 0, armour: 10, will: 3, health: 14 },
            notes: ['Animal', 'Burrowing'],
            rules: ['Moves through solid terrain as though it were not there.']
        },
        cultist: {
            name: 'Cultist', xp: 3, page: 173,
            stats: { move: 6, fight: 2, shoot: 0, armour: 11, will: 2, health: 10 },
            notes: ['Hand Weapon', 'Light Armour'], rules: []
        },
        'cultist-leader': {
            name: 'Cultist Leader', xp: 5, page: 173,
            stats: { move: 5, fight: 4, shoot: 0, armour: 12, will: 6, health: 14 },
            notes: ['Hand Weapon', 'Shield', 'Light Armour', '+1 damage'],
            rules: ['Inspiring: cultists within 12” receive +2 Will.']
        },
        'flesh-golem': {
            name: 'Flesh Golem', xp: 5, page: 174,
            stats: { move: 5, fight: 4, shoot: 0, armour: 10, will: 0, health: 16 },
            notes: ['Undead', 'Horrific (TN8)'],
            rules: ['A hero moving into combat must pass Will (TN8) or stop 2” away and end its activation.']
        },
        ghoul: {
            name: 'Ghoul', xp: 3, page: 174,
            stats: { move: 6, fight: 2, shoot: 0, armour: 10, will: 2, health: 10 },
            notes: ['Undead'], rules: []
        },
        'ghoul-fiend': {
            name: 'Ghoul Fiend', xp: 4, page: 174,
            stats: { move: 6, fight: 3, shoot: 0, armour: 11, will: 6, health: 14 },
            notes: ['Undead'], rules: []
        },
        'ghoul-rotter': {
            name: 'Ghoul Rotter', xp: 2, page: 175,
            stats: { move: 6, fight: 1, shoot: 0, armour: 10, will: 0, health: 8 },
            notes: ['Undead', 'Disease (TN14)'], rules: []
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
        'giant-snake': {
            name: 'Giant Snake', xp: 3, page: 177,
            stats: { move: 5, fight: 2, shoot: 0, armour: 8, will: 0, health: 10 },
            notes: ['Animal', 'Amphibious (water snake)', 'Poison (viper)'], rules: []
        },
        'gnoll-beast-handler': {
            name: 'Gnoll Beast-handler', xp: 3, page: 178,
            stats: { move: 6, fight: 2, shoot: 0, armour: 11, will: 0, health: 10 },
            notes: ['Two-Handed Weapon', 'Light Armour'], rules: []
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
        greviks: {
            name: 'Greviks', xp: 10, page: 179,
            stats: { move: 6, fight: 4, shoot: 0, armour: 14, will: 3, health: 18 },
            notes: ['Two-Handed Weapon', 'Trekatis’s bodyguard'],
            rules: ['Stays within 1” of Trekatis, intercepts figures entering combat with him, and receives shooting attacks aimed at him while free.']
        },
        'grim-wolf': {
            name: 'Grim Wolf', xp: 2, page: 180,
            stats: { move: 8, fight: 3, shoot: 0, armour: 10, will: 0, health: 10 },
            notes: ['Animal'], rules: []
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
        'skeletal-knight': {
            name: 'Skeletal Knight', xp: 2, page: 181,
            stats: { move: 6, fight: 3, shoot: 0, armour: 13, will: 0, health: 1 },
            notes: ['Undead'], rules: []
        },
        'skeletal-ogre': {
            name: 'Skeletal Ogre', xp: 4, page: 181,
            stats: { move: 5, fight: 3, shoot: 0, armour: 11, will: 0, health: 4 },
            notes: ['Powerful (+2 damage)'], rules: []
        },
        skeleton: {
            name: 'Skeleton', xp: 1, page: 181,
            stats: { move: 6, fight: 1, shoot: 0, armour: 10, will: 0, health: 1 },
            notes: ['Undead'], rules: []
        },
        'spectral-horseman': {
            name: 'Spectral Horseman', xp: 10, page: 182,
            stats: { move: 6, fight: 4, shoot: 0, armour: 12, will: 10, health: 14 },
            notes: ['Undead', 'Flying', 'Semi-ethereal'],
            rules: [
                'Non-magic weapons deal half damage; it ignores terrain and pursues the visible hero with the highest Fight.',
                'A damaged target is treated as having no more than Armour 11.'
            ]
        },
        spectre: {
            name: 'Spectre', xp: 3, page: 182,
            stats: { move: 6, fight: 1, shoot: 0, armour: 10, will: 10, health: 10 },
            notes: ['Undead', 'Flying', 'Semi-ethereal'],
            rules: [
                'Ignores terrain and takes half damage from non-magic weapons.',
                'When destroyed, figures in combat test Will (TN12) or lose their next activation.'
            ]
        },
        'swamp-zombie': {
            name: 'Swamp Zombie', xp: 2, page: 182,
            stats: { move: 4, fight: 0, shoot: 0, armour: 12, will: 0, health: 6 },
            notes: ['Undead', 'Amphibious'],
            rules: ['Makes no Swimming Rolls and suffers no movement penalty in water.']
        },
        'temple-guardian': {
            name: 'Temple Guardian', xp: 3, page: 183,
            stats: { move: 6, fight: 2, shoot: 0, armour: 11, will: 2, health: 10 },
            notes: ['Two-Handed Weapon', 'Light Armour'], rules: []
        },
        'temple-guardian-archer': {
            name: 'Temple Guardian Archer', xp: 3, page: 183,
            stats: { move: 6, fight: 1, shoot: 1, armour: 11, will: 2, health: 10 },
            notes: ['Bow', 'Quiver', 'Hand Weapon', 'Light Armour'], rules: []
        },
        trekatis: {
            name: 'Trekatis', xp: 20, page: 184,
            stats: { move: 6, fight: 2, shoot: 0, armour: 12, will: 8, health: 16 },
            notes: ['Staff', 'Dark Robes of Protection', 'Spellcaster'],
            rules: ['A figure damaged by his staff tests Will (TN14); failure pushes it back 6” and removes its next activation.']
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
        warden: {
            name: 'Warden', xp: 5, page: 185,
            stats: { move: 6, fight: 4, shoot: 0, armour: 11, will: 4, health: 12 },
            notes: ['Two Hand Weapons', 'Light Armour'], rules: []
        },
        werewolf: {
            name: 'Werewolf', xp: 10, page: 186,
            stats: { move: 6, fight: 4, shoot: 0, armour: 12, will: 5, health: 18 },
            notes: ['Infection', 'Regeneration', '+2 damage', 'Expert Climber'],
            rules: [
                'Regains 2 lost Health whenever it activates and climbs without a movement penalty.',
                'Silver weapons gain +2 Fight and +2 damage against it.'
            ]
        },
        wolf: {
            name: 'Wolf', xp: 2, page: 186,
            stats: { move: 8, fight: 1, shoot: 0, armour: 10, will: 0, health: 6 },
            notes: ['Animal'], rules: []
        },
        'wounded-alladorean-soldier': {
            name: 'Wounded Alladorean Soldier', xp: null, page: 186,
            stats: { move: 5, fight: 1, shoot: 0, armour: 12, will: 0, health: 1 },
            notes: ['Potential event-controlled foe', 'One action per activation'], rules: []
        },
        zombie: {
            name: 'Zombie', xp: 2, page: 187,
            stats: { move: 4, fight: 0, shoot: 0, armour: 12, will: 0, health: 6 },
            notes: ['Undead'], rules: []
        },
        bear: {
            name: 'Bear', xp: 4, page: 64, reference: 'Animal Companions',
            stats: { move: 6, fight: 4, shoot: 0, armour: 12, will: 0, health: 14 },
            notes: ['Animal', 'Strong (+2 damage)', 'Strength +5'], rules: []
        },
        boar: {
            name: 'Boar', xp: 3, page: 65, reference: 'Animal Companions',
            stats: { move: 6, fight: 2, shoot: 0, armour: 12, will: 2, health: 8 },
            notes: ['Animal', 'Strength +3'],
            rules: ['Gains +2 Fight when it moves into combat and attacks in the same activation.']
        },
        lion: {
            name: 'Lion', xp: null, page: 65, reference: 'Animal Companions',
            stats: { move: 8, fight: 3, shoot: 0, armour: 10, will: 2, health: 10 },
            notes: ['Animal', 'Acrobatics +3', 'Climb +5', 'Stealth +3', 'Track +3'], rules: []
        },
        tiger: {
            name: 'Tiger', xp: 4, page: 67, reference: 'Animal Companions',
            stats: { move: 6, fight: 4, shoot: 0, armour: 10, will: 1, health: 14 },
            notes: ['Animal', 'Strong (+2 damage)', 'Acrobatics +2', 'Stealth +3', 'Swim +5'], rules: []
        },
        gorbin: {
            name: 'Gorbin (wounded and unarmed)', xp: null, page: 146, reference: 'Incinerator',
            stats: { move: 5, fight: 1, shoot: 0, armour: 12, will: 0, health: 8 },
            notes: ['Large', 'Wounded', 'Unarmed', 'Strength +5'],
            rules: ['Giving Gorbin a two-handed weapon restores his normal Fight +3 and +2 weapon damage.']
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
        ],
        'agoh-blood-moon-s1': [
            { enemyId: 'werewolf', contexts: ['events', 'searches'] },
            { enemyId: 'wolf', contexts: ['setup', 'events'] },
            { enemyId: 'grim-wolf', contexts: ['events', 'challenge'] },
            { enemyId: 'giant-rat', contexts: ['setup', 'events', 'challenge'] },
            { enemyId: 'giant-fly', contexts: ['setup', 'events'] },
            { enemyId: 'giant-snake', contexts: ['challenge'] },
            { enemyId: 'swamp-zombie', contexts: ['events'] }
        ],
        'agoh-menagerie-s1': [
            { enemyId: 'bear', contexts: ['setup', 'events'] },
            { enemyId: 'gnoll-beast-handler', contexts: ['setup', 'events', 'challenge'] },
            { enemyId: 'temple-guardian-archer', contexts: ['setup', 'events', 'challenge'] },
            { enemyId: 'warden', contexts: ['setup'] },
            { enemyId: 'tiger', contexts: ['events', 'challenge'] },
            { enemyId: 'boar', contexts: ['events'] },
            { enemyId: 'gnoll-sergeant', contexts: ['events'] },
            { enemyId: 'gnoll-archer', contexts: ['events', 'challenge'] },
            { enemyId: 'gnoll-fighter', contexts: ['events', 'challenge'] }
        ],
        'agoh-menagerie-s2': [
            { enemyId: 'temple-guardian', contexts: ['setup', 'challenge'] },
            { enemyId: 'gnoll-beast-handler', contexts: ['setup', 'events'] },
            { enemyId: 'temple-guardian-archer', contexts: ['setup', 'events', 'challenge'] },
            { enemyId: 'bear', contexts: ['events'] },
            { enemyId: 'tiger', contexts: ['events'] },
            { enemyId: 'boar', contexts: ['events'] },
            { enemyId: 'giant-snake', contexts: ['events'] },
            { enemyId: 'giant-fly', contexts: ['events'] },
            { enemyId: 'blood-bat', contexts: ['events'] },
            { enemyId: 'warden', contexts: ['events'] },
            { enemyId: 'giant-rat', contexts: ['searches'] },
            { enemyId: 'lion', contexts: ['challenge'] }
        ],
        'agoh-temple-s1': [
            { enemyId: 'temple-guardian', contexts: ['setup', 'events', 'challenge', 'notes'] },
            { enemyId: 'giant-spider', contexts: ['notes'] },
            { enemyId: 'ghoul', contexts: ['notes'] }
        ],
        'agoh-temple-s2': [
            { enemyId: 'ghoul', contexts: ['setup', 'events', 'challenge'] },
            { enemyId: 'ghoul-rotter', contexts: ['events'] },
            { enemyId: 'ghoul-fiend', contexts: ['events'] }
        ],
        'agoh-temple-s3': [
            { enemyId: 'cultist', contexts: ['setup', 'challenge'] },
            { enemyId: 'skeleton', contexts: ['events'] },
            { enemyId: 'temple-guardian', contexts: ['events'] },
            { enemyId: 'skeletal-knight', contexts: ['events'] },
            { enemyId: 'shadow-knight', contexts: ['events'] }
        ],
        'agoh-temple-s4': [
            { enemyId: 'temple-guardian-archer', contexts: ['setup', 'challenge'] },
            { enemyId: 'trekatis', contexts: ['setup'] },
            { enemyId: 'greviks', contexts: ['setup'] },
            { enemyId: 'skeleton', contexts: ['notes'] },
            { enemyId: 'blood-bat', contexts: ['notes'] }
        ],
        'agoh-ghost-stone-s1': [
            { enemyId: 'spectre', contexts: ['setup', 'events', 'challenge'] },
            { enemyId: 'gnoll-sergeant', contexts: ['events'] },
            { enemyId: 'gnoll-archer', contexts: ['events'] },
            { enemyId: 'wounded-alladorean-soldier', contexts: ['setup', 'events'] }
        ],
        'agoh-ghost-stone-s2': [
            { enemyId: 'gnoll-archer', contexts: ['setup', 'events', 'rooms'] },
            { enemyId: 'gnoll-shaman', contexts: ['rooms'] },
            { enemyId: 'cultist-leader', contexts: ['rooms'] },
            { enemyId: 'cultist', contexts: ['rooms', 'challenge'] },
            { enemyId: 'gnoll-sergeant', contexts: ['events', 'rooms'] },
            { enemyId: 'gnoll-fighter', contexts: ['events'] },
            { enemyId: 'vulture', contexts: ['events'] },
            { enemyId: 'spectre', contexts: ['events'] }
        ],
        'agoh-ghost-stone-s3': [
            { enemyId: 'gnoll-fighter', contexts: ['setup', 'events'] },
            { enemyId: 'cultist', contexts: ['setup', 'events'] },
            { enemyId: 'ogre', contexts: ['events'] },
            { enemyId: 'gnoll-archer', contexts: ['events'] },
            { enemyId: 'gnoll-sergeant', contexts: ['events'] },
            { enemyId: 'skeletal-knight', contexts: ['events'] },
            { enemyId: 'cultist-leader', contexts: ['events'] },
            { enemyId: 'spectre', contexts: ['events'] },
            { enemyId: 'skeleton', contexts: ['challenge'] },
            { enemyId: 'spectral-horseman', contexts: ['events'] },
            { enemyId: 'troll', contexts: ['events'] },
            { enemyId: 'giant-fly', contexts: ['events'] }
        ],
        'agoh-ghost-stone-s4': [
            { enemyId: 'spectral-horseman', contexts: ['setup', 'events'] },
            { enemyId: 'spectre', contexts: ['setup', 'events'] },
            { enemyId: 'cultist-leader', contexts: ['setup', 'events'] },
            { enemyId: 'cultist', contexts: ['setup', 'events'] },
            { enemyId: 'werewolf', contexts: ['setup', 'events'] },
            { enemyId: 'gnoll-shaman', contexts: ['setup'] },
            { enemyId: 'gnoll-sergeant', contexts: ['setup', 'events'] },
            { enemyId: 'gnoll-archer', contexts: ['setup'] },
            { enemyId: 'troll', contexts: ['events'] },
            { enemyId: 'gnoll-fighter', contexts: ['events'] },
            { enemyId: 'skeleton', contexts: ['challenge'] },
            { enemyId: 'ogre', contexts: ['events'] },
            { enemyId: 'giant-fly', contexts: ['events'] }
        ],
        'agoh-incinerator-s1': [
            { enemyId: 'skeleton', contexts: ['setup', 'events'] },
            { enemyId: 'temple-guardian', contexts: ['events'] },
            { enemyId: 'temple-guardian-archer', contexts: ['events'] },
            { enemyId: 'giant-rat', contexts: ['events', 'challenge'] },
            { enemyId: 'giant-fly', contexts: ['events'] },
            { enemyId: 'skeletal-ogre', contexts: ['events', 'challenge'] }
        ],
        'agoh-incinerator-s2': [
            { enemyId: 'temple-guardian', contexts: ['setup', 'challenge'] },
            { enemyId: 'gnoll-archer', contexts: ['setup'] },
            { enemyId: 'gnoll-sergeant', contexts: ['challenge'] },
            { enemyId: 'gorbin', contexts: ['rooms'] },
            { enemyId: 'warden', contexts: ['rooms'] },
            { enemyId: 'giant-fly', contexts: ['events', 'rooms'] },
            { enemyId: 'skeletal-ogre', contexts: ['rooms'] },
            { enemyId: 'skeleton', contexts: ['events'] },
            { enemyId: 'skeletal-knight', contexts: ['challenge'] }
        ]
    };

    global.RangersScenarioEnemies = deepFreeze({
        catalogId: 'rosd-built-in-scenario-enemies',
        catalogVersion: '1',
        title: 'Built-in Mission Enemy Reference',
        source: 'Rangers of Shadow Deep: Standard Edition and A Gathering of Heroes',
        profiles,
        scenarios
    });
})(globalThis);
