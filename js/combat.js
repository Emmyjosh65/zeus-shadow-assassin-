/* ==========================================
   ZEUS SHADOW ASSASSIN — COMBAT SYSTEM
   Attacks, Combos, and Damage Calculations
   ========================================== */

/* ====== ATTACK CONFIGURATIONS ====== */
const ATTACKS = {
    light: {
        name: 'Quick Strike',
        icon: '⚔️',
        damage: 15,
        energyCost: 0,
        description: 'Light damage',
        comboBonus: 1
    },
    heavy: {
        name: 'Shadow Slash',
        icon: '🗡️',
        damage: 35,
        energyCost: 20,
        description: 'Heavy damage',
        comboBonus: 2
    },
    special: {
        name: "Assassin's Strike",
        icon: '💫',
        damage: 60,
        energyCost: 40,
        description: 'Massive damage',
        comboBonus: 3
    },
    combo: {
        name: 'Combo Chain',
        icon: '🔥',
        damage: 50,
        energyCost: 35,
        description: 'Two-hit combo',
        comboBonus: 2
    },
    defend: {
        name: 'Shadow Veil',
        icon: '🛡️',
        damage: 0,
        energyCost: 0,
        energyRecover: 30,
        description: 'Block + recover',
        comboBonus: 0
    },
    stealth: {
        name: 'Shadow Step',
        icon: '🌙',
        damage: 0,
        energyCost: 0,
        energyRecover: 50,
        description: 'Evade + recover',
        comboBonus: 0
    }
};

/* ====== DAMAGE CALCULATOR ====== */
function calculateDamage(baseDamage, attackerCombo) {
    // Combo multiplier: x1.0 base + 0.05 per combo point
    const comboMultiplier = 1.0 + (attackerCombo * 0.05);
    const bonusDamage = Math.floor(Math.random() * 5); // Small variance
    return Math.floor(baseDamage * comboMultiplier) + bonusDamage;
}

/* ====== EXECUTE ATTACK ====== */
function executeAttack(attacker, defender, actionType, isPlayer) {
    const attack = ATTACKS[actionType];
    if (!attack) return null;

    // Energy check
    if (attack.energyCost > 0) {
        if (!attacker.useEnergy(attack.energyCost)) {
            return { success: false, reason: 'Not enough energy!' };
        }
    }

    // Defend action
    if (actionType === 'defend') {
        attacker.isDefending = true;
        attacker.recoverEnergy(attack.energyRecover);
        return {
            success: true,
            action: 'defend',
            message: `${attacker.name} uses Shadow Veil! 🛡️`,
            energyRecovered: attack.energyRecover
        };
    }

    // Stealth action
    if (actionType === 'stealth') {
        attacker.isStealthed = true;
        attacker.recoverEnergy(attack.energyRecover);
        attacker.consecutiveHits = 0; // Reset combo
        return {
            success: true,
            action: 'stealth',
            message: `${attacker.name} vanishes into the shadows! 🌙`,
            energyRecovered: attack.energyRecover
        };
    }

    // Calculate damage with combo
    const damage = calculateDamage(attack.damage, attacker.comboCount);
    const result = defender.takeDamage(damage);

    // Update combo
    if (!result.blocked && !result.evaded) {
        attacker.consecutiveHits++;
        attacker.comboCount += attack.comboBonus;
    } else {
        attacker.consecutiveHits = 0;
        if (result.blocked) attacker.comboCount = Math.max(0, attacker.comboCount - 1);
    }

    // Combo chain: two hits
    let totalDamage = damage;
    let extraMessage = '';

    if (actionType === 'combo' && !result.blocked && !result.evaded) {
        const secondHit = Math.floor(damage * 0.7);
        const secondResult = defender.takeDamage(secondHit);
        totalDamage += secondResult.damage;
        if (!secondResult.blocked) {
            attacker.comboCount += attack.comboBonus;
        }
        extraMessage = ' Double strike! 🔥🔥';
    }

    return {
        success: true,
        action: actionType,
        damage: totalDamage,
        blocked: result.blocked,
        evaded: result.evaded,
        message: result.blocked
            ? `${defender.name} blocks the attack! 🛡️ (${result.damage} damage taken)`
            : result.evaded
                ? `${defender.name} evades the strike! 🌙`
                : `${attacker.name} strikes with ${attack.name}! ${attack.icon} (${totalDamage} DMG)${extraMessage}`,
        comboGained: attack.comboBonus
    };
}
