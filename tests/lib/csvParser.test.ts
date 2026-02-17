
import { describe, it, expect } from 'vitest';
import { parseCsv } from '../../src/lib/csvParser';

describe('parseCsv', () => {
  it('should parse a basic valid CSV string', async () => {
    const csv = `name,age,city
Alice,30,New York
Bob,25,Los Angeles`;
    const { data, errors } = await parseCsv(csv);
    expect(data).toEqual([
      { name: 'Alice', age: '30', city: 'New York' },
      { name: 'Bob', age: '25', city: 'Los Angeles' },
    ]);
    expect(errors).toHaveLength(0);
  });

  it('should handle empty lines', async () => {
    const csv = `name,age

Charlie,35

David,40`;
    const { data, errors } = await parseCsv(csv);
    expect(data).toHaveLength(2);
    expect(data[0].name).toBe('Charlie');
    expect(errors).toHaveLength(0);
  });

  it('should report an error for inconsistent column counts', async () => {
    const csv = `id,value
1,100
2,200,extra
3,300`;
    const { data, errors } = await parseCsv(csv);
    expect(data).toHaveLength(3);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toEqual({
      code: 'MismatchedColumnCount',
      message: 'Expected 2 columns, but found 3',
      row: 2,
    });
  });

  it('should return empty data for an empty string', async () => {
    const csv = '';
    const { data, errors } = await parseCsv(csv);
    expect(data).toHaveLength(0);
    expect(errors).toHaveLength(0);
  });

  it('should return empty data for a header-only CSV', async () => {
    const csv = 'name,age,city';
    const { data, errors } = await parseCsv(csv);
    expect(data).toHaveLength(0);
    expect(errors).toHaveLength(0);
  });
});
