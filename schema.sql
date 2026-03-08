CREATE TABLE categories (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(100) NOT NULL,
  description   TEXT
);

CREATE TABLE products (
  id            SERIAL PRIMARY KEY,
  sku           VARCHAR(50) UNIQUE,
  name          VARCHAR(150) NOT NULL,
  price         DECIMAL(10, 2) NOT NULL,
  category_id   INTEGER  REFERENCES categories(id),
  unit_type     VARCHAR(20) CHECK (unit_type IN ('quantity', 'weight')),
  stock_quantity DECIMAL(10, 3) DEFAULT 0, 
  is_active     BOOLEAN DEFAULT TRUE
);

CREATE TABLE store_settings (
  id            SERIAL PRIMARY KEY,
  store_name    VARCHAR(150) NOT NULL,
  tax_rate      DECIMAL(5, 4) NOT NULL DEFAULT 0.1200,
  currency_symbol VARCHAR(10) DEFAULT '₱',
  receipt_footer TEXT,
  address       TEXT
);

CREATE TABLE users (
  id            SERIAL PRIMARY KEY,
  username      VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name     VARCHAR(150) NOT NULL,
  role          VARCHAR(20) CHECK (role IN ('cashier', 'manager')) NOT NULL,
  is_active     BOOLEAN DEFAULT TRUE
);

CREATE TABLE transactions (
  id            SERIAL PRIMARY KEY,
  user_id       INTEGER REFERENCES users(id), -- The operator ID (foreign key)
  subtotal      DECIMAL(10, 2) NOT NULL,
  tax_amount    DECIMAL(10, 2) NOT NULL,
  total_amount  DECIMAL(10, 2) NOT NULL,
  payment_method VARCHAR(20) CHECK (payment_method IN ('cash', 'card', 'ewallet')),
  created_at    TIMESTAMPTZ DEFAULT NOW() -- Precision Timeclock
);

CREATE TABLE transaction_lines (
  id            SERIAL PRIMARY KEY,
  transaction_id INTEGER REFERENCES transactions(id) ON DELETE CASCADE,
  product_id    INTEGER REFERENCES products(id),
  quantity      DECIMAL(10, 3) NOT NULL,
  unit_price    DECIMAL(10, 2) NOT NULL,
  line_total    DECIMAL(10, 2) NOT NULL
);