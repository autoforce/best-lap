import "reflect-metadata"
import { connectToDatabase } from "./start-connection"
import { User } from "../typeorm/entities/user-entity"
import * as bcrypt from 'bcryptjs'
import { randomBytes } from 'node:crypto'

export async function seedDb() {
  try {
    const dataSource = await connectToDatabase({ runMigrations: true });
    const userRepository = dataSource.getRepository(User);

    // Seed admin user. Credentials come from ADMIN_EMAIL / ADMIN_PASSWORD; without a password,
    // a random one is generated and printed once, so no install ships with a known default.
    const email = process.env.ADMIN_EMAIL || 'admin@bestlap.com'
    const password = process.env.ADMIN_PASSWORD || randomBytes(12).toString('base64url')

    const adminExists = await userRepository.findOne({
      where: { email }
    });

    if (!adminExists) {
      const hashedPassword = await bcrypt.hash(password, 10);
      const admin = userRepository.create({
        name: 'Admin',
        email,
        password: hashedPassword,
      });
      await userRepository.save(admin);
      console.log('✅ Admin user created successfully!');
      console.log(`   Email: ${email}`);
      console.log(process.env.ADMIN_PASSWORD ? '   Password: (ADMIN_PASSWORD)' : `   Password: ${password}  ← guarde agora, ela não será mostrada de novo`);
    } else {
      console.log('ℹ️  Admin user already exists');
    }

    console.log('✅ Database seeding completed!');
  } catch (error) {
    console.error(`❌ Error when seeding database: ${error}`)
    process.exit(1);
  }
}

// Execute seed
seedDb().catch((error) => {
  console.error('Error during database seeding:', error);
  process.exit(1);
});
