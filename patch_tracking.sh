awk '
/    <div className=\"space-y-6\">/ {
  print $0
  print "      {/* Print Header (hidden on screen) */}"
  print "      <div className=\"hidden print:block text-center space-y-2 pb-6 border-b border-slate-200 mb-6\">"
  print "        <h2 className=\"text-2xl font-black text-slate-800\">รายงานสรุปผลและการติดตามโครงการ (Project Tracking)</h2>"
  print "        <p className=\"text-slate-600 font-medium\">"
  print "          ข้อมูล ณ วันที่ {new Date().toLocaleDateString(\"th-TH\", { year: \"numeric\", month: \"long\", day: \"numeric\" })}"
  print "        </p>"
  print "        <div className=\"text-sm text-slate-500 flex items-center justify-center gap-4 mt-2\">"
  print "          <span>โมเดล: {modelFilter === \"all\" ? \"ทั้งหมด\" : modelFilter}</span>"
  print "          <span>อำเภอ: {districtFilter === \"all\" ? \"ทั้งหมด\" : `อ.${districtFilter}`}</span>"
  print "        </div>"
  print "      </div>"
  next
}
/<div className=\"bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row gap-8 items-center justify-between\">/ {
  print "      <div className=\"bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row gap-8 items-center justify-between print:hidden\">"
  next
}
/<div className=\"bg-white p-4 rounded-2xl border border-slate-200 flex flex-wrap gap-4 items-center\">/ {
  print "      <div className=\"bg-white p-4 rounded-2xl border border-slate-200 flex flex-wrap gap-4 items-center print:hidden\">"
  next
}
/        <div className=\"flex gap-4 md:gap-8 w-full md:w-auto\">/ {
  print "        <div className=\"flex items-center gap-4 md:gap-8 w-full md:w-auto\">"
  print "          <button "
  print "            onClick={() => window.print()}"
  print "            className=\"hidden md:flex text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-xl transition-colors cursor-pointer items-center gap-2\""
  print "          >"
  print "            <Printer className=\"w-4 h-4\" />"
  print "            พิมพ์รายงาน"
  print "          </button>"
  next
}
1
' src/components/ProjectTracking.tsx > src/components/ProjectTracking.tsx.tmp && mv src/components/ProjectTracking.tsx.tmp src/components/ProjectTracking.tsx
