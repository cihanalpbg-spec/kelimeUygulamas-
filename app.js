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
    words.sort((a, b) => a.english.localeCompare(b.english, 'tr', { sensitivity: 'base' }));
    localStorage.setItem('kelime_dunyasi_words', JSON.stringify(words));
}

function loadFromStorage() {
    const stored = localStorage.getItem('kelime_dunyasi_words');
    if (stored) {
        try {
            words = JSON.parse(stored);
            // Geriye dönük uyumluluk (compatibility) katmanı
            words.forEach(w => {
                if (w.pronunciation === undefined) w.pronunciation = '';
                if (w.memorySentence === undefined) w.memorySentence = '';
                if (!w.synonyms) w.synonyms = [];
                if (!w.antonyms) w.antonyms = [];
                
                // Eski string biçimleri temizleme ve diziye çevirme
                if (typeof w.synonyms === 'string') {
                    w.synonyms = w.synonyms ? w.synonyms.split(',').map(s => ({ word: s.trim(), memorySentence: '' })).filter(s => s.word) : [];
                }
                if (typeof w.antonyms === 'string') {
                    w.antonyms = w.antonyms ? w.antonyms.split(',').map(a => ({ word: a.trim(), memorySentence: '' })).filter(a => a.word) : [];
                }
            });
        } catch (e) {
            console.error("Depolama verisi okunamadı:", e);
            words = [];
        }
    } else {
        words = [];
    }

    // Senkronizasyon anahtarını yükle
    const savedKey = localStorage.getItem('kelime_dunyasi_sync_key');
    if (savedKey) {
        const input = document.getElementById('sync-key-input');
        if (input) input.value = savedKey;
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
    const tabs = document.querySelectorAll('.tab-content');
    tabs.forEach(tab => {
        tab.classList.remove('active');
        tab.style.display = 'none';
    });

    const targetTab = document.getElementById(tabId);
    if (targetTab) {
        targetTab.style.display = 'block';
        setTimeout(() => {
            targetTab.classList.add('active');
        }, 10);
    }

    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => item.classList.remove('active'));
    if (element) {
        element.classList.add('active');
    }

    currentActiveTab = tabId;

    if (tabId === 'tab-list') {
        renderWordList();
    } else if (tabId === 'tab-archive') {
        renderArchiveList();
    } else if (tabId === 'tab-syn-ant') {
        renderSynAntTab();
    }
    
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

    const clickedTab = Array.from(tabs).find(t => t.getAttribute('onclick').includes(method));
    if (clickedTab) clickedTab.classList.add('active');

    const targetContent = document.getElementById(`method-${method}`);
    if (targetContent) targetContent.classList.add('active');
}

