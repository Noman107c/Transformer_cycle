import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
)

async function fetchData() {
  console.log('🔄 Fetching data from transformer_2...\n')

  const { data, error } = await supabase
    .from('transformer_2') // 👈 NEW TABLE
    .select('*')

  if (error) {
    console.log('❌ Error:', error.message)
    return
  }

  if (!data || data.length === 0) {
    console.log('⚠️ No data found in transformer_2 table')
    return
  }

  console.log('✅ Data fetched successfully:\n')
  console.table(data)
}

fetchData()