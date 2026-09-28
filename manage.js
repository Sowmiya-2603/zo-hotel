/* ============================================
   Zo Hotel — manage.js (My Bookings page)
   Lists your bookings; selecting one opens a
   panel to change dates, switch rooms, compare
   rates, cancel, or restore. Changes persist
   in localStorage.
   ============================================ */

/* ---------- Rooms and rate plans available to switch to ---------- */
const rooms = [
  { name: "Deluxe Garden View", perNight: 7800, blurb: "Ground floor, opens to the garden courtyard." },
  { name: "Deluxe Sea View", perNight: 9200, blurb: "Upper floor with a private sea-facing balcony." },
  { name: "Zo Suite", perNight: 13500, blurb: "Separate living area, bathtub, and lounge access." },
];

const ratePlans = [
  { name: "Flexible", perNight: 9200, blurb: "Free date changes. Free cancellation until 48 hours before check-in." },
  { name: "Saver", perNight: 8100, blurb: "Date changes allowed. A one-night fee applies if you cancel." },
  { name: "Member", perNight: 8700, blurb: "Free changes and cancellation, plus breakfast for two." },
];

/* ---------- Sample bookings (kept in localStorage) ---------- */
const defaultBookings = [
  {
    ref: "ZH-48215",
    hotel: "Zo Hotel Goa",
    room: "Deluxe Sea View",
    checkIn: "2026-09-18",
    checkOut: "2026-09-21",
    guests: 2,
    ratePlan: "Flexible",
    perNight: 9200,
    status: "confirmed",
  },
  {
    ref: "ZH-46102",
    hotel: "Zo Hotel Mumbai",
    room: "Deluxe Garden View",
    checkIn: "2026-10-05",
    checkOut: "2026-10-08",
    guests: 1,
    ratePlan: "Saver",
    perNight: 8100,
    status: "confirmed",
  },
  {
    ref: "ZH-43877",
    hotel: "Zo Hotel Goa",
    room: "Zo Suite",
    checkIn: "2026-08-14",
    checkOut: "2026-08-16",
    guests: 2,
    ratePlan: "Member",
    perNight: 13500,
    status: "completed",
  },
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
  return new Date(iso + "T12:00:00").toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function totalFor(booking) {
  return nightsBetween(booking.checkIn, booking.checkOut) * booking.perNight;
}

const statusLabels = { confirmed: "Confirmed", cancelled: "Cancelled", completed: "Completed" };

/* Photo shown for each hotel */
function imageFor(booking) {
  return booking.hotel.includes("Goa") ? "zo-coastal-resort.jpg" : "zo-hotel-room.jpg";
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
    item.className =
      `booking-item ${booking.status}` + (selected && selected.ref === booking.ref ? " selected" : "");
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
  dates: "Change dates",
  rooms: "Change room",
  price: "Rate options",
  cancel: "Cancel booking",
  done: "All done",
};

function showView(name) {
  panelViews.forEach((viewEl) => {
    viewEl.hidden = viewEl.dataset.view !== name;
  });
  panelTitle.textContent = viewTitles[name] || "Your booking";

  if (name === "booking") renderBooking();
  if (name === "dates") renderDatesForm();
  if (name === "rooms") renderRooms();
  if (name === "price") renderRates();
  if (name === "cancel") renderRefund();
}

/* In-panel navigation (back links and action buttons) */
panelContent.addEventListener("click", (event) => {
  const viewButton = event.target.closest("[data-open-view]");
  if (viewButton) showView(viewButton.dataset.openView);
  if (event.target.closest(".drawer-back")) showView("booking");
});

function showDone(title, text) {
  document.getElementById("doneTitle").textContent = title;
  document.getElementById("doneText").textContent = text;
  showView("done");
  renderList();
  panelTitle.focus({ preventScroll: true });
}

/* ---------- View: booking overview ---------- */
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

  document.getElementById("bookingActions").hidden = selected.status !== "confirmed";
  document.getElementById("restoreWrap").hidden = selected.status !== "cancelled";
}

document.getElementById("restoreBooking").addEventListener("click", () => {
  selected.status = "confirmed";
  saveBookings();
  showDone("Booking restored", "Welcome back! Your stay is confirmed again with the same dates, room, and rate.");
});

/* ---------- View: change dates ---------- */
const datesForm = document.getElementById("datesForm");
const datesCalc = document.getElementById("datesCalc");

function nextDay(iso) {
  const date = new Date(iso + "T12:00:00");
  date.setDate(date.getDate() + 1);
  return date.toISOString().slice(0, 10);
}

function renderDatesForm() {
  document.getElementById("datesCurrent").textContent =
    `${prettyDate(selected.checkIn)} → ${prettyDate(selected.checkOut)} (${rupees(totalFor(selected))})`;
  const today = new Date().toISOString().slice(0, 10);
  datesForm.newIn.min = today;
  datesForm.newIn.value = selected.checkIn;
  datesForm.newOut.value = selected.checkOut;
  datesForm.newOut.min = nextDay(datesForm.newIn.value);
  datesForm.guests.value = String(selected.guests);
  previewDates();
}

