const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://onropnbpchlhhrdbstns.supabase.co';
const supabaseKey = 'sb_publishable_shZC4Ts7Ooqr6mWBbd9qlA_Ss73nsov';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  console.log('Testing Supabase Connection for transformer_1...');
  const { data, error } = await supabase.from('transformer_1').select('*').limit(10);
  
  if (error) {
    console.error('Error fetching from database:', error.message);
  } else {
    console.log('Successfully fetched data. Columns available:');
    if (data.length > 0) {
      console.log(Object.keys(data[0]));
      console.log(data[0]);
    } else {
      console.log('No rows found in transformer_1');
    }
  }
}

testConnection();
