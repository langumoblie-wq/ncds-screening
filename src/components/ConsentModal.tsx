import React, { useRef, useState, useEffect } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { uploadToDrive, initAuth } from '../lib/driveUpload';
import { Loader2, AlertCircle, FileCheck, X, CheckCircle2, Download, Printer } from 'lucide-react';

interface ConsentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept: () => void;
  name: string;
}

export const ConsentModal: React.FC<ConsentModalProps> = ({ isOpen, onClose, onAccept, name }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isDeclined, setIsDeclined] = useState(false);
  const [generatedPdf, setGeneratedPdf] = useState<jsPDF | null>(null);
  const [pdfFilename, setPdfFilename] = useState("");
  const [driveUploadSuccess, setDriveUploadSuccess] = useState<boolean | null>(null);

  const pdfRef = useRef<HTMLDivElement>(null);
  const currentDate = new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });

  useEffect(() => {
    if (isOpen) {
      setIsSuccess(false);
      setIsDeclined(false);
      setGeneratedPdf(null);
      setError(null);
      setDriveUploadSuccess(null);
    }
  }, [isOpen]);

  useEffect(() => {
    const unsubscribe = initAuth(
      () => setIsAuthenticated(true),
      () => setIsAuthenticated(false)
    );
    return () => unsubscribe();
  }, []);

  if (!isOpen) return null;

  const handleDecline = () => {
    setIsDeclined(true);
  };

  const handleAccept = async () => {
    try {
      setIsUploading(true);
      setError(null);
      
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
      
      // Get Blob
      const pdfBlob = pdf.output('blob');
      const filename = `ConsentForm_${name}_${new Date().getTime()}.pdf`;
      
      // Upload to Drive folder (with fallback to root of user's own Drive)
      let uploadSucceeded = false;
      try {
        const folderId = "1awgyvd-yup0O_2QIQfxwJTrowXNcUTXT";
        try {
          await uploadToDrive(pdfBlob, filename, folderId);
          uploadSucceeded = true;
          console.log("PDF successfully uploaded to the specific shared Google Drive folder.");
        } catch (folderErr) {
          console.warn("Upload to specific shared folder failed, trying root of user's Google Drive...", folderErr);
          // Fallback: upload directly to root of user's own Google Drive
          await uploadToDrive(pdfBlob, filename);
          uploadSucceeded = true;
          console.log("PDF successfully uploaded to user's root Google Drive folder.");
        }
      } catch (uploadErr: any) {
        console.warn("Drive upload failed completely:", uploadErr);
        uploadSucceeded = false;
      }
      
      setDriveUploadSuccess(uploadSucceeded);
      setGeneratedPdf(pdf);
      setPdfFilename(filename);
      setIsSuccess(true);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to generate PDF");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownload = () => {
    if (generatedPdf) {
      generatedPdf.save(pdfFilename);
    }
  };

  const handlePrint = () => {
    if (generatedPdf) {
      window.open(generatedPdf.output('bloburl'), '_blank');
    }
  };

  if (isDeclined) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col p-8 text-center animate-in zoom-in-95 duration-200">
          <AlertCircle className="w-16 h-16 text-rose-500 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-slate-800 mb-2">ไม่สามารถบันทึกข้อมูลได้</h3>
          <p className="text-sm text-slate-600 mb-8">ระบบจำเป็นต้องได้รับความยินยอมจากท่านเพื่อเก็บรวบรวมข้อมูลส่วนบุคคล หากท่านไม่ยินยอม ระบบจะไม่สามารถดำเนินการบันทึกข้อมูลได้</p>
          <div className="flex gap-3">
            <button 
              onClick={() => setIsDeclined(false)}
              className="flex-1 py-3 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            >
              กลับไปอ่านอีกครั้ง
            </button>
            <button 
              onClick={() => onClose()}
              className="flex-1 py-3 text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors shadow-sm"
            >
              ปิดหน้าต่าง
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col p-8 text-center animate-in zoom-in-95 duration-200">
          {driveUploadSuccess ? (
            <>
              <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-4 animate-bounce" />
              <h3 className="text-xl font-bold text-slate-800 mb-2">บันทึกและอัปโหลดสำเร็จ</h3>
              <p className="text-sm text-slate-600 mb-6">
                ระบบได้บันทึกเอกสารความยินยอมของท่าน และ<span className="font-semibold text-emerald-600">อัปโหลดไปยัง Google Drive เรียบร้อยแล้ว</span>
              </p>
            </>
          ) : (
            <>
              <div className="relative w-16 h-16 mx-auto mb-4">
                <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto" />
                <div className="absolute -bottom-1 -right-1 bg-amber-500 text-white rounded-full p-1 border-2 border-white shadow-xs">
                  <AlertCircle className="w-3.5 h-3.5" />
                </div>
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">ให้ความยินยอมสำเร็จ</h3>
              <div className="bg-amber-50 border border-amber-100 p-3.5 rounded-xl mb-6 text-left">
                <p className="text-xs text-amber-800 leading-relaxed font-medium">
                  ⚠️ <strong>ไม่สามารถบันทึกไปยัง Google Drive ได้:</strong> 
                  <br />
                  เนื่องจากข้อจำกัดด้านสิทธิ์ของ Google Account หรือโดเมนที่ท่านเข้าใช้งาน แต่ข้อมูลความยินยอมได้รับการอนุมัติในระบบเรียบร้อยแล้ว
                  <span className="block mt-1 font-bold text-slate-700">
                    *กรุณากด "ดาวน์โหลด PDF" หรือ "พิมพ์เอกสาร" ด้านล่างเพื่อบันทึกเก็บไว้เป็นหลักฐานแทน
                  </span>
                </p>
              </div>
            </>
          )}
          
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={handlePrint}
                className="flex flex-col items-center justify-center gap-2 p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 transition-colors font-medium text-sm cursor-pointer"
              >
                <Printer className="w-5 h-5 text-slate-500" />
                พิมพ์เอกสาร
              </button>
              <button 
                onClick={handleDownload}
                className="flex flex-col items-center justify-center gap-2 p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 transition-colors font-medium text-sm cursor-pointer"
              >
                <Download className="w-5 h-5 text-slate-500" />
                ดาวน์โหลด PDF
              </button>
            </div>
            <button 
              onClick={() => onAccept()}
              className="mt-2 w-full py-3 font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors shadow-sm cursor-pointer"
            >
              ดำเนินการต่อ
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
            <FileCheck className="w-5 h-5 text-blue-600" />
            ขอความยินยอม (Consent Form)
          </h3>
          <button onClick={handleDecline} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto flex-1">
           {error && (
             <div className="mb-4 p-3 bg-rose-50 text-rose-700 rounded-lg flex items-start gap-2 text-sm border border-rose-100">
               <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
               <p>{error}</p>
             </div>
           )}

           <div className="text-sm text-slate-700 space-y-4 mb-6 leading-relaxed">
             <p className="font-bold text-center text-lg mb-6">แบบเอกสารแสดงความยินยอม (Consent Form) (สำหรับบุคคลทั่วไป)</p>
             
             <div className="bg-slate-50 p-4 rounded-lg space-y-2 border border-slate-200">
                <p><strong>ภายใต้โครงการ:</strong> ร่วมสร้างต้นแบบลดกลุ่มเสี่ยงต่อโรค NCDs ด้วยแผนรายบุคคล ชุมชน ตำบล</p>
                <p><strong>ดำเนินการโดย:</strong> Mini Flag Ship Satun</p>
             </div>

             <p>ข้าพเจ้าทราบดีว่าผู้รับทุนจำเป็นต้องเก็บรวบรวม ใช้ หรือเปิดเผย (ซึ่งต่อไปในเอกสารนี้เรียกว่า “ประมวลผล”) ข้อมูลส่วนบุคคลของข้าพเจ้า โดยมีรายละเอียดดังนี้</p>
             
             <h4 className="font-bold mt-4">1. วัตถุประสงค์ในการขอความยินยอม</h4>
             <p className="ml-4">
               เก็บข้อมูลส่วนบุคคล ได้แก่ ข้อมูล ประวัติส่วนตัว ค่าความดันโลหิต ค่าน้ำหนัก ส่วนสูง และผลตรวจสุขภาพ
               และอื่นๆ ที่จำเป็น สำหรับใช้ในการดำเนินงานโครงการดังกล่าว เพื่อนำมาวิเคราะห์ข้อมูล และออกแบบกิจกรรม
               ให้เหมาะสมกับท่านในการปรับเปลี่ยนพฤติกรรมให้มีสุขภาพที่ดีขึ้น
             </p>

             <p className="mt-4">
               ทั้งนี้ ก่อนการแสดงเจตนาในครั้งนี้ ข้าพเจ้าได้อ่านรายละเอียดจากเอกสารชี้แจงข้อมูลหรือได้รับคำอธิบายถึง
               วัตถุประสงค์ในการประมวลผลข้อมูลส่วนบุคคลของข้าพเจ้าโดยละเอียดและมีความเข้าใจเป็นอย่างดีแล้ว และข้าพเจ้าได้
               ให้ความยินยอมหรือปฏิเสธไม่ให้ความยินยอมในเอกสารฉบับนี้ด้วยความสมัครใจโดยปราศจากการบังคับหรือชักจูง
             </p>

             <p>
               ข้าพเจ้าทราบว่าสามารถถอนความยินยอมนี้เสียเมื่อใดก็ได้ เว้นแต่ในกรณีที่มีข้อจำกัดสิทธิตามกฎหมาย และ
               ข้าพเจ้าทราบว่าการถอนความยินยอมนี้ไม่มีผลกระทบต่อการประมวลผลข้อมูลส่วนบุคคลของข้าพเจ้าที่ได้ดำเนินการเสร็จ
               สิ้นไปแล้วก่อนการถอนความยินยอม
             </p>

             <p className="font-semibold text-center mt-6">
               ข้าพเจ้าได้อ่านเอกสารฉบับนี้โดยละเอียดและมีความเข้าใจเป็นอย่างดีแล้วจึงได้ลงลายมือชื่อไว้เป็นหลักฐาน
             </p>
           </div>
        </div>

        <div className="p-5 border-t border-slate-100 bg-slate-50/80 flex justify-end gap-3">
          <button 
            onClick={handleDecline}
            disabled={isUploading}
            className="px-5 py-2.5 text-sm font-semibold text-slate-600 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            ไม่ให้ความยินยอม
          </button>
          <button 
            onClick={handleAccept}
            disabled={isUploading}
            className="px-5 py-2.5 text-sm font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50"
          >
            {isUploading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> กำลังบันทึกและอัปโหลด...</>
            ) : (
              'ให้ความยินยอม'
            )}
          </button>
        </div>
      </div>

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
                    <span style={{ display: 'inline-block', width: '220px', borderBottom: '1px dotted black', textAlign: 'center', fontWeight: 'bold', paddingBottom: '2px' }}>{name}</span>
                    <span>ผู้เข้าร่วมกิจกรรม/เจ้าของข้อมูลส่วนบุคคล</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: '10px' }}>
                    <span>(</span>
                    <span style={{ display: 'inline-block', width: '220px', textAlign: 'center', fontWeight: 'bold' }}>{name}</span>
                    <span>)</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: '10px', marginTop: '10px' }}>
                    <span>วันที่</span>
                    <span style={{ fontWeight: 'bold' }}>{currentDate}</span>
                  </div>
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};
