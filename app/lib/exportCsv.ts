export function downloadCsv(filename: string, rows: Record<string, unknown>[]) {
  if (rows.length === 0) {
    alert("目前沒有資料可以下載");
    return;
  }

  const headers = Object.keys(rows[0]);

  const escapeCsvValue = (value: unknown) => {
    if (value === null || value === undefined) {
      return "";
    }

    const text = String(value);

    if (text.includes(",") || text.includes('"') || text.includes("\n")) {
      return `"${text.replaceAll('"', '""')}"`;
    }

    return text;
  };

  const csvContent = [
    headers.join(","),
    ...rows.map((row) =>
      headers.map((header) => escapeCsvValue(row[header])).join(",")
    ),
  ].join("\n");

  const blob = new Blob(["\uFEFF" + csvContent], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  link.click();

  URL.revokeObjectURL(url);
}