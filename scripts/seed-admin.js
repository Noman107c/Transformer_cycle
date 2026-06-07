/**
 * Seed script: Creates admin user in public.users table
 * Run with: node scripts/seed-admin.js
 */

const bcrypt = require('bcryptjs');
require('dotenv').config();

async function seedAdmin() {
  let sql;
  try {
    const { default: postgres } = await import('postgres');
    sql = postgres(process.env.DATABASE_URL, { ssl: 'require' });
  } catch (e) {
    console.error('Failed to connect to database:', e.message);
    process.exit(1);
  }

  try {
    console.log('🔐 Hashing password...');
    const hashedPassword = await bcrypt.hash('12345678', 10);

    console.log('👤 Creating admin user...');
    await sql`
      INSERT INTO public.users (name, email, password, role)
      VALUES ('Admin', 'admin@gmail.com', ${hashedPassword}, 'admin')
      ON CONFLICT (email) DO UPDATE
        SET password = ${hashedPassword}, role = 'admin', name = 'Admin'
    `;

    console.log('✅ Admin user seeded successfully!');
    console.log('   Email:    admin@gmail.com');
    console.log('   Password: 12345678');
    console.log('   Role:     admin');

    // Also seed the transformers metadata table
    console.log('\n🔄 Creating transformers metadata table and seeding T1-T25...');
    await sql`
      CREATE TABLE IF NOT EXISTS public.transformers (
        id text PRIMARY KEY,
        name text NOT NULL,
        location text NOT NULL DEFAULT '',
        type text NOT NULL DEFAULT 'Distribution',
        capacity numeric NOT NULL DEFAULT 50,
        status text NOT NULL DEFAULT 'GOOD',
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamp DEFAULT now(),
        updated_at timestamp DEFAULT now()
      )
    `;

    const locations = [
      'Substation Alpha', 'Substation Beta', 'Substation Gamma', 'Substation Delta',
      'Main Grid North', 'West Distribution Hub', 'East Industrial Park', 'South Grid Terminal'
    ];

    const types = ['Step-up', 'Step-down', 'Distribution'];
    const capacities = [50, 100, 150, 250, 500];

    for (let i = 0; i < 25; i++) {
      const id = `T${i + 1}`;
      const name = `Transformer ${i + 1}`;
      const location = locations[i % locations.length];
      const type = types[i % 3];
      const capacity = capacities[i % 5];

      await sql`
        INSERT INTO public.transformers (id, name, location, type, capacity, status, is_active)
        VALUES (${id}, ${name}, ${location}, ${type}, ${capacity}, 'GOOD', true)
        ON CONFLICT (id) DO NOTHING
      `;
    }

    console.log('✅ Transformers metadata seeded (T1-T25)!');
  } catch (err) {
    console.error('❌ Seed failed:', err.message);
  } finally {
    await sql.end();
    process.exit(0);
  }
}

seedAdmin();
