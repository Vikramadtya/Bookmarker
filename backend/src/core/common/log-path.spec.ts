import { safeLogPath } from './log-path';

describe('safeLogPath', () => {
  it('drops query strings and one-time keys', () => {
    expect(safeLogPath('/api/v1/inbound/save?token=abc')).toBe(
      '/api/v1/inbound/save',
    );
    expect(safeLogPath('/api/v1/organize/connect/SECRET')).toBe(
      '/api/v1/organize/connect/[redacted]',
    );
    expect(safeLogPath('/health')).toBe('/health');
  });
});
