import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://onropnbpchlhhrdbstns.supabase.co';
const supabaseKey = 'sb_publishable_shZC4Ts7Ooqr6mWBbd9qlA_Ss73nsov';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  console.log('Testing Supabase Connection...');
  const { data, error } = await supabase.from('transformer_2').select('*').limit(1);
  
  if (error) {
    console.error('Error fetching from database:', error.message);
  } else {
    console.log('Successfully fetched data. Found records:', data.length);
    console.log(data);
  }
}

testConnection();
