import { db, auth } from './firebase-config.js';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { collection, addDoc, serverTimestamp, query, orderBy, onSnapshot, doc, setDoc, deleteDoc, where, updateDoc, arrayUnion, arrayRemove, getDoc, writeBatch } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// State
let user = null;
let mainRaffles = [];
let mainTombolas = [];
let activeRaffleId = null;
let activeTombolaId = null;
let selectedRaffle = null;
let selectedTombola = null;
let prizes = [];
let participants = [];

// DOM Elements - Auth & Dashboard
const loadingScreen = document.getElementById('loadingScreen');
const loginSection = document.getElementById('loginSection');
const dashboardSection = document.getElementById('dashboardSection');
const loginForm = document.getElementById('loginForm');
const logoutBtn = document.getElementById('logoutBtn');
const dashboardMenu = document.getElementById('dashboardMenu');

// DOM Elements - Tabs
const tabRaffles = document.getElementById('tabRaffles');
const tabTombola = document.getElementById('tabTombola');

// DOM Elements - Raffles View
const rafflesListStep = document.getElementById('rafflesListStep');
const createRaffleForm = document.getElementById('createRaffleForm');
const rafflesContainer = document.getElementById('rafflesContainer');

// DOM Elements - Tombola View
const tombolaListStep = document.getElementById('tombolaListStep');
const createTombolaForm = document.getElementById('createTombolaForm');
const tombolaContainer = document.getElementById('tombolaContainer');

// DOM Elements - Raffle Detail
const raffleDetailStep = document.getElementById('raffleDetailStep');
const backToRaffleListBtn = document.getElementById('backToRaffleListBtn');
const detailTitle = document.getElementById('detailTitle');
const detailPrizeCount = document.getElementById('detailPrizeCount');
const detailUserCount = document.getElementById('detailUserCount');
const addTestUsersBtn = document.getElementById('addTestUsersBtn');
const addPrizeForm = document.getElementById('addPrizeForm');
const prizesList = document.getElementById('prizesList');
const participantSearch = document.getElementById('participantSearch');
const participantsList = document.getElementById('participantsList');
const participantFooter = document.getElementById('participantFooter');
const exportCsvBtn = document.getElementById('exportCsvBtn');

// DOM Elements - Multi Input
const tabDetail = document.getElementById('tabDetail');
const tabInstagram = document.getElementById('tabInstagram');
const modeDetail = document.getElementById('modeDetail');
const modeInstagram = document.getElementById('modeInstagram');
const descDetail = document.getElementById('descDetail');
const descInstagram = document.getElementById('descInstagram');
const inputNames = document.getElementById('inputNames');
const inputEmails = document.getElementById('inputEmails');
const inputGenders = document.getElementById('inputGenders');
const inputNicknamesOnly = document.getElementById('inputNicknamesOnly');
const processMultiInputBtn = document.getElementById('processMultiInputBtn');

// DOM Elements - Tombola Detail
const tombolaDetailStep = document.getElementById('tombolaDetailStep');
const backToTombolaListBtn = document.getElementById('backToTombolaListBtn');
const tombolaDetailTitle = document.getElementById('tombolaDetailTitle');
const drawTombolaBtn = document.getElementById('drawTombolaBtn');
const resetTombolaBtn = document.getElementById('resetTombolaBtn');
const tombolaGrid = document.getElementById('tombolaGrid');
const adminLastNumber = document.getElementById('adminLastNumber');

// INIT
let currentMode = 'detail'; // 'detail' | 'instagram'
let currentDashboardTab = 'raffles'; // 'raffles' | 'tombola'

// --- AUTH INIT ---
onAuthStateChanged(auth, (currentUser) => {
    user = currentUser;
    loadingScreen.classList.add('hidden');
    if (user) {
        loginSection.classList.add('hidden');
        dashboardSection.classList.remove('hidden');
        initDashboard();
    } else {
        loginSection.classList.remove('hidden');
        dashboardSection.classList.add('hidden');
    }
});

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    try {
        await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
        alert(error.message);
    }
});

logoutBtn.addEventListener('click', () => signOut(auth));

// --- DASHBOARD LOGIC ---
let unsubRaffles = null;
let unsubTombolas = null;
let unsubActiveRaffle = null;
let unsubActiveTombola = null;
let unsubPrizes = null;
let unsubUsers = null;
let unsubTombolaDetail = null;

function initDashboard() {
    // 1. Raffles Listener
    const qRaffle = query(collection(db, "mainRaffle"), orderBy("createdAt", "desc"));
    unsubRaffles = onSnapshot(qRaffle, (snapshot) => {
        mainRaffles = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderRafflesList();
    });

    // 2. Tombolas Listener
    const qTombola = query(collection(db, "tombolaEvents"), orderBy("createdAt", "desc"));
    unsubTombolas = onSnapshot(qTombola, (snapshot) => {
        mainTombolas = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderTombolaList();
    });

    // 3. Active Status Listeners
    unsubActiveRaffle = onSnapshot(doc(db, "status", "active_mainRaffle"), (doc) => {
        activeRaffleId = doc.exists() ? doc.data().activeId : null;
        renderRafflesList();
    });

    unsubActiveTombola = onSnapshot(doc(db, "status", "active_tombola"), (doc) => {
        activeTombolaId = doc.exists() ? doc.data().activeId : null;
        renderTombolaList();
    });
}

