// "2026-11-20T12:15:00.000Z" -> "20 Nov 2026, 18:00" (Nepal time)
export function formatNepalDateTime(iso: string) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kathmandu',
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(iso));
}

// ISO date from the API -> value for <input type="datetime-local"> in Nepal time
export function toNepalInputValue(iso: string) {
  const nepalMillis = new Date(iso).getTime() + (5 * 60 + 45) * 60 * 1000;
  return new Date(nepalMillis).toISOString().slice(0, 16); // "2026-11-20T18:00"
}

// Value typed in a datetime-local input (Nepal time) -> ISO string with offset for the API
export function nepalInputToIso(value: string) {
  return `${value}:00+05:45`;
}