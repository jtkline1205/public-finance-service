import { Pool, PoolClient } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

export const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432', 10),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

interface Atm {
  atm_id: number;
  display_state: string;
  entry: string;
}

interface Wallet {
  wallet_id: number;
  debit_card: boolean;
  ones: number;
  fives: number;
  tens: number;
  twenties: number;
  fifties: number;
  hundreds: number;
  players_club: boolean;
  chip_ones: number;
  chip_twofifties: number;
  chip_fives: number;
  chip_twentyfives: number;
  chip_hundreds: number;
}

export async function fetchOneColumn(client: PoolClient, rowId: string, columnName: string, tableName: string, whereColumn: string): Promise<string> {
  const query = `
    SELECT ${columnName}
    FROM ${tableName}
    WHERE ${whereColumn} = $1
  `;
  const result = await client.query(query, [rowId]);
  return result.rows.length > 0 ? result.rows[0][columnName] : '0';
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

export async function getWallet(client: PoolClient, walletId: string): Promise<Wallet | null> {
  const query = `
    SELECT 
      wallet_id,
      debit_card,
      ones,
      fives,
      tens,
      twenties,
      fifties,
      hundreds,
      players_club,
      chip_ones,
      chip_twofifties,
      chip_fives,
      chip_twentyfives,
      chip_hundreds
    FROM wallets
    WHERE wallet_id = $1
  `;

  try {
    const result = await client.query<Wallet>(query, [walletId]);

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  } catch (error) {
    console.error('Error fetching wallet:', error);
    throw error;
  }
}

export async function getAtm(client: PoolClient, atmId: string): Promise<Atm | null> {
  const query = `
    SELECT 
      atm_id,
      display_state,
      entry
    FROM atms
    WHERE atm_id = $1
  `;

  try {
    const result = await client.query<Atm>(query, [atmId]);

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  } catch (error) {
    console.error('Error fetching atm:', error);
    throw error;
  }
}

export interface ExchangeMapping {
  givenType: string;
  givenQuantity: number;
  receivedType: string;
  receivedQuantity: number;
}

type ExchangeType = 'bills-to-chips' | 'chips-to-bills' | 'chip-exchange' | 'break-bills';

function getExchangeMapping(
  type: ExchangeType,
  denomination: number,
  secondDenomination?: number
): ExchangeMapping {

  const denominationMap: Record<number, { bill: string; chip: string; chipRatio: number }> = {
    1: { bill: "ones", chip: "chip_ones", chipRatio: 1 },
    5: { bill: "fives", chip: "chip_fives", chipRatio: 1 },
    10: { bill: "tens", chip: "chip_fives", chipRatio: 2 },
    20: { bill: "twenties", chip: "chip_fives", chipRatio: 4 },
    25: { bill: "fifties", chip: "chip_twentyfives", chipRatio: 2 },
    50: { bill: "fifties", chip: "chip_twentyfives", chipRatio: 2 },
    100: { bill: "hundreds", chip: "chip_hundreds", chipRatio: 1 }
  };

  const validDenom = denominationMap[denomination] ? denomination : 1;
  const mapping = denominationMap[validDenom];

  switch (type) {
    case 'bills-to-chips':
      return {
        givenType: mapping.bill,
        givenQuantity: 1,
        receivedType: mapping.chip,
        receivedQuantity: mapping.chipRatio
      };

    case 'chips-to-bills':
      return {
        givenType: mapping.chip,
        givenQuantity: mapping.chipRatio,
        receivedType: mapping.bill,
        receivedQuantity: 1
      };

    case 'chip-exchange': {
      const chipExchanges: Record<string, ExchangeMapping> = {
        '1_5': { givenType: "chip_ones", givenQuantity: 5, receivedType: "chip_fives", receivedQuantity: 1 },
        '5_1': { givenType: "chip_fives", givenQuantity: 1, receivedType: "chip_ones", receivedQuantity: 5 },
        '5_25': { givenType: "chip_fives", givenQuantity: 5, receivedType: "chip_twentyfives", receivedQuantity: 1 },
        '25_5': { givenType: "chip_twentyfives", givenQuantity: 1, receivedType: "chip_fives", receivedQuantity: 5 },
        '25_100': { givenType: "chip_twentyfives", givenQuantity: 4, receivedType: "chip_hundreds", receivedQuantity: 1 },
        '100_25': { givenType: "chip_hundreds", givenQuantity: 1, receivedType: "chip_twentyfives", receivedQuantity: 4 }
      };
      const key = `${denomination}_${secondDenomination}`;
      return chipExchanges[key];
    }

    case 'break-bills': {
      const billBreaks: Record<number, ExchangeMapping> = {
        5: { givenType: 'fives', givenQuantity: 1, receivedType: 'ones', receivedQuantity: 5 },
        10: { givenType: 'tens', givenQuantity: 1, receivedType: 'fives', receivedQuantity: 2 },
        20: { givenType: 'twenties', givenQuantity: 1, receivedType: 'tens', receivedQuantity: 2 },
        50: { givenType: 'fifties', givenQuantity: 1, receivedType: 'tens', receivedQuantity: 5 },
        100: { givenType: 'hundreds', givenQuantity: 1, receivedType: 'twenties', receivedQuantity: 5 }
      };
      return billBreaks[denomination];
    }

    default:
      throw new Error(`Unknown exchange type: ${type}`);
  }
}

export function getDenominationMapping(denomination: number, type: 'bills' | 'chips'): ExchangeMapping {
  return getExchangeMapping(
    type === 'bills' ? 'bills-to-chips' : 'chips-to-bills',
    denomination
  );
}

export function getChipExchangeMapping(givenDenomination: number, receivedDenomination: number): ExchangeMapping {
  return getExchangeMapping('chip-exchange', givenDenomination, receivedDenomination);
}

export function getBreakBillMapping(denomination: number): ExchangeMapping {
  return getExchangeMapping('break-bills', denomination);
}

