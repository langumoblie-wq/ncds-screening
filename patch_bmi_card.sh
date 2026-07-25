awk '
/          \{\/\* Core Insights Summary Cards \*\/\}/ {
  print $0
  print "          <div className=\"grid grid-cols-1 lg:grid-cols-3 gap-4\">"
  in_grid = 1
  next
}
in_grid && /          <div className=\"grid grid-cols-1 md:grid-cols-2 gap-4\">/ {
  in_grid = 0
  next
}
/              \{\/\* Strategic Warnings \*\/\}/ {
  print $0
  next
}
/              \{\interpretation\.topBehavior && interpretation\.topBehavior\.count > 0 && \(/ {
  in_topbehavior = 1
}
in_topbehavior && /                <\/div>/ {
  print $0
  print "              )}"
  print "            </div>"
  print ""
  print "            {/* BMI Analysis */}"
  print "            <div className=\"bg-gradient-to-br from-indigo-50/50 to-blue-50/50 p-4 rounded-xl border border-indigo-200/60 flex flex-col justify-between\">"
  print "              <div className=\"space-y-3.5\">"
  print "                <div className=\"flex items-center gap-1.5 text-indigo-850 font-bold text-xs\">"
  print "                  <span className=\"bg-indigo-100 text-indigo-700 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black font-mono\">C</span>"
  print "                  <span>ภาวะโภชนาการและดัชนีมวลกาย (BMI Analysis)</span>"
  print "                </div>"
  print "                "
  print "                <div className=\"space-y-2.5 text-xs text-slate-600 leading-relaxed font-semibold\">"
  print "                  {interpretation.bmiOverweightTotal > 0 ? ("
  print "                    <div className=\"flex items-start gap-2\">"
  print "                      <Activity className=\"w-4.5 h-4.5 text-indigo-500 shrink-0 mt-0.5\" />"
  print "                      <div>"
  print "                        <span><strong>อัตราน้ำหนักเกินเกณฑ์:</strong> ประชากรกลุ่มเสี่ยงที่มีภาวะท้วม อ้วน หรืออ้วนมาก มีจำนวน <strong className=\"text-indigo-700\">{interpretation.bmiOverweightTotal}</strong> ราย หรือคิดเป็น <strong className=\"text-indigo-700 text-sm font-black font-mono\">{interpretation.bmiOverweightPct}%</strong> ของจำนวนผู้คัดกรองทั้งหมด ซึ่งเป็นปัจจัยเสี่ยงโดยตรงต่อโรคความดันโลหิตและเบาหวาน</span>"
  print "                      </div>"
  print "                    </div>"
  print "                  ) : ("
  print "                    <div className=\"flex items-start gap-2\">"
  print "                      <CheckCircle2 className=\"w-4.5 h-4.5 text-emerald-500 shrink-0 mt-0.5\" />"
  print "                      <div>"
  print "                        <span><strong>ภาวะโภชนาการดี:</strong> ประชากรในกลุ่มที่คัดกรองส่วนใหญ่อยู่ในเกณฑ์มาตรฐาน ไม่พบกลุ่มภาวะน้ำหนักเกินในระดับที่ต้องเฝ้าระวัง</span>"
  print "                      </div>"
  print "                    </div>"
  print "                  )}"
  print "                </div>"
  print "              </div>"
  print ""
  print "              {interpretation.bmiOverweightPct >= 30 && ("
  print "                <div className=\"mt-3 text-[10px] bg-white border border-indigo-200 text-indigo-850 p-2.5 rounded-xl font-bold flex items-center gap-1.5 leading-tight\">"
  print "                  <span className=\"shrink-0 bg-indigo-500 text-white text-[9px] px-1.5 py-0.5 rounded font-black font-mono\">แนวทางจัดกิจกรรม</span>"
  print "                  <span>ควรจัดกิจกรรมปรับพฤติกรรมการกิน (ลดหวาน/มัน/เค็ม) ควบคู่กับการส่งเสริมการออกกำลังกายชุมชน</span>"
  print "                </div>"
  print "              )}"
  print "            </div>"
  in_topbehavior = 0
  next
}
in_topbehavior && /              \)}/ {
  next
}
in_topbehavior && /            <\/div>/ {
  next
}
1
' src/components/NcdDashboard.tsx > src/components/NcdDashboard.tsx.tmp && mv src/components/NcdDashboard.tsx.tmp src/components/NcdDashboard.tsx
