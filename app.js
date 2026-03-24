const authToken = sessionStorage.getItem('token');

if (!authToken) {
  // No badge? No entry
  window.location.href = 'login.html';
}

let storeSettings = {};
  storeSettings.discountType = 'fixed';
  storeSettings.discountValue = 0;
  storeSettings.discountAmount = 0; // actual money subtracted
  storeSettings.discountLabel = '';
let cart = [];
let products = [];
let selectedPaymentMethod = 'cash'; // defaults to cash



// added 'productsData' inside the parentheses
function renderProducts(productsData) {
  const productGrid = document.querySelector(".product-grid");

  //change loop to use the new 'productData' parameter
  productGrid.innerHTML = productsData.map(product => {
    return `
      <button class="product-btn" data-id="${product.id}"> 
        ${product.name}<br>
        <span>${storeSettings.currency}${product.price.toFixed(2)}</span> 
      </button>
    `;
  }).join("");
}

function filterAndRenderProducts(category) {
  if (category === "All") {
    renderProducts(products); // shows everything
  } else {
    const filtered = products.filter(p => p.category_name === category);
    renderProducts(filtered);
  }
}

function renderCart() {
  const container = document.querySelector(".cart-items");

  // handle the "empty cart state"
  if (cart.length === 0) {
    container.innerHTML = `<div class="empty-msg">No items added yet.</div>`;
    return; // stops function if cart is empty
  }

  // generate rows for items in the cart
  container.innerHTML = cart.map(item => {
    //Line Total Calculation (Quantity * Price)
    const lineTotal = item.price * item.quantity;
      return `
      <div class="cart-item-row">
        <div class="item-info">
          <strong>${item.name}</strong><br>
          <div class="qty-controls">
            <button class="qty-btn qty-decrease" data-id="${item.id}">-</button>
            <span>${item.quantity}</span>
            <button class="qty-btn qty-increase" data-id="${item.id}">+</button>
            <small> x ${storeSettings.currency}${item.price.toFixed(2)}</small>
          </div>
        </div>
        <div class="item-total">
          ${storeSettings.currency}${lineTotal.toFixed(2)}
        </div>
        <button class="remove-btn" data-id="${item.id}">x</button>
      </div>
    `;
  }).join("");
}

function updateTotals() {
  // calculate sum of all parts
  // total is the running sum while item is the part added
  const subtotal = cart.reduce((total, item) => {
    return total + (item.price * item.quantity);
  }, 0); // 0 is the starting value

  // calculate discount amount
  storeSettings.discountAmount = 0;
  if (storeSettings.discountValue > 0) {
    if (storeSettings.discountType === 'percentage') {
      storeSettings.discountAmount = subtotal * (storeSettings.discountValue / 100);
    } else if (storeSettings.discountType === 'fixed') {
      storeSettings.discountAmount = storeSettings.discountValue;
    }
  }

  // safety check: discount cannot be larger than the subtotal
  if (storeSettings.discountAmount > subtotal) {
    storeSettings.discountAmount = subtotal;
  }

  // calculate tax and grand total
  const taxableAmount = subtotal - storeSettings.discountAmount;

  // apply the formulas
  const taxAmount = taxableAmount * storeSettings.taxRate;
  const total = taxableAmount + taxAmount;

  // update display gauges in the html
  // use query selector to find the exact <span> where the price lives
  const subtotalDisplay = document.querySelector(".total-row:nth-child(1) span:last-child");
  const taxDisplay = document.querySelector(".total-row:nth-child(3) span:last-child");
  const grandTotalDisplay = document.querySelector(".grand-total span:last-child");

  const discountRow = document.querySelector(".discount-display-row");
  const discountDisplay = document.querySelector("#discount-display-amount");

  // set the test and format to 2 decimal places 
  if (subtotalDisplay) subtotalDisplay.textContent = `${storeSettings.currency}${subtotal.toFixed(2)}`;
  if (taxDisplay) taxDisplay.textContent = `${storeSettings.currency}${taxAmount.toFixed(2)}`;
  if (grandTotalDisplay) grandTotalDisplay.textContent = `${storeSettings.currency}${total.toFixed(2)}`; 

  // show or hide discount row
  if (storeSettings.discountAmount > 0) {
    discountRow.style.display = "flex";
    discountDisplay.textContent = `-${storeSettings.currency}${storeSettings.discountAmount.toFixed(2)}`;
  } else {
    discountRow.style.display = "none";
    }
}

