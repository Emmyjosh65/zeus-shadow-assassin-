/* ==========================================
   ZEUS SHADOW ASSASSIN — ASSASSIN SYSTEM
   Player & AI Assassin Classes
   ========================================== */

/* ====== ASSASSIN CLASS ====== */
class Assassin {
    constructor(name, isPlayer = true) {
        this.name = name;
        this.isPlayer = isPlayer;
        this.maxHP = 100;
        this.hp = 100;
        this.maxEnergy = 100;
        this.energy = 100;
        this.isDefending = false;
        this.isStealthed = false;
        this.comboCount = 0;
        this.consecutiveHits = 0;
    }

    takeDamage(amount) {
        if (this.isDefending) {
            const reduced = Math.floor(amount * 0.2);
            this.hp = Math.max(0, this.hp - reduced);
            this.isDefending = false;
            return { damage: reduced, blocked: true, original: amount };
        }
        if (this.isStealthed) {
            this.isStealthed = false;
            return { damage: 0, blocked: true, evaded: true };
        }
        this.hp = Math.max(0, this.hp - amount);
        return { damage: amount, blocked: false };
    }

    heal(amount) {
        this.hp = Math.min(this.maxHP, this.hp + amount);
    }

    useEnergy(amount) {
        if (this.energy >= amount) {
            this.energy -= amount;
            return true;
        }
        return false;
    }

    recoverEnergy(amount) {
        this.energy = Math.min(this.maxEnergy, this.energy + amount);
    }

    resetTurn() {
        this.isDefending = false;
        // Recover small energy each turn
        this.recoverEnergy(8);
    }

    isAlive() {
        return this.hp > 0;
    }

    getHealthPercent() {
        return (this.hp / this.maxHP) * 100;
    }

    getEnergyPercent() {
        return (this.energy / this.maxEnergy) * 100;
    }
}

/* ====== ZEUS AI — THE SHADOW MASTER ====== */
const ZeusAI = {
    think: function(enemyHP, enemyEnergy, playerCombo, lastPlayerAction) {
        // Zeus AI decision engine — gets smarter as game progresses
        const decisions = [];

        // Always consider basic attack
        decisions.push({ action: 'light', weight: 20 });

        // Use heavy if enough energy
        if (this.energy >= 20) {
            decisions.push({ action: 'heavy', weight: 25 });
        }

        // Use special if enemy HP is low (finisher)
        if (enemyHP <= 60 && this.energy >= 40) {
            decisions.push({ action: 'special', weight: 35 });
        }

        // Counter attack: if player used special last turn, defend
        if (lastPlayerAction === 'special' && this.energy >= 0) {
            decisions.push({ action: 'defend', weight: 40 });
        }

        // Use combo if energy is high
        if (this.energy >= 35 && enemyHP > 30) {
            decisions.push({ action: 'combo', weight: 30 });
        }

        // Stealth if low on energy
        if (this.energy < 30) {
            decisions.push({ action: 'stealth', weight: 30 + (30 - this.energy) });
        }

        // Aggressive when enemy is low
        if (enemyHP <= 30 && this.energy >= 20) {
            decisions.push({ action: 'special', weight: 50 });
            decisions.push({ action: 'heavy', weight: 40 });
        }

        // Defensive when Zeus is low
        if (this.hp <= 30 && this.energy < 40) {
            decisions.push({ action: 'defend', weight: 45 });
            decisions.push({ action: 'stealth', weight: 40 });
        }

        // Add some randomness
        decisions.forEach(d => {
            d.weight += Math.floor(Math.random() * 15);
        });

        // Sort by weight descending
        decisions.sort((a, b) => b.weight - a.weight);

        return decisions[0].action;
    }
};
