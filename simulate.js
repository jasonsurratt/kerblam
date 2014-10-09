
/**
 * Steps to simulate an encouter:
 *
 * todo 1. The units start 24" apart
 * todo 2. The first turn is determined randomly
 * todo 3. Each unit marches towards the other until they reach a 50% chance of charge
 * todo 4. When a unit is within a 50% chance of charge they attempt a charge
 * todo 5. Once combat is entered the units attack until the flee or are annihilated
 * todo 6. The unit that flees or is destroyed is considered the loser (no pursuit/reform is
 *   attempted)
 */

function logStep(v)
{
    //console.log(v);
}

function calculateArmorSave(a, t)
{
    var result = t.getArmorSave();
    if (a.getStrength() >= 4)
    {
        result = result + (a.getStrength() - 3);
    }
    return result;
}

function calculateWardSave(a, t)
{
    return t.getWardSave();
}

function calculateToHit(a, t)
{
    var result;
    var aws = a.ws;

    // Fear, page 69. If one has fear and the other doesn't, do a leadership test. If failed the
    // attacker has a weapon skill of 1.
    if (a.hasRule('fear') === false && t.hasRule('fear') === true &&
        a.hasRule('immune to psychology') === false &&
        a.hasRule('unbreakable') === false)
    {
        var leadershipTest = rollD6() + rollD6();
        // if we pass
        if (leadershipTest <= a.getLeadership())
        {
            logStep("  Fear leadership test: " + leadershipTest + " (pass)");
        }
        else
        {
            logStep("  Fear leadership test: " + leadershipTest + " (fail)");
            aws = 1;
        }
    }

    if (aws > t.ws)
    {
        result = 3;
    }
    else if (aws * 2 < t.ws)
    {
        result = 5;
    }
    else
    {
        result = 4;
    }

    return result;
}

function calculateToWound(a, t)
{
    var result;
    var diff = a.getStrength() - t.t;

    if (diff === 0)
    {
        result = 4;
    }
    else if (diff === 1)
    {
        result = 3;
    }
    else if (diff > 1)
    {
        result = 2;
    }
    else if (diff === -1)
    {
        result = 5;
    }
    else
    {
        result = 6;
    }

    // see dwarf army book, page 44
    if (a.hasRule('slayer'))
    {
        result = Math.min(4, result);
    }

    return result;
}

function failFleeTest(u1, u2, diff)
{
    var fleeRoll = rollD6() + rollD6();

    var modifiedLeadership;

    if (u1.entities.length === 0)
    {
        return true;
    }

    var e1 = u1.entities[0];

    if (e1.hasRule('unbreakable'))
    {
        logStep(u1.getName() + " is unbreakable.");
        return false;
    }

    // if the unit is steadfast (pg. 60)
    if (u1.getRanks() > u2.getRanks() || e1.hasRule('stubborn'))
    {
        modifiedLeadership = u1.getLeadership();
        logStep(u1.getName() + " takes a break test (steadfast). Leadership: " +
                modifiedLeadership + " rolls: " + fleeRoll);
    }
    else
    {
        modifiedLeadership = u1.getLeadership() - diff;
        logStep(u1.getName() + " takes a break test. Modified Leadership: " +
                modifiedLeadership + " rolls: " + fleeRoll);
    }

    if (fleeRoll > modifiedLeadership)
    {
        return true;
    }
    else
    {
        return false;
    }
}

function tossCoin()
{
    return Math.random() < 0.5;
}

function isFirst(u1, u2)
{
    if (u1.getInitiative() > u2.getInitiative())
    {
        return true;
    }
    else if (u1.getInitiative() < u2.getInitiative())
    {
        return false;
    }
    else
    {
        return tossCoin();
    }
}

function rollD6()
{
    return Math.floor((Math.random() * 6) + 1);
}

/**
 * Roll count dice and if they're >= minHit then count it. Return the number that meet the min
 * hit criteria.
 */
