export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/**
 * Without Supabase keys the app runs in demo mode: accounts and decks live in
 * this browser's localStorage and study material is generated on-device.
 */
export const IS_DEMO = !SUPABASE_URL || !SUPABASE_ANON_KEY;

export const FREE_UPLOADS_PER_WEEK = 3;
export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export const REPO_URL = "https://github.com/tirth1263/StudySnap-AI-Study-Buddy";
