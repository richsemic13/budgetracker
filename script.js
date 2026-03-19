let budgetData = JSON.parse(localStorage.getItem("budgetData")) || {
    totalBudget: 0,
    totalExpenses: 0,
    budgetLeft: 0,
    expenses: []
};

let expenseChart;

function formatCurrency(value) {
    return "₱" + value.toFixed(2);
}

function updateUI() {
    document.getElementById('totalBudget').textContent = formatCurrency(budgetData.totalBudget);
    document.getElementById('totalExpenses').textContent = formatCurrency(budgetData.totalExpenses);
    document.getElementById('budgetLeft').textContent = formatCurrency(budgetData.budgetLeft);

    let tableBody = document.querySelector('.table-container tbody');
    tableBody.innerHTML = '';

    if (budgetData.expenses.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="5">No expenses yet.</td></tr>`;
    } else {
        budgetData.expenses.forEach(expense => {
            let row = document.createElement('tr');
            row.setAttribute('data-id', expense.id);
            row.innerHTML = `
                <td class="title-cell">${expense.title}</td>
                <td class="amount-cell">${formatCurrency(expense.amount)}</td>
                <td class="category-cell">${expense.category}</td>
                <td>${expense.date}</td>
                <td class="action-cell">
                    <button class="btn btn-sm btn-warning edit-btn">Edit</button>
                    <button class="btn btn-sm btn-danger delete-btn">Remove</button>
                </td>
            `;
            tableBody.appendChild(row);
        });
    }

    // Pie Chart update
    if (document.getElementById('chartContainer').style.display !== 'none') {
        let categories = {};
        budgetData.expenses.forEach(e => {
            categories[e.category] = (categories[e.category] || 0) + e.amount;
        });

        let labels = Object.keys(categories);
        let data = Object.values(categories);

        let ctx = document.getElementById('expenseChart').getContext('2d');
        if (expenseChart) expenseChart.destroy();

        expenseChart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: labels.map(() => '#' + Math.floor(Math.random() * 16777215).toString(16))
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: { legend: { position: 'bottom' } }
            }
        });
    }
}

function updateLocalStorage() {
    localStorage.setItem("budgetData", JSON.stringify(budgetData));
}

function resetAll() {
    if (!confirm("Are you sure you want to reset everything?")) return;
    budgetData = { totalBudget: 0, totalExpenses: 0, budgetLeft: 0, expenses: [] };
    updateLocalStorage();
    updateUI();
}

document.addEventListener("DOMContentLoaded", function () {
    updateUI();

    // Add Budget
    document.querySelector('.add-budget-container form').addEventListener('submit', function (e) {
        e.preventDefault();
        let val = parseFloat(document.getElementById('budget').value);
        if (isNaN(val) || val <= 0) { alert('Invalid budget'); return; }
        budgetData.totalBudget += val;
        budgetData.budgetLeft += val;
        updateLocalStorage(); updateUI();
        this.reset();
    });

    // Add Expense
    document.querySelector('.add-expense-container form').addEventListener('submit', function (e) {
        e.preventDefault();
        let title = document.getElementById('expense').value.trim();
        let amount = parseFloat(document.getElementById('amount').value);
        let category = document.getElementById('category').value;
        if (!title || isNaN(amount) || amount <= 0) { alert('Invalid expense'); return; }
        if (amount > budgetData.budgetLeft) { alert('Not enough budget'); return; }

        budgetData.expenses.push({
            id: Date.now(),
            title,
            amount,
            category,
            date: new Date().toLocaleDateString()
        });
        budgetData.totalExpenses += amount;
        budgetData.budgetLeft -= amount;
        updateLocalStorage(); updateUI();
        this.reset();
    });

    // Table click events
    document.querySelector('.table-container tbody').addEventListener('click', function (e) {
        let row = e.target.closest('tr'); if (!row) return;
        let id = row.getAttribute('data-id');
        let exp = budgetData.expenses.find(x => x.id == id);

        // Delete
        if (e.target.classList.contains('delete-btn')) {
            if (!confirm("Delete this expense?")) return;
            budgetData.totalExpenses -= exp.amount;
            budgetData.budgetLeft += exp.amount;
            budgetData.expenses = budgetData.expenses.filter(x => x.id != id);
            updateLocalStorage(); updateUI();
            return;
        }

        // Edit button
        if (e.target.classList.contains('edit-btn')) {
            let editBtn = e.target;

            if (editBtn.textContent === "Edit") {
                // Change buttons to Save + Cancel only
                let actionCell = row.querySelector('.action-cell');
                actionCell.innerHTML = '';

                let btnGroup = document.createElement('div');
                btnGroup.className = "d-flex justify-content-center";

                let saveBtn = document.createElement('button');
                saveBtn.className = "btn btn-success btn-sm save-btn mr-1";
                saveBtn.textContent = "Save";

                let cancelBtn = document.createElement('button');
                cancelBtn.className = "btn btn-secondary btn-sm cancel-btn";
                cancelBtn.textContent = "Cancel";

                btnGroup.appendChild(saveBtn);
                btnGroup.appendChild(cancelBtn);

                actionCell.appendChild(btnGroup);

                // Store original values
                row.dataset.originalTitle = exp.title;
                row.dataset.originalAmount = exp.amount;
                row.dataset.originalCategory = exp.category;

                // Convert cells to input/select
                let tCell = row.querySelector('.title-cell');
                let aCell = row.querySelector('.amount-cell');
                let cCell = row.querySelector('.category-cell');

                let tInput = document.createElement('input'); tInput.type = 'text'; tInput.value = exp.title; tCell.textContent = ''; tCell.appendChild(tInput);
                let aInput = document.createElement('input'); aInput.type = 'number'; aInput.min = 0; aInput.step = 0.01; aInput.value = exp.amount; aCell.textContent = ''; aCell.appendChild(aInput);
                let cSelect = document.createElement('select');
                ['Food', 'Bills', 'Transport', 'Entertainment', 'Others'].forEach(cat => {
                    let opt = document.createElement('option'); opt.value = cat; opt.text = cat; if (cat === exp.category) opt.selected = true; cSelect.appendChild(opt);
                });
                cCell.textContent = ''; cCell.appendChild(cSelect);
            }
        }

        // Save button
        if (e.target.classList.contains('save-btn')) {
            let tInput = row.querySelector('.title-cell input');
            let aInput = row.querySelector('.amount-cell input');
            let cSelect = row.querySelector('.category-cell select');

            let newTitle = tInput.value.trim();
            let newAmount = parseFloat(aInput.value);
            let newCategory = cSelect.value;

            if (!newTitle || isNaN(newAmount) || newAmount <= 0) { alert('Invalid input'); return; }

            let diff = newAmount - exp.amount;
            if (diff > budgetData.budgetLeft) { alert('Not enough budget'); return; }

            exp.title = newTitle;
            exp.amount = newAmount;
            exp.category = newCategory;
            budgetData.totalExpenses += diff;
            budgetData.budgetLeft -= diff;

            updateLocalStorage(); updateUI();
        }

        // Cancel button
        if (e.target.classList.contains('cancel-btn')) {
            // Restore original values
            exp.title = row.dataset.originalTitle;
            exp.amount = parseFloat(row.dataset.originalAmount);
            exp.category = row.dataset.originalCategory;

            updateUI();
        }
    });

    // Toggle Chart
    document.getElementById('toggleChartBtn').addEventListener('click', function () {
        let chartDiv = document.getElementById('chartContainer');
        if (chartDiv.style.display === 'none') { chartDiv.style.display = 'block'; this.textContent = "Hide Expense Breakdown"; }
        else { chartDiv.style.display = 'none'; this.textContent = "Expense Breakdown"; }
        updateUI();
    });
});

// PWA Service Worker
if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
        navigator.serviceWorker.register("service-worker.js")
            .then(() => console.log("PWA Ready ✅"))
            .catch(err => console.log("SW Error:", err));
    });
}