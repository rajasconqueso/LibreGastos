// Referencias al DOM
const form             = document.getElementById('transaction-form');
const typeSelect       = document.getElementById('type');
const amountInput      = document.getElementById('amount');
const descriptionInput = document.getElementById('description');
const categorySelect   = document.getElementById('category');
const historyList      = document.getElementById('history');
const balanceDisplay   = document.getElementById('balance');
const incomeDisplay    = document.getElementById('income');
const expenseDisplay   = document.getElementById('expense');

// Estado
let transactions = JSON.parse(localStorage.getItem('transactions')) || [];
let idToDelete   = null;

// Referencias al modal
const deleteModal      = document.getElementById('deleteModal');
const confirmDeleteBtn = document.getElementById('confirmDelete');
const cancelDeleteBtn  = document.getElementById('cancelDelete');

// Funciones de animación del modal
function showModal() {
  deleteModal.classList.remove('hidden');
  requestAnimationFrame(() => {
    deleteModal.classList.add('visible');
  });
}
function hideModal() {
  deleteModal.classList.remove('visible');
  deleteModal.addEventListener('transitionend', () => {
    deleteModal.classList.add('hidden');
  }, { once: true });
}

// Evento de confirmación individual
confirmDeleteBtn.addEventListener('click', () => {
  transactions = transactions.filter(tx => tx.id !== idToDelete);
  saveTransactions();
  updateBalance();
  updateSmartSummary();
  renderTransactions();
  hideModal();
  idToDelete = null;
});

// Evento de cancelación individual
cancelDeleteBtn.addEventListener('click', () => {
  hideModal();
  idToDelete = null;
});

// Guardar en LocalStorage
function saveTransactions() {
  localStorage.setItem('transactions', JSON.stringify(transactions));
}

// Actualizar balance, ingresos y gastos
function updateBalance() {
  const ingresos = transactions
    .filter(tx => tx.type === 'ingreso')
    .reduce((sum, tx) => sum + tx.amount, 0);
  const gastos = transactions
    .filter(tx => tx.type === 'gasto')
    .reduce((sum, tx) => sum + tx.amount, 0);
  const total = ingresos - gastos;

  balanceDisplay.textContent = `$${total.toFixed(2)}`;
  incomeDisplay.textContent  = `$${ingresos.toFixed(2)}`;
  expenseDisplay.textContent = `$${gastos.toFixed(2)}`;
}

// Renderizar historial con animaciones y botón eliminar
function renderTransactions() {
  const filterType = document.getElementById('filter-type').value;
  const filterDate = document.getElementById('filter-date').value;
  const filterCategory = document.getElementById('filter-category').value;

  const filtered = transactions.filter(tx => {
    const matchType = filterType === 'todos' || tx.type === filterType;
    const matchDate = !filterDate || tx.date === filterDate;
    const matchCategory = filterCategory === 'todas' || tx.category === filterCategory;
    return matchType && matchDate && matchCategory;
  });

  historyList.innerHTML = '';
  if (filtered.length === 0) {
    historyList.innerHTML = '<p class="text-gray-500 text-center">Sin movimientos coincidentes.</p>';
    return;
  }

  filtered.slice().reverse().forEach(tx => {
    const item = document.createElement('li');
    const cls = tx.type === 'ingreso'
      ? 'bg-green-100 border-green-300'
      : 'bg-red-100 border-red-300';
    item.className = [
      cls,
      'flex justify-between items-center px-4 py-2 rounded-md border shadow-sm',
      'animate-fade-in transform transition-transform duration-300 hover:scale-105'
    ].join(' ');

    item.innerHTML = `
      <div>
        <p class="font-semibold">${tx.description}</p>
        <p class="text-xs text-gray-500">${tx.date} • ${tx.category}</p>
      </div>
      <div class="text-right">
        <p class="font-semibold">${tx.type==='ingreso'?'+':'-'}$${tx.amount.toFixed(2)}</p>
        <button class="text-sm text-red-600 hover:underline mt-1" data-id="${tx.id}">
          Eliminar
        </button>
      </div>
    `;

    item.querySelector('button[data-id]').addEventListener('click', e => {
      idToDelete = parseInt(e.currentTarget.getAttribute('data-id'));
      showModal();
    });

    historyList.appendChild(item);
  });
}

