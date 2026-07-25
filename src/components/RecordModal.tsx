import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { 
  X, Activity, Heart, User, MapPin, Phone, Calendar, ClipboardList, 
  Trash2, Check, ShieldAlert, Printer, Download, FileCheck, Loader2
} from "lucide-react";
import { ScreeningRecord } from "../types";
import { CustomTrendChart } from "./TrendChart";

interface RecordModalProps {
  isAdmin?: boolean;
  record: ScreeningRecord;
  allRecords?: ScreeningRecord[];
  onClose: () => void;
  onUpdateRecord: (updatedRecord: ScreeningRecord) => void;
  onDeleteRecord?: (id: number) => void;
}

export const RecordModal: React.FC<RecordModalProps> = ({ isAdmin = false, record, allRecords = [], onClose, onUpdateRecord, onDeleteRecord }) => {

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const pdfRef = useRef<HTMLDivElement>(null);
  
  // Format Thai date
  const getThaiDate = (dateString?: string) => {
    if (!dateString) return new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
    try {
      // Handle common th-TH output like "11/7/2569" (DD/MM/YYYY)
      if (dateString.includes('/')) {
        const parts = dateString.split('/');
        if (parts.length === 3) {
          const day = parseInt(parts[0], 10);
          const month = parseInt(parts[1], 10) - 1;
          let year = parseInt(parts[2], 10);
          // If year is BE (e.g. 2569), convert to AD for Date parsing
          if (year > 2500) year -= 543;
          
          const parsedDate = new Date(year, month, day);
          if (!isNaN(parsedDate.getTime())) {
            return parsedDate.toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
          }
        }
      }

      const d = new Date(dateString);
      if (isNaN(d.getTime())) return dateString;
      
      // If parsed year is still > 2500, it means the Date constructor parsed it as BE.
      if (d.getFullYear() > 2500) {
        d.setFullYear(d.getFullYear() - 543);
      }
      return d.toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch (e) {
      return dateString;
    }
  };
  const recordDate = getThaiDate(record.date);

  // Filter all records for the same patient to build the chart data
  const patientVisits = React.useMemo(() => {
    return allRecords
      .filter(r => r.name === record.name)
      .sort((a, b) => a.visitNumber - b.visitNumber);
  }, [allRecords, record.name]);

  const bpChartData = React.useMemo(() => {
    return patientVisits.map(v => ({
      label: `ครั้งที่ ${v.visitNumber}`,
      value: v.bpSys,
      value2: v.bpDia,
      date: v.date
    }));
  }, [patientVisits]);

  const dmChartData = React.useMemo(() => {
    return patientVisits.map(v => ({
      label: `ครั้งที่ ${v.visitNumber}`,
      value: v.sugar,
      date: v.date
    }));
  }, [patientVisits]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadConsent = async () => {
    try {
      setIsGeneratingPdf(true);
      
      const element = pdfRef.current;
      if (!element) throw new Error("Could not find PDF element");

      // Render the HTML to canvas
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      
      const filename = `ConsentForm_${record.name}_${new Date().getTime()}.pdf`;
      pdf.save(filename);
      
    } catch (err) {
      console.error(err);
      alert("เกิดข้อผิดพลาดในการสร้างไฟล์ PDF");
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
      >
        {/* Modal Header */}
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center print:hidden">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 text-white p-2 rounded-xl">
              <ClipboardList className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">สรุปข้อมูลการคัดกรองส่วนบุคคล</h3>
              <p className="text-xs text-slate-500">บันทึกรหัส: #{record.id} • ประเมินครั้งที่ {record.visitNumber}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadConsent}
              disabled={isGeneratingPdf}
              className="p-2 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition-colors flex items-center gap-1.5 text-sm font-medium border border-indigo-200 bg-white shadow-sm disabled:opacity-50"
              title="ดาวน์โหลดแบบแสดงความยินยอม (Consent Form)"
            >
              {isGeneratingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileCheck className="w-4 h-4" />}
              <span className="hidden sm:inline">โหลดใบยินยอม</span>
            </button>
            <button
              onClick={handlePrint}
              className="p-2 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-1.5 text-sm font-medium"
              title="พิมพ์เอกสารรายงาน"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">พิมพ์รายงาน</span>
            </button>
            <button 
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 print:p-0 print:overflow-visible" id="print-area">
          
          {/* Header Banner for Printing */}
          <div className="hidden print:flex items-center justify-between border-b-2 border-slate-300 pb-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 text-white p-2.5 rounded-lg">
                <Activity className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-800">ระบบคัดกรองความเสี่ยง NCDs</h1>
                <p className="text-xs text-slate-500">สำนักงานสาธารณสุขอำเภอละงู จังหวัดสตูล</p>
              </div>
            </div>
            <div className="text-right text-xs text-slate-500">
              <p>วันที่บันทึก: {record.date}</p>
              <p>รหัสอ้างอิง: #{record.id}</p>
            </div>
          </div>

          {/* Grid Layout: Profile & Clinical */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Column 1: Profile & Demographics */}
            <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-4">
              <h4 className="font-bold text-slate-700 flex items-center gap-2 text-sm uppercase tracking-wider">
                <User className="w-4 h-4 text-blue-600" />
                ข้อมูลผู้รับการตรวจ
              </h4>
              <div className="space-y-2.5 text-sm">
                <div>
                  <span className="text-slate-500 block text-xs">วันที่คัดกรอง</span>
                  <span className="font-semibold text-slate-800">{recordDate}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-xs">ชื่อ-นามสกุล</span>
                  <span className="font-semibold text-slate-800">{record.name}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-slate-500 block text-xs">อายุ</span>
                    <span className="font-semibold text-slate-800">{record.age} ปี</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-xs">เพศ</span>
                    <span className="font-semibold text-slate-800">{record.gender}</span>
                  </div>
                </div>
                <div>
                  <span className="text-slate-500 block text-xs">เบอร์โทรศัพท์</span>
                  <span className="font-semibold text-slate-800">{record.phone}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-xs">บ้านเลขที่ / ชุมชน</span>
                  <span className="font-semibold text-slate-800 block leading-tight">{record.address}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {record.modelType && (
                    <div className="col-span-2">
                      <span className="text-slate-500 block text-xs">โมเดล</span>
                      <span className="font-semibold text-slate-800 text-xs">{record.modelType}</span>
                    </div>
                  )}
                  <div>
                    <span className="text-slate-500 block text-xs">อำเภอ</span>
                    <span className="font-semibold text-slate-800">{record.district}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-xs">ตำบล</span>
                    <span className="font-semibold text-slate-800">{record.subdistrict || "ไม่ระบุ"}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-500 block text-xs">พื้นที่เป้าหมาย</span>
                    <span className="font-semibold text-slate-800 text-xs">{record.targetArea}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Column 2: Clinical Data & Vitals */}
            <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-4 md:col-span-2">
              <h4 className="font-bold text-slate-700 flex items-center gap-2 text-sm uppercase tracking-wider">
                <Activity className="w-4 h-4 text-emerald-600" />
                ข้อมูลการตรวจทางคลินิก
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                
                {/* Weight / Height / BMI */}
                <div className="bg-white p-3 rounded-lg border border-slate-100 text-center shadow-xs">
                  <span className="text-xs text-slate-500">น้ำหนัก / ส่วนสูง</span>
                  <div className="font-bold text-slate-800 mt-1">
                    {record.weight} <span className="text-xs font-normal">kg</span>
                  </div>
                  <div className="text-xs text-slate-400">
                    {record.height} <span className="text-[10px]">cm</span>
                  </div>
                </div>

                <div className="bg-white p-3 rounded-lg border border-slate-100 text-center shadow-xs">
                  <span className="text-xs text-slate-500">ดัชนีมวลกาย (BMI)</span>
                  <div className="font-bold text-blue-600 mt-1">
                    {record.bmi}
                  </div>
                  <span className={`inline-block text-[10px] px-1.5 py-0.2 rounded-full font-medium mt-0.5 ${
                    parseFloat(record.bmi) >= 25 ? "bg-red-50 text-red-600" :
                    parseFloat(record.bmi) >= 23 ? "bg-amber-50 text-amber-600" :
                    parseFloat(record.bmi) >= 18.5 ? "bg-emerald-50 text-emerald-600" : "bg-blue-50 text-blue-600"
                  }`}>
                    {parseFloat(record.bmi) >= 25 ? "อ้วน" :
                     parseFloat(record.bmi) >= 23 ? "น้ำหนักเกิน" :
                     parseFloat(record.bmi) >= 18.5 ? "ปกติ" : "ผอม"}
                  </span>
                </div>

                {/* Blood Pressure */}
                <div className="bg-white p-3 rounded-lg border border-slate-100 text-center shadow-xs">
                  <span className="text-xs text-slate-500">ความดันโลหิต</span>
                  <div className="font-bold text-slate-800 mt-1">
                    {record.bpSys}/{record.bpDia}
                  </div>
                  <span className={`inline-block text-[10px] px-1.5 py-0.2 rounded-full font-medium mt-0.5 ${
                    record.htResult?.level === "danger" ? "bg-red-100 text-red-800" :
                    record.htResult?.level === "risk" ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"
                  }`}>
                    {record.htResult?.level === "danger" ? "สงสัยป่วย" :
                     record.htResult?.level === "risk" ? "กลุ่มเสี่ยง" : "ปกติ"}
                  </span>
                </div>

                {/* Blood Sugar DTX */}
                <div className="bg-white p-3 rounded-lg border border-slate-100 text-center shadow-xs">
                  <span className="text-xs text-slate-500">ระดับน้ำตาล (DTX)</span>
                  <div className="font-bold text-slate-800 mt-1">
                    {record.sugar && record.sugar > 0 ? (
                      <>
                        {record.sugar} <span className="text-xs font-normal">mg/dL</span>
                      </>
                    ) : (
                      "-"
                    )}
                  </div>
                  <span className={`inline-block text-[10px] px-1.5 py-0.2 rounded-full font-medium mt-0.5 ${
                    !record.sugar || record.sugar === 0 ? "bg-slate-100 text-slate-500 border border-slate-200" :
                    record.dmResult?.level === "danger" ? "bg-red-100 text-red-800" :
                    record.dmResult?.level === "risk" ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"
                  }`}>
                    {!record.sugar || record.sugar === 0 ? "ไม่ได้ตรวจ" :
                     record.dmResult?.level === "danger" ? "สงสัยป่วย" :
                     record.dmResult?.level === "risk" ? "กลุ่มเสี่ยง" : "ปกติ"}
                  </span>
                </div>

                {/* Muscle Mass */}
                <div className="bg-white p-3 rounded-lg border border-slate-100 text-center shadow-xs">
                  <span className="text-xs text-slate-500">มวลกล้ามเนื้อ</span>
                  <div className="font-bold text-slate-800 mt-1">
                    {record.muscleMass && record.muscleMass > 0 ? (
                      <>
                        {record.muscleMass} <span className="text-xs font-normal">kg</span>
                      </>
                    ) : (
                      "-"
                    )}
                  </div>
                  <span className="inline-block text-[10px] px-1.5 py-0.2 bg-slate-100 text-slate-500 rounded-full font-medium mt-0.5 border border-slate-200">
                    {record.muscleMass && record.muscleMass > 0 ? "มวลกายวิทยา" : "ไม่ได้ระบุ"}
                  </span>
                </div>

              </div>

              {/* Vitals Evaluation Banner */}
              <div className="p-3.5 rounded-xl border bg-slate-100 flex flex-col sm:flex-row justify-between gap-4 text-sm">
                <div>
                  <span className="text-slate-500 text-xs block">ผลวินิจฉัยความเสี่ยงหลัก</span>
                  <div className="flex flex-wrap gap-2 mt-1">
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${record.htResult.color}`}>
                      HT (ความดัน): {record.htResult.label.split(" ")[0]}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${record.dmResult.color}`}>
                      DM (เบาหวาน): {record.dmResult.label.split(" ")[0]}
                    </span>
                  </div>
                </div>
                <div>
                  <span className="text-slate-500 text-xs block">การจัดการหลัก</span>
                  <div className="font-semibold text-slate-800 mt-1 flex items-center gap-1">
                    <Check className="w-4 h-4 text-blue-600" />
                    {record.followUpAction}
                  </div>
                  {record.followUpNote && (
                    <p className="text-xs text-slate-500 italic mt-0.5">Note: {record.followUpNote}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Section: Family History & Lifestyle Habits */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Family History */}
            <div className="bg-white p-5 rounded-xl border border-slate-200">
              <h4 className="font-bold text-slate-700 flex items-center gap-2 text-sm uppercase tracking-wider mb-3">
                <Heart className="w-4 h-4 text-rose-500" />
                ประวัติสุขภาพในครอบครัว (โรคสายตรง)
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {record.familyHistory && record.familyHistory.length > 0 ? (
                  record.familyHistory.map((disease, idx) => (
                    <span 
                      key={idx} 
                      className={`text-xs px-2.5 py-1 rounded-md font-medium border ${
                        disease === "ไม่มีโรคประจำตัว" ? "bg-slate-50 text-slate-500 border-slate-200" :
                        disease === "ไม่ทราบ" ? "bg-slate-50 text-slate-500 border-slate-200" :
                        "bg-rose-50 text-rose-700 border-rose-200"
                      }`}
                    >
                      {disease}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-slate-400 italic">ไม่ได้ระบุ</span>
                )}
              </div>
            </div>

            {/* Lifestyle Badges */}
            <div className="bg-white p-5 rounded-xl border border-slate-200">
              <h4 className="font-bold text-slate-700 flex items-center gap-2 text-sm uppercase tracking-wider mb-3">
                <ClipboardList className="w-4 h-4 text-indigo-500" />
                พฤติกรรมในชีวิตประจำวัน
              </h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="text-slate-400 block">การสูบบุหรี่</span>
                  <span className={`font-semibold mt-0.5 block ${
                    record.smoking.includes("สูบอยู่") ? "text-amber-600" : "text-emerald-700"
                  }`}>{record.smoking}</span>
                </div>
                <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="text-slate-400 block">เครื่องดื่มแอลกอฮอล์</span>
                  <span className={`font-semibold mt-0.5 block ${
                    record.alcohol.includes("ประจำ") ? "text-amber-600" : "text-emerald-700"
                  }`}>{record.alcohol}</span>
                </div>
                <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="text-slate-400 block">ออกกำลังกาย</span>
                  <span className="font-semibold text-indigo-700 mt-0.5 block">{record.exercise}</span>
                </div>
                <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="text-slate-400 block">การนอนหลับ</span>
                  <span className="font-semibold text-indigo-700 mt-0.5 block">{record.sleep}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section: Food Consumption Sweet, Fat, Salt detailed */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4">
            <h4 className="font-bold text-slate-700 flex items-center gap-2 text-sm uppercase tracking-wider">
              <Activity className="w-4 h-4 text-amber-500" />
              รายงานประเมินพฤติกรรมการกินอาหาร (หวาน มัน เค็ม)
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* Sweet */}
              <div className={`p-4 rounded-xl border ${record.foodHabit?.sweet?.class || "bg-slate-50"} flex flex-col justify-between`}>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-bold text-slate-800">หมวดความหวาน (Sweet)</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${record.foodHabit?.sweet?.class}`}>
                      {record.foodHabit?.sweet?.score} คะแนน
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-slate-600">ระดับ: <span className={record.foodHabit?.sweet?.color}>{record.foodHabit?.sweet?.level}</span></p>
                  <p className="text-xs text-slate-500 mt-2 leading-relaxed text-justify">
                    {record.foodHabit?.sweet?.description}
                  </p>
                </div>
              </div>

              {/* Fat */}
              <div className={`p-4 rounded-xl border ${record.foodHabit?.fat?.class || "bg-slate-50"} flex flex-col justify-between`}>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-bold text-slate-800">หมวดความมัน (Fat)</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${record.foodHabit?.fat?.class}`}>
                      {record.foodHabit?.fat?.score} คะแนน
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-slate-600">ระดับ: <span className={record.foodHabit?.fat?.color}>{record.foodHabit?.fat?.level}</span></p>
                  <p className="text-xs text-slate-500 mt-2 leading-relaxed text-justify">
                    {record.foodHabit?.fat?.description}
                  </p>
                </div>
              </div>

              {/* Salt */}
              <div className={`p-4 rounded-xl border ${record.foodHabit?.salt?.class || "bg-slate-50"} flex flex-col justify-between`}>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-bold text-slate-800">หมวดความเค็ม (Salt)</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${record.foodHabit?.salt?.class}`}>
                      {record.foodHabit?.salt?.score} คะแนน
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-slate-600">ระดับ: <span className={record.foodHabit?.salt?.color}>{record.foodHabit?.salt?.level}</span></p>
                  <p className="text-xs text-slate-500 mt-2 leading-relaxed text-justify">
                    {record.foodHabit?.salt?.description}
                  </p>
                </div>
              </div>

            </div>
          </div>

          {/* Section: Personal Plan Evaluation */}
          {record.personalPlan && (
            <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4">
              <h4 className="font-bold text-slate-700 flex items-center gap-2 text-sm uppercase tracking-wider">
                <ClipboardList className="w-4 h-4 text-emerald-500" />
                สรุปแผนปรับเปลี่ยนพฤติกรรม (Personal Plan)
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                      <th className="py-2 px-3 w-1/4">หัวข้อ</th>
                      <th className="py-2 px-3 w-1/2">แผนที่ตั้งไว้</th>
                      <th className="py-2 px-3 w-1/4 text-center">ผลการทำตามแผนเดิม</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {[
                      { key: "sweet", label: "หวาน" },
                      { key: "fat", label: "มัน" },
                      { key: "salt", label: "เค็ม" },
                      { key: "sleep", label: "การนอน" },
                      { key: "water", label: "การดื่มน้ำ" },
                      { key: "exercise", label: "การออกกำลังกาย" },
                    ].map((item) => {
                      const planData = record.personalPlan?.[item.key as keyof typeof record.personalPlan];
                      return (
                        <tr key={item.key}>
                          <td className="py-2 px-3 font-semibold text-slate-700">{item.label}</td>
                          <td className="py-2 px-3 text-slate-600">{planData?.plan || "-"}</td>
                          <td className="py-2 px-3 text-center">
                            {planData?.achieved === true ? (
                              <span className="inline-flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full font-semibold">
                                <Check className="w-3 h-3" /> ทำได้ (1)
                              </span>
                            ) : planData?.achieved === false ? (
                              <span className="inline-flex items-center gap-1 text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full font-semibold">
                                <X className="w-3 h-3" /> ทำไม่ได้ (0)
                              </span>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Section: Trend Charts (if multiple visits) */}
          {patientVisits.length > 1 && (
            <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4">
              <h4 className="font-bold text-slate-700 flex items-center gap-2 text-sm uppercase tracking-wider mb-2">
                <Activity className="w-4 h-4 text-blue-500" />
                แนวโน้มผลการตรวจติดตาม (Trend Analysis)
              </h4>
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <CustomTrendChart 
                  title="ประวัติความดันโลหิต (Blood Pressure)"
                  unit="mmHg"
                  data={bpChartData}
                  minVal={60}
                  maxVal={200}
                  color="#ef4444" 
                  color2="#3b82f6" 
                  label1="ค่าบน (Systolic)"
                  label2="ค่าล่าง (Diastolic)"
                  thresholds={[
                    { value: 140, label: "อันตราย", color: "#ef4444" },
                    { value: 120, label: "เสี่ยง", color: "#f59e0b" }
                  ]}
                />
                <CustomTrendChart 
                  title="ประวัติน้ำตาลในเลือด (Blood Sugar)"
                  unit="mg/dL"
                  data={dmChartData}
                  minVal={50}
                  maxVal={250}
                  color="#f59e0b"
                  label1="ระดับน้ำตาล"
                  thresholds={[
                    { value: 126, label: "อันตราย", color: "#ef4444" },
                    { value: 100, label: "เสี่ยง", color: "#f59e0b" }
                  ]}
                />
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex justify-between items-center print:hidden">
          {isAdmin && onDeleteRecord && (
            <div className="flex items-center gap-2">
              {showDeleteConfirm ? (
                <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 p-1.5 px-3 rounded-xl animate-in fade-in slide-in-from-left-2 duration-150">
                  <span className="text-xs text-rose-700 font-semibold">ยืนยันการลบ?</span>
                  <button
                    onClick={() => {
                      onDeleteRecord(record.id);
                      onClose();
                    }}
                    className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] py-1 px-3 rounded-lg transition-colors cursor-pointer"
                  >
                    ลบเลย
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold text-[11px] py-1 px-2.5 rounded-lg transition-colors cursor-pointer"
                  >
                    ยกเลิก
                  </button>
                </div>
              ) : (
                <button 
                  onClick={() => setShowDeleteConfirm(true)}
                  className="px-4 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  ลบรายงานนี้
                </button>
              )}
            </div>
          )}
          <button 
            onClick={onClose}
            className="px-5 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 border border-slate-300 rounded-xl hover:bg-slate-100 transition-colors ml-auto"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </motion.div>

      {/* Hidden element for PDF rendering */}
      <div className="absolute top-[-9999px] left-[-9999px]">
        <div ref={pdfRef} style={{ width: '794px', minHeight: '1123px', padding: '70px 80px', backgroundColor: 'white', fontFamily: '"Kanit", sans-serif', color: 'black', boxSizing: 'border-box' }}>
          <div style={{ textAlign: 'center', marginBottom: '35px' }}>
             <h2 style={{ fontSize: '22px', fontWeight: 'bold', lineHeight: '1.4' }}>แบบเอกสารแสดงความยินยอม (Consent Form) (สำหรับบุคคลทั่วไป)</h2>
          </div>
          
          <table style={{ width: '100%', marginBottom: '30px', borderCollapse: 'collapse', backgroundColor: '#f8fafc', fontSize: '15px' }}>
             <tbody>
                <tr>
                  <td colSpan={2} style={{ padding: '12px', textAlign: 'center', fontWeight: 'bold', borderBottom: '2px solid white' }}>แบบแสดงความยินยอม (Consent Form)</td>
                </tr>
                <tr>
                   <td style={{ padding: '12px 15px', width: '25%', fontWeight: 'bold' }}>ภายใต้โครงการ</td>
                   <td style={{ padding: '12px 15px' }}>ร่วมสร้างต้นแบบลดกลุ่มเสี่ยงต่อโรค NCDs ด้วยแผนรายบุคคล ชุมชน ตำบล</td>
                </tr>
                <tr>
                   <td style={{ padding: '12px 15px', fontWeight: 'bold' }}>ดำเนินการโดย</td>
                   <td style={{ padding: '12px 15px' }}>Mini Flag Ship Satun</td>
                </tr>
             </tbody>
          </table>

          <div style={{ fontSize: '15px', lineHeight: '1.8' }}>
             <p style={{ textIndent: '40px', marginBottom: '15px' }}>ข้าพเจ้าทราบดีว่าผู้รับทุนจำเป็นต้องเก็บรวบรวม ใช้ หรือเปิดเผย (ซึ่งต่อไปในเอกสารนี้เรียกว่า “ประมวลผล”) ข้อมูลส่วนบุคคลของข้าพเจ้า โดยมีรายละเอียดดังนี้</p>
             <p style={{ fontWeight: 'bold', marginBottom: '10px' }}>1. วัตถุประสงค์ในการขอความยินยอม</p>
             <p style={{ textIndent: '40px', marginBottom: '20px' }}>เก็บข้อมูลส่วนบุคคล ได้แก่ ข้อมูล ประวัติส่วนตัว ค่าความดันโลหิต ค่าน้ำหนัก ส่วนสูง และผลตรวจสุขภาพ และอื่นๆ ที่จำเป็น สำหรับใช้ในการดำเนินงานโครงการดังกล่าว เพื่อนำมาวิเคราะห์ข้อมูล และออกแบบกิจกรรม ให้เหมาะสมกับท่านในปรับเปลี่ยนพฤติกรรมให้มีสุขภาพที่ดีขึ้น</p>
             
             <div style={{ display: 'flex', justifyContent: 'center', gap: '50px', marginBottom: '30px', fontWeight: 'bold' }}>
                <div>☑ ข้าพเจ้าให้ความยินยอม</div>
                <div>☐ ข้าพเจ้าไม่ให้ความยินยอม</div>
             </div>

             <p style={{ textIndent: '40px', marginBottom: '15px' }}>ทั้งนี้ ก่อนการแสดงเจตนาในครั้งนี้ ข้าพเจ้าได้อ่านรายละเอียดจากเอกสารชี้แจงข้อมูลหรือได้รับคำอธิบายถึง วัตถุประสงค์ในการประมวลผลข้อมูลส่วนบุคคลของข้าพเจ้าโดยละเอียดและมีความเข้าใจเป็นอย่างดีแล้ว และข้าพเจ้าได้ ให้ความยินยอมหรือปฏิเสธไม่ให้ความยินยอมในเอกสารฉบับนี้ด้วยความสมัครใจโดยปราศจากการบังคับหรือชักจูง</p>
             
             <p style={{ textIndent: '40px', marginBottom: '20px' }}>ข้าพเจ้าทราบว่าสามารถถอนความยินยอมนี้เสียเมื่อใดก็ได้ เว้นแต่ในกรณีที่มีข้อจำกัดสิทธิตามกฎหมาย และ ข้าพเจ้าทราบว่าการถอนความยินยอมนี้ไม่มีผลกระทบต่อการประมวลผลข้อมูลส่วนบุคคลของข้าพเจ้าที่ได้ดำเนินการเสร็จ สิ้นไปแล้วก่อนการถอนความยินยอม</p>
             
             <p style={{ textIndent: '40px', marginBottom: '40px' }}>ข้าพเจ้าได้อ่านเอกสารฉบับนี้โดยละเอียดและมีความเข้าใจเป็นอย่างดีแล้วจึงได้ลงลายมือชื่อไว้เป็นหลักฐาน</p>

             <div style={{ marginTop: '60px', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', paddingRight: '20px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: '10px' }}>
                    <span>(ลงชื่อ)</span>
                    <span style={{ display: 'inline-block', width: '220px', borderBottom: '1px dotted black', textAlign: 'center', fontWeight: 'bold', paddingBottom: '2px' }}>{record.name}</span>
                    <span>ผู้เข้าร่วมกิจกรรม/เจ้าของข้อมูลส่วนบุคคล</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: '10px' }}>
                    <span>(</span>
                    <span style={{ display: 'inline-block', width: '220px', textAlign: 'center', fontWeight: 'bold' }}>{record.name}</span>
                    <span>)</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: '10px', marginTop: '10px' }}>
                    <span>วันที่</span>
                    <span style={{ fontWeight: 'bold' }}>{recordDate}</span>
                  </div>
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};
