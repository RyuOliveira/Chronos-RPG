document.addEventListener('DOMContentLoaded', () => {
    const STORAGE_KEYS = {
        characters: 'dd-initiative-chars',
        turnId: 'dd-initiative-turn-id',
        turnIndex: 'dd-initiative-turn',
        playerLibrary: 'dd-player-library',
        monsterLibrary: 'dd-monster-library'
    };

    const els = {
        charForm: document.getElementById('char-form'),
        initList: document.getElementById('initiative-list'),
        nextTurnBtn: document.getElementById('next-turn'),
        prevTurnBtn: document.getElementById('prev-turn'),
        finishCombatBtn: document.getElementById('finish-combat'),
        clearAllBtn: document.getElementById('clear-all'),
        saveToLibBtn: document.getElementById('save-to-lib'),
        typeSelect: document.getElementById('type'),
        qtyGroup: document.getElementById('qty-group'),
        tabBtns: document.querySelectorAll('.tab-btn'),
        tabContents: document.querySelectorAll('.tab-content'),
        playerLibList: document.getElementById('player-library'),
        monsterLibList: document.getElementById('monster-library'),
        librarySearchInput: document.getElementById('library-search'),
        quickSearchInput: document.getElementById('quick-search-input'),
        quickResults: document.getElementById('quick-results'),
        combatSummary: document.getElementById('combat-summary'),
        combatNotice: document.getElementById('combat-notice'),
        statTotal: document.getElementById('stat-total'),
        statPlayers: document.getElementById('stat-players'),
        statMonsters: document.getElementById('stat-monsters'),
        statCurrentTurn: document.getElementById('stat-current-turn'),
        toggleCombatPanelBtn: document.getElementById('toggle-combat-panel'),
        toggleQuickPanelBtn: document.getElementById('toggle-quick-panel'),
        panelCloseBtns: document.querySelectorAll('[data-close-panel]'),
        openCombatPanelEmptyBtn: document.getElementById('open-combat-panel-empty'),
        openQuickPanelEmptyBtn: document.getElementById('open-quick-panel-empty'),
        importBtn: document.getElementById('import-lib'),
        exportBtn: document.getElementById('export-lib'),
        sheetModal: document.getElementById('sheet-modal'),
        sheetModalTitle: document.getElementById('sheet-modal-title'),
        sheetForm: document.getElementById('sheet-form'),
        sheetContextKind: document.getElementById('sheet-context-kind'),
        sheetContextType: document.getElementById('sheet-context-type'),
        sheetContextId: document.getElementById('sheet-context-id'),
        sheetContextIndex: document.getElementById('sheet-context-index'),
        sheetEditingAttackIndex: document.getElementById('sheet-editing-attack-index'),
        sheetName: document.getElementById('sheet-name'),
        sheetInit: document.getElementById('sheet-init'),
        sheetAc: document.getElementById('sheet-ac'),
        sheetHp: document.getElementById('sheet-hp'),
        sheetMaxHp: document.getElementById('sheet-max-hp'),
        sheetUrl: document.getElementById('sheet-url'),
        sheetResistances: document.getElementById('sheet-resistances'),
        sheetVulnerabilities: document.getElementById('sheet-vulnerabilities'),
        sheetImmunities: document.getElementById('sheet-immunities'),
        sheetNotes: document.getElementById('sheet-notes'),
        sheetAttacksList: document.getElementById('sheet-attacks-list'),
        attackEditorId: document.getElementById('attack-editor-id'),
        attackName: document.getElementById('attack-name'),
        attackBonus: document.getElementById('attack-bonus'),
        attackSaveDc: document.getElementById('attack-save-dc'),
        attackDamage: document.getElementById('attack-damage'),
        attackNotes: document.getElementById('attack-notes'),
        attackCancelEditBtn: document.getElementById('attack-cancel-edit'),
        attackSaveBtn: document.getElementById('attack-save'),
        sheetOpenLinkBtn: document.getElementById('sheet-open-link'),
        sheetSaveLibraryBtn: document.getElementById('sheet-save-library'),
        sheetSaveBtn: document.getElementById('sheet-save'),
        attackModal: document.getElementById('attack-modal'),
        attackModalTitle: document.getElementById('attack-modal-title'),
        attackModalSubtitle: document.getElementById('attack-modal-subtitle'),
        attackSourceName: document.getElementById('attack-source-name'),
        attackTargetName: document.getElementById('attack-target-name'),
        attackRollMode: document.getElementById('attack-roll-mode'),
        attackRollBonus: document.getElementById('attack-roll-bonus'),
        attackRollNote: document.getElementById('attack-roll-note'),
        attackDamageSummary: document.getElementById('attack-damage-summary'),
        attackDamageLines: document.getElementById('attack-damage-lines'),
        attackResultPreview: document.getElementById('attack-result-preview'),
        attackCancelBtn: document.getElementById('attack-cancel'),
        attackApplyBtn: document.getElementById('attack-apply')
    };

    if (!els.charForm || !els.initList || !els.sheetModal || !els.attackModal) {
        return;
    }

    const importInput = document.createElement('input');
    importInput.type = 'file';
    importInput.accept = '.json';
    importInput.hidden = true;
    document.body.appendChild(importInput);

    let characters = [];
    let playerLibrary = [];
    let monsterLibrary = [];
    let currentTurnId = null;
    let librarySearchTerm = '';
    let quickSearchTerm = '';
    let sheetContext = null;
    let sheetAttacks = [];
    let attackContext = null;
    let numericIdCounter = 0;

    const loadJsonArray = (key) => {
        try {
            const raw = localStorage.getItem(key);
            const parsed = raw ? JSON.parse(raw) : [];
            return Array.isArray(parsed) ? parsed : [];
        } catch (error) {
            return [];
        }
    };

    const generateId = (prefix = 'id') => `${prefix}-${Date.now()}-${Math.floor(Math.random() * 100000)}`;

    const generateNumericId = () => {
        numericIdCounter += 1;
        return Date.now() + numericIdCounter;
    };

    const normalizeText = (value) => String(value ?? '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();

    const escapeHtml = (value) => String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

    const stripHtml = (value) => String(value ?? '')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>/gi, '\n')
        .replace(/<\/li>/gi, '\n')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    const cleanWhitespace = (value) => String(value ?? '')
        .replace(/\s+/g, ' ')
        .trim();

    const parseNumber = (value) => {
        if (value === null || value === undefined || value === '') return undefined;
        const normalized = String(value).replace(',', '.').trim();
        if (normalized === '') return undefined;
        const parsed = Number.parseFloat(normalized);
        return Number.isFinite(parsed) ? parsed : undefined;
    };

    const parseInteger = (value) => {
        const parsed = parseNumber(value);
        return Number.isFinite(parsed) ? Math.trunc(parsed) : undefined;
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

    const normalizeAbilityBlock = (value) => {
        if (!value) return undefined;
        if (typeof value === 'string') {
            const text = cleanWhitespace(value);
            return text ? { text } : undefined;
        }

        if (typeof value !== 'object') return undefined;

        const pickText = (...candidates) => {
            for (const candidate of candidates) {
                const text = cleanWhitespace(candidate);
                if (text) return text;
            }
            return undefined;
        };

        return {
            forca: pickText(value.forca, value.strength, value.str),
            destreza: pickText(value.destreza, value.dexterity, value.dex),
            constituicao: pickText(value.constituicao, value.constitution, value.con),
            inteligencia: pickText(value.inteligencia, value.intelligence, value.int),
            sabedoria: pickText(value.sabedoria, value.wisdom, value.wis),
            carisma: pickText(value.carisma, value.charisma, value.cha)
        };
    };

    const normalizeFeatureList = (source, prefix = 'feature') => {
        if (!Array.isArray(source)) return [];

        return source
            .map((item, index) => {
                if (!item) return null;

                if (typeof item === 'string') {
                    const description = cleanWhitespace(stripHtml(item));
                    if (!description) return null;

                    return {
                        id: generateId(`${prefix}-${index}`),
                        name: `${prefix} ${index + 1}`,
                        description
                    };
                }

                const name = cleanWhitespace(item.nome ?? item.name ?? item.title ?? `${prefix} ${index + 1}`);
                const description = cleanWhitespace(stripHtml(item.descricao ?? item.description ?? item.text ?? ''));
                const icon = cleanWhitespace(item.icone ?? item.icon ?? '');
                const dmNote = cleanWhitespace(stripHtml(item.notaDM ?? item.note ?? ''));
                const cost = parseInteger(item.custo ?? item.cost);

                return {
                    id: String(item.id ?? generateId(`${prefix}-${index}`)),
                    name: name || `${prefix} ${index + 1}`,
                    description,
                    icon: icon || undefined,
                    dmNote: dmNote || undefined,
                    cost: Number.isFinite(cost) ? cost : undefined
                };
            })
            .filter(Boolean);
    };

    const featureListText = (source) => Array.isArray(source)
        ? source.map((item) => [
            item?.name ?? item?.nome,
            item?.description ?? item?.descricao,
            item?.dmNote ?? item?.notaDM,
            item?.text
        ].filter(Boolean).join(' ')).join(' ')
        : '';

    const formatIntegerPtBr = (value) => {
        if (!Number.isFinite(value)) return String(value ?? '');
        return new Intl.NumberFormat('pt-BR').format(value);
    };

    const formatLibraryMeta = (entity) => {
        const pieces = [];
        const initFormula = cleanWhitespace(entity?.initFormula ?? '');
        const initBonus = parseInteger(entity?.initBonus);
        if (initFormula) {
            pieces.push(`Inic ${initFormula}`);
        } else if (Number.isFinite(initBonus)) {
            pieces.push(`Inic 1d20${initBonus >= 0 ? '+' : ''}${initBonus}`);
        }

        if (entity?.ac !== undefined && entity?.ac !== null) pieces.push(`CA ${entity.ac}`);
        if (entity?.maxHp !== undefined && entity?.maxHp !== null) {
            const hpFormula = cleanWhitespace(entity?.hpFormula ?? '');
            pieces.push(`PV ${entity.hp ?? entity.maxHp}/${entity.maxHp}${hpFormula ? ` (${hpFormula})` : ''}`);
        } else if (entity?.hp !== undefined && entity?.hp !== null) {
            const hpFormula = cleanWhitespace(entity?.hpFormula ?? '');
            pieces.push(`PV ${entity.hp}${hpFormula ? ` (${hpFormula})` : ''}`);
        }

        return pieces.join(' | ');
    };

    const normalizeType = (value) => {
        const text = normalizeText(value);
        return text === 'enemy' || text === 'monstro' ? 'enemy' : 'player';
    };

    const normalizeState = (value) => {
        const text = normalizeText(value);
        if (text === 'dead' || text === 'morto') return 'dead';
        if (text === 'stable' || text === 'estavel' || text === 'estável') return 'stable';
        if (text === 'saving' || text === 'salvaguarda' || text === 'dying') return 'saving';
        return 'alive';
    };

    const normalizeDeathSaves = (value) => {
        const source = value && typeof value === 'object' ? value : {};
        const successes = parseInteger(source.successes ?? source.success ?? source.sucessos ?? source.sucesso) ?? 0;
        const failures = parseInteger(source.failures ?? source.failure ?? source.fracassos ?? source.fracasso) ?? 0;
        return {
            successes: Math.max(0, Math.min(3, successes)),
            failures: Math.max(0, Math.min(3, failures))
        };
    };

    const normalizeDamageTypeKey = (value) => {
        const text = normalizeText(value);
        if (!text) return '';
        if (text.includes('perfur') || text.includes('piercing')) return 'perfurante';
        if (text.includes('cortant') || text.includes('slashing')) return 'cortante';
        if (text.includes('concuss') || text.includes('contund') || text.includes('bludge')) return 'concussao';
        if (text.includes('fogo') || text.includes('fire')) return 'fogo';
        if (text.includes('frio') || text.includes('cold')) return 'frio';
        if (text.includes('acid') || text.includes('acido')) return 'acido';
        if (text.includes('eletric') || text.includes('lightning')) return 'eletrico';
        if (text.includes('trovej') || text.includes('thunder')) return 'trovejante';
        if (text.includes('psiqu') || text.includes('psychic')) return 'psiquico';
        if (text.includes('necrot')) return 'necrotico';
        if (text.includes('venen') || text.includes('poison')) return 'veneno';
        if (text.includes('radiant') || text.includes('radiante')) return 'radiante';
        if (text.includes('forca') || text.includes('force')) return 'forca';
        if (text.includes('energia')) return 'energia';
        return text;
    };

    const getTraitSet = (list) => new Set(splitList(list).map((item) => normalizeDamageTypeKey(item)).filter(Boolean));

    const getDamageModeForType = (damageType, target) => {
        const key = normalizeDamageTypeKey(damageType);
        if (!key) return 'normal';

        const immunities = getTraitSet(target?.immunities);
        const vulnerabilities = getTraitSet(target?.vulnerabilities);
        const resistances = getTraitSet(target?.resistances);

        if (immunities.has(key)) return 'immune';
        if (vulnerabilities.has(key)) return 'vulnerability';
        if (resistances.has(key)) return 'resistance';
        return 'normal';
    };

    const normalizeDamageLine = (line) => {
        const text = cleanWhitespace(line).replace(/[−–]/g, '-');
        if (!text) return null;

        const match = text.match(/^([0-9dD+\-*/().\s]+?)\s+(.+)$/);
        if (match) {
            return {
                formula: match[1].replace(/\s+/g, ''),
                type: cleanWhitespace(match[2])
            };
        }

        return {
            formula: text.replace(/\s+/g, ''),
            type: ''
        };
    };

    const normalizeDamageParts = (source) => {
        if (!source) return [];

        const list = Array.isArray(source)
            ? source
            : typeof source === 'string'
                ? source.split(/\r?\n/)
                : [source];

        return list
            .map((item) => {
                if (!item) return null;
                if (typeof item === 'string') {
                    return normalizeDamageLine(item);
                }

                if (typeof item === 'object') {
                    const formula = cleanWhitespace(item.formula ?? item.dice ?? item.roll ?? item.valor ?? item.damage ?? '');
                    const type = cleanWhitespace(item.type ?? item.damageType ?? item.label ?? item.nome ?? '');
                    if (!formula && !type) return null;
                    return {
                        formula: formula.replace(/\s+/g, ''),
                        type
                    };
                }

                return null;
            })
            .filter((item) => item && (item.formula || item.type));
    };

    const damagePartsToText = (parts) => parts
        .map((part) => {
            const type = cleanWhitespace(part?.type);
            return type ? `${part.formula} ${type}` : String(part?.formula ?? '').trim();
        })
        .filter(Boolean)
        .join('\n');

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

    const normalizeAttacks = (attacks) => {
        if (!Array.isArray(attacks)) return [];

        return attacks
            .map((attack, index) => {
                if (!attack) return null;

                if (typeof attack === 'string') {
                    const notes = stripHtml(attack);
                    return {
                        id: generateId(`attack-${index}`),
                        name: `Ataque ${index + 1}`,
                        bonus: undefined,
                        saveDc: undefined,
                        damage: parseDamagePartsFromText(notes),
                        notes,
                        kind: 'other'
                    };
                }

                const rawName = String(attack.name ?? attack.nome ?? attack.title ?? `Ataque ${index + 1}`).trim();
                const bonus = parseInteger(attack.bonus ?? attack.toHit ?? attack.attackBonus ?? attack.bonusToHit);
                const saveDc = parseInteger(attack.saveDc ?? attack.dc ?? attack.saveDC);
                const notes = stripHtml(attack.notes ?? attack.descricao ?? attack.description ?? attack.text ?? '');
                let damage = normalizeDamageParts(attack.damage ?? attack.dano ?? attack.damageParts);

                if (damage.length === 0 && notes) {
                    damage = parseDamagePartsFromText(notes);
                }

                return {
                    id: String(attack.id ?? generateId(`attack-${index}`)),
                    name: rawName || `Ataque ${index + 1}`,
                    bonus: Number.isFinite(bonus) ? bonus : undefined,
                    saveDc: Number.isFinite(saveDc) ? saveDc : undefined,
                    damage,
                    notes,
                    kind: Number.isFinite(bonus) ? 'attack' : Number.isFinite(saveDc) ? 'save' : 'other'
                };
            })
            .filter(Boolean);
    };

    const syncCombatantState = (combatant) => {
        if (!combatant) return combatant;

        combatant.deathSaves = normalizeDeathSaves(combatant.deathSaves);
        combatant.type = normalizeType(combatant.type);
        combatant.state = normalizeState(combatant.state);

        const hp = Number.isFinite(combatant.hp) ? combatant.hp : 0;

        if (combatant.type === 'player') {
            if (hp > 0) {
                combatant.state = 'alive';
                combatant.deathSaves = { successes: 0, failures: 0 };
            } else if (combatant.state === 'dead' || combatant.deathSaves.failures >= 3) {
                combatant.state = 'dead';
                combatant.deathSaves.failures = 3;
            } else if (combatant.state === 'stable' || combatant.deathSaves.successes >= 3) {
                combatant.state = 'stable';
                combatant.deathSaves.successes = 3;
            } else {
                combatant.state = 'saving';
            }
        } else {
            combatant.state = hp > 0 ? 'alive' : 'dead';
            combatant.deathSaves = { successes: 0, failures: 0 };
        }

        if (combatant.hp === undefined || combatant.hp === null || Number.isNaN(combatant.hp)) {
            combatant.hp = 0;
        }

        if (combatant.maxHp === undefined && combatant.hp > 0) {
            combatant.maxHp = combatant.hp;
        }

        if (Number.isFinite(combatant.maxHp) && combatant.hp > combatant.maxHp) {
            combatant.maxHp = combatant.hp;
        }

        return combatant;
    };

    const normalizeCombatant = (entry, fallbackId = generateId('combatant')) => {
        const rawEntry = deepClone(entry) ?? {};
        const id = parseInteger(rawEntry?.id);
        const hp = parseInteger(rawEntry?.hp);
        const maxHp = parseInteger(rawEntry?.maxHp ?? rawEntry?.hp_max ?? rawEntry?.maxHP ?? rawEntry?.pontosVida);
        const init = parseInteger(rawEntry?.init);
        const initFormulaSource = String(rawEntry?.initFormula ?? rawEntry?.initiativeFormula ?? rawEntry?.initBonus ?? '').trim();
        const attackList = normalizeAttacks(rawEntry?.attacks);
        const abilityBlock = normalizeAbilityBlock(rawEntry?.abilities ?? {
            forca: rawEntry?.forca,
            destreza: rawEntry?.destreza,
            constituicao: rawEntry?.constituicao,
            inteligencia: rawEntry?.inteligencia,
            sabedoria: rawEntry?.sabedoria,
            carisma: rawEntry?.carisma
        });

        const combatant = {
            ...rawEntry,
            id: Number.isFinite(id) ? id : parseInteger(fallbackId) ?? Date.now(),
            name: String(rawEntry?.name ?? rawEntry?.nome ?? 'Sem nome').trim() || 'Sem nome',
            init: Number.isFinite(init) ? init : 0,
            initFormula: initFormulaSource || (Number.isFinite(init) ? String(init) : '1d20'),
            ac: parseInteger(rawEntry?.ac ?? rawEntry?.ca ?? rawEntry?.classeArmadura),
            hp: Number.isFinite(hp) ? hp : 0,
            maxHp: Number.isFinite(maxHp) ? maxHp : (Number.isFinite(hp) ? hp : undefined),
            type: normalizeType(rawEntry?.type ?? rawEntry?.kind ?? (rawEntry?.monsterSlug ? 'enemy' : 'player')),
            sheetUrl: String(rawEntry?.sheetUrl ?? '').trim() || undefined,
            monsterSlug: String(rawEntry?.monsterSlug ?? '').trim() || undefined,
            attacks: attackList,
            resistances: splitList(rawEntry?.resistances ?? rawEntry?.resistencias ?? rawEntry?.resistenciasDano),
            vulnerabilities: splitList(rawEntry?.vulnerabilities ?? rawEntry?.vulnerabilidades ?? rawEntry?.vulnerabilidadesDano),
            immunities: splitList(rawEntry?.immunities ?? rawEntry?.imunidades ?? rawEntry?.imunidadesDano),
            conditionImmunities: splitList(rawEntry?.conditionImmunities ?? rawEntry?.imunidadesCondicoes),
            notes: String(rawEntry?.notes ?? rawEntry?.observacoes ?? '').trim(),
            cr: String(rawEntry?.cr ?? rawEntry?.challenge ?? rawEntry?.desafioCR_text ?? '').trim() || undefined,
            xp: parseLocalizedInteger(rawEntry?.xp ?? rawEntry?.experience ?? rawEntry?.xpValue ?? rawEntry?.experiencePoints),
            hpFormula: String(rawEntry?.hpFormula ?? rawEntry?.hitDice ?? rawEntry?.hpDice ?? '').trim() || undefined,
            size: String(rawEntry?.size ?? rawEntry?.tamanho ?? '').trim() || undefined,
            creatureType: String(rawEntry?.creatureType ?? rawEntry?.tipo ?? '').trim() || undefined,
            alignment: String(rawEntry?.alignment ?? rawEntry?.alinhamento ?? '').trim() || undefined,
            speed: String(rawEntry?.speed ?? rawEntry?.deslocamento ?? '').trim() || undefined,
            abilities: abilityBlock,
            savingThrows: String(rawEntry?.savingThrows ?? rawEntry?.testesResistencia ?? '').trim() || undefined,
            skills: String(rawEntry?.skills ?? rawEntry?.pericias ?? '').trim() || undefined,
            senses: String(rawEntry?.senses ?? rawEntry?.sentidos ?? '').trim() || undefined,
            languages: String(rawEntry?.languages ?? rawEntry?.idiomas ?? '').trim() || undefined,
            groupSlug: String(rawEntry?.groupSlug ?? rawEntry?.sourceGroupSlug ?? '').trim() || undefined,
            groupTitle: String(rawEntry?.groupTitle ?? rawEntry?.sourceGroupTitle ?? '').trim() || undefined,
            groupDescription: String(rawEntry?.groupDescription ?? rawEntry?.sourceGroupDescription ?? '').trim() || undefined,
            groupImage: String(rawEntry?.groupImage ?? rawEntry?.sourceGroupImage ?? '').trim() || undefined,
            image: String(rawEntry?.image ?? rawEntry?.portrait ?? rawEntry?.imagem ?? '').trim() || undefined,
            traits: normalizeFeatureList(rawEntry?.traits ?? rawEntry?.habilidadesEspeciais, 'trait'),
            actions: normalizeFeatureList(rawEntry?.actions ?? rawEntry?.acoes, 'action'),
            bonusActions: normalizeFeatureList(rawEntry?.bonusActions ?? rawEntry?.bonusAcoes, 'bonus-action'),
            legendaryActions: normalizeFeatureList(rawEntry?.legendaryActions ?? rawEntry?.acoesLendarias, 'legendary-action'),
            legendaryActionDescription: String(rawEntry?.legendaryActionDescription ?? rawEntry?.descricaoAcoesLendarias ?? '').trim() || undefined,
            description: String(rawEntry?.description ?? rawEntry?.descricaoGeral ?? '').trim() || undefined,
            sourceData: rawEntry?.sourceData ? deepClone(rawEntry.sourceData) : undefined,
            deathSaves: normalizeDeathSaves(rawEntry?.deathSaves ?? rawEntry?.deathSavingThrows ?? {
                successes: rawEntry?.successes,
                failures: rawEntry?.failures
            }),
            state: normalizeState(rawEntry?.state ?? rawEntry?.condition ?? rawEntry?.status)
        };

        return syncCombatantState(combatant);
    };

    const normalizeLibraryEntry = (entry, fallbackIndex = 0) => {
        const normalized = normalizeCombatant({
            ...entry,
            type: normalizeType(entry?.type ?? entry?.kind ?? (entry?.monsterSlug ? 'enemy' : 'player')),
            hp: parseInteger(entry?.hp ?? entry?.maxHp ?? entry?.pontosVida),
            maxHp: parseInteger(entry?.maxHp ?? entry?.hp ?? entry?.pontosVida),
            init: parseInteger(entry?.init),
            initFormula: String(entry?.initFormula ?? entry?.initiativeFormula ?? entry?.init ?? '1d20').trim(),
            deathSaves: undefined,
            state: 'alive'
        }, `library-${fallbackIndex}`);

        delete normalized.deathSaves;
        delete normalized.state;

        return normalized;
    };

    const buildSheetUrl = (entity) => {
        if (!entity) return '';
        if (entity.sheetUrl) return String(entity.sheetUrl);
        if (entity.monsterSlug) {
            return `../mm/monster.html?slug=${encodeURIComponent(entity.monsterSlug)}`;
        }
        if (entity.type === 'player' && entity.id && String(entity.id).includes('-')) {
            return '';
        }
        return '';
    };

    const getDamageText = (attacks) => attacks
        .map((attack) => {
            const parts = damagePartsToText(attack.damage);
            return parts ? `${attack.name}: ${parts}` : attack.name;
        })
        .join(' | ');

    const buildSearchBlob = (entity) => [
        entity?.name ?? '',
        entity?.cr ?? '',
        entity?.xp ?? '',
        entity?.hpFormula ?? '',
        entity?.size ?? '',
        entity?.creatureType ?? '',
        entity?.alignment ?? '',
        entity?.speed ?? '',
        entity?.savingThrows ?? '',
        entity?.skills ?? '',
        entity?.senses ?? '',
        entity?.languages ?? '',
        entity?.notes ?? '',
        entity?.description ?? '',
        entity?.sheetUrl ?? '',
        entity?.monsterSlug ?? '',
        entity?.groupTitle ?? '',
        entity?.groupDescription ?? '',
        featureListText(entity?.traits),
        featureListText(entity?.actions),
        featureListText(entity?.bonusActions),
        featureListText(entity?.legendaryActions),
        JSON.stringify(entity?.abilities ?? {}),
        JSON.stringify(entity?.sourceData ?? {}),
        (entity?.attacks ?? []).map((attack) => [attack.name, attack.notes, damagePartsToText(attack.damage)].join(' ')).join(' ')
    ].join(' ');

    const matchesSearch = (entity, term) => {
        if (!term) return true;
        return normalizeText(buildSearchBlob(entity)).includes(normalizeText(term));
    };

    const getCurrentTurnIndex = () => characters.findIndex((character) => character.id === currentTurnId);

    const getCurrentCharacter = () => {
        const index = getCurrentTurnIndex();
        return index >= 0 ? characters[index] : null;
    };

    const ensureCurrentTurn = () => {
        if (characters.length === 0) {
            currentTurnId = null;
            return;
        }

        if (getCurrentTurnIndex() === -1) {
            currentTurnId = characters[0].id;
        }
    };

    const persistState = () => {
        const activeIndex = getCurrentTurnIndex();
        localStorage.setItem(STORAGE_KEYS.characters, JSON.stringify(characters));
        localStorage.setItem(STORAGE_KEYS.turnId, currentTurnId !== null ? String(currentTurnId) : '');
        localStorage.setItem(STORAGE_KEYS.turnIndex, activeIndex >= 0 ? String(activeIndex) : '0');
        localStorage.setItem(STORAGE_KEYS.playerLibrary, JSON.stringify(playerLibrary));
        localStorage.setItem(STORAGE_KEYS.monsterLibrary, JSON.stringify(monsterLibrary));
    };

    const refreshAll = () => {
        characters = characters.map((character) => syncCombatantState(character));
        ensureCurrentTurn();
        persistState();
        renderEncounter();
        renderLibrary();
        renderSummary();
        renderQuickSearch();
        updatePanelButtons();
    };

    const isPanelOpen = (panelName) => document.body.classList.contains(`${panelName}-panel-open`);

    const updatePanelButtons = () => {
        const combatOpen = isPanelOpen('combat');
        const quickOpen = isPanelOpen('quick');

        els.toggleCombatPanelBtn.textContent = combatOpen ? 'Ocultar combatentes' : 'Adicionar combatentes';
        els.toggleCombatPanelBtn.setAttribute('aria-expanded', combatOpen ? 'true' : 'false');
        els.toggleQuickPanelBtn.textContent = quickOpen ? 'Ocultar busca' : 'Busca rápida';
        els.toggleQuickPanelBtn.setAttribute('aria-expanded', quickOpen ? 'true' : 'false');
    };

    const setPanelState = (panelName, open) => {
        const className = panelName === 'combat' ? 'combat-panel-open' : 'quick-panel-open';
        document.body.classList.toggle(className, open);
        updatePanelButtons();

        if (!open) return;

        window.setTimeout(() => {
            if (panelName === 'combat') {
                const activeTab = document.querySelector('#combat-panel .tab-btn.active')?.dataset.tab || 'add';
                if (activeTab === 'library') {
                    els.librarySearchInput?.focus();
                } else {
                    document.getElementById('name')?.focus();
                }
            } else {
                els.quickSearchInput?.focus();
            }
        }, 30);
    };

    const updateTypeUI = () => {
        const isEnemy = els.typeSelect.value === 'enemy';
        els.qtyGroup.style.display = isEnemy ? 'block' : 'none';
        els.saveToLibBtn.textContent = isEnemy ? 'Salvar monstro na biblioteca' : 'Salvar jogador na biblioteca';
    };

    const setActiveTab = (tabName) => {
        els.tabBtns.forEach((button) => {
            button.classList.toggle('active', button.dataset.tab === tabName);
        });

        els.tabContents.forEach((content) => {
            content.classList.toggle('active', content.id === `tab-${tabName}`);
        });

        if (tabName === 'library') {
            renderLibrary();
            window.setTimeout(() => els.librarySearchInput?.focus(), 30);
        }
    };

    const rollDie = (faces) => Math.floor(Math.random() * faces) + 1;

    const evaluateSimpleExpression = (expression) => {
        const sanitized = String(expression)
            .replace(/[−–]/g, '-')
            .replace(/\s+/g, '');

        if (!sanitized) return 0;

        let expr = sanitized.replace(/(\d*)d(\d+)/gi, (_, count, faces) => {
            const diceCount = count ? Number.parseInt(count, 10) : 1;
            const diceFaces = Number.parseInt(faces, 10);
            if (!Number.isFinite(diceCount) || !Number.isFinite(diceFaces)) return '0';

            let total = 0;
            for (let index = 0; index < diceCount; index += 1) {
                total += rollDie(diceFaces);
            }
            return String(total);
        });

        expr = expr.replace(/[^0-9+\-*/().]/g, '');
        if (!expr) return 0;

        try {
            const value = Function(`"use strict"; return (${expr});`)();
            return Number.isFinite(value) ? Math.round(value) : 0;
        } catch (error) {
            return 0;
        }
    };

    const rollFormula = (formula) => {
        const normalized = String(formula ?? '').trim().replace(/[−–]/g, '-').replace(/\s+/g, '');
        if (!normalized) return 0;

        const advantageMatch = normalized.match(/^2\(1d20([+\-]\d+)?\)$/i);
        if (advantageMatch) {
            const mod = advantageMatch[1] ? Number.parseInt(advantageMatch[1], 10) : 0;
            return Math.max(rollDie(20), rollDie(20)) + mod;
        }

        const standardD20Match = normalized.match(/^1d20([+\-]\d+)?$/i);
        if (standardD20Match) {
            const mod = standardD20Match[1] ? Number.parseInt(standardD20Match[1], 10) : 0;
            return rollDie(20) + mod;
        }

        return evaluateSimpleExpression(normalized);
    };

    const rollAttackCheck = (attackBonus, mode, extraBonus) => {
        const bonus = (Number.isFinite(attackBonus) ? attackBonus : 0) + (Number.isFinite(extraBonus) ? extraBonus : 0);

        if (mode === 'advantage' || mode === 'disadvantage') {
            const rollOne = rollDie(20);
            const rollTwo = rollDie(20);
            const chosen = mode === 'advantage' ? Math.max(rollOne, rollTwo) : Math.min(rollOne, rollTwo);
            return {
                rolls: [rollOne, rollTwo],
                chosen,
                total: chosen + bonus
            };
        }

        const roll = rollDie(20);
        return {
            rolls: [roll],
            chosen: roll,
            total: roll + bonus
        };
    };

    const formatHpDisplay = (combatant) => {
        const status = combatant.state || 'alive';
        if (status === 'saving') {
            const saves = normalizeDeathSaves(combatant.deathSaves);
            return `S ${saves.successes} • F ${saves.failures}`;
        }

        if (status === 'stable') {
            return 'Estável';
        }

        if (status === 'dead') {
            return 'Morto';
        }

        if (combatant.maxHp !== undefined && combatant.maxHp !== null) {
            return `${combatant.hp ?? 0}/${combatant.maxHp}`;
        }

        return String(combatant.hp ?? 0);
    };

    const formatSheetMeta = (entity) => {
        const pieces = [];
        if (entity.ac !== undefined && entity.ac !== null) pieces.push(`CA ${entity.ac}`);
        if (entity.maxHp !== undefined && entity.maxHp !== null) {
            pieces.push(`PV ${entity.hp ?? entity.maxHp}/${entity.maxHp}`);
        } else if (entity.hp !== undefined && entity.hp !== null) {
            pieces.push(`PV ${entity.hp}`);
        }
        if ((entity.attacks ?? []).length > 0) pieces.push(`Ataques ${entity.attacks.length}`);
        return pieces.join(' • ');
    };

    const getInitiativeLabel = (combatant) => String(combatant.init ?? 0);

    const canTakeTurn = (combatant) => normalizeState(combatant?.state) !== 'dead';

    const sortCombatantsByInitiative = () => {
        const currentId = currentTurnId;
        characters.sort((a, b) => (b.init ?? 0) - (a.init ?? 0));
        currentTurnId = currentId;
        ensureCurrentTurn();
        refreshAll();
    };

    const setCurrentTurnById = (id) => {
        currentTurnId = parseInteger(id) ?? currentTurnId;
        if (attackContext) {
            clearPendingAttack();
        }
        refreshAll();
    };

    const shiftTurn = (delta) => {
        if (characters.length === 0) return;

        const currentIndex = getCurrentTurnIndex();
        const baseIndex = currentIndex >= 0 ? currentIndex : (delta > 0 ? -1 : 0);
        let nextIndex = -1;

        for (let step = 1; step <= characters.length; step += 1) {
            const candidateIndex = (baseIndex + (delta * step) + characters.length) % characters.length;
            if (canTakeTurn(characters[candidateIndex])) {
                nextIndex = candidateIndex;
                break;
            }
        }

        if (nextIndex === -1) {
            currentTurnId = null;
            if (attackContext) {
                clearPendingAttack();
            }
            refreshAll();
            return;
        }

        currentTurnId = characters[nextIndex].id;
        if (attackContext) {
            clearPendingAttack();
        }
        refreshAll();
    };

    const applyHpDelta = (id, delta) => {
        const combatant = characters.find((character) => character.id === parseInteger(id));
        if (!combatant || !Number.isFinite(delta) || delta === 0) return;

        const currentHp = Number.isFinite(combatant.hp) ? combatant.hp : 0;
        const nextHp = Math.max(0, currentHp + delta);

        if (delta > 0) {
            combatant.hp = nextHp;
            if (combatant.type === 'player') {
                combatant.deathSaves = { successes: 0, failures: 0 };
                combatant.state = 'alive';
            } else if (nextHp > 0) {
                combatant.state = 'alive';
            }
            if (Number.isFinite(combatant.maxHp) && combatant.hp > combatant.maxHp) {
                combatant.maxHp = combatant.hp;
            } else if (combatant.maxHp === undefined) {
                combatant.maxHp = combatant.hp;
            }
        } else if (combatant.state === 'saving' || combatant.state === 'stable') {
            if (combatant.type === 'player') {
                applyDeathSave(combatant, 'failure');
            }
            return;
        } else {
            combatant.hp = nextHp;
            if (nextHp === 0) {
                if (combatant.type === 'player') {
                    combatant.deathSaves = { successes: 0, failures: 0 };
                    combatant.state = 'saving';
                } else {
                    combatant.state = 'dead';
                }
            }
        }

        syncCombatantState(combatant);
        refreshAll();
    };

    const applyDeathSave = (combatant, kind) => {
        if (!combatant || combatant.type !== 'player') return false;
        if ((combatant.hp ?? 0) > 0) return false;
        if (combatant.state === 'dead') return false;

        const saves = normalizeDeathSaves(combatant.deathSaves);
        let changed = false;

        if (kind === 'success' && saves.successes < 3 && combatant.state !== 'dead') {
            saves.successes += 1;
            changed = true;
        }

        if (kind === 'failure' && saves.failures < 3 && combatant.state !== 'dead') {
            saves.failures += 1;
            changed = true;
        }

        combatant.deathSaves = saves;

        if (saves.failures >= 3) {
            combatant.state = 'dead';
        } else if (saves.successes >= 3) {
            combatant.state = 'stable';
        } else {
            combatant.state = 'saving';
        }

        return changed;
    };

    const clearPendingAttack = () => {
        attackContext = null;
        document.body.classList.remove('attack-targeting');
        els.combatNotice.textContent = '';
        renderEncounter();
    };

    const openModal = (modalEl) => {
        modalEl.classList.remove('hidden');
        modalEl.setAttribute('aria-hidden', 'false');
    };

    const closeModal = (modalEl) => {
        modalEl.classList.add('hidden');
        modalEl.setAttribute('aria-hidden', 'true');
    };

    const closeSheetModal = () => {
        sheetContext = null;
        sheetAttacks = [];
        els.sheetEditingAttackIndex.value = '';
        els.attackEditorId.value = '';
        closeModal(els.sheetModal);
    };

    const closeAttackModal = () => {
        attackContext = null;
        closeModal(els.attackModal);
        renderAllWithoutPersist();
    };

    const openSheetEditor = (context) => {
        const kind = context?.kind === 'library' ? 'library' : 'combatant';
        const type = normalizeType(context?.type ?? context?.entity?.type ?? 'player');
        const source = kind === 'combatant'
            ? characters.find((character) => character.id === parseInteger(context?.id))
            : (type === 'enemy'
                ? monsterLibrary[parseInteger(context?.index) ?? -1]
                : playerLibrary[parseInteger(context?.index) ?? -1]);

        if (!source) return;

        sheetContext = {
            kind,
            type,
            id: kind === 'combatant' ? source.id : undefined,
            index: kind === 'library' ? parseInteger(context?.index) : undefined,
            monsterSlug: source.monsterSlug,
            conditionImmunities: source.conditionImmunities
        };

        sheetAttacks = normalizeAttacks(source.attacks);

        els.sheetContextKind.value = sheetContext.kind;
        els.sheetContextType.value = sheetContext.type;
        els.sheetContextId.value = sheetContext.id ?? '';
        els.sheetContextIndex.value = sheetContext.index ?? '';
        els.sheetEditingAttackIndex.value = '';
        els.attackEditorId.value = '';
        els.sheetModalTitle.textContent = kind === 'combatant'
            ? `Ficha de ${source.name}`
            : `Biblioteca de ${source.name}`;

        els.sheetName.value = source.name ?? '';
        els.sheetInit.value = kind === 'combatant'
            ? String(source.init ?? '')
            : String(source.initFormula ?? source.init ?? '');
        els.sheetAc.value = source.ac ?? '';
        els.sheetHp.value = source.hp ?? '';
        els.sheetMaxHp.value = source.maxHp ?? source.hp ?? '';
        els.sheetUrl.value = buildSheetUrl(source) || '';
        els.sheetResistances.value = (source.resistances ?? []).join(', ');
        els.sheetVulnerabilities.value = (source.vulnerabilities ?? []).join(', ');
        els.sheetImmunities.value = (source.immunities ?? []).join(', ');
        els.sheetNotes.value = source.notes ?? '';

        els.sheetSaveLibraryBtn.textContent = kind === 'combatant' ? 'Salvar na biblioteca' : 'Salvar na biblioteca';
        els.sheetOpenLinkBtn.disabled = !els.sheetUrl.value && !source.monsterSlug;

        renderSheetAttacksList();
        openModal(els.sheetModal);

        window.setTimeout(() => {
            els.sheetName.focus();
        }, 30);
    };

    const saveAttackEditor = () => {
        const attackId = els.attackEditorId.value.trim();
        const name = els.attackName.value.trim();
        const bonus = parseInteger(els.attackBonus.value);
        const saveDc = parseInteger(els.attackSaveDc.value);
        const damage = normalizeDamageParts(els.attackDamage.value);
        const notes = els.attackNotes.value.trim();

        if (!name) {
            window.alert('Dê um nome para o ataque antes de salvar.');
            return;
        }

        const attack = {
            id: attackId || generateId('attack'),
            name,
            bonus: Number.isFinite(bonus) ? bonus : undefined,
            saveDc: Number.isFinite(saveDc) ? saveDc : undefined,
            damage,
            notes,
            kind: Number.isFinite(bonus) ? 'attack' : Number.isFinite(saveDc) ? 'save' : 'other'
        };

        const existingIndex = attackId ? sheetAttacks.findIndex((item) => item.id === attackId) : -1;
        if (existingIndex >= 0) {
            sheetAttacks[existingIndex] = attack;
        } else {
            sheetAttacks.push(attack);
        }

        els.attackEditorId.value = '';
        els.sheetEditingAttackIndex.value = '';
        els.attackName.value = '';
        els.attackBonus.value = '';
        els.attackSaveDc.value = '';
        els.attackDamage.value = '';
        els.attackNotes.value = '';
        els.attackSaveBtn.textContent = 'Adicionar ataque';

        renderSheetAttacksList();
    };

    const editAttackFromSheet = (attackId) => {
        const index = sheetAttacks.findIndex((attack) => attack.id === attackId);
        if (index === -1) return;

        const attack = sheetAttacks[index];
        els.attackEditorId.value = attack.id;
        els.sheetEditingAttackIndex.value = String(index);
        els.attackName.value = attack.name ?? '';
        els.attackBonus.value = attack.bonus ?? '';
        els.attackSaveDc.value = attack.saveDc ?? '';
        els.attackDamage.value = damagePartsToText(attack.damage);
        els.attackNotes.value = attack.notes ?? '';
        els.attackSaveBtn.textContent = 'Atualizar ataque';
        els.attackName.focus();
    };

    const removeAttackFromSheet = (attackId) => {
        const index = sheetAttacks.findIndex((attack) => attack.id === attackId);
        if (index === -1) return;

        sheetAttacks.splice(index, 1);
        renderSheetAttacksList();
    };

    const resetAttackEditor = () => {
        els.attackEditorId.value = '';
        els.sheetEditingAttackIndex.value = '';
        els.attackName.value = '';
        els.attackBonus.value = '';
        els.attackSaveDc.value = '';
        els.attackDamage.value = '';
        els.attackNotes.value = '';
        els.attackSaveBtn.textContent = 'Adicionar ataque';
    };

    const renderSheetAttacksList = () => {
        if (!els.sheetAttacksList) return;

        if (sheetAttacks.length === 0) {
            els.sheetAttacksList.innerHTML = `
                <div class="quick-empty">
                    Nenhum ataque salvo ainda.
                </div>
            `;
            return;
        }

        els.sheetAttacksList.innerHTML = sheetAttacks.map((attack) => {
            const damageText = damagePartsToText(attack.damage) || 'Sem dano';
            const metaParts = [];
            if (Number.isFinite(attack.bonus)) metaParts.push(`+${attack.bonus}`);
            if (Number.isFinite(attack.saveDc)) metaParts.push(`CD ${attack.saveDc}`);
            if (attack.damage.length > 0) metaParts.push(`${attack.damage.length} dano(s)`);

            return `
                <div class="attack-item">
                    <div class="attack-item-main">
                        <div class="attack-item-title">${escapeHtml(attack.name)}</div>
                        <div class="attack-item-meta">
${escapeHtml(metaParts.join(' • ') || 'Ataque sem bônus definido')}
${escapeHtml(damageText)}
${escapeHtml(attack.notes || '')}
                        </div>
                    </div>
                    <div class="attack-item-actions">
                        <button type="button" class="btn-small-icon card-edit-button edit-sheet-attack" data-attack-id="${escapeHtml(attack.id)}">
                            Editar
                        </button>
                        <button type="button" class="btn-small-icon btn-del-lib remove-sheet-attack" data-attack-id="${escapeHtml(attack.id)}">
                            Excluir
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        document.querySelectorAll('.edit-sheet-attack').forEach((button) => {
            button.onclick = () => editAttackFromSheet(button.dataset.attackId);
        });

        document.querySelectorAll('.remove-sheet-attack').forEach((button) => {
            button.onclick = () => removeAttackFromSheet(button.dataset.attackId);
        });
    };

    const readSheetForm = () => {
        const name = els.sheetName.value.trim();
        const initText = els.sheetInit.value.trim();
        const ac = parseInteger(els.sheetAc.value);
        const hp = parseInteger(els.sheetHp.value);
        const maxHp = parseInteger(els.sheetMaxHp.value);
        const sheetUrl = els.sheetUrl.value.trim();
        const resistances = splitList(els.sheetResistances.value);
        const vulnerabilities = splitList(els.sheetVulnerabilities.value);
        const immunities = splitList(els.sheetImmunities.value);
        const notes = els.sheetNotes.value.trim();
        const initLooksLikeFormula = /[d()]/i.test(initText);
        const init = initLooksLikeFormula ? rollFormula(initText) : (parseInteger(initText) ?? 0);

        return {
            name,
            initText,
            init,
            ac,
            hp,
            maxHp,
            sheetUrl,
            resistances,
            vulnerabilities,
            immunities,
            notes
        };
    };

    const saveCombatantSheet = () => {
        if (!sheetContext || sheetContext.kind !== 'combatant') return;

        const sourceIndex = characters.findIndex((character) => character.id === parseInteger(sheetContext.id));
        if (sourceIndex === -1) return;

        const values = readSheetForm();
        if (!values.name) {
            window.alert('O nome não pode ficar vazio.');
            return;
        }

        const existing = characters[sourceIndex];
        const nextHp = Number.isFinite(values.hp) ? values.hp : existing.hp;
        const nextMaxHp = Number.isFinite(values.maxHp)
            ? Math.max(values.maxHp, Number.isFinite(nextHp) ? nextHp : values.maxHp)
            : (Number.isFinite(existing.maxHp) ? existing.maxHp : (Number.isFinite(nextHp) ? nextHp : undefined));

        existing.name = values.name;
        existing.init = Number.isFinite(values.init) ? values.init : existing.init;
        existing.initFormula = values.initText || existing.initFormula || String(existing.init ?? 0);
        existing.ac = Number.isFinite(values.ac) ? values.ac : undefined;
        existing.hp = Number.isFinite(nextHp) ? nextHp : existing.hp;
        existing.maxHp = Number.isFinite(nextMaxHp) ? nextMaxHp : existing.maxHp;
        existing.sheetUrl = values.sheetUrl || existing.sheetUrl;
        existing.resistances = values.resistances;
        existing.vulnerabilities = values.vulnerabilities;
        existing.immunities = values.immunities;
        existing.notes = values.notes;
        existing.attacks = deepClone(sheetAttacks);

        if (existing.hp > 0) {
            existing.deathSaves = { successes: 0, failures: 0 };
        }

        syncCombatantState(existing);

        if (existing.hp > 0) {
            sortCombatantsByInitiative();
        } else {
            refreshAll();
        }

        closeSheetModal();
    };

    const buildLibraryEntryFromSheet = () => {
        const values = readSheetForm();
        if (!values.name) {
            window.alert('O nome não pode ficar vazio.');
            return null;
        }

        const type = sheetContext?.type ?? 'player';
        const hpForLibrary = Number.isFinite(values.maxHp) ? values.maxHp : values.hp;
        const source = sheetContext?.kind === 'combatant'
            ? characters.find((character) => character.id === parseInteger(sheetContext.id))
            : (type === 'enemy'
                ? monsterLibrary[sheetContext?.index ?? -1]
                : playerLibrary[sheetContext?.index ?? -1]);
        const baseEntry = source ? deepClone(source) : {};

        return {
            ...baseEntry,
            name: values.name,
            type,
            initFormula: values.initText || baseEntry.initFormula || '1d20',
            ac: Number.isFinite(values.ac) ? values.ac : undefined,
            hp: Number.isFinite(hpForLibrary) ? hpForLibrary : undefined,
            maxHp: Number.isFinite(hpForLibrary) ? hpForLibrary : undefined,
            sheetUrl: values.sheetUrl || baseEntry.sheetUrl || undefined,
            monsterSlug: sheetContext?.monsterSlug ?? baseEntry.monsterSlug,
            attacks: deepClone(sheetAttacks),
            resistances: values.resistances,
            vulnerabilities: values.vulnerabilities,
            immunities: values.immunities,
            conditionImmunities: sheetContext?.conditionImmunities ?? baseEntry.conditionImmunities ?? [],
            notes: values.notes
        };
    };

    const findLibraryMatchIndex = (type, entry) => {
        const list = type === 'player' ? playerLibrary : monsterLibrary;
        const sheetUrl = String(entry.sheetUrl ?? '').trim();
        const monsterSlug = String(entry.monsterSlug ?? '').trim();
        const nameKey = normalizeText(entry.name);

        return list.findIndex((candidate) => {
            if (sheetUrl && candidate.sheetUrl && String(candidate.sheetUrl).trim() === sheetUrl) return true;
            if (monsterSlug && candidate.monsterSlug && String(candidate.monsterSlug).trim() === monsterSlug) return true;
            return normalizeText(candidate.name) === nameKey;
        });
    };

    const saveLibraryFromSheet = () => {
        const entry = buildLibraryEntryFromSheet();
        if (!entry) return;

        const type = entry.type === 'enemy' ? 'enemy' : 'player';
        const list = type === 'player' ? playerLibrary : monsterLibrary;
        const matchIndex = findLibraryMatchIndex(type, entry);

        if (matchIndex >= 0) {
            list[matchIndex] = normalizeLibraryEntry({
                ...list[matchIndex],
                ...entry
            }, matchIndex);
        } else {
            list.push(normalizeLibraryEntry(entry, list.length));
        }

        persistState();
        renderLibrary();
        renderQuickSearch();
        window.alert('Biblioteca atualizada.');
    };

    const openSheetLink = () => {
        if (!sheetContext) return;

        const source = sheetContext.kind === 'combatant'
            ? characters.find((character) => character.id === parseInteger(sheetContext.id))
            : (sheetContext.type === 'enemy'
                ? monsterLibrary[sheetContext.index ?? -1]
                : playerLibrary[sheetContext.index ?? -1]);

        const url = buildSheetUrl(source);
        if (!url) return;

        window.open(url, '_blank', 'noopener');
    };

    const openAttackModal = (source, target, attack) => {
        attackContext = {
            sourceId: source.id,
            targetId: target.id,
            attackId: attack.id,
            damageRolls: (attack.damage ?? []).map((part) => ({
                ...part,
                rolled: rollFormula(part.formula)
            }))
        };

        els.attackModalTitle.textContent = attack.name || 'Resolver ataque';
        els.attackModalSubtitle.textContent = `${source.name} contra ${target.name}`;
        els.attackSourceName.textContent = source.name;
        els.attackTargetName.textContent = target.name;
        els.attackRollMode.value = 'normal';
        els.attackRollBonus.value = '0';
        els.attackRollNote.value = attack.notes || '';
        els.attackDamageSummary.textContent = attack.damage.length > 0
            ? `${attack.damage.length} parte(s) de dano`
            : 'Sem dano registrado';
        els.attackDamageLines.innerHTML = attack.damage.map((part, index) => {
            const mode = getDamageModeForType(part.type, target);
            return `
                <div class="damage-line" data-damage-index="${index}">
                    <div class="damage-line-main">
                        <div class="damage-line-label">${escapeHtml(part.type || `Dano ${index + 1}`)}</div>
                        <div class="damage-line-formula">
                            ${escapeHtml(part.formula || '0')} = <strong class="damage-base-roll">${attackContext.damageRolls[index].rolled}</strong>
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="damage-mode-${index}">Aplicar</label>
                        <select id="damage-mode-${index}" class="damage-mode-select" data-damage-index="${index}">
                            <option value="normal"${mode === 'normal' ? ' selected' : ''}>Normal</option>
                            <option value="resistance"${mode === 'resistance' ? ' selected' : ''}>Resistência</option>
                            <option value="vulnerability"${mode === 'vulnerability' ? ' selected' : ''}>Vulnerabilidade</option>
                            <option value="immune"${mode === 'immune' ? ' selected' : ''}>Imune</option>
                        </select>
                    </div>
                    <div class="damage-line-total">
                        <span class="damage-line-label">Final</span>
                        <strong data-final-damage="${index}">0</strong>
                    </div>
                </div>
            `;
        }).join('');

        openModal(els.attackModal);
        document.body.classList.remove('attack-targeting');
        updateAttackPreview();
        window.setTimeout(() => {
            els.attackRollMode.focus();
        }, 30);
    };

    const getAttackContext = () => {
        if (!attackContext) return null;

        const source = characters.find((character) => character.id === attackContext.sourceId);
        const target = characters.find((character) => character.id === attackContext.targetId);
        if (!source || !target) return null;

        const attack = source.attacks.find((item) => item.id === attackContext.attackId);
        if (!attack) return null;

        return {
            source,
            target,
            attack
        };
    };

    const updateAttackPreview = () => {
        const context = getAttackContext();
        if (!context) {
            els.attackResultPreview.textContent = 'Nenhum ataque carregado.';
            return;
        }

        const extraBonus = parseInteger(els.attackRollBonus.value) ?? 0;
        const mode = els.attackRollMode.value;
        const attackBonus = Number.isFinite(context.attack.bonus) ? context.attack.bonus : 0;
        const attackRoll = rollAttackCheck(attackBonus, mode, extraBonus);
        const targetAc = Number.isFinite(context.target.ac) ? context.target.ac : null;
        const hasAttackRoll = Number.isFinite(context.attack.bonus) || extraBonus !== 0 || mode !== 'normal';
        const hit = !hasAttackRoll || targetAc === null ? true : attackRoll.total >= targetAc;
        const note = els.attackRollNote.value.trim();

        let totalDamage = 0;
        const selectedLines = [];

        (attackContext.damageRolls ?? []).forEach((part, index) => {
            const select = document.querySelector(`.damage-mode-select[data-damage-index="${index}"]`);
            const modeValue = select?.value || getDamageModeForType(part.type, context.target);
            const multiplier = modeValue === 'resistance' ? 0.5 : modeValue === 'vulnerability' ? 2 : modeValue === 'immune' ? 0 : 1;
            const finalDamage = Math.floor((part.rolled ?? 0) * multiplier);
            const finalSlot = document.querySelector(`[data-final-damage="${index}"]`);
            if (finalSlot) {
                finalSlot.textContent = String(finalDamage);
            }
            totalDamage += finalDamage;
            selectedLines.push(`${part.type || `Dano ${index + 1}`}: ${part.rolled}${multiplier !== 1 ? ` x${multiplier}` : ''} = ${finalDamage}`);
        });

        const attackLine = hasAttackRoll
            ? `Rolagem ${attackRoll.rolls.join(mode === 'normal' ? '' : ' / ')} + ${attackBonus + extraBonus} = ${attackRoll.total}${targetAc !== null ? ` contra CA ${targetAc}` : ''}`
            : `Sem rolagem automática${targetAc !== null ? ` • CA ${targetAc}` : ''}`;

        const resultLine = hit
            ? `Acerto. Dano total: ${totalDamage}.`
            : 'Erro. Nenhum dano será aplicado.';

        els.attackDamageSummary.textContent = selectedLines.join(' • ') || 'Sem dano registrado';
        els.attackResultPreview.innerHTML = `
            <strong>${escapeHtml(attackLine)}</strong>
            <br>${escapeHtml(resultLine)}
            ${note ? `<br>${escapeHtml(note)}` : ''}
        `;

        attackContext.preview = {
            hit,
            totalDamage,
            attackRoll,
            note
        };
    };

    const applyAttackDamage = () => {
        const context = getAttackContext();
        if (!context || !attackContext?.preview) return;

        if (!attackContext.preview.hit) {
            els.combatNotice.textContent = `${context.source.name} errou ${context.target.name}.`;
            closeAttackModal();
            refreshAll();
            return;
        }

        const target = context.target;
        const source = context.source;
        const totalDamage = Math.max(0, attackContext.preview.totalDamage ?? 0);
        const hpBefore = Number.isFinite(target.hp) ? target.hp : 0;
        let hpAfter = hpBefore;
        let deathSaveTriggered = false;

        if (totalDamage > 0) {
            if (target.type === 'player' && hpBefore <= 0) {
                deathSaveTriggered = applyDeathSave(target, 'failure');
            } else {
                hpAfter = Math.max(0, hpBefore - totalDamage);
                target.hp = hpAfter;

                if (hpAfter > 0) {
                    if (target.type === 'player') {
                        target.state = 'alive';
                        target.deathSaves = { successes: 0, failures: 0 };
                    } else {
                        target.state = 'alive';
                    }
                    if (Number.isFinite(target.maxHp) && target.hp > target.maxHp) {
                        target.maxHp = target.hp;
                    }
                } else if (target.type === 'player') {
                    if (hpBefore > 0) {
                        target.deathSaves = { successes: 0, failures: 0 };
                    }
                    target.state = target.deathSaves.failures >= 3 ? 'dead' : 'saving';
                } else {
                    target.state = 'dead';
                }
            }
        }

        syncCombatantState(target);
        persistState();
        renderAllWithoutPersist();

        const damageText = totalDamage > 0 ? `${totalDamage} de dano` : 'sem dano';
        const suffix = deathSaveTriggered
            ? ' e recebeu um fracasso de salvaguarda'
            : '';
        els.combatNotice.textContent = `${source.name} acertou ${target.name} com ${attackContext.attackId ? getAttackContext()?.attack?.name ?? 'o ataque' : 'o ataque'}: ${damageText}${suffix}.`;

        closeAttackModal();
    };

    const renderCombatantAttackButtons = (combatant) => {
        if (!combatant.attacks || combatant.attacks.length === 0) return '';

        return `
            <div class="attack-row">
                ${combatant.attacks.map((attack) => `
                    <button
                        type="button"
                        class="attack-pill ${attack.kind === 'save' ? 'attack-save' : ''}"
                        data-combatant-id="${combatant.id}"
                        data-attack-id="${escapeHtml(attack.id)}"
                        title="${escapeHtml([
                            attack.name,
                            Number.isFinite(attack.bonus) ? `+${attack.bonus}` : '',
                            Number.isFinite(attack.saveDc) ? `CD ${attack.saveDc}` : '',
                            damagePartsToText(attack.damage)
                        ].filter(Boolean).join(' • '))}"
                    >
                        ${escapeHtml(attack.name)}
                        ${Number.isFinite(attack.bonus) ? ` +${attack.bonus}` : ''}
                        ${!Number.isFinite(attack.bonus) && Number.isFinite(attack.saveDc) ? ` CD ${attack.saveDc}` : ''}
                    </button>
                `).join('')}
            </div>
        `;
    };

    const renderHpControls = (combatant) => {
        const status = combatant.state || 'alive';
        const hpValue = formatHpDisplay(combatant);

        if (status === 'alive') {
            return `
                <div class="hp-row">
                    <div class="hp-controls">
                        <button class="hp-btn hp-minus" data-id="${combatant.id}" type="button" title="-1 PV">-</button>
                        <button class="hp-btn hp-minus" data-id="${combatant.id}" data-step="-5" type="button" title="-5 PV">-5</button>
                    </div>
                    <div class="hp-pill">${escapeHtml(hpValue)}</div>
                    <div class="hp-controls">
                        <button class="hp-btn hp-plus" data-id="${combatant.id}" type="button" title="+1 PV">+</button>
                        <button class="hp-btn hp-quick" data-id="${combatant.id}" data-step="5" type="button" title="+5 PV">+5</button>
                    </div>
                </div>
            `;
        }

        if (status === 'saving') {
            return `
                <div class="hp-row">
                    <div class="hp-controls">
                        <button class="hp-btn hp-minus" data-id="${combatant.id}" data-save="failure" type="button" title="Fracasso">-</button>
                    </div>
                    <div class="hp-pill state-saving">${escapeHtml(hpValue)}</div>
                    <div class="hp-controls">
                        <button class="hp-btn hp-plus" data-id="${combatant.id}" data-save="success" type="button" title="Sucesso">+</button>
                        <button class="hp-btn hp-quick" data-id="${combatant.id}" data-step="5" type="button" title="Curar 5 PV">+5</button>
                    </div>
                </div>
            `;
        }

        if (status === 'stable') {
            return `
                <div class="hp-row">
                    <div class="hp-controls">
                        <button class="hp-btn hp-plus" data-id="${combatant.id}" type="button" title="Curar 1 PV">+</button>
                    </div>
                    <div class="hp-pill state-stable">${escapeHtml(hpValue)}</div>
                    <div class="hp-controls">
                        <button class="hp-btn hp-quick" data-id="${combatant.id}" data-step="5" type="button" title="Curar 5 PV">+5</button>
                    </div>
                </div>
            `;
        }

        return `
            <div class="hp-row">
                <div class="hp-controls">
                    <button class="hp-btn hp-plus" data-id="${combatant.id}" type="button" title="Reviver 1 PV">+</button>
                    <button class="hp-btn hp-quick" data-id="${combatant.id}" data-step="5" type="button" title="Reviver 5 PV">+5</button>
                </div>
                <div class="hp-pill state-dead">${escapeHtml(hpValue)}</div>
                <div class="hp-controls">
                    <button class="hp-btn hp-remove" data-id="${combatant.id}" type="button" title="Excluir da iniciativa">Excluir</button>
                </div>
            </div>
        `;
    };

    const renderCombatantCard = (combatant) => {
        const isCurrent = combatant.id === currentTurnId;
        const isTargetSource = attackContext?.sourceId === combatant.id;
        const cardClasses = [
            'combatant-card',
            `type-${combatant.type}`,
            `state-${combatant.state || 'alive'}`
        ];

        if (isCurrent) cardClasses.push('is-current');
        if (attackContext) cardClasses.push('is-targetable');
        if (isTargetSource) cardClasses.push('is-target-source');

        const sheetUrl = buildSheetUrl(combatant);
        const meta = [];
        if (combatant.ac !== undefined && combatant.ac !== null) {
            meta.push(`CA ${combatant.ac}`);
        }
        if ((combatant.vulnerabilities ?? []).length > 0) {
            meta.push(`Vuln ${combatant.vulnerabilities.length}`);
        }

        return `
            <article class="${cardClasses.join(' ')}" data-id="${combatant.id}">
                <div class="card-top">
                    <div class="init-badge">${escapeHtml(getInitiativeLabel(combatant))}</div>
                    <div class="card-core">
                        <div class="name-row">
                            <div class="char-name" title="${escapeHtml(combatant.name)}">${escapeHtml(combatant.name)}</div>
                        </div>
                        <div class="card-detail-row">
                            <div class="card-meta">
                                ${meta.map((item) => `<span class="meta-pill">${escapeHtml(item)}</span>`).join('')}
                            </div>
                            <div class="card-link-row">
                                ${sheetUrl ? `<a href="${escapeHtml(sheetUrl)}" target="_blank" rel="noopener" class="card-link-button btn-inline btn-mini">Ficha</a>` : ''}
                                <button type="button" class="card-edit-button btn-inline btn-mini edit-combatant" data-id="${combatant.id}">
                                    Editar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                ${renderCombatantAttackButtons(combatant)}
                ${renderHpControls(combatant)}
            </article>
        `;
    };

    const renderEncounter = () => {
        ensureCurrentTurn();

        if (characters.length === 0) {
            els.initList.innerHTML = `
                <div class="empty-state">
                    <h3>Sem combatentes na mesa</h3>
                    <p>
                        Abra o painel de combatentes para montar a ordem de turno ou use a busca rápida para
                        trazer alguém salvo.
                    </p>
                    <div class="empty-actions">
                        <button type="button" id="open-combat-panel-empty" class="btn btn-primary btn-inline">
                            Abrir painel
                        </button>
                        <button type="button" id="open-quick-panel-empty" class="btn btn-secondary btn-inline">
                            Busca rápida
                        </button>
                    </div>
                </div>
            `;

            const emptyCombatButton = document.getElementById('open-combat-panel-empty');
            const emptyQuickButton = document.getElementById('open-quick-panel-empty');

            if (emptyCombatButton) {
                emptyCombatButton.onclick = () => setPanelState('combat', true);
            }

            if (emptyQuickButton) {
                emptyQuickButton.onclick = () => setPanelState('quick', true);
            }

            return;
        }

        els.initList.innerHTML = characters.map((combatant) => renderCombatantCard(combatant)).join('');

        document.querySelectorAll('.edit-combatant').forEach((button) => {
            button.onclick = () => {
                clearPendingAttack();
                openSheetEditor({
                    kind: 'combatant',
                    type: characters.find((character) => character.id === parseInteger(button.dataset.id))?.type,
                    id: button.dataset.id
                });
            };
        });

        document.querySelectorAll('.attack-pill').forEach((button) => {
            button.onclick = (event) => {
                event.stopPropagation();
                const source = characters.find((character) => character.id === parseInteger(button.dataset.combatantId));
                if (!source) return;
                const attack = source.attacks.find((item) => item.id === button.dataset.attackId);
                if (!attack) return;

                attackContext = null;
                document.body.classList.add('attack-targeting');
                els.combatNotice.textContent = `Escolha o alvo de "${attack.name}".`;
                attackContext = {
                    sourceId: source.id,
                    attackId: attack.id,
                    waitingForTarget: true
                };
                renderEncounter();
            };
        });

        document.querySelectorAll('.hp-minus').forEach((button) => {
            button.onclick = () => {
                const combatant = characters.find((character) => character.id === parseInteger(button.dataset.id));
                if (!combatant) return;

                if (button.dataset.save === 'failure') {
                    applyDeathSave(combatant, 'failure');
                    syncCombatantState(combatant);
                    refreshAll();
                    return;
                }

                applyHpDelta(button.dataset.id, parseInteger(button.dataset.step) ?? -1);
            };
        });

        document.querySelectorAll('.hp-plus').forEach((button) => {
            button.onclick = () => {
                const combatant = characters.find((character) => character.id === parseInteger(button.dataset.id));
                if (!combatant) return;

                if (button.dataset.save === 'success') {
                    applyDeathSave(combatant, 'success');
                    syncCombatantState(combatant);
                    refreshAll();
                    return;
                }

                applyHpDelta(button.dataset.id, 1);
            };
        });

        document.querySelectorAll('.hp-quick').forEach((button) => {
            button.onclick = () => {
                applyHpDelta(button.dataset.id, parseInteger(button.dataset.step) ?? 5);
            };
        });

        document.querySelectorAll('.hp-remove').forEach((button) => {
            button.onclick = () => removeCombatant(button.dataset.id);
        });

        document.querySelectorAll('.combatant-card').forEach((card) => {
            card.onclick = (event) => {
                if (!attackContext?.waitingForTarget) return;
                if (event.target.closest('button,a')) return;

                const target = characters.find((character) => character.id === parseInteger(card.dataset.id));
                if (!target) return;

                const source = characters.find((character) => character.id === attackContext.sourceId);
                const attack = source?.attacks.find((item) => item.id === attackContext.attackId);
                if (!source || !attack) return;

                attackContext = null;
                document.body.classList.remove('attack-targeting');
                openAttackModal(source, target, attack);
                renderEncounter();
            };
        });
    };

    const renderLibraryList = (list, element, type) => {
        const label = type === 'player' ? 'Jogadores salvos' : 'Monstros salvos';
        const filtered = list
            .map((entry, index) => ({ entry, index }))
            .filter(({ entry }) => matchesSearch(entry, librarySearchTerm));

        if (list.length === 0) {
            element.innerHTML = `
                <p class="quick-empty">
                    Nenhum ${type === 'player' ? 'jogador' : 'monstro'} salvo.
                </p>
            `;
            return;
        }

        if (filtered.length === 0) {
            element.innerHTML = `
                <p class="quick-empty">
                    Nenhum resultado para <strong>${escapeHtml(els.librarySearchInput.value.trim())}</strong>.
                </p>
            `;
            return;
        }

        element.innerHTML = `
            <div class="library-section-title">${label}</div>
            ${filtered.map(({ entry, index }) => `
                <div class="lib-item">
                    <div class="lib-info">
                        <div class="lib-name">${escapeHtml(entry.name)}</div>
                        <div class="lib-meta">
                            ${escapeHtml(formatLibraryMeta(entry) || 'Sem dados adicionais')}
                        </div>
                    </div>
                    <div class="lib-actions">
                        ${buildSheetUrl(entry) ? `<a href="${escapeHtml(buildSheetUrl(entry))}" target="_blank" rel="noopener" class="card-link-button btn-small-icon">Ficha</a>` : ''}
                        <button class="btn-small-icon btn-edit-lib edit-library-entry" data-type="${type}" data-idx="${index}" title="Editar" type="button">Editar</button>
                        <button class="btn-small-icon btn-add-lib add-library-entry" data-type="${type}" data-idx="${index}" title="Adicionar ao combate" type="button">+</button>
                        <button class="btn-small-icon btn-del-lib delete-library-entry" data-type="${type}" data-idx="${index}" title="Excluir da biblioteca" type="button">Excluir</button>
                    </div>
                </div>
            `).join('')}
        `;

        element.querySelectorAll('.edit-library-entry').forEach((button) => {
            button.onclick = () => {
                clearPendingAttack();
                openSheetEditor({
                    kind: 'library',
                    type: button.dataset.type,
                    index: button.dataset.idx
                });
            };
        });

        element.querySelectorAll('.add-library-entry').forEach((button) => {
            button.onclick = () => addFromLibrary(button.dataset.type, button.dataset.idx);
        });

        element.querySelectorAll('.delete-library-entry').forEach((button) => {
            button.onclick = () => removeFromLibrary(button.dataset.type, button.dataset.idx);
        });
    };

    const renderLibrary = () => {
        renderLibraryList(playerLibrary, els.playerLibList, 'player');
        renderLibraryList(monsterLibrary, els.monsterLibList, 'enemy');
    };

    const renderSummary = () => {
        const total = characters.length;
        const current = getCurrentCharacter();
        const currentIndex = getCurrentTurnIndex();

        if (total === 0) {
            els.combatSummary.textContent = 'Nenhum combatente adicionado ainda. Abra o painel para montar a cena.';
        } else {
            els.combatSummary.textContent = `Ordem pronta: ${total} combatentes. Turno atual: ${current?.name || 'sem nome'}${currentIndex >= 0 ? ` (${currentIndex + 1}/${total})` : ''}.`;
        }

        els.statTotal.textContent = String(total);
        els.statPlayers.textContent = String(characters.filter((character) => character.type === 'player').length);
        els.statMonsters.textContent = String(characters.filter((character) => character.type === 'enemy').length);
        els.statCurrentTurn.textContent = current ? current.name : '-';

        els.nextTurnBtn.disabled = total === 0;
        els.prevTurnBtn.disabled = total === 0;
    };

    const renderQuickSearch = () => {
        const term = quickSearchTerm.trim();

        if (!term) {
            els.quickResults.innerHTML = `
                <div class="quick-empty">
                    Digite um nome para localizar alguém salvo ou focar um combatente já em cena.
                    <br><strong>Dica:</strong> você pode buscar por monstros ou personagens e adicionar sem abrir
                    o painel principal.
                </div>
            `;
            return;
        }

        const battleMatches = characters.filter((character) => matchesSearch(character, term));
        const playerMatches = playerLibrary
            .map((entry, index) => ({ entry, index }))
            .filter(({ entry }) => matchesSearch(entry, term));
        const monsterMatches = monsterLibrary
            .map((entry, index) => ({ entry, index }))
            .filter(({ entry }) => matchesSearch(entry, term));

        const groups = [];

        const buildBattleItem = (character) => {
            const isCurrent = character.id === currentTurnId;
            const sheetUrl = buildSheetUrl(character);
            return `
                <div class="quick-result">
                    <div class="quick-result-main">
                        <div class="quick-result-name">${escapeHtml(character.name)}</div>
                        <div class="quick-meta">
                            Inic ${escapeHtml(character.init)} | CA ${character.ac ?? '--'} | PV ${escapeHtml(formatHpDisplay(character))}
                        </div>
                    </div>
                    <div class="quick-result-actions">
                        ${sheetUrl ? `<a href="${escapeHtml(sheetUrl)}" target="_blank" rel="noopener" class="btn-sheet-link">Ficha</a>` : ''}
                        <button type="button" class="btn btn-secondary btn-inline btn-mini quick-edit" data-id="${character.id}">Editar</button>
                        <button type="button" class="btn btn-primary btn-inline btn-mini quick-go" data-id="${character.id}" ${isCurrent ? 'disabled' : ''}>
                            ${isCurrent ? 'Atual' : 'Ir'}
                        </button>
                    </div>
                </div>
            `;
        };

        const buildLibraryItem = (entry, index, type) => {
            const sheetUrl = buildSheetUrl(entry);
            return `
                <div class="quick-result">
                    <div class="quick-result-main">
                        <div class="quick-result-name">${escapeHtml(entry.name)}</div>
                        <div class="quick-meta">
                            ${escapeHtml(formatLibraryMeta(entry) || 'Sem dados adicionais')}
                        </div>
                    </div>
                    <div class="quick-result-actions">
                        ${sheetUrl ? `<a href="${escapeHtml(sheetUrl)}" target="_blank" rel="noopener" class="btn-sheet-link">Ficha</a>` : ''}
                        <button type="button" class="btn btn-secondary btn-inline btn-mini quick-edit-library" data-type="${type}" data-idx="${index}">Editar</button>
                        <button type="button" class="btn btn-primary btn-inline btn-mini quick-add" data-type="${type}" data-idx="${index}">+</button>
                    </div>
                </div>
            `;
        };

        if (battleMatches.length > 0) {
            groups.push(`
                <div class="quick-group">
                    <div class="quick-group-title">Na iniciativa</div>
                    ${battleMatches.map(buildBattleItem).join('')}
                </div>
            `);
        }

        if (playerMatches.length > 0) {
            groups.push(`
                <div class="quick-group">
                    <div class="quick-group-title">Jogadores salvos</div>
                    ${playerMatches.map(({ entry, index }) => buildLibraryItem(entry, index, 'player')).join('')}
                </div>
            `);
        }

        if (monsterMatches.length > 0) {
            groups.push(`
                <div class="quick-group">
                    <div class="quick-group-title">Monstros salvos</div>
                    ${monsterMatches.map(({ entry, index }) => buildLibraryItem(entry, index, 'enemy')).join('')}
                </div>
            `);
        }

        if (groups.length === 0) {
            els.quickResults.innerHTML = `
                <div class="quick-empty">
                    Nada encontrado para <strong>${escapeHtml(term)}</strong>.
                </div>
            `;
            return;
        }

        els.quickResults.innerHTML = groups.join('');

        els.quickResults.querySelectorAll('.quick-go').forEach((button) => {
            button.onclick = () => setCurrentTurnById(button.dataset.id);
        });

        els.quickResults.querySelectorAll('.quick-edit').forEach((button) => {
            button.onclick = () => {
                const combatant = characters.find((character) => character.id === parseInteger(button.dataset.id));
                if (!combatant) return;
                clearPendingAttack();
                openSheetEditor({
                    kind: 'combatant',
                    type: combatant.type,
                    id: combatant.id
                });
            };
        });

        els.quickResults.querySelectorAll('.quick-edit-library').forEach((button) => {
            button.onclick = () => {
                clearPendingAttack();
                openSheetEditor({
                    kind: 'library',
                    type: button.dataset.type,
                    index: button.dataset.idx
                });
            };
        });

        els.quickResults.querySelectorAll('.quick-add').forEach((button) => {
            button.onclick = () => addFromLibrary(button.dataset.type, button.dataset.idx);
        });
    };

    const renderAllWithoutPersist = () => {
        renderEncounter();
        renderLibrary();
        renderSummary();
        renderQuickSearch();
        updatePanelButtons();
    };

    const renderAll = () => {
        characters = characters.map((character) => syncCombatantState(character));
        ensureCurrentTurn();
        persistState();
        renderAllWithoutPersist();
    };

    const getNextCombatantNumber = (baseName, type) => {
        const normalizedBase = normalizeText(baseName);
        let highest = 0;

        characters.forEach((combatant) => {
            if (normalizeType(combatant.type) !== type) return;

            const name = cleanWhitespace(combatant.name);
            if (normalizeText(name) === normalizedBase) {
                highest = Math.max(highest, 1);
                return;
            }

            const match = name.match(/^(.+?)\s+(\d+)$/);
            if (!match || normalizeText(match[1]) !== normalizedBase) return;

            const number = parseInteger(match[2]);
            if (Number.isFinite(number)) {
                highest = Math.max(highest, number);
            }
        });

        return highest + 1;
    };

    const addCombatants = (sourceType, sourceEntry, quantity = 1) => {
        const type = normalizeType(sourceType);
        const count = Math.max(1, Number.parseInt(quantity, 10) || 1);
        const baseName = String(sourceEntry.name ?? 'Sem nome').trim() || 'Sem nome';
        const sourceMaxHp = parseInteger(sourceEntry.maxHp ?? sourceEntry.hp);
        const sourceHp = parseInteger(sourceEntry.hp ?? sourceEntry.maxHp);
        const sourceClone = deepClone(sourceEntry) ?? {};
        const initFormula = String(sourceClone.initFormula || '1d20');
        const sharedInitiative = type === 'enemy' && count > 1 ? rollFormula(initFormula) : undefined;
        const firstCopyNumber = type === 'enemy' ? getNextCombatantNumber(baseName, type) : 1;
        const shouldNumberCopies = type === 'enemy' && (count > 1 || firstCopyNumber > 1);

        for (let index = 0; index < count; index += 1) {
            const combatant = normalizeCombatant({
                ...sourceClone,
                id: generateNumericId(),
                name: shouldNumberCopies ? `${baseName} ${firstCopyNumber + index}` : baseName,
                init: Number.isFinite(sharedInitiative) ? sharedInitiative : rollFormula(initFormula),
                initFormula,
                ac: sourceClone.ac,
                hp: Number.isFinite(sourceHp) ? sourceHp : 0,
                maxHp: Number.isFinite(sourceMaxHp) ? sourceMaxHp : (Number.isFinite(sourceHp) ? sourceHp : undefined),
                type,
                sheetUrl: sourceClone.sheetUrl,
                monsterSlug: sourceClone.monsterSlug,
                attacks: deepClone(normalizeAttacks(sourceClone.attacks)),
                resistances: splitList(sourceClone.resistances),
                vulnerabilities: splitList(sourceClone.vulnerabilities),
                immunities: splitList(sourceClone.immunities),
                conditionImmunities: splitList(sourceClone.conditionImmunities),
                notes: String(sourceClone.notes ?? ''),
                deathSaves: { successes: 0, failures: 0 },
                state: 'alive'
            });

            characters.push(combatant);
        }

        characters.sort((a, b) => (b.init ?? 0) - (a.init ?? 0));
        ensureCurrentTurn();
        renderAll();
    };

    const addFromLibrary = (type, index) => {
        const list = type === 'player' ? playerLibrary : monsterLibrary;
        const source = list[parseInteger(index) ?? -1];
        if (!source) return;

        let quantity = 1;
        if (type !== 'player') {
            const answer = window.prompt(`Quantos ${source.name} deseja adicionar?`, '1');
            quantity = Math.max(1, parseInteger(answer) || 1);
        }

        clearPendingAttack();
        addCombatants(type, source, quantity);
    };

    const removeFromLibrary = (type, index) => {
        if (!window.confirm('Excluir da biblioteca?')) return;

        const list = type === 'player' ? playerLibrary : monsterLibrary;
        const idx = parseInteger(index);
        if (!Number.isFinite(idx) || !list[idx]) return;

        list.splice(idx, 1);
        persistState();
        renderLibrary();
        renderQuickSearch();
    };

    const removeCombatant = (id) => {
        const numericId = parseInteger(id);
        const index = characters.findIndex((character) => character.id === numericId);
        if (index === -1) return;

        const wasCurrent = characters[index].id === currentTurnId;
        characters.splice(index, 1);

        if (characters.length === 0) {
            currentTurnId = null;
        } else if (wasCurrent) {
            const nextIndex = Math.min(index, characters.length - 1);
            currentTurnId = characters[nextIndex].id;
        }

        renderAll();
    };

    const clearCombatants = () => {
        if (!window.confirm('Deseja limpar todos os combatentes?')) return;
        characters = [];
        currentTurnId = null;
        clearPendingAttack();
        renderAll();
    };

    const finishCombat = () => {
        if (characters.length === 0) {
            window.alert('Nenhum combate em andamento.');
            return;
        }

        const players = characters.filter((combatant) => combatant.type === 'player');
        const enemies = characters.filter((combatant) => combatant.type === 'enemy');
        const totalXp = enemies.reduce((total, enemy) => {
            const xp = parseLocalizedInteger(enemy.xp);
            return total + (Number.isFinite(xp) ? xp : 0);
        }, 0);

        const perPlayer = players.length > 0 ? Math.floor(totalXp / players.length) : 0;
        const remainder = players.length > 0 ? totalXp % players.length : 0;
        const playerNames = players.map((player) => player.name).filter(Boolean).join(', ');
        const lines = [
            'Resumo do combate',
            `Monstros na iniciativa: ${enemies.length}`,
            `XP total: ${formatIntegerPtBr(totalXp)}`,
            `Jogadores: ${players.length}${playerNames ? ` (${playerNames})` : ''}`,
            players.length > 0
                ? `XP por jogador: ${formatIntegerPtBr(perPlayer)}${remainder ? ` (${formatIntegerPtBr(remainder)} XP sobrando)` : ''}`
                : 'XP por jogador: adicione pelo menos um jogador para dividir.'
        ];

        const shouldClear = window.confirm(`${lines.join('\n')}\n\nLimpar o combate agora?`);
        els.combatNotice.textContent = players.length > 0
            ? `XP por jogador: ${formatIntegerPtBr(perPlayer)}. XP total: ${formatIntegerPtBr(totalXp)}.`
            : `XP total: ${formatIntegerPtBr(totalXp)}.`;

        if (!shouldClear) {
            return;
        }

        characters = [];
        currentTurnId = null;
        attackContext = null;
        document.body.classList.remove('attack-targeting');
        renderAll();
    };

    const handleAttackTargetSelection = (card) => {
        if (!attackContext?.waitingForTarget) return;

        const target = characters.find((character) => character.id === parseInteger(card.dataset.id));
        if (!target) return;

        const source = characters.find((character) => character.id === attackContext.sourceId);
        const attack = source?.attacks.find((item) => item.id === attackContext.attackId);
        if (!source || !attack) return;

        attackContext = null;
        document.body.classList.remove('attack-targeting');
        openAttackModal(source, target, attack);
        renderEncounter();
    };

    const updateSheetOpenLinkState = () => {
        const source = sheetContext?.kind === 'combatant'
            ? characters.find((character) => character.id === parseInteger(sheetContext.id))
            : (sheetContext?.type === 'enemy'
                ? monsterLibrary[sheetContext?.index ?? -1]
                : playerLibrary[sheetContext?.index ?? -1]);

        const url = buildSheetUrl(source);
        els.sheetOpenLinkBtn.disabled = !url;
    };

    const handleEscapeKey = (event) => {
        if (event.key !== 'Escape') return;

        const attackOpen = !els.attackModal.classList.contains('hidden');
        const sheetOpen = !els.sheetModal.classList.contains('hidden');

        if (attackOpen) {
            closeAttackModal();
            return;
        }

        if (sheetOpen) {
            closeSheetModal();
            return;
        }

        if (attackContext) {
            clearPendingAttack();
        }
    };

    function deepClone(value) {
        return value === undefined ? value : JSON.parse(JSON.stringify(value));
    }

    function saveSheetAndRefresh() {
        if (!sheetContext) return;

        if (sheetContext.kind === 'combatant') {
            saveCombatantSheet();
        } else {
            saveLibraryFromSheet();
        }

        updateSheetOpenLinkState();
    }

    function handleCombatFormSubmit(event) {
        event.preventDefault();

        const nameInput = document.getElementById('name');
        const initInput = document.getElementById('init');
        const acInput = document.getElementById('ac');
        const hpInput = document.getElementById('hp');
        const qtyInput = document.getElementById('qty');

        const name = nameInput.value.trim();
        const initText = initInput.value.trim();
        const acValue = parseInteger(acInput.value);
        const hpValue = parseInteger(hpInput.value);
        const type = els.typeSelect.value === 'enemy' ? 'enemy' : 'player';
        const qty = type === 'enemy' ? Math.max(1, parseInteger(qtyInput.value) || 1) : 1;

        if (!name || !initText) return;

        const groupInitiative = type === 'enemy' && qty > 1 ? rollFormula(initText) : undefined;
        const firstCopyNumber = type === 'enemy' ? getNextCombatantNumber(name, type) : 1;
        const shouldNumberCopies = type === 'enemy' && (qty > 1 || firstCopyNumber > 1);

        for (let index = 0; index < qty; index += 1) {
            characters.push(normalizeCombatant({
                id: generateNumericId(),
                name: shouldNumberCopies ? `${name} ${firstCopyNumber + index}` : name,
                init: Number.isFinite(groupInitiative) ? groupInitiative : rollFormula(initText),
                initFormula: initText,
                ac: acValue,
                hp: hpValue,
                maxHp: hpValue,
                type,
                attacks: [],
                resistances: [],
                vulnerabilities: [],
                immunities: [],
                conditionImmunities: [],
                notes: '',
                deathSaves: { successes: 0, failures: 0 },
                state: 'alive'
            }));
        }

        characters.sort((a, b) => (b.init ?? 0) - (a.init ?? 0));
        ensureCurrentTurn();
        renderAll();
        els.charForm.reset();
        updateTypeUI();
        nameInput.focus();
    }

    function saveToLibraryFromCombatForm() {
        const name = document.getElementById('name').value.trim();
        const initText = document.getElementById('init').value.trim();
        const type = els.typeSelect.value === 'enemy' ? 'enemy' : 'player';

        if (!name || !initText) {
            window.alert('Pelo menos Nome e Iniciativa são necessários.');
            return;
        }

        const entry = normalizeLibraryEntry({
            name,
            type,
            initFormula: initText,
            ac: parseInteger(document.getElementById('ac').value),
            hp: parseInteger(document.getElementById('hp').value),
            maxHp: parseInteger(document.getElementById('hp').value),
            attacks: [],
            resistances: [],
            vulnerabilities: [],
            immunities: [],
            conditionImmunities: [],
            notes: ''
        }, type === 'player' ? playerLibrary.length : monsterLibrary.length);

        if (type === 'player') {
            playerLibrary.push(entry);
        } else {
            monsterLibrary.push(entry);
        }

        persistState();
        renderLibrary();
        renderQuickSearch();
        window.alert('Salvo na biblioteca.');
    }

    function importLibraryFromFile(event) {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (readerEvent) => {
            try {
                const data = JSON.parse(readerEvent.target.result);
                const encounterData = data.encounter ?? {};
                const hasPlayers = Object.prototype.hasOwnProperty.call(data, 'players');
                const hasMonsters = Object.prototype.hasOwnProperty.call(data, 'monsters');
                const hasCharacters = Object.prototype.hasOwnProperty.call(data, 'characters')
                    || Object.prototype.hasOwnProperty.call(encounterData, 'characters');
                const importedPlayers = Array.isArray(data.players) ? data.players : [];
                const importedMonsters = Array.isArray(data.monsters) ? data.monsters : [];
                const importedCharacters = Array.isArray(data.characters)
                    ? data.characters
                    : (Array.isArray(encounterData.characters) ? encounterData.characters : []);

                if (hasPlayers || hasMonsters || hasCharacters) {
                    if (hasPlayers) {
                        playerLibrary = importedPlayers.map((entry, index) => normalizeLibraryEntry(entry, index));
                    }

                    if (hasMonsters) {
                        monsterLibrary = importedMonsters.map((entry, index) => normalizeLibraryEntry(entry, index));
                    }

                    if (hasCharacters) {
                        characters = importedCharacters.map((entry, index) => normalizeCombatant(entry, `combatant-${index}`));
                        const importedTurnId = parseInteger(data.currentTurnId ?? encounterData.currentTurnId ?? data.turnId ?? encounterData.turnId);
                        const importedTurnIndex = parseInteger(data.currentTurnIndex ?? encounterData.currentTurnIndex ?? data.turnIndex ?? encounterData.turnIndex);

                        if (characters.length > 0 && Number.isFinite(importedTurnId) && characters.some((character) => character.id === importedTurnId)) {
                            currentTurnId = importedTurnId;
                        } else if (characters.length > 0 && Number.isFinite(importedTurnIndex) && characters[importedTurnIndex]) {
                            currentTurnId = characters[importedTurnIndex].id;
                        } else if (characters.length > 0) {
                            currentTurnId = characters[0].id;
                        } else {
                            currentTurnId = null;
                        }
                    }

                    persistState();
                    renderLibrary();
                    renderQuickSearch();
                    renderEncounter();
                    renderSummary();
                    window.alert('Biblioteca importada com sucesso.');
                } else {
                    window.alert('Arquivo JSON inválido para a biblioteca.');
                }
            } catch (error) {
                window.alert('Erro ao ler o arquivo JSON.');
            } finally {
                importInput.value = '';
            }
        };

        reader.readAsText(file);
    }

    function exportLibrary() {
        const data = {
            version: 3,
            exportedAt: new Date().toISOString(),
            players: playerLibrary,
            monsters: monsterLibrary,
            characters,
            currentTurnId,
            currentTurnIndex: getCurrentTurnIndex()
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `dd-library-${new Date().toISOString().split('T')[0]}.json`;
        anchor.click();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    function updateAttackPreviewFromInputs() {
        if (!attackContext) return;
        updateAttackPreview();
    }

    function removeSheetAttackEditFocus() {
        els.attackSaveBtn.textContent = 'Adicionar ataque';
        els.attackEditorId.value = '';
        els.sheetEditingAttackIndex.value = '';
    }

    function addAttackEditorHandlers() {
        els.attackSaveBtn.type = 'button';
        els.attackSaveBtn.onclick = saveAttackEditor;
        els.attackCancelEditBtn.onclick = resetAttackEditor;
    }

    function addSheetFormHandlers() {
        els.sheetForm.onsubmit = (event) => {
            event.preventDefault();
            saveSheetAndRefresh();
            closeSheetModal();
        };

        els.sheetOpenLinkBtn.onclick = openSheetLink;
        els.sheetSaveLibraryBtn.onclick = () => {
            saveLibraryFromSheet();
            renderLibrary();
            renderQuickSearch();
        };
    }

    function addAttackModalHandlers() {
        els.attackForm = document.getElementById('attack-form');
        els.attackForm.onsubmit = (event) => {
            event.preventDefault();
            applyAttackDamage();
        };
        els.attackCancelBtn.onclick = () => {
            closeAttackModal();
        };
        els.attackRollMode.onchange = updateAttackPreviewFromInputs;
        els.attackRollBonus.oninput = updateAttackPreviewFromInputs;
        els.attackRollNote.oninput = updateAttackPreviewFromInputs;
        els.attackDamageLines.onchange = updateAttackPreviewFromInputs;
    }

    function setupGlobalHandlers() {
        els.charForm.onsubmit = handleCombatFormSubmit;
        els.saveToLibBtn.onclick = saveToLibraryFromCombatForm;
        els.nextTurnBtn.onclick = () => shiftTurn(1);
        els.prevTurnBtn.onclick = () => shiftTurn(-1);
        if (els.finishCombatBtn) {
            els.finishCombatBtn.onclick = finishCombat;
        }
        els.clearAllBtn.onclick = clearCombatants;
        els.toggleCombatPanelBtn.onclick = () => setPanelState('combat', !isPanelOpen('combat'));
        els.toggleQuickPanelBtn.onclick = () => setPanelState('quick', !isPanelOpen('quick'));

        els.tabBtns.forEach((button) => {
            button.onclick = () => setActiveTab(button.dataset.tab || 'add');
        });

        els.panelCloseBtns.forEach((button) => {
            button.onclick = () => setPanelState(button.dataset.closePanel, false);
        });

        if (els.openCombatPanelEmptyBtn) {
            els.openCombatPanelEmptyBtn.onclick = () => setPanelState('combat', true);
        }

        if (els.openQuickPanelEmptyBtn) {
            els.openQuickPanelEmptyBtn.onclick = () => setPanelState('quick', true);
        }

        els.librarySearchInput.oninput = () => {
            librarySearchTerm = els.librarySearchInput.value.trim();
            renderLibrary();
        };

        els.quickSearchInput.oninput = () => {
            quickSearchTerm = els.quickSearchInput.value.trim();
            renderQuickSearch();
        };

        els.importBtn.onclick = () => importInput.click();
        els.exportBtn.onclick = exportLibrary;
        importInput.onchange = importLibraryFromFile;

        els.sheetSaveBtn.type = 'submit';
        els.attackSaveBtn.type = 'button';

        els.sheetModal.querySelectorAll('[data-close-modal]').forEach((button) => {
            button.onclick = () => closeSheetModal();
        });

        els.attackModal.querySelectorAll('[data-close-modal]').forEach((button) => {
            button.onclick = () => closeAttackModal();
        });

        document.addEventListener('keydown', handleEscapeKey);

        addAttackEditorHandlers();
        addSheetFormHandlers();
        addAttackModalHandlers();
    }

    function initializeState() {
        characters = loadJsonArray(STORAGE_KEYS.characters).map((entry, index) => normalizeCombatant(entry, `combatant-${index}`));
        playerLibrary = loadJsonArray(STORAGE_KEYS.playerLibrary).map((entry, index) => normalizeLibraryEntry(entry, index));
        monsterLibrary = loadJsonArray(STORAGE_KEYS.monsterLibrary).map((entry, index) => normalizeLibraryEntry(entry, index));

        const storedTurnId = parseInteger(localStorage.getItem(STORAGE_KEYS.turnId));
        const storedTurnIndex = parseInteger(localStorage.getItem(STORAGE_KEYS.turnIndex));

        if (Number.isFinite(storedTurnId) && characters.some((character) => character.id === storedTurnId)) {
            currentTurnId = storedTurnId;
        } else if (Number.isFinite(storedTurnIndex) && characters[storedTurnIndex]) {
            currentTurnId = characters[storedTurnIndex].id;
        } else if (characters.length > 0) {
            currentTurnId = characters[0].id;
        }

        if (characters.length > 0) {
            characters = characters.map((character) => syncCombatantState(character));
        }

        ensureCurrentTurn();
    }

    function normalizeAndShowDefaults() {
        updateTypeUI();
        updatePanelButtons();
        renderAllWithoutPersist();
    }

    initializeState();
    setupGlobalHandlers();
    normalizeAndShowDefaults();

    window.openSheetEditor = openSheetEditor;
    window.addEventListener('storage', () => {
        initializeState();
        renderAllWithoutPersist();
    });

    const keepLabelsInSync = () => {
        if (sheetContext?.kind === 'combatant') {
            els.sheetSaveLibraryBtn.textContent = 'Salvar na biblioteca';
        } else {
            els.sheetSaveLibraryBtn.textContent = 'Salvar na biblioteca';
        }
        if (els.attackEditorId.value) {
            els.attackSaveBtn.textContent = 'Atualizar ataque';
        } else {
            els.attackSaveBtn.textContent = 'Adicionar ataque';
        }
    };

    const syncModalLabels = () => {
        keepLabelsInSync();
        updateSheetOpenLinkState();
    };

    const sheetInputs = [
        els.sheetName,
        els.sheetInit,
        els.sheetAc,
        els.sheetHp,
        els.sheetMaxHp,
        els.sheetUrl,
        els.sheetResistances,
        els.sheetVulnerabilities,
        els.sheetImmunities,
        els.sheetNotes
    ];

    sheetInputs.forEach((input) => {
        input.addEventListener('input', syncModalLabels);
        input.addEventListener('change', syncModalLabels);
    });

    els.sheetOpenLinkBtn.disabled = true;
    els.attackRollMode.addEventListener('change', updateAttackPreview);
    els.attackRollBonus.addEventListener('input', updateAttackPreview);
    els.attackRollNote.addEventListener('input', updateAttackPreview);
    els.attackDamageLines.addEventListener('change', updateAttackPreview);

    if (els.sheetModal.querySelector('[data-close-modal="sheet"]')) {
        els.sheetModal.querySelector('[data-close-modal="sheet"]').onclick = closeSheetModal;
    }

    if (els.attackModal.querySelector('[data-close-modal="attack"]')) {
        els.attackModal.querySelector('[data-close-modal="attack"]').onclick = closeAttackModal;
    }

    document.addEventListener('click', (event) => {
        const card = event.target.closest('.combatant-card');
        if (!card || !attackContext?.waitingForTarget) return;
        if (event.target.closest('button,a')) return;
        handleAttackTargetSelection(card);
    });

    if (els.sheetOpenLinkBtn) {
        els.sheetOpenLinkBtn.onclick = openSheetLink;
    }

    if (els.sheetSaveBtn) {
        els.sheetSaveBtn.onclick = null;
    }

    updateSheetOpenLinkState();
});
