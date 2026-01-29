const API_URL = "http://localhost:8000";

const symbolInput = document.getElementById("symbol-input");
const addBtn = document.getElementById("add-btn");
const watchlistEl = document.getElementById("watchlist");

async function loadWatchlist() {
    watchlistEl.innerHTML = '<div class="loading">Loading...</div>';
    
    const response = await fetch(`${API_URL}/watchlist`);
    const data = await response.json();
    
    if (data.watchlist.length === 0) {
        watchlistEl.innerHTML = '<div class="loading">No tickers yet. Add one above.</div>';
        return;
    }
    
    watchlistEl.innerHTML = "";
    
    data.watchlist.forEach(ticker => {
        const changeClass = ticker.change_pct > 0 ? "positive" : ticker.change_pct < 0 ? "negative" : "neutral";
        const changePrefix = ticker.change_pct > 0 ? "+" : "";
        
        const item = document.createElement("div");
        item.className = "ticker-item";
        item.innerHTML = `
            <div class="ticker-info">
                <span class="symbol">${ticker.symbol}</span>
                <span class="price">$${ticker.price?.toFixed(2) ?? "—"}</span>
                <span class="change ${changeClass}">${changePrefix}${ticker.change_pct?.toFixed(2) ?? "—"}%</span>
            </div>
            <button class="delete-btn" data-id="${ticker.id}">Remove</button>
        `;
        watchlistEl.appendChild(item);
    });
}

async function addTicker() {
    const symbol = symbolInput.value.trim().toUpperCase();
    if (!symbol) return;
    
    addBtn.disabled = true;
    addBtn.textContent = "Adding...";
    
    try {
        const response = await fetch(`${API_URL}/watchlist`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ symbol })
        });
        
        if (!response.ok) {
            const err = await response.json();
            alert(err.detail || "Failed to add ticker");
            return;
        }
        
        symbolInput.value = "";
        loadWatchlist();
    } finally {
        addBtn.disabled = false;
        addBtn.textContent = "Add";
    }
}

async function deleteTicker(id) {
    await fetch(`${API_URL}/watchlist/${id}`, { method: "DELETE" });
    loadWatchlist();
}

addBtn.addEventListener("click", addTicker);
symbolInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") addTicker();
});

watchlistEl.addEventListener("click", (e) => {
    if (e.target.classList.contains("delete-btn")) {
        deleteTicker(e.target.dataset.id);
    }
});

loadWatchlist();