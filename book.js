/* ============================================
   Zo Hotel — book.js (Book a Stay page)
   Suite picker, room setup, per-guest detail
   forms, live price summary, and confirmation.
   The finished booking lands in My Bookings.
   ============================================ */

/* ---------- Suites, pricing ---------- */
const suites = [
  { name: "Deluxe Garden View", perNight: 7800, blurb: "Ground floor, opens to the garden courtyard.", img: "zo-coastal-resort.jpg" },
  { name: "Deluxe Sea View", perNight: 9200, blurb: "Upper floor with a private sea-facing balcony.", img: "zo-coastal-resort.jpg" },
  { name: "Zo Suite", perNight: 13500, blurb: "Separate living area, bathtub, and lounge access.", img: "zo-hotel-room.jpg" },
];

const EXTRA_BED_PER_NIGHT = 1200;
const MEAL_PER_GUEST_NIGHT = 450;
const FREE_MEAL_PLANS = ["Breakfast only", "No meal plan"];

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

function nextDay(iso) {
  const date = new Date(iso + "T12:00:00");
  date.setDate(date.getDate() + 1);
  return date.toISOString().slice(0, 10);
}

/* ---------- Mobile menu ---------- */
const menuToggle = document.getElementById("menuToggle");
const mobileMenu = document.getElementById("mobile-menu");

menuToggle.addEventListener("click", () => {
  const isOpen = mobileMenu.classList.toggle("open");
  menuToggle.classList.toggle("open", isOpen);
  menuToggle.setAttribute("aria-expanded", String(isOpen));
});

/* ---------- Elements ---------- */
const bookForm = document.getElementById("bookForm");
const suiteCards = document.getElementById("suiteCards");
const guestForms = document.getElementById("guestForms");
const bookDone = document.getElementById("bookDone");

/* ---------- Suite cards ---------- */
suites.forEach((suite, index) => {
  const card = document.createElement("label");
  card.className = "suite-card";
  card.innerHTML = `
    <input type="radio" name="suite" value="${suite.name}" ${index === 1 ? "checked" : ""} />
    <img src="${suite.img}" alt="" loading="lazy" />
    <span class="suite-info">
      <strong>${suite.name}</strong>
      <small>${suite.blurb}</small>
      <em>${rupees(suite.perNight)}/night</em>
    </span>
    <span class="suite-tick" aria-hidden="true">✓</span>`;
  suiteCards.appendChild(card);
});

/* ---------- Dates: no past dates, check-out after check-in ---------- */
const checkInInput = bookForm.checkIn;
const checkOutInput = bookForm.checkOut;
const today = new Date().toISOString().slice(0, 10);

checkInInput.min = today;
checkOutInput.min = nextDay(today);

checkInInput.addEventListener("change", () => {
  if (!checkInInput.value) return;
  checkOutInput.min = nextDay(checkInInput.value);
  if (checkOutInput.value && checkOutInput.value <= checkInInput.value) {
    checkOutInput.value = nextDay(checkInInput.value);
  }
});

/* ---------- Prefill from the home page search (?destination=&in=&out=&guests=) ---------- */
const params = new URLSearchParams(window.location.search);
if (params.get("destination")) {
  const destination = `Zo Hotel ${params.get("destination")}`;
  if ([...bookForm.destination.options].some((o) => o.text === destination)) {
    bookForm.destination.value = destination;
  }
}
if (params.get("in")) { checkInInput.value = params.get("in"); checkInInput.dispatchEvent(new Event("change")); }
if (params.get("out") && params.get("out") > (checkInInput.value || "")) checkOutInput.value = params.get("out");
if (params.get("guests")) {
  const n = Math.min(4, Math.max(1, parseInt(params.get("guests"), 10) || 2));
  bookForm.adults.value = String(n);
}

/* ---------- Per-guest detail forms ---------- */
function guestFieldset(kind, index) {
  const isChild = kind === "child";
  const n = index + 1;
  const prefix = `${kind}-${n}`;
  const fieldset = document.createElement("fieldset");
  fieldset.className = "guest-fieldset";
  fieldset.innerHTML = `
    <legend>${isChild ? `Child ${n}` : `Adult ${n}`}</legend>
    <div class="form-row">
      <label><span>Full name</span>
        <input type="text" name="${prefix}-name" autocomplete="off" placeholder="As on ID" required />
      </label>
      <label><span>Aadhaar number${isChild ? " (optional)" : ""}</span>
        <input type="text" name="${prefix}-aadhaar" inputmode="numeric" maxlength="12" pattern="[0-9]{12}"
               placeholder="12-digit number" ${isChild ? "" : "required"} />
      </label>
    </div>
    <div class="form-row">
      <label><span>Gender</span>
        <select name="${prefix}-gender">
          <option>Female</option>
          <option>Male</option>
          <option>Other</option>
          <option>Prefer not to say</option>
        </select>
      </label>
      <label><span>Age</span>
        <input type="number" name="${prefix}-age" min="${isChild ? 0 : 18}" max="${isChild ? 17 : 120}"
               placeholder="${isChild ? "0–17" : "18+"}" required />
      </label>
    </div>
    <label><span>Allergies</span>
      <input type="text" name="${prefix}-allergies" placeholder="e.g. peanuts, penicillin — leave blank if none" />
    </label>`;
  return fieldset;
}

