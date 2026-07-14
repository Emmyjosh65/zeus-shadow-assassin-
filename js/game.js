/* ==========================================
   ZEUS SHADOW ASSASSIN — GAME ENGINE
   Main game loop, IQ scoring, state management
   ========================================== */

// Game State
let player;
let zeus;
let gameOver = false;
let playerTurn = true;
let duelNumber = 1;
let playerWins = 0;
let zeusWins = 0;
let lastPlayerAction = null;
let lastZeusAction = null;

// IQ Tracking
let assassinIQ = 0;
let smartPlays = 0;
let totalPlays = 0;
let totalDuels = 0;
let duelsWon = 0;
let perfectDuels = 0;
let totalDamageDealt = 0;
let totalDamageTaken = 0;

// Canvas
let canvas, ctx;
let animFrame = 0;

/* ====== RANK SYSTEM ====== */
function getRank(iq) {
    if (iq >= 180) return { name: 'LEGEND', emoji: '👑', color: '#f59e0b' };
    if (iq >= 140) return { name: 'REAPER', emoji: '💀', color: '#dc2626' };
    if (iq >= 100) return { name: 'PHANTOM', emoji: '👻', color: '#7c3aed' };
    if (iq >= 60) return { name: 'BLADE', emoji: '🗡️', color: '#38bdf8' };
    return { name: 'SHADOW', emoji: '🌙', color: '#64748b' };
}

/* ====== IQ CALCULATOR ====== */
function calculateAssassinIQ() {
    if (totalPlays === 0) return 0;

    const accuracy = totalPlays > 0 ? (smartPlays / totalPlays) * 100 : 0;
    const winRate = totalDuels > 0 ? (duelsWon / totalDuels) * 100 : 0;
    const perfectRate = totalDuels > 0 ? (perfectDuels / totalDuels) * 100 : 0;
    const efficiency = totalDuels > 0 ? Math.max(0, Math.min(100,
        (playerWins / Math.max(1, totalDuels)) * 50 +
        (1 - (totalDamageTaken / Math.max(1, totalDamageDealt + totalDamageTaken))) * 50
    )) : 0;

    return Math.round((accuracy * 0.3) + (winRate * 0.35) + (perfectRate * 0.15) + (efficiency * 0.2));
}

/* ====== INIT GAME ====== */
function initGame() {
    player = new Assassin('You', true);
    zeus = new Assassin('Zeus', false);
    Object.assign(zeus, ZeusAI); // Give Zeus AI powers

    gameOver = false;
    playerTurn = true;
    lastPlayerAction = null;
    lastZeusAction = null;

    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');

    updateUI();
    drawArena();
    enableActions(true);

    showMessage('🗡️ The duel begins! Choose your move, assassin.');
    updateTurnIndicator();

    const loading = document.getElementById('loadingScreen');
    const game = document.getElementById('gameContainer');
    if (loading) loading.style.display = 'none';
    if (game) game.classList.remove('hidden');

    document.getElementById('roundDisplay').textContent = `DUEL ${duelNumber}`;
    updateScoreboard();
    updateAssassinIQ();
    updateRank();
}

/* ====== PLAYER ATTACK ====== */
function playerAttack(type) {
    if (gameOver || !playerTurn) return;

    const attack = ATTACKS[type];
    if (!attack) return;

    // Check energy
    if (attack.energyCost > 0 && player.energy < attack.energyCost) {
        showMessage('❌ Not enough energy! Defend or use Shadow Step.');
        return;
    }

    totalPlays++;
    const result = executeAttack(player, zeus, type, true);

    if (!result.success) {
        showMessage(`❌ ${result.reason}`);
        return;
    }

    lastPlayerAction = type;

    // Smart play detection
    const smartThresholds = {
        'special': zeus.hp <= 60,
        'combo': player.energy >= 50,
        'heavy': zeus.energy < 20,
        'defend': zeus.energy >= 30 && player.hp <= 40,
        'stealth': player.energy <= 25
    };

    if (smartThresholds[type]) smartPlays++;
    if (type === 'light' && player.hp >= 90) smartPlays++; // Opening move bonus

    if (!result.blocked && !result.evaded) {
        totalDamageDealt += result.damage || 0;
    }

    showMessage(result.message);
    updateUI();
    drawArena();
    enableActions(false);

    if (!zeus.isAlive()) {
        endDuel(true);
        return;
    }

    playerTurn = false;
    updateTurnIndicator();

    // Zeus turn after delay
    setTimeout(zeusTurn, 1000 + Math.random() * 500);
}

