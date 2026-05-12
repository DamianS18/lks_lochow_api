// === BEZPIECZEŃSTWO: Funkcje pomocnicze ===

// Zapobiega XSS – zamienia znaki specjalne HTML na bezpieczne encje
function escapeHtml(text) {
    if (text === null || text === undefined) return '';
    const div = document.createElement('div');
    div.textContent = String(text);
    return div.innerHTML;
}

function jsArg(text) {
    return JSON.stringify(String(text ?? ''));
}

// Helper do nagłówków z tokenem – zapewnia że KAŻDY request jest autoryzowany
function authHeaders(withJson) {
    const h = { 'Authorization': 'Bearer ' + localStorage.getItem('klubToken') };
    if (withJson) h['Content-Type'] = 'application/json';
    return h;
}
// Jeden URL do konfiguracji – zmień na localhost:8000 w trybie deweloperskim
const API_URL = window.location.origin;

// Sprawdzanie czy token nie wygasł – jeśli tak, wyloguj
function sprawdzToken() {
    const token = localStorage.getItem('klubToken');
    if (!token) return false;
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.exp * 1000 < Date.now()) {
            localStorage.removeItem('klubToken');
            localStorage.removeItem('zalogowanyUser');
            showToast('Sesja wygasła. Zaloguj się ponownie.', 'warning');
            location.reload();
            return false;
        }
        return true;
    } catch (e) { return false; }
}

// === TOAST NOTIFICATIONS ===
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) { console.warn(message); return; }
    const toast = document.createElement('div');
    const icons = { success: 'check-circle-fill', error: 'x-circle-fill', warning: 'exclamation-triangle-fill', info: 'info-circle-fill' };
    toast.className = `toast-notification toast-${type}`;
    toast.innerHTML = `<i class="bi bi-${icons[type] || icons.info}"></i><span>${escapeHtml(message)}</span>`;
    container.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 400); }, 4000);
}

let confirmCallback = null;

function pokazPotwierdzenie(title, message, onConfirm) {
    document.getElementById('confirm-title').innerText = title;
    document.getElementById('confirm-message').innerText = message;
    confirmCallback = onConfirm;
    document.getElementById('confirm-modal').classList.remove('view-hidden');
}

function zamknijPotwierdzenie() {
    document.getElementById('confirm-modal').classList.add('view-hidden');
    confirmCallback = null;
}

document.getElementById('confirm-action-btn').addEventListener('click', async () => {
    const action = confirmCallback;
    zamknijPotwierdzenie();
    if (action) await action();
});

const publicSections = {
    home: {
        title: 'ŁKS Łochów',
        body: 'Klubowe centrum dla rodziców, trenerów i administratorów. Wszystko w jednym miejscu: treningi, obozy, składki i komunikacja.',
        pills: ['System klubowy', 'Akademia piłkarska', 'Panel rodzica']
    },
    onas: {
        title: 'O nas',
        body: 'Prowadzimy grupy dziecięce 2012-2015, treningi techniczne, mecze kontrolne i obozy letnie. Stawiamy na regularność, bezpieczeństwo i dobrą komunikację z rodzicami.',
        pills: ['Treningi 3x tygodniowo', 'Kadra UEFA Grassroots', 'Opieka medyczna']
    },
    aktualnosci: {
        title: 'Aktualności',
        body: 'Najbliższy tydzień: sparing rocznika 2014, otwarty trening naborowy oraz zapisy na letni obóz klubowy. Szczegóły pojawią się w panelu po zalogowaniu.',
        pills: ['Nabór otwarty', 'Obóz letni', 'Sparing sobota']
    },
    kontakt: {
        title: 'Kontakt',
        body: 'Boisko klubowe: ul. Sportowa 7, Łochów. Telefon organizacyjny: 500 123 456. E-mail: kontakt@lkslochow.pl. Godziny biura: wtorek i czwartek 17:00-19:00.',
        pills: ['ul. Sportowa 7', '500 123 456', 'kontakt@lkslochow.pl']
    }
};

function przewinDoSekcji(id) {
    const target = document.getElementById(id);
    if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    // Zamknij menu po kliknięciu (opcjonalnie)
    const menu = document.getElementById('glowne-menu');
    const icon = document.getElementById('burger-icon');
    if (menu && !menu.classList.contains('menu-hidden')) {
        menu.classList.add('menu-hidden');
        if (icon) icon.className = 'bi bi-list';
    }
}

function pokazSekcjePubliczna(section) {
    const mapa = {
        home: 'sec-home',
        onas: 'sec-onas',
        aktualnosci: 'sec-aktualnosci',
        kontakt: 'sec-kontakt'
    };
    const id = mapa[section] || 'sec-home';
    przewinDoSekcji(id);
}

function zamknijSekcjePubliczna() {
    przewinDoSekcji('sec-home');
}

function otworzResetHasla() {
    document.getElementById('modal-reset-hasla').classList.remove('view-hidden');
    przelaczResetHasla('request');
}

function zamknijResetHasla() {
    document.getElementById('modal-reset-hasla').classList.add('view-hidden');
}

function przelaczResetHasla(mode) {
    const isRequest = mode === 'request';
    document.getElementById('reset-request-form').classList.toggle('view-hidden', !isRequest);
    document.getElementById('reset-set-form').classList.toggle('view-hidden', isRequest);
    document.getElementById('reset-tab-request').classList.toggle('active', isRequest);
    document.getElementById('reset-tab-set').classList.toggle('active', !isRequest);
}

async function wyslijProsbeResetu(e) {
    e.preventDefault();
    try {
        const email = document.getElementById('reset-email').value;
        await fetch(`${API_URL}/users/reset-hasla/prosba`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        showToast('Prośba została wysłana do administratora.', 'success');
        przelaczResetHasla('set');
        document.getElementById('reset-set-email').value = email;
    } catch (err) {
        showToast('Nie udało się wysłać prośby', 'error');
    }
}

async function ustawNoweHaslo(e) {
    e.preventDefault();
    const payload = {
        email: document.getElementById('reset-set-email').value,
        kod: document.getElementById('reset-code').value,
        nowe_haslo: document.getElementById('reset-new-pass').value,
        powtorz_haslo: document.getElementById('reset-new-pass2').value
    };
    try {
        const res = await fetch(`${API_URL}/users/reset-hasla/ustaw`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.detail || 'Błąd resetu');
        showToast(data.wiadomosc || 'Hasło zmienione.', 'success');
        zamknijResetHasla();
    } catch (err) {
        showToast(err.message || 'Nie udało się ustawić hasła', 'error');
    }
}

// === SPINNER & EMPTY STATE HELPERS ===
function spinner(text = 'Ładowanie...') {
    return `<div class="spinner-container"><div class="custom-spinner"></div><div class="spinner-text">${escapeHtml(text)}</div></div>`;
}
function emptyState(icon, text) {
    return `<div class="empty-state"><i class="bi bi-${escapeHtml(icon)}"></i><p>${escapeHtml(text)}</p></div>`;
}

// === FETCH WRAPPER WITH RETRY ===
async function apiFetch(url, options = {}) {
    for (let attempt = 0; attempt < 2; attempt++) {
        try {
            const res = await fetch(url, options);
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.detail || `Błąd serwera (${res.status})`);
            }
            return res;
        } catch (e) {
            if (attempt === 1 || e.message.includes('Błąd serwera')) throw e;
            await new Promise(r => setTimeout(r, 1000));
        }
    }
}

// === FORM VALIDATION ===
function sprawdzSileHasla(val) {
    const bar = document.getElementById('password-bar');
    const hint = document.getElementById('password-hint');
    if (!bar) return;
    let score = 0;
    if (val.length >= 6) score++;
    if (val.length >= 10) score++;
    if (/[A-Z]/.test(val)) score++;
    if (/[0-9]/.test(val)) score++;
    if (/[^a-zA-Z0-9]/.test(val)) score++;
    const pct = Math.min(score * 25, 100);
    const colors = ['#dc3545', '#fd7e14', '#ffc107', '#198754'];
    const labels = ['Słabe', 'Przeciętne', 'Dobre', 'Silne'];
    const idx = Math.min(Math.floor(score / 1.5), 3);
    bar.style.width = pct + '%';
    bar.style.background = colors[idx];
    hint.textContent = val.length === 0 ? 'Min. 6 znaków, wielka litera i cyfra' : labels[idx];
    hint.style.color = colors[idx];
}

function walidujRejestracje() {
    console.log('[DEBUG] Start walidacji');
    
    // 1. POBIERAMY WSZYSTKIE DANE Z FORMULARZA
    const h = document.getElementById('reg-haslo').value;
    const h2 = document.getElementById('reg-haslo2').value;
    const rocznikInput = document.getElementById('reg-rocznik');
    
    // 2. DEFINIUJEMY ZMIENNE, KTÓRYCH BRAKOWAŁO
    const rocznik = rocznikInput ? parseInt(rocznikInput.value) : 0;
    const aktualnyRok = new Date().getFullYear(); // <--- TO TEGO BRAKOWAŁO

    // 3. WALIDACJA ROCZNIKA
    if (!rocznik || rocznik < 2000 || rocznik > aktualnyRok) {
        showToast(`Podaj poprawny rocznik (2000 - ${aktualnyRok})`, 'error');
        return false;
    }

    // 4. WALIDACJA HASŁA
    if (h.length < 6) { 
        showToast('Hasło musi mieć minimum 6 znaków', 'error'); 
        return false; 
    }
    if (!/[A-Z]/.test(h)) { 
        showToast('Hasło musi zawierać przynajmniej jedną wielką literę', 'error'); 
        return false; 
    }
    if (!/[0-9]/.test(h)) { 
        showToast('Hasło musi zawierać przynajmniej jedną cyfrę', 'error'); 
        return false; 
    }
    if (h !== h2) { 
        showToast('Hasła nie są identyczne', 'error'); 
        return false; 
    }

    console.log('[DEBUG] Walidacja OK');
    return true;
}

