import XLSX from 'xlsx';
import { readFileSync, writeFileSync } from 'fs';

const wb = XLSX.readFile('C:\\Users\\Ryan Murray\\Downloads\\STARFORGE_Card_Collection.xlsx');

for (const name of wb.SheetNames) {
  console.log(`\n=== SHEET: ${name} ===`);
  const sheet = wb.Sheets[name];
  const data = XLSX.utils.sheet_to_csv(sheet);
  console.log(data);
  writeFileSync(`sheet_${name.replace(/[^a-zA-Z0-9]/g, '_')}.csv`, data);
}
