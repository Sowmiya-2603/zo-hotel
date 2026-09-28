/* ============================================
   Zo Hotel — script.js (home page)
   Mobile menu, concern tabs, stay search,
   FAQ accordion, and the cancellation exit
   modal. All booking changes happen on
   my-booking.html.
   ============================================ */

/* ---------- Concern data (mirrors the four tabs) ---------- */
const concerns = [
  {
    problem: "Your original travel dates no longer work.",
    solution: "Move your stay to another available date without creating a new reservation.",
    detail: "Most flexible bookings can be moved in under two minutes.",
    cta: "Change Dates",
    action: "dates",
  },
  {
    problem: "Price changes can make you reconsider your booking.",
    solution: "Compare your current rate with the available stay options before cancelling.",
    detail: "We’ll show the total difference clearly before you confirm anything.",
    cta: "View My Options",
    action: "price",
  },
  {
    problem: "You may need a different room type or stay setup.",
    solution: "Explore available rooms and update your reservation where possible.",
    detail: "Switch room type, guest count, or accessibility needs in one place.",
    cta: "Explore Rooms",
    action: "rooms",
  },
  {
    problem: "Sometimes your plans are still uncertain.",
    solution: "Check your booking conditions so you know your choices before deciding.",
    detail: "Your cancellation deadline and refund details are always shown upfront.",
    cta: "Review Booking",
    action: "",
  },
];

/* ---------- Mobile menu ---------- */
const menuToggle = document.getElementById("menuToggle");
const mobileMenu = document.getElementById("mobile-menu");

menuToggle.addEventListener("click", () => {
  const isOpen = mobileMenu.classList.toggle("open");
  menuToggle.classList.toggle("open", isOpen);
  menuToggle.setAttribute("aria-expanded", String(isOpen));
  menuToggle.setAttribute("aria-label", isOpen ? "Close navigation menu" : "Open navigation menu");
});

mobileMenu.addEventListener("click", (event) => {
  if (event.target.closest("a")) {
    mobileMenu.classList.remove("open");
    menuToggle.classList.remove("open");
    menuToggle.setAttribute("aria-expanded", "false");
  }
});

/* ---------- Concern tabs ---------- */
const tabs = document.querySelectorAll(".concern-tab");
const optionSolution = document.getElementById("optionSolution");
const optionProblem = document.getElementById("optionProblem");
const optionDetail = document.getElementById("optionDetail");
const optionCta = document.getElementById("optionCta");

tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    tabs.forEach((other) => {
      other.classList.remove("selected");
      other.setAttribute("aria-selected", "false");
    });
    tab.classList.add("selected");
    tab.setAttribute("aria-selected", "true");

    const concern = concerns[Number(tab.dataset.concern)];
    optionSolution.textContent = concern.solution;
    optionProblem.textContent = concern.problem;
    optionDetail.textContent = concern.detail;
    optionCta.innerHTML = `${concern.cta} <span aria-hidden="true">→</span>`;
    optionCta.href = concern.action ? `my-booking.html?action=${concern.action}` : "my-booking.html";
  });
});

/* ---------- FAQ accordion ---------- */
const faqItems = document.querySelectorAll(".faq-item");

faqItems.forEach((item) => {
  const button = item.querySelector("button");
  button.addEventListener("click", () => {
    const isOpen = item.classList.contains("open");
    faqItems.forEach((other) => {
      other.classList.remove("open");
      other.querySelector("button").setAttribute("aria-expanded", "false");
      other.querySelector("button i").textContent = "+";
    });
    if (!isOpen) {
      item.classList.add("open");
      button.setAttribute("aria-expanded", "true");
      button.querySelector("i").textContent = "−";
    }
  });
});

/* ---------- Cancellation exit modal ---------- */
const modalBackdrop = document.getElementById("modalBackdrop");
const modalClose = document.getElementById("modalClose");
const cancelTrigger = document.getElementById("cancelTrigger");
const changeDates = document.getElementById("changeDates");
const continueCancel = document.getElementById("continueCancel");

function openModal() {
  modalBackdrop.hidden = false;
  document.body.style.overflow = "hidden";
  modalClose.focus();
}

function closeModal() {
  modalBackdrop.hidden = true;
  document.body.style.overflow = "";
  cancelTrigger.focus();
}

cancelTrigger.addEventListener("click", openModal);
modalClose.addEventListener("click", closeModal);

// "Change my dates" leads straight into the date-change flow
changeDates.addEventListener("click", () => {
  window.location.href = "my-booking.html?action=dates";
});

// The cancellation path stays clearly available — it opens the real flow
continueCancel.addEventListener("click", () => {
  window.location.href = "my-booking.html?action=cancel";
});

modalBackdrop.addEventListener("mousedown", (event) => {
  if (event.target === modalBackdrop) closeModal();
});

// Close with Escape, keep Tab focus inside the dialog
document.addEventListener("keydown", (event) => {
  if (modalBackdrop.hidden) return;

  if (event.key === "Escape") {
    closeModal();
    return;
  }

  if (event.key === "Tab") {
    const focusable = modalBackdrop.querySelectorAll("button");
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
});
