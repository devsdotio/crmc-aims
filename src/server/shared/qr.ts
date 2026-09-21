/**
 * QR payload helpers for physical tags (staff mobile scanner + print UI).
 *
 * Formats (prefixes prevent bare-code collisions between asset vs lot):
 * - Asset unit: `CRMC-AIMS:{assetCode}`  (existing UI convention)
 * - Purchase lot (consumable batch): `CRMC-AIMS-LOT:{lotCode}`
 *
 * Scanners may also send a bare code; resolution falls back to asset then lot.
 */

export const ASSET_QR_PREFIX = "CRMC-AIMS:";
export const LOT_QR_PREFIX = "CRMC-AIMS-LOT:";

export type ScanEntityKind = "asset" | "lot";

export type ParsedScanCode = {
  /** Preferred entity kind when the payload is tagged; `"unknown"` when bare. */
  kind: ScanEntityKind | "unknown";
  /** Operational code without protocol prefix. */
  code: string;
  /** Original trimmed payload. */
  raw: string;
};

export function encodeAssetQr(assetCode: string): string {
  return `${ASSET_QR_PREFIX}${assetCode.trim()}`;
}

export function encodeLotQr(lotCode: string): string {
  return `${LOT_QR_PREFIX}${lotCode.trim()}`;
}

/**
 * Normalise scanner input: strip whitespace, known prefixes, common URI schemes.
 */
export function parseScanPayload(rawInput: string): ParsedScanCode {
  const raw = rawInput.trim();
  if (!raw) {
    return { kind: "unknown", code: "", raw };
  }

  const upper = raw.toUpperCase();

  if (upper.startsWith(LOT_QR_PREFIX)) {
    return {
      kind: "lot",
      code: raw.slice(LOT_QR_PREFIX.length).trim(),
      raw,
    };
  }

  // Accept shorthand L: / LOT: for mobile keyboards
  if (/^(LOT:|L:)/i.test(raw)) {
    return {
      kind: "lot",
      code: raw.replace(/^(LOT:|L:)/i, "").trim(),
      raw,
    };
  }

  if (upper.startsWith(ASSET_QR_PREFIX)) {
    return {
      kind: "asset",
      code: raw.slice(ASSET_QR_PREFIX.length).trim(),
      raw,
    };
  }

  if (/^(A:|ASSET:)/i.test(raw)) {
    return {
      kind: "asset",
      code: raw.replace(/^(A:|ASSET:)/i, "").trim(),
      raw,
    };
  }

  // Bare operational codes — resolver tries asset then lot
  return { kind: "unknown", code: raw, raw };
}
