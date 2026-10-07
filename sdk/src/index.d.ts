export interface Clip {
  audio: Float32Array;
  sampleRate: number;
  duration: number;
  toWav(): Buffer;
  save(path: string): Promise<void>;
}
export interface SpeakOptions { voice?: string; preset?: string; speed?: number }
export interface Preset { _id: string; name: string; voice: string; speed: number; color: string }
export interface LexiconRule { from: string; to: string }
export interface KeladosClient {
  speak(text: string, opts?: SpeakOptions): Promise<Clip>;
  stream(text: string, opts?: SpeakOptions): AsyncGenerator<{ text: string; audio: Float32Array; sampleRate: number }>;
  readonly voices: Record<string, { name: string; language: string; gender: string; overallGrade: string; traits?: string }>;
  readonly presets: Preset[];
  readonly lexicon: LexiconRule[];
}
export interface CreateOptions {
  apiKey?: string;
  baseUrl?: string;
  dtype?: "fp32" | "fp16" | "q8" | "q4" | "q4f16";
  device?: "cpu" | "wasm" | "webgpu";
  onProgress?: (p: { status: string; file?: string; progress?: number }) => void;
}
export const MODEL_ID: string;
export const DEFAULT_API: string;
export function createKelados(opts?: CreateOptions): Promise<KeladosClient>;
export function encodeWav(samples: Float32Array, sampleRate: number): Buffer;
export function applyLexicon(text: string, rules?: LexiconRule[]): string;
