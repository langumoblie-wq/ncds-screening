awk '
/const stats = useMemo/ {
  in_stats = 1
  print $0
  next
}
in_stats && /const grouped: Record<string, \{/ {
  print $0
  print "      modelType: string;"
  print "      district: string;"
  print "      area: string;"
  print "      uniquePatients: Set<string>;"
  print "      totalVisits: number;"
  print "      records: ScreeningRecord[];"
  print "    }> = {};"
  in_grouped_type = 1
  next
}
in_stats && in_grouped_type && /    }> = {};/ {
  in_grouped_type = 0
  next
}
in_stats && in_grouped_type && !/}> = {};/ {
  next
}
in_stats && /          uniquePatients: new Set\(\),/ {
  print $0
  print "          totalVisits: 0,"
  print "          records: []"
  in_grouped_init = 1
  next
}
in_stats && in_grouped_init && /          totalVisits: 0/ {
  in_grouped_init = 0
  next
}
in_stats && /      grouped\[key\].totalVisits \+= 1;/ {
  print $0
  print "      grouped[key].records.push(r);"
  next
}
in_stats && /    let result = Object.entries\(grouped\).map/ {
  print $0
  in_map = 1
  next
}
in_stats && in_map && /      const target = targets\[key\] || 0;/ {
  print $0
  print "      const achieved = data.uniquePatients.size;"
  print "      const percent = target > 0 ? (achieved / target) * 100 : 0;"
  print ""
  print "      const visitBreakdown: Record<number, Set<string>> = {};"
  print "      const nameCounts: Record<string, number> = {};"
  print "      const duplicates: {name: string, count: number, visits: number[]}[] = [];"
  print ""
  print "      data.records.forEach(r => {"
  print "        const vNum = r.visitNumber || 1;"
  print "        if (!visitBreakdown[vNum]) visitBreakdown[vNum] = new Set();"
  print "        if (r.name) {"
  print "          visitBreakdown[vNum].add(r.name);"
  print "          nameCounts[r.name] = (nameCounts[r.name] || 0) + 1;"
  print "        }"
  print "      });"
  print ""
  print "      for (const [name, count] of Object.entries(nameCounts)) {"
  print "        if (count > 1) {"
  print "          const personVisits = data.records.filter(r => r.name === name).map(r => r.visitNumber || 1).sort((a,b)=>a-b);"
  print "          duplicates.push({ name, count, visits: personVisits });"
  print "        }"
  print "      }"
  print ""
  print "      const visits = Object.entries(visitBreakdown).map(([v, s]) => ({"
  print "        visitNumber: parseInt(v),"
  print "        count: s.size,"
  print "        percent: target > 0 ? (s.size / target) * 100 : 0"
  print "      })).sort((a, b) => a.visitNumber - b.visitNumber);"
  in_map_body = 1
  next
}
in_stats && in_map_body && /      const achieved =/ { next }
in_stats && in_map_body && /      const percent =/ { next }
in_stats && in_map_body && /      return \{/ {
  print $0
  print "        key,"
  print "        ...data,"
  print "        achieved,"
  print "        target,"
  print "        percent: Math.min(percent, 100),"
  print "        realPercent: percent,"
  print "        visitsBreakdown: visits,"
  print "        duplicates"
  print "      };"
  in_map_ret = 1
  next
}
in_stats && in_map_ret && /      \};/ {
  in_map_body = 0
  in_map = 0
  in_map_ret = 0
  next
}
in_stats && in_map_ret && !/      \};/ {
  next
}
in_stats && /  \}, \[records, targets, modelFilter, districtFilter\]\);/ {
  print $0
  in_stats = 0
  next
}
1
' src/components/ProjectTracking.tsx > src/components/ProjectTracking.tsx.tmp && mv src/components/ProjectTracking.tsx.tmp src/components/ProjectTracking.tsx
