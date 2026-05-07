// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendEmailVerification, sendPasswordResetEmail, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
// NEW: Import Firestore
import { getFirestore, doc, setDoc, getDoc, addDoc, updateDoc, deleteDoc, collection, query, where, getDocs, onSnapshot } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBVOlXg6AEXGU2IU0GZspNCOvMdFSLBRQM",
  authDomain: "flower-shop-ccebd.firebaseapp.com",
  projectId: "flower-shop-ccebd",
  storageBucket: "flower-shop-ccebd.firebasestorage.app",
  messagingSenderId: "751732627164",
  appId: "1:751732627164:web:ca0368973d31655907c619"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
// NEW: Initialize Firestore
const db = getFirestore(app);

// Select nav-user element for UI updates
const navUser = document.querySelector('.nav-user');

document.addEventListener('DOMContentLoaded', function(){

    // Add GCash as a payment option dynamically
    const paymentSelect = document.getElementById('checkout-payment');
    if (paymentSelect) {
        const gcashOption = document.createElement('option');
        gcashOption.value = 'GCash';
        gcashOption.textContent = 'GCash';
        paymentSelect.appendChild(gcashOption);
    }

    //For Search========================//
    document.addEventListener('click', function(event){
        if(event.target.closest('.nav-search')){
            document.querySelector('.search-bar').classList.add('search-bar-active');
        }
        else if(event.target.closest('.search-cancel')){
            document.querySelector('.search-bar').classList.remove('search-bar-active');
        }
    });

    //For Login Signup ============================//
    document.addEventListener('click', function(event){
        //check if clicked element has the class 'nav-user' or 'already-account'
         if(event.target.closest('.nav-user, .already-account') && !auth.currentUser){
            const forElement = document.querySelector('.form');
            forElement.classList.add('login-active');
            forElement.classList.remove('sign-up-active');
         }

         //check if clicked element has the class 'sign-up-btn'
         if(event.target.closest('.sign-up-btn')){
            const forElement = document.querySelector('.form');
            forElement.classList.remove('login-active');
            forElement.classList.add('sign-up-active');
         }

         //check if clicked element has the class 'form-cancel'
         if(event.target.closest('.form-cancel')){
            const forElement = document.querySelector('.form');
            forElement.classList.remove('login-active');
            forElement.classList.remove('sign-up-active');
         }

         // Forgot Password
         if(event.target.closest('.forget')){
            const email = prompt('Enter your email address to reset your password:');
            if (email) {
                sendPasswordResetEmail(auth, email)
                    .then(() => {
                        alert('Password reset email sent! Check your inbox.');
                    })
                    .catch((error) => {
                        alert(`Error: ${error.message}`);
                    });
            }
         }

         // Logout functionality (updated with confirmation)
         if(event.target.closest('.nav-user') && auth.currentUser){
             // Show confirmation dialog
             if (confirm('Are you sure you want to log out?')) {
                 // If user confirms, proceed with logout
                 signOut(auth).then(() => {
                     alert('Logged out successfully!');
                     updateAuthUI(); // Reset UI
                 }).catch((error) => {
                     alert(`Logout failed: ${error.message}`);
                 });
             }
             // If user cancels, do nothing (stay logged in)
         }

    });

    //For fix header =========================================//
    const header = document.querySelector('header');
    let lastScrollY = window.scrollY;
    
    window.addEventListener('scroll', function(){
        const currentScrollY = window.scrollY;

        // check if at the top
        if(currentScrollY === 0){
            header.classList.remove('header-fix');
        }
        else if(currentScrollY < lastScrollY){
            header.classList.add('header-fix');
        }
        else{
            header.classList.remove('header-fix');
        }
        lastScrollY = currentScrollY;
    });

    //For Menu Toggle on Mobile
    document.addEventListener('click', function(event){
        if(event.target.closest('.menu-icon')){
            const menu = document.querySelector('.menu');
            menu.classList.toggle('menu-active');
        }
    });

    // Close menu when a link is clicked (mobile)
    document.querySelectorAll('.menu a').forEach(link => {
        link.addEventListener('click', () => {
            document.querySelector('.menu').classList.remove('menu-active');
        });
    });

    // Login Form Submission with hCaptcha
    const loginForm = document.getElementById('loginFormElement');
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = loginForm.querySelector('input[name="email"]').value.trim();
        const password = loginForm.querySelector('input[name="password"]').value.trim();
        const hcaptchaResponse = hcaptcha.getResponse();

        if (!email || !password) {
            alert('Please enter both email and password.');
            return;
        }

        if (!hcaptchaResponse) {
            alert('Please complete the captcha.');
            return;
        }

        try {
            await signInWithEmailAndPassword(auth, email, password);
            alert('Login successful!');
            // Close the login form after successful login
            document.querySelector('.form').classList.remove('login-active');
            updateAuthUI(); // Update UI to show logout option
        } catch (error) {
            alert(`Login failed: ${error.message}`);
        }
    });

    // Sign-Up Form Submission
    const signUpForm = document.querySelector('.sign-up-form form');
    signUpForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const fullname = signUpForm.querySelector('input[name="fullname"]').value.trim();
        const email = signUpForm.querySelector('input[name="email"]').value.trim();
        const password = signUpForm.querySelector('input[name="password"]').value.trim();

        if (!fullname || !email || !password) {
            alert('Please fill in all fields.');
            return;
        }

        if (password.length < 6) {
            alert('Password should be at least 6 characters.');
            return;
        }

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // NEW: Save additional user data to Firestore (e.g., fullname, isAdmin)
            await setDoc(doc(db, 'users', user.uid), {
                email: user.email,
                fullname: fullname,
                isAdmin: false  // Default to false; set manually for admins
            });

            // Send email verification
            await sendEmailVerification(user);
            alert('Account created successfully! Please check your email to verify your account before logging in.');

            // Optionally, sign out the user immediately after creation to force verification
            await auth.signOut();

            // Close the form
            document.querySelector('.form').classList.remove('sign-up-active');
        } catch (error) {
            alert(`Sign-up failed: ${error.message}`);
        }
    });

    // Function to update UI based on auth state
    function updateAuthUI() {
        if (auth.currentUser) {
            // User is logged in: Change nav-user to logout
            navUser.innerHTML = `
                <svg width="24px" height="24px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M9 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H9" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M16 17L21 12L16 7" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M21 12H9" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                Logout
            `;
            navUser.title = "Click to Logout"; // Tooltip for clarity
        } else {
            // User is not logged in: Reset to original login icon
            navUser.innerHTML = `
                <svg width="24px" height="24px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M16 7C16 9.20914 14.2091 11 12 11C9.79086 11 8 9.20914 8 7C8 4.79086 9.79086 3 12 3C14.2091 3 16 4.79086 16 7Z" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M12 14C8.13401 14 5 17.134 5 21H19C19 17.134 15.866 14 12 14Z" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            `;
            navUser.title = "Login"; // Reset tooltip
        }
    }

    // Initialize auth state listener
    onAuthStateChanged(auth, (user) => {
        updateAuthUI();
        if (user) {
            loadCart();  // NEW: Load cart when user logs in
        }
    });

});
//For Menu Toggle on Mobile
document.addEventListener('click', function(event){
    if(event.target.closest('.menu-icon')){
        const menu = document.querySelector('.menu');
        menu.classList.toggle('menu-active');
    }
});

