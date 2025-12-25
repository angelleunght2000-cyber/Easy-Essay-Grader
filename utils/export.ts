
import { EssayResult } from "../types";

export const exportToCSV = (results: EssayResult[]) => {
  const headers = ["Document Name", "Score", "Reason", "Summary", "Timestamp"];
  const rows = results.map(r => [
    `"${r.fileName}"`,
    r.score,
    `"${r.reason.replace(/"/g, '""')}"`,
    `"${r.summary.replace(/"/g, '""')}"`,
    new Date(r.timestamp).toLocaleString()
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map(e => e.join(","))
  ].join("\n");

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `essay_scores_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