function addToCart (productId) {
  // Find the product in products array
  // look for products that matches ID from button click
  const product = products.find(p => p.id === productId);

  // safety check: if ID is invalid, stop process
  if (!product) return;

  // check if this cart is already in the current cart
  const existingItem = cart.find(item => item.id === productId);
  if (existingItem) {
    // if it exists, increment
    existingItem.quantity += 1;
  } else {
    // if new item, create new entry and push to cart array
    // note: we take the name and price from the 'product'
    cart.push({
      id: product.id,
      name: product.name,
      price: product.price,
      quantity: 1,
      tax_type: product.tax_type || 'standard'
    });
  }
  
  // system refresh: redraw cart and recalculate totals
  renderCart();
  updateTotals(); 
}

function removeFromCart(productId) {
  // create a new line that excludes the specific ID
  // keep every item where the item.id is not equal to the one clicked
  cart = cart.filter(item => item.id !== productId);

  // system refresh
  renderCart();
  updateTotals(); 
}

function updateDateTime() {
  const dateTimeDisplay = document.querySelector("#current-date-time");

  // gets the current system time
  const now = new Date();

  // formatting options for professional look
  const options = {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  };

  // convert to readable string
  const formattedDateTime = now.toLocaleDateString('en-PH', options);

  // update the UI
  if (dateTimeDisplay) {
    dateTimeDisplay.textContent = formattedDateTime;
  }
} setInterval(updateDateTime, 1000); // Start loop every 1Hz

// event Listener for product selection
const productGrid = document.querySelector(".product-grid");
productGrid.addEventListener("click", (event) => {
  // identify what was clicked
  // use .closest() because a user might click the <span> inside the button
  // this travels "up" from the click to find the button element
  const btn = event.target.closest(".product-btn");

  // safety check: if they clicked the gap between buttons, ignore it
  if (!btn) return;

  // extraction: get the ID from the data-id
  // dataset values are always strings, so convert to a number
  const productId = parseInt(btn.dataset.id);

  // verification only: printing to console to confirm
  console.log("sensor Trigerred! Product ID selected:", productId);

  addToCart(productId);
});

// event listener for removing of items
const cartContainer = document.querySelector(".cart-items");
cartContainer.addEventListener("click",  (event) => {
  const target = event.target;
  const productId = parseInt(target.dataset.id);

  // logic for remove button
  if (target.closest(".remove-btn")) {
    removeFromCart(productId);
  }
  
  // logic for increase button
  if (target.closest(".qty-increase")) {
    const item = cart.find(i => i.id === productId);
    if (item) {
      item.quantity += 1;
      renderCart();
      updateTotals();
    }
  }

  // logic for decrease button
  if (target.closest(".qty-decrease")) {
    const item = cart.find(i => i.id === productId);
    if (item) {
      if (item.quantity > 1) {
      item.quantity -= 1;
      } else {
        removeFromCart(productId);
      }
      renderCart();
      updateTotals();
    }
  }
});

// event Listener for Clear Sale
const clearSaleBtn = document.querySelector("#clear-sale-btn");
clearSaleBtn.addEventListener("click", () => {
  // confirmation check: prevents accidental wipes
  if (confirm("Are you sure you want to clear the cart?")) {
    // Reset buffer
    cart = [];
    renderCart();
    updateTotals();

    console.log("System reset: Cart Cleared");
  }
})

// logout button listener
const logoutBtn = document.querySelector("#logout-user-btn");
if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    sessionStorage.clear(); // wipes token
    window.location.href = "login.html"; // back to login
  });
}

// discount button listener
const applyDiscountBtn = document.querySelector("#apply-discount-btn");
if (applyDiscountBtn) {
  applyDiscountBtn.addEventListener("click", () => {
    const type = document.querySelector("#discount-type").value;
    const value = parseFloat(document.querySelector("#discount-value").value);
    const label = document.querySelector("#discount-label").value || "Discount"; 

    if (value > 0) {
      storeSettings.discountType = type;
      storeSettings.discountValue = value;
      storeSettings.discountLabel = label;
      updateTotals(); // recalculate everything
    }
  });
}

