// UYGULAMA DURUMU (STATE)
let words = [];
let currentActiveTab = 'tab-add';

// OYUN DURUMLARI
let hangmanState = {
    word: null,
    guessedLetters: [],
    lives: 6
};

let matchingState = {
    selectedCard: null,
    moves: 0,
    matchedPairs: 0,
    totalPairs: 6
};

let flashcardState = {
    currentWord: null,
    score: 0,
    direction: 'en-tr' // 'en-tr' veya 'tr-en'
};

let mcState = {
    questions: [],
    currentIndex: 0,
    correctCount: 0,
    totalQuestions: 10,
    currentQuestion: null
};

// UYGULAMA BAŞLANGICI
document.addEventListener("DOMContentLoaded", () => {
    loadFromStorage();
    initDragAndDrop();
    updateDashboardStats();
    
    // Test kilidi durumunu güncelle
    checkMcTestLock();
    
    // Service Worker Kaydı (Çevrimdışı/Offline Çalışma için)
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('[PWA] Service Worker başarıyla kuruldu. Kapsam:', reg.scope))
            .catch(err => console.error('[PWA] Service Worker kurulum hatası:', err));
    }
});

// YEREL DEPOLAMA İŞLEMLERİ (LOCALSTORAGE)
function saveToStorage() {
    // Kelimeleri her zaman İngilizceye göre alfabetik olarak sıralıyoruz
    words.sort((a, b) => a.english.localeCompare(b.english, 'tr', { sensitivity: 'base' }));
    localStorage.setItem('kelime_dunyasi_words', JSON.stringify(words));
}

function loadFromStorage() {
    const stored = localStorage.getItem('kelime_dunyasi_words');
    if (stored) {
        try {
            words = JSON.parse(stored);
        } catch (e) {
            console.error("Depolama verisi okunamadı:", e);
            words = [];
        }
    } else {
        words = [];
    }
}

// İSTATİSTİK GÜNCELLEMELERİ
function updateDashboardStats() {
    const countElement = document.getElementById('total-words-count');
    if (countElement) {
        countElement.textContent = words.length;
    }
    checkMcTestLock();
}

// 5 ŞIKLI TEST KİLİT KONTROLÜ
function checkMcTestLock() {
    const mcCard = document.getElementById('card-multiple-choice');
    const lockBadge = document.getElementById('mc-lock-badge');
    const progressBar = document.getElementById('mc-progress-bar');
    const progressContainer = document.getElementById('mc-progress-container');
    const playBtnText = document.getElementById('mc-play-btn-text');
    const mcIconBg = document.getElementById('mc-icon-bg');

    if (!mcCard) return;

    const count = words.length;
    const required = 50;
    const percent = Math.min((count / required) * 100, 100);

    if (progressBar) {
        progressBar.style.width = `${percent}%`;
    }

    if (count >= required) {
        // Kilit Açık
        mcCard.classList.remove('locked');
        if (lockBadge) {
            lockBadge.textContent = "🔓 Aktif";
            lockBadge.style.background = "rgba(16, 185, 129, 0.15)";
            lockBadge.style.color = "#10b981";
            lockBadge.style.borderColor = "rgba(16, 185, 129, 0.25)";
        }
        if (playBtnText) {
            playBtnText.textContent = "Oyna →";
            playBtnText.style.color = "var(--secondary)";
        }
        if (mcIconBg) {
            mcIconBg.style.background = "linear-gradient(135deg, #11998e, #38ef7d)";
        }
    } else {
        // Kilitli
        mcCard.classList.add('locked');
        if (lockBadge) {
            lockBadge.textContent = `🔒 Kilitli (${count}/${required})`;
            lockBadge.style.background = "rgba(245, 158, 11, 0.15)";
            lockBadge.style.color = "#f59e0b";
            lockBadge.style.borderColor = "rgba(245, 158, 11, 0.25)";
        }
        if (playBtnText) {
            playBtnText.textContent = "Kilitli →";
            playBtnText.style.color = "var(--text-muted)";
        }
        if (mcIconBg) {
            mcIconBg.style.background = "linear-gradient(135deg, #4b5563, #1f2937)";
        }
    }
}

// ZAMAN DAMGASI OLUŞTURUCU
function getCurrentTimestamp() {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    return `${day}.${month}.${year} ${hours}:${minutes}:${seconds}`;
}

// SEKME GEÇİŞLERİ (TAB SWITCHER)
function switchTab(tabId, element) {
    // Tüm sekme içeriklerini gizle
    const tabs = document.querySelectorAll('.tab-content');
    tabs.forEach(tab => {
        tab.classList.remove('active');
        tab.style.display = 'none';
    });

    // Hedef sekmeyi göster
    const targetTab = document.getElementById(tabId);
    if (targetTab) {
        targetTab.style.display = 'block';
        setTimeout(() => {
            targetTab.classList.add('active');
        }, 10);
    }

    // Aktif nav butonunu güncelle
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => item.classList.remove('active'));
    if (element) {
        element.classList.add('active');
    }

    currentActiveTab = tabId;

    // Eğer kelime listesi sekmesine geçildiyse listeyi çiz
    if (tabId === 'tab-list') {
        renderWordList();
    }
    
    // Oyunları durdur ve menüye dön
    if (tabId === 'tab-games') {
        quitGame();
    }
}

