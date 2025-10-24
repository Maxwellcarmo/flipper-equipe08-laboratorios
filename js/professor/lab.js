/**
 * lab.js - Script para a página de detalhes do laboratório
 * Gerencia o calendário, horários disponíveis e formulário de reserva
 */

// Variáveis globais
let labId = null;
let labInfo = null;
let dataAtual = new Date();
let dataSelecionada = null;
let horarioSelecionado = null;

document.addEventListener('DOMContentLoaded', () => {
    // Prioridade 1: ID explícito definido pela página (ex.: window.LAB_PAGE_ID)
    if (typeof window.LAB_PAGE_ID !== 'undefined' && window.LAB_PAGE_ID !== null) {
        const explicit = String(window.LAB_PAGE_ID).match(/\d+/);
        if (explicit) {
            labId = parseInt(explicit[0], 10);
        }
    }

    // Prioridade 2: ID na URL (suportando formatos como 'id=3' e 'id=lab3')
    if (!labId) {
        const urlParams = new URLSearchParams(window.location.search);
        const rawId = urlParams.get('id') || urlParams.get('lab') || urlParams.get('labId');
        if (rawId) {
            const match = String(rawId).match(/\d+/);
            if (match) {
                labId = parseInt(match[0], 10);
            }
        }
    }

    // Prioridade 3: Fallback do localStorage
    if (!labId) {
        const stored = localStorage.getItem('lab_id') || localStorage.getItem('lab');
        if (stored) {
            const m = String(stored).match(/\d+/);
            if (m) {
                labId = parseInt(m[0], 10);
            }
        }
    }
    
    // Fallback adicional: selecionar/criar um laboratório padrão para evitar erro
    if (!labId) {
        try {
            const labs = window.api.listLabs();
            if (labs && labs.length > 0) {
                labId = labs[0].id; // usa o primeiro laboratório disponível
                localStorage.setItem('lab_id', String(labId));
            } else {
                // cria um ID fictício e persiste para navegação
                labId = 9999;
                localStorage.setItem('lab_id', String(labId));
            }
        } catch (e) {
            labId = 9999;
            localStorage.setItem('lab_id', String(labId));
        }
    }
    
    // Carregar informações do laboratório
    carregarLaboratorio();
    
    // Configurar eventos dos botões do calendário
    document.getElementById('mes-anterior').addEventListener('click', () => mudarMes(-1));
    document.getElementById('mes-proximo').addEventListener('click', () => mudarMes(1));
    
    // Configurar evento do formulário
    document.getElementById('reserva-form').addEventListener('submit', fazerReserva);
    
    // Configurar evento do botão cancelar
    document.getElementById('btn-cancelar').addEventListener('click', () => {
        document.getElementById('form-reserva').style.display = 'none';
        document.getElementById('horarios-container').style.display = 'block';
    });
});

// Função para carregar informações do laboratório
function carregarLaboratorio() {
    try {
        const labs = window.api.listLabs();
        labInfo = labs.find(lab => lab.id === labId);
        
        // Fallback: se não encontrar, seleciona o primeiro ou cria um fictício
        if (!labInfo) {
            if (labs && labs.length > 0) {
                labInfo = labs[0];
                labId = labInfo.id;
                localStorage.setItem('lab_id', String(labId));
            } else {
                labInfo = {
                    id: labId,
                    nome: 'Laboratório Fictício',
                    descricao: 'Criado automaticamente para testes de agendamento.'
                };
            }
        }
        
        // Atualizar informações na página
        document.getElementById('lab-titulo').textContent = labInfo.nome;
        document.getElementById('lab-descricao').textContent = labInfo.descricao || '';
        
        // Renderizar o calendário
        renderizarCalendario();
        
    } catch (error) {
        console.error('Erro ao carregar laboratório:', error);
        alert(`Erro ao carregar laboratório: ${error.message}`);
    }
}