// --- TAB YÖNETİMİ ---
tabRaffles.addEventListener('click', () => switchTab('raffles'));
tabTombola.addEventListener('click', () => switchTab('tombola'));

function switchTab(tab) {
    currentDashboardTab = tab;
    if (tab === 'raffles') {
        tabRaffles.className = "bg-blue-600 text-white px-6 py-3 rounded-xl font-bold text-sm shadow-lg transition-all";
        tabTombola.className = "bg-[#1a2942] text-slate-400 hover:text-white px-6 py-3 rounded-xl font-bold text-sm border border-white/5 transition-all";
        rafflesListStep.classList.remove('hidden');
        tombolaListStep.classList.add('hidden');
    } else {
        tabTombola.className = "bg-pink-600 text-white px-6 py-3 rounded-xl font-bold text-sm shadow-lg transition-all";
        tabRaffles.className = "bg-[#1a2942] text-slate-400 hover:text-white px-6 py-3 rounded-xl font-bold text-sm border border-white/5 transition-all";
        tombolaListStep.classList.remove('hidden');
        rafflesListStep.classList.add('hidden');
    }
    // Detayları kapat
    raffleDetailStep.classList.add('hidden');
    tombolaDetailStep.classList.add('hidden');
    dashboardMenu.classList.remove('hidden');
    
    // Clear selections
    selectedRaffle = null;
    selectedTombola = null;
    if(unsubPrizes) unsubPrizes();
    if(unsubUsers) unsubUsers();
    if(unsubTombolaDetail) unsubTombolaDetail();
}

// =========================================================================
//                           ÇEKİLİŞ (RAFFLE) YÖNETİMİ
// =========================================================================

function renderRafflesList() {
    if (selectedRaffle) return; // Detaydaysak listeyi render etme

    rafflesContainer.innerHTML = mainRaffles.map(raffle => {
        const isActive = activeRaffleId === raffle.id;
        return `
            <div class="group relative bg-[#1a2942]/40 backdrop-blur-md rounded-2xl border p-6 transition-all duration-300 hover:-translate-y-1 ${isActive ? 'border-green-500/30 shadow-[0_0_20px_rgba(34,197,94,0.1)]' : 'border-white/5 hover:border-blue-500/30 hover:shadow-lg'}">
                <div class="flex justify-between items-start mb-6">
                    <div class="p-3 rounded-xl ${isActive ? 'bg-green-500/10 text-green-400' : 'bg-blue-500/10 text-blue-400'}">
                        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                    </div>
                    ${isActive ? `
                        <span class="flex items-center gap-1.5 bg-green-500/10 text-green-400 text-[10px] font-bold px-3 py-1.5 rounded-full border border-green-500/20">
                            <span class="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                            AKTİF
                        </span>
                    ` : `
                        <span class="bg-slate-700/30 text-slate-500 text-[10px] font-bold px-3 py-1.5 rounded-full border border-white/5">
                            PASİF
                        </span>
                    `}
                </div>
                
                <h3 class="font-bold text-xl text-white mb-8 truncate pr-2">${raffle.title}</h3>
                
                <div class="grid grid-cols-2 gap-3 text-xs font-bold">
                    <button 
                        data-action="open-raffle" data-id="${raffle.id}"
                        class="col-span-2 py-3 rounded-xl bg-blue-600/10 text-blue-300 border border-blue-500/20 hover:bg-blue-600/20 hover:border-blue-500/40 transition-all"
                    >
                        YÖNET & DETAYLAR
                    </button>
                    <button 
                        data-action="toggle-raffle" data-id="${raffle.id}"
                        class="py-3 rounded-xl border transition-all ${isActive ? 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20' : 'bg-green-500/10 text-green-400 border-green-500/20 hover:bg-green-500/20'}"
                    >
                        ${isActive ? 'DURDUR' : 'BAŞLAT'}
                    </button>
                    <button 
                        data-action="delete-raffle" data-id="${raffle.id}"
                        class="py-3 rounded-xl border border-slate-600/30 text-slate-400 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30 transition-all flex items-center justify-center"
                    >
                        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                </div>
            </div>
        `;
    }).join('');

    rafflesContainer.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const action = btn.dataset.action;
            const id = btn.dataset.id;
            const raffle = mainRaffles.find(r => r.id === id);
            
            if (action === 'open-raffle') openRaffleDetail(raffle);
            if (action === 'toggle-raffle') toggleActiveRaffle(raffle);
            if (action === 'delete-raffle') deleteRaffle(raffle.id);
        });
    });
}

createRaffleForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = document.getElementById('newEventTitle');
    const title = input.value.trim();
    if (!title) return;
    await addDoc(collection(db, "mainRaffle"), { title, createdAt: serverTimestamp(), users: [] });
    input.value = '';
});

async function toggleActiveRaffle(raffle) {
    const statusRef = doc(db, "status", "active_mainRaffle");
    if (activeRaffleId === raffle.id) await setDoc(statusRef, { activeId: null, title: null });
    else await setDoc(statusRef, { activeId: raffle.id, title: raffle.title });
}

async function deleteRaffle(id) {
    if(confirm("Bu etkinliği silmek istediğinize emin misiniz?")) {
        await deleteDoc(doc(db, "mainRaffle", id));
    }
}

