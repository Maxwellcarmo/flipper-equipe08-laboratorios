/**
 * minhas.js - Script para a página de minhas reservas
 * Gerencia a listagem e cancelamento de reservas do professor
 */

document.addEventListener('DOMContentLoaded', () => {
    // Configurar eventos dos botões de filtro
    document.getElementById('btn-filtrar').addEventListener('click', filtrarReservas);
    document.getElementById('btn-limpar').addEventListener('click', limparFiltro);
    
    // Carregar reservas iniciais
    carregarReservas();
});

// Função para carregar reservas
function carregarReservas() {
    try {
        const filtroTelefone = document.getElementById('filtro-telefone').value.trim();
        const reservas = window.api.listReservas({ telefone: filtroTelefone });
        
        const reservasContainer = document.getElementById('reservas-container');
        
        // Limpar container
        reservasContainer.innerHTML = '';
        
        // Verificar se há reservas
        if (reservas.length === 0) {
            const semReservas = document.createElement('div');
            semReservas.className = 'sem-reservas';
            semReservas.innerHTML = '<p>Nenhuma reserva encontrada. Utilize a página de laboratórios para fazer uma reserva.</p>';
            reservasContainer.appendChild(semReservas);
            return;
        }
        
        // Ordenar reservas por data (mais recentes primeiro)
        reservas.sort((a, b) => new Date(b.dataInicio) - new Date(a.dataInicio));
        
        // Criar cards para cada reserva
        reservas.forEach(reserva => {
            const card = criarCardReserva(reserva);
            reservasContainer.appendChild(card);
        });
        
    } catch (error) {
        console.error('Erro ao carregar reservas:', error);
        alert(`Erro ao carregar reservas: ${error.message}`);
    }
}

// Função para criar card de reserva
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
    
    // Verificar se pode cancelar (faltam 12h ou mais)
    const agora = new Date();
    const diferencaHoras = (dataInicio - agora) / (1000 * 60 * 60);
    const podeCancelar = diferencaHoras >= 12 && reserva.status !== 'cancelada' && reserva.status !== 'negada';
    
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
        <div class="reserva-acoes">
            ${podeCancelar ? `<button class="btn btn-danger btn-cancelar">Cancelar Reserva</button>` : ''}
        </div>
    `;
    
    // Adicionar evento de cancelamento se aplicável
    if (podeCancelar) {
        const btnCancelar = card.querySelector('.btn-cancelar');
        btnCancelar.addEventListener('click', () => cancelarReserva(reserva.id));
    }
    
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

// Função para cancelar reserva
function cancelarReserva(id) {
    try {
        if (confirm('Tem certeza que deseja cancelar esta reserva?')) {
            // Obter a reserva
            const reservas = window.api.listReservas();
            const reserva = reservas.find(r => r.id === id);
            
            if (!reserva) {
                throw new Error('Reserva não encontrada');
            }
            
            // Verificar se pode cancelar (faltam 12h ou mais)
            const agora = new Date();
            const dataInicio = new Date(reserva.dataInicio);
            const diferencaHoras = (dataInicio - agora) / (1000 * 60 * 60);
            
            if (diferencaHoras < 12) {
                throw new Error('Não é possível cancelar reservas com menos de 12 horas de antecedência');
            }
            
            // Cancelar reserva
            reserva.status = 'cancelada';
            window.api.saveDB();
            
            // Recarregar reservas
            carregarReservas();
            
            alert('Reserva cancelada com sucesso!');
        }
    } catch (error) {
        console.error('Erro ao cancelar reserva:', error);
        alert(`Erro ao cancelar reserva: ${error.message}`);
    }
}

// Função para filtrar reservas
function filtrarReservas() {
    carregarReservas();
}

// Função para limpar filtro
function limparFiltro() {
    document.getElementById('filtro-telefone').value = '';
    carregarReservas();
}