// EKLEME METODU SEÇİCİ (MANUEL / DOSYA / PASTE)
function switchInsertMethod(method) {
    const tabs = document.querySelectorAll('.method-tab');
    tabs.forEach(tab => tab.classList.remove('active'));

    const contents = document.querySelectorAll('.method-content');
    contents.forEach(content => content.classList.remove('active'));

    // Aktifleştir
    const clickedTab = Array.from(tabs).find(t => t.getAttribute('onclick').includes(method));
    if (clickedTab) clickedTab.classList.add('active');

    const targetContent = document.getElementById(`method-${method}`);
    if (targetContent) targetContent.classList.add('active');
}

// 1. MANUEL KELİME EKLEME
function addWordManual() {
    const engInput = document.getElementById('input-english');
    const trInput = document.getElementById('input-turkish');

    const eng = engInput.value.trim();
    const tr = trInput.value.trim();

    if (!eng || !tr) {
        alert("Lütfen hem İngilizce kelimeyi hem de Türkçe anlamını doldurun.");
        return;
    }

    // Kayıt oluştur
    const newWord = {
        english: eng,
        turkish: tr,
        timestamp: getCurrentTimestamp()
    };

    words.push(newWord);
    saveToStorage();
    updateDashboardStats();

    // Girişleri sıfırla
    engInput.value = '';
    trInput.value = '';
    engInput.focus();

    // Başarı efekti
    showSuccessToast(`"${eng}" listeye eklendi!`);
}

// 2. KOPYALA-YAPISTIR İLE KELİME EKLEME
function importFromPaste() {
    const pasteArea = document.getElementById('paste-area');
    const text = pasteArea.value.trim();

    if (!text) {
        alert("Lütfen kopyaladığınız kelimeleri kutuya yapıştırın.");
        return;
    }

    const lines = text.split('\n');
    let addedCount = 0;
    const timestamp = getCurrentTimestamp();

    lines.forEach(line => {
        // Tab veya birden fazla boşluk ile ayrıştır
        let parts = line.split('\t');
        if (parts.length < 2) {
            parts = line.split(/ {2,}/); // En az iki boşluğa göre ayır
        }

        if (parts.length >= 2) {
            const eng = parts[0].trim();
            const tr = parts[1].trim();

            if (eng && tr && !eng.toLowerCase().includes('ingilizce') && !eng.toLowerCase().includes('english')) {
                words.push({
                    english: eng,
                    turkish: tr,
                    timestamp: timestamp
                });
                addedCount++;
            }
        }
    });

    if (addedCount > 0) {
        saveToStorage();
        updateDashboardStats();
        pasteArea.value = '';
        alert(`${addedCount} adet kelime başarıyla listeye aktarıldı!`);
    } else {
        alert("Geçerli bir kelime yapısı bulunamadı. Lütfen aralarında tab/boşluk olan iki sütun şeklinde yapıştırdığınızdan emin olun.");
    }
}

// 3. DOSYA YÜKLEME VE SÜRÜKLE-BIRAK İŞLEMLERİ
function initDragAndDrop() {
    const dropZone = document.getElementById('drop-zone');
    if (!dropZone) return;

    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, (e) => {
            e.preventDefault();
            dropZone.classList.add('dragover');
        }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, (e) => {
            e.preventDefault();
            dropZone.classList.remove('dragover');
        }, false);
    });

    dropZone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        if (files.length > 0) {
            handleFileUpload(files[0]);
        }
    }, false);
}

function handleFileSelect(event) {
    const files = event.target.files;
    if (files.length > 0) {
        handleFileUpload(files[0]);
    }
}

function handleFileUpload(file) {
    const fileInfo = document.getElementById('file-info');
    if (fileInfo) {
        fileInfo.textContent = `Okunuyor: ${file.name}...`;
    }

    const ext = file.name.split('.').pop().toLowerCase();

    if (ext === 'docx') {
        parseWordFile(file);
    } else if (ext === 'xlsx' || ext === 'xls' || ext === 'csv') {
        parseExcelFile(file);
    } else {
        alert("Desteklenmeyen dosya formatı. Lütfen .docx, .xlsx, .xls veya .csv dosyası yükleyin.");
        if (fileInfo) fileInfo.textContent = '';
    }
}

// Word Dosyası (.docx) Ayrıştırıcı
function parseWordFile(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        const arrayBuffer = e.target.result;
        mammoth.convertToHtml({ arrayBuffer: arrayBuffer })
            .then(function(result) {
                const html = result.value;
                const doc = new DOMParser().parseFromString(html, 'text/html');
                const rows = doc.querySelectorAll('tr');
                let newWords = [];
                const timestamp = getCurrentTimestamp();

                rows.forEach(row => {
                    const cols = row.querySelectorAll('td');
                    if (cols.length >= 2) {
                        const eng = cols[0].textContent.trim();
                        const tr = cols[1].textContent.trim();
                        
                        // Başlık satırı kontrolü
                        if (eng && tr && !eng.toLowerCase().includes('ingilizce') && !eng.toLowerCase().includes('english') && !tr.toLowerCase().includes('türkçe')) {
                            newWords.push({
                                english: eng,
                                turkish: tr,
                                timestamp: timestamp
                            });
                        }
                    }
                });

                if (newWords.length > 0) {
                    words.push(...newWords);
                    saveToStorage();
                    updateDashboardStats();
                    alert(`${newWords.length} kelime Word tablosundan başarıyla yüklendi!`);
                } else {
                    alert("Word dosyasında uygun bir tablo bulunamadı. Lütfen kelimelerin resimdeki gibi tablo halinde olduğundan emin olun.");
                }
                document.getElementById('file-info').textContent = '';
            })
            .catch(function(err) {
                console.error(err);
                alert("Word dosyası okunurken bir hata oluştu.");
                document.getElementById('file-info').textContent = '';
            });
    };
    reader.readAsArrayBuffer(file);
}