function renderGuestForms() {
  // Keep anything already typed before re-rendering
  const saved = {};
  guestForms.querySelectorAll("input, select").forEach((el) => { saved[el.name] = el.value; });

  guestForms.innerHTML = "";
  const adults = Number(bookForm.adults.value);
  const children = Number(bookForm.children.value);
  for (let i = 0; i < adults; i++) guestForms.appendChild(guestFieldset("adult", i));
  for (let i = 0; i < children; i++) guestForms.appendChild(guestFieldset("child", i));

  guestForms.querySelectorAll("input, select").forEach((el) => {
    if (saved[el.name] !== undefined) el.value = saved[el.name];
  });
}

bookForm.adults.addEventListener("change", () => { renderGuestForms(); updateSummary(); });
bookForm.children.addEventListener("change", () => { renderGuestForms(); updateSummary(); });

/* ---------- Live summary ---------- */
function currentSuite() {
  return suites.find((s) => s.name === bookForm.suite.value) || suites[1];
}

function currentTotal() {
  const { checkIn, checkOut } = bookForm;
  if (!checkIn.value || !checkOut.value) return null;
  const nights = nightsBetween(checkIn.value, checkOut.value);
  if (nights < 1) return null;

  const guests = Number(bookForm.adults.value) + Number(bookForm.children.value);
  const suiteCost = currentSuite().perNight * nights;
  const bedCost = bookForm.extraBed.checked ? EXTRA_BED_PER_NIGHT * nights : 0;
  const mealCost = FREE_MEAL_PLANS.includes(bookForm.food.value) ? 0 : MEAL_PER_GUEST_NIGHT * guests * nights;
  return { nights, guests, suiteCost, bedCost, mealCost, total: suiteCost + bedCost + mealCost };
}

function updateSummary() {
  const set = (id, text) => { document.getElementById(id).textContent = text; };
  set("sumHotel", bookForm.destination.value);
  set("sumSuite", currentSuite().name);
  set("sumBed", bookForm.extraBed.checked ? `Yes · ${rupees(EXTRA_BED_PER_NIGHT)}/night` : "No");
  set("sumSpec", bookForm.specialization.value);
  set("sumFood", bookForm.food.value);

  const adults = Number(bookForm.adults.value);
  const children = Number(bookForm.children.value);
  set("sumGuests", `${adults} adult${adults > 1 ? "s" : ""}${children ? ` · ${children} child${children > 1 ? "ren" : ""}` : ""}`);

  const cost = currentTotal();
  if (cost) {
    set("sumDates", `${prettyDate(bookForm.checkIn.value)} → ${prettyDate(bookForm.checkOut.value)} · ${cost.nights} night${cost.nights > 1 ? "s" : ""}`);
    set("sumTotal", rupees(cost.total));
  } else {
    set("sumDates", "Pick your dates");
    set("sumTotal", "—");
  }
}

bookForm.addEventListener("input", updateSummary);

/* ---------- Submit ---------- */
bookForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!bookForm.reportValidity()) return;

  const cost = currentTotal();
  if (!cost) {
    checkInInput.reportValidity();
    return;
  }

  // Collect each guest's details
  const collect = (kind, count) => {
    const list = [];
    for (let i = 1; i <= count; i++) {
      list.push({
        name: bookForm[`${kind}-${i}-name`].value.trim(),
        aadhaar: bookForm[`${kind}-${i}-aadhaar`].value.trim(),
        gender: bookForm[`${kind}-${i}-gender`].value,
        age: Number(bookForm[`${kind}-${i}-age`].value),
        allergies: bookForm[`${kind}-${i}-allergies`].value.trim() || "None",
      });
    }
    return list;
  };

  const adults = Number(bookForm.adults.value);
  const children = Number(bookForm.children.value);

  const booking = {
    ref: "ZH-" + String(Math.floor(10000 + Math.random() * 90000)),
    hotel: bookForm.destination.value,
    room: currentSuite().name,
    checkIn: bookForm.checkIn.value,
    checkOut: bookForm.checkOut.value,
    guests: cost.guests,
    ratePlan: "Flexible",
    perNight: Math.round(cost.total / cost.nights),
    status: "confirmed",
    extraBed: bookForm.extraBed.checked,
    specialization: bookForm.specialization.value,
    food: bookForm.food.value,
    party: { adults: collect("adult", adults), children: collect("child", children) },
  };

  // Add it to My Bookings (kept in this browser only)
  let stored = [];
  try { stored = JSON.parse(localStorage.getItem("zoBookings")) || []; } catch { stored = []; }
  stored.unshift(booking);
  try { localStorage.setItem("zoBookings", JSON.stringify(stored)); } catch { /* still shows confirmation */ }

  // Show the confirmation
  const names = [...booking.party.adults, ...booking.party.children].map((p) => p.name.split(" ")[0]).join(", ");
  document.getElementById("doneSummary").textContent =
    `${booking.ref} · ${booking.room} at ${booking.hotel}, ${prettyDate(booking.checkIn)} → ${prettyDate(booking.checkOut)} ` +
    `for ${names}. ${bookForm.extraBed.checked ? "Extra bed added. " : ""}${booking.food}. Total ${rupees(cost.total)}.`;

  bookForm.hidden = true;
  document.querySelector(".book-summary").hidden = true;
  bookDone.hidden = false;
  window.scrollTo({ top: 0, behavior: "smooth" });
  document.getElementById("doneHeading").focus({ preventScroll: true });
});

/* ---------- Start up ---------- */
renderGuestForms();
updateSummary();
