export const CHIP_DENOMINATIONS = {
    ONE: 1.0,
    TWO_FIFTY: 2.5,
    FIVE: 5.0,
    TWENTY_FIVE: 25.0,
    HUNDRED: 100.0
} as const;

export const BILL_DENOMINATIONS = {
    ONE: 1.0,
    FIVE: 5.0,
    TEN: 10.0,
    TWENTY: 20.0,
    FIFTY: 50.0,
    HUNDRED: 100.0
} as const;

export const ALL_DENOMINATIONS: Record<string, number> = {
    ZERO: 0.0,
    ...CHIP_DENOMINATIONS,
    ...BILL_DENOMINATIONS
} as const;

export type ChipDenomination = keyof typeof CHIP_DENOMINATIONS;
export type BillDenomination = keyof typeof BILL_DENOMINATIONS;
export type AllDenomination = keyof typeof ALL_DENOMINATIONS;

export const CHIP_DENOMINATION_LIST_DESCENDING = [
    "HUNDRED", "TWENTY_FIVE", "FIVE", "TWO_FIFTY", "ONE"
] as const satisfies readonly ChipDenomination[];

export const BILL_DENOMINATION_LIST_DESCENDING = [
    "HUNDRED", "FIFTY", "TWENTY", "TEN", "FIVE", "ONE"
] as const satisfies readonly BillDenomination[];

export const CHIP_COLUMN_MAP = {
    ONE: 'chip_ones',
    TWO_FIFTY: 'chip_twofifties',
    FIVE: 'chip_fives',
    TWENTY_FIVE: 'chip_twentyfives',
    HUNDRED: 'chip_hundreds'
} as const;

export const DENOMINATION_MAP = {
    '1': 'chip_ones',
    '2.5': 'chip_twofifties',
    '5': 'chip_fives',
    '25': 'chip_twentyfives',
    '100': 'chip_hundreds'
} as const;

export type Denomination = keyof typeof DENOMINATION_MAP;

export interface ChipCounts {
    ONE: number;
    TWO_FIFTY: number;
    FIVE: number;
    TWENTY_FIVE: number;
    HUNDRED: number;
}