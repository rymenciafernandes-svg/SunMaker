// Exportação Excel (.xlsx) sem adicionar dependências ao projeto.
const esc = value => String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
const invalidFormula = text => /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
function crc32(bytes) {
  let crc = -1;
  for (const b of bytes) { crc ^= b; for (let j = 0; j < 8; j++) crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0); }
  return (crc ^ -1) >>> 0;
}
function zipFiles(files) {
  const enc = new TextEncoder(); const blocks = []; const directory = []; let cursor = 0;
  for (const [name, data] of Object.entries(files)) {
    const nm = enc.encode(name); const content = enc.encode(data); const crc = crc32(content);
    const local = new Uint8Array(30 + nm.length); const dv = new DataView(local.buffer);
    dv.setUint32(0, 0x04034b50, true); dv.setUint16(4, 20, true); dv.setUint16(8, 0, true);
    dv.setUint32(14, crc, true); dv.setUint32(18, content.length, true); dv.setUint32(22, content.length, true);
    dv.setUint16(26, nm.length, true); local.set(nm, 30);
    blocks.push(local, content);
    const dir = new Uint8Array(46 + nm.length); const dd = new DataView(dir.buffer);
    dd.setUint32(0, 0x02014b50, true); dd.setUint16(4, 20, true); dd.setUint16(6, 20, true);
    dd.setUint32(16, crc, true); dd.setUint32(20, content.length, true); dd.setUint32(24, content.length, true);
    dd.setUint16(28, nm.length, true); dd.setUint32(42, cursor, true); dir.set(nm, 46);
    directory.push(dir); cursor += local.length + content.length;
  }
  const dirSize = directory.reduce((n, part) => n + part.length, 0);
  const end = new Uint8Array(22); const d = new DataView(end.buffer);
  d.setUint32(0, 0x06054b50, true); d.setUint16(8, directory.length, true); d.setUint16(10, directory.length, true);
  d.setUint32(12, dirSize, true); d.setUint32(16, cursor, true);
  return new Blob([...blocks, ...directory, end], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}
export function exportXlsx(filename, headers, rows) {
  const columns = headers.map((h, i) => `<col min="${i+1}" max="${i+1}" width="${Math.min(36, Math.max(15, String(h).length + 5))}" customWidth="1"/>`).join('');
  const xmlRows = [headers, ...rows].map((row, i) => `<row r="${i+1}">${row.map((value, j) => {
    const index = `${colName(j+1)}${i+1}`;
    return typeof value === 'number' && Number.isFinite(value)
      ? `<c r="${index}" s="${i ? 0 : 1}"><v>${value}</v></c>`
      : `<c r="${index}" t="inlineStr" s="${i ? 0 : 1}"><is><t xml:space="preserve">${esc(invalidFormula(String(value ?? '')))}</t></is></c>`;
  }).join('')}</row>`).join('');
  const files = {
    '[Content_Types].xml': `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`,
    '_rels/.rels': `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    'xl/workbook.xml': `<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Relatorio" sheetId="1" r:id="rId1"/></sheets></workbook>`,
    'xl/_rels/workbook.xml.rels': `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
    'xl/styles.xml': `<?xml version="1.0" encoding="UTF-8"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><color rgb="FFFFA500"/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0"/></cellXfs></styleSheet>`,
    'xl/worksheets/sheet1.xml': `<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>${columns}</cols><sheetData>${xmlRows}</sheetData><autoFilter ref="A1:${colName(headers.length)}${rows.length+1}"/></worksheet>`,
  };
  saveBlob(zipFiles(files), filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`);
}
function colName(value) { let out = ''; while (value > 0) { value--; out = String.fromCharCode(65 + value % 26) + out; value = Math.floor(value / 26); } return out; }
export function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}
