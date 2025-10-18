// App Configuration
// Switch between different backend implementations

export const AppConfig = {
  // Set to 'supabase' to use Supabase BaaS
  // Set to 'custom' to use custom Node.js backend
  backend: 'supabase' as 'supabase' | 'custom',
  
  // Supabase configuration
  supabase: {
    url: 'https://ojusijzhshvviqjeyhyn.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qdXNpanpoc2h2dmlxamV5aHluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1NjU3MjQsImV4cCI6MjA3MTE0MTcyNH0.rlQ9lIGzoaLTOW-5-W0G1J1A0WwvqZMnhGHW-FwV8GQ',
  },
  
  // Custom backend configuration (no longer used)
  customBackend: {
    url: 'https://freestyle-backend-production.up.railway.app',
  },
};

// Helper to check which backend is active
export const isSupabaseBackend = () => AppConfig.backend === 'supabase';
export const isCustomBackend = () => AppConfig.backend === 'custom';