function rollKeep(count, minHit)
{
    var result = 0;

    if (minHit === undefined)
    {
        return count;
    }

    var dice = [];
    for (var i = 0; i < count; i++)
    {
        var d = rollD6();
        dice.push(d);
        if (d >= minHit)
        {
            result++;
        }
    }
    logStep("    dice: " + JSON.stringify(dice));

    return result;
}

function rollReject(count, minMiss)
{
    var result = 0;

    if (minMiss === undefined)
    {
        return count;
    }

    var dice = [];
    for (var i = 0; i < count; i++)
    {
        var d = rollD6();
        dice.push(d);
        if (d < minMiss)
        {
            result++;
        }
    }
    logStep("    dice: " + JSON.stringify(dice));

    return result;
}

/**
 * This method assumes all entities in a unit are identical.
 */
function meleeAttack(u1, u2, casualties)
{
    if (u1.entities.length === 0 || u2.entities.length === 0)
    {
        return 0;
    }

    var e1 = u1.entities[0];
    var e2 = u2.entities[0];

    logStep(u1.getName() + " attacking " + u2.getName());

    var toHit = calculateToHit(e1, e2);
    var toWound = calculateToWound(e1, e2);
    var armourSave = calculateArmorSave(e1, e2);
    var wardSave = calculateWardSave(e1, e2);

    var rerollHits = e1.hasRerollHits(e2);

    var attackers = u1.getAttackerCount(u2.files + 2);

    logStep("  toHit: " + toHit + "+");
    var hits = rollKeep(attackers * e1.getAttacks(), toHit);
    logStep("  hits: " + hits);

    if (rerollHits)
    {
        logStep("  rerolling failed misses:");
        hits = rollKeep(attackers - hits, toHit) + hits;
        logStep("  rerolled hits: " + hits);
    }

    logStep("  toWound: " + toWound + "+");
    var wounds = rollKeep(hits, toWound);
    logStep("  wounds: " + wounds);
    logStep("  armourSave: " + armourSave + "+");
    var noArmorSave = rollReject(wounds, armourSave);
    logStep("  noArmorSave: " + noArmorSave);
    logStep("  wardSave: " + wardSave + "+");
    var noWardSave = rollReject(noArmorSave, wardSave);
    logStep("  noWardSave: " + noWardSave);

    u2.removeCasualties(noWardSave);

    return noWardSave;
}

/**
 * Performs one combat round between u1 and u2. The combat result is returned for each unit.
 */
function encounter(u1, u2)
{
    var count1 = u1.entities.length;
    var count2 = u2.entities.length;
    var e1 = u1.entities[0];
    var e2 = u2.entities[0];

    var first = u1;
    var last = u2;

    if (!isFirst(u1, u2))
    {
        first = u2;
        last = u1;
    }

    var combatResult1 = meleeAttack(first, last);
    var combatResult2 = meleeAttack(last, first);

    if (!isFirst(u1, u2))
    {
        var tmp = combatResult2;
        combatResult2 = combatResult1;
        combatResult1 = tmp;
    }

    logStep(u1.getName() + ": " + u1.entities.length);
    logStep(u2.getName() + ": " + u2.entities.length);

    // one point for every rank of 5 or more, up to +3
    if (u1.getOver5Ranks() > u2.getOver5Ranks())
    {
        combatResult1 = combatResult1 + Math.min(3, u1.getOver5Ranks() - u2.getOver5Ranks());
    }
    else
    {
        combatResult2 = combatResult2 + Math.min(3, u2.getOver5Ranks() - u1.getOver5Ranks());
    }

    return [combatResult1, combatResult2];
}

