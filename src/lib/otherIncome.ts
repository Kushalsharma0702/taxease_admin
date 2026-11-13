// Q15 "Other income without T-slips": what to print for an amount. The app saves the description and the amount
// as two separate answers; an older draft has only the description (amount written inside it), for which the
// adapter gives amount = null so we never show a misleading $0.00.
export function otherIncomeAmountText(amount: number | null | undefined, money: (n: number) => string): string {
  return amount === null || amount === undefined ? 'See description' : money(amount);
}
