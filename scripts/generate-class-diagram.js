#!/usr/bin/env node

/**
 * Script to generate Class Diagram from Prisma Schemas
 * Usage: node scripts/generate-class-diagram.js
 */

const fs = require('fs');
const path = require('path');

const SERVICES = [
  { name: 'identity-service', path: 'services/identity-service/prisma/schema.prisma' },
  { name: 'member-service', path: 'services/member-service/prisma/schema.prisma' },
  { name: 'schedule-service', path: 'services/schedule-service/prisma/schema.prisma' },
  { name: 'billing-service', path: 'services/billing-service/prisma/schema.prisma' },
];

function parsePrismaSchema(schemaPath) {
  const content = fs.readFileSync(schemaPath, 'utf-8');
  const models = [];
  const enums = [];

  // Extract models
  const modelRegex = /model\s+(\w+)\s*\{([^}]+)\}/gs;
  let modelMatch;
  while ((modelMatch = modelRegex.exec(content)) !== null) {
    const modelName = modelMatch[1];
    const modelBody = modelMatch[2];

    const fields = [];
    const relations = [];

    // Extract fields
    const fieldRegex = /^\s*(\w+)\s+(\S+)(\s+@\w+[^\n]*)?/gm;
    let fieldMatch;
    while ((fieldMatch = fieldRegex.exec(modelBody)) !== null) {
      const fieldName = fieldMatch[1];
      const fieldType = fieldMatch[2];
      const modifiers = fieldMatch[3] || '';

      // Skip relations (they're in comments)
      if (fieldName === '//' || fieldName.startsWith('@@')) continue;

      fields.push({
        name: fieldName,
        type: fieldType,
        modifiers: modifiers.trim(),
      });
    }

    // Extract relations from comments
    const relationRegex = /\/\/ Relations\s*\n((?:\s+\w+.*\n?)+)/;
    const relationMatch = relationRegex.exec(modelBody);
    if (relationMatch) {
      const relationsText = relationMatch[1];
      const relationLines = relationsText.split('\n').filter(line => line.trim());
      relations.push(...relationLines.map(line => line.trim()));
    }

    models.push({
      name: modelName,
      fields,
      relations,
    });
  }

  // Extract enums
  const enumRegex = /enum\s+(\w+)\s*\{([^}]+)\}/gs;
  let enumMatch;
  while ((enumMatch = enumRegex.exec(content)) !== null) {
    const enumName = enumMatch[1];
    const enumBody = enumMatch[2];
    const values = enumBody
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('//'));

    enums.push({
      name: enumName,
      values,
    });
  }

  return { models, enums };
}

function generateMermaidDiagram(schemas) {
  let diagram = '```mermaid\nclassDiagram\n';

  schemas.forEach(({ serviceName, models, enums }) => {
    diagram += `\n    %% ${serviceName.toUpperCase()}\n`;

    models.forEach(model => {
      diagram += `    class ${model.name} {\n`;

      // Add key fields (limit to 10 for readability)
      const keyFields = model.fields
        .filter(f => !f.name.includes('created_at') && !f.name.includes('updated_at'))
        .slice(0, 10);

      keyFields.forEach(field => {
        const type = field.type.replace('?', '').replace('[]', '[]');
        diagram += `        +${type} ${field.name}\n`;
      });

      if (model.fields.length > 10) {
        diagram += `        +... ${model.fields.length - 10} more fields\n`;
      }

      diagram += `    }\n`;
    });
  });

  // Add relationships
  diagram += '\n    %% RELATIONSHIPS\n';
  schemas.forEach(({ models }) => {
    models.forEach(model => {
      if (model.relations && model.relations.length > 0) {
        model.relations.forEach(relation => {
          // Simple relationship extraction
          const match = relation.match(/(\w+)\s+(\w+)/);
          if (match) {
            const [, relationName, targetModel] = match;
            diagram += `    ${model.name} "1" --> "*" ${targetModel} : ${relationName}\n`;
          }
        });
      }
    });
  });

  diagram += '```\n';
  return diagram;
}

function generatePlantUMLDiagram(schemas) {
  let diagram = '@startuml Gym-147 Class Diagram\n';
  diagram += '!theme plain\n';
  diagram += 'skinparam classAttributeIconSize 0\n';
  diagram += 'skinparam linetype ortho\n\n';
  diagram += 'title Gym-147 System - Class Diagram\n\n';

  schemas.forEach(({ serviceName, models, enums }) => {
    diagram += `package "${serviceName}" {\n`;

    models.forEach(model => {
      diagram += `  class ${model.name} {\n`;

      // Add fields
      model.fields.slice(0, 15).forEach(field => {
        const type = field.type.replace('?', '').replace('[]', '[]');
        const visibility = field.modifiers.includes('@id') ? '+' : '+';
        diagram += `    ${visibility}${type} ${field.name}\n`;
      });

      if (model.fields.length > 15) {
        diagram += `    +... ${model.fields.length - 15} more fields\n`;
      }

      diagram += `  }\n\n`;
    });

    diagram += '}\n\n';
  });

  // Add relationships
  diagram += "' RELATIONSHIPS\n";
  schemas.forEach(({ models }) => {
    models.forEach(model => {
      if (model.relations && model.relations.length > 0) {
        model.relations.forEach(relation => {
          const match = relation.match(/(\w+)\s+(\w+)/);
          if (match) {
            const [, relationName, targetModel] = match;
            diagram += `${model.name} "1" -- "*" ${targetModel}\n`;
          }
        });
      }
    });
  });

  diagram += '@enduml\n';
  return diagram;
}

function main() {
  console.log('Generating Class Diagrams from Prisma Schemas...\n');

  const schemas = [];

  SERVICES.forEach(({ name, path: schemaPath }) => {
    const fullPath = path.join(process.cwd(), schemaPath);
    if (!fs.existsSync(fullPath)) {
      console.warn(`⚠️  Schema not found: ${fullPath}`);
      return;
    }

    console.log(`📖 Parsing ${name}...`);
    const parsed = parsePrismaSchema(fullPath);
    schemas.push({
      serviceName: name,
      ...parsed,
    });
    console.log(`   ✓ Found ${parsed.models.length} models, ${parsed.enums.length} enums`);
  });

  // Generate Mermaid diagram
  console.log('\n📊 Generating Mermaid diagram...');
  const mermaidDiagram = generateMermaidDiagram(schemas);
  const mermaidPath = path.join(process.cwd(), 'docs/CLASS_DIAGRAM_AUTO.md');
  fs.writeFileSync(mermaidPath, `# AUTO-GENERATED CLASS DIAGRAM\n\n${mermaidDiagram}\n`);
  console.log(`   ✓ Saved to ${mermaidPath}`);

  // Generate PlantUML diagram
  console.log('📊 Generating PlantUML diagram...');
  const plantUMLDiagram = generatePlantUMLDiagram(schemas);
  const plantUMLPath = path.join(process.cwd(), 'docs/CLASS_DIAGRAM_AUTO.puml');
  fs.writeFileSync(plantUMLPath, plantUMLDiagram);
  console.log(`   ✓ Saved to ${plantUMLPath}`);

  // Generate summary
  const totalModels = schemas.reduce((sum, s) => sum + s.models.length, 0);
  const totalEnums = schemas.reduce((sum, s) => sum + s.enums.length, 0);

  console.log('\n✅ Generation complete!');
  console.log(
    `   Total: ${totalModels} models, ${totalEnums} enums across ${schemas.length} services`
  );
}

if (require.main === module) {
  main();
}

module.exports = { parsePrismaSchema, generateMermaidDiagram, generatePlantUMLDiagram };
