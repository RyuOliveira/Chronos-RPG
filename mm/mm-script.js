/**
 * Chronos RPG - Monster Manual Library
 */

const buildMonsterSheetUrl = (slug) => `../mm/monster.html?slug=${encodeURIComponent(slug)}`;

const cleanWhitespace = (value) => String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim();

const stripHtml = (value) => String(value ?? '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const splitList = (value) => {
    if (Array.isArray(value)) {
        return value
            .flatMap((item) => splitList(item))
            .map((item) => String(item).trim())
            .filter(Boolean);
    }

    const text = cleanWhitespace(value);
    if (!text) return [];

    return text
        .split(/[;,]/g)
        .map((item) => item.trim())
        .filter(Boolean);
};

const parseInteger = (value) => {
    if (value === null || value === undefined || value === '') return undefined;
    const text = String(value).replace(',', '.').trim();
    const match = text.match(/-?\d+/);
    if (!match) return undefined;
    const parsed = Number.parseInt(match[0], 10);
    return Number.isFinite(parsed) ? parsed : undefined;
};

const generateId = (prefix = 'attack') => `${prefix}-${Date.now()}-${Math.floor(Math.random() * 100000)}`;

const parseDamagePartsFromText = (text) => {
    const clean = stripHtml(text).replace(/[−–]/g, '-');
    const parts = [];
    const regex = /(\d*\s*\([^)]+\))\s*de dano\s+(?:de\s+)?([a-zà-ÿ][a-zà-ÿ\s-]*?)(?=(?:\s*(?:,|\.|;|\+| e | mais | ou | até | quando | se |$)))/gi;
    let match;

    while ((match = regex.exec(clean))) {
        const block = match[1];
        const formulaMatch = block.match(/\(([^)]+)\)/);
        const formula = formulaMatch ? formulaMatch[1].replace(/\s+/g, '') : block.replace(/\s+/g, '');
        const type = cleanWhitespace(match[2].replace(/^de\s+/i, '').replace(/^dano\s+/i, ''));
        parts.push({
            formula,
            type
        });
    }

    return parts;
};

const parseMonsterActions = (actions) => {
    if (!Array.isArray(actions)) return [];

    return actions
        .map((action, index) => {
            if (!action) return null;

            const name = String(action.nome ?? action.name ?? `Ataque ${index + 1}`).trim();
            const description = stripHtml(action.descricao ?? action.description ?? action.text ?? '');
            const bonusMatch = description.match(/([+-]\d+)\s+para acertar/i);
            const saveDcMatch = description.match(/CD\s*(\d+)/i);
            const damage = parseDamagePartsFromText(description);

            return {
                id: String(action.id ?? generateId('attack')),
                name: name || `Ataque ${index + 1}`,
                bonus: bonusMatch ? parseInteger(bonusMatch[1]) : undefined,
                saveDc: saveDcMatch ? parseInteger(saveDcMatch[1]) : undefined,
                damage,
                notes: description,
                kind: bonusMatch ? 'attack' : saveDcMatch ? 'save' : 'other'
            };
        })
        .filter(Boolean);
};

const buildMonsterNotes = (monster) => {
    const noteParts = [
        monster.descricaoGeral,
        monster.sentidos ? `Sentidos: ${monster.sentidos}` : '',
        monster.idiomas ? `Idiomas: ${monster.idiomas}` : '',
        monster.imunidadesCondicoes ? `Imunidades de condição: ${monster.imunidadesCondicoes}` : ''
    ];

    return cleanWhitespace(noteParts.filter(Boolean).join(' | '));
};

class MonsterManual {
    constructor(jsonPath = 'monstros.json') {
        this.jsonPath = jsonPath;
        this.data = null;
    }

    async load() {
        if (this.data) return this.data;
        try {
            const response = await fetch(this.jsonPath);
            if (!response.ok) throw new Error('Não foi possível carregar o arquivo de monstros.');
            this.data = await response.json();
            return this.data;
        } catch (error) {
            console.error('Erro ao carregar monstros:', error);
            return null;
        }
    }

    getMonsterBySlug(slug) {
        if (!this.data) return null;
        for (const group of this.data) {
            if (group.slug === slug) return group;
        }
        return null;
    }

