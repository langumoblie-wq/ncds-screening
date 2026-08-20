const fs = require('fs');
let content = fs.readFileSync('src/types.ts', 'utf-8');

// We know line 110 is exactly:
//       เขาขาว: ["ม.5 ดาหลำ", "ม.1 บ้านสันติสุข", "ม.7 นาข่าใต้"],
content = content.replace(
  'เขาขาว: ["ม.5 ดาหลำ", "ม.1 บ้านสันติสุข", "ม.7 นาข่าใต้"],',
  'เขาขาว: ["ม.5 ดาหลำ", "ม.6 ทุ่งเกาะปราบ", "ม.7 นาข่าใต้"],'
);

// We should fix DISTRICT_TARGET_AREAS and DISTRICT_SUBDISTRICT_MAP to match
// the list is:
/*
    "ม.1 บ้านควนไสน",
    "ม.5 ดาหลำ",
    "ม.6 ทุ่งเกาะปราบ",
    "ม.7 นาข่าใต้",
*/
content = content.replace(
  '"ม.5 ดาหลำ",\n    "ม.6 ทุ่งเกาะปราบ",\n    "ม.7 นาข่าใต้",',
  '"ม.1 บ้านสันติสุข",\n    "ม.5 ดาหลำ",\n    "ม.6 ทุ่งเกาะปราบ",\n    "ม.7 นาข่าใต้",'
);

fs.writeFileSync('src/types.ts', content);
