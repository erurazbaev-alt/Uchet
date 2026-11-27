const STORAGE_KEY = "uchet-expenses";
const HABITS_STORAGE_KEY = "uchet-habits";
const CATEGORY_ICONS = {
  "Еда": "🍲",
  "Транспорт": "🚕",
  "Дом": "🏠",
  "Другое": "✦",
};

const form = document.querySelector("#expense-form");
const dateInput = document.querySelector("#date");
const list = document.querySelector("#expense-list");
const monthlyTotal = document.querySelector("#monthly-total");
const selectedTotal = document.querySelector("#selected-total");
const template = document.querySelector("#expense-template");
const amountInput = document.querySelector("#amount");
const amountError = document.querySelector("#amount-error");
const periodFilter = document.querySelector(".period-filter");
const categoryTotalElements = document.querySelectorAll("[data-category-total]");
const categorySelect = document.querySelector("#category");
const customCategoryInput = document.querySelector("#custom-category");
const toggleCategoryButton = document.querySelector("#toggle-category");
const categoryError = document.querySelector("#category-error");
const customPeriod = document.querySelector("#custom-period");
const periodFromInput = document.querySelector("#period-from");
const periodToInput = document.querySelector("#period-to");
const periodError = document.querySelector("#period-error");
const downloadExcelButton = document.querySelector("#download-excel");
const savePdfButton = document.querySelector("#save-pdf");
const reportMessage = document.querySelector("#report-message");
const entryTypeSelect = document.querySelector("#entry-type");
const categoryField = document.querySelector("#category-field");
const monthlyReportMonthInput = document.querySelector("#monthly-report-month");
const monthlyReportTotal = document.querySelector("#monthly-report-total");
const monthlyReportCategories = document.querySelector("#monthly-report-categories");
const monthlyReportComparison = document.querySelector("#monthly-report-comparison");
const copyMonthlyReportButton = document.querySelector("#copy-monthly-report");
const monthlyReportMessage = document.querySelector("#monthly-report-message");
const habitForm = document.querySelector("#habit-form");
const habitNameInput = document.querySelector("#habit-name");
const habitGoalInput = document.querySelector("#habit-goal");
const habitNameError = document.querySelector("#habit-name-error");
const habitGoalError = document.querySelector("#habit-goal-error");
const habitList = document.querySelector("#habit-list");
const habitTemplate = document.querySelector("#habit-template");

let expenses = loadExpenses();
let habits = loadHabits();
let selectedPeriod = "all";
let isCustomCategory = false;
let isCustomPeriodValid = false;
monthlyReportMonthInput.value = toLocalDateString(new Date()).slice(0, 7);
setCustomCategoryMode(false);
setEntryTypeMode("expense");
dateInput.value = toLocalDateString(new Date());
render();
renderHabits();

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(form);
  const rawAmount = String(data.get("amount")).trim();
  const amount = Number(rawAmount);
  const isDebt = data.get("entryType") === "debt";
  const category = isDebt
    ? "Выбытие (дал в долг)"
    : isCustomCategory
      ? customCategoryInput.value.trim()
      : String(data.get("category"));

  if (rawAmount === "" || !Number.isSafeInteger(amount) || amount <= 0) {
    showAmountError("Введите целую сумму больше нуля");
    amountInput.focus();
    return;
  }

  if (!isDebt && isCustomCategory && category === "") {
    showCategoryError("Введите название категории");
    customCategoryInput.focus();
    return;
  }

  showAmountError("");
  showCategoryError("");

  expenses.push({
    id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
    amount,
    category,
    categoryGroup: isDebt || isCustomCategory ? "Другое" : category,
    entryType: isDebt ? "debt" : "expense",
    date: data.get("date"),
    comment: data.get("comment").trim(),
    createdAt: Date.now(),
  });

  saveExpenses();
  form.reset();
  setCustomCategoryMode(false);
  setEntryTypeMode("expense");
  dateInput.value = toLocalDateString(new Date());
  amountInput.focus();
  render();
});

amountInput.addEventListener("input", () => showAmountError(""));
amountInput.addEventListener("invalid", (event) => {
  event.preventDefault();
  showAmountError("Введите целую сумму больше нуля");
  amountInput.focus();
});