// Close menu when a link is clicked (mobile)
document.querySelectorAll('.menu a').forEach(link => {
        link.addEventListener('click', () => {
            document.querySelector('.menu').classList.remove('menu-active');
        });
    });

// NEW: Cart now stored in Firestore per user
let cart = [];  // Will be loaded from Firestore
let cartCount = 0;

// Select elements
const cartSpan = document.querySelector('.nav-cart span');
const cartIcon = document.querySelector('.nav-cart'); // The cart icon link
const cartModal = document.getElementById('cart-modal');
const cartItemsDiv = document.getElementById('cart-items');
const cartTotalDiv = document.getElementById('cart-total');
const closeModal = document.querySelector('.cart-modal-close');
const checkoutBtn = document.getElementById('checkout-btn');

// NEW: Function to load cart from Firestore
async function loadCart() {
    if (!auth.currentUser) return;
    try {
        const cartDoc = await getDoc(doc(db, 'carts', auth.currentUser.uid));
        cart = cartDoc.exists() ? cartDoc.data().items || [] : [];
        cartCount = cart.length;
        updateCartDisplay();
    } catch (error) {
        console.error('Error loading cart:', error);
    }
}

// NEW: Function to save cart to Firestore
async function saveCart() {
    if (!auth.currentUser) return;
    try {
        await setDoc(doc(db, 'carts', auth.currentUser.uid), { items: cart });
    } catch (error) {
        console.error('Error saving cart:', error);
    }
}

