const CV_SUPABASE_URL = "https://suckecjeyzlpbpkspmau.supabase.co";
const CV_SUPABASE_KEY = "sb_publishable_-re693K9MBweYpZjW01fRQ_m-nXuhy1";

// Explicitly persist and restore the same browser session across CineVerse pages.
const cvSupabase = window.supabase.createClient(CV_SUPABASE_URL, CV_SUPABASE_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

// Resolves after Supabase has restored the saved session from this browser.
window.cvAuthReady = cvSupabase.auth.getSession()
  .then(({ data, error }) => {
    if (error) throw error;
    return data.session || null;
  })
  .catch(error => {
    console.warn("CineVerse session restore check failed:", error);
    return null;
  });