    renderGlossary(containerId) {
        const container = document.getElementById(containerId);
        if (!container || !this.data) return;

        // Simplified grouping for the glossary
        const groups = {};
        this.data.forEach((group) => {
            const firstLetter = group.titulo_pagina.charAt(0).toUpperCase();
            if (!groups[firstLetter]) groups[firstLetter] = [];
            groups[firstLetter].push(group);
        });

        const sortedLetters = Object.keys(groups).sort();

        let html = '<div class="row">';
        let colCount = 0;

        sortedLetters.forEach((letter) => {
            if (colCount % 3 === 0) {
                if (colCount > 0) html += '</div>';
                html += '<div class="row">';
            }

            html += `<div class="col-md-4">
                <div class="glossary-group">
                    <h5>${letter}</h5>
                    <ul class="glossary-list">`;

            groups[letter].forEach((group) => {
                html += `<li><a href="monster.html?slug=${group.slug}">${group.titulo_pagina}</a></li>`;
            });

            html += `</ul></div></div>`;
            colCount++;
        });

        html += '</div>';
        container.innerHTML = html;
    }

    renderMonsterSheet(slug, containerId) {
        const container = document.getElementById(containerId);
        const group = this.getMonsterBySlug(slug);

        if (!group) {
            container.innerHTML = `<div class="container mt-5"><h1 class="text-danger">Monstro Não Encontrado!</h1><p>Slug: ${slug}</p><a href="index.html" class="btn btn-primary">Voltar</a></div>`;
            return;
        }

        document.title = `Ficha da Criatura: ${group.titulo_pagina}`;

        let html = `
            <div class="group-header">
                ${group.imagem_principal ? `<img src="${group.imagem_principal}" alt="${group.titulo_pagina}" class="img-fluid mb-3">` : ''}
                <h1>${group.titulo_pagina}</h1>
                ${group.descricao_pagina ? `<p>${group.descricao_pagina}</p>` : ''}
                <p class="mt-4"><a href="index.html" class="btn btn-outline-danger"><i class="fas fa-arrow-left me-2"></i>Voltar ao Glossário</a></p>
            </div>
        `;

        group.monstros.forEach((monster) => {
            html += this.generateMonsterCard(monster, slug);
        });

        container.innerHTML = html;
    }