// Excel ve CSV Dosyası Ayrıştırıcı
function parseExcelFile(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        const data = new Uint8Array(e.target.result);
        try {
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            
            let newWords = [];
            const timestamp = getCurrentTimestamp();

            json.forEach(row => {
                if (row.length >= 2) {
                    const eng = String(row[0]).trim();
                    const tr = String(row[1]).trim();

                    if (eng && tr && eng !== "undefined" && tr !== "undefined" && !eng.toLowerCase().includes('ingilizce') && !eng.toLowerCase().includes('english')) {
                        newWords.push({
                            english: eng,
                            turkish: tr,
                            timestamp: timestamp
                        });
                    }
                }
            });

            if (newWords.length > 0) {
                words.push(...newWords);
                saveToStorage();
                updateDashboardStats();
                alert(`${newWords.length} kelime Excel tablosundan başarıyla yüklendi!`);
            } else {
                alert("Excel dosyasında kelime verisi bulunamadı.");
            }
        } catch (err) {
            console.error(err);
            alert("Excel dosyası okunurken hata oluştu.");
        }
        document.getElementById('file-info').textContent = '';
    };
    reader.readAsArrayBuffer(file);
}

// KELİME LİSTESİNİ ÇİZME (RENDER)
function renderWordList() {
    const container = document.getElementById('words-list-container');
    const searchVal = document.getElementById('list-search').value.toLowerCase().trim();

    if (!container) return;

    if (words.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <span class="empty-icon">📂</span>
                <p>Henüz kelime eklenmedi.</p>
            </div>
        `;
        return;
    }

    // Kelimeleri filtrele
    const filtered = words.filter(w => 
        w.english.toLowerCase().includes(searchVal) || 
        w.turkish.toLowerCase().includes(searchVal)
    );

    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <span class="empty-icon">🔍</span>
                <p>Aramaya uygun kelime bulunamadı.</p>
            </div>
        `;
        return;
    }

    // Listeyi oluştur
    let html = '';
    filtered.forEach((w, index) => {
        // Ana dizideki gerçek indexini bul
        const realIndex = words.findIndex(x => x.english === w.english && x.turkish === w.turkish);
        html += `
            <div class="word-row">
                <div class="word-eng">${escapeHtml(w.english)}</div>
                <div class="word-tr">${escapeHtml(w.turkish)}</div>
                <div class="word-date">${w.timestamp || '-'}</div>
                <div style="display: flex; justify-content: center;">
                    <button class="btn-delete-row" onclick="deleteWord(${realIndex})" title="Kelimeyi Sil">🗑️</button>
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
}

// KELİME SİLME
function deleteWord(index) {
    if (confirm("Bu kelimeyi silmek istediğinize emin misiniz?")) {
        words.splice(index, 1);
        saveToStorage();
        updateDashboardStats();
        renderWordList();
        showSuccessToast("Kelime silindi.");
    }
}

// HTML ESCAPER (XSS Koruması için)
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}

// HIZLI GERİ BİLDİRİM BİLGİSİ (TOAST)
function showSuccessToast(message) {
    const toast = document.createElement('div');
    toast.style.position = 'fixed';
    toast.style.bottom = '80px';
    toast.style.left = '50%';
    toast.style.transform = 'translateX(-50%)';
    toast.style.background = 'rgba(16, 185, 129, 0.95)';
    toast.style.color = '#fff';
    toast.style.padding = '8px 16px';
    toast.style.borderRadius = '10px';
    toast.style.fontSize = '12px';
    toast.style.fontWeight = '600';
    toast.style.zIndex = '1000';
    toast.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
    toast.style.transition = 'opacity 0.3s ease';
    toast.textContent = message;

    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 1800);
}

// -------------------------------------------------------------
// OYUN ALANLARI VE MANTIKLARI
// -------------------------------------------------------------

// OYUNA BAŞLAMA SEÇİCİSİ
function startGame(gameKey) {
    if (words.length < 5) {
        alert("Oyun oynayabilmek için listenizde en az 5 kelime bulunmalıdır.");
        return;
    }

    // Oyun seçim menüsünü gizle
    document.getElementById('games-menu').style.display = 'none';

    // Tüm oyun sahnelerini gizle
    document.querySelectorAll('.game-stage').forEach(stage => {
        stage.classList.remove('active');
        stage.style.display = 'none';
    });

    // Seçilen oyun sahnesini göster
    const stage = document.getElementById(`game-stage-${gameKey}`);
    if (stage) {
        stage.style.display = 'block';
        stage.classList.add('active');
    }

    // Oyunu başlat
    if (gameKey === 'hangman') {
        initHangmanGame();
    } else if (gameKey === 'matching') {
        initMatchingGame();
    } else if (gameKey === 'flashcards') {
        initFlashcardGame();
    }
}

// 5 ŞIKLI TESTİ BAŞLAT
function startMultipleChoiceGame() {
    if (words.length < 50) {
        alert(`Bu testi çözebilmek için en az 50 kelime yüklemeniz gerekir. Şu anki kelime sayınız: ${words.length}`);
        return;
    }

    document.getElementById('games-menu').style.display = 'none';
    
    const stage = document.getElementById('game-stage-multiple-choice');
    stage.style.display = 'block';
    stage.classList.add('active');
    
    initMultipleChoiceGame();
}

// OYUNDAN ÇIK / MENÜYE DÖN
function quitGame() {
    document.getElementById('games-menu').style.display = 'grid';
    document.querySelectorAll('.game-stage').forEach(stage => {
        stage.classList.remove('active');
        stage.style.display = 'none';
    });
    
    // Popup bildirimlerini de temizle
    document.querySelectorAll('.game-popup-result').forEach(pop => {
        pop.classList.remove('active');
    });
}

// -------------------- 1. ADAM ASMACA OYUNU --------------------
function initHangmanGame() {
    // Popupları gizle
    document.getElementById('hangman-result').classList.remove('active');
    
    // Rastgele kelime seç
    const randomWordObj = words[Math.floor(Math.random() * words.length)];
    hangmanState.word = randomWordObj.english.toLowerCase().replace(/[^a-z ]/g, ''); // Sadece harfler ve boşluk
    hangmanState.hint = randomWordObj.turkish;
    hangmanState.guessedLetters = [];
    hangmanState.lives = 6;

    // Arayüzü güncelle
    document.getElementById('hangman-lives').textContent = hangmanState.lives;
    document.getElementById('hangman-hint').textContent = hangmanState.hint;
    
    // SVG Çizimini temizle (Sadece darağacı kalacak, vücut parçaları gizlenecek)
    document.querySelectorAll('.hm-part').forEach(part => {
        part.style.display = 'none';
    });

    renderHangmanWord();
    renderHangmanKeyboard();
}

function renderHangmanWord() {
    const container = document.getElementById('hangman-word-display');
    container.innerHTML = '';
    
    const word = hangmanState.word;
    for (let char of word) {
        if (char === ' ') {
            const space = document.createElement('div');
            space.style.width = '20px';
            container.appendChild(space);
        } else {
            const slot = document.createElement('span');
            slot.classList.add('letter-slot');
            
            // Eğer harf tahmin edildiyse göster
            if (hangmanState.guessedLetters.includes(char)) {
                slot.textContent = char;
            } else {
                slot.textContent = '';
            }
            container.appendChild(slot);
        }
    }
}

function renderHangmanKeyboard() {
    const container = document.getElementById('hangman-keyboard');
    container.innerHTML = '';
    
    const letters = 'abcdefghijklmnopqrstuvwxyz';
    for (let letter of letters) {
        const btn = document.createElement('button');
        btn.classList.add('key');
        btn.textContent = letter;
        btn.onclick = () => makeHangmanGuess(letter, btn);
        container.appendChild(btn);
    }
}

function makeHangmanGuess(letter, buttonElement) {
    if (hangmanState.guessedLetters.includes(letter) || hangmanState.lives <= 0) return;

    hangmanState.guessedLetters.push(letter);
    buttonElement.classList.add('used');

    if (hangmanState.word.includes(letter)) {
        buttonElement.classList.add('correct');
        renderHangmanWord();
        checkHangmanWin();
    } else {
        buttonElement.classList.add('wrong');
        hangmanState.lives--;
        document.getElementById('hangman-lives').textContent = hangmanState.lives;
        
        // Asılan adam çizimini güncelle
        drawHangmanPart();
        checkHangmanLose();
    }
}

function drawHangmanPart() {
    const parts = ['hm-head', 'hm-body', 'hm-arm-l', 'hm-arm-r', 'hm-leg-l', 'hm-leg-r'];
    const partToDrawIndex = 6 - hangmanState.lives - 1;
    if (partToDrawIndex >= 0 && partToDrawIndex < parts.length) {
        const element = document.getElementById(parts[partToDrawIndex]);
        if (element) element.style.display = 'block';
    }
}

function checkHangmanWin() {
    const word = hangmanState.word;
    const won = [...word].every(char => char === ' ' || hangmanState.guessedLetters.includes(char));
    
    if (won) {
        confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 }
        });
        showHangmanResult(true);
    }
}

function checkHangmanLose() {
    if (hangmanState.lives <= 0) {
        showHangmanResult(false);
    }
}

function showHangmanResult(isWin) {
    const popup = document.getElementById('hangman-result');
    const title = document.getElementById('hangman-result-title');
    const text = document.getElementById('hangman-result-text');

    if (isWin) {
        title.textContent = "Tebrikler! 🎉";
        title.style.color = "var(--success)";
        text.innerHTML = `Kelimeyi başarıyla bildiniz!<br>Kelime: <strong>${hangmanState.word.toUpperCase()}</strong>`;
    } else {
        title.textContent = "Kaybettiniz! 💀";
        title.style.color = "var(--danger)";
        text.innerHTML = `Maalesef hakkınız tükendi.<br>Doğru Kelime: <strong>${hangmanState.word.toUpperCase()}</strong>`;
    }
    popup.classList.add('active');
}

// -------------------- 2. KELİME EŞLEŞTİRME OYUNU --------------------
function initMatchingGame() {
    document.getElementById('matching-result').classList.remove('active');
    matchingState.moves = 0;
    matchingState.matchedPairs = 0;
    matchingState.selectedCard = null;

    document.getElementById('matching-moves').textContent = matchingState.moves;

    // Kelimeler içinden rastgele 6 kelime seç
    const shuffledWords = [...words].sort(() => 0.5 - Math.random());
    const selected = shuffledWords.slice(0, 6);

    // Kart çiftlerini oluştur
    let cards = [];
    selected.forEach(w => {
        cards.push({ id: w.english, text: w.english, type: 'en' });
        cards.push({ id: w.english, text: w.turkish, type: 'tr' });
    });

    // Kartları karıştır
    cards.sort(() => 0.5 - Math.random());

    // Kartları çiz
    const grid = document.getElementById('matching-grid');
    grid.innerHTML = '';

    cards.forEach(card => {
        const div = document.createElement('div');
        div.classList.add('matching-card');
        div.textContent = card.text;
        div.dataset.id = card.id;
        div.dataset.type = card.type;
        div.onclick = () => selectMatchingCard(div);
        grid.appendChild(div);
    });
}

function selectMatchingCard(cardEl) {
    if (cardEl.classList.contains('matched') || cardEl.classList.contains('selected')) return;

    // Hatalı eşleşen kartların geçiş sürecindeysek tıklamaya izin verme
    const incorrectCards = document.querySelectorAll('.matching-card.incorrect');
    if (incorrectCards.length > 0) return;

    cardEl.classList.add('selected');

    if (!matchingState.selectedCard) {
        // İlk kart seçildi
        matchingState.selectedCard = cardEl;
    } else {
        // İkinci kart seçildi
        const firstCard = matchingState.selectedCard;
        const secondCard = cardEl;
        matchingState.moves++;
        document.getElementById('matching-moves').textContent = matchingState.moves;

        if (firstCard.dataset.id === secondCard.dataset.id && firstCard.dataset.type !== secondCard.dataset.type) {
            // Eşleşme Başarılı
            firstCard.classList.remove('selected');
            secondCard.classList.remove('selected');
            firstCard.classList.add('matched');
            secondCard.classList.add('matched');

            matchingState.matchedPairs++;
            matchingState.selectedCard = null;

            // Küçük konfeti efekti
            confetti({
                particleCount: 20,
                angle: 60,
                spread: 55,
                origin: { x: 0 }
            });
            confetti({
                particleCount: 20,
                angle: 120,
                spread: 55,
                origin: { x: 1 }
            });

            if (matchingState.matchedPairs === matchingState.totalPairs) {
                // Oyun Bitti
                setTimeout(() => {
                    confetti({
                        particleCount: 150,
                        spread: 80,
                        origin: { y: 0.6 }
                    });
                    document.getElementById('matching-final-moves').textContent = matchingState.moves;
                    document.getElementById('matching-result').classList.add('active');
                }, 500);
            }
        } else {
            // Eşleşme Hatalı
            firstCard.classList.remove('selected');
            secondCard.classList.remove('selected');
            firstCard.classList.add('incorrect');
            secondCard.classList.add('incorrect');

            setTimeout(() => {
                firstCard.classList.remove('incorrect');
                secondCard.classList.remove('incorrect');
                matchingState.selectedCard = null;
            }, 1000);
        }
    }
}

// -------------------- 3. SORU-CEVAP OYUNU (FLASHCARDS) --------------------
function initFlashcardGame() {
    flashcardState.score = 0;
    document.getElementById('flashcard-score').textContent = flashcardState.score;
    
    // Yön tercihini al
    flashcardState.direction = document.getElementById('flashcard-mode').value;

    loadNextFlashcard();
}

function loadNextFlashcard() {
    // Kartın çevrilmiş halini sıfırla
    const box = document.getElementById('flashcard-flip-box');
    if (box) box.classList.remove('flipped');

    // Rastgele bir kelime seç
    const randomWordObj = words[Math.floor(Math.random() * words.length)];
    flashcardState.currentWord = randomWordObj;

    const qText = document.getElementById('flashcard-question-text');
    const aText = document.getElementById('flashcard-answer-text');
    const frontLabel = document.getElementById('fc-front-label');
    const backLabel = document.getElementById('fc-back-label');

    if (flashcardState.direction === 'en-tr') {
        qText.textContent = randomWordObj.english;
        aText.textContent = randomWordObj.turkish;
        frontLabel.textContent = "İNGİLİZCE KELİME";
        backLabel.textContent = "TÜRKÇE ANLAMI";
    } else {
        qText.textContent = randomWordObj.turkish;
        aText.textContent = randomWordObj.english;
        frontLabel.textContent = "TÜRKÇE ANLAMI";
        backLabel.textContent = "İNGİLİZCE KARŞILIĞI";
    }
}

function flipFlashcard() {
    const box = document.getElementById('flashcard-flip-box');
    if (box) {
        box.classList.toggle('flipped');
    }
}

function nextFlashcard(isCorrect) {
    if (isCorrect) {
        flashcardState.score++;
        document.getElementById('flashcard-score').textContent = flashcardState.score;
        showSuccessToast("Harika! 🌟");
    }

    // Kısa gecikmeyle yeni karta geç (kart düzeldikten sonra)
    const box = document.getElementById('flashcard-flip-box');
    if (box && box.classList.contains('flipped')) {
        box.classList.remove('flipped');
        setTimeout(() => {
            loadNextFlashcard();
        }, 300);
    } else {
        loadNextFlashcard();
    }
}

// -------------------- 4. 5 ŞIKLI DEĞERLENDİRME TESTİ --------------------
function initMultipleChoiceGame() {
    // Sonuç ekranını kapat
    document.getElementById('mc-result-overlay').classList.remove('active');
    
    mcState.currentIndex = 0;
    mcState.correctCount = 0;
    
    // Rastgele 10 kelime seç
    const shuffled = [...words].sort(() => 0.5 - Math.random());
    mcState.questions = shuffled.slice(0, mcState.totalQuestions);
    
    loadMcQuestion();
}

function loadMcQuestion() {
    // Bildirim alanını temizle
    document.getElementById('mc-feedback-text').textContent = '';
    document.getElementById('mc-btn-next').style.display = 'none';

    // İndikatörü güncelle
    const percent = (mcState.currentIndex / mcState.totalQuestions) * 100;
    document.getElementById('mc-test-progress').style.style = `width: ${percent}%;`; // Wait, should be .style.width
    document.getElementById('mc-test-progress').style.width = `${percent}%`;
    document.getElementById('mc-question-index').textContent = mcState.currentIndex + 1;
    document.getElementById('mc-correct-score').textContent = mcState.correctCount;

    const currentWord = mcState.questions[mcState.currentIndex];
    mcState.currentQuestion = currentWord;

    // Soru alanını güncelle
    document.getElementById('mc-question-word').textContent = currentWord.english;

    // Şıkları üret: 1 doğru, 4 yanlış şık
    let options = [currentWord.turkish];
    
    // Yanlış şıkları belirleme (kalan kelimeler arasından benzersiz 4 Türkçe anlam seç)
    const otherWords = words.filter(w => w.english !== currentWord.english);
    const shuffledOthers = otherWords.sort(() => 0.5 - Math.random());
    
    let wrongOptions = [];
    for (let w of shuffledOthers) {
        if (!wrongOptions.includes(w.turkish) && w.turkish !== currentWord.turkish) {
            wrongOptions.push(w.turkish);
        }
        if (wrongOptions.length === 4) break;
    }

    // Şıkları birleştir
    options.push(...wrongOptions);
    // Şıkları karıştır
    options.sort(() => 0.5 - Math.random());

    // Şıkları butonlara yaz
    const optionsContainer = document.getElementById('mc-options-container');
    optionsContainer.innerHTML = '';

    const alphabet = ['A', 'B', 'C', 'D', 'E'];
    options.forEach((opt, idx) => {
        const btn = document.createElement('button');
        btn.classList.add('mc-option');
        btn.innerHTML = `<strong>${alphabet[idx]})</strong> &nbsp; ${escapeHtml(opt)}`;
        btn.onclick = () => checkMcAnswer(opt, btn);
        optionsContainer.appendChild(btn);
    });
}

function checkMcAnswer(selectedText, clickedButton) {
    const correctAnswer = mcState.currentQuestion.turkish;
    const optionsButtons = document.querySelectorAll('.mc-option');
    
    // Tüm şıkları kilitle
    optionsButtons.forEach(btn => {
        btn.classList.add('disabled');
        // Doğru şıkkı her durumda yeşil göster
        // Butonun içindeki metni kontrol etmek için escapeHtml veya trim uygunluğu
        const rawText = btn.textContent.slice(3).trim(); // Alfabeyi atıp sadece kelimeyi kontrol et
        if (rawText === correctAnswer) {
            btn.classList.add('correct');
        }
    });

    const isCorrect = (selectedText === correctAnswer);
    const feedbackText = document.getElementById('mc-feedback-text');

    if (isCorrect) {
        clickedButton.classList.add('correct');
        mcState.correctCount++;
        document.getElementById('mc-correct-score').textContent = mcState.correctCount;
        feedbackText.textContent = "Doğru Cevap! 🎉";
        feedbackText.style.color = "var(--success)";
        
        confetti({
            particleCount: 30,
            spread: 40,
            origin: { y: 0.8 }
        });
    } else {
        clickedButton.classList.add('incorrect');
        feedbackText.innerHTML = `Yanlış Cevap. <br>Doğru cevap: <strong>${correctAnswer}</strong>`;
        feedbackText.style.color = "var(--danger)";
    }

    // Sonraki soru butonunu göster
    document.getElementById('mc-btn-next').style.display = 'block';
}

function loadNextMcQuestion() {
    mcState.currentIndex++;
    if (mcState.currentIndex < mcState.totalQuestions) {
        loadMcQuestion();
    } else {
        // Test Bitti
        showMcResults();
    }
}

function showMcResults() {
    // İndikatörü %100 yap
    document.getElementById('mc-test-progress').style.width = '100%';
    
    const popup = document.getElementById('mc-result-overlay');
    document.getElementById('mc-res-total').textContent = mcState.totalQuestions;
    document.getElementById('mc-res-correct').textContent = mcState.correctCount;
    
    const wrongCount = mcState.totalQuestions - mcState.correctCount;
    document.getElementById('mc-res-wrong').textContent = wrongCount;

    const ratio = Math.round((mcState.correctCount / mcState.totalQuestions) * 100);
    document.getElementById('mc-res-ratio').textContent = `%${ratio}`;

    popup.classList.add('active');

    // Başarı oranına göre konfeti
    if (ratio >= 70) {
        confetti({
            particleCount: 150,
            spread: 90,
            origin: { y: 0.6 }
        });
    }
}

// -------------------------------------------------------------
// VERİ KONTROLLERİ VE AYARLAR (SETTINGS)
// -------------------------------------------------------------

// VERİYİ DIŞA AKTAR (EXPORT JSON)
function exportData() {
    if (words.length === 0) {
        alert("Dışa aktarılacak kelime bulunamadı.");
        return;
    }

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(words, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    
    const dateStr = new Date().toISOString().slice(0,10);
    downloadAnchor.setAttribute("download", `kelimelerim_yedek_${dateStr}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
}

// YEDEKTEN İÇE AKTAR (IMPORT JSON)
function importData(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const imported = JSON.parse(e.target.result);
            if (Array.isArray(imported)) {
                // Basit bir nesne doğrulama yapalım
                const valid = imported.every(w => typeof w.english === 'string' && typeof w.turkish === 'string');
                if (valid) {
                    // Zaman damgası eksik olanlara ekle
                    const cleanImported = imported.map(w => ({
                        english: w.english.trim(),
                        turkish: w.turkish.trim(),
                        timestamp: w.timestamp || getCurrentTimestamp()
                    }));

                    words.push(...cleanImported);
                    saveToStorage();
                    updateDashboardStats();
                    alert(`${cleanImported.length} adet kelime yedekten başarıyla yüklendi!`);
                } else {
                    alert("Dosya yapısı kelime uygulamasına uygun değil.");
                }
            } else {
                alert("Geçersiz yedek dosyası.");
            }
        } catch (err) {
            console.error(err);
            alert("Dosya okunurken bir hata oluştu.");
        }
        // Inputu sıfırla ki aynı dosya tekrar seçilebilsin
        document.getElementById('import-file-input').value = '';
    };
    reader.readAsText(file);
}

