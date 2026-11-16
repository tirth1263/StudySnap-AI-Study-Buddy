import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";

/** False until you copy .env.example to .env and fill in your Supabase project. */
export const isConfigured = Boolean(url && anonKey);

// Only the public "anon" key ships in the app. It is safe to expose because
// Row Level Security decides what each signed-in user can read or write.
export const supabase = createClient(url || "http://localhost", anonKey || "missing", {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
