/**
 * admin.js - Script para o painel administrativo
 * Gerencia login, aprovação de reservas e bloqueios de laboratórios
 */

// Variáveis globais
let adminLogado = false;
let tempoInatividade = null;

document.addEventListener('DOMContentLoaded', () => {
    // Verificar se o admin está logado
    verificarLogin();
    
    // Configurar eventos de login
    document.getElementById('login-form').addEventListener('submit', fazerLogin);
    document.getElementById('btn-logout').addEventListener('click', fazerLogout);
    
    // Configurar eventos das tabs
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => mudarTab(tab.dataset.tab));
    });
    
    // Configurar eventos dos filtros
    document.getElementById('btn-filtrar-pendentes').addEventListener('click', () => filtrarReservas('pendentes'));
    document.getElementById('btn-limpar-pendentes').addEventListener('click', () => limparFiltro('pendentes'));
    document.getElementById('btn-filtrar-todas').addEventListener('click', () => filtrarReservas('todas'));
    document.getElementById('btn-limpar-todas').addEventListener('click', () => limparFiltro('todas'));
    
    // Configurar evento do formulário de bloqueio
    document.getElementById('form-bloqueio').addEventListener('submit', adicionarBloqueio);
    
    // Configurar eventos do modal de negação
    document.querySelector('.modal-close').addEventListener('click', fecharModal);
    document.querySelector('.modal-close-btn').addEventListener('click', fecharModal);
    document.getElementById('btn-confirmar-negar').addEventListener('click', confirmarNegacao);
    
    // Configurar eventos para resetar o tempo de inatividade
    ['click', 'keypress', 'mousemove'].forEach(evento => {
        document.addEventListener(evento, resetarTempoInatividade);
    });
});

// Função para verificar login
function verificarLogin() {
    const adminSession = sessionStorage.getItem('admin_session');
    
    if (adminSession) {
        const session = JSON.parse(adminSession);
        const agora = new Date().getTime();
        
        // Verificar se a sessão expirou (15 minutos)
        if (agora - session.timestamp < 15 * 60 * 1000) {
            // Sessão válida
            adminLogado = true;
            mostrarPainel();
            carregarDados();
            iniciarTempoInatividade();
            return;
        }
    }
    
    // Sessão inválida ou expirada
    adminLogado = false;
    mostrarLogin();
}

// Função para fazer login
function fazerLogin(event) {
    event.preventDefault();
    
    const usuario = document.getElementById('usuario').value;
    const senha = document.getElementById('senha').value;
    
    if (usuario === 'admin' && senha === 'root') {
        // Login bem-sucedido
        adminLogado = true;
        
        // Salvar sessão
        const session = {
            timestamp: new Date().getTime()
        };
        sessionStorage.setItem('admin_session', JSON.stringify(session));
        
        // Mostrar painel e carregar dados
        mostrarPainel();
        carregarDados();
        iniciarTempoInatividade();
    } else {
        alert('Usuário ou senha incorretos!');
    }
}

// Função para fazer logout
function fazerLogout() {
    adminLogado = false;
    sessionStorage.removeItem('admin_session');
    clearTimeout(tempoInatividade);
    mostrarLogin();
}

// Função para iniciar tempo de inatividade
function iniciarTempoInatividade() {
    clearTimeout(tempoInatividade);
    tempoInatividade = setTimeout(() => {
        alert('Sua sessão expirou por inatividade!');
        fazerLogout();
    }, 15 * 60 * 1000); // 15 minutos
}

// Função para resetar tempo de inatividade
function resetarTempoInatividade() {
    if (adminLogado) {
        // Atualizar timestamp da sessão
        const session = {
            timestamp: new Date().getTime()
        };
        sessionStorage.setItem('admin_session', JSON.stringify(session));
        
        // Reiniciar temporizador
        iniciarTempoInatividade();
    }
}

// Função para mostrar painel administrativo
function mostrarPainel() {
    document.getElementById('login-container').style.display = 'none';
    document.getElementById('admin-panel').style.display = 'block';
}

// Função para mostrar tela de login
function mostrarLogin() {
    document.getElementById('login-container').style.display = 'block';
    document.getElementById('admin-panel').style.display = 'none';
    
    // Limpar campos
    document.getElementById('usuario').value = '';
    document.getElementById('senha').value = '';
}

