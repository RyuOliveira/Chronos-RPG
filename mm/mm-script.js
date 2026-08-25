/**
 * Chronos RPG - Monster Manual Library
 */

const buildMonsterSheetUrl = (slug) => `../mm/monster.html?slug=${encodeURIComponent(slug)}`;

const cleanWhitespace = (value) => String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim();

const normalizeToken = (value) => cleanWhitespace(value).toLowerCase();

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

const trackerPayloadCache = new Map();

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

const parseLocalizedInteger = (value) => {
    if (value === null || value === undefined || value === '') return undefined;
    const normalized = String(value)
        .replace(/[^\d.,-]/g, '')
        .replace(/\./g, '')
        .replace(',', '.')
        .trim();
    if (!normalized) return undefined;
    const parsed = Number.parseFloat(normalized);
    return Number.isFinite(parsed) ? Math.trunc(parsed) : undefined;
};

const parseAbilityModifier = (value) => {
    if (value === null || value === undefined || value === '') return undefined;
    const text = String(value).replace(/[âˆ’â€“]/g, '-').trim();
    const match = text.match(/\(([+-]?\d+)\)/);
    if (match) return Number.parseInt(match[1], 10);

    const score = parseInteger(text);
    if (!Number.isFinite(score)) return undefined;
    return Math.floor((score - 10) / 2);
};

const parseHpText = (value) => {
    const text = cleanWhitespace(value);
    if (!text) return { hp: 0, formula: undefined };

    const hpMatch = text.match(/^([\d.,-]+)/);
    const hp = parseLocalizedInteger(hpMatch?.[1] ?? text) ?? parseInteger(hpMatch?.[1] ?? text) ?? 0;
    const formulaMatch = text.match(/\(([^)]+)\)/);
    return {
        hp,
        formula: formulaMatch ? cleanWhitespace(formulaMatch[1]).replace(/\s+/g, '') : undefined
    };
};

const clonePlainObject = (value) => {
    if (value === null || value === undefined) return value;
    return JSON.parse(JSON.stringify(value));
};

const buildMonsterTrackerPayload = (monster, slug, group, monsterIndex = 0) => {
    const hpInfo = parseHpText(monster.pontosVida);
    const dexBonus = parseAbilityModifier(monster.destreza);
    const monsterKey = `${slug}:${monsterIndex}`;
    const groupInfo = {
        slug: group?.slug,
        title: group?.titulo_pagina,
        image: group?.imagem_principal,
        description: group?.descricao_pagina
    };

    const initFormula = Number.isFinite(dexBonus)
        ? (dexBonus === 0 ? '1d20' : `1d20${dexBonus > 0 ? '+' : ''}${dexBonus}`)
        : '1d20';

    return {
        type: 'enemy',
        name: String(monster.nome ?? 'Sem nome').trim() || 'Sem nome',
        ac: parseInteger(monster.classeArmadura),
        hp: hpInfo.hp,
        maxHp: hpInfo.hp,
        hpFormula: hpInfo.formula,
        initFormula,
        initBonus: Number.isFinite(dexBonus) ? dexBonus : undefined,
        sheetUrl: buildMonsterSheetUrl(slug),
        monsterSlug: slug,
        monsterKey,
        monsterIndex,
        groupSlug: groupInfo.slug,
        groupTitle: groupInfo.title,
        groupImage: groupInfo.image,
        groupDescription: groupInfo.description,
        cr: String(monster.desafioCR_text ?? '').trim() || undefined,
        xp: parseLocalizedInteger(monster.xp),
        size: String(monster.tamanho ?? '').trim() || undefined,
        creatureType: String(monster.tipo ?? '').trim() || undefined,
        alignment: String(monster.alinhamento ?? '').trim() || undefined,
        speed: String(monster.deslocamento ?? '').trim() || undefined,
        abilities: {
            forca: String(monster.forca ?? '').trim() || undefined,
            destreza: String(monster.destreza ?? '').trim() || undefined,
            constituicao: String(monster.constituicao ?? '').trim() || undefined,
            inteligencia: String(monster.inteligencia ?? '').trim() || undefined,
            sabedoria: String(monster.sabedoria ?? '').trim() || undefined,
            carisma: String(monster.carisma ?? '').trim() || undefined
        },
        savingThrows: String(monster.testesResistencia ?? '').trim() || undefined,
        skills: String(monster.pericias ?? '').trim() || undefined,
        senses: String(monster.sentidos ?? '').trim() || undefined,
        languages: String(monster.idiomas ?? '').trim() || undefined,
        resistances: splitList(monster.resistenciasDano),
        vulnerabilities: splitList(monster.vulnerabilidadesDano),
        immunities: splitList(monster.imunidadesDano),
        conditionImmunities: splitList(monster.imunidadesCondicoes),
        attacks: parseMonsterActions(monster.acoes),
        traits: clonePlainObject(monster.habilidadesEspeciais ?? []),
        actions: clonePlainObject(monster.acoes ?? []),
        bonusActions: clonePlainObject(monster.bonusAcoes ?? []),
        legendaryActions: clonePlainObject(monster.acoesLendarias ?? []),
        legendaryActionDescription: String(monster.descricaoAcoesLendarias ?? '').trim() || undefined,
        description: String(monster.descricaoGeral ?? '').trim() || undefined,
        notes: buildMonsterNotes(monster),
        sourceData: {
            group: groupInfo,
            monster: clonePlainObject(monster)
        }
    };
};

