import fs from 'fs';
import path from 'path';

const schemaDir = path.join(process.cwd(), 'src/server/db/schema');
const files = fs.readdirSync(schemaDir).filter(f => f.endsWith('.ts') && f !== 'tenants.ts' && f !== 'index.ts');

for (const file of files) {
  const filePath = path.join(schemaDir, file);
  let content = fs.readFileSync(filePath, 'utf-8');

  if (!content.includes('import { tenants }')) {
    // Find the end of drizzle-orm/pg-core import
    content = content.replace(/from "drizzle-orm\/pg-core";\r?\n/, 'from "drizzle-orm/pg-core";\n\nimport { tenants } from "./tenants";\n');
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`Updated ${file}`);
  }
}
console.log('Done');
