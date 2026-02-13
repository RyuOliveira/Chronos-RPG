class PCManager {
    constructor() {
        this.pcs = [];
        this.listContainer = null;
    }

    async load() {
        try {
            const response = await fetch('pcs.json');
            this.pcs = await response.json();
            return this.pcs;
        } catch (error) {
            console.error('Erro ao carregar PCs:', error);
            return [];
        }
    }

    init(containerId) {
        this.listContainer = document.getElementById(containerId);
        this.load().then(() => {
            this.renderList();
        });
    }

    renderList() {
        if (!this.listContainer) return;

        if (this.pcs.length === 0) {
            this.listContainer.innerHTML = '<div class="col-12 text-center py-5"><p class="text-muted">Nenhum herói encontrado.</p></div>';
            return;
        }

        this.listContainer.innerHTML = this.pcs.map(pc => `
            <div class="col-lg-4 col-md-6">
                <div class="hero-card" onclick="window.location.href='pc.html?id=${pc.id}'">
                    <img src="${pc.imagem}" class="hero-img" alt="${pc.nome}">
                    <div class="hero-body">
                        <div class="hero-name">${pc.nome}</div>
                        <div class="hero-meta">${pc.raca} ${pc.classe} | Nível ${pc.nivel}</div>
                        <div class="mt-3">
                            <span class="stat-pill">🛡️ CA ${pc.stats.ca}</span>
                            <span class="stat-pill">❤️ PV ${pc.stats.hp_max}</span>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    async renderDetail(containerId) {
        const container = document.getElementById(containerId);
        const urlParams = new URLSearchParams(window.location.search);
        const pcId = urlParams.get('id');

        await this.load();
        const pc = this.pcs.find(p => p.id === pcId);

        if (!pc) {
            container.innerHTML = `
                <div class="pc-container text-center py-5">
                    <h2>Herói não recrutado</h2>
                    <a href="index.html" class="btn btn-hero mt-3">Voltar para a Taverna</a>
                </div>
            `;
            return;
        }

        document.title = `${pc.nome} - Heróis de Chronos`;

        container.innerHTML = `
            <div class="pc-detail-header">
                <div class="container">
                    <a href="index.html" class="home-link btn btn-outline-warning mb-4"><i class="fas fa-arrow-left me-2"></i>Voltar para a Galeria</a>
                    <h1 class="display-2 fw-bold animate-glow" style="color: var(--pc-secondary)">${pc.nome}</h1>
                    <p class="lead" style="color: #ccc">${pc.raca} ${pc.classe} - Nível ${pc.nivel}</p>
                    <p class="text-muted">Interpretado por ${pc.jogador}</p>
                </div>
            </div>

            <div class="pc-container" style="margin-top: -50px">
                <div class="row">
                    <div class="col-md-5 text-center mb-4">
                        <img src="${pc.imagem}" class="hero-detail-img img-fluid" alt="${pc.nome}">
                        
                        <div class="hero-stats-grid">
                            <div class="stat-box">
                                <span class="label">Classe de Armadura</span>
                                <span class="value">${pc.stats.ca}</span>
                            </div>
                            <div class="stat-box">
                                <span class="label">Pontos de Vida</span>
                                <span class="value">${pc.stats.hp_max}</span>
                            </div>
                            <div class="stat-box">
                                <span class="label">Iniciativa</span>
                                <span class="value">${pc.stats.init_formula}</span>
                            </div>
                        </div>

                        <div class="mt-4 p-3 border border-secondary rounded" style="background: rgba(0,0,0,0.3)">
                            <h6 class="text-uppercase text-secondary mb-3">Equipamentos Notáveis</h6>
                            <ul class="list-unstyled">
                                ${pc.equipamentos.map(eq => `<li class="mb-2"><i class="fas fa-hammer me-2 text-warning"></i>${eq}</li>`).join('')}
                            </ul>
                        </div>
                    </div>
                    
                    <div class="col-md-7">
                        <div class="bio-section shadow-lg">
                            <h3 class="hero-name mb-4" style="border-bottom: 1px solid var(--pc-secondary); padding-bottom: 0.5rem">Biografia</h3>
                            <p>${pc.bio}</p>
                            <hr class="border-secondary my-4">
                            <div class="text-center">
                                <button class="btn btn-hero" onclick="alert('Funcionalidade de enviar para o Tracker em breve!')">
                                    <i class="fas fa-sword me-2"></i>Enviar para Combate
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
}