class MonsterManual {
    constructor(jsonPath = 'monstros.json') {
        this.jsonPath = jsonPath;
        this.data = null;
    }

    async load() {
        if (this.data) return this.data;
        if (Array.isArray(window.CHRONOS_MONSTROS_DATA)) {
            this.data = window.CHRONOS_MONSTROS_DATA;
            return this.data;
        }

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
                ${group.imagem_principal ? `<img src="${group.imagem_principal}" alt="${group.titulo_pagina}" class="img-fluid mb-3" onerror="this.remove()">` : ''}
                <h1>${group.titulo_pagina}</h1>
                ${group.descricao_pagina ? `<p>${group.descricao_pagina}</p>` : ''}
                <p class="mt-4"><a href="index.html" class="btn btn-outline-danger"><i class="fas fa-arrow-left me-2"></i>Voltar ao Glossário</a></p>
            </div>
        `;

        group.monstros.forEach((monster, index) => {
            html += this.generateMonsterCard(monster, slug, group, index);
        });

        container.innerHTML = html;
    }

    generateMonsterCard(m, slug, group, index) {
        const sheetUrl = buildMonsterSheetUrl(slug);
        const monsterKey = `${slug}:${index}`;
        const monsterData = buildMonsterTrackerPayload(m, slug, group, index);
        trackerPayloadCache.set(monsterKey, monsterData);

        return `
        <div class="monster-card card border-danger mb-5">
            <div class="card-header bg-danger text-white d-flex justify-content-between align-items-center">
                <h2 class="h4 mb-0">${m.nome}</h2>
                <div class="d-flex align-items-center gap-2">
                    <a class="btn btn-sm btn-outline-light" href="${sheetUrl}" target="_blank" rel="noopener">Abrir ficha</a>
                    <button class="btn btn-sm btn-warning" onclick='sendToTracker(event, ${JSON.stringify(monsterKey)})'>Adicionar à biblioteca</button>
                    <div class="badge bg-dark text-white fs-6">Desafio ${m.desafioCR_text} (${m.xp} XP)</div>
                </div>
            </div>
            <div class="card-body">
                ${m.imagem ? `<div class="text-center mb-3"><img src="${m.imagem}" class="img-fluid rounded" style="max-width: 250px;" onerror="this.parentElement.remove()"></div>` : ''}
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

window.MonsterManual = MonsterManual;

function sendToTracker(event, monsterData) {
    const btn = event?.currentTarget || event?.target;
    const payload = typeof monsterData === 'string'
        ? trackerPayloadCache.get(monsterData)
        : monsterData;

    if (!payload) {
        if (btn) {
            btn.disabled = false;
        }
        window.alert('Não foi possível encontrar os dados desse monstro.');
        return;
    }

    let monsterLibrary = [];
    try {
        monsterLibrary = JSON.parse(localStorage.getItem('dd-monster-library')) || [];
    } catch (error) {
        monsterLibrary = [];
    }

    if (!Array.isArray(monsterLibrary)) {
        monsterLibrary = [];
    }

    const payloadMonsterKey = cleanWhitespace(payload.monsterKey ?? '');
    const payloadMonsterSlug = normalizeToken(payload.monsterSlug ?? '');
    const payloadMonsterIndex = parseInteger(payload.monsterIndex);
    const payloadName = normalizeToken(payload.name ?? '');
    const payloadSheetUrl = cleanWhitespace(payload.sheetUrl ?? '');

    const index = monsterLibrary.findIndex((entry) => {
        const entryMonsterKey = cleanWhitespace(entry.monsterKey ?? '');
        const entryMonsterSlug = normalizeToken(entry.monsterSlug ?? '');
        const entryMonsterIndex = parseInteger(entry.monsterIndex);
        const entryName = normalizeToken(entry.name ?? '');
        const entrySheetUrl = cleanWhitespace(entry.sheetUrl ?? '');

        if (payloadMonsterKey && entryMonsterKey && payloadMonsterKey === entryMonsterKey) {
            return true;
        }

        if (
            payloadMonsterSlug
            && entryMonsterSlug
            && payloadMonsterSlug === entryMonsterSlug
            && Number.isFinite(payloadMonsterIndex)
            && Number.isFinite(entryMonsterIndex)
            && payloadMonsterIndex === entryMonsterIndex
        ) {
            return true;
        }

        if (
            payloadMonsterSlug
            && entryMonsterSlug
            && payloadMonsterSlug === entryMonsterSlug
            && payloadName
            && entryName
            && payloadName === entryName
        ) {
            return true;
        }

        if (
            !payloadMonsterSlug
            && !entryMonsterSlug
            && payloadName
            && entryName
            && payloadName === entryName
        ) {
            return true;
        }

        return Boolean(
            payloadSheetUrl
            && entrySheetUrl
            && payloadSheetUrl === entrySheetUrl
            && payloadName
            && entryName
            && payloadName === entryName
        );
    });

    if (index >= 0) {
        monsterLibrary[index] = {
            ...monsterLibrary[index],
            ...payload
        };
    } else {
        monsterLibrary.push(payload);
    }

    localStorage.setItem('dd-monster-library', JSON.stringify(monsterLibrary));

    if (!btn) return;

    const originalText = btn.textContent;
    btn.textContent = 'Salvo na biblioteca';
    btn.classList.replace('btn-warning', 'btn-success');
    btn.disabled = true;

    setTimeout(() => {
        btn.textContent = originalText;
        btn.classList.replace('btn-success', 'btn-warning');
        btn.disabled = false;
    }, 2000);
}

window.sendToTracker = sendToTracker;
