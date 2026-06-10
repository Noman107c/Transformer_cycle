import { NextResponse } from 'next/server';
import { initializePublicJson } from '@/lib/initialize';

export async function POST() {
  try {
    initializePublicJson(true);
    return NextResponse.json({
      success: true,
      message: 'Successfully re-sliced and synchronized all 25 datasets into public store.'
    });
  } catch (err: any) {
    console.error("Error in POST /api/admin/sync:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
