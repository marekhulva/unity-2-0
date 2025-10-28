import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ojusijzhshvviqjeyhyn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qdXNpanpoc2h2dmlxamV5aHluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1NjU3MjQsImV4cCI6MjA3MTE0MTcyNH0.rlQ9lIGzoaLTOW-5-W0G1J1A0WwvqZMnhGHW-FwV8GQ';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function main() {
  console.log('📊 Checking Challenge Database Schema...\n');

  const tables = [
    'challenges',
    'challenge_participants',
    'challenge_completions',
    'challenge_activities',
    'challenge_forum_threads',
    'challenge_forum_replies',
    'challenge_activity_schedules',
    'user_badges'
  ];

  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('*').limit(0);
    
    if (error) {
      console.log(`❌ ${table}: DOES NOT EXIST (${error.message})`);
    } else {
      console.log(`✅ ${table}: EXISTS`);
    }
  }
}

main().catch(console.error);
