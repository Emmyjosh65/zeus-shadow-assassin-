/* ==========================================
   ZEUS SHADOW ASSASSIN — UI CONTROLLER
   Menus, modals, notes, stats display
   ========================================== */

/* ====== TOGGLE MENU ====== */
function toggleMenu() {
    const menu = document.getElementById('sideMenu');
    if (menu) menu.classList.toggle('hidden');
}

/* ====== MODAL CONTROLS ====== */
function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.add('hidden');
}

/* ====== NOTES SYSTEM ====== */
function toggleNotes() {
    const modal = document.getElementById('notesModal');
    const textarea = document.getElementById('notesTextArea');
    if (!modal) return;

    modal.classList.toggle('hidden');
    if (!modal.classList.contains('hidden') && textarea) {
        textarea.value = localStorage.getItem('zeus_assassin_notes') || '';
    }
}

function saveNotes() {
    const textarea = document.getElementById('notesTextArea');
    if (textarea) {
        localStorage.setItem('zeus_assassin_notes', textarea.value);
        showMessage('✅ Shadow notes saved!');
        closeModal('notesModal');
    }
}

/* ====== STATS DISPLAY ====== */
function showStats() {
    const modal = document.getElementById('statsModal');
    const content = document.getElementById('statsContent');
    if (!modal || !content) return;

    const winRate = totalDuels > 0 ? Math.round((duelsWon / totalDuels) * 100) : 0;
    const rank = getRank(assassinIQ);

    content.innerHTML = `
        <div class="stat-line"><span>🗡️ Assassin IQ</span><span class="stat-value">${assassinIQ}</span></div>
        <div class="stat-line"><span>🎖️ Rank</span><span class="stat-value" style="color:${rank.color}">${rank.name}</span></div>
        <div class="stat-line"><span>⚔️ Total Duels</span><span class="stat-value">${totalDuels}</span></div>
        <div class="stat-line"><span>🏆 Duels Won</span><span class="stat-value">${duelsWon}</span></div>
        <div class="stat-line"><span>📈 Win Rate</span><span class="stat-value">${winRate}%</span></div>
        <div class="stat-line"><span>🎯 Smart Plays</span><span class="stat-value">${smartPlays}/${totalPlays}</span></div>
        <div class="stat-line"><span>💀 Perfect Duels</span><span class="stat-value">${perfectDuels}</span></div>
        <div class="stat-line"><span>🔥 Damage Dealt</span><span class="stat-value">${totalDamageDealt}</span></div>
        <div class="stat-line"><span>🛡️ Damage Taken</span><span class="stat-value">${totalDamageTaken}</span></div>
        <div class="stat-line"><span>🔄 Current Duel</span><span class="stat-value">${duelNumber}</span></div>
    `;

    modal.classList.remove('hidden');
}

/* ====== ABILITIES GUIDE ====== */
function showAbilities() {
    const modal = document.getElementById('abilitiesModal');
    if (modal) modal.classList.remove('hidden');
}

/* ====== ABOUT ====== */
function showAbout() {
    const modal = document.getElementById('aboutModal');
    if (modal) modal.classList.remove('hidden');
}

/* ====== CONTACT OWNER ====== */
function contactOwner() {
    showMessage('📞 Contact Lord Zeus: +234 906 760 078');
    closeModal('winModal');
    toggleMenu();
}

/* ====== KEYBOARD SHORTCUTS ====== */
document.addEventListener('keydown', (e) => {
    if (e.key === '1') playerAttack('light');
    else if (e.key === '2') playerAttack('heavy');
    else if (e.key === '3') playerAttack('special');
    else if (e.key === '4') playerDefend();
    else if (e.key === '5') playerCombo();
    else if (e.key === '6') playerStealth();
    else if (e.key === 'n' || e.key === 'N') toggleNotes();
    else if (e.key === 'r' || e.key === 'R') resetGame();
    else if (e.key === 'm' || e.key === 'M') toggleMenu();
    else if (e.key === 'Escape') {
        ['winModal', 'notesModal', 'statsModal', 'abilitiesModal', 'aboutModal'].forEach(id => closeModal(id));
        const menu = document.getElementById('sideMenu');
        if (menu && !menu.classList.contains('hidden')) menu.classList.add('hidden');
    }
});