toggleCategoryButton.addEventListener("click", () => {
  setCustomCategoryMode(!isCustomCategory);
  if (isCustomCategory) customCategoryInput.focus();
});

customCategoryInput.addEventListener("input", () => showCategoryError(""));

entryTypeSelect.addEventListener("change", () => {
  setEntryTypeMode(entryTypeSelect.value);
});

periodFilter.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-period]");
  if (!button) return;
  selectedPeriod = button.dataset.period;
  periodFilter.querySelectorAll("button[data-period]").forEach((item) => {
    const isActive = item === button;
    item.classList.toggle("is-active", isActive);
    item.setAttribute("aria-pressed", String(isActive));
  });
  customPeriod.hidden = selectedPeriod !== "custom";
  if (selectedPeriod === "custom") {
    validateCustomPeriod();
    periodFromInput.focus();
  } else {
    showPeriodError("");
  }
  render();
});

[periodFromInput, periodToInput].forEach((input) => {
  input.addEventListener("change", () => {
    validateCustomPeriod();
    render();
  });
});

list.addEventListener("click", (event) => {
  const button = event.target.closest(".delete-button");
  if (!button) return;
  expenses = expenses.filter((expense) => expense.id !== button.dataset.id);
  saveExpenses();
  render();
});

downloadExcelButton.addEventListener("click", downloadExcelReport);
savePdfButton.addEventListener("click", openPrintableReport);
copyMonthlyReportButton.addEventListener("click", copyMonthlyReport);
monthlyReportMonthInput.addEventListener("change", () => renderMonthlyReport(getSelectedReportMonth()));

habitForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const name = habitNameInput.value.trim();
  const goal = Number(habitGoalInput.value);

  if (name === "") {
    showHabitNameError("Введите название привычки");
    habitNameInput.focus();
    return;
  }

  if (!Number.isInteger(goal) || goal < 1 || goal > 7) {
    showHabitGoalError("Введите цель от 1 до 7");
    habitGoalInput.focus();
    return;
  }

  showHabitNameError("");
  showHabitGoalError("");
  habits.push({
    id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
    name,
    goal,
    markedDates: [],
  });
  saveHabits();
  habitForm.reset();
  habitNameInput.focus();
  renderHabits();
});

habitNameInput.addEventListener("input", () => showHabitNameError(""));
habitGoalInput.addEventListener("input", () => showHabitGoalError(""));
habitNameInput.addEventListener("invalid", (event) => {
  event.preventDefault();
  showHabitNameError("Введите название привычки");
});
habitGoalInput.addEventListener("invalid", (event) => {
  event.preventDefault();
  showHabitGoalError("Введите цель от 1 до 7");
});

habitList.addEventListener("click", (event) => {
  const markButton = event.target.closest(".habit-mark-button");
  const deleteButton = event.target.closest(".habit-delete-button");

  if (markButton) {
    toggleHabitMark(markButton.dataset.id);
  } else if (deleteButton) {
    habits = habits.filter((habit) => habit.id !== deleteButton.dataset.id);
    saveHabits();
    renderHabits();
  }
});

function render() {
  list.replaceChildren();
  showReportMessage("");
  const sortedExpenses = getVisibleExpenses();

  const visibleTotal = sortedExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  selectedTotal.textContent = formatMoney(visibleTotal);

  if (!sortedExpenses.length) {
    const emptyState = document.createElement("div");
    emptyState.className = "empty-state";
    emptyState.innerHTML = expenses.length
      ? "<strong>За этот период трат нет</strong>Выберите другой период."
      : "<strong>Трат пока нет</strong>Добавьте первую запись с помощью формы выше.";
    list.append(emptyState);
  } else {
    sortedExpenses.forEach((expense) => list.append(createExpenseElement(expense)));
  }

  const now = new Date();
  const currentMonthExpenses = expenses.filter((expense) => {
      const [year, month] = expense.date.split("-").map(Number);
      return year === now.getFullYear() && month === now.getMonth() + 1;
    });
  const total = currentMonthExpenses.reduce((sum, expense) => sum + expense.amount, 0);

  monthlyTotal.textContent = formatMoney(total);

  categoryTotalElements.forEach((element) => {
    const category = element.dataset.categoryTotal;
    const categoryTotal = currentMonthExpenses
      .filter((expense) => getCategoryGroup(expense) === category)
      .reduce((sum, expense) => sum + expense.amount, 0);
    element.textContent = formatMoney(categoryTotal);
  });

  renderMonthlyReport(getSelectedReportMonth());
}

