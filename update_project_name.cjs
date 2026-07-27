const fs = require('fs');

function replaceInFile(file, oldStr, newStr) {
  let content = fs.readFileSync(file, 'utf-8');
  content = content.split(oldStr).join(newStr);
  fs.writeFileSync(file, content);
}

replaceInFile('src/App.tsx', 'โครงการ "Mini Flag Ship Satun"', 'โครงการลดโรคNcdsด้วยแผนปรับเปลี่ยนพฤติกรรมรายบุคคล โดยศูนย์คนไทยห่างไกล Ncds "Mini Flag Ship Satun"');
replaceInFile('src/components/ConsentModal.tsx', 'ร่วมสร้างต้นแบบลดกลุ่มเสี่ยงต่อโรค NCDs ด้วยแผนรายบุคคล ชุมชน ตำบล', 'ลดโรคNcdsด้วยแผนปรับเปลี่ยนพฤติกรรมรายบุคคล โดยศูนย์คนไทยห่างไกล Ncds');
replaceInFile('src/components/RecordModal.tsx', 'ร่วมสร้างต้นแบบลดกลุ่มเสี่ยงต่อโรค NCDs ด้วยแผนรายบุคคล ชุมชน ตำบล', 'ลดโรคNcdsด้วยแผนปรับเปลี่ยนพฤติกรรมรายบุคคล โดยศูนย์คนไทยห่างไกล Ncds');

