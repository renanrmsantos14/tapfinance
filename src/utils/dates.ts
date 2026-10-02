export function formatDate(timestamp: number): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(timestamp));
}

export function parseDateInput(value: string): number | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value.trim());
  if (!match) return null;

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return date.getTime();
}

export function formatShortDate(timestamp: number): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
  }).format(new Date(timestamp)).replace(".", "");
}

export function replaceDateKeepingTime(timestamp: number, value: string): number | null {
  const parsed = parseDateInput(value);
  const original = new Date(timestamp);
  if (parsed === null || !Number.isFinite(original.getTime())) return null;
  const date = new Date(parsed);
  date.setHours(original.getHours(), original.getMinutes(), original.getSeconds(), original.getMilliseconds());
  return date.getTime();
}

export function replaceDateAndTime(timestamp: number, dateText: string, timeText: string): number | null {
  const original = new Date(timestamp);
  const parsed = parseDateInput(dateText);
  const clock = /^(\d{2}):(\d{2})$/.exec(timeText.trim());
  if (!Number.isFinite(original.getTime()) || parsed === null || !clock) return null;
  const hours = Number(clock[1]); const minutes = Number(clock[2]);
  if (hours > 23 || minutes > 59) return null;
  const date = new Date(parsed); const day = date.getDate(); const month = date.getMonth(); const year = date.getFullYear();
  const clockUnchanged = hours === original.getHours() && minutes === original.getMinutes();
  date.setHours(hours, minutes, clockUnchanged ? original.getSeconds() : 0, clockUnchanged ? original.getMilliseconds() : 0);
  if (date.getFullYear() !== year || date.getMonth() !== month || date.getDate() !== day || date.getHours() !== hours || date.getMinutes() !== minutes) return null;
  return date.getTime();
}

export function formatMonthLabel(timestamp: number, includeYear = false): string {
  return new Intl.DateTimeFormat("pt-BR", { month: "long", ...(includeYear ? { year: "numeric" as const } : {}) })
    .format(new Date(timestamp))
    .toUpperCase();
}

export function formatTime(timestamp: number): string {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(timestamp));
}
