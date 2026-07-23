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
  
  // Login states
  const [isAdmin, setIsAdmin] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");

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

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginUsername === "admin" && loginPassword === "admin1234") {
      setIsAdmin(true);
      setShowLoginModal(false);
      setLoginError("");
      setLoginUsername("");
      setLoginPassword("");
    } else {
      setLoginError("รหัสผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง");
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
            <div className="flex flex-wrap items-center gap-2.5 shrink-0 justify-center">
              {isAdmin ? (
                <button
                  onClick={() => setIsAdmin(false)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 text-[11px] font-bold shadow-2xs transition-all flex items-center gap-1"
                >
                  <User className="w-3.5 h-3.5" />
                  ออกจากระบบแอดมิน
                </button>
              ) : (
                <button
                  onClick={() => setShowLoginModal(true)}
                  className="px-3 py-1.5 rounded-xl border border-blue-600 bg-blue-600 text-white hover:bg-blue-700 text-[11px] font-bold shadow-2xs transition-all flex items-center gap-1"
                >
                  <User className="w-3.5 h-3.5" />
                  เข้าสู่ระบบ
                </button>
              )}

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
                  isAdmin={isAdmin}
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
                  isAdmin={isAdmin}
                  records={records}
                  onSelectRecord={setSelectedRecord}
                  onFollowUpRecord={(record) => {
                    setEditingRecord(record);
                    setIsFollowUpMode(true);
                    setActiveTab("form");
                  }}
                  onEditRecord={(record) => {
                    setEditingRecord(record);
                    setIsFollowUpMode(false);
                    setActiveTab("form");
                  }}
                  onDeleteRecord={(record) => handleDeleteRecord(record.id)}
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
            isAdmin={isAdmin}
            record={selectedRecord}
            onClose={() => setSelectedRecord(null)}
            onUpdateRecord={handleUpdateRecord}
            onDeleteRecord={handleDeleteRecord}
          />
        )}
      </AnimatePresence>

      {/* Admin Login Modal */}
      <AnimatePresence>
        {showLoginModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden border border-slate-200"
            >
              <div className="bg-slate-50 border-b border-slate-100 p-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">เข้าสู่ระบบแอดมิน</h3>
                    <p className="text-[10px] text-slate-500">สำหรับเจ้าหน้าที่เพื่อจัดการข้อมูล</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowLoginModal(false)}
                  className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1.5 rounded-lg transition-colors"
                >
                  <AlertTriangle className="w-4 h-4 hidden" /> {/* dummy icon to suppress warning */}
                  &times;
                </button>
              </div>

              <form onSubmit={handleLogin} className="p-5 space-y-4">
                {loginError && (
                  <div className="bg-rose-50 border border-rose-200 text-rose-600 text-xs p-3 rounded-lg flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{loginError}</span>
                  </div>
                )}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-700">ชื่อผู้ใช้งาน</label>
                  <input
                    type="text"
                    required
                    value={loginUsername}
                    onChange={(e) => setLoginUsername(e.target.value)}
                    className="w-full text-sm rounded-xl border border-slate-300 p-2.5 focus:ring-2 focus:ring-blue-500 bg-white"
                    placeholder="Username"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-700">รหัสผ่าน</label>
                  <input
                    type="password"
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full text-sm rounded-xl border border-slate-300 p-2.5 focus:ring-2 focus:ring-blue-500 bg-white"
                    placeholder="Password"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-3 px-4 rounded-xl transition-colors shadow-sm"
                >
                  เข้าสู่ระบบ
                </button>
              </form>
            </motion.div>
          </div>
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
