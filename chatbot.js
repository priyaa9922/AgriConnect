import { GoogleGenAI } from 'https://esm.run/@google/genai';
import { auth, db } from './firebase-config.js';
import { doc, getDoc, setDoc } from 'https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js';

const CHAT_STORAGE_KEY = 'agriconnect_chat_messages';
const API_KEY_STORAGE_KEY = 'agriconnect_gemini_api_key';

const SYSTEM_PROMPT = `You are a friendly, concise AgriConnect assistant. Help farmers and shop owners with stock availability, pricing, crop advisories, and farming tips. Keep replies short (2-3 sentences max). Be encouraging and helpful.`;

let chatMessages = [];
let geminiApiKey = 'AQ.Ab8RN6IMdrPNuko9lXOSM5x6gh2ekERStS_8wse8oEteRHLB5g';
let isTyping = false;
let isOpen = false;
let userDocRef = null;

// Inject CSS
const style = document.createElement('style');
style.textContent = `
    #agriChatWidget {
        position: fixed;
        bottom: 20px;
        right: 20px;
        width: 350px;
        height: 500px;
        background: #fff;
        border-radius: 16px;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
        display: none;
        flex-direction: column;
        z-index: 1000;
        overflow: hidden;
        font-family: 'Poppins', sans-serif;
        border: 1px solid #E5E7EB;
    }
    #agriChatWidget.active {
        display: flex;
        animation: chatSlideUp 0.3s ease-out forwards;
    }
    @keyframes chatSlideUp {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
    }
    #agriChatHeader {
        background: #2E7D32;
        color: white;
        padding: 15px 20px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-weight: 600;
    }
    #agriChatClose {
        background: transparent;
        border: none;
        color: white;
        cursor: pointer;
    }
    #agriChatClose svg {
        width: 20px;
        height: 20px;
    }
    #agriChatBody {
        flex: 1;
        padding: 15px;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 10px;
        background: #FDFBF7;
    }
    .agri-msg {
        max-width: 80%;
        padding: 10px 14px;
        border-radius: 12px;
        font-size: 14px;
        line-height: 1.4;
    }
    .agri-msg.user {
        background: #094b65;
        color: white;
        align-self: flex-end;
        border-bottom-right-radius: 4px;
    }
    .agri-msg.bot {
        background: #E8F5E9;
        color: #1b5e20;
        align-self: flex-start;
        border-bottom-left-radius: 4px;
        border: 1px solid #C8E6C9;
    }
    #agriChatInputContainer {
        padding: 15px;
        background: white;
        border-top: 1px solid #E5E7EB;
        display: flex;
        gap: 10px;
    }
    #agriChatInput {
        flex: 1;
        padding: 10px 15px;
        border: 1px solid #D1D5DB;
        border-radius: 20px;
        outline: none;
        font-size: 14px;
    }
    #agriChatInput:focus {
        border-color: #2E7D32;
    }
    #agriChatSend {
        background: #2E7D32;
        color: white;
        border: none;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        display: flex;
        justify-content: center;
        align-items: center;
        cursor: pointer;
        transition: 0.2s;
    }
    #agriChatSend:hover {
        background: #1b5e20;
    }
    #agriChatSend svg {
        width: 18px;
        height: 18px;
    }
    #agriApiKeyContainer {
        padding: 20px;
        display: flex;
        flex-direction: column;
        gap: 10px;
        height: 100%;
        justify-content: center;
        background: #FDFBF7;
    }
    #agriApiKeyInput {
        padding: 12px;
        border: 1px solid #ccc;
        border-radius: 8px;
        width: 100%;
    }
    #agriApiKeyBtn {
        padding: 12px;
        background: #2E7D32;
        color: white;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        font-weight: 600;
    }
    .agri-typing {
        display: flex;
        gap: 4px;
        padding: 10px 14px;
        background: #E8F5E9;
        border-radius: 12px;
        align-self: flex-start;
        border-bottom-left-radius: 4px;
        width: fit-content;
    }
    .agri-typing span {
        width: 6px;
        height: 6px;
        background: #2E7D32;
        border-radius: 50%;
        animation: typing 1s infinite;
    }
    .agri-typing span:nth-child(2) { animation-delay: 0.2s; }
    .agri-typing span:nth-child(3) { animation-delay: 0.4s; }
    @keyframes typing {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-4px); }
    }
`;
document.head.appendChild(style);

// Inject HTML
const chatWidget = document.createElement('div');
chatWidget.id = 'agriChatWidget';
chatWidget.innerHTML = `
    <div id="agriChatHeader">
        <div style="display: flex; align-items: center; gap: 8px;">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-sprout"><path d="M7 20h10"/><path d="M10 20c5.5-2.5.8-6.4 3-10"/><path d="M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8z"/><path d="M14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.6 4.3-1.4 1-1 1.6-2.3 1.7-4.6-2.7.1-4 1-4.9 2z"/></svg>
            AgriConnect Assistant
        </div>
        <button id="agriChatClose">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x"><line x1="18" x2="6" y1="6" y2="18"/><line x1="6" x2="18" y1="6" y2="18"/></svg>
        </button>
    </div>
    
    <div id="agriApiKeyContainer" style="display: none;">
        <h3 style="color: #2E7D32; font-size: 18px; margin-bottom: 5px;">Welcome!</h3>
        <p style="font-size: 14px; color: #4B5563;">To start chatting, please enter your Gemini API Key.</p>
        <input type="password" id="agriApiKeyInput" placeholder="Enter Gemini API Key...">
        <button id="agriApiKeyBtn">Save Key</button>
    </div>

    <div id="agriChatMain" style="display: none; flex-direction: column; flex: 1; overflow: hidden;">
        <div id="agriChatBody"></div>
        <div id="agriChatInputContainer">
            <input type="text" id="agriChatInput" placeholder="Ask about crops, stock, or prices...">
            <button id="agriChatSend">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-send"><path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z"/><path d="m21.854 2.147-10.94 10.939"/></svg>
            </button>
        </div>
    </div>
`;
document.body.appendChild(chatWidget);

