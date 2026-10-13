
const form = document.getElementById("expense-form");
const amountInput = document.getElementById("amount");
const categoryInput = document.getElementById("category");
const descriptionInput = document.getElementById("description");
const dateInput = document.getElementById("date");
const totalElement = document.getElementById("total");
const countElement = document.getElementById("count");
const averageElement = document.getElementById("average");
const expenseList = document.getElementById("expense-list");
const searchInput = document.getElementById("search");
const filterInput = document.getElementById("filter-category");
const emptyMessage = document.getElementById("empty-message");
const message = document.getElementById("message");

const money = amount => "₹" + amount.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
});

function todayString() {
    const now = new Date();
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
}

dateInput.value = todayString();

let expenses = [];

try {
    const saved = JSON.parse(localStorage.getItem("expenses") || "[]");
    if (Array.isArray(saved)) {
        expenses = saved.filter(item =>
            item &&
            Number.isFinite(Number(item.amount)) &&
            Number(item.amount) > 0 &&
            typeof item.category === "string" &&
            typeof item.description === "string"
        ).map(item => ({
            ...item,
            amount: Number(item.amount),
            date: typeof item.date === "string" ? item.date : todayString()
        }));
    }
} catch {
    expenses = [];
}

let pieChart = null;
let monthlyChart = null;

const chartColors = [
    "#0f766e", "#8b5cf6", "#f59e0b", "#2563eb",
    "#ec4899", "#14b8a6", "#f97316", "#64748b"
];

function saveExpenses() {
    try {
        localStorage.setItem("expenses", JSON.stringify(expenses));
        return true;
    } catch {
        message.textContent = "Unable to save. Browser storage may be full.";
        return false;
    }
}

function renderDashboard() {
    const total = expenses.reduce((sum, item) => sum + item.amount, 0);

    totalElement.textContent = money(total);
    countElement.textContent = expenses.length;
    averageElement.textContent = money(
        expenses.length ? total / expenses.length : 0
    );

    renderTable();
    renderCharts();
}

function renderTable() {
    expenseList.replaceChildren();

    const query = searchInput.value.trim().toLowerCase();
    const category = filterInput.value;

    const filtered = expenses
        .map((expense, index) => ({ ...expense, index }))
        .filter(expense =>
            (!category || expense.category === category) &&
            `${expense.category} ${expense.description} ${expense.date}`
                .toLowerCase().includes(query)
        )
        .sort((a, b) => b.date.localeCompare(a.date));

    emptyMessage.hidden = filtered.length > 0;

    filtered.forEach(expense => {
        const row = document.createElement("tr");

        [
            expense.date,
            expense.category,
            expense.description,
            money(expense.amount)
        ].forEach(value => {
            const cell = document.createElement("td");
            cell.textContent = value;
            row.appendChild(cell);
        });

        const actionCell = document.createElement("td");
        const deleteButton = document.createElement("button");

        deleteButton.textContent = "Delete";
        deleteButton.className = "delete-btn";
        deleteButton.setAttribute("aria-label", "Delete expense");

        deleteButton.addEventListener("click", () => {
            if (!confirm("Delete this expense?")) return;

            const removed = expenses.splice(expense.index, 1);
            if (!saveExpenses()) {
                expenses.splice(expense.index, 0, ...removed);
                return;
            }

            message.textContent = "Expense deleted.";
            renderDashboard();
        });

        actionCell.appendChild(deleteButton);
        row.appendChild(actionCell);
        expenseList.appendChild(row);
    });
}

function renderCharts() {
    const categoryTotals = {};

    expenses.forEach(expense => {
        categoryTotals[expense.category] =
            (categoryTotals[expense.category] || 0) + expense.amount;
    });

    const categories = Object.keys(categoryTotals);

    if (pieChart) pieChart.destroy();

    pieChart = new Chart(document.getElementById("pieChart"), {
        type: "doughnut",
        data: {
            labels: categories.length ? categories : ["No expenses yet"],
            datasets: [{
                data: categories.length
                    ? categories.map(category => categoryTotals[category])
                    : [1],
                backgroundColor: categories.length
                    ? categories.map((_, i) => chartColors[i % chartColors.length])
                    : ["#e5e7eb"],
                borderWidth: 2,
                borderColor: "#ffffff"
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: "bottom" },
                tooltip: {
                    callbacks: {
                        label: context => categories.length
                            ? `${context.label}: ${money(context.raw)}`
                            : "Add expenses to see your chart"
                    }
                }
            },
            cutout: "58%"
        }
    });

    const now = new Date();
    const months = [];

    for (let i = 5; i >= 0; i--) {
        const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${monthDate.getFullYear()}-${String(
            monthDate.getMonth() + 1
        ).padStart(2, "0")}`;

        months.push({
            key,
            label: monthDate.toLocaleDateString("en-IN", {
                month: "short",
                year: "2-digit"
            }),
            total: 0
        });
    }

    expenses.forEach(expense => {
        const month = months.find(item => item.key === expense.date.slice(0, 7));
        if (month) month.total += expense.amount;
    });

    if (monthlyChart) monthlyChart.destroy();

    monthlyChart = new Chart(document.getElementById("monthlyChart"), {
        type: "bar",
        data: {
            labels: months.map(month => month.label),
            datasets: [{
                label: "Spending (₹)",
                data: months.map(month => month.total),
                backgroundColor: "#0f766e",
                borderRadius: 7,
                maxBarThickness: 48
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: value => "₹" + value
                    }
                }
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: context => money(context.raw)
                    }
                }
            }
        }
    });
}

form.addEventListener("submit", event => {
    event.preventDefault();

    const amount = Number(amountInput.value);
    const category = categoryInput.value;
    const description = descriptionInput.value.trim();
    const date = dateInput.value;

    if (!Number.isFinite(amount) || amount <= 0 ||
        !category || !description || !date) {
        message.textContent = "Please enter valid expense details.";
        return;
    }

    const expense = { amount, category, description, date };
    expenses.push(expense);

    if (!saveExpenses()) {
        expenses.pop();
        return;
    }

    message.textContent = "Expense added successfully!";
    form.reset();
    dateInput.value = todayString();
    renderDashboard();
});

searchInput.addEventListener("input", renderTable);
filterInput.addEventListener("change", renderTable);

document.getElementById("export-btn").addEventListener("click", () => {
    const headers = ["date", "amount", "category", "description"];

    const escapeCSV = value =>
        '"' + String(value).replace(/"/g, '""') + '"';

    const lines = [
        headers.join(","),
        ...expenses.map(expense =>
            headers.map(header => escapeCSV(expense[header])).join(",")
        )
    ];

    const blob = new Blob(["\uFEFF" + lines.join("\r\n")], {
        type: "text/csv;charset=utf-8;"
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "expenses.csv";
    link.click();
    URL.revokeObjectURL(url);
});

renderDashboard();
