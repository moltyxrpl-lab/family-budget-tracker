// Main Data Structure
let appData = JSON.parse(localStorage.getItem('BudgetApp_Data')) || {};
let investmentsData = JSON.parse(localStorage.getItem('Investments_Data')) || [];
let creditCardsData = JSON.parse(localStorage.getItem('CreditCards_Data')) || [];

const JSONBIN_URL = "https://api.jsonbin.io/v3/b/69e188cc36566621a8c0716b";
const JSONBIN_KEY = "$2a$10$IDuaPiEl3320Dwe4Wlugz.43C3Y2uyDJ9Q5zKCnmH8nKicJIJBiMa";

const updateJSONBin = () => {
    fetch(JSONBIN_URL, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'X-Master-Key': JSONBIN_KEY
        },
        body: JSON.stringify({
            BudgetApp_Data: appData,
            Investments_Data: investmentsData,
            CreditCards_Data: creditCardsData
        })
    })
    .then(res => {
        if (!res.ok) {
            console.error("JSONBin error:", res.status, res.statusText);
            if(res.status === 413) alert("Data limit reached! Please remove older photos to save new ones.");
        }
    })
    .catch(err => console.error("Error saving data", err));
};

const fetchJSONBin = async () => {
    try {
        const res = await fetch(JSONBIN_URL + "/latest", {
            headers: { 'X-Master-Key': JSONBIN_KEY }
        });
        const data = await res.json();
        return data.record;
    } catch(err) {
        console.error("Error fetching data", err);
        return null;
    }
};
let currentMonth = '';
let currentPhotoBase64 = '';
let livePrices = { gold: {}, silver: 0 };

// DOM Elements
const elements = {
    // Shared
    monthSelectBox: document.getElementById('budget-month-selector'),
    tabBudget: document.getElementById('tab-budget'),
    tabInvestments: document.getElementById('tab-investments'),
    tabCc: document.getElementById('tab-cc'),
    budgetView: document.getElementById('budget-view'),
    investmentsView: document.getElementById('investments-view'),
    ccView: document.getElementById('cc-view'),
    
    // Budget
    monthSelect: document.getElementById('month-select'),
    displayBudget: document.getElementById('display-budget'),
    displayExpenses: document.getElementById('display-expenses'),
    displayRemaining: document.getElementById('display-remaining'),
    remainingIcon: document.querySelector('.remaining-icon'),
    expenseForm: document.getElementById('expense-form'),
    expenseDate: document.getElementById('expense-date'),
    expenseWhat: document.getElementById('expense-what'),
    expenseAmount: document.getElementById('expense-amount'),
    expenseTbody: document.getElementById('expense-tbody'),
    emptyState: document.getElementById('empty-state'),
    historyGrid: document.getElementById('history-grid'),
    
    // Budget Modal
    modal: document.getElementById('budget-modal'),
    setBudgetBtn: document.getElementById('set-budget-btn'),
    closeModalBtn: document.querySelector('.close-modal'),
    budgetForm: document.getElementById('budget-form'),
    newBudgetAmount: document.getElementById('new-budget-amount'),
    
    // Investments
    invForm: document.getElementById('investment-form'),
    invPhotoInput: document.getElementById('inv-photo'),
    photoCanvas: document.getElementById('photo-canvas'),
    photoPreviewContainer: document.getElementById('photo-preview-container'),
    photoPreview: document.getElementById('photo-preview'),
    removePhotoBtn: document.getElementById('remove-photo-btn'),
    invType: document.getElementById('inv-type'),
    invName: document.getElementById('inv-name'),
    invGrams: document.getElementById('inv-grams'),
    invBuy: document.getElementById('inv-buy'),
    invGrid: document.getElementById('investments-grid'),
    invEmptyState: document.getElementById('inv-empty-state'),
    displayTotalInvested: document.getElementById('display-total-invested'),
    displayTotalProfit: document.getElementById('display-total-profit'),
    
    // Live Prices
    refreshPricesBtn: document.getElementById('refresh-prices-btn'),
    
    // Edit Investment Modal
    editInvModal: document.getElementById('edit-investment-modal'),
    closeEditInvModalBtn: document.getElementById('close-edit-inv-modal'),
    editInvForm: document.getElementById('edit-investment-form'),
    editInvId: document.getElementById('edit-inv-id'),
    editInvName: document.getElementById('edit-inv-name'),
    editInvGrams: document.getElementById('edit-inv-grams'),
    editInvBuy: document.getElementById('edit-inv-buy'),
    
    // New Fields
    invKarat: document.getElementById('inv-karat'),
    invKaratWrapper: document.getElementById('inv-karat-wrapper'),
    editInvKarat: document.getElementById('edit-inv-karat'),
    editInvKaratWrapper: document.getElementById('edit-inv-karat-wrapper'),
    displayTotalLiveValue: document.getElementById('display-total-live-value'),
    displayUnrealizedProfit: document.getElementById('display-unrealized-profit'),
    
    // Credit Cards
    displayTotalCcBalance: document.getElementById('display-total-cc-balance'),
    ccForm: document.getElementById('cc-form'),
    ccBank: document.getElementById('cc-bank'),
    ccCustomNameWrapper: document.getElementById('cc-custom-name-wrapper'),
    ccCustomName: document.getElementById('cc-custom-name'),
    ccAmount: document.getElementById('cc-amount'),
    ccLimit: document.getElementById('cc-limit'),
    ccDueDate: document.getElementById('cc-due-date'),
    ccActiveGrid: document.getElementById('cc-active-grid'),
    ccEmptyState: document.getElementById('cc-empty-state'),
    ccHistoryTbody: document.getElementById('cc-history-tbody'),
    ccHistoryEmpty: document.getElementById('cc-history-empty'),
    
    // CC Edit Modal
    editCcModal: document.getElementById('edit-cc-modal'),
    closeEditCcModalBtn: document.getElementById('close-edit-cc-modal'),
    editCcForm: document.getElementById('edit-cc-form'),
    editCcId: document.getElementById('edit-cc-id'),
    editCcAmount: document.getElementById('edit-cc-amount'),
    editCcDueDate: document.getElementById('edit-cc-due-date')
};

// Formatting utilities
const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PH', {
        style: 'currency',
        currency: 'PHP'
    }).format(amount);
};

const formatDate = (dateStr) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateStr).toLocaleDateString('en-US', options);
};

// ==========================================
// INITIALIZATION
// ==========================================
const init = () => {
    // Budget Init
    const today = new Date();
    const yearMonth = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0');
    
    const yyyymmdd = today.toISOString().split('T')[0];
    elements.expenseDate.value = yyyymmdd;
    
    elements.monthSelect.value = yearMonth;
    handleMonthChange();
    renderHistory();
    renderInvestments();
    renderCreditCards();

    // Event Listeners - Budget
    elements.monthSelect.addEventListener('change', handleMonthChange);
    elements.expenseForm.addEventListener('submit', handleAddExpense);
    
    elements.setBudgetBtn.addEventListener('click', () => {
        const monthData = appData[currentMonth] || { budget: 0 };
        elements.newBudgetAmount.value = monthData.budget;
        elements.modal.classList.add('show');
    });
    
    elements.closeModalBtn.addEventListener('click', () => {
        elements.modal.classList.remove('show');
    });
    
    elements.closeEditInvModalBtn.addEventListener('click', () => {
        elements.editInvModal.classList.remove('show');
    });
    
    window.addEventListener('click', (e) => {
        if (e.target === elements.modal) {
            elements.modal.classList.remove('show');
        }
        if (e.target === elements.editInvModal) {
            elements.editInvModal.classList.remove('show');
        }
    });

    elements.budgetForm.addEventListener('submit', handleSetBudget);
    elements.editInvForm.addEventListener('submit', handleEditInvestmentSubmit);
    
    // Event Listeners - Tabs
    elements.tabBudget.addEventListener('click', () => switchTab('budget'));
    elements.tabInvestments.addEventListener('click', () => switchTab('investments'));
    elements.tabCc.addEventListener('click', () => switchTab('cc'));
    
    // Event Listeners - Investments
    elements.invPhotoInput.addEventListener('change', handlePhotoUpload);
    elements.removePhotoBtn.addEventListener('click', removePhoto);
    elements.invForm.addEventListener('submit', handleAddInvestment);
    
    elements.invType.addEventListener('change', () => {
        if(elements.invType.value === 'Gold') {
            elements.invKaratWrapper.style.display = 'block';
        } else {
            elements.invKaratWrapper.style.display = 'none';
        }
    });
    
    
    // Live Prices
    if (elements.refreshPricesBtn) {
        elements.refreshPricesBtn.addEventListener('click', fetchLiveMetals);
    }
    fetchLiveMetals();
};

