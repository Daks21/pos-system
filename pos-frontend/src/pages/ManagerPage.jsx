import "../styles/pos.css";
import "../styles/ManagerDash.css";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import StatCard from "../components/StatCard";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line, Bar, Doughnut } from "react-chartjs-2";

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, ArcElement, Title, Tooltip, Legend, Filler
);

const API = "http://localhost:8000";
const authHeaders = () => ({
  Authorization: `Bearer ${sessionStorage.getItem("token")}`,
});

// ─── Reusable Pagination Component ───────────────────
function Pagination({ total, perPage, currentPage, onPageChange, onSizeChange }) {
  const totalPages = Math.ceil(total / perPage);
  const start = total === 0 ? 0 : (currentPage - 1) * perPage + 1;
  const end = Math.min(currentPage * perPage, total);

  const generatePages = () => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages = [1];
    if (currentPage > 3) pages.push("...");
    for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
      pages.push(i);
    }
    if (currentPage < totalPages - 2) pages.push("...");
    pages.push(totalPages);
    return pages;
  };

  return (
    <div className="pagination-wrapper">
      <div className="pagination-info">
        Showing {start}–{end} of {total}
      </div>
      <div className="pagination-controls">
        <button
          className="page-btn"
          disabled={currentPage === 1}
          onClick={() => onPageChange(currentPage - 1)}
        >‹</button>

        {generatePages().map((p, i) =>
          p === "..." ? (
            <span key={`ellipsis-${i}`} className="page-ellipsis">…</span>
          ) : (
            <button
              key={p}
              className={`page-btn ${p === currentPage ? "page-btn-active" : ""}`}
              onClick={() => onPageChange(p)}
            >{p}</button>
          )
        )}

        <button
          className="page-btn"
          disabled={currentPage === totalPages || totalPages === 0}
          onClick={() => onPageChange(currentPage + 1)}
        >›</button>
      </div>
      <div className="pagination-size">
        <span>Per page:</span>
        <select
          className="page-size-select"
          value={perPage}
          onChange={(e) => onSizeChange(parseInt(e.target.value))}
        >
          <option value={5}>5</option>
          <option value={10}>10</option>
          <option value={25}>25</option>
          <option value={50}>50</option>
        </select>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────
function ManagerPage() {
  const [summary, setSummary] = useState(null);
  const [dailySales, setDailySales] = useState([]);
  const [hourlyTrend, setHourlyTrend] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [filter, setFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);

  // ─── Pagination State ─────────────────────────────
  const [productsPage, setProductsPage] = useState(1);
  const [productsPerPage, setProductsPerPage] = useState(10);
  const [txnPage, setTxnPage] = useState(1);
  const [txnPerPage, setTxnPerPage] = useState(10);

  const navigate = useNavigate();
  const username = sessionStorage.getItem("username");
  const currency = "₱";

  const formatCurrency = (value) =>
    `${currency}${parseFloat(value).toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  // ─── Load all data on mount ───────────────────────
  useEffect(() => {
    async function loadAll() {
      try {
        const [s, d, h, p, pm, t] = await Promise.all([
          fetch(`${API}/api/reports/summary`, { headers: authHeaders() }).then((r) => r.json()),
          fetch(`${API}/api/reports/daily-sales`, { headers: authHeaders() }).then((r) => r.json()),
          fetch(`${API}/api/reports/hourly-trend`, { headers: authHeaders() }).then((r) => r.json()),
          fetch(`${API}/api/reports/top-products`, { headers: authHeaders() }).then((r) => r.json()),
          fetch(`${API}/api/reports/payment-methods`, { headers: authHeaders() }).then((r) => r.json()),
          fetch(`${API}/api/reports/transaction-history`, { headers: authHeaders() }).then((r) => r.json()),
        ]);
        setSummary(s);
        setDailySales(d);
        setHourlyTrend(h);
        setTopProducts(p);
        setPaymentMethods(pm);
        setTransactions(t);
      } catch (error) {
        console.error("Failed to load dashboard:", error);
      } finally {
        setIsLoading(false);
      }
    }
    loadAll();
  }, []);

  // Fix body overflow for dashboard
  useEffect(() => {
    document.body.style.overflow = "auto";
    document.body.style.height = "auto";
    return () => {
      document.body.style.overflow = "";
      document.body.style.height = "";
    };
  }, []);

  // ─── CSV Export ───────────────────────────────────
  const handleExport = () => {
    fetch(`${API}/api/reports/export/transactions`, { headers: authHeaders() })
      .then((r) => r.blob())
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "transactions.csv";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      })
      .catch(() => alert("Could not export."));
  };

  const handleLogout = () => {
    sessionStorage.clear();
    navigate("/login");
  };

  // ─── Filtered + Paginated Data ────────────────────
  const filteredTransactions =
    filter === "all"
      ? transactions
      : transactions.filter((t) => t.refund_status === filter);

  // reset txn page when filter changes
  const handleFilterChange = (f) => {
    setFilter(f);
    setTxnPage(1);
  };

  const pagedProducts = topProducts.slice(
    (productsPage - 1) * productsPerPage,
    productsPage * productsPerPage
  );

  const pagedTransactions = filteredTransactions.slice(
    (txnPage - 1) * txnPerPage,
    txnPage * txnPerPage
  );

  const completedCount = transactions.filter(t => t.refund_status === "completed").length;
  const refundedCount  = transactions.filter(t => t.refund_status === "refunded").length;

  if (isLoading) return <div className="loading">Loading Dashboard...</div>;

  return (
    <div className="dashboard-body">

      {/* Top Bar */}
      <header className="dashboard-topbar">
        <div className="dashboard-brand">
          <span className="dashboard-store-name">Seven Evelyn</span>
          <span className="dashboard-badge">Manager Dashboard</span>
        </div>
        <div className="dashboard-topbar-right">
          <span className="dashboard-user">{username} (manager)</span>
          <button className="dashboard-nav-btn" onClick={() => navigate("/pos")}>
            ← Back to POS
          </button>
          <button className="dashboard-logout-btn" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      <main className="dashboard-main">

        {/* Summary Cards */}
        <section className="summary-cards">
          <StatCard label="Total Revenue"  value={formatCurrency(summary?.revenue || 0)}       sub="Completed transactions" />
          <StatCard label="Transactions"   value={summary?.transaction_count || 0}              sub="Total sales processed" />
          <StatCard label="Average Sale"   value={formatCurrency(summary?.average_sale || 0)}   sub="Per transaction" />
          <StatCard label="Total Tax"      value={formatCurrency(summary?.total_tax || 0)}       sub="VAT collected" />
        </section>

        {/* Charts Row 1 */}
        <section className="charts-row">
          <div className="chart-card">
            <div className="chart-card-header">
              <span className="chart-title">Daily Revenue — Last 30 Days</span>
            </div>
            <div className="chart-container">
              <Line
                data={{
                  labels: dailySales.map((d) => d.sale_date),
                  datasets: [{
                    label: "Daily Revenue",
                    data: dailySales.map((d) => d.daily_revenue),
                    borderColor: "#1F5FAD",
                    backgroundColor: "rgba(31,95,173,0.08)",
                    borderWidth: 2,
                    pointBackgroundColor: "#1F5FAD",
                    pointRadius: 4,
                    tension: 0.4,
                    fill: true,
                  }]
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { display: false },
                    tooltip: { callbacks: { label: (ctx) => ` ${formatCurrency(ctx.raw)}` } }
                  },
                  scales: {
                    y: { beginAtZero: true, ticks: { callback: (v) => formatCurrency(v), font: { size: 11 } } },
                    x: { grid: { display: false }, ticks: { font: { size: 11 } } }
                  }
                }}
              />
            </div>
          </div>

          <div className="chart-card">
            <div className="chart-card-header">
              <span className="chart-title">Payment Methods</span>
            </div>
            <div className="chart-container">
              {paymentMethods.length === 0 ? (
                <div className="table-loading">No data yet.</div>
              ) : (
                <Doughnut
                  data={{
                    labels: paymentMethods.map((d) => d.payment_method.toUpperCase()),
                    datasets: [{
                      data: paymentMethods.map((d) => d.count),
                      backgroundColor: ["#1F5FAD", "#1A9B4B", "#B45309"],
                      borderWidth: 2,
                      borderColor: "#ffffff",
                      hoverOffset: 6,
                    }]
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { position: "bottom", labels: { font: { size: 11 }, padding: 12 } },
                      tooltip: { callbacks: { label: (ctx) => ` ${ctx.label}: ${ctx.raw} transactions` } }
                    }
                  }}
                />
              )}
            </div>
          </div>
        </section>

        {/* Charts Row 2 */}
        <section className="charts-row">
          <div className="chart-card">
            <div className="chart-card-header">
              <span className="chart-title">Top Products by Revenue</span>
            </div>
            <div className="chart-container">
              {topProducts.length === 0 ? (
                <div className="table-loading">No data yet.</div>
              ) : (
                <Bar
                  data={{
                    labels: topProducts.map((d) => d.name),
                    datasets: [{
                      label: "Revenue",
                      data: topProducts.map((d) => d.total_revenue),
                      backgroundColor: "rgba(31,95,173,0.75)",
                      borderColor: "#1F5FAD",
                      borderWidth: 1,
                      borderRadius: 4,
                    }]
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { display: false },
                      tooltip: { callbacks: { label: (ctx) => ` ${formatCurrency(ctx.raw)}` } }
                    },
                    scales: {
                      y: { beginAtZero: true, ticks: { callback: (v) => formatCurrency(v), font: { size: 10 } } },
                      x: { grid: { display: false }, ticks: { font: { size: 10 }, maxRotation: 30 } }
                    }
                  }}
                />
              )}
            </div>
          </div>

          <div className="chart-card">
            <div className="chart-card-header">
              <span className="chart-title">Hourly Trend — Last 7 Days</span>
            </div>
            <div className="chart-container">
              {hourlyTrend.length === 0 ? (
                <div className="table-loading">No data yet.</div>
              ) : (
                <Bar
                  data={{
                    labels: hourlyTrend.map((d) => {
                      const h = d.hour;
                      return h === 0 ? "12AM" : h < 12 ? `${h}AM` : h === 12 ? "12PM" : `${h - 12}PM`;
                    }),
                    datasets: [{
                      label: "Transactions",
                      data: hourlyTrend.map((d) => d.transaction_count),
                      backgroundColor: "rgba(26,155,75,0.7)",
                      borderColor: "#1A9B4B",
                      borderWidth: 1,
                      borderRadius: 4,
                    }]
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { display: false },
                      tooltip: { callbacks: { label: (ctx) => ` ${ctx.raw} transactions` } }
                    },
                    scales: {
                      y: { beginAtZero: true, ticks: { stepSize: 1, font: { size: 11 } } },
                      x: { grid: { display: false }, ticks: { font: { size: 10 } } }
                    }
                  }}
                />
              )}
            </div>
          </div>
        </section>

        {/* Top Products Table with Pagination */}
        <section className="table-section">
          <div className="table-card">
            <div className="table-card-header">
              <span className="chart-title">Top Products — Detailed View</span>
              <button className="export-btn" onClick={handleExport}>⬇ Export CSV</button>
            </div>
            <div className="table-scroll-wrapper">
              <table className="products-table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Product</th>
                    <th>Units Sold</th>
                    <th>Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedProducts.length === 0 ? (
                    <tr><td colSpan="4" className="table-loading">No data yet.</td></tr>
                  ) : (
                    pagedProducts.map((item, index) => (
                      <tr key={item.name}>
                        <td>#{(productsPage - 1) * productsPerPage + index + 1}</td>
                        <td>{item.name}</td>
                        <td>{parseFloat(item.total_sold).toFixed(2)}</td>
                        <td>{formatCurrency(item.total_revenue)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <Pagination
              total={topProducts.length}
              perPage={productsPerPage}
              currentPage={productsPage}
              onPageChange={(p) => setProductsPage(p)}
              onSizeChange={(s) => { setProductsPerPage(s); setProductsPage(1); }}
            />
          </div>
        </section>

        {/* Transaction History with Filter + Pagination */}
        <section className="table-section">
          <div className="table-card">
            <div className="table-card-header">
              <span className="chart-title">Transaction History</span>
              <div className="table-controls">
                <div className="filter-buttons">
                  {["all", "completed", "refunded"].map((f) => (
                    <button
                      key={f}
                      className={`filter-btn ${filter === f ? "active" : ""}`}
                      onClick={() => handleFilterChange(f)}
                    >
                      {f.charAt(0).toUpperCase() + f.slice(1)}
                    </button>
                  ))}
                </div>
                <button className="export-btn" onClick={handleExport}>⬇ Export CSV</button>
              </div>
            </div>

            {/* Summary counts */}
            <div className="transaction-summary-row">
              <span className="txn-summary-item">
                Total: <strong>{transactions.length}</strong>
              </span>
              <span className="txn-summary-item completed-label">
                Completed: <strong>{completedCount}</strong>
              </span>
              <span className="txn-summary-item refunded-label">
                Refunded: <strong>{refundedCount}</strong>
              </span>
            </div>

            <div className="table-scroll-wrapper">
              <table className="products-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Date</th>
                    <th>Cashier</th>
                    <th>Payment</th>
                    <th>Subtotal</th>
                    <th>Discount</th>
                    <th>Tax</th>
                    <th>Total</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedTransactions.length === 0 ? (
                    <tr><td colSpan="9" className="table-loading">No transactions found.</td></tr>
                  ) : (
                    pagedTransactions.map((txn) => (
                      <tr
                        key={txn.transaction_id}
                        className={txn.refund_status === "refunded" ? "row-refunded" : ""}
                      >
                        <td style={{ fontFamily: "var(--font-mono)", fontWeight: 700 }}>
                          #{txn.transaction_id}
                        </td>
                        <td style={{ fontSize: "0.75rem" }}>
                          {new Date(txn.date).toLocaleString("en-PH", {
                            month: "short", day: "numeric", year: "numeric",
                            hour: "2-digit", minute: "2-digit",
                          })}
                        </td>
                        <td>{txn.cashier}</td>
                        <td style={{ textTransform: "uppercase", fontSize: "0.7rem", fontWeight: 700 }}>
                          {txn.payment_method}
                        </td>
                        <td style={{ fontFamily: "var(--font-mono)" }}>{formatCurrency(txn.subtotal)}</td>
                        <td style={{ fontFamily: "var(--font-mono)", color: "var(--red-500)" }}>
                          {txn.discount > 0 ? `-${formatCurrency(txn.discount)}` : "—"}
                        </td>
                        <td style={{ fontFamily: "var(--font-mono)" }}>{formatCurrency(txn.tax)}</td>
                        <td style={{ fontFamily: "var(--font-mono)", color: "var(--navy-800)" }}>
                          {txn.refund_status === "refunded" ? (
                            <s>{formatCurrency(txn.total)}</s>
                          ) : (
                            formatCurrency(txn.total)
                          )}
                        </td>
                        <td>
                          <span className={`status-badge ${
                            txn.refund_status === "refunded" ? "status-refunded" : "status-completed"
                          }`}>
                            {txn.refund_status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <Pagination
              total={filteredTransactions.length}
              perPage={txnPerPage}
              currentPage={txnPage}
              onPageChange={(p) => setTxnPage(p)}
              onSizeChange={(s) => { setTxnPerPage(s); setTxnPage(1); }}
            />
          </div>
        </section>

      </main>
    </div>
  );
}

export default ManagerPage;