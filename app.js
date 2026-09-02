// ======= Base API URL (our Express server) =======
const API = 'http://localhost:3000/api';

// ======= Product Data (12 Candle Scents) =======
const products = [
    { id: 1, name: "Rose Whispers", scent: "Floral", price: 24.99, desc: "Delicate rose petals dancing in a soft morning breeze.", image: "https://images.unsplash.com/photo-1602874801006-e26c4e4dbb00?w=500&h=500&fit=crop" },
    { id: 2, name: "Vanilla Dreams", scent: "Sweet", price: 22.99, desc: "Creamy Madagascar vanilla wrapped in sugary warmth.", image: "https://images.unsplash.com/photo-1603006905003-be475563bc59?w=500&h=500&fit=crop" },
    { id: 3, name: "Citrus Sunshine", scent: "Citrus", price: 21.99, desc: "Zesty lemon, orange, and a whisper of bergamot.", image: "https://images.unsplash.com/photo-1608571423902-eed4a5ad8200?w=500&h=500&fit=crop" },
    { id: 4, name: "Forest Pine", scent: "Woody", price: 26.99, desc: "Crisp pine needles and cozy cabin in the woods.", image: "https://images.unsplash.com/photo-1602874801006-e26c4e4dbb00?w=500&h=500&fit=crop&sat=-30" },
    { id: 5, name: "Lavender Fields", scent: "Fresh", price: 23.99, desc: "Tranquil lavender from the rolling hills of Provence.", image: "https://images.unsplash.com/photo-1589647687137-e726253e7dec?w=500&h=500&fit=crop" },
    { id: 6, name: "Honey Almond", scent: "Sweet", price: 25.99, desc: "Golden honey drizzled over toasted almonds.", image: "https://images.unsplash.com/photo-1610701596007-11502861dcfa?w=500&h=500&fit=crop" },
    { id: 7, name: "Jasmine Nights", scent: "Floral", price: 27.99, desc: "Intoxicating jasmine blooms under moonlit skies.", image: "https://images.unsplash.com/photo-1545048702-79362596cdc9?w=500&h=500&fit=crop" },
    { id: 8, name: "Cinnamon Spice", scent: "Spicy", price: 23.99, desc: "Warm cinnamon sticks simmering with star anise & cloves.", image: "https://images.unsplash.com/photo-1603006905003-be475563bc59?w=500&h=500&fit=crop" },
    { id: 9, name: "Ocean Breeze", scent: "Fresh", price: 22.99, desc: "Sea salt, coastal air, and white cotton linens.", image: "https://images.unsplash.com/photo-1578759037625-ec9908e93490?w=500&h=500&fit=crop" },
    { id: 10, name: "Sandalwood Musk", scent: "Musk", price: 28.99, desc: "Rich sandalwood entwined with soft amber musk.", image: "https://images.unsplash.com/photo-1610701596007-11502861dcfa?w=500&h=500&fit=crop" },
    { id: 11, name: "Peony Blush", scent: "Floral", price: 24.99, desc: "Blushing peonies with a hint of juicy pear.", image: "https://images.unsplash.com/photo-1589647687137-e726253e7dec?w=500&h=500&fit=crop" },
    { id: 12, name: "Coconut Paradise", scent: "Sweet", price: 23.99, desc: "Tropical coconut cream on a sun-kissed beach.", image: "https://images.unsplash.com/photo-1608571423902-eed4a5ad8200?w=500&h=500&fit=crop" }
];

// ======= State =======
let cart = JSON.parse(localStorage.getItem('cozzy_cart') || '[]'); // cart stays local (session-based)
let currentUser = JSON.parse(localStorage.getItem('cozzy_user') || 'null');

// ======= Init =======
document.addEventListener('DOMContentLoaded', () => {
    renderProducts();
    updateCartUI();
    updateAuthUI();
    setupEventListeners();
});

function renderProducts() {
    const grid = document.getElementById('productsGrid');
    grid.innerHTML = products.map(p => `
        <div class="product-card">
            <img src="${p.image}" alt="${p.name}" class="product-image" onerror="this.src='https://images.unsplash.com/photo-1603006905003-be475563bc59?w=500&h=500&fit=crop'">
            <div class="product-info">
                <h3 class="product-name">${p.name}</h3>
                <span class="product-scent">${p.scent}</span>
                <p class="product-desc">${p.desc}</p>
                <div class="product-bottom">
                    <span class="product-price">$${p.price.toFixed(2)}</span>
                    <button class="btn-add" onclick="addToCart(${p.id}, this)">Add +</button>
                </div>
            </div>
        </div>
    `).join('');
}

