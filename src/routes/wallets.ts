import { Router, Request, Response } from 'express';
import pool from '../db';
import { fetchOneAtmsColumn, fetchOneWalletsColumn, updateOneWalletsColumn, updateOneAtmsColumn, updateOnePlayersColumn, processDeposit, processWithdrawal, addChip, removeChip } from '../services/walletService';

const router = Router();

router.post('/exchange/bills', async (req: Request, res: Response): Promise<any> => {
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

        let givenBillData = await fetchOneWalletsColumn(client, walletId, givenBillType);

        if (givenBillData >= 1) {
            let receivedChipData = await fetchOneWalletsColumn(client, walletId, receivedChipType);
            console.log('receivedChipData:', receivedChipData);
            if (receivedChipData != null) {
                let newReceivedChipQuantity = receivedChipData + receivedChipQuantity;
                await updateOneWalletsColumn(client, walletId, receivedChipType, newReceivedChipQuantity);
                let newGivenBillQuantity = givenBillData - 1;
                await updateOneWalletsColumn(client, walletId, givenBillType, newGivenBillQuantity);
                await client.query('COMMIT');
                return res.json({ success: true });
            } else {
                await client.query('ROLLBACK');
                return res.status(400).json({ success: false, reason: 'Missing column' });
            }
        } else {
            await client.query('ROLLBACK');
            return res.status(400).json({ success: false, reason: 'Insufficient bills' });
        }

    } catch (err) {
        res.status(500).send('Something went wrong');
    } finally {
        client.release();
    }
});

router.post('/exchange/chips', async (req: Request, res: Response): Promise<any> => {
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

        let givenChipData = await fetchOneWalletsColumn(client, walletId, givenChipType);

        console.log('givenChipData:', givenChipData);

        if (givenChipData >= givenChipQuantity) {
            let receivedBillData = await fetchOneWalletsColumn(client, walletId, receivedBillType);
            if (receivedBillData != null) {
                let newReceivedBillQuantity = receivedBillData + 1;
                await updateOneWalletsColumn(client, walletId, receivedBillType, newReceivedBillQuantity);
                let newGivenChipQuantity = givenChipData - givenChipQuantity;
                await updateOneWalletsColumn(client, walletId, givenChipType, newGivenChipQuantity);
                await client.query('COMMIT');
                return res.json({ success: true });
            } else {
                await client.query('ROLLBACK');
                return res.status(400).json({ success: false, reason: 'Missing column' });
            }
        } else {
            await client.query('ROLLBACK');
            return res.status(400).json({ success: false, reason: 'Insufficient chips' });
        }
    } catch (err) {
        res.status(500).send('Something went wrong');
    } finally {
        client.release();
    }


});

router.post('/break/bills', async (req: Request, res: Response): Promise<any> => {
    const { walletId, denomination } = req.body;
    if (!walletId) return res.status(400).send('Missing walletId');
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        let receivedBillType = "ones"
        let receivedBillQuantity = 5
        let givenBillType = "fives"
        if (denomination == 20) {
            receivedBillType = "fives"
            givenBillType = "twenties"
            receivedBillQuantity = 4
        }
        if (denomination == 100) {
            receivedBillType = "twenties"
            givenBillType = "hundreds"
            receivedBillQuantity = 5
        }

        let givenBillData = await fetchOneWalletsColumn(client, walletId, givenBillType);

        if (givenBillData >= 1) {
            let receivedBillData = await fetchOneWalletsColumn(client, walletId, receivedBillType);
            if (receivedBillData != null) {
                let newReceivedBillQuantity = receivedBillData + receivedBillQuantity;
                await updateOneWalletsColumn(client, walletId, receivedBillType, newReceivedBillQuantity);
                let newGivenBillQuantity = givenBillData - 1;
                await updateOneWalletsColumn(client, walletId, givenBillType, newGivenBillQuantity);
                await client.query('COMMIT');
                return res.json({ success: true });
            } else {
                await client.query('ROLLBACK');
                return res.status(400).json({ success: false, reason: 'Missing column' });
            }
        } else {
            await client.query('ROLLBACK');
            return res.status(400).json({ success: false, reason: 'Insufficient bills' });
        }



    } catch (err) {
        console.error('Break bills error:', err);
        res.status(500).send('Something went wrong');
    } finally {
        client.release();
    }


});