function renderHabits() {
  habitList.replaceChildren();

  if (!habits.length) {
    const emptyState = document.createElement("div");
    emptyState.className = "habit-empty";
    emptyState.textContent = "Привычек пока нет. Добавьте первую цель на неделю.";
    habitList.append(emptyState);
    return;
  }

  const today = toLocalDateString(new Date());
  const [weekStart, weekEnd] = getCurrentWeekRange();
  habits.forEach((habit) => {
    const item = habitTemplate.content.firstElementChild.cloneNode(true);
    const weeklyMarks = habit.markedDates.filter((date) => date >= weekStart && date <= weekEnd).length;
    const isMarkedToday = habit.markedDates.includes(today);
    const isComplete = weeklyMarks >= habit.goal;
    const status = item.querySelector(".habit-status");
    const markButton = item.querySelector(".habit-mark-button");

    item.querySelector(".habit-name").textContent = habit.name;
    item.querySelector(".habit-progress").textContent = `${weeklyMarks} из ${habit.goal}`;
    status.textContent = isComplete ? "Цель выполнена" : "Цель ещё не выполнена";
    status.classList.toggle("is-complete", isComplete);
    markButton.textContent = isMarkedToday ? "Отменить сегодня" : "Отметить";
    markButton.classList.toggle("is-marked", isMarkedToday);
    markButton.dataset.id = habit.id;
    markButton.setAttribute("aria-pressed", String(isMarkedToday));
    item.querySelector(".habit-delete-button").dataset.id = habit.id;
    habitList.append(item);
  });
}

function toggleHabitMark(id) {
  const habit = habits.find((item) => item.id === id);
  if (!habit) return;

  const today = toLocalDateString(new Date());
  if (habit.markedDates.includes(today)) {
    habit.markedDates = habit.markedDates.filter((date) => date !== today);
  } else {
    habit.markedDates.push(today);
  }
  saveHabits();
  renderHabits();
}

function getCurrentWeekRange() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dayFromMonday = (today.getDay() + 6) % 7;
  const monday = new Date(today);
  monday.setDate(today.getDate() - dayFromMonday);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return [toLocalDateString(monday), toLocalDateString(sunday)];
}

function showHabitNameError(message) {
  habitNameError.textContent = message;
  habitNameInput.setAttribute("aria-invalid", String(Boolean(message)));
}

function showHabitGoalError(message) {
  habitGoalError.textContent = message;
  habitGoalInput.setAttribute("aria-invalid", String(Boolean(message)));
}

function renderMonthlyReport(monthDate) {
  const report = getMonthlyReport(monthDate);
  monthlyReportTotal.textContent = formatMoney(report.total);
  monthlyReportCategories.replaceChildren();

  if (!report.topCategories.length) {
    const emptyItem = document.createElement("li");
    emptyItem.className = "monthly-report-empty";
    emptyItem.textContent = "В этом месяце трат нет";
    monthlyReportCategories.append(emptyItem);
  } else {
    report.topCategories.forEach(([category, amount]) => {
      const item = document.createElement("li");
      item.className = "monthly-report-category";
      const row = document.createElement("span");
      const categoryName = document.createElement("span");
      const categoryAmount = document.createElement("strong");
      categoryName.textContent = category;
      categoryAmount.textContent = formatMoney(amount);
      row.append(categoryName, categoryAmount);
      item.append(row);
      monthlyReportCategories.append(item);
    });
  }

  monthlyReportComparison.textContent = report.comparison;
  showMonthlyReportMessage("");
}

