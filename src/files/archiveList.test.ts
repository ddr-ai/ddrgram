import { describe, expect, it } from "vitest";
import { hexPreview, listAr, listTar, listZip, rpmLeadName } from "./archiveList";

function concat(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

function u16(n: number): Uint8Array {
  const b = new Uint8Array(2);
  new DataView(b.buffer).setUint16(0, n, true);
  return b;
}

function u32(n: number): Uint8Array {
  const b = new Uint8Array(4);
  new DataView(b.buffer).setUint32(0, n, true);
  return b;
}

function zipStore(name: string, data: Uint8Array): Uint8Array {
  const nameBytes = new TextEncoder().encode(name);
  const local = concat([
    new Uint8Array([0x50, 0x4b, 0x03, 0x04]),
    u16(20),
    u16(0),
    u16(0),
    u16(0),
    u16(0),
    u32(0),
    u32(data.length),
    u32(data.length),
    u16(nameBytes.length),
    u16(0),
    nameBytes,
    data,
  ]);
  const central = concat([
    new Uint8Array([0x50, 0x4b, 0x01, 0x02]),
    u16(20),
    u16(20),
    u16(0),
    u16(0),
    u16(0),
    u16(0),
    u32(0),
    u32(data.length),
    u32(data.length),
    u16(nameBytes.length),
    u16(0),
    u16(0),
    u16(0),
    u16(0),
    u32(0),
    u32(0),
    nameBytes,
  ]);
  const eocd = concat([
    new Uint8Array([0x50, 0x4b, 0x05, 0x06]),
    u16(0),
    u16(0),
    u16(1),
    u16(1),
    u32(central.length),
    u32(local.length),
    u16(0),
  ]);
  return concat([local, central, eocd]);
}

function tarFile(name: string, body: string): Uint8Array {
  const data = new TextEncoder().encode(body);
  const header = new Uint8Array(512);
  const nameBytes = new TextEncoder().encode(name);
  header.set(nameBytes.subarray(0, 100), 0);
  const size = data.length.toString(8).padStart(11, "0") + " ";
  header.set(new TextEncoder().encode(size), 124);
  header[156] = "0".charCodeAt(0);
  header.set(new TextEncoder().encode("ustar\0"), 257);
  const blocks = Math.ceil(data.length / 512);
  const payload = new Uint8Array(512 + blocks * 512 + 1024);
  payload.set(header, 0);
  payload.set(data, 512);
  return payload;
}

describe("archive listing", () => {
  it("lists stored zip entries", () => {
    const buf = zipStore("hello.txt", new TextEncoder().encode("hi"));
    const entries = listZip(buf);
    expect(entries.map((e) => e.name)).toEqual(["hello.txt"]);
    expect(entries[0]!.size).toBe(2);
  });

  it("lists tar members", () => {
    const entries = listTar(tarFile("readme.md", "# hi"));
    expect(entries[0]?.name).toBe("readme.md");
  });

  it("lists ar/deb members", () => {
    const name = "debian-binary/     ".slice(0, 16);
    const header = new Uint8Array(60);
    header.set(new TextEncoder().encode(name), 0);
    header.set(new TextEncoder().encode("4         "), 48);
    const body = new TextEncoder().encode("2.0\n");
    const magic = new TextEncoder().encode("!<arch>\n");
    const buf = concat([magic, header, body]);
    expect(listAr(buf)[0]?.name).toBe("debian-binary");
  });

  it("reads an RPM lead name", () => {
    const lead = new Uint8Array(96);
    lead[0] = 0xed;
    lead[1] = 0xab;
    lead[2] = 0xee;
    lead[3] = 0xdb;
    lead.set(new TextEncoder().encode("demo-pkg"), 10);
    expect(rpmLeadName(lead)).toBe("demo-pkg");
  });

  it("formats a hex preview", () => {
    const text = hexPreview(new TextEncoder().encode("ABC"));
    expect(text).toContain("41 42 43");
    expect(text).toContain("ABC");
  });
});
