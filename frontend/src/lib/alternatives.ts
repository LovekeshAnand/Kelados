// "<Competitor> alternative" landing pages. Competitor facts come from each vendor's own pricing page, checked on
// CHECKED; re-check them when editing, because plans change. Rows are [question, Kelados, competitor].

export const CHECKED = "October 2026";

export type Alternative = {
  slug: string;
  vs: string;
  site: string;
  pricing: string;
  kind: string;
  /** Where "Try Kelados" goes. */
  href: string;
  cta: string;
  title: string;
  social: string;
  description: string;
  lead: string;
  rows: [string, string, string][];
  why: [string, string][];
  /** Honest: where the competitor is the better pick. */
  theyWin: string[];
  switchSteps: [string, string][];
  faq: [string, string][];
};

export const ALTERNATIVES: Alternative[] = [
  {
    slug: "wispr-flow-alternative", vs: "Wispr Flow", site: "https://wisprflow.ai", pricing: "https://wisprflow.ai/pricing",
    kind: "Voice dictation", href: "/download/", cta: "Download Kelados free",
    title: "Free Wispr Flow Alternative – Open Source, Offline, Linux",
    social: "The Free, Open-Source Wispr Flow Alternative",
    description: "Kelados is a free, open-source Wispr Flow alternative: press a shortcut, talk, and clean text appears in any app on Windows, Mac and Linux. No word limits, works offline, audio never leaves your computer.",
    lead: "Press a shortcut, talk, and clean text appears in any app, like Wispr Flow. The difference: Kelados is free with no weekly word limit, open source, runs on Linux too, and recognises your speech on your own computer instead of in the cloud.",
    rows: [
      ["Price", "Free, forever", "Free plan, then Pro at $15/month ($12 billed yearly)"],
      ["Word limit", "None", "2,000 words a week on desktop on the free plan"],
      ["Platforms", "Windows, Mac, Linux, any browser", "Mac, Windows, iOS, Android"],
      ["Linux", "Yes (AppImage)", "No"],
      ["Where speech is processed", "On your computer", "Wispr's cloud servers"],
      ["Works offline", "Yes, after the first model download", "No"],
      ["Filler removal, spoken corrections", "Yes, rule-based: never adds words you didn't say", "Yes, AI rewriting"],
      ["Hindi and Hinglish", "Yes, with models tuned for Indian speech", "Multilingual"],
      ["Open source", "Yes, MIT", "No"],
    ],
    why: [
      ["No weekly word cap", "Write a whole report by voice. Nothing counts your words, because nothing runs on our servers."],
      ["Private by design", "The speech model runs on your machine, so client calls, medical notes and code never leave it. There is no privacy mode to remember to switch on."],
      ["Every desktop, including Linux", "One app for Windows, macOS and Linux, plus a Chrome extension and a Word add-in."],
      ["Built for developers", "Dictate prompts straight into Claude Code, Cursor and terminals. MIT licensed, so you can read and change the code."],
    ],
    theyWin: [
      "Wispr Flow's AI can rewrite your tone and reformat text heavily; Kelados deliberately only cleans up what you said.",
      "Wispr Flow has iOS and Android keyboards; Kelados on a phone runs in the browser.",
      "Wispr Flow offers team admin and enterprise plans.",
    ],
    switchSteps: [
      ["Install", "Download Kelados for Windows, Mac or Linux. No account needed."],
      ["Keep your shortcut habit", "Press Ctrl+Shift+Space (Cmd+Shift+Space on Mac) in any app and talk; press it again to stop."],
      ["Bring your vocabulary", "Add names and terms to the dictionary and snippets in Settings. Kelados also learns from your corrections."],
    ],
    faq: [
      ["Is Wispr Flow free?", "Wispr Flow has a free plan limited to 2,000 words a week on desktop. Unlimited dictation needs Wispr Flow Pro at $15 a month, or $12 a month billed yearly (wisprflow.ai/pricing, October 2026). Kelados has no word limit and no paid plan."],
      ["What is the best free alternative to Wispr Flow?", "Kelados gives you the same core workflow (a global shortcut that turns speech into clean, punctuated text in any app, with filler words removed and spoken corrections understood) for free, with no word limits, and with recognition on your own computer."],
      ["Is there an open-source Wispr Flow alternative?", "Yes. Kelados is open source under the MIT license; the desktop app, web app and models it uses (Moonshine, Whisper) are all open. The code is on GitHub."],
      ["Does Wispr Flow work on Linux?", "Wispr Flow lists Mac, Windows, iOS and Android, not Linux. Kelados runs on Linux as an AppImage, as well as on Windows and macOS."],
      ["Does Wispr Flow send my voice to the cloud?", "Yes. Wispr Flow transcribes and formats dictation on its servers, and has no offline mode. Kelados recognises speech on your computer, so audio is never uploaded and dictation works offline."],
      ["Can I use Kelados with Claude Code and Cursor?", "Yes. Click into the terminal or editor, press Ctrl+Shift+Space and speak your prompt; Kelados types it. An MCP server also lets Claude Code speak back."],
    ],
  },
  {
    slug: "elevenlabs-alternative", vs: "ElevenLabs", site: "https://elevenlabs.io", pricing: "https://elevenlabs.io/pricing",
    kind: "Text to speech", href: "/studio/", cta: "Try free text to speech",
    title: "Free ElevenLabs Alternative – Unlimited Text to Speech",
    social: "A Free ElevenLabs Alternative With No Character Limits",
    description: "Kelados is a free ElevenLabs alternative for English text to speech: 28 natural voices, no character limits, no sign-up, commercial use allowed. Runs in your browser, with a free API and SDK.",
    lead: "Natural English voices with no credits to run out of. Kelados generates speech with the open Kokoro model in your own browser, so there is no per-character cost and no limit on length, from a sentence to a whole audiobook.",
    rows: [
      ["Price", "Free, forever", "Free plan, then Starter at $6/month"],
      ["Character limit", "None", "10,000 credits a month on the free plan (about 10 minutes of audio)"],
      ["Commercial use", "Yes (Apache-2.0 voices)", "Paid plans"],
      ["Sign-up", "Not needed", "Required"],
      ["Voices", "28 American and British English", "Large multilingual library"],
      ["Voice cloning", "No", "Yes"],
      ["Where speech is generated", "In your browser", "ElevenLabs' servers"],
      ["Developer API", "Free Node SDK, CLI and self-hosted server", "Paid hosted API"],
    ],
    why: [
      ["Unlimited length", "Paste a chapter or a whole book. Playback starts while the rest is still generating."],
      ["Free for commercial use", "The Kokoro-82M voices are Apache-2.0, so you can use the audio in videos, apps and audiobooks."],
      ["Private", "Your script is never sent to a server: generation happens on your device."],
      ["A free API", "npm install kelados gives you an SDK, a CLI and a self-hosted TTS server, with no per-character bill."],
    ],
    theyWin: [
      "ElevenLabs clones voices; Kelados doesn't.",
      "ElevenLabs speaks many languages; Kelados voices are English only.",
      "ElevenLabs offers dubbing, sound effects and emotional voice control.",
    ],
    switchSteps: [
      ["Open Speech Studio", "No account. Paste your text and pick one of 28 voices."],
      ["Listen and export", "Playback starts in seconds; download a WAV."],
      ["Long-form", "Use Projects for multi-voice audiobooks and podcasts, or the SDK for apps."],
    ],
    faq: [
      ["Is ElevenLabs free?", "ElevenLabs has a free plan with 10,000 credits a month, roughly 10,000 characters or about 10 minutes of speech, and commercial use needs a paid plan, starting with Starter at $6 a month (elevenlabs.io/pricing, October 2026). Kelados text to speech is free with no character limit."],
      ["What is the best free alternative to ElevenLabs?", "For English narration, Kelados is free with no character limits, 28 natural voices, commercial use and no sign-up, because speech is generated in your browser by the open Kokoro-82M model. If you need voice cloning or other languages, ElevenLabs remains the stronger choice."],
      ["Is there a free ElevenLabs alternative with no character limit?", "Yes. Kelados Speech Studio has no character, minute or credit limits. It runs the model on your device, so long texts and whole books cost nothing."],
      ["Can I use Kelados voices commercially?", "Yes. The Kokoro-82M model and voices are released under Apache-2.0, which allows commercial use. Kelados itself is MIT licensed."],
      ["Is there a free ElevenLabs API alternative?", "Yes. npm install kelados gives a Node SDK, a CLI and a self-hosted HTTP server compatible with common TTS request formats, plus an MCP server for AI agents. There is no per-character billing."],
    ],
  },
  {
    slug: "otter-alternative", vs: "Otter.ai", site: "https://otter.ai", pricing: "https://otter.ai/pricing",
    kind: "Meeting notes", href: "/notes/", cta: "Start free meeting notes",
    title: "Free Otter.ai Alternative – Meeting Notes With No Bot",
    social: "A Free Otter.ai Alternative: No Bot, No Minute Limits",
    description: "Kelados is a free Otter.ai alternative: live transcripts of Zoom, Google Meet and Teams with no bot joining the call, then action items and decisions. No minute limits, audio never uploaded.",
    lead: "Live transcripts of your calls without a bot in the participant list, and without minute caps. Kelados listens to your microphone and the meeting tab you share, then pulls out highlights, action items and decisions, all on your device.",
    rows: [
      ["Price", "Free, forever", "Free Basic plan, then Pro from $8.33/month (yearly)"],
      ["Transcription limit", "None", "300 minutes a month, 30 minutes per conversation"],
      ["Joins your call as a bot", "Never", "Its notetaker can join Zoom, Teams and Meet"],
      ["Where audio is processed", "On your device", "Otter's servers"],
      ["Summary, actions, decisions", "Yes, extracted from what was said", "Yes, AI-generated"],
      ["File transcription", "99 languages, any length", "3 lifetime imports on Basic"],
      ["Exports", "Markdown, TXT, SRT", "Varies by plan"],
    ],
    why: [
      ["No bot in the room", "Nothing joins the call, so nobody asks “who is this notetaker?”."],
      ["No minute caps", "Transcribe a three-hour workshop. Nothing is metered."],
      ["Private", "Audio is transcribed on your computer and never uploaded."],
      ["Files too", "Transcribe recordings in 99 languages with SRT and VTT subtitles."],
    ],
    theyWin: [
      "Otter has shared team workspaces and CRM integrations.",
      "Otter can join meetings you don't attend yourself.",
      "Otter identifies many individual speakers; Kelados labels You and Others.",
    ],
    switchSteps: [
      ["Open Notetaker", "In Chrome or Edge, no account needed."],
      ["Share the meeting tab", "Pick the Meet, Zoom or Teams tab with “Share tab audio” on."],
      ["Talk normally", "Get a live transcript, then highlights, action items and decisions. Export to Markdown."],
    ],
    faq: [
      ["Is Otter.ai free?", "Otter's Basic plan is free with 300 transcription minutes a month, a 30-minute limit per conversation and 3 lifetime file imports; Pro starts at $8.33 a month billed yearly (otter.ai/pricing, October 2026). Kelados has no minute limits."],
      ["Is there an Otter.ai alternative that doesn't join the meeting?", "Yes. Kelados Notetaker records your microphone and the audio of the meeting tab you share, so no bot joins your Zoom, Google Meet or Teams call."],
      ["What is the best free Otter.ai alternative?", "Kelados is free with no minute limits, needs no account and keeps audio on your device. It gives a live transcript with you and the other participants labelled, then highlights, action items, decisions and open questions."],
      ["Does Kelados work with Zoom, Google Meet and Teams?", "Yes, in the browser versions: share the meeting tab with audio and Kelados transcribes both sides. For desktop Zoom or Teams apps, use the browser version of the meeting."],
    ],
  },
];
