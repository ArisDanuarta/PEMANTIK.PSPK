const fs = require('fs');
const file = 'apps/web/src/app/api/export/detailed-results/route.ts';
let code = fs.readFileSync(file, 'utf8');

const target = `.eq("category_id", category_id)\n      .eq("is_void", false);`;
const replacement = `.eq("is_void", false);
    if (category_id !== "all") {
      sessQuery = sessQuery.eq("category_id", category_id);
    }`;

if (code.includes(target)) {
  code = code.replace(target, replacement);
  fs.writeFileSync(file, code);
  console.log("Fixed detailed-results fallback query!");
} else {
  console.log("Could not find target string");
}