function getMonthlyReport(monthDate) {
  const currentExpenses = getExpensesForMonth(monthDate);
  const previousMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() - 1, 1);
  const previousExpenses = getExpensesForMonth(previousMonth);
  const total = currentExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const previousTotal = previousExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const totalsByCategory = currentExpenses.reduce((totals, expense) => {
    const category = expense.category || "Другое";
    totals.set(category, (totals.get(category) || 0) + expense.amount);
    return totals;
  }, new Map());
  const topCategories = [...totalsByCategory.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0], "ru"))
    .slice(0, 3);

  let comparison;
  if (previousTotal === 0) {
    comparison = "В прошлом месяце трат не было";
  } else if (total === previousTotal) {
    comparison = "Без изменений к прошлому месяцу";
  } else {
    const direction = total > previousTotal ? "больше" : "меньше";
    comparison = `На ${formatMoney(Math.abs(total - previousTotal))} ${direction} прошлого месяца`;
  }

  return { total, topCategories, comparison };
}

function getExpensesForMonth(monthDate) {
  return expenses.filter((expense) => {
    if (expense.entryType === "debt" || expense.category === "Выбытие (дал в долг)") return false;
    const [year, month] = expense.date.split("-").map(Number);
    return year === monthDate.getFullYear() && month === monthDate.getMonth() + 1;
  });
}

async function copyMonthlyReport() {
  const selectedMonth = getSelectedReportMonth();
  const report = getMonthlyReport(selectedMonth);
  const monthLabel = new Intl.DateTimeFormat("ru-RU", { month: "long", year: "numeric" }).format(selectedMonth);
  const categories = report.topCategories.length
    ? report.topCategories.map(([category, amount], index) => `${index + 1}. ${category} — ${formatMoney(amount)}`).join("\n")
    : "Трат по категориям нет";
  const text = [
    `Отчёт за ${monthLabel}`,
    `Итог: ${formatMoney(report.total)}`,
    "Самые затратные категории:",
    categories,
    report.comparison,
  ].join("\n");

  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
    } else if (!copyTextFallback(text)) {
      throw new Error("Copy failed");
    }
    showMonthlyReportMessage("Скопировано");
  } catch {
    showMonthlyReportMessage("Не удалось скопировать", true);
  }
}