/* ====== PLAYER DEFEND ====== */
function playerDefend() {
    if (gameOver || !playerTurn) return;

    totalPlays++;
    // Smart play: defend when expecting heavy attack
    if (zeus.energy >= 20 && zeus.hp > 50) smartPlays++;

    const result = executeAttack(player, zeus, 'defend', true);
    lastPlayerAction = 'defend';

    showMessage(result.message);
    updateUI();
    drawArena();
    enableActions(false);

    playerTurn = false;
    updateTurnIndicator();

    setTimeout(zeusTurn, 1000 + Math.random() * 500);
}

/* ====== PLAYER STEALTH ====== */
function playerStealth() {
    if (gameOver || !playerTurn) return;

    totalPlays++;
    // Smart play: stealth when low energy
    if (player.energy <= 30) smartPlays++;

    const result = executeAttack(player, zeus, 'stealth', true);
    lastPlayerAction = 'stealth';

    showMessage(result.message);
    updateUI();
    drawArena();
    enableActions(false);

    playerTurn = false;
    updateTurnIndicator();

    setTimeout(zeusTurn, 1000 + Math.random() * 500);
}

/* ====== PLAYER COMBO ====== */
function playerCombo() {
    if (gameOver || !playerTurn) return;
    if (player.energy < 35) {
        showMessage('❌ Not enough energy for Combo Chain! (35 needed)');
        return;
    }

    totalPlays++;
    if (zeus.hp > 50 && player.comboCount > 2) smartPlays++;

    const result = executeAttack(player, zeus, 'combo', true);
    lastPlayerAction = 'combo';

    if (!result.blocked && !result.evaded) {
        totalDamageDealt += result.damage || 0;
    }

    showMessage(result.message);
    updateUI();
    drawArena();
    enableActions(false);

    if (!zeus.isAlive()) {
        endDuel(true);
        return;
    }

    playerTurn = false;
    updateTurnIndicator();

    setTimeout(zeusTurn, 1200 + Math.random() * 500);
}

/* ====== ZEUS TURN ====== */
function zeusTurn() {
    if (gameOver) return;

    const action = zeus.think(player.hp, player.energy, player.comboCount, lastPlayerAction);
    lastZeusAction = action;

    const result = executeAttack(zeus, player, action, false);

    if (!result.success) {
        // Fallback to light attack
        const fallback = executeAttack(zeus, player, 'light', false);
        showMessage(fallback.message);
        if (!fallback.blocked && !fallback.evaded) {
            totalDamageTaken += fallback.damage || 0;
        }
    } else {
        showMessage(result.message);
        if (!result.blocked && !result.evaded) {
            totalDamageTaken += result.damage || 0;
        }
    }

    zeus.resetTurn();
    updateUI();
    drawArena();

    if (!player.isAlive()) {
        endDuel(false);
        return;
    }

    playerTurn = true;
    updateTurnIndicator();
    enableActions(true);
}