// DOM Elements
const widget = document.getElementById('agriChatWidget');
const closeBtn = document.getElementById('agriChatClose');
const chatBody = document.getElementById('agriChatBody');
const chatInput = document.getElementById('agriChatInput');
const sendBtn = document.getElementById('agriChatSend');
const apiKeyContainer = document.getElementById('agriApiKeyContainer');
const chatMain = document.getElementById('agriChatMain');
const apiKeyInput = document.getElementById('agriApiKeyInput');
const apiKeyBtn = document.getElementById('agriApiKeyBtn');

// Load history
onAuthStateChanged(auth, async (user) => {
    if (user) {
        userDocRef = doc(db, 'users', user.uid, 'chatHistory', 'messages');
        try {
            const docSnap = await getDoc(userDocRef);
            if (docSnap.exists() && docSnap.data().messages) {
                chatMessages = docSnap.data().messages;
            } else {
                chatMessages = [{ role: 'bot', text: 'Namaste! 🌾 How can I assist you with your farming or shop today?' }];
            }
        } catch(e) {
            console.error("Failed to load chat history:", e);
            chatMessages = [{ role: 'bot', text: 'Namaste! 🌾 How can I assist you with your farming or shop today?' }];
        }
        if(isOpen) renderMessages();
    } else {
        userDocRef = null;
        chatMessages = [{ role: 'bot', text: 'Namaste! 🌾 How can I assist you with your farming or shop today?' }];
        if(isOpen) renderMessages();
    }
});

function renderMessages() {
    chatBody.innerHTML = '';
    chatMessages.forEach(msg => {
        const div = document.createElement('div');
        div.className = `agri-msg ${msg.role}`;
        div.textContent = msg.text;
        chatBody.appendChild(div);
    });
    chatBody.scrollTop = chatBody.scrollHeight;
}

function showTypingIndicator() {
    const div = document.createElement('div');
    div.className = 'agri-typing';
    div.id = 'agriTypingIndicator';
    div.innerHTML = '<span></span><span></span><span></span>';
    chatBody.appendChild(div);
    chatBody.scrollTop = chatBody.scrollHeight;
}

function removeTypingIndicator() {
    const el = document.getElementById('agriTypingIndicator');
    if (el) el.remove();
}

async function sendMessage() {
    const text = chatInput.value.trim();
    if (!text || isTyping) return;

    chatInput.value = '';
    chatMessages.push({ role: 'user', text });
    renderMessages();
    
    isTyping = true;
    showTypingIndicator();

    try {
        let reply = '';
        const keysToTry = [geminiApiKey];
        
        for (const key of keysToTry) {
            try {
                const ai = new GoogleGenAI({ apiKey: key });
                const historyText = chatMessages.slice(-10).map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.text}`).join('\n');
                
                // Note: The user requested 'gemini-3.6-flash' but that model doesn't exist yet, standard API is generateContent with 'gemini-1.5-flash' or 'gemini-2.5-flash'. 
                // We will use gemini-1.5-flash as it's the stable supported model in the GenAI SDK, but if you want 3.6 you can change it here.
                const response = await ai.models.generateContent({
                    model: 'gemini-1.5-flash',
                    contents: `${SYSTEM_PROMPT}\n\nConversation so far:\n${historyText}\n\nRespond to the user's latest message:`,
                });
                reply = response.text;
                break;
            } catch (e) {
                console.warn('Chat API key failed:', e?.message);
                continue;
            }
        }
        
        if (!reply) {
            reply = "I'm having trouble connecting right now. Please try again in a moment!";
        }
        chatMessages.push({ role: 'bot', text: reply });
    } catch (e) {
        console.error("Chat API Error:", e);
        chatMessages.push({ role: 'bot', text: "Sorry, something went wrong. Please try again!" });
    }

    isTyping = false;
    removeTypingIndicator();
    renderMessages();

    // Save to Firestore
    if (userDocRef) {
        try {
            await setDoc(userDocRef, { messages: chatMessages });
        } catch(e) {
            console.error("Failed to save chat to Firestore:", e);
        }
    }
}

// Event Listeners
sendBtn.addEventListener('click', sendMessage);
chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
});

closeBtn.addEventListener('click', () => {
    widget.classList.remove('active');
    isOpen = false;
});

apiKeyBtn.addEventListener('click', () => {
    const key = apiKeyInput.value.trim();
    if (key) {
        geminiApiKey = key;
        localStorage.setItem(API_KEY_STORAGE_KEY, key);
        apiKeyContainer.style.display = 'none';
        chatMain.style.display = 'flex';
        renderMessages();
    }
});

// Setup Toggle functionality (called from the parent page)
document.addEventListener('DOMContentLoaded', () => {
    const toggleBtn = document.getElementById('chatToggleBtn');
    if (toggleBtn) {
        // Change cursor to pointer for better UX
        toggleBtn.style.cursor = 'pointer';
        
        toggleBtn.addEventListener('click', () => {
            isOpen = !isOpen;
            if (isOpen) {
                widget.classList.add('active');
                
                if (geminiApiKey) {
                    apiKeyContainer.style.display = 'none';
                    chatMain.style.display = 'flex';
                    renderMessages();
                } else {
                    apiKeyContainer.style.display = 'flex';
                    chatMain.style.display = 'none';
                }
            } else {
                widget.classList.remove('active');
            }
        });
    }
});