const fetchLiveMetals = async () => {
    const goldTbody = document.getElementById('live-gold-prices');
    const silverTbody = document.getElementById('live-silver-prices');
    const updateTimeEl = document.getElementById('live-price-update-time');
    
    if(!goldTbody || !silverTbody) return;
    
    goldTbody.innerHTML = '<tr><td colspan="2" class="text-muted"><i class="fa-solid fa-spinner fa-spin"></i> Fetching live data...</td></tr>';
    silverTbody.innerHTML = '<tr><td colspan="2" class="text-muted"><i class="fa-solid fa-spinner fa-spin"></i> Fetching live data...</td></tr>';
    
    try {
        const res = await fetch("https://latest.currency-api.pages.dev/v1/currencies/usd.json");
        const data = await res.json();
        
        const php = data.usd.php;
        const xau = data.usd.xau; // 1 USD = xau Troy Ounces of Gold
        const xag = data.usd.xag; // 1 USD = xag Troy Ounces of Silver
        
        // 1 Troy Ounce = 31.1034768 grams
        const gold1g24kPHP = ((1 / xau) / 31.1034768) * php;
        const silver1g999PHP = ((1 / xag) / 31.1034768) * php;
        
        const goldKarats = [
            { k: 24, ratio: 1.0 },
            { k: 22, ratio: 22/24 },
            { k: 20, ratio: 20/24 },
            { k: 18, ratio: 18/24 },
            { k: 16, ratio: 16/24 },
            { k: 14, ratio: 14/24 },
            { k: 10, ratio: 10/24 }
        ];
        
        let goldHtml = '';
        goldKarats.forEach(karat => {
            const price = gold1g24kPHP * karat.ratio;
            livePrices.gold[karat.k.toString()] = price;
            goldHtml += `<tr><td><strong>${karat.k}K</strong></td><td>${formatCurrency(price)}</td></tr>`;
        });
        goldTbody.innerHTML = goldHtml;
        livePrices.silver = silver1g999PHP;
        
        silverTbody.innerHTML = `
            <tr><td><strong>99.9% (Fine)</strong></td><td>${formatCurrency(silver1g999PHP)}</td></tr>
            <tr><td><strong>92.5% (Sterling)</strong></td><td>${formatCurrency(silver1g999PHP * 0.925)}</td></tr>
        `;
        
        const apiDate = data.date ? new Date(data.date).toLocaleDateString() : new Date().toLocaleDateString();
        const fetchTime = new Date().toLocaleTimeString();
        updateTimeEl.innerText = `Rates as of: ${apiDate} (Updated at ${fetchTime})`;
        
        // Re-render investments to show new live values
        renderInvestments();
        
    } catch(err) {
        goldTbody.innerHTML = '<tr><td colspan="2" class="text-danger"><i class="fa-solid fa-triangle-exclamation"></i> Error fetching data</td></tr>';
        silverTbody.innerHTML = '<tr><td colspan="2" class="text-danger"><i class="fa-solid fa-triangle-exclamation"></i> Error fetching data</td></tr>';
    }
};

// ==========================================
// TABS LOGIC
// ==========================================
const switchTab = (tab) => {
    elements.tabBudget.classList.remove('active');
    elements.tabInvestments.classList.remove('active');
    elements.tabCc.classList.remove('active');
    
    elements.budgetView.style.display = 'none';
    elements.investmentsView.style.display = 'none';
    elements.ccView.style.display = 'none';
    
    elements.monthSelectBox.style.display = 'none';

    if (tab === 'budget') {
        elements.tabBudget.classList.add('active');
        elements.budgetView.style.display = 'block';
        elements.monthSelectBox.style.display = 'flex';
    } else if (tab === 'investments') {
        elements.tabInvestments.classList.add('active');
        elements.investmentsView.style.display = 'block';
        renderInvestments();
    } else if (tab === 'cc') {
        elements.tabCc.classList.add('active');
        elements.ccView.style.display = 'block';
        renderCreditCards();
    }
};

// ==========================================
// BUDGET LOGIC
// ==========================================
const saveData = () => {
    localStorage.setItem('BudgetApp_Data', JSON.stringify(appData));
    updateJSONBin();
};

const handleMonthChange = () => {
    currentMonth = elements.monthSelect.value;
    
    if (!appData[currentMonth]) {
        appData[currentMonth] = {
            budget: 0,
            expenses: []
        };
        saveData();
    }
    
    updateDashboard();
    renderExpenses();
};

const handleSetBudget = (e) => {
    e.preventDefault();
    const newAmount = parseFloat(elements.newBudgetAmount.value);
    
    if (isNaN(newAmount) || newAmount < 0) return;
    
    appData[currentMonth].budget = newAmount;
    saveData();
    updateDashboard();
    
    elements.modal.classList.remove('show');
};

const handleAddExpense = (e) => {
    e.preventDefault();
    
    const date = elements.expenseDate.value;
    const what = elements.expenseWhat.value;
    const amount = parseFloat(elements.expenseAmount.value);
    
    if (!date || !what || isNaN(amount) || amount <= 0) return;
    
    const newExpense = {
        id: Date.now().toString(),
        date,
        what,
        amount
    };
    
    appData[currentMonth].expenses.push(newExpense);
    appData[currentMonth].expenses.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    saveData();
    updateDashboard();
    renderExpenses();
    renderHistory();
    
    elements.expenseWhat.value = '';
    elements.expenseAmount.value = '';
    elements.expenseWhat.focus();
};

const handleDeleteExpense = (id) => {
    appData[currentMonth].expenses = appData[currentMonth].expenses.filter(exp => exp.id !== id);
    saveData();
    updateDashboard();
    renderExpenses();
    renderHistory();
};

const updateDashboard = () => {
    const monthData = appData[currentMonth];
    
    const totalExpenses = monthData.expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const remaining = monthData.budget - totalExpenses;
    
    elements.displayBudget.innerText = formatCurrency(monthData.budget);
    elements.displayExpenses.innerText = formatCurrency(totalExpenses);
    elements.displayRemaining.innerText = formatCurrency(remaining);
    
    if (remaining < 0) {
        elements.displayRemaining.className = 'text-danger';
        elements.remainingIcon.style.background = 'rgba(239, 68, 68, 0.2)';
        elements.remainingIcon.style.color = 'var(--danger-color)';
    } else {
        elements.displayRemaining.className = 'text-success';
        elements.remainingIcon.style.background = 'rgba(16, 185, 129, 0.2)';
        elements.remainingIcon.style.color = 'var(--success-color)';
    }
};

const renderExpenses = () => {
    const expenses = appData[currentMonth].expenses;
    
    if (expenses.length === 0) {
        elements.expenseTbody.innerHTML = '';
        elements.emptyState.style.display = 'flex';
        elements.expenseTbody.parentElement.style.display = 'none';
        return;
    }
    
    elements.emptyState.style.display = 'none';
    elements.expenseTbody.parentElement.style.display = 'table';
    
    let html = '';
    expenses.forEach(exp => {
        html += '<tr><td>' + formatDate(exp.date) + '</td><td><strong>' + exp.what + '</strong></td><td>' + formatCurrency(exp.amount) + '</td><td><button class="icon-btn" onclick="handleDeleteExpense(\'' + exp.id + '\')"><i class="fa-solid fa-trash"></i></button></td></tr>';
    });
    elements.expenseTbody.innerHTML = html;
};

const renderHistory = () => {
    const months = Object.keys(appData).sort().reverse();
    
    if (months.length === 0) {
        elements.historyGrid.innerHTML = '<p class="text-muted">No history available yet.</p>';
        return;
    }

    let html = '';
    months.forEach(month => {
        const data = appData[month];
        const total = data.expenses.reduce((s, e) => s + e.amount, 0);
        const rem = data.budget - total;
        
        const dateObj = new Date(month + '-01');
        const monthLabel = dateObj.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
        const remClass = rem < 0 ? 'text-danger' : 'text-success';
        
        html += `<div class="card glass-card history-card" onclick="switchMonth('${month}')"><div class="card-info w-100"><div style="display:flex; justify-content:space-between; margin-bottom: 0.5rem"><h3>${monthLabel}</h3><h3 class="${remClass}">${formatCurrency(rem)}</h3></div><div style="display:flex; justify-content:space-between; font-size:0.85rem"><span class="text-muted">Budget: ${formatCurrency(data.budget)}</span><span class="text-muted">Spent: ${formatCurrency(total)}</span></div></div></div>`;
    });
    elements.historyGrid.innerHTML = html;
};

const switchMonth = (month) => {
    elements.monthSelect.value = month;
    handleMonthChange();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if(elements.tabInvestments.classList.contains('active')) {
        switchTab('budget');
    }
};

// ==========================================
// INVESTMENTS LOGIC
// ==========================================
const saveInvestments = () => {
    localStorage.setItem('Investments_Data', JSON.stringify(investmentsData));
    updateJSONBin();
};

const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const btn = elements.invForm.querySelector('button[type="submit"]');
    if(btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processing Photo...';
    }

    const reader = new FileReader();
    reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
            const ctx = elements.photoCanvas.getContext('2d');
            let MAX_WIDTH = 600;
            let MAX_HEIGHT = 800;
            let width = img.width;
            let height = img.height;

            if (width > height) {
                if (width > MAX_WIDTH) {
                    height *= MAX_WIDTH / width;
                    width = MAX_WIDTH;
                }
            } else {
                if (height > MAX_HEIGHT) {
                    width *= MAX_HEIGHT / height;
                    height = MAX_HEIGHT;
                }
            }

            elements.photoCanvas.width = width;
            elements.photoCanvas.height = height;
            ctx.drawImage(img, 0, 0, width, height);
            
            // Compress down to lightweight jpg array
            currentPhotoBase64 = elements.photoCanvas.toDataURL('image/jpeg', 0.4);
            elements.photoPreview.src = currentPhotoBase64;
            elements.photoPreviewContainer.style.display = 'block';

            if(btn) {
                btn.disabled = false;
                btn.innerHTML = '<i class="fa-solid fa-vault"></i> Secure in Vault';
            }
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
};

const removePhoto = () => {
    currentPhotoBase64 = '';
    elements.photoPreview.src = '';
    elements.photoPreviewContainer.style.display = 'none';
    elements.invPhotoInput.value = '';
};

