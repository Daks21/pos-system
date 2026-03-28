import "../styles/pos.css";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getProducts, getSettings, checkout } from "../services/api";
import ProductButton from "../components/ProductButton";
import CartItem from "../components/CartItem";

function POSPage() {
  const [products, setProducts] = useState([]);
  const [settings, setSettings] = useState({});
  const [cart, setCart] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("All");
  const [selectedPayment, setSelectedPayment] = useState("cash");
  const [discount, setDiscount] = useState({
    type: "fixed",
    value: 0,
    amount: 0,
    label: "",
  });

  const navigate = useNavigate();
  const username = sessionStorage.getItem("username");
  const role = sessionStorage.getItem("role");
  const currency = settings.currency_symbol || "₱";

  const [holdLabel, setHoldLabel] = useState("");
  const [holds, setHolds] = useState([]);
  const [showHolds, setShowHolds] = useState(false);
  const [refundId, setRefundId] = useState("");
  const [refundDetails, setRefundDetails] = useState(null);

  // ─── Collapse Toggles ─────────────────────────────────
  const [showRefund, setShowRefund] = useState(false);
  const [showDiscount, setShowDiscount] = useState(false);

  // ─── Load data on mount ───────────────────────────────
  useEffect(() => {
    async function loadData() {
      try {
        const [productsData, settingsData] = await Promise.all([
          getProducts(),
          getSettings(),
        ]);
        setProducts(productsData);
        setSettings(settingsData);
      } catch (error) {
        console.error("Failed to load data:", error);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  // ─── Cart Functions ───────────────────────────────────
  const addToCart = (productId) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;
    setCart((prevCart) => {
      const existing = prevCart.find((item) => item.id === productId);
      if (existing) {
        return prevCart.map((item) =>
          item.id === productId
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [
        ...prevCart,
        {
          id: product.id,
          name: product.name,
          price: parseFloat(product.price),
          quantity: 1,
          tax_type: product.tax_type || "standard",
        },
      ];
    });
  };

  const removeFromCart = (productId) =>
    setCart((prev) => prev.filter((item) => item.id !== productId));

  const updateQuantity = (productId, newQuantity) => {
    if (newQuantity < 1) { removeFromCart(productId); return; }
    setCart((prev) =>
      prev.map((item) =>
        item.id === productId ? { ...item, quantity: newQuantity } : item
      )
    );
  };

  const clearCart = () => {
    if (window.confirm("Clear the cart?")) {
      setCart([]);
      setDiscount({ type: "fixed", value: 0, amount: 0, label: "" });
    }
  };

  // ─── Totals ───────────────────────────────────────────
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const discountAmount = (() => {
    if (discount.value <= 0) return 0;
    const raw =
      discount.type === "percentage"
        ? subtotal * (discount.value / 100)
        : discount.value;
    return Math.min(raw, subtotal);
  })();

  const taxable = subtotal - discountAmount;
  const taxRate = parseFloat(settings.tax_rate) || 0.12;
  const taxAmount = taxable * taxRate;
  const total = taxable + taxAmount;

  // ─── Checkout ─────────────────────────────────────────
  const handleCheckout = async () => {
    if (cart.length === 0) { alert("Cart is empty!"); return; }
    const payload = {
      items: cart.map((item) => ({
        product_id: item.id,
        quantity: item.quantity,
        unit_price: item.price,
        tax_type: item.tax_type || "standard",
      })),
      payment_method: selectedPayment,
      discount_type: discount.type,
      discount_value: discount.value,
      discount_amount: discountAmount,
    };
    try {
      const result = await checkout(payload);
      if (result.success) {
        setCart([]);
        setDiscount({ type: "fixed", value: 0, amount: 0, label: "" });
        alert(`Sale complete! Transaction #${result.transaction_id}`);
      } else {
        alert("Checkout failed: " + result.error);
      }
    } catch {
      alert("Could not connect to server.");
    }
  };

  // ─── Hold Functions ───────────────────────────────────
  const fetchHolds = async () => {
    try {
      const response = await fetch("http://localhost:8000/api/holds", {
        headers: { Authorization: `Bearer ${sessionStorage.getItem("token")}` },
      });
      const data = await response.json();
      setHolds(data);
    } catch {
      alert("Could not load held sales.");
    }
  };

  const holdCurrentSale = async () => {
    if (cart.length === 0) { alert("Cart is empty. Nothing to hold."); return; }
    const label = holdLabel || `Hold ${new Date().toLocaleTimeString("en-PH")}`;
    try {
      const response = await fetch("http://localhost:8000/api/hold", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionStorage.getItem("token")}`,
        },
        body: JSON.stringify({ cart, label }),
      });
      const result = await response.json();
      if (result.success) {
        setCart([]);
        setHoldLabel("");
        await fetchHolds();
        setShowHolds(true);
        alert(`✅ Sale held! Hold #${result.hold_id} — "${result.label}"`);
      }
    } catch {
      alert("Could not connect to server.");
    }
  };

  const viewHeldSales = async () => {
    if (showHolds) { setShowHolds(false); return; }
    await fetchHolds();
    setShowHolds(true);
  };

  const resumeHold = async (hold) => {
    if (cart.length > 0) {
      if (!window.confirm("This will replace your current cart. Continue?")) return;
    }
    setCart(hold.cart_data);
    await fetch(`http://localhost:8000/api/hold/${hold.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${sessionStorage.getItem("token")}` },
    });
    await fetchHolds();
    setShowHolds(false);
  };

  // ─── Refund Functions ─────────────────────────────────
  const lookupTransaction = async (id) => {
    if (!id || id < 1) { alert("Please enter a valid Transaction ID"); return; }
    try {
      const response = await fetch(`http://localhost:8000/api/transactions/${id}`, {
        headers: { Authorization: `Bearer ${sessionStorage.getItem("token")}` },
      });
      if (!response.ok) { alert("Transaction not found."); return; }
      const data = await response.json();
      if (data.refund_status === "refunded") {
        alert(`Transaction #${id} has already been refunded.`);
        return;
      }
      setRefundDetails(data);
    } catch {
      alert("Could not connect to server.");
    }
  };

  const confirmRefund = async (id) => {
    if (!window.confirm(`Refund Transaction #${id}? This cannot be undone.`)) return;
    try {
      const response = await fetch(`http://localhost:8000/api/refund/${id}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${sessionStorage.getItem("token")}` },
      });
      const result = await response.json();
      if (result.success) {
        alert(`✅ ${result.message}`);
        setRefundId("");
        setRefundDetails(null);
        setShowRefund(false);
      } else {
        alert("Refund failed: " + result.error);
      }
    } catch {
      alert("Could not connect to server.");
    }
  };

  // ─── Filtered Products ────────────────────────────────
  const filteredProducts =
    activeCategory === "All"
      ? products
      : products.filter((p) => p.category_name === activeCategory);

  const categories = ["All", ...new Set(products.map((p) => p.category_name))];

  const handleLogout = () => {
    sessionStorage.clear();
    navigate("/login");
  };

  if (isLoading) return <div className="loading">Loading POS...</div>;

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>

      {/* Top Bar */}
      <header className="top-bar">
        <div className="store-name">{settings.store_name || "POS System"}</div>
        <div className="cashier-info">
          {username} ({role})
          {role === "manager" && (
            <a href="/manager" className="dashboard-link">📊</a>
          )}
          <button className="logout-btn" onClick={handleLogout}>Logout</button>
        </div>
      </header>

      {/* Main Layout */}
      <main className="pos-layout">

        {/* Product Panel */}
        <section className="product-panel">
          <div className="category-tabs">
            {categories.map((cat) => (
              <button
                key={cat}
                className={`tab-btn ${activeCategory === cat ? "active" : ""}`}
                onClick={() => setActiveCategory(cat)}
              >{cat}</button>
            ))}
          </div>
          <div className="product-grid">
            {filteredProducts.map((product) => (
              <ProductButton
                key={product.id}
                id={product.id}
                name={product.name}
                price={parseFloat(product.price)}
                currency={currency}
                onAdd={addToCart}
              />
            ))}
          </div>
        </section>

        {/* Cart Panel */}
        <aside className="cart-panel">

          {/* Cart Header */}
          <div className="cart-header">
            <span>Sale</span>
            {role === "manager" && (
              <button className="clear-btn" onClick={clearCart}>Clear</button>
            )}
            <button className="logout-btn" onClick={handleLogout}>Logout</button>
          </div>

          {/* ── Hold + Manager Toolbar ── */}
          <div className="cart-toolbar">

            {/* Hold Row */}
            <div className="toolbar-row">
              <input
                type="text"
                className="hold-label-input"
                placeholder="Hold label (optional)"
                value={holdLabel}
                onChange={(e) => setHoldLabel(e.target.value)}
              />
              <button className="hold-sale-btn" onClick={holdCurrentSale}>Hold</button>
              <button className="view-holds-btn" onClick={viewHeldSales}>
                {showHolds ? "▲ Holds" : "▼ Holds"}
              </button>
            </div>

            {/* Held Sales Dropdown */}
            {showHolds && (
              <div className="held-sales-list">
                {holds.length === 0 ? (
                  <div className="holds-empty">No held sales.</div>
                ) : (
                  holds.map((hold) => (
                    <div key={hold.id} className="hold-item">
                      <div className="hold-item-info">
                        <strong>{hold.label}</strong>
                        <small>{new Date(hold.created_at).toLocaleTimeString("en-PH")}</small>
                      </div>
                      <button className="hold-resume-btn" onClick={() => resumeHold(hold)}>
                        Resume
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Manager-only actions row */}
            {role === "manager" && (
              <div className="toolbar-row toolbar-manager-row">
                <button
                  className={`toolbar-toggle-btn ${showRefund ? "active" : ""}`}
                  onClick={() => { setShowRefund(!showRefund); setShowDiscount(false); }}
                >
                  🔄 Refund
                </button>
                <button
                  className={`toolbar-toggle-btn ${showDiscount ? "active" : ""}`}
                  onClick={() => { setShowDiscount(!showDiscount); setShowRefund(false); }}
                >
                  {discountAmount > 0 ? `✂ ${discount.label || "Discount"} applied` : "✂ Discount"}
                </button>
              </div>
            )}

            {/* Refund Panel */}
            {showRefund && role === "manager" && (
              <div className="collapse-panel refund-panel">
                <div className="refund-input-row">
                  <input
                    type="number"
                    className="refund-id-input"
                    placeholder="Transaction ID"
                    min="1"
                    value={refundId}
                    onChange={(e) => setRefundId(e.target.value)}
                  />
                  <button className="lookup-btn" onClick={() => lookupTransaction(refundId)}>
                    Look Up
                  </button>
                  <button className="cancel-refund-btn" onClick={() => {
                    setRefundId("");
                    setRefundDetails(null);
                  }}>✕</button>
                </div>
                {refundDetails && (
                  <div className="refund-details">
                    <div className="refund-details-header">
                      <strong>Txn #{refundDetails.id}</strong>
                      <span>{refundDetails.payment_method}</span>
                    </div>
                    <div className="refund-details-row">
                      <span>Cashier: {refundDetails.cashier}</span>
                      <span className="refund-total">{currency}{parseFloat(refundDetails.total_amount).toFixed(2)}</span>
                    </div>
                    <div className="refund-items">
                      {refundDetails.items.map((item, i) => (
                        <div key={i} className="refund-item-line">
                          <span>{item.product_name} ×{item.quantity}</span>
                          <span>{currency}{parseFloat(item.line_total).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                    <button
                      className="confirm-refund-btn"
                      onClick={() => confirmRefund(refundDetails.id)}
                    >
                      Confirm Refund
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Discount Panel */}
            {showDiscount && role === "manager" && (
              <div className="collapse-panel discount-panel">
                <div className="discount-row">
                  <input
                    type="text"
                    className="discount-label-input"
                    placeholder="Label (e.g. Senior)"
                    value={discount.label}
                    onChange={(e) => setDiscount((d) => ({ ...d, label: e.target.value }))}
                  />
                  <select
                    className="discount-type-select"
                    value={discount.type}
                    onChange={(e) => setDiscount((d) => ({ ...d, type: e.target.value }))}
                  >
                    <option value="fixed">₱ Fixed</option>
                    <option value="percentage">% Off</option>
                  </select>
                </div>
                <div className="discount-row">
                  <input
                    type="number"
                    className="discount-value-input"
                    placeholder="Amount"
                    min="0"
                    value={discount.value || ""}
                    onChange={(e) =>
                      setDiscount((d) => ({ ...d, value: parseFloat(e.target.value) || 0 }))
                    }
                  />
                  <button
                    className="apply-discount-btn"
                    onClick={() => { setDiscount((d) => ({ ...d, value: d.value })); setShowDiscount(false); }}
                  >Apply</button>
                  <button
                    className="clear-discount-btn"
                    onClick={() => { setDiscount({ type: "fixed", value: 0, amount: 0, label: "" }); setShowDiscount(false); }}
                  >Clear</button>
                </div>
              </div>
            )}
          </div>

          {/* Cart Items */}
          <div className="cart-items">
            {cart.length === 0 ? (
              <div className="empty-msg">No items added yet.</div>
            ) : (
              cart.map((item) => (
                <CartItem
                  key={item.id}
                  id={item.id}
                  name={item.name}
                  price={item.price}
                  quantity={item.quantity}
                  currency={currency}
                  onRemove={removeFromCart}
                  onQuantityChange={updateQuantity}
                />
              ))
            )}
          </div>

          {/* Totals */}
          <div className="cart-totals">
            <div className="total-row">
              <span>Subtotal</span>
              <span>{currency}{subtotal.toFixed(2)}</span>
            </div>
            {discountAmount > 0 && (
              <div className="total-row discount-display-row">
                <span>
                  {discount.label ? `Discount (${discount.label})` : "Discount"}
                </span>
                <span>-{currency}{discountAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="total-row">
              <span>Tax (12%)</span>
              <span>{currency}{taxAmount.toFixed(2)}</span>
            </div>
            <div className="total-row grand-total">
              <span>Total</span>
              <span>{currency}{total.toFixed(2)}</span>
            </div>

            {/* Payment Method */}
            <div className="payment-method-selector">
              <div className="payment-label">Payment Method</div>
              <div className="payment-buttons">
                {["cash", "card", "ewallet"].map((method) => (
                  <button
                    key={method}
                    className={`payment-btn ${selectedPayment === method ? "active" : ""}`}
                    onClick={() => setSelectedPayment(method)}
                  >
                    {method.charAt(0).toUpperCase() + method.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <button className="pay-btn" onClick={handleCheckout}>
              PROCESS PAYMENT
            </button>
          </div>

        </aside>
      </main>
    </div>
  );
}

export default POSPage;