export const CHIP_DENOMINATIONS = ['ONE', 'TWO_FIFTY', 'FIVE', 'TWENTY_FIVE', 'HUNDRED'] as const;
export type ChipDenomination = typeof CHIP_DENOMINATIONS[number];

export const BILL_DENOMINATIONS = ['ONE', 'FIVE', 'TEN', 'TWENTY', 'FIFTY', 'HUNDRED'] as const;
export type BillDenomination = typeof BILL_DENOMINATIONS[number];

export type Denomination = ChipDenomination | BillDenomination;