// Function to update cart display
function updateCartDisplay() {
    cartSpan.textContent = cartCount;
    cartItemsDiv.innerHTML = ''; // Clear previous items
    let total = 0;
    cart.forEach((item, index) => {  // Use index for removal since IDs are now in Firestore
        const itemDiv = document.createElement('div');
        const p = document.createElement('p');
        p.textContent = `${item.name} - ₱${item.price}`;
        
        const removeBtn = document.createElement('button');
        removeBtn.textContent = 'Remove';
        removeBtn.addEventListener('click', () => removeFromCart(index));
        
        p.appendChild(removeBtn);
        itemDiv.appendChild(p);
        cartItemsDiv.appendChild(itemDiv);
        
        total += item.price;
    });
    cartTotalDiv.textContent = `Total: ₱${total}`;
}

// Function to remove item from cart by index
function removeFromCart(index) {
    cart.splice(index, 1);
    cartCount--;
    updateCartDisplay();
    saveCart();  // NEW: Save after removal
}

// Select all "Add To Cart" buttons
const addToCartButtons = document.querySelectorAll('.product-cart-btn');

// Add event listeners to each "Add To Cart" button
addToCartButtons.forEach(button => {
    button.addEventListener('click', async (e) => {
        e.preventDefault();
        if (!auth.currentUser) {
            alert('Please log in to add items to cart.');
            return;
        }
        
        // Get product details from the button's parent container
        const productBox = button.closest('.product-box');
        const baseName = productBox.querySelector('.product-text-title').textContent;
        const productPriceText = productBox.querySelector('.product-box-text span').textContent;
        const productPrice = parseFloat(productPriceText.split(' ')[0].replace('₱', '').replace(',', ''));
        
        const productName = `${baseName} - ₱${productPrice}`;
        
        // Add to cart array
        cart.push({ name: productName, price: productPrice });
        cartCount++;
        
        updateCartDisplay();
        await saveCart();  // NEW: Save after adding
    });
});

// Event listener for cart icon click to show modal
cartIcon.addEventListener('click', (e) => {
    e.preventDefault();
    cartModal.style.display = 'flex';
});

// Event listener to close modal
closeModal.addEventListener('click', () => {
    cartModal.style.display = 'none';
});

// Close modal if clicked outside
window.addEventListener('click', (e) => {
    if (e.target === cartModal) {
        cartModal.style.display = 'none';
    }
});

// Checkout Modal Elements
const checkoutModal = document.getElementById('checkout-modal');
const checkoutForm = document.getElementById('checkout-form');
const checkoutClose = document.querySelector('.checkout-modal-close');
const checkoutOrderSummary = document.getElementById('checkout-order-summary');
const checkoutTotal = document.getElementById('checkout-total');

