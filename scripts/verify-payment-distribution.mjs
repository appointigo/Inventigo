import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function run() {
  try {
    console.log('========== QUERY: SALE PAYMENTS FOR 2026-09-01 ==========');
    const sep1 = await prisma.$queryRaw`
      SELECT sp.id, sp.amount::float8 AS amount, sp.method::text AS method, sp."saleId" AS "saleId", s."invoiceNumber" AS "invoiceNumber", s."storeId" AS "storeId", sp."businessDate" AS "businessDate"
      FROM sale_payments sp
      JOIN sales s ON s.id = sp."saleId"
      WHERE (sp."businessDate"::date = ${'2026-09-01'})
      ORDER BY sp."paidAt" ASC
    `;

    console.table(sep1.map(r => ({ invoice: r.invoiceNumber, storeId: r.storeId, method: r.method, amount: Number(r.amount) })));
    console.log('Payment records =', sep1.length);

    const cashSep1 = sep1.filter(r => r.method === 'CASH').reduce((s, r) => s + Number(r.amount), 0);
    const upiSep1 = sep1.filter(r => r.method === 'UPI').reduce((s, r) => s + Number(r.amount), 0);
    const cardSep1 = sep1.filter(r => r.method === 'CARD').reduce((s, r) => s + Number(r.amount), 0);
    const totalSep1 = cashSep1 + upiSep1 + cardSep1;

    console.log('\n========== SEP 1 AGGREGATION =========');
    console.log('CASH =', cashSep1);
    console.log('UPI  =', upiSep1);
    console.log('CARD =', cardSep1);
    console.log('TOTAL =', totalSep1);

    console.log('\n========== QUERY: SALE PAYMENTS FOR 2026-08-28 ==========');
    const aug28 = await prisma.$queryRaw`
      SELECT sp.id, sp.amount::float8 AS amount, sp.method::text AS method, sp."saleId" AS "saleId", s."invoiceNumber" AS "invoiceNumber", s."storeId" AS "storeId", sp."businessDate" AS "businessDate"
      FROM sale_payments sp
      JOIN sales s ON s.id = sp."saleId"
      WHERE (sp."businessDate"::date = ${'2026-08-28'})
      ORDER BY sp."paidAt" ASC
    `;

    console.table(aug28.map(r => ({ invoice: r.invoiceNumber, storeId: r.storeId, method: r.method, amount: Number(r.amount) })));
    console.log('Payment records for Aug 28 =', aug28.length);

    const cashAug28 = aug28.filter(r => r.method === 'CASH').reduce((s, r) => s + Number(r.amount), 0);
    const upiAug28 = aug28.filter(r => r.method === 'UPI').reduce((s, r) => s + Number(r.amount), 0);
    console.log('\nAug 28 CASH =', cashAug28, 'UPI =', upiAug28);

    // Also print aggregated API-like payload for Sep1
    const payload = [
      { method: 'CASH', amount: Number(cashSep1.toFixed(2)), count: sep1.filter(r => r.method === 'CASH').length },
      { method: 'UPI', amount: Number(upiSep1.toFixed(2)), count: sep1.filter(r => r.method === 'UPI').length },
      { method: 'CARD', amount: Number(cardSep1.toFixed(2)), count: sep1.filter(r => r.method === 'CARD').length },
    ];

    console.log('\n========== SIMULATED API RESPONSE FOR 2026-09-01 =========');
    console.log(JSON.stringify(payload, null, 2));

    await prisma.$disconnect();
  } catch (err) {
    console.error('Error running verification script', err);
    await prisma.$disconnect();
    process.exit(1);
  }
}

run();