// ======= Cart Functions =======
function addToCart(id, btn) {
    const product = products.find(p => p.id === id);
    const existing = cart.find(i => i.id === id);
    if (existing) existing.qty++;
    else cart.push({ ...product, qty: 1 });
    saveCart();
    updateCartUI();
    showToast(`✨ ${product.name} added to cart!`);
    if (btn) {
        btn.textContent = 'Added ✓';
        btn.classList.add('added');
        setTimeout(() => { btn.textContent = 'Add +'; btn.classList.remove('added'); }, 1500);
    }
}

function removeFromCart(id) {
    cart = cart.filter(i => i.id !== id);
    saveCart();
    updateCartUI();
    renderCart();
}

function updateQty(id, delta) {
    const item = cart.find(i => i.id === id);
    if (!item) return;
    item.qty += delta;
    if (item.qty <= 0) { removeFromCart(id); return; }
    saveCart();
    updateCartUI();
    renderCart();
}

function saveCart() {
    localStorage.setItem('cozzy_cart', JSON.stringify(cart));
}

function cartSubtotal() { return cart.reduce((s, i) => s + i.price * i.qty, 0); }
function cartShipping() {
    if (cart.length === 0) return 0;
    return cartSubtotal() >= 50 ? 0 : 5.99;
}
function cartTotal() { return cartSubtotal() + cartShipping(); }

function updateCartUI() {
    document.getElementById('cartCount').textContent = cart.reduce((s, i) => s + i.qty, 0);
}

function renderCart() {
    const container = document.getElementById('cartItems');
    if (cart.length === 0) {
        container.innerHTML = `<div class="cart-empty"><div class="cart-empty-icon">🛍️</div><p>Your cart is empty!</p></div>`;
        document.getElementById('checkoutBtn').style.opacity = '0.5';
        document.getElementById('checkoutBtn').style.pointerEvents = 'none';
    } else {
        container.innerHTML = cart.map(i => `
            <div class="cart-item">
                <img src="${i.image}" class="cart-item-img" onerror="this.src='https://images.unsplash.com/photo-1603006905003-be475563bc59?w=500&h=500&fit=crop'">
                <div class="cart-item-info">
                    <div class="cart-item-name">${i.name}</div>
                    <div class="cart-item-price">$${i.price.toFixed(2)}</div>
                </div>
                <div class="qty-controls">
                    <button class="qty-btn" onclick="updateQty(${i.id}, -1)">−</button>
                    <span class="qty-num">${i.qty}</span>
                    <button class="qty-btn" onclick="updateQty(${i.id}, 1)">+</button>
                </div>
                <button class="remove-btn" onclick="removeFromCart(${i.id})">🗑️</button>
            </div>
        `).join('');
        document.getElementById('checkoutBtn').style.opacity = '1';
        document.getElementById('checkoutBtn').style.pointerEvents = 'auto';
    }
    document.getElementById('cartSubtotal').textContent = `$${cartSubtotal().toFixed(2)}`;
    document.getElementById('cartShipping').textContent = cartShipping() === 0 ? 'FREE 🎉' : `$${cartShipping().toFixed(2)}`;
    document.getElementById('cartTotal').textContent = `$${cartTotal().toFixed(2)}`;
}

// ======= AUTH (Now uses SQL via API!) =======
function updateAuthUI() {
    const btn = document.getElementById('authBtn');
    if (currentUser) {
        document.getElementById('authIcon').textContent = '👋';
        document.getElementById('authText').textContent = currentUser.name || 'Account';
        btn.onclick = () => {
            if (confirm(`Hi ${currentUser.name || 'beautiful'}! 💖 Log out?`)) {
                currentUser = null;
                localStorage.removeItem('cozzy_user');
                updateAuthUI();
                showToast('Logged out 🌸');
            }
        };
    } else {
        document.getElementById('authIcon').textContent = '👤';
        document.getElementById('authText').textContent = 'Login';
        btn.onclick = () => openModal('authModal');
    }
}

