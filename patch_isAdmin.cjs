const fs = require('fs');
let content = fs.readFileSync('src/components/NcdDashboard.tsx', 'utf-8');

const syncBtnStart = `            <button
              onClick={async () => {
                const { supabase } = await import('../lib/supabase');`;

const syncBtnEnd = `              <RefreshCw className="w-4 h-4" strokeWidth={3} />
              ซิงค์โมเดลเขาขาว
            </button>`;

const backupActionStr = `            {/* Action: Backup JSON */}
            <button
              onClick={() => {
                if (isAdmin) {
                  executeExportBackup();
                } else {
                  alert("กรุณาเข้าสู่ระบบ (มุมบนขวา) ก่อนทำการสำรองข้อมูล");
                }
              }}
              disabled={records.length === 0}
              className="bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-700 font-bold text-xs py-3 px-3.5 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0 transition-all"
            >
              <Download className="w-4 h-4" />
              สำรองข้อมูล
            </button>`;

const importActionStr = `            {/* Action: Restore JSON */}
            <button 
              onClick={() => {
                if (isAdmin) {
                  if (fileInputRef.current) {
                    fileInputRef.current.click();
                  }
                } else {
                  alert("กรุณาเข้าสู่ระบบ (มุมบนขวา) ก่อนทำการนำเข้าข้อมูล");
                }
              }}
              className="bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-emerald-700 font-bold text-xs py-3 px-3.5 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shrink-0 transition-all"
            >
              <Upload className="w-4 h-4" />
              นำเข้าข้อมูล
            </button>
            <input 
              ref={fileInputRef}
              type="file" 
              accept=".json" 
              onChange={handleImportBackup} 
              className="hidden" 
            />`;

const originalBlock = syncBtnStart + content.split(syncBtnStart)[1].split(importActionStr)[0] + importActionStr;

const newBlock = `            {isAdmin && (
              <>
${originalBlock.split('\n').map(line => '  ' + line).join('\n')}
              </>
            )}`;

content = content.replace(originalBlock, newBlock);

fs.writeFileSync('src/components/NcdDashboard.tsx', content);
