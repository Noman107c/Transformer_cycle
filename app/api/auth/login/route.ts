import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import postgres from 'postgres';

const JWT_SECRET = process.env.JWT_SECRET || 'transformer_lifecycle_jwt_secret_key_2024';

export async function POST(request: Request) {
  let sql: ReturnType<typeof postgres> | null = null;
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ success: false, error: 'Email and password are required' }, { status: 400 });
    }

    sql = postgres(process.env.DATABASE_URL!, { ssl: 'require', max: 1 });

    const users = await sql<{ id: string; name: string; email: string; password: string; role: string }[]>`
      SELECT id, name, email, password, role FROM public.users WHERE email = ${email.toLowerCase().trim()} LIMIT 1
    `;

    if (users.length === 0) {
      return NextResponse.json({ success: false, error: 'Invalid email or password' }, { status: 401 });
    }

    const user = users[0];
    const isValid = await bcrypt.compare(password, user.password);

    if (!isValid) {
      return NextResponse.json({ success: false, error: 'Invalid email or password' }, { status: 401 });
    }

    if (user.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Access denied. Admin only.' }, { status: 403 });
    }

    // Generate JWT
    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    const response = NextResponse.json({
      success: true,
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    });

    // Set HTTP-only cookie
    response.cookies.set('admin_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24, // 24 hours
      path: '/',
    });

    return response;
  } catch (err: any) {
    console.error('Login error:', err);
    return NextResponse.json({ success: false, error: 'Server error. Please try again.' }, { status: 500 });
  } finally {
    if (sql) await sql.end();
  }
}
