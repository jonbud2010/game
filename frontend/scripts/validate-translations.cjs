#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

class TranslationValidator {
  constructor(options = {}) {
    this.options = {
      srcDir: path.join(__dirname, '..', 'src'),
      localesDir: path.join(__dirname, '..', 'public', 'locales'),
      namespaces: ['common', 'game', 'admin', 'errors'],
      defaultNamespace: 'common',
      fixMode: options.fix || false,
      verbose: options.verbose || false
    };
    
    this.usedKeys = new Set();
    this.availableKeys = {};
    this.errors = [];
    this.warnings = [];
  }

  log(message, type = 'info') {
    if (this.options.verbose || type === 'error') {
      const prefix = type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️';
      console.log(`${prefix} ${message}`);
    }
  }

  // Extract translation keys from source files
  extractKeysFromFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const keys = new Set();
    
    // Skip test files - they often contain hardcoded strings for testing
    if (filePath.includes('.test.') || filePath.includes('.spec.')) {
      return keys;
    }
    
    // Match t('key') and t("key") patterns
    const patterns = [
      /t\(['"`]([^'"`]+)['"`]\)/g,
      /t\(['"`]([^'"`]+)['"`]\s*,/g,
      /useTranslation\(\s*['"`]([^'"`]+)['"`]\s*\)/g
    ];
    
    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const key = match[1];
        
        // Filter out invalid keys
        if (!this.isValidTranslationKey(key)) {
          continue;
        }
        
        // Handle namespace syntax
        if (key.includes(':')) {
          keys.add(key);
        } else {
          // Add with default namespace for validation
          keys.add(`${this.options.defaultNamespace}:${key}`);
        }
        
        // Also track the raw key
        this.usedKeys.add(key);
      }
    });
    
    return keys;
  }

  // Check if a string is a valid translation key
  isValidTranslationKey(key) {
    // Filter out obvious non-translation strings
    const invalidPatterns = [
      /^[A-Z_][A-Z_0-9]*$/, // ALL_CAPS constants
      /^\d+$/, // Numbers only
      /^[a-z]+$/, // Single lowercase words without dots
      /should|describe|it|test|expect/i, // Test-related strings
      /^\w+\s+\w+/, // Multiple words with spaces (likely hardcoded text)
      /^.{0,2}$/, // Very short strings (1-2 chars)
      /[{}\\]/,   // Contains template syntax or backslashes
      /^\$\{/, // Template literals starting with ${
      /Münzen$/, // German hardcoded text
      /^[^.]+\s+[^.]+$/, // Strings with spaces but no dots (likely not translation keys)
      /^\.\.\//, // Relative paths starting with ../
      /\/.*Page$/, // Paths ending with Page (like /pages/AdminDashboardPage)
      /^.*\.[jt]sx?$/, // File extensions
    ];
    
    // Must contain dots for nested structure or be in valid namespaces
    const hasValidStructure = key.includes('.') || this.options.namespaces.includes(key);
    
    // Additional validation: should start with a letter and contain only valid characters
    const validKeyFormat = /^[a-zA-Z][a-zA-Z0-9._]*$/.test(key);
    
    return hasValidStructure && validKeyFormat && !invalidPatterns.some(pattern => pattern.test(key));
  }

  // Recursively find all TypeScript/React files
  findSourceFiles(dir) {
    const files = [];
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
        files.push(...this.findSourceFiles(fullPath));
      } else if (item.match(/\.(ts|tsx|js|jsx)$/)) {
        files.push(fullPath);
      }
    }
    
    return files;
  }

  // Load translation files
  loadTranslations() {
    const translations = {};
    
    try {
      const languages = fs.readdirSync(this.options.localesDir);
      
      for (const lang of languages) {
        const langDir = path.join(this.options.localesDir, lang);
        if (!fs.statSync(langDir).isDirectory()) continue;
        
        translations[lang] = {};
        
        for (const namespace of this.options.namespaces) {
          const filePath = path.join(langDir, `${namespace}.json`);
          
          if (fs.existsSync(filePath)) {
            try {
              const content = fs.readFileSync(filePath, 'utf8');
              translations[lang][namespace] = JSON.parse(content);
            } catch (error) {
              this.errors.push(`Failed to parse ${filePath}: ${error.message}`);
            }
          } else {
            this.warnings.push(`Translation file missing: ${filePath}`);
            translations[lang][namespace] = {};
          }
        }
      }
    } catch (error) {
      this.errors.push(`Failed to read locales directory: ${error.message}`);
    }
    
    return translations;
  }

  // Get nested object value by dot notation path
  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  // Set nested object value by dot notation path
  setNestedValue(obj, path, value) {
    const keys = path.split('.');
    const lastKey = keys.pop();
    const target = keys.reduce((current, key) => {
      if (!current[key] || typeof current[key] !== 'object') {
        current[key] = {};
      }
      return current[key];
    }, obj);
    target[lastKey] = value;
  }

  // Check if a key exists in translations
  keyExists(translations, lang, namespace, keyPath) {
    const nsTranslations = translations[lang] && translations[lang][namespace];
    if (!nsTranslations) return false;
    
    return this.getNestedValue(nsTranslations, keyPath) !== undefined;
  }

  // Add missing key to translation file
  addMissingKey(lang, namespace, keyPath, value = `[MISSING: ${keyPath}]`) {
    const filePath = path.join(this.options.localesDir, lang, `${namespace}.json`);
    
    try {
      let translations = {};
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        translations = JSON.parse(content);
      }
      
      this.setNestedValue(translations, keyPath, value);
      
      fs.writeFileSync(filePath, JSON.stringify(translations, null, 2) + '\n');
      this.log(`Added missing key "${keyPath}" to ${filePath}`, 'info');
    } catch (error) {
      this.errors.push(`Failed to update ${filePath}: ${error.message}`);
    }
  }

  // Main validation logic
  validate() {
    this.log('🔍 Starting translation validation...', 'info');
    
    // Load all translations
    const translations = this.loadTranslations();
    const languages = Object.keys(translations);
    
    if (languages.length === 0) {
      this.errors.push('No translation files found');
      return false;
    }
    
    this.log(`Found languages: ${languages.join(', ')}`, 'info');
    
    // Extract all used keys from source files
    const sourceFiles = this.findSourceFiles(this.options.srcDir);
    const allUsedKeys = new Set();
    
    this.log(`Scanning ${sourceFiles.length} source files...`, 'info');
    
    for (const file of sourceFiles) {
      const fileKeys = this.extractKeysFromFile(file);
      fileKeys.forEach(key => allUsedKeys.add(key));
    }
    
    this.log(`Found ${allUsedKeys.size} unique translation keys in source code`, 'info');
    
    // Validate each key
    const missingKeys = {};
    const inconsistentKeys = [];
    
    for (const keyWithNs of allUsedKeys) {
      let [namespace, keyPath] = keyWithNs.includes(':') 
        ? keyWithNs.split(':', 2)
        : [this.options.defaultNamespace, keyWithNs];
      
      // Check if key exists in all languages
      const keyExistsInLangs = {};
      
      for (const lang of languages) {
        const exists = this.keyExists(translations, lang, namespace, keyPath);
        keyExistsInLangs[lang] = exists;
        
        if (!exists) {
          if (!missingKeys[`${namespace}:${keyPath}`]) {
            missingKeys[`${namespace}:${keyPath}`] = [];
          }
          missingKeys[`${namespace}:${keyPath}`].push(lang);
        }
      }
      
      // Check for inconsistencies (key exists in some languages but not others)
      const existsInSome = Object.values(keyExistsInLangs).some(exists => exists);
      const existsInAll = Object.values(keyExistsInLangs).every(exists => exists);
      
      if (existsInSome && !existsInAll) {
        inconsistentKeys.push({
          key: `${namespace}:${keyPath}`,
          languages: keyExistsInLangs
        });
      }
    }
    
    // Report results
    let hasErrors = false;
    
    if (Object.keys(missingKeys).length > 0) {
      hasErrors = true;
      this.log('\n❌ Missing translation keys:', 'error');
      
      for (const [key, langs] of Object.entries(missingKeys)) {
        const [namespace, keyPath] = key.split(':', 2);
        this.log(`  ${key} (missing in: ${langs.join(', ')})`, 'error');
        
        if (this.options.fixMode) {
          for (const lang of langs) {
            this.addMissingKey(lang, namespace, keyPath);
          }
        }
      }
    }
    
    if (inconsistentKeys.length > 0) {
      this.log('\n⚠️ Inconsistent keys (exist in some languages but not others):', 'warning');
      
      for (const { key, languages } of inconsistentKeys) {
        const existing = Object.entries(languages)
          .filter(([_, exists]) => exists)
          .map(([lang, _]) => lang);
        const missing = Object.entries(languages)
          .filter(([_, exists]) => !exists)
          .map(([lang, _]) => lang);
          
        this.log(`  ${key}`, 'warning');
        this.log(`    ✅ Exists in: ${existing.join(', ')}`, 'warning');
        this.log(`    ❌ Missing in: ${missing.join(', ')}`, 'warning');
      }
    }
    
    // Summary
    this.log('\n📊 Validation Summary:', 'info');
    this.log(`  Total keys used: ${allUsedKeys.size}`, 'info');
    this.log(`  Missing keys: ${Object.keys(missingKeys).length}`, 'info');
    this.log(`  Inconsistent keys: ${inconsistentKeys.length}`, 'info');
    this.log(`  Languages: ${languages.join(', ')}`, 'info');
    
    if (this.options.fixMode && Object.keys(missingKeys).length > 0) {
      this.log(`\n✅ Fixed ${Object.keys(missingKeys).length} missing keys`, 'info');
    }
    
    if (!hasErrors && inconsistentKeys.length === 0) {
      this.log('\n✅ All translation keys are valid!', 'info');
      return true;
    }
    
    if (!hasErrors && inconsistentKeys.length > 0) {
      this.log('\n⚠️ Validation completed with warnings', 'warning');
      return true; // Don't fail CI for warnings
    }
    
    this.log('\n❌ Validation failed', 'error');
    return false;
  }
}

// CLI Interface
function main() {
  const args = process.argv.slice(2);
  const options = {
    fix: args.includes('--fix'),
    verbose: args.includes('--verbose') || args.includes('-v'),
    help: args.includes('--help') || args.includes('-h')
  };
  
  if (options.help) {
    console.log(`
Translation Key Validator

Usage: node validate-translations.js [options]

Options:
  --fix         Automatically add missing translation keys with placeholder values
  --verbose, -v Show detailed output
  --help, -h    Show this help message

Examples:
  node validate-translations.js                    # Validate only
  node validate-translations.js --fix              # Validate and fix missing keys
  node validate-translations.js --verbose          # Show detailed output
`);
    process.exit(0);
  }
  
  const validator = new TranslationValidator(options);
  const isValid = validator.validate();
  
  process.exit(isValid ? 0 : 1);
}

if (require.main === module) {
  main();
}

module.exports = TranslationValidator;