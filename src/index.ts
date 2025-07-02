import express, { Request, Response } from 'express';
import cors from 'cors';
import walletsRouter from './routes/wallets';
import atmsRouter from './routes/atms';

const app = express();
const port = 3200;

// ✅ Define allowed origins
const allowedOrigins = [
    'http://localhost:3000',
    // 'http://your-bucket-name.s3-website.us-east-2.amazonaws.com'
];

// ✅ CORS middleware that handles multiple origins
app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like curl, Postman)
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true // only if you're using cookies/auth headers
}));

app.use(express.json());

app.use('/wallets', walletsRouter);
app.use('/atms', atmsRouter)

app.listen(port, () => {
    console.log(`public-finance-service listening on port ${port}`);
});