function previewDates() {
  const { newIn, newOut } = datesForm;
  if (!newIn.value || !newOut.value) return;
  const nights = nightsBetween(newIn.value, newOut.value);
  if (nights < 1) {
    datesCalc.hidden = false;
    datesCalc.textContent = "Check-out must be after check-in.";
    return;
  }
  const newTotal = nights * selected.perNight;
  const diff = newTotal - totalFor(selected);
  const diffText = diff === 0 ? "no change in price" : diff > 0 ? `${rupees(diff)} more` : `${rupees(-diff)} less`;
  datesCalc.hidden = false;
  datesCalc.textContent = `${nights} night${nights > 1 ? "s" : ""} × ${rupees(selected.perNight)} = ${rupees(newTotal)} (${diffText}).`;
}

datesForm.addEventListener("input", (event) => {
  // Keep check-out after check-in: shift it forward when needed
  if (event.target.name === "newIn" && datesForm.newIn.value) {
    const minOut = nextDay(datesForm.newIn.value);
    datesForm.newOut.min = minOut;
    if (datesForm.newOut.value && datesForm.newOut.value < minOut) {
      datesForm.newOut.value = minOut;
    }
  }
  previewDates();
});

datesForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const { newIn, newOut, guests } = datesForm;
  if (nightsBetween(newIn.value, newOut.value) < 1) {
    previewDates();
    return;
  }
  selected.checkIn = newIn.value;
  selected.checkOut = newOut.value;
  selected.guests = Number(guests.value);
  saveBookings();
  showDone(
    "Booking updated",
    `Your stay at ${selected.hotel} is now ${prettyDate(selected.checkIn)} → ${prettyDate(selected.checkOut)} for ${selected.guests} guest${selected.guests > 1 ? "s" : ""}. New total: ${rupees(totalFor(selected))}.`
  );
});

/* ---------- View: change room ---------- */
function renderRooms() {
  const list = document.getElementById("roomList");
  list.innerHTML = "";
  rooms.forEach((room) => {
    const current = room.name === selected.room;
    const diff = (room.perNight - selected.perNight) * nightsBetween(selected.checkIn, selected.checkOut);
    const diffText = current || diff === 0 ? "" : diff > 0 ? ` · ${rupees(diff)} more for your stay` : ` · ${rupees(-diff)} less for your stay`;
    const card = document.createElement("article");
    card.className = "choice-card" + (current ? " current" : "");
    card.innerHTML = `
      <div>
        <strong>${room.name}</strong>
        <small>${room.blurb}</small>
        <em>${rupees(room.perNight)}/night${diffText}</em>
      </div>
      <button class="button ${current ? "button-deep" : "button-teal"}" type="button" ${current ? "disabled" : ""}>
        ${current ? "Current room" : "Select"}
      </button>`;
    if (!current) {
      card.querySelector("button").addEventListener("click", () => {
        selected.room = room.name;
        selected.perNight = room.perNight;
        saveBookings();
        showDone("Room updated", `You’re now staying in the ${room.name}. New total: ${rupees(totalFor(selected))}.`);
      });
    }
    list.appendChild(card);
  });
}

/* ---------- View: rate options ---------- */
function renderRates() {
  const list = document.getElementById("rateList");
  list.innerHTML = "";
  ratePlans.forEach((plan) => {
    const current = plan.name === selected.ratePlan;
    const card = document.createElement("article");
    card.className = "choice-card" + (current ? " current" : "");
    card.innerHTML = `
      <div>
        <strong>${plan.name}</strong>
        <small>${plan.blurb}</small>
        <em>${rupees(plan.perNight)}/night</em>
      </div>
      <button class="button ${current ? "button-deep" : "button-teal"}" type="button" ${current ? "disabled" : ""}>
        ${current ? "Current rate" : "Switch"}
      </button>`;
    if (!current) {
      card.querySelector("button").addEventListener("click", () => {
        selected.ratePlan = plan.name;
        selected.perNight = plan.perNight;
        saveBookings();
        showDone("Rate switched", `You’re on the ${plan.name} rate now. New total: ${rupees(totalFor(selected))}.`);
      });
    }
    list.appendChild(card);
  });
}

/* ---------- View: cancellation ---------- */
function renderRefund() {
  document.getElementById("refundSummary").innerHTML = `
    <strong>Estimated refund: ${rupees(totalFor(selected))} (100%)</strong>
    <p>You’re inside the free-cancellation window for your ${selected.ratePlan} rate.
    Refunds usually reach you within 5–10 business days.</p>`;
}

document.getElementById("cancelForm").addEventListener("submit", (event) => {
  event.preventDefault();
  selected.status = "cancelled";
  saveBookings();
  showDone(
    "Booking cancelled",
    `Your refund of ${rupees(totalFor(selected))} is on its way (5–10 business days). Changed your mind? You can restore this booking from the booking screen.`
  );
});

/* ---------- Start up ---------- */
renderList();

/* If the home page sent us here with an action (?action=dates etc.),
   open the first changeable booking straight at that view. */
const requestedAction = new URLSearchParams(window.location.search).get("action");
const validActions = ["dates", "rooms", "price", "cancel"];

if (requestedAction && validActions.includes(requestedAction)) {
  const changeable = bookings.find((booking) => booking.status === "confirmed");
  if (changeable) selectBooking(changeable.ref, requestedAction);
}
