// Loaded for its side effect of pinning process.env.TZ to the clinic timezone,
// so the comparisons below run on the clinic's clock, not the host's.
require('../config');

/**
 * Add `minutes` to an HH:mm time string, returning HH:mm.
 */
const addMinutes = (time, minutes) => {
  const [h, m] = time.split(':').map(Number);
  const total = h * 60 + m + minutes;
  const hh = String(Math.floor(total / 60)).padStart(2, '0');
  const mm = String(total % 60).padStart(2, '0');
  return `${hh}:${mm}`;
};

/**
 * True when `date` (YYYY-MM-DD) at `time` (HH:mm) is at or before now.
 *
 * Shared by the availability engine and appointment creation so the two
 * endpoints cannot disagree: any slot reported `available: true` is bookable,
 * and any slot POST /appointments rejects as past is reported unavailable.
 *
 * Both sides of the comparison are evaluated in the clinic timezone pinned by
 * config (CLINIC_TIMEZONE), so the cut-off matches wall-clock time on site
 * regardless of the host's timezone.
 */
const isPast = (date, time) => new Date(`${date}T${time}:00`) <= new Date();

module.exports = { addMinutes, isPast };
