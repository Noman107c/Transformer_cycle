import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import postgres from 'postgres';

const JWT_SECRET =
  process.env.JWT_SECRET || 'transformer_lifecycle_jwt_secret_key_2024';

// ✅ DB connection OUTSIDE handler (important for Vercel)
const sql = postgres(process.env.DATABASE_URL!, {
  ssl: { rejectUnauthorized: false },
  max: 1,
});

export async function POST(request: Request) {
  try {
    // -----------------------------
    // 1. Parse request safely
    // -----------------------------
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON request' },
        { status: 400 }
      );
    }

    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // -----------------------------
    // 2. Fetch user
    // -----------------------------
    let users;
    try {
      users = await sql`
        SELECT id, name, email, password, role 
        FROM public.users 
        WHERE email = ${email.toLowerCase().trim()} 
        LIMIT 1
      `;
    } catch (dbError) {
      console.error('DB ERROR:', dbError);
      return NextResponse.json(
        { success: false, error: 'Database query failed' },
        { status: 500 }
      );
    }

    if (!users || users.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    const user = users[0];

    // -----------------------------
    // 3. Validate password safely
    // -----------------------------
    if (!user?.password) {
      return NextResponse.json(
        { success: false, error: 'User data corrupted' },
        { status: 500 }
      );
    }

    const isValid = await bcrypt.compare(password, user.password);

    if (!isValid) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // -----------------------------
    // 4. Role check
    // -----------------------------
    if (user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Access denied (Admin only)' },
        { status: 403 }
      );
    }

    // -----------------------------
    // 5. Generate JWT
    // -----------------------------
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // -----------------------------
    // 6. Response + cookie
    // -----------------------------
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });

    response.cookies.set('admin_token', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24,
    });

    return response;
  } catch (err) {
    console.error('LOGIN API ERROR:', err);

    return NextResponse.json(
      { success: false, error: 'Server error. Please try again.' },
      { status: 500 }
    );
  }
}