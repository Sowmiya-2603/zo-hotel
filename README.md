# Zo Hotel

A responsive hotel website built with plain HTML, CSS, and vanilla JavaScript — no frameworks, no build step. Designed to reduce booking cancellations by offering guests helpful alternatives (change dates, switch rooms, compare rates) before they cancel.

## Pages

| Page | Purpose |
|------|---------|
| `index.html` | Landing page — full-screen hero, flexible-options tabs, trust sections, FAQ, booking menu, and a cancellation exit modal |
| `book-stay.html` | Book a stay — suite picker, extra bed, room preference, meal plan, and per-guest detail forms (name, Aadhaar, gender, age, allergies) with a live price summary |
| `my-booking.html` | My bookings — select a stay and change dates/guests, switch rooms, compare rate plans, or cancel with a refund estimate (restorable) |
| `zo-hotel-booking-manager.html` | Single-file bundle of the booking manager (CSS, JS, and images inlined) — works standalone anywhere |

## Running locally

Any static server works:

```bash
python3 -m http.server 5173
```

Then open http://localhost:5173/. Opening `index.html` directly in a browser also works.

## Notes

- Bookings persist in the browser via `localStorage` — this is a demo; no data leaves the browser.
- Fonts (Cormorant Garamond, DM Sans) load from Google Fonts with system fallbacks.
- Photography: [Unsplash](https://unsplash.com/photos/tropical-resort-with-pool-beside-a-calm-ocean-bVNB68XJwqk).
