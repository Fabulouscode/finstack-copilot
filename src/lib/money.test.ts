import { describe, expect, it } from 'vitest';
import { formatMoney, parseAmount } from './money';

describe('formatMoney', () => {
  it('formats minor units exactly', () => {
    expect(formatMoney(150_050, 'NGN')).toBe('₦1,500.50');
    expect(formatMoney(5, 'USD')).toBe('$0.05');
    expect(formatMoney(0, 'USD')).toBe('$0.00');
    expect(formatMoney(-2_500, 'USD')).toBe('-$25.00');
    expect(formatMoney(500, 'JPY')).toBe('¥500');
    expect(formatMoney(123_456_789_012, 'NGN')).toBe('₦1,234,567,890.12');
  });
});

describe('parseAmount', () => {
  it('turns what a person typed into exact minor units', () => {
    expect(parseAmount('1,500.50', 'NGN')).toBe(150_050);
    expect(parseAmount('25', 'USD')).toBe(2_500);
    expect(parseAmount(' 0.05 ', 'USD')).toBe(5);
    expect(parseAmount('2.500', 'USD')).toBe(250);
    expect(parseAmount('500', 'JPY')).toBe(500);
  });

  it('refuses anything it would have to guess or round', () => {
    for (const bad of ['', '0', '-5', '10.005', 'abc', '1e3', '12.5.0']) {
      expect(parseAmount(bad, 'USD')).toBeNull();
    }
    expect(parseAmount('1.5', 'JPY')).toBeNull();
  });
});