// --- ÇEKİLİŞ DETAY ---
function openRaffleDetail(raffle) {
    selectedRaffle = raffle;
    
    dashboardMenu.classList.add('hidden');
    rafflesListStep.classList.add('hidden');
    raffleDetailStep.classList.remove('hidden');
    
    // UI Init
    detailTitle.textContent = selectedRaffle.title;
    
    // Subscribe Prizes
    const qPrizes = query(collection(db, "prizes"), where("mainRaffleId", "==", selectedRaffle.id));
    unsubPrizes = onSnapshot(qPrizes, (snapshot) => {
        const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        list.sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0));
        prizes = list;
        renderPrizes();
    });

    // Subscribe Users
    const qUsers = query(collection(db, "users"), where("mainRaffleId", "==", selectedRaffle.id));
    unsubUsers = onSnapshot(qUsers, (snapshot) => {
        participants = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderParticipants();
    });
}

backToRaffleListBtn.addEventListener('click', () => {
    selectedRaffle = null;
    if (unsubPrizes) unsubPrizes();
    if (unsubUsers) unsubUsers();
    
    raffleDetailStep.classList.add('hidden');
    rafflesListStep.classList.remove('hidden');
    dashboardMenu.classList.remove('hidden');
    renderRafflesList();
});

// =========================================================================
//                           TOMBOLA YÖNETİMİ
// =========================================================================

function renderTombolaList() {
    if (selectedTombola) return;

    tombolaContainer.innerHTML = mainTombolas.map(tombola => {
        const isActive = activeTombolaId === tombola.id;
        return `
            <div class="group relative bg-[#1a2942]/40 backdrop-blur-md rounded-2xl border p-6 transition-all duration-300 hover:-translate-y-1 ${isActive ? 'border-pink-500/30 shadow-[0_0_20px_rgba(236,72,153,0.1)]' : 'border-white/5 hover:border-pink-500/30 hover:shadow-lg'}">
                <div class="flex justify-between items-start mb-6">
                    <div class="p-3 rounded-xl ${isActive ? 'bg-pink-500/10 text-pink-400' : 'bg-purple-500/10 text-purple-400'}">
                        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" /></svg>
                    </div>
                    ${isActive ? `
                        <span class="flex items-center gap-1.5 bg-pink-500/10 text-pink-400 text-[10px] font-bold px-3 py-1.5 rounded-full border border-pink-500/20">
                            <span class="w-1.5 h-1.5 rounded-full bg-pink-500 animate-pulse"></span>
                            CANLI
                        </span>
                    ` : `
                        <span class="bg-slate-700/30 text-slate-500 text-[10px] font-bold px-3 py-1.5 rounded-full border border-white/5">
                            PASİF
                        </span>
                    `}
                </div>
                
                <h3 class="font-bold text-xl text-white mb-2 truncate pr-2">${tombola.title}</h3>
                <p class="text-xs text-slate-500 mb-8 font-mono">Çekilen Sayı: ${tombola.drawnNumbers ? tombola.drawnNumbers.length : 0}/90</p>
                
                <div class="grid grid-cols-2 gap-3 text-xs font-bold">
                    <button 
                        data-action="open-tombola" data-id="${tombola.id}"
                        class="col-span-2 py-3 rounded-xl bg-pink-600/10 text-pink-300 border border-pink-500/20 hover:bg-pink-600/20 hover:border-pink-500/40 transition-all"
                    >
                        OYUNU YÖNET
                    </button>
                    <button 
                        data-action="toggle-tombola" data-id="${tombola.id}"
                        class="py-3 rounded-xl border transition-all ${isActive ? 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20' : 'bg-green-500/10 text-green-400 border-green-500/20 hover:bg-green-500/20'}"
                    >
                        ${isActive ? 'DURDUR' : 'BAŞLAT'}
                    </button>
                    <button 
                        data-action="delete-tombola" data-id="${tombola.id}"
                        class="py-3 rounded-xl border border-slate-600/30 text-slate-400 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30 transition-all flex items-center justify-center"
                    >
                        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                </div>
            </div>
        `;
    }).join('');

    tombolaContainer.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const action = btn.dataset.action;
            const id = btn.dataset.id;
            const tombola = mainTombolas.find(t => t.id === id);
            
            if (action === 'open-tombola') openTombolaDetail(tombola);
            if (action === 'toggle-tombola') toggleActiveTombola(tombola);
            if (action === 'delete-tombola') deleteTombola(tombola.id);
        });
    });
}

createTombolaForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = document.getElementById('newTombolaTitle');
    const title = input.value.trim();
    if (!title) return;
    
    await addDoc(collection(db, "tombolaEvents"), { 
        title, 
        createdAt: serverTimestamp(), 
        drawnNumbers: [],
        lastNumber: null
    });
    input.value = '';
});

async function toggleActiveTombola(tombola) {
    const statusRef = doc(db, "status", "active_tombola");
    if (activeTombolaId === tombola.id) await setDoc(statusRef, { activeId: null });
    else await setDoc(statusRef, { activeId: tombola.id });
}

async function deleteTombola(id) {
    if(confirm("Bu tombola etkinliğini silmek istediğinize emin misiniz?")) {
        await deleteDoc(doc(db, "tombolaEvents", id));
    }
}

