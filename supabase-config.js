/**
 * Supabase Project Configuration
 * Configured with live Supabase project for Task Journal
 */
window.SUPABASE_CONFIG = {
    url: "https://dsmtjpftzllxudvirapm.supabase.co",
    anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRzbXRqcGZ0emxseHVkdmlyYXBtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEyOTU4MDEsImV4cCI6MjEwNjg3MTgwMX0.H7VNk0H68wf_ctBRtTm9RinvQZHtqnjVEhVdkFjuIQQ"
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
