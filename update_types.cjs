const fs = require('fs');

let content = fs.readFileSync('src/types.ts', 'utf-8');

// Update LOCATION_DATA for หมู่บ้าน -> ละงู -> เขาขาว
content = content.replace(
  'เขาขาว: ["ม.6 ทุ่งเกาะปราบ"],',
  'เขาขาว: ["ม.1 บ้านสันติสุข"],'
);

// Update LOCATION_DATA for ตำบล -> ละงู -> เขาขาว
content = content.replace(
  'เขาขาว: ["ม.1 สันติสุข", "ม.4 บ้านนาข่าเหนือ", "ม.7 บ้านนาข่าใต้"],',
  'เขาขาว: ["ม.5 ดาหลำ", "ม.6 ทุ่งเกาะปราบ", "ม.7 นาข่าใต้"],'
);

// Update DISTRICT_TARGET_AREAS
// Replace specific old ones with new ones in the list if they are unique
content = content.replace('"ม.6 ทุ่งเกาะปราบ",', '"ม.1 บ้านสันติสุข",');
content = content.replace('"ม.1 สันติสุข",\n    "ม.4 บ้านนาข่าเหนือ",\n    "ม.7 บ้านนาข่าใต้",', '"ม.5 ดาหลำ",\n    "ม.6 ทุ่งเกาะปราบ",\n    "ม.7 นาข่าใต้",');

// Update DISTRICT_SUBDISTRICT_MAP
content = content.replace(
  '"ม.6 ทุ่งเกาะปราบ",\n      "ม.1 สันติสุข",\n      "ม.4 บ้านนาข่าเหนือ",\n      "ม.7 บ้านนาข่าใต้",',
  '"ม.1 บ้านสันติสุข",\n      "ม.5 ดาหลำ",\n      "ม.6 ทุ่งเกาะปราบ",\n      "ม.7 นาข่าใต้",'
);

fs.writeFileSync('src/types.ts', content);