// Função para mudar de tab
function mudarTab(tab) {
    // Remover classe active de todas as tabs
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    
    // Adicionar classe active à tab selecionada
    document.querySelector(`.tab[data-tab="${tab}"]`).classList.add('active');
    document.getElementById(`${tab}-tab`).classList.add('active');
    
    // Recarregar dados da tab
    if (tab === 'reservas') {
        carregarReservasPendentes();
    } else if (tab === 'bloqueios') {
        carregarBloqueios();
    } else if (tab === 'todas-reservas') {
        carregarTodasReservas();
    }
}

// Função para carregar todos os dados
function carregarDados() {
    carregarReservasPendentes();
    carregarBloqueios();
    carregarTodasReservas();
    carregarLaboratorios();
}

// Função para carregar reservas pendentes
function carregarReservasPendentes() {
    try {
        const filtroTelefone = document.getElementById('filtro-telefone-pendentes').value.trim();
        const reservas = window.api.listReservas({ status: 'pendente', telefone: filtroTelefone });
        
        const reservasList = document.getElementById('reservas-pendentes-list');
        
        // Limpar lista
        reservasList.innerHTML = '';
        
        // Verificar se há reservas pendentes
        if (reservas.length === 0) {
            const semReservas = document.createElement('div');
            semReservas.className = 'sem-itens';
            semReservas.innerHTML = '<p>Nenhuma reserva pendente encontrada.</p>';
            reservasList.appendChild(semReservas);
            return;
        }
        
        // Ordenar reservas por data (mais antigas primeiro)
        reservas.sort((a, b) => new Date(a.dataInicio) - new Date(b.dataInicio));
        
        // Criar cards para cada reserva
        reservas.forEach(reserva => {
            const card = criarCardReservaPendente(reserva);
            reservasList.appendChild(card);
        });
        
    } catch (error) {
        console.error('Erro ao carregar reservas pendentes:', error);
        alert(`Erro ao carregar reservas pendentes: ${error.message}`);
    }
}

// Função para carregar todas as reservas
function carregarTodasReservas() {
    try {
        const filtroTelefone = document.getElementById('filtro-telefone-todas').value.trim();
        const reservas = window.api.listReservas({ telefone: filtroTelefone });
        
        const reservasList = document.getElementById('todas-reservas-list');
        
        // Limpar lista
        reservasList.innerHTML = '';
        
        // Verificar se há reservas
        if (reservas.length === 0) {
            const semReservas = document.createElement('div');
            semReservas.className = 'sem-itens';
            semReservas.innerHTML = '<p>Nenhuma reserva encontrada.</p>';
            reservasList.appendChild(semReservas);
            return;
        }
        
        // Ordenar reservas por data (mais recentes primeiro)
        reservas.sort((a, b) => new Date(b.dataInicio) - new Date(a.dataInicio));
        
        // Criar cards para cada reserva
        reservas.forEach(reserva => {
            const card = criarCardReserva(reserva);
            reservasList.appendChild(card);
        });
        
    } catch (error) {
        console.error('Erro ao carregar todas as reservas:', error);
        alert(`Erro ao carregar todas as reservas: ${error.message}`);
    }
}

// Função para carregar bloqueios
function carregarBloqueios() {
    try {
        const bloqueios = [];
        
        // Obter bloqueios de todos os laboratórios
        const labs = window.api.listLabs();
        labs.forEach(lab => {
            const bloqueiosLab = window.api.listBloqueios(lab.id);
            bloqueiosLab.forEach(bloqueio => {
                bloqueio.labNome = lab.nome;
                bloqueio.labId = lab.id;
                bloqueios.push(bloqueio);
            });
        });
        
        const bloqueiosList = document.getElementById('bloqueios-list');
        
        // Limpar lista
        bloqueiosList.innerHTML = '';
        
        // Verificar se há bloqueios
        if (bloqueios.length === 0) {
            const semBloqueios = document.createElement('div');
            semBloqueios.className = 'sem-itens';
            semBloqueios.innerHTML = '<p>Nenhum bloqueio encontrado.</p>';
            bloqueiosList.appendChild(semBloqueios);
            return;
        }
        
        // Ordenar bloqueios por data (mais recentes primeiro)
        bloqueios.sort((a, b) => new Date(b.dataInicio) - new Date(a.dataInicio));
        
        // Criar cards para cada bloqueio
        bloqueios.forEach(bloqueio => {
            const card = criarCardBloqueio(bloqueio);
            bloqueiosList.appendChild(card);
        });
        
    } catch (error) {
        console.error('Erro ao carregar bloqueios:', error);
        alert(`Erro ao carregar bloqueios: ${error.message}`);
    }
}

