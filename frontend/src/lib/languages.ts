// Landing pages for voice typing in Indian languages (/voice-typing/<slug>/). Each one opens /dictate/ with ?lang=<code>,
// which picks the engine settings.ts maps to that language. Engine notes must stay true to stt.ts.

export type VoiceLanguage = {
  slug: string;
  code: string;
  name: string;
  native: string;
  /** A sentence people actually dictate, in the language's own script, and its English meaning. */
  sample: [string, string];
  engine: string;
  /** Extra Q&A specific to this language. */
  faq?: [string, string][];
};

const WHISPER = "Whisper (OpenAI's open speech model), running in your browser. Choose Whisper Small in settings for higher accuracy, at some cost in speed.";

export const VOICE_LANGUAGES: VoiceLanguage[] = [
  {
    slug: "hindi", code: "hi", name: "Hindi", native: "हिंदी",
    sample: ["नमस्ते, आज की मीटिंग शाम पाँच बजे है।", "Hello, today's meeting is at five in the evening."],
    engine: "A Whisper model fine-tuned for Hindi that writes Devanagari, plus a Hinglish model tuned for Indian speech that writes Hindi and English in English letters.",
    faq: [
      ["Can I type Hinglish by voice?", "Yes. Choose Hinglish and speak Hindi and English mixed the way you normally talk; Kelados writes it in English letters, for example “kal ki meeting 5 baje hai”. The Hinglish model is about 100 MB and fast enough for live typing."],
      ["Which Hindi voice commands work?", "Say “नई लाइन” for a new line, “पूर्ण विराम” for a full stop, and “नहीं नहीं” to correct yourself: “सात बजे, नहीं नहीं, आठ बजे” keeps only आठ बजे. English commands work too."],
      ["Can I do Hindi voice typing on my PC in any app?", "Yes. Install the free Kelados desktop app for Windows, Mac or Linux, choose Hindi or Hinglish in Style, then press Ctrl+Shift+Space in Word, WhatsApp Web, Gmail or any other app and speak. Text is typed at your cursor."],
    ],
  },
  {
    slug: "tamil", code: "ta", name: "Tamil", native: "தமிழ்",
    sample: ["வணக்கம், இன்றைய கூட்டம் மாலை ஐந்து மணிக்கு.", "Hello, today's meeting is at five in the evening."],
    engine: WHISPER,
  },
  {
    slug: "marathi", code: "mr", name: "Marathi", native: "मराठी",
    sample: ["नमस्कार, आजची मीटिंग संध्याकाळी पाच वाजता आहे.", "Hello, today's meeting is at five in the evening."],
    engine: WHISPER,
  },
  {
    slug: "telugu", code: "te", name: "Telugu", native: "తెలుగు",
    sample: ["నమస్కారం, ఈరోజు మీటింగ్ సాయంత్రం ఐదు గంటలకు.", "Hello, today's meeting is at five in the evening."],
    engine: WHISPER,
  },
  {
    slug: "bengali", code: "bn", name: "Bengali", native: "বাংলা",
    sample: ["নমস্কার, আজকের মিটিং বিকেল পাঁচটায়।", "Hello, today's meeting is at five in the afternoon."],
    engine: WHISPER,
  },
  {
    slug: "punjabi", code: "pa", name: "Punjabi", native: "ਪੰਜਾਬੀ",
    sample: ["ਸਤ ਸ੍ਰੀ ਅਕਾਲ, ਅੱਜ ਦੀ ਮੀਟਿੰਗ ਸ਼ਾਮ ਪੰਜ ਵਜੇ ਹੈ।", "Hello, today's meeting is at five in the evening."],
    engine: WHISPER,
  },
  {
    slug: "urdu", code: "ur", name: "Urdu", native: "اردو",
    sample: ["السلام علیکم، آج کی میٹنگ شام پانچ بجے ہے۔", "Hello, today's meeting is at five in the evening."],
    engine: WHISPER,
  },
];

export const voiceLanguage = (slug: string) => VOICE_LANGUAGES.find((l) => l.slug === slug);
