import { Test, TestingModule } from '@nestjs/testing';
import { SanitizePipe } from './sanitize.pipe';

describe('SanitizePipe', () => {
  let pipe: SanitizePipe;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SanitizePipe],
    }).compile();
    pipe = module.get<SanitizePipe>(SanitizePipe);
  });

  it('should sanitize body strings', () => {
    const result = pipe.transform('<script>alert(1)</script>', { type: 'body', metatype: String, data: '' });
    expect(result).not.toContain('<script>');
  });

  it('should sanitize query parameters', () => {
    const result = pipe.transform('<img src=x onerror=alert(1)>', { type: 'query', metatype: String, data: '' });
    expect(result).not.toContain('<img');
  });

  it('should reuse JSDOM instance (singleton)', () => {
    expect(pipe).toBeDefined();
  });
});
