import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { 
  X, Activity, Heart, User, MapPin, Phone, Calendar, ClipboardList, 
  Trash2, Check, ShieldAlert, Printer, Download, FileCheck, Loader2, History
} from "lucide-react";
import { ScreeningRecord } from "../types";
import { CustomTrendChart } from "./TrendChart";
import { BloodPressureTrendRecharts } from "./BloodPressureTrendRecharts";

interface RecordModalProps {
  isAdmin?: boolean;
  record: ScreeningRecord;
  allRecords?: ScreeningRecord[];
  onClose: () => void;
  onUpdateRecord: (updatedRecord: ScreeningRecord) => void;
  onDeleteRecord?: (id: number) => void;
}

export const RecordModal: React.FC<RecordModalProps> = ({ 
  isAdmin = false, 
  record: initialRecord, 
  allRecords = [], 
  onClose, 
  onUpdateRecord, 
  onDeleteRecord 
}) => {
  const [activeRecordId, setActiveRecordId] = useState<number>(initialRecord.id);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isGeneratingReportPdf, setIsGeneratingReportPdf] = useState(false);
  const pdfRef = useRef<HTMLDivElement>(null);
  const reportPdfRef = useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    setActiveRecordId(initialRecord.id);
  }, [initialRecord.id]);

  // Filter all records for the same patient to build the chart data
  const patientVisits = React.useMemo(() => {
    return allRecords
      .filter(r => r.name === initialRecord.name && (!initialRecord.phone || !r.phone || r.phone === initialRecord.phone))
      .sort((a, b) => a.visitNumber - b.visitNumber);
  }, [allRecords, initialRecord.name, initialRecord.phone]);

  const record = React.useMemo(() => {
    return patientVisits.find(v => v.id === activeRecordId) || initialRecord;
  }, [patientVisits, activeRecordId, initialRecord]);
  
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

  const getBmiLabel = (bmiStr?: string) => {
    const val = parseFloat(bmiStr || "0");
    if (isNaN(val) || val <= 0) return "-";
    if (val >= 25) return "อ้วน (Obese)";
    if (val >= 23) return "น้ำหนักเกิน (Overweight)";
    if (val >= 18.5) return "ปกติ (Normal)";
    return "ผอม (Underweight)";
  };

  const handleDownloadReportPdf = async () => {
    try {
      setIsGeneratingReportPdf(true);
      
      const element = reportPdfRef.current;
      if (!element) throw new Error("Could not find Report PDF element");

      // Render the HTML to canvas with high resolution
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/png');
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      let position = 0;
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position -= pageHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const dateStr = new Date().toISOString().split("T")[0];
      const filename = `รายงานคัดกรอง_${record.name}_ครั้งที่${record.visitNumber || 1}_${dateStr}.pdf`;
      pdf.save(filename);
      
    } catch (err) {
      console.error("Error generating report PDF:", err);
      alert("เกิดข้อผิดพลาดในการสร้างไฟล์ PDF รายงาน");
    } finally {
      setIsGeneratingReportPdf(false);
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
              onClick={handleDownloadReportPdf}
              disabled={isGeneratingReportPdf}
              className="p-2 text-blue-700 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-1.5 text-sm font-semibold border border-blue-200 bg-white shadow-xs disabled:opacity-50 cursor-pointer"
              title="ดาวน์โหลดข้อมูลการคัดกรองรายบุคคลในรูปแบบ PDF สำหรับพิมพ์เก็บไว้เป็นเอกสาร"
            >
              {isGeneratingReportPdf ? <Loader2 className="w-4 h-4 animate-spin text-blue-600" /> : <Download className="w-4 h-4 text-blue-600" />}
              <span className="hidden sm:inline">ดาวน์โหลดรายงาน</span>
            </button>
            <button
              onClick={handleDownloadConsent}
              disabled={isGeneratingPdf}
              className="p-2 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition-colors flex items-center gap-1.5 text-sm font-medium border border-indigo-200 bg-white shadow-sm disabled:opacity-50 cursor-pointer"
              title="ดาวน์โหลดแบบแสดงความยินยอม (Consent Form)"
            >
              {isGeneratingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileCheck className="w-4 h-4" />}
              <span className="hidden sm:inline">โหลดใบยินยอม</span>
            </button>
            <button
              onClick={handlePrint}
              className="p-2 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-1.5 text-sm font-medium cursor-pointer"
              title="พิมพ์เอกสารรายงาน"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">พิมพ์รายงาน</span>
            </button>
            <button 
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Visit Switcher Bar when patient has multiple visits */}
        {patientVisits.length > 1 && (
          <div className="bg-indigo-50/70 px-6 py-2.5 border-b border-indigo-150 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 print:hidden">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-indigo-600" />
              <span className="text-xs font-bold text-indigo-900">
                ประวัติการตรวจของผู้รับการตรวจรายนี้ (รวม {patientVisits.length} ครั้ง):
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {patientVisits.map((v) => {
                const isSelected = v.id === record.id;
                const vNum = v.visitNumber || 1;
                const isLatest = v.id === patientVisits[patientVisits.length - 1].id;
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setActiveRecordId(v.id)}
                    className={`text-xs px-2.5 py-1 rounded-lg font-bold transition-all border flex items-center gap-1.5 cursor-pointer ${
                      isSelected
                        ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                        : "bg-white hover:bg-indigo-100/60 text-slate-700 border-slate-200"
                    }`}
                  >
                    <span>{vNum === 1 ? "ครั้งที่ 1 (แรกรับ)" : `ครั้งที่ ${vNum} (ติดตาม #${vNum - 1})`}</span>
                    {isLatest && (
                      <span className={`text-[9px] px-1 py-0.1 rounded font-bold ${
                        isSelected ? "bg-white/20 text-white" : "bg-emerald-100 text-emerald-800"
                      }`}>
                        ล่าสุด
                      </span>
                    )}
                    <span className={`text-[10px] ${isSelected ? "text-indigo-100" : "text-slate-400"}`}>
                      {v.date}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

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
            <div className="space-y-4">
              {/* Blood Pressure Comparative Trend using Recharts */}
              <BloodPressureTrendRecharts
                visits={patientVisits}
                patientName={record.name}
              />

              {/* Blood Sugar Trend Chart */}
              <div className="bg-white p-5 rounded-xl border border-slate-200">
                <CustomTrendChart 
                  title="ประวัติระดับน้ำตาลในเลือดสะสม (Blood Sugar FBS)"
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
          <div className="flex items-center gap-2.5 ml-auto">
            <button
              onClick={handleDownloadReportPdf}
              disabled={isGeneratingReportPdf}
              className="px-4 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
              title="ดาวน์โหลดข้อมูลการคัดกรองรายบุคคลในรูปแบบ PDF สำหรับพิมพ์เก็บไว้เป็นเอกสาร"
            >
              {isGeneratingReportPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              <span>ดาวน์โหลดรายงาน (PDF)</span>
            </button>
            <button 
              onClick={onClose}
              className="px-5 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 border border-slate-300 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
            >
              ปิดหน้าต่าง
            </button>
          </div>
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
                   <td style={{ padding: '12px 15px' }}>ลดโรคNcdsด้วยแผนปรับเปลี่ยนพฤติกรรมรายบุคคล โดยศูนย์คนไทยห่างไกล Ncds</td>
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

      {/* Hidden element for Individual Screening Report PDF rendering */}
      <div className="absolute top-[-9999px] left-[-9999px]">
        <div 
          ref={reportPdfRef} 
          style={{ 
            width: '794px', 
            minHeight: '1123px', 
            padding: '36px 42px', 
            backgroundColor: '#ffffff', 
            fontFamily: '"Sarabun", "Kanit", system-ui, -apple-system, sans-serif', 
            color: '#1e293b', 
            boxSizing: 'border-box',
            fontSize: '12px',
            lineHeight: '1.45'
          }}
        >
          {/* Header Banner */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '2.5px solid #2563eb', paddingBottom: '14px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '44px', height: '44px', backgroundColor: '#2563eb', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', fontWeight: 'bold', fontSize: '24px' }}>
                +
              </div>
              <div>
                <h1 style={{ fontSize: '17px', fontWeight: 'bold', color: '#1e3a8a', margin: 0, lineHeight: 1.25 }}>
                  แบบรายงานผลการคัดกรองและการประเมินสุขภาพส่วนบุคคล
                </h1>
                <p style={{ fontSize: '12px', color: '#334155', margin: '3px 0 0 0', fontWeight: '600' }}>
                  โครงการลดโรค NCDs ด้วยแผนปรับเปลี่ยนพฤติกรรมรายบุคคล "Mini Flag Ship Satun"
                </p>
                <p style={{ fontSize: '11px', color: '#64748b', margin: '2px 0 0 0' }}>
                  ศูนย์คนไทยห่างไกล NCDs • สำนักงานสาธารณสุขจังหวัดสตูล
                </p>
              </div>
            </div>
            <div style={{ textAlign: 'right', fontSize: '11px', color: '#475569', backgroundColor: '#f8fafc', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', minWidth: '150px' }}>
              <div><strong style={{ color: '#0f172a' }}>รหัสเอกสาร:</strong> #{record.id}</div>
              <div style={{ marginTop: '2px' }}><strong style={{ color: '#0f172a' }}>วันที่ตรวจ:</strong> {recordDate}</div>
              <div style={{ marginTop: '2px', color: '#2563eb', fontWeight: 'bold' }}>
                รอบที่ตรวจ: ครั้งที่ {record.visitNumber || 1} {record.visitNumber && record.visitNumber > 1 ? `(ติดตามผล #${record.visitNumber - 1})` : "(แรกรับ)"}
              </div>
            </div>
          </div>

          {/* Section 1: ข้อมูลผู้รับการตรวจ (Profile & Demographics) */}
          <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 14px', marginBottom: '14px' }}>
            <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#1e3a8a', marginBottom: '6px' }}>
              👤 ข้อมูลทั่วไปของผู้รับการตรวจ
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
              <tbody>
                <tr>
                  <td style={{ padding: '3px 6px', width: '15%', color: '#64748b' }}>ชื่อ-นามสกุล:</td>
                  <td style={{ padding: '3px 6px', width: '35%', fontWeight: 'bold', color: '#0f172a' }}>{record.name}</td>
                  <td style={{ padding: '3px 6px', width: '15%', color: '#64748b' }}>อายุ / เพศ:</td>
                  <td style={{ padding: '3px 6px', width: '35%', fontWeight: 'bold', color: '#0f172a' }}>{record.age} ปี / {record.gender}</td>
                </tr>
                <tr>
                  <td style={{ padding: '3px 6px', color: '#64748b' }}>เบอร์โทรศัพท์:</td>
                  <td style={{ padding: '3px 6px', fontWeight: 'bold', color: '#0f172a' }}>{record.phone || "-"}</td>
                  <td style={{ padding: '3px 6px', color: '#64748b' }}>ที่อยู่ / ชุมชน:</td>
                  <td style={{ padding: '3px 6px', fontWeight: 'bold', color: '#0f172a' }}>{record.address || "-"}</td>
                </tr>
                <tr>
                  <td style={{ padding: '3px 6px', color: '#64748b' }}>อำเภอ / ตำบล:</td>
                  <td style={{ padding: '3px 6px', fontWeight: 'bold', color: '#0f172a' }}>{record.district} / {record.subdistrict || "-"}</td>
                  <td style={{ padding: '3px 6px', color: '#64748b' }}>พื้นที่ / โมเดล:</td>
                  <td style={{ padding: '3px 6px', fontWeight: 'bold', color: '#0f172a' }}>{record.targetArea} {record.modelType ? `(${record.modelType})` : ""}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Section 2: ผลตรวจทางคลินิก (Clinical Vitals) */}
          <div style={{ marginBottom: '14px' }}>
            <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#1e3a8a', marginBottom: '6px' }}>
              🩺 ข้อมูลการตรวจทางคลินิกและสัญญาณชีพ
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px' }}>
              {/* Weight & Height */}
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px', textAlign: 'center', backgroundColor: '#ffffff' }}>
                <div style={{ fontSize: '10px', color: '#64748b' }}>น้ำหนัก / ส่วนสูง</div>
                <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#0f172a', marginTop: '2px' }}>
                  {record.weight} <span style={{ fontSize: '10px', fontWeight: 'normal' }}>กก.</span>
                </div>
                <div style={{ fontSize: '10px', color: '#64748b' }}>{record.height} ซม.</div>
              </div>

              {/* BMI */}
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px', textAlign: 'center', backgroundColor: '#ffffff' }}>
                <div style={{ fontSize: '10px', color: '#64748b' }}>ดัชนีมวลกาย (BMI)</div>
                <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#2563eb', marginTop: '2px' }}>
                  {record.bmi}
                </div>
                <div style={{ fontSize: '10px', fontWeight: 'bold', color: parseFloat(record.bmi) >= 23 ? '#dc2626' : '#16a34a' }}>
                  {getBmiLabel(record.bmi)}
                </div>
              </div>

              {/* Blood Pressure */}
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px', textAlign: 'center', backgroundColor: '#ffffff' }}>
                <div style={{ fontSize: '10px', color: '#64748b' }}>ความดันโลหิต</div>
                <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#0f172a', marginTop: '2px' }}>
                  {record.bpSys}/{record.bpDia} <span style={{ fontSize: '9px', fontWeight: 'normal' }}>mmHg</span>
                </div>
                <div style={{ fontSize: '10px', fontWeight: 'bold', color: record.htResult?.level === 'danger' ? '#dc2626' : record.htResult?.level === 'risk' ? '#d97706' : '#16a34a' }}>
                  {record.htResult?.label?.split(' ')[0] || "ปกติ"}
                </div>
              </div>

              {/* Blood Sugar */}
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px', textAlign: 'center', backgroundColor: '#ffffff' }}>
                <div style={{ fontSize: '10px', color: '#64748b' }}>ระดับน้ำตาล (DTX)</div>
                <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#0f172a', marginTop: '2px' }}>
                  {record.sugar && record.sugar > 0 ? (
                    <>{record.sugar} <span style={{ fontSize: '9px', fontWeight: 'normal' }}>mg/dL</span></>
                  ) : "-"}
                </div>
                <div style={{ fontSize: '10px', fontWeight: 'bold', color: !record.sugar ? '#64748b' : record.dmResult?.level === 'danger' ? '#dc2626' : record.dmResult?.level === 'risk' ? '#d97706' : '#16a34a' }}>
                  {!record.sugar ? "ไม่ได้ตรวจ" : (record.dmResult?.label?.split(' ')[0] || "ปกติ")}
                </div>
              </div>

              {/* Muscle Mass */}
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px', textAlign: 'center', backgroundColor: '#ffffff' }}>
                <div style={{ fontSize: '10px', color: '#64748b' }}>มวลกล้ามเนื้อ</div>
                <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#0f172a', marginTop: '2px' }}>
                  {record.muscleMass && record.muscleMass > 0 ? `${record.muscleMass} กก.` : "-"}
                </div>
                <div style={{ fontSize: '10px', color: '#64748b' }}>
                  {record.muscleMass && record.muscleMass > 0 ? "มวลกายวิทยา" : "ไม่ได้ระบุ"}
                </div>
              </div>
            </div>

            {/* Risk Summary Banner */}
            <div style={{ marginTop: '8px', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px' }}>
              <div>
                <span style={{ color: '#1e40af', fontWeight: 'bold' }}>ผลสรุปความเสี่ยงหลัก: </span>
                <span style={{ fontWeight: 'bold', color: '#1e293b' }}>
                  ความดัน: {record.htResult?.label || "-"} | เบาหวาน: {record.dmResult?.label || "-"}
                </span>
              </div>
              <div>
                <span style={{ color: '#1e40af', fontWeight: 'bold' }}>การจัดการหลัก: </span>
                <span style={{ fontWeight: 'bold', color: '#0f172a' }}>{record.followUpAction || "-"}</span>
                {record.followUpNote && (
                  <span style={{ color: '#64748b', marginLeft: '6px' }}>({record.followUpNote})</span>
                )}
              </div>
            </div>
          </div>

          {/* Section 3: ประวัติสุขภาพครอบครัว & พฤติกรรมเสี่ยง */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
            {/* Family history */}
            <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px 12px', backgroundColor: '#ffffff' }}>
              <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#1e3a8a', marginBottom: '4px' }}>
                ❤️ ประวัติโรคสายตรงในครอบครัว
              </div>
              <div style={{ fontSize: '11px', color: '#334155' }}>
                {record.familyHistory && record.familyHistory.length > 0 ? record.familyHistory.join(", ") : "ไม่มีโรคประจำตัว"}
              </div>
            </div>

            {/* Lifestyle */}
            <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px 12px', backgroundColor: '#ffffff' }}>
              <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#1e3a8a', marginBottom: '4px' }}>
                🏃‍♂️ พฤติกรรมในชีวิตประจำวัน
              </div>
              <table style={{ width: '100%', fontSize: '10px' }}>
                <tbody>
                  <tr>
                    <td style={{ color: '#64748b', width: '50%' }}>การสูบบุหรี่: <strong style={{ color: '#0f172a' }}>{record.smoking}</strong></td>
                    <td style={{ color: '#64748b', width: '50%' }}>แอลกอฮอล์: <strong style={{ color: '#0f172a' }}>{record.alcohol}</strong></td>
                  </tr>
                  <tr>
                    <td style={{ color: '#64748b', paddingTop: '3px' }}>ออกกำลังกาย: <strong style={{ color: '#0f172a' }}>{record.exercise}</strong></td>
                    <td style={{ color: '#64748b', paddingTop: '3px' }}>การนอนหลับ: <strong style={{ color: '#0f172a' }}>{record.sleep}</strong></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 4: การประเมินพฤติกรรมการบริโภคอาหาร (หวาน มัน เค็ม) */}
          <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px 12px', backgroundColor: '#ffffff', marginBottom: '14px' }}>
            <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#1e3a8a', marginBottom: '6px' }}>
              🍽️ ผลประเมินพฤติกรรมการกินอาหาร (หวาน มัน เค็ม)
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                  <th style={{ padding: '5px 6px', width: '20%' }}>หมวดอาหาร</th>
                  <th style={{ padding: '5px 6px', width: '15%' }}>คะแนน</th>
                  <th style={{ padding: '5px 6px', width: '18%' }}>ระดับความเสี่ยง</th>
                  <th style={{ padding: '5px 6px' }}>ข้อแนะนำในการปรับเปลี่ยน</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '5px 6px', fontWeight: 'bold', color: '#0f172a' }}>ความหวาน (Sweet)</td>
                  <td style={{ padding: '5px 6px' }}>{record.foodHabit?.sweet?.score ?? "-"} คะแนน</td>
                  <td style={{ padding: '5px 6px', fontWeight: 'bold' }}>{record.foodHabit?.sweet?.level || "-"}</td>
                  <td style={{ padding: '5px 6px', color: '#475569' }}>{record.foodHabit?.sweet?.description || "-"}</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '5px 6px', fontWeight: 'bold', color: '#0f172a' }}>ความมัน (Fat)</td>
                  <td style={{ padding: '5px 6px' }}>{record.foodHabit?.fat?.score ?? "-"} คะแนน</td>
                  <td style={{ padding: '5px 6px', fontWeight: 'bold' }}>{record.foodHabit?.fat?.level || "-"}</td>
                  <td style={{ padding: '5px 6px', color: '#475569' }}>{record.foodHabit?.fat?.description || "-"}</td>
                </tr>
                <tr>
                  <td style={{ padding: '5px 6px', fontWeight: 'bold', color: '#0f172a' }}>ความเค็ม (Salt)</td>
                  <td style={{ padding: '5px 6px' }}>{record.foodHabit?.salt?.score ?? "-"} คะแนน</td>
                  <td style={{ padding: '5px 6px', fontWeight: 'bold' }}>{record.foodHabit?.salt?.level || "-"}</td>
                  <td style={{ padding: '5px 6px', color: '#475569' }}>{record.foodHabit?.salt?.description || "-"}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Section 5: สรุปแผนปรับเปลี่ยนพฤติกรรมรายบุคคล (Personal Plan) */}
          {record.personalPlan && (
            <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px 12px', backgroundColor: '#ffffff', marginBottom: '14px' }}>
              <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#1e3a8a', marginBottom: '6px' }}>
                📋 สรุปแผนปรับเปลี่ยนพฤติกรรมรายบุคคล (Personal Plan 6 ด้าน)
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                    <th style={{ padding: '4px 6px', width: '22%' }}>ด้านพฤติกรรม</th>
                    <th style={{ padding: '4px 6px', width: '58%' }}>เป้าหมาย / แผนที่ตั้งไว้</th>
                    <th style={{ padding: '4px 6px', width: '20%', textAlign: 'center' }}>ผลการทำตามแผน</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { key: "sweet", label: "ลดหวาน" },
                    { key: "fat", label: "ลดมัน" },
                    { key: "salt", label: "ลดเค็ม" },
                    { key: "sleep", label: "การนอนหลับ" },
                    { key: "water", label: "การดื่มน้ำ" },
                    { key: "exercise", label: "การออกกำลังกาย" },
                  ].map((item, idx) => {
                    const planData = record.personalPlan?.[item.key as keyof typeof record.personalPlan];
                    return (
                      <tr key={item.key} style={{ borderBottom: idx < 5 ? '1px solid #f1f5f9' : 'none' }}>
                        <td style={{ padding: '4px 6px', fontWeight: 'bold', color: '#0f172a' }}>{item.label}</td>
                        <td style={{ padding: '4px 6px', color: '#334155' }}>{planData?.plan || "-"}</td>
                        <td style={{ padding: '4px 6px', textAlign: 'center', fontWeight: 'bold' }}>
                          {planData?.achieved === true ? (
                            <span style={{ color: '#16a34a' }}>✓ ทำได้</span>
                          ) : planData?.achieved === false ? (
                            <span style={{ color: '#dc2626' }}>✗ ทำไม่ได้</span>
                          ) : (
                            <span style={{ color: '#94a3b8' }}>-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Section 6: ประวัติการตรวจติดตามผล (ถ้ามีมากกว่า 1 ครั้ง) */}
          {patientVisits.length > 1 && (
            <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px 12px', backgroundColor: '#ffffff', marginBottom: '14px' }}>
              <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#1e3a8a', marginBottom: '6px' }}>
                📈 ประวัติการตรวจติดตามผลเปรียบเทียบในแต่ละครั้ง (รวม {patientVisits.length} ครั้ง)
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px', textAlign: 'center' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <th style={{ padding: '4px 6px' }}>รอบการตรวจ</th>
                    <th style={{ padding: '4px 6px' }}>วันที่ตรวจ</th>
                    <th style={{ padding: '4px 6px' }}>น้ำหนัก (กก.)</th>
                    <th style={{ padding: '4px 6px' }}>BMI</th>
                    <th style={{ padding: '4px 6px' }}>ความดัน (mmHg)</th>
                    <th style={{ padding: '4px 6px' }}>น้ำตาล (mg/dL)</th>
                    <th style={{ padding: '4px 6px' }}>สถานะความเสี่ยง HT</th>
                  </tr>
                </thead>
                <tbody>
                  {patientVisits.map((v) => (
                    <tr key={v.id} style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: v.id === record.id ? '#f0fdf4' : 'transparent' }}>
                      <td style={{ padding: '4px 6px', fontWeight: 'bold' }}>ครั้งที่ {v.visitNumber || 1} {v.id === record.id ? "(ฉบับนี้)" : ""}</td>
                      <td style={{ padding: '4px 6px' }}>{v.date}</td>
                      <td style={{ padding: '4px 6px' }}>{v.weight}</td>
                      <td style={{ padding: '4px 6px' }}>{v.bmi}</td>
                      <td style={{ padding: '4px 6px', fontWeight: 'bold', color: '#0f172a' }}>{v.bpSys}/{v.bpDia}</td>
                      <td style={{ padding: '4px 6px' }}>{v.sugar && v.sugar > 0 ? v.sugar : "-"}</td>
                      <td style={{ padding: '4px 6px', fontWeight: 'bold' }}>{v.htResult?.label?.split(' ')[0] || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Section 7: ส่วนลงนามรับรอง */}
          <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between', padding: '0 30px', fontSize: '11px' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ marginBottom: '40px' }}>ลงชื่อ............................................................</div>
              <div style={{ fontWeight: 'bold', color: '#0f172a' }}>({record.name})</div>
              <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>ผู้เข้าร่วมโครงการ / ผู้รับการตรวจ</div>
              <div style={{ fontSize: '10px', color: '#64748b', marginTop: '3px' }}>วันที่ {recordDate}</div>
            </div>

            <div style={{ textAlign: 'center' }}>
              <div style={{ marginBottom: '40px' }}>ลงชื่อ............................................................</div>
              <div style={{ fontWeight: 'bold', color: '#0f172a' }}>(............................................................)</div>
              <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>เจ้าหน้าที่สาธารณสุข / ผู้ประเมินผล</div>
              <div style={{ fontSize: '10px', color: '#64748b', marginTop: '3px' }}>ศูนย์คนไทยห่างไกล NCDs สตูล</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
