(() => {
  const cfg = window.SCHOOL_CONFIG || {};
  const ready = !!(window.supabase && cfg.SUPABASE_URL &&
    cfg.SUPABASE_ANON_KEY && !cfg.SUPABASE_URL.startsWith("YOUR_") &&
    !cfg.SUPABASE_ANON_KEY.startsWith("YOUR_"));
  window.schoolDbReady = ready;
  window.schoolDb = ready ? window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY) : null;
  window.schoolConfigError = ready ? "" : "Supabase is not configured. Add your project URL and publishable key in js/config.js.";
})();
