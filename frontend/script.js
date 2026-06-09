document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const menuContainer = document.getElementById('menu-container');
    const cartItemsContainer = document.getElementById('cart-items');
    const cartTotalSpan = document.getElementById('cart-total');
    const cartSubtotalSpan = document.getElementById('cart-subtotal');
    const cartCountBadge = document.getElementById('cart-count');
    const placeOrderBtn = document.getElementById('place-order-btn');
    const customerNameInput = document.getElementById('customer-name');
    const orderStatus = document.getElementById('order-status');

    // Configuration
    const API_BASE_URL = 'http://localhost:3000/api';
    const DELIVERY_FEE = 40.00;
    
    // Cart State
    let cart = [];

    /**
     * Create toast container if it doesn't exist
     */
    function createToastContainer() {
        let container = document.querySelector('.toast-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'toast-container';
            document.body.appendChild(container);
        }
        return container;
    }

    /**
     * Show toast notification
     */
    function showToast(title, message, type = 'success') {
        const container = createToastContainer();
        
        const icons = {
            success: '✅',
            error: '❌',
            info: 'ℹ️'
        };
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <div class="toast-icon">${icons[type]}</div>
            <div class="toast-content">
                <div class="toast-title">${title}</div>
                ${message ? `<div class="toast-message">${message}</div>` : ''}
            </div>
        `;
        
        container.appendChild(toast);
        
        // Remove toast after 3 seconds
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }

    /**
     * Fetch menu items from API
     */
    async function fetchMenuItems() {
        try {
            showLoading();
            const response = await fetch(`${API_BASE_URL}/menu`);
            
            if (!response.ok) {
                throw new Error('Failed to fetch menu');
            }
            
            const menuItems = await response.json();
            displayMenuItems(menuItems);
        } catch (error) {
            console.error('Error fetching menu:', error);
            menuContainer.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 2rem; color: #636E72;">
                    <p style="font-size: 3rem; margin-bottom: 1rem;">😕</p>
                    <p style="font-size: 1.2rem; font-weight: 600;">Could not load menu</p>
                    <p style="font-size: 0.9rem; margin-top: 0.5rem;">Please check if the backend server is running</p>
                </div>
            `;
            showToast('Error', 'Could not load menu items', 'error');
        }
    }

    /**
     * Show loading state
     */
    function showLoading() {
        menuContainer.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 3rem;">
                <p style="font-size: 2rem; animation: pulse 1.5s infinite;">🍽️</p>
                <p style="color: #636E72;">Loading delicious items...</p>
            </div>
        `;
    }

    /**
     * Display menu items in grid
     */
    function displayMenuItems(items) {
        menuContainer.innerHTML = '';
        
        if (items.length === 0) {
            menuContainer.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 2rem;">
                    <p style="font-size: 3rem;">🍽️</p>
                    <p style="color: #636E72;">No items available</p>
                </div>
            `;
            return;
        }
        
        items.forEach(item => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'menu-item';
            itemDiv.innerHTML = `
                <img src="${item.image_url}" alt="${item.name}" 
                     onerror="this.src='https://via.placeholder.com/300x200?text=Food+Item'">
                <div class="menu-item-content">
                    <h3>${item.name}</h3>
                    <p>${item.description}</p>
                    <div class="menu-item-footer">
                        <span class="price">₹${parseFloat(item.price).toFixed(2)}</span>
                        <button class="add-to-cart-btn" 
                                data-id="${item.id}" 
                                data-name="${item.name}" 
                                data-price="${item.price}">
                            Add +
                        </button>
                    </div>
                </div>
            `;
            menuContainer.appendChild(itemDiv);
        });
    }

    /**
     * Add item to cart
     */
    function addToCart(id, name, price) {
        const existingItem = cart.find(item => item.id === parseInt(id));
        
        if (existingItem) {
            existingItem.quantity++;
            showToast('Updated', `${name} quantity increased`, 'info');
        } else {
            cart.push({ 
                id: parseInt(id), 
                name, 
                price: parseFloat(price), 
                quantity: 1 
            });
            showToast('Added to Cart', `${name} added successfully`, 'success');
        }
        
        updateCartDisplay();
    }

    /**
     * Update cart display
     */
    function updateCartDisplay() {
        cartItemsContainer.innerHTML = '';
        let subtotal = 0;
        
        // Update cart count badge
        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
        cartCountBadge.textContent = totalItems;
        cartCountBadge.style.display = totalItems > 0 ? 'block' : 'none';
        
        // Display empty cart
        if (cart.length === 0) {
            cartItemsContainer.innerHTML = `
                <li class="empty-cart">
                    <div class="empty-cart-icon">🍽️</div>
                    <p>Your cart is empty</p>
                    <small>Add items from the menu</small>
                </li>
            `;
            cartSubtotalSpan.textContent = '₹0.00';
            cartTotalSpan.textContent = '0.00';
            placeOrderBtn.disabled = true;
            return;
        }
        
        // Display cart items
        cart.forEach(item => {
            const li = document.createElement('li');
            li.className = 'cart-item';
            const itemTotal = item.price * item.quantity;
            
            li.innerHTML = `
                <div class="cart-item-info">
                    <div class="cart-item-name">${item.name}</div>
                    <div class="cart-item-quantity">Qty: ${item.quantity}</div>
                </div>
                <div class="cart-item-price">₹${itemTotal.toFixed(2)}</div>
            `;
            
            cartItemsContainer.appendChild(li);
            subtotal += itemTotal;
        });
        
        // Update totals
        const total = subtotal + DELIVERY_FEE;
        cartSubtotalSpan.textContent = `₹${subtotal.toFixed(2)}`;
        cartTotalSpan.textContent = total.toFixed(2);
        placeOrderBtn.disabled = false;
    }

    /**
     * Place order
     */
    async function placeOrder() {
        const customerName = customerNameInput.value.trim();
        
        // Validation
        if (!customerName) {
            showToast('Required', 'Please enter your name', 'error');
            customerNameInput.focus();
            return;
        }
        
        if (cart.length === 0) {
            showToast('Empty Cart', 'Your cart is empty', 'error');
            return;
        }

        // Disable button
        placeOrderBtn.disabled = true;
        placeOrderBtn.innerHTML = '<span class="btn-text">Processing...</span>';

        try {
            const response = await fetch(`${API_BASE_URL}/orders`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    customer_name: customerName,
                    items: cart.map(item => ({ id: item.id, quantity: item.quantity }))
                })
            });

            const result = await response.json();

            if (response.ok) {
                // Show success toast
                showToast(
                    '🎉 Order Placed Successfully!', 
                    `Your Order ID is #${result.orderId}. Total: ₹${result.totalPrice}`, 
                    'success'
                );
                
                // Clear cart
                cart = [];
                updateCartDisplay();
                customerNameInput.value = '';
                
            } else {
                throw new Error(result.error || 'Failed to place order');
            }
        } catch (error) {
            console.error('Error placing order:', error);
            showToast('Order Failed', error.message, 'error');
        } finally {
            // Re-enable button
            placeOrderBtn.disabled = false;
            placeOrderBtn.innerHTML = '<span class="btn-text">Place Order</span><span class="btn-icon">→</span>';
        }
    }

    // Event Listeners
    menuContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('add-to-cart-btn')) {
            const { id, name, price } = e.target.dataset;
            addToCart(id, name, price);
        }
    });

    placeOrderBtn.addEventListener('click', placeOrder);

    customerNameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            placeOrder();
        }
    });

    // Initialize app
    fetchMenuItems();
});
