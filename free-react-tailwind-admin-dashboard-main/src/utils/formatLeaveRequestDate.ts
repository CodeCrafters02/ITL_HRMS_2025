/**
 * Formats leave API dates as dd/mm/yyyy.
 * Uses calendar parts from a leading YYYY-MM-DD so the day is not shifted by UTC parsing.
 */
export function formatLeaveRequestDate(value?: string | null): string {
    if (value == null || value === '') return '-';
    const s = String(value).trim();
    const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) {
        const [, y, m, d] = iso;
        return `${d}/${m}/${y}`;
    }
    const parsed = new Date(s);
    if (Number.isNaN(parsed.getTime())) return s;
    const day = String(parsed.getDate()).padStart(2, '0');
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const year = parsed.getFullYear();
    return `${day}/${month}/${year}`;
}