// === DASHBOARD ===
async function zaladujDashboard() {
    const statsDiv = document.getElementById('dashboard-stats');
    const eventsDiv = document.getElementById('dashboard-events');
    const actionsDiv = document.getElementById('dashboard-actions');
    const user = JSON.parse(localStorage.getItem('zalogowanyUser'));
    if (!user) return;
    statsDiv.innerHTML = spinner('Ładowanie statystyk...');
    try {
        const [usersRes, eventsRes] = await Promise.all([
            fetch(API_URL + '/users/', { headers: authHeaders() }),
            fetch(API_URL + '/events/', { headers: authHeaders() })
        ]);
        const users = await usersRes.json();
        const events = await eventsRes.json();
        const rodzice = users.filter(u => u.rola === 'rodzic');
        const trenerzy = users.filter(u => u.rola === 'trener');
        const now = new Date();
        const upcoming = events.filter(e => new Date(e.data_rozpoczecia) >= now).sort((a, b) => new Date(a.data_rozpoczecia) - new Date(b.data_rozpoczecia)).slice(0, 5);
        let statsHTML = '';
        if (user.rola === 'admin') {
            const aktywni = rodzice.filter(u => u.czy_aktywny).length;
            const czekajacy = rodzice.filter(u => !u.czy_aktywny).length;
            statsHTML = `
                        <div class="col-md-3 col-6"><div class="stat-card"><div class="stat-icon bg-success"><i class="bi bi-people-fill"></i></div><div><div class="stat-value">${rodzice.length}</div><div class="stat-label">Zawodników</div></div></div></div>
                        <div class="col-md-3 col-6"><div class="stat-card"><div class="stat-icon bg-primary"><i class="bi bi-person-badge"></i></div><div><div class="stat-value">${trenerzy.length}</div><div class="stat-label">Trenerów</div></div></div></div>
                        <div class="col-md-3 col-6"><div class="stat-card"><div class="stat-icon bg-info"><i class="bi bi-calendar-check"></i></div><div><div class="stat-value">${events.length}</div><div class="stat-label">Wydarzeń</div></div></div></div>
                        <div class="col-md-3 col-6"><div class="stat-card"><div class="stat-icon" style="background:linear-gradient(135deg,#fd7e14,#ffc107)"><i class="bi bi-hourglass-split"></i></div><div><div class="stat-value">${czekajacy}</div><div class="stat-label">Czeka na akceptację</div></div></div></div>`;
        } else if (user.rola === 'trener') {
            const mKlucz = pobierzIdentyfikatorTrenera(user);
            const mojaGrupa = rodzice.filter(u => u.przypisany_trener === mKlucz);
            const mojeTreningi = events.filter(e => new Date(e.data_rozpoczecia) >= now);
            statsHTML = `
                        <div class="col-md-4 col-6"><div class="stat-card"><div class="stat-icon bg-success"><i class="bi bi-people-fill"></i></div><div><div class="stat-value">${mojaGrupa.length}</div><div class="stat-label">Moja grupa</div></div></div></div>
                        <div class="col-md-4 col-6"><div class="stat-card"><div class="stat-icon bg-primary"><i class="bi bi-calendar-week"></i></div><div><div class="stat-value">${mojeTreningi.length}</div><div class="stat-label">Nadchodzące zajęcia</div></div></div></div>
                        <div class="col-md-4 col-6"><div class="stat-card"><div class="stat-icon bg-info"><i class="bi bi-file-earmark-text"></i></div><div><div class="stat-value">${events.length}</div><div class="stat-label">Wszystkie wydarzenia</div></div></div></div>`;
        } else {
            statsHTML = `
                        <div class="col-md-4 col-6"><div class="stat-card"><div class="stat-icon bg-success"><i class="bi bi-person-circle"></i></div><div><div class="stat-value">${escapeHtml(user.imie_dziecka || '?')}</div><div class="stat-label">${escapeHtml(user.nazwisko_dziecka || 'Zawodnik')}</div></div></div></div>
                        <div class="col-md-4 col-6"><div class="stat-card"><div class="stat-icon bg-primary"><i class="bi bi-calendar-check"></i></div><div><div class="stat-value">${upcoming.length}</div><div class="stat-label">Nadchodzące</div></div></div></div>
                        <div class="col-md-4 col-6"><div class="stat-card"><div class="stat-icon bg-info"><i class="bi bi-shield-check"></i></div><div><div class="stat-value">${user.przypisany_trener || '—'}</div><div class="stat-label">Grupa</div></div></div></div>`;
        }
        statsDiv.innerHTML = statsHTML;
        // Events
        if (upcoming.length === 0) {
            eventsDiv.innerHTML = emptyState('calendar-x', 'Brak nadchodzących wydarzeń');
        } else {
            eventsDiv.innerHTML = upcoming.map(e => {
                const d = new Date(e.data_rozpoczecia);
                const color = e.typ === 'mecz' ? '#dc3545' : '#198754';
                return `<div class="upcoming-event-item"><div class="event-dot" style="background:${color}"></div><div class="flex-grow-1"><div class="fw-bold small">${escapeHtml(e.nazwa)}</div><div class="text-muted" style="font-size:0.78rem">${d.toLocaleDateString('pl-PL')} ${d.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}</div></div><span class="badge" style="background:${color}">${e.typ}</span></div>`;
            }).join('');
        }
        // Quick actions
        let actHTML = '';
        if (user.rola === 'admin') {
            actHTML = `<button class="btn btn-outline-primary w-100 text-start" onclick="zmienZakladke('admin', document.querySelector('[onclick*=admin]'))"><i class="bi bi-people-fill me-2"></i>Zarządzaj zawodnikami</button>
                        <button class="btn btn-outline-success w-100 text-start" onclick="zmienZakladke('admin-magazyn', document.querySelector('[onclick*=admin-magazyn]'))"><i class="bi bi-box-seam me-2"></i>Magazyn sprzętu</button>`;
        } else if (user.rola === 'trener') {
            actHTML = `<button class="btn btn-outline-primary w-100 text-start" onclick="zmienZakladke('kalendarz', document.querySelector('[onclick*=kalendarz]'))"><i class="bi bi-calendar-plus me-2"></i>Zaplanuj trening</button>
                        <button class="btn btn-outline-success w-100 text-start" onclick="zmienZakladke('konspekty', document.querySelector('[onclick*=konspekty]'))"><i class="bi bi-file-earmark-text me-2"></i>Nowy konspekt</button>`;
        } else {
            actHTML = `<button class="btn btn-outline-primary w-100 text-start" onclick="zmienZakladke('platnosci', document.querySelector('[onclick*=platnosci]'))"><i class="bi bi-credit-card me-2"></i>Sprawdź składki</button>
                        <button class="btn btn-outline-success w-100 text-start" onclick="zmienZakladke('karta-zawodnika', document.querySelector('[onclick*=karta-zawodnika]'))"><i class="bi bi-clipboard2-pulse me-2"></i>Karta zawodnika</button>`;
        }
        actionsDiv.innerHTML = actHTML;
    } catch (e) { statsDiv.innerHTML = emptyState('exclamation-triangle', 'Błąd ładowania danych'); console.error(e); }
}

// === OFFLINE DETECTION ===
window.addEventListener('online', () => { document.getElementById('offline-indicator').classList.add('view-hidden'); showToast('Połączenie przywrócone!', 'success'); });
window.addEventListener('offline', () => { document.getElementById('offline-indicator').classList.remove('view-hidden'); showToast('Brak połączenia z internetem', 'error'); });

// === MOBILE SIDEBAR ===
function toggleMobileSidebar() {
    const sb = document.querySelector('.saas-sidebar');
    if (sb.classList.contains('mobile-open')) {
        sb.classList.remove('mobile-open');
        document.querySelectorAll('.sidebar-backdrop').forEach(b => b.remove());
    } else {
        sb.classList.add('mobile-open');
        const bd = document.createElement('div');
        bd.className = 'sidebar-backdrop';
        bd.onclick = () => toggleMobileSidebar();
        document.body.appendChild(bd);
    }
}

async function zapiszOboz(e) {
    e.preventDefault();
    const payload = {
        nazwa: document.getElementById('ob-nazwa').value,
        grupa: document.getElementById('ob-grupa').value,
        od: document.getElementById('ob-od').value,
        do: document.getElementById('ob-do').value,
        cena: parseInt(document.getElementById('ob-cena').value),
        opis: document.getElementById('ob-opis').value
    };
    try {
        const token = localStorage.getItem('klubToken');
        const res = await fetch(API_URL + '/events/obozy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            document.getElementById('modal-dodaj-oboz').classList.add('view-hidden');
            document.getElementById('ob-nazwa').value = '';
            document.getElementById('ob-opis').value = '';
            renderujObozyAdmin();
        } else {
            showToast('Serwer odrzucił dane', 'error');
        }
    } catch (e) { showToast('Błąd zapisu obozu', 'error'); }
}

async function renderujObozyAdmin() {
    const grid = document.getElementById('admin-obozy-grid');
    grid.innerHTML = spinner('Ładowanie obozów...');
    try {
        const token = localStorage.getItem('klubToken');
        const odp = await fetch(API_URL + '/events/obozy', { headers: { 'Authorization': 'Bearer ' + token } });
        const obozy = await odp.json();

        grid.innerHTML = '';
        if (obozy.length === 0) { grid.innerHTML = emptyState('geo-alt', 'Brak obozów w bazie'); return; }
        obozy.forEach(o => {
            let g = o.grupa === 'ALL' ? 'Cały Klub' : o.grupa;
            grid.innerHTML += `<div class="col-md-6"><div class="card"><h5 class="fw-bold text-primary">${escapeHtml(o.nazwa)}</h5><span class="badge bg-primary mb-2 w-50">${escapeHtml(g)}</span><p class="small text-muted mb-1">${escapeHtml(o.od)} - ${escapeHtml(o.do)}</p><p class="small text-danger fw-bold">${escapeHtml(o.cena)} PLN</p><p class="small bg-light p-2 rounded">${escapeHtml(o.opis)}</p>
                    <div class="d-flex gap-2 mt-2">
                        <button class="btn btn-sm btn-primary w-75 fw-bold" onclick="pokazUczestnikowObozu(${o.id}, ${jsArg(o.nazwa)})"><i class="bi bi-list-check"></i> Zapisane dzieci</button>
                        <button class="btn btn-sm btn-outline-danger w-25" onclick="usunOboz(${o.id})" title="Usuń obóz"><i class="bi bi-trash"></i></button>
                    </div>
                    </div></div>`;
        });
    } catch (e) { grid.innerHTML = 'Błąd pobierania danych.'; }
}

