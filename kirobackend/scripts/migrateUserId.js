const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const User = require('../src/models/User');
const Product = require('../src/models/Product');
const Category = require('../src/models/Category');
const Supplier = require('../src/models/Supplier');
const StockMovement = require('../src/models/StockMovement');
const IncomingItem = require('../src/models/IncomingItem');
const PurchaseOrder = require('../src/models/PurchaseOrder');
const Transaction = require('../src/models/Transaction');
const CashierShift = require('../src/models/CashierShift');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB Connected for migration');
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    process.exit(1);
  }
};

const migrateData = async () => {
  try {
    // Get the first admin user (original user)
    let adminUser = await User.findOne({ role: 'admin' });
    
    if (!adminUser) {
      console.log('❌ No admin user found. Please create an admin account first.');
      process.exit(1);
    }

    console.log(`📝 Using admin user: ${adminUser.username} (${adminUser._id})`);
    console.log('Starting migration...\n');

    const userId = adminUser._id;

    // Migrate all collections
    const collections = [
      { name: 'Product', model: Product },
      { name: 'Category', model: Category },
      { name: 'Supplier', model: Supplier },
      { name: 'StockMovement', model: StockMovement },
      { name: 'IncomingItem', model: IncomingItem },
      { name: 'PurchaseOrder', model: PurchaseOrder },
      { name: 'Transaction', model: Transaction },
      { name: 'CashierShift', model: CashierShift },
    ];

    console.log('🔧 Dropping indexes to allow migration...');
    for (const { name, model } of collections) {
      try {
        await model.collection.dropIndexes();
      } catch (err) {
        // Indexes might not exist, continue
      }
    }
    console.log('✅ Indexes dropped\n');

    console.log('📝 Migrating data...');
    for (const { name, model } of collections) {
      const result = await model.updateMany(
        { userId: { $exists: false } }, // Update documents without userId
        { $set: { userId: userId } }
      );

      console.log(`✅ ${name}: ${result.matchedCount} documents updated`);
    }

    console.log('\n🔧 Recreating indexes...');
    for (const { name, model } of collections) {
      try {
        await model.syncIndexes();
        console.log(`✅ ${name}: Indexes synced`);
      } catch (err) {
        console.log(`⚠️ ${name}: Index sync completed with warning`);
      }
    }
    console.log('');

    console.log('🎉 Migration completed successfully!');
    console.log('All old data now belongs to:', adminUser.username);
  } catch (error) {
    console.error('❌ Migration error:', error.message);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
  }
};

// Run migration
connectDB().then(() => migrateData());
