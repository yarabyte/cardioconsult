/**
 * Client ClamAV minimal (INSTREAM) — fail closed si injoignable.
 * En tests : injecter `scanBuffer` via `setClamScanner`.
 */

import net from "node:net";
import { looksLikeEicar } from "@/lib/files/mime";

export type ScanVerdict = "clean" | "infected" | "unavailable";

export type ClamScanner = (buf: Uint8Array) => Promise<ScanVerdict>;

let override: ClamScanner | null = null;

export function setClamScanner(scanner: ClamScanner | null) {
  override = scanner;
}

/** Scanner démo : EICAR → infected ; sinon clean (sans réseau). */
export const demoClamScanner: ClamScanner = async (buf) => {
  if (looksLikeEicar(buf)) return "infected";
  return "clean";
};

/** Scanner prod : TCP ClamAV ; unavailable si timeout / erreur. */
export function createNetworkClamScanner(host: string, port: number): ClamScanner {
  return async (buf) => {
    if (looksLikeEicar(buf)) return "infected";
    return new Promise((resolve) => {
      const socket = net.connect({ host, port }, () => {
        try {
          socket.write("zINSTREAM\0");
          const size = Buffer.alloc(4);
          size.writeUInt32BE(buf.byteLength, 0);
          socket.write(size);
          socket.write(Buffer.from(buf));
          const zero = Buffer.alloc(4);
          socket.write(zero);
        } catch {
          resolve("unavailable");
          socket.destroy();
        }
      });
      let data = "";
      socket.setTimeout(5_000);
      socket.on("data", (chunk) => {
        data += chunk.toString("utf8");
      });
      socket.on("timeout", () => {
        socket.destroy();
        resolve("unavailable");
      });
      socket.on("error", () => resolve("unavailable"));
      socket.on("end", () => {
        if (/FOUND/i.test(data)) resolve("infected");
        else if (/OK/i.test(data)) resolve("clean");
        else resolve("unavailable");
      });
    });
  };
}

export async function scanBuffer(buf: Uint8Array): Promise<ScanVerdict> {
  if (override) return override(buf);
  return demoClamScanner(buf);
}
