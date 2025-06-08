import { Router, Request, Response } from 'express';
import pool from '../db';

const router = Router();

export async function fetchOneColumn(walletId: string, columnName: string): Promise<number> {
    const query = `
    SELECT ${columnName}
    FROM wallets
    WHERE wallet_id = $1
  `;

    const client = await pool.connect();

    try {
        const result = await client.query(query, [walletId]);
        if (result.rows.length > 0) {
            return result.rows[0][columnName];
        }
        return 0;
    } finally {
        client.release();
    }
}

export async function updateOneColumn(walletId: string, columnName: string, newValue: number): Promise<boolean> {
    const query = `
    UPDATE wallets
    SET ${columnName} = ${newValue}
    WHERE wallet_id = $1
  `;

    const client = await pool.connect();

    try {
        const result = await client.query(query, [walletId]);
        if (result) {
            return true;
        }
        return false;
    } finally {
        client.release();
    }
}


router.post('/exchange/bills', async (req: Request, res: Response): Promise<any> => {
    console.log('Received request for /exchange/bills:', req.body);


    const { walletId, denomination } = req.body;
    if (!walletId) return res.status(400).send('Missing walletId');

    try {
        const client = await pool.connect();
        await client.query('BEGIN');

        let receivedChipType = "chip_ones"
        let receivedChipQuantity = 1
        let givenBillType = "ones"
        if (denomination == 5) {
            receivedChipType = "chip_fives"
            receivedChipQuantity = 1
            givenBillType = "fives"
        }
        if (denomination == 10) {
            receivedChipType = "chip_fives"
            receivedChipQuantity = 2
            givenBillType = "tens"
        }
        if (denomination == 20) {
            receivedChipType = "chip_fives"
            receivedChipQuantity = 4
            givenBillType = "twenties"
        }
        if (denomination == 50) {
            receivedChipType = "chip_twentyfives"
            receivedChipQuantity = 2
            givenBillType = "fifties"
        }
        if (denomination == 100) {
            receivedChipType = "chip_hundreds"
            receivedChipQuantity = 1
            givenBillType = "hundreds"
        }

        let givenBillData = await fetchOneColumn(walletId, givenBillType)

        if (givenBillData >= 1) {
            let receivedChipData = await fetchOneColumn(walletId, receivedChipType);
            if (receivedChipData != null) {
                let newReceivedChipQuantity = receivedChipData + receivedChipQuantity;
                updateOneColumn(walletId, receivedChipType, newReceivedChipQuantity);
                let newGivenBillQuantity = givenBillData - 1
                updateOneColumn(walletId, givenBillType, newGivenBillQuantity);
                return true;
            } else {
                return false;
            }
        }

        if (givenBillData >= 1) {
            let receivedChipData = await fetchOneColumn(walletId, receivedChipType);
            if (receivedChipData != null) {
                let newReceivedChipQuantity = receivedChipData + receivedChipQuantity;
                await updateOneColumn(walletId, receivedChipType, newReceivedChipQuantity);
                let newGivenBillQuantity = givenBillData - 1;
                await updateOneColumn(walletId, givenBillType, newGivenBillQuantity);
                await client.query('COMMIT');
                return res.json({ success: true });
            } else {
                await client.query('ROLLBACK');
                return res.status(400).json({ success: false, reason: 'Missing chip column' });
            }
        } else {
            await client.query('ROLLBACK');
            return res.status(400).json({ success: false, reason: 'Insufficient bills' });
        }



    } catch (err) {
        console.error('Exchange error:', err);
        res.status(500).send('Something went wrong');
    }
});

export default router;
