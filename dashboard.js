
const authToken = sessionStorage.getItem('token');
const userRole  = sessionStorage.getItem('role');
const username  = sessionStorage.getItem('username');

// store all transactions in memory for client-side filtering
let allTransactions = [];
let allProducts    = [];
let productsPage   = 1;
let productsPerPage = 10;
let filteredTransactions = [];
let txnPage            = 1;
let txnPerPage         = 10;

// redirect if not logged in or not a manager
if (!authToken || userRole !== 'manager') {
  window.location.href = 'login.html';
}

// display username in top bar
const dashboardUsername = document.querySelector('#dashboard-username');
if (dashboardUsername) {
  dashboardUsername.textContent = `${username} (${userRole})`;
}

// logout button
const logoutBtn = document.querySelector('#dashboard-logout-btn');
if (logoutBtn) {
  logoutBtn.addEventListener('click', () => {
    sessionStorage.clear();
    window.location.href = 'login.html';
  });
}

// currency symbol — default to ₱
const currency = '₱';

// base URL
const API = 'http://localhost:8000';

// auth headers helper
const authHeaders = () => ({
  'Authorization': `Bearer ${authToken}`
});

// Format Helpers
function formatCurrency(value) {
  return `${currency}${parseFloat(value).toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}

// Load Summary Cards
async function loadSummary() {
  try {
    const response = await fetch(`${API}/api/reports/summary`, {
      headers: authHeaders()
    });
    const data = await response.json();

    document.querySelector('#stat-revenue').textContent = formatCurrency(data.revenue);
    document.querySelector('#stat-count').textContent   = data.transaction_count;
    document.querySelector('#stat-avg').textContent     = formatCurrency(data.average_sale);
    document.querySelector('#stat-tax').textContent     = formatCurrency(data.total_tax);

  } catch (error) {
    console.error('Failed to load summary:', error);
  }
}

// Daily Sales Line Chart
async function loadDailySalesChart() {
  try {
    const response = await fetch(`${API}/api/reports/daily-sales`, {
      headers: authHeaders()
    });
    const data = await response.json();

    const labels  = data.map(d => d.sale_date);
    const revenue = data.map(d => d.daily_revenue);

    const ctx = document.getElementById('dailySalesChart').getContext('2d');
    new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Daily Revenue',
          data: revenue,
          borderColor: '#1F5FAD',
          backgroundColor: 'rgba(31,95,173,0.08)',
          borderWidth: 2,
          pointBackgroundColor: '#1F5FAD',
          pointRadius: 4,
          pointHoverRadius: 6,
          tension: 0.4,
          fill: true,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: ctx => ` ${formatCurrency(ctx.raw)}`
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(0,0,0,0.04)' },
            ticks: {
              callback: value => formatCurrency(value),
              font: { size: 11 }
            }
          },
          x: {
            grid: { display: false },
            ticks: { font: { size: 11 } }
          }
        }
      }
    });

  } catch (error) {
    console.error('Failed to load daily sales chart:', error);
  }
}

// Top Products Bar Chart + Table
async function loadTopProducts() {
  try {
    const response = await fetch(`${API}/api/reports/top-products`, {
      headers: authHeaders()
    });
    allProducts = await response.json();

    // bar chart
    const labels  = allProducts.map(d => d.name);
    const revenue = allProducts.map(d => d.total_revenue);

    const ctx = document.getElementById('topProductsChart').getContext('2d');
    new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Revenue',
          data: revenue,
          backgroundColor: 'rgba(31,95,173,0.75)',
          borderColor: '#1F5FAD',
          borderWidth: 1,
          borderRadius: 4,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: ctx => ` ${formatCurrency(ctx.raw)}`
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(0,0,0,0.04)' },
            ticks: {
              callback: value => formatCurrency(value),
              font: { size: 10 }
            }
          },
          x: {
            grid: { display: false },
            ticks: { font: { size: 10 }, maxRotation: 30 }
          }
        }
      }
    });

    // render table with pagination
    renderProductsTable();

  } catch (error) {
    console.error('Failed to load top products:', error);
  }
}

// Payment Methods Doughnut Chart
async function loadPaymentChart() {
  try {
    const response = await fetch(`${API}/api/reports/payment-methods`, {
      headers: authHeaders()
    });
    const data = await response.json();

    const labels = data.map(d => d.payment_method.toUpperCase());
    const counts = data.map(d => d.count);

    const ctx = document.getElementById('paymentChart').getContext('2d');
    new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data: counts,
          backgroundColor: [
            '#1F5FAD',
            '#1A9B4B',
            '#B45309',
          ],
          borderWidth: 2,
          borderColor: '#ffffff',
          hoverOffset: 6,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              font: { size: 11 },
              padding: 12,
            }
          },
          tooltip: {
            callbacks: {
              label: ctx => ` ${ctx.label}: ${ctx.raw} transactions`
            }
          }
        }
      }
    });

  } catch (error) {
    console.error('Failed to load payment chart:', error);
  }
}

// Hourly Trend Line Chart
async function loadHourlyChart() {
  try {
    const response = await fetch(`${API}/api/reports/hourly-trend`, {
      headers: authHeaders()
    });
    const data = await response.json();

    // format hour labels as 12-hour clock
    const labels = data.map(d => {
      const h = d.hour;
      return h === 0 ? '12AM' : h < 12 ? `${h}AM` : h === 12 ? '12PM' : `${h-12}PM`;
    });
    const counts = data.map(d => d.transaction_count);

    const ctx = document.getElementById('hourlyChart').getContext('2d');
    new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Transactions',
          data: counts,
          backgroundColor: 'rgba(26,155,75,0.7)',
          borderColor: '#1A9B4B',
          borderWidth: 1,
          borderRadius: 4,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: ctx => ` ${ctx.raw} transactions`
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(0,0,0,0.04)' },
            ticks: {
              stepSize: 1,
              font: { size: 11 }
            }
          },
          x: {
            grid: { display: false },
            ticks: { font: { size: 10 } }
          }
        }
      }
    });

  } catch (error) {
    console.error('Failed to load hourly chart:', error);
  }
}

// Transaction History Table with Filter
async function loadTransactionHistory() {
  try {
    const response = await fetch(`${API}/api/reports/transaction-history`, {
      headers: authHeaders()
    });
    allTransactions      = await response.json();
    filteredTransactions = [...allTransactions];

    // update summary counts
    const completed = allTransactions.filter(t => t.refund_status === 'completed').length;
    const refunded  = allTransactions.filter(t => t.refund_status === 'refunded').length;

    document.querySelector('#txn-total-count').textContent     = allTransactions.length;
    document.querySelector('#txn-completed-count').textContent = completed;
    document.querySelector('#txn-refunded-count').textContent  = refunded;

    renderTransactionTable();
    setupFilterButtons();

  } catch (error) {
    console.error('Failed to load transaction history:', error);
    document.querySelector('#transaction-history-body').innerHTML =
      `<tr><td colspan="9" class="table-loading">Could not load transactions.</td></tr>`;
  }
}

// CSV Export
function setupExport() {
  // Top Products export (existing)
  const exportBtn = document.querySelector('#export-btn');
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      fetch(`${API}/api/reports/export/transactions`, {
        headers: authHeaders()
      })
      .then(r => r.blob())
      .then(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'transactions.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      })
      .catch(() => alert('Could not export.'));
    });
  }

  // Transaction History export (new)
  const exportTxnBtn = document.querySelector('#export-txn-btn');
  if (exportTxnBtn) {
    exportTxnBtn.addEventListener('click', () => {
      fetch(`${API}/api/reports/export/transactions`, {
        headers: authHeaders()
      })
      .then(r => r.blob())
      .then(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'transactions.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      })
      .catch(() => alert('Could not export.'));
    });
  }
}

// All transactions
function renderProductsTable() {
  const tbody = document.querySelector('#products-table-body');
  const start = (productsPage - 1) * productsPerPage;
  const end   = start + productsPerPage;
  const paged = allProducts.slice(start, end);

  tbody.innerHTML = paged.map((item, index) => `
    <tr>
      <td>#${start + index + 1}</td>
      <td>${item.name}</td>
      <td>${parseFloat(item.total_sold).toFixed(2)}</td>
      <td>${formatCurrency(item.total_revenue)}</td>
    </tr>
  `).join('');

  renderPagination(
    'products-pagination',
    allProducts.length,
    productsPerPage,
    productsPage,
    (newPage) => { productsPage = newPage; renderProductsTable(); },
    (newSize) => { productsPerPage = newSize; productsPage = 1; renderProductsTable(); }
  );
}

function renderTransactionTable() {
  const tbody = document.querySelector('#transaction-history-body');
  const start = (txnPage - 1) * txnPerPage;
  const end   = start + txnPerPage;
  const paged = filteredTransactions.slice(start, end);

  if (paged.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" class="table-loading">No transactions found.</td></tr>`;
    renderPagination('txn-pagination', 0, txnPerPage, txnPage, () => {}, () => {});
    return;
  }

  tbody.innerHTML = paged.map(txn => {
    const isRefunded  = txn.refund_status === 'refunded';
    const rowClass    = isRefunded ? 'row-refunded' : '';
    const statusBadge = isRefunded
      ? `<span class="status-badge status-refunded">Refunded</span>`
      : `<span class="status-badge status-completed">Completed</span>`;

    return `
      <tr class="${rowClass}">
        <td style="font-family: var(--font-mono); font-weight: 700;">#${txn.transaction_id}</td>
        <td style="font-size: 0.75rem;">${new Date(txn.date).toLocaleString('en-PH', {
          month: 'short', day: 'numeric', year: 'numeric',
          hour: '2-digit', minute: '2-digit'
        })}</td>
        <td>${txn.cashier}</td>
        <td style="text-transform: uppercase; font-size: 0.7rem; font-weight: 700;">
          ${txn.payment_method}
        </td>
        <td style="font-family: var(--font-mono);">${formatCurrency(txn.subtotal)}</td>
        <td style="font-family: var(--font-mono); color: var(--red-500);">
          ${txn.discount > 0 ? `-${formatCurrency(txn.discount)}` : '—'}
        </td>
        <td style="font-family: var(--font-mono);">${formatCurrency(txn.tax)}</td>
        <td style="font-family: var(--font-mono); font-weight: 700; color: var(--navy-800);">
          ${isRefunded ? `<s>${formatCurrency(txn.total)}</s>` : formatCurrency(txn.total)}
        </td>
        <td>${statusBadge}</td>
      </tr>
    `;
  }).join('');

  renderPagination(
    'txn-pagination',
    filteredTransactions.length,
    txnPerPage,
    txnPage,
    (newPage) => { txnPage = newPage; renderTransactionTable(); },
    (newSize) => { txnPerPage = newSize; txnPage = 1; renderTransactionTable(); }
  );
}

