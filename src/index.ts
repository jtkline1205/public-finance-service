import express, { Request, Response } from 'express';
import cors from 'cors';
import pool from './db';
import walletsRouter from './routes/wallets';

const app = express();
const port = 3000;

app.use(cors({
    origin: '',
}));

app.use(express.json());

app.use('/wallets', walletsRouter);

app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});