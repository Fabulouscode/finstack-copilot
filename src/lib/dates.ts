/** "1 Oct 2026, 18:00", in the server's time zone. */
export function formatDateTime(value: string | Date): string {
  return new Date(value).toLocaleString('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}
