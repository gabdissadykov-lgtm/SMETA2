"use strict";

const items = document.querySelector("#items");
const discountInput = document.querySelector("#discount");
const vatInput = document.querySelector("#vat");
const currencyInput = document.querySelector("#currency");

function numberValue(value) {
  const normalized = String(value).trim().replace(/\s/g, "").replace(",", ".");
  const number = Number(normalized);
  return Number.isFinite(number) && number >= 0 ? number : 0;
}

function safeRound(value) {
  return Number.isFinite(value) && value <= Number.MAX_SAFE_INTEGER ? Math.round(value) : 0;
}

function money(value) {
  return safeRound(value).toLocaleString("ru-RU").replace(/\u00a0|\u202f/g, " ") + " " + currencyInput.value;
}

function calculateTotals(subtotal, discountPercent, vatPercent) {
  const discount = safeRound(subtotal * Math.min(discountPercent, 100) / 100);
  const discounted = subtotal - discount;
  const vat = safeRound(discounted * vatPercent / 100);
  return { subtotal, discount, discounted, vat, total: safeRound(discounted + vat) };
}

function update() {
  let subtotal = 0;
  for (const row of items.rows) {
    const amount = safeRound(numberValue(row.querySelector(".quantity").value) * numberValue(row.querySelector(".price").value));
    row.querySelector(".line-total").textContent = money(amount);
    subtotal = safeRound(subtotal + amount);
  }
  const result = calculateTotals(subtotal, numberValue(discountInput.value), numberValue(vatInput.value));
  for (const [id, value] of Object.entries({ subtotal: result.subtotal, "discount-amount": result.discount, discounted: result.discounted, "vat-amount": result.vat, total: result.total })) {
    document.getElementById(id).textContent = money(value);
  }
  document.querySelector("#discount-row").hidden = result.discount === 0;
  document.querySelector("#discounted-row").hidden = result.discounted === 0;
  document.querySelector("#vat-row").hidden = result.vat === 0;
}

function addItem(focus = true) {
  const row = document.querySelector("#item-template").content.cloneNode(true);
  items.append(row);
  update();
  if (focus) items.lastElementChild.querySelector("input").focus();
}

document.querySelector("#add-item").addEventListener("click", () => { addItem(); saveDraft(); });
items.addEventListener("input", update);
items.addEventListener("click", (event) => {
  const button = event.target.closest(".remove");
  if (!button) return;
  const row = button.closest("tr");
  const next = row.nextElementSibling || row.previousElementSibling;
  row.remove();
  update();
  saveDraft();
  (next ? next.querySelector("input") : document.querySelector("#add-item")).focus();
});
discountInput.addEventListener("input", update);
vatInput.addEventListener("input", update);
currencyInput.addEventListener("change", update);
addItem(false);

// Текстовые копии позволяют печатать длинные значения целиком, без обрезки полями.
const estimateDate = document.querySelector("#estimate-date");
const today = new Date();
estimateDate.value = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

function preparePrint() {
  update();
  document.querySelector("#print-number").textContent = document.querySelector("#estimate-number").value.trim() || "—";
  const dateParts = estimateDate.value.split("-");
  document.querySelector("#print-date").textContent = dateParts.length === 3 ? dateParts.reverse().join(".") : "—";
  document.querySelectorAll(".print-value").forEach((copy) => copy.remove());
  document.querySelectorAll(".requisites textarea, .comment textarea, #items input").forEach((field) => {
    const copy = document.createElement("span");
    copy.className = "print-value";
    copy.textContent = field.matches(".price") ? money(numberValue(field.value))
      : field.matches(".quantity") ? String(numberValue(field.value)) : field.value;
    field.classList.add("print-ready");
    field.after(copy);
  });
}

window.addEventListener("beforeprint", preparePrint);
document.querySelector("#save-pdf").addEventListener("click", () => {
  preparePrint();
  window.print();
});

const draftKey = "smeta-draft-v1";
const fieldIds = ["estimate-number", "estimate-date", "supplier", "client", "comment", "discount", "vat", "currency"];

function saveDraft() {
  const fields = Object.fromEntries(fieldIds.map((id) => [id, document.getElementById(id).value]));
  const positions = Array.from(items.rows, (row) => Object.fromEntries(
    ["name", "quantity", "price"].map((name) => [name, row.querySelector("." + name).value])
  ));
  try {
    localStorage.setItem(draftKey, JSON.stringify({ fields, positions }));
    document.querySelector("#storage-status").textContent = "";
  } catch {
    document.querySelector("#storage-status").textContent = "Браузер не разрешил сохранить черновик. Не закрывайте страницу до сохранения PDF или копирования текста.";
  }
}

