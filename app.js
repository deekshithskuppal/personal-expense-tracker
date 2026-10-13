
const form = document.getElementById("expense-form");
const amountInput = document.getElementById("amount");
const categoryInput = document.getElementById("category");
const descriptionInput = document.getElementById("description");
const totalElement = document.getElementById("total");
const expenseList = document.getElementById("expense-list");

// Load saved expenses from this browser
let expenses = JSON.parse(localStorage.getItem("expenses") || "[]");

function displayExpenses() {
    expenseList.replaceChildren();

    const total = expenses.reduce(
        (sum, expense) => sum + expense.amount, 0
    );

    totalElement.textContent = `₹${total.toFixed(2)}`;

    expenses.forEach((expense) => {
        const item = document.createElement("li");
        item.textContent =
            `${expense.category} - ₹${expense.amount.toFixed(2)} - ${expense.description}`;
        expenseList.appendChild(item);
    });
}

form.addEventListener("submit", function(event) {
    event.preventDefault();

    const amount = Number(amountInput.value);
    const category = categoryInput.value;
    const description = descriptionInput.value.trim();

    if (!Number.isFinite(amount) || amount <= 0 ||
        !category || !description) {
        alert("Please enter valid expense details.");
        return;
    }

    expenses.push({
        amount: amount,
        category: category,
        description: description,
        date: new Date().toISOString().slice(0, 10)
    });

    localStorage.setItem("expenses", JSON.stringify(expenses));

    displayExpenses();
    form.reset();
});

displayExpenses();
