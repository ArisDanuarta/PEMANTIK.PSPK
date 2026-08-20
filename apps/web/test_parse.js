const XLSX = require('xlsx');
const wb = XLSX.readFile('src/app/data_ujicoba_migrasi_UNESA.xlsx', { cellDates: true });
const sheet = wb.Sheets[wb.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(sheet, { defval: null, raw: false });
console.log("Keys of first row:");
console.log(Object.keys(rows[0]));
console.log("\nValue of kolom_data:", rows[0].kolom_data);
console.log("Value of id_user:", rows[0].id_user);
