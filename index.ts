import express, { Request, Response } from 'express';
import cors from 'cors';
import pool from './db';

const app = express();
const port = 3000;

// app.use(cors({
//     origin: '',
// }));

app.use(express.json());

app.post('/exchange', async (req: Request, res: Response): Promise<any> => {
    const { userId } = req.body;
    if (!userId) return res.status(400).send('Missing userId');

    try {
        const client = await pool.connect();
        await client.query('BEGIN');

        await client.query(`
            UPDATE wallets
            SET chip_hundreds = 1
            WHERE wallet_id = 2
        `);

        await client.query('COMMIT');
        res.json({ success: true });

    } catch (err) {
        console.error('Exchange error:', err);
        res.status(500).send('Something went wrong');
    }

});

app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});