// 1. MANUEL KELİME EKLEME
function addWordManual() {
    const engInput = document.getElementById('input-english');
    const pronInput = document.getElementById('input-pronunciation');
    const trInput = document.getElementById('input-turkish');
    const memInput = document.getElementById('input-memory');
    const synInput = document.getElementById('input-synonyms');
    const antInput = document.getElementById('input-antonyms');

    const eng = engInput.value.trim();
    const pron = pronInput.value.trim();
    const tr = trInput.value.trim();
    const mem = memInput.value.trim();
    
    const synStr = synInput.value.trim();
    const synonyms = synStr ? synStr.split(',').map(s => ({ word: s.trim(), memorySentence: '' })).filter(s => s.word) : [];
    
    const antStr = antInput.value.trim();
    const antonyms = antStr ? antStr.split(',').map(a => ({ word: a.trim(), memorySentence: '' })).filter(a => a.word) : [];

    if (!eng || !tr) {
        alert("Lütfen en azından İngilizce kelime ve Türkçe anlam alanlarını doldurun.");
        return;
    }

    const newWord = {
        english: eng,
        pronunciation: pron,
        turkish: tr,
        memorySentence: mem,
        synonyms: synonyms,
        antonyms: antonyms,
        timestamp: getCurrentTimestamp()
    };

    words.push(newWord);
    saveToStorage();
    updateDashboardStats();

    // Girişleri sıfırla
    engInput.value = '';
    pronInput.value = '';
    trInput.value = '';
    memInput.value = '';
    synInput.value = '';
    antInput.value = '';
    engInput.focus();

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
        let parts = line.split('\t');
        if (parts.length < 2) {
            parts = line.split(/ {2,}/);
        }

        if (parts.length >= 2) {
            let eng = parts[0].trim();
            let pron = '';
            let tr = '';
            let mem = '';
            let synonyms = [];
            let antonyms = [];

            if (parts.length >= 6) {
                pron = parts[1].trim();
                tr = parts[2].trim();
                mem = parts[3].trim();
                const synStr = parts[4].trim();
                synonyms = synStr ? synStr.split(',').map(s => ({ word: s.trim(), memorySentence: '' })).filter(s => s.word) : [];
                const antStr = parts[5].trim();
                antonyms = antStr ? antStr.split(',').map(a => ({ word: a.trim(), memorySentence: '' })).filter(a => a.word) : [];
            } else {
                tr = parts[1].trim();
            }

            if (eng && tr && !eng.toLowerCase().includes('ingilizce') && !eng.toLowerCase().includes('english') && !eng.toLowerCase().includes('kelime')) {
                words.push({
                    english: eng,
                    pronunciation: pron,
                    turkish: tr,
                    memorySentence: mem,
                    synonyms: synonyms,
                    antonyms: antonyms,
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
        alert("Geçerli bir kelime yapısı bulunamadı. Lütfen kopyaladığınız tablonun en az 2 veya 6 sütunlu olduğundan emin olun.");
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

// Word Dosyası (.docx) Ayrıştırıcı (6 Sütun Uyumlu & HTML Stil Korumalı)
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
                        let eng = cols[0].textContent.trim();
                        let pron = '';
                        let tr = '';
                        let memorySentence = '';
                        let synonyms = [];
                        let antonyms = [];

                        if (cols.length >= 6) {
                            pron = cols[1].textContent.trim();
                            tr = cols[2].textContent.trim();
                            memorySentence = cols[3].innerHTML.trim(); // HTML etiketlerini ve renk stillerini koru
                            
                            const synStr = cols[4].textContent.trim();
                            synonyms = synStr ? synStr.split(',').map(s => ({ word: s.trim(), memorySentence: '' })).filter(s => s.word) : [];
                            
                            const antStr = cols[5].textContent.trim();
                            antonyms = antStr ? antStr.split(',').map(a => ({ word: a.trim(), memorySentence: '' })).filter(a => a.word) : [];
                        } else {
                            tr = cols[1].textContent.trim();
                        }
                        
                        // Başlık satırı kontrolü
                        if (eng && tr && !eng.toLowerCase().includes('ingilizce') && !eng.toLowerCase().includes('english') && !eng.toLowerCase().includes('kelime') && !tr.toLowerCase().includes('türkçe') && !tr.toLowerCase().includes('anlamı')) {
                            newWords.push({
                                english: eng,
                                pronunciation: pron,
                                turkish: tr,
                                memorySentence: memorySentence,
                                synonyms: synonyms,
                                antonyms: antonyms,
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
                    alert("Word dosyasında uygun bir tablo bulunamadı. Lütfen şablona uygun tablo içerdiğinden emin olun.");
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

// Excel ve CSV Dosyası Ayrıştırıcı (6 Sütun Uyumlu)
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
                    let eng = String(row[0]).trim();
                    let pron = '';
                    let tr = '';
                    let memorySentence = '';
                    let synonyms = [];
                    let antonyms = [];

                    if (row.length >= 6) {
                        pron = String(row[1] || '').trim();
                        tr = String(row[2]).trim();
                        memorySentence = String(row[3] || '').trim();
                        
                        const synStr = String(row[4] || '').trim();
                        synonyms = synStr ? synStr.split(',').map(s => ({ word: s.trim(), memorySentence: '' })).filter(s => s.word) : [];
                        
                        const antStr = String(row[5] || '').trim();
                        antonyms = antStr ? antStr.split(',').map(a => ({ word: a.trim(), memorySentence: '' })).filter(a => a.word) : [];
                    } else {
                        tr = String(row[1]).trim();
                    }

                    if (eng && tr && eng !== "undefined" && tr !== "undefined" && !eng.toLowerCase().includes('ingilizce') && !eng.toLowerCase().includes('english') && !eng.toLowerCase().includes('kelime')) {
                        newWords.push({
                            english: eng,
                            pronunciation: pron,
                            turkish: tr,
                            memorySentence: memorySentence,
                            synonyms: synonyms,
                            antonyms: antonyms,
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

// 4. KELİME LİSTESİNİ ÇİZME (ALFABETİK)
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

    let html = '';
    filtered.forEach((w, index) => {
        const realIndex = words.findIndex(x => x.english === w.english && x.turkish === w.turkish);
        html += `
            <div class="word-row" onclick="showWordDetail(${realIndex}, event)">
                <div class="word-eng" style="display: flex; align-items: center; justify-content: space-between;">
                    <span>${escapeHtml(w.english)}</span>
                    <button class="speaker-btn" onclick="speakEnglish('${escapeHtml(w.english)}'); event.stopPropagation();" title="Telaffuz Et">🔊</button>
                </div>
                <div class="word-tr">${escapeHtml(w.turkish)}</div>
                <div class="word-date">${w.timestamp || '-'}</div>
                <div style="display: flex; justify-content: center;" onclick="event.stopPropagation();">
                    <button class="btn-delete-row" onclick="deleteWord(${realIndex})" title="Kelimeyi Sil">🗑️</button>
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
}

// 5. SESLİ OKUMA DESTEĞİ (SPEECH SYNTHESIS)
function speakEnglish(text) {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel(); // Mevcut okumayı durdur
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US'; // Amerikan İngilizcesi aksanı
        window.speechSynthesis.speak(utterance);
    } else {
        console.warn("Speech Synthesis is not supported in this browser.");
    }
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
    document.getElementById('mc-result-overlay').classList.remove('active');
    
    mcState.currentIndex = 0;
    mcState.correctCount = 0;
    
    const shuffled = [...words].sort(() => 0.5 - Math.random());
    mcState.questions = shuffled.slice(0, mcState.totalQuestions);
    
    loadMcQuestion();
}

function loadMcQuestion() {
    document.getElementById('mc-feedback-text').textContent = '';
    document.getElementById('mc-btn-next').style.display = 'none';

    const percent = (mcState.currentIndex / mcState.totalQuestions) * 100;
    document.getElementById('mc-test-progress').style.width = `${percent}%`;
    document.getElementById('mc-question-index').textContent = mcState.currentIndex + 1;
    document.getElementById('mc-correct-score').textContent = mcState.correctCount;

    const currentWord = mcState.questions[mcState.currentIndex];
    mcState.currentQuestion = currentWord;

    // Soru tipini belirle: tr (anlamı), syn (eş anlamı), ant (zıt anlamı)
    let qType = 'tr';
    const hasSyn = currentWord.synonyms && currentWord.synonyms.length > 0;
    const hasAnt = currentWord.antonyms && currentWord.antonyms.length > 0;
    
    if (hasSyn || hasAnt) {
        const rand = Math.random();
        if (hasSyn && (!hasAnt || rand < 0.5)) {
            qType = 'syn';
        } else if (hasAnt) {
            qType = 'ant';
        }
    }

    let questionWordText = currentWord.english;
    let questionInstructions = '';
    let correctAnswer = '';

    if (qType === 'tr') {
        questionInstructions = "Yukarıdaki İngilizce kelimenin Türkçe anlamı nedir?";
        correctAnswer = currentWord.turkish;
    } else if (qType === 'syn') {
        const randomSynObj = currentWord.synonyms[Math.floor(Math.random() * currentWord.synonyms.length)];
        questionInstructions = "Yukarıdaki kelimenin eş anlamlısı (synonym) hangisidir?";
        correctAnswer = randomSynObj.word;
    } else if (qType === 'ant') {
        const randomAntObj = currentWord.antonyms[Math.floor(Math.random() * currentWord.antonyms.length)];
        questionInstructions = "Yukarıdaki kelimenin zıt anlamlısı (antonym) hangisidir?";
        correctAnswer = randomAntObj.word;
    }

    document.getElementById('mc-question-word').innerHTML = `
        <span>${escapeHtml(questionWordText)}</span>
        <button class="speaker-btn" onclick="speakEnglish('${escapeHtml(questionWordText)}'); event.stopPropagation();" title="Telaffuz Et" style="font-size:18px;">🔊</button>
    `;
    document.querySelector('.mc-instruction').textContent = questionInstructions;
    
    // Doğru cevabı kaydet (karşılaştırma için)
    mcState.activeCorrectAnswer = correctAnswer;

    // Şıkları üret (1 doğru, 4 yanlış)
    let options = [correctAnswer];
    
    const otherWords = words.filter(w => w.english.toLowerCase() !== currentWord.english.toLowerCase());
    const shuffledOthers = otherWords.sort(() => 0.5 - Math.random());

    let wrongOptions = [];
    for (let w of shuffledOthers) {
        let candidate = '';
        if (qType === 'tr') {
            candidate = w.turkish;
        } else {
            // Eş/Zıt anlam ise diğer İngilizce kelimeleri seçenek yapıyoruz
            candidate = w.english;
        }
        
        if (candidate && !wrongOptions.includes(candidate) && candidate.toLowerCase() !== correctAnswer.toLowerCase()) {
            wrongOptions.push(candidate);
        }
        if (wrongOptions.length === 4) break;
    }

    while (wrongOptions.length < 4) {
        const dummy = qType === 'tr' ? "seçenek" : "option";
        wrongOptions.push(`${dummy} ${wrongOptions.length + 1}`);
    }

    options.push(...wrongOptions);
    options.sort(() => 0.5 - Math.random());

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
    const correctAnswer = mcState.activeCorrectAnswer;
    const optionsButtons = document.querySelectorAll('.mc-option');
    
    optionsButtons.forEach(btn => {
        btn.classList.add('disabled');
        const rawText = btn.textContent.slice(3).trim();
        if (rawText.toLowerCase() === correctAnswer.toLowerCase()) {
            btn.classList.add('correct');
        }
    });

    const isCorrect = (selectedText.toLowerCase() === correctAnswer.toLowerCase());
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
        feedbackText.innerHTML = `Yanlış Cevap. <br>Doğru cevap: <strong>${escapeHtml(correctAnswer)}</strong>`;
        feedbackText.style.color = "var(--danger)";
    }

    document.getElementById('mc-btn-next').style.display = 'block';
}

function loadNextMcQuestion() {
    mcState.currentIndex++;
    if (mcState.currentIndex < mcState.totalQuestions) {
        loadMcQuestion();
    } else {
        showMcResults();
    }
}

function showMcResults() {
    document.getElementById('mc-test-progress').style.width = '100%';
    
    const popup = document.getElementById('mc-result-overlay');
    document.getElementById('mc-res-total').textContent = mcState.totalQuestions;
    document.getElementById('mc-res-correct').textContent = mcState.correctCount;
    
    const wrongCount = mcState.totalQuestions - mcState.correctCount;
    document.getElementById('mc-res-wrong').textContent = wrongCount;

    const ratio = Math.round((mcState.correctCount / mcState.totalQuestions) * 100);
    document.getElementById('mc-res-ratio').textContent = `%${ratio}`;

    popup.classList.add('active');

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

function importData(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const imported = JSON.parse(e.target.result);
            if (Array.isArray(imported)) {
                const valid = imported.every(w => typeof w.english === 'string' && typeof w.turkish === 'string');
                if (valid) {
                    const cleanImported = imported.map(w => {
                        // Eş/Zıt anlam nesne dizisi uyumluluğu
                        let syns = w.synonyms || [];
                        if (typeof syns === 'string') {
                            syns = syns ? syns.split(',').map(s => ({ word: s.trim(), memorySentence: '' })).filter(s => s.word) : [];
                        }
                        let ants = w.antonyms || [];
                        if (typeof ants === 'string') {
                            ants = ants ? ants.split(',').map(a => ({ word: a.trim(), memorySentence: '' })).filter(a => a.word) : [];
                        }

                        return {
                            english: w.english.trim(),
                            pronunciation: (w.pronunciation || '').trim(),
                            turkish: w.turkish.trim(),
                            memorySentence: w.memorySentence || '',
                            synonyms: syns,
                            antonyms: ants,
                            timestamp: w.timestamp || getCurrentTimestamp()
                        };
                    });

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
        document.getElementById('import-file-input').value = '';
    };
    reader.readAsText(file);
}

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

// DENEME AMAÇLI 55 ADET ÖRNEK KELİME YÜKLEME (YENİ ALANLAR VE RENKLENDİRME İÇERİR)
function loadSampleWords() {
    const samples = [
        { english: "abandon", pronunciation: "ıbendın", turkish: "terk etmek", memorySentence: "<span style='color: #ff5e62; font-weight: bold;'>Abni</span> arabayı otobanda terk etti.", synonyms: [{ word: "desert", memorySentence: "Çölde terk edilmiş hissetti." }], antonyms: [{ word: "keep", memorySentence: "Eşyayı sakla." }] },
        { english: "ability", pronunciation: "ebiliti", turkish: "yetenek", memorySentence: "<span style='color: #06b6d4; font-weight: bold;'>Abil</span>'in müthiş bir müzik yeteneği var.", synonyms: [{ word: "skill", memorySentence: "" }, { word: "talent", memorySentence: "" }], antonyms: [{ word: "inability", memorySentence: "" }] },
        { english: "abroad", pronunciation: "ebrod", turkish: "yurt dışı", memorySentence: "<span style='color: #a855f7; font-weight: bold;'>Ebru</span> yurt dışına uçtu.", synonyms: [{ word: "overseas", memorySentence: "" }], antonyms: [{ word: "domestic", memorySentence: "" }] },
        { english: "accomplish", pronunciation: "ekompliş", turkish: "başarmak", memorySentence: "İşi başarınca <span style='background: rgba(16, 185, 129, 0.25); color: #10b981; padding: 2px 4px; border-radius: 4px;'>kompliman</span> aldık.", synonyms: [{ word: "achieve", memorySentence: "Zirveye ulaştı." }], antonyms: [{ word: "fail", memorySentence: "" }] },
        { english: "accurate", pronunciation: "ekyurıt", turkish: "doğru, kesin", memorySentence: "<span style='color: #ff5e62; font-weight: bold;'>Ekrem</span>'in tahminleri kesinlikle doğru.", synonyms: [{ word: "correct", memorySentence: "" }, { word: "precise", memorySentence: "" }], antonyms: [{ word: "wrong", memorySentence: "" }] },
        { english: "awning", pronunciation: "Oınin", turkish: "güneşlik, tente", memorySentence: "<span style='color: #ff5e62; font-weight: bold;'>Avni</span> İngilizceyi <span style='color: #ff5e62; text-decoration: underline;'>güneşliğin</span> altında öğrendi.", synonyms: [{ word: "canopy", memorySentence: "Tente gölge yapar." }, { word: "shade", memorySentence: "" }], antonyms: [] }
    ];

    // Dolgu kelimeler (Test kilidini açmak için 50 kelimeye tamamla)
    for (let i = 1; i <= 45; i++) {
        samples.push({
            english: `word-${i}`,
            pronunciation: `vörd-${i}`,
            turkish: `deneme kelimesi-${i}`,
            memorySentence: `Bu bir deneme hafıza cümlesidir ${i}.`,
            synonyms: [{ word: `synonym-${i}`, memorySentence: '' }],
            antonyms: [{ word: `antonym-${i}`, memorySentence: '' }]
        });
    }

    const timestamp = getCurrentTimestamp();
    const finalSamples = samples.map(s => ({
        english: s.english,
        pronunciation: s.pronunciation,
        turkish: s.turkish,
        memorySentence: s.memorySentence,
        synonyms: s.synonyms,
        antonyms: s.antonyms,
        timestamp: timestamp
    }));

    words.push(...finalSamples);
    saveToStorage();
    updateDashboardStats();
    alert("55 adet örnek kelime (Yeni alanlar, eş/zıt anlamlar ve renkli hafıza cümleleri ile) yüklendi!");
    if (currentActiveTab === 'tab-list') {
        renderWordList();
    }
}

// -------------------------------------------------------------
// EKRAN YÖNLENDİRME KİLİTLEME VE OTO ROTASYON İŞLEMLERİ (PWA)
// -------------------------------------------------------------
let orientationState = 'auto';

async function toggleOrientationLock() {
    const btn = document.getElementById('btn-orientation-lock');
    if (!btn) return;
    
    if (orientationState === 'auto') {
        try {
            if (screen.orientation && screen.orientation.lock) {
                await screen.orientation.lock('portrait');
            }
            orientationState = 'portrait';
            btn.innerHTML = '📳 Dikey';
            showSuccessToast('Ekran dikey konumda sabitlendi.');
        } catch (err) {
            console.warn("Ekran dikey kilitleme hatası:", err);
            orientationState = 'portrait-mock';
            btn.innerHTML = '📳 Dikey';
            showSuccessToast('Dikey yönlendirme kilidi ayarlandı.');
        }
    } else if (orientationState === 'portrait' || orientationState === 'portrait-mock') {
        try {
            if (screen.orientation && screen.orientation.lock) {
                await screen.orientation.lock('landscape');
            }
            orientationState = 'landscape';
            btn.innerHTML = '📴 Yatay';
            showSuccessToast('Ekran yatay konumda sabitlendi.');
        } catch (err) {
            console.warn("Ekran yatay kilitleme hatası:", err);
            orientationState = 'landscape-mock';
            btn.innerHTML = '📴 Yatay';
            showSuccessToast('Yatay yönlendirme kilidi ayarlandı.');
        }
    } else {
        try {
            if (screen.orientation && screen.orientation.unlock) {
                screen.orientation.unlock();
            }
        } catch (err) {}
        orientationState = 'auto';
        btn.innerHTML = '🔓 Oto';
        showSuccessToast('Ekran yönü serbest bırakıldı (Oto).');
    }
    checkOrientationMatch();
}

function checkOrientationMatch() {
    const isLandscape = window.innerWidth > window.innerHeight;
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

window.addEventListener('resize', checkOrientationMatch);
window.addEventListener('orientationchange', checkOrientationMatch);

// -------------------------------------------------------------
// YENİ Geliştirmeler İçin Ek Fonksiyonlar
// -------------------------------------------------------------

// Tarih Ayrıştırıcı (Kronolojik Arşiv için)
function parseTimestamp(ts) {
    if (!ts) return new Date(0);
    const parts = ts.split(' ');
    if (parts.length < 2) return new Date(0);
    const dateParts = parts[0].split('.');
    const timeParts = parts[1].split(':');
    return new Date(dateParts[2], dateParts[1] - 1, dateParts[0], timeParts[0], timeParts[1], timeParts[2] || 0);
}

// 6. ARŞİV LİSTESİNİ ÇİZME (KRONOLOJİK)
function renderArchiveList() {
    const container = document.getElementById('archive-list-container');
    const searchVal = document.getElementById('archive-search').value.toLowerCase().trim();

    if (!container) return;

    if (words.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <span class="empty-icon">📅</span>
                <p>Henüz kelime eklenmedi.</p>
            </div>
        `;
        return;
    }

    // Yükleme zamanına göre kronolojik sıralıyoruz (yeni en üstte)
    const sorted = [...words].sort((a, b) => parseTimestamp(b.timestamp) - parseTimestamp(a.timestamp));

    const filtered = sorted.filter(w => 
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

    let html = '';
    filtered.forEach((w) => {
        html += `
            <div class="archive-word-row">
                <div class="word-eng" style="display: flex; align-items: center; justify-content: space-between;">
                    <span>${escapeHtml(w.english)}</span>
                    <button class="speaker-btn" onclick="speakEnglish('${escapeHtml(w.english)}'); event.stopPropagation();" title="Telaffuz Et">🔊</button>
                </div>
                <div class="word-tr">${escapeHtml(w.turkish)}</div>
                <div class="word-date">${w.timestamp || '-'}</div>
            </div>
        `;
    });
    container.innerHTML = html;
}

// 7. EŞ & ZIT ANLAM TAB PANEL VE SİDEBAR
let selectedSynAntIndex = -1;

function renderSynAntTab() {
    renderSynAntSidebar();
    
    const detailPane = document.getElementById('syn-ant-detail-pane');
    if (selectedSynAntIndex >= 0 && selectedSynAntIndex < words.length) {
        renderSynAntDetail(selectedSynAntIndex);
    } else {
        detailPane.innerHTML = `
            <div class="empty-detail-state">
                <span class="empty-icon">👈</span>
                <p>Eş ve zıt anlamlarını düzenlemek ve hafıza cümleleri yazmak için sol taraftaki listeden bir kelime seçin.</p>
            </div>
        `;
    }
}

function renderSynAntSidebar() {
    const listContainer = document.getElementById('syn-ant-words-list');
    const searchVal = document.getElementById('syn-ant-search').value.toLowerCase().trim();

    if (!listContainer) return;

    if (words.length === 0) {
        listContainer.innerHTML = `<div style="text-align:center; padding:20px; font-size:11px; color:var(--text-muted);">Kelime bulunamadı.</div>`;
        return;
    }

    const filtered = words.filter(w => w.english.toLowerCase().includes(searchVal));

    let html = '';
    filtered.forEach(w => {
        const realIdx = words.findIndex(x => x.english === w.english && x.turkish === w.turkish);
        const activeClass = (realIdx === selectedSynAntIndex) ? 'active' : '';
        html += `
            <button class="syn-ant-word-btn ${activeClass}" onclick="selectSynAntWord(${realIdx})">
                <span>${escapeHtml(w.english)}</span>
                <span>➔</span>
            </button>
        `;
    });

    listContainer.innerHTML = html;
}

function selectSynAntWord(index) {
    selectedSynAntIndex = index;
    renderSynAntSidebar();
    renderSynAntDetail(index);
}

function renderSynAntDetail(index) {
    const w = words[index];
    const detailPane = document.getElementById('syn-ant-detail-pane');
    if (!detailPane) return;

    let synHtml = '';
    if (w.synonyms && w.synonyms.length > 0) {
        w.synonyms.forEach((syn, sIdx) => {
            synHtml += `
                <div class="syn-ant-item">
                    <div class="syn-ant-item-top">
                        <span class="syn-ant-item-word editable-field" onclick="makeEditable(this, ${index}, 'synonyms.${sIdx}.word')">${escapeHtml(syn.word)}</span>
                        <div style="display:flex; gap:6px; align-items:center;">
                            <button class="speaker-btn" onclick="speakEnglish('${escapeHtml(syn.word)}')" style="font-size:11px;">🔊</button>
                            <button class="btn-delete-row" onclick="deleteSynAntItem(${index}, 'synonyms', ${sIdx})" style="font-size:11px; padding:2px 4px;">🗑️</button>
                        </div>
                    </div>
                    <div class="syn-ant-item-memory editable-field ${!syn.memorySentence ? 'empty-field' : ''}" 
                         onclick="makeEditable(this, ${index}, 'synonyms.${sIdx}.memorySentence', 'textarea')">
                        ${syn.memorySentence ? syn.memorySentence : '— Hafıza cümlesi yazmak için tıklayın —'}
                    </div>
                </div>
            `;
        });
    } else {
        synHtml = `<div style="font-size:11px; color:var(--text-muted); font-style:italic;">Eş anlamlı kelime girilmedi.</div>`;
    }

    let antHtml = '';
    if (w.antonyms && w.antonyms.length > 0) {
        w.antonyms.forEach((ant, aIdx) => {
            antHtml += `
                <div class="syn-ant-item">
                    <div class="syn-ant-item-top">
                        <span class="syn-ant-item-word editable-field" onclick="makeEditable(this, ${index}, 'antonyms.${aIdx}.word')">${escapeHtml(ant.word)}</span>
                        <div style="display:flex; gap:6px; align-items:center;">
                            <button class="speaker-btn" onclick="speakEnglish('${escapeHtml(ant.word)}')" style="font-size:11px;">🔊</button>
                            <button class="btn-delete-row" onclick="deleteSynAntItem(${index}, 'antonyms', ${aIdx})" style="font-size:11px; padding:2px 4px;">🗑️</button>
                        </div>
                    </div>
                    <div class="syn-ant-item-memory editable-field ${!ant.memorySentence ? 'empty-field' : ''}" 
                         onclick="makeEditable(this, ${index}, 'antonyms.${aIdx}.memorySentence', 'textarea')">
                        ${ant.memorySentence ? ant.memorySentence : '— Hafıza cümlesi yazmak için tıklayın —'}
                    </div>
                </div>
            `;
        });
    } else {
        antHtml = `<div style="font-size:11px; color:var(--text-muted); font-style:italic;">Zıt anlamlı kelime girilmedi.</div>`;
    }

    detailPane.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1.5px solid var(--border-color); padding-bottom:8px;">
            <div style="display:flex; align-items:center; gap:8px;">
                <h3 style="font-size:18px; font-weight:800; color:#fff;">${escapeHtml(w.english)}</h3>
                <button class="speaker-btn" onclick="speakEnglish('${escapeHtml(w.english)}')">🔊</button>
            </div>
            <span style="font-size:11px; color:var(--text-secondary);">${escapeHtml(w.turkish)}</span>
        </div>
        
        <!-- EŞ ANLAMLILAR KUTUSU -->
        <div class="syn-ant-group-box">
            <div class="syn-ant-group-header">
                <span>EŞ ANLAMLILARI (SYNONYMS)</span>
                <button class="btn-secondary" onclick="addSynAntItemPrompt(${index}, 'synonyms')" style="font-size:10px; padding:4px 8px; border-radius:6px;">＋ Ekle</button>
            </div>
            <div style="display:flex; flex-direction:column; gap:8px;">
                ${synHtml}
            </div>
        </div>

        <!-- ZIT ANLAMLILAR KUTUSU -->
        <div class="syn-ant-group-box">
            <div class="syn-ant-group-header">
                <span>ZIT ANLAMLILARI (ANTONYMS)</span>
                <button class="btn-secondary" onclick="addSynAntItemPrompt(${index}, 'antonyms')" style="font-size:10px; padding:4px 8px; border-radius:6px;">＋ Ekle</button>
            </div>
            <div style="display:flex; flex-direction:column; gap:8px;">
                ${antHtml}
            </div>
        </div>
    `;
}

function addSynAntItemPrompt(index, type) {
    const wordText = prompt(`${type === 'synonyms' ? 'Eş Anlamlı' : 'Zıt Anlamlı'} yeni İngilizce kelime girin:`);
    if (!wordText || !wordText.trim()) return;

    const memoryText = prompt("Hafıza cümlesi girin (İsteğe bağlı):") || '';

    if (!words[index][type]) words[index][type] = [];
    words[index][type].push({
        word: wordText.trim(),
        memorySentence: memoryText.trim()
    });

    saveToStorage();
    renderSynAntDetail(index);
}

function deleteSynAntItem(index, type, itemIdx) {
    if (confirm("Bu kelimeyi silmek istediğinize emin misiniz?")) {
        words[index][type].splice(itemIdx, 1);
        saveToStorage();
        renderSynAntDetail(index);
    }
}

// 8. DİNAMİK DETAY MODALI VE DÜZENLE/KAYDET MANTIĞI
function showWordDetail(index, event) {
    if (event && (event.target.closest('.btn-delete-row') || event.target.closest('.speaker-btn'))) {
        return;
    }

    const w = words[index];
    let overlay = document.getElementById('word-detail-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'word-detail-overlay';
        overlay.className = 'word-detail-overlay';
        overlay.onclick = function(e) {
            if (e.target === overlay) closeWordDetail();
        };
        document.body.appendChild(overlay);
    }

    overlay.style.display = 'flex';
    renderDetailCard(index);
}

function closeWordDetail() {
    const overlay = document.getElementById('word-detail-overlay');
    if (overlay) overlay.style.display = 'none';
    renderWordList();
}

function renderDetailCard(index) {
    const w = words[index];
    const overlay = document.getElementById('word-detail-overlay');
    if (!overlay) return;

    let synList = w.synonyms && w.synonyms.length > 0 
        ? w.synonyms.map(s => s.word).join(', ') 
        : '—';
        
    let antList = w.antonyms && w.antonyms.length > 0 
        ? w.antonyms.map(a => a.word).join(', ') 
        : '—';

    overlay.innerHTML = `
        <div class="word-detail-card">
            <button class="word-detail-close" onclick="closeWordDetail()">✕</button>
            
            <div class="word-detail-title-row">
                <h2>${escapeHtml(w.english)}</h2>
                <button class="speaker-btn" onclick="speakEnglish('${escapeHtml(w.english)}')" style="font-size: 18px;">🔊</button>
            </div>
            
            <div class="word-detail-section">
                <span class="word-detail-section-title">Türkçe Anlamı</span>
                <div class="word-detail-section-content editable-field" onclick="makeEditable(this, ${index}, 'turkish')">
                    ${escapeHtml(w.turkish)}
                </div>
            </div>

            <div class="word-detail-section">
                <span class="word-detail-section-title">Türkçe Okunuşu</span>
                <div class="word-detail-section-content editable-field ${!w.pronunciation ? 'empty-field' : ''}" onclick="makeEditable(this, ${index}, 'pronunciation')">
                    ${w.pronunciation ? escapeHtml(w.pronunciation) : '— Okunuş eklemek için tıklayın —'}
                </div>
            </div>

            <div class="word-detail-section">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <span class="word-detail-section-title">Hafıza Cümlesi</span>
                    <button class="btn-secondary" onclick="openColorHighlighter(this, ${index}, 'memorySentence')" style="font-size:9px; padding:3px 6px; border-radius:4px;">🎨 Renklendir</button>
                </div>
                <div class="word-detail-section-content editable-field ${!w.memorySentence ? 'empty-field' : ''}" onclick="makeEditable(this, ${index}, 'memorySentence', 'textarea')">
                    ${w.memorySentence ? w.memorySentence : '— Hafıza cümlesi eklemek için tıklayın —'}
                </div>
            </div>

            <div class="word-detail-section">
                <span class="word-detail-section-title">Eş Anlamlıları (Özet)</span>
                <div class="word-detail-section-content" style="color:var(--text-secondary); font-size:12px;">
                    ${escapeHtml(synList)}
                </div>
            </div>

            <div class="word-detail-section">
                <span class="word-detail-section-title">Zıt Anlamlıları (Özet)</span>
                <div class="word-detail-section-content" style="color:var(--text-secondary); font-size:12px;">
                    ${escapeHtml(antList)}
                </div>
            </div>

            <div style="font-size:10px; color:var(--text-muted); text-align:right; margin-top:8px;">
                Yükleme Zamanı: ${w.timestamp || 'Bilinmiyor'}
            </div>
        </div>
    `;
}

// Inline Düzenleme Mekanizması
function makeEditable(element, index, fieldPath, type = 'input') {
    if (element.querySelector('input') || element.querySelector('textarea') || element.closest('.inline-edit-container')) {
        return;
    }

    const w = words[index];
    
    let value = '';
    const keys = fieldPath.split('.');
    if (keys.length === 1) {
        value = w[fieldPath];
    } else if (keys.length === 3) {
        value = w[keys[0]][keys[1]][keys[2]];
    }

    const rawValue = value || '';
    const oldHtml = element.innerHTML;
    
    const editContainer = document.createElement('div');
    editContainer.className = 'inline-edit-container';
    editContainer.onclick = function(e) { e.stopPropagation(); };

    let fieldHtml = '';
    if (type === 'textarea') {
        fieldHtml = `<textarea class="inline-edit-textarea" rows="3" placeholder="Metin girin...">${rawValue}</textarea>`;
    } else {
        fieldHtml = `<input type="text" class="inline-edit-input" value="${escapeHtml(rawValue)}" placeholder="Değer girin..." autocomplete="off">`;
    }

    editContainer.innerHTML = `
        ${fieldHtml}
        <div class="inline-edit-actions">
            <button class="btn-edit-cancel">İptal</button>
            <button class="btn-edit-save">Kaydet</button>
        </div>
    `;

    element.innerHTML = '';
    element.appendChild(editContainer);

    const inputEl = editContainer.querySelector('input') || editContainer.querySelector('textarea');
    inputEl.focus();

    editContainer.querySelector('.btn-edit-cancel').onclick = function(e) {
        e.stopPropagation();
        element.innerHTML = oldHtml;
    };

    editContainer.querySelector('.btn-edit-save').onclick = function(e) {
        e.stopPropagation();
        const newVal = inputEl.value.trim();
        
        if (keys.length === 1) {
            w[fieldPath] = newVal;
        } else if (keys.length === 3) {
            w[keys[0]][keys[1]][keys[2]] = newVal;
        }

        saveToStorage();
        
        if (currentActiveTab === 'tab-syn-ant') {
            renderSynAntDetail(index);
        } else {
            renderDetailCard(index);
        }
    };
}

// 9. GÖRSEL BELİRLİ KELİMELERİ RENKLENDİRME EDİTÖRÜ (MEMORY SENTENCE HIGHLIGHTER)
function openColorHighlighter(btnElement, wordIndex, fieldPath) {
    const w = words[wordIndex];
    let rawText = w[fieldPath] || '';
    
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = rawText;
    const plainText = tempDiv.textContent || tempDiv.innerText || '';

    if (!plainText.trim()) {
        alert("Lütfen önce bir hafıza cümlesi yazıp kaydedin.");
        return;
    }

    const detailOverlay = document.getElementById('word-detail-overlay');
    const synAntDetailOverlay = document.getElementById('syn-ant-detail-pane');
    const containerToRender = (currentActiveTab === 'tab-syn-ant') ? synAntDetailOverlay : detailOverlay.querySelector('.word-detail-card');

    const wordsArray = plainText.split(/\s+/);
    let wordsHtml = '';
    wordsArray.forEach((word, idx) => {
        wordsHtml += `<span class="highlighted-word-span" data-index="${idx}">${escapeHtml(word)}</span>`;
    });

    containerToRender.innerHTML = `
        <h3 style="font-size:14px; font-weight:800; color:var(--secondary); margin-bottom:8px;">Kelime Renklendirme Editörü</h3>
        <p style="font-size:11px; color:var(--text-secondary); margin-bottom:12px;">Renk vermek istediğiniz kelimenin üzerine tıklayın ve renk seçin.</p>
        
        <div class="highlight-editor-words-container" id="editor-words-list">
            ${wordsHtml}
        </div>
        
        <div style="display:flex; gap:8px; justify-content:flex-end; margin-top:16px;">
            <button class="btn-secondary" id="btn-highlighter-cancel">Geri Dön</button>
            <button class="btn-primary" id="btn-highlighter-save">Renkleri Kaydet</button>
        </div>
    `;

    const wordSpans = containerToRender.querySelectorAll('.highlighted-word-span');
    wordSpans.forEach(span => {
        span.onclick = function(e) {
            e.stopPropagation();
            showColorPickerBubble(span, e.pageX, e.pageY);
        };
    });

    containerToRender.querySelector('#btn-highlighter-cancel').onclick = function() {
        if (currentActiveTab === 'tab-syn-ant') {
            renderSynAntDetail(wordIndex);
        } else {
            renderDetailCard(wordIndex);
        }
    };

    containerToRender.querySelector('#btn-highlighter-save').onclick = function() {
        const spans = containerToRender.querySelectorAll('.highlighted-word-span');
        let finalHtml = '';
        spans.forEach((span, idx) => {
            if (span.hasAttribute('style')) {
                finalHtml += `<span style="${span.getAttribute('style')}">${span.innerHTML}</span>`;
            } else {
                finalHtml += span.innerHTML;
            }
            if (idx < spans.length - 1) finalHtml += ' ';
        });

        w[fieldPath] = finalHtml;
        saveToStorage();

        if (currentActiveTab === 'tab-syn-ant') {
            renderSynAntDetail(wordIndex);
        } else {
            renderDetailCard(wordIndex);
        }
    };
}

function showColorPickerBubble(targetSpan, pageX, pageY) {
    const existing = document.getElementById('highlighter-color-picker');
    if (existing) existing.remove();

    const bubble = document.createElement('div');
    bubble.id = 'highlighter-color-picker';
    bubble.className = 'word-color-picker-bubble';
    
    bubble.style.left = `${Math.min(pageX, window.innerWidth - 180)}px`;
    bubble.style.top = `${pageY - 60}px`;

    const colors = [
        { name: 'Varsayılan', style: '', color: '#fff' },
        { name: 'Kırmızı', style: 'color:#ff5e62; font-weight:bold;', color: '#ff5e62' },
        { name: 'Mavi', style: 'color:#06b6d4; font-weight:bold;', color: '#06b6d4' },
        { name: 'Yeşil', style: 'color:#10b981; font-weight:bold;', color: '#10b981' },
        { name: 'Mor', style: 'color:#a855f7; font-weight:bold;', color: '#a855f7' },
        { name: 'Sarı Arka Plan', style: 'background:rgba(245,158,11,0.25); color:#f59e0b; padding:2px 4px; border-radius:4px;', color: '#f59e0b' },
        { name: 'Kırmızı Altı Çizili', style: 'color:#ff5e62; text-decoration:underline; font-weight:bold;', color: '#ff5e62' }
    ];

    colors.forEach(col => {
        const dot = document.createElement('div');
        dot.className = 'color-dot';
        dot.style.backgroundColor = col.color;
        dot.style.color = col.color;
        dot.title = col.name;
        dot.onclick = function(e) {
            e.stopPropagation();
            if (col.style) {
                targetSpan.setAttribute('style', col.style);
            } else {
                targetSpan.removeAttribute('style');
            }
            bubble.remove();
        };
        bubble.appendChild(dot);
    });

    document.body.appendChild(bubble);

    const closeHandler = function() {
        bubble.remove();
        document.removeEventListener('click', closeHandler);
    };
    setTimeout(() => {
        document.addEventListener('click', closeHandler);
    }, 100);
}

// 10. KVDB.IO TABANLI BULUT SENKRONİZASYON SİSTEMİ
function generateSyncKey() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let key = '';
    for (let i = 0; i < 10; i++) {
        key += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    const input = document.getElementById('sync-key-input');
    if (input) {
        input.value = key;
        localStorage.setItem('kelime_dunyasi_sync_key', key);
    }
    showSuccessToast("Yeni senkronizasyon anahtarı üretildi!");
}

async function syncUpload() {
    const keyInput = document.getElementById('sync-key-input');
    if (!keyInput) return;

    const key = keyInput.value.trim();
    if (!key) {
        alert("Lütfen önce bir Senkronizasyon Anahtarı üretin veya girin.");
        return;
    }

    localStorage.setItem('kelime_dunyasi_sync_key', key);

    if (words.length === 0) {
        alert("Buluta yüklenecek kelime listeniz boş.");
        return;
    }

    try {
        showSuccessToast("Veriler buluta gönderiliyor...");
        
        const res = await fetch(`https://kvdb.io/kd_sync_bucket_${key}/words`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(words)
        });

        if (res.ok) {
            alert("Senkronizasyon Başarılı! Kelimeleriniz buluta yüklendi.\nDiğer cihazınızda aynı anahtarı yazıp 'Buluttan Güncelle' tuşuna basarak yükleyebilirsiniz.");
        } else {
            alert("Bulut yüklemesi başarısız oldu. Hata kodu: " + res.status);
        }
    } catch (err) {
        console.error(err);
        alert("Buluta veri gönderilirken bağlantı hatası oluştu.");
    }
}

async function syncDownload() {
    const keyInput = document.getElementById('sync-key-input');
    if (!keyInput) return;

    const key = keyInput.value.trim();
    if (!key) {
        alert("Lütfen güncellemek istediğiniz Senkronizasyon Anahtarını girin.");
        return;
    }

    localStorage.setItem('kelime_dunyasi_sync_key', key);

    try {
        showSuccessToast("Buluttan veriler alınıyor...");
        
        const res = await fetch(`https://kvdb.io/kd_sync_bucket_${key}/words`);
        if (res.status === 404) {
            alert("Bu anahtara kayıtlı herhangi bir bulut yedek verisi bulunamadı.");
            return;
        }

        if (res.ok) {
            const imported = await res.json();
            if (Array.isArray(imported)) {
                const merged = [...words];
                let newCount = 0;
                
                imported.forEach(imp => {
                    const existingIdx = merged.findIndex(w => w.english.toLowerCase() === imp.english.toLowerCase());
                    if (existingIdx > -1) {
                        merged[existingIdx] = imp;
                    } else {
                        merged.push(imp);
                        newCount++;
                    }
                });

                words = merged;
                saveToStorage();
                updateDashboardStats();
                alert(`Güncelleme Başarılı! Buluttan ${imported.length} kelime alındı. (Bunun ${newCount} adedi yeni kelimedir)`);
            } else {
                alert("Buluttan gelen veri yapısı uyumsuz.");
            }
        } else {
            alert("Güncelleme verisi indirilemedi. Hata kodu: " + res.status);
        }
    } catch (err) {
        console.error(err);
        alert("Buluttan veri çekilirken bağlantı hatası oluştu.");
    }
}