function battle(u1, u2)
{
    var done = false;

    var result = {
        rounds: 0,
    };

    while(!done)
    {
        result.rounds++;
        var combatResults = encounter(u1, u2);

        if (u1.entities.length === 0)
        {
            done = true;
            result.winner = 1;
        }
        else if (u2.entities.length === 0)
        {
            done = true;
            result.winner = 0;
        }

        var diff = combatResults[0] - combatResults[1];
        logStep(u1.getName() + " combat result: " + combatResults[0]);
        logStep(u2.getName() + " combat result: " + combatResults[1]);

        var fleeRoll;
        if (diff === 0)
        {
            // do nothing, we don't deal with musiscians yet.
        }
        else if (diff < 0)
        {
            if (failFleeTest(u1, u2, -diff))
            {
                // return that unit 2 won
                done = true;
                result.winner = 1;
            }
        }
        else
        {
            if (failFleeTest(u2, u1, diff))
            {
                // return that unit 1 won
                done = true;
                result.winner = 0;
            }
        }
    }

    return result;
}

function fill(obj, count)
{
    var result = new Array();

    for (var i = 0; i < count; i++)
    {
        result.push(obj);
    }

    return result;
}

function create(base, stats)
{
    var result = Object.create(base);

    for (k in stats)
    {
        result[k] = stats[k];
    }

    return result;
}

var baseEntity = {
    i: 1,
    equipment: [],
    specialRules: [],
    ward: 7,

    getArmorSave:
        function()
        {
            var result = 7;

            if (this.hasEquipment('heavy armour'))
            {
                result = 5;
            }
            if (this.hasEquipment('light armour'))
            {
                result = 6;
            }

            // dwarf army book page 33
            if (this.hasEquipment('gromril armour'))
            {
                result = 4;
            }
            // dwarf army book page 43
            if (this.hasEquipment('forge-proven gromril armour'))
            {
                result = 4;
            }
            if (this.hasEquipment('shield'))
            {
                result = result - 1;
            }

            // armour save can never be better than 2+
            result = Math.max(result, 2);

            return result;
        },

    getAttacks: function()
        {
            var result = this.a;

            if (this.hasRule("additional hand weapon"))
            {
                result++;
            }

            return result;
        },

    getAttackRanks: function()
        {
            var ranks = 2;

            // elf army book,
            if (this.hasRule('martial prowess'))
            {
                ranks++;
            }
            if (this.hasEquipment('spear'))
            {
                ranks++;
            }

            return ranks;
        },

    getLeadership: function() {
           return this.ld;
       },

    getInitiative: function() {
           return this.i;
       },

    getStrength:
        function()
        {
            var result = this.s;

            if (this.hasEquipment('great weapon'))
            {
                result = result + 2;
            }
            else if (this.hasEquipment('halberd'))
            {
                result = result + 1;
            }

            return result;
        },

    getWardSave:
        function()
        {
            var result = this.ward;

            // parry save, page 88
            // this has specific caveats, such as not applicable on flanking, or ranged attacks,
            // but at this time we don't simulate those situations.
            if (this.hasEquipment('shield'))
            {
                result = Math.min(result, 6);
            }
            // pg 43 of dwarf army book
            if (this.hasEquipment('forge-proven gromril armour'))
            {
                result = Math.min(result, 6);
            }

            // pg 42 of dwarf army book
            if (this.hasRule('shieldwall of gromril') && result <= 6)
            {
                result = result - 1;
            }

            return Math.max(2, result);
        },

    hasEquipment:
        function(equipment)
        {
            return this.equipment.indexOf(equipment) !== -1;
        },

    hasRerollHits:
        function(other)
        {
            var result = false;

            // see page 66
            if (other.hasRule('always strikes first') === false &&
                this.hasRule('always strikes first') === true &&
                this.i > other.i)
            {
                result = true;
            }

            return result;
        },

    hasRule:
        function(rule)
        {
            return this.specialRules.indexOf(rule) !== -1;
        }

}

var infantry = Object(baseEntity);

