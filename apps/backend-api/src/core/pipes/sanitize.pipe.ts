import {
  PipeTransform,
  Injectable,
  Scope,
  ArgumentMetadata,
  Logger,
} from '@nestjs/common';
import createDOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

/**
 * SanitizePipe - Global input sanitization pipe for XSS prevention
 * 
 * This pipe automatically sanitizes all string inputs in DTOs to prevent
 * Cross-Site Scripting (XSS) attacks by removing:
 * - HTML tags
 * - JavaScript protocols
 * - Event handlers
 * - Suspicious patterns
 * 
 * Security features:
 * - DOMPurify for robust HTML sanitization
 * - Configurable skip list for sensitive fields (passwords, tokens)
 * - Recursive object sanitization
 * - Array sanitization
 * - Pattern-based attack detection
 * 
 * Usage: Applied globally in main.ts after ValidationPipe
 */
const sharedWindow = new JSDOM('').window;

@Injectable({ scope: Scope.DEFAULT })
export class SanitizePipe implements PipeTransform {
  private readonly logger = new Logger(SanitizePipe.name);
  private readonly purify: ReturnType<typeof createDOMPurify>;
  
  // Fields that should NOT be sanitized (passwords, tokens, secrets)
  private readonly skipFields = new Set([
    'password',
    'passwordHash',
    'passwordConfirmation',
    'confirmPassword',
    'token',
    'refreshToken',
    'accessToken',
    'secret',
    'csrfToken',
    'otp',
    'code', // OTP codes
  ]);

  constructor() {
    // Initialize DOMPurify with reused JSDOM instance
    this.purify = createDOMPurify(sharedWindow);
  }

  transform(value: unknown, metadata: ArgumentMetadata): unknown {
    if (metadata.type === 'body' || metadata.type === 'query') {
      if (typeof value === 'string') {
        return this.sanitizeString(value);
      }
      if (typeof value === 'object' && value !== null) {
        return this.sanitizeObject(value);
      }
    }
    return value;
  }

  /**
   * Sanitizes a single string value
   */
  private sanitizeString(value: string): string {
    if (!value || typeof value !== 'string') {
      return value;
    }

    // Step 1: Use DOMPurify to remove HTML tags and attributes
    let sanitized = this.purify.sanitize(value, {
      ALLOWED_TAGS: [], // No HTML tags allowed
      ALLOWED_ATTR: [], // No attributes allowed
      ALLOW_DATA_ATTR: false,
      ALLOW_ARIA_ATTR: false,
    });
    
    // Step 2: Remove dangerous protocols
    sanitized = sanitized
      .replace(/javascript:/gi, '')
      .replace(/vbscript:/gi, '')
      .replace(/data:/gi, '')
      .replace(/file:/gi, '');
    
    // Step 3: Remove event handlers
    sanitized = sanitized
      .replace(/on\w+\s*=/gi, '') // onclick=, onload=, etc.
      .replace(/on\w+\s*\(/gi, ''); // onclick(, onload(, etc.
    
    // Step 4: Remove script tags (in case DOMPurify missed anything)
    sanitized = sanitized
      .replace(/<script.*?>.*?<\/script>/gi, '')
      .replace(/<script.*?>/gi, '')
      .replace(/<\/script>/gi, '');
    
    // Step 5: Remove other dangerous tags
    sanitized = sanitized
      .replace(/<iframe.*?>.*?<\/iframe>/gi, '')
      .replace(/<object.*?>.*?<\/object>/gi, '')
      .replace(/<embed.*?>/gi, '')
      .replace(/<form.*?>.*?<\/form>/gi, '');
    
    // Step 6: Remove HTML comments
    sanitized = sanitized.replace(/<!--.*?-->/g, '');
    
    // Step 7: Trim whitespace
    sanitized = sanitized.trim();
    
    return sanitized;
  }

  /**
   * Recursively sanitizes all string values in an object
   */
  private sanitizeObject(obj: unknown): unknown {
    if (obj === null || obj === undefined) {
      return obj;
    }

    // Handle arrays
    if (Array.isArray(obj)) {
      return obj.map((item) => this.transform(item, { type: 'body' }));
    }

    // Handle objects
    if (typeof obj === 'object' && obj !== null) {
      const sanitized: Record<string, unknown> = {};
      const recordObj = obj as Record<string, unknown>;

      for (const key in recordObj) {
        if (Object.prototype.hasOwnProperty.call(recordObj, key)) {
          const value = recordObj[key];
          
          // Skip sanitization for sensitive fields
          if (this.skipFields.has(key)) {
            sanitized[key] = value;
            continue;
          }
          
          // Recursively sanitize nested values
          if (typeof value === 'string') {
            sanitized[key] = this.sanitizeString(value);
          } else if (typeof value === 'object' && value !== null) {
            sanitized[key] = this.sanitizeObject(value);
          } else {
            // Keep non-string, non-object values as-is (numbers, booleans, etc.)
            sanitized[key] = value;
          }
        }
      }
      
      return sanitized;
    }
    
    return obj;
  }
}