const handleAddInvestment = (e) => {
    e.preventDefault();
    
    const type = elements.invType.value;
    const karat = type === 'Gold' ? elements.invKarat.value : '99.9';
    const name = elements.invName.value;
    const grams = parseFloat(elements.invGrams.value);
    const buyPrice = parseFloat(elements.invBuy.value);
    
    if (!name || isNaN(grams) || isNaN(buyPrice)) return;
    
    const newInv = {
        id: Date.now().toString(),
        type,
        karat,
        name,
        grams,
        buyPrice,
        sellPrice: 0,
        photo: currentPhotoBase64,
        dateAdded: new Date().toISOString()
    };
    
    investmentsData.push(newInv);
    saveInvestments();
    renderInvestments();
    
    // Reset Form
    elements.invName.value = '';
    elements.invGrams.value = '';
    elements.invBuy.value = '';
    removePhoto();
};

const handleSellInvestment = (id, formId) => {
    const input = document.getElementById(formId);
    const sellPrice = parseFloat(input.value);
    
    if (isNaN(sellPrice) || sellPrice <= 0) return;
    
    const index = investmentsData.findIndex(inv => inv.id === id);
    if (index !== -1) {
        investmentsData[index].sellPrice = sellPrice;
        saveInvestments();
        renderInvestments();
    }
};

const handleDeleteInvestment = (id) => {
    if(confirm("Are you sure you want to completely remove this physical asset?")) {
        investmentsData = investmentsData.filter(inv => inv.id !== id);
        saveInvestments();
        renderInvestments();
    }
};

const openEditInvestmentModal = (id) => {
    const inv = investmentsData.find(i => i.id === id);
    if (!inv) return;
    elements.editInvId.value = inv.id;
    elements.editInvName.value = inv.name;
    elements.editInvGrams.value = inv.grams;
    elements.editInvBuy.value = inv.buyPrice;
    
    if (inv.type === 'Gold') {
        elements.editInvKaratWrapper.style.display = 'block';
        elements.editInvKarat.value = inv.karat || '18';
    } else {
        elements.editInvKaratWrapper.style.display = 'none';
    }
    
    elements.editInvModal.classList.add('show');
};

const handleEditInvestmentSubmit = (e) => {
    e.preventDefault();
    const id = elements.editInvId.value;
    const name = elements.editInvName.value;
    const grams = parseFloat(elements.editInvGrams.value);
    const buyPrice = parseFloat(elements.editInvBuy.value);
    const karat = elements.editInvKarat.value;

    if (!name || isNaN(grams) || isNaN(buyPrice)) return;

    const index = investmentsData.findIndex(inv => inv.id === id);
    if (index !== -1) {
        investmentsData[index].name = name;
        investmentsData[index].grams = grams;
        investmentsData[index].buyPrice = buyPrice;
        if (investmentsData[index].type === 'Gold') {
            investmentsData[index].karat = karat;
        }
        saveInvestments();
        renderInvestments();
        elements.editInvModal.classList.remove('show');
    }
};

const handleAddExistingPhoto = (id, input) => {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
            const ctx = elements.photoCanvas.getContext('2d');
            let MAX_WIDTH = 600;
            let MAX_HEIGHT = 800;
            let width = img.width;
            let height = img.height;

            if (width > height) {
                if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
            } else {
                if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
            }

            elements.photoCanvas.width = width;
            elements.photoCanvas.height = height;
            ctx.drawImage(img, 0, 0, width, height);
            
            const b64 = elements.photoCanvas.toDataURL('image/jpeg', 0.4);
            
            const index = investmentsData.findIndex(inv => inv.id === id);
            if (index !== -1) {
                investmentsData[index].photo = b64;
                saveInvestments();
                renderInvestments();
            }
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
};

const renderInvestments = () => {
    let totalInvested = 0;
    let netProfit = 0;
    let totalLiveValue = 0;
    let totalUnrealizedProfit = 0;
    
    if (investmentsData.length === 0) {
        elements.invGrid.innerHTML = '';
        elements.invEmptyState.style.display = 'flex';
        elements.displayTotalInvested.innerText = '₱0.00';
        elements.displayTotalProfit.innerText = '₱0.00';
        elements.displayTotalLiveValue.innerText = '₱0.00';
        elements.displayUnrealizedProfit.innerText = '₱0.00';
        return;
    }
    
    elements.invEmptyState.style.display = 'none';
    
    let html = '';
    const items = [...investmentsData].reverse();
    
    items.forEach(inv => {
        if (inv.sellPrice > 0) {
            netProfit += (inv.sellPrice - inv.buyPrice);
        } else {
            totalInvested += inv.buyPrice;
        }

        let photoHtml = '';
        if (inv.photo) {
            photoHtml = `
                <div style="position: relative; width: 100%; height: 100%;">
                    <img src="${inv.photo}" class="inv-photo" alt="${inv.name}">
                    <label for="edit-pic-${inv.id}" class="edit-photo-btn">
                        <i class="fa-solid fa-pen"></i>
                    </label>
                    <input type="file" id="edit-pic-${inv.id}" accept="image/*" style="display:none;" onchange="handleAddExistingPhoto('${inv.id}', this)">
                </div>
            `;
        } else {
            photoHtml = `
                <label for="add-pic-${inv.id}" style="cursor:pointer; display:flex; flex-direction:column; align-items:center; opacity:0.6; width:100%; height:100%; justify-content:center; transition: opacity 0.3s;" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.6'">
                    <i class="fa-solid fa-camera" style="font-size: 2.5rem; margin-bottom:0.5rem; color: var(--text-color);"></i>
                    <span style="font-size: 0.9rem">Add Photo</span>
                </label>
                <input type="file" id="add-pic-${inv.id}" accept="image/*" style="display:none;" onchange="handleAddExistingPhoto('${inv.id}', this)">
            `;
        }

        let sellHtml = '';
        if (inv.sellPrice > 0) {
            const profit = inv.sellPrice - inv.buyPrice;
            const profitClass = profit >= 0 ? 'text-success' : 'text-danger';
            const profitSign = profit > 0 ? '+' : '';
            sellHtml = `<div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--card-border);"><div style="display:flex; justify-content:space-between; margin-bottom: 0.5rem"><span class="text-muted">Sold For:</span><strong>${formatCurrency(inv.sellPrice)}</strong></div><div style="display:flex; justify-content:space-between;"><span class="text-muted">Net Profit:</span><strong class="${profitClass}">${profitSign}${formatCurrency(profit)}</strong></div></div>`;
        } else {
            const inputId = 'sell-input-' + inv.id;
            sellHtml = `<div class="inv-sell-form"><input type="number" id="${inputId}" class="glass-input" placeholder="Sell Price ₱" style="padding: 0.5rem; font-size: 0.85rem"><button class="primary-btn" style="padding: 0.5rem; width: auto;" onclick="handleSellInvestment('${inv.id}', '${inputId}')">Sell</button></div>`;
        }
        
        let typeIcon = '🪙';
        if(inv.type === 'Gold') typeIcon = '🥇';
        if(inv.type === 'Silver') typeIcon = '🥈';
        
        let invKaratDisplay = inv.karat ? `${inv.karat}K ` : (inv.type === 'Gold' ? '18K ' : '');
        let currentKarat = inv.karat || '18';
        let liveValHtml = '';
        
        if (inv.sellPrice === 0) {
            let cv = 0;
            if (inv.type === 'Gold' && livePrices.gold[currentKarat]) {
                cv = inv.grams * livePrices.gold[currentKarat];
            } else if (inv.type === 'Silver' && livePrices.silver) {
                cv = inv.grams * livePrices.silver;
            }
            if (cv > 0) {
                totalLiveValue += cv;
                totalUnrealizedProfit += (cv - inv.buyPrice);
                
                let diff = cv - inv.buyPrice;
                let cClass = diff >= 0 ? 'text-success' : 'text-danger';
                let cSign = diff > 0 ? '+' : '';
                liveValHtml = `<div style="margin-top:0.5rem; padding-top:0.5rem; border-top:1px dashed var(--card-border); font-size:0.85rem; display:flex; justify-content:space-between;">
                    <span class="text-muted">Live Value:</span>
                    <span>${formatCurrency(cv)} <span class="${cClass}">(${cSign}${formatCurrency(diff)})</span></span>
                </div>`;
            }
        }

        html += `
            <div class="card glass-card inv-card">
                <div class="inv-photo-container">
                    ${photoHtml}
                </div>
                <div class="inv-details">
                    <div style="display:flex; justify-content:space-between; align-items:flex-start">
                        <div>
                            <span class="inv-tag">${typeIcon} ${inv.type === 'Gold' ? invKaratDisplay : ''}${inv.type}</span>
                            <h3 class="inv-title" style="margin-top:0.5rem">${inv.name}</h3>
                            <span class="text-muted" style="font-size:0.8rem">${inv.grams}g</span>
                        </div>
                        <div style="display:flex; gap: 0.2rem;">
                            <button class="icon-btn" onclick="openEditInvestmentModal('${inv.id}')" style="background:transparent; color:var(--primary-color)">
                                <i class="fa-solid fa-pen-to-square"></i>
                            </button>
                            <button class="icon-btn" onclick="handleDeleteInvestment('${inv.id}')" style="background:transparent; color:var(--text-muted)">
                                <i class="fa-solid fa-trash"></i>
                            </button>
                        </div>
                    </div>
                    
                    <div class="inv-pricing">
                        <span class="text-muted">Buy Price:</span>
                        <strong>${formatCurrency(inv.buyPrice)}</strong>
                    </div>
                    ${sellHtml}
                    ${liveValHtml}
                </div>
            </div>
        `;
    });
    
    elements.invGrid.innerHTML = html;
    elements.displayTotalInvested.innerText = formatCurrency(totalInvested);
    elements.displayTotalLiveValue.innerText = formatCurrency(totalLiveValue);
    
    elements.displayTotalProfit.innerText = (netProfit > 0 ? '+' : '') + formatCurrency(netProfit);
    elements.displayTotalProfit.className = netProfit >= 0 ? 'text-success' : 'text-danger';
    
    elements.displayUnrealizedProfit.innerText = (totalUnrealizedProfit > 0 ? '+' : '') + formatCurrency(totalUnrealizedProfit);
    elements.displayUnrealizedProfit.className = totalUnrealizedProfit >= 0 ? 'text-success' : 'text-danger';
};