var unit = {

    /**
     * Return the number of attackers that can attack w/ the maximum number of files.
     */
    getAttackerCount:
        function(maxFiles)
        {
            if (this.entities.length === 0)
            {
                return 0;
            }

            var attackFiles = maxFiles;
            if (maxFiles > this.files)
            {
                attackFiles = this.files;
            }

            var result = Math.min(this.entities[0].getAttackRanks(), this.getFullRanks()) *
                    attackFiles;

            if (this.entities[0].getAttackRanks() > this.getFullRanks())
            {
                var partialRankSize = this.entities.length % this.files;
                result += Math.min(partialRankSize, maxFiles);
            }

            return result;
        },

    getFullRanks:
        function()
        {
            return Math.floor(this.entities.length / this.files);
        },

    getRanks:
        function()
        {
            return Math.ceil(this.entities.length / this.files);
        },

    getName:
        function()
        {
            if (this.name === undefined)
            {
                this.name = this.entities[0].name;
            }
            return this.name;
        },

    /**
     * Returns the number of ranks that have >= 5 entities.
     */
    getOver5Ranks:
        function()
        {
            var result = 0;

            if (this.files >= 5)
            {
                result = this.getFullRanks();
                var partialRankSize = this.entities.length % this.files;
                if (partialRankSize >= 5)
                {
                    result++;
                }
            }

            return result;
        },

    getInitiative:
        function()
        {
            var result = 0;
            for (var i = 0; i < this.entities.length; i++)
            {

                result = Math.max(result, this.entities[i].getInitiative());
            }
            return result;
        },

    getLeadership:
        function()
        {
            var result = 0;
            for (var i = 0; i < this.entities.length; i++)
            {

                result = Math.max(result, this.entities[i].getLeadership());
            }
            return result;
        },

    getLowestCost:
        function()
        {
            var result = 1e6;
            for (var i = 0; i < this.entities.length; i++)
            {
                if (this.entities[i].cost < result)
                {
                    result = this.entities[i].cost;
                }
            }

            return result;
        },

    getLowestCostEntity:
        function()
        {
            var lowestCost = 1e6;
            var result;
            for (var i = 0; i < this.entities.length; i++)
            {
                if (this.entities[i].cost < lowestCost)
                {
                    lowestCost = this.entities[i].cost;
                    result = this.entities[i];
                }
            }

            return lowestCost;
        },

    /**
     * Removes the specified number of casualties and returns the number removed.
     */
    removeCasualties:
        function(count)
        {
            var result = this.entities.slice(0, count);
            this.entities = this.entities.slice(count);
            return result;
        }
}

var dwarfs = {
    warrior: create(baseEntity, {
        name: "Dwarf Warrior",
        m: 3,
        ws: 4,
        bs: 3,
        s: 3,
        t: 4,
        w: 1,
        i: 2,
        a: 1,
        ld: 9,
        cost: 8,
        equipment: ['heavy armour']
    }),
    warriorWithShield: create(baseEntity, {
        name: "Dwarf Warrior w/ Shield",
        m: 3,
        ws: 4,
        bs: 3,
        s: 3,
        t: 4,
        w: 1,
        i: 2,
        a: 1,
        ld: 9,
        cost: 9,
        equipment: ['heavy armour', 'shield']
    }),
    longbeards : create(baseEntity, {
        name: "Longbeard",
        m: 3,
        ws: 5,
        bs: 3,
        s: 4,
        t: 4,
        w: 1,
        i: 2,
        a: 1,
        ld: 9,
        cost: 12,
        equipment: ['heavy armour'],
        specialRules: ['immune to psychology']
    }),
    longbeardsWithShield : create(baseEntity, {
        name: "Longbeard w/ Shield",
        m: 3,
        ws: 5,
        bs: 3,
        s: 4,
        t: 4,
        w: 1,
        i: 2,
        a: 1,
        ld: 9,
        cost: 13,
        equipment: ['heavy armour', 'shield'],
        specialRules: ['immune to psychology']
    }),
    hammerers : create(baseEntity, {
        name: "Hammerers",
        m: 3,
        ws: 5,
        bs: 3,
        s: 4,
        t: 4,
        w: 1,
        i: 2,
        a: 2,
        ld: 9,
        cost: 14,
        equipment: ['heavy armour', 'great weapon'],
        specialRules: ['stubborn']
    }),
    ironbreakers : create(baseEntity, {
        name: "Ironbreakers",
        m: 3,
        ws: 5,
        bs: 3,
        s: 4,
        t: 4,
        w: 1,
        i: 2,
        a: 1,
        ld: 10,
        cost: 14,
        equipment: ['gromril armour', 'shield'],
        specialRules: ['shieldwall of gromril']
    }),
    slayerGreatWeapon : create(baseEntity, {
        name: "Slayer Great Weapon",
        m: 3,
        ws: 4,
        bs: 3,
        s: 3,
        t: 4,
        w: 1,
        i: 2,
        a: 1,
        ld: 10,
        cost: 12,
        equipment: ['great weapon'],
        specialRules: ['slayer', 'unbreakable']
    }),
    slayerAdditionalHandWeapon : create(baseEntity, {
        name: "Slayer Additional Hand Weapon",
        m: 3,
        ws: 4,
        bs: 3,
        s: 3,
        t: 4,
        w: 1,
        i: 2,
        a: 1,
        ld: 10,
        cost: 12,
        equipment: [],
        specialRules: ['slayer', 'unbreakable', 'additional hand weapon']
    }),
    irondrake : create(baseEntity, {
        name: "Irondrake",
        m: 3,
        ws: 5,
        bs: 3,
        s: 4,
        t: 4,
        w: 1,
        i: 2,
        a: 1,
        ld: 10,
        cost: 15,
        equipment: ['drakegun', 'forge-proven gromril armour'],
        specialRules: []
    })
};