function getSelectedReportMonth() {
  const [year, month] = monthlyReportMonthInput.value.split("-").map(Number);
  if (Number.isInteger(year) && Number.isInteger(month) && month >= 1 && month <= 12) {
    return new Date(year, month - 1, 1);
  }
  const now = new Date();
  monthlyReportMonthInput.value = toLocalDateString(now).slice(0, 7);
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

function copyTextFallback(text) {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.append(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  textarea.remove();
  return copied;
}

function showMonthlyReportMessage(message, isError = false) {
  monthlyReportMessage.textContent = message;
  monthlyReportMessage.classList.toggle("is-error", isError);
}

function getVisibleExpenses() {
  return expenses
    .filter(isExpenseInSelectedPeriod)
    .sort((left, right) => right.createdAt - left.createdAt);
}

function downloadExcelReport() {
  const reportExpenses = getVisibleExpenses();
  if (!reportExpenses.length) {
    showReportMessage("Нет трат для отчёта");
    return;
  }

  showReportMessage("");
  const total = reportExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const rows = [
    ["Дата", "Категория", "Комментарий", "Сумма, ₸"],
    ...reportExpenses.map((expense) => [
      expense.date,
      protectSpreadsheetText(expense.category || "Другое"),
      protectSpreadsheetText(expense.comment || ""),
      expense.amount,
    ]),
    ["", "", "ИТОГ", total],
  ];
  const csv = `\uFEFFsep=;\r\n${rows.map((row) => row.map(toCsvCell).join(";")).join("\r\n")}`;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${getReportFileName()}.csv`;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

function openPrintableReport() {
  const reportExpenses = getVisibleExpenses();
  if (!reportExpenses.length) {
    showReportMessage("Нет трат для отчёта");
    return;
  }

  const reportWindow = window.open("", "_blank");
  if (!reportWindow) {
    showReportMessage("Разрешите всплывающие окна для сохранения PDF");
    return;
  }

  showReportMessage("");
  reportWindow.opener = null;
  reportWindow.addEventListener("load", () => {
    reportWindow.focus();
    reportWindow.print();
  });
  const total = reportExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const tableRows = reportExpenses.map((expense) => `
    <tr>
      <td>${escapeHtml(formatReportDate(expense.date))}</td>
      <td>${escapeHtml(expense.category || "Другое")}</td>
      <td>${escapeHtml(expense.comment || "—")}</td>
      <td class="amount">${escapeHtml(formatMoney(expense.amount))}</td>
    </tr>`).join("");
  const reportTitle = `Отчёт о тратах — ${getPeriodLabel()}`;

  reportWindow.document.write(`<!doctype html>
    <html lang="ru"><head><meta charset="UTF-8"><title>${escapeHtml(reportTitle)}</title>
    <style>
      body { margin: 32px; color: #222; font: 14px Arial, sans-serif; }
      h1 { margin: 0 0 8px; font-size: 24px; }
      p { margin: 0 0 24px; color: #666; }
      table { width: 100%; border-collapse: collapse; }
      th, td { padding: 10px; border: 1px solid #bbb; text-align: left; vertical-align: top; }
      th { background: #eee; }
      .amount { white-space: nowrap; text-align: right; }
      tfoot { font-weight: bold; }
      @page { margin: 16mm; }
    </style></head><body>
    <h1>${escapeHtml(reportTitle)}</h1>
    <p>Создан: ${escapeHtml(new Intl.DateTimeFormat("ru-RU").format(new Date()))}</p>
    <table><thead><tr><th>Дата</th><th>Категория</th><th>Комментарий</th><th>Сумма</th></tr></thead>
    <tbody>${tableRows}</tbody>
    <tfoot><tr><td colspan="3">ИТОГ</td><td class="amount">${escapeHtml(formatMoney(total))}</td></tr></tfoot>
    </table></body></html>`);
  reportWindow.document.close();
}

function protectSpreadsheetText(value) {
  const text = String(value);
  return /^[=+\-@]/.test(text.trimStart()) ? `'${text}` : text;
}

function toCsvCell(value) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatReportDate(date) {
  return new Intl.DateTimeFormat("ru-RU").format(new Date(`${date}T00:00:00`));
}

function getPeriodLabel() {
  const labels = {
    "1": "за день",
    "7": "за неделю",
    "14": "за 14 дней",
    month: "за текущий месяц",
    all: "за всё время",
  };
  if (selectedPeriod === "custom" && isCustomPeriodValid) {
    return `с ${formatReportDate(periodFromInput.value)} по ${formatReportDate(periodToInput.value)}`;
  }
  if (selectedPeriod === "custom") return "за всё время";
  return labels[selectedPeriod] || "за выбранный период";
}

function getReportFileName() {
  const today = toLocalDateString(new Date());
  const periodName = selectedPeriod === "custom" && isCustomPeriodValid
    ? `${periodFromInput.value}_${periodToInput.value}`
    : selectedPeriod;
  return `otchet-rashody_${periodName}_${today}`;
}

function showReportMessage(message) {
  reportMessage.textContent = message;
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
  const safeValue = Number.isFinite(value) ? Math.round(value) : 0;
  return `${new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(safeValue)} ₸`;
}

function isExpenseInSelectedPeriod(expense) {
  if (selectedPeriod === "all") return true;

  if (selectedPeriod === "custom") {
    if (!isCustomPeriodValid) return true;
    return expense.date >= periodFromInput.value && expense.date <= periodToInput.value;
  }

  const expenseDate = new Date(`${expense.date}T00:00:00`);
  if (Number.isNaN(expenseDate.getTime())) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (selectedPeriod === "month") {
    return expenseDate.getFullYear() === today.getFullYear()
      && expenseDate.getMonth() === today.getMonth();
  }

  const days = Number(selectedPeriod);
  const firstDay = new Date(today);
  firstDay.setDate(today.getDate() - days + 1);
  return expenseDate >= firstDay && expenseDate <= today;
}

function showAmountError(message) {
  amountError.textContent = message;
  amountInput.closest(".field").classList.toggle("has-error", Boolean(message));
  amountInput.setAttribute("aria-invalid", String(Boolean(message)));
}

function showCategoryError(message) {
  categoryError.textContent = message;
  customCategoryInput.setAttribute("aria-invalid", String(Boolean(message)));
}

function validateCustomPeriod() {
  const from = periodFromInput.value;
  const to = periodToInput.value;

  if (!from || !to) {
    isCustomPeriodValid = false;
    showPeriodError("Выберите обе даты");
    return;
  }

  if (from > to) {
    isCustomPeriodValid = false;
    showPeriodError("Дата «С» должна быть не позже даты «По»");
    return;
  }

  isCustomPeriodValid = true;
  showPeriodError("");
}

function showPeriodError(message) {
  periodError.textContent = message;
  periodFromInput.setAttribute("aria-invalid", String(Boolean(message)));
  periodToInput.setAttribute("aria-invalid", String(Boolean(message)));
}

function getCategoryGroup(expense) {
  if (["Еда", "Транспорт", "Дом", "Другое"].includes(expense.categoryGroup)) {
    return expense.categoryGroup;
  }
  return ["Еда", "Транспорт", "Дом"].includes(expense.category)
    ? expense.category
    : "Другое";
}

function setCustomCategoryMode(enabled) {
  isCustomCategory = enabled;
  categorySelect.hidden = enabled;
  categorySelect.disabled = enabled;
  customCategoryInput.hidden = !enabled;
  customCategoryInput.disabled = !enabled;
  toggleCategoryButton.textContent = enabled ? "Готовые" : "Своя категория";
  toggleCategoryButton.setAttribute(
    "aria-label",
    enabled ? "Вернуться к готовым категориям" : "Ввести свою категорию",
  );
  toggleCategoryButton.setAttribute("aria-pressed", String(enabled));
  showCategoryError("");
}

function setEntryTypeMode(type) {
  const isDebt = type === "debt";
  entryTypeSelect.value = isDebt ? "debt" : "expense";
  categoryField.hidden = isDebt;
  if (isDebt) setCustomCategoryMode(false);
  categorySelect.disabled = isDebt || isCustomCategory;
  customCategoryInput.disabled = isDebt || !isCustomCategory;
}

function toLocalDateString(date) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function loadExpenses() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!Array.isArray(saved)) return [];
    return saved.filter(isValidSavedExpense);
  } catch {
    return [];
  }
}

function isValidSavedExpense(expense) {
  if (!expense || typeof expense !== "object") return false;
  if (typeof expense.id !== "string" || expense.id === "") return false;
  if (!Number.isSafeInteger(expense.amount) || expense.amount <= 0) return false;
  if (typeof expense.category !== "string" || expense.category.trim() === "" || expense.category.length > 40) return false;
  if (typeof expense.comment !== "string" || expense.comment.length > 120) return false;
  if (!Number.isFinite(expense.createdAt)) return false;
  if (typeof expense.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(expense.date)) return false;

  const date = new Date(`${expense.date}T00:00:00`);
  return !Number.isNaN(date.getTime()) && toLocalDateString(date) === expense.date;
}

function saveExpenses() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
}

function loadHabits() {
  try {
    const saved = JSON.parse(localStorage.getItem(HABITS_STORAGE_KEY));
    if (!Array.isArray(saved)) return [];
    return saved.filter(isValidSavedHabit).map((habit) => ({
      ...habit,
      name: habit.name.trim(),
      markedDates: [...new Set(habit.markedDates)],
    }));
  } catch {
    return [];
  }
}

function isValidSavedHabit(habit) {
  if (!habit || typeof habit !== "object") return false;
  if (typeof habit.id !== "string" || habit.id === "") return false;
  if (typeof habit.name !== "string" || habit.name.trim() === "" || habit.name.trim().length > 40) return false;
  if (!Number.isInteger(habit.goal) || habit.goal < 1 || habit.goal > 7) return false;
  if (!Array.isArray(habit.markedDates)) return false;
  return habit.markedDates.every((date) => {
    if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
    const parsedDate = new Date(`${date}T00:00:00`);
    return !Number.isNaN(parsedDate.getTime()) && toLocalDateString(parsedDate) === date;
  });
}

function saveHabits() {
  localStorage.setItem(HABITS_STORAGE_KEY, JSON.stringify(habits));
}
