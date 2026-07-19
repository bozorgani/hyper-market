import { Request } from 'express';
import { parseCookies } from './parse-cookies';

describe('parseCookies', () => {
  const createRequest = (cookieHeader?: string): Request => ({ headers: { cookie: cookieHeader } } as Request);

  it('should return empty object when no cookie header', () => {
    expect(parseCookies(createRequest())).toEqual({});
  });

  it('should parse a single cookie', () => {
    expect(parseCookies(createRequest('a=1'))).toEqual({ a: '1' });
  });

  it('should parse multiple cookies', () => {
    expect(parseCookies(createRequest('a=1; b=2'))).toEqual({ a: '1', b: '2' });
  });

  it('should decode URI components', () => {
    expect(parseCookies(createRequest('token=hello%20world'))).toEqual({ token: 'hello world' });
  });
});