async function pokazUczestnikowObozu(obozId, nazwa) {
    document.getElementById('uo-nazwa').innerText = nazwa;
    const lista = document.getElementById('uo-lista');
    lista.innerHTML = '<tr><td class="text-center py-3">Pobieranie bazy danych...</td></tr>';
    document.getElementById('modal-uczestnicy-obozu').classList.remove('view-hidden');

    try {
        const token = localStorage.getItem('klubToken');
        const res = await fetch(`${API_URL}/events/obozy/${obozId}/zapisy`, {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        const zapisy = await res.json();

        lista.innerHTML = '';
        if (zapisy.length === 0) {
            lista.innerHTML = '<tr><td class="text-center text-muted py-3">Jeszcze nikt się nie zapisał.</td></tr>';
            return;
        }
        zapisy.forEach(z => {
            lista.innerHTML += `<tr><td class="fw-bold"><i class="bi bi-person-check-fill text-success me-2"></i> ${escapeHtml(z.imie_dziecka)} ${escapeHtml(z.nazwisko_dziecka)}</td></tr>`;
        });
    } catch (e) {
        lista.innerHTML = '<tr><td class="text-danger text-center py-3">Błąd połączenia z serwerem.</td></tr>';
    }
}

async function usunOboz(id) {
    pokazPotwierdzenie('Usunąć obóz?', 'Ta akcja usunie obóz z bazy. Kontynuować?', async () => {
        try {
            const token = localStorage.getItem('klubToken');
            await fetch(`${API_URL}/events/obozy/${id}`, { method: 'DELETE', headers: { 'Authorization': 'Bearer ' + token } });
            renderujObozyAdmin();
            showToast('Obóz usunięty', 'success');
        } catch (e) { showToast('Błąd usuwania', 'error'); }
    });
}

async function renderujObozyRodzic() {
    const user = JSON.parse(localStorage.getItem('zalogowanyUser'));
    const grid = document.getElementById('rodzic-obozy-grid');
    grid.innerHTML = spinner('Szukanie ofert...');
    try {
        const token = localStorage.getItem('klubToken');
        const odp = await fetch(API_URL + '/events/obozy', { headers: { 'Authorization': 'Bearer ' + token } });
        const wszystkieObozy = await odp.json();

        const dedykowaneObozy = wszystkieObozy.filter(o => o.grupa === 'ALL' || o.grupa === user.przypisany_trener);

        grid.innerHTML = '';
        if (dedykowaneObozy.length === 0) { grid.innerHTML = emptyState('geo-alt', 'Brak obozów dla Twojej grupy'); return; }

        for (let o of dedykowaneObozy) {
            const resZapisy = await fetch(`${API_URL}/events/obozy/${o.id}/zapisy`, { headers: { 'Authorization': 'Bearer ' + token } });
            const zapisy = await resZapisy.json();
            const czyJuzZapisano = zapisy.some(z => z.user_id === user.id);

            let btnAkcja = czyJuzZapisano
                ? `<button class="btn btn-secondary fw-bold w-100 mt-2" disabled><i class="bi bi-check-circle"></i> Zapisano</button>`
                : `<button class="btn btn-primary fw-bold w-100 mt-2" onclick="zapiszNaOboz(${o.id})">Zapisz dziecko</button>`;

            grid.innerHTML += `<div class="col-md-6"><div class="card text-center"><div class="fs-1 text-primary mb-2"><i class="bi bi-sun"></i></div><h4 class="fw-bold">${escapeHtml(o.nazwa)}</h4><p class="text-muted">${escapeHtml(o.od)} do ${escapeHtml(o.do)}</p><p class="small bg-light p-3 rounded">${escapeHtml(o.opis)}</p><h3 class="text-success fw-bold mt-auto pt-3">${escapeHtml(o.cena)} PLN</h3>${btnAkcja}</div></div>`;
        }
    } catch (e) { grid.innerHTML = 'Błąd pobierania ofert.'; }
}

async function zapiszNaOboz(obozId) {
    const user = JSON.parse(localStorage.getItem('zalogowanyUser'));

    if (!user.imie_dziecka || !user.nazwisko_dziecka) {
        showToast('Nie wprowadzono danych dziecka', 'warning');
        return;
    }

    try {
        const token = localStorage.getItem('klubToken');
        const res = await fetch(`${API_URL}/events/obozy/${obozId}/zapisy`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
            body: JSON.stringify({})
        });

        if (res.ok) {
            showToast('Dziecko zapisane na obóz!', 'success');
            renderujObozyRodzic();
        } else {
            const err = await res.json();
            showToast(err.detail || 'Błąd serwera', 'error');
        }
    } catch (e) {
        showToast('Błąd połączenia', 'error');
    }
}

async function otworzModalObozu() {
    const select = document.getElementById('ob-grupa');
    select.innerHTML = '<option value="ALL" selected>Wszyscy (Cały Klub)</option>';
    try {
        const odp = await fetch(API_URL + '/users/', { headers: { 'Authorization': 'Bearer ' + localStorage.getItem('klubToken') } });
        const wszyscy = await odp.json();
        wszyscy.filter(u => u.rola === 'trener').forEach(t => {
            let pNazwa = pobierzIdentyfikatorTrenera(t);
            select.innerHTML += `<option value="${pNazwa}">Grupa: ${pNazwa}</option>`;
        });
    } catch (e) { console.error(e); }
    document.getElementById('modal-dodaj-oboz').classList.remove('view-hidden');
}


// --- 2. MAGAZYN SPRZĘTU ---
async function dodajSprzet(e) {
    e.preventDefault();
    const payload = { nazwa: document.getElementById('mag-nazwa').value, ilosc: parseInt(document.getElementById('mag-ilosc').value) };
    try {
        await fetch(API_URL + '/events/magazyn/sprzet', { method: 'POST', headers: authHeaders(true), body: JSON.stringify(payload) });
        document.getElementById('modal-dodaj-sprzet').classList.add('view-hidden');
        document.getElementById('mag-nazwa').value = ''; document.getElementById('mag-ilosc').value = '';
        renderujMagazyn();
    } catch (e) { showToast('Wystąpił błąd', 'error'); }
}

async function otworzWydanieSprzetu() {
    const trSelect = document.getElementById('wyd-trener');
    const spSelect = document.getElementById('wyd-sprzet');
    spSelect.innerHTML = '<option>Ładowanie...</option>'; trSelect.innerHTML = '<option>Ładowanie...</option>';
    document.getElementById('modal-wydaj-sprzet').classList.remove('view-hidden');
    try {
        const resSprzet = await fetch(API_URL + '/events/magazyn/sprzet', { headers: authHeaders() });
        const sprzet = await resSprzet.json();
        spSelect.innerHTML = '';
        sprzet.forEach(s => { spSelect.innerHTML += `<option value="${s.id}" data-nazwa="${s.nazwa}">${s.nazwa} (Dostępne: ${s.ilosc})</option>`; });

        const token = localStorage.getItem('klubToken');
        const resUsers = await fetch(API_URL + '/users/', { headers: { 'Authorization': 'Bearer ' + token } });
        const users = await resUsers.json();
        trSelect.innerHTML = '';
        users.filter(u => u.rola === 'trener').forEach(t => { trSelect.innerHTML += `<option value="${escapeHtml(t.nazwisko)}">${escapeHtml(t.imie)} ${escapeHtml(t.nazwisko)}</option>`; });
    } catch (e) { showToast('Błąd pobierania danych', 'error'); }
}

async function wydajSprzet(e) {
    e.preventDefault();
    let spSelect = document.getElementById('wyd-sprzet');
    let spId = parseInt(spSelect.value);
    let spNazwa = spSelect.options[spSelect.selectedIndex].getAttribute('data-nazwa');
    let ilosc = parseInt(document.getElementById('wyd-ilosc').value);
    let trener = document.getElementById('wyd-trener').value;

    const payload = { sprzet_id: spId, nazwa: spNazwa, ilosc: ilosc, trener: trener };

    try {
        const res = await fetch(API_URL + '/events/magazyn/wydania', { method: 'POST', headers: authHeaders(true), body: JSON.stringify(payload) });
        if (res.ok) {
            document.getElementById('modal-wydaj-sprzet').classList.add('view-hidden');
            document.getElementById('wyd-ilosc').value = '';
            renderujMagazyn();
        } else {
            showToast('Brak wystarczającej ilości w magazynie', 'warning');
        }
    } catch (e) { showToast('Błąd serwera', 'error'); }
}

async function renderujMagazyn() {
    const lista = document.getElementById('admin-magazyn-lista');
    lista.innerHTML = '<tr><td colspan="3" class="text-center">' + spinner('Ładowanie magazynu...') + '</td></tr>';
    try {
        const resSprzet = await fetch(API_URL + '/events/magazyn/sprzet', { headers: authHeaders() });
        const sprzet = await resSprzet.json();
        const resWydania = await fetch(API_URL + '/events/magazyn/wydania', { headers: authHeaders() });
        const wydania = await resWydania.json();

        lista.innerHTML = '';
        if (sprzet.length === 0) { lista.innerHTML = '<tr><td colspan="3" class="text-center text-muted py-4">Brak sprzętu w magazynie</td></tr>'; return; }
        sprzet.forEach(s => {
            let wydano = wydania.filter(w => w.sprzet_id === s.id).reduce((sum, w) => sum + w.ilosc, 0);
            lista.innerHTML += `<tr><td class="fw-bold">${escapeHtml(s.nazwa)}</td><td><span class="badge bg-success fs-6">${s.ilosc} szt.</span></td><td><span class="badge bg-secondary fs-6">${wydano} szt.</span></td></tr>`;
        });
    } catch (e) { console.error(e); }
}

async function renderujSprzetTrenera() {
    const user = JSON.parse(localStorage.getItem('zalogowanyUser'));
    const lista = document.getElementById('lista-sprzetu-trenera');
    lista.innerHTML = '<tr><td colspan="2" class="text-center">' + spinner() + '</td></tr>';
    try {
        const resWydania = await fetch(API_URL + '/events/magazyn/wydania', { headers: authHeaders() });
        const wydania = await resWydania.json();
        lista.innerHTML = '';
        let mojeWydania = wydania.filter(w => w.trener === user.nazwisko);
        if (mojeWydania.length === 0) { lista.innerHTML = '<tr><td colspan="2" class="text-center text-muted py-4">Brak powierzonego sprzętu.</td></tr>'; return; }
        mojeWydania.forEach(w => { lista.innerHTML += `<tr><td class="fw-bold">${escapeHtml(w.nazwa)} <div class="small text-muted">Wydano: ${escapeHtml(w.data)}</div></td><td><span class="badge bg-primary fs-6">${w.ilosc} sztuk</span></td></tr>`; });
    } catch (e) { console.error(e); }
}

// --- 3. KONSPEKTY ---
async function zapiszKonspekt(e) {
    e.preventDefault();
    const user = JSON.parse(localStorage.getItem('zalogowanyUser'));
    const payload = {
        temat: document.getElementById('k-temat').value,
        cel: document.getElementById('k-cel').value,
        czas: parseInt(document.getElementById('k-czas').value),
        opis: document.getElementById('k-opis').value
    };
    try {
        await fetch(API_URL + '/events/konspekty', { method: 'POST', headers: authHeaders(true), body: JSON.stringify(payload) });
        document.getElementById('konspekt-form').reset();
        document.getElementById('formularz-konspektu').classList.add('view-hidden');
        renderujKonspekty();
    } catch (e) { showToast('Błąd zapisu', 'error'); }
}

async function renderujKonspekty() {
    const lista = document.getElementById('lista-konspektow');
    lista.innerHTML = spinner('Ładowanie konspektów...');
    try {
        const res = await fetch(API_URL + '/events/konspekty', { headers: authHeaders() });
        const konspektyBaza = await res.json();
        lista.innerHTML = '';
        if (konspektyBaza.length === 0) { lista.innerHTML = emptyState('file-earmark-text', 'Brak konspektów'); return; }
        konspektyBaza.forEach(k => { lista.innerHTML += `<div class="col-md-6"><div class="card"><div class="d-flex justify-content-between align-items-start mb-2"><h5 class="fw-bold text-success m-0">${escapeHtml(k.temat)}</h5><span class="badge bg-secondary">${escapeHtml(k.czas)} min</span></div><h6 class="text-muted small mb-3">Cel: ${escapeHtml(k.cel)}</h6><p class="small bg-light p-3 rounded">${escapeHtml(k.opis)}</p><div class="small text-muted text-end border-top pt-2 mt-2">Utworzono: ${escapeHtml(k.data)}</div></div></div>`; });
    } catch (e) { console.error(e); }
}

// --- 4. OCENY I SCOUTING ---
async function wczytajZawodnikowDoOcen() {
    const select = document.getElementById('o-zawodnik');
    try {
        const u = JSON.parse(localStorage.getItem('zalogowanyUser'));
        let mKlucz = pobierzIdentyfikatorTrenera(u);
        const odp = await fetch(API_URL + '/users/', { headers: { 'Authorization': 'Bearer ' + localStorage.getItem('klubToken') } });
        const wszyscy = await odp.json();
        const mojaGrupa = wszyscy.filter(z => z.rola === 'rodzic' && z.przypisany_trener === mKlucz);
        select.innerHTML = '<option value="" disabled selected>-- Wybierz --</option>';
        mojaGrupa.forEach(z => { select.innerHTML += `<option value="${z.imie_dziecka} ${z.nazwisko_dziecka}">${z.imie_dziecka} ${z.nazwisko_dziecka}</option>`; });
    } catch (e) { console.error(e); }
}

async function zapiszOcene(e) {
    e.preventDefault();
    const user = JSON.parse(localStorage.getItem('zalogowanyUser'));
    const payload = {
        zawodnik: document.getElementById('o-zawodnik').value,
        mecz: document.getElementById('o-mecz').value,
        tech: parseInt(document.getElementById('o-technika').value),
        mot: parseInt(document.getElementById('o-motoryka').value),
        wal: parseInt(document.getElementById('o-walka').value),
        uwagi: document.getElementById('o-uwagi').value
    };
    try {
        await fetch(API_URL + '/events/ratings', {
            method: 'POST',
            headers: authHeaders(true),
            body: JSON.stringify(payload)
        });
        document.getElementById('ocena-form').reset();
        document.getElementById('formularz-oceny').classList.add('view-hidden');
        renderujOceny();
    } catch (e) { showToast('Błąd zapisu oceny', 'error'); }
}

async function renderujOceny() {
    const lista = document.getElementById('lista-ocen');
    lista.innerHTML = spinner('Pobieranie ocen...');
    try {
        const res = await fetch(API_URL + '/events/ratings', { headers: authHeaders() });
        const oceny = await res.json();
        lista.innerHTML = '';
        if (oceny.length === 0) { lista.innerHTML = emptyState('star', 'Brak ocen w systemie'); return; }
        oceny.forEach(o => {
            let srednia = ((o.tech + o.mot + o.wal) / 3).toFixed(1);
            lista.innerHTML += `<div class="col-md-6"><div class="card"><div class="d-flex justify-content-between align-items-center mb-2"><h5 class="fw-bold m-0 text-primary">${escapeHtml(o.zawodnik)}</h5><span class="badge bg-success fs-6">Średnia: ${srednia} / 5</span></div><h6 class="text-muted small mb-3">Mecz: ${escapeHtml(o.mecz)} (${escapeHtml(o.data)})</h6><div class="row text-center mb-3"><div class="col-4 border-end"><div class="small fw-bold">Tech</div><div class="fs-5 text-success">${o.tech}</div></div><div class="col-4 border-end"><div class="small fw-bold">Mot</div><div class="fs-5 text-success">${o.mot}</div></div><div class="col-4"><div class="small fw-bold">Wal</div><div class="fs-5 text-success">${o.wal}</div></div></div><div class="small bg-light p-2 rounded">${escapeHtml(o.uwagi) || 'Brak dodatkowych uwag.'}</div></div></div>`;
        });
    } catch (e) { console.error(e); }
}

// --- POZOSTAŁE FUNKCJE SYSTEMOWE ---
async function zaladujPanelAdmina() {
    try {
        const token = localStorage.getItem('klubToken');
        const odp = await fetch(API_URL + '/users/', { headers: { 'Authorization': 'Bearer ' + token } });
        const users = await odp.json();
        const tbody = document.getElementById('admin-table-body'); tbody.innerHTML = '';
        const tylkoRodzice = users.filter(u => u.rola === 'rodzic');
        if (tylkoRodzice.length === 0) { tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-4">Brak zawodników.</td></tr>'; return; }
        tylkoRodzice.forEach(u => {
            let dzieckoInfo = u.imie_dziecka ? `<span class="fw-bold">${escapeHtml(u.imie_dziecka)} ${escapeHtml(u.nazwisko_dziecka)}</span> <span class="badge bg-secondary ms-1">${escapeHtml(u.rocznik_dziecka)}</span>` : '<span class="text-danger small">Brak danych</span>';
            let trenerInfo = u.przypisany_trener ? `<span class="badge bg-primary">${escapeHtml(u.przypisany_trener)}</span>` : `<span class="badge bg-secondary">Brak przypisania</span>`;
            let imieDoModala = u.imie_dziecka ? `${u.imie_dziecka} ${u.nazwisko_dziecka}` : 'Nieznany zawodnik'; let bKoniec = u.badania_koniec ? u.badania_koniec : '';

            let btnAkceptuj = u.czy_aktywny ? `<span class="badge bg-success mb-2 w-100">Aktywny</span>` : `<button class="btn btn-warning btn-sm w-100 mb-2 fw-bold text-dark" onclick="akceptujRodzica(${u.id})"><i class="bi bi-check-circle"></i> AKCEPTUJ KONTO</button>`;
            let btnReset = u.reset_hasla_requested ? `<button class="btn btn-info btn-sm w-100 mb-2 fw-bold text-dark" onclick="zaakceptujResetHasla(${u.id})"><i class="bi bi-key"></i> RESET HASŁA</button>` : '';
            let btnPlatnosc = `<button class="btn btn-sm btn-outline-success w-100 mb-1" onclick="otworzModalPlatnosci(${u.id}, ${jsArg(imieDoModala)})"><i class="bi bi-cash"></i> Wpłaty</button>`;
            let btnKarta = `<button class="btn btn-sm btn-outline-danger w-100" onclick="pokazKarteMedyczna(${u.id}, ${jsArg(imieDoModala)}, ${jsArg(bKoniec)})"><i class="bi bi-heart-pulse"></i> Karta</button>`;
            let btnGrupa = `<button class="btn btn-sm btn-outline-primary w-100 mb-1" onclick="otworzModalTrenera(${u.id}, ${jsArg(imieDoModala)})"><i class="bi bi-diagram-3"></i> Przypisz</button>`;
            let opcjeOpiekuna = u.czy_aktywny ? (btnPlatnosc + btnKarta) : '<span class="text-muted small">Czeka na akceptację</span>';

            tbody.innerHTML += `<tr>
                        <td><div class="fw-bold">${escapeHtml(u.imie)} ${escapeHtml(u.nazwisko)}</div><div class="small text-muted">${escapeHtml(u.email)}</div>${btnAkceptuj}${btnReset}</td>
                        <td class="small">${dzieckoInfo}</td>
                        <td>${trenerInfo}</td>
                        <td style="min-width: 150px;">${opcjeOpiekuna}</td>
                        <td class="text-end" style="min-width: 140px;">${btnGrupa}<button class="btn btn-sm btn-outline-secondary w-100" onclick="usunUsera(${u.id}, false)"><i class="bi bi-trash"></i> Usuń</button></td>
                    </tr>`;
        });
    } catch (e) { console.error(e); }
}

async function akceptujRodzica(id) {
    try {
        const token = localStorage.getItem('klubToken');
        await fetch(`${API_URL}/users/${id}/akceptuj`, { method: 'PATCH', headers: { 'Authorization': 'Bearer ' + token } });
        showToast('Konto zaakceptowane!', 'success');
        zaladujPanelAdmina();
    } catch (e) { showToast('Błąd akceptacji konta', 'error'); }
}

async function zaakceptujResetHasla(id) {
    try {
        const token = localStorage.getItem('klubToken');
        const res = await fetch(`${API_URL}/users/${id}/reset-hasla/akceptuj`, { method: 'PATCH', headers: { 'Authorization': 'Bearer ' + token } });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.detail || 'Błąd akceptacji resetu');
        const codeText = data.kod ? ` Kod: ${data.kod}` : '';
        showToast(`Reset hasła zaakceptowany.${codeText}`, 'success');
        zaladujPanelAdmina();
    } catch (e) { showToast(e.message || 'Błąd akceptacji resetu', 'error'); }
}

async function zapiszPrzypisanieTrenera(e) { e.preventDefault(); let id = document.getElementById('admin-trener-userid').value; let nazwaTrenera = document.getElementById('admin-trener-select').value; try { await fetch(`${API_URL}/users/${id}/trener?nazwa_trenera=${encodeURIComponent(nazwaTrenera)}`, { method: 'PATCH', headers: { 'Authorization': 'Bearer ' + localStorage.getItem('klubToken') } }); document.getElementById('admin-trener-modal').classList.add('view-hidden'); zaladujPanelAdmina(); } catch (e) { console.error(e); } }

async function zaladujKadreTrenerska() {
    try {
        const odp = await fetch(API_URL + '/users/', { headers: { 'Authorization': 'Bearer ' + localStorage.getItem('klubToken') } });
        const users = await odp.json();
        const tbody = document.getElementById('admin-trenerzy-table-body');
        tbody.innerHTML = '';
        const tylkoTrenerzy = users.filter(u => u.rola === 'trener');
        if (tylkoTrenerzy.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted py-4">Brak trenerów.</td></tr>';
            return;
        }
        tylkoTrenerzy.forEach(t => {
            const grupaBadge = t.przypisany_trener
                ? `<span class="badge bg-info text-dark">${escapeHtml(t.przypisany_trener)}</span>`
                : `<span class="badge bg-secondary">Brak zdefiniowanej grupy</span>`;
            tbody.innerHTML += `<tr><td><div class="fw-bold text-dark"><i class="bi bi-person-badge text-primary me-2"></i> ${escapeHtml(t.imie)} ${escapeHtml(t.nazwisko)}</div></td><td>${grupaBadge}</td><td class="text-muted small">${escapeHtml(t.email)}</td><td class="text-end"><button class="btn btn-sm btn-outline-danger" onclick="usunUsera(${t.id}, true)"><i class="bi bi-trash"></i> Usuń</button></td></tr>`;
        });
    } catch (e) { console.error(e); }
}
async function zapiszNowegoTrenera(e) { e.preventDefault(); const przypisanaGrupa = document.getElementById('nt-grupa').value; const payload = { imie: document.getElementById('nt-imie').value, nazwisko: document.getElementById('nt-nazwisko').value, email: document.getElementById('nt-email').value, haslo: document.getElementById('nt-haslo').value, rola: "trener" }; try { const res = await fetch(API_URL + '/users/admin/utworz-trenera', { method: 'POST', headers: authHeaders(true), body: JSON.stringify(payload) }); if (res.ok) { const createdUser = await res.json(); if (przypisanaGrupa) { await fetch(`${API_URL}/users/${createdUser.id}/trener?nazwa_trenera=${encodeURIComponent(przypisanaGrupa)}`, { method: 'PATCH', headers: authHeaders() }); } document.getElementById('admin-dodaj-trenera-modal').classList.add('view-hidden'); zaladujKadreTrenerska(); } } catch (err) { } }
async function otworzModalTrenera(userId, imie) { document.getElementById('admin-trener-userid').value = userId; const select = document.getElementById('admin-trener-select'); select.innerHTML = '<option value="">Ładowanie...</option>'; document.getElementById('admin-trener-modal').classList.remove('view-hidden'); try { const odp = await fetch(API_URL + '/users/', { headers: { 'Authorization': 'Bearer ' + localStorage.getItem('klubToken') } }); const wszyscy = await odp.json(); const trenerzy = wszyscy.filter(t => t.rola === 'trener'); select.innerHTML = '<option value="" disabled selected>-- Wybierz grupę i trenera --</option>'; trenerzy.forEach(t => { let pelnaNazwa = pobierzIdentyfikatorTrenera(t); select.innerHTML += `<option value="${pelnaNazwa}">${pelnaNazwa}</option>`; }); } catch (e) { console.error(e); } }

async function zaladujZawodników() {
    const user = JSON.parse(localStorage.getItem('zalogowanyUser'));
    const grid = document.getElementById('trener-zawodnicy-grid');
    const mojKlucz = pobierzIdentyfikatorTrenera(user);
    try {
        const odp = await fetch(API_URL + '/users/', { headers: { 'Authorization': 'Bearer ' + localStorage.getItem('klubToken') } });
        const wszyscy = await odp.json();
        grid.innerHTML = '';
        const mojaGrupa = wszyscy.filter(u => u.rola === 'rodzic' && u.przypisany_trener === mojKlucz);
        if (mojaGrupa.length === 0) {
            grid.innerHTML = emptyState('people', 'Brak przypisanych zawodników');
            return;
        }
        mojaGrupa.forEach(u => {
            const statusBadan = sprawdzStatusBadan(u.badania_koniec);
            const bKoniec = u.badania_koniec ? u.badania_koniec : '';
            const imieDziecka = `${u.imie_dziecka || ''} ${u.nazwisko_dziecka || ''}`.trim();
            grid.innerHTML += `<div class="col-md-4 col-sm-6"><div class="card h-100 p-4 text-center"><div class="fs-1 text-success mb-2"><i class="bi bi-person-circle"></i></div><h5 class="fw-bold m-0">${escapeHtml(imieDziecka)}</h5><p class="small text-muted mb-3"><span class="badge bg-secondary me-1">Rocznik: ${escapeHtml(u.rocznik_dziecka)}</span><br><div class="mt-2">${statusBadan}</div></p><div class="d-flex gap-2 justify-content-center mt-2 mb-3"><button class="btn btn-sm btn-outline-danger w-50" onclick="pokazKarteMedyczna(${u.id}, ${jsArg(u.imie_dziecka)}, ${jsArg(bKoniec)})"><i class="bi bi-heart-pulse"></i> Karta</button><button class="btn btn-sm btn-outline-success w-50" onclick="otworzModalBadan(${u.id}, ${jsArg(u.imie_dziecka)}, ${jsArg(u.badania_start)}, ${jsArg(u.badania_koniec)})"><i class="bi bi-file-medical"></i> Badania</button></div><div class="border-top pt-3 mt-auto text-start bg-light rounded p-2"><p class="small m-0 fw-bold text-dark"><i class="bi bi-person-heart"></i> Rodzic: ${escapeHtml(u.imie)}</p><p class="small m-0 text-muted mt-1"><i class="bi bi-envelope-at"></i> ${escapeHtml(u.email)}</p></div></div></div>`;
        });
    } catch (e) { console.error(e); }
}

async function zapiszKarteRodzica(e) {
    e.preventDefault();
    const user = JSON.parse(localStorage.getItem('zalogowanyUser'));
    const payload = { koszulka: document.getElementById('kz-koszulka').value, dres: document.getElementById('kz-dres').value, alergie: document.getElementById('kz-alergie').value, telefon: document.getElementById('kz-telefon').value };
    try {
        const res = await fetch(`${API_URL}/users/${user.id}/karta`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('klubToken') }, body: JSON.stringify(payload) });
        if (res.ok) {
            showToast('Karta Medyczna zapisana!', 'success');
            user.rozmiar_koszulki = payload.koszulka; user.rozmiar_dresu = payload.dres; user.alergie = payload.alergie; user.telefon_ice = payload.telefon;
            localStorage.setItem('zalogowanyUser', JSON.stringify(user));
        }
    } catch (e) { showToast('Błąd połączenia z serwerem', 'error'); }
}

