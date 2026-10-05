/* ============================================
   ZO Hotel — manage.js (My Booking page)
   Flow modelled on the reference site:
   booking summary → "Modify details" with
   pick-what-to-change checkboxes → update,
   or "Cancel booking" → confirmation screen
   ("Keep my booking" stays one click away).
   Success/cancel actions confirm with a toast.
   ============================================ */

/* ---------- Rooms and rate plans ---------- */
const rooms = [
  { name: "Deluxe Garden Room", perNight: 7800, blurb: "Quiet garden-side room for two, with lift access." },
  { name: "Family Room", perNight: 9200, blurb: "Sleeps four comfortably; an extra bed fits easily." },
  { name: "ZO Suite", perNight: 13500, blurb: "Separate living space for larger families." },
];

const ratePlans = [
  { name: "Flexible", perNight: 9200, blurb: "Free date changes until 48 hours before check-in." },
  { name: "Saver", perNight: 8100, blurb: "Date changes allowed. A one-night fee applies if you cancel." },
  { name: "Member", perNight: 8700, blurb: "Free changes, plus breakfast for the whole family." },
];

/* ---------- Sample bookings (kept in localStorage) ---------- */
const defaultBookings = [
  { ref: "ZH-48215", hotel: "ZO Hotel Goa", room: "Family Room", checkIn: "2026-10-16", checkOut: "2026-10-18", guests: 4, ratePlan: "Flexible", perNight: 9200, status: "confirmed" },
  { ref: "ZH-46102", hotel: "ZO Hotel Mumbai", room: "Deluxe Garden Room", checkIn: "2026-11-02", checkOut: "2026-11-04", guests: 2, ratePlan: "Saver", perNight: 7800, status: "confirmed" },
  { ref: "ZH-43877", hotel: "ZO Hotel Goa", room: "ZO Suite", checkIn: "2026-08-14", checkOut: "2026-08-16", guests: 5, ratePlan: "Member", perNight: 13500, status: "completed" },
];

let bookings;
try {
  bookings = JSON.parse(localStorage.getItem("zoBookings"));
  if (!Array.isArray(bookings) || !bookings.length) bookings = structuredClone(defaultBookings);
} catch {
  bookings = structuredClone(defaultBookings);
}

function saveBookings() {
  try {
    localStorage.setItem("zoBookings", JSON.stringify(bookings));
  } catch {
    /* storage unavailable — the page still works for this visit */
  }
}

let selected = null; // the booking currently being managed

/* ---------- Small helpers ---------- */
const rupees = (amount) => "₹" + amount.toLocaleString("en-IN");

function nightsBetween(checkIn, checkOut) {
  return Math.round((new Date(checkOut) - new Date(checkIn)) / 86400000);
}

function prettyDate(iso) {
  return new Date(iso + "T12:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function totalFor(booking) {
  return nightsBetween(booking.checkIn, booking.checkOut) * booking.perNight;
}

const statusLabels = { confirmed: "Confirmed", cancelled: "Cancelled", completed: "Completed" };

/* Photo shown for each booking */
function imageFor(booking) {
  return booking.hotel.includes("Goa") ? "zo-coastal-resort.jpg" : "zo-hotel-room.jpg";
}

/* ---------- Toast (reference pattern) ---------- */
const toast = document.getElementById("toast");
let toastTimer;

function showToast(message) {
  toast.textContent = "✓ " + message;
  toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.hidden = true; }, 3500);
}

/* ---------- Mobile menu ---------- */
const menuToggle = document.getElementById("menuToggle");
const mobileMenu = document.getElementById("mobile-menu");

menuToggle.addEventListener("click", () => {
  const isOpen = mobileMenu.classList.toggle("open");
  menuToggle.classList.toggle("open", isOpen);
  menuToggle.setAttribute("aria-expanded", String(isOpen));
});

/* ---------- Bookings list ---------- */
const bookingsList = document.getElementById("bookingsList");
const panelPlaceholder = document.getElementById("panelPlaceholder");
const panelContent = document.getElementById("panelContent");
const panelTitle = document.getElementById("panelTitle");
const panelViews = document.querySelectorAll(".drawer-view");

function renderList() {
  const upcoming = bookings.filter((b) => b.status === "confirmed").length;
  const past = bookings.filter((b) => b.status === "completed").length;
  const cancelled = bookings.filter((b) => b.status === "cancelled").length;
  const parts = [];
  if (upcoming) parts.push(`${upcoming} upcoming`);
  if (cancelled) parts.push(`${cancelled} cancelled`);
  if (past) parts.push(`${past} past`);

  bookingsList.innerHTML = `
    <div class="list-head">
      <strong>Your stays</strong>
      <span>${parts.join(" · ")}</span>
    </div>`;

  bookings.forEach((booking) => {
    const item = document.createElement("button");
    item.type = "button";
    item.className = `booking-item ${booking.status}` + (selected && selected.ref === booking.ref ? " selected" : "");
    item.setAttribute("aria-pressed", String(selected ? selected.ref === booking.ref : false));
    item.innerHTML = `
      <span class="thumb" aria-hidden="true"><img src="${imageFor(booking)}" alt="" loading="lazy" /></span>
      <span class="booking-item-body">
        <span class="status-badge ${booking.status}">${statusLabels[booking.status]}</span>
        <strong>${booking.hotel}</strong>
        <small>${booking.ref} · ${booking.room}</small>
        <em>${prettyDate(booking.checkIn)} – ${prettyDate(booking.checkOut)} · ${rupees(totalFor(booking))}</em>
      </span>`;
    item.addEventListener("click", () => selectBooking(booking.ref));
    bookingsList.appendChild(item);
  });
}

