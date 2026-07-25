awk '
/  const \[filterRiskLevel, setFilterRiskLevel\] = useState<string>\(\"\"\);/ {
  print $0
  print "  const [filterBehaviorRisk, setFilterBehaviorRisk] = useState<string>(\"\");"
  next
}
/        const matchesRisk = filterRiskLevel \? rLevel === filterRiskLevel : true;/ {
  print $0
  print ""
  print "        // Behavior Risk Filter (3อ. 2ส.)"
  print "        let matchesBehavior = true;"
  print "        if (filterBehaviorRisk) {"
  print "          if (filterBehaviorRisk === \"food\") {"
  print "            matchesBehavior = (r.foodHabit?.sweet?.level === \"เสี่ยงสูงมาก\" || r.foodHabit?.sweet?.level === \"เสี่ยงสูง\" || r.foodHabit?.fat?.level === \"เสี่ยงสูงมาก\" || r.foodHabit?.fat?.level === \"เสี่ยงสูง\" || r.foodHabit?.salt?.level === \"เสี่ยงสูงมาก\" || r.foodHabit?.salt?.level === \"เสี่ยงสูง\" || r.sodium?.includes(\"เค็มประจำ\"));"
  print "          } else if (filterBehaviorRisk === \"exercise\") {"
  print "            matchesBehavior = (r.exercise?.includes(\"ไม่ออก\") || r.exercise?.includes(\"นั่งนิ่ง\"));"
  print "          } else if (filterBehaviorRisk === \"sleep\") {"
  print "            matchesBehavior = (r.sleep?.includes(\"น้อยกว่า 6\") || r.sleep?.includes(\"ไม่เพียงพอ\"));"
  print "          } else if (filterBehaviorRisk === \"smoking\") {"
  print "            matchesBehavior = (r.smoking?.includes(\"สูบอยู่\") || r.smoking?.includes(\"ประจำ\"));"
  print "          } else if (filterBehaviorRisk === \"alcohol\") {"
  print "            matchesBehavior = (r.alcohol?.includes(\"ประจำ\") || r.alcohol?.includes(\"ครั้งคราว\"));"
  print "          }"
  print "        }"
  next
}
/        return matchesSearch && matchesModel && matchesDistrict && matchesSubdistrict && matchesTargetArea && matchesRisk;/ {
  print "        return matchesSearch && matchesModel && matchesDistrict && matchesSubdistrict && matchesTargetArea && matchesRisk && matchesBehavior;"
  next
}
/  }, \[records, searchTerm, filterModel, filterDistrict, filterSubdistrict, filterTargetArea, filterRiskLevel, sortBy, sortOrder\]\);/ {
  print "  }, [records, searchTerm, filterModel, filterDistrict, filterSubdistrict, filterTargetArea, filterRiskLevel, filterBehaviorRisk, sortBy, sortOrder]);"
  next
}
1
' src/components/NcdDashboard.tsx > src/components/NcdDashboard.tsx.tmp && mv src/components/NcdDashboard.tsx.tmp src/components/NcdDashboard.tsx
