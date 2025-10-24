/**
 * home.js - Script para a página inicial do professor
 * Lista os laboratórios disponíveis para reserva
 */

document.addEventListener('DOMContentLoaded', () => {
    // Carregar a lista de laboratórios
    carregarLaboratorios();
});

// Função para carregar os laboratórios disponíveis
function carregarLaboratorios() {
    try {
        const labs = window.api.listLabs();
        const container = document.getElementById('labs-container');
        
        // Limpar o container
        container.innerHTML = '';
        
        if (labs.length === 0) {
            container.innerHTML = '<p>Nenhum laboratório disponível no momento.</p>';
            return;
        }
        
        // Criar cards para cada laboratório
        labs.forEach(lab => {
            const labCard = document.createElement('div');
            labCard.className = 'lab-card card';
            
            labCard.innerHTML = `
                <h2>${lab.nome}</h2>
                <p>${lab.descricao}</p>
                <p><strong>Capacidade:</strong> ${lab.capacidade} pessoas</p>
                <a href="lab.html?id=${lab.id}" class="btn" onclick="localStorage.setItem('lab_id', ${lab.id})">Verificar Disponibilidade</a>
            `;
            
            container.appendChild(labCard);
        });
        
        // Adicionar estilos específicos para a grade de laboratórios
        const style = document.createElement('style');
        style.textContent = `
            .labs-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
                gap: 20px;
                margin-top: 20px;
            }
            
            .lab-card {
                display: flex;
                flex-direction: column;
                justify-content: space-between;
                height: 100%;
            }
            
            .lab-card h2 {
                color: var(--accent-color);
                margin-bottom: 10px;
            }
            
            .lab-card .btn {
                margin-top: 15px;
                align-self: flex-start;
            }
        `;
        document.head.appendChild(style);
        
    } catch (error) {
        console.error('Erro ao carregar laboratórios:', error);
        const container = document.getElementById('labs-container');
        container.innerHTML = `<p class="error">Erro ao carregar laboratórios: ${error.message}</p>`;
    }
}