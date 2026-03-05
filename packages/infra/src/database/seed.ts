import "reflect-metadata"
import { connectToDatabase } from "./start-connection"
import { User } from "../typeorm/entities/user-entity"
import * as bcrypt from 'bcryptjs'

export async function seedDb() {
  try {
    const dataSource = await connectToDatabase();
    const userRepository = dataSource.getRepository(User);

    // Seed admin user
    const adminExists = await userRepository.findOne({
      where: { email: 'admin@bestlap.com' }
    });

    if (!adminExists) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      const admin = userRepository.create({
        name: 'Admin',
        email: 'admin@bestlap.com',
        password: hashedPassword,
      });
      await userRepository.save(admin);
      console.log('✅ Admin user created successfully!');
      console.log('   Email: admin@bestlap.com');
      console.log('   Password: admin123');
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
