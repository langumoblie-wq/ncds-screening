awk '
/          <span>ความเสี่ยง: \{riskFilter === "all" \? "ทั้งหมด" : riskFilter === "3a2s" \? "3อ. 2ส." : riskFilter\}<\/span>/ {
  print "          <span>ความเสี่ยง: {riskFilter === \"all\" ? \"ทั้งหมด\" : "
  print "                riskFilter === \"3a2s\" ? \"เสี่ยงสูง (3อ. 2ส.)\" : "
  print "                riskFilter === \"smoking\" ? \"สูบบุหรี่\" : "
  print "                riskFilter === \"alcohol\" ? \"ดื่มแอลกอฮอล์\" : "
  print "                riskFilter === \"food\" ? \"อาหาร (หวาน/มัน/เค็ม)\" : "
  print "                riskFilter === \"exercise\" ? \"ขาดการออกกำลังกาย\" : "
  print "                \"การนอนหลับ\"}</span>"
  next
}
1
' src/components/ProjectTracking.tsx > src/components/ProjectTracking.tsx.tmp && mv src/components/ProjectTracking.tsx.tmp src/components/ProjectTracking.tsx