// --- TOMBOLA DETAY ---
function openTombolaDetail(tombola) {
    selectedTombola = tombola;
    
    dashboardMenu.classList.add('hidden');
    tombolaListStep.classList.add('hidden');
    tombolaDetailStep.classList.remove('hidden');
    
    tombolaDetailTitle.textContent = selectedTombola.title;
    
    // Realtime Listen
    unsubTombolaDetail = onSnapshot(doc(db, "tombolaEvents", tombola.id), (doc) => {
        if(doc.exists()) {
            selectedTombola = { id: doc.id, ...doc.data() };
            renderTombolaGrid();
        }
    });
}

backToTombolaListBtn.addEventListener('click', () => {
    selectedTombola = null;
    if(unsubTombolaDetail) unsubTombolaDetail();
    
    tombolaDetailStep.classList.add('hidden');
    tombolaListStep.classList.remove('hidden');
    dashboardMenu.classList.remove('hidden');
    renderTombolaList();
});

function renderTombolaGrid() {
    if(!tombolaGrid) return;
    
    const drawn = selectedTombola.drawnNumbers || [];
    const last = selectedTombola.lastNumber;

    let html = '';
    for(let i=1; i<=90; i++) {
        const isDrawn = drawn.includes(i);
        const isLast = last === i;
        
        let classes = 'tombola-cell';
        if(isDrawn) classes += ' active';
        if(isLast) classes += ' last';
        
        html += `<div class="${classes}">${i}</div>`;
    }
    tombolaGrid.innerHTML = html;
    
    if(adminLastNumber) {
        adminLastNumber.textContent = last || '-';
    }
}

drawTombolaBtn.addEventListener('click', async () => {
    if(!selectedTombola) return;

    const drawn = selectedTombola.drawnNumbers || [];
    
    // 1-90 arası çekilmemiş sayıları bul
    const available = [];
    for(let i=1; i<=90; i++) {
        if(!drawn.includes(i)) {
            available.push(i);
        }
    }
    
    if(available.length === 0) {
        return alert("Tüm sayılar çekildi!");
    }
    
    const randomIndex = Math.floor(Math.random() * available.length);
    const selected = available[randomIndex];

    await updateDoc(doc(db, "tombolaEvents", selectedTombola.id), {
        drawnNumbers: arrayUnion(selected),
        lastNumber: selected
    });
});

resetTombolaBtn.addEventListener('click', async () => {
    if(!selectedTombola) return;
    if(confirm('Tombola oyununu sıfırlamak istediğinize emin misiniz?')) {
        await updateDoc(doc(db, "tombolaEvents", selectedTombola.id), {
            drawnNumbers: [],
            lastNumber: null
        });
    }
});


// =========================================================================
//                           ÖDÜL EKLEME & YARDIMCILAR
// =========================================================================

addPrizeForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const titleEl = document.getElementById('newPrizeTitle');
    const qtyEl = document.getElementById('newPrizeQuantity');
    const resEl = document.getElementById('newPrizeReserveQuantity');
    const orderEl = document.getElementById('newPrizeOrder');
    
    if (!titleEl.value.trim()) return;

    await addDoc(collection(db, "prizes"), { 
        mainRaffleId: selectedRaffle.id, 
        title: titleEl.value.trim(), 
        quantity: parseInt(qtyEl.value) || 1,
        reserveQuantity: parseInt(resEl.value) || 1,
        order: parseInt(orderEl.value) || 999,
        winners: [], 
        reserves: [], 
        createdAt: serverTimestamp() 
    });
    
    titleEl.value = '';
    qtyEl.value = 1;
    resEl.value = 1;
    orderEl.value = '';
});


