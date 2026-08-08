(function (global) {
    'use strict';

    function deepFreeze(value) {
        if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
        Object.values(value).forEach(deepFreeze);
        return Object.freeze(value);
    }

    const missions = [
        {
            id: 'starter-m1', number: 1, title: 'The Missing', sourceLabel: 'Standard Edition',
            progressGroup: 'standard-missions', progressTitle: 'Standard Missions',
            scenarios: [
                {
                    id: 'starter-m1-s1', number: 1, title: 'The Deserted Village', page: 56,
                    turnLimit: 8,
                    brief: 'Search the abandoned village for Aventine and useful clues before time runs out.',
                    eventCue: 'Draw one Event Card in every Event Phase.',
                    eventSchedule: { kind: 'every-turn', except: [] },
                    reminders: [
                        'Choose one hero for the opening Perception test.',
                        'Clue results cannot repeat during this scenario.'
                    ]
                },
                {
                    id: 'starter-m1-s2', number: 2, title: 'The Infected Trees', page: 59,
                    turnLimit: 10,
                    brief: 'Burn the nest trees and search the web cocoons for survivors.',
                    eventCue: 'Draw one Event Card in every Event Phase.',
                    eventSchedule: { kind: 'every-turn', except: [] },
                    reminders: [
                        'Searching a cocoon and burning a nest tree each cost an action.',
                        'The spiders always sense the heroes when determining movement.'
                    ]
                }
            ]
        },
        {
            id: 'starter-m2', number: 2, title: 'The Beacon Tower', sourceLabel: 'Standard Edition',
            progressGroup: 'standard-missions', progressTitle: 'Standard Missions',
            scenarios: [
                {
                    id: 'starter-m2-s1', number: 1, title: 'The Bridge Guards', page: 62,
                    turnLimit: 10,
                    brief: 'Cross the Enthel River and break through the bridge guard while preserving surprise.',
                    eventCue: 'Draw one Event Card on odd-numbered turns.',
                    eventSchedule: { kind: 'odd-turns' },
                    reminders: [
                        'Choose one hero for the opening Navigation test.',
                        'Track whether the alarm has been raised.'
                    ]
                },
                {
                    id: 'starter-m2-s2', number: 2, title: 'Tor Varden, The Lower Level', page: 65,
                    turnLimit: null,
                    brief: 'Clear the tower’s three lower rooms, open every door, and rescue what you can.',
                    eventCue: 'Draw a Room Card whenever a new room is opened.',
                    eventSchedule: { kind: 'room-triggered' },
                    reminders: [
                        'Resolve the opening Stealth and Pick Lock tests.',
                        'The rest of the company enters at the start of turn 2.'
                    ]
                },
                {
                    id: 'starter-m2-s3', number: 3, title: 'Tor Varden, The Upper Level', page: 68,
                    turnLimit: null,
                    brief: 'Retake the upper level, protect the captive, and stop the enemy beacon.',
                    eventCue: 'Resolve the fixed scenario events on turns 2 and 4.',
                    eventSchedule: { kind: 'fixed-turns', turns: [2, 4] },
                    reminders: [
                        'After turn 5, the captive and woodpile are in immediate danger.',
                        'There is no Target Point in this scenario.'
                    ]
                }
            ]
        },
        {
            id: 'starter-m3', number: 3, title: 'Descent into Darkness', sourceLabel: 'Standard Edition',
            progressGroup: 'standard-missions', progressTitle: 'Standard Missions',
            scenarios: [
                {
                    id: 'starter-m3-s1', number: 1, title: 'The Broken Stairs', page: 71,
                    turnLimit: 10,
                    brief: 'Descend the broken stairs, seal the fly holes, and leave by the lower edge.',
                    eventCue: 'Draw one Event Card in every Event Phase.',
                    eventSchedule: { kind: 'every-turn', except: [] },
                    reminders: [
                        'Extra movement and lost combats can trigger dangerous falls.',
                        'The Target Point is where the stairs meet the lower edge.'
                    ]
                },
                {
                    id: 'starter-m3-s2', number: 2, title: 'Swampland', page: 73,
                    turnLimit: 10,
                    brief: 'Cross the swampland, investigate the clues, and exit opposite the stairs.',
                    eventCue: 'Draw one Event Card in every Event Phase.',
                    eventSchedule: { kind: 'every-turn', except: [] },
                    reminders: [
                        'Each figure begins with a Will or Survival test against the fumes.',
                        'There is no Target Point in this scenario.'
                    ]
                },
                {
                    id: 'starter-m3-s3', number: 3, title: 'The Last Stand', page: 76,
                    turnLimit: 12,
                    brief: 'Hold the ruined farmhouse and keep as many Lorenthian survivors alive as possible.',
                    eventCue: 'Draw one Event Card every turn except turn 12.',
                    eventSchedule: { kind: 'every-turn', except: [12] },
                    reminders: [
                        'Draw three Event Cards immediately after set-up.',
                        'Lorenthian survivors reduced to 0 Health are killed outright.'
                    ]
                }
            ]
        },
        {
            id: 'agoh-m4', number: 4, title: 'Blood Moon', sourceLabel: 'A Gathering of Heroes',
            progressTitle: 'Blood Moon',
            scenarios: [
                {
                    id: 'agoh-blood-moon-s1', number: 1, title: 'Claw and Fang', page: 72,
                    turnLimit: null,
                    brief: 'Investigate the dark village, reveal the hidden werewolf, rescue survivors, and kill both beasts.',
                    eventCue: 'Draw one Event Card in every Event Phase.',
                    eventSchedule: { kind: 'every-turn', except: [] },
                    reminders: [
                        'Track one shared Investigation Score; reaching 10 reveals the named auxiliary as a werewolf.',
                        'Night limits line of sight to 14”; creatures distinguish between the manor and outside.'
                    ]
                }
            ]
        },
        {
            id: 'agoh-m6', number: 6, title: 'Menagerie', sourceLabel: 'A Gathering of Heroes',
            progressTitle: 'Menagerie',
            scenarios: [
                {
                    id: 'agoh-menagerie-s1', number: 1, title: 'The Unintended Ambush', page: 111,
                    turnLimit: null,
                    brief: 'Wake the scattered company, survive the chaotic ambush, and investigate the clue before it disappears.',
                    eventCue: 'Draw one Event Card each turn through turn 8; the scenario may continue afterwards.',
                    eventSchedule: {
                        kind: 'every-turn', through: 8,
                        quietText: 'No more Event Cards are drawn after turn 8.'
                    },
                    reminders: [
                        'Most heroes start lying down and must pass the wake-up Will test when they activate.',
                        'Remove the clue at the end of turn 5; after turn 8, clear the table to finish.'
                    ]
                },
                {
                    id: 'agoh-menagerie-s2', number: 2, title: 'Counter Ambush', page: 114,
                    turnLimit: 10,
                    brief: 'Strike the convoy, open as many animal wagons as possible, and stop them escaping the table.',
                    eventCue: 'Draw one Event Card in every Event Phase.',
                    eventSchedule: { kind: 'every-turn', except: [] },
                    reminders: [
                        'Resolve the opening Track and chained Stealth tests before the first turn.',
                        'Driven wagons move 4” towards the nearest edge; opening one uses the separate wagon deck.'
                    ]
                }
            ]
        },
        {
            id: 'agoh-m7', number: 7, title: 'Temple of Madness', sourceLabel: 'A Gathering of Heroes',
            progressTitle: 'Temple of Madness',
            scenarios: [
                {
                    id: 'agoh-temple-s1', number: 1, title: 'The Laughing Columns', page: 84,
                    turnLimit: null,
                    brief: 'Decode the shifting columns, reveal a passage, and escape deeper into the temple.',
                    eventCue: 'Place one new Temple Guardian at the end of every turn.',
                    eventSchedule: {
                        kind: 'every-turn',
                        dueText: 'Reinforcement due — place one Temple Guardian at the end of this turn.'
                    },
                    reminders: [
                        'Each hero’s first activation begins with the confusion Will test, modified by Navigation.',
                        'Each column can be engaged once; the second matching d10 result directs you to a note.'
                    ]
                },
                {
                    id: 'agoh-temple-s2', number: 2, title: 'Pit of Ghouls', page: 87,
                    turnLimit: null,
                    brief: 'Cross the ghoul pit, turn all four metal wheels, open the far door, and escape.',
                    eventCue: 'Roll on the Ghoul Table at the end of every turn.',
                    eventSchedule: {
                        kind: 'every-turn',
                        dueText: 'Encounter due — roll on the Ghoul Table at the end of this turn.'
                    },
                    reminders: [
                        'Each wheel needs a Strength test and its note may close one of the four trapdoors.',
                        'Ghouls move only 3” on turn 1 and otherwise pursue heroes on their own level.'
                    ]
                },
                {
                    id: 'agoh-temple-s3', number: 3, title: 'The Incantation Lock', page: 90,
                    turnLimit: null,
                    brief: 'Light the four braziers, discover the command sequence, and open the incantation-locked exit.',
                    eventCue: 'Roll on the Incantation Lock Encounter Table at the end of every turn.',
                    eventSchedule: {
                        kind: 'every-turn',
                        dueText: 'Encounter due — roll on the Incantation Lock table at the end of this turn.'
                    },
                    reminders: [
                        'Resolve the pre-scenario Survival or Perception test and the opening Stealth test.',
                        'Points of Interest A and B provide clues to the three-number command sequence.'
                    ]
                },
                {
                    id: 'agoh-temple-s4', number: 4, title: 'The Mirror Enduring', page: 92,
                    turnLimit: null,
                    brief: 'Brave the wall of fire, bring down the chain net, and kill Trekatis to break the mirror’s power.',
                    eventCue: 'Resolve the numbered scenario note at the end of turns 1–8.',
                    eventSchedule: {
                        kind: 'fixed-turns', turns: [1, 2, 3, 4, 5, 6, 7, 8],
                        dueText: 'Scenario note due — resolve the note for turn {turn}.'
                    },
                    reminders: [
                        'Crossing the fire requires Will; each top corner of the net must be cut by Climb or shooting.',
                        'The scenario ends immediately when Trekatis dies; otherwise it continues until every hero falls.'
                    ]
                }
            ]
        },
        {
            id: 'agoh-m8', number: 8, title: 'Ghost Stone', sourceLabel: 'A Gathering of Heroes',
            progressTitle: 'Ghost Stone',
            scenarios: [
                {
                    id: 'agoh-ghost-stone-s1', number: 1, title: 'Rear Guard', page: 123,
                    turnLimit: 9,
                    brief: 'Hold the rear guard, shepherd wounded soldiers to safety, and record how many escape.',
                    eventCue: 'Draw one Event Card in every Event Phase.',
                    eventSchedule: { kind: 'every-turn', except: [] },
                    reminders: [
                        'Eight spectres enter in the first Creature Phase and begin activating normally on turn 2.',
                        'Leadership can move each safe wounded soldier once per turn; their escape total matters later.'
                    ]
                },
                {
                    id: 'agoh-ghost-stone-s2', number: 2, title: 'The Gnoll Encampment', page: 127,
                    turnLimit: null,
                    brief: 'Exploit surprise, break into the command tent, defeat its leaders, and recover their intelligence.',
                    eventCue: 'No Event Cards on turns 1–2; draw one each turn from turn 3 until the deck is exhausted.',
                    eventSchedule: {
                        kind: 'every-turn', from: 3,
                        quietText: 'No Event Card is drawn during the first two turns.'
                    },
                    reminders: [
                        'Resolve every hero’s Survival test and the party’s Traps test before set-up is complete.',
                        'Raising the alarm ends Stealth control and the +4 surprise attack bonus; record scrolls, map, and mask.'
                    ]
                },
                {
                    id: 'agoh-ghost-stone-s3', number: 3, title: 'The Distraction', page: 132,
                    turnLimit: null,
                    brief: 'Infiltrate the supply depot, burn or steal its stores, and escape before the camp closes in.',
                    eventCue: 'On turns 1–2 draw only after the alarm; from turn 3 draw every turn.',
                    eventSchedule: {
                        kind: 'conditional-from', from: 3,
                        beforeText: 'Conditional — draw this turn only if the alarm has been raised.',
                        dueText: 'Event due — draw one Event Card at the end of this turn.'
                    },
                    reminders: [
                        'The heroes keep +4 to attacks until the alarm is raised; the river has separate line-of-sight rules.',
                        'Record how many supply piles burn or leave by boat; that total sets Scenario 4’s first event turn.'
                    ]
                },
                {
                    id: 'agoh-ghost-stone-s4', number: 4, title: 'Destroy the Stone', page: 137,
                    turnLimit: null,
                    brief: 'Escort Nesra to the Ghost Stone, protect her detonation attempt, and get clear of the blast.',
                    eventCue: 'The first event turn depends on supplies destroyed in Scenario 3; draw every turn thereafter.',
                    eventSchedule: {
                        kind: 'manual',
                        text: 'Campaign-dependent — use the Scenario 3 supply total to find the first event turn, then draw every turn.'
                    },
                    reminders: [
                        'Nesra tests Will beside the stone, with bonuses from earlier discoveries and the gnoll shaman’s death.',
                        'Choose a 1–3 turn detonation delay; monster kills award no XP in this scenario.'
                    ]
                }
            ]
        },
        {
            id: 'agoh-m9', number: 9, title: 'Incinerator', sourceLabel: 'A Gathering of Heroes',
            progressTitle: 'Incinerator',
            scenarios: [
                {
                    id: 'agoh-incinerator-s1', number: 1, title: 'Fire Drop', page: 147,
                    turnLimit: null,
                    brief: 'Outrun the collapsing floor, open the high exit, and escape the lava chamber alive.',
                    eventCue: 'Draw one Event Card every turn until the deck is exhausted.',
                    eventSchedule: { kind: 'every-turn', except: [] },
                    reminders: [
                        'Each event removes an additional printed distance of floor from the player edge.',
                        'The next scenario starts immediately at current Health; surviving figures regain abilities but do not heal.'
                    ]
                },
                {
                    id: 'agoh-incinerator-s2', number: 2, title: 'Prison Break', page: 151,
                    turnLimit: null,
                    brief: 'Search the doorway deck, survive the prison guards, find the exit, and break free.',
                    eventCue: 'Skip the first Event Phase, then draw every turn until the deck is exhausted.',
                    eventSchedule: {
                        kind: 'every-turn', from: 2,
                        quietText: 'No Event Card on turn 1 unless the Challenge Level overrides this.'
                    },
                    reminders: [
                        'Evil creatures take no actions on turn 1; opened doors resolve through the separate doorway deck.',
                        'Gorbin may begin hostile but repeated Leadership tests can recruit him during the scenario.'
                    ]
                }
            ]
        }
    ];

    global.RangersScenarios = deepFreeze({
        catalogId: 'rosd-built-in-scenarios',
        catalogVersion: '1',
        title: 'Built-in Missions',
        source: 'Rangers of Shadow Deep: Standard Edition and A Gathering of Heroes',
        missions
    });
})(globalThis);
