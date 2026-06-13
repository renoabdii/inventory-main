import * as XLSX from "xlsx";
import ExcelJS from "exceljs";

export const exportToCsv = (filename: string, rows: Record<string, unknown>[]) => {
  if (rows.length === 0) return;

  const headers = Object.keys(rows[0]);
  const escapeCell = (value: unknown) => {
    const text = String(value ?? "");
    return `"${text.replace(/"/g, '""')}"`;
  };

  const csv = [
    headers.map(escapeCell).join(","),
    ...rows.map((row) => headers.map((header) => escapeCell(row[header])).join(",")),
  ].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

export const exportToXlsx = (
  filename: string,
  title: string,
  rows: Record<string, unknown>[]
) => {
  if (rows.length === 0) return;

  const generatedAt = new Date().toLocaleString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const worksheetData = [
    [title],
    ["Ely Berkah Mart"],
    [`Dicetak: ${generatedAt}`],
    [],
    Object.keys(rows[0]),
    ...rows.map((row) => Object.values(row)),
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
  const columnCount = Object.keys(rows[0]).length;

  worksheet["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: columnCount - 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: columnCount - 1 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: columnCount - 1 } },
  ];

  worksheet["!cols"] = Object.keys(rows[0]).map((header) => ({
    wch: Math.max(14, header.length + 4),
  }));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Laporan");
  XLSX.writeFile(workbook, filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`);
};

export const exportToStyledXlsx = async (
  filename: string,
  title: string,
  rows: Record<string, unknown>[]
) => {
  if (rows.length === 0) return;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "InventoryPro";
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet("Laporan", {
    views: [{ state: "frozen", ySplit: 5 }],
  });

  const headers = Object.keys(rows[0]);
  const lastColumn = headers.length;
  const generatedAt = new Date().toLocaleString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  worksheet.mergeCells(1, 1, 1, lastColumn);
  worksheet.mergeCells(2, 1, 2, lastColumn);
  worksheet.mergeCells(3, 1, 3, lastColumn);

  worksheet.getCell(1, 1).value = title;
  worksheet.getCell(2, 1).value = "Ely Berkah Mart";
  worksheet.getCell(3, 1).value = `Dicetak: ${generatedAt}`;

  worksheet.getRow(1).height = 28;
  worksheet.getRow(2).height = 22;
  worksheet.getRow(3).height = 20;

  worksheet.getCell(1, 1).font = { bold: true, size: 16, color: { argb: "FFFFFFFF" } };
  worksheet.getCell(1, 1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F766E" } };
  worksheet.getCell(1, 1).alignment = { horizontal: "center", vertical: "middle" };

  worksheet.getCell(2, 1).font = { bold: true, size: 12, color: { argb: "FF134E4A" } };
  worksheet.getCell(2, 1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFCCFBF1" } };
  worksheet.getCell(2, 1).alignment = { horizontal: "center", vertical: "middle" };

  worksheet.getCell(3, 1).font = { italic: true, size: 10, color: { argb: "FF475569" } };
  worksheet.getCell(3, 1).alignment = { horizontal: "center", vertical: "middle" };

  worksheet.addRow([]);
  const headerRow = worksheet.addRow(headers);
  headerRow.height = 24;
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF115E59" } };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.border = {
      top: { style: "thin", color: { argb: "FF0F172A" } },
      left: { style: "thin", color: { argb: "FF0F172A" } },
      bottom: { style: "thin", color: { argb: "FF0F172A" } },
      right: { style: "thin", color: { argb: "FF0F172A" } },
    };
  });

  rows.forEach((row, rowIndex) => {
    const excelRow = worksheet.addRow(headers.map((header) => row[header]));
    excelRow.eachCell((cell, colNumber) => {
      const header = headers[colNumber - 1].toLowerCase();
      const value = cell.value;
      const textValue = String(value ?? "").toLowerCase();

      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: rowIndex % 2 === 0 ? "FFFFFFFF" : "FFF8FAFC" },
      };
      cell.border = {
        top: { style: "thin", color: { argb: "FFE5E7EB" } },
        left: { style: "thin", color: { argb: "FFE5E7EB" } },
        bottom: { style: "thin", color: { argb: "FFE5E7EB" } },
        right: { style: "thin", color: { argb: "FFE5E7EB" } },
      };
      cell.alignment = {
        vertical: "middle",
        horizontal: typeof value === "number" ? "right" : "left",
        wrapText: true,
      };

      if (
        typeof value === "number" &&
        (header.includes("harga") ||
          header.includes("nilai") ||
          header.includes("total") ||
          header.includes("nominal"))
      ) {
        cell.numFmt = '"Rp" #,##0';
      } else if (typeof value === "number") {
        cell.numFmt = "#,##0";
      }

      if (header.includes("status")) {
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.font = { bold: true };
        if (textValue.includes("kritis") || textValue.includes("critical")) {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEE2E2" } };
          cell.font = { bold: true, color: { argb: "FF991B1B" } };
        } else if (textValue.includes("rendah") || textValue.includes("low")) {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEF3C7" } };
          cell.font = { bold: true, color: { argb: "FF92400E" } };
        } else if (textValue.includes("normal")) {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFDCFCE7" } };
          cell.font = { bold: true, color: { argb: "FF166534" } };
        }
      }
    });
  });

  worksheet.columns = headers.map((header) => ({
    width: Math.min(Math.max(header.length + 8, 14), 28),
  }));

  worksheet.autoFilter = {
    from: { row: 5, column: 1 },
    to: { row: 5, column: lastColumn },
  };

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`;
  link.click();
  URL.revokeObjectURL(url);
};

export const exportToExcel = (
  filename: string,
  title: string,
  rows: Record<string, unknown>[]
) => {
  if (rows.length === 0) return;

  const headers = Object.keys(rows[0]);
  const columnCount = headers.length;
  const escapeHtml = (value: unknown) =>
    String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  const formatValue = (header: string, value: unknown) => {
    if (typeof value !== "number") return escapeHtml(value);

    const lowerHeader = header.toLowerCase();
    const isCurrency =
      lowerHeader.includes("harga") ||
      lowerHeader.includes("nilai") ||
      lowerHeader.includes("total") ||
      lowerHeader.includes("nominal");

    if (isCurrency) {
      return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
      }).format(value);
    }

    return new Intl.NumberFormat("id-ID").format(value);
  };

  const getCellClass = (header: string, value: unknown) => {
    const lowerHeader = header.toLowerCase();
    const lowerValue = String(value ?? "").toLowerCase();
    const classes = [];

    if (typeof value === "number") classes.push("number");
    if (
      lowerHeader.includes("harga") ||
      lowerHeader.includes("nilai") ||
      lowerHeader.includes("total") ||
      lowerHeader.includes("nominal")
    ) {
      classes.push("currency");
    }
    if (lowerHeader.includes("status")) {
      if (lowerValue.includes("kritis") || lowerValue.includes("critical")) classes.push("status-danger");
      if (lowerValue.includes("rendah") || lowerValue.includes("low")) classes.push("status-warning");
      if (lowerValue.includes("normal")) classes.push("status-success");
    }

    return classes.join(" ");
  };

  const generatedAt = new Date().toLocaleString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const html = `
    <html>
      <head>
        <meta charset="UTF-8" />
        <style>
          body { font-family: Arial, sans-serif; color: #111827; }
          table { border-collapse: collapse; width: 100%; }
          .title {
            background: #0f766e;
            color: #ffffff;
            font-size: 22px;
            font-weight: 700;
            text-align: center;
            padding: 14px;
            border: 1px solid #0f766e;
          }
          .subtitle {
            background: #ccfbf1;
            color: #134e4a;
            text-align: center;
            padding: 8px;
            border: 1px solid #99f6e4;
            font-weight: 600;
          }
          .meta-label {
            background: #f3f4f6;
            color: #374151;
            font-weight: 700;
            border: 1px solid #d1d5db;
            padding: 7px;
            width: 140px;
          }
          .meta-value {
            border: 1px solid #d1d5db;
            padding: 7px;
          }
          .spacer td {
            height: 12px;
            border: none;
          }
          th {
            background: #115e59;
            color: #fff;
            font-weight: 700;
            border: 1px solid #134e4a;
            padding: 9px;
            text-align: center;
          }
          td {
            border: 1px solid #d1d5db;
            padding: 8px;
            vertical-align: top;
          }
          tr:nth-child(even) td { background: #f8fafc; }
          .number, .currency { text-align: right; }
          .status-danger { background: #fee2e2 !important; color: #991b1b; font-weight: 700; text-align: center; }
          .status-warning { background: #fef3c7 !important; color: #92400e; font-weight: 700; text-align: center; }
          .status-success { background: #dcfce7 !important; color: #166534; font-weight: 700; text-align: center; }
        </style>
      </head>
      <body>
        <table>
          <tr><td class="title" colspan="${columnCount}">${escapeHtml(title)}</td></tr>
          <tr><td class="subtitle" colspan="${columnCount}">Ely Berkah Mart</td></tr>
          <tr class="spacer"><td colspan="${columnCount}"></td></tr>
          <tr>
            <td class="meta-label">Tanggal Cetak</td>
            <td class="meta-value" colspan="${Math.max(columnCount - 1, 1)}">${escapeHtml(generatedAt)}</td>
          </tr>
          <tr>
            <td class="meta-label">Jumlah Data</td>
            <td class="meta-value" colspan="${Math.max(columnCount - 1, 1)}">${rows.length} baris</td>
          </tr>
          <tr class="spacer"><td colspan="${columnCount}"></td></tr>
          <thead>
            <tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr>
          </thead>
          <tbody>
            ${rows
              .map(
                (row) => `
                  <tr>
                    ${headers
                      .map((header) => {
                        const value = row[header];
                        return `<td class="${getCellClass(header, value)}">${formatValue(header, value)}</td>`;
                      })
                      .join("")}
                  </tr>
                `
              )
              .join("")}
          </tbody>
        </table>
      </body>
    </html>
  `;

  const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".xls") ? filename : `${filename}.xls`;
  link.click();
  URL.revokeObjectURL(url);
};