// Função para carregar laboratórios no select
function carregarLaboratorios() {
    try {
        const labs = window.api.listLabs();
        const selectLab = document.getElementById('bloqueio-lab');
        
        // Limpar options
        selectLab.innerHTML = '';
        
        // Adicionar options para cada laboratório
        labs.forEach(lab => {
            const option = document.createElement('option');
            option.value = lab.id;
            option.textContent = lab.nome;
            selectLab.appendChild(option);
        });
        
    } catch (error) {
        console.error('Erro ao carregar laboratórios:', error);
        alert(`Erro ao carregar laboratórios: ${error.message}`);
    }
}

// Função para criar card de reserva pendente
function criarCardReservaPendente(reserva) {
    const card = document.createElement('div');
    card.className = 'reserva-card';
    card.dataset.id = reserva.id;
    
    // Obter informações do laboratório
    const lab = window.api.listLabs().find(lab => lab.id === reserva.labId);
    
    // Formatar data e hora
    const dataInicio = new Date(reserva.dataInicio);
    const dataFim = new Date(dataInicio.getTime() + reserva.duracao * 60000);
    
    const dataFormatada = dataInicio.toLocaleDateString('pt-BR');
    const horaInicio = dataInicio.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const horaFim = dataFim.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    
    // Criar HTML do card
    card.innerHTML = `
        <div class="reserva-header">
            <div class="reserva-titulo">${lab ? lab.nome : 'Laboratório'}</div>
            <div class="reserva-status status-pendente">Pendente</div>
        </div>
        <div class="reserva-info">
            <div class="reserva-info-item">
                <span class="reserva-info-label">Nome</span>
                <span class="reserva-info-value">${reserva.nome}</span>
            </div>
            <div class="reserva-info-item">
                <span class="reserva-info-label">Telefone</span>
                <span class="reserva-info-value">${reserva.telefone}</span>
            </div>
            <div class="reserva-info-item">
                <span class="reserva-info-label">Data</span>
                <span class="reserva-info-value">${dataFormatada}</span>
            </div>
            <div class="reserva-info-item">
                <span class="reserva-info-label">Horário</span>
                <span class="reserva-info-value">${horaInicio} - ${horaFim}</span>
            </div>
            <div class="reserva-info-item">
                <span class="reserva-info-label">Duração</span>
                <span class="reserva-info-value">${reserva.duracao} minutos</span>
            </div>
            ${reserva.curso ? `
            <div class="reserva-info-item">
                <span class="reserva-info-label">Curso</span>
                <span class="reserva-info-value">${reserva.curso}</span>
            </div>
            ` : ''}
            ${reserva.turma ? `
            <div class="reserva-info-item">
                <span class="reserva-info-label">Turma</span>
                <span class="reserva-info-value">${reserva.turma}</span>
            </div>
            ` : ''}
        </div>
        ${reserva.observacao ? `
        <div class="reserva-info-item" style="grid-column: 1 / -1;">
            <span class="reserva-info-label">Observação</span>
            <span class="reserva-info-value">${reserva.observacao}</span>
        </div>
        ` : ''}
        <div class="reserva-acoes">
            <button class="btn btn-success btn-aprovar" data-id="${reserva.id}">Aprovar</button>
            <button class="btn btn-danger btn-negar" data-id="${reserva.id}">Negar</button>
        </div>
    `;
    
    // Adicionar eventos aos botões
    card.querySelector('.btn-aprovar').addEventListener('click', () => aprovarReserva(reserva.id));
    card.querySelector('.btn-negar').addEventListener('click', () => abrirModalNegar(reserva.id));
    
    return card;
}

