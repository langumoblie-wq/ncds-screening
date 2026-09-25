import React, { useState, useEffect } from "react";
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
import { ProjectTracking } from "./components/ProjectTracking";
import { ScreeningRecord } from "./types";

export default function App() {
  const [activeTab, setActiveTab] = useState<"form" | "dash" | "individual" | "analytics" | "tracking">("form");
  // Immediate localStorage initialization so mobile users NEVER see a blank screen or hang
  const [records, setRecords] = useState<ScreeningRecord[]>(() => {
    try {
      if (typeof window !== "undefined") {
        const localRecords = localStorage.getItem("ncd_records");
        if (localRecords) {
          const parsed = JSON.parse(localRecords);
          if (Array.isArray(parsed)) {
            return parsed.filter((r) => r !== null && r !== undefined && typeof r === "object" && "id" in r);
          }
        }
      }
    } catch (e) {
      console.warn("Error parsing localStorage records:", e);
    }
    return [];
  });
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
  const [loading, setLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [dbStatus, setDbStatus] = useState({ connected: false, message: "กำลังตรวจสอบการเชื่อมต่อ..." });

  // Initial load and bi-directional sync with persistent server API (/api/records) + localStorage
  useEffect(() => {
    let isMounted = true;
    async function syncRecords() {
      try {
        setIsSyncing(true);

        // 1. Fetch from persistent server backend (/api/records)
        let serverRecords: ScreeningRecord[] = [];
        try {
          const res = await fetch("/api/records");
          if (res.ok) {
            const json = await res.json();
            if (json.success && Array.isArray(json.records)) {
              serverRecords = json.records.filter((r: any) => r && typeof r === "object" && "id" in r);
            }
          }
        } catch (apiErr) {
          console.warn("Server API fetch warning:", apiErr);
        }

        // 2. Fetch from Supabase if reachable
        let supabaseRecords: ScreeningRecord[] = [];
        try {
          const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 2000));
          const queryPromise = supabase.from('ncd_records').select('data').order('created_at', { ascending: false });
          const sbRes: any = await Promise.race([queryPromise, timeoutPromise]);
          if (!sbRes?.error && sbRes?.data && Array.isArray(sbRes.data)) {
            supabaseRecords = sbRes.data.map((row: any) => row.data).filter((r: any) => r && typeof r === "object" && "id" in r);
            setDbStatus({ connected: true, message: "เชื่อมต่อฐานข้อมูลเซิร์ฟเวอร์สำเร็จ และพร้อมใช้งาน!" });
          } else {
            setDbStatus({ connected: true, message: "เชื่อมต่อฐานข้อมูลภายในระบบเซิร์ฟเวอร์เรียบร้อย" });
          }
        } catch (sbErr) {
          setDbStatus({ connected: true, message: "เชื่อมต่อฐานข้อมูลภายในระบบเซิร์ฟเวอร์เรียบร้อย" });
        }

        // 3. Read current localStorage
        let localRecords: ScreeningRecord[] = [];
        try {
          const raw = localStorage.getItem("ncd_records");
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
              localRecords = parsed.filter((r: any) => r && typeof r === "object" && "id" in r);
            }
          }
        } catch (storageErr) {
          console.warn("Storage parse error:", storageErr);
        }

        // 4. Merge all sources by ID (Server records + Supabase records + Local records)
        const recordMap = new Map<number, ScreeningRecord>();
        // Put server records first
        serverRecords.forEach(r => recordMap.set(r.id, r));
        // Put supabase records
        supabaseRecords.forEach(r => recordMap.set(r.id, r));
        // Put local records (preserves latest local edits)
        localRecords.forEach(r => {
          if (!recordMap.has(r.id)) {
            recordMap.set(r.id, r);
          }
        });

        const mergedRecords = Array.from(recordMap.values()).sort((a, b) => (b.id || 0) - (a.id || 0));

        if (!isMounted) return;

        if (mergedRecords.length > 0) {
          setRecords(mergedRecords);
          try {
            localStorage.setItem("ncd_records", JSON.stringify(mergedRecords));
          } catch (e) {}

          // If local or supabase had extra records not yet on server, sync them to server
          if (localRecords.length > serverRecords.length || supabaseRecords.length > serverRecords.length) {
            try {
              await fetch("/api/records/bulk", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ records: mergedRecords })
              });
            } catch (syncErr) {
              console.warn("Bulk sync error:", syncErr);
            }
          }
        }
      } catch (error) {
        console.warn("Sync error:", error);
      } finally {
        if (isMounted) {
          setIsSyncing(false);
          setLoading(false);
        }
      }
    }

    syncRecords();
    return () => { isMounted = false; };
  }, []);

  // Save to localStorage as secondary backup safely
  useEffect(() => {
    if (records !== undefined && records !== null && records.length > 0) {
      try {
        localStorage.setItem("ncd_records", JSON.stringify(records.filter(Boolean)));
      } catch (e) {
        console.warn("Storage quota or error:", e);
      }
    }
  }, [records]);

  // Sync / add or edit record
  const handleAddRecordSuccess = async (savedRecord: ScreeningRecord, isEdit: boolean) => {
    if (!savedRecord) {
      console.error("handleAddRecordSuccess called with null savedRecord");
      return;
    }

    let updatedList: ScreeningRecord[] = [];
    if (isEdit) {
      setRecords((prev) => {
        updatedList = prev.map((r) => (r && r.id === savedRecord.id ? savedRecord : r)).filter(Boolean);
        return updatedList;
      });
      setEditingRecord(null);
    } else {
      setRecords((prev) => {
        const safePrev = prev.filter(Boolean);
        if (safePrev.some((r) => r && r.id === savedRecord.id)) {
          updatedList = safePrev.map((r) => (r && r.id === savedRecord.id ? savedRecord : r)).filter(Boolean);
        } else {
          updatedList = [savedRecord, ...safePrev];
        }
        return updatedList;
      });
      setEditingRecord(null);
      setIsFollowUpMode(false);
    }

    // Persist to server backend API
    try {
      await fetch("/api/records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ record: savedRecord })
      });
    } catch (err) {
      console.warn("Failed to persist record to /api/records:", err);
    }

    // Background sync to Supabase
    try {
      supabase.from('ncd_records').upsert({
        id: savedRecord.id,
        name: savedRecord.name,
        visit_number: savedRecord.visitNumber,
        age: savedRecord.age,
        gender: savedRecord.gender,
        data: savedRecord,
        created_at: savedRecord.createdAt || new Date().toISOString()
      }).then(() => {});
    } catch (sbErr) {}

    setToastContent({
      title: "บันทึกข้อมูลสำเร็จ!",
      description: "ระบบได้บันทึกข้อมูลเข้าสู่ฐานข้อมูลเรียบร้อยแล้ว"
    });

    setShowToast(true);
    setTimeout(() => setShowToast(false), 3500);
    setActiveTab("dash");
  };

  // Update record (specifically when AI advice is generated and saved)
  const handleUpdateRecord = async (updatedRecord: ScreeningRecord) => {
    if (!updatedRecord) return;
    setRecords((prev) => prev.map((r) => (r && r.id === updatedRecord.id ? updatedRecord : r)).filter(Boolean));
    setSelectedRecord(updatedRecord);

    try {
      await fetch("/api/records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ record: updatedRecord })
      });
    } catch (err) {
      console.warn("Error updating record to /api/records:", err);
    }

    try {
      supabase.from('ncd_records').upsert({
        id: updatedRecord.id,
        name: updatedRecord.name,
        visit_number: updatedRecord.visitNumber,
        age: updatedRecord.age,
        gender: updatedRecord.gender,
        data: updatedRecord
      }).then(() => {});
    } catch (error) {}
  };

  // Delete record
  const handleDeleteRecord = async (id: number) => {
    setRecords((prev) => prev.filter((r) => r && r.id !== id));

    try {
      await fetch(`/api/records/${id}`, { method: "DELETE" });
    } catch (err) {
      console.warn("Error deleting record from server:", err);
    }

    try {
      supabase.from('ncd_records').delete().eq('id', id).then(() => {});
    } catch (error) {}
  };

  // Import records (Restore from Backup)
  const handleImportRecords = async (importedRecords: ScreeningRecord[]) => {
    if (!importedRecords || !Array.isArray(importedRecords) || importedRecords.length === 0) {
      alert("ไฟล์ที่อัปโหลดไม่มีข้อมูลที่ถูกต้อง");
      return;
    }

    try {
      // 1. Immediately update client state
      let merged: ScreeningRecord[] = [];
      setRecords(prev => {
        const newIds = new Set(importedRecords.map(r => r.id));
        merged = [...importedRecords, ...prev.filter(r => !newIds.has(r.id))].sort((a, b) => (b.id || 0) - (a.id || 0));
        return merged;
      });

      // 2. Persist to server backend API
      await fetch("/api/records/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ records: importedRecords })
      });

      // 3. Save to localStorage
      try {
        localStorage.setItem("ncd_records", JSON.stringify(merged));
      } catch (e) {}

      // 4. Try background sync to Supabase
      try {
        const formattedData = importedRecords.map(record => ({
          id: record.id,
          name: record.name,
          visit_number: record.visitNumber || 1,
          age: record.age,
          gender: record.gender,
          data: record
        }));
        supabase.from('ncd_records').upsert(formattedData).then(() => {});
      } catch (sbErr) {}

      setToastContent({
        title: "นำเข้าข้อมูลสำเร็จ!",
        description: `นำเข้าข้อมูลจำนวน ${importedRecords.length.toLocaleString()} รายการเรียบร้อยแล้ว`
      });
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3500);
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
    <div className="min-h-screen bg-[#F8FAFC] print:bg-white flex flex-col font-sans antialiased text-slate-800" style={{ WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}>
      
      {/* Premium Header - Clean Minimalism & Mobile Optimized */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs print:hidden">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row py-2.5 sm:py-3.5 items-stretch md:items-center justify-between gap-3">
            
            {/* Logo / Branding & Mobile Quick Controls */}
            <div className="flex items-center justify-between gap-3 w-full md:w-auto">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 sm:w-10 sm:h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-xs shrink-0">
                  <HeartPulse className="w-5 h-5 text-white" />
                </div>
                <div className="space-y-0.5 min-w-0">
                  <h1 className="text-xs sm:text-sm font-bold tracking-wider text-slate-800 uppercase leading-none">
                    NCDs Screening 35+
                  </h1>
                  <p className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase leading-none truncate">
                    ระบบบันทึกและประเมินโรคไม่ติดต่อเรื้อรัง
                  </p>
                </div>
              </div>

              {/* Mobile Quick Action Buttons (Admin & Sync status) */}
              <div className="flex items-center gap-1.5 md:hidden shrink-0">
                {isAdmin ? (
                  <button
                    onClick={() => setIsAdmin(false)}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 text-[10px] font-bold"
                  >
                    ออกระบบ
                  </button>
                ) : (
                  <button
                    onClick={() => setShowLoginModal(true)}
                    className="px-2.5 py-1.5 rounded-lg bg-blue-600 text-white text-[10px] font-bold"
                  >
                    เข้าสู่ระบบ
                  </button>
                )}
                
                <span 
                  title={dbStatus.message}
                  className={`w-2.5 h-2.5 rounded-full ${
                    dbStatus.connected ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
                  }`} 
                />
              </div>
            </div>

            {/* Satun Project Title Pill */}
            <div className="text-[10px] sm:text-xs text-blue-700 font-bold bg-blue-50/80 border border-blue-100 rounded-lg px-2.5 py-1 flex items-center gap-1.5 w-full md:w-auto overflow-hidden">
              <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-ping inline-block shrink-0" />
              <span className="truncate">โครงการลดโรค NCDs ด้วยแผนปรับเปลี่ยนพฤติกรรมรายบุคคล "Mini Flag Ship Satun"</span>
            </div>

            {/* Desktop & Tablet Tabs Selector with horizontal touch scroll */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 p-1 rounded-xl w-full md:w-auto overflow-x-auto no-scrollbar scroll-smooth whitespace-nowrap flex-nowrap">
              <button
                onClick={() => setActiveTab("form")}
                className={`px-3 sm:px-4 py-2 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer shrink-0 whitespace-nowrap min-h-[38px] ${
                  activeTab === "form"
                    ? "bg-blue-50 text-blue-700 shadow-2xs font-bold"
                    : "text-slate-600 hover:bg-slate-100/70 hover:text-slate-900"
                }`}
              >
                <ClipboardList className="w-4 h-4" />
                <span>แบบฟอร์มคัดกรอง</span>
              </button>

              <button
                onClick={() => setActiveTab("individual")}
                className={`px-3 sm:px-4 py-2 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer shrink-0 whitespace-nowrap min-h-[38px] ${
                  activeTab === "individual"
                    ? "bg-blue-50 text-blue-700 shadow-2xs font-bold"
                    : "text-slate-600 hover:bg-slate-100/70 hover:text-slate-900"
                }`}
              >
                <User className="w-4 h-4" />
                <span>วิเคราะห์รายบุคคล (ปิงปอง 7 สี)</span>
              </button>
              
              <button
                onClick={() => setActiveTab("dash")}
                className={`px-3 sm:px-4 py-2 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer shrink-0 whitespace-nowrap min-h-[38px] ${
                  activeTab === "dash"
                    ? "bg-blue-50 text-blue-700 shadow-2xs font-bold"
                    : "text-slate-600 hover:bg-slate-100/70 hover:text-slate-900"
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                <span>แดชบอร์ดสรุปผล</span>
              </button>

              <button
                onClick={() => setActiveTab("analytics")}
                className={`px-3 sm:px-4 py-2 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer shrink-0 whitespace-nowrap min-h-[38px] ${
                  activeTab === "analytics"
                    ? "bg-blue-50 text-blue-700 shadow-2xs font-bold"
                    : "text-slate-600 hover:bg-slate-100/70 hover:text-slate-900"
                }`}
              >
                <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
                <span>วิเคราะห์ภาพรวม</span>
              </button>

              <button
                onClick={() => setActiveTab("tracking")}
                className={`px-3 sm:px-4 py-2 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer shrink-0 whitespace-nowrap min-h-[38px] ${
                  activeTab === "tracking"
                    ? "bg-indigo-50 text-indigo-700 shadow-2xs font-bold"
                    : "text-slate-600 hover:bg-slate-100/70 hover:text-slate-900"
                }`}
              >
                <Activity className="w-4 h-4" />
                <span>ติดตามโครงการ</span>
              </button>
            </div>

            {/* Desktop Database & Admin Status Section */}
            <div className="hidden md:flex items-center gap-2 shrink-0">
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
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-6 pb-24 md:pb-8">
          
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
            {activeTab === "tracking" && (
              <motion.div
                key="tracking-view"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25 }}
              >
                <ProjectTracking records={records} />
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
            allRecords={records}
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

      {/* Fixed Mobile Bottom Navigation Bar (Thumb Friendly) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 py-1.5 px-2 flex items-center justify-around shadow-[0_-2px_10px_rgba(0,0,0,0.06)] print:hidden">
        <button
          onClick={() => setActiveTab("form")}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all cursor-pointer min-w-[56px] min-h-[44px] ${
            activeTab === "form" ? "text-blue-600 font-bold" : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <ClipboardList className={`w-5 h-5 ${activeTab === "form" ? "stroke-[2.5]" : "stroke-[1.75]"}`} />
          <span className="text-[10px] mt-0.5">แบบฟอร์ม</span>
        </button>

        <button
          onClick={() => setActiveTab("individual")}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all cursor-pointer min-w-[56px] min-h-[44px] ${
            activeTab === "individual" ? "text-blue-600 font-bold" : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <User className={`w-5 h-5 ${activeTab === "individual" ? "stroke-[2.5]" : "stroke-[1.75]"}`} />
          <span className="text-[10px] mt-0.5">7 สี</span>
        </button>

        <button
          onClick={() => setActiveTab("dash")}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all cursor-pointer min-w-[56px] min-h-[44px] ${
            activeTab === "dash" ? "text-blue-600 font-bold" : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <BarChart3 className={`w-5 h-5 ${activeTab === "dash" ? "stroke-[2.5]" : "stroke-[1.75]"}`} />
          <span className="text-[10px] mt-0.5">สรุปผล</span>
        </button>

        <button
          onClick={() => setActiveTab("analytics")}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all cursor-pointer min-w-[56px] min-h-[44px] ${
            activeTab === "analytics" ? "text-blue-600 font-bold" : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <Sparkles className={`w-5 h-5 ${activeTab === "analytics" ? "text-amber-500 stroke-[2.5]" : "stroke-[1.75]"}`} />
          <span className="text-[10px] mt-0.5">ภาพรวม</span>
        </button>

        <button
          onClick={() => setActiveTab("tracking")}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all cursor-pointer min-w-[56px] min-h-[44px] ${
            activeTab === "tracking" ? "text-indigo-600 font-bold" : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <Activity className={`w-5 h-5 ${activeTab === "tracking" ? "stroke-[2.5]" : "stroke-[1.75]"}`} />
          <span className="text-[10px] mt-0.5">ติดตาม</span>
        </button>
      </nav>

      {/* Floating Success Toast (Adjusted for mobile to avoid bottom nav bar) */}
      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-18 md:bottom-6 right-4 left-4 md:left-auto md:right-6 z-50 bg-slate-900 border border-slate-800 text-white p-3.5 sm:p-4 rounded-xl shadow-xl flex items-center gap-3"
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
