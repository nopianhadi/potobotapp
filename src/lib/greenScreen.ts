export interface RgbColor {
  r: number;
  g: number;
  b: number;
}

export function parseHexColor(hex: string): RgbColor {
  const match = /^#([\da-fA-F]{2})([\da-fA-F]{2})([\da-fA-F]{2})$/.exec(hex.trim());
  if (!match) return { r: 0, g: 177, b: 64 };
  return { r: Number.parseInt(match[1], 16), g: Number.parseInt(match[2], 16), b: Number.parseInt(match[3], 16) };
}

/**
 * Marks pixels close to the key color as transparent so a background
 * image placed underneath shows through (simple chroma-key).
 */
export function keyOutColor(data: Uint8ClampedArray, key: RgbColor, tolerance: number): void {
  const squared = tolerance * tolerance;
  for (let index = 0; index < data.length; index += 4) {
    const red = data[index] - key.r;
    const green = data[index + 1] - key.g;
    const blue = data[index + 2] - key.b;
    const distance = red * red + green * green + blue * blue;
    if (distance <= squared) {
      const softness = Math.sqrt(distance) / Math.max(1, tolerance);
      data[index + 3] = softness < 0.85 ? 0 : Math.round(data[index + 3] * (softness - 0.85) / 0.15);
    }
  }
}

export interface GreenScreenOptions {
  keyColor: string;
  tolerance: number;
  backgroundImage: string;
}

export interface GreenScreenCompositor {
  compose(source: HTMLVideoElement | HTMLCanvasElement | HTMLImageElement, width: number, height: number): HTMLCanvasElement;
}

function makeCanvas(width: number, height: number): { canvas: HTMLCanvasElement; context: CanvasRenderingContext2D } {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Green screen tidak dapat diproses di browser ini.");
  return { canvas, context };
}

export function loadImageElement(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Gambar latar green screen tidak dapat dimuat."));
    image.src = source;
  });
}

/**
 * Prepares a reusable compositor: the background image is decoded once
 * so each frame can be keyed and composited synchronously.
 */
export async function prepareGreenScreen(options: GreenScreenOptions): Promise<GreenScreenCompositor> {
  const key = parseHexColor(options.keyColor);
  const background = options.backgroundImage ? await loadImageElement(options.backgroundImage).catch(() => null) : null;
  return {
    compose(source, width, height) {
      const { canvas, context } = makeCanvas(width, height);
      if (background) {
        const scale = Math.max(width / background.naturalWidth, height / background.naturalHeight);
        const drawWidth = background.naturalWidth * scale;
        const drawHeight = background.naturalHeight * scale;
        context.drawImage(background, (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight);
      } else {
        context.fillStyle = "#0E1B16";
        context.fillRect(0, 0, width, height);
      }
      const frame = makeCanvas(width, height);
      frame.context.drawImage(source, 0, 0, width, height);
      const imageData = frame.context.getImageData(0, 0, width, height);
      keyOutColor(imageData.data, key, options.tolerance);
      frame.context.putImageData(imageData, 0, 0);
      context.drawImage(frame.canvas, 0, 0);
      return canvas;
    },
  };
}