// Função para renderizar o calendário
function renderizarCalendario() {
    const calendario = document.querySelector('.calendario-grid');
    const mesAtualElement = document.getElementById('mes-atual');
    
    // Limpar dias existentes (manter apenas os nomes dos dias)
    const diasNome = calendario.querySelectorAll('.calendario-dia-nome');
    calendario.innerHTML = '';
    diasNome.forEach(dia => calendario.appendChild(dia));
    
    // Configurar o título do mês
    const options = { month: 'long', year: 'numeric' };
    mesAtualElement.textContent = dataAtual.toLocaleDateString('pt-BR', options);
    
    // Obter o primeiro dia do mês e o último dia do mês
    const primeiroDia = new Date(dataAtual.getFullYear(), dataAtual.getMonth(), 1);
    const ultimoDia = new Date(dataAtual.getFullYear(), dataAtual.getMonth() + 1, 0);
    
    // Adicionar dias vazios até o primeiro dia do mês
    const primeiroDiaSemana = primeiroDia.getDay();
    for (let i = 0; i < primeiroDiaSemana; i++) {
        const diaVazio = document.createElement('div');
        diaVazio.className = 'calendario-dia disabled';
        calendario.appendChild(diaVazio);
    }
    
    // Adicionar os dias do mês
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    
    for (let i = 1; i <= ultimoDia.getDate(); i++) {
        const dia = document.createElement('div');
        dia.className = 'calendario-dia';
        dia.textContent = i;
        
        const dataDia = new Date(dataAtual.getFullYear(), dataAtual.getMonth(), i);
        
        // Verificar se é hoje
        if (dataDia.getTime() === hoje.getTime()) {
            dia.classList.add('hoje');
        }
        
        // Desabilitar dias passados e fins de semana
        const diaSemana = dataDia.getDay();
        if (dataDia < hoje || diaSemana === 0 || diaSemana === 6) {
            dia.classList.add('disabled');
        } else {
            dia.addEventListener('click', () => selecionarData(dataDia));
        }
        
        calendario.appendChild(dia);
    }
}

// Função para mudar o mês
function mudarMes(delta) {
    dataAtual = new Date(dataAtual.getFullYear(), dataAtual.getMonth() + delta, 1);
    renderizarCalendario();
}

// Função para selecionar uma data
function selecionarData(data) {
    // Remover seleção anterior
    const diasSelecionados = document.querySelectorAll('.calendario-dia.selected');
    diasSelecionados.forEach(dia => dia.classList.remove('selected'));
    
    // Adicionar seleção ao dia clicado
    const dia = data.getDate();
    const diasCalendario = document.querySelectorAll('.calendario-dia:not(.disabled)');
    diasCalendario.forEach(diaElement => {
        if (parseInt(diaElement.textContent) === dia) {
            diaElement.classList.add('selected');
        }
    });
    
    // Atualizar data selecionada
    dataSelecionada = data;
    
    // Mostrar horários disponíveis
    mostrarHorarios();
}