// Resumen inteligente
function updateSmartSummary() {
  if (!transactions.length) {
    ['top-expense-cat','top-income-cat','busiest-day','avg-daily-expense']
      .forEach(id => document.getElementById(id).textContent = '-');
    return;
  }
  const expenseByCat = {}, incomeByCat = {}, dailyCount = {};
  transactions.forEach(tx => {
    dailyCount[tx.date] = (dailyCount[tx.date]||0) + 1;
    if (tx.type==='gasto') {
      expenseByCat[tx.category] = (expenseByCat[tx.category]||0) + tx.amount;
    } else {
      incomeByCat[tx.category] = (incomeByCat[tx.category]||0) + tx.amount;
    }
  });
  const topExpenseCat = Object.entries(expenseByCat).sort((a,b)=>b[1]-a[1])[0]?.[0]||'-';
  const topIncomeCat  = Object.entries(incomeByCat ).sort((a,b)=>b[1]-a[1])[0]?.[0]||'-';
  const busiestDay    = Object.entries(dailyCount).sort((a,b)=>b[1]-a[1])[0]?.[0]||'-';
  const avgExp        = (Object.values(expenseByCat).reduce((a,b)=>a+b,0)
                        / Object.keys(dailyCount).length).toFixed(2);

  document.getElementById('top-expense-cat'  ).textContent = topExpenseCat;
  document.getElementById('top-income-cat'   ).textContent = topIncomeCat;
  document.getElementById('busiest-day'      ).textContent = busiestDay;
  document.getElementById('avg-daily-expense').textContent = `$${avgExp}`;
}

// Eliminar todo el historial
document.getElementById('clearHistory').addEventListener('click', () => {
  if (!confirm('¿Eliminar todo el historial?')) return;
  transactions = [];
  saveTransactions();
  updateBalance();
  updateSmartSummary();
  renderTransactions();
});

// Registrarse nuevo movimiento
form.addEventListener('submit', e => {
  e.preventDefault();
  const amount = parseFloat(amountInput.value),
        type   = typeSelect.value,
        cat    = categorySelect.value,
        desc   = descriptionInput.value.trim();
  if (!desc || isNaN(amount) || amount<=0) {
    alert('Monto y descripción válidos, por favor.');
    return;
  }
  transactions.push({
    id: Date.now(),
    amount: amount, // monto siempre positivo
    description: desc,
    type,
    category: cat,
    date: new Date().toISOString().split('T')[0]
  });
  saveTransactions();
  updateBalance();
  updateSmartSummary();
  renderTransactions();
  form.reset();
});

// Exportar a JSON
document.getElementById('export-btn').addEventListener('click', () => {
  const dataStr = JSON.stringify(transactions, null, 2);
  const blob = new Blob([dataStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'libregastos.json';
  a.click();
  URL.revokeObjectURL(url);
});

// Importar desde JSON
document.getElementById('import-file').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const importedData = JSON.parse(event.target.result);
      if (Array.isArray(importedData)) {
        transactions = importedData;
        saveTransactions();
        updateBalance();
        updateSmartSummary();
        renderTransactions();
        alert('Datos importados correctamente.');
      } else {
        throw new Error('El archivo no contiene un formato válido.');
      }
    } catch (err) {
      alert('Error al importar: ' + err.message);
    }
  };
  reader.readAsText(file);
});

// Aplicar filtros automáticamente cuando se cambien
document.getElementById('filter-type').addEventListener('change', renderTransactions);
document.getElementById('filter-date').addEventListener('change', renderTransactions);
document.getElementById('filter-category').addEventListener('change', renderTransactions);

document.getElementById('clear-filters').addEventListener('click', () => {
  document.getElementById('filter-type').value = 'todos';
  document.getElementById('filter-date').value = '';
  document.getElementById('filter-category').value = 'todas';
  renderTransactions();
});

// Inicializar interfaz
updateBalance();
updateSmartSummary();
renderTransactions();