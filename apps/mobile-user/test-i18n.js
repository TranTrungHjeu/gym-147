// Test script to verify i18n loading
const en = require('./locales/en.json');
const vi = require('./locales/vi.json');

console.log('=== EN.JSON Structure ===');
console.log('common keys:', Object.keys(en.common || {}));
console.log('common.loading:', en.common?.loading);
console.log('common.weeks:', en.common?.weeks);

console.log('\n=== VI.JSON Structure ===');
console.log('common keys:', Object.keys(vi.common || {}));
console.log('common.loading:', vi.common?.loading);
console.log('common.weeks:', vi.common?.weeks);

console.log('\n=== Translation namespace structure ===');
const enWrapped = { translation: en };
console.log('Wrapped EN common.loading:', enWrapped.translation.common.loading);
console.log('Wrapped EN common.weeks:', enWrapped.translation.common.weeks);