// discount button listener
const clearDiscountBtn = document.querySelector("#clear-discount-btn");
if (clearDiscountBtn) {
  clearDiscountBtn.addEventListener("click", () => {
    storeSettings.discountValue = 0;
    storeSettings.discountAmount = 0;
    storeSettings.discountLabel = '';                                 
    document.querySelector("#discount-value").value = "";
    document.querySelector("#discount-label").value = "";    
    updateTotals();
  });
}

// category tabs listener
const categoryTabs = document.querySelector(".category-tabs");
categoryTabs.addEventListener("click", (event) => {
  const tab = event.target.closest(".tab-btn");
  if (!tab) return;

  // remove active class from all tabs
  document.querySelectorAll(".tab-btn").forEach(btn => btn.classList.remove("active"));
  
  // add active class to clicked tab
  tab.classList.add("active");

  // filter products by tab label
  const category = tab.textContent.trim();
  filterAndRenderProducts(category);
});

// payment method listener
const paymentButtons = document.querySelector(".payment-buttons");
if (paymentButtons) {
  paymentButtons.addEventListener("click", (event) => {
    const btn = event.target.closest(".payment-btn");
    if (!btn) return;

    // remove active from all buttons
    document.querySelectorAll(".payment-btn")
      .forEach(b => b.classList.remove("active"));

    // set active on clicked button
    btn.classList.add("active");

    // update state
    selectedPaymentMethod = btn.dataset.method;
    console.log("Payment method selected:", selectedPaymentMethod);
  });
}

// hooking up the PAY button
const checkoutBtn = document.querySelector("#checkout-btn");
checkoutBtn.addEventListener("click", () => {
  processCheckout();
});

// look up button listener
const lookupBtn = document.querySelector("#lookup-transaction-btn");
if (lookupBtn) {
  lookupBtn.addEventListener("click", () => {
    const transactionId = parseInt(document.querySelector("#refund-transaction-id").value);
    if (!transactionId || transactionId < 1) {
      alert("Please enter a valid Transaction ID");
      return;
    }
    lookupTransaction(transactionId);
  });
}

// confirm refund button listener
const confirmRefundBtn = document.querySelector("#confirm-refund-btn");
if (confirmRefundBtn) {
  confirmRefundBtn.addEventListener("click", () => {
    const transactionId = parseInt(document.querySelector("#refund-details").dataset.transactionId);
    confirmRefund(transactionId);
  });
}

// hold sale button listener
const holdSaleBtn = document.querySelector("#hold-sale-btn");
if (holdSaleBtn) {
  holdSaleBtn.addEventListener("click", () => {
    holdCurrentSale();
  });
}

// view holds button listener
const viewHoldsBtn = document.querySelector("#view-holds-btn");
if (viewHoldsBtn) {
  viewHoldsBtn.addEventListener("click", () => {
    viewHeldSales();
  });
}

// resume hold button listener — event delegation on the list
const heldSalesList = document.querySelector("#held-sales-list");
if (heldSalesList) {
  heldSalesList.addEventListener("click", (event) => {
    const btn = event.target.closest(".resume-hold-btn");
    if (!btn) return;

    const holdId = parseInt(btn.dataset.holdId);
    resumeHold(holdId);
  });
}

/* =============================================================
  Async Functions
  ============================================================= */

// fetch  store settings from python
async function loadSettings() {
  try {
    const response = await fetch("http://localhost:8000/api/settings");
    if (!response.ok) throw new Error("Settings fetch failed");

    const dbSettings = await response.json();

    // the data adapter: translates postgreSQL snake_case into JS camelCase
    storeSettings.taxRate = dbSettings.tax_rate;
    storeSettings.storeName = dbSettings.store_name;
    // fallback to "₱" just in case the database column is named differently
    storeSettings.currency = dbSettings.currency_symbol || dbSettings.currency || "₱";
 
    
    // update the store name on the Screen
    const storeNameDisplay = document.querySelector(".store-name");
    if (storeNameDisplay) storeNameDisplay.textContent = storeSettings.storeName;

  } catch (error) {
    console.error("Failed to load settings:", error);
  }
}

