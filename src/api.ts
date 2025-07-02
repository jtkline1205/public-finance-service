import { Response } from 'express';
import { PoolClient } from 'pg';
import { pool } from './walletRepository';

interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    timestamp: string;
}

export const sendResponse = <T>(res: Response, status: number, data?: T, error?: string) => {
    const response: ApiResponse<T> = {
        success: status < 400,
        timestamp: new Date().toISOString(),
        ...(data && { data }),
        ...(error && { error })
    };
    return res.status(status).json(response);
};


export async function withTransaction<T>(
    handler: (client: PoolClient) => Promise<T>,
    res: Response
): Promise<T | void> {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');
        const result = await handler(client);
        await client.query('COMMIT');
        return result;
    } catch (err: unknown) {
        await client.query('ROLLBACK');
        console.error('Transaction error:', err);
        sendResponse(res, 500, 'Server error');
    } finally {
        client.release();
    }
}

