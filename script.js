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

document.querySelector("#add-item").addEventListener("click", () => addItem());
items.addEventListener("input", update);
items.addEventListener("click", (event) => {
  const button = event.target.closest(".remove");
  if (!button) return;
  const row = button.closest("tr");
  const next = row.nextElementSibling || row.previousElementSibling;
  row.remove();
  update();
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
