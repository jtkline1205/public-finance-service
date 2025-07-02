import { PoolClient } from 'pg';
import { ItemStack } from '../util/ItemStack';
import { fetchOneColumn, updateOneWalletsColumn, updateOnePlayersColumn, updateOneAtmsColumn, getWallet, getAtm } from '../walletRepository';
import { Denomination, DENOMINATION_MAP } from '../constants/denominations';

export async function processDeposit(client: PoolClient, atmId: string): Promise<boolean> {
    const result = await client.query(
        `SELECT 
      a.entry,
      w.ones, w.fives, w.tens, w.twenties, w.fifties, w.hundreds,
      p.account_balance
     FROM atms a
     JOIN wallets w ON a.atm_id = w.wallet_id
     JOIN players p ON a.atm_id = p.player_id
     WHERE a.atm_id = $1`,
        [atmId]
    );

    if (!result.rows.length) {
        throw new Error(`ATM with ID ${atmId} not found`);
    }

    const {
        entry, ones, fives, tens, twenties, fifties, hundreds, account_balance
    } = result.rows[0];

    const billMap = {
        ONE: parseInt(ones),
        FIVE: parseInt(fives),
        TEN: parseInt(tens),
        TWENTY: parseInt(twenties),
        FIFTY: parseInt(fifties),
        HUNDRED: parseInt(hundreds)
    };

    const billStack = new ItemStack(billMap);
    const entryAmount = parseFloat(entry);

    if (isNaN(entryAmount)) {
        throw new Error("Invalid entry amount");
    }

    const stackToRemove = billStack.findBillCombination(entryAmount);

    if (!stackToRemove) {
        return false;
    }

    const updatedBillStack = billStack.subtract(stackToRemove);
    const newAccountBalance = (parseFloat(account_balance) + entryAmount).toString();

    const updates = [
        client.query(
            `UPDATE wallets SET 
        ones = $2, fives = $3, tens = $4, twenties = $5, fifties = $6, hundreds = $7
       WHERE wallet_id = $1`,
            [
                atmId,
                updatedBillStack.count("ONE"),
                updatedBillStack.count("FIVE"),
                updatedBillStack.count("TEN"),
                updatedBillStack.count("TWENTY"),
                updatedBillStack.count("FIFTY"),
                updatedBillStack.count("HUNDRED")
            ]
        ),

        client.query(
            `UPDATE players SET account_balance = $2 WHERE player_id = $1`,
            [atmId, newAccountBalance]
        ),

        client.query(
            `UPDATE atms SET display_state = 'home' WHERE atm_id = $1`,
            [atmId]
        )
    ];

    await Promise.all(updates);

    return true;
}

export async function processWithdrawal(client: PoolClient, atmId: string) {
    await updateOneAtmsColumn(client, atmId, "display_state", "home");
    let entry = await fetchOneColumn(client, atmId, "entry", "atms", "atm_id");
    let balance = await fetchOneColumn(client, atmId, "account_balance", "players", "player_id");

    if (parseFloat(entry) > 0 && parseFloat(entry) <= parseFloat(balance) + 3) {
        await updateOnePlayersColumn(client, atmId, "account_balance", (parseFloat(balance) - parseFloat(entry) - 3).toString());
        let newStack = ItemStack.generateBillStackFromTotal(parseFloat(entry));
        let ones = await fetchOneColumn(client, atmId, "ones", "wallets", "wallet_id");
        let fives = await fetchOneColumn(client, atmId, "fives", "wallets", "wallet_id");
        let tens = await fetchOneColumn(client, atmId, "tens", "wallets", "wallet_id");
        let twenties = await fetchOneColumn(client, atmId, "twenties", "wallets", "wallet_id");
        let fifties = await fetchOneColumn(client, atmId, "fifties", "wallets", "wallet_id");
        let hundreds = await fetchOneColumn(client, atmId, "hundreds", "wallets", "wallet_id");
        let billMap = { ONE: parseInt(ones), FIVE: parseInt(fives), TEN: parseInt(tens), TWENTY: parseInt(twenties), FIFTY: parseInt(fifties), HUNDRED: parseInt(hundreds) };
        let billStack = new ItemStack(billMap);
        billStack = billStack.add(newStack);
        await updateOneWalletsColumn(client, atmId, "ones", billStack.count("ONE"));
        await updateOneWalletsColumn(client, atmId, "fives", billStack.count("FIVE"));
        await updateOneWalletsColumn(client, atmId, "tens", billStack.count("TEN"));
        await updateOneWalletsColumn(client, atmId, "twenties", billStack.count("TWENTY"));
        await updateOneWalletsColumn(client, atmId, "fifties", billStack.count("FIFTY"));
        await updateOneWalletsColumn(client, atmId, "hundreds", billStack.count("HUNDRED"));

    }

}

