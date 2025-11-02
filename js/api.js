/**
 * API.js - Simulação de banco de dados para o Sistema de Reserva de Laboratórios
 * Utiliza localStorage para persistência de dados
 */

// Chave para armazenamento no localStorage
const DB_KEY = 'lab_mvp_db_v1';

// Estrutura inicial do banco de dados
const initialDB = {
  labs: [
    { id: 1, nome: 'Lab 01', capacidade: 30, descricao: 'Laboratório de Informática 01' },
    { id: 2, nome: 'Lab 02', capacidade: 25, descricao: 'Laboratório de Informática 02' },
    { id: 3, nome: 'Lab 03', capacidade: 20, descricao: 'Laboratório de Informática 03' }
  ],
  reservas: [],
  bloqueios: [],
  lastId: 0
};

// Inicializa o banco de dados se não existir
function initDB() {
  if (!localStorage.getItem(DB_KEY)) {
    localStorage.setItem(DB_KEY, JSON.stringify(initialDB));
  }
  return getDB();
}

// Inicializa o banco de dados imediatamente
initDB();

// Obtém o banco de dados atual
function getDB() {
  return JSON.parse(localStorage.getItem(DB_KEY));
}

// Salva o banco de dados
function saveDB(db) {
  localStorage.setItem(DB_KEY, JSON.stringify(db));
}

// Gera um novo ID para reservas ou bloqueios
function generateId() {
  const db = getDB();
  db.lastId += 1;
  saveDB(db);
  return db.lastId;
}

// Verifica se uma data é dia útil (segunda a sexta)
function isDiaUtil(data) {
  const dia = new Date(data).getDay();
  return dia >= 1 && dia <= 5; // 0 = domingo, 6 = sábado
}

// Calcula a diferença em dias entre duas datas
function diffDias(data1, data2) {
  const umDia = 24 * 60 * 60 * 1000;
  const d1 = new Date(data1);
  const d2 = new Date(data2);
  return Math.round(Math.abs((d1 - d2) / umDia));
}

// Calcula a diferença em horas entre duas datas
function diffHoras(data1, data2) {
  const umaHora = 60 * 60 * 1000;
  const d1 = new Date(data1);
  const d2 = new Date(data2);
  return Math.round(Math.abs((d1 - d2) / umaHora));
}

// Conta dias úteis entre duas datas
function contaDiasUteis(dataInicio, dataFim) {
  let contador = 0;
  const dataAtual = new Date(dataInicio);
  const fim = new Date(dataFim);
  
  while (dataAtual <= fim) {
    const diaSemana = dataAtual.getDay();
    if (diaSemana !== 0 && diaSemana !== 6) {
      contador++;
    }
    dataAtual.setDate(dataAtual.getDate() + 1);
  }
  
  return contador;
}

// Verifica se há conflito entre horários
function verificaConflito(inicio1, fim1, inicio2, fim2) {
  return (inicio1 < fim2 && fim1 > inicio2);
}

// Verifica se um horário está bloqueado
function verificaBloqueio(labId, dataInicio, dataFim) {
  const db = getDB();
  const bloqueios = db.bloqueios.filter(b => b.labId === labId);
  
  for (const bloqueio of bloqueios) {
    const bloqueioInicio = new Date(bloqueio.dataInicio);
    const bloqueioFim = new Date(bloqueio.dataFim);
    
    if (verificaConflito(
      new Date(dataInicio), 
      new Date(dataFim), 
      bloqueioInicio, 
      bloqueioFim
    )) {
      return true;
    }
  }
  
  return false;
}

// Verifica se há conflito com outras reservas (considerando buffer de 15min)
function verificaConflitoReservas(labId, dataInicio, dataFim, reservaId = null) {
  const db = getDB();
  const reservas = db.reservas.filter(r => 
    r.labId === labId && 
    (r.status === 'pendente' || r.status === 'aprovada') &&
    (reservaId === null || r.id !== reservaId)
  );
  
  // Adiciona buffer de 15 minutos antes e depois
  const inicioComBuffer = new Date(new Date(dataInicio).getTime() - 15 * 60000);
  const fimComBuffer = new Date(new Date(dataFim).getTime() + 15 * 60000);
  
  for (const reserva of reservas) {
    const reservaInicio = new Date(reserva.dataInicio);
    const reservaFim = new Date(reserva.dataFim);
    
    if (verificaConflito(
      inicioComBuffer, 
      fimComBuffer, 
      reservaInicio, 
      reservaFim
    )) {
      return true;
    }
  }
  
  return false;
}

