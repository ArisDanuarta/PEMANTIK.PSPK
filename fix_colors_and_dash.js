const fs = require('fs');
const path = require('path');

const targetDirs = [
  path.join(__dirname, 'apps/web/src'),
  path.join(__dirname, 'apps/mobile/pemantik_mobile/lib')
];

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else { 
      if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.dart') || file.endsWith('.css')) {
        results.push(file);
      }
    }
  });
  return results;
}

let modifiedFiles = 0;

const grayHexes = [
  'adb5bd', '6c757d', '495057', 'dee2e6', 'ced4da', 'e9ecef', 'f8f9fa',
  '343a40', '212529' // These are very dark grays, but let's change to black as requested.
];

const grayHexPattern = new RegExp(`color:\\s*['"]#(${grayHexes.join('|')})['"]`, 'gi');
const grayHexWithSelectedPattern = /color:\s*isSelected\s*\?\s*['"][^'"]+['"]\s*:\s*['"]#([a-fA-F0-9]{6}|[a-fA-F0-9]{3})['"]/g;

for (const dir of targetDirs) {
  if (!fs.existsSync(dir)) continue;
  const files = walk(dir);
  for (const file of files) {
    const original = fs.readFileSync(file, 'utf8');
    let content = original;

    if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      content = content.replace(grayHexPattern, 'color: "black"');
      
      // Also handle `color: isSelected ? "#1a1a2e" : "#495057"`
      content = content.replace(grayHexWithSelectedPattern, (match, p1) => {
        if (grayHexes.includes(p1.toLowerCase()) || p1.toLowerCase() === '6c757d' || p1.toLowerCase() === '495057') {
           return match.replace(`#${p1}`, 'black');
        }
        return match;
      });
    }

    if (original !== content) {
      fs.writeFileSync(file, content, 'utf8');
      console.log('Modified:', file);
      modifiedFiles++;
    }
  }
}

console.log('Total files modified:', modifiedFiles);