// TÜM VERİLERİ SIFIRLA
function resetAllData() {
    if (confirm("DİKKAT! Tüm kelimeleriniz kalıcı olarak silinecektir. Bu işlemi geri alamazsınız. Devam etmek istiyor musunuz?")) {
        words = [];
        localStorage.removeItem('kelime_dunyasi_words');
        updateDashboardStats();
        alert("Tüm kelime verileriniz silindi.");
        if (currentActiveTab === 'tab-list') {
            renderWordList();
        }
    }
}

// DENEME AMAÇLI 55 ADET ÖRNEK KELİME YÜKLEME
function loadSampleWords() {
    const samples = [
        { english: "abandon", turkish: "terk etmek" },
        { english: "ability", turkish: "yetenek" },
        { english: "abroad", turkish: "yurt dışı" },
        { english: "accomplish", turkish: "başarmak" },
        { english: "accurate", turkish: "doğru, kesin" },
        { english: "achieve", turkish: "elde etmek, başarmak" },
        { english: "acknowledge", turkish: "kabul etmek" },
        { english: "acquire", turkish: "edinmek, kazanmak" },
        { english: "adapt", turkish: "uyum sağlamak" },
        { english: "admire", turkish: "hayran olmak" },
        { english: "adventure", turkish: "macera" },
        { english: "affect", turkish: "etkilemek" },
        { english: "afford", turkish: "parası yetmek" },
        { english: "agree", turkish: "anlaşmak, aynı fikirde olmak" },
        { english: "allow", turkish: "izin vermek" },
        { english: "amazing", turkish: "şaşırtıcı, harika" },
        { english: "ancient", turkish: "antik, eski" },
        { english: "announce", turkish: "duyurmak" },
        { english: "anxiety", turkish: "endişe, kaygı" },
        { english: "apologize", turkish: "özür dilemek" },
        { english: "approach", turkish: "yaklaşmak" },
        { english: "approve", turkish: "onaylamak" },
        { english: "argue", turkish: "tartışmak" },
        { english: "artificial", turkish: "yapay" },
        { english: "assume", turkish: "varsaymak" },
        { english: "attempt", turkish: "girişimde bulunmak, denemek" },
        { english: "attract", turkish: "cezbetmek, çekmek" },
        { english: "avoid", turkish: "kaçınmak" },
        { english: "beautiful", turkish: "güzel" },
        { english: "believe", turkish: "inanmak" },
        { english: "benefit", turkish: "fayda, yarar" },
        { english: "brave", turkish: "cesur" },
        { english: "breathe", turkish: "nefes almak" },
        { english: "business", turkish: "iş, ticaret" },
        { english: "candidate", turkish: "aday" },
        { english: "celebrate", turkish: "kutlamak" },
        { english: "challenge", turkish: "meydan okuma, zorluk" },
        { english: "climb", turkish: "tırmanmak" },
        { english: "collect", turkish: "toplamak, biriktirmek" },
        { english: "compare", turkish: "karşılaştırmak" },
        { english: "compete", turkish: "rekabet etmek" },
        { english: "confirm", turkish: "onaylamak, doğrulamak" },
        { english: "create", turkish: "yaratmak, oluşturmak" },
        { english: "curious", turkish: "meraklı" },
        { english: "decision", turkish: "karar" },
        { english: "demand", turkish: "talep etmek" },
        { english: "describe", turkish: "tanımlamak" },
        { english: "destroy", turkish: "yok etmek" },
        { english: "develop", turkish: "geliştirmek" },
        { english: "discover", turkish: "keşfetmek" },
        { english: "encourage", turkish: "cesaretlendirmek" },
        { english: "examine", turkish: "incelemek" },
        { english: "explain", turkish: "açıklamak" },
        { english: "explore", turkish: "keşfetmek, araştırmak" },
        { english: "fail", turkish: "başarısız olmak" }
    ];

    const timestamp = getCurrentTimestamp();
    const finalSamples = samples.map(s => ({
        english: s.english,
        turkish: s.turkish,
        timestamp: timestamp
    }));

    words.push(...finalSamples);
    saveToStorage();
    updateDashboardStats();
    alert("55 adet deneme kelimesi başarıyla listenize eklendi! Oyunlar ve 5 Şıklı Test kullanıma hazır.");
    if (currentActiveTab === 'tab-list') {
        renderWordList();
    }
}

