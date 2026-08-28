const fs = require('fs');
const geo = JSON.parse(fs.readFileSync('apps/web/public/data/IDN_adm_1_provinsi.json'));
let minX = 180, maxX = -180, minY = 90, maxY = -90;
const flatten = (arr) => {
  if (typeof arr[0] === 'number') {
    if (arr[0] < minX) minX = arr[0];
    if (arr[0] > maxX) maxX = arr[0];
    if (arr[1] < minY) minY = arr[1];
    if (arr[1] > maxY) maxY = arr[1];
  } else if (Array.isArray(arr)) {
    arr.forEach(flatten);
  }
}
geo.features.forEach(f => flatten(f.geometry.coordinates));
console.log([minX, minY, maxX, maxY]);
