import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  console.log('Seeding SENDISTRI database...');

  const hash = async (pw: string) => bcrypt.hash(pw, 12);

  // Super admin
  const superAdmin = await prisma.user.upsert({
    where: { email: 'admin@sendistri.com' },
    update: {},
    create: {
      email: 'admin@sendistri.com',
      password_hash: await hash('Admin@1234!'),
      role: 'SUPER',
      is_active: true,
    },
  });

  // PDVs
  const pdv1 = await prisma.pDV.upsert({
    where: { code: 'PDV-DAKAR-01' },
    update: {},
    create: {
      code: 'PDV-DAKAR-01',
      name: 'Point de Vente Dakar Centre',
      type: 'PDV',
      secteur: 'Centre',
      region: 'Dakar',
      phone: '+221 77 000 00 01',
      caution: 500000,
    },
  });

  const pdv2 = await prisma.pDV.upsert({
    where: { code: 'PDV-THIES-01' },
    update: {},
    create: {
      code: 'PDV-THIES-01',
      name: 'Point de Vente Thiès Nord',
      type: 'PDV',
      secteur: 'Nord',
      region: 'Thiès',
      phone: '+221 77 000 00 02',
      caution: 300000,
    },
  });

  const pdv3 = await prisma.pDV.upsert({
    where: { code: 'PART-ZIGUINCHOR-01' },
    update: {},
    create: {
      code: 'PART-ZIGUINCHOR-01',
      name: 'Partenaire Ziguinchor',
      type: 'PARTNER',
      secteur: 'Sud',
      region: 'Ziguinchor',
      caution: 200000,
    },
  });

  // Admin users
  const admin1 = await prisma.user.upsert({
    where: { email: 'gestionnaire@sendistri.com' },
    update: {},
    create: {
      email: 'gestionnaire@sendistri.com',
      password_hash: await hash('Admin@1234!'),
      role: 'ADMIN',
      is_active: true,
    },
  });

  const admin2 = await prisma.user.upsert({
    where: { email: 'comptable@sendistri.com' },
    update: {},
    create: {
      email: 'comptable@sendistri.com',
      password_hash: await hash('Admin@1234!'),
      role: 'ACCOUNTANT',
      is_active: true,
    },
  });

  const pdvOp = await prisma.user.upsert({
    where: { email: 'pdv1@sendistri.com' },
    update: {},
    create: {
      email: 'pdv1@sendistri.com',
      password_hash: await hash('Admin@1234!'),
      role: 'PDV_OPERATOR',
      pdv_id: pdv1.id,
      is_active: true,
    },
  });

  console.log('\n✅ Seed complete. Credentials:');
  console.log('  Super Admin : admin@sendistri.com        / Admin@1234!');
  console.log('  Admin       : gestionnaire@sendistri.com / Admin@1234!');
  console.log('  Comptable   : comptable@sendistri.com    / Admin@1234!');
  console.log('  PDV Opérat. : pdv1@sendistri.com         / Admin@1234!');
  console.log('\nPDVs créés:', pdv1.code, '|', pdv2.code, '|', pdv3.code);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
