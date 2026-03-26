-- ============================================================
-- SEVEN EVELYN POS — Migration History
-- Run these in order if rebuilding from an existing database
-- ============================================================

-- Migration 001: Add discount columns to transactions
-- Reason: Feature 1 — Discount System (Module 8)
-- Date: Phase 2, Module 8
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10,2) DEFAULT 0;

ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS discount_type VARCHAR(20);

-- ============================================================

-- Migration 002: Add tax_type to products
-- Reason: Feature 2 — Multi-Rate Tax Rules (Module 8)
-- Date: Phase 2, Module 8
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS tax_type VARCHAR(20) DEFAULT 'standard';

-- ============================================================

-- Migration 003: Create tax_rates lookup table
-- Reason: Feature 2 — Multi-Rate Tax Rules (Module 8)
-- Date: Phase 2, Module 8
CREATE TABLE IF NOT EXISTS tax_rates (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(50) NOT NULL,
  rate        DECIMAL(5,4) NOT NULL,
  description TEXT
);

INSERT INTO tax_rates (name, rate, description) VALUES
('standard', 0.1200, 'Standard VAT rate'),
('reduced',  0.0500, 'Reduced rate for selected items'),
('exempt',   0.0000, 'Tax exempt items');

-- ============================================================

-- Migration 004: Set Fruits/Vegetables category as tax exempt
-- Reason: Feature 2 — Multi-Rate Tax Rules (Module 8)
-- Date: Phase 2, Module 8
UPDATE products 
SET tax_type = 'exempt' 
WHERE category_id = 1;

-- Migration 005: Add refund_status to transactions
-- Reason: Feature 4 — Refunds (Module 8)
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS refund_status VARCHAR(20) DEFAULT 'completed';

-- Migration 006: Create held_transactions table
-- Reason: Feature 5 — Hold Transaction (Module 8)
ALTER TABLE held_transactions... 
CREATE TABLE IF NOT EXISTS held_transactions (
  id          SERIAL PRIMARY KEY,
  cashier_id  INTEGER REFERENCES users(id),
  cart_data   JSONB NOT NULL,
  label       VARCHAR(100),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);