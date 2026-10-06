/**
 * Supabase Project Configuration
 * 
 * Replace with your Supabase Project URL and public 'anon' key.
 * You can find these in your Supabase dashboard:
 * Settings -> API -> Project URL & Project API Keys (anon public)
 */
window.SUPABASE_CONFIG = {
    // Paste your Supabase project URL here (e.g., "https://xyzcompany.supabase.co")
    url: "",

    // Paste your Supabase anon public key here (starts with "ey...")
    anonKey: ""
};

// Allow override from localStorage if set via the on-page setup modal
(function() {
    try {
        const storedUrl = localStorage.getItem('tj_supabase_url');
        const storedKey = localStorage.getItem('tj_supabase_key');
        if (storedUrl && storedKey) {
            window.SUPABASE_CONFIG.url = storedUrl;
            window.SUPABASE_CONFIG.anonKey = storedKey;
        }
    } catch (e) {
        console.warn('Could not read Supabase config from localStorage:', e);
    }
})();
