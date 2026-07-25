awk '
/const \[filterRiskLevel, setFilterRiskLevel\] = useState<string>\(""\);/ {
  print "  const [filterHtRisk, setFilterHtRisk] = useState<string[]>([]);"
  print "  const [filterDmRisk, setFilterDmRisk] = useState<string[]>([]);"
  print "  const [isHtDropdownOpen, setIsHtDropdownOpen] = useState(false);"
  print "  const [isDmDropdownOpen, setIsDmDropdownOpen] = useState(false);"
  next
}
/const matchesRisk = filterRiskLevel \? rLevel === filterRiskLevel : true;/ {
  print "        const matchesHtRisk = filterHtRisk.length > 0 ? filterHtRisk.includes(htLevel) : true;"
  print "        const matchesDmRisk = filterDmRisk.length > 0 ? filterDmRisk.includes(dmLevel) : true;"
  next
}
/const htLevel = r.htResult\?.level \|\| "normal";/ {
  print $0
  next
}
/const dmLevel = r.dmResult\?.level \|\| "normal";/ {
  print $0
  next
}
/let rLevel = "normal";/ { next }
/if \(htLevel === "danger" \|\| dmLevel === "danger"\) {/ { next }
/rLevel = "danger";/ { next }
/} else if \(htLevel === "risk" \|\| dmLevel === "risk"\) {/ { next }
/rLevel = "risk";/ { next }
1
' src/components/NcdDashboard.tsx > src/components/NcdDashboard.tsx.tmp && mv src/components/NcdDashboard.tsx.tmp src/components/NcdDashboard.tsx