async function handleLogin() {
    const identifier = document.getElementById('loginIdentifier').value.trim();
    const password = document.getElementById('loginPassword').value;
    if (!identifier || !password) { showToast('⚠️ Fill all fields'); return; }

    try {
        const res = await fetch(`${API}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identifier, password })
        });
        const data = await res.json();
        if (!data.success) { showToast('❌ ' + data.message); return; }

        currentUser = data.user;
        localStorage.setItem('cozzy_user', JSON.stringify(currentUser));
        updateAuthUI();
        closeModal('authModal');
        showToast(`Welcome back, ${currentUser.name}! 💕`);
        checkSurveyNeeded();
        clearAuthFields();
    } catch (err) {
        showToast('⚠️ Server error — is the server running?');
    }
}

async function handleSignup() {
    const name = document.getElementById('signupName').value.trim();
    const identifier = document.getElementById('signupIdentifier').value.trim();
    const password = document.getElementById('signupPassword').value;
    if (!name || !identifier || !password) { showToast('⚠️ Fill all fields'); return; }
    if (password.length < 4) { showToast('⚠️ Password too short'); return; }

    try {
        const res = await fetch(`${API}/auth/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, identifier, password })
        });
        const data = await res.json();
        if (!data.success) { showToast('⚠️ ' + data.message); return; }

        currentUser = data.user;
        localStorage.setItem('cozzy_user', JSON.stringify(currentUser));
        updateAuthUI();
        closeModal('authModal');
        showToast(`Welcome, ${name}! 🌸`);
        setTimeout(() => openModal('surveyModal'), 500);
        clearAuthFields();
    } catch (err) {
        showToast('⚠️ Server error — is the server running?');
    }
}

function clearAuthFields() {
    ['loginIdentifier', 'loginPassword', 'signupName', 'signupIdentifier', 'signupPassword'].forEach(id => {
        const el = document.getElementById(id); if (el) el.value = '';
    });
}

// ======= SURVEY (Saves to SQL!) =======
async function checkSurveyNeeded() {
    if (!currentUser) return;
    try {
        const res = await fetch(`${API}/preferences/${currentUser.id}`);
        const data = await res.json();
        if (!data.preferences) setTimeout(() => openModal('surveyModal'), 500);
    } catch (e) {}
}

async function saveSurvey() {
    if (!currentUser) { showToast('⚠️ Login first'); return; }
    const favoriteScents = [...document.querySelectorAll('.scent-check:checked')].map(c => c.value);
    const freeTimeActivities = [...document.querySelectorAll('.hobby-check:checked')].map(c => c.value);
    if (favoriteScents.length === 0 || freeTimeActivities.length === 0) {
        showToast('⚠️ Select at least one from each 💗'); return;
    }

    try {
        const res = await fetch(`${API}/preferences`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: currentUser.id, favoriteScents, freeTimeActivities })
        });
        const data = await res.json();
        if (!data.success) { showToast('⚠️ ' + data.message); return; }

        closeModal('surveyModal');
        showToast('Preferences saved to database! ✨💖');
        document.querySelectorAll('.scent-check, .hobby-check').forEach(c => c.checked = false);
    } catch (err) {
        showToast('⚠️ Server error — is the server running?');
    }
}

// ======= CHECKOUT (Saves to SQL!) =======
let currentCheckoutStep = 1;

function proceedToCheckout() {
    if (cart.length === 0) { showToast('⚠️ Cart empty'); return; }
    closeModal('cartModal');
    currentCheckoutStep = 1;
    updateCheckoutUI();
    if (currentUser) {
        if (currentUser.email) document.getElementById('coEmail').value = currentUser.email;
        if (currentUser.phone) document.getElementById('coPhone').value = currentUser.phone;
        if (currentUser.name) document.getElementById('coName').value = currentUser.name;
    }
    openModal('checkoutModal');
}

function nextCheckoutStep(step) {
    if (step === 2) {
        if (!document.getElementById('coName').value || !document.getElementById('coEmail').value || !document.getElementById('coPhone').value) {
            showToast('⚠️ Fill all info fields'); return;
        }
    }
    if (step === 3) {
        if (!document.getElementById('coAddr1').value || !document.getElementById('coCity').value || !document.getElementById('coZip').value) {
            showToast('⚠️ Fill shipping address'); return;
        }
        renderOrderSummary();
    }
    currentCheckoutStep = step;
    updateCheckoutUI();
}

