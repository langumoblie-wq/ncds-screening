awk '
/<\/motion.div>/ {
  print $0
  if (in_analytics) {
    print "            )}"
    print "            {activeTab === \"tracking\" && ("
    print "              <motion.div"
    print "                key=\"tracking-view\""
    print "                initial={{ opacity: 0, y: 15 }}"
    print "                animate={{ opacity: 1, y: 0 }}"
    print "                exit={{ opacity: 0, y: -15 }}"
    print "                transition={{ duration: 0.25 }}"
    print "              >"
    print "                <ProjectTracking records={records} />"
    print "              </motion.div>"
    in_analytics = 0
  }
  next
}
/<NcdAnalyticsDashboard records={records} \/>/ {
  in_analytics = 1
  print $0
  next
}
1
' src/App.tsx > src/App.tsx.tmp && mv src/App.tsx.tmp src/App.tsx
