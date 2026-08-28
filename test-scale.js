import { geoMercator } from "d3-geo";
import fs from "fs";

const geojson = JSON.parse(fs.readFileSync("apps/web/public/data/IDN_adm_1_provinsi.json"));
const projection = geoMercator().fitSize([1000, 800], geojson);
console.log("Scale:", projection.scale());
console.log("Center:", projection.invert(projection.translate()));