/* ====== END DUEL ====== */
function endDuel(playerWon) {
    gameOver = true;
    totalDuels++;

    if (playerWon) {
        duelsWon++;
        playerWins++;
        if (player.hp === player.maxHP) perfectDuels++;
    } else {
        zeusWins++;
    }

    assassinIQ = calculateAssassinIQ();
    updateAssassinIQ();
    updateRank();
    updateScoreboard();

    const rank = getRank(assassinIQ);

    const modal = document.getElementById('winModal');
    const title = document.getElementById('winnerText');
    const emoji = document.getElementById('winEmoji');
    const iqVal = document.getElementById('assassinIQValue');
    const rankName = document.getElementById('rankName');
    const stats = document.getElementById('modalStats');

    if (emoji) emoji.textContent = playerWon ? '🏆' : '💀';
    if (title) title.textContent = playerWon ? 'VICTORY' : 'DEFEATED';
    if (iqVal) iqVal.textContent = assassinIQ;
    if (rankName) {
        rankName.textContent = rank.name;
        rankName.style.color = rank.color;
    }

    const winRate = totalDuels > 0 ? Math.round((duelsWon / totalDuels) * 100) : 0;
    const avgCombo = totalDuels > 0 ? Math.round(player.comboCount / totalDuels) : 0;

    if (stats) {
        stats.innerHTML = `
            <div>⚔️ Duels Fought: ${totalDuels}</div>
            <div>🏆 Duels Won: ${duelsWon}</div>
            <div>📈 Win Rate: ${winRate}%</div>
            <div>🎯 Smart Plays: ${smartPlays}/${totalPlays}</div>
            <div>💀 Perfect Duels: ${perfectDuels}</div>
            <div>🔥 Avg Combo: ${avgCombo}x</div>
            <div>❤️ HP Remaining: ${playerWon ? player.hp : 0}</div>
        `;
    }

    if (modal) modal.classList.remove('hidden');
    enableActions(false);
}

/* ====== RESET GAME ====== */
function resetGame() {
    duelNumber++;
    closeModal('winModal');
    closeModal('notesModal');
    closeModal('statsModal');
    initGame();
}

