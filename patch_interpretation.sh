awk '
/    return \{/ {
  print "    const bmiOverweightTotal = stats.bmiStats.overweight + stats.bmiStats.obese1 + stats.bmiStats.obese2;"
  print "    const bmiOverweightPct = Math.round((bmiOverweightTotal / total) * 100);"
  print ""
  print $0
  next
}
/      topBehavior/ {
  print $0
  print ","
  print "      bmiOverweightTotal,"
  print "      bmiOverweightPct"
  next
}
1
' src/components/NcdDashboard.tsx > src/components/NcdDashboard.tsx.tmp && mv src/components/NcdDashboard.tsx.tmp src/components/NcdDashboard.tsx