logStep(dwarfs.warrior.getInitiative());

var highElves = {
    phoenixGuard: create(baseEntity, {
        name: "Phoenix Guard",
        m: 5,
        ws: 5,
        bs: 4,
        s: 3,
        t: 3,
        w: 1,
        i: 6,
        a: 1,
        ld: 9,
        ward: 4,
        cost: 15,
        equipment: ['halberd', 'heavy armour'],
        specialRules: ['fear', 'always strikes first', 'martial prowess']
    }),
    spearmen: create(baseEntity, {
        name: "Spearmen",
        m: 5,
        ws: 4,
        bs: 4,
        s: 3,
        t: 3,
        w: 1,
        i: 5,
        a: 1,
        ld: 8,
        ward: 4,
        cost: 9,
        equipment: ['spear', 'light armour', 'shield'],
        specialRules: ['always strikes first', 'martial prowess']
    })
};

function runTest(e1, e2, cost)
{
    var count = 1000;
    var wins = [0, 0];
    var rounds = 0;
    for (var i = 0; i < count; i++)
    {
        var unit1 = create(unit, {
            entities: fill(e1, Math.floor(cost / e1.cost)),
            files: 5
        });

        var unit2 = create(unit, {
            entities: fill(e2, Math.floor(cost / e2.cost)),
            files: 5
        });

        var battleResult = battle(unit1, unit2);
        wins[battleResult.winner]++;
        rounds = rounds + battleResult.rounds;
        logStep(JSON.stringify(battleResult));
    }

    var result = {
        meanRounds: (rounds / (count)),
        e1WinPercent: (wins[0] / count)
    }

    return result;
}

//var result = runTest(dwarfs.irondrake, highElves.phoenixGuard, 300);
//console.log(dwarfs.irondrake.name + "\t" + highElves.phoenixGuard.name + "\t" +
//            (result.e1WinPercent).toPrecision(2) + "\t" + result.meanRounds);

for (var ke in highElves)
{
    for (var kd in dwarfs)
    {
        var result = runTest(dwarfs[kd], highElves[ke], 300);
        console.log(dwarfs[kd].name + "\t" + highElves[ke].name + "\t" +
                    (result.e1WinPercent).toPrecision(2) + "\t" + result.meanRounds);
    }
}

//for (var ke in dwarfs)
//{
//    for (var kd in dwarfs)
//    {
//        var result = runTest(dwarfs[kd], dwarfs[ke], 600);
//        console.log(dwarfs[kd].name + "\t" + dwarfs[ke].name + "\t" +
//                    (result.e1WinPercent).toPrecision(2) + "\t" + result.meanRounds);
//    }
//}