router.post('/change/chips', async (req: Request, res: Response): Promise<any> => {
    const { walletId, givenDenomination, receivedDenomination } = req.body;
    if (!walletId) return res.status(400).send('Missing walletId');
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        let givenChipQuantity = 1
        let receivedChipQuantity = 1
        let givenChipType = "chip_ones"
        let receivedChipType = "chip_ones"
        if (givenDenomination == 5 && receivedDenomination == 25) {
            givenChipQuantity = 5
            receivedChipQuantity = 1
            givenChipType = "chip_fives"
            receivedChipType = "chip_twentyfives"
        }
        if (givenDenomination == 25 && receivedDenomination == 5) {
            givenChipQuantity = 1
            receivedChipQuantity = 5
            givenChipType = "chip_twentyfives"
            receivedChipType = "chip_fives"
        }
        if (givenDenomination == 25 && receivedDenomination == 100) {
            givenChipQuantity = 4
            receivedChipQuantity = 1
            givenChipType = "chip_twentyfives"
            receivedChipType = "chip_hundreds"
        }
        if (givenDenomination == 100 && receivedDenomination == 25) {
            givenChipQuantity = 1
            receivedChipQuantity = 4
            givenChipType = "chip_hundreds"
            receivedChipType = "chip_twentyfives"
        }
        if (givenDenomination == 5 && receivedDenomination == 1) {
            givenChipQuantity = 1
            receivedChipQuantity = 5
            givenChipType = "chip_fives"
            receivedChipType = "chip_ones"
        }
        if (givenDenomination == 1 && receivedDenomination == 5) {
            givenChipQuantity = 5
            receivedChipQuantity = 1
            givenChipType = "chip_ones"
            receivedChipType = "chip_fives"
        }


        let givenChipData = await fetchOneWalletsColumn(client, walletId, givenChipType);

        if (givenChipData >= givenChipQuantity) {
            let receivedChipData = await fetchOneWalletsColumn(client, walletId, receivedChipType);
            if (receivedChipData != null) {
                let newReceivedChipQuantity = receivedChipData + receivedChipQuantity;
                await updateOneWalletsColumn(client, walletId, receivedChipType, newReceivedChipQuantity);
                let newGivenChipQuantity = givenChipData - givenChipQuantity;
                await updateOneWalletsColumn(client, walletId, givenChipType, newGivenChipQuantity);
                await client.query('COMMIT');
                return res.json({ success: true });
            } else {
                await client.query('ROLLBACK');
                return res.status(400).json({ success: false, reason: 'Missing column' });
            }
        } else {
            await client.query('ROLLBACK');
            return res.status(400).json({ success: false, reason: 'Insufficient bills' });
        }

    } catch (err) {
        console.error('Change chips error:', err);
        res.status(500).send('Something went wrong');
    } finally {
        client.release();
    }


});

router.post('/atm/word', async (req: Request, res: Response): Promise<any> => {
    const { atmId, word } = req.body;
    if (!atmId) return res.status(400).send('Missing atmId');
    const client = await pool.connect();

    try {
        await client.query('BEGIN');
        let displayState = await fetchOneAtmsColumn(client, atmId, "display_state");

        if (word == "Cancel") {
            if (displayState != "insert") {
                await updateOneAtmsColumn(client, atmId, "display_state", "home");
            }
        } else if (word == "Clear") {
            if (displayState == "balance" || displayState == "activity") {
                await updateOneAtmsColumn(client, atmId, "display_state", "home");
            } else if (displayState == "initiate" || displayState == "deposit") {
                await updateOneAtmsColumn(client, atmId, "entry", "0");
            }
        } else if (word == "Enter") {
            if (displayState == "initiate") {
                let entry = await fetchOneAtmsColumn(client, atmId, "entry");
                if (parseFloat(entry) > 0) {
                    await updateOneAtmsColumn(client, atmId, "display_state", "confirm");
                }
            } else if (displayState == "confirm") {
                await processWithdrawal(client, atmId);
            } else if (displayState == "balance" || displayState == "activity") {
                await updateOneAtmsColumn(client, atmId, "display_state", "home");
            } else if (displayState == "deposit") {
                await processDeposit(client, atmId);
            }
        }
        await client.query('COMMIT');
        return res.json({ success: true });
    } catch (err) {
        console.error('ATM word error:', err);
        res.status(500).send('Something went wrong');
    } finally {
        client.release();
    }
});

