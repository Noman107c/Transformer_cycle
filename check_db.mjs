import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://onropnbpchlhhrdbstns.supabase.co';
const supabaseKey = 'sb_publishable_shZC4Ts7Ooqr6mWBbd9qlA_Ss73nsov';

const supabase = createClient(supabaseUrl, supabaseKey);

async function fetchAllData(tableName) {
  console.log(`Fetching ALL data from ${tableName}...`);

  const pageSize = 1000;
  let from = 0;
  let allData = [];

  while (true) {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .range(from, from + pageSize - 1)
      .order('Timestamp', { ascending: false });

    if (error) {
      console.error('Error fetching data:', error.message);
      break;
    }

    if (!data || data.length === 0) break;

    allData = [...allData, ...data];

    console.log(`Fetched ${data.length} records (Total: ${allData.length})`);

    if (data.length < pageSize) break;

    from += pageSize;
  }

  return allData;
}

async function testConnection() {
  try {
    const tableName = 'transformer_2';

    const data = await fetchAllData(tableName);

    console.log('\n============================');
    console.log('TOTAL RECORDS:', data.length);
    console.log('SAMPLE RECORD:', data[0]);
    console.log('============================\n');

    // optional: print first 5 rows
    console.log('FIRST 5 ROWS:', data.slice(0, 5));

  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

testConnection();