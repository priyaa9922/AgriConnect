import { auth, db } from "./firebase-config.js";
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, where } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

// =========================
// PARALLAX SCROLL EFFECT
// =========================
window.addEventListener('scroll', function() {
    let text = document.getElementById('text');
    let bird1 = document.getElementById('bird1');
    let bird2 = document.getElementById('bird2');
    let btnGroup = document.getElementById('btn-group');
    let rocks = document.getElementById('rocks');
    let forest = document.getElementById('forest');
    let water = document.getElementById('water');
    let header = document.getElementById('header');
    
    let value = window.scrollY;
    
    if(text) text.style.top = 50 + value * -.1 + '%';
    if(bird2) {
        bird2.style.top = value * -1.5 + 'px';
        bird2.style.left = value * 2 + 'px';
    }
    if(bird1) {
        bird1.style.top = value * -1.5 + 'px';
        bird1.style.left = value * -5 + 'px';
    }
    if(btnGroup) btnGroup.style.marginTop = value * 1.5 + 'px';
    if(rocks) rocks.style.top = value * -.12 + 'px';
    if(forest) forest.style.top = 100 + value * .25 + 'px';
    if(header) header.style.top = value * .5 + 'px';
});


// =========================
// PRODUCT SEARCH
// =========================

function searchProducts() {

    let input =
    document.getElementById("searchInput")
    .value.toUpperCase();

    let products =
    document.getElementsByClassName("product");

    for(let i=0;i<products.length;i++){

        let productName =
        products[i]
        .getElementsByTagName("h3")[0];

        if(
            productName.innerHTML
            .toUpperCase()
            .indexOf(input) > -1
        ){
            products[i].style.display="";
        }
        else{
            products[i].style.display="none";
        }
    }
}


// =========================
// PRODUCT FILTER
// =========================

function filterProducts(category){

    let products =
    document.getElementsByClassName("product");

    for(let i=0;i<products.length;i++){

        if(category==="all"){
            products[i].style.display="block";
        }

        else if(
            products[i]
            .classList.contains(category)
        ){
            products[i].style.display="block";
        }

        else{
            products[i].style.display="none";
        }
    }
}





// =========================
// CROP ADVISORY
// =========================

function showAdvice(){

    let crop =
    document.getElementById("cropSelect").value;

    let result =
    document.getElementById("result");

    if(crop==="cotton"){

        result.innerHTML = `
        <h2>Cotton Recommendations</h2>

        <p><b>Fertilizers:</b> Urea, DAP</p>

        <p><b>Pesticides:</b> Coragen</p>

        <p><b>Tip:</b> Monitor pink bollworm regularly.</p>
        `;
    }

    else if(crop==="soybean"){

        result.innerHTML = `
        <h2>Soybean Recommendations</h2>

        <p><b>Fertilizers:</b> NPK, Urea</p>

        <p><b>Pesticides:</b> Imidacloprid</p>

        <p><b>Tip:</b> Ensure proper drainage.</p>
        `;
    }

    else if(crop==="wheat"){

        result.innerHTML = `
        <h2>Wheat Recommendations</h2>

        <p><b>Fertilizers:</b> Urea, DAP</p>

        <p><b>Pesticides:</b> Chlorpyrifos</p>

        <p><b>Tip:</b> Irrigate during flowering stage.</p>
        `;
    }

    else{

        result.innerHTML =
        "Please select a crop.";
    }
}


// =========================
// ADD PRODUCT
// =========================

async function addProduct(){
    let name = document.getElementById("productName").value;
    let price = document.getElementById("productPrice").value;
    let stock = document.getElementById("productStock").value;

    if(name==="" || price==="" || stock===""){
        alert("Please fill all fields");
        return;
    }

    if (!auth.currentUser) {
        alert("Please log in to add products");
        return;
    }

    let productData = {
        name: name,
        price: price,
        stock: stock,
        ownerId: auth.currentUser.uid
    };

    try {
        await addDoc(collection(db, "products"), productData);
        displayProducts();
        document.getElementById("productName").value="";
        document.getElementById("productPrice").value="";
        document.getElementById("productStock").value="";
    } catch (e) {
        console.error("Error adding document: ", e);
    }
}

// =========================
// DISPLAY PRODUCTS
// =========================

async function displayProducts(){
    let list = document.getElementById("productList");
    if(!list) return;
    list.innerHTML="";

    // Note: owner-dashboard.html overrides this function!
    try {
        const querySnapshot = await getDocs(collection(db, "products"));
        let products = [];
        querySnapshot.forEach((doc) => {
            products.push({ id: doc.id, ...doc.data() });
        });

        products.forEach((product, index) => {
            let card = document.createElement("div");
            card.className="product-card";
            card.innerHTML = `
            <h3>${product.name}</h3>
            <p>Price: ₹${product.price}</p>
            <p>Stock: ${product.stock}</p>
            <button onclick="editProduct('${product.id}')">✏️ Edit</button>
            <button onclick="deleteProduct('${product.id}')">🗑 Delete</button>
            `;
            list.appendChild(card);
        });
    } catch (e) {
        console.error("Error getting documents: ", e);
    }
}


// =========================
// EDIT PRODUCT
// =========================

async function editProduct(productId){
    let newPrice = prompt("Enter New Price");
    let newStock = prompt("Enter New Stock");

    if(newPrice !== null || newStock !== null){
        const updateData = {};
        if (newPrice !== null && newPrice.trim() !== "") updateData.price = newPrice;
        if (newStock !== null && newStock.trim() !== "") updateData.stock = newStock;
        
        try {
            await updateDoc(doc(db, "products", productId), updateData);
            displayProducts();
        } catch (e) {
            console.error("Error updating document: ", e);
        }
    }
}

// =========================
// DELETE PRODUCT
// =========================

async function deleteProduct(productId){
    if (confirm("Are you sure you want to delete this product?")) {
        try {
            await deleteDoc(doc(db, "products", productId));
            displayProducts();
        } catch (e) {
            console.error("Error deleting document: ", e);
        }
    }
}


// =========================
// PAGE LOAD
// =========================

onAuthStateChanged(auth, (user) => {
    displayProducts();
});

// Make functions global for inline event handlers
window.searchProducts = searchProducts;
window.filterProducts = filterProducts;
window.showAdvice = showAdvice;
window.addProduct = addProduct;
window.displayProducts = displayProducts;
window.editProduct = editProduct;
window.deleteProduct = deleteProduct;
window.searchShops = searchShops;
function searchShops(){

    let input =
    document.getElementById("shopSearch")
    .value.toUpperCase();

    let shops =
    document.getElementsByClassName("shop");

    for(let i=0;i<shops.length;i++){

        let shopName =
        shops[i]
        .getElementsByTagName("h3")[0];

        if(
            shopName.innerHTML
            .toUpperCase()
            .indexOf(input) > -1
        ){
            shops[i].style.display="block";
        }
        else{
            shops[i].style.display="none";
        }
    }
}