const XLSX = require("xlsx");
const fs = require("fs");
const wb = XLSX.readFile("src/app/data_asesmen_hasil_export.xlsx");
const sheet = wb.Sheets[wb.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(sheet, { defval: null });

let literasiSessions = 0;
let numerasiSessions = 0;

for (const row of rows) {
  let hasLiterasi = false;
  let hasNumerasi = false;
  
  for (const key of Object.keys(row)) {
    if (key.match(/^[L]\d+_/i) && row[key] !== null && row[key] !== "") {
      hasLiterasi = true;
    }
    if (key.match(/^[N]\d+_/i) && row[key] !== null && row[key] !== "") {
      hasNumerasi = true;
    }
  }
  
  if (hasLiterasi) literasiSessions++;
  if (hasNumerasi) numerasiSessions++;
}

console.log(`Total Rows: ${rows.length}`);
console.log(`Literasi Sessions: ${literasiSessions}`);
console.log(`Numerasi Sessions: ${numerasiSessions}`);