function wczytajKarteRodzica() {
    const user = JSON.parse(localStorage.getItem('zalogowanyUser'));
    if (user.telefon_ice) {
        document.getElementById('kz-koszulka').value = user.rozmiar_koszulki || "";
        document.getElementById('kz-dres').value = user.rozmiar_dresu || "";
        document.getElementById('kz-alergie').value = user.alergie || "";
        document.getElementById('kz-telefon').value = user.telefon_ice || "";
    }
}

async function pokazKarteMedyczna(userId, imieDziecka, badaniaKoniec) {
    document.getElementById('podglad-karta-imie').innerText = imieDziecka;
    document.getElementById('podglad-badania').innerHTML = sprawdzStatusBadan(badaniaKoniec);
    document.getElementById('podglad-koszulka').innerText = "Ładowanie...";
    document.getElementById('modal-karta-medyczna').classList.remove('view-hidden');

    try {
        const odp = await fetch(API_URL + '/users/', { headers: { 'Authorization': 'Bearer ' + localStorage.getItem('klubToken') } });
        const wszyscy = await odp.json();
        const u = wszyscy.find(x => x.id === userId);

        if (u && u.telefon_ice) {
            document.getElementById('podglad-koszulka').innerText = u.rozmiar_koszulki || "Brak";
            document.getElementById('podglad-dres').innerText = u.rozmiar_dresu || "Brak";
            document.getElementById('podglad-alergie').innerText = u.alergie || "Brak";
            document.getElementById('podglad-telefon').innerText = u.telefon_ice || "Brak";
        } else {
            document.getElementById('podglad-koszulka').innerText = "Brak"; document.getElementById('podglad-dres').innerText = "Brak";
            document.getElementById('podglad-alergie').innerText = "Rodzic jeszcze nie wypełnił karty."; document.getElementById('podglad-telefon').innerText = "Brak";
        }
    } catch (e) { console.error(e); }
}