// Expose globals
window.handleDeleteExpense = handleDeleteExpense;
window.switchMonth = switchMonth;
window.handleSellInvestment = handleSellInvestment;
window.handleDeleteInvestment = handleDeleteInvestment;
window.handleAddExistingPhoto = handleAddExistingPhoto;
window.openEditInvestmentModal = openEditInvestmentModal;

// Start the APP
// Initialize CC specific event listeners
const ccSelectBox = document.getElementById('cc-select-box');
const ccDropdown = document.getElementById('cc-dropdown');
const ccSearchInput = document.getElementById('cc-search-input');
const ccOptionsList = document.getElementById('cc-options-list');
const ccBankHidden = document.getElementById('cc-bank');

const populateCcOptions = (filter = '') => {
    let html = '';
    const term = filter.toLowerCase();
    creditCardOptions.forEach(opt => {
        if(opt.name.toLowerCase().includes(term)) {
            const imgSrc = opt.image ? `<img src="${opt.image}" class="custom-select-img">` : `<div class="custom-select-img" style="display:flex; justify-content:center; align-items:center;"><i class="fa-solid fa-credit-card"></i></div>`;
            html += `<div class="custom-select-option" data-name="${opt.name}">
                        ${imgSrc}
                        <span class="card-name">${opt.name}</span>
                     </div>`;
        }
    });
    if(html === '') {
        html = '<div class="text-muted" style="padding: 1rem; text-align:center;">No cards found.</div>';
    }
    ccOptionsList.innerHTML = html;
};

ccSelectBox.addEventListener('click', (e) => {
    e.stopPropagation();
    const isVisible = ccDropdown.style.display === 'flex';
    ccDropdown.style.display = isVisible ? 'none' : 'flex';
    if (!isVisible) {
        populateCcOptions('');
        ccSearchInput.value = '';
        ccSearchInput.focus();
    }
});

ccSearchInput.addEventListener('input', (e) => {
    populateCcOptions(e.target.value);
});

ccOptionsList.addEventListener('click', (e) => {
    const option = e.target.closest('.custom-select-option');
    if (!option) return;
    
    const name = option.getAttribute('data-name');
    const optData = creditCardOptions.find(o => o.name === name);
    
    ccBankHidden.value = name;
    
    const imgSrc = optData.image ? `<img src="${optData.image}" class="custom-select-img">` : `<div class="custom-select-img" style="display:flex; justify-content:center; align-items:center;"><i class="fa-solid fa-credit-card"></i></div>`;
    ccSelectBox.querySelector('.custom-select-selected-content').innerHTML = `${imgSrc} <span id="cc-selected-text">${name}</span>`;
    
    ccDropdown.style.display = 'none';
    
    if (name === 'Other Bank / Card') {
        elements.ccCustomNameWrapper.style.display = 'block';
        elements.ccCustomName.required = true;
    } else {
        elements.ccCustomNameWrapper.style.display = 'none';
        elements.ccCustomName.required = false;
    }
});

elements.closeEditCcModalBtn.addEventListener('click', () => {
    elements.editCcModal.classList.remove('show');
});

window.addEventListener('click', (e) => {
    if (e.target === elements.editCcModal) {
        elements.editCcModal.classList.remove('show');
    }
    if (ccDropdown && !ccSelectBox.contains(e.target) && !ccDropdown.contains(e.target)) {
        ccDropdown.style.display = 'none';
    }
});

const saveCreditCards = () => {
    localStorage.setItem('CreditCards_Data', JSON.stringify(creditCardsData));
    updateJSONBin();
};

elements.ccForm.addEventListener('submit', (e) => {
    e.preventDefault();
    let name = ccBankHidden.value;
    if (name === 'Other Bank / Card' || !name) {
        name = elements.ccCustomName.value;
    }
    const amount = parseFloat(elements.ccAmount.value);
    const limit = parseFloat(elements.ccLimit.value) || 0;
    const dueDate = elements.ccDueDate.value;
    
    if (!name || isNaN(amount) || amount <= 0 || !dueDate) return;
    
    const newCc = {
        id: 'cc_' + Date.now().toString(),
        name,
        amount,
        limit,
        dueDate,
        isPaid: false,
        datePaid: null
    };
    
    creditCardsData.push(newCc);
    saveCreditCards();
    renderCreditCards();
    
    elements.ccAmount.value = '';
    elements.ccLimit.value = '';
    elements.ccDueDate.value = '';
    elements.ccCustomName.value = '';
    ccBankHidden.value = '';
    ccSelectBox.querySelector('.custom-select-selected-content').innerHTML = `<span id="cc-selected-text">Select a Card / Bank</span>`;
    elements.ccCustomNameWrapper.style.display = 'none';
});

const getBankClass = (name) => {
    const lName = name.toLowerCase();
    if (lName.includes('bpi')) return 'bank-bpi';
    if (lName.includes('bdo')) return 'bank-bdo';
    if (lName.includes('union') || lName.includes('unionbank')) return 'bank-unionbank';
    if (lName.includes('metrobank')) return 'bank-metrobank';
    if (lName.includes('security')) return 'bank-securitybank';
    if (lName.includes('eastwest')) return 'bank-eastwest';
    if (lName.includes('rcbc')) return 'bank-rcbc';
    if (lName.includes('citi')) return 'bank-citi';
    if (lName.includes('pnb')) return 'bank-pnb';
    if (lName.includes('china bank')) return 'bank-chinabank';
    if (lName.includes('aub')) return 'bank-aub';
    if (lName.includes('hsbc')) return 'bank-hsbc';
    if (lName.includes('maybank')) return 'bank-maybank';
    if (lName.includes('commerce')) return 'bank-boc';
    if (lName.includes('maya')) return 'bank-maya';
    if (lName.includes('zed')) return 'bank-zed';
    if (lName.includes('gcash') || lName.includes('gcredit')) return 'bank-gcash';
    if (lName.includes('shopee')) return 'bank-shopee';
    if (lName.includes('cimb')) return 'bank-cimb';
    return 'bank-other';
};

const kaskasanLogos = {
    'bank-unionbank': 'https://media.kaskasanbuddies.com.ph/banks/ub-logo.png',
    'bank-bpi': 'https://media.kaskasanbuddies.com.ph/banks/bpi-logo.png',
    'bank-rcbc': 'https://media.kaskasanbuddies.com.ph/banks/rcbc-logo.png',
    'bank-metrobank': 'https://media.kaskasanbuddies.com.ph/banks/metrobank-logo.png',
    'bank-hsbc': 'https://media.kaskasanbuddies.com.ph/banks/2ee7e449-0b86-40b7-b9df-5f67514ec7db.png',
    'bank-eastwest': 'https://media.kaskasanbuddies.com.ph/banks/ew-logo.png',
    'bank-securitybank': 'https://media.kaskasanbuddies.com.ph/banks/secb-logo.png',
    'bank-chinabank': 'https://media.kaskasanbuddies.com.ph/banks/chinabank-logo.png',
    'bank-maya': 'https://media.kaskasanbuddies.com.ph/banks/0ab48c4c-b45c-4db4-ba18-b18f7ca4696f.png',
    'bank-aub': 'https://media.kaskasanbuddies.com.ph/banks/aub-logo.png',
    'bank-boc': 'https://media.kaskasanbuddies.com.ph/banks/boc-logo.png',
    'bank-maybank': 'https://media.kaskasanbuddies.com.ph/banks/1761326246384-MAYBANK.png',
    'bank-pnb': 'https://media.kaskasanbuddies.com.ph/banks/4533ed85-31f1-4a68-82cb-9f62f3388269.png',
    'bank-zed': 'https://media.kaskasanbuddies.com.ph/banks/7ffbfafe-782b-42e1-81c7-3cbd7afda720.png'
};