function selectBooking(ref, view = "booking") {
  selected = bookings.find((booking) => booking.ref === ref);
  panelPlaceholder.hidden = true;
  panelContent.hidden = false;
  renderList();
  showView(view);
  panelContent.scrollIntoView({ behavior: "smooth", block: "nearest" });
  panelTitle.focus({ preventScroll: true });
}

/* ---------- Panel views ---------- */
const viewTitles = {
  booking: "Your booking",
  modify: "Modify booking",
  confirmCancel: "Cancel your booking?",
};

function showView(name) {
  panelViews.forEach((viewEl) => { viewEl.hidden = viewEl.dataset.view !== name; });
  panelTitle.textContent = viewTitles[name] || "Your booking";
  if (name === "booking") renderBooking();
  if (name === "modify") renderModify();
  if (name === "confirmCancel") renderRefund();
}

panelContent.addEventListener("click", (event) => {
  const viewButton = event.target.closest("[data-open-view]");
  if (viewButton) showView(viewButton.dataset.openView);
  if (event.target.closest(".drawer-back")) showView("booking");
});

/* ---------- View: booking summary ---------- */
function shortRange(a, b) {
  const day = (iso) => new Date(iso + "T12:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  const year = new Date(b + "T12:00:00").getFullYear();
  return `${day(a)} – ${day(b)} ${year}`;
}

function renderBooking() {
  const photo = document.getElementById("bkPhoto");
  photo.src = imageFor(selected);
  photo.alt = `${selected.hotel} — ${selected.room}`;
  document.getElementById("bkRef").textContent = selected.ref;
  document.getElementById("bkHotel").textContent = selected.hotel;
  document.getElementById("bkRoom").textContent = selected.room;
  const nights = nightsBetween(selected.checkIn, selected.checkOut);
  document.getElementById("bkDates").textContent =
    `${shortRange(selected.checkIn, selected.checkOut)} · ${nights} night${nights > 1 ? "s" : ""}`;
  document.getElementById("bkGuests").textContent = `${selected.guests} guest${selected.guests > 1 ? "s" : ""}`;
  document.getElementById("bkRate").textContent = `${selected.ratePlan} · ${rupees(selected.perNight)}/nt`;
  document.getElementById("bkTotal").textContent = rupees(totalFor(selected));

  const status = document.getElementById("bkStatus");
  status.className = "booking-status " + selected.status;
  status.textContent = {
    confirmed: "Confirmed · free changes till 48 h",
    cancelled: "Cancelled · refund on its way",
    completed: "Completed",
  }[selected.status];

  document.getElementById("bookingActions").hidden = selected.status !== "confirmed";
  document.getElementById("restoreWrap").hidden = selected.status !== "cancelled";
}

document.getElementById("restoreBooking").addEventListener("click", () => {
  selected.status = "confirmed";
  saveBookings();
  showView("booking");
  renderList();
  showToast("Your booking has been restored.");
});

/* ---------- View: modify (pick what to change) ---------- */
const modifyForm = document.getElementById("modifyForm");
const modifyCta = document.getElementById("modifyCta");
const modifyCalc = document.getElementById("modifyCalc");
const choiceBoxes = document.querySelectorAll("#modifyChoices input[type=checkbox]");
const bookingFields = document.querySelectorAll(".booking-field");

function fillSelect(select, options, current) {
  select.innerHTML = "";
  options.forEach((option) => {
    const el = document.createElement("option");
    el.value = option.name;
    el.textContent = `${option.name} · ${rupees(option.perNight)}/night`;
    if (option.name === current) el.selected = true;
    select.appendChild(el);
  });
}

/* Show only the picked fields; hidden ones are disabled so validation skips them */
function showFields(names) {
  bookingFields.forEach((field) => {
    const on = names.includes(field.dataset.field);
    field.hidden = !on;
    field.querySelector("input, select").disabled = !on;
  });
  modifyCta.disabled = names.length === 0;
  updateCalc();
}

function renderModify() {
  choiceBoxes.forEach((box) => { box.checked = false; });
  modifyForm.checkout.value = selected.checkOut;
  // Check-in is fixed; check-out can only move to after it (and never into the past)
  const dayAfterCheckIn = new Date(selected.checkIn + "T12:00:00");
  dayAfterCheckIn.setDate(dayAfterCheckIn.getDate() + 1);
  modifyForm.checkout.min = [todayISO(), dayAfterCheckIn.toISOString().slice(0, 10)].sort().pop();
  modifyForm.guests.value = String(Math.min(5, selected.guests));
  fillSelect(document.getElementById("roomSelect"), rooms, selected.room);
  fillSelect(document.getElementById("planSelect"), ratePlans, selected.ratePlan);
  showFields([]);
}

choiceBoxes.forEach((box) => {
  box.addEventListener("change", () => {
    const picked = [...choiceBoxes].filter((b) => b.checked).map((b) => b.value);
    showFields(picked);
  });
});

/* What the booking would look like with the on-screen edits applied */
function draftBooking() {
  const next = { ...selected };
  if (!modifyForm.checkout.disabled) next.checkOut = modifyForm.checkout.value;
  if (!modifyForm.guests.disabled) next.guests = Number(modifyForm.guests.value);
  if (!modifyForm.room.disabled) {
    next.room = modifyForm.room.value;
    next.perNight = rooms.find((r) => r.name === next.room).perNight;
  }
  if (!modifyForm.plan.disabled) {
    next.ratePlan = modifyForm.plan.value;
    if (modifyForm.room.disabled) next.perNight = ratePlans.find((p) => p.name === next.ratePlan).perNight;
  }
  return next;
}

function updateCalc() {
  const next = draftBooking();
  const nights = nightsBetween(next.checkIn, next.checkOut);
  const priceChanged = next.perNight !== selected.perNight || next.checkIn !== selected.checkIn || next.checkOut !== selected.checkOut;
  if (modifyCta.disabled || !priceChanged || nights < 1 || !next.checkIn || !next.checkOut) {
    modifyCalc.hidden = true;
    return;
  }
  const diff = totalFor(next) - totalFor(selected);
  const diffText = diff === 0 ? "no change in price" : diff > 0 ? `${rupees(diff)} more` : `${rupees(-diff)} less`;
  modifyCalc.hidden = false;
  modifyCalc.textContent = `${nights} night${nights > 1 ? "s" : ""} × ${rupees(next.perNight)} = ${rupees(totalFor(next))} (${diffText}).`;
}

modifyForm.addEventListener("input", (event) => {
  event.target.setCustomValidity("");
  updateCalc();
});

/* Check-out must stay after the fixed check-in date */
function datesAreValid(next) {
  const checkout = modifyForm.checkout;
  checkout.setCustomValidity("");
  if (!next.checkOut || next.checkOut > next.checkIn) return true;

  checkout.setCustomValidity(`Check-out must be after your check-in date (${prettyDate(next.checkIn)}).`);
  checkout.reportValidity();
  return false;
}

modifyForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const next = draftBooking();
  if (!datesAreValid(next) || !modifyForm.reportValidity()) return;

  Object.assign(selected, next, { status: "confirmed" });
  saveBookings();
  renderList();
  showView("booking");
  showToast("Your booking has been updated successfully.");
});

