(function (global) {
    'use strict';

    function deepFreeze(value) {
        if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
        Object.values(value).forEach(deepFreeze);
        return Object.freeze(value);
    }

    const ABILITY_LIBRARY = {
        heroic: {
            "Blend into the Shadows": "This ability may be used if an evil figure is about to make a move that would take it into combat with the ranger. Instead, determine the evil figure's action as though the ranger were not on the table.",
            "Call to Action": "This ability may be used whenever the ranger activates. The ranger may activate one more companion in the Ranger phase than is normally allowed. (So, if the ranger can normally activate 0 companions in the Ranger Phase, he may activate 1 instead).",
            "Dash": "The ranger may use this ability when he is activated. For the rest of the turn, he receives +2 Move. Alternatively, the ranger may use a move action to leap up to his Move distance in any direction, including vertically.",
            "Deadly Shot": "The ranger may use this ability if he has rolled a natural 18 or 19 during a shooting action. Treat this roll as a Critical Hit.",
            "Deadly Strike": "The ranger may use this ability if he has rolled a natural 18 or 19 during a fight. Treat this roll as a Critical Hit.",
            "Distraction": "The ranger may use this ability whenever an evil creature is called upon to make either a random move or a move towards the Target Point. The player may instead move this creature anywhere he wishes following the standard rules for movement, provided this move does not cause the creature direct harm or force it to make Swimming Rolls.",
            "Dive for Cover": "The ranger may add +10 to his Fight Roll when rolling against a shooting attack. He must declare he is using this ability before he rolls.",
            "Eldritch Recall": "This ability can be used at any time. The figure regains the use of any one spell that it has already cast during the scenario.",
            "Enhanced Power": "This ability may be used any time a figure casts a spell that generates a shooting attack. For each shooting attack generated, the figure may roll three dice for the shooting attack and pick the best one. The player must decide to use this ability before any dice are rolled.",
            "Evade": "The ranger may use this ability if he activates while in combat. The ranger may make a free 1\" move to leave the combat. No figure may force combat during this move. After this move, the ranger completes his activation as normal.",
            "Focus": "The ranger may add +8 to any one Skill Roll. He must declare he is using this ability before he rolls.",
            "Frenzied Attack": "The ranger may add +5 to one Fight Roll. He must declare he is using this ability before he rolls.",
            "Halt Undead": "All undead creatures within 10\" and line of sight of the ranger must make a Will Roll (TN20). If they fail, they lose their next activation.",
            "Hand of Fate": "The ranger may re-roll one die.",
            "Inner Strength": "The ranger may add +5 to one Will Roll. This ability can be used after the roll has been made.",
            "Parry": "This ability may be used in combat after a ranger and his opponent have made their Fight Rolls. The ranger may add +10 to his roll. If he wins the combat, however, he does no damage. He may step back or push his opponent back as normal.",
            "Powerful Blow": "The hero may add +3 damage to any hand-to-hand attack that has already dealt at least 1 point of damage.",
            "Quick Cast": "A figure that activates and has two or more actions may use this ability. During this activation it may use two actions to cast Spells. This overrides the normal rules that only one Spell may be cast during a figure's activation, and that one action must be movement.",
            "Roll with the Punch": "This ability may be used if a ranger loses a fight in hand-to-hand combat. Halve the amount of damage taken by the ranger, rounding up (e.g. if the ranger loses the combat and would suffer 7 points of damage, he suffers 4 instead).",
            "Shove": "If the ranger wins in hand-to-hand combat, he may choose to push his opponent back up to 4\" instead of the normal 1\".",
            "Split Cast": "This ability may be used any time a figure casts a spell that has a specific target figure or target point. The caster may choose two different targets for the Spell, resolving the full effect of the Spell on both targets.",
            "Steady Aim": "The hero may add +5 Shoot for one Shooting Roll. This must be declared before the roll is made."
        },
        archetypeHeroic: {
            "Flashing Blade": {
                desc: "Use when this figure activates while in combat. It immediately makes a free attack against one figure in that combat, then takes its normal actions.",
                archetypes: ["Red Hawk Knight", "River Shark", "Wasteland Firesword"]
            },
            "Quick Strike": {
                desc: "Use when this figure forces combat with an enemy. It immediately attacks that enemy as a free action.",
                archetypes: ["Red Hawk Knight"]
            },
            "Tumble": {
                desc: "During a move action, nominate one enemy. That enemy cannot force combat during this move if the hero finishes at least 1\" away from it.",
                archetypes: ["River Shark"]
            },
            "Double Shot": {
                desc: "Use during a shoot action to attack two different legal targets that are within 6\" of one another.",
                archetypes: ["Varakian Archer"]
            },
            "Fire Shot": {
                desc: "Use after a shooting attack damages its target. The arrow deals 5 additional points of magic damage.",
                archetypes: ["Varakian Archer"]
            },
            "Smoke Shot": {
                desc: "Use during a shoot action to place a 3\" smoke cloud at a chosen point, or after hitting to centre it on the target while resolving normal damage. Smoke blocks line of sight but not movement; at the end of each turn, it dissipates on a roll of 1–2.",
                archetypes: ["Varakian Archer"]
            },
            "Whirling Death": {
                desc: "Use when activating in combat with more than one enemy. Spend one action to attack every enemy in that combat, in any order; neither side receives supporting-figure bonuses.",
                archetypes: ["Wasteland Firesword"]
            },
            "Sneak Attack": {
                desc: "Use if this figure began the turn Disguised as the Enemy. It gains +2 to all attacks for that turn.",
                archetypes: ["Shadow Deep Survivor / Deserter"]
            }
        },
        spells: {
            "Amphibious": "The target of this spell automatically passes all Swimming Rolls for the rest of the scenario.",
            "Armour": "The target of this spell receives +2 Armour for the rest of the scenario. A figure can only receive the benefits of one Armour spell at one time.",
            "Awareness": "The caster may immediately cast this spell anytime he is called upon to make a Perception Skill Roll. It can be used either before or after a scenario. The caster automatically passes the Perception Roll.",
            "Burning Light": "Make a +3 attack against all undead creatures within 8\" and line of sight of the caster.",
            "Burning Mark": "The caster may place a glowing rune anywhere within 6\". As soon as any evil creature moves within 2\" of this rune, it explodes. All evil creatures within 2\" of the rune suffer a +5 magic shooting attack.",
            "Caltrops": "Creates a 2\" diameter circle of caltrops. Any figure moving through this circle suffers 2 points of damage and must make a Will Roll (TN12). If it fails, its activation ends immediately. Undead creatures are immune to this damage.",
            "Compass": "The caster may immediately cast this spell anytime he is called upon to make a Navigation Skill Roll. It can be used either before or after a scenario. The caster automatically passes the Navigation Roll.",
            "Enchanted Steel": "The caster imbues one melee weapon with magic power. For the rest of the scenario, the weapon counts as a magic weapon with +1 Fight.",
            "Fireball": "Pick a point within line of sight. All figures within 2\" of that point suffer a +3 shooting attack.",
            "Glow": "For the rest of the game, all shooting attacks against the target of this spell are at +3.",
            "Heal": "This spell may target any figure within 6\" including the caster. The target figure regains up to 5 points of lost Health.",
            "Hold Creature": "The target creature must make an immediate Will Roll (TN16). If it fails, it may not force combat for the remainder of the turn, and it loses its next activation. This spell has no effect on large creatures or undead.",
            "Insect Climb": "The target of the spell does not suffer any movement penalty when climbing. The figure receives +10 to all Climb Skill Rolls for the rest of the game.",
            "Ladder": "The caster may place a magical ladder against any vertical or nearly vertical surface. Any figure may climb this ladder without any movement penalty or Climb Skill Rolls. As long as there is no figure on the ladder, the caster can end the spell at any time as a free action.",
            "Leap": "This spell may only be cast on a ranger or companion not currently in combat. That figure may immediately make a 6\" move in any direction, including up.",
            "Light": "If the maximum line of sight for a scenario is below 24\" because of darkness, this spell increases it back up to 24\".",
            "Lure": "The target of this spell must make an immediate Will Roll (TN16). If it fails, the caster may move the figure up to 5\" in any direction. This may not move the figure off the table or into anything that would cause it damage. Cannot be cast on a creature currently in combat.",
            "Magic Bolt": "The caster makes a +5 magic shooting attack against one figure within line of sight. This attack ignores penalties for cover and intervening terrain.",
            "Open": "The caster may immediately cast this spell anytime he is called upon to make a Pick Lock Skill Roll. It can be used either before or after a scenario. The caster automatically passes the Pick Lock Roll.",
            "Quickness": "The target of this spell will activate in the Ranger Phase next turn. In addition, the target receives +1 Move for the rest of the scenario.",
            "Shield of Light": "This spell may be cast on any figure within 8\" and line of sight. All shooting attacks against this figure are at -3 for the rest of the game.",
            "Slow": "The target of this spell must make an immediate Will Roll (TN18). If it fails, it suffers -3 Move (to a minimum of 1) for the rest of the scenario.",
            "Smoke": "The caster may place a thick cloud of smoke, 3\" in diameter, anywhere within 3\". The smoke blocks all line of sight but does not inhibit movement.",
            "Strength": "The target of this spell does +1 damage in hand-to-hand combat for the rest of the scenario. In addition, it receives +5 to any Strength Skill Rolls it makes.",
            "Strong Heart": "This spell may be cast against any figure within 8\" and line of sight. The next time this figure must make a Will Roll it does so with a +5 modifier. The time after that, it receives +4, and so on, down to +0 when the spell's effect ends.",
            "Summon Crow": "The caster summons a crow to his aid. At the end of the turn, place a bird in contact with the caster. This bird has the same stats as a raptor, except it only has Armour 10 and no skills. Treat this bird as a companion. At the end of the bird's activation each turn, roll a die. On a 16+ the bird flies off and is removed from the table.",
            "Swat": "Make a +8 attack against one giant fly or giant spider in line of sight.",
            "Teleport": "The caster may immediately move up to 9\" in any direction, including up. This may not take the figure off the table. The figure may take no actions for the rest of the turn after casting this spell.",
            "Translate": "The caster may immediately cast this spell anytime he is called upon to make a Read Runes Skill Roll. It can be used either before or after a scenario. The caster automatically passes the Read Runes Roll.",
            "Transpose": "Immediately switch the places of any two rangers or companions on the table. Either or both of these figures may be in combat.",
            "Weakness": "The target of this spell must make an immediate Will Roll (TN18). If it fails, it suffers -1 Fight, -1 Shoot, and -1 Armour for the rest of the scenario."
        }
    };
    
    const ARCHETYPE_LIBRARY = {
        "": { traits: [], limits: [] },
        "Red Hawk Knight": {
            traits: [
                "Heavy Armour Proficient – Red Hawk Knights are highly trained in wearing heavy armour and do not suffer the -1 Move penalty for wearing it.",
                "Deflect Arrows – If a Red Hawk Knight is armed with a shield, it receives +4 Fight when making Combat Rolls against shooting attacks.",
                "Save the Children – Red Hawk Knights gain a special bonus of +15 experience points for any scenario in which a child is saved or rescued."
            ],
            limits: [
                "Cannot Be a Spellcaster – Red Hawk Knights have no training in magic and can thus never use spells, scrolls, or spellbooks.",
                "No Missile Weapons – Red Hawk Knights are forbidden by their order from using any missile weapons (anything that generates a shooting attack) as these are seen as too random, and too likely to harm innocent bystanders.",
                "Protect the Children – Red Hawk Knights may not voluntarily leave a table if there is a child under threat upon it."
            ]
        },
        "Chthonian Mage": {
            traits: [
                "Dark Vision – Chthonian Mages can see in the dark just as well as they can in the light. They never suffer any penalties of any kind (usually line of sight or shooting) because of low-light or darkness.",
                "Innate Spells – A Chthonian Mage can always convert any of its spells to one of the following spells at any point: Compass, Dark Vision, Hold Creature, Purify Blood, Sprout Mushrooms.",
                "Plant Warden – Chthonian Mages receive +3 Fight and +3 Armour when fighting plants, such as darkroot vines."
            ],
            limits: [
                "No Spellbooks or Wands – Because Chthonian Mages use an animistic form of spellcasting, they may not use either spellbooks or wands.",
                "Spell Limitations – While Chthonian Mages have access to all the spells in the main rulebook, some of the more offensive spells they can only take once (as opposed to rangers who may take a given spell any number of times).",
                "Weapon and Armour Limitations – Chthonian Mages cannot wear heavy armour as it interferes with their spellcasting. While not forbidden, Chthonian Mages never train to use bows, crossbows, or two-handed weapons and receive -2 Fight/Shoot when using them. Hand weapons, staffs, daggers and throwing knives suffer no penalty."
            ]
        },
        "River Shark": {
            traits: [
                "Boatmen – River Sharks gain +3 to all rolls for the purpose of handling a boat.",
                "Swimming Master – If a River Shark fails a Swimming Roll, it suffers only half the normal damage, rounded down, and may still make one move of up to 3\" before its activation ends, provided it is not in combat. This trait does not apply if the figure is wearing armour of any type.",
                "Throwing Knife Master – River Sharks can carry two throwing knives with one item slot. When using a throwing knife, they do not suffer the usual -1 damage penalty. A River Shark may target an enemy figure that is in combat when making a shooting attack with a throwing knife and has no chance of hitting any target but the intended one.",
                "Treasure Keeper – If players find 'Gold and Jewels' during a game, and one of them is running a River Shark, the gold and jewels can be traded in for +15 experience or 2 Progression Points split between two companions. Any treasures that state they must be given back at the end of a mission must still be returned by River Sharks.",
                "Two-Weapon Fighter – If a River Shark is equipped with two hand weapons, or a hand weapon and a dagger, and is not carrying a shield, then it does +2 damage in melee combat, and any figure it is in combat with only gains +1 for each supporting figure (instead of the normal +2)."
            ],
            limits: [
                "No Heavy Equipment – River Sharks never wear heavy armour or use two-handed weapons.",
                "No Spells – River Sharks have no spellcasters in their ranks and cannot take spells."
            ]
        },
        "Servant of Seth": {
            traits: [
                "End of Life – If a Servant of Seth has a companion killed (a Dead result is rolled on the Survival Table), then the servant can perform the last rites and ensure that the companion never reanimates as an undead creature. All players gain +3 experience points.",
                "Holy Icon – Servants of Seth always carry a Holy Icon, which does not take up one of their item slots, though it does count as the one piece of magical equipment that they can take as standard (all other magical equipment must be obtained during adventures).",
                "Innate Heroic Action – Servants of Seth focus on defeating the undead. Thus, they can always trade any Heroic Action they currently have for Halt Undead. They can make this trade at any time and may even use it more than once during a scenario.",
                "Innate Spells – A servant can always convert any of its spells to one of the following spells at any point: Burning Light, Shield of Light, and Magic Bolt (though this can only be cast against an undead creature).",
                "Taref – Servants of Seth have access to a special throwing weapon called a taref. A servant may carry as many of these as it has item slots available. It may carry one taref in place of the free item slot usually reserved for a dagger or throwing knife.",
                "Undead Fighter – When a Servant of Seth is in combat with an undead creature of any variety, all the servant's melee attacks do +1 damage and count as magic attacks."
            ],
            limits: [
                "No Wands – Servants of Seth never use wands in spellcasting.",
                "Spell Limitations – There are a few spells that Servants of Seth cannot cast. These are detailed below.",
                "Weapon Limitations – Servants of Seth cannot use bladed or piercing weapons. Functionally, this means that they cannot use bows, crossbows, or throwing knives. Instead of the free dagger or knife that most figures can carry, the servant may carry a taref. Servants also cannot use any specific magic weapons that state they are bladed or piercing such as swords, axes, picks, spears, etc."
            ]
        },
        "Varakian Archer": {
            traits: [
                "Craft Bow – After any scenario, if a Varakian Archer does not have a bow and has no way of obtaining one, it may craft a temporary bow out of whatever material is available. This bow does -1 damage, but otherwise functions the same as a normal bow.",
                "Enchant Arrow – A Varakian Archer may spend an action to enchant an arrow. This can take the place of its normally required move action. The next time the archer fires its bow, the shot counts as Magic and does +1 damage.",
                "Enhanced Quiver – A Varakian Archer that is carrying a Quiver may carry up to 3 magical arrows in the quiver without them taking up an item slot (instead of the usual 1)."
            ],
            limits: [
                "No Heavy Armour or Shields – Varakian Archers may not wear heavy armour or carry shields as they interfere with their aim.",
                "No Spells – Varakian Archers cannot learn or cast spells, other than their magical tricks with arrows, and never count as a spellcaster."
            ]
        },
        "Vampire Hunter": {
            traits: [
                "Blood Price – Whenever a vampire hunter activates, it may choose to suffer 1 point of damage. If it does, all its attacks against undead count as magic attacks and do +1 damage until its next activation.",
                "Chosen Foe – If the vampire hunter participates in a scenario in which a vampire is killed, then all heroes gain +5 experience points in addition to any other rewards. If the vampire hunter directly kills a vampire, increase this to +10 experience points.",
                "Hand Crossbow – Vampire hunters have access to the unique hand crossbow weapon.",
                "Steel Mind – Vampire hunters receive +3 to any Will Rolls to resist any kind of hypnosis or mind control."
            ],
            limits: [
                "Limited Magical Equipment – Vampire hunter spellcasters cannot use focusing crystals, wands, or wizard staffs.",
                "Limited Spells – Vampire hunters may never take a spell more than once."
            ]
        },
        "Scrollmaster of Melnoth": {
            traits: [
                "Magic Resistance – Scrollmasters are practised in resisting magic spells. They gain +3 to all Will Rolls to resist spells. If they are the target of an attack generated by a spell, they gain +3 Fight on any Combat Rolls to not be hit, and +3 Armour if they are hit.",
                "Scrollmaster – Scrollmasters may carry up to three scrolls in one item slot. Additionally, they may copy a spell from a scroll into their spellbook if no other spell is currently saved in the spellbook. In this case the scroll is destroyed.",
                "Seekers of Knowledge – Scrollmasters gain +1 experience point in any scenario in which any kind of book or scroll is found by the group (the work does not have to be magical).",
                "Spellbook Caster – Scrollmasters are trained in casting magic spells directly from spellbooks. This figure may purchase one open spell slot for the cost of 1 Build Point. So long as this figure is carrying a spellbook, it may use this open spell slot to cast any spell found in the main rulebook. Additionally, this figure may carry a spellbook without it taking up an item slot."
            ],
            limits: [
                "Armour Limitation – Scrollmasters may not wear heavy or light armour or carry shields as they interfere with their spellcasting.",
                "Weapon Limitations – Scrollmasters are not trained fighters. They may never use two-handed weapons, bows, or crossbows."
            ]
        },
        "Encarnoth Delver": {
            traits: [
                "Determine Weakness – Due to their vast knowledge of ancient myths and legends, delvers often know the weaknesses of various creatures. If this figure is within line of sight of a creature, it may spend an action and make an Ancient Lore Roll with a Target Number equal to 10 plus the creature's Will Stat. If successful, all heroes fighting against this type of creature gain +1 Fight for the rest of the scenario.",
                "Endure Hardship – Encarnoth Delvers are used to a life of hardship. If this figure is suffering from Hunger and Thirst, it only suffers a -1 penalty to its starting Health each scenario instead of the normal -2. It also gains +5 to all rolls against Disease.",
                "Pack Rat – Encarnoth Delvers have one extra item slot, as they are masters of packing carefully to maximize space and save weight.",
                "Skillmaster (Choice) – This figure gains +3 to any one skill, selected by the player."
            ],
            limits: [
                "Limited Weapons and Armour – Delvers cannot wear heavy armour, carry shields, or use two-handed weapons."
            ]
        },
        "Wasteland Firesword": {
            traits: [
                "Endure Hardship – Wastelanders are used to a life of hardship. If this figure is suffering from Hunger and Thirst, it only suffers a -1 penalty to its starting Health each scenario instead of the normal -2. It also gains +5 to all rolls against Disease.",
                "Exotic Weapons – Fireswords can take fire wax and fire flasks as part of the Basic Equipment List.",
                "Two-Weapon Fighter – If the firesword is equipped with two hand weapons, or a hand weapon and a dagger, then it does +2 damage in melee combat, and any figure it is in combat with only gains +1 for each supporting figure (instead of the normal +2)."
            ],
            limits: [
                "Cannot Be Spellcasters – Fireswords may never be spellcasters and thus never take spells or use scrolls or spellbooks.",
                "Cannot Swim – There is no deep water in the Waste, so no wastelander knows how to swim. This figure suffers -3 to all Swimming Rolls. Additionally, its Swim Skill may never be increased until this limitation is removed.",
                "Limited Weapons and Armour – Wastelanders never wear heavy armour or carry shields as they are extremely impractical in the heat of the Waste. Wastelanders also never use crossbows as these weapons are not part of their culture."
            ]
        }
    };
    
    const EQUIPMENT_CUSTOM_VALUE = "__custom__";
    const EQUIPMENT_LIBRARY = {
        "Basic Weapons": {
            "Bow": "The favoured missile weapon of rangers, bows may be loaded and fired in a single action. Maximum range is 24\". Bows have no damage modifier. A figure must also carry a quiver, or some type of magic ammunition, to use a bow.",
            "Crossbow": "Crossbows take one action to load and one action to fire. A figure may replace his movement action with a reload action. Crossbows have a +2 damage modifier and a maximum range of 24\". All crossbows start the game loaded and ready to fire. A figure must also carry a quiver, or some type of magic ammunition, to use a crossbow.",
            "Dagger": "A knife that is not balanced for throwing. Daggers have a -1 damage modifier. The first dagger or throwing knife carried by a ranger does not take up an item slot.",
            "Hand Weapon": "Includes all purpose-forged weapons commonly wielded in one hand, such as swords, clubs, axes, maces, and spears. These weapons have no modifiers in combat.",
            "Staff": "Staffs have a -1 damage modifier, but also give the opponent a -1 damage modifier in hand-to-hand combat. The staff does not provide this modifier against shooting attacks.",
            "Throwing Knife": "Includes any kind of small throwing weapon such as knives, axes, and light javelins. A figure may make one shooting attack per game for each knife carried. Maximum range is 8\" and does -1 damage. A throwing knife can also be used as a back-up melee weapon, but with a -2 damage modifier in hand-to-hand combat. The first dagger or throwing knife carried by a ranger does not take up an item slot.",
            "Two-Handed Weapon": "Includes all heavy melee weapons that require two hands to wield, such as two-handed swords, battle axes, polearms, and large flails. These weapons have a +2 damage modifier. Two-handed weapons carried by rangers take up two item slots.",
            "Unarmed": "A figure that is unarmed may still fight as normal, but suffers -2 Fight and -2 Damage. This penalty never applies to creatures that have no weapons listed in their notes."
        },
        "Basic Armour": {
            "Heavy Armour": "Represents any type of heavy armour mostly constructed out of metal. A figure wearing heavy armour receives +2 to its Armour, but -1 to its Move.",
            "Light Armour": "Represents any type of lighter armour mostly constructed out of leather or other non-metal materials. A figure wearing light armour receives +1 to its Armour.",
            "Shield": "A figure carrying a shield receives +1 to its Armour. It may not also carry a two-handed weapon or a staff."
        },
        "Basic Equipment": {
            "Quiver": "A figure must be equipped with a quiver to make normal shooting attacks with a bow or crossbow. A figure with a quiver may also carry one piece of magic ammunition without that ammunition taking up an item slot.",
            "Rope": "Whenever a figure carrying rope is standing at the top of a vertical structure, it may spend an action to set a rope. Any figure may then use this rope to climb the structure without suffering any movement penalties. A figure may set one rope per game for each rope item carried."
        },
        "Magical Equipment": {
            "Focusing Crystal": "If a figure carrying this crystal casts a spell that forces the target to make a Will Roll, the Target Number for that Will Roll is increased by 2. For example, Hold Creature would require a Will Roll of TN18 instead of the normal TN16.",
            "Holy Icon": "Whenever a figure carrying a holy icon casts Heal, the target recovers 6 points of Health instead of the normal 5. Whenever it casts Burning Light it makes +4 shooting attacks instead of +3, and whenever it casts Shield of Light all shooting attacks against the target are at -4 instead of -3.",
            "Spellbook": "If a figure carrying a spellbook reaches the end of a scenario with uncast spells, it may select one to be saved in the spellbook. This spell may then be cast in a future scenario following the normal rules. Once the spell is cast, it is removed from the spellbook. A spellbook can never hold more than one spell at any given time.",
            "Wand": "While carrying a wand, a figure can add +1 to the roll for any shooting attack generated by a spell it cast. For example, a figure carrying a wand that casts Fireball generates a +4 shooting attack instead of the normal +3.",
            "Wizard's Staff": "This item follows all of the rules for the staff weapon, with the following additions. If a figure makes a Will Roll while carrying this staff, it may trade its own Health to increase its roll on a one-for-one basis. Additionally, whenever a figure carrying a wizard's staff is activated, it may spend one point of Health to make the staff count as a magic weapon until its next activation."
        }
    };

    Object.defineProperty(global, 'RangersRules', {
        value: deepFreeze({
            abilities: ABILITY_LIBRARY,
            archetypes: ARCHETYPE_LIBRARY,
            equipment: EQUIPMENT_LIBRARY,
            equipmentCustomValue: EQUIPMENT_CUSTOM_VALUE
        }),
        writable: false,
        configurable: false,
        enumerable: true
    });
})(globalThis);
