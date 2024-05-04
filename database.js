import sqlite3 from 'sqlite3';

const db = new sqlite3.Database('database.sqlite', (err) => {
    if (err) {
        console.error(err.message);
        throw err;
    }
    console.log('SQLite 데이터베이스에 연결됨.');
});

db.run(`CREATE TABLE IF NOT EXISTS users (
  user_id TEXT PRIMARY KEY,
  social_credit INTEGER DEFAULT 0
)`);

export default db;