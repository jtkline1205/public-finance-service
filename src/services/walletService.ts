import { PoolClient } from 'pg';
import { ItemStack } from '../ItemStack';


export async function fetchOneWalletsColumn(client: PoolClient, walletId: string, columnName: string): Promise<number> {
    const query = `
    SELECT ${columnName}
    FROM wallets
    WHERE wallet_id = $1
  `;
    const result = await client.query(query, [walletId]);
    return result.rows.length > 0 ? result.rows[0][columnName] : 0;
}

export async function fetchOneAtmsColumn(client: PoolClient, atmId: string, columnName: string): Promise<any> {
    const query = `
    SELECT ${columnName}
    FROM atms
    WHERE atm_id = $1
  `;
    const result = await client.query(query, [atmId]);
    return result.rows.length > 0 ? result.rows[0][columnName] : 0;
}

export async function fetchOnePlayersColumn(client: PoolClient, playerId: string, columnName: string): Promise<any> {
    const query = `
    SELECT ${columnName}
    FROM players
    WHERE player_id = $1
  `;
    const result = await client.query(query, [playerId]);
    return result.rows.length > 0 ? result.rows[0][columnName] : 0;
}

export async function updateOneWalletsColumn(client: PoolClient, walletId: string, columnName: string, newValue: any): Promise<boolean> {
    const query = `
    UPDATE wallets
    SET ${columnName} = $2
    WHERE wallet_id = $1
  `;

    const result = await client.query(query, [walletId, newValue]);
    return true;
}

export async function updateOneAtmsColumn(client: PoolClient, atmId: string, columnName: string, newValue: string): Promise<boolean> {
    const query = `
    UPDATE atms
    SET ${columnName} = $2
    WHERE atm_id = $1
  `;

    const result = await client.query(query, [atmId, newValue]);
    return true;
}

export async function updateOnePlayersColumn(client: PoolClient, playerId: string, columnName: string, newValue: string): Promise<boolean> {
    const query = `
    UPDATE players
    SET ${columnName} = $2
    WHERE player_id = $1
  `;

    const result = await client.query(query, [playerId, newValue]);
    return true;
}

export async function processDeposit(client: PoolClient, atmId: string) {
    let entry = await fetchOneAtmsColumn(client, atmId, "entry");
    let ones = await fetchOneWalletsColumn(client, atmId, "ones");
    let fives = await fetchOneWalletsColumn(client, atmId, "fives");
    let tens = await fetchOneWalletsColumn(client, atmId, "tens");
    let twenties = await fetchOneWalletsColumn(client, atmId, "twenties");
    let fifties = await fetchOneWalletsColumn(client, atmId, "fifties");
    let hundreds = await fetchOneWalletsColumn(client, atmId, "hundreds");
    let billMap = { ONE: ones, FIVE: fives, TEN: tens, TWENTY: twenties, FIFTY: fifties, HUNDRED: hundreds };
    let billStack = new ItemStack(billMap);
    let stackToRemove = billStack.findBillCombination(parseFloat(entry));
    if (stackToRemove != null) {
        billStack = billStack.subtract(stackToRemove);
        let accountBalance = await fetchOnePlayersColumn(client, atmId, "account_balance");
        if (isNaN(parseFloat(entry))) {
            throw new Error("Invalid entry amount");
        }
        let newAccountBalance: string = (parseFloat(accountBalance) + parseFloat(entry)).toString();
        await updateOneWalletsColumn(client, atmId, "ones", billStack.count("ONE"));
        await updateOneWalletsColumn(client, atmId, "fives", billStack.count("FIVE"));
        await updateOneWalletsColumn(client, atmId, "tens", billStack.count("TEN"));
        await updateOneWalletsColumn(client, atmId, "twenties", billStack.count("TWENTY"));
        await updateOneWalletsColumn(client, atmId, "fifties", billStack.count("FIFTY"));
        await updateOneWalletsColumn(client, atmId, "hundreds", billStack.count("HUNDRED"));
        await updateOnePlayersColumn(client, atmId, "account_balance", newAccountBalance);
        await updateOneAtmsColumn(client, atmId, "display_state", "home");
    }
}

export async function processWithdrawal(client: PoolClient, atmId: string) {
    await updateOneAtmsColumn(client, atmId, "display_state", "home");
    let entry = await fetchOneAtmsColumn(client, atmId, "entry");
    let balance = await fetchOnePlayersColumn(client, atmId, "account_balance");

    if (parseFloat(entry) > 0 && parseFloat(entry) <= parseFloat(balance) + 3) {
        await updateOnePlayersColumn(client, atmId, "account_balance", (parseFloat(balance) - parseFloat(entry) - 3).toString());
        let newStack = ItemStack.generateBillStackFromTotal(entry);
        let ones = await fetchOneWalletsColumn(client, atmId, "ones");
        let fives = await fetchOneWalletsColumn(client, atmId, "fives");
        let tens = await fetchOneWalletsColumn(client, atmId, "tens");
        let twenties = await fetchOneWalletsColumn(client, atmId, "twenties");
        let fifties = await fetchOneWalletsColumn(client, atmId, "fifties");
        let hundreds = await fetchOneWalletsColumn(client, atmId, "hundreds");
        let billMap = { ONE: ones, FIVE: fives, TEN: tens, TWENTY: twenties, FIFTY: fifties, HUNDRED: hundreds };
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
    type Denomination = '1' | '2.5' | '5' | '25' | '100';

    const denominationMap: Record<Denomination, string> = {
        '1': 'chip_ones',
        '2.5': 'chip_twofifties',
        '5': 'chip_fives',
        '25': 'chip_twentyfives',
        '100': 'chip_hundreds',
    };


    let newValue = await fetchOneWalletsColumn(client, walletId, denominationMap[denomination as Denomination]);
    newValue = newValue + 1;
    await updateOneWalletsColumn(client, walletId, denominationMap[denomination as Denomination], newValue);
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


    let newValue = await fetchOneWalletsColumn(client, walletId, denominationMap[denomination as Denomination]);
    newValue = newValue - 1;
    await updateOneWalletsColumn(client, walletId, denominationMap[denomination as Denomination], newValue);
    return true;
}







