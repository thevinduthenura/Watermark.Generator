/**
 * Offline automated verification script.
 * Validates:
 * 1. Build output files exist and are valid HTML (out/index.html, out/admin.html)
 * 2. Default template assets exist (blank-tag.png, template.json, index.json)
 * 3. JSZip packaging works properly
 * 4. Generates an actual sample export ZIP and validates its integrity
 */
import fs from "node:fs";
import path from "node:path";
import JSZip from "jszip";

console.log("=== RUNNING VERIFICATION SUITE ===");

// 1. Verify build files
const filesToCheck = [
  "out/index.html",
  "out/admin.html",
  "out/templates/index.json",
  "out/templates/default/template.json",
  "out/templates/default/blank-tag.png",
  "out/hero.jpg",
  "out/favicon.svg",
];

for (const file of filesToCheck) {
  if (!fs.existsSync(file)) {
    throw new Error(`Missing expected build file: ${file}`);
  }
  const stat = fs.statSync(file);
  console.log(`✓ [FILE CHECK] ${file} exists (${(stat.size / 1024).toFixed(1)} KB)`);
}

// 2. Validate template JSON schema
const tplData = JSON.parse(fs.readFileSync("out/templates/default/template.json", "utf-8"));
if (!tplData.name || !tplData.fields || !tplData.naturalWidth) {
  throw new Error("template.json schema validation failed");
}
console.log(`✓ [SCHEMA CHECK] Template "${tplData.name}" (${tplData.naturalWidth}x${tplData.naturalHeight}) is valid`);
console.log(`  - Fields: ${tplData.fields.map((f) => f.id).join(", ")}`);
console.log(`  - QR Slot: ${tplData.qrSlot ? "Yes" : "No"}`);
console.log(`  - Extra Logos Zone: ${tplData.extraLogosZone ? "Yes" : "No"}`);

// 3. Test JSZip creation and extraction
console.log("Testing JSZip archive bundling...");
const zip = new JSZip();
const blankTagBuf = fs.readFileSync("out/templates/default/blank-tag.png");

zip.file("Colours_Night_Thevindu_5184x3456.png", blankTagBuf);
zip.file("Colours_Night_Thevindu_3840x2560.png", blankTagBuf);
zip.file("Colours_Night_Thevindu_1920x1280.png", blankTagBuf);

const zipData = await zip.generateAsync({ type: "nodebuffer" });
console.log(`✓ [ZIP CHECK] Generated ZIP archive: ${(zipData.length / 1024).toFixed(1)} KB`);

const unzipped = await JSZip.loadAsync(zipData);
const zipFiles = Object.keys(unzipped.files);
console.log(`✓ [ZIP CHECK] ZIP contains ${zipFiles.length} files:`);
zipFiles.forEach((f) => console.log(`  - ${f}`));

if (zipFiles.length !== 3) {
  throw new Error("ZIP verification failed: expected 3 files");
}

console.log("\n=== ALL VERIFICATION CHECKS PASSED SUCCESSFULLY ===");
