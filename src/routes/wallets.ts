import { Router, Request, Response } from 'express';
import { sendResponse, withTransaction } from '../api';
import { addChip, addChipStack, removeChip, fetchWallet } from '../services/walletService';
import { pool, fetchOneColumn, updateOneWalletsColumn, getDenominationMapping, getBreakBillMapping, getChipExchangeMapping, ExchangeMapping } from '../walletRepository';
import { ItemStack } from '../util/ItemStack';
import { PoolClient } from 'pg';

const router = Router();

router.post('/:walletId/bills/exchange', createExchangeHandler(exchangeBills));
router.post('/:walletId/chips/exchange', createExchangeHandler(exchangeChips));
router.post('/:walletId/chips/change', createChangeChipsHandler());
router.post('/:walletId/bills/break', createBreakBillsHandler());

router.post('/:walletId/chips', async (req: Request, res: Response): Promise<any> => {
    const { walletId } = req.params;
    const body = req.body as AddChipRequest;
    if (!walletId) return res.status(400).send('Missing walletId');
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        if (body.type === 'single') {
            await addChip(client, walletId, body.denomination);
        } else if (body.type === 'stack') {
            await addChipStack(client, walletId, body.itemStack);
        } else {
            return res.status(400).send('Invalid request type');
        }

        await client.query('COMMIT');
        return res.status(200).json({ message: 'Chip(s) added successfully' });


    } catch (err) {
        await client.query('ROLLBACK');
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
        await client.query('ROLLBACK');
        return res.status(500).json({ error: 'Failed to remove chip' })
    } finally {
        client.release();
    }
});

router.get('/:walletId', async (req: Request, res: Response): Promise<any> => {
    const { walletId } = req.params;
    if (!walletId) return res.status(400).send('Missing walletId');
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const walletResponse = await fetchWallet(client, walletId);

        return res.status(200).json({
            wallets: walletResponse
        })

    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).send('get wallet error');
    } finally {
        client.release();
    }
});

function createExchangeHandler(exchangeFunction: ExchangeFunction) {
    return async (req: Request, res: Response): Promise<any> => {
        const { walletId } = req.params;
        const { denomination } = req.body;

        if (!walletId) {
            return sendResponse(res, 400, 'Wallet ID is required');
        }

        return withTransaction(async (client) => {
            try {
                await exchangeFunction(client, walletId, denomination);
                return res.json({ success: true });
            } catch (err: unknown) {
                if (err && typeof err === 'object' && 'status' in err && 'message' in err) {
                    const exchangeError = err as FinanceError;
                    return sendResponse(res, exchangeError.status, exchangeError.message);
                }
                throw err;
            }
        }, res);
    };
}

function createChangeChipsHandler() {
    return async (req: Request, res: Response): Promise<any> => {
        const { walletId } = req.params;
        const { givenDenomination, receivedDenomination } = req.body;

        if (!walletId) {
            return sendResponse(res, 400, 'Wallet ID is required');
        }

        if (!givenDenomination || !receivedDenomination) {
            return sendResponse(res, 400, 'Both denominations are required');
        }

        return withTransaction(async (client) => {
            try {
                await changeChips(client, walletId, givenDenomination, receivedDenomination);
                return res.json({ success: true });
            } catch (err: unknown) {
                if (err && typeof err === 'object' && 'status' in err && 'message' in err) {
                    const exchangeError = err as FinanceError;
                    return res.status(exchangeError.status).json({
                        success: false,
                        reason: exchangeError.message
                    });
                }
                throw err;
            }
        }, res);
    };
}

function createBreakBillsHandler() {
    return async (req: Request, res: Response): Promise<any> => {
        const { walletId } = req.params;
        const { denomination } = req.body;

        if (!walletId) {
            return sendResponse(res, 400, 'Wallet ID is required');
        }

        if (!denomination) {
            return sendResponse(res, 400, 'Denomination is required');
        }

        return withTransaction(async (client) => {
            try {
                await breakBills(client, walletId, denomination);
                return res.json({ success: true });
            } catch (err: unknown) {
                if (err && typeof err === 'object' && 'status' in err && 'message' in err) {
                    const exchangeError = err as FinanceError;
                    return res.status(exchangeError.status).json({
                        success: false,
                        reason: exchangeError.message
                    });
                }
                throw err;
            }
        }, res);
    }
}

interface AddSingleChipRequest {
    type: 'single';
    denomination: string;
}

interface AddItemStackRequest {
    type: 'stack';
    itemStack: ItemStack;
}

interface FinanceError {
    status: number;
    message: string;
}

type AddChipRequest = AddSingleChipRequest | AddItemStackRequest;

type ExchangeFunction = (client: PoolClient, walletId: string, denomination: number) => Promise<boolean>;

async function performExchange(
    client: PoolClient,
    walletId: string,
    mapping: ExchangeMapping
): Promise<boolean> {
    const currentGivenAmount = parseInt(
        await fetchOneColumn(client, walletId, mapping.givenType, "wallets", "wallet_id")
    );

    if (currentGivenAmount < mapping.givenQuantity) {
        const itemType = mapping.givenType.includes('bill') ? 'bills' : 'chips';
        throw { status: 400, message: `Insufficient ${itemType}` } as FinanceError;
    }

    const currentReceivedAmount = await fetchOneColumn(
        client, walletId, mapping.receivedType, "wallets", "wallet_id"
    );

    if (currentReceivedAmount == null) {
        throw { status: 400, message: 'Missing column' } as FinanceError;
    }

    const newReceivedAmount = currentReceivedAmount + mapping.receivedQuantity;
    await updateOneWalletsColumn(client, walletId, mapping.receivedType, newReceivedAmount);

    const newGivenAmount = currentGivenAmount - mapping.givenQuantity;
    await updateOneWalletsColumn(client, walletId, mapping.givenType, newGivenAmount);

    return true;
}

async function exchangeBills(client: PoolClient, walletId: string, denomination: number): Promise<boolean> {
    return performExchange(client, walletId, getDenominationMapping(denomination, 'bills'));
}

async function exchangeChips(client: PoolClient, walletId: string, denomination: number): Promise<boolean> {
    return performExchange(client, walletId, getDenominationMapping(denomination, 'chips'));
}

async function changeChips(client: PoolClient, walletId: string, givenDenomination: number, receivedDenomination: number): Promise<boolean> {
    return performExchange(client, walletId, getChipExchangeMapping(givenDenomination, receivedDenomination));
}

async function breakBills(client: PoolClient, walletId: string, denomination: number): Promise<boolean> {
    return performExchange(client, walletId, getBreakBillMapping(denomination));
}

export default router;
