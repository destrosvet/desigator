export function glbFixture(overrides: Record<string, unknown> = {}) {
 const bin = Buffer.alloc(68);
 [-0.8, -0.7, 0, 0.8, -0.7, 0, 0, 0.7, 0, 0, 1, 0, 0, 0, 0, 0.4, 0].forEach((value, index) => bin.writeFloatLE(value, index * 4));
 const doc = { asset: { version: "2.0" }, scene: 0, scenes: [{ nodes: [0] }], nodes: [{ mesh: 0 }], meshes: [{ primitives: [{ attributes: { POSITION: 0 }, material: 0 }] }], materials: [{ doubleSided: true, pbrMetallicRoughness: { baseColorFactor: [1, 0.25, 0.06, 1], metallicFactor: 0, roughnessFactor: 1 } }], buffers: [{ byteLength: bin.length }], bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: 36 }, { buffer: 0, byteOffset: 36, byteLength: 8 }, { buffer: 0, byteOffset: 44, byteLength: 24 }], accessors: [{ bufferView: 0, componentType: 5126, count: 3, type: "VEC3", min: [-0.8, -0.7, 0], max: [0.8, 0.7, 0] }, { bufferView: 1, componentType: 5126, count: 2, type: "SCALAR", min: [0], max: [1] }, { bufferView: 2, componentType: 5126, count: 2, type: "VEC3" }], animations: [{ name: "Move", samplers: [{ input: 1, output: 2 }], channels: [{ sampler: 0, target: { node: 0, path: "translation" } }] }], ...overrides };
 const json = Buffer.from(JSON.stringify(doc)); const padded = Buffer.alloc(Math.ceil(json.length / 4) * 4, 32); json.copy(padded);
 const header = Buffer.alloc(20); header.writeUInt32LE(0x46546c67, 0); header.writeUInt32LE(2, 4); header.writeUInt32LE(20 + padded.length + 8 + bin.length, 8); header.writeUInt32LE(padded.length, 12); header.writeUInt32LE(0x4e4f534a, 16);
 const chunk = Buffer.alloc(8); chunk.writeUInt32LE(bin.length, 0); chunk.writeUInt32LE(0x004e4942, 4);
 return Buffer.concat([header, padded, chunk, bin]);
}
export function pdfFixture() {
 const objects = ["<< /Type /Catalog /Pages 2 0 R >>", "<< /Type /Pages /Kids [3 0 R] /Count 1 >>", "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 300] /Contents 4 0 R >>", "<< /Length 30 >>\nstream\n1 0.3 0 rg 30 30 240 240 re f\nendstream"];
 let output = "%PDF-1.4\n"; const offsets = [0];
 objects.forEach((object, index) => { offsets.push(Buffer.byteLength(output)); output += (index + 1) + " 0 obj\n" + object + "\nendobj\n"; });
 const xref = Buffer.byteLength(output); output += "xref\n0 5\n0000000000 65535 f \n" + offsets.slice(1).map(offset => String(offset).padStart(10, "0") + " 00000 n \n").join("") + "trailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n" + xref + "\n%%EOF";
 return Buffer.from(output);
}