// -------------------------------------------------------------
// EKRAN YÖNLENDİRME KİLİTLEME VE OTO ROTASYON İŞLEMLERİ (PWA)
// -------------------------------------------------------------
let orientationState = 'auto'; // 'auto', 'portrait', 'landscape'

async function toggleOrientationLock() {
    const btn = document.getElementById('btn-orientation-lock');
    if (!btn) return;
    
    if (orientationState === 'auto') {
        // Dikey moduna kilitlemeye çalış
        try {
            if (screen.orientation && screen.orientation.lock) {
                await screen.orientation.lock('portrait');
            }
            orientationState = 'portrait';
            btn.innerHTML = '📳 Dikey';
            showSuccessToast('Ekran dikey konumda sabitlendi.');
        } catch (err) {
            console.warn("Ekran dikey kilitleme hatası:", err);
            // Tarayıcı kısıtlaması varsa yazılımsal uyarı moduna geç
            orientationState = 'portrait-mock';
            btn.innerHTML = '📳 Dikey';
            showSuccessToast('Dikey yönlendirme kilidi ayarlandı.');
        }
    } else if (orientationState === 'portrait' || orientationState === 'portrait-mock') {
        // Yatay moduna kilitlemeye çalış
        try {
            if (screen.orientation && screen.orientation.lock) {
                await screen.orientation.lock('landscape');
            }
            orientationState = 'landscape';
            btn.innerHTML = '📴 Yatay';
            showSuccessToast('Ekran yatay konumda sabitlendi.');
        } catch (err) {
            console.warn("Ekran yatay kilitleme hatası:", err);
            // Tarayıcı kısıtlaması varsa yazılımsal uyarı moduna geç
            orientationState = 'landscape-mock';
            btn.innerHTML = '📴 Yatay';
            showSuccessToast('Yatay yönlendirme kilidi ayarlandı.');
        }
    } else {
        // Kilidi kaldır (Otomatik serbest yönlendirme)
        try {
            if (screen.orientation && screen.orientation.unlock) {
                screen.orientation.unlock();
            }
        } catch (err) {
            console.warn("Ekran kilidi açma hatası:", err);
        }
        orientationState = 'auto';
        btn.innerHTML = '🔓 Oto';
        showSuccessToast('Ekran yönü serbest bırakıldı (Oto).');
    }
    
    checkOrientationMatch();
}

