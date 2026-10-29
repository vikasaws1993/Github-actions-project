import { detectInputLanguage } from '../languageDetector';

describe('LanguageDetector Utility', () => {
  describe('1. Pure Marathi Devanagari', () => {
    it('should detect Marathi Devanagari sentence', () => {
      const result = detectInputLanguage('माझ्या वडिलांना छातीत दुखत आहे');
      expect(result.inputLanguage).toBe('mr');
      expect(result.inputScript).toBe('Devanagari');
      expect(result.confidence).toBeGreaterThanOrEqual(0.7);
    });

    it('should detect Marathi text with special Marathi character ळ', () => {
      const result = detectInputLanguage('रुग्णाला तात्काळ केईएम रुग्णालयात दाखल केले');
      expect(result.inputLanguage).toBe('mr');
      expect(result.inputScript).toBe('Devanagari');
      expect(result.confidence).toBeGreaterThanOrEqual(0.7);
    });
  });

  describe('2. Pure Hindi Devanagari', () => {
    it('should detect Hindi Devanagari sentence', () => {
      const result = detectInputLanguage('मेरे पिता को सीने में दर्द है');
      expect(result.inputLanguage).toBe('hi');
      expect(result.inputScript).toBe('Devanagari');
      expect(result.confidence).toBeGreaterThanOrEqual(0.7);
    });

    it('should detect Hindi complaint text', () => {
      const result = detectInputLanguage('मरीज को सांस लेने में बहुत तकलीफ हो रही है और इलाज चाहिए');
      expect(result.inputLanguage).toBe('hi');
      expect(result.inputScript).toBe('Devanagari');
      expect(result.confidence).toBeGreaterThanOrEqual(0.7);
    });
  });

  describe('3. Pure English Latin', () => {
    it('should detect English sentence', () => {
      const result = detectInputLanguage('My father has chest pain');
      expect(result.inputLanguage).toBe('en');
      expect(result.inputScript).toBe('Latin');
      expect(result.confidence).toBeGreaterThanOrEqual(0.7);
    });

    it('should detect English clinical narrative', () => {
      const result = detectInputLanguage('Patient is suffering from acute cardiac failure since 3 days');
      expect(result.inputLanguage).toBe('en');
      expect(result.inputScript).toBe('Latin');
      expect(result.confidence).toBeGreaterThanOrEqual(0.7);
    });
  });

  describe('4. Romanized Regional Languages', () => {
    it('should detect Romanized Marathi with Latin script', () => {
      const result = detectInputLanguage('majhya vadilanna chest pain aahe');
      expect(result.inputLanguage).toBe('mr');
      expect(result.inputScript).toBe('Latin');
      expect(result.confidence).toBeGreaterThanOrEqual(0.7);
    });

    it('should detect Romanized Hindi with Latin script', () => {
      const result = detectInputLanguage('mere pita ko seene me dard hai');
      expect(result.inputLanguage).toBe('hi');
      expect(result.inputScript).toBe('Latin');
      expect(result.confidence).toBeGreaterThanOrEqual(0.7);
    });
  });

  describe('5. Dual-Script Mixed Text', () => {
    it('should detect Marathi + English mixed text', () => {
      const result = detectInputLanguage('माझ्या वडिलांना chest pain आहे');
      expect(result.inputLanguage).toBe('mixed');
      expect(result.inputScript).toBe('Mixed');
      expect(result.confidence).toBeGreaterThanOrEqual(0.85);
    });

    it('should detect Hindi + English mixed text', () => {
      const result = detectInputLanguage('मरीज को severe chest pain है और hospital admission चाहिए');
      expect(result.inputLanguage).toBe('mixed');
      expect(result.inputScript).toBe('Mixed');
      expect(result.confidence).toBeGreaterThanOrEqual(0.85);
    });

    it('should detect Marathi + Hindi mixed Devanagari text', () => {
      const result = detectInputLanguage('वडिलांना तीव्र त्रास आहे आणि हम बहुत परेशान हैं');
      expect(result.inputLanguage).toBe('mixed');
      expect(result.inputScript).toBe('Devanagari');
      expect(result.confidence).toBeGreaterThanOrEqual(0.8);
    });
  });

  describe('6. Short / Ambiguous Text & Acronyms', () => {
    it('should categorize short acronyms as unknown without false confidence', () => {
      const result = detectInputLanguage('BP');
      expect(result.inputLanguage).toBe('unknown');
      expect(result.inputScript).toBe('Latin');
      expect(result.confidence).toBeLessThan(0.5);
    });

    it('should categorize single word names/cities as unknown', () => {
      const result = detectInputLanguage('Pune');
      expect(result.inputLanguage).toBe('unknown');
      expect(result.inputScript).toBe('Latin');
      expect(result.confidence).toBeLessThan(0.5);
    });

    it('should categorize short acronym ABC as unknown', () => {
      const result = detectInputLanguage('ABC');
      expect(result.inputLanguage).toBe('unknown');
      expect(result.inputScript).toBe('Latin');
      expect(result.confidence).toBeLessThan(0.5);
    });
  });

  describe('7. Numbers, Symbols, and Empty Inputs', () => {
    it('should handle numeric inputs safely', () => {
      const result = detectInputLanguage('123456');
      expect(result.inputLanguage).toBe('unknown');
      expect(result.inputScript).toBe('Unknown');
      expect(result.confidence).toBe(0);
    });

    it('should handle currency and symbols safely', () => {
      const result = detectInputLanguage('₹5,00,000 / @#$%');
      expect(result.inputLanguage).toBe('unknown');
      expect(result.inputScript).toBe('Unknown');
      expect(result.confidence).toBe(0);
    });

    it('should handle empty or whitespace string', () => {
      const result = detectInputLanguage('   ');
      expect(result.inputLanguage).toBe('unknown');
      expect(result.inputScript).toBe('Unknown');
      expect(result.confidence).toBe(0);
    });

    it('should handle null/undefined safely', () => {
      const result = detectInputLanguage(null as any);
      expect(result.inputLanguage).toBe('unknown');
      expect(result.inputScript).toBe('Unknown');
      expect(result.confidence).toBe(0);
    });
  });
});