export async function addChip(client: PoolClient, walletId: string, denomination: string): Promise<boolean> {
    let newValue = await fetchOneColumn(client, walletId, DENOMINATION_MAP[denomination as Denomination], "wallets", "wallet_id");
    newValue = newValue + 1;
    await updateOneWalletsColumn(client, walletId, DENOMINATION_MAP[denomination as Denomination], newValue);
    return true;
}

export async function addChipStack(client: PoolClient, walletId: string, chipStack: ItemStack): Promise<any> {
    const result = await client.query(
        `SELECT 
      w.chip_ones, w.chip_twofifties, w.chip_fives, w.chip_twentyfives, w.chip_hundreds
     FROM wallets w 
     WHERE w.wallet_id = $1`,
        [walletId]
    );

    if (!result.rows.length) {
        throw new Error(`Wallet with ID ${walletId} not found`);
    }

    const {
        chip_ones, chip_twofifties, chip_fives, chip_twentyfives, chip_hundreds
    } = result.rows[0];

    const chipMap = {
        ONE: parseInt(chip_ones),
        TWO_FIFTY: parseInt(chip_twofifties),
        FIVE: parseInt(chip_fives),
        TWENTY_FIVE: parseInt(chip_twentyfives),
        HUNDRED: parseInt(chip_hundreds)
    };

    const originalChipStack = new ItemStack(chipMap);

    if (!chipStack) {
        return false;
    }

    const updatedChipStack = originalChipStack.add(chipStack);

    const updates = [
        client.query(
            `UPDATE wallets SET 
        chip_ones = $2, chip_twofifties = $3, chip_fives = $4, chip_twentyfives = $5, chip_hundreds = $6
       WHERE wallet_id = $1`,
            [
                walletId,
                updatedChipStack.count("ONE"),
                updatedChipStack.count("TWO_FIFTY"),
                updatedChipStack.count("FIVE"),
                updatedChipStack.count("TWENTY_FIVE"),
                updatedChipStack.count("HUNDRED")
            ]
        ),
    ];

    await Promise.all(updates);

    return true;
}

export async function removeChip(client: PoolClient, walletId: string, denomination: string): Promise<boolean> {
    type Denomination = '1' | '2.5' | '5' | '25' | '100';

    const denominationMap: Record<Denomination, string> = {
        '1': 'chip_ones',
        '2.5': 'chip_twofifties',
        '5': 'chip_fives',
        '25': 'chip_twentyfives',
        '100': 'chip_hundreds',
    };


    let newValue = parseInt(await fetchOneColumn(client, walletId, denominationMap[denomination as Denomination], "wallets", "wallet_id"));
    newValue = newValue - 1;
    if (newValue < 0) {
        return false;
    } else {
        await updateOneWalletsColumn(client, walletId, denominationMap[denomination as Denomination], newValue);
        return true;
    }

}

export async function fetchWallet(client: PoolClient, walletId: string) {
    const wallet = await getWallet(client, walletId);
    return wallet;
}

export async function fetchAtm(client: PoolClient, atmId: string) {
    const atm = await getAtm(client, atmId);
    return atm;
}
