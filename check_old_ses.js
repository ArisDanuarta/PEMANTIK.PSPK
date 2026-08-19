const XLSX = require('xlsx');
const wb = XLSX.readFile('migrate/input/data hasil ujian kkn ugm.xlsx');
const ws = wb.Sheets[wb.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(ws);
console.log("Sample SES:", rows.slice(0, 5).map(r => ({ nama: r.nama_siswa, SES: r.SES, ayah: r.pendidikan_ayah })));