// Filter transactions 
function setupFilterButtons() {
  const filterBtns = document.querySelectorAll('.filter-btn');
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const filter = btn.dataset.filter;
      filteredTransactions = filter === 'all'
        ? [...allTransactions]
        : allTransactions.filter(t => t.refund_status === filter);

      txnPage = 1; // reset to first page on filter change
      renderTransactionTable();
    });
  });
}

// Shared Pagination Renderer
function renderPagination(containerId, totalItems, perPage, currentPage, onPageChange, onSizeChange) {
  const container = document.querySelector(`#${containerId}`);
  if (!container) return;

  const totalPages = Math.ceil(totalItems / perPage);

  container.innerHTML = `
    <div class="pagination-wrapper">
      <div class="pagination-info">
        Showing ${totalItems === 0 ? 0 : ((currentPage - 1) * perPage) + 1}–${Math.min(currentPage * perPage, totalItems)} of ${totalItems}
      </div>
      <div class="pagination-controls">
        <button class="page-btn" ${currentPage === 1 ? 'disabled' : ''}
          onclick="paginationCallback('${containerId}', ${currentPage - 1})">‹</button>

        ${generatePageNumbers(totalPages, currentPage).map(p =>
          p === '...'
            ? `<span class="page-ellipsis">…</span>`
            : `<button class="page-btn ${p === currentPage ? 'page-btn-active' : ''}"
                onclick="paginationCallback('${containerId}', ${p})">${p}</button>`
        ).join('')}

        <button class="page-btn" ${currentPage === totalPages || totalPages === 0 ? 'disabled' : ''}
          onclick="paginationCallback('${containerId}', ${currentPage + 1})">›</button>
      </div>
      <div class="pagination-size">
        <span>Per page:</span>
        <select class="page-size-select" onchange="pageSizeCallback('${containerId}', this.value)">
          <option value="5"  ${perPage === 5  ? 'selected' : ''}>5</option>
          <option value="10" ${perPage === 10 ? 'selected' : ''}>10</option>
          <option value="25" ${perPage === 25 ? 'selected' : ''}>25</option>
          <option value="50" ${perPage === 50 ? 'selected' : ''}>50</option>
        </select>
      </div>
    </div>
  `;

  // store callbacks on the container element
  container._onPageChange = onPageChange;
  container._onSizeChange = onSizeChange;
}

function generatePageNumbers(totalPages, currentPage) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const pages = [1];
  if (currentPage > 3) pages.push('...');
  for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
    pages.push(i);
  }
  if (currentPage < totalPages - 2) pages.push('...');
  pages.push(totalPages);
  return pages;
}

// global callbacks used by inline onclick handlers
function paginationCallback(containerId, page) {
  const container = document.querySelector(`#${containerId}`);
  if (container && container._onPageChange) container._onPageChange(page);
}

function pageSizeCallback(containerId, size) {
  const container = document.querySelector(`#${containerId}`);
  if (container && container._onSizeChange) container._onSizeChange(parseInt(size));
}

// Initialize Dashboard
async function initDashboard() {
  await loadSummary();

  // load all charts in parallel
  await Promise.all([
    loadDailySalesChart(),
    loadTopProducts(),
    loadPaymentChart(),
    loadHourlyChart(),
    loadTransactionHistory(),
  ]);

  setupExport();
}

initDashboard();