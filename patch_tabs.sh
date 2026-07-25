awk '
/<span>วิเคราะห์ภาพรวม \(ปัญหา-ความสำเร็จ\)<\/span>/ {
  print $0
  print "              </button>"
  print "              <button"
  print "                onClick={() => setActiveTab(\"tracking\")}"
  print "                className={`px-4 py-2 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${"
  print "                  activeTab === \"tracking\""
  print "                    ? \"bg-indigo-50 text-indigo-700 shadow-2xs\""
  print "                    : \"text-slate-600 hover:bg-slate-100/70 hover:text-slate-900\""
  print "                }`}"
  print "              >"
  print "                <BarChart3 className=\"w-4 h-4\" />"
  print "                <span>ติดตามโครงการ</span>"
  next
}
1
' src/App.tsx > src/App.tsx.tmp && mv src/App.tsx.tmp src/App.tsx