// Function to show checkout modal
function showCheckoutModal() {
    const user = auth.currentUser;
    if (!user) {
        alert('Please log in to proceed with checkout.');
        document.querySelector('.form').classList.add('login-active');
        return;
    }

    if (cart.length === 0) {
        alert('Your cart is empty.');
        return;
    }

    // Populate order summary
    checkoutOrderSummary.innerHTML = '';
    let total = 0;
    cart.forEach(item => {
        const itemDiv = document.createElement('div');
        itemDiv.textContent = `${item.name} - ₱${item.price}`;
        checkoutOrderSummary.appendChild(itemDiv);  // <-- FIXED: Properly append the item div
        total += item.price;
    });
    checkoutTotal.textContent = `Total: ₱${total}`;

    // Show modal
    checkoutModal.style.display = 'flex';
}

// Event listener for checkout button
checkoutBtn.addEventListener('click', (e) => {
    e.preventDefault();
    showCheckoutModal();
});

// Close checkout modal
checkoutClose.addEventListener('click', () => {
    checkoutModal.style.display = 'none';
});

// Close checkout modal if clicked outside
window.addEventListener('click', (e) => {
    if (e.target === checkoutModal) {
        checkoutModal.style.display = 'none';
    }
});

// Handle checkout form submission
checkoutForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('checkout-name').value.trim();
    const email = document.getElementById('checkout-email').value.trim();
    const address = document.getElementById('checkout-address').value.trim();
    const phone = document.getElementById('checkout-phone').value.trim();
    const paymentMethod = document.getElementById('checkout-payment').value;

    if (!name || !email || !address || !phone || !paymentMethod) {
        alert('Please fill in all fields.');
        return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        alert('Please enter a valid email address.');
        return;
    }

    // NEW: Save order to Firestore
    try {
        const newOrder = {
            customerName: name,
            email,
            address,
            phone,
            paymentMethod,
            items: cart,
            total: parseFloat(checkoutTotal.textContent.replace('Total: ₱', '')),
            status: 'Pending',
            userId: auth.currentUser.uid,
            timestamp: new Date()
        };
        await addDoc(collection(db, 'orders'), newOrder);

        alert(`Order placed successfully!\nName: ${name}\nEmail: ${email}\nAddress: ${address}\nPhone: ${phone}\nPayment: ${paymentMethod}\nTotal: ${checkoutTotal.textContent}`);

        // Clear cart after successful checkout
        cart = [];
        cartCount = 0;
        updateCartDisplay();
        await saveCart();

        // Close modals
        checkoutModal.style.display = 'none';
        cartModal.style.display = 'none';
    } catch (error) {
        alert(`Error placing order: ${error.message}`);
    }
});

// Select elements
const navSearch = document.querySelector('.nav-search');
const searchBar = document.querySelector('.search-bar');
const searchInput = document.querySelector('.search-input input');
const searchCancel = document.querySelector('.search-cancel');
const productBoxes = document.querySelectorAll('.product-box');

// Function to filter products based on search query
function filterProducts() {
    const query = searchInput.value.toLowerCase().trim();
    productBoxes.forEach(box => {
        const title = box.querySelector('.product-text-title').textContent.toLowerCase();
        if (title.includes(query) || query === '') {
            box.style.display = 'block';
        } else {
            box.style.display = 'none';
        }
    });
}

// Toggle search bar visibility on nav search click
navSearch.addEventListener('click', () => {
    searchBar.classList.toggle('search-bar-active');
});

// Filter products on search input
searchInput.addEventListener('input', filterProducts);

// Clear search and show all products on cancel click
searchCancel.addEventListener('click', () => {
    searchInput.value = '';
    filterProducts();
});

// Prevent form submission
document.querySelector('.search-input').addEventListener('submit', (e) => {
    e.preventDefault();
});

// NEW: Admin functions using Firestore
async function checkIsAdmin() {
    if (!auth.currentUser) return false;
    try {
        const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
        return userDoc.exists() && userDoc.data().isAdmin;
    } catch (error) {
        console.error('Error checking admin:', error);
        return false;
    }
}