// fetch products from python
async function loadProducts() {
  try {
    const response = await fetch("http://localhost:8000/api/products");
    if (!response.ok) throw new Error("Products fetch failed");

    const data = await response.json();
    products = data;
    renderProducts(data); // push the real data into display screen
  } catch (error) {
    console.error("Failed to load products:", error);
    //display an emergency error on the screen if the server is off
    document.querySelector(".product-grid").innerHTML =
      "<p style='color:red;'>Could not load products. Is the Python server running?</p>";
  }
}

// main switch
async function initPOS() {
  await loadSettings(); // get the calibration data (tax rate)
  await loadProducts(); // get the inventory

  // Role based UI logic
  const userRole = sessionStorage.getItem('role');
  const username = sessionStorage.getItem('username');

  // update the UI to show who is logged in
  const storeNameDisplay = document.querySelector(".store-name");
  if (storeNameDisplay) {
    storeNameDisplay.textContent = storeSettings.storeName;
  }

  const cashierDisplay = document.querySelector(".cashier-info");
  if (cashierDisplay) {
    cashierDisplay.textContent = `${username} (${userRole})`;
  }

  // if user is cashier, hide manager buttons
  if (userRole === 'cashier') {
    const managerElements = document.querySelectorAll('.manager-only');
    managerElements.forEach(el => el.style.display = 'none');
  }

  // only run after data arrives
  renderCart();
  updateTotals();
} 

initPOS (); // starting
updateDateTime();

// the checkout logic
async function processCheckout() {
  // safety check: checking if cart is empty
  if (cart.length === 0) {
    alert("Cart is empty. Add items before processing payment.");
    return;
  }

  // the paylod (must perfectly match python pydantic model)
  const payload = {
    // map loops through the cart and renames the properties to match python's snake_case
    items: cart.map(item => ({
      product_id: item.id,
      quantity: item.quantity,
      unit_price: item.price,
      tax_type: item.tax_type || 'standard'
    })),
    payment_method: selectedPaymentMethod,
    // send the discount info to python
    discount_type: storeSettings.discountType || "none",
    discount_value: storeSettings.discountValue || 0,
    discount_amount: storeSettings.discountAmount || 0
  };

  try {
    // transmit the data via POST request
    const response = await fetch("http://localhost:8000/api/checkout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${authToken}`  // this is the badge the server will loook for
      },
      body: JSON.stringify(payload), // convert JS object to JSON text
    });

    const result = await response.json();

    // handle the server's response
    if (result.success) {
      // success! Enmpty the cart and update the screen
      cart = [];
      renderCart();
      updateTotals();

      // show success message using the browser's built-in alert
      alert(`Sale complete! Transaction #${result.transaction_id}`);

    } else {
      // the server rejected it (e.g., bad payment method)
      alert("Checkout Failed: " + result.error);
    }
  } catch (error) {
    // emergency E-stop (e.g., server is offline)
    console.error("Checkout Failed:", error);
    alert("Could not connect to the server. PLease check your connection");
  }
}

// look up a transaction by ID
async function lookupTransaction(transactionId) {
  try {
    const response = await fetch(`http://localhost:8000/api/transactions/${transactionId}`, {
      headers: {
        "Authorization": `Bearer ${authToken}`
      }
    });

    if (!response.ok) {
      const err = await response.json();
      alert(err.detail || "Transaction not found");
      return;
    }

    const transaction = await response.json();

    // check if already refunded
    if (transaction.refund_status === 'refunded') {
      alert(`Transaction #${transactionId} has already been refunded.`);
      return;
    }

    // display transaction details
    const detailsDiv = document.querySelector("#refund-details");
    const infoDiv = document.querySelector("#refund-transaction-info");

    // build the items list
    const itemsList = transaction.items.map(item =>
      `<div>${item.product_name} x${item.quantity} — 
      ${storeSettings.currency}${parseFloat(item.line_total).toFixed(2)}</div>`
    ).join("");

    infoDiv.innerHTML = `
      <strong>Transaction #${transaction.id}</strong><br>
      Cashier: ${transaction.cashier}<br>
      Total: ${storeSettings.currency}${parseFloat(transaction.total_amount).toFixed(2)}<br>
      Payment: ${transaction.payment_method}<br>
      <div style="margin-top: 6px; font-size: 12px;">${itemsList}</div>
    `;

    // store the ID for confirm button
    detailsDiv.dataset.transactionId = transaction.id;
    detailsDiv.style.display = "block";

  } catch (error) {
    console.error("Lookup failed:", error);
    alert("Could not connect to server.");
  }
}