function renderPrizes() {
    detailPrizeCount.textContent = `Toplam ${prizes.length} Ödül Tanımlandı`;
    
    if (prizes.length === 0) {
        prizesList.innerHTML = `
            <div class="flex flex-col items-center justify-center py-16 border-2 border-dashed border-slate-700/30 rounded-3xl text-slate-500 bg-[#1a2942]/20">
                <svg class="w-5 h-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <p class="mt-2 text-sm font-medium">Henüz ödül eklenmedi.</p>
            </div>
        `;
        return;
    }

    // Ödülleri sıraya göre sırala
    const sortedPrizes = [...prizes].sort((a, b) => {
        const orderA = a.order || 999;
        const orderB = b.order || 999;
        return orderA - orderB;
    });
    
    prizesList.innerHTML = sortedPrizes.map((prize, index) => {
        const total = prize.quantity || 1;
        const drawn = prize.winners?.length || 0;
        const remaining = total - drawn;
        const isFinished = remaining <= 0;
        const reserveTotal = prize.reserveQuantity || 1;
        const reserveDrawn = prize.reserves?.length || 0;

        let winnersHtml = '';
        if (prize.winners?.length > 0 || prize.reserves?.length > 0) {
            winnersHtml = `
                <div class="bg-[#0B1726]/40 rounded-xl p-4 border border-white/5 space-y-3">
                    ${prize.winners?.map(uid => {
                        const u = participants.find(p => p.id === uid);
                        return u ? `
                            <div class="flex items-center gap-3 text-green-400 bg-green-500/10 p-3 rounded-lg border border-green-500/10">
                                <span class="text-lg">🏆</span>
                                <span class="font-bold text-sm">${u.name} ${u.surname} ${u.instagram ? `(${u.instagram})` : ''}</span>
                                <span class="ml-auto text-[10px] bg-green-500/20 px-2 py-1 rounded text-green-300 font-bold">KAZANAN</span>
                            </div>
                        ` : '';
                    }).join('')}
                    ${prize.reserves?.map((uid, i) => {
                        const u = participants.find(p => p.id === uid);
                        return u ? `
                            <div class="flex items-center gap-3 text-slate-300 bg-orange-500/5 p-3 rounded-lg border border-orange-500/20">
                                <span class="text-[10px] font-bold border border-orange-500/30 text-orange-400 px-1.5 py-0.5 rounded bg-orange-500/10">YEDEK ${i+1}</span>
                                <span class="text-sm font-medium flex-1">${u.name} ${u.surname} ${u.instagram ? `(${u.instagram})` : ''}</span>
                                <button data-action="remove-reserve" data-prize="${prize.id}" data-user="${uid}" class="px-3 py-1.5 text-xs font-bold bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg transition-all active:scale-95">Listeden Çıkar</button>
                            </div>
                        ` : '';
                    }).join('')}
                </div>
            `;
        }

        return `
            <div class="bg-[#1a2942]/40 border border-white/5 rounded-2xl p-6 hover:bg-[#1a2942]/60 transition-all group">
                <div class="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6">
                    <div class="flex items-center gap-4">
                        <div class="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-lg">${index + 1}</div>
                        <div>
                            <h3 class="font-bold text-lg text-white">${prize.title}</h3>
                            <div class="flex items-center gap-2 mt-1 flex-wrap">
                                <span class="text-[10px] bg-blue-500/10 text-blue-300 px-2 py-0.5 rounded border border-blue-500/10">ANA: ${total}</span>
                                <span class="text-[10px] bg-purple-500/10 text-purple-300 px-2 py-0.5 rounded border border-purple-500/10">ÇEKİLEN: ${drawn}</span>
                                <div class="flex items-center gap-1 bg-orange-500/10 px-2 py-0.5 rounded border border-orange-500/10">
                                    <span class="text-[10px] text-orange-300">YEDEK:</span>
                                    <input type="number" min="1" value="${reserveTotal}" 
                                        data-action="update-reserve-qty" data-id="${prize.id}"
                                        class="text-[10px] text-orange-300 bg-transparent border-none outline-none w-8 text-center font-bold">
                                </div>
                                <span class="text-[10px] bg-orange-500/10 text-orange-300 px-2 py-0.5 rounded border border-orange-500/10">YEDEK ÇEKİLEN: ${reserveDrawn}</span>
                            </div>
                        </div>
                    </div>
                    <div class="flex flex-col gap-2">
                        <select id="filter-${prize.id}" class="w-full bg-[#0B1726] border border-slate-600/30 text-xs text-slate-300 rounded-lg px-2 py-1 outline-none">
                            <option value="all">Filtre: Hepsi</option>
                            <option value="female">Filtre: Kadın</option>
                            <option value="male">Filtre: Erkek</option>
                        </select>
                        <div class="flex gap-3">
                            <button 
                                data-action="draw-asil" data-id="${prize.id}"
                                ${isFinished ? 'disabled' : ''}
                                class="px-5 py-2.5 rounded-lg font-bold text-xs transition-all shadow-md ${isFinished ? 'bg-slate-700/50 text-slate-500 cursor-not-allowed border border-white/5' : 'bg-amber-500 hover:bg-amber-400 text-black border border-amber-400/50'}"
                            >
                                ${isFinished ? 'TAMAMLANDI' : remaining > 1 ? `🎲 TOPLU ÇEK (${remaining})` : '🎲 ASİL ÇEK'}
                            </button>
                            <button 
                                data-action="draw-yedek" data-id="${prize.id}"
                                class="px-5 py-2.5 rounded-lg font-bold text-xs bg-[#0B1726] hover:bg-slate-800 text-slate-300 border border-slate-600/30 transition-all"
                            >
                                YEDEK ÇEK
                            </button>
                        </div>
                    </div>
                </div>
                ${winnersHtml}
            </div>
        `;
    }).join('');

    // Attach listeners
    prizesList.querySelectorAll('button[data-action="draw-asil"]').forEach(b => b.onclick = () => drawWinner(b.dataset.id, 'asil'));
    prizesList.querySelectorAll('button[data-action="draw-yedek"]').forEach(b => b.onclick = () => drawWinner(b.dataset.id, 'yedek'));
    prizesList.querySelectorAll('button[data-action="remove-reserve"]').forEach(b => b.onclick = () => removeFromReserves(b.dataset.prize, b.dataset.user));
    prizesList.querySelectorAll('input[data-action="update-reserve-qty"]').forEach(i => i.onblur = (e) => updateReserveQuantity(e.target.dataset.id, e.target.value));
}

// ... Diğer yardımcı fonksiyonlar (drawWinner, addTestUsers vs.) aynen kalabilir ...
// ... Sadece drawWinner kısmında view_mode güncellemesi kaldırılmalı ...

