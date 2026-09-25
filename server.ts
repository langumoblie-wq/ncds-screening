import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const RECORDS_FILE_PATH = path.join(process.cwd(), "records.json");

function getStoredRecords(): any[] {
  try {
    if (fs.existsSync(RECORDS_FILE_PATH)) {
      const data = fs.readFileSync(RECORDS_FILE_PATH, "utf-8");
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) {
        return parsed.filter(r => r && typeof r === "object" && "id" in r);
      }
    }
  } catch (err) {
    console.error("Error reading records.json:", err);
  }
  return [];
}

function saveStoredRecords(records: any[]): boolean {
  try {
    const valid = records.filter(r => r && typeof r === "object" && "id" in r);
    fs.writeFileSync(RECORDS_FILE_PATH, JSON.stringify(valid, null, 2), "utf-8");
    return true;
  } catch (err) {
    console.error("Error writing records.json:", err);
    return false;
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // API Routes for Persistent Records Storage
  app.get("/api/records", (_req, res) => {
    try {
      const records = getStoredRecords();
      res.json({ success: true, count: records.length, records });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to load records" });
    }
  });

  app.post("/api/records", (req, res) => {
    try {
      const { record } = req.body;
      if (!record || !record.id) {
        return res.status(400).json({ error: "Missing valid record data" });
      }

      const existing = getStoredRecords();
      const existingIdx = existing.findIndex(r => r.id === record.id);
      if (existingIdx !== -1) {
        existing[existingIdx] = record;
      } else {
        existing.unshift(record);
      }

      saveStoredRecords(existing);
      res.json({ success: true, record });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to save record" });
    }
  });

  app.post("/api/records/bulk", (req, res) => {
    try {
      const { records } = req.body;
      if (!Array.isArray(records)) {
        return res.status(400).json({ error: "Records must be an array" });
      }

      const current = getStoredRecords();
      const recordMap = new Map();
      current.forEach(r => recordMap.set(r.id, r));
      records.forEach(r => {
        if (r && r.id) recordMap.set(r.id, r);
      });

      const merged = Array.from(recordMap.values()).sort((a, b) => (b.id || 0) - (a.id || 0));
      saveStoredRecords(merged);
      res.json({ success: true, count: merged.length, records: merged });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to bulk save records" });
    }
  });

  app.delete("/api/records/:id", (req, res) => {
    try {
      const id = Number(req.params.id);
      const current = getStoredRecords();
      const filtered = current.filter(r => r.id !== id);
      saveStoredRecords(filtered);
      res.json({ success: true, count: filtered.length });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to delete record" });
    }
  });

  // Initialize Gemini Client
  const apiKey = process.env.GEMINI_API_KEY;
  const ai = new GoogleGenAI({
    apiKey: apiKey || "",
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });

  // API Route for Gemini Advice
  app.post("/api/generate-advice", async (req, res) => {
    try {
      const { record } = req.body;
      if (!record) {
        return res.status(400).json({ error: "Missing screening record data" });
      }

      if (!apiKey) {
        console.warn("GEMINI_API_KEY environment variable is not defined.");
        return res.json({ 
          advice: `### ⚠️ ยังไม่ได้ตั้งค่าระบบ AI
ขออภัย ระบบไม่สามารถติดต่อบริการวิเคราะห์สุขภาพอัตโนมัติได้ในขณะนี้ เนื่องจากเซิร์ฟเวอร์ยังไม่ได้เปิดใช้งานกุญแจความลับ (API Key) ในระบบความปลอดภัย

**กรุณาแจ้งผู้ดูแลระบบเพื่อเปิดใช้งาน:**
1. ไปที่เมนู **Settings > Secrets**
2. เพิ่มตัวแปรชื่อ **GEMINI_API_KEY** และใส่กุญแจความปลอดภัยของคุณ`
        });
      }

      // Build the clinical profile prompt
      const riskHT = record.htResult?.label || "ปกติ";
      const riskDM = record.dmResult?.label || "ปกติ";
      const bpStr = `${record.bpSys}/${record.bpDia} mmHg`;
      const sugarStr = record.sugar ? `${record.sugar} mg/dL` : "ไม่ได้ตรวจ";
      const bmiStr = record.bmi || "ไม่ได้ระบุ";
      const age = record.age || "ไม่ระบุ";
      const gender = record.gender || "ไม่ระบุ";
      
      const smoking = record.smoking || "ไม่สูบ";
      const alcohol = record.alcohol || "ไม่ดื่ม";
      const exercise = record.exercise || "ไม่ได้ระบุ";
      const sleep = record.sleep || "ไม่ได้ระบุ";

      const sweetLevel = record.foodHabit?.sweet?.level || "ปกติ";
      const sweetScore = record.foodHabit?.sweet?.score || 0;
      const fatLevel = record.foodHabit?.fat?.level || "ปกติ";
      const fatScore = record.foodHabit?.fat?.score || 0;
      const saltLevel = record.foodHabit?.salt?.level || "ปกติ";
      const saltScore = record.foodHabit?.salt?.score || 0;

      const systemPrompt = `คุณคือผู้เชี่ยวชาญด้านการส่งเสริมสุขภาพและการจัดการโรคไม่ติดต่อเรื้อรัง (NCDs) ประจำสำนักงานสาธารณสุขจังหวัดและโรงพยาบาลส่งเสริมสุขภาพตำบล (รพ.สต.) 
ให้คำปรึกษาและวางแผนปรับพฤติกรรมสุขภาพให้กับผู้รับการคัดกรองอย่างเฉพาะเจาะจง อบอุ่น เป็นมิตร กระชับ เข้าใจง่าย และสามารถนำไปปฏิบัติได้จริงในชีวิตประจำวันในบริบทชุมชนไทยภาคใต้ (เช่น อำเภอละงู จังหวัดสตูล)
ใช้ภาษาไทยที่สุภาพ เป็นกันเอง มีการจัดหัวข้อที่อ่านง่าย ชัดเจนเป็นข้อๆ`;

      const userPrompt = `กรุณาประเมินผลและให้คำแนะนำสุขภาพและการปรับพฤติกรรมเฉพาะบุคคลแก่ผู้รับการตรวจ NCDs:

**ข้อมูลส่วนบุคคลและผลตรวจทางคลินิก:**
- เพศ: ${gender}
- อายุ: ${age} ปี
- ดัชนีมวลกาย (BMI): ${bmiStr}
- ความดันโลหิต: ${bpStr} (ความเสี่ยงโรคความดันโลหิตสูง: ${riskHT})
- ระดับน้ำตาลในเลือด (DTX): ${sugarStr} (ความเสี่ยงโรคเบาหวาน: ${riskDM})

**พฤติกรรมการบริโภค (หมวด หวาน มัน เค็ม):**
- หมวดหวาน (Sweet): ระดับความเสี่ยง ${sweetLevel} (คะแนน: ${sweetScore}/3)
- หมวดมัน (Fat): ระดับความเสี่ยง ${fatLevel} (คะแนน: ${fatScore}/3)
- หมวดเค็ม (Salt): ระดับความเสี่ยง ${saltLevel} (คะแนน: ${saltScore}/3)

**พฤติกรรมการใช้ชีวิตประจำวัน:**
- การสูบบุหรี่: ${smoking}
- เครื่องดื่มแอลกอฮอล์: ${alcohol}
- การออกกำลังกาย: ${exercise}
- การนอนหลับ: ${sleep}

กรุณาเขียนโครงสร้างรายงานคำแนะนำด้วย Markdown รูปแบบดังนี้:
## 🩺 การประเมินสุขภาพโดยรวมจาก AI
(สรุปสั้นๆ 2-3 บรรทัดเกี่ยวกับสุขภาพของเขาอย่างเป็นมิตร)

### 🥗 คำแนะนำด้านโภชนาการและการกิน
- เจาะลึกตามหมวด หวาน มัน หรือ เค็ม ที่เขามีความเสี่ยงสูงเป็นหลัก ให้คำแนะนำที่จับต้องได้จริง (เช่น หลีกเลี่ยงอาหารท้องถิ่นประเภทใด หรือแนะนำวัตถุดิบทดแทน)

### 🏃 แผนกิจกรรมและการออกกำลังกาย
- แนะนำประเภทและความถี่ที่เหมาะสมกับอายุและค่า BMI ของเขา

### 💤 การดูแลตนเองและการนอนหลับ
- แนะนำแนวทางลดละเลิกบุหรี่/แอลกอฮอล์ (ถ้ามีประวัติ) หรือหัวข้ออื่นๆ ที่เขายังบกพร่องอยู่

### 📌 เป้าหมายและคำสัญญาใจประจำวัน
- ระบุเป้าหมายสั้นๆ 2 ข้อที่คุณอยากให้เขาทำให้ได้เพื่อสุขภาพที่ดีขึ้น`;

      // Call Gemini 3.1-flash-lite (as the user explicitly requested "Gemini 3.1 flash")
      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite",
        contents: userPrompt,
        config: {
          systemInstruction: systemPrompt,
          temperature: 0.7,
        },
      });

      const adviceText = response.text || "ขออภัย ระบบไม่สามารถสร้างคำแนะนำได้ในขณะนี้";
      res.json({ advice: adviceText });

    } catch (err: any) {
      console.error("Gemini API error:", err);
      res.status(500).json({ error: err.message || "Internal server error" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
