// File formats for the radial menu's Convert segment, built by hand so nothing extra is downloaded: a Word .docx (a zip
// of three XML files) and a PDF whose pages are images (so any script, Hindi included, looks exactly as on screen).
// Pure byte builders, no DOM, so they run under node --test.

const enc = new TextEncoder();

let table: Uint32Array | null = null;
function crc32(data: Uint8Array) {
  table ??= Uint32Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  let c = 0xffffffff;
  for (const b of data) c = table[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function concat(parts: Uint8Array[]) {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}

/** An uncompressed ("stored") zip. Small text files, so compression wouldn't buy much. */
export function zip(files: { name: string; data: Uint8Array }[]) {
  const local: Uint8Array[] = [], central: Uint8Array[] = [];
  let offset = 0;
  for (const f of files) {
    const name = enc.encode(f.name), crc = crc32(f.data);
    const h = new DataView(new ArrayBuffer(30));
    h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); // UTF-8 names
    h.setUint32(14, crc, true); h.setUint32(18, f.data.length, true); h.setUint32(22, f.data.length, true); h.setUint16(26, name.length, true);
    local.push(new Uint8Array(h.buffer), name, f.data);
    const c = new DataView(new ArrayBuffer(46));
    c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true);
    c.setUint32(16, crc, true); c.setUint32(20, f.data.length, true); c.setUint32(24, f.data.length, true); c.setUint16(28, name.length, true);
    c.setUint32(42, offset, true);
    central.push(new Uint8Array(c.buffer), name);
    offset += 30 + name.length + f.data.length;
  }
  const dir = concat(central);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true);
  end.setUint32(12, dir.length, true); end.setUint32(16, offset, true);
  return concat([...local, dir, new Uint8Array(end.buffer)]);
}

const xml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** A minimal Word document: one paragraph per line, list markers shown as bullets. */
export function docx(text: string) {
  const paras = text.split("\n").map((l) => {
    const t = xml(l.replace(/^- /, "• "));
    return t ? `<w:p><w:r><w:t xml:space="preserve">${t}</w:t></w:r></w:p>` : "<w:p/>";
  }).join("");
  const W = "http://schemas.openxmlformats.org";
  return zip([
    { name: "[Content_Types].xml", data: enc.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="${W}/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`) },
    { name: "_rels/.rels", data: enc.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="${W}/package/2006/relationships"><Relationship Id="rId1" Type="${W}/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`) },
    { name: "word/document.xml", data: enc.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="${W}/wordprocessingml/2006/main"><w:body>${paras}<w:sectPr/></w:body></w:document>`) },
  ]);
}

/** A PDF with one A4 page per JPEG (each page image already rendered at A4 proportions). */
export function pdf(pages: { jpeg: Uint8Array; width: number; height: number }[]) {
  const parts: Uint8Array[] = [];
  const offsets: number[] = [];
  let size = 0;
  const put = (p: Uint8Array | string) => { const b = typeof p === "string" ? enc.encode(p) : p; parts.push(b); size += b.length; };
  const obj = (n: number, body: () => void) => { offsets[n] = size; put(`${n} 0 obj\n`); body(); put("\nendobj\n"); };

  put("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n");
  const pageIds = pages.map((_, i) => 3 + i * 3);
  obj(1, () => put("<< /Type /Catalog /Pages 2 0 R >>"));
  obj(2, () => put(`<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pages.length} >>`));
  pages.forEach((p, i) => {
    const [page, img, content] = [3 + i * 3, 4 + i * 3, 5 + i * 3];
    const draw = "q 595 0 0 842 0 0 cm /Im0 Do Q";
    obj(page, () => put(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /XObject << /Im0 ${img} 0 R >> >> /Contents ${content} 0 R >>`));
    obj(img, () => {
      put(`<< /Type /XObject /Subtype /Image /Width ${p.width} /Height ${p.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${p.jpeg.length} >>\nstream\n`);
      put(p.jpeg);
      put("\nendstream");
    });
    obj(content, () => put(`<< /Length ${draw.length} >>\nstream\n${draw}\nendstream`));
  });
  const count = 3 + pages.length * 3;
  const xref = size;
  put(`xref\n0 ${count}\n0000000000 65535 f \n`);
  for (let n = 1; n < count; n++) put(`${String(offsets[n]).padStart(10, "0")} 00000 n \n`);
  put(`trailer\n<< /Size ${count} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
  return concat(parts);
}
