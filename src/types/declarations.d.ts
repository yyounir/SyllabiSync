declare module 'mammoth' {
  export interface MammothResult {
    value: string;
    messages: any[];
  }
  export function extractRawText(input: {
    buffer?: Buffer;
    arrayBuffer?: ArrayBuffer;
    path?: string;
  }): Promise<MammothResult>;
}

declare module 'pako' {
  export function inflate(data: Uint8Array | number[], options?: any): Uint8Array | string;
  export function inflateRaw(data: Uint8Array | number[], options?: any): Uint8Array | string;
  export function deflate(data: Uint8Array | string, options?: any): Uint8Array;
}

declare module '*.css' {
  const content: { [className: string]: string };
  export default content;
}

declare module '*.png' {
  const value: any;
  export default value;
}

declare module '*.jpg' {
  const value: any;
  export default value;
}

declare module '*.jpeg' {
  const value: any;
  export default value;
}

declare module '*.svg' {
  const value: any;
  export default value;
}
