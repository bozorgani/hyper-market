import { createHash } from 'crypto';
import { Injectable } from '@nestjs/common';

@Injectable()
export class TokenHashService {
  hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
