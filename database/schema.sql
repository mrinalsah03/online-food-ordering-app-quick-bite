-- Create the database if it doesn't exist
CREATE DATABASE IF NOT EXISTS food_order_db;

-- Use the database
USE food_order_db;

-- Table for menu items
CREATE TABLE IF NOT EXISTS menu_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    image_url VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table for orders
CREATE TABLE IF NOT EXISTS orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_name VARCHAR(255) NOT NULL,
    total_price DECIMAL(10, 2) NOT NULL,
    order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table to link orders and menu items (many-to-many relationship)
CREATE TABLE IF NOT EXISTS order_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    item_id INT NOT NULL,
    quantity INT NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES menu_items(id) ON DELETE CASCADE
);

-- Insert sample menu items
INSERT INTO menu_items (name, description, price, image_url) VALUES
('Margherita Pizza', 'Classic delight with 100% real mozzarella cheese', 250.00, 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002'),
('Veggie Burger', 'A healthy burger with a fresh vegetable patty and lettuce', 150.50, 'https://images.unsplash.com/photo-1520072959219-c595dc870360'),
('Pasta Arrabiata', 'Spicy red sauce pasta with garlic, tomatoes, and red chili peppers', 220.75, 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9'),
('Chocolate Milkshake', 'A creamy and delicious milkshake made with rich chocolate', 180.00, 'https://images.unsplash.com/photo-1572490122747-3968b75cc699'),
('Caesar Salad', 'Fresh romaine lettuce with caesar dressing and croutons', 200.00, 'https://images.unsplash.com/photo-1546793665-c74683f339c1'),
('Chicken Biryani', 'Aromatic basmati rice cooked with tender chicken and spices', 280.00, 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8');
