import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
    );
    const { data, error } = await supabase.from('transformer_2').select('*').limit(2);
    if (error) {
      console.error("Error in GET /api/test supabase select:", error);
    }
    return NextResponse.json({ data, error });
  } catch (err: any) {
    console.error("Error in GET /api/test:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
