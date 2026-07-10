export const ADMIN_DATE_FORMATTER = new Intl.DateTimeFormat("zh-CN", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatAdminDate(timestamp: number | null | undefined) {
  if (timestamp === null || timestamp === undefined) return "-";
  return ADMIN_DATE_FORMATTER.format(timestamp);
}