function otworzModalBadan(userId, imieDziecka, start, koniec) {
    document.getElementById('badania-userid').value = userId; document.getElementById('badania-nazwa').innerText = imieDziecka;
    document.getElementById('badania-start').value = (start && start !== 'null') ? start : ''; document.getElementById('badania-koniec').value = (koniec && koniec !== 'null') ? koniec : '';
    document.getElementById('modal-badania').classList.remove('view-hidden');
}

async function zapiszBadania(e) { e.preventDefault(); let id = document.getElementById('badania-userid').value; let payload = { badania_start: document.getElementById('badania-start').value, badania_koniec: document.getElementById('badania-koniec').value }; try { let res = await fetch(`${API_URL}/users/${id}/badania`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('klubToken') }, body: JSON.stringify(payload) }); if (res.ok) { document.getElementById('modal-badania').classList.add('view-hidden'); zaladujZawodników(); } } catch (e) { showToast('Wystąpił błąd', 'error'); } }
function sprawdzStatusBadan(koniec) { if (!koniec || koniec === 'null' || koniec === 'undefined') return `<span class="badge bg-danger">Brak badań</span>`; let dzis = new Date(); let dataKonca = new Date(koniec); if (dataKonca < dzis) return `<span class="badge bg-danger">Wygasły</span>`; return `<span class="badge bg-success">Ważne do: ${koniec}</span>`; }

