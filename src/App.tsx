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
import { ScreeningRecord, DistrictType } from "./types";
import { 
  cleanDistrict, 
  cleanSubdistrict, 
  getRecordModel, 
  getRecordSubdistrict 
} from "./components/BackupRestoreModal";

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

  // Normalizer for legacy location names (e.g. ปานชู -> ชุมชนปานชูรำลึก, model: ตำบล)
  const normalizeLegacyRecord = (r: any): ScreeningRecord => {
    if (!r || typeof r !== "object") return r;
    if (r.targetArea === "ปานชู") {
      return {
        ...r,
        targetArea: "ชุมชนปานชูรำลึก",
        modelType: "ตำบล",
        district: r.district || "เมือง",
        subdistrict: r.subdistrict || "พิมาน"
      };
    }
    return r;
  };

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
              serverRecords = json.records
                .filter((r: any) => r && typeof r === "object" && "id" in r)
                .map(normalizeLegacyRecord);
            }
          }
        } catch (apiErr) {
          console.warn("Server API fetch warning:", apiErr);
        }

        // 2. Fetch from Supabase with full pagination if reachable
        let supabaseRecords: ScreeningRecord[] = [];
        try {
          const pageSize = 1000;
          let page = 0;
          let hasMore = true;
          let allSbData: any[] = [];

          while (hasMore && page < 10) {
            const from = page * pageSize;
            const to = from + pageSize - 1;
            const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 8000));
            const queryPromise = supabase
              .from('ncd_records')
              .select('data')
              .range(from, to)
              .order('created_at', { ascending: false });

            const sbRes: any = await Promise.race([queryPromise, timeoutPromise]);
            if (!sbRes?.error && sbRes?.data && Array.isArray(sbRes.data) && sbRes.data.length > 0) {
              allSbData = allSbData.concat(sbRes.data);
              if (sbRes.data.length < pageSize) {
                hasMore = false;
              } else {
                page++;
              }
            } else {
              hasMore = false;
            }
          }

          if (allSbData.length > 0) {
            supabaseRecords = allSbData
              .map((row: any) => normalizeLegacyRecord(row.data))
              .filter((r: any) => r && typeof r === "object" && "id" in r);
            setDbStatus({ 
              connected: true, 
              message: `เชื่อมต่อ Cloud Supabase สำเร็จ (โหลด ${supabaseRecords.length.toLocaleString()} รายการ)` 
            });
          } else {
            setDbStatus({ 
              connected: false, 
              message: "เชื่อมต่อฐานข้อมูลภายในระบบ" 
            });
          }
        } catch (sbErr) {
          console.warn("Supabase fetch warning:", sbErr);
          setDbStatus({ connected: false, message: "เชื่อมต่อฐานข้อมูลภายในระบบ" });
        }

        // 3. Read current localStorage
        let localRecords: ScreeningRecord[] = [];
        try {
          const raw = localStorage.getItem("ncd_records");
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
              localRecords = parsed
                .filter((r: any) => r && typeof r === "object" && ("id" in r || "name" in r))
                .map(normalizeLegacyRecord);
            }
          }
        } catch (storageErr) {
          console.warn("Storage parse error:", storageErr);
        }

        // 4. Merge all sources by ID (Server records + Supabase records + Local records)
        const recordMap = new Map<number, ScreeningRecord>();
        // Put server records first
        serverRecords.forEach(r => {
          if (r && r.id != null) recordMap.set(Number(r.id), r);
        });
        // Put supabase records
        supabaseRecords.forEach(r => {
          if (r && r.id != null) recordMap.set(Number(r.id), r);
        });
        // Put local records (preserve newer edits from local if local was updated)
        localRecords.forEach(r => {
          if (r && r.id != null) {
            const numId = Number(r.id);
            const existing = recordMap.get(numId);
            if (!existing) {
              recordMap.set(numId, r);
            } else {
              if (r.createdAt && existing.createdAt && r.createdAt > existing.createdAt) {
                recordMap.set(numId, r);
              }
            }
          }
        });

        const mergedRecords = Array.from(recordMap.values()).sort((a, b) => (Number(b.id) || 0) - (Number(a.id) || 0));

        if (!isMounted) return;

        if (mergedRecords.length > 0) {
          setRecords(mergedRecords);
          try {
            localStorage.setItem("ncd_records", JSON.stringify(mergedRecords));
          } catch (e) {}

          // If local or supabase had extra records not yet on server, sync them to server
          if (mergedRecords.length > serverRecords.length) {
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
          // CRITICAL: If local has records that are NOT in Supabase, upload them to Supabase!
          const supabaseIdSet = new Set(supabaseRecords.map(r => Number(r.id)));
          const missingInSupabase = mergedRecords.filter(r => r && r.id != null && !supabaseIdSet.has(Number(r.id)));
          if (missingInSupabase.length > 0) {
            try {
              console.log(`Syncing ${missingInSupabase.length} missing local records to Supabase Cloud...`);
              const BATCH_SIZE = 50;
              for (let i = 0; i < missingInSupabase.length; i += BATCH_SIZE) {
                const chunk = missingInSupabase.slice(i, i + BATCH_SIZE);
                const formatted = chunk.map(r => ({
                  id: Number(r.id),
                  name: r.name,
                  visit_number: r.visitNumber || 1,
                  age: r.age,
                  gender: r.gender,
                  data: r,
                  created_at: r.createdAt || new Date().toISOString()
                }));
                await supabase.from('ncd_records').upsert(formatted);
              }
              console.log("Uploaded missing records to Supabase Cloud successfully!");
            } catch (upErr) {
              console.warn("Error uploading local records to Supabase:", upErr);
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

  // Real-time listener for multi-device sync
  useEffect(() => {
    try {
      const channel = supabase
        .channel('ncd_records_realtime')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'ncd_records' },
          (payload: any) => {
            if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
              const rowData = normalizeLegacyRecord(payload.new?.data);
              if (rowData && rowData.id) {
                setRecords(prev => {
                  const map = new Map<number, ScreeningRecord>();
                  (prev || []).forEach(r => { if (r?.id) map.set(Number(r.id), r); });
                  map.set(Number(rowData.id), rowData);
                  const updated = Array.from(map.values()).sort((a, b) => (Number(b.id) || 0) - (Number(a.id) || 0));
                  try { localStorage.setItem("ncd_records", JSON.stringify(updated)); } catch (e) {}
                  return updated;
                });
              }
            } else if (payload.eventType === 'DELETE') {
              const deletedId = payload.old?.id;
              if (deletedId) {
                setRecords(prev => {
                  const updated = (prev || []).filter(r => Number(r.id) !== Number(deletedId));
                  try { localStorage.setItem("ncd_records", JSON.stringify(updated)); } catch (e) {}
                  return updated;
                });
              }
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } catch (e) {
      console.warn("Realtime subscription warning:", e);
    }
  }, []);

  // Function to manually re-sync records with Supabase & server
  const handleManualSync = async () => {
    try {
      setIsSyncing(true);
      const pageSize = 1000;
      let page = 0;
      let hasMore = true;
      let allSbData: any[] = [];

      while (hasMore && page < 10) {
        const from = page * pageSize;
        const to = from + pageSize - 1;
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 10000));
        const queryPromise = supabase
          .from('ncd_records')
          .select('data')
          .range(from, to)
          .order('created_at', { ascending: false });

        const sbRes: any = await Promise.race([queryPromise, timeoutPromise]);
        if (!sbRes?.error && sbRes?.data && Array.isArray(sbRes.data) && sbRes.data.length > 0) {
          allSbData = allSbData.concat(sbRes.data);
          if (sbRes.data.length < pageSize) {
            hasMore = false;
          } else {
            page++;
          }
        } else {
          hasMore = false;
        }
      }

      if (allSbData.length > 0) {
        const cloudRecords: ScreeningRecord[] = allSbData
          .map((row: any) => normalizeLegacyRecord(row.data))
          .filter((r: any) => r && typeof r === "object" && "id" in r);

        const sbIdSet = new Set<number>();
        cloudRecords.forEach(r => { if (r?.id) sbIdSet.add(Number(r.id)); });

        // Merge with local state
        const map = new Map<number, ScreeningRecord>();
        (records || []).forEach(r => { if (r?.id) map.set(Number(r.id), r); });
        cloudRecords.forEach(r => { if (r?.id) map.set(Number(r.id), r); });
        
        const merged = Array.from(map.values()).sort((a, b) => (Number(b.id) || 0) - (Number(a.id) || 0));
        setRecords(merged);
        localStorage.setItem("ncd_records", JSON.stringify(merged));

        // Upload any local records that were missing on Cloud
        const missingOnCloud = (records || []).filter(r => r && r.id != null && !sbIdSet.has(Number(r.id)));
        if (missingOnCloud.length > 0) {
          const BATCH_SIZE = 50;
          for (let i = 0; i < missingOnCloud.length; i += BATCH_SIZE) {
            const chunk = missingOnCloud.slice(i, i + BATCH_SIZE);
            const formatted = chunk.map(r => ({
              id: Number(r.id),
              name: r.name,
              visit_number: r.visitNumber || 1,
              age: r.age,
              gender: r.gender,
              data: r,
              created_at: r.createdAt || new Date().toISOString()
            }));
            await supabase.from('ncd_records').upsert(formatted);
          }
        }
        
        setToastContent({
          title: "ซิงค์ข้อมูล Cloud สำเร็จ!",
          description: missingOnCloud.length > 0
            ? `นำข้อมูลในเครื่องขึ้น Cloud ${missingOnCloud.length} รายการ และรวมข้อมูลทั้งหมดเป็น ${merged.length.toLocaleString()} รายการตรงกันแล้ว`
            : `ดึงข้อมูลจาก Cloud ล่าสุด รวมทั้งหมด ${merged.length.toLocaleString()} รายการเรียบร้อย`
        });
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3500);
      }
    } catch (err: any) {
      console.warn("Manual sync error:", err);
      alert("ไม่สามารถซิงค์ข้อมูลจาก Cloud ได้ในขณะนี้: " + (err.message || "กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต"));
    } finally {
      setIsSyncing(false);
    }
  };

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
      await supabase.from('ncd_records').upsert({
        id: savedRecord.id,
        name: savedRecord.name,
        visit_number: savedRecord.visitNumber,
        age: savedRecord.age,
        gender: savedRecord.gender,
        data: savedRecord,
        created_at: savedRecord.createdAt || new Date().toISOString()
      });
    } catch (sbErr) {
      console.warn("Supabase upsert warning:", sbErr);
    }

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
      await supabase.from('ncd_records').upsert({
        id: updatedRecord.id,
        name: updatedRecord.name,
        visit_number: updatedRecord.visitNumber,
        age: updatedRecord.age,
        gender: updatedRecord.gender,
        data: updatedRecord,
        created_at: updatedRecord.createdAt || new Date().toISOString()
      });
    } catch (error) {
      console.warn("Supabase update warning:", error);
    }
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
      await supabase.from('ncd_records').delete().eq('id', id);
    } catch (error) {
      console.warn("Supabase delete warning:", error);
    }
  };

  // Import records (Restore from Backup) with verified persistence
  const handleImportRecords = async (importedRecords: ScreeningRecord[]): Promise<boolean> => {
    if (!importedRecords || !Array.isArray(importedRecords) || importedRecords.length === 0) {
      alert("ไฟล์ที่อัปโหลดไม่มีข้อมูลที่ถูกต้อง");
      return false;
    }

    try {
      setLoading(true);

      // 1. Sanitize and normalize all imported records
      const sanitizedImported: ScreeningRecord[] = importedRecords.map((origR, idx) => {
        const r = normalizeLegacyRecord(origR);
        const id = Number(r.id) || (Date.now() + idx);
        const model = r.modelType || getRecordModel(r) || "หมู่บ้าน";
        const sub = cleanSubdistrict(r.subdistrict || getRecordSubdistrict(r));
        const rawDist = r.district || "เมือง";
        const dist = (cleanDistrict(rawDist) || "เมือง") as DistrictType;
        return {
          ...r,
          id,
          name: r.name || "ไม่ระบุชื่อ",
          visitNumber: Number(r.visitNumber) || 1,
          modelType: (model === "หมู่บ้าน" || model === "ตำบล" ? model : "หมู่บ้าน") as any,
          district: dist,
          subdistrict: sub,
          targetArea: r.targetArea || (sub ? `ต.${sub}` : "ทั่วไป"),
          createdAt: r.createdAt || new Date().toISOString()
        };
      });

      // 2. Fetch current server records to guarantee we don't drop existing database data
      let currentServerRecords: ScreeningRecord[] = [];
      try {
        const res = await fetch("/api/records");
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.records)) {
            currentServerRecords = json.records;
          }
        }
      } catch (fetchErr) {
        console.warn("Fetch before import warning:", fetchErr);
      }

      // 3. Read current localStorage
      let localRecords: ScreeningRecord[] = [];
      try {
        const raw = localStorage.getItem("ncd_records");
        if (raw) {
          const p = JSON.parse(raw);
          if (Array.isArray(p)) localRecords = p;
        }
      } catch (e) {}

      // 4. Construct unified merged map
      const recordMap = new Map<number, ScreeningRecord>();
      // Base: current server records
      currentServerRecords.forEach(r => { if (r && r.id != null) recordMap.set(Number(r.id), r); });
      // Base: local storage
      localRecords.forEach(r => { if (r && r.id != null && !recordMap.has(Number(r.id))) recordMap.set(Number(r.id), r); });
      // Base: active memory state
      (records || []).forEach(r => { if (r && r.id != null && !recordMap.has(Number(r.id))) recordMap.set(Number(r.id), r); });
      // Overlay: newly imported records (win over existing)
      sanitizedImported.forEach(r => { if (r && r.id != null) recordMap.set(Number(r.id), r); });

      const fullMergedList = Array.from(recordMap.values()).sort((a, b) => (Number(b.id) || 0) - (Number(a.id) || 0));

      // 5. Persist to server backend API first and WAIT for disk save to complete
      const saveRes = await fetch("/api/records/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ records: fullMergedList })
      });

      if (!saveRes.ok) {
        throw new Error("เซิร์ฟเวอร์ตอบกลับสถานะไม่สำเร็จในการบันทึก");
      }

      // 6. Save immediately to localStorage as secondary backup
      try {
        localStorage.setItem("ncd_records", JSON.stringify(fullMergedList));
      } catch (e) {
        console.warn("localStorage quota warning:", e);
      }

      // 7. Update active state
      setRecords(fullMergedList);

      // 8. Sync to Supabase in chunks to guarantee persistence on Cloud
      try {
        const formattedData = sanitizedImported.map(record => ({
          id: record.id,
          name: record.name,
          visit_number: record.visitNumber || 1,
          age: record.age,
          gender: record.gender,
          data: record,
          created_at: record.createdAt || new Date().toISOString()
        }));

        // Upsert in batches of 100 rows
        const BATCH_SIZE = 100;
        for (let i = 0; i < formattedData.length; i += BATCH_SIZE) {
          const chunk = formattedData.slice(i, i + BATCH_SIZE);
          await supabase.from('ncd_records').upsert(chunk);
        }
      } catch (sbErr) {
        console.warn("Supabase upsert warning during import:", sbErr);
      }

      setToastContent({
        title: "นำเข้าข้อมูลสำเร็จ!",
        description: `นำเข้า ${sanitizedImported.length.toLocaleString()} รายการ และรวมข้อมูลในระบบเป็น ${fullMergedList.length.toLocaleString()} รายการเรียบร้อย (รีเฟรชข้อมูลจะไม่หาย)`
      });
      setShowToast(true);
      setTimeout(() => setShowToast(false), 4000);
      return true;
    } catch (error: any) {
      console.error("Error importing records:", error);
      alert("เกิดข้อผิดพลาดในการนำเข้าข้อมูล: " + (error.message || "กรุณาลองใหม่อีกครั้ง"));
      return false;
    } finally {
      setLoading(false);
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
                
                <button
                  onClick={handleManualSync}
                  title={`${dbStatus.message} (คลิกเพื่อซิงค์ข้อมูล Cloud ทันที)`}
                  disabled={isSyncing}
                  className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center gap-1 text-[10px] font-semibold"
                >
                  <RefreshCw className={`w-3 h-3 ${isSyncing ? "animate-spin text-blue-600" : ""}`} />
                  <span 
                    className={`w-2 h-2 rounded-full ${
                      dbStatus.connected ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
                    }`} 
                  />
                </button>
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

              {/* Database Connection Status Badge (Click to Sync) */}
              <button 
                onClick={handleManualSync}
                disabled={isSyncing}
                title={`${dbStatus.message} (คลิกเพื่อซิงค์ข้อมูล Cloud ทันที)`}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[11px] font-semibold transition-all shadow-2xs cursor-pointer hover:opacity-90 ${
                  dbStatus.connected
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-amber-50 text-amber-700 border-amber-200"
                }`}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin text-blue-600" : ""}`} />
                <span className={`w-1.5 h-1.5 rounded-full ${
                  dbStatus.connected 
                    ? "bg-emerald-500 animate-pulse" 
                    : "bg-amber-500"
                }`} />
                <span>
                  ฐานข้อมูล: {dbStatus.connected ? "Cloud Supabase" : "เครื่องนี้ (สำรอง)"}
                </span>
              </button>
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
                  onSyncCloud={handleManualSync}
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
