import { db } from './firebase-config.js';
import { doc, setDoc, serverTimestamp, query, where, getDocs, updateDoc, arrayUnion, onSnapshot, collection } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let activeRaffle = null;
let participantCount = 0;

const titleEl = document.getElementById('raffleTitle');
const statusContainer = document.getElementById('statusContainer');
const submitBtn = document.getElementById('submitBtn');
const errorMsg = document.getElementById('errorMessage');
const form = document.getElementById('registerForm');

// Aktif çekilişi dinle
onSnapshot(doc(db, "status", "active_mainRaffle"), (statusDoc) => {
    if (statusDoc.exists() && statusDoc.data().activeId) {
        const activeData = statusDoc.data();
        
        // Detayları dinle
        const raffleUnsub = onSnapshot(doc(db, "mainRaffle", activeData.activeId), (raffleDoc) => {
            if (raffleDoc.exists()) {
                const data = raffleDoc.data();
                const users = data.users || [];
                participantCount = users.length;

                activeRaffle = {
                    ...activeData,
                    title: data.title || "Etkinlik Adı"
                };

                // UI Güncelle
                titleEl.textContent = activeRaffle.title;
                statusContainer.innerHTML = `
                  <div class="flex flex-col items-center gap-3 p-5 rounded-2xl bg-[#1a2942]/60 border border-green-500/20 backdrop-blur-md shadow-xl">
                    <div class="flex items-center gap-2">
                        <span class="relative flex h-3 w-3">
                            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span class="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                        </span>
                        <span class="text-xs font-bold text-green-400 tracking-widest uppercase">Kayıtlar Açık</span>
                    </div>
                    <div class="text-3xl font-bold text-white tracking-tighter">
                        ${participantCount} <span class="text-sm font-medium text-slate-400">Kişi Katıldı</span>
                    </div>
                  </div>
                `;
                submitBtn.disabled = false;
            }
        });
    } else {
        activeRaffle = null;
        titleEl.textContent = "Çekiliş Platformu";
        statusContainer.innerHTML = `
          <div class="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-red-500/10 border border-red-500/20 backdrop-blur-md">
            <span class="h-2 w-2 rounded-full bg-red-500 animate-pulse"></span>
            <span class="text-xs font-bold text-red-200 tracking-wide uppercase">Çekiliş Bekleniyor</span>
          </div>
        `;
        submitBtn.disabled = true;
    }
});

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    setLoading(true);
    errorMsg.classList.add('hidden');
    errorMsg.textContent = '';

    const name = document.getElementById('name').value.trim();
    const surname = document.getElementById('surname').value.trim();
    const email = document.getElementById('email').value.trim();
    const instagram = document.getElementById('instagram').value.trim();
    const genderEl = document.querySelector('input[name="gender"]:checked');
    const gender = genderEl ? genderEl.value : null;

    if (!activeRaffle?.activeId) {
        showError("Aktif çekiliş bulunamadı.");
        setLoading(false);
        return;
    }

    if (!gender) {
        showError("Lütfen cinsiyet seçimi yapınız.");
        setLoading(false);
        return;
    }

    try {
        const fullNameLower = name.toLowerCase();
        const surnameLower = surname.toLowerCase();

        // Mükerrer kontrolü
        const usersRef = query(collection(db, "users"), where("mainRaffleId", "==", activeRaffle.activeId));
        const querySnapshot = await getDocs(usersRef);
        
        let isDuplicate = false;
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            if (data.name.toLowerCase() === fullNameLower && data.surname.toLowerCase() === surnameLower) {
                isDuplicate = true;
            }
        });

        if (isDuplicate) throw new Error("Bu isimle zaten kayıt mevcut.");

        const newUserId = Date.now().toString(36) + Math.random().toString(36).slice(2);
        
        await setDoc(doc(db, "users", newUserId), {
            id: newUserId,
            name: name,
            surname: surname,
            instagram: instagram || null,
            email: email || null,
            gender: gender,
            mainRaffleId: activeRaffle.activeId,
            registeredAt: serverTimestamp()
        });

        await updateDoc(doc(db, "mainRaffle", activeRaffle.activeId), {
            users: arrayUnion(newUserId)
        });

        window.location.href = 'view.html';

    } catch (err) {
        showError(err.message || "Bir hata oluştu.");
    } finally {
        setLoading(false);
    }
});

function setLoading(isLoading) {
    if (isLoading) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = `
            <span class="flex items-center justify-center gap-2">
                <svg class="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                İşleniyor...
            </span>
        `;
    } else {
        submitBtn.disabled = false;
        submitBtn.textContent = 'ÇEKİLİŞE KATIL';
    }
}

function showError(msg) {
    errorMsg.textContent = msg;
    errorMsg.classList.remove('hidden');
}



