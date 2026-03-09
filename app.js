
let storeSettings = {};
let cart = [];
let products = [];

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

  // apply the formulas
  const taxAmount = subtotal * storeSettings.taxRate;
  const total = subtotal + taxAmount;

  // update display gauges in the html
  // use query selector to find the exact <span> where the price lives
  const subtotalDisplay = document.querySelector(".total-row:nth-child(1) span:last-child");
  const taxDisplay = document.querySelector(".total-row:nth-child(2) span:last-child");
  const grandTotalDisplay = document.querySelector(".grand-total span:last-child");

  // set the test and format to 2 decimal places 
  if (subtotalDisplay) subtotalDisplay.textContent = `${storeSettings.currency}${subtotal.toFixed(2)}`;
  if (taxDisplay) taxDisplay.textContent = `${storeSettings.currency}${taxAmount.toFixed(2)}`;
  if (grandTotalDisplay) grandTotalDisplay.textContent = `${storeSettings.currency}${total.toFixed(2)}`; 
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
      quantity: 1
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
} )


/* ==================
  Async Functions
  ================= */

// fetch  store settings from python
async function loadSettings() {
  try {
    const response = await fetch("http://localhost:8000/api/settings");
    if (!response.ok) throw new Error("Settings fetch failed");

    const dbSettings = await response.json();

    // the data adapter: translates postgreSQPL snake_case into JS camelCase
    storeSettings = {
      taxRate: dbSettings.tax_rate,
      storeName: dbSettings.store_name,
      // fallback to "₱" just in case the database column is named differently
      currency: dbSettings.currency_symbol || dbSettings.currency || "₱"
    }
    
    // update the store name on the Screen
    const storeNameDisplay = document.querySelector(".header h1");
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
    })),
    payment_method: "cash",
    cashier_id: 1, // using store ID (ID: 1) for now
  };

  try {
    // transmit the data via POST request
    const response = await fetch("http://localhost:8000/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
      alert("Checkout Faield: " + result.error);
    }
  } catch (error) {
    // emergency E-stop (e.g., server is offline)
    console.error("Checkout Failed:", error);
    alert("Could not connect to the server. PLease check your connection");
  }
}

// hooking up the PAY button
const checkoutBtn = document.querySelector("#checkout-btn");
checkoutBtn.addEventListener("click", () => {
  processCheckout();
});