const creditCardOptions = [
  {
    "name": "Shopee Pay",
    "image": "credit card images/shopeepay.png"
  },
  {
    "name": "Atome Card",
    "image": "credit card images/atomecard.png"
  },
  {
    "name": "Asia United Bank",
    "image": "credit card images/Asia_United_Bank.png"
  },
  {
    "name": "AUB Classic Mastercard",
    "image": "credit card images/AUB_Classic_Mastercard_-_AUB_credit_card.png"
  },
  {
    "name": "AUB Easy Mastercard",
    "image": "credit card images/AUB_Easy_Mastercard_-_AUB_credit_card.png"
  },
  {
    "name": "AUB Gold Mastercard",
    "image": "credit card images/AUB_Gold_Mastercard_-_AUB_credit_card.png"
  },
  {
    "name": "AUB Platinum Mastercard",
    "image": "credit card images/AUB_Platinum_Mastercard_-_AUB_credit_card.png"
  },
  {
    "name": "Bank Card",
    "image": "credit card images/Bank_Card.jpeg"
  },
  {
    "name": "Bank of Commerce",
    "image": "credit card images/Bank_of_Commerce.png"
  },
  {
    "name": "Bank of the Philippine Islands",
    "image": "credit card images/Bank_of_the_Philippine_Islands.png"
  },
  {
    "name": "BOC Cash Installment Platinum Mastercard",
    "image": "credit card images/BOC_Cash_Installment_Platinum_Mastercard_-_BOC_cre.png"
  },
  {
    "name": "BOC Classic Mastercard",
    "image": "credit card images/BOC_Classic_Mastercard_-_BOC_credit_card.png"
  },
  {
    "name": "BOC Gold Mastercard",
    "image": "credit card images/BOC_Gold_Mastercard_-_BOC_credit_card.png"
  },
  {
    "name": "BOC Platinum Mastercard",
    "image": "credit card images/BOC_Platinum_Mastercard_-_BOC_credit_card.png"
  },
  {
    "name": "BOC World Mastercard",
    "image": "credit card images/BOC_World_Mastercard_-_BOC_credit_card.png"
  },
  {
    "name": "BPI Amore Cashback Visa",
    "image": "credit card images/BPI_Amore_Cashback_Visa_-_BPI_credit_card.png"
  },
  {
    "name": "BPI Amore Cashback Visa Platinum",
    "image": "credit card images/BPI_Amore_Cashback_Visa_Platinum_-_BPI_credit_card.png"
  },
  {
    "name": "BPI DOS Mastercard",
    "image": "credit card images/BPI_DOS_Mastercard_-_BPI_credit_card.png"
  },
  {
    "name": "BPI Edge Mastercard",
    "image": "credit card images/BPI_Edge_Mastercard_-_BPI_credit_card.png"
  },
  {
    "name": "BPI Gold Rewards Mastercard",
    "image": "credit card images/BPI_Gold_Rewards_Mastercard_-_BPI_credit_card.png"
  },
  {
    "name": "BPI Petron Mastercard",
    "image": "credit card images/BPI_Petron_Mastercard_-_BPI_credit_card.png"
  },
  {
    "name": "BPI Platinum Rewards Mastercard",
    "image": "credit card images/BPI_Platinum_Rewards_Mastercard_-_BPI_credit_card.png"
  },
  {
    "name": "BPI Rewards Mastercard",
    "image": "credit card images/BPI_Rewards_Mastercard_-_BPI_credit_card.png"
  },
  {
    "name": "BPI Robinsons Cashback Mastercard",
    "image": "credit card images/BPI_Robinsons_Cashback_Mastercard_-_BPI_credit_car.png"
  },
  {
    "name": "BPI Visa Signature",
    "image": "credit card images/BPI_Visa_Signature_-_BPI_credit_card.png"
  },
  {
    "name": "Chinabank",
    "image": "credit card images/Chinabank.png"
  },
  {
    "name": "Chinabank Cash Rewards Mastercard",
    "image": "credit card images/Chinabank_Cash_Rewards_Mastercard_-_CBC_credit_car.png"
  },
  {
    "name": "Chinabank Destinations Platinum Mastercard",
    "image": "credit card images/Chinabank_Destinations_Platinum_Mastercard_-_CBC_c.png"
  },
  {
    "name": "Chinabank Destinations World Dollar Mastercard",
    "image": "credit card images/Chinabank_Destinations_World_Dollar_Mastercard_-_C.png"
  },
  {
    "name": "Chinabank Destinations World Mastercard",
    "image": "credit card images/Chinabank_Destinations_World_Mastercard_-_CBC_cred.png"
  },
  {
    "name": "Chinabank Freedom Mastercard",
    "image": "credit card images/Chinabank_Freedom_Mastercard_-_CBC_credit_card.png"
  },
  {
    "name": "Chinabank home Visa Platinum",
    "image": "credit card images/Chinabank_home_Visa_Platinum_-_CBC_credit_card.png"
  },
  {
    "name": "Chinabank Landers Executive Visa Signature",
    "image": "credit card images/Chinabank_Landers_Executive_Visa_Signature_-_CBC_c.png"
  },
  {
    "name": "Chinabank Platinum Mastercard",
    "image": "credit card images/Chinabank_Platinum_Mastercard_-_CBC_credit_card.png"
  },
  {
    "name": "Chinabank Prime Mastercard",
    "image": "credit card images/Chinabank_Prime_Mastercard_-_CBC_credit_card.png"
  },
  {
    "name": "Chinabank Velvet Visa Signature",
    "image": "credit card images/Chinabank_Velvet_Visa_Signature_-_CBC_credit_card.png"
  },
  {
    "name": "Chinabank Wealth World Elite Mastercard",
    "image": "credit card images/Chinabank_Wealth_World_Elite_Mastercard_-_CBC_cred.png"
  },
  {
    "name": "Chinabank World Mastercard",
    "image": "credit card images/Chinabank_World_Mastercard_-_CBC_credit_card.png"
  },
  {
    "name": "EastWest Bank",
    "image": "credit card images/EastWest_Bank.png"
  },
  {
    "name": "EastWest Dolce Vita Titanium Mastercard",
    "image": "credit card images/EastWest_Dolce_Vita_Titanium_Mastercard_-_EW_credi.png"
  },
  {
    "name": "EastWest EveryDay Titanium Mastercard",
    "image": "credit card images/EastWest_EveryDay_Titanium_Mastercard_-_EW_credit_.png"
  },
  {
    "name": "EastWest foodpanda Visa",
    "image": "credit card images/EastWest_foodpanda_Visa_-_EW_credit_card.png"
  },
  {
    "name": "EastWest Gold Mastercard",
    "image": "credit card images/EastWest_Gold_Mastercard_-_EW_credit_card.png"
  },
  {
    "name": "EastWest Gold Visa",
    "image": "credit card images/EastWest_Gold_Visa_-_EW_credit_card.png"
  },
  {
    "name": "EastWest JCB Gold",
    "image": "credit card images/EastWest_JCB_Gold_-_EW_credit_card.png"
  },
  {
    "name": "EastWest JCB Platinum",
    "image": "credit card images/EastWest_JCB_Platinum_-_EW_credit_card.png"
  },
  {
    "name": "EastWest Platinum Mastercard",
    "image": "credit card images/EastWest_Platinum_Mastercard_-_EW_credit_card.png"
  },
  {
    "name": "EastWest Priority Visa Infinite",
    "image": "credit card images/EastWest_Priority_Visa_Infinite_-_EW_credit_card.png"
  },
  {
    "name": "EastWest Privilege Mastercard",
    "image": "credit card images/EastWest_Privilege_Mastercard_-_EW_credit_card.png"
  },
  {
    "name": "EastWest Privilege Visa",
    "image": "credit card images/EastWest_Privilege_Visa_-_EW_credit_card.png"
  },
  {
    "name": "EastWest Puregold Visa",
    "image": "credit card images/EastWest_Puregold_Visa_-_EW_credit_card.png"
  },
  {
    "name": "EastWest Singapore Airlines KrisFlyer Platinum Mas",
    "image": "credit card images/EastWest_Singapore_Airlines_KrisFlyer_Platinum_Mas.png"
  },
  {
    "name": "EastWest Singapore Airlines KrisFlyer World Master",
    "image": "credit card images/EastWest_Singapore_Airlines_KrisFlyer_World_Master.png"
  },
  {
    "name": "EastWest Visa Platinum",
    "image": "credit card images/EastWest_Visa_Platinum_-_EW_credit_card.png"
  },
  {
    "name": "Equicom Classic Visa",
    "image": "credit card images/Equicom_Classic_Visa_-_EqB_credit_card.png"
  },
  {
    "name": "Equicom Gold Visa",
    "image": "credit card images/Equicom_Gold_Visa_-_EqB_credit_card.png"
  },
  {
    "name": "Equicom Savings Bank",
    "image": "credit card images/Equicom_Savings_Bank.png"
  },
  {
    "name": "FREE Airport Lounges Access with Credit Cards",
    "image": "credit card images/FREE_Airport_Lounges_Access_with_Credit_Cards.webp"
  },
  {
    "name": "HSBC Cash Back Gold Visa",
    "image": "credit card images/HSBC_Cash_Back_Gold_Visa_-_HSBC_credit_card.png"
  },
  {
    "name": "HSBC Live Visa Signature",
    "image": "credit card images/HSBC_Live_Visa_Signature_-_HSBC_credit_card.png"
  },
  {
    "name": "HSBC Philippines",
    "image": "credit card images/HSBC_Philippines.png"
  },
  {
    "name": "HSBC Premier Mastercard",
    "image": "credit card images/HSBC_Premier_Mastercard_-_HSBC_credit_card.png"
  },
  {
    "name": "HSBC Premier Travel Mastercard",
    "image": "credit card images/HSBC_Premier_Travel_Mastercard_-_HSBC_credit_card.png"
  },
  {
    "name": "HSBC Premier World Mastercard",
    "image": "credit card images/HSBC_Premier_World_Mastercard_-_HSBC_credit_card.png"
  },
  {
    "name": "HSBC Rebate Visa Platinum",
    "image": "credit card images/HSBC_Rebate_Visa_Platinum_-_HSBC_credit_card.png"
  },
  {
    "name": "HSBC Red Mastercard",
    "image": "credit card images/HSBC_Red_Mastercard_-_HSBC_credit_card.png"
  },
  {
    "name": "KasKasan Buddies",
    "image": "credit card images/KasKasan_Buddies.png"
  },
  {
    "name": "kkb logo",
    "image": "credit card images/kkb_logo.png"
  },
  {
    "name": "Land Bank of the Philippines",
    "image": "credit card images/Land_Bank_of_the_Philippines.png"
  },
  {
    "name": "Maya",
    "image": "credit card images/Maya.png"
  },
  {
    "name": "Maya Black Visa Platinum",
    "image": "credit card images/Maya_Black_Visa_Platinum_-_MAYA_credit_card.png"
  },
  {
    "name": "Maya Landers Cashback Visa Platinum",
    "image": "credit card images/Maya_Landers_Cashback_Visa_Platinum_-_MAYA_credit_.png"
  },
  {
    "name": "Maybank",
    "image": "credit card images/Maybank.png"
  },
  {
    "name": "Metrobank",
    "image": "credit card images/Metrobank.png"
  },
  {
    "name": "Metrobank Cashback Visa Platinum",
    "image": "credit card images/Metrobank_Cashback_Visa_Platinum_-_MBTC_credit_car.png"
  },
  {
    "name": "Metrobank Femme Signature Visa",
    "image": "credit card images/Metrobank_Femme_Signature_Visa_-_MBTC_credit_card.png"
  },
  {
    "name": "Metrobank Femme Visa",
    "image": "credit card images/Metrobank_Femme_Visa_-_MBTC_credit_card.png"
  },
  {
    "name": "Metrobank M Free Mastercard",
    "image": "credit card images/Metrobank_M_Free_Mastercard_-_MBTC_credit_card.png"
  },
  {
    "name": "Metrobank Platinum Mastercard",
    "image": "credit card images/Metrobank_Platinum_Mastercard_-_MBTC_credit_card.png"
  },
  {
    "name": "Metrobank Rewards Plus Visa Platinum",
    "image": "credit card images/Metrobank_Rewards_Plus_Visa_Platinum_-_MBTC_credit.png"
  },
  {
    "name": "Metrobank Titanium Mastercard",
    "image": "credit card images/Metrobank_Titanium_Mastercard_-_MBTC_credit_card.png"
  },
  {
    "name": "Metrobank Toyota Mastercard",
    "image": "credit card images/Metrobank_Toyota_Mastercard_-_MBTC_credit_card.png"
  },
  {
    "name": "Metrobank Toyota Platinum Mastercard",
    "image": "credit card images/Metrobank_Toyota_Platinum_Mastercard_-_MBTC_credit.png"
  },
  {
    "name": "Metrobank Travel Platinum Visa",
    "image": "credit card images/Metrobank_Travel_Platinum_Visa_-_MBTC_credit_card.png"
  },
  {
    "name": "Metrobank Travel Signature Visa",
    "image": "credit card images/Metrobank_Travel_Signature_Visa_-_MBTC_credit_card.png"
  },
  {
    "name": "Metrobank Vantage Mastercard",
    "image": "credit card images/Metrobank_Vantage_Mastercard_-_MBTC_credit_card.png"
  },
  {
    "name": "Metrobank Vantage Visa",
    "image": "credit card images/Metrobank_Vantage_Visa_-_MBTC_credit_card.png"
  },
  {
    "name": "Metrobank World Mastercard",
    "image": "credit card images/Metrobank_World_Mastercard_-_MBTC_credit_card.png"
  },
  {
    "name": "No Annual Fee Forever with your first UnionBank Re",
    "image": "credit card images/No_Annual_Fee_Forever_with_your_first_UnionBank_Re.webp"
  },
  {
    "name": "Philippine National Bank",
    "image": "credit card images/Philippine_National_Bank.png"
  },
  {
    "name": "PNB-Alturas Visa",
    "image": "credit card images/PNB-Alturas_Visa_-_PNB_credit_card.png"
  },
  {
    "name": "PNB-PAL Mabuhay Miles NOW Mastercard",
    "image": "credit card images/PNB-PAL_Mabuhay_Miles_NOW_Mastercard_-_PNB_credit_.png"
  },
  {
    "name": "PNB-PAL Mabuhay Miles Platinum Mastercard",
    "image": "credit card images/PNB-PAL_Mabuhay_Miles_Platinum_Mastercard_-_PNB_cr.png"
  },
  {
    "name": "PNB-PAL Mabuhay Miles World Elite Mastercard",
    "image": "credit card images/PNB-PAL_Mabuhay_Miles_World_Elite_Mastercard_-_PNB.png"
  },
  {
    "name": "PNB-PAL Mabuhay Miles World Mastercard",
    "image": "credit card images/PNB-PAL_Mabuhay_Miles_World_Mastercard_-_PNB_credi.png"
  },
  {
    "name": "PNB-The Travel Club Platinum Mastercard",
    "image": "credit card images/PNB-The_Travel_Club_Platinum_Mastercard_-_PNB_cred.png"
  },
  {
    "name": "PNB Cashback Titanium Mastercard",
    "image": "credit card images/PNB_Cashback_Titanium_Mastercard_-_PNB_credit_card.png"
  },
  {
    "name": "PNB Classic Visa",
    "image": "credit card images/PNB_Classic_Visa_-_PNB_credit_card.png"
  },
  {
    "name": "PNB Diamond UnionPay",
    "image": "credit card images/PNB_Diamond_UnionPay_-_PNB_credit_card.png"
  },
  {
    "name": "PNB Essentials Mastercard",
    "image": "credit card images/PNB_Essentials_Mastercard_-_PNB_credit_card.png"
  },
  {
    "name": "PNB Gold Visa",
    "image": "credit card images/PNB_Gold_Visa_-_PNB_credit_card.png"
  },
  {
    "name": "PNB Platinum Mastercard",
    "image": "credit card images/PNB_Platinum_Mastercard_-_PNB_credit_card.png"
  },
  {
    "name": "PNB Ze-Lo Mastercard",
    "image": "credit card images/PNB_Ze-Lo_Mastercard_-_PNB_credit_card.png"
  },
  {
    "name": "PRU Life UK Classic Mastercard",
    "image": "credit card images/PRU_Life_UK_Classic_Mastercard_-_BPI_credit_card.png"
  },
  {
    "name": "PRU Life UK Platinum Mastercard",
    "image": "credit card images/PRU_Life_UK_Platinum_Mastercard_-_BPI_credit_card.png"
  },
  {
    "name": "PSBank Credit Mastercard",
    "image": "credit card images/PSBank_Credit_Mastercard_-_MBTC_credit_card.png"
  },
  {
    "name": "RCBC AirAsia Visa",
    "image": "credit card images/RCBC_AirAsia_Visa_-_RCBC_credit_card.png"
  },
  {
    "name": "RCBC AirAsia Visa Platinum",
    "image": "credit card images/RCBC_AirAsia_Visa_Platinum_-_RCBC_credit_card.png"
  },
  {
    "name": "RCBC Airmiles Visa Signature",
    "image": "credit card images/RCBC_Airmiles_Visa_Signature_-_RCBC_credit_card.png"
  },
  {
    "name": "RCBC Black Card Platinum Mastercard",
    "image": "credit card images/RCBC_Black_Card_Platinum_Mastercard_-_RCBC_credit_.png"
  },
  {
    "name": "RCBC Classic Mastercard",
    "image": "credit card images/RCBC_Classic_Mastercard_-_RCBC_credit_card.png"
  },
  {
    "name": "RCBC Diamond Platinum Mastercard",
    "image": "credit card images/RCBC_Diamond_Platinum_Mastercard_-_RCBC_credit_car.png"
  },
  {
    "name": "RCBC Diamond UnionPay",
    "image": "credit card images/RCBC_Diamond_UnionPay_-_RCBC_credit_card.png"
  },
  {
    "name": "RCBC Flex Gold Visa",
    "image": "credit card images/RCBC_Flex_Gold_Visa_-_RCBC_credit_card.png"
  },
  {
    "name": "RCBC Flex Visa",
    "image": "credit card images/RCBC_Flex_Visa_-_RCBC_credit_card.png"
  },
  {
    "name": "RCBC Gold Mastercard",
    "image": "credit card images/RCBC_Gold_Mastercard_-_RCBC_credit_card.png"
  },
  {
    "name": "RCBC Hexagon Club Platinum Mastercard",
    "image": "credit card images/RCBC_Hexagon_Club_Platinum_Mastercard_-_RCBC_credi.png"
  },
  {
    "name": "RCBC Hexagon Club Priority Mastercard",
    "image": "credit card images/RCBC_Hexagon_Club_Priority_Mastercard_-_RCBC_credi.png"
  },
  {
    "name": "RCBC JCB Classic",
    "image": "credit card images/RCBC_JCB_Classic_-_RCBC_credit_card.png"
  },
  {
    "name": "RCBC JCB Gold",
    "image": "credit card images/RCBC_JCB_Gold_-_RCBC_credit_card.png"
  },
  {
    "name": "RCBC JCB Platinum",
    "image": "credit card images/RCBC_JCB_Platinum_-_RCBC_credit_card.png"
  },
  {
    "name": "RCBC Visa Infinite",
    "image": "credit card images/RCBC_Visa_Infinite_-_RCBC_credit_card.png"
  },
  {
    "name": "RCBC Visa Infinite Dollar",
    "image": "credit card images/RCBC_Visa_Infinite_Dollar_-_RCBC_credit_card.png"
  },
  {
    "name": "RCBC Visa Platinum",
    "image": "credit card images/RCBC_Visa_Platinum_-_RCBC_credit_card.png"
  },
  {
    "name": "RCBC World Mastercard",
    "image": "credit card images/RCBC_World_Mastercard_-_RCBC_credit_card.png"
  },
  {
    "name": "RCBC YGC Rewards Plus Classic Visa",
    "image": "credit card images/RCBC_YGC_Rewards_Plus_Classic_Visa_-_RCBC_credit_c.png"
  },
  {
    "name": "RCBC YGC Rewards Plus Gold Visa",
    "image": "credit card images/RCBC_YGC_Rewards_Plus_Gold_Visa_-_RCBC_credit_card.png"
  },
  {
    "name": "RCBC YGC Rewards Plus Mastercard",
    "image": "credit card images/RCBC_YGC_Rewards_Plus_Mastercard_-_RCBC_credit_car.png"
  },
  {
    "name": "RCBC ZALORA Mastercard",
    "image": "credit card images/RCBC_ZALORA_Mastercard_-_RCBC_credit_card.png"
  },
  {
    "name": "Rizal Commercial Banking Corporation",
    "image": "credit card images/Rizal_Commercial_Banking_Corporation.png"
  },
  {
    "name": "Security Bank Complete Cashback Platinum Mastercar",
    "image": "credit card images/Security_Bank_Complete_Cashback_Platinum_Mastercar.png"
  },
  {
    "name": "Security Bank Gold Mastercard",
    "image": "credit card images/Security_Bank_Gold_Mastercard_-_SECB_credit_card.png"
  },
  {
    "name": "Security Bank Philippines",
    "image": "credit card images/Security_Bank_Philippines.png"
  },
  {
    "name": "Security Bank Platinum Mastercard",
    "image": "credit card images/Security_Bank_Platinum_Mastercard_-_SECB_credit_ca.png"
  },
  {
    "name": "Security Bank Wave Mastercard",
    "image": "credit card images/Security_Bank_Wave_Mastercard_-_SECB_credit_card.png"
  },
  {
    "name": "Security Bank World Mastercard",
    "image": "credit card images/Security_Bank_World_Mastercard_-_SECB_credit_card.png"
  },
  {
    "name": "UnionBank Cash Back Titanium Mastercard",
    "image": "credit card images/UnionBank_Cash_Back_Titanium_Mastercard_-_UB_credi.png"
  },
  {
    "name": "UnionBank Cash Back Visa Platinum",
    "image": "credit card images/UnionBank_Cash_Back_Visa_Platinum_-_UB_credit_card.png"
  },
  {
    "name": "UnionBank Classic Visa",
    "image": "credit card images/UnionBank_Classic_Visa_-_UB_credit_card.png"
  },
  {
    "name": "UnionBank Gold Mastercard",
    "image": "credit card images/UnionBank_Gold_Mastercard_-_UB_credit_card.png"
  },
  {
    "name": "UnionBank Gold Visa",
    "image": "credit card images/UnionBank_Gold_Visa_-_UB_credit_card.png"
  },
  {
    "name": "UnionBank Go Rewards Gold Visa",
    "image": "credit card images/UnionBank_Go_Rewards_Gold_Visa_-_UB_credit_card.png"
  },
  {
    "name": "UnionBank Go Rewards Visa Platinum",
    "image": "credit card images/UnionBank_Go_Rewards_Visa_Platinum_-_UB_credit_car.png"
  },
  {
    "name": "UnionBank Lazada Mastercard",
    "image": "credit card images/UnionBank_Lazada_Mastercard_-_UB_credit_card.png"
  },
  {
    "name": "UnionBank Mercury Visa",
    "image": "credit card images/UnionBank_Mercury_Visa_-_UB_credit_card.png"
  },
  {
    "name": "UnionBank Miles Visa Platinum",
    "image": "credit card images/UnionBank_Miles_Visa_Platinum_-_UB_credit_card.png"
  },
  {
    "name": "UnionBank Miles Visa Signature",
    "image": "credit card images/UnionBank_Miles_Visa_Signature_-_UB_credit_card.png"
  },
  {
    "name": "UnionBank Miles World Mastercard",
    "image": "credit card images/UnionBank_Miles_World_Mastercard_-_UB_credit_card.png"
  },
  {
    "name": "UnionBank of the Philippines",
    "image": "credit card images/UnionBank_of_the_Philippines.png"
  },
  {
    "name": "UnionBank Platinum Mastercard",
    "image": "credit card images/UnionBank_Platinum_Mastercard_-_UB_credit_card.png"
  },
  {
    "name": "UnionBank Platinum Mastercard starts with 552097 -",
    "image": "credit card images/UnionBank_Platinum_Mastercard_starts_with_552097_-.png"
  },
  {
    "name": "UnionBank PlayEveryday Visa",
    "image": "credit card images/UnionBank_PlayEveryday_Visa_-_UB_credit_card.png"
  },
  {
    "name": "UnionBank Reserve Visa Infinite",
    "image": "credit card images/UnionBank_Reserve_Visa_Infinite_-_UB_credit_card.png"
  },
  {
    "name": "UnionBank Reserve World Elite Mastercard",
    "image": "credit card images/UnionBank_Reserve_World_Elite_Mastercard_-_UB_cred.png"
  },
  {
    "name": "UnionBank Rewards Platinum Mastercard",
    "image": "credit card images/UnionBank_Rewards_Platinum_Mastercard_-_UB_credit_.png"
  },
  {
    "name": "UnionBank Rewards Visa Platinum",
    "image": "credit card images/UnionBank_Rewards_Visa_Platinum_-_UB_credit_card.png"
  },
  {
    "name": "UnionBank Shell Power Visa Platinum",
    "image": "credit card images/UnionBank_Shell_Power_Visa_Platinum_-_UB_credit_ca.png"
  },
  {
    "name": "UnionBank SR Visa Platinum",
    "image": "credit card images/UnionBank_SR_Visa_Platinum_-_UB_credit_card.png"
  },
  {
    "name": "UnionBank U Platinum Mastercard",
    "image": "credit card images/UnionBank_U_Platinum_Mastercard_-_UB_credit_card.png"
  },
  {
    "name": "UnionBank U Visa Platinum",
    "image": "credit card images/UnionBank_U_Visa_Platinum_-_UB_credit_card.png"
  },
  {
    "name": "UnionBank Visa Platinum",
    "image": "credit card images/UnionBank_Visa_Platinum_-_UB_credit_card.png"
  },
  {
    "name": "UnionBank Visa Platinum starts with 453248",
    "image": "credit card images/UnionBank_Visa_Platinum_starts_with_453248_-_UB_cr.png"
  },
  {
    "name": "Zed",
    "image": "credit card images/Zed.png"
  },
  {
    "name": "Zed Mastercard",
    "image": "credit card images/Zed_Mastercard_-_ZED_credit_card.png"
  },
  {
    "name": "PNB-La Salle Green Hills Alumni Association Plati",
    "image": "credit card images/_PNB-La_Salle_Green_Hills_Alumni_Association_Plati.png"
  },
  {
    "name": "RCBC Landmark Ansons Mastercard",
    "image": "credit card images/_RCBC_Landmark_Ansons_Mastercard_-_RCBC_credit_car.png"
  },
  {
    "name": "UnionBank Assumption Alumni Association Visa",
    "image": "credit card images/_UnionBank_Assumption_Alumni_Association_Visa_-_UB.png"
  },
  {
    "name": "UnionBank Ateneo Alumni Association Visa",
    "image": "credit card images/_UnionBank_Ateneo_Alumni_Association_Visa_-_UB_cre.png"
  },
  {
    "name": "UnionBank Cebu Pacific Gold Visa",
    "image": "credit card images/_UnionBank_Cebu_Pacific_Gold_Visa_-_UB_credit_card.png"
  },
  {
    "name": "UnionBank Cebu Pacific Visa Platinum",
    "image": "credit card images/_UnionBank_Cebu_Pacific_Visa_Platinum_-_UB_credit_.png"
  },
  {
    "name": "UnionBank De La Salle Alumni Visa",
    "image": "credit card images/_UnionBank_De_La_Salle_Alumni_Visa_-_UB_credit_car.png"
  },
  {
    "name": "UnionBank Don Bosco Alumni Association Visa",
    "image": "credit card images/_UnionBank_Don_Bosco_Alumni_Association_Visa_-_UB_.png"
  },
  {
    "name": "UnionBank La Salle Greenhills Visa",
    "image": "credit card images/_UnionBank_La_Salle_Greenhills_Visa_-_UB_credit_ca.png"
  },
  {
    "name": "UnionBank Southwestern University Alumni Foundati",
    "image": "credit card images/_UnionBank_Southwestern_University_Alumni_Foundati.png"
  },
  {
    "name": "UnionBank University of the Philippines Alumni As",
    "image": "credit card images/_UnionBank_University_of_the_Philippines_Alumni_As.png"
  },
  {
    "name": "Atome Card",
    "image": "credit card images/atomecard.png"
  }
];

