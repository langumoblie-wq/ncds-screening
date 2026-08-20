const fs = require('fs');
let content = fs.readFileSync('src/components/NcdDashboard.tsx', 'utf-8');

const backupActionStr = `            {/* Action: Backup JSON */}
            <button
              onClick={() => openPasswordModal('export')}`;

const newBackupActionStr = `            {/* Action: Backup JSON */}
            <button
              onClick={() => {
                if (isAdmin) {
                  executeExportBackup();
                } else {
                  alert("กรุณาเข้าสู่ระบบ (มุมบนขวา) ก่อนทำการสำรองข้อมูล");
                }
              }}`;
              
const importActionStr = `            {/* Action: Restore JSON */}
            <button 
              onClick={() => openPasswordModal('import')}`;

const newImportActionStr = `            {/* Action: Restore JSON */}
            <button 
              onClick={() => {
                if (isAdmin) {
                  if (fileInputRef.current) {
                    fileInputRef.current.click();
                  }
                } else {
                  alert("กรุณาเข้าสู่ระบบ (มุมบนขวา) ก่อนทำการนำเข้าข้อมูล");
                }
              }}`;
              
content = content.replace(backupActionStr, newBackupActionStr);
content = content.replace(importActionStr, newImportActionStr);

fs.writeFileSync('src/components/NcdDashboard.tsx', content);
