import { Router, Request, Response } from 'express';
import { sendResponse } from '../api';
import { processDeposit, processWithdrawal, fetchAtm } from '../services/walletService';
import { pool, fetchOneColumn, updateOneWalletsColumn, updateOneAtmsColumn } from '../walletRepository';

const router = Router();

router.get('/:atmId', async (req: Request, res: Response): Promise<any> => {
    const { atmId } = req.params;

    if (!atmId) {
        return sendResponse(res, 400, 'ATM ID is required');
    }

    const client = await pool.connect();
    try {
        const atmResponse = await fetchAtm(client, atmId);
        return sendResponse(res, 200, { atm: atmResponse });
    } catch (err) {
        console.error('Error fetching ATM:', err);
        return sendResponse(res, 500, null, 'Failed to retrieve ATM information');
    } finally {
        client.release();
    }
});

router.put('/:atmId/keypad', async (req: Request, res: Response): Promise<any> => {
    const { atmId } = req.params;
    const { key, type } = req.body;

    if (!atmId) {
        return sendResponse(res, 400, null, 'ATM ID is required');
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const displayState = await fetchOneColumn(client, atmId, "display_state", "atms", "atm_id");

        switch (type) {
            case 'digit':
                await handleDigitInput(client, atmId, key, displayState);
                break;
            case 'action':
                await handleActionKey(client, atmId, key, displayState);
                break;
            case 'control':
                await handleControlKey(client, atmId, key, displayState);
                break;
            default:
                throw new Error('Invalid key type');
        }

        await client.query('COMMIT');

        const updatedAtm = await fetchAtm(client, atmId);
        return sendResponse(res, 200, { atm: updatedAtm });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Keypad error:', err);
        return sendResponse(res, 500, null, 'Failed to process keypad input');
    } finally {
        client.release();
    }
});

router.put('/:atmId/card', async (req: Request, res: Response): Promise<any> => {
    const { atmId } = req.params;

    if (!atmId) {
        return sendResponse(res, 400, null, 'ATM ID is required');
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const debitCard = await fetchOneColumn(client, atmId, "debit_card", "wallets", "wallet_id");

        if (debitCard) {
            await updateOneWalletsColumn(client, atmId, "debit_card", false);
            await updateOneAtmsColumn(client, atmId, "display_state", "home");
            await updateOneAtmsColumn(client, atmId, "entry", "0");
        } else if (!debitCard) {
            await updateOneWalletsColumn(client, atmId, "debit_card", true);
            await updateOneAtmsColumn(client, atmId, "display_state", "insert");
        }

        await client.query('COMMIT');

        const updatedAtm = await fetchAtm(client, atmId);
        return sendResponse(res, 200, {
            atm: updatedAtm,
        });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Card operation error:', err);
        return sendResponse(res, 500, null, 'Failed to process card operation');
    } finally {
        client.release();
    }
});

router.post('/:atmId/transactions', async (req: Request, res: Response): Promise<any> => {
    const { atmId } = req.params;
    const { type } = req.body; // 'withdrawal' | 'deposit'

    if (!atmId) {
        return sendResponse(res, 400, null, 'ATM ID is required');
    }

    if (!type || !['withdrawal', 'deposit'].includes(type)) {
        return sendResponse(res, 400, null, 'Valid transaction type is required');
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        let transactionResult;
        if (type === 'withdrawal') {
            transactionResult = await processWithdrawal(client, atmId);
        } else {
            transactionResult = await processDeposit(client, atmId);
        }

        await client.query('COMMIT');

        return sendResponse(res, 201, {
            transaction: transactionResult,
            type: type
        });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Transaction error:', err);
        return sendResponse(res, 500, null, 'Failed to process transaction');
    } finally {
        client.release();
    }
});

async function handleDigitInput(client: any, atmId: string, digit: string, displayState: string) {
    if (displayState === "deposit" || displayState === "initiate") {
        let entry = await fetchOneColumn(client, atmId, "entry", "atms", "atm_id");
        if (entry == null) {
            await updateOneAtmsColumn(client, atmId, "entry", digit);
        } else if (entry.length < 9) {
            await updateOneAtmsColumn(client, atmId, "entry", entry + digit);
        }
    }
}

async function handleActionKey(client: any, atmId: string, key: string, displayState: string) {
    switch (key) {
        case "Cancel":
            if (displayState !== "insert") {
                await updateOneAtmsColumn(client, atmId, "display_state", "home");
            }
            break;

        case "Clear":
            if (displayState === "balance" || displayState === "activity") {
                await updateOneAtmsColumn(client, atmId, "display_state", "home");
            } else if (displayState === "initiate" || displayState === "deposit") {
                await updateOneAtmsColumn(client, atmId, "entry", "0");
            }
            break;

        case "Enter":
            if (displayState === "initiate") {
                let entry = await fetchOneColumn(client, atmId, "entry", "atms", "atm_id");
                if (parseFloat(entry) > 0) {
                    await updateOneAtmsColumn(client, atmId, "display_state", "confirm");
                }
            } else if (displayState === "confirm") {
                await processWithdrawal(client, atmId);
            } else if (displayState === "balance" || displayState === "activity") {
                await updateOneAtmsColumn(client, atmId, "display_state", "home");
            } else if (displayState === "deposit") {
                await processDeposit(client, atmId);
            }
            break;
    }
}

async function handleControlKey(client: any, atmId: string, designator: string, displayState: string) {
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
            let entry = await fetchOneColumn(client, atmId, "entry", "atms", "atm_id");
            if (parseFloat(entry) > 0) {
                await updateOneAtmsColumn(client, atmId, "display_state", "confirm");
            }
        } else if (displayState == "confirm") {
            await updateOneAtmsColumn(client, atmId, "display_state", "home");
        } else if (displayState == "deposit") {
            await processDeposit(client, atmId);
        }
    }

}


export default router;