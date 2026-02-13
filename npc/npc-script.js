class NPCManager {
    constructor() {
        this.npcs = [];
        this.filteredNpcs = [];
        this.listContainer = null;
        this.searchInput = null;
    }

    async load() {
        try {
            const response = await fetch('npcs.json');
            this.npcs = await response.json();
            this.filteredNpcs = [...this.npcs];
            return this.npcs;
        } catch (error) {
            console.error('Erro ao carregar NPCs:', error);
            return [];
        }
    }

    init(containerId, searchId) {
        this.listContainer = document.getElementById(containerId);
        this.searchInput = document.getElementById(searchId);

        if (this.searchInput) {
            this.searchInput.addEventListener('input', (e) => {
                this.filter(e.target.value);
            });
        }

        this.load().then(() => {
            this.renderList();
        });
    }

    filter(query) {
        const q = query.toLowerCase();
        this.filteredNpcs = this.npcs.filter(npc => 
            npc.nome.toLowerCase().includes(q) || 
            npc.titulo.toLowerCase().includes(q) ||
            npc.tags.some(tag => tag.toLowerCase().includes(q))
        );
        this.renderList();
    }

    renderList() {
        if (!this.listContainer) return;

        if (this.filteredNpcs.length === 0) {
            this.listContainer.innerHTML = '<div class="col-12 text-center py-5"><p class="text-muted">Nenhum personagem encontrado.</p></div>';
            return;
        }

        this.listContainer.innerHTML = this.filteredNpcs.map(npc => `
            <div class="col-md-4 col-sm-6">
                <div class="npc-card card shadow-sm" onclick="window.location.href='npc.html?id=${npc.id}'">
                    <img src="${npc.imagem}" class="npc-card-img card-img-top" alt="${npc.nome}">
                    <div class="npc-card-body">
                        <div class="npc-title">${npc.titulo}</div>
                        <h5 class="npc-name">${npc.nome}</h5>
                        <div class="npc-tags">
                            ${npc.tags.slice(0, 2).map(tag => `<span class="badge badge-tag">${tag}</span>`).join('')}
                            ${npc.tags.length > 2 ? '<span class="badge bg-secondary" style="font-size: 0.7rem">...</span>' : ''}
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    async renderDetail(containerId) {
        const container = document.getElementById(containerId);
        const urlParams = new URLSearchParams(window.location.search);
        const npcId = urlParams.get('id');

        await this.load();
        const npc = this.npcs.find(n => n.id === npcId);

        if (!npc) {
            container.innerHTML = `
                <div class="npc-container text-center py-5">
                    <h2>NPC não encontrado</h2>
                    <a href="index.html" class="btn btn-primary mt-3">Voltar para a Lista</a>
                </div>
            `;
            return;
        }

        document.title = `${npc.nome} - Chronos RPG`;

        container.innerHTML = `
            <div class="npc-detail-header">
                <div class="container">
                    <a href="index.html" class="home-link"><i class="fas fa-arrow-left me-2"></i>Voltar para a Galeria</a>
                    <h1 class="display-3 fw-bold">${npc.nome}</h1>
                    <p class="lead">${npc.titulo}</p>
                </div>
            </div>

            <div class="npc-container" style="margin-top: -50px">
                <div class="row">
                    <div class="col-md-4 text-center mb-4">
                        <img src="${npc.imagem}" class="npc-detail-img img-fluid" alt="${npc.nome}">
                    </div>
                    <div class="col-md-8">
                        <div class="npc-info-section">
                            <div class="mb-4">
                                <span class="info-label">Descrição</span>
                                <p class="lead" style="font-size: 1.1rem">${npc.descricao}</p>
                            </div>

                            <div class="mb-4">
                                <span class="info-label">Tags e Vínculos</span>
                                <div>
                                    ${npc.tags.map(tag => `<span class="badge badge-tag p-2">${tag}</span>`).join('')}
                                </div>
                            </div>

                            <div class="status-box">
                                <span class="info-label text-dark">Última Informação / Situação Conhecida</span>
                                <p class="mb-0 fw-bold"><i class="fas fa-info-circle me-2 animate-pulse"></i>${npc.ultima_informacao}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
}