// Função para criar card de reserva normal
function criarCardReserva(reserva) {
    const card = document.createElement('div');
    card.className = 'reserva-card';
    card.dataset.id = reserva.id;
    
    // Obter informações do laboratório
    const lab = window.api.listLabs().find(lab => lab.id === reserva.labId);
    
    // Formatar data e hora
    const dataInicio = new Date(reserva.dataInicio);
    const dataFim = new Date(dataInicio.getTime() + reserva.duracao * 60000);
    
    const dataFormatada = dataInicio.toLocaleDateString('pt-BR');
    const horaInicio = dataInicio.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const horaFim = dataFim.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    
    // Criar HTML do card
    card.innerHTML = `
        <div class="reserva-header">
            <div class="reserva-titulo">${lab ? lab.nome : 'Laboratório'}</div>
            <div class="reserva-status status-${reserva.status}">${formatarStatus(reserva.status)}</div>
        </div>
        <div class="reserva-info">
            <div class="reserva-info-item">
                <span class="reserva-info-label">Nome</span>
                <span class="reserva-info-value">${reserva.nome}</span>
            </div>
            <div class="reserva-info-item">
                <span class="reserva-info-label">Telefone</span>
                <span class="reserva-info-value">${reserva.telefone}</span>
            </div>
            <div class="reserva-info-item">
                <span class="reserva-info-label">Data</span>
                <span class="reserva-info-value">${dataFormatada}</span>
            </div>
            <div class="reserva-info-item">
                <span class="reserva-info-label">Horário</span>
                <span class="reserva-info-value">${horaInicio} - ${horaFim}</span>
            </div>
            <div class="reserva-info-item">
                <span class="reserva-info-label">Duração</span>
                <span class="reserva-info-value">${reserva.duracao} minutos</span>
            </div>
            ${reserva.curso ? `
            <div class="reserva-info-item">
                <span class="reserva-info-label">Curso</span>
                <span class="reserva-info-value">${reserva.curso}</span>
            </div>
            ` : ''}
            ${reserva.turma ? `
            <div class="reserva-info-item">
                <span class="reserva-info-label">Turma</span>
                <span class="reserva-info-value">${reserva.turma}</span>
            </div>
            ` : ''}
        </div>
        ${reserva.observacao ? `
        <div class="reserva-info-item" style="grid-column: 1 / -1;">
            <span class="reserva-info-label">Observação</span>
            <span class="reserva-info-value">${reserva.observacao}</span>
        </div>
        ` : ''}
        ${reserva.motivoNegacao ? `
        <div class="reserva-info-item" style="grid-column: 1 / -1;">
            <span class="reserva-info-label">Motivo da Negação</span>
            <span class="reserva-info-value">${reserva.motivoNegacao}</span>
        </div>
        ` : ''}
    `;
    
    return card;
}

// Função para criar card de bloqueio
function criarCardBloqueio(bloqueio) {
    const card = document.createElement('div');
    card.className = 'bloqueio-card';
    card.dataset.id = bloqueio.id;
    card.dataset.labId = bloqueio.labId;
    
    // Formatar data e hora
    const dataInicio = new Date(bloqueio.dataInicio);
    const dataFim = new Date(bloqueio.dataFim);
    
    const dataInicioFormatada = dataInicio.toLocaleDateString('pt-BR');
    const dataFimFormatada = dataFim.toLocaleDateString('pt-BR');
    const horaInicio = dataInicio.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const horaFim = dataFim.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    
    // Criar HTML do card
    card.innerHTML = `
        <div class="bloqueio-header">
            <div class="bloqueio-titulo">${bloqueio.labNome}</div>
        </div>
        <div class="bloqueio-info">
            <div class="bloqueio-info-item">
                <span class="bloqueio-info-label">Início</span>
                <span class="bloqueio-info-value">${dataInicioFormatada} ${horaInicio}</span>
            </div>
            <div class="bloqueio-info-item">
                <span class="bloqueio-info-label">Fim</span>
                <span class="bloqueio-info-value">${dataFimFormatada} ${horaFim}</span>
            </div>
            <div class="bloqueio-info-item">
                <span class="bloqueio-info-label">Motivo</span>
                <span class="bloqueio-info-value">${bloqueio.motivo}</span>
            </div>
        </div>
        <div class="bloqueio-acoes">
            <button class="btn btn-danger btn-remover-bloqueio">Remover</button>
        </div>
    `;
    
    // Adicionar evento ao botão de remover
    card.querySelector('.btn-remover-bloqueio').addEventListener('click', () => removerBloqueio(bloqueio.labId, bloqueio.id));
    
    return card;
}