    generateMonsterCard(m, slug) {
        const ac = parseInteger(m.classeArmadura) || 0;
        const hp = parseInteger(m.pontosVida) || 0;
        const attacks = parseMonsterActions(m.acoes);
        const sheetUrl = buildMonsterSheetUrl(slug);

        const monsterData = JSON.stringify({
            type: 'enemy',
            name: m.nome,
            ac,
            hp,
            maxHp: hp,
            initFormula: '1d20',
            sheetUrl,
            monsterSlug: slug,
            attacks,
            resistances: splitList(m.resistenciasDano),
            vulnerabilities: splitList(m.vulnerabilidadesDano),
            immunities: splitList(m.imunidadesDano),
            conditionImmunities: splitList(m.imunidadesCondicoes),
            notes: buildMonsterNotes(m)
        }).replace(/'/g, '&apos;');

        return `
        <div class="monster-card card border-danger mb-5">
            <div class="card-header bg-danger text-white d-flex justify-content-between align-items-center">
                <h2 class="h4 mb-0">${m.nome}</h2>
                <div class="d-flex align-items-center gap-2">
                    <a class="btn btn-sm btn-outline-light" href="${sheetUrl}" target="_blank" rel="noopener">Abrir ficha</a>
                    <button class="btn btn-sm btn-warning" onclick='sendToTracker(event, ${monsterData})'>⚔️ Enviar para o Rastreador</button>
                    <div class="badge bg-dark text-white fs-6">Desafio ${m.desafioCR_text} (${m.xp} XP)</div>
                </div>
            </div>
            <div class="card-body">
                ${m.imagem ? `<div class="text-center mb-3"><img src="${m.imagem}" class="img-fluid rounded" style="max-width: 250px;"></div>` : ''}
                <div class="monster-basics mb-3">
                    <p class="mb-1"><strong>${m.tamanho} ${m.tipo}</strong>, ${m.alinhamento}</p>
                    <p class="mb-1"><strong>Classe de Armadura</strong> ${m.classeArmadura}</p>
                    <p class="mb-1"><strong>Pontos de Vida</strong> ${m.pontosVida}</p>
                    <p class="mb-1"><strong>Deslocamento</strong> ${m.deslocamento}</p>
                </div>
                
                <div class="monster-abilities mb-3">
                    <div class="d-flex justify-content-between text-center">
                        ${this.abilityScore('FOR', m.forca)}
                        ${this.abilityScore('DES', m.destreza)}
                        ${this.abilityScore('CON', m.constituicao)}
                        ${this.abilityScore('INT', m.inteligencia)}
                        ${this.abilityScore('SAB', m.sabedoria)}
                        ${this.abilityScore('CAR', m.carisma)}
                    </div>
                </div>

                <div class="monster-details mb-3 border-top pt-3">
                    ${m.testesResistencia ? `<p><strong>Testes de Resistência</strong> ${m.testesResistencia}</p>` : ''}
                    ${m.pericias ? `<p><strong>Perícias</strong> ${m.pericias}</p>` : ''}
                    ${m.resistenciasDano ? `<p><strong>Resistências a Dano</strong> ${m.resistenciasDano}</p>` : ''}
                    ${m.imunidadesDano ? `<p><strong>Imunidades a Dano</strong> ${m.imunidadesDano}</p>` : ''}
                    ${m.imunidadesCondicoes ? `<p><strong>Imunidades a Condições</strong> ${m.imunidadesCondicoes}</p>` : ''}
                    <p><strong>Sentidos</strong> ${m.sentidos}</p>
                    <p><strong>Idiomas</strong> ${m.idiomas}</p>
                </div>

                ${this.renderSection('Habilidades Especiais', m.habilidadesEspeciais)}
                ${this.renderSection('Ações', m.acoes)}
                ${this.renderSection('Ações Bônus', m.bonusAcoes)}
                
                ${m.acoesLendarias && m.acoesLendarias.length > 0 ? `
                    <div class="monster-actions legendary-actions">
                        <h5 class="border-bottom pb-2 mb-3 text-danger">Ações Lendárias</h5>
                        <p class="mb-2">${m.descricaoAcoesLendarias || ''}</p>
                        ${m.acoesLendarias.map((a) => `
                            <div class="action-item">
                                <p class="mb-1"><strong><i class="${a.icone || 'fas fa-bolt'} fa-icon"></i>${a.nome}${a.custo > 1 ? ` (Custa ${a.custo} Ações)` : ''}.</strong> ${a.descricao}</p>
                            </div>
                        `).join('')}
                    </div>
                ` : ''}

                <div class="monster-description mt-4 pt-3">
                    <p class="mb-0"><em>${m.descricaoGeral}</em></p>
                </div>
            </div>
        </div>
        `;
    }

    abilityScore(label, value) {
        return `
            <div class="ability-score">
                <div class="ability-name">${label}</div>
                <div class="ability-value">${value}</div>
            </div>
        `;
    }

    renderSection(title, items) {
        if (!items || items.length === 0) return '';
        return `
            <div class="monster-traits mb-3">
                <h5 class="border-bottom pb-2 mb-3">${title}</h5>
                ${items.map((item) => `
                    <div class="special-trait">
                        <p class="mb-1"><strong><i class="${item.icone || 'fas fa-chevron-right'} fa-icon"></i>${item.nome}.</strong> ${item.descricao}</p>
                        ${item.notaDM ? `<p class="note-clarification">DM Note: ${item.notaDM}</p>` : ''}
                    </div>
                `).join('')}
            </div>
        `;
    }
}

function sendToTracker(event, monsterData) {
    const btn = event?.currentTarget || event?.target;
    const monsterLibrary = JSON.parse(localStorage.getItem('dd-monster-library')) || [];
    const index = monsterLibrary.findIndex((entry) => entry.monsterSlug === monsterData.monsterSlug);

    if (index >= 0) {
        monsterLibrary[index] = {
            ...monsterLibrary[index],
            ...monsterData
        };
    } else {
        monsterLibrary.push(monsterData);
    }

    localStorage.setItem('dd-monster-library', JSON.stringify(monsterLibrary));

    if (!btn) return;

    const originalText = btn.innerHTML;
    btn.innerHTML = '✅ Enviado!';
    btn.classList.replace('btn-warning', 'btn-success');
    btn.disabled = true;

    setTimeout(() => {
        btn.innerHTML = originalText;
        btn.classList.replace('btn-success', 'btn-warning');
        btn.disabled = false;
    }, 2000);
}
