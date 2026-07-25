import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ScreeningRecord } from "../types";
import { Target, Users, Activity, Filter, Map, ChevronRight, BarChart3, Edit2, Check, AlertCircle, TrendingUp, Trophy, Printer } from "lucide-react";

interface ProjectTrackingProps {
  records: ScreeningRecord[];
}

export const ProjectTracking: React.FC<ProjectTrackingProps> = ({ records }) => {
  const [modelFilter, setModelFilter] = useState<string>("all");
  const [districtFilter, setDistrictFilter] = useState<string>("all");
  const [targets, setTargets] = useState<Record<string, number>>({});
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>("");

  useEffect(() => {
    const saved = localStorage.getItem("ncd_project_targets");
    if (saved) {
      try {
        setTargets(JSON.parse(saved));
      } catch (e) {}
    }
  }, []);

  const saveTarget = (key: string) => {
    const num = parseInt(editValue, 10);
    if (!isNaN(num) && num >= 0) {
      const newTargets = { ...targets, [key]: num };
      setTargets(newTargets);
      localStorage.setItem("ncd_project_targets", JSON.stringify(newTargets));
    }
    setEditingKey(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent, key: string) => {
    if (e.key === 'Enter') saveTarget(key);
    if (e.key === 'Escape') setEditingKey(null);
  };

  const startEdit = (key: string, currentTarget: number) => {
    setEditValue(currentTarget > 0 ? currentTarget.toString() : "");
    setEditingKey(key);
  };

  // Get distinct districts for filter
  const allDistricts = useMemo(() => {
    const d = new Set<string>();
    records.forEach(r => {
      if (r.district) d.add(r.district);
    });
    return Array.from(d).sort();
  }, [records]);

  const stats = useMemo(() => {
    // group by: modelType + district + area
    const grouped: Record<string, {
      modelType: string;
      district: string;
      area: string;
      uniquePatients: Set<string>;
      totalVisits: number;
    }> = {};

    records.forEach(r => {
      const area = (r.modelType === "หมู่บ้าน" ? r.targetArea : r.subdistrict) || "ไม่ระบุพื้นที่";
      const mType = r.modelType || "ไม่ระบุโมเดล";
      const dist = r.district || "ไม่ระบุอำเภอ";
      const key = `${mType}|${dist}|${area}`;
      
      if (!grouped[key]) {
        grouped[key] = {
          modelType: mType,
          district: dist,
          area: area,
          uniquePatients: new Set(),
          totalVisits: 0
        };
      }
      
      if (r.name) {
        grouped[key].uniquePatients.add(r.name);
      }
      grouped[key].totalVisits += 1;
    });

    let result = Object.entries(grouped).map(([key, data]) => {
      const target = targets[key] || 0;
      const achieved = data.uniquePatients.size;
      const percent = target > 0 ? (achieved / target) * 100 : 0;
      
      return {
        key,
        ...data,
        achieved,
        target,
        percent: Math.min(percent, 100), // cap at 100% for bar
        realPercent: percent // can be > 100%
      };
    });

    if (modelFilter !== "all") {
      result = result.filter(r => r.modelType === modelFilter);
    }
    if (districtFilter !== "all") {
      result = result.filter(r => r.district === districtFilter);
    }

    // Sort by progress descending, then by total visits
    result.sort((a, b) => {
      if (b.realPercent !== a.realPercent) return b.realPercent - a.realPercent;
      return b.totalVisits - a.totalVisits;
    });

    return result;
  }, [records, targets, modelFilter, districtFilter]);

  const overall = useMemo(() => {
    let totalTarget = 0;
    let totalAchieved = 0;
    let totalVisits = 0;

    stats.forEach(s => {
      totalTarget += s.target;
      totalAchieved += s.achieved;
      totalVisits += s.totalVisits;
    });

    return {
      target: totalTarget,
      achieved: totalAchieved,
      visits: totalVisits,
      percent: totalTarget > 0 ? (totalAchieved / totalTarget) * 100 : 0
    };
  }, [stats]);

  const getColorClass = (percent: number) => {
    if (percent >= 100) return "bg-emerald-500";
    if (percent >= 80) return "bg-teal-500";
    if (percent >= 50) return "bg-amber-400";
    return "bg-rose-500";
  };

  const getTextColorClass = (percent: number) => {
    if (percent >= 100) return "text-emerald-600";
    if (percent >= 80) return "text-teal-600";
    if (percent >= 50) return "text-amber-600";
    return "text-rose-600";
  };

  return (
    <div className="space-y-6">
      {/* Print Header (hidden on screen) */}
      <div className="hidden print:block text-center space-y-2 pb-6 border-b border-slate-200 mb-6">
        <h2 className="text-2xl font-black text-slate-800">รายงานสรุปผลและการติดตามโครงการ (Project Tracking)</h2>
        <p className="text-slate-600 font-medium">
          ข้อมูล ณ วันที่ {new Date().toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" })}
        </p>
        <div className="text-sm text-slate-500 flex items-center justify-center gap-4 mt-2">
          <span>โมเดล: {modelFilter === "all" ? "ทั้งหมด" : modelFilter}</span>
          <span>อำเภอ: {districtFilter === "all" ? "ทั้งหมด" : `อ.${districtFilter}`}</span>
        </div>
      </div>
      {/* Header & Overall Summary */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row gap-8 items-center justify-between print:hidden">
        <div>
          <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <Trophy className="w-6 h-6 text-indigo-500" />
            สรุปผลและการติดตามโครงการ
          </h2>
          <p className="text-sm text-slate-500 mt-1 font-semibold">
            ติดตามความก้าวหน้าการคัดกรองแยกตามโมเดลและพื้นที่เป้าหมาย
          </p>
        </div>

        <div className="flex items-center gap-4 md:gap-8 w-full md:w-auto">
          <button 
            onClick={() => window.print()}
            className="hidden md:flex text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-xl transition-colors cursor-pointer items-center gap-2"
          >
            <Printer className="w-4 h-4" />
            พิมพ์รายงาน
          </button>
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex-1 md:flex-none md:min-w-[140px]">
            <div className="flex items-center gap-1.5 text-slate-500 mb-1">
              <Users className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wider">คัดกรองแล้ว</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-slate-800">{overall.achieved}</span>
              <span className="text-xs text-slate-500 font-semibold">คน</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-1">ทั้งหมด {overall.visits} ครั้ง (visits)</div>
          </div>
          
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex-1 md:flex-none md:min-w-[140px]">
            <div className="flex items-center gap-1.5 text-slate-500 mb-1">
              <Target className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wider">เป้าหมายรวม</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-slate-800">{overall.target}</span>
              <span className="text-xs text-slate-500 font-semibold">คน</span>
            </div>
            <div className={`text-xs font-bold mt-1 ${getTextColorClass(overall.percent)}`}>
              คิดเป็น {overall.percent.toFixed(1)}%
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-wrap gap-4 items-center print:hidden">
        <div className="flex items-center gap-2 mr-4">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-sm font-bold text-slate-600">ตัวกรอง:</span>
        </div>
        
        <select 
          value={modelFilter}
          onChange={(e) => setModelFilter(e.target.value)}
          className="bg-slate-50 border border-slate-200 text-sm font-semibold rounded-xl px-4 py-2 text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
        >
          <option value="all">ทุกโมเดล</option>
          <option value="หมู่บ้าน">โมเดลหมู่บ้าน</option>
          <option value="ตำบล">โมเดลตำบล</option>
          <option value="ไม่ระบุโมเดล">ไม่ระบุโมเดล</option>
        </select>

        <select 
          value={districtFilter}
          onChange={(e) => setDistrictFilter(e.target.value)}
          className="bg-slate-50 border border-slate-200 text-sm font-semibold rounded-xl px-4 py-2 text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
        >
          <option value="all">ทุกอำเภอ</option>
          {allDistricts.map(d => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
      </div>

      {/* Detail Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden print:overflow-visible">
        <div className="overflow-x-auto print:overflow-visible">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">พื้นที่เป้าหมาย (Area)</th>
                <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">โมเดล / อำเภอ</th>
                <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">ยอดคัดกรอง (คน)</th>
                <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">จำนวนครั้ง (Visits)</th>
                <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">เป้าหมาย (คน)</th>
                <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider w-1/4 min-w-[200px]">ความก้าวหน้า</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <AnimatePresence>
                {stats.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400 font-semibold text-sm">
                      ไม่มีข้อมูลที่ตรงกับเงื่อนไขการค้นหา
                    </td>
                  </tr>
                )}
                {stats.map((s, idx) => (
                  <motion.tr 
                    key={s.key}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="hover:bg-slate-50/50 transition-colors"
                  >
                    <td className="py-4 px-6">
                      <div className="font-bold text-slate-800 text-sm">{s.area}</div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex flex-col gap-1">
                        <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md w-fit">
                          {s.modelType}
                        </span>
                        <span className="text-xs text-slate-500 font-semibold">{s.district}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <span className="text-lg font-black text-slate-800">{s.achieved}</span>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <span className="text-sm font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
                        {s.totalVisits}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-center">
                      {editingKey === s.key ? (
                        <div className="flex items-center justify-center gap-1">
                          <input 
                            type="number" 
                            autoFocus
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={(e) => handleKeyDown(e, s.key)}
                            className="w-16 border-2 border-indigo-500 rounded-lg px-2 py-1 text-center text-sm font-bold outline-none"
                            min="0"
                          />
                          <button 
                            onClick={() => saveTarget(s.key)}
                            className="p-1.5 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div 
                          onClick={() => startEdit(s.key, s.target)}
                          className="group flex items-center justify-center gap-1 cursor-pointer hover:bg-slate-100 px-2 py-1 rounded-lg transition-colors"
                        >
                          <span className={`text-lg font-black ${s.target > 0 ? "text-indigo-600" : "text-slate-300"}`}>
                            {s.target > 0 ? s.target : "ระบุ"}
                          </span>
                          <Edit2 className="w-3.5 h-3.5 text-slate-300 group-hover:text-indigo-500 transition-colors" />
                        </div>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      {s.target > 0 ? (
                        <div className="space-y-1.5">
                          <div className="flex justify-between items-end">
                            <span className={`text-sm font-black ${getTextColorClass(s.realPercent)}`}>
                              {s.realPercent.toFixed(1)}%
                            </span>
                            <span className="text-[10px] text-slate-500 font-semibold uppercase">
                              {s.achieved} / {s.target}
                            </span>
                          </div>
                          <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${s.percent}%` }}
                              transition={{ duration: 0.8, ease: "easeOut" }}
                              className={`h-full rounded-full ${getColorClass(s.realPercent)}`}
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="text-xs text-slate-400 font-semibold flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5" />
                          โปรดระบุเป้าหมาย
                        </div>
                      )}
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Suggestions / Advice Box based on progress */}
      {stats.length > 0 && (
        <div className="bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-100 rounded-2xl p-6 print:break-inside-avoid">
          <div className="flex items-start gap-3">
            <div className="bg-white p-2 rounded-xl shadow-sm text-indigo-500">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-indigo-900 text-sm">ข้อเสนอแนะเชิงกลยุทธ์ (Strategic Recommendations)</h4>
              <ul className="mt-3 space-y-2 text-sm text-indigo-800 font-medium list-disc pl-4">
                {overall.percent < 50 ? (
                  <>
                    <li>ภาพรวมโครงการยังมีความก้าวหน้าต่ำกว่า 50% (<strong className="font-black text-rose-600">{overall.percent.toFixed(1)}%</strong>) ควรพิจารณาจัดกิจกรรมรณรงค์คัดกรองเชิงรุกในพื้นที่เพิ่มเติม</li>
                    <li>ควรเน้นเป้าหมายในพื้นที่ <strong>{stats[stats.length - 1]?.area}</strong> ที่มีความก้าวหน้าน้อยที่สุด</li>
                  </>
                ) : overall.percent < 80 ? (
                  <>
                    <li>ภาพรวมโครงการมีความก้าวหน้าปานกลาง (<strong className="font-black text-amber-600">{overall.percent.toFixed(1)}%</strong>) ควรสนับสนุนให้ อสม. ลงติดตามในครอบครัวที่ยังไม่ได้รับการคัดกรอง</li>
                    <li>รักษาโมเมนตัมในพื้นที่ <strong>{stats[0]?.area}</strong> ซึ่งทำผลงานได้ดีเยี่ยม</li>
                  </>
                ) : (
                  <>
                    <li>ยอดเยี่ยม! ภาพรวมโครงการก้าวหน้าไปแล้วกว่า (<strong className="font-black text-emerald-600">{overall.percent.toFixed(1)}%</strong>) บรรลุตามเป้าหมายหลัก</li>
                    <li>สามารถเริ่มเปลี่ยนโฟกัสไปที่ <strong>การติดตามผล (Follow-up)</strong> สำหรับกลุ่มเสี่ยงที่ค้นพบเพื่อปรับเปลี่ยนพฤติกรรมต่อไป</li>
                  </>
                )}
                <li>พื้นที่ใดที่มียอด Visit มากกว่ายอดคัดกรองรายบุคคล แสดงว่าเริ่มมีการติดตามผลต่อเนื่องแล้ว (Follow-up Retention)</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