async function loadProducts() {
    if (!(await checkIsAdmin())) return;
    try {
        const querySnapshot = await getDocs(collection(db, 'products'));
        const list = document.getElementById('products-list');
        if (list) {
            list.innerHTML = '';
            querySnapshot.forEach((docSnap) => {
                const product = docSnap.data();
                list.innerHTML += `
                    <li>
                        ${product.name} - ₱${product.price}
                        <button onclick="editProduct('${docSnap.id}')">Edit</button>
                        <button onclick="deleteProduct('${docSnap.id}')">Delete</button>
                    </li>
                `;
            });
        }
    } catch (error) {
        console.error('Error loading products:', error);
    }
}

async function addProduct(name, price) {
    if (!(await checkIsAdmin())) return;
    try {
        await addDoc(collection(db, 'products'), { name, price });
        loadProducts();
    } catch (error) {
        console.error('Error adding product:', error);
    }
}

async function editProduct(id) {
    if (!(await checkIsAdmin())) return;
    try {
        const docSnap = await getDoc(doc(db, 'products', id));
        if (docSnap.exists()) {
            const product = docSnap.data();
            const newName = prompt('New Name:', product.name);
            const newPrice = prompt('New Price:', product.price);
            if (newName && newPrice) {
                await updateDoc(doc(db, 'products', id), { name: newName, price: parseFloat(newPrice) });
                loadProducts();
            }
        }
    } catch (error) {
        console.error('Error editing product:', error);
    }
}

async function deleteProduct(id) {
    if (!(await checkIsAdmin())) return;
    if (confirm('Delete this product?')) {
        try {
            await deleteDoc(doc(db, 'products', id));
            loadProducts();
        } catch (error) {
            console.error('Error deleting product:', error);
        }
    }
}

async function loadOrders() {
    if (!(await checkIsAdmin())) return;
    try {
        const querySnapshot = await getDocs(collection(db, 'orders'));
        const list = document.getElementById('orders-list');
        if (list) {
            list.innerHTML = '';
            querySnapshot.forEach((docSnap) => {
                const order = docSnap.data();
                list.innerHTML += `
                    <li>
                        ${order.customerName} - ₱${order.total} - Status: ${order.status}
                        <select onchange="updateOrderStatus('${docSnap.id}', this.value)">
                            <option value="Pending" ${order.status === 'Pending' ? 'selected' : ''}>Pending</option>
                            <option value="Shipped" ${order.status === 'Shipped' ? 'selected' : ''}>Shipped</option>
                            <option value="Delivered" ${order.status === 'Delivered' ? 'selected' : ''}>Delivered</option>
                        </select>
                    </li>
                `;
            });
        }
    } catch (error) {
        console.error('Error loading orders:', error);
    }
}

async function updateOrderStatus(id, status) {
    if (!(await checkIsAdmin())) return;
    try {
        await updateDoc(doc(db, 'orders', id), { status });
        loadOrders();
    } catch (error) {
        console.error('Error updating order:', error);
    }
}

async function loadCustomers() {
    if (!(await checkIsAdmin())) return;
    try {
        const querySnapshot = await getDocs(collection(db, 'users'));
        const list = document.getElementById('customers-list');
        if (list) {
            list.innerHTML = '';
            querySnapshot.forEach((docSnap) => {
                const user = docSnap.data();
                list.innerHTML += `
                    <li>
                        ${user.email} - Admin: ${user.isAdmin ? 'Yes' : 'No'}
                        <button onclick="toggleAdmin('${docSnap.id}')">Toggle Admin</button>
                        <button onclick="deleteUser('${docSnap.id}')">Delete</button>
                    </li>
                `;
            });
        }
    } catch (error) {
        console.error('Error loading customers:', error);
    }
}

async function toggleAdmin(id) {
    if (!(await checkIsAdmin())) return;
    try {
        const docSnap = await getDoc(doc(db, 'users', id));
        if (docSnap.exists()) {
            const user = docSnap.data();
            await updateDoc(doc(db, 'users', id), { isAdmin: !user.isAdmin });
            loadCustomers();
        }
    } catch (error) {
        console.error('Error toggling admin:', error);
    }
}

