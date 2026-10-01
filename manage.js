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
function renderBooking() {
  const photo = document.getElementById("bkPhoto");
  photo.src = imageFor(selected);
  photo.alt = `${selected.hotel} — ${selected.room}`;
  document.getElementById("bkRef").textContent = selected.ref;
  document.getElementById("bkHotel").textContent = selected.hotel;
  document.getElementById("bkRoom").textContent = selected.room;
  document.getElementById("bkDates").textContent =
    `${prettyDate(selected.checkIn)} → ${prettyDate(selected.checkOut)} · ${nightsBetween(selected.checkIn, selected.checkOut)} nights`;
  document.getElementById("bkGuests").textContent = `${selected.guests} guest${selected.guests > 1 ? "s" : ""}`;
  document.getElementById("bkRate").textContent = `${selected.ratePlan} · ${rupees(selected.perNight)}/night`;
  document.getElementById("bkTotal").textContent = rupees(totalFor(selected));

  const status = document.getElementById("bkStatus");
  const policy = document.getElementById("bkPolicy");
  status.className = "booking-status " + selected.status;

  if (selected.status === "cancelled") {
    status.textContent = "Cancelled — your refund is on its way (5–10 business days).";
    policy.textContent = "Changed your mind? You can restore this booking below.";
  } else if (selected.status === "completed") {
    status.textContent = "Completed — we hope you enjoyed your stay!";
    policy.textContent = "This stay is in the past, so it can no longer be changed.";
  } else {
    status.textContent = "Confirmed — you can still change this booking for free.";
    policy.textContent = "Free date changes and free cancellation until 48 hours before check-in.";
  }

  const changeable = selected.status === "confirmed";
  document.getElementById("bookingActions").hidden = !changeable;
  document.querySelector(".panel-question").hidden = !changeable;
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
  modifyForm.checkin.value = selected.checkIn;
  modifyForm.checkout.value = selected.checkOut;
  modifyForm.checkin.min = todayISO();
  modifyForm.checkout.min = todayISO();
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
  if (!modifyForm.checkin.disabled) next.checkIn = modifyForm.checkin.value;
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

/* Check-out must follow check-in, even when only one of them is being changed */
function datesAreValid(next) {
  const checkin = modifyForm.checkin;
  const checkout = modifyForm.checkout;
  checkin.setCustomValidity("");
  checkout.setCustomValidity("");
  if (!next.checkIn || !next.checkOut || next.checkOut > next.checkIn) return true;

  const target = checkout.disabled ? checkin : checkout;
  target.setCustomValidity(checkout.disabled
    ? `Check-in must be before your check-out date (${prettyDate(next.checkOut)}).`
    : "Check-out must be after the check-in date.");
  target.reportValidity();
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
    <strong>Estimated refund: ${rupees(totalFor(selected))} (100%)</strong>
    <p>${selected.ref} · ${selected.room}, ${prettyDate(selected.checkIn)} → ${prettyDate(selected.checkOut)}.
    You're inside the free-cancellation window for your ${selected.ratePlan} rate.
    Refunds usually arrive within 5–10 business days.</p>`;
}

document.getElementById("startCancel").addEventListener("click", () => showView("confirmCancel"));
document.getElementById("keepBooking").addEventListener("click", () => {
  showView("booking");
  showToast("Great — your booking stays exactly as it is.");
});
document.getElementById("cancelToModify").addEventListener("click", () => {
  showView("modify");
  const dateBoxes = [...choiceBoxes].filter((b) => b.value === "checkin" || b.value === "checkout");
  dateBoxes.forEach((b) => { b.checked = true; });
  showFields(["checkin", "checkout"]);
  dateBoxes[0].focus();
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
  dates: ["checkin", "checkout"],
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
