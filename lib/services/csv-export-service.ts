/**
 * A single cell's value in an exported CSV row. Restricted to primitive
 * types (plus null/undefined for empty cells) because CSV has no concept
 * of nested structures — every value must ultimately be written out as
 * plain text, so allowing arbitrary objects here would just push the
 * "how do I stringify this" problem into escape() without adding safety.
 */
type CsvCell = string | number | boolean | null | undefined;

/**
 * CsvExportService turns an in-memory table (headers + rows) into a
 * downloaded .csv file, entirely client-side (no server round trip).
 * Several pages (e.g. Activity Log) offer a "download as CSV" action for
 * whatever data the user is currently viewing/filtering, so this logic is
 * centralised here once rather than each page re-implementing CSV escaping
 * and the file-download dance.
 *
 * NOTE: not every export button in the app currently routes through this
 * service — the Alerts page's CSV export builds its own CSV string inline
 * instead of calling exportRows() below. Functionally the two approaches
 * produce equivalent output; the inconsistency exists because the Alerts
 * export logic was added directly inside AlertsDashboard.tsx as part of a
 * bug fix (the Export button was previously wired to the wrong handler)
 * rather than being routed through this shared service. It would be a
 * reasonable future cleanup to have AlertsDashboard call
 * csvExportService.exportRows() instead of duplicating the CSV-building
 * logic, but the current inline version was left in place as the
 * minimal, low-risk fix at the time.
 */
class CsvExportService {
  /**
   * Escapes a single value for safe inclusion in a CSV cell: wraps every
   * value in double quotes and doubles any internal quote characters, per
   * the standard CSV escaping convention. Wrapping every cell (not just
   * ones containing commas/quotes) keeps the escaping logic simple and
   * avoids having to special-case which values need quoting.
   *
   * Marked private (via the '#'-equivalent TypeScript `private` keyword)
   * because it's a low-level formatting detail specific to how this class
   * builds its own CSV output — no other part of the codebase should
   * need to call it directly, so keeping it private prevents it from
   * being treated as a general-purpose utility elsewhere.
   */
  private escape(value: CsvCell) {
    return `"${String(value ?? '').replace(/"/g, '""')}"`;
  }

  /**
   * Builds a CSV file from a header row and a set of data rows, then
   * triggers a browser download of it.
   *
   * Guards on `typeof window === 'undefined'` first because Next.js can
   * execute component code during server-side rendering, where `document`
   * and `URL.createObjectURL` don't exist — without this guard, calling
   * this method during SSR would throw. Returning early is safe here
   * since a CSV download only ever makes sense in response to a real
   * user click in the browser, never during a server render pass.
   *
   * The filename is built from filenamePrefix plus today's date
   * (YYYY-MM-DD) so repeated exports on different days don't silently
   * overwrite each other in the user's downloads folder.
   */
  exportRows(filenamePrefix: string, headers: string[], rows: CsvCell[][]) {
    if (typeof window === 'undefined') return;
    const csvLines = rows.map((row) => row.map((value) => this.escape(value)).join(','));
    const csv = [headers.join(','), ...csvLines].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filenamePrefix}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

// Singleton export — this service holds no per-instance state, so a single
// shared instance is sufficient and avoids callers needing to instantiate
// their own copy.
export const csvExportService = new CsvExportService();