// Conta reservas por telefone na semana
function contaReservasSemana(telefone, dataInicio) {
  const db = getDB();
  const inicio = new Date(dataInicio);
  const inicioSemana = new Date(inicio);
  const fimSemana = new Date(inicio);
  
  // Ajusta para o início da semana (domingo)
  const diaSemana = inicio.getDay();
  inicioSemana.setDate(inicio.getDate() - diaSemana);
  inicioSemana.setHours(0, 0, 0, 0);
  
  // Ajusta para o fim da semana (sábado)
  fimSemana.setDate(inicioSemana.getDate() + 6);
  fimSemana.setHours(23, 59, 59, 999);
  
  // Conta reservas na semana
  return db.reservas.filter(r => 
    r.telefone === telefone && 
    (r.status === 'pendente' || r.status === 'aprovada') &&
    new Date(r.dataInicio) >= inicioSemana &&
    new Date(r.dataInicio) <= fimSemana
  ).length;
}

// Verifica e atualiza reservas expiradas
function verificaReservasExpiradas() {
  const db = getDB();
  const agora = new Date();
  let alterado = false;
  
  db.reservas.forEach(reserva => {
    if (reserva.status === 'pendente') {
      const dataCriacao = new Date(reserva.dataCriacao);
      const horasPassadas = diffHoras(agora, dataCriacao);
      
      if (horasPassadas >= 48) {
        reserva.status = 'expirada';
        alterado = true;
      }
    }
  });
  
  if (alterado) {
    saveDB(db);
  }
}