// Add Other option at the top
creditCardOptions.unshift({ name: 'Other Bank / Card', image: '' });

let ccTimerInterval = null;

const renderCreditCards = () => {
    if (ccTimerInterval) clearInterval(ccTimerInterval);
    
    let totalBalance = 0;
    
    const activeCards = creditCardsData.filter(c => !c.isPaid).sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
    const paidCards = creditCardsData.filter(c => c.isPaid).sort((a, b) => new Date(b.datePaid) - new Date(a.datePaid));
    
    // Active Grid
    if (activeCards.length === 0) {
        elements.ccActiveGrid.innerHTML = '';
        elements.ccEmptyState.style.display = 'flex';
    } else {
        elements.ccEmptyState.style.display = 'none';
        let html = '';
        activeCards.forEach(cc => {
            const bClass = getBankClass(cc.name);
            let bLogo = '';
            const optData = creditCardOptions.find(o => o.name === cc.name);
            if (optData && optData.image) {
                bLogo = `<img src="${optData.image}" alt="logo" style="height:60px; object-fit:contain; filter:drop-shadow(0 2px 5px rgba(0,0,0,0.5)); border-radius: 6px;">`;
            } else if (kaskasanLogos[bClass]) {
                bLogo = `<img src="${kaskasanLogos[bClass]}" alt="logo" style="height:60px; object-fit:contain; filter:drop-shadow(0 2px 5px rgba(0,0,0,0.5)); border-radius: 6px; background: rgba(255,255,255,0.2); padding: 4px;">`;
            }
            totalBalance += cc.amount;
            html += `
                <div class="cc-card ${bClass}">
                    <div class="cc-header">
                        <span class="cc-bank-name">${cc.name}</span>
                        <div style="display:flex; gap:0.5rem; z-index: 10;">
                            <button class="icon-btn" onclick="openEditCcModal('${cc.id}')" style="background:transparent; color:white;"><i class="fa-solid fa-pen-to-square"></i></button>
                            <button class="icon-btn" onclick="handleDeleteCc('${cc.id}')" style="background:transparent; color:rgba(255,255,255,0.6);"><i class="fa-solid fa-trash"></i></button>
                        </div>
                    </div>
                    <div class="cc-body">
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <div class="cc-chip"></div>
                            ${bLogo}
                        </div>
                        <div style="margin-top: 1rem;">
                            <div class="cc-amount-label">Amount Due</div>
                            <div class="cc-amount">${formatCurrency(cc.amount)}</div>
                            ${cc.limit && cc.limit > 0 ? `
                                <div style="margin-top: 0.5rem; background: rgba(0,0,0,0.2); padding: 0.5rem 0.75rem; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1);">
                                    <div style="display:flex; justify-content:space-between; font-size: 0.75rem; margin-bottom: 6px; opacity:0.9;">
                                        <span>Credit Limit</span>
                                        <strong style="color: var(--text-color);">${formatCurrency(cc.limit)}</strong>
                                    </div>
                                    <div style="display:flex; justify-content:space-between; font-size: 0.75rem; margin-bottom: 6px; opacity:0.9;">
                                        <span>Remaining Available Limit</span>
                                        <strong style="color: var(--success-color);">${formatCurrency(cc.limit - cc.amount)}</strong>
                                    </div>
                                    ${(() => {
                                        const totalCredit = cc.limit;
                                        const utilPct = Math.min((cc.amount / totalCredit) * 100, 100);
                                        let utilColor = 'var(--success-color)';
                                        if (utilPct > 80) utilColor = 'var(--danger-color)';
                                        else if (utilPct > 50) utilColor = '#ffd60a';
                                        return `
                                            <div style="width: 100%; height: 6px; background: rgba(255,255,255,0.1); border-radius: 3px; overflow: hidden; margin-bottom: 4px;">
                                                <div style="width: ${utilPct}%; height: 100%; background: ${utilColor}; border-radius: 3px;"></div>
                                            </div>
                                            <div style="text-align:right; font-size:0.65rem; opacity:0.7;">Utilization: ${utilPct.toFixed(1)}%</div>
                                        `;
                                    })()}
                                </div>
                            ` : ''}
                        </div>
                    </div>
                    <div class="cc-footer">
                        <div class="cc-due">
                            <span class="cc-due-label">Due Date</span>
                            <span class="cc-due-date">${formatDate(cc.dueDate)}</span>
                            <span class="cc-timer" data-due="${cc.dueDate}" id="timer-${cc.id}" style="font-size:0.75rem; font-weight:700; margin-top:3px;"></span>
                        </div>
                        <div class="cc-actions">
                            <button class="text-btn cc-mark-paid" style="padding: 0.5rem 1rem; border-radius: 8px; text-decoration:none; font-weight:600;" onclick="handleMarkAsPaid('${cc.id}')">
                                <i class="fa-solid fa-check"></i> Paid
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });
        elements.ccActiveGrid.innerHTML = html;
    }
    
    elements.displayTotalCcBalance.innerText = formatCurrency(totalBalance);
    
    // Timer Loop
    const updateAllTimers = () => {
        const timers = document.querySelectorAll('.cc-timer');
        if (timers.length === 0) return;
        const now = new Date();
        timers.forEach(el => {
            const dueStr = el.getAttribute('data-due');
            if(!dueStr) return;
            const d = new Date(dueStr);
            d.setHours(23, 59, 59, 999);
            const diff = d - now;
            
            if (diff <= 0) {
                el.innerText = 'OVERDUE!';
                el.style.color = '#ff453a'; // red
            } else {
                const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                const secs = Math.floor((diff % (1000 * 60)) / 1000);
                el.innerText = `${days}d ${hours}h ${mins}m ${secs}s left`;
                if(days < 3) el.style.color = '#ff453a';
                else el.style.color = '#ffd60a';
            }
        });
    };
    updateAllTimers();
    ccTimerInterval = setInterval(updateAllTimers, 1000);
    
    // History Table
    if (paidCards.length === 0) {
        elements.ccHistoryTbody.innerHTML = '';
        elements.ccHistoryEmpty.style.display = 'flex';
        elements.ccHistoryTbody.parentElement.style.display = 'none';
    } else {
        elements.ccHistoryEmpty.style.display = 'none';
        elements.ccHistoryTbody.parentElement.style.display = 'table';
        let html = '';
        paidCards.forEach(cc => {
            let bLogo = '';
            const optData = creditCardOptions.find(o => o.name === cc.name);
            if (optData && optData.image) {
                bLogo = `<img src="${optData.image}" alt="logo" style="height:24px; object-fit:contain; border-radius: 3px; vertical-align: middle; margin-right: 0.5rem;">`;
            } else {
                const bClass = getBankClass(cc.name);
                if (kaskasanLogos[bClass]) {
                    bLogo = `<img src="${kaskasanLogos[bClass]}" alt="logo" style="height:20px; object-fit:contain; border-radius: 2px; vertical-align: middle; margin-right: 0.5rem; background: rgba(255,255,255,0.2); padding: 2px;">`;
                }
            }
            html += `
                <tr>
                    <td>${bLogo}<strong>${cc.name}</strong></td>
                    <td class="text-success">${formatCurrency(cc.amount)}</td>
                    <td>${formatDate(cc.dueDate)}</td>
                    <td>
                        <button class="text-btn text-muted" style="text-decoration:none; margin-right: 0.5rem;" onclick="handleUndoPayment('${cc.id}')"><i class="fa-solid fa-rotate-left"></i> Undo</button>
                        <button class="icon-btn" style="display:inline-flex;" onclick="handleDeleteCc('${cc.id}')"><i class="fa-solid fa-trash"></i></button>
                    </td>
                </tr>
            `;
        });
        elements.ccHistoryTbody.innerHTML = html;
    }
};

const handleDeleteCc = (id) => {
    if(confirm("Are you sure you want to delete this bill?")) {
        const originalLength = creditCardsData.length;
        const targetId = String(id).trim();
        creditCardsData = creditCardsData.filter(c => String(c.id).trim() !== targetId);
        
        if (creditCardsData.length === originalLength) {
            console.warn("Delete failed to find ID:", targetId);
            // Fallback attempt by index if IDs somehow got mangled
            const idx = creditCardsData.findIndex(c => c.id.includes(targetId) || targetId.includes(c.id));
            if (idx !== -1) creditCardsData.splice(idx, 1);
        }
        
        saveCreditCards();
        renderCreditCards();
    }
};

const handleMarkAsPaid = (id) => {
    const index = creditCardsData.findIndex(c => c.id === id);
    if (index !== -1) {
        creditCardsData[index].isPaid = true;
        creditCardsData[index].datePaid = new Date().toISOString();
        saveCreditCards();
        renderCreditCards();
    }
};

const handleUndoPayment = (id) => {
    const index = creditCardsData.findIndex(c => c.id === id);
    if (index !== -1) {
        creditCardsData[index].isPaid = false;
        creditCardsData[index].datePaid = null;
        saveCreditCards();
        renderCreditCards();
    }
};

const openEditCcModal = (id) => {
    const cc = creditCardsData.find(c => c.id === id);
    if (!cc) return;
    elements.editCcId.value = cc.id;
    elements.editCcAmount.value = cc.amount;
    elements.editCcDueDate.value = cc.dueDate;
    elements.editCcModal.classList.add('show');
};

elements.editCcForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = elements.editCcId.value;
    const amount = parseFloat(elements.editCcAmount.value);
    const dueDate = elements.editCcDueDate.value;
    
    if (isNaN(amount) || !dueDate) return;
    
    const index = creditCardsData.findIndex(c => c.id === id);
    if (index !== -1) {
        creditCardsData[index].amount = amount;
        creditCardsData[index].dueDate = dueDate;
        saveCreditCards();
        renderCreditCards();
        elements.editCcModal.classList.remove('show');
    }
});

// Expose Credit Card globals
window.handleDeleteCc = handleDeleteCc;
window.handleMarkAsPaid = handleMarkAsPaid;
window.handleUndoPayment = handleUndoPayment;
window.openEditCcModal = openEditCcModal;

const loadApp = async () => {
    const record = await fetchJSONBin();
    if(record) {
        if (record.BudgetApp_Data) appData = record.BudgetApp_Data;
        if (record.Investments_Data) investmentsData = record.Investments_Data;
        if (record.CreditCards_Data) creditCardsData = record.CreditCards_Data;
        localStorage.setItem('BudgetApp_Data', JSON.stringify(appData));
        localStorage.setItem('Investments_Data', JSON.stringify(investmentsData));
        localStorage.setItem('CreditCards_Data', JSON.stringify(creditCardsData));
    }
    init();
};

document.addEventListener('DOMContentLoaded', async () => {
    const pwScreen = document.getElementById('password-screen');
    const pwForm = document.getElementById('password-form');
    const pwInput = document.getElementById('password-input');
    const pwError = document.getElementById('password-error');
    const appContainer = document.querySelector('.app-container');
    
    appContainer.style.display = 'none';

    if(sessionStorage.getItem('family_unlocked') === 'true') {
        pwScreen.style.display = 'none';
        appContainer.style.display = 'block';
        await loadApp();
    } else {
        pwForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if(pwInput.value === 'QQQ') {
                sessionStorage.setItem('family_unlocked', 'true');
                pwForm.querySelector('button').innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
                await loadApp();
                pwScreen.style.display = 'none';
                appContainer.style.display = 'block';
            } else {
                pwError.style.display = 'block';
            }
        });
    }
});
