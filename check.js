const fs = require('fs');
const code = fs.readFileSync('apps/web/src/app/super-admin/pengaturan/page.tsx', 'utf8');
const lines = code.split('\n');

let openCount = 0;
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const opens = (line.match(/<div/g) || []).length;
  const closes = (line.match(/<\/div>/g) || []).length;
  openCount += opens - closes;
  if (i >= 135 && i <= 145) {
    console.log(`Line ${i + 1} (${line.trim()}): ${openCount}`);
  }
}
