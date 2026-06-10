import { NextResponse } from 'next/server';
import { getTransformerReadings } from '@/lib/db';

export async function GET() {
  try {
    const allHistory: any[] = [];
    
    // Retrieve last 100 readings from each of the 25 transformers
    for (let i = 1; i <= 25; i++) {
      const readings = getTransformerReadings(`T${i}`).slice(-100);
      allHistory.push(...readings);
    }
    
    // Sort combined history by Time descending
    allHistory.sort((a, b) => new Date(b.Time).getTime() - new Date(a.Time).getTime());

    return NextResponse.json({
      success: true,
      data: allHistory
    });
  } catch (err: any) {
    console.error("Error in GET /api/transformers/history:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