// Função para mostrar horários disponíveis
function mostrarHorarios() {
    const horariosContainer = document.getElementById('horarios-container');
    const horariosGrid = document.getElementById('horarios-grid');
    
    // Limpar horários existentes
    horariosGrid.innerHTML = '';
    
    // Horários disponíveis (8h às 22h, de 30 em 30 minutos)
    const horarios = [];
    for (let hora = 8; hora < 22; hora++) {
        horarios.push(`${hora}:00`);
        horarios.push(`${hora}:30`);
    }
    
    // Obter reservas e bloqueios para o laboratório na data selecionada
    const reservas = window.api.listReservas({ labId });
    const bloqueios = window.api.listBloqueios(labId);
    
    // Verificar disponibilidade de cada horário
    horarios.forEach(horario => {
        const [hora, minuto] = horario.split(':').map(Number);
        const dataHorario = new Date(dataSelecionada);
        dataHorario.setHours(hora, minuto, 0, 0);
        
        const horarioItem = document.createElement('div');
        horarioItem.className = 'horario-item';
        horarioItem.textContent = horario;
        
        // Verificar se o horário está bloqueado
        const estaBloqueado = bloqueios.some(bloqueio => {
            const bloqueioInicio = new Date(bloqueio.dataInicio);
            const bloqueioFim = new Date(bloqueio.dataFim);
            return dataHorario >= bloqueioInicio && dataHorario <= bloqueioFim;
        });
        
        // Verificar se o horário está reservado
        const estaReservado = reservas.some(reserva => {
            if (reserva.status !== 'pendente' && reserva.status !== 'aprovada') {
                return false;
            }
            
            const reservaInicio = new Date(reserva.dataInicio);
            const reservaFim = new Date(reserva.dataFim);
            
            // Adicionar buffer de 15 minutos
            const inicioComBuffer = new Date(reservaInicio.getTime() - 15 * 60000);
            const fimComBuffer = new Date(reservaFim.getTime() + 15 * 60000);
            
            return dataHorario >= inicioComBuffer && dataHorario <= fimComBuffer;
        });
        
        if (estaBloqueado) {
            horarioItem.classList.add('bloqueado');
            horarioItem.title = 'Horário bloqueado para manutenção';
        } else if (estaReservado) {
            horarioItem.classList.add('indisponivel');
            horarioItem.title = 'Horário já reservado';
        } else {
            horarioItem.addEventListener('click', () => selecionarHorario(horario));
        }
        
        horariosGrid.appendChild(horarioItem);
    });
    
    // Mostrar container de horários
    horariosContainer.style.display = 'block';
}

// Função para selecionar um horário
function selecionarHorario(horario) {
    // Remover seleção anterior
    const horariosSelecionados = document.querySelectorAll('.horario-item.selected');
    horariosSelecionados.forEach(h => h.classList.remove('selected'));
    
    // Adicionar seleção ao horário clicado
    const horariosItems = document.querySelectorAll('.horario-item:not(.indisponivel):not(.bloqueado)');
    horariosItems.forEach(h => {
        if (h.textContent === horario) {
            h.classList.add('selected');
        }
    });
    
    // Atualizar horário selecionado
    horarioSelecionado = horario;
    
    // Mostrar formulário de reserva
    mostrarFormulario();
}

// Função para mostrar formulário de reserva
function mostrarFormulario() {
    const formReserva = document.getElementById('form-reserva');
    const horariosContainer = document.getElementById('horarios-container');
    
    // Preencher campos de data e horário
    document.getElementById('data').value = dataSelecionada.toLocaleDateString('pt-BR');
    document.getElementById('horario').value = horarioSelecionado;
    
    // Mostrar formulário e esconder horários
    formReserva.style.display = 'block';
    horariosContainer.style.display = 'none';
}

// Função para fazer a reserva
function fazerReserva(event) {
    event.preventDefault();
    
    try {
        // Obter dados do formulário
        const nome = document.getElementById('nome').value;
        const telefone = document.getElementById('telefone').value;
        const duracao = parseInt(document.getElementById('duracao').value);
        const curso = document.getElementById('curso').value;
        const turma = document.getElementById('turma').value;
        const observacao = document.getElementById('observacao').value;
        
        // Criar data de início
        const [hora, minuto] = horarioSelecionado.split(':').map(Number);
        const dataInicio = new Date(dataSelecionada);
        dataInicio.setHours(hora, minuto, 0, 0);
        
        // Criar objeto de reserva
        const dadosReserva = {
            labId,
            nome,
            telefone,
            dataInicio,
            duracao,
            curso,
            turma,
            observacao
        };
        
        // Enviar reserva para a API
        const reserva = window.api.createReserva(dadosReserva);
        
        // Mostrar mensagem de sucesso
        alert('Reserva solicitada com sucesso! Aguarde a aprovação do administrador.');
        
        // Redirecionar para a página de minhas reservas
        window.location.href = 'minhas-reservas.html';
        
    } catch (error) {
        console.error('Erro ao fazer reserva:', error);
        alert(`Erro ao fazer reserva: ${error.message}`);
    }
}