// API pública
const api = {
  // Lista todos os laboratórios
  listLabs() {
    const db = initDB();
    return [...db.labs];
  },
  
  // Lista todas as reservas
  listReservas(filtros = {}) {
    verificaReservasExpiradas();
    const db = getDB();
    let reservas = [...db.reservas];
    
    // Aplica filtros se existirem
    if (filtros.telefone) {
      reservas = reservas.filter(r => r.telefone === filtros.telefone);
    }
    
    if (filtros.labId) {
      reservas = reservas.filter(r => r.labId === filtros.labId);
    }
    
    if (filtros.status) {
      reservas = reservas.filter(r => r.status === filtros.status);
    }
    
    return reservas;
  },
  
  // Cria uma nova reserva
  createReserva(dados) {
    verificaReservasExpiradas();
    const db = getDB();
    const agora = new Date();
    
    // Validações
    if (!dados.labId || !dados.nome || !dados.telefone || !dados.dataInicio || !dados.duracao) {
      throw new Error('Dados incompletos para a reserva');
    }
    
    // Validar formato do telefone (34 9 9999-9999)
    const telefoneRegex = /^\d{2}\s9\s\d{4}-\d{4}$/;
    if (!telefoneRegex.test(dados.telefone)) {
      throw new Error('Formato de telefone inválido. Use: 34 9 9999-9999');
    }
    
    // Validar duração (30-240min, múltiplos de 30)
    if (dados.duracao < 30 || dados.duracao > 240 || dados.duracao % 30 !== 0) {
      throw new Error('Duração inválida. Deve ser entre 30 e 240 minutos, em múltiplos de 30');
    }
    
    // Calcular data/hora de fim
    const dataInicio = new Date(dados.dataInicio);
    const dataFim = new Date(dataInicio.getTime() + dados.duracao * 60000);
    
    // Validar antecedência mínima (9 dias úteis)
    const diasUteis = contaDiasUteis(agora, dataInicio);
    if (diasUteis < 9) {
      throw new Error('A reserva deve ser feita com no mínimo 9 dias úteis de antecedência');
    }
    
    // Verificar limite de 8 reservas por semana por telefone
    const reservasSemana = contaReservasSemana(dados.telefone, dataInicio);
    if (reservasSemana >= 8) {
      throw new Error('Limite de 8 reservas por semana por telefone atingido');
    }
    
    // Verificar conflitos com bloqueios
    if (verificaBloqueio(dados.labId, dataInicio, dataFim)) {
      throw new Error('O horário solicitado está em um período de bloqueio do laboratório');
    }
    
    // Verificar conflitos com outras reservas (incluindo buffer)
    if (verificaConflitoReservas(dados.labId, dataInicio, dataFim)) {
      throw new Error('Conflito com outra reserva (considere o buffer de 15 minutos entre reservas)');
    }
    
    // Criar a reserva
    const novaReserva = {
      id: generateId(),
      labId: dados.labId,
      nome: dados.nome,
      telefone: dados.telefone,
      dataInicio: dataInicio.toISOString(),
      dataFim: dataFim.toISOString(),
      duracao: dados.duracao,
      curso: dados.curso || '',
      turma: dados.turma || '',
      observacao: dados.observacao || '',
      status: 'pendente',
      dataCriacao: agora.toISOString(),
      motivoNegacao: null
    };
    
    db.reservas.push(novaReserva);
    saveDB(db);
    
    return novaReserva;
  },
  
  // Cancela uma reserva
  cancelarReserva(reservaId) {
    verificaReservasExpiradas();
    const db = getDB();
    const reserva = db.reservas.find(r => r.id === reservaId);
    
    if (!reserva) {
      throw new Error('Reserva não encontrada');
    }
    
    if (reserva.status !== 'pendente' && reserva.status !== 'aprovada') {
      throw new Error('Apenas reservas pendentes ou aprovadas podem ser canceladas');
    }
    
    // Verificar antecedência mínima de 12h
    const agora = new Date();
    const inicio = new Date(reserva.dataInicio);
    const horasAteInicio = diffHoras(inicio, agora);
    
    if (horasAteInicio < 12) {
      throw new Error('Reservas só podem ser canceladas com no mínimo 12h de antecedência');
    }
    
    reserva.status = 'cancelada';
    saveDB(db);
    
    return reserva;
  },
  
  // Aprova uma reserva
  aprovar(reservaId) {
    verificaReservasExpiradas();
    const db = getDB();
    const reserva = db.reservas.find(r => r.id === reservaId);
    
    if (!reserva) {
      throw new Error('Reserva não encontrada');
    }
    
    if (reserva.status !== 'pendente') {
      throw new Error('Apenas reservas pendentes podem ser aprovadas');
    }
    
    reserva.status = 'aprovada';
    saveDB(db);
    
    return reserva;
  },
  
  // Nega uma reserva
  negar(reservaId, motivo) {
    verificaReservasExpiradas();
    const db = getDB();
    const reserva = db.reservas.find(r => r.id === reservaId);
    
    if (!reserva) {
      throw new Error('Reserva não encontrada');
    }
    
    if (reserva.status !== 'pendente') {
      throw new Error('Apenas reservas pendentes podem ser negadas');
    }
    
    if (!motivo || motivo.trim() === '') {
      throw new Error('É necessário informar o motivo da negação');
    }
    
    reserva.status = 'negada';
    reserva.motivoNegacao = motivo;
    saveDB(db);
    
    return reserva;
  },
  
  // Lista bloqueios de laboratórios
  listBloqueios(labId = null) {
    const db = getDB();
    let bloqueios = [...db.bloqueios];
    
    if (labId !== null) {
      bloqueios = bloqueios.filter(b => b.labId === labId);
    }
    
    return bloqueios;
  },
  
  // Adiciona um bloqueio
  addBloqueio(dados) {
    const db = getDB();
    
    if (!dados.labId || !dados.dataInicio || !dados.dataFim || !dados.motivo) {
      throw new Error('Dados incompletos para o bloqueio');
    }
    
    const dataInicio = new Date(dados.dataInicio);
    const dataFim = new Date(dados.dataFim);
    
    if (dataFim <= dataInicio) {
      throw new Error('A data de fim deve ser posterior à data de início');
    }
    
    // Verificar conflitos com reservas aprovadas
    const reservasConflitantes = db.reservas.filter(r => 
      r.labId === dados.labId && 
      (r.status === 'aprovada') &&
      verificaConflito(
        dataInicio,
        dataFim,
        new Date(r.dataInicio),
        new Date(r.dataFim)
      )
    );
    
    if (reservasConflitantes.length > 0) {
      throw new Error('Existem reservas aprovadas neste período');
    }
    
    const novoBloqueio = {
      id: generateId(),
      labId: dados.labId,
      dataInicio: dataInicio.toISOString(),
      dataFim: dataFim.toISOString(),
      motivo: dados.motivo
    };
    
    db.bloqueios.push(novoBloqueio);
    saveDB(db);
    
    return novoBloqueio;
  },
  
  // Remove um bloqueio
  removeBloqueio(bloqueioId) {
    const db = getDB();
    const index = db.bloqueios.findIndex(b => b.id === bloqueioId);
    
    if (index === -1) {
      throw new Error('Bloqueio não encontrado');
    }
    
    const bloqueioRemovido = db.bloqueios[index];
    db.bloqueios.splice(index, 1);
    saveDB(db);
    
    return bloqueioRemovido;
  },
  
  // Limpa o banco de dados (apenas para testes)
  resetDB() {
    localStorage.setItem(DB_KEY, JSON.stringify(initialDB));
    return initialDB;
  }
};

// Inicializa o banco de dados
initDB();

// Exporta a API
window.api = api;