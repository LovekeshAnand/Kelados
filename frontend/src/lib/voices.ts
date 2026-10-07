export type Voice = {
  id: string;
  name: string;
  accent: "American" | "British";
  gender: "Female" | "Male";
  grade: string;
  vibe: string;
  color: string;
};

const C = ["#f2b45a", "#8fb4ff", "#b9a3ff", "#7dd3c0", "#f29a9a", "#c7d97a", "#e0b3e6"];

// Kokoro-82M v1.0 English voices with their published quality grades.
const RAW: [string, string, string, string][] = [
  ["af_heart", "Heart", "A", "Warm, expressive, the flagship narrator"],
  ["af_bella", "Bella", "A-", "Bright, energetic, made for hype reels"],
  ["af_nicole", "Nicole", "B-", "Soft, close-mic ASMR whisper"],
  ["af_aoede", "Aoede", "C+", "Muse of song, airy and melodic"],
  ["af_kore", "Kore", "C+", "Clear, composed, news-desk calm"],
  ["af_sarah", "Sarah", "C+", "Friendly explainer, tutorial-ready"],
  ["af_nova", "Nova", "C", "Crisp assistant tone"],
  ["af_alloy", "Alloy", "C", "Neutral, balanced, all-purpose"],
  ["af_sky", "Sky", "C-", "Light and youthful"],
  ["af_jessica", "Jessica", "D", "Casual, chatty, everyday"],
  ["af_river", "River", "D", "Relaxed, laid-back storyteller"],
  ["am_fenrir", "Fenrir", "C+", "Deep, cinematic trailer voice"],
  ["am_michael", "Michael", "C+", "Steady, trustworthy narrator"],
  ["am_puck", "Puck", "C+", "Playful trickster energy"],
  ["am_echo", "Echo", "D", "Resonant, radio-ready"],
  ["am_eric", "Eric", "D", "Confident presenter"],
  ["am_liam", "Liam", "D", "Young, upbeat, conversational"],
  ["am_onyx", "Onyx", "D", "Low, smooth, late-night"],
  ["am_santa", "Santa", "D-", "Jolly, booming, seasonal"],
  ["am_adam", "Adam", "F+", "Plain and direct"],
  ["bf_emma", "Emma", "B-", "Polished BBC narrator"],
  ["bf_isabella", "Isabella", "C", "Elegant, period-drama poise"],
  ["bf_alice", "Alice", "D", "Curious, storybook charm"],
  ["bf_lily", "Lily", "D", "Gentle and sweet"],
  ["bm_george", "George", "C", "Distinguished documentary gravitas"],
  ["bm_fable", "Fable", "C", "Fireside fairy-tale teller"],
  ["bm_lewis", "Lewis", "D+", "Dry wit, lecture hall"],
  ["bm_daniel", "Daniel", "D", "Measured, matter-of-fact"],
];

export const VOICES: Voice[] = RAW.map(([id, name, grade, vibe], i) => ({
  id, name, grade, vibe,
  accent: id[0] === "a" ? "American" : "British",
  gender: id[1] === "f" ? "Female" : "Male",
  color: C[i % C.length],
}));

export const voiceById = (id: string) => VOICES.find((v) => v.id === id) ?? VOICES[0];

export const SAMPLE_LINES = [
  "In the beginning there was a voice, and the voice was free.",
  "Welcome back to the show. Today we are talking about the future of sound.",
  "Chapter one. The lighthouse keeper had not spoken to anyone in eleven years.",
  "Breaking news: open source text to speech now runs entirely in your browser.",
];
