const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const Product = require('../src/models/Product');
const Supplier = require('../src/models/Supplier');
const User = require('../src/models/User');

const args = process.argv.slice(2);
const shouldApply = args.includes('--apply');
const includeAll = args.includes('--all');
const useGeneralFallback = !args.includes('--no-general-fallback');
const fallbackSupplierArg = args.find((arg) => arg.startsWith('--fallbackSupplierId='));
const onlyUserArg = args.find((arg) => arg.startsWith('--user='));

const fallbackSupplierId = fallbackSupplierArg?.split('=')[1]?.trim();
const onlyUsername = onlyUserArg?.split('=')[1]?.trim();
const generalSupplierCode = 'SUP-UMUM';

const supplierRules = [
  {
    supplierMatch: ['indofood'],
    productMatch: ['indomie', 'pop mie', 'sarimi', 'supermi', 'chitato', 'qtela', 'lays', 'cheetos'],
  },
  {
    supplierMatch: ['wings'],
    productMatch: ['mie sedaap', 'sedaap', 'top coffee', 'so klin', 'daia', 'nuvo', 'givi'],
  },
  {
    supplierMatch: ['mayora'],
    productMatch: ['kopiko', 'beng beng', 'beng-beng', 'roma', 'astor', 'torabika', 'le minerale'],
  },
  {
    supplierMatch: ['unilever'],
    productMatch: ['lifebuoy', 'rinso', 'sunsilk', 'clear', 'pepsodent', 'royco', 'bango', 'molto'],
  },
  {
    supplierMatch: ['nestle'],
    productMatch: ['milo', 'dancow', 'bear brand', 'nescafe', 'cerelac'],
  },
  {
    supplierMatch: ['danone'],
    productMatch: ['aqua', 'mizone', 'vit', 'evian'],
  },
  {
    supplierMatch: ['garudafood', 'garuda'],
    productMatch: ['garuda', 'gery', 'chocolatos', 'clevo'],
  },
  {
    supplierMatch: ['orang tua', 'ot group'],
    productMatch: ['tango', 'teh gelas', 'formula', 'kiranti', 'sikat gigi formula'],
  },
  {
    supplierMatch: ['kalbe'],
    productMatch: ['hydro coco', 'prenagen', 'entasol', 'entrasol', 'woods'],
  },
  {
    supplierMatch: ['frisian', 'frisian flag'],
    productMatch: ['frisian', 'flag', 'omela', 'susu bendera'],
  },
];

const normalize = (value) => String(value || '').toLowerCase();

const findSupplierByRule = (product, suppliers) => {
  const searchableProduct = normalize(`${product.name} ${product.sku} ${product.category}`);

  for (const rule of supplierRules) {
    const productMatches = rule.productMatch.some((keyword) => searchableProduct.includes(keyword));
    if (!productMatches) continue;

    const supplier = suppliers.find((item) => {
      const searchableSupplier = normalize(`${item.name} ${item.supplierId}`);
      return rule.supplierMatch.some((keyword) => searchableSupplier.includes(keyword));
    });

    if (supplier) return { supplier, reason: 'rule' };
  }

  return null;
};

const getTargetSupplier = (product, suppliers, fallbackSupplier) => {
  const ruleMatch = findSupplierByRule(product, suppliers);
  if (ruleMatch) return ruleMatch;

  if (fallbackSupplier) {
    return { supplier: fallbackSupplier, reason: 'fallback' };
  }

  return null;
};

const connectDB = async () => {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI belum diisi di kirobackend/.env');
  }

  await mongoose.connect(process.env.MONGODB_URI);
};

const ensureGeneralSupplier = async (admin) => {
  let supplier = await Supplier.findOne({ userId: admin._id, supplierId: generalSupplierCode });

  if (supplier) return supplier;

  if (!shouldApply) {
    return {
      _id: null,
      name: 'Supplier Umum',
      supplierId: generalSupplierCode,
      isDryRunPlaceholder: true,
    };
  }

  supplier = await Supplier.create({
    userId: admin._id,
    supplierId: generalSupplierCode,
    name: 'Supplier Umum',
    phone: '0000000000',
    address: 'Supplier default untuk produk lama yang belum memiliki supplier spesifik',
    status: 'ACTIVE',
  });

  console.log(`[${admin.username}] Supplier Umum dibuat (${generalSupplierCode})`);
  return supplier;
};

const run = async () => {
  await connectDB();

  const userFilter = onlyUsername ? { username: onlyUsername, role: 'admin' } : { role: 'admin' };
  const admins = await User.find(userFilter).sort({ createdAt: 1 });

  if (admins.length === 0) {
    console.log('Tidak ada admin yang ditemukan.');
    return;
  }

  console.log(shouldApply ? 'Mode: APPLY' : 'Mode: DRY RUN');
  console.log(includeAll ? 'Target: semua produk' : 'Target: produk yang supplier-nya kosong saja');
  console.log('');

  let totalMatched = 0;
  let totalUpdated = 0;
  let totalSkipped = 0;

  for (const admin of admins) {
    const suppliers = await Supplier.find({ userId: admin._id, status: 'ACTIVE' }).sort({ supplierId: 1 });

    if (suppliers.length === 0) {
      console.log(`[${admin.username}] Tidak ada supplier aktif. Lewati.`);
      totalSkipped += await Product.countDocuments({ userId: admin._id });
      continue;
    }

    const generalSupplier = useGeneralFallback ? await ensureGeneralSupplier(admin) : null;
    const fallbackSupplier =
      suppliers.find((supplier) => supplier.supplierId === fallbackSupplierId) ||
      generalSupplier ||
      suppliers[0];

    const productFilter = includeAll
      ? { userId: admin._id }
      : {
          userId: admin._id,
          $or: [{ supplier: null }, { supplier: { $exists: false } }],
        };

    const products = await Product.find(productFilter).sort({ name: 1 });
    totalMatched += products.length;

    console.log(`[${admin.username}] ${products.length} produk perlu dicek`);

    for (const product of products) {
      const target = getTargetSupplier(product, suppliers, fallbackSupplier);

      if (!target) {
        totalSkipped += 1;
        console.log(`  SKIP ${product.sku} - ${product.name}: tidak ada supplier target`);
        continue;
      }

      console.log(
        `  ${shouldApply ? 'UPDATE' : 'PLAN'} ${product.sku} - ${product.name} -> ${target.supplier.name} (${target.reason})`
      );

      if (shouldApply) {
        product.supplier = target.supplier._id;
        await product.save();
        totalUpdated += 1;
      }
    }

    console.log('');
  }

  console.log('Ringkasan:');
  console.log(`- Produk dicek   : ${totalMatched}`);
  console.log(`- Produk diupdate: ${totalUpdated}`);
  console.log(`- Produk dilewati: ${totalSkipped}`);

  if (!shouldApply) {
    console.log('');
    console.log('Jalankan dengan --apply kalau rencana assignment sudah cocok.');
  }
};

run()
  .catch((error) => {
    console.error('Gagal assign supplier produk:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close();
  });