async function deleteUser(id) {
    if (!(await checkIsAdmin())) return;
    if (confirm('Delete this user?')) {
        try {
            await deleteDoc(doc(db, 'users', id));
            loadCustomers();
        } catch (error) {
            console.error('Error deleting user:', error);
        }
    }
}

async function loadReviews() {
    if (!(await checkIsAdmin())) return;
    try {
        const querySnapshot = await getDocs(collection(db, 'reviews'));
        const list = document.getElementById('reviews-list');
        if (list) {
            list.innerHTML = '';
            querySnapshot.forEach((docSnap) => {
                const review = docSnap.data();
                list.innerHTML += `<li>${review.customer} - ${review.feedback} (${review.rating}/5)</li>`;
            });
        }
    } catch (error) {
        console.error('Error loading reviews:', error);
    }
}

async function generateReport() {
    if (!(await checkIsAdmin())) return;
    try {
        const querySnapshot = await getDocs(collection(db, 'orders'));
        let monthlySales = 0;
        querySnapshot.forEach((docSnap) => {
            monthlySales += docSnap.data().total;
        });
        document.getElementById('report-output').innerHTML = `<p>Monthly Sales: ₱${monthlySales}</p>`;
    } catch (error) {
        console.error('Error generating report:', error);
    }
}

async function loadSettings() {
    if (!(await checkIsAdmin())) return;
    try {
        const settingsDoc = await getDoc(doc(db, 'settings', 'global'));
        const settings = settingsDoc.exists() ? settingsDoc.data() : {};
        document.getElementById('discount-value').textContent = `${settings.discount || 0}%`;
    } catch (error) {
        console.error('Error loading settings:', error);
    }
}

async function setDiscount(percent) {
    if (!(await checkIsAdmin())) return;
    try {
        await setDoc(doc(db, 'settings', 'global'), { discount: percent });
        loadSettings();
    } catch (error) {
        console.error('Error setting discount:', error);
    }
}

// Form event listeners for admin pages
document.getElementById('add-product-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('product-name').value;
    const price = parseFloat(document.getElementById('product-price').value);
    await addProduct(name, price);
    e.target.reset();
});

document.getElementById('discount-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const percent = parseFloat(document.getElementById('discount-percent').value);
    await setDiscount(percent);
    e.target.reset();
});

async function loadDashboard() {
    if (!(await checkIsAdmin())) return;
    try {
        const productsSnap = await getDocs(collection(db, 'products'));
        const ordersSnap = await getDocs(collection(db, 'orders'));
        const usersSnap = await getDocs(collection(db, 'users'));
        const totalSales = ordersSnap.docs.reduce((sum, doc) => sum + doc.data().total, 0);
        document.getElementById('dashboard-summary').innerHTML = `
            <p>Total Products: ${productsSnap.size}</p>
            <p>Total Orders: ${ordersSnap.size}</p>
            <p>Total Sales: ₱${totalSales}</p>
        `;
    } catch (error) {
        console.error('Error loading dashboard:', error);
    }
}

// Call admin functions on respective pages
if (window.location.pathname.includes('admin-dashboard.html')) {
    document.addEventListener('DOMContentLoaded', loadDashboard);
}
if (window.location.pathname.includes('admin-products.html')) {
    document.addEventListener('DOMContentLoaded', loadProducts);
}
if (window.location.pathname.includes('admin-orders.html')) {
    document.addEventListener('DOMContentLoaded', loadOrders);
}
if (window.location.pathname.includes('admin-customers.html')) {
    document.addEventListener('DOMContentLoaded', loadCustomers);
}
if (window.location.pathname.includes('admin-reviews.html')) {
    document.addEventListener('DOMContentLoaded', loadReviews);
}
if (window.location.pathname.includes('admin-reports.html')) {
    document.addEventListener('DOMContentLoaded', generateReport);
}
if (window.location.pathname.includes('admin-settings.html')) {
    document.addEventListener('DOMContentLoaded', loadSettings);
}
if (await checkIsAdmin()) document.getElementById('admin-link').style.display = 'block';