/* ====== DRAW ARENA (Canvas) ====== */
function drawArena() {
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;

    // Background
    const gradient = ctx.createLinearGradient(0, 0, w, h);
    gradient.addColorStop(0, '#080c14');
    gradient.addColorStop(0.5, '#0d1321');
    gradient.addColorStop(1, '#080c14');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    // Arena floor
    ctx.fillStyle = 'rgba(124,58,237,0.05)';
    ctx.fillRect(0, h - 80, w, 80);

    // Grid lines
    ctx.strokeStyle = 'rgba(124,58,237,0.06)';
    ctx.lineWidth = 1;
    for (let i = 0; i < w; i += 40) {
        ctx.beginPath();
        ctx.moveTo(i, h - 80);
        ctx.lineTo(i, h);
        ctx.stroke();
    }

    // Center emblem
    ctx.font = '32px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(124,58,237,0.08)';
    ctx.fillText('⚔️', w / 2, h - 40);

    // === Player character ===
    const playerX = 120;
    const playerY = h - 120;

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(playerX + 25, playerY + 60, 30, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Body
    if (player.isStealthed) {
        ctx.fillStyle = 'rgba(56,189,248,0.4)';
        ctx.shadowColor = 'rgba(56,189,248,0.6)';
        ctx.shadowBlur = 20;
    } else {
        ctx.fillStyle = '#38bdf8';
        ctx.shadowColor = 'rgba(56,189,248,0.3)';
        ctx.shadowBlur = 10;
    }
    ctx.fillRect(playerX, playerY, 50, 60);
    ctx.shadowBlur = 0;

    // Head
    ctx.fillStyle = player.isStealthed ? 'rgba(56,189,248,0.5)' : '#60a5fa';
    ctx.beginPath();
    ctx.arc(playerX + 25, playerY - 5, 18, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(playerX + 18, playerY - 7, 4, 0, Math.PI * 2);
    ctx.arc(playerX + 32, playerY - 7, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0f0';
    ctx.beginPath();
    ctx.arc(playerX + 18, playerY - 7, 2, 0, Math.PI * 2);
    ctx.arc(playerX + 32, playerY - 7, 2, 0, Math.PI * 2);
    ctx.fill();

    // Label
    ctx.font = 'bold 11px Orbitron, monospace';
    ctx.fillStyle = '#38bdf8';
    ctx.textAlign = 'center';
    ctx.fillText('YOU', playerX + 25, playerY + 80);
    ctx.font = '10px Inter, sans-serif';
    ctx.fillStyle = 'rgba(56,189,248,0.5)';
    ctx.fillText(`❤️${player.hp} ⚡${player.energy}`, playerX + 25, playerY + 93);

    // === Zeus character ===
    const zeusX = w - 170;
    const zeusY = h - 120;

    // Shadow
    const zeusShadow = ctx.createRadialGradient(zeusX + 25, zeusY + 60, 0, zeusX + 25, zeusY + 60, 30);
    zeusShadow.addColorStop(0, 'rgba(220,38,38,0.2)');
    zeusShadow.addColorStop(1, 'transparent');
    ctx.fillStyle = zeusShadow;
    ctx.beginPath();
    ctx.ellipse(zeusX + 25, zeusY + 60, 35, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Body (darker, more imposing)
    if (zeus.isStealthed) {
        ctx.fillStyle = 'rgba(124,58,237,0.4)';
        ctx.shadowColor = 'rgba(124,58,237,0.6)';
        ctx.shadowBlur = 20;
    } else {
        ctx.fillStyle = '#7c3aed';
        ctx.shadowColor = 'rgba(124,58,237,0.3)';
        ctx.shadowBlur = 15;
    }
    ctx.fillRect(zeusX, zeusY, 55, 65);
    ctx.shadowBlur = 0;

    // Head
    ctx.fillStyle = zeus.isStealthed ? 'rgba(124,58,237,0.5)' : '#8b5cf6';
    ctx.beginPath();
    ctx.arc(zeusX + 27, zeusY - 5, 20, 0, Math.PI * 2);
    ctx.fill();

    // Crown
    ctx.font = '16px serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#f59e0b';
    ctx.fillText('👑', zeusX + 27, zeusY - 22);

    // Eyes (red glow)
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(zeusX + 20, zeusY - 7, 4, 0, Math.PI * 2);
    ctx.arc(zeusX + 34, zeusY - 7, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f00';
    ctx.shadowColor = 'rgba(255,0,0,0.5)';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(zeusX + 20, zeusY - 7, 2, 0, Math.PI * 2);
    ctx.arc(zeusX + 34, zeusY - 7, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Label
    ctx.font = 'bold 11px Orbitron, monospace';
    ctx.fillStyle = '#7c3aed';
    ctx.textAlign = 'center';
    ctx.fillText('ZEUS', zeusX + 27, zeusY + 80);
    ctx.font = '10px Inter, sans-serif';
    ctx.fillStyle = 'rgba(124,58,237,0.5)';
    ctx.fillText(`❤️${zeus.hp} ⚡${zeus.energy}`, zeusX + 27, zeusY + 93);

    // Combat effects
    animFrame++;
    if (animFrame % 30 < 15) {
        // Floating particles
        ctx.fillStyle = 'rgba(124,58,237,0.1)';
        for (let i = 0; i < 5; i++) {
            const px = 100 + ((animFrame * 7 + i * 50) % (w - 200));
            const py = h - 60 + Math.sin((animFrame + i * 10) * 0.05) * 20;
            ctx.beginPath();
            ctx.arc(px, py, 2, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

/* ====== UPDATE UI ====== */
function updateUI() {
    // Player health & energy
    const phFill = document.getElementById('playerHealthFill');
    const peFill = document.getElementById('playerEnergyFill');
    const phText = document.getElementById('playerHealthText');
    const peText = document.getElementById('playerEnergyText');

    if (phFill) phFill.style.width = `${player.getHealthPercent()}%`;
    if (peFill) peFill.style.width = `${player.getEnergyPercent()}%`;
    if (phText) phText.textContent = player.hp;
    if (peText) peText.textContent = player.energy;

    // Enemy health & energy
    const ehFill = document.getElementById('enemyHealthFill');
    const eeFill = document.getElementById('enemyEnergyFill');
    const ehText = document.getElementById('enemyHealthText');
    const eeText = document.getElementById('enemyEnergyText');

    if (ehFill) ehFill.style.width = `${zeus.getHealthPercent()}%`;
    if (eeFill) eeFill.style.width = `${zeus.getEnergyPercent()}%`;
    if (ehText) ehText.textContent = zeus.hp;
    if (eeText) eeText.textContent = zeus.energy;

    // Combo display
    const counter = document.getElementById('comboCounter');
    const multiplier = document.getElementById('comboMultiplier');
    if (counter) counter.textContent = player.comboCount;
    if (multiplier) multiplier.textContent = `x${(1.0 + player.comboCount * 0.05).toFixed(2)}`;
}

/* ====== ENABLE/DISABLE ACTIONS ====== */
function enableActions(enabled) {
    const buttons = ['btnLight', 'btnHeavy', 'btnSpecial', 'btnDefend', 'btnCombo', 'btnStealth'];
    buttons.forEach(id => {
        const btn = document.getElementById(id);
        if (btn) btn.disabled = !enabled;
    });
}

/* ====== TURN INDICATOR ====== */
function updateTurnIndicator() {
    const el = document.getElementById('turnIndicator');
    if (!el) return;

    if (!player.isAlive() || !zeus.isAlive()) {
        el.innerHTML = `<span>💀 Duel Over</span>`;
        el.style.color = 'var(--blood-red)';
        return;
    }

    if (playerTurn) {
        el.innerHTML = `<span class="turn-dot" style="background:var(--neon-green)"></span><span>Your Turn</span>`;
        el.style.color = 'var(--neon-green)';
    } else {
        el.innerHTML = `<span class="turn-dot" style="background:var(--blood-red)"></span><span>Zeus Striking...</span>`;
        el.style.color = 'var(--blood-red)';
    }
}

/* ====== SHOW MESSAGE ====== */
function showMessage(text) {
    const box = document.getElementById('messageBox');
    const log = document.getElementById('combatLog');
    if (box) {
        box.innerHTML = `<span class="msg-icon">💬</span> <span>${text}</span>`;
    }
    if (log) {
        log.innerHTML = `<span class="log-entry">${text}</span>`;
    }
}

/* ====== UPDATE ASSASSIN IQ ====== */
function updateAssassinIQ() {
    const el = document.getElementById('assassinIQDisplay');
    if (el) el.textContent = `IQ: ${assassinIQ}`;
}

/* ====== UPDATE RANK ====== */
function updateRank() {
    const el = document.getElementById('rankDisplay');
    const rank = getRank(assassinIQ);
    if (el) el.textContent = `RANK: ${rank.name}`;
}

/* ====== UPDATE SCOREBOARD ====== */
function updateScoreboard() {
    const ps = document.getElementById('playerScore');
    const zs = document.getElementById('zeusScore');
    const dc = document.getElementById('duelCount');
    if (ps) ps.textContent = playerWins;
    if (zs) zs.textContent = zeusWins;
    if (dc) dc.textContent = totalDuels;
}

/* ====== EVENT BINDINGS ====== */
document.addEventListener('DOMContentLoaded', () => {
    // Canvas sizing
    const canvas = document.getElementById('gameCanvas');
    if (canvas) {
        canvas.width = Math.min(800, window.innerWidth - 40);
        canvas.height = Math.floor(canvas.width * 0.56);
    }

    // Buttons already bound in HTML onclick
});

window.addEventListener('load', initGame);
window.addEventListener('resize', () => {
    const canvas = document.getElementById('gameCanvas');
    if (canvas && ctx) {
        canvas.width = Math.min(800, window.innerWidth - 40);
        canvas.height = Math.floor(canvas.width * 0.56);
        drawArena();
    }
});