// Função para formatar status
function formatarStatus(status) {
    const statusMap = {
        'pendente': 'Pendente',
        'aprovada': 'Aprovada',
        'negada': 'Negada',
        'cancelada': 'Cancelada',
        'expirada': 'Expirada'
    };
    
    return statusMap[status] || status;
}

// Função para aprovar reserva
function aprovarReserva(id) {
    try {
        if (confirm('Tem certeza que deseja aprovar esta reserva?')) {
            // Aprovar reserva
            window.api.aprovar(id);
            
            // Recarregar dados
            carregarReservasPendentes();
            carregarTodasReservas();
            
            alert('Reserva aprovada com sucesso!');
        }
    } catch (error) {
        console.error('Erro ao aprovar reserva:', error);
        alert(`Erro ao aprovar reserva: ${error.message}`);
    }
}

// Função para abrir modal de negação
function abrirModalNegar(id) {
    document.getElementById('reserva-id-negar').value = id;
    document.getElementById('motivo-negacao').value = '';
    document.getElementById('modal-negar').style.display = 'flex';
}

// Função para fechar modal
function fecharModal() {
    document.getElementById('modal-negar').style.display = 'none';
}

// Função para confirmar negação
function confirmarNegar() {
    try {
        const id = document.getElementById('reserva-id-negar').value;
        const motivo = document.getElementById('motivo-negacao').value.trim();
        
        if (!motivo) {
            alert('Por favor, informe o motivo da negação!');
            return;
        }
        
        // Negar reserva
        window.api.negar(id, motivo);
        
        // Fechar modal
        fecharModal();
        
        // Recarregar dados
        carregarReservasPendentes();
        carregarTodasReservas();
        
        alert('Reserva negada com sucesso!');
        
    } catch (error) {
        console.error('Erro ao negar reserva:', error);
        alert(`Erro ao negar reserva: ${error.message}`);
    }
}

// Função para adicionar bloqueio
function adicionarBloqueio(event) {
    event.preventDefault();
    
    try {
        // Obter dados do formulário
        const labId = parseInt(document.getElementById('bloqueio-lab').value);
        const dataInicio = document.getElementById('bloqueio-data-inicio').value;
        const horaInicio = document.getElementById('bloqueio-hora-inicio').value;
        const dataFim = document.getElementById('bloqueio-data-fim').value;
        const horaFim = document.getElementById('bloqueio-hora-fim').value;
        const motivo = document.getElementById('bloqueio-motivo').value;
        
        // Criar datas
        const inicio = new Date(`${dataInicio}T${horaInicio}`);
        const fim = new Date(`${dataFim}T${horaFim}`);
        
        // Validar datas
        if (fim <= inicio) {
            alert('A data/hora de fim deve ser posterior à data/hora de início!');
            return;
        }
        
        // Adicionar bloqueio
        window.api.addBloqueio(labId, inicio, fim, motivo);
        
        // Limpar formulário
        document.getElementById('form-bloqueio').reset();
        
        // Recarregar bloqueios
        carregarBloqueios();
        
        alert('Bloqueio adicionado com sucesso!');
        
    } catch (error) {
        console.error('Erro ao adicionar bloqueio:', error);
        alert(`Erro ao adicionar bloqueio: ${error.message}`);
    }
}

// Função para remover bloqueio
function removerBloqueio(labId, bloqueioId) {
    try {
        if (confirm('Tem certeza que deseja remover este bloqueio?')) {
            // Remover bloqueio
            window.api.removeBloqueio(labId, bloqueioId);
            
            // Recarregar bloqueios
            carregarBloqueios();
            
            alert('Bloqueio removido com sucesso!');
        }
    } catch (error) {
        console.error('Erro ao remover bloqueio:', error);
        alert(`Erro ao remover bloqueio: ${error.message}`);
    }
}

// Função para filtrar reservas
function filtrarReservas(tipo) {
    if (tipo === 'pendentes') {
        carregarReservasPendentes();
    } else if (tipo === 'todas') {
        carregarTodasReservas();
    }
}

// Função para limpar filtro
function limparFiltro(tipo) {
    if (tipo === 'pendentes') {
        document.getElementById('filtro-telefone-pendentes').value = '';
        carregarReservasPendentes();
    } else if (tipo === 'todas') {
        document.getElementById('filtro-telefone-todas').value = '';
        carregarTodasReservas();
    }
}