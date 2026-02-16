import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import User from '../src/models/User.js';
import Recipe from '../src/models/Recipe.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env') });

const runMigration = async () => {
  try {
    console.log('🚀 Starting Recipe Book v2.0 Migration...\n');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✓ Connected to MongoDB\n');

    // Step 1: Check if admin user already exists
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@recipebook.local';
    let adminUser = await User.findOne({ email: adminEmail });

    if (adminUser) {
      console.log(`✓ Admin user already exists: ${adminEmail}`);
    } else {
      // Step 2: Create default admin user
      console.log('Creating default admin user...');
      const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
      
      adminUser = await User.create({
        email: adminEmail,
        password: adminPassword,
        displayName: 'Admin User',
        isVerified: true
      });
      
      console.log(`✓ Created admin user: ${adminEmail}`);
      console.log(`  Password: ${adminPassword}`);
      console.log('  ⚠️  IMPORTANT: Change this password after first login!\n');
    }

    // Step 3: Count recipes without owner
    const recipesWithoutOwner = await Recipe.countDocuments({ 
      owner: { $exists: false } 
    });

    if (recipesWithoutOwner === 0) {
      console.log('✓ All recipes already have owners assigned\n');
    } else {
      console.log(`Found ${recipesWithoutOwner} recipes without owner`);
      console.log('Assigning to admin user...');

      // Step 4: Assign all existing recipes to admin user
      const result = await Recipe.updateMany(
        { owner: { $exists: false } },
        { 
          $set: { 
            owner: adminUser._id,
            visibility: 'private'
          }
        }
      );

      console.log(`✓ Updated ${result.modifiedCount} recipes\n`);
    }

    // Step 5: Verify migration
    console.log('Verifying migration...');
    const totalRecipes = await Recipe.countDocuments();
    const recipesWithOwner = await Recipe.countDocuments({ 
      owner: { $exists: true } 
    });
    const totalUsers = await User.countDocuments();

    console.log(`\n📊 Migration Summary:`);
    console.log(`   Users: ${totalUsers}`);
    console.log(`   Total Recipes: ${totalRecipes}`);
    console.log(`   Recipes with Owner: ${recipesWithOwner}`);
    console.log(`   Recipes without Owner: ${totalRecipes - recipesWithOwner}`);

    if (totalRecipes === recipesWithOwner) {
      console.log('\n✅ Migration completed successfully!');
    } else {
      console.log('\n⚠️  Warning: Some recipes still do not have owners');
    }

    console.log('\n📝 Next Steps:');
    console.log('   1. Update JWT_SECRET and JWT_REFRESH_SECRET in .env');
    console.log('   2. Login with admin credentials');
    console.log('   3. Change admin password');
    console.log('   4. Create additional user accounts as needed\n');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('Disconnected from MongoDB');
    process.exit(0);
  }
};

// Run migration
runMigration();