// confirm and process the refund
async function confirmRefund(transactionId) {
  if (!confirm(`Are you sure you want to refund Transaction #${transactionId}? This cannot be undone.`)) {
    return;
  }

  try {
    const response = await fetch(`http://localhost:8000/api/refund/${transactionId}`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${authToken}`
      }
    });

    const result = await response.json();

    if (result.success) {
      alert(`✅ ${result.message}`);
      // reset the refund panel
      document.querySelector("#refund-transaction-id").value = "";
      document.querySelector("#refund-details").style.display = "none";
    } else {
      alert("Refund failed: " + result.error);
    }

  } catch (error) {
    console.error("Refund failed:", error);
    alert("Could not connect to server.");
  }
}

// save current cart as a hold
async function holdCurrentSale() {
  // safety check: cannot hold empty cart
  if (cart.length === 0) {
    alert("Cart is empty. Nothing to hold.");
    return;
  }

  const label = document.querySelector("#hold-label").value || 
    `Hold ${new Date().toLocaleTimeString('en-PH')}`;

  try {
    const response = await fetch("http://localhost:8000/api/hold", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${authToken}`
      },
      body: JSON.stringify({
        cart: cart,
        label: label
      })
    });

    const result = await response.json();

    if (result.success) {
      // clear the current cart after holding
      cart = [];
      renderCart();
      updateTotals();
      document.querySelector("#hold-label").value = "";
      alert(`✅ Sale held successfully! Hold #${result.hold_id} — "${result.label}"`);
    } else {
      alert("Failed to hold sale: " + result.error);
    }

  } catch (error) {
    console.error("Hold failed:", error);
    alert("Could not connect to server.");
  }
}

// fetch and display all held sales
async function viewHeldSales() {
  const holdsList = document.querySelector("#held-sales-list");

  try {
    const response = await fetch("http://localhost:8000/api/holds", {
      headers: {
        "Authorization": `Bearer ${authToken}`
      }
    });

    const holds = await response.json();

    // toggle visibility
    if (holdsList.style.display === "block") {
      holdsList.style.display = "none";
      return;
    }

    if (holds.length === 0) {
      holdsList.innerHTML = `<div style="font-size: 13px; color: #999; padding: 5px;">No held sales.</div>`;
    } else {
      holdsList.innerHTML = holds.map(hold => `
        <div class="hold-item" style="display: flex; justify-content: space-between; 
          align-items: center; padding: 6px; border: 1px solid #ddd; 
          border-radius: 4px; margin-bottom: 4px; background: white; font-size: 13px;">
          <div>
            <strong>${hold.label}</strong><br>
            <small>${new Date(hold.created_at).toLocaleTimeString('en-PH')}</small>
          </div>
          <button class="resume-hold-btn" data-hold-id="${hold.id}" 
            style="padding: 4px 8px; background: #1A7A48; color: white; 
            border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">
            Resume
          </button>
        </div>
      `).join("");
    }

    holdsList.style.display = "block";

  } catch (error) {
    console.error("Failed to load holds:", error);
    alert("Could not load held sales.");
  }
}

// resume a held sale — restores cart
async function resumeHold(holdId) {
  try {
    // fetch holds to find the cart data
    const response = await fetch("http://localhost:8000/api/holds", {
      headers: { "Authorization": `Bearer ${authToken}` }
    });

    const holds = await response.json();
    const hold = holds.find(h => h.id === holdId);

    if (!hold) {
      alert("Hold not found.");
      return;
    }

    // warn if current cart has items
    if (cart.length > 0) {
      if (!confirm("This will replace your current cart. Continue?")) return;
    }

    // restore the cart from the saved JSON
    cart = hold.cart_data;
    renderCart();
    updateTotals();

    // delete the hold from the database
    await fetch(`http://localhost:8000/api/hold/${holdId}`, {
      method: "DELETE",
      headers: { "Authorization": `Bearer ${authToken}` }
    });

    // hide the holds list
    document.querySelector("#held-sales-list").style.display = "none";
    alert(`✅ Sale resumed from Hold #${holdId}`);

  } catch (error) {
    console.error("Resume failed:", error);
    alert("Could not resume hold.");
  }
}

