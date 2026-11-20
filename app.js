const STORAGE_KEY = "uchet-expenses";
const CATEGORY_ICONS = {
  "Еда": "🍲",
  "Транспорт": "🚕",
  "Дом": "🏠",
  "Расходы на кредит": "💳",
  "Другое": "✦",
};

const form = document.querySelector("#expense-form");
const dateInput = document.querySelector("#date");
const list = document.querySelector("#expense-list");
const monthlyTotal = document.querySelector("#monthly-total");
const template = document.querySelector("#expense-template");

let expenses = loadExpenses();
dateInput.value = toLocalDateString(new Date());
render();

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(form);
  const amount = Number(data.get("amount"));

  if (!Number.isFinite(amount) || amount <= 0) return;

  expenses.push({
    id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
    amount,
    category: data.get("category"),
    date: data.get("date"),
    comment: data.get("comment").trim(),
    createdAt: Date.now(),
  });

  saveExpenses();
  form.reset();
  dateInput.value = toLocalDateString(new Date());
  document.querySelector("#amount").focus();
  render();
});

list.addEventListener("click", (event) => {
  const button = event.target.closest(".delete-button");
  if (!button) return;
  expenses = expenses.filter((expense) => expense.id !== button.dataset.id);
  saveExpenses();
  render();
});

function render() {
  list.replaceChildren();
  const sortedExpenses = [...expenses].sort((left, right) => right.createdAt - left.createdAt);

  if (!sortedExpenses.length) {
    const emptyState = document.createElement("div");
    emptyState.className = "empty-state";
    emptyState.innerHTML = "<strong>Трат пока нет</strong>Добавьте первую запись с помощью формы выше.";
    list.append(emptyState);
  } else {
    sortedExpenses.forEach((expense) => list.append(createExpenseElement(expense)));
  }

  const now = new Date();
  const total = expenses
    .filter((expense) => {
      const [year, month] = expense.date.split("-").map(Number);
      return year === now.getFullYear() && month === now.getMonth() + 1;
    })
    .reduce((sum, expense) => sum + expense.amount, 0);

  monthlyTotal.textContent = formatMoney(total);
}

function createExpenseElement(expense) {
  const item = template.content.firstElementChild.cloneNode(true);
  item.querySelector(".category-icon").textContent = CATEGORY_ICONS[expense.category] ?? CATEGORY_ICONS["Другое"];
  item.querySelector(".expense-category").textContent = expense.category;
  item.querySelector(".expense-amount").textContent = `− ${formatMoney(expense.amount)}`;
  item.querySelector(".expense-date").textContent = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", year: "numeric" }).format(new Date(`${expense.date}T00:00:00`));
  item.querySelector(".expense-comment").textContent = expense.comment;
  item.querySelector(".delete-button").dataset.id = expense.id;
  return item;
}

function formatMoney(value) {
  return `${new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2 }).format(value)} ₸`;
}

function toLocalDateString(date) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function loadExpenses() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

function saveExpenses() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
}