/* ---------- View: cancel confirmation ---------- */
function renderRefund() {
  document.getElementById("refundSummary").innerHTML = `
    <strong>${rupees(totalFor(selected))} refund — 100%</strong>
    <p>${selected.ref} · ${shortRange(selected.checkIn, selected.checkOut)} · arrives in 5–10 business days.</p>`;
}

document.getElementById("startCancel").addEventListener("click", () => showView("confirmCancel"));
document.getElementById("keepBooking").addEventListener("click", () => {
  showView("booking");
  showToast("Great — your booking stays exactly as it is.");
});
document.getElementById("cancelToModify").addEventListener("click", () => {
  showView("modify");
  const dateBox = [...choiceBoxes].find((b) => b.value === "checkout");
  dateBox.checked = true;
  showFields(["checkout"]);
  dateBox.focus();
});
document.getElementById("confirmCancelBtn").addEventListener("click", () => {
  const refund = rupees(totalFor(selected));
  selected.status = "cancelled";
  saveBookings();
  renderList();
  showView("booking");
  showToast(`Your booking has been cancelled. Refund of ${refund} is on its way.`);
});

/* ---------- Start up ---------- */
renderList();

/* Deep links from the landing page (?action=dates|rooms|price|cancel) */
const requestedAction = new URLSearchParams(window.location.search).get("action");
const actionMap = {
  dates: ["checkout"],
  rooms: ["room"],
  price: ["plan"],
};

if (requestedAction) {
  const changeable = bookings.find((booking) => booking.status === "confirmed");
  if (changeable) {
    if (requestedAction === "cancel") {
      selectBooking(changeable.ref, "confirmCancel");
    } else if (actionMap[requestedAction]) {
      selectBooking(changeable.ref, "modify");
      choiceBoxes.forEach((box) => { box.checked = actionMap[requestedAction].includes(box.value); });
      showFields(actionMap[requestedAction]);
    }
  }
}