async function drawWinner(prizeId, type) {
    if (participants.length === 0) return alert("Katılımcı yok!");
    
    const filterSelect = document.getElementById(`filter-${prizeId}`);
    const filterValue = filterSelect ? filterSelect.value : 'all';

    let allWinners = [];
    prizes.forEach(p => { 
        if(p.winners) allWinners = [...allWinners, ...p.winners]; 
    });
    
    const excludedUsers = selectedRaffle.excludedUsers || [];
    
    let eligible = participants.filter(u => {
        if (allWinners.includes(u.id) || excludedUsers.includes(u.id)) return false;
        
        const gender = u.gender || 'prefer_not_to_say';
        if (filterValue === 'all') return true;
        if (filterValue === 'female') return gender === 'female' || gender === 'prefer_not_to_say';
        if (filterValue === 'male') return gender === 'male' || gender === 'prefer_not_to_say';
        return true;
    });

    if (eligible.length === 0) return alert("Kriterlere uygun katılımcı bulunamadı!");

    const currentPrize = prizes.find(p => p.id === prizeId);
    if (!currentPrize) return;

    let quantityToDraw = 1;
    if (type === 'asil') {
        const totalQty = currentPrize.quantity || 1;
        const drawnCount = currentPrize.winners?.length || 0;
        quantityToDraw = totalQty - drawnCount;
    } else {
        const reserveQty = currentPrize.reserveQuantity || 1;
        const reserveCount = currentPrize.reserves?.length || 0;
        quantityToDraw = reserveQty - reserveCount;
    }

    if (eligible.length < quantityToDraw) quantityToDraw = eligible.length;

    let luckyWinners = [];
    for (let i = 0; i < quantityToDraw; i++) {
        const randomIndex = Math.floor(Math.random() * eligible.length);
        luckyWinners.push(eligible[randomIndex]);
        eligible.splice(randomIndex, 1);
    }

    const prizeTitle = currentPrize.title;

    await setDoc(doc(db, "status", "live_draw"), { 
        status: 'drawing',
        countdown: 5,
        currentPrize: prizeTitle,
        drawType: type,
        quantity: quantityToDraw
    });

    setTimeout(async () => {
        const prizeRef = doc(db, "prizes", prizeId);
        const newWinnerIds = luckyWinners.map(w => w.id);
        const winnerNames = luckyWinners.map(w => {
            let name = `${w.name} ${w.surname}`.trim();
            if(w.instagram) name += ` (${w.instagram})`;
            return name;
        }).join(', ');
        const winnerEmails = luckyWinners.map(w => w.email || '').filter(e => e).join(', ');

        if (type === 'asil') {
            await updateDoc(prizeRef, { winners: arrayUnion(...newWinnerIds) });
        } else {
            await updateDoc(prizeRef, { reserves: arrayUnion(...newWinnerIds) });
        }

        await updateDoc(doc(db, "mainRaffle", selectedRaffle.id), { 
            lastWinner: { 
                name: winnerNames,
                email: winnerEmails,
                prize: prizeTitle,
                type: type,
                count: quantityToDraw
            } 
        });

        // Asil kazananları excludedUsers listesine ekle
        if (type === 'asil') {
            const raffleRef = doc(db, "mainRaffle", selectedRaffle.id);
            const raffleDoc = await getDoc(raffleRef);
            const currentRaffle = raffleDoc.exists() ? raffleDoc.data() : selectedRaffle;
            const currentExcluded = currentRaffle.excludedUsers || [];
            const excludedUsersWithPrizes = currentRaffle.excludedUsersWithPrizes || {};
            
            // Yeni kazananları excluded listesine ekle
            const updatedExcludedWithPrizes = { ...excludedUsersWithPrizes };
            newWinnerIds.forEach(id => {
                updatedExcludedWithPrizes[id] = prizeTitle;
            });
            
            await updateDoc(raffleRef, {
                excludedUsers: arrayUnion(...newWinnerIds),
                excludedUsersWithPrizes: updatedExcludedWithPrizes
            });
        }

        await setDoc(doc(db, "status", "live_draw"), { status: 'idle' });
    }, 5000);
}

// ... Eski Multi Input Logic ve Diğer Helperlar (Aynen Kalıyor) ...
tabDetail.addEventListener('click', () => switchMode('detail'));
tabInstagram.addEventListener('click', () => switchMode('instagram'));

function switchMode(mode) {
    currentMode = mode;
    if (mode === 'detail') {
        tabDetail.className = "px-3 py-1.5 rounded-md text-xs font-bold transition-all bg-blue-600 text-white shadow-lg";
        tabInstagram.className = "px-3 py-1.5 rounded-md text-xs font-bold text-slate-400 hover:text-white transition-all";
        modeDetail.classList.remove('hidden');
        descDetail.classList.remove('hidden');
        modeInstagram.classList.add('hidden');
        descInstagram.classList.add('hidden');
    } else {
        tabInstagram.className = "px-3 py-1.5 rounded-md text-xs font-bold transition-all bg-pink-600 text-white shadow-lg";
        tabDetail.className = "px-3 py-1.5 rounded-md text-xs font-bold text-slate-400 hover:text-white transition-all";
        modeInstagram.classList.remove('hidden');
        descInstagram.classList.remove('hidden');
        modeDetail.classList.add('hidden');
        descDetail.classList.add('hidden');
    }
}

