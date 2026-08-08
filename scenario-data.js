(function (global) {
    'use strict';

    function deepFreeze(value) {
        if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
        Object.values(value).forEach(deepFreeze);
        return Object.freeze(value);
    }

    const missions = [
        {
            id: 'starter-m1',
            number: 1,
            title: 'The Missing',
            scenarios: [
                {
                    id: 'starter-m1-s1',
                    number: 1,
                    title: 'The Deserted Village',
                    page: 56,
                    turnLimit: 8,
                    brief: 'Search the abandoned village for Aventine and useful clues before time runs out.',
                    eventCue: 'Draw one Event Card in every Event Phase.',
                    reminders: [
                        'Choose one hero for the opening Perception test.',
                        'Clue results cannot repeat during this scenario.'
                    ]
                },
                {
                    id: 'starter-m1-s2',
                    number: 2,
                    title: 'The Infected Trees',
                    page: 59,
                    turnLimit: 10,
                    brief: 'Burn the nest trees and search the web cocoons for survivors.',
                    eventCue: 'Draw one Event Card in every Event Phase.',
                    reminders: [
                        'Searching a cocoon and burning a nest tree each cost an action.',
                        'The spiders always sense the heroes when determining movement.'
                    ]
                }
            ]
        },
        {
            id: 'starter-m2',
            number: 2,
            title: 'The Beacon Tower',
            scenarios: [
                {
                    id: 'starter-m2-s1',
                    number: 1,
                    title: 'The Bridge Guards',
                    page: 62,
                    turnLimit: 10,
                    brief: 'Cross the Enthel River and break through the bridge guard while preserving surprise.',
                    eventCue: 'Draw one Event Card on odd-numbered turns.',
                    reminders: [
                        'Choose one hero for the opening Navigation test.',
                        'Track whether the alarm has been raised.'
                    ]
                },
                {
                    id: 'starter-m2-s2',
                    number: 2,
                    title: 'Tor Varden, The Lower Level',
                    page: 65,
                    turnLimit: null,
                    brief: 'Clear the tower’s three lower rooms, open every door, and rescue what you can.',
                    eventCue: 'Draw a Room Card whenever a new room is opened.',
                    reminders: [
                        'Resolve the opening Stealth and Pick Lock tests.',
                        'The rest of the company enters at the start of turn 2.'
                    ]
                },
                {
                    id: 'starter-m2-s3',
                    number: 3,
                    title: 'Tor Varden, The Upper Level',
                    page: 68,
                    turnLimit: null,
                    brief: 'Retake the upper level, protect the captive, and stop the enemy beacon.',
                    eventCue: 'Resolve the fixed scenario events on turns 2 and 4.',
                    reminders: [
                        'After turn 5, the captive and woodpile are in immediate danger.',
                        'There is no Target Point in this scenario.'
                    ]
                }
            ]
        },
        {
            id: 'starter-m3',
            number: 3,
            title: 'Descent into Darkness',
            scenarios: [
                {
                    id: 'starter-m3-s1',
                    number: 1,
                    title: 'The Broken Stairs',
                    page: 71,
                    turnLimit: 10,
                    brief: 'Descend the broken stairs, seal the fly holes, and leave by the lower edge.',
                    eventCue: 'Draw one Event Card in every Event Phase.',
                    reminders: [
                        'Extra movement and lost combats can trigger dangerous falls.',
                        'The Target Point is where the stairs meet the lower edge.'
                    ]
                },
                {
                    id: 'starter-m3-s2',
                    number: 2,
                    title: 'Swampland',
                    page: 73,
                    turnLimit: 10,
                    brief: 'Cross the swampland, investigate the clues, and exit opposite the stairs.',
                    eventCue: 'Draw one Event Card in every Event Phase.',
                    reminders: [
                        'Each figure begins with a Will or Survival test against the fumes.',
                        'There is no Target Point in this scenario.'
                    ]
                },
                {
                    id: 'starter-m3-s3',
                    number: 3,
                    title: 'The Last Stand',
                    page: 76,
                    turnLimit: 12,
                    brief: 'Hold the ruined farmhouse and keep as many Lorenthian survivors alive as possible.',
                    eventCue: 'Draw one Event Card every turn except turn 12.',
                    reminders: [
                        'Draw three Event Cards immediately after set-up.',
                        'Lorenthian survivors reduced to 0 Health are killed outright.'
                    ]
                }
            ]
        }
    ];

    global.RangersScenarios = deepFreeze({
        catalogId: 'rosd-deluxe-starter',
        catalogVersion: '1',
        title: 'Standard Missions',
        source: 'Rangers of Shadow Deep Deluxe Edition',
        missions
    });
})(globalThis);