router.post('/atm/control', async (req: Request, res: Response): Promise<any> => {
    const { atmId, designator } = req.body;
    if (!atmId) return res.status(400).send('Missing atmId');
    const client = await pool.connect();

    try {
        await client.query('BEGIN');
        let displayState = await fetchOneAtmsColumn(client, atmId, "display_state");
        if (designator == "nw") {
            if (displayState == "home") {
                await updateOneAtmsColumn(client, atmId, "display_state", "balance");
            }
        } else if (designator == "ne") {
            if (displayState == "home") {
                await updateOneAtmsColumn(client, atmId, "entry", "0");
                await updateOneAtmsColumn(client, atmId, "display_state", "initiate");
            } else if (displayState == "confirm") {
                await processWithdrawal(client, atmId);
            }
        } else if (designator == "sw") {
            if (displayState == "home") {
                await updateOneAtmsColumn(client, atmId, "display_state", "activity");
            }
        } else if (designator == "se") {
            if (displayState == "home") {
                await updateOneAtmsColumn(client, atmId, "entry", "0");
                await updateOneAtmsColumn(client, atmId, "display_state", "deposit");
            } else if (displayState == "balance") {
                await updateOneAtmsColumn(client, atmId, "display_state", "home");
            } else if (displayState == "initiate") {
                let entry = await fetchOneAtmsColumn(client, atmId, "entry");
                if (parseFloat(entry) > 0) {
                    await updateOneAtmsColumn(client, atmId, "display_state", "confirm");
                }
            } else if (displayState == "confirm") {
                await updateOneAtmsColumn(client, atmId, "display_state", "home");
            } else if (displayState == "deposit") {
                await processDeposit(client, atmId);
            }
        }
        await client.query('COMMIT');
        return res.json({ success: true });
    } catch (err) {
        console.error('ATM control error:', err);
        res.status(500).send('Something went wrong');
    } finally {
        client.release();
    }
});

router.post('/atm/digit', async (req: Request, res: Response): Promise<any> => {
    const { atmId, digit } = req.body;
    if (!atmId) return res.status(400).send('Missing atmId');
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        let displayState = await fetchOneAtmsColumn(client, atmId, "display_state");
        if (displayState == "deposit" || displayState == "initiate") {
            let entry = await fetchOneAtmsColumn(client, atmId, "entry");
            if (entry == null) {
                await updateOneAtmsColumn(client, atmId, "entry", digit);
            } else if (entry.length < 9) {
                await updateOneAtmsColumn(client, atmId, "entry", entry + digit);
            }
        }

        await client.query('COMMIT');
        return res.json({ success: true });
    } catch (err) {
        console.error('ATM digit error:', err);
        res.status(500).send('Something went wrong');
    } finally {
        client.release();
    }
});

router.post('/atm/card', async (req: Request, res: Response): Promise<any> => {
    const { atmId } = req.body;
    if (!atmId) return res.status(400).send('Missing atmId');
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        let debitCard = await fetchOneWalletsColumn(client, atmId, "debit_card");
        if (debitCard) {
            await updateOneWalletsColumn(client, atmId, "debit_card", false);
            await updateOneAtmsColumn(client, atmId, "display_state", "home");
            await updateOneAtmsColumn(client, atmId, "entry", "0");
        } else {
            await updateOneWalletsColumn(client, atmId, "debit_card", true);
            await updateOneAtmsColumn(client, atmId, "display_state", "insert");
        }

        await client.query('COMMIT');
        return res.json({ success: true });
    } catch (err) {
        res.status(500).send('ATM card error');
    } finally {
        client.release();
    }
});

router.post('/:walletId/chips', async (req: Request, res: Response): Promise<any> => {
    const { walletId } = req.params;
    const { denomination } = req.body;
    if (!walletId) return res.status(400).send('Missing walletId');
    const client = await pool.connect();

    try {
        await client.query('BEGIN');
        await addChip(client, walletId, denomination);
        await client.query('COMMIT');
        return res.status(200).json({ message: 'Chip added successfully' });
    } catch (err) {
        res.status(500).send('add chip error');
    } finally {
        client.release();
    }
});

router.delete('/:walletId/chips', async (req: Request, res: Response): Promise<any> => {
    const { walletId } = req.params;
    const { denomination } = req.body;
    if (!walletId) return res.status(400).send('Missing walletId');
    const client = await pool.connect();

    try {
        await client.query('BEGIN');
        const success = await removeChip(client, walletId, denomination);
        await client.query('COMMIT');

        if (!success) {
            return res.status(400).json({
                error: 'Insufficient chips',
                walletId,
                denomination
            });
        }

        return res.status(200).json({
            message: 'Chip removed successfully',
            walletId,
            denomination
        });
    } catch (error) {
        return res.status(500).json({ error: 'Failed to remove chip' })
    } finally {
        client.release();
    }
});

export default router;
