import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  HeartPulse, ClipboardList, BarChart3, Activity, 
  Sparkles, ShieldCheck, CheckCircle2, User, RefreshCw, AlertTriangle
} from "lucide-react";
import { supabase } from "./lib/supabase";
import { NcdForm } from "./components/NcdForm";
import { NcdDashboard } from "./components/NcdDashboard";
import { IndividualProfile } from "./components/IndividualProfile";
import { NcdAnalyticsDashboard } from "./components/NcdAnalyticsDashboard";
import { RecordModal } from "./components/RecordModal";
import { ScreeningRecord } from "./types";

export default function App() {
  const [activeTab, setActiveTab] = useState<"form" | "dash" | "individual" | "analytics">("form");
  const [records, setRecords] = useState<ScreeningRecord[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<ScreeningRecord | null>(null);
  const [editingRecord, setEditingRecord] = useState<ScreeningRecord | null>(null);
  const [isFollowUpMode, setIsFollowUpMode] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastContent, setToastContent] = useState({ title: "บันทึกข้อมูลสำเร็จ!", description: "ระบบได้เชื่อมต่อบันทึกข้อมูลเข้าฐานข้อมูลเซิร์ฟเวอร์เรียบร้อย" });
  const [loading, setLoading] = useState(true);
  const [dbStatus, setDbStatus] = useState({ connected: false, message: "กำลังเชื่อมต่อ..." });

  useEffect(() => {
    async function checkDbStatus() {
      try {
        const { error } = await supabase.from('ncd_records').select('id').limit(1);
        if (error) {
           setDbStatus({ connected: false, message: "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้" });
        } else {
           setDbStatus({ connected: true, message: "เชื่อมต่อฐานข้อมูล Supabase สำเร็จ และพร้อมใช้งาน!" });
        }
      } catch (error) {
        setDbStatus({ connected: false, message: "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้" });
      }
    }
    checkDbStatus();
  }, []);

  // Fetch records from server database
  useEffect(() => {
    async function loadRecordsFromServer() {
      let dataLoaded = false;
      try {
        setLoading(true);
        const { data, error } = await supabase.from('ncd_records').select('data').order('created_at', { ascending: false });
        if (!error && data) {
           const loadedRecords = data
             .map((row: any) => row.data)
             .filter((r) => r !== null && r !== undefined && typeof r === "object" && "id" in r);
           setRecords(loadedRecords);
           dataLoaded = true;
        }
      } catch (error) {
        console.error("Error loading records from server:", error);
      } finally {
        if (!dataLoaded) {
          const localRecords = localStorage.getItem("ncd_records");
          if (localRecords) {
            try {
              const parsed = JSON.parse(localRecords);
              if (Array.isArray(parsed)) {
                setRecords(parsed.filter((r) => r !== null && r !== undefined && typeof r === "object" && "id" in r));
              }
            } catch (e) {
              console.error("Error parsing localStorage records:", e);
            }
          }
        }
        setLoading(false);
      }
    }

    loadRecordsFromServer();
  }, []);

  // Save to localStorage as secondary backup
  useEffect(() => {
    if (!loading && records !== undefined && records !== null) {
      localStorage.setItem("ncd_records", JSON.stringify(records.filter(Boolean)));
    }
  }, [records, loading]);

  // Sync / add or edit record
  const handleAddRecordSuccess = async (savedRecord: ScreeningRecord, isEdit: boolean) => {
    if (!savedRecord) {
      console.error("handleAddRecordSuccess called with null savedRecord");
      return;
    }

    if (isEdit) {
      setRecords((prev) => prev.map((r) => (r && r.id === savedRecord.id ? savedRecord : r)).filter(Boolean));
      setEditingRecord(null);
    } else {
      setRecords((prev) => {
        const safePrev = prev.filter(Boolean);
        if (safePrev.some((r) => r && r.id === savedRecord.id)) {
          return safePrev.map((r) => (r && r.id === savedRecord.id ? savedRecord : r)).filter(Boolean);
        }
        return [...safePrev, savedRecord];
      });
      setEditingRecord(null);
      setIsFollowUpMode(false);
    }

    setToastContent({
      title: "บันทึกข้อมูลสำเร็จ!",
      description: "ระบบได้เชื่อมต่อบันทึกข้อมูลเข้าฐานข้อมูลเซิร์ฟเวอร์เรียบร้อย"
    });

    setShowToast(true);
    setTimeout(() => setShowToast(false), 3500);
    // Switch to dashboard automatically to see the saved entry!
    setActiveTab("dash");
  };

  // Update record (specifically when AI advice is generated and saved)
  const handleUpdateRecord = async (updatedRecord: ScreeningRecord) => {
    if (!updatedRecord) return;
    // Optimistically update in client state first
    setRecords((prev) => prev.map((r) => (r && r.id === updatedRecord.id ? updatedRecord : r)).filter(Boolean));
    setSelectedRecord(updatedRecord); // update current active modal record

    try {
      const { error } = await supabase.from('ncd_records').upsert({
         id: updatedRecord.id,
         name: updatedRecord.name,
         visit_number: updatedRecord.visitNumber,
         age: updatedRecord.age,
         gender: updatedRecord.gender,
         data: updatedRecord
      });
    } catch (error) {
      console.error("Error updating record with AI advice on server:", error);
    }
  };

  // Delete record
  const handleDeleteRecord = async (id: number) => {
    // Delete locally first to be fully responsive and robust
    setRecords((prev) => prev.filter((r) => r && r.id !== id));

    try {
      await supabase.from('ncd_records').delete().eq('id', id);
    } catch (error) {
      console.error("Error deleting record from server:", error);
    }
  };

  // Import records (Restore from Backup)
  const handleImportRecords = async (importedRecords: ScreeningRecord[]) => {
    if (!importedRecords || !Array.isArray(importedRecords) || importedRecords.length === 0) {
      alert("ไฟล์ที่อัปโหลดไม่มีข้อมูลที่ถูกต้อง");
      return;
    }

    try {
      // Map to Supabase format
      const formattedData = importedRecords.map(record => ({
         id: record.id,
         name: record.name,
         visit_number: record.visitNumber || 1,
         age: record.age,
         gender: record.gender,
         data: record
      }));
      
      const { error } = await supabase.from('ncd_records').upsert(formattedData);
      
      if (error) {
        console.error("Supabase bulk insert error:", error);
        alert("เกิดข้อผิดพลาดในการอัปโหลดไปที่ฐานข้อมูล");
        return;
      }

      // Merge local state immediately
      setRecords(prev => {
        const newIds = new Set(importedRecords.map(r => r.id));
        return [...prev.filter(r => !newIds.has(r.id)), ...importedRecords].sort((a, b) => b.id - a.id);
      });

      alert(`นำเข้าข้อมูลสำเร็จจำนวน ${importedRecords.length} เคส`);

    } catch (error) {
       console.error("Error importing records:", error);
       alert("เกิดข้อผิดพลาดในการนำเข้าข้อมูล");
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans antialiased text-slate-800">
      
      {/* Premium Header - Clean Minimalism */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row py-3.5 items-center justify-between gap-4">
            
            {/* Logo / Branding - Clean Minimalist style */}
            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-xs shrink-0">
                <HeartPulse className="w-5.5 h-5.5 text-white" />
              </div>
              <div className="space-y-0.5">
                <h1 className="text-xs sm:text-sm font-bold tracking-wider text-slate-800 uppercase leading-none">
                  NCDs Screening
                </h1>
                <p className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase leading-none">
                  ระบบบันทึกและประเมินโรคไม่ติดต่อเรื้อรัง
                </p>
                <div className="text-[10px] sm:text-xs text-blue-700 font-extrabold uppercase tracking-wide flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-ping inline-block shrink-0" />
                  <span>โครงการ "Mini Flag Ship Satun"</span>
                </div>
              </div>
            </div>

            {/* Tabs Selector - Clean Minimalism */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 p-1 rounded-xl w-full md:w-auto justify-center">
              <button
                onClick={() => setActiveTab("form")}
                className={`px-4 py-2 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === "form"
                    ? "bg-blue-50 text-blue-700 shadow-2xs"
                    : "text-slate-600 hover:bg-slate-100/70 hover:text-slate-900"
                }`}
              >
                <ClipboardList className="w-4 h-4" />
                <span>แบบฟอร์มคัดกรอง</span>
              </button>

              <button
                onClick={() => setActiveTab("individual")}
                className={`px-4 py-2 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === "individual"
                    ? "bg-blue-50 text-blue-700 shadow-2xs"
                    : "text-slate-600 hover:bg-slate-100/70 hover:text-slate-900"
                }`}
              >
                <User className="w-4 h-4" />
                <span>วิเคราะห์รายบุคคล (ปิงปอง 7 สี)</span>
              </button>
              
              <button
                onClick={() => setActiveTab("dash")}
                className={`px-4 py-2 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === "dash"
                    ? "bg-blue-50 text-blue-700 shadow-2xs"
                    : "text-slate-600 hover:bg-slate-100/70 hover:text-slate-900"
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                <span>แดชบอร์ดสรุปผล</span>
              </button>

              <button
                onClick={() => setActiveTab("analytics")}
                className={`px-4 py-2 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === "analytics"
                    ? "bg-blue-50 text-blue-700 shadow-2xs"
                    : "text-slate-600 hover:bg-slate-100/70 hover:text-slate-900"
                }`}
              >
                <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
                <span>วิเคราะห์ภาพรวม (ปัญหา-ความสำเร็จ)</span>
              </button>
            </div>

            {/* Database Status Section */}
            <div className="flex items-center gap-2.5 shrink-0">
              {/* Database Connection Status Badge */}
              <div 
                title={dbStatus.message}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[11px] font-semibold transition-all shadow-2xs ${
                  dbStatus.connected
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-amber-50 text-amber-700 border-amber-200"
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${
                  dbStatus.connected 
                    ? "bg-emerald-500 animate-pulse" 
                    : "bg-amber-500"
                }`} />
                <span>
                  ฐานข้อมูล: {dbStatus.connected ? "Supabase" : "เครื่องนี้ (สำรอง)"}
                </span>
              </div>
            </div>

          </div>
        </div>
      </header>

        {/* Main Container Area */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          
          {loading ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400 space-y-3">
            <Activity className="w-10 h-10 text-blue-600 animate-spin" />
            <p className="text-sm font-semibold">กำลังเชื่อมต่อข้อมูลคัดกรองกับฐานข้อมูลเซิร์ฟเวอร์...</p>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {activeTab === "form" && (
              <motion.div
                key="form-view"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25 }}
              >
                <NcdForm 
                  onSubmitSuccess={handleAddRecordSuccess} 
                  initialRecord={editingRecord}
                  isFollowUp={isFollowUpMode}
                  onCancelEdit={() => {
                    setEditingRecord(null);
                    setIsFollowUpMode(false);
                    setActiveTab("dash");
                  }}
                />
              </motion.div>
            )}
            
            {activeTab === "dash" && (
              <motion.div
                key="dash-view"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25 }}
              >
                <NcdDashboard 
                  records={records}
                  onDeleteRecord={handleDeleteRecord}
                  onSelectRecord={setSelectedRecord}
                  onEditRecord={(record) => {
                    setEditingRecord(record);
                    setIsFollowUpMode(false);
                    setActiveTab("form");
                  }}
                  onFollowUpRecord={(record) => {
                    setEditingRecord(record);
                    setIsFollowUpMode(true);
                    setActiveTab("form");
                  }}
                  onAddScreeningClicked={() => {
                    setEditingRecord(null);
                    setIsFollowUpMode(false);
                    setActiveTab("form");
                  }}
                  onImportRecords={handleImportRecords}
                />
              </motion.div>
            )}

            {activeTab === "individual" && (
              <motion.div
                key="individual-view"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25 }}
              >
                <IndividualProfile 
                  records={records}
                  onSelectRecord={setSelectedRecord}
                  onFollowUpRecord={(record) => {
                    setEditingRecord(record);
                    setIsFollowUpMode(true);
                    setActiveTab("form");
                  }}
                />
              </motion.div>
            )}

            {activeTab === "analytics" && (
              <motion.div
                key="analytics-view"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25 }}
              >
                <NcdAnalyticsDashboard records={records} />
              </motion.div>
            )}
          </AnimatePresence>
        )}

      </main>

      {/* Premium Minimalist Footer */}
      <footer className="bg-white border-t border-slate-200 py-8 mt-12 print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center gap-6 text-center sm:text-left">
          <div className="space-y-1">
            <div className="text-slate-400 text-[10px] font-bold tracking-wider uppercase">
              ระบบบันทึกและประเมินโรคไม่ติดต่อเรื้อรัง
            </div>
            <div className="text-xs font-semibold text-slate-500">
              ระบบคัดกรองความดันโลหิตสูงและเบาหวาน
            </div>
          </div>
          <div className="flex flex-col sm:items-end text-center sm:text-right gap-0.5">
            <span className="text-xs text-slate-600">
              ผู้สร้าง: <strong className="text-slate-800 font-bold">นายรุ่งศักดิ์  จอสกุล</strong>
            </span>
            <span className="text-slate-400 font-semibold text-[10px] uppercase tracking-wider">
              นักวิชาการสาธารณสุขชำนาญการ
            </span>
          </div>
        </div>
      </footer>

      {/* Persistent Patient Report Modal Overlay */}
      <AnimatePresence>
        {selectedRecord && (
          <RecordModal 
            record={selectedRecord}
            onClose={() => setSelectedRecord(null)}
            onUpdateRecord={handleUpdateRecord}
            onDeleteRecord={handleDeleteRecord}
          />
        )}
      </AnimatePresence>

      {/* Bottom Floating Success Toast */}
      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-6 right-6 z-50 bg-slate-900 border border-slate-800 text-white p-4 rounded-xl shadow-xl flex items-center gap-3"
          >
            <div className="bg-emerald-500/10 text-emerald-400 p-1.5 rounded-lg shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold">{toastContent.title}</p>
              <p className="text-[10px] text-slate-400">{toastContent.description}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Simple Printable Styles */}
      <style>{`
        @media print {
          body {
            background-color: white !important;
            color: black !important;
          }
          header, footer, button, select, input, textarea {
            display: none !important;
          }
          main, #print-area {
            display: block !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
            background: transparent !important;
          }
          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
