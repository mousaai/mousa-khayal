declare module "gif.js" {
  interface GIFOptions {
    workers?: number;
    quality?: number;
    width?: number;
    height?: number;
    workerScript?: string;
    repeat?: number;
    background?: string;
    transparent?: number | null;
    dither?: boolean | string;
    debug?: boolean;
  }

  class GIF {
    constructor(options?: GIFOptions);
    addFrame(
      image: HTMLCanvasElement | HTMLImageElement | CanvasRenderingContext2D | ImageData,
      options?: { delay?: number; copy?: boolean; dispose?: number }
    ): void;
    on(event: "finished", callback: (blob: Blob) => void): void;
    on(event: "progress", callback: (p: number) => void): void;
    on(event: "start" | "abort", callback: () => void): void;
    render(): void;
    abort(): void;
  }

  export default GIF;
}
