awk '
/  const \[districtFilter, setDistrictFilter\] = useState<string>\("all"\);/ {
  print $0
  print "  const [riskFilter, setRiskFilter] = useState<string>(\"all\");"
  next
}
/  const stats = useMemo\(\(\) => \{/ {
  print $0
  in_stats_start = 1
  next
}
in_stats_start && /    const grouped: Record<string/ {
  print "    let filteredRecords = records;"
  print "    if (riskFilter !== \"all\") {"
  print "      filteredRecords = records.filter(r => {"
  print "        const smoking = r.smoking?.includes(\"สูบอยู่\") || r.smoking?.includes(\"ประจำ\");"
  print "        const alcohol = r.alcohol?.includes(\"ประจำ\") || r.alcohol?.includes(\"ครั้งคราว\");"
  print "        const exercise = r.exercise?.includes(\"ไม่ออก\") || r.exercise?.includes(\"นั่งนิ่ง\");"
  print "        const sleep = r.sleep?.includes(\"น้อยกว่า 6\") || r.sleep?.includes(\"ไม่เพียงพอ\");"
  print "        const food = [\"เสี่ยงสูง\", \"เสี่ยงสูงมาก\"].includes(r.foodHabit?.sweet?.level || \"\") ||"
  print "                     [\"เสี่ยงสูง\", \"เสี่ยงสูงมาก\"].includes(r.foodHabit?.fat?.level || \"\") ||"
  print "                     [\"เสี่ยงสูง\", \"เสี่ยงสูงมาก\"].includes(r.foodHabit?.salt?.level || \"\");"
  print "        "
  print "        switch (riskFilter) {"
  print "          case \"3a2s\": return smoking || alcohol || exercise || sleep || food;"
  print "          case \"smoking\": return smoking;"
  print "          case \"alcohol\": return alcohol;"
  print "          case \"exercise\": return exercise;"
  print "          case \"food\": return food;"
  print "          case \"sleep\": return sleep;"
  print "          default: return true;"
  print "        }"
  print "      });"
  print "    }"
  print ""
  print $0
  in_stats_start = 0
  next
}
/    records.forEach\(r => \{/ {
  print "    filteredRecords.forEach(r => {"
  next
}
/  \}, \[records, targets, modelFilter, districtFilter\]\);/ {
  print "  }, [records, targets, modelFilter, districtFilter, riskFilter]);"
  next
}
/          <span>อำเภอ: \{districtFilter === "all" \? "ทั้งหมด" : \`อ.\$\{districtFilter\}\`\}<\/span>/ {
  print $0
  print "          <span>ความเสี่ยง: {riskFilter === \"all\" ? \"ทั้งหมด\" : riskFilter === \"3a2s\" ? \"3อ. 2ส.\" : riskFilter}</span>"
  next
}
/        <select / && !in_select {
  in_select = 1
  print "        <select "
  print "          value={riskFilter}"
  print "          onChange={(e) => setRiskFilter(e.target.value)}"
  print "          className=\"bg-slate-50 border border-slate-200 text-sm font-semibold rounded-xl px-4 py-2 text-slate-700 outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all\""
  print "        >"
  print "          <option value=\"all\">ทุกกลุ่มพฤติกรรม</option>"
  print "          <option value=\"3a2s\">เสี่ยงสูง (3อ. 2ส.)</option>"
  print "          <option value=\"smoking\">เสี่ยง: สูบบุหรี่</option>"
  print "          <option value=\"alcohol\">เสี่ยง: ดื่มแอลกอฮอล์</option>"
  print "          <option value=\"food\">เสี่ยง: อาหาร (หวาน/มัน/เค็ม)</option>"
  print "          <option value=\"exercise\">เสี่ยง: ขาดการออกกำลังกาย</option>"
  print "          <option value=\"sleep\">เสี่ยง: การนอนหลับ</option>"
  print "        </select>"
  print ""
  print $0
  next
}
1
' src/components/ProjectTracking.tsx > src/components/ProjectTracking.tsx.tmp && mv src/components/ProjectTracking.tsx.tmp src/components/ProjectTracking.tsx
