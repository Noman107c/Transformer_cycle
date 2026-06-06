import { NextResponse } from 'next/server';
import { getTransformerList } from '@/lib/db';
import { initializePublicJson } from '@/lib/initialize';

export async function GET(request: Request) {
  try {
    // Ensure static files are initialized and optimized
    initializePublicJson();

    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit');
    let list = getTransformerList();
    
    if (limit) {
      list = list.slice(0, parseInt(limit));
    }
    
    return NextResponse.json({
      success: true,
      data: list
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
