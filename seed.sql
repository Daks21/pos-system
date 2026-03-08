INSERT INTO categories (name, description) VALUES
('Fruits/Vegetables', 'Fresh produce and greens'), -- ID 1
('Rice', 'Local and imported rice varieties'),     -- ID 2
('Pasalubong', 'Local treats and souvenirs'),      -- ID 3
('Cooking Essentials', 'Oils, spices, sauces');    -- ID 4


-- insert into products (8 original + 7 new)
INSERT INTO products (sku, name, price, category_id, unit_type, stock_quantity, is_active) VALUES

-- category_id 1 = Fruits/Vegetables
('FRU-001', 'Seedless Grapes', 170.00, 1, 'weight', 25.500, TRUE),
('FRU-002', 'Apple', 140.00, 1, 'weight', 50.000, TRUE),
('FRU-003', 'Kiwi', 130.00, 1, 'weight', 30.000, TRUE),
('FRU-004', 'Banana (Saba)', 80.00, 1, 'weight', 40.000, TRUE),

-- category_id 2 = Rice
('RIC-001', 'Sinandomeng Rice', 1200.00, 2, 'quantity', 20.000, TRUE),
('RIC-002', 'Jasmine-Red Rice', 1150.00, 2, 'quantity', 15.000, TRUE),
('RIC-003', 'Jasmine-Blue Rice', 1300.00, 2, 'quantity', 10.000, TRUE),
('RIC-004', 'Dinorado Rice', 1250.00, 2, 'quantity', 12.000, TRUE),

-- category_id 3 = Pasalubong
('PAS-001', 'Ube Hopia Tipas', 75.00, 3, 'quantity', 50.000, TRUE),
('PAS-002', 'Dried Mangoes', 150.00, 3, 'quantity', 35.000, TRUE),
('PAS-003', 'Bacolod Piaya', 85.00, 3, 'quantity', 40.000, TRUE),

-- category_id 4 = Cooking Essentials
('ESS-001', 'Cooking Oil', 95.00, 4, 'quantity', 40.000, TRUE),
('ESS-002', 'Soy Sauce 1L', 65.00, 4, 'quantity', 55.000, TRUE),
('ESS-003', 'White Vinegar 1L', 50.00, 4, 'quantity', 60.000, TRUE),
('ESS-004', 'Fish Sauce (Patis) 1L', 80.00, 4, 'quantity', 30.000, TRUE);

-- insert store Settings
INSERT INTO store_settings (store_name, tax_rate, currency_symbol, receipt_footer, address) VALUES
('SEVEN EVELYN', 0.1200, '₱', 'Thank you for shopping at Seven Evelyn!', 'Pasig, Metro Manila');


-- insert test users
INSERT INTO users (username, password_hash, full_name, role, is_active) VALUES
('admin', 'placeholder_will_be_hashed_in_module7', 'Evelyn Manager', 'manager', TRUE),
('cashier1', 'placeholder_will_be_hashed_in_module7', 'Juan Cashier', 'cashier', TRUE);