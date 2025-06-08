import { Router, Request, Response } from 'express';
import pool from '../db';

const router = Router();

export async function fetchOneWalletsColumn(walletId: string, columnName: string): Promise<number> {
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

export async function updateOneWalletsColumn(walletId: string, columnName: string, newValue: number): Promise<boolean> {
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

        console.log('receivedChipType:', receivedChipType);
        console.log('receivedChipQuantity:', receivedChipQuantity);
        console.log('givenBillType:', givenBillType);

        let givenBillData = await fetchOneWalletsColumn(walletId, givenBillType);

        console.log('givenBillData:', givenBillData);

        if (givenBillData >= 1) {
            let receivedChipData = await fetchOneWalletsColumn(walletId, receivedChipType);
            console.log('receivedChipData:', receivedChipData);
            if (receivedChipData != null) {
                let newReceivedChipQuantity = receivedChipData + receivedChipQuantity;
                console.log('newReceivedChipQuantity:', newReceivedChipQuantity);
                await updateOneWalletsColumn(walletId, receivedChipType, newReceivedChipQuantity);
                let newGivenBillQuantity = givenBillData - 1;
                console.log('newGivenBillQuantity:', newGivenBillQuantity);
                await updateOneWalletsColumn(walletId, givenBillType, newGivenBillQuantity);
                console.log('before COMMIT');
                await client.query('COMMIT');
                return res.json({ success: true });
            } else {
                console.log('before ROLLBACK 1');
                await client.query('ROLLBACK');
                return res.status(400).json({ success: false, reason: 'Missing chip column' });
            }
        } else {
            console.log('before ROLLBACK 2');
            await client.query('ROLLBACK');
            return res.status(400).json({ success: false, reason: 'Insufficient bills' });
        }

    } catch (err) {
        console.error('Exchange bills error:', err);
        res.status(500).send('Something went wrong');
    }
});

router.post('/exchange/chips', async (req: Request, res: Response): Promise<any> => {
    console.log('Received request for /exchange/chips:', req.body);

    const { walletId, denomination } = req.body;
    if (!walletId) return res.status(400).send('Missing walletId');

    try {
        const client = await pool.connect();
        await client.query('BEGIN');

        let receivedBillType = "ones"
        let givenChipQuantity = 1
        let givenChipType = "chip_ones"
        if (denomination == 5) {
            receivedBillType = "fives"
            givenChipQuantity = 1
            givenChipType = "chip_fives"
        }
        if (denomination == 10) {
            receivedBillType = "tens"
            givenChipQuantity = 2
            givenChipType = "chip_fives"
        }
        if (denomination == 20) {
            receivedBillType = "twenties"
            givenChipQuantity = 4
            givenChipType = "chip_fives"
        }
        if (denomination == 50) {
            receivedBillType = "fifties"
            givenChipQuantity = 2
            givenChipType = "chip_twentyfives"
        }
        if (denomination == 100) {
            receivedBillType = "hundreds"
            givenChipQuantity = 1
            givenChipType = "chip_hundreds"
        }

        let givenChipData = await fetchOneWalletsColumn(walletId, givenChipType);

        if (givenChipData >= givenChipQuantity) {
            let receivedBillData = await fetchOneWalletsColumn(walletId, receivedBillType);
            if (receivedBillData != null) {
                let newReceivedBillQuantity = receivedBillData + 1;
                await updateOneWalletsColumn(walletId, receivedBillType, newReceivedBillQuantity);
                let newGivenChipQuantity = givenChipData - givenChipQuantity;
                await updateOneWalletsColumn(walletId, givenChipType, newGivenChipQuantity);
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
        console.error('Exchange chips error:', err);
        res.status(500).send('Something went wrong');
    }


});


export default router;
