#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.development' });

// Service role key bypasses RLS
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

async function createJingCircle() {
  const userId = 'af929cbc-9a67-4c8c-91b1-71bbc982c429';

  console.log('Creating JING circle...');

  // Generate join code
  const joinCode = Math.random().toString(36).substring(2, 10).toUpperCase();

  // Create the circle (service role bypasses RLS)
  const { data: circle, error: circleError } = await supabase
    .from('circles')
    .insert({
      name: 'JING',
      created_by: userId,
      emoji: '⚡',
      join_code: joinCode
    })
    .select()
    .single();

  if (circleError) {
    console.error('Error creating circle:', circleError);
    process.exit(1);
  }

  console.log('✅ Circle created:', circle);

  // Add creator as admin member
  const { data: member, error: memberError } = await supabase
    .from('circle_members')
    .insert({
      circle_id: circle.id,
      user_id: userId,
      role: 'admin'
    })
    .select()
    .single();

  if (memberError) {
    console.error('Error adding member:', memberError);
    process.exit(1);
  }

  console.log('✅ Added as admin member');
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📍 Circle Details:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('ID:', circle.id);
  console.log('Name:', circle.name);
  console.log('Emoji:', circle.emoji);
  console.log('Join Code:', joinCode);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

createJingCircle().catch(console.error);
