awk '
/          \{\/\* Risk Level Selector \*\/\}/ {
  print "          {/* Behavior Risk Selector (3อ. 2ส.) */}"
  print "          <select "
  print "            value={filterBehaviorRisk} "
  print "            onChange={(e) => setFilterBehaviorRisk(e.target.value)}"
  print "            className=\"text-xs border border-slate-300 rounded-xl px-3 py-3 bg-white outline-none focus:ring-2 focus:ring-blue-500 shrink-0 font-semibold text-slate-700\""
  print "          >"
  print "            <option value=\"\">แสดงทุกพฤติกรรมเสี่ยง</option>"
  print "            <option value=\"food\">อาหาร (กินหวาน/มัน/เค็มจัด)</option>"
  print "            <option value=\"exercise\">การออกกำลังกาย (ไม่ออกเลย)</option>"
  print "            <option value=\"sleep\">การนอนหลับ (พักผ่อนไม่เพียงพอ)</option>"
  print "            <option value=\"smoking\">สูบบุหรี่ (ยังสูบอยู่)</option>"
  print "            <option value=\"alcohol\">ดื่มแอลกอฮอล์ (ดื่มเป็นประจำ/ครั้งคราว)</option>"
  print "          </select>"
  print ""
  print $0
  next
}
1
' src/components/NcdDashboard.tsx > src/components/NcdDashboard.tsx.tmp && mv src/components/NcdDashboard.tsx.tmp src/components/NcdDashboard.tsx