function updateCheckoutUI() {
    document.querySelectorAll('.checkout-step').forEach((el, i) => {
        el.classList.toggle('hidden', i + 1 !== currentCheckoutStep);
    });
    document.querySelectorAll('.step').forEach(s => {
        s.classList.toggle('active', parseInt(s.dataset.step) === currentCheckoutStep);
    });
}

function renderOrderSummary() {
    const container = document.getElementById('orderSummary');
    container.innerHTML = cart.map(i => `
        <div class="summary-item">
            <span>${i.name} × ${i.qty}</span>
            <span>$${(i.price * i.qty).toFixed(2)}</span>
        </div>
    `).join('') + `
        <div class="summary-item" style="margin-top:8px;color:#8b6f8d;">
            <span>Shipping</span><span>${cartShipping() === 0 ? 'FREE 🎉' : '$' + cartShipping().toFixed(2)}</span>
        </div>
    `;
    document.getElementById('orderTotal').textContent = `$${cartTotal().toFixed(2)}`;
}

async function placeOrder() {
    const card = document.getElementById('coCard').value.replace(/\s/g, '');
    const exp = document.getElementById('coExp').value;
    const cvv = document.getElementById('coCvv').value;
    if (card.length < 13 || !exp || cvv.length < 3) {
        showToast('⚠️ Enter valid payment details'); return;
    }

    const shipping = {
        name: document.getElementById('coName').value,
        email: document.getElementById('coEmail').value,
        phone: document.getElementById('coPhone').value,
        addr1: document.getElementById('coAddr1').value,
        addr2: document.getElementById('coAddr2').value,
        city: document.getElementById('coCity').value,
        zip: document.getElementById('coZip').value
    };

    try {
        const res = await fetch(`${API}/orders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: currentUser?.id || null,
                items: cart,
                total: cartTotal(),
                shippingCost: cartShipping(),
                shipping
            })
        });
        const data = await res.json();
        if (!data.success) { showToast('⚠️ ' + data.message); return; }

        cart = [];
        saveCart();
        updateCartUI();
        document.getElementById('orderNumber').textContent = `Order #${data.orderNo}`;
        nextCheckoutStep(4);
        showToast('🎉 Order saved to database!');
        ['coName','coEmail','coPhone','coAddr1','coAddr2','coCity','coZip','coCard','coExp','coCvv'].forEach(id => {
            document.getElementById(id).value = '';
        });
    } catch (err) {
        showToast('⚠️ Server error — is the server running?');
    }
}

// ======= Modal Management =======
function setupEventListeners() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b === btn));
            document.getElementById('loginForm').classList.toggle('hidden', btn.dataset.tab !== 'login');
            document.getElementById('signupForm').classList.toggle('hidden', btn.dataset.tab !== 'signup');
        });
    });
    document.querySelectorAll('[data-close]').forEach(btn => {
        btn.addEventListener('click', () => closeModal(btn.dataset.close));
    });
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', e => { if (e.target === modal) closeModal(modal.id); });
    });
    document.getElementById('cartBtn').addEventListener('click', () => {
        renderCart();
        openModal('cartModal');
    });
    document.getElementById('coCard')?.addEventListener('input', e => {
        let v = e.target.value.replace(/\s/g, '').replace(/\D/g, '');
        e.target.value = v.match(/.{1,4}/g)?.join(' ') || v;
    });
    document.getElementById('coExp')?.addEventListener('input', e => {
        let v = e.target.value.replace(/\D/g, '');
        if (v.length >= 3) v = v.slice(0, 2) + '/' + v.slice(2, 4);
        e.target.value = v;
    });
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', e => {
            e.preventDefault();
            document.querySelector(link.getAttribute('href'))?.scrollIntoView({ behavior: 'smooth' });
            document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
            link.classList.add('active');
        });
    });
}

function openModal(id) { document.getElementById(id).classList.add('active'); document.body.style.overflow = 'hidden'; }
function closeModal(id) { document.getElementById(id).classList.remove('active'); document.body.style.overflow = ''; }
function closeAllModals() { document.querySelectorAll('.modal').forEach(m => m.classList.remove('active')); document.body.style.overflow = ''; }

function showToast(msg) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => { toast.classList.add('hide'); setTimeout(() => toast.remove(), 300); }, 2500);
}