import { auth, db } from "./firebase-config.js";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
const googleProvider = new GoogleAuthProvider();

// UI Elements
const actionToggle = document.getElementById('actionToggle');
const actionLabels = actionToggle.querySelectorAll('.toggle-btn');
const roleToggle = document.getElementById('roleToggle');
const roleLabels = roleToggle.querySelectorAll('.toggle-btn');
const mainTitle = document.getElementById('mainTitle');
const submitBtn = document.getElementById('submitBtn');
const emailInput = document.getElementById('emailInput');
const passwordInput = document.getElementById('passwordInput');
const googleBtn = document.getElementById('googleBtn');
const errorMsg = document.getElementById('errorMsg');

// State
let isLogin = true;
let selectedRole = 'farmer';

// URL Parsing for initial role
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get('role') === 'owner') {
    selectedRole = 'owner';
    updateRoleUI();
}

function updateActionUI() {
    actionLabels.forEach(btn => btn.classList.remove('active'));
    if (isLogin) {
        actionLabels[0].classList.add('active');
        mainTitle.innerHTML = "LOGIN TO<br>AGRICONNECT.";
        submitBtn.innerHTML = "Enter Workspace &rarr;";
    } else {
        actionLabels[1].classList.add('active');
        mainTitle.innerHTML = "SIGN UP FOR<br>AGRICONNECT.";
        submitBtn.innerHTML = "Create Account &rarr;";
    }
}

function updateRoleUI() {
    roleLabels.forEach(btn => btn.classList.remove('active'));
    if (selectedRole === 'farmer') {
        roleLabels[0].classList.add('active');
    } else {
        roleLabels[1].classList.add('active');
    }
}

// Event Listeners for Toggles
actionLabels[0].addEventListener('click', () => { isLogin = true; updateActionUI(); });
actionLabels[1].addEventListener('click', () => { isLogin = false; updateActionUI(); });
roleLabels[0].addEventListener('click', () => { selectedRole = 'farmer'; updateRoleUI(); });
roleLabels[1].addEventListener('click', () => { selectedRole = 'owner'; updateRoleUI(); });

function showError(msg) {
    errorMsg.textContent = msg;
    errorMsg.style.display = 'block';
}

function hideError() {
    errorMsg.style.display = 'none';
}

function redirectUser(role) {
    if (role === 'farmer') {
        window.location.href = 'farmer-dashboard.html';
    } else {
        window.location.href = 'owner-dashboard.html';
    }
}

// Email/Password Auth
submitBtn.addEventListener('click', async () => {
    hideError();
    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) {
        showError("Please enter both email and password.");
        return;
    }

    try {
        if (isLogin) {
            // Login
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            
            // Fetch Role
            const docRef = doc(db, "users", user.uid);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                let data = docSnap.data();
                if (!data.name || !data.number) {
                    let name = data.name || prompt("Please enter your Name:");
                    let number = data.number || prompt("Please enter your Phone Number:");
                    if(name) localStorage.setItem('userName', name);
                    await setDoc(docRef, { ...data, name: name || "", number: number || "" });
                } else {
                    localStorage.setItem('userName', data.name);
                }
                redirectUser(data.role);
            } else {
                showError("User profile not found. Please sign up.");
            }
        } else {
            // Sign Up
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            
            let name = prompt("Please enter your Name:");
            let number = prompt("Please enter your Phone Number:");
            if(name) localStorage.setItem('userName', name);
            
            // Save Role
            await setDoc(doc(db, "users", user.uid), {
                email: user.email,
                role: selectedRole,
                name: name || "",
                number: number || "",
                createdAt: new Date().toISOString()
            });
            redirectUser(selectedRole);
        }
    } catch (error) {
        let msg = error.message;
        if (error.code === 'auth/invalid-credential') msg = 'Invalid email or password.';
        if (error.code === 'auth/email-already-in-use') msg = 'Email is already registered.';
        if (error.code === 'auth/weak-password') msg = 'Password should be at least 6 characters.';
        showError(msg);
    }
});

// Google Auth
googleBtn.addEventListener('click', async () => {
    hideError();
    try {
        const result = await signInWithPopup(auth, googleProvider);
        const user = result.user;
        
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            let data = docSnap.data();
            if (!data.name || !data.number) {
                let name = data.name || prompt("Please enter your Name:", user.displayName || "");
                let number = data.number || prompt("Please enter your Phone Number:");
                if(name) localStorage.setItem('userName', name);
                await setDoc(docRef, { ...data, name: name || "", number: number || "" });
            } else {
                localStorage.setItem('userName', data.name);
            }
            redirectUser(data.role);
        } else {
            let name = prompt("Please enter your Name:", user.displayName || "");
            let number = prompt("Please enter your Phone Number:");
            if(name) localStorage.setItem('userName', name);
            
            // New user, use the currently selected role in the UI
            await setDoc(docRef, {
                email: user.email,
                role: selectedRole,
                name: name || "",
                number: number || "",
                createdAt: new Date().toISOString()
            });
            redirectUser(selectedRole);
        }
    } catch (error) {
        showError(error.message);
    }
});
