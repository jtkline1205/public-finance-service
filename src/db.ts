import { Pool } from 'pg';

const pool = new Pool({
    host: '',
    port: 5432,
    user: 'postgres',
    password: '',
    database: 'postgres',
});

export default pool;