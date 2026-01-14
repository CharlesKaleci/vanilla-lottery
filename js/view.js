import { db } from './firebase-config.js';
import { doc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let activeRaffle = null;
let participantCount = 0;
let liveState = { status: 'idle', countdown: 0, currentPrize: '', drawType: '' };
let lastWinner = null;

const loadingEl = document.getElementById('loading');
const mainContentEl = document.getElementById('mainContent');
const viewTitleEl = document.getElementById('viewRaffleTitle');
const viewCountEl = document.getElementById('viewParticipantCount');
const stageArea = document.getElementById('stageArea');

// 1. Aktif Çekiliş ve Katılımcı Sayısını Dinle
onSnapshot(doc(db, "status", "active_mainRaffle"), (statusDoc) => {
    if (statusDoc.exists() && statusDoc.data().activeId) {
        const raffleId = statusDoc.data().activeId;
        
        // Çekiliş Detaylarını Dinle
        onSnapshot(doc(db, "mainRaffle", raffleId), (raffleDoc) => {
            if (raffleDoc.exists()) {
                const data = raffleDoc.data();
                activeRaffle = data;
                participantCount = data.users ? data.users.length : 0;
                
                // UI Güncelle
                loadingEl.classList.add('hidden');
                mainContentEl.classList.remove('hidden');
                viewTitleEl.textContent = activeRaffle.title;
                viewCountEl.textContent = participantCount;

                // Son kazanan değiştiyse güncelle
                if (data.lastWinner) {
                    lastWinner = data.lastWinner;
                }
                updateView();
            }
        });
    } else {
        activeRaffle = null;
        loadingEl.classList.remove('hidden');
        mainContentEl.classList.add('hidden');
    }
});

// 2. Canlı Çekiliş Durumunu Dinle
onSnapshot(doc(db, "status", "live_draw"), (docSnap) => {
    if (docSnap.exists()) {
        const newState = docSnap.data();
        
        // Eğer durumu değiştiyse veya countdown değiştiyse render et
        if (JSON.stringify(liveState) !== JSON.stringify(newState)) {
            liveState = newState;
            updateView();
            
            // Konfeti kontrolü
            if (liveState.status === 'idle' && lastWinner && lastWinner.type === 'asil') {
                fireConfetti();
            }
        }
    }
});

// Geri Sayım Mantığı
setInterval(() => {
    if (liveState.status === 'drawing' && liveState.countdown > 0) {
        liveState.countdown--;
        updateView(); 
    }
}, 1000);

function updateView() {
    renderLotteryStage();
}

function renderLotteryStage() {
    if (!activeRaffle) return;

    let html = '';
    const isAsil = liveState.drawType === 'asil';
    const displayAsil = lastWinner ? lastWinner.type === 'asil' : isAsil;

    // DURUM 1: ÇEKİLİŞ YAPILIYOR (GERİ SAYIM)
    if (liveState.status === 'drawing') {
        html = `
            <div class="animate-in zoom-in duration-300 flex flex-col items-center w-full">
                <div class="mb-4 md:mb-12 space-y-4 md:space-y-6 w-full">
                    <span class="px-4 py-1 md:px-6 md:py-2 rounded-lg font-bold tracking-[0.2em] md:tracking-[0.3em] uppercase text-xs md:text-sm shadow-2xl ${isAsil ? 'bg-yellow-500 text-black' : 'bg-blue-600 text-white'}">
                        ${isAsil ? '🏆 ASİL TALİHLİ ARANIYOR' : '🥈 YEDEK TALİHLİ ARANIYOR'}
                    </span>
                    <h1 class="text-3xl sm:text-5xl md:text-7xl font-bold text-white drop-shadow-2xl mt-4 px-2 break-words leading-tight">
                        ${liveState.currentPrize}
                    </h1>
                </div>

                <div class="relative mt-4 md:mt-8">
                    <div class="text-9xl sm:text-[10rem] md:text-[15rem] lg:text-[18rem] leading-none font-black tabular-nums tracking-tighter ${isAsil ? 'text-yellow-400' : 'text-blue-300'} drop-shadow-[0_0_50px_rgba(255,255,255,0.2)] animate-pulse transition-all duration-300">
                        ${liveState.countdown}
                    </div>
                    <div class="absolute inset-0 border-[6px] md:border-[10px] ${isAsil ? 'border-yellow-500' : 'border-blue-500'} rounded-full opacity-20 animate-ping"></div>
                </div>
            </div>
        `;
    }
    // DURUM 2: SONUÇ (KAZANAN VAR)
    else if (liveState.status === 'idle' && lastWinner) {
        const names = lastWinner.name.split(', ').slice(0, 10);
        const count = names.length;
        const isMultiple = count > 1;
        
        const badgeBg = displayAsil ? 'bg-yellow-500 text-black' : 'bg-blue-600 text-white';
        const borderColor = displayAsil ? 'border-yellow-500' : 'border-blue-500';
        const shadowColor = displayAsil ? 'shadow-yellow-500/20' : 'shadow-blue-500/20';
        
        // Font boyutu hesapla
        let fontSize = 'text-xs sm:text-sm md:text-sm lg:text-base';
        if (count === 1) fontSize = 'text-4xl sm:text-5xl md:text-7xl lg:text-8xl';
        else if (count === 2) fontSize = 'text-3xl sm:text-4xl md:text-6xl lg:text-7xl';
        else if (count === 3) fontSize = 'text-2xl sm:text-3xl md:text-5xl lg:text-6xl';
        else if (count <= 6) fontSize = 'text-base sm:text-lg md:text-2xl lg:text-3xl';

        let winnersHtml = '';
        if (isMultiple) {
            let itemsHtml = names.map((name, index) => {
                const isLastOdd = index === count - 1 && count % 2 === 1 && count > 1;
                const isYedek = lastWinner.type === 'yedek';
                
                return `
                    <div class="${fontSize} font-black text-white break-words leading-tight capitalize p-3 md:p-4 bg-white/5 rounded-xl border border-white/10 ${isLastOdd ? 'sm:col-span-2 sm:max-w-md sm:mx-auto' : ''}">
                        ${isYedek ? `<span class="text-sm text-slate-400 mr-2 font-normal">${index + 1}.</span>` : ''}
                        ${name.trim()}
                    </div>
                `;
            }).join('');
            
            winnersHtml = `
                <div class="w-full max-w-[95vw] md:max-w-5xl bg-[#1a2942]/80 backdrop-blur-xl p-4 md:p-8 rounded-[2rem] md:rounded-[3rem] border-2 ${borderColor} ${shadowColor} shadow-2xl transition-all">
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                        ${itemsHtml}
                    </div>
                </div>
            `;
        } else {
             winnersHtml = `
                <div class="w-full max-w-[95vw] md:max-w-4xl bg-[#1a2942]/80 backdrop-blur-xl p-8 md:p-16 rounded-[2rem] md:rounded-[3rem] border-2 ${borderColor} ${shadowColor} shadow-2xl transition-all">
                    <h1 class="${fontSize} font-black text-white mb-2 break-words leading-tight capitalize">
                        ${lastWinner.type === 'yedek' ? '<span class="text-xl text-slate-400 mr-2 font-normal">1.</span>' : ''}
                        ${names[0]}
                    </h1>
                </div>
            `;
        }

        html = `
            <div class="animate-in slide-in-from-bottom-10 fade-in duration-700 flex flex-col items-center w-full">
                <div class="mb-6 md:mb-10 w-full px-4">
                    <div class="inline-block px-6 py-2 md:px-8 md:py-3 rounded-xl text-sm md:text-xl font-black tracking-widest uppercase mb-4 shadow-2xl ${badgeBg}">
                        ${lastWinner.type === 'asil' ? '🎉 KAZANAN' : 'YEDEK TALİHLİ'}
                        ${isMultiple ? ` (${count} Kişi)` : ''}
                    </div>
                    <h2 class="text-xl md:text-4xl text-slate-300 font-light break-words px-4">${lastWinner.prize}</h2>
                </div>

                ${winnersHtml}
                
                <div class="mt-8 md:mt-12 text-slate-500 text-xs md:text-sm animate-pulse tracking-wide">
                    Yeni çekiliş için admin bekleniyor...
                </div>
            </div>
        `;
    }
    // DURUM 3: BAŞLANGIÇ (BOŞTA)
    else {
        html = `
             <div class="flex flex-col items-center opacity-50 px-4">
                <div class="w-16 h-16 md:w-24 md:h-24 rounded-full border-4 border-white/10 border-t-blue-500 animate-spin mb-6 md:mb-8"></div>
                <h1 class="text-2xl md:text-4xl font-light tracking-wider text-slate-400 text-center">
                    Çekiliş Başlamak Üzere
                </h1>
                <p class="mt-2 text-sm text-slate-600">Lütfen bekleyiniz</p>
             </div>
        `;
    }

    stageArea.innerHTML = html;
}

function fireConfetti() {
    const duration = 3000;
    const end = Date.now() + duration;
    (function frame() {
      confetti({ particleCount: 5, angle: 60, spread: 55, origin: { x: 0 }, colors: ['#FFD700', '#FFA500'] });
      confetti({ particleCount: 5, angle: 120, spread: 55, origin: { x: 1 }, colors: ['#0000FF', '#FFFFFF'] });
      if (Date.now() < end) requestAnimationFrame(frame);
    }());
}
