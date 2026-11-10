import qrcode from "qrcode-generator";

export interface QrRenderResult {
  matrix: boolean[][];
  moduleCount: number;
}

/**
 * Builds a QR matrix for a text payload. Uses byte mode with
 * auto version selection and level M correction.
 */
export function createQrMatrix(text: string): QrRenderResult {
  const payload = text.slice(0, 500);
  const qr = qrcode(0, "M");
  qr.addData(payload, "Byte");
  qr.make();
  const moduleCount = qr.getModuleCount();
  const matrix: boolean[][] = [];
  for (let row = 0; row < moduleCount; row += 1) {
    const cells: boolean[] = [];
    for (let column = 0; column < moduleCount; column += 1) cells.push(qr.isDark(row, column));
    matrix.push(cells);
  }
  return { matrix, moduleCount };
}

/** Renders a QR payload to a PNG data URL, ready for an <img src>. */
export function createQrDataUrl(text: string, options: { modulePixels?: number; margin?: number; dark?: string; light?: string } = {}): string {
  const modulePixels = options.modulePixels ?? 8;
  const margin = options.margin ?? 2;
  const { matrix, moduleCount } = createQrMatrix(text);
  const size = (moduleCount + margin * 2) * modulePixels;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("QR code tidak dapat digambar di browser ini.");
  context.fillStyle = options.light ?? "#FFFFFF";
  context.fillRect(0, 0, size, size);
  context.fillStyle = options.dark ?? "#0E1B16";
  for (let row = 0; row < moduleCount; row += 1) {
    for (let column = 0; column < moduleCount; column += 1) {
      if (matrix[row][column]) {
        context.fillRect((column + margin) * modulePixels, (row + margin) * modulePixels, modulePixels, modulePixels);
      }
    }
  }
  return canvas.toDataURL("image/png");
}