function restoreDraft() {
  try {
    const raw = localStorage.getItem(draftKey);
    if (!raw) return;
    const draft = JSON.parse(raw);
    if (!draft || !draft.fields || !Array.isArray(draft.positions)
      || !fieldIds.every((id) => typeof draft.fields[id] === "string")
      || !["₸", "₽", "$", "€"].includes(draft.fields.currency)
      || !draft.positions.every((row) => row && ["name", "quantity", "price"].every((key) => typeof row[key] === "string"))) {
      throw new Error("Invalid draft");
    }
    fieldIds.forEach((id) => { document.getElementById(id).value = draft.fields[id]; });
    items.replaceChildren();
    draft.positions.forEach((position) => {
      addItem(false);
      ["name", "quantity", "price"].forEach((name) => {
        items.lastElementChild.querySelector("." + name).value = position[name];
      });
    });
    update();
  } catch {
    document.querySelector("#storage-status").textContent = "Не удалось восстановить черновик: сохранённые данные повреждены или хранилище недоступно.";
  }
}

document.querySelector(".card").addEventListener("input", (event) => {
  if (event.target.id !== "share-text") saveDraft();
});
document.querySelector(".card").addEventListener("change", (event) => {
  if (event.target.id !== "share-text") saveDraft();
});

let copyTimer;
function clearShare() {
  clearTimeout(copyTimer);
  document.querySelector("#copy-status").textContent = "";
  document.querySelector("#manual-copy").hidden = true;
  document.querySelector("#share-text").value = "";
}

document.querySelector("#new-estimate").addEventListener("click", () => {
  if (!window.confirm("Создать новую смету? Текущий черновик будет очищен.")) return;
  const currentNumber = numberValue(document.querySelector("#estimate-number").value);
  const nextNumber = Number.isSafeInteger(Math.floor(currentNumber)) && currentNumber < Number.MAX_SAFE_INTEGER
    ? Math.floor(currentNumber) + 1 : 1;
  fieldIds.forEach((id) => { document.getElementById(id).value = ""; });
  document.querySelector("#estimate-number").value = String(nextNumber);
  discountInput.value = "0";
  vatInput.value = "0";
  currencyInput.value = "₸";
  items.replaceChildren();
  document.querySelectorAll(".print-value").forEach((copy) => copy.remove());
  clearShare();
  addItem();
  saveDraft();
});

function shareText() {
  update();
  const number = document.querySelector("#estimate-number").value.trim() || "—";
  const date = estimateDate.value ? estimateDate.value.split("-").reverse().join(".") : "—";
  const lines = [`Смета № ${number} от ${date}`];
  for (const [id, label] of [["supplier", "Исполнитель"], ["client", "Заказчик"]]) {
    const value = document.getElementById(id).value.trim();
    if (value) lines.push(`${label}: ${value}`);
  }
  lines.push("");
  for (const row of items.rows) {
    const name = row.querySelector(".name").value.trim() || "Без наименования";
    const quantity = numberValue(row.querySelector(".quantity").value);
    const price = numberValue(row.querySelector(".price").value);
    lines.push(`• ${name} — ${quantity} шт × ${money(price)} = ${row.querySelector(".line-total").textContent}`);
  }
  lines.push("", `Сумма: ${document.querySelector("#subtotal").textContent}`);
  for (const [rowId, label, valueId] of [
    ["discount-row", "Скидка", "discount-amount"],
    ["discounted-row", "Сумма со скидкой", "discounted"],
    ["vat-row", "НДС", "vat-amount"]
  ]) {
    if (!document.getElementById(rowId).hidden) lines.push(`${label}: ${document.getElementById(valueId).textContent}`);
  }
  lines.push(`Итого к оплате: ${document.querySelector("#total").textContent}`);
  const comment = document.querySelector("#comment").value.trim();
  if (comment) lines.push("", `Комментарий: ${comment}`);
  return lines.join("\n");
}

document.querySelector("#copy-whatsapp").addEventListener("click", async () => {
  clearShare();
  const text = shareText();
  try {
    await navigator.clipboard.writeText(text);
    document.querySelector("#copy-status").textContent = "Скопировано ✓";
    copyTimer = setTimeout(() => { document.querySelector("#copy-status").textContent = ""; }, 2000);
  } catch {
    document.querySelector("#manual-copy").hidden = false;
    const field = document.querySelector("#share-text");
    field.value = text;
    field.focus();
    field.select();
  }
});

restoreDraft();