// Cihazın fiziksel konumu ile kilit konumunu karşılaştırıp yazılımsal yönlendirme uyarısı gösteren fonksiyon
function checkOrientationMatch() {
    const isLandscape = window.innerWidth > window.innerHeight;
    
    // Varsa eski uyarısı kaldır
    const existingOverlay = document.getElementById('orientation-mismatch-overlay');
    if (existingOverlay) {
        existingOverlay.remove();
    }
    
    if ((orientationState === 'portrait' || orientationState === 'portrait-mock') && isLandscape) {
        showOrientationOverlay('Lütfen Cihazınızı Dikey Konuma Getirin 📱', 'Dikey kilit aktif.');
    } else if ((orientationState === 'landscape' || orientationState === 'landscape-mock') && !isLandscape) {
        showOrientationOverlay('Lütfen Cihazınızı Yatay Konuma Getirin 🔄', 'Yatay kilit aktif.');
    }
}

// Yazılımsal yön uyarısı ekranı (CORS / tarayıcı kilit engellerine karşı tam uyumlu çözüm)
function showOrientationOverlay(title, subtitle) {
    const overlay = document.createElement('div');
    overlay.id = 'orientation-mismatch-overlay';
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100vw';
    overlay.style.height = '100vh';
    overlay.style.background = 'rgba(11, 12, 16, 0.98)';
    overlay.style.color = '#fff';
    overlay.style.display = 'flex';
    overlay.style.flexDirection = 'column';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.zIndex = '9999';
    overlay.style.textAlign = 'center';
    overlay.style.padding = '20px';
    
    overlay.innerHTML = `
        <div style="font-size: 64px; margin-bottom: 20px; animation: shake 1.5s infinite;">📱</div>
        <h2 style="font-size: 20px; font-weight: 800; margin-bottom: 10px; font-family: var(--font-family);">${title}</h2>
        <p style="font-size: 13px; color: var(--text-secondary); margin-bottom: 24px; font-family: var(--font-family);">${subtitle}</p>
        <button onclick="unlockOrientationFromOverlay()" style="background: linear-gradient(135deg, var(--primary), var(--accent)); color:#fff; border:none; padding:12px 24px; border-radius:12px; font-family: var(--font-family); font-weight:700; cursor:pointer; box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);">Yön Kilidini Kaldır (Oto)</button>
    `;
    document.body.appendChild(overlay);
}

// Overlay butonu için global fonksiyon
window.unlockOrientationFromOverlay = function() {
    orientationState = 'auto';
    const btn = document.getElementById('btn-orientation-lock');
    if (btn) btn.innerHTML = '🔓 Oto';
    
    try {
        if (screen.orientation && screen.orientation.unlock) {
            screen.orientation.unlock();
        }
    } catch(e){}
    
    const overlay = document.getElementById('orientation-mismatch-overlay');
    if (overlay) {
        overlay.remove();
    }
};

// Ekran döndürme ve boyut değiştirme olay dinleyicileri
window.addEventListener('resize', checkOrientationMatch);
window.addEventListener('orientationchange', checkOrientationMatch);

