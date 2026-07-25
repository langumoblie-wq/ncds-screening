awk '
/\{\(filterModel \|\| filterDistrict \|\| filterSubdistrict \|\| filterTargetArea\) && \(/ {
  print "          <div className=\"flex items-center gap-2\">"
  print "            <button "
  print "              onClick={() => window.print()}"
  print "              className=\"text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5\""
  print "            >"
  print "              <Printer className=\"w-4 h-4\" />"
  print "              พิมพ์รายงาน"
  print "            </button>"
  print $0
  next
}
/<div className=\"space-y-6\">/ {
  print $0
  print "      {/* Print Header (hidden on screen) */}"
  print "      <div className=\"hidden print:block text-center space-y-2 pb-6 border-b border-slate-200 mb-6\">"
  print "        <h2 className=\"text-2xl font-black text-slate-800\">รายงานสรุปผลการวิเคราะห์ NCDs และพฤติกรรมเสี่ยง</h2>"
  print "        <p className=\"text-slate-600 font-medium\">"
  print "          ข้อมูล ณ วันที่ {new Date().toLocaleDateString(\"th-TH\", { year: \"numeric\", month: \"long\", day: \"numeric\" })}"
  print "        </p>"
  print "        <div className=\"text-sm text-slate-500 flex items-center justify-center gap-4 mt-2\">"
  print "          <span>โมเดล: {filterModel || \"ทั้งหมด\"}</span>"
  print "          <span>อำเภอ: {filterDistrict ? `อ.${filterDistrict}` : \"ทั้งหมด\"}</span>"
  print "          <span>ตำบล: {filterSubdistrict ? `ต.${filterSubdistrict}` : \"ทั้งหมด\"}</span>"
  print "        </div>"
  print "      </div>"
  next
}
/      <div className=\"bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4\">/ {
  print "      {/* 1. Header Filter Card */}"
  print "      <div className=\"bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4 print:hidden\">"
  next
}
/ล้างตัวกรองทั้งหมด/ {
  print $0
  print "          </div>"
  next
}
1
' src/components/NcdAnalyticsDashboard.tsx > src/components/NcdAnalyticsDashboard.tsx.tmp && mv src/components/NcdAnalyticsDashboard.tsx.tmp src/components/NcdAnalyticsDashboard.tsx
