
import { db } from '../server/db';
import { businesses } from '../shared/schema';
import { fileURLToPath } from 'url';
import * as fs from 'fs';
import * as path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const data = fs.readFileSync(path.join(__dirname, '..', 'temp_business_data.json'), 'utf-8');
  const businessData = JSON.parse(data);

  await db.insert(businesses).values({
    businessName: businessData.businessName,
    businessType: businessData.businessType,
    address: businessData.address,
  });

  console.log('Seeding complete.');
}

main().catch((error) => {
  console.error('Error seeding database:', error);
  process.exit(1);
});
