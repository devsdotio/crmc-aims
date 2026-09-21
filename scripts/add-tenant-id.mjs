import fs from 'fs';
import path from 'path';

const schemaDir = path.join(process.cwd(), 'src/server/db/schema');
const files = fs.readdirSync(schemaDir).filter(f => f.endsWith('.ts') && f !== 'tenants.ts' && f !== 'index.ts' && f !== 'assets.ts');

for (const file of files) {
  const filePath = path.join(schemaDir, file);
  let content = fs.readFileSync(filePath, 'utf-8');

  // 1. Add tenants import
  if (!content.includes('import { tenants }')) {
    content = content.replace(/(import .*? from "drizzle-orm\/pg-core";\r?\n)/, '$1\nimport { tenants } from "./tenants";\n');
  }

  // 2. Add unique to pg-core import if not present
  if (content.includes('unique(') || content.includes('.unique()')) {
    if (!content.match(/unique[\s,]*\} from "drizzle-orm\/pg-core"/)) {
      content = content.replace(/(\} from "drizzle-orm\/pg-core";)/, '  unique,\n$1');
    }
  }

  // 3. Add tenantId column after id: ...
  if (!content.includes('tenantId:')) {
    const idRegex = /(id:\s*uuid\([^)]+\)\.primaryKey\(\)\.defaultRandom\(\),)/;
    if (idRegex.test(content)) {
      content = content.replace(
        idRegex,
        `$1\n    tenantId: uuid("tenant_id").notNull().default("00000000-0000-0000-0000-000000000001").references(() => tenants.id),`
      );
    } else {
      console.log(`Could not find id column in ${file}`);
    }
  }

  // 4. Refactor single-column unique
  // Matches e.g. someCode: text("some_code").notNull().unique(),
  const uniqueColRegex = /([a-zA-Z0-9_]+):\s*(?:text|uuid)\("([^"]+)"\)(.*?)\.unique\(\),/g;
  let hasUnique = false;
  let uniqueCols = [];
  
  content = content.replace(uniqueColRegex, (match, colName, dbName, rest) => {
    hasUnique = true;
    uniqueCols.push(colName);
    return `${colName}: text("${dbName}")${rest},`; // Assuming text/uuid doesn't matter for the replacement string if we just keep the rest
    // Wait, the regex captures the type. Let's fix it.
  });

  // Re-run regex with better replacement
  const betterRegex = /([a-zA-Z0-9_]+):\s*([a-zA-Z0-9_]+)\("([^"]+)"\)(.*?)\.unique\(\),/g;
  uniqueCols = [];
  content = content.replace(betterRegex, (match, colName, type, dbName, rest) => {
    uniqueCols.push(colName);
    return `${colName}: ${type}("${dbName}")${rest},`;
  });

  if (uniqueCols.length > 0) {
    // We need to add the unique index to the table's index array
    const tablePrefix = file.replace('.ts', '').replace(/-/g, '_');
    const indexAdditions = uniqueCols.map(col => `    unique("${tablePrefix}_tenant_${col}_idx").on(table.tenantId, table.${col}),`).join('\n');
    
    // Find the end of the table definition
    const indexesBlockRegex = /,\n\s*\(\s*table\s*\)\s*=>\s*\[/;
    if (indexesBlockRegex.test(content)) {
      content = content.replace(indexesBlockRegex, `,\n  (table) => [\n${indexAdditions}`);
    } else {
      // If there are no existing indexes, we add them at the end of the pgTable call
      // This is trickier, we might need to find the closing bracket of the pgTable columns object
      // Let's just find `  },\n);` or similar at the end of pgTable
      const endOfTableRegex = /  \}(,)?\n\);/g;
      // We will match the LAST occurrence of `  }\n);` or `  },\n);` (assuming only one pgTable per file usually)
      let lastIndex = -1;
      let match;
      while ((match = endOfTableRegex.exec(content)) !== null) {
        lastIndex = match.index;
      }
      
      if (lastIndex !== -1) {
        content = content.slice(0, lastIndex) + `  },\n  (table) => [\n${indexAdditions}\n  ]\n);` + content.slice(lastIndex + content.match(endOfTableRegex)[0].length);
      } else {
        console.log(`Could not add indexes block to ${file}`);
      }
    }
  }
  
  // ensure uuid is imported
  if (!content.includes('uuid(') && content.includes('tenantId: uuid')) {
     if (!content.match(/uuid[\s,]*\} from "drizzle-orm\/pg-core"/)) {
       content = content.replace(/(\} from "drizzle-orm\/pg-core";)/, '  uuid,\n$1');
     }
  }

  fs.writeFileSync(filePath, content, 'utf-8');
}
console.log('Done');
