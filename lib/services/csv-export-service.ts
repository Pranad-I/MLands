type CsvCell = string | number | boolean | null | undefined;

class CsvExportService {
  private escape(value: CsvCell) {
    return `"${String(value ?? '').replace(/"/g, '""')}"`;
  }

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

export const csvExportService = new CsvExportService();
