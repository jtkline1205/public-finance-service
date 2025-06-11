import { Pool } from 'pg';

const pool = new Pool({
    host: '',
    port: 5432,
    user: 'postgres',
    password: '',
    database: 'postgres',
});


type Wallet = {
    walletId: number;
    chipOnes: number;
    chipTwoFifties: number;
    chipFives: number;
    chipTwentyFives: number;
    chipHundreds: number;
}

const wallets: Wallet[] = [
    { walletId: 1, chipOnes: 6, chipTwoFifties: 5, chipFives: 3, chipTwentyFives: 2, chipHundreds: 1 },
];

type PartialChipUpdate = Partial<Omit<Wallet, "walletId">>;

export async function updateWallet(walletId: number, updates: PartialChipUpdate): Promise<boolean> {
    const wallet = wallets.find(w => w.walletId === walletId);
    if (!wallet) {
        return false;
    }

    Object.entries(updates).forEach(([key, value]) => {
        if (value !== undefined) {
            (wallet as any)[key] = value;
        }
    });

    return true;
}


// export async function fetchColumn(table: string, column: string, key: string, value: string): Promise<number> {
//     if (table == 'wallets') {
//         return 1;
//     }
//     return 0;
// }


// export const db = {
//     wallets,
// };







export default pool;