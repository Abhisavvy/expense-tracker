class App {
    constructor() {
        // Set default month to current month
        const currentDate = new Date();
        const currentMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;

        this.state = {
            expenses: [],
            budgets: [],
            categories: [], // Dynamic categories
            filters: {
                month: currentMonth, // Default to current month instead of 'all'
                category: 'all',
                person: 'all'
            },
            ui: {
                isLoading: false
            }
        };

        this.charts = {
            budgetVsActual: null,
            categoryPie: null
        };

        this.init();
    }

    async init() {
        this.setupEventListeners();
        // Dropdowns will be populated after data load
        await this.loadData();
    }

    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchTab(e.currentTarget.dataset.tab));
        });

        // Modals
        document.getElementById('add-expense-btn').addEventListener('click', () => this.openModal('expense-modal'));
        document.getElementById('add-budget-btn').addEventListener('click', () => this.openModal('budget-modal'));
        document.getElementById('add-category-btn').addEventListener('click', () => this.openModal('category-modal'));

        document.getElementById('close-expense-modal').addEventListener('click', () => this.closeModal('expense-modal'));
        document.getElementById('close-budget-modal').addEventListener('click', () => this.closeModal('budget-modal'));
        document.getElementById('close-category-modal').addEventListener('click', () => this.closeModal('category-modal'));

        // Confirmation Modal
        document.getElementById('confirm-cancel-btn').addEventListener('click', () => this.closeModal('confirm-modal'));

        // Forms
        document.getElementById('expense-form').addEventListener('submit', (e) => this.handleExpenseSubmit(e));
        document.getElementById('budget-form').addEventListener('submit', (e) => this.handleBudgetSubmit(e));
        document.getElementById('category-form').addEventListener('submit', (e) => this.handleCategorySubmit(e));

        // Filters
        document.getElementById('month-filter').addEventListener('change', (e) => this.updateFilter('month', e.target.value));
        document.getElementById('category-filter').addEventListener('change', (e) => this.updateFilter('category', e.target.value));
        document.getElementById('person-filter').addEventListener('change', (e) => this.updateFilter('person', e.target.value));

        // Sync
        document.getElementById('refresh-btn').addEventListener('click', () => this.loadData());
        document.getElementById('save-btn').addEventListener('click', () => this.saveData());
    }

    populateDropdowns() {
        // Categories from State
        const categorySelects = ['expense-category', 'budget-category', 'category-filter'];
        const categories = this.state.categories.length > 0 ? this.state.categories.map(c => c.name) : CONFIG.CATEGORIES;

        categorySelects.forEach(id => {
            const select = document.getElementById(id);
            const currentValue = select.value; // Preserve selection if possible

            if (id === 'category-filter') {
                select.innerHTML = '<option value="all">All Categories</option>';
            } else {
                select.innerHTML = '<option value="" disabled selected>Select Category</option>';
            }

            categories.forEach(cat => {
                const option = document.createElement('option');
                option.value = cat;
                option.textContent = cat;
                select.appendChild(option);
            });

            if (currentValue && categories.includes(currentValue)) {
                select.value = currentValue;
            }
        });

        // Months (Last 12 months + Next 1 month)
        const monthSelect = document.getElementById('month-filter');
        if (monthSelect.options.length <= 1) { // Only populate if empty (or just 'all')
            monthSelect.innerHTML = ''; // Clear to re-populate correctly
            const allOption = document.createElement('option');
            allOption.value = 'all';
            allOption.textContent = 'All Time';
            monthSelect.appendChild(allOption);

            const current = new Date();
            // Start from December 2025 or current month + 1, whichever is later
            let startYear = 2025;
            let startMonth = 11; // December (0-indexed)

            const currentYear = current.getFullYear();
            const currentMonth = current.getMonth();

            // Always calculate next month from current date
            const nextMonthDate = new Date(currentYear, currentMonth + 1, 1);

            if (nextMonthDate.getFullYear() > startYear || (nextMonthDate.getFullYear() === startYear && nextMonthDate.getMonth() > startMonth)) {
                // Use next month as the starting point for the dropdown
                startYear = nextMonthDate.getFullYear();
                startMonth = nextMonthDate.getMonth();
            }

            // End at November 2025
            const endYear = 2025;
            const endMonth = 10; // November (0-indexed)

            let d = new Date(startYear, startMonth, 1);
            const endDate = new Date(endYear, endMonth, 1);

            while (d >= endDate) {
                const year = d.getFullYear();
                const month = String(d.getMonth() + 1).padStart(2, '0');
                const value = `${year}-${month}`;

                const option = document.createElement('option');
                option.value = value;
                option.textContent = d.toLocaleString('default', { month: 'long', year: 'numeric' });
                if (value === this.state.filters.month) option.selected = true;
                monthSelect.appendChild(option);

                // Go to previous month
                d.setMonth(d.getMonth() - 1);
            }
        }
    }

    async loadData() {
        this.setLoading(true);
        try {
            const data = await api.fetchData();
            this.state.expenses = data.expenses;
            this.state.budgets = data.budgets;

            // Merge fetched categories with default ones if empty, or just use fetched
            if (data.categories && data.categories.length > 0) {
                this.state.categories = data.categories;
                // Update CONFIG colors dynamically
                data.categories.forEach(c => {
                    CONFIG.COLORS.CATEGORIES[c.name] = c.color;
                });
            } else {
                // Initialize with defaults if sheet is empty
                this.state.categories = CONFIG.CATEGORIES.map(name => ({
                    name,
                    color: CONFIG.COLORS.CATEGORIES[name] || '#808080'
                }));
                this.setLoading(true);
                try {
                    // Save defaults to Sheets so other users see them
                    await api.saveCategories(this.state.categories);
                    this.showNotification('Default categories initialized', 'success');
                } catch (error) {
                    console.error(error);
                    this.showNotification('Failed to save default categories', 'error');
                } finally {
                    this.setLoading(false);
                }
            }

            this.populateDropdowns();
            this.render();
            this.showNotification('Data synced successfully', 'success');
        } catch (error) {
            console.error(error);
            this.showNotification('Failed to load data: ' + error.message, 'error');
        } finally {
            this.setLoading(false);
        }
    }

    async handleCategorySubmit(e) {
        e.preventDefault();
        const name = document.getElementById('category-name').value.trim();
        const color = document.getElementById('category-color').value;

        if (!name) return;

        // Check if exists
        if (this.state.categories.some(c => c.name.toLowerCase() === name.toLowerCase())) {
            alert('Category already exists!');
            return;
        }

        const newCategory = { name, color };
        this.state.categories.push(newCategory);
        CONFIG.COLORS.CATEGORIES[name] = color; // Update local config for immediate rendering

        this.setLoading(true);
        try {
            await api.saveCategories(this.state.categories);
            this.populateDropdowns();
            this.render(); // Re-render to apply new colors if any
            this.closeModal('category-modal');
            document.getElementById('category-form').reset();
            this.showNotification('Category added and saved!', 'success');
        } catch (error) {
            console.error(error);
            this.showNotification('Failed to save category', 'error');
        } finally {
            this.setLoading(false);
        }
    }

    render() {
        const filteredExpenses = this.getFilteredExpenses();

        this.renderExpensesTable(filteredExpenses);
        this.renderBudgetsTable();
        this.renderSummary(filteredExpenses);
        this.renderCharts(filteredExpenses);
    }

    getFilteredExpenses() {
        return this.state.expenses.filter(e => {
            const matchMonth = this.state.filters.month === 'all' || e.date.startsWith(this.state.filters.month);
            const matchCategory = this.state.filters.category === 'all' || e.category === this.state.filters.category;
            const matchPerson = this.state.filters.person === 'all' || e.paid_by === this.state.filters.person;
            return matchMonth && matchCategory && matchPerson;
        }).sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    renderExpensesTable(expenses) {
        const tbody = document.querySelector('#expenses-table tbody');
        tbody.innerHTML = '';

        if (expenses.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center" style="padding: 20px; color: var(--text-light)">No expenses found for this period.</td></tr>';
            return;
        }

        // Sort expenses by date in descending order (latest first)
        const sortedExpenses = [...expenses].sort((a, b) => {
            return new Date(b.date) - new Date(a.date);
        });

        sortedExpenses.forEach(expense => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${expense.date}</td>
                <td><span class="badge badge-category" style="border-color: ${CONFIG.COLORS.CATEGORIES[expense.category] || '#808080'}">${expense.category}</span></td>
                <td>${expense.description || '-'}</td>
                <td class="text-right" style="font-weight: 600">₹${expense.amount.toFixed(2)}</td>
                <td><span class="badge badge-person ${expense.paid_by}">${expense.paid_by}</span></td>
                <td>
                    <button class="icon-btn small" onclick="app.editExpense('${expense.id}')">✎</button>
                    <button class="icon-btn small text-error" onclick="app.confirmDelete('expense', '${expense.id}')">🗑</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    renderBudgetsTable() {
        const fixedTbody = document.querySelector('#fixed-budgets-table tbody');
        const variableTbody = document.querySelector('#variable-budgets-table tbody');

        fixedTbody.innerHTML = '';
        variableTbody.innerHTML = '';

        // Calculate spent per category for the current month
        const filteredExpenses = this.getFilteredExpenses();
        const spentByCategory = filteredExpenses.reduce((acc, curr) => {
            acc[curr.category] = (acc[curr.category] || 0) + curr.amount;
            return acc;
        }, {});

        this.state.budgets.forEach(budget => {
            // Apply category filter
            if (this.state.filters.category !== 'all' && budget.category !== this.state.filters.category) return;

            const spent = spentByCategory[budget.category] || 0;
            const remaining = budget.amount - spent;
            const percentage = (spent / budget.amount) * 100;

            let rowClass = '';
            if (percentage >= 100) rowClass = 'budget-over';
            else if (percentage >= 75) rowClass = 'budget-warning';

            const tr = document.createElement('tr');
            if (rowClass) tr.className = rowClass;

            tr.innerHTML = `
                <td style="font-weight: 500">${budget.name}</td>
                <td style="font-weight: 600">₹${budget.amount}</td>
                <td>₹${spent.toFixed(2)}</td>
                <td class="${remaining < 0 ? 'text-error' : 'text-success'}" style="font-weight: 600">
                    ${remaining < 0 ? '-' : ''}₹${Math.abs(remaining).toFixed(2)}
                </td>
                <td><span class="badge badge-category" style="color: ${CONFIG.COLORS.CATEGORIES[budget.category] || '#808080'}">${budget.category}</span></td>
                <td><span class="badge" style="background: #333; color: white;">${budget.type}</span></td>
                <td>
                    <button class="icon-btn small" onclick="app.editBudget('${budget.id}')">✎</button>
                    <button class="icon-btn small text-error" onclick="app.confirmDelete('budget', '${budget.id}')">🗑</button>
                </td>
            `;

            if (budget.type === 'fixed') {
                fixedTbody.appendChild(tr);
            } else {
                variableTbody.appendChild(tr);
            }
        });
    }

    renderSummary(expenses) {
        // Budget Summaries
        const fixedBudgets = this.state.budgets.filter(b => b.type === 'fixed');
        const variableBudgets = this.state.budgets.filter(b => b.type === 'variable');

        // Apply category filter to budget sums
        const filterCat = this.state.filters.category;
        const filteredFixed = filterCat === 'all' ? fixedBudgets : fixedBudgets.filter(b => b.category === filterCat);
        const filteredVariable = filterCat === 'all' ? variableBudgets : variableBudgets.filter(b => b.category === filterCat);

        const fixedTotal = filteredFixed.reduce((sum, b) => sum + b.amount, 0);
        const variableTotal = filteredVariable.reduce((sum, b) => sum + b.amount, 0);
        const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);

        document.getElementById('fixed-total').textContent = `₹${fixedTotal.toLocaleString()}`;
        document.getElementById('variable-total').textContent = `₹${variableTotal.toLocaleString()}`;
        document.getElementById('total-spent').textContent = `₹${totalSpent.toLocaleString()}`;

        const totalSaving = (fixedTotal + variableTotal) - totalSpent;
        document.getElementById('total-saving').textContent = `₹${totalSaving.toLocaleString()}`;

        // Top 5 Transactions
        const topList = document.getElementById('top-transactions-list');
        topList.innerHTML = '';
        // Sort by amount desc
        const topExpenses = [...expenses].sort((a, b) => b.amount - a.amount).slice(0, 5);

        topExpenses.forEach((e, index) => {
            const li = document.createElement('li');
            li.innerHTML = `
                <div class="trans-left">
                    <span class="trans-rank">${index + 1}</span>
                    <div class="trans-details">
                        <div class="trans-title">
                            <span class="badge badge-category" style="color: ${CONFIG.COLORS.CATEGORIES[e.category] || '#808080'}">${e.category}</span>
                            ${e.description || 'Expense'}
                        </div>
                        <div class="trans-meta">
                            ${e.date} • <span class="badge badge-person ${e.paid_by}">${e.paid_by}</span>
                        </div>
                    </div>
                </div>
                <div class="trans-amount">₹${e.amount.toLocaleString()}</div>
            `;
            topList.appendChild(li);
        });

        // Category Breakdown Table
        const breakdownBody = document.querySelector('#category-breakdown-table tbody');
        breakdownBody.innerHTML = '';

        const categoryStats = {};
        let totalStatsSpent = 0;
        expenses.forEach(e => {
            categoryStats[e.category] = (categoryStats[e.category] || 0) + e.amount;
            totalStatsSpent += e.amount;
        });

        const sortedCategories = Object.entries(categoryStats)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5);

        sortedCategories.forEach(([cat, amount]) => {
            const percent = totalStatsSpent > 0 ? ((amount / totalStatsSpent) * 100).toFixed(1) : 0;
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><span class="badge badge-category" style="color: ${CONFIG.COLORS.CATEGORIES[cat] || '#808080'}">
                    ${cat}
                </span></td>
                <td class="text-right">₹${amount.toLocaleString()}</td>
                <td class="text-right">${percent}%</td>
            `;
            breakdownBody.appendChild(tr);
        });
    }

    getSpentBarColor(spent, budget) {
        if (budget === 0) return CONFIG.COLORS.SPENT_BAR_GRADIENT['110+'];
        const percentage = (spent / budget) * 100;

        if (percentage <= 60) return CONFIG.COLORS.SPENT_BAR_GRADIENT['0-60'];
        if (percentage <= 75) return CONFIG.COLORS.SPENT_BAR_GRADIENT['60-75'];
        if (percentage <= 90) return CONFIG.COLORS.SPENT_BAR_GRADIENT['75-90'];
        if (percentage <= 100) return CONFIG.COLORS.SPENT_BAR_GRADIENT['90-100'];
        if (percentage <= 110) return CONFIG.COLORS.SPENT_BAR_GRADIENT['100-110'];
        return CONFIG.COLORS.SPENT_BAR_GRADIENT['110+'];
    }

    renderCharts(expenses) {
        // Prepare Data
        const categories = {};
        expenses.forEach(e => {
            categories[e.category] = (categories[e.category] || 0) + e.amount;
        });

        // Pie Chart
        const pieCtx = document.getElementById('category-pie-chart').getContext('2d');
        if (this.charts.categoryPie) this.charts.categoryPie.destroy();

        const hasData = Object.keys(categories).length > 0;
        const pieData = hasData ? Object.values(categories) : [1];
        const pieLabels = hasData ? Object.keys(categories) : ['No Data'];
        const pieColors = hasData ? Object.keys(categories).map(c => CONFIG.COLORS.CATEGORIES[c] || '#ccc') : ['#333'];

        this.charts.categoryPie = new Chart(pieCtx, {
            type: 'doughnut',
            data: {
                labels: pieLabels,
                datasets: [{
                    data: pieData,
                    backgroundColor: pieColors,
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: { color: '#ffffff', boxWidth: 12, font: { size: 11 } }
                    }
                }
            }
        });

        // Budget vs Actual Chart (Horizontal Bar)
        const budgetCtx = document.getElementById('budget-vs-actual-chart').getContext('2d');
        if (this.charts.budgetVsActual) this.charts.budgetVsActual.destroy();

        // Aggregate budgets by category
        const budgetByCategory = {};
        this.state.budgets.forEach(b => {
            if (this.state.filters.category === 'all' || b.category === this.state.filters.category) {
                budgetByCategory[b.category] = (budgetByCategory[b.category] || 0) + b.amount;
            }
        });

        // Get all unique categories from both budgets and expenses
        const allCats = new Set([...Object.keys(budgetByCategory), ...Object.keys(categories)]);
        const labels = Array.from(allCats).sort((a, b) => (budgetByCategory[b] || 0) - (budgetByCategory[a] || 0)); // Sort by budget size

        const budgetData = labels.map(c => budgetByCategory[c] || 0);
        const actualData = labels.map(c => categories[c] || 0);
        const spentColors = labels.map(c => this.getSpentBarColor(categories[c] || 0, budgetByCategory[c] || 0));

        this.charts.budgetVsActual = new Chart(budgetCtx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Budget',
                        data: budgetData,
                        backgroundColor: '#2196F3',
                        borderRadius: 4,
                        barPercentage: 0.7,
                        categoryPercentage: 0.8
                    },
                    {
                        label: 'Spent',
                        data: actualData,
                        backgroundColor: spentColors,
                        borderRadius: 4,
                        barPercentage: 0.7,
                        categoryPercentage: 0.8
                    }
                ]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        beginAtZero: true,
                        grid: { color: 'rgba(255, 255, 255, 0.1)' },
                        ticks: { color: '#ffffff' }
                    },
                    y: {
                        grid: { display: false },
                        ticks: { color: '#ffffff', autoSkip: false }
                    }
                },
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            color: '#ffffff',
                            usePointStyle: true,
                            boxWidth: 8,
                            generateLabels: (chart) => {
                                const original = Chart.defaults.plugins.legend.labels.generateLabels(chart);
                                return original.map(label => {
                                    if (label.text === 'Spent') {
                                        label.fillStyle = '#FFA726'; // Solid orange for legend
                                        label.strokeStyle = '#FFA726';
                                    }
                                    return label;
                                });
                            }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                if (context.parsed.x !== null) {
                                    label += new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(context.parsed.x);
                                }
                                return label;
                            }
                        }
                    }
                }
            }
        });
    }

    async handleExpenseSubmit(e) {
        e.preventDefault();
        const id = document.getElementById('expense-id').value;
        const date = document.getElementById('expense-date').value;
        const amount = parseFloat(document.getElementById('expense-amount').value);
        const category = document.getElementById('expense-category').value;
        const description = document.getElementById('expense-desc').value;
        const paid_by = document.getElementById('expense-paid-by').value;

        if (!date || !amount || !category) {
            this.showNotification('Please fill in all required fields', 'error');
            return;
        }

        // Persist date
        localStorage.setItem('lastExpenseDate', date);

        const expense = {
            id: id || `expense_${Date.now()}`,
            date: date,
            category: category,
            description: description,
            amount: amount,
            paid_by: paid_by
        };

        // Optimistic update
        if (id) {
            const index = this.state.expenses.findIndex(e => e.id === id);
            if (index !== -1) this.state.expenses[index] = expense;
        } else {
            this.state.expenses.push(expense);
        }

        this.setLoading(true);
        try {
            await api.saveData(this.state.budgets, this.state.expenses);
            this.closeModal('expense-modal');
            this.render();
            this.showNotification('Expense saved successfully', 'success');

            if (!id) {
                document.getElementById('expense-form').reset();
                document.getElementById('expense-date').value = date; // Keep date
            }
        } catch (error) {
            console.error('Failed to save expense:', error);
            this.showNotification('Failed to save expense: ' + error.message, 'error');
            // Revert optimistic update if needed (complex for edits, simple for add)
            if (!id) this.state.expenses.pop();
            this.render();
        } finally {
            this.setLoading(false);
        }
    }

    async handleBudgetSubmit(e) {
        e.preventDefault();
        const id = document.getElementById('budget-id').value;
        const name = document.getElementById('budget-name').value;
        const amount = parseFloat(document.getElementById('budget-amount').value);
        const type = document.getElementById('budget-type').value;
        const category = document.getElementById('budget-category').value;

        if (!name || !amount || !category) {
            this.showNotification('Please fill in all required fields', 'error');
            return;
        }

        const budget = {
            id: id || `budget_${Date.now()}`,
            name: name,
            amount: amount,
            type: type,
            category: category
        };

        // Optimistic update
        if (id) {
            const index = this.state.budgets.findIndex(b => b.id === id);
            if (index !== -1) this.state.budgets[index] = budget;
        } else {
            this.state.budgets.push(budget);
        }

        this.setLoading(true);
        try {
            await api.saveData(this.state.budgets, this.state.expenses);
            this.closeModal('budget-modal');
            this.render();
            this.showNotification('Budget saved successfully', 'success');

            if (!id) {
                document.getElementById('budget-form').reset();
            }
        } catch (error) {
            console.error('Failed to save budget:', error);
            this.showNotification('Failed to save budget: ' + error.message, 'error');
            // Revert optimistic update
            if (!id) this.state.budgets.pop();
            this.render();
        } finally {
            this.setLoading(false);
        }
    }

    editExpense(id) {
        const expense = this.state.expenses.find(e => e.id === id);
        if (!expense) return;

        document.getElementById('expense-id').value = expense.id;
        document.getElementById('expense-date').value = expense.date;
        document.getElementById('expense-category').value = expense.category;
        document.getElementById('expense-desc').value = expense.description;
        document.getElementById('expense-amount').value = expense.amount;
        document.getElementById('expense-paid-by').value = expense.paid_by;

        document.getElementById('expense-modal-title').textContent = 'Edit Expense';
        this.openModal('expense-modal');
    }

    confirmDelete(type, id) {
        const modal = document.getElementById('confirm-modal');
        const msg = document.getElementById('confirm-message');
        const deleteBtn = document.getElementById('confirm-delete-btn');

        msg.textContent = `Are you sure you want to delete this ${type}?`;

        // Remove old listener to prevent multiple firings by cloning
        const newBtn = deleteBtn.cloneNode(true);
        deleteBtn.parentNode.replaceChild(newBtn, deleteBtn);

        newBtn.addEventListener('click', () => {
            if (type === 'expense') this.deleteExpense(id);
            if (type === 'budget') this.deleteBudget(id);
            this.closeModal('confirm-modal');
        });

        this.openModal('confirm-modal');
    }

    async deleteExpense(id) {
        const originalExpenses = [...this.state.expenses];
        this.state.expenses = this.state.expenses.filter(e => e.id !== id);
        this.render();

        this.setLoading(true);
        try {
            await api.saveData(this.state.budgets, this.state.expenses);
            this.showNotification('Expense deleted successfully', 'success');
        } catch (error) {
            console.error('Failed to delete expense:', error);
            this.state.expenses = originalExpenses; // Revert
            this.render();
            this.showNotification('Failed to delete expense', 'error');
        } finally {
            this.setLoading(false);
        }
    }

    editBudget(id) {
        const budget = this.state.budgets.find(b => b.id === id);
        if (!budget) return;

        document.getElementById('budget-id').value = budget.id;
        document.getElementById('budget-name').value = budget.name;
        document.getElementById('budget-amount').value = budget.amount;
        document.getElementById('budget-type').value = budget.type;
        document.getElementById('budget-category').value = budget.category;

        document.getElementById('budget-modal-title').textContent = 'Edit Budget';
        this.openModal('budget-modal');
    }

    async deleteBudget(id) {
        const originalBudgets = [...this.state.budgets];
        this.state.budgets = this.state.budgets.filter(b => b.id !== id);
        this.render();

        this.setLoading(true);
        try {
            await api.saveData(this.state.budgets, this.state.expenses);
            this.showNotification('Budget deleted successfully', 'success');
        } catch (error) {
            console.error('Failed to delete budget:', error);
            this.state.budgets = originalBudgets; // Revert
            this.render();
            this.showNotification('Failed to delete budget', 'error');
        } finally {
            this.setLoading(false);
        }
    }

    switchTab(tabId) {
        document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
        document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active'));

        document.getElementById(tabId).classList.add('active');
        document.querySelector(`[data-tab="${tabId}"]`).classList.add('active');
    }

    openModal(modalId) {
        document.getElementById(modalId).classList.add('active');
        if (modalId === 'expense-modal' && !document.getElementById('expense-id').value) {
            // Load persisted date or default to today
            const lastDate = localStorage.getItem('lastExpenseDate');
            if (lastDate) {
                document.getElementById('expense-date').value = lastDate;
            } else {
                document.getElementById('expense-date').valueAsDate = new Date();
            }

            document.getElementById('expense-modal-title').textContent = 'Add Expense';
            document.getElementById('expense-form').reset();
            // Re-set date after reset
            if (lastDate) {
                document.getElementById('expense-date').value = lastDate;
            } else {
                document.getElementById('expense-date').valueAsDate = new Date();
            }
            document.getElementById('expense-id').value = '';
        }
        if (modalId === 'budget-modal' && !document.getElementById('budget-id').value) {
            document.getElementById('budget-modal-title').textContent = 'Add Budget';
            document.getElementById('budget-form').reset();
            document.getElementById('budget-id').value = '';
        }
    }

    closeModal(modalId) {
        document.getElementById(modalId).classList.remove('active');
        // Reset form hidden ids
        if (modalId === 'expense-modal') document.getElementById('expense-id').value = '';
        if (modalId === 'budget-modal') document.getElementById('budget-id').value = '';
    }

    updateFilter(type, value) {
        this.state.filters[type] = value;
        this.render();
    }

    setLoading(isLoading) {
        this.state.ui.isLoading = isLoading;
        const btn = document.getElementById('refresh-btn');
        if (isLoading) {
            btn.classList.add('spinning');
            btn.disabled = true;
        } else {
            btn.classList.remove('spinning');
            btn.disabled = false;
        }
    }

    showNotification(message, type = 'info') {
        const el = document.getElementById('notification');
        el.textContent = message;
        el.className = `notification ${type}`;
        setTimeout(() => el.classList.add('hidden'), 3000);
    }
}



// Initialize App
const app = new App();
window.app = app;
