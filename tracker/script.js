document.addEventListener('DOMContentLoaded', () => {
    // UI Elements
    const charForm = document.getElementById('char-form');
    const initList = document.getElementById('initiative-list');
    const nextTurnBtn = document.getElementById('next-turn');
    const prevTurnBtn = document.getElementById('prev-turn');
    const clearAllBtn = document.getElementById('clear-all');
    const saveToLibBtn = document.getElementById('save-to-lib');
    const typeSelect = document.getElementById('type');
    const qtyGroup = document.getElementById('qty-group');
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    const playerLibList = document.getElementById('player-library');
    const monsterLibList = document.getElementById('monster-library');
    const exportBtn = document.getElementById('export-lib');

    // State
    let characters = JSON.parse(localStorage.getItem('dd-initiative-chars')) || [];
    let currentTurnIndex = parseInt(localStorage.getItem('dd-initiative-turn')) || 0;
    let playerLibrary = JSON.parse(localStorage.getItem('dd-player-library')) || [];
    let monsterLibrary = JSON.parse(localStorage.getItem('dd-monster-library')) || [];

    // --- UTILS ---

    const save = () => {
        localStorage.setItem('dd-initiative-chars', JSON.stringify(characters));
        localStorage.setItem('dd-initiative-turn', currentTurnIndex.toString());
        localStorage.setItem('dd-player-library', JSON.stringify(playerLibrary));
        localStorage.setItem('dd-monster-library', JSON.stringify(monsterLibrary));
    };

    /**
     * Parses and rolls initiative.
     * Supports: "20", "1d20+3", "2(1d20+2)" (Advantage)
     */
    const rollDice = (formula) => {
        formula = formula.toLowerCase().replace(/\s+/g, '');

        // Match Advantage: 2(1d20+X)
        const advMatch = formula.match(/^2\(1d20([+-]\d+)?\)$/);
        if (advMatch) {
            const mod = advMatch[1] ? parseInt(advMatch[1]) : 0;
            const roll1 = Math.floor(Math.random() * 20) + 1;
            const roll2 = Math.floor(Math.random() * 20) + 1;
            return Math.max(roll1, roll2) + mod;
        }

        // Match Standard: 1d20+X
        const stdMatch = formula.match(/^1d20([+-]\d+)?$/);
        if (stdMatch) {
            const mod = stdMatch[1] ? parseInt(stdMatch[1]) : 0;
            return Math.floor(Math.random() * 20) + 1 + mod;
        }

        // Fallback to number
        const num = parseInt(formula);
        return isNaN(num) ? 0 : num;
    };

    // --- UI LOGIC ---

    // Toggle Quantity field based on type
    typeSelect.onchange = () => {
        qtyGroup.style.display = typeSelect.value === 'enemy' ? 'block' : 'none';
        saveToLibBtn.textContent = `Salvar ${typeSelect.value === 'player' ? 'Jogador' : 'Monstro'} na Biblioteca`;
    };

    // Tabs
    tabBtns.forEach(btn => {
        btn.onclick = () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
        };
    });

    // --- CORE RENDERING ---

    const renderEncounter = () => {
        if (characters.length === 0) {
            initList.innerHTML = '<div style="text-align: center; color: #666; padding: 2rem;">Nenhum combatente adicionado.</div>';
            return;
        }

        initList.innerHTML = '';
        characters.forEach((char, index) => {
            const charEl = document.createElement('div');
            charEl.className = `character-item char-type-${char.type} ${index === currentTurnIndex ? 'active' : ''}`;

            charEl.innerHTML = `
                <div class="char-init">${char.init}</div>
                <div class="char-name" title="${char.name}">
                    ${char.name}
                    ${char.monsterSlug ? `<a href="../mm/monster.html?slug=${char.monsterSlug}" target="_blank" class="btn-sheet-link" title="Abrir Ficha">📜</a>` : ''}
                </div>
                <div class="char-ac">🛡️ ${char.ac || '--'}</div>
                <div class="char-hp">
                    <div class="hp-value">${char.hp !== undefined ? char.hp : '--'} HP</div>
                    <div class="hp-controls">
                        <button class="hp-btn hp-minus" data-index="${index}">-</button>
                        <button class="hp-btn hp-plus" data-index="${index}">+</button>
                    </div>
                </div>
                <div class="char-actions">
                    <button class="btn-delete" data-index="${index}">🗑️</button>
                </div>
            `;
            initList.appendChild(charEl);
        });

        // Add event listeners
        document.querySelectorAll('.hp-minus').forEach(btn => btn.onclick = () => updateHP(btn.dataset.index, -1));
        document.querySelectorAll('.hp-plus').forEach(btn => btn.onclick = () => updateHP(btn.dataset.index, 1));
        document.querySelectorAll('.btn-delete').forEach(btn => btn.onclick = () => removeCharacter(btn.dataset.index));
    };

    const renderLibrary = () => {
        const renderList = (list, element, type) => {
            if (list.length === 0) {
                element.innerHTML = `<p style="font-size: 0.8rem; color: #555;">Nenhum ${type === 'player' ? 'jogador' : 'monstro'} salvo.</p>`;
                return;
            }
            element.innerHTML = `<h4 style="font-size: 0.75rem; color: #666; margin-bottom: 0.5rem; text-transform: uppercase;">${type === 'player' ? 'Jogadores' : 'Monstros'}</h4>`;
            list.forEach((char, idx) => {
                const item = document.createElement('div');
                item.className = 'lib-item';
                item.innerHTML = `
                    <div class="lib-info">
                        <div class="lib-name">${char.name}</div>
                        <div class="lib-meta">Inic: ${char.initFormula} | CA: ${char.ac || '--'} | PV: ${char.hp || '--'}</div>
                    </div>
                    <div class="lib-actions">
                        <button class="btn-small-icon btn-add-lib" data-type="${type}" data-idx="${idx}" title="Adicionar ao combate">⚔️</button>
                        <button class="btn-small-icon btn-del-lib" data-type="${type}" data-idx="${idx}" title="Excluir">🗑️</button>
                    </div>
                `;
                element.appendChild(item);
            });
        };

        renderList(playerLibrary, playerLibList, 'player');
        renderList(monsterLibrary, monsterLibList, 'monster');

        // Add Listeners
        document.querySelectorAll('.btn-add-lib').forEach(btn => {
            btn.onclick = () => addFromLibrary(btn.dataset.type, btn.dataset.idx);
        });
        document.querySelectorAll('.btn-del-lib').forEach(btn => {
            btn.onclick = () => removeFromLibrary(btn.dataset.type, btn.dataset.idx);
        });
    };

    // --- ACTIONS ---

    charForm.onsubmit = (e) => {
        e.preventDefault();
        const name = document.getElementById('name').value;
        const formula = document.getElementById('init').value;
        const ac = document.getElementById('ac').value;
        const hp = document.getElementById('hp').value;
        const type = document.getElementById('type').value;
        const qty = parseInt(document.getElementById('qty').value) || 1;

        for (let i = 0; i < qty; i++) {
            const finalName = qty > 1 ? `${name} ${i + 1}` : name;
            characters.push({
                id: Date.now() + i,
                name: finalName,
                init: rollDice(formula),
                ac: ac === '' ? undefined : parseInt(ac),
                hp: hp === '' ? undefined : parseInt(hp),
                type
            });
        }

        sortAndRender();
        charForm.reset();
        qtyGroup.style.display = 'none';
        save();
    };

    saveToLibBtn.onclick = () => {
        const name = document.getElementById('name').value;
        const formula = document.getElementById('init').value;
        if (!name || !formula) return alert('Pelo menos Nome e Iniciativa são necessários!');

        const char = {
            name,
            initFormula: formula,
            ac: document.getElementById('ac').value ? parseInt(document.getElementById('ac').value) : undefined,
            hp: document.getElementById('hp').value ? parseInt(document.getElementById('hp').value) : undefined
        };

        if (typeSelect.value === 'player') playerLibrary.push(char);
        else monsterLibrary.push(char);

        renderLibrary();
        save();
        alert('Salvo na biblioteca!');
    };

    const addFromLibrary = (type, idx) => {
        const lib = type === 'player' ? playerLibrary : monsterLibrary;
        const source = lib[idx];

        let qty = 1;
        if (type === 'monster') {
            const count = prompt(`Quantos ${source.name} deseja adicionar?`, "1");
            qty = parseInt(count) || 1;
        }

        for (let i = 0; i < qty; i++) {
            characters.push({
                id: Date.now() + i,
                name: qty > 1 ? `${source.name} ${i + 1}` : source.name,
                init: rollDice(source.initFormula || "1d20"),
                ac: source.ac,
                hp: source.hp,
                monsterSlug: source.monsterSlug,
                type: type === 'player' ? 'player' : 'enemy'
            });
        }
        sortAndRender();
        save();
    };

    const removeFromLibrary = (type, idx) => {
        if (!confirm('Excluir da biblioteca?')) return;
        if (type === 'player') playerLibrary.splice(idx, 1);
        else monsterLibrary.splice(idx, 1);
        renderLibrary();
        save();
    };

    const sortAndRender = () => {
        characters.sort((a, b) => b.init - a.init);
        renderEncounter();
    };

    const updateHP = (index, delta) => {
        if (characters[index].hp !== undefined) {
            characters[index].hp += delta;
            renderEncounter();
            save();
        }
    };

    const removeCharacter = (index) => {
        characters.splice(index, 1);
        if (currentTurnIndex >= characters.length && characters.length > 0) currentTurnIndex = 0;
        renderEncounter();
        save();
    };

    nextTurnBtn.onclick = () => {
        if (characters.length === 0) return;
        currentTurnIndex = (currentTurnIndex + 1) % characters.length;
        renderEncounter();
        save();
    };

    prevTurnBtn.onclick = () => {
        if (characters.length === 0) return;
        currentTurnIndex = (currentTurnIndex - 1 + characters.length) % characters.length;
        renderEncounter();
        save();
    };

    clearAllBtn.onclick = () => {
        if (confirm('Deseja limpar todos os combatentes?')) {
            characters = [];
            currentTurnIndex = 0;
            renderEncounter();
            save();
        }
    };

    // --- JSON IMPORT/EXPORT ---
    exportBtn.onclick = () => {
        const data = { players: playerLibrary, monsters: monsterLibrary };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `dd-library-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
    };

    const importBtn = document.getElementById('import-lib');
    const importInput = document.getElementById('import-input');

    // Create a real file input on the fly to avoid styling issues
    const realImportInput = document.createElement('input');
    realImportInput.type = 'file';
    realImportInput.accept = '.json';

    importBtn.onclick = () => realImportInput.click();

    realImportInput.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target.result);
                if (data.players || data.monsters) {
                    playerLibrary = data.players || [];
                    monsterLibrary = data.monsters || [];
                    renderLibrary();
                    save();
                    alert('Biblioteca importada com sucesso!');
                } else {
                    alert('Arquivo JSON inválido para a biblioteca.');
                }
            } catch (err) {
                alert('Erro ao ler o arquivo JSON.');
            }
        };
        reader.readAsText(file);
    };

    // Initial load
    renderEncounter();
    renderLibrary();
});