const nazwyMiesiecy = ["Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec", "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień"];

async function otworzModalPlatnosci(userId, imie) {
    document.getElementById('admin-platnosc-modal').classList.remove('view-hidden');
    await renderujGuzikiMiesiecy(userId);
}

async function renderujGuzikiMiesiecy(userId) {
    const grid = document.getElementById('admin-platnosc-grid');
    grid.innerHTML = spinner('Ładowanie wpłat...');

    try {
        const token = localStorage.getItem('klubToken');
        const odp = await fetch(`${API_URL}/users/${userId}/platnosci`, { headers: { 'Authorization': 'Bearer ' + token } });
        const platnosciZSerwera = await odp.json();

        grid.innerHTML = '';
        nazwyMiesiecy.forEach((m, idx) => {
            let p = platnosciZSerwera.find(x => x.miesiac_idx === idx);
            let oplacone = p ? p.oplacone : false;

            let btnClass = oplacone ? 'btn-success' : 'btn-outline-danger';
            let icon = oplacone ? '<i class="bi bi-check-circle"></i>' : '<i class="bi bi-x-circle"></i>';
            grid.innerHTML += `<div class="col-6 mb-2"><button type="button" class="btn ${btnClass} w-100 fw-bold" onclick="zmienStatusWplaty(${userId}, ${idx})">${icon} ${m}</button></div>`;
        });
    } catch (e) { grid.innerHTML = '<div class="text-danger">Błąd ładowania wpłat</div>'; }
}

async function zmienStatusWplaty(userId, idx) {
    try {
        const token = localStorage.getItem('klubToken');
        await fetch(`${API_URL}/users/${userId}/platnosci/${idx}`, { method: 'PATCH', headers: { 'Authorization': 'Bearer ' + token } });
        await renderujGuzikiMiesiecy(userId);
    } catch (e) { showToast('Błąd połączenia z serwerem', 'error'); }
}

async function generujKafelki() {
    const user = JSON.parse(localStorage.getItem('zalogowanyUser'));
    const grid = document.getElementById('payment-grid');
    grid.innerHTML = spinner('Ładowanie składek...');

    try {
        const token = localStorage.getItem('klubToken');
        const odp = await fetch(`${API_URL}/users/${user.id}/platnosci`, { headers: { 'Authorization': 'Bearer ' + token } });
        const platnosciZSerwera = await odp.json();

        grid.innerHTML = '';
        nazwyMiesiecy.forEach((nazwa, i) => {
            let p = platnosciZSerwera.find(x => x.miesiac_idx === i);
            let odp = p ? p.oplacone : false;
            grid.innerHTML += `<div class="col-6 col-md-4"><div class="card text-center tile-month ${odp ? 'bg-success text-white' : 'bg-light text-dark'}"><div class="card-body"><h5 class="fw-bold mb-2">${nazwa}</h5><span class="badge w-100 ${odp ? 'bg-light text-success' : 'bg-danger text-white'}">${odp ? 'Opłacono' : '150zł'}</span></div></div></div>`;
        });
    } catch (e) { grid.innerHTML = '<div class="text-danger">Błąd ładowania wpłat</div>'; }
}

function zamknijModaleAdmina() { document.getElementById('admin-trener-modal').classList.add('view-hidden'); document.getElementById('admin-platnosc-modal').classList.add('view-hidden'); }
async function usunUsera(id, toTrener) {
    pokazPotwierdzenie('Usunąć konto?', 'Konto zostanie trwale usunięte z systemu.', async () => {
        try {
            await fetch(`${API_URL}/users/${id}`, { method: 'DELETE', headers: { 'Authorization': 'Bearer ' + localStorage.getItem('klubToken') } });
            if (toTrener) zaladujKadreTrenerska(); else zaladujPanelAdmina();
            showToast('Konto usunięte', 'success');
        } catch (e) { showToast('Błąd usuwania konta', 'error'); }
    });
}

