import { db } from './firebase-config.js';
import { doc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const loadingEl = document.getElementById('loading');
const mainContentEl = document.getElementById('mainContent');
const viewTitle = document.getElementById('viewTitle');
const viewLastNumber = document.getElementById('viewLastNumber');
const viewTombolaGrid = document.getElementById('viewTombolaGrid');

let currentTombolaState = { drawnNumbers: [], lastNumber: null };

// Aktif Tombala Etkinliğini Dinle
onSnapshot(doc(db, "status", "active_tombola"), (statusDoc) => {
    if (statusDoc.exists() && statusDoc.data().activeId) {
        const tombolaId = statusDoc.data().activeId;
        
        // Tombala Verisini Dinle
        onSnapshot(doc(db, "tombolaEvents", tombolaId), (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                
                loadingEl.classList.add('hidden');
                mainContentEl.classList.remove('hidden');
                viewTitle.textContent = data.title;

                // State Güncelleme ve Animasyon
                handleStateUpdate(data);
            }
        });
    } else {
        // Aktif tombala yok
        loadingEl.classList.remove('hidden');
        mainContentEl.classList.add('hidden');
        currentTombolaState = { drawnNumbers: [], lastNumber: null };
    }
});

function handleStateUpdate(newState) {
    const newLastNumber = newState.lastNumber;
    
    // Son sayı değiştiyse animasyon yap
    if (newLastNumber !== currentTombolaState.lastNumber && newLastNumber) {
        if(viewLastNumber) {
            viewLastNumber.style.transform = "scale(0.5)";
            viewLastNumber.style.opacity = "0";
            setTimeout(() => {
                viewLastNumber.textContent = newLastNumber;
                viewLastNumber.style.transform = "scale(1)";
                viewLastNumber.style.opacity = "1";
            }, 150);
        }
    } else if (!newLastNumber) {
        if(viewLastNumber) viewLastNumber.textContent = '-';
    }

    currentTombolaState = newState;
    renderGrid();
}

function renderGrid() {
    if(!viewTombolaGrid) return;

    let html = '';
    for(let i=1; i<=90; i++) {
        const isDrawn = currentTombolaState.drawnNumbers?.includes(i);
        const isLast = currentTombolaState.lastNumber === i;
        
        let classes = 'tombola-cell';
        if(isDrawn) classes += ' active';
        if(isLast) classes += ' last';
        
        html += `<div class="${classes}">${i}</div>`;
    }
    viewTombolaGrid.innerHTML = html;
}