processMultiInputBtn.addEventListener('click', async () => {
    const newUsers = [];
    
    if (currentMode === 'detail') {
        const rawNames = inputNames.value.split('\n');
        const rawEmails = inputEmails.value.split('\n');
        const rawGenders = inputGenders.value.split('\n');
        const maxLen = Math.max(rawNames.length, rawEmails.length, rawGenders.length);

        if (maxLen === 0 || (rawNames.length === 1 && !rawNames[0].trim())) {
            return alert("Lütfen isim listesine veri girin.");
        }

        for (let i = 0; i < maxLen; i++) {
            const nameSurname = (rawNames[i] || "").trim();
            const email = (rawEmails[i] || "").trim();
            const genderRaw = (rawGenders[i] || "").trim().toLowerCase();

            if (!nameSurname) continue;

            const nameParts = nameSurname.split(' ');
            const surname = nameParts.length > 1 ? nameParts.pop() : "";
            const name = nameParts.join(' ') || nameSurname;

            let gender = 'prefer_not_to_say';
            if (genderRaw.includes('erkek') || genderRaw === 'male' || genderRaw === 'e' || genderRaw === 'bay') gender = 'male';
            else if (genderRaw.includes('kadın') || genderRaw.includes('kadin') || genderRaw === 'female' || genderRaw === 'k' || genderRaw === 'bayan') gender = 'female';

            newUsers.push({
                id: Date.now().toString(36) + Math.random().toString(36).substr(2) + i,
                name,
                surname,
                email,
                instagram: '',
                gender,
                mainRaffleId: selectedRaffle.id,
                registeredAt: serverTimestamp()
            });
        }
    } else {
        const rawNicknames = inputNicknamesOnly.value.split('\n');
        
        if (rawNicknames.length === 0 || (rawNicknames.length === 1 && !rawNicknames[0].trim())) {
            return alert("Lütfen instagram kullanıcı adlarını girin.");
        }

        for (let i = 0; i < rawNicknames.length; i++) {
            const nickname = rawNicknames[i].trim();
            if (!nickname) continue;

            newUsers.push({
                id: Date.now().toString(36) + Math.random().toString(36).substr(2) + i,
                name: nickname, 
                surname: '',
                email: '',
                instagram: nickname,
                gender: 'prefer_not_to_say',
                mainRaffleId: selectedRaffle.id,
                registeredAt: serverTimestamp()
            });
        }
    }

    if (newUsers.length > 0) {
        if(confirm(`${newUsers.length} kişi eklenecek. Bu işlem biraz zaman alabilir. Onaylıyor musunuz?`)) {
            const batchSize = 450;
            const chunks = [];
            
            for (let i = 0; i < newUsers.length; i += batchSize) {
                chunks.push(newUsers.slice(i, i + batchSize));
            }

            try {
                const allUserIds = [];
                for (const chunk of chunks) {
                    const batch = writeBatch(db);
                    chunk.forEach(u => {
                        const ref = doc(db, "users", u.id);
                        batch.set(ref, u);
                        allUserIds.push(u.id);
                    });
                    await batch.commit();
                }

                await updateDoc(doc(db, "mainRaffle", selectedRaffle.id), { 
                    users: arrayUnion(...allUserIds) 
                });

                inputNames.value = '';
                inputEmails.value = '';
                inputGenders.value = '';
                inputNicknamesOnly.value = '';
                
                alert(`${newUsers.length} kişi başarıyla eklendi!`);
            } catch(e) {
                console.error(e);
                alert("Hata oluştu: " + e.message);
            }
        }
    }
});

// Helper Functions
async function removeFromReserves(prizeId, userId) {
    if (!confirm("Bu kişiyi yedek listesinden çıkarmak ve bir sonraki çekiliş için listeden çıkarmak istediğinize emin misiniz?")) return;
    
    const currentPrize = prizes.find(p => p.id === prizeId);
    const prizeTitle = currentPrize?.title || "";
    
    await updateDoc(doc(db, "prizes", prizeId), { reserves: arrayRemove(userId) });
    
    const raffleRef = doc(db, "mainRaffle", selectedRaffle.id);
    const raffleDoc = await getDoc(raffleRef);
    const currentRaffle = raffleDoc.exists() ? raffleDoc.data() : selectedRaffle;
    const currentExcluded = currentRaffle.excludedUsers || [];
    const excludedUsersWithPrizes = currentRaffle.excludedUsersWithPrizes || {};
    
    if (!currentExcluded.includes(userId)) {
        await updateDoc(raffleRef, {
            excludedUsers: arrayUnion(userId),
            excludedUsersWithPrizes: { ...excludedUsersWithPrizes, [userId]: prizeTitle }
        });
    }
}

async function updateReserveQuantity(prizeId, newQuantity) {
    const quantity = parseInt(newQuantity) || 1;
    if (quantity < 1) return alert("Yedek sayısı en az 1 olmalıdır!");
    await updateDoc(doc(db, "prizes", prizeId), { reserveQuantity: quantity });
}

participantSearch.addEventListener('input', () => renderParticipants());