async function pobierzPlikPZPN() { try { const odp = await fetch(API_URL + '/users/', { headers: { 'Authorization': 'Bearer ' + localStorage.getItem('klubToken') } }); const users = await odp.json(); let csv = "Imie;Nazwisko;Rocznik;Pesel;Trener\n"; users.filter(u => u.rola === 'rodzic').forEach(u => { let pesel = u.rocznik_dziecka ? u.rocznik_dziecka.toString().slice(-2) + "051201234" : "BRAK"; csv += `${u.imie_dziecka};${u.nazwisko_dziecka};${u.rocznik_dziecka};${pesel};${u.przypisany_trener || 'Brak'}\n`; }); let blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' }); let link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = "PZPN.csv"; link.click(); } catch (e) { console.error(e); } }

let kalendarz = null;
window.lokalneWydarzenia = [];
window.aktywnyTreningObecnosci = null;
let bazaPowolan = JSON.parse(localStorage.getItem('klubPowolania')) || {};

function renderujKalendarz() {
    setTimeout(() => {
        const el = document.getElementById('calendar');
        if (kalendarz) kalendarz.destroy();
        const u = JSON.parse(localStorage.getItem('zalogowanyUser'));

        kalendarz = new FullCalendar.Calendar(el, {
            initialView: 'dayGridMonth',
            locale: 'pl',
            headerToolbar: { left: 'prev,next today', center: 'title', right: 'dayGridMonth,listWeek' },
            dateClick: function (info) {
                if (u && (u.rola === 'trener' || u.rola === 'admin')) {
                    document.getElementById('ev-data-kliknieta').value = info.dateStr;
                    document.getElementById('event-modal-overlay').classList.remove('view-hidden');
                }
            },
            eventClick: function (info) {
                if (!u || !['trener', 'admin'].includes(u.rola)) return;
                pokazPotwierdzenie('Usunąć wydarzenie?', `Wydarzenie "${info.event.title}" zostanie usunięte z kalendarza.`, async () => {
                    const res = await fetch(`${API_URL}/events/${info.event.id}`, { method: 'DELETE', headers: authHeaders() });
                    if (!res.ok) {
                        showToast('Nie udało się usunąć wydarzenia', 'error');
                        return;
                    }
                    info.event.remove();
                    showToast('Wydarzenie usunięte', 'success');
                });
            },
            eventContent: function (arg) {
                let start = arg.event.start ? arg.event.start.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' }) : '';
                let end = arg.event.end ? arg.event.end.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' }) : '';
                let timeText = end ? `${start} - ${end}` : start;
                let powolanieHTML = '';

                if (u.rola === 'rodzic' && arg.event.backgroundColor === '#dc3545') {
                    let kluczMeczu = arg.event.title + '_' + arg.event.startStr.split('T')[0];
                    let listaPowolanych = bazaPowolan[kluczMeczu] || [];
                    let nazwaMojegoDziecka = `${u.imie_dziecka} ${u.nazwisko_dziecka}`;
                    if (listaPowolanych.includes(nazwaMojegoDziecka)) {
                        powolanieHTML = `<div class="badge bg-white text-danger border border-danger w-100 mt-1" style="font-size:0.6rem;">POWOŁANY</div>`;
                    } else {
                        return { html: '' };
                    }
                }

                return { html: `<div class="p-1" style="line-height: 1.2; overflow: hidden;"><div class="fw-bold text-truncate">${escapeHtml(arg.event.title)}</div><div class="small opacity-75">${timeText}</div>${powolanieHTML}</div>` };
            },
            events: async function (fetchInfo, sc) {
                try {
                    const odp = await fetch(API_URL + '/events/', { headers: authHeaders() });
                    const w = await odp.json();
                    const zBazy = w.map(e => ({
                        id: e.id,
                        title: e.nazwa,
                        start: e.data_rozpoczecia,
                        end: e.data_zakonczenia,
                        backgroundColor: e.typ === 'mecz' ? '#dc3545' : '#198754'
                    }));
                    sc(zBazy);
                } catch (e) {
                    console.error('Błąd pobierania wydarzeń:', e);
                    sc([]);
                }
            }
        });
        kalendarz.render();
    }, 150);
}

function zamknijModal() {
    document.getElementById('event-modal-overlay').classList.add('view-hidden');
    document.getElementById('event-form').reset();
    document.getElementById('cykl-koniec-box').classList.add('view-hidden');
    document.getElementById('ev-powolania-box').classList.add('view-hidden');
}

function toggleCykl() {
    const c = document.getElementById('ev-cykl');
    const b = document.getElementById('cykl-koniec-box');
    if (c.checked) {
        b.classList.remove('view-hidden');
        document.getElementById('ev-koniec').required = true;
    } else {
        b.classList.add('view-hidden');
        document.getElementById('ev-koniec').required = false;
    }
}

async function obslugaTypuZajec() {
    let typ = document.getElementById('ev-typ').value;
    let powBox = document.getElementById('ev-powolania-box');
    let listaBox = document.getElementById('ev-lista-zawodnikow');
    if (typ === 'mecz') {
        powBox.classList.remove('view-hidden');
        listaBox.innerHTML = 'Ładowanie zawodników...';
        try {
            const u = JSON.parse(localStorage.getItem('zalogowanyUser'));
            let mKlucz = pobierzIdentyfikatorTrenera(u);
            const odp = await fetch(API_URL + '/users/', { headers: authHeaders() });
            const wszyscy = await odp.json();
            const mojaGrupa = wszyscy.filter(z => z.rola === 'rodzic' && z.przypisany_trener === mKlucz);
            listaBox.innerHTML = '';
            mojaGrupa.forEach(z => {
                let inaz = `${z.imie_dziecka} ${z.nazwisko_dziecka}`;
                listaBox.innerHTML += `<div class="form-check"><input class="form-check-input check-powolanie" type="checkbox" value="${escapeHtml(inaz)}" id="chk-${z.id}"><label class="form-check-label" for="chk-${z.id}">${escapeHtml(inaz)}</label></div>`;
            });
        } catch (e) { console.error('Błąd ładowania zawodników:', e); }
    } else {
        powBox.classList.add('view-hidden');
    }
}

document.getElementById('event-form').addEventListener('submit', async function (e) {
    e.preventDefault();
    let nazwa = document.getElementById('ev-nazwa').value;
    let typ = document.getElementById('ev-typ').value;
    let czasStart = document.getElementById('ev-czas-start').value;
    let czasKoniec = document.getElementById('ev-czas-koniec').value;
    let dataKliknieta = document.getElementById('ev-data-kliknieta').value;
    let powtarzaj = document.getElementById('ev-cykl').checked;
    let dataKoniec = document.getElementById('ev-koniec').value;
    let powolaniWykaz = [];
    if (typ === 'mecz') document.querySelectorAll('.check-powolanie:checked').forEach(cb => powolaniWykaz.push(cb.value));

    function formatujLokalnie(d) {
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }

    let aktualnaData = new Date(dataKliknieta + 'T00:00:00');
    let koncowaData = dataKoniec ? new Date(dataKoniec + 'T23:59:59') : aktualnaData;
    let ileZapisano = 0;

    while (aktualnaData <= koncowaData) {
        let sTime = formatujLokalnie(aktualnaData) + 'T' + czasStart + ':00';
        let eTime = formatujLokalnie(aktualnaData) + 'T' + czasKoniec + ':00';
        try {
            const res = await fetch(API_URL + '/events/', { method: 'POST', headers: authHeaders(true), body: JSON.stringify({ nazwa, typ, data_rozpoczecia: sTime, data_zakonczenia: eTime }) });
            if (res.ok) ileZapisano++;
        } catch (err) { console.error('Błąd zapisu wydarzenia:', err); }
        if (typ === 'mecz') bazaPowolan[nazwa + '_' + formatujLokalnie(aktualnaData)] = powolaniWykaz;
        if (!powtarzaj) break;
        aktualnaData.setDate(aktualnaData.getDate() + 7);
    }

    localStorage.setItem('klubPowolania', JSON.stringify(bazaPowolan));
    if (ileZapisano > 0) kalendarz.refetchEvents();
    zamknijModal();
});

async function zaladujTreningiDoObecnosci() {
    const pojemnik = document.getElementById('lista-treningow-obecnosci');
    pojemnik.innerHTML = '<div class="text-center py-4">Ładowanie...</div>';
    try {
        const odp = await fetch(API_URL + '/events/', { headers: authHeaders() });
        let wszystkie = (await odp.json()).map(e => ({ id: e.id, title: e.nazwa, start: e.data_rozpoczecia }));
        wszystkie.sort((a, b) => new Date(b.start) - new Date(a.start));
        const miesiacePl = ['Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec', 'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'];
        let grupy = {};
        wszystkie.forEach(t => {
            let d = new Date(t.start);
            let klucz = miesiacePl[d.getMonth()] + ' ' + d.getFullYear();
            if (!grupy[klucz]) grupy[klucz] = [];
            grupy[klucz].push(t);
        });
        pojemnik.innerHTML = '';
        for (let [miesiac, treningi] of Object.entries(grupy)) {
            let html = `<h5 class="fw-bold mt-4 mb-3 text-primary border-bottom pb-2">${escapeHtml(miesiac)}</h5><div class="row g-3 mb-4">`;
            treningi.forEach(t => {
                let d = new Date(t.start);
                let dataFormat = `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()} | Godz: ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
                html += `<div class="col-md-6"><button type="button" class="card p-3 shadow-sm training-tile h-100 w-100 text-start" onclick="otworzKonkretnyTrening(${t.id}, '${encodeURIComponent(t.title)}', '${encodeURIComponent(dataFormat)}')"><div class="fw-bold text-primary">${escapeHtml(t.title)}</div><div class="text-muted small">${dataFormat}</div></button></div>`;
            });
            html += '</div>';
            pojemnik.innerHTML += html;
        }
    } catch (e) { console.error(e); }
}

async function otworzKonkretnyTrening(eventId, nazwaEncoded, dataEncoded) {
    const nazwa = decodeURIComponent(nazwaEncoded);
    const data = decodeURIComponent(dataEncoded);
    window.aktywnyTreningObecnosci = eventId;
    document.getElementById('widok-treningow').style.display = 'none';
    document.getElementById('widok-listy-obecnosci').style.display = 'block';
    document.getElementById('btn-powrot-obecnosci').style.display = 'inline-block';
    document.getElementById('naglowek-obecnosci').innerText = 'Sprawdzanie obecności';
    document.getElementById('obecnosci-trening-info').innerHTML = `Trening: <strong>${escapeHtml(nazwa)}</strong> (${escapeHtml(data)})`;

    const user = JSON.parse(localStorage.getItem('zalogowanyUser'));
    let mKlucz = pobierzIdentyfikatorTrenera(user);
    try {
        const [usersRes, attendanceRes] = await Promise.all([
            fetch(API_URL + '/users/', { headers: authHeaders() }),
            fetch(`${API_URL}/events/${eventId}/attendances`, { headers: authHeaders() })
        ]);
        const wszyscy = await usersRes.json();
        const obecnosci = attendanceRes.ok ? await attendanceRes.json() : [];
        const statusByUser = new Map(obecnosci.map(o => [o.user_id, o.status]));
        const tbody = document.getElementById('trener-lista-zawodnikow');
        tbody.innerHTML = '';
        const mojaGrupa = wszyscy.filter(u => u.rola === 'rodzic' && u.przypisany_trener === mKlucz);
        if (mojaGrupa.length === 0) {
            tbody.innerHTML = '<tr><td colspan="2" class="text-center text-muted py-4">Brak zawodników w grupie.</td></tr>';
            return;
        }
        mojaGrupa.forEach(u => {
            const status = statusByUser.get(u.id) || 'obecny';
            tbody.innerHTML += `<tr><td class="fw-bold">${escapeHtml(u.imie_dziecka)} ${escapeHtml(u.nazwisko_dziecka)}</td><td><select data-user-id="${u.id}" class="form-select form-select-sm w-50"><option value="obecny" ${status === 'obecny' ? 'selected' : ''}>Obecny</option><option value="nieobecny" ${status === 'nieobecny' ? 'selected' : ''}>Nieobecny</option><option value="usprawiedliwiony" ${status === 'usprawiedliwiony' ? 'selected' : ''}>Usprawiedliwiony</option></select></td></tr>`;
        });
    } catch (e) { console.error(e); }
}

async function zapiszObecnosci() {
    if (!window.aktywnyTreningObecnosci) return;
    const selects = document.querySelectorAll('#trener-lista-zawodnikow select[data-user-id]');
    try {
        await Promise.all([...selects].map(select => fetch(`${API_URL}/events/${window.aktywnyTreningObecnosci}/attendances`, {
            method: 'POST',
            headers: authHeaders(true),
            body: JSON.stringify({ user_id: parseInt(select.dataset.userId), status: select.value })
        })));
        showToast('Obecności zapisane w bazie.', 'success');
    } catch (e) {
        showToast('Nie udało się zapisać obecności', 'error');
    }
}

function pokazMiesiaceTreningow() {
    document.getElementById('widok-treningow').style.display = 'block';
    document.getElementById('widok-listy-obecnosci').style.display = 'none';
    document.getElementById('btn-powrot-obecnosci').style.display = 'none';
    document.getElementById('naglowek-obecnosci').innerText = 'Wybierz trening';
    window.aktywnyTreningObecnosci = null;
}
function pokazLogowanie() {
    ['home-view', 'login-view', 'register-view', 'dashboard-view'].forEach(id => document.getElementById(id).classList.add('view-hidden'));
    document.getElementById('login-view').classList.remove('view-hidden');
}
function pokazRejestracje() {
    ['home-view', 'login-view', 'register-view', 'dashboard-view'].forEach(id => document.getElementById(id).classList.add('view-hidden'));
    document.getElementById('register-view').classList.remove('view-hidden');
}

function wyloguj() { localStorage.removeItem('zalogowanyUser'); localStorage.removeItem('klubToken'); sprawdzSesje(); }

function pobierzIdentyfikatorTrenera(t) { if (!t || t.rola !== 'trener') return ''; return t.przypisany_trener ? `${t.przypisany_trener} - ${t.imie} ${t.nazwisko}` : `${t.imie} ${t.nazwisko}`; }

function toggleTheme() {
    const body = document.body; const isDark = body.getAttribute('data-theme') === 'dark'; const newTheme = isDark ? 'light' : 'dark';
    body.setAttribute('data-theme', newTheme); localStorage.setItem('klubTheme', newTheme);
    const icon = document.getElementById('theme-icon'); if (icon) icon.className = newTheme === 'dark' ? 'bi bi-sun-fill text-warning' : 'bi bi-moon-stars';
}

document.addEventListener("DOMContentLoaded", () => {
    const savedTheme = localStorage.getItem('klubTheme') || 'light'; document.body.setAttribute('data-theme', savedTheme);
    const icon = document.getElementById('theme-icon'); if (icon) icon.className = savedTheme === 'dark' ? 'bi bi-sun-fill text-warning' : 'bi bi-moon-stars';
    document.querySelectorAll('.custom-modal-overlay').forEach(modal => {
        if (!modal.hasAttribute('role')) modal.setAttribute('role', 'dialog');
        if (!modal.hasAttribute('aria-modal')) modal.setAttribute('aria-modal', 'true');
    });
    sprawdzSesje();
});

function sprawdzSesje() {
    console.log('[DEBUG] sprawdzSesje start');
    
    try {
        let userJSON = localStorage.getItem('zalogowanyUser');
        console.log('[DEBUG] userJSON:', userJSON);

        // 1. Ukryj wszystkie główne widoki na start
        const widoki = ['home-view', 'login-view', 'register-view', 'dashboard-view'];
        widoki.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.classList.add('view-hidden');
        });

        // 2. Walidacja tokena (jeśli funkcja sprawdzToken istnieje)
        if (userJSON && typeof sprawdzToken === 'function' && !sprawdzToken()) {
            console.warn('[DEBUG] Token wygasł lub jest nieprawidłowy');
            localStorage.removeItem('zalogowanyUser');
            localStorage.removeItem('klubToken');
            userJSON = null;
        }

        // 3. Logika wyświetlania widoku
        if (userJSON) {
            console.log('[DEBUG] Użytkownik zalogowany, przygotowuję dashboard');
            const user = JSON.parse(userJSON);

            // Wyświetlenie widoku dashboardu
            document.getElementById('dashboard-view').classList.remove('view-hidden');

            // --- POPRAWKA WYŚWIETLANIA NAZWY ---
            // Używamy operatora || '', aby zamiast 'undefined' pokazać pusty ciąg znaków
            const imie = user.imie || 'Użytkownik';
            const nazwisko = user.nazwisko || '';
            document.getElementById('user-name').innerText = `${imie} ${nazwisko}`.trim();
            
            document.getElementById('user-email').innerText = user.email || 'brak maila';
            document.getElementById('user-role-badge').innerText = user.rola || 'użytkownik';

            // Reset menu (ukryj wszystkie opcje zależne od ról)
            document.querySelectorAll('.menu-rodzic, .menu-trener, .menu-admin')
                   .forEach(el => el.classList.add('view-hidden'));
            
            const hintTrener = document.getElementById('hint-trener');
            if (hintTrener) hintTrener.classList.add('view-hidden');

            // 4. Zarządzanie uprawnieniami w menu
            if (user.rola === 'admin') {
                document.querySelectorAll('.menu-admin').forEach(el => el.classList.remove('view-hidden'));
            } else if (user.rola === 'trener') {
                document.querySelectorAll('.menu-trener').forEach(el => el.classList.remove('view-hidden'));
                if (hintTrener) hintTrener.classList.remove('view-hidden');
            } else {
                document.querySelectorAll('.menu-rodzic').forEach(el => el.classList.remove('view-hidden'));
                if (typeof generujKafelki === 'function') generujKafelki();
            }

            // Automatyczne kliknięcie w pierwszą pozycję menu
            const firstMenuItem = document.querySelector('.saas-sidebar .menu-item');
            if (firstMenuItem) firstMenuItem.click();

        } else {
            console.log('[DEBUG] pokazuję home-view');
            document.getElementById('home-view').classList.remove('view-hidden');
        }

    } catch (err) {
        console.error('[DEBUG] KRYTYCZNY BŁĄD w sprawdzSesje:', err);
        document.getElementById('home-view').classList.remove('view-hidden');
    }
    
    console.log('[DEBUG] sprawdzSesje koniec');
}

function zmienZakladke(idZakladki, el) {
    document.querySelectorAll('.panel-tab').forEach(z => z.classList.add('view-hidden')); document.querySelectorAll('.saas-sidebar .menu-item').forEach(l => l.classList.remove('active'));
    const tab = document.getElementById('tab-' + idZakladki); tab.classList.remove('view-hidden'); tab.classList.remove('tab-enter'); void tab.offsetWidth; tab.classList.add('tab-enter');
    if (el) el.classList.add('active');
    // Zamknij sidebar na mobile
    const sb = document.querySelector('.saas-sidebar'); if (sb && sb.classList.contains('mobile-open')) toggleMobileSidebar();
    if (idZakladki === 'dashboard') zaladujDashboard();
    if (idZakladki === 'kalendarz') { if (!kalendarz) renderujKalendarz(); else setTimeout(() => { kalendarz.render(); }, 150); }
    if (idZakladki === 'admin') zaladujPanelAdmina(); if (idZakladki === 'admin-trenerzy') zaladujKadreTrenerska();
    if (idZakladki === 'admin-obozy') renderujObozyAdmin(); if (idZakladki === 'admin-magazyn') renderujMagazyn();
    if (idZakladki === 'zawodnicy') zaladujZawodników(); if (idZakladki === 'konspekty') renderujKonspekty(); if (idZakladki === 'obecnosci') { pokazMiesiaceTreningow(); zaladujTreningiDoObecnosci(); } if (idZakladki === 'oceny') { wczytajZawodnikowDoOcen(); renderujOceny(); } if (idZakladki === 'magazyn-trener') renderujSprzetTrenera();
    if (idZakladki === 'karta-zawodnika') wczytajKarteRodzica(); if (idZakladki === 'obozy-rodzic') renderujObozyRodzic();
}

document.getElementById('login-form').addEventListener('submit', async function (e) {
    e.preventDefault();
    const email = document.getElementById('email-input').value;
    const haslo = document.getElementById('haslo-input').value;

    // Tworzymy paczkę danych w formacie formularza (wymagane przez OAuth2 / kłódkę w Swaggerze)
    const formData = new URLSearchParams();
    formData.append('username', email); // OAuth2 szuka pola 'username'
    formData.append('password', haslo); // OAuth2 szuka pola 'password'

    try {
        const res = await fetch(API_URL + '/users/login', {
            method: 'POST',
            // Zmieniamy nagłówek na x-www-form-urlencoded
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: formData // Wysyłamy sformatowany formularz zamiast JSON.stringify
        });

        if (res.ok) {
            const odpowiedz_z_serwera = await res.json();
            localStorage.setItem('klubToken', odpowiedz_z_serwera.access_token);

            // UWAGA: Twój nowy backend może nie zwracać obiektu 'user' w głównym body.
            // Jeśli logowanie przechodzi, ale strona się nie odświeża, 
            // upewnij się, że backend w login() zwraca też dane użytkownika.
            const user = odpowiedz_z_serwera.user || { email: email, rola: 'użytkownik' };
            localStorage.setItem('zalogowanyUser', JSON.stringify(user));

            document.getElementById('login-error').classList.add('view-hidden');
            showToast('Zalogowano pomyślnie!', 'success');
            sprawdzSesje();

        } else {
            const err = await res.json();
            // Jeśli błąd to tablica (FastAPI tak zwraca błędy walidacji), wyciągamy tekst
            const errorMsg = Array.isArray(err.detail) ? err.detail[0].msg : err.detail;
            document.getElementById('login-error').innerText = errorMsg || "Błąd logowania";
            document.getElementById('login-error').classList.remove('view-hidden');
        }
    } catch (err) {
        console.error("Błąd sieci:", err);
    }
});

document.getElementById('register-form').addEventListener('submit', async function (e) { e.preventDefault(); if (!walidujRejestracje()) return; const p = { imie: document.getElementById('reg-imie').value, nazwisko: document.getElementById('reg-nazwisko').value, email: document.getElementById('reg-email').value, haslo: document.getElementById('reg-haslo').value, rola: "rodzic", rocznik_dziecka: parseInt(document.getElementById('reg-rocznik').value), imie_dziecka: document.getElementById('reg-imie-dziecka').value, nazwisko_dziecka: document.getElementById('reg-nazwisko-dziecka').value }; try { const res = await fetch(API_URL + '/users/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(p) }); if (res.ok) { showToast('Konto utworzone! Poczekaj na akceptację admina.', 'success'); document.getElementById('register-form').reset(); document.getElementById('password-bar').style.width = '0%'; setTimeout(pokazLogowanie, 2500); } else { const err = await res.json(); showToast(err.detail || 'Błąd rejestracji', 'error'); } } catch (err) { showToast('Błąd połączenia z serwerem', 'error'); } });


// === PIONOWE PRZEWIJANIE (strzałki + swipe) ===
(function () {
    const home = document.querySelector('.elegant-home');
    if (!home) return;

    document.addEventListener('keydown', function (e) {
        const homeView = document.getElementById('home-view');
        if (!homeView || homeView.classList.contains('view-hidden')) return;
        if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
            e.preventDefault();
            home.scrollBy({ top: window.innerHeight * 0.8, behavior: 'smooth' });
        } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
            e.preventDefault();
            home.scrollBy({ top: -window.innerHeight * 0.8, behavior: 'smooth' });
        }
    });

    let touchStartY = 0;
    document.addEventListener('touchstart', function (e) {
        const homeView = document.getElementById('home-view');
        if (!homeView || homeView.classList.contains('view-hidden')) return;
        touchStartY = e.touches[0].clientY;
    }, { passive: true });

    document.addEventListener('touchend', function (e) {
        const homeView = document.getElementById('home-view');
        if (!homeView || homeView.classList.contains('view-hidden')) return;
        const touchEndY = e.changedTouches[0].clientY;
        const diff = touchStartY - touchEndY;
        if (Math.abs(diff) > 50) {
            home.scrollBy({ top: diff, behavior: 'auto' });
        }
    }, { passive: true });
})();
