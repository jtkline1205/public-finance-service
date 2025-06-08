import { Router, Request, Response } from 'express';
import pool from '../db';
import { PoolClient } from 'pg';

const router = Router();

export async function fetchOneWalletsColumn(client: PoolClient, walletId: string, columnName: string): Promise<number> {
    const query = `
    SELECT ${columnName}
    FROM wallets
    WHERE wallet_id = $1
  `;
    const result = await client.query(query, [walletId]);
    return result.rows.length > 0 ? result.rows[0][columnName] : 0;
}

export async function updateOneWalletsColumn(client: PoolClient, walletId: string, columnName: string, newValue: number): Promise<boolean> {
    const query = `
    UPDATE wallets
    SET ${columnName} = ${newValue}
    WHERE wallet_id = $1
  `;

    const result = await client.query(query, [walletId]);
    return true;
}

router.post('/exchange/bills', async (req: Request, res: Response): Promise<any> => {
    console.log('Received request for /exchange/bills:', req.body);

    const { walletId, denomination } = req.body;
    if (!walletId) return res.status(400).send('Missing walletId');
    const client = await pool.connect();

    try {
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

        let givenBillData = await fetchOneWalletsColumn(client, walletId, givenBillType);

        console.log('givenBillData:', givenBillData);

        if (givenBillData >= 1) {
            let receivedChipData = await fetchOneWalletsColumn(client, walletId, receivedChipType);
            console.log('receivedChipData:', receivedChipData);
            if (receivedChipData != null) {
                let newReceivedChipQuantity = receivedChipData + receivedChipQuantity;
                console.log('newReceivedChipQuantity:', newReceivedChipQuantity);
                await updateOneWalletsColumn(client, walletId, receivedChipType, newReceivedChipQuantity);
                let newGivenBillQuantity = givenBillData - 1;
                console.log('newGivenBillQuantity:', newGivenBillQuantity);
                await updateOneWalletsColumn(client, walletId, givenBillType, newGivenBillQuantity);
                console.log('before COMMIT');
                await client.query('COMMIT');
                return res.json({ success: true });
            } else {
                console.log('before ROLLBACK 1');
                await client.query('ROLLBACK');
                return res.status(400).json({ success: false, reason: 'Missing column' });
            }
        } else {
            console.log('before ROLLBACK 2');
            await client.query('ROLLBACK');
            return res.status(400).json({ success: false, reason: 'Insufficient bills' });
        }

    } catch (err) {
        console.error('Exchange bills error:', err);
        res.status(500).send('Something went wrong');
    } finally {
        client.release();
    }
});

router.post('/exchange/chips', async (req: Request, res: Response): Promise<any> => {
    console.log('Received request for /exchange/chips:', req.body);

    const { walletId, denomination } = req.body;
    if (!walletId) return res.status(400).send('Missing walletId');
    const client = await pool.connect();

    try {
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

        console.log('receivedBillType:', receivedBillType);
        console.log('givenChipQuantity:', givenChipQuantity);
        console.log('givenChipType:', givenChipType);

        let givenChipData = await fetchOneWalletsColumn(client, walletId, givenChipType);

        console.log('givenChipData:', givenChipData);

        if (givenChipData >= givenChipQuantity) {
            let receivedBillData = await fetchOneWalletsColumn(client, walletId, receivedBillType);
            console.log('receivedBillData:', receivedBillData);
            if (receivedBillData != null) {
                let newReceivedBillQuantity = receivedBillData + 1;
                console.log('newReceivedBillQuantity:', newReceivedBillQuantity);
                await updateOneWalletsColumn(client, walletId, receivedBillType, newReceivedBillQuantity);
                let newGivenChipQuantity = givenChipData - givenChipQuantity;
                console.log('newGivenChipQuantity:', newGivenChipQuantity);
                await updateOneWalletsColumn(client, walletId, givenChipType, newGivenChipQuantity);
                console.log('before COMMIT');
                await client.query('COMMIT');
                return res.json({ success: true });
            } else {
                console.log('before ROLLBACK 1');
                await client.query('ROLLBACK');
                return res.status(400).json({ success: false, reason: 'Missing column' });
            }
        } else {
            console.log('before ROLLBACK 1');
            await client.query('ROLLBACK');
            return res.status(400).json({ success: false, reason: 'Insufficient chips' });
        }



    } catch (err) {
        console.error('Exchange chips error:', err);
        res.status(500).send('Something went wrong');
    } finally {
        client.release();
    }


});


export default router;