function renderParticipants() {
    detailUserCount.textContent = participants.length;
    
    const term = participantSearch.value.toLowerCase();
    const filtered = participants.filter(p => 
        (p.name + ' ' + p.surname).toLowerCase().includes(term) ||
        (p.instagram || '').toLowerCase().includes(term)
    );

    if (filtered.length === 0) {
        participantsList.innerHTML = '<div class="text-center py-10 text-slate-500 text-xs">Sonuç bulunamadı.</div>';
    } else {
        participantsList.innerHTML = filtered.map((p, i) => `
            <div class="flex items-center justify-between p-3 bg-[#0B1726]/40 rounded-xl border border-white/5 hover:border-blue-500/30 hover:bg-[#0B1726]/60 transition-all group">
                <div class="flex items-center gap-3 overflow-hidden">
                    <span class="text-slate-600 text-[10px] font-mono w-5 pt-0.5">${i+1}</span>
                    <div class="truncate">
                        <div class="text-slate-200 text-xs font-bold truncate group-hover:text-white transition-colors">${p.name} ${p.surname}</div>
                        ${p.instagram ? `<div class="text-blue-400/50 text-[10px] truncate">${p.instagram}</div>` : ''}
                    </div>
                </div>
            </div>
        `).join('');
    }
    
    participantFooter.textContent = `Toplam ${filtered.length} kayıt listeleniyor`;
}

addTestUsersBtn.addEventListener('click', async () => {
    if (!confirm("100 adet test kullanıcısı eklemek istediğinize emin misiniz?")) return;
    
    const firstNames = ['Ahmet', 'Mehmet', 'Ali', 'Veli', 'Ayşe', 'Fatma', 'Zeynep', 'Elif', 'Can', 'Deniz'];
    const lastNames = ['Yılmaz', 'Kaya', 'Demir', 'Şahin', 'Çelik', 'Yıldız', 'Yıldırım', 'Öztürk', 'Aydın', 'Özdemir'];
    const genders = ['male', 'male', 'male', 'male', 'female', 'female', 'female', 'female', 'male', 'prefer_not_to_say']; 
    
    const newUserIds = [];
    const batch = writeBatch(db);
    
    try {
        for (let i = 0; i < 100; i++) {
            const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
            const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
            const gender = genders[Math.floor(Math.random() * genders.length)];
            const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@test.com`;
            const newUserId = Date.now().toString(36) + Math.random().toString(36).slice(2) + i;
            
            const userRef = doc(db, "users", newUserId);
            batch.set(userRef, {
                id: newUserId,
                name: firstName,
                surname: lastName,
                email: email,
                instagram: null,
                gender: gender,
                mainRaffleId: selectedRaffle.id,
                registeredAt: serverTimestamp()
            });
            newUserIds.push(newUserId);
        }
        await batch.commit();
        await updateDoc(doc(db, "mainRaffle", selectedRaffle.id), { users: arrayUnion(...newUserIds) });
        alert("100 test kullanıcısı eklendi!");
    } catch (e) { console.error(e); alert(e.message); }
});

exportCsvBtn.addEventListener('click', async () => {
    if (participants.length === 0) return alert("İndirilecek veri yok.");
    
    const raffleDoc = await getDoc(doc(db, "mainRaffle", selectedRaffle.id));
    const currentRaffle = raffleDoc.exists() ? raffleDoc.data() : selectedRaffle;
    const excludedUsers = currentRaffle.excludedUsers || [];
    const excludedUsersWithPrizes = currentRaffle.excludedUsersWithPrizes || {};
    
    const winners = participants.filter(p => {
        for (const prize of prizes) {
            if (prize.winners?.includes(p.id)) return true;
        }
        if (excludedUsers.includes(p.id)) return true;
        return false;
    });
    
    if (winners.length === 0) return alert("Ödül kazanan bulunamadı.");
    
    const winnersWithPrizes = winners.map(p => {
        let prizeName = "-";
        let prizeIndex = -1;
        
        for (let i = 0; i < prizes.length; i++) {
            const prize = prizes[i];
            if (prize.winners?.includes(p.id)) { 
                prizeName = prize.title; 
                prizeIndex = i;
                break; 
            }
        }
        
        if (prizeName === "-" && excludedUsers.includes(p.id)) {
            prizeName = excludedUsersWithPrizes[p.id] || "-";
            for (let i = 0; i < prizes.length; i++) {
                if (prizes[i].title === prizeName) {
                    prizeIndex = i;
                    break;
                }
            }
        }
        
        return { ...p, prizeName, prizeIndex };
    });
    
    winnersWithPrizes.sort((a, b) => {
        if (a.prizeIndex !== b.prizeIndex) return a.prizeIndex - b.prizeIndex;
        const nameA = `${a.name} ${a.surname}`.toLowerCase();
        const nameB = `${b.name} ${b.surname}`.toLowerCase();
        return nameA.localeCompare(nameB, 'tr');
    });
    
    const headers = "Ad,Soyad,E-posta,Instagram,Kazanılan Ödül\n";
    const rows = winnersWithPrizes.map(p => {
        const safeName = (p.name || "").replace(/,/g, " ");
        const safeSurname = (p.surname || "").replace(/,/g, " ");
        const safeEmail = (p.email || "-").replace(/,/g, " ");
        const safeInsta = (p.instagram || "-").replace(/,/g, " ");
        const safePrize = p.prizeName.replace(/,/g, " - ");
        return `${safeName},${safeSurname},${safeEmail},${safeInsta},${safePrize}`;
    }).join("\n");
    
    const csvContent = "data:text/csv;charset=utf-8," + "\uFEFF" + headers + rows;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${selectedRaffle.title}_Raporu.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
});