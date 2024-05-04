import express from 'express';
import bodyParser from 'body-parser';
import db from './database.js';

import config from './Config.json' assert { type: 'json' };

const app = express();
app.use(bodyParser.json());

const authenticateApiKey = (req, res, next) => {
	const apiKey = req.headers['api-key'];
	console.log(`Received API key: ${apiKey}`); // 로그에 API 키 출력
	if (apiKey === config.API_KEY) {
		next();
	} else {
		res.status(403).json({ error: 'Unauthorized' });
	}
}

// 모든 사용자의 소셜 크레딧 조회 API
app.get('/api/users/social-credit', (req, res) => {
	// 데이터베이스에서 모든 사용자의 소셜 크레딧을 조회
	db.all("SELECT user_id, social_credit FROM users", (err, rows) => {
		if (err) {
			console.error(err.message);
			return res.status(500).json({ error: 'Internal server error' });
		}
		if (rows.length > 0) {
			res.json(rows);
		} else {
			res.status(404).json({ error: 'No users found' });
		}
	});
});


// GET 요청을 위한 소셜 크레딧 조회 API
app.get('/api/users/:userId/social-credit', authenticateApiKey, (req, res) => {
	const { userId } = req.params;

	// 데이터베이스에서 userId에 해당하는 소셜 크레딧을 조회
	db.get("SELECT social_credit FROM users WHERE user_id = ?", [userId], (err, row) => {
		if (err) {
			console.error(err.message);
			return res.status(500).json({ error: 'Internal server error' });
		}
		if (row) {
			res.json({ social_credit: row.social_credit });
		} else {
			// 사용자가 존재하지 않는 경우, 새로운 사용자를 생성하고 기본값으로 0을 설정합니다.
			db.run("INSERT INTO users (user_id, social_credit) VALUES (?, ?)", [userId, 0], (err) => {
				if (err) {
					console.error(err.message);
					return res.status(500).json({ error: 'Internal server error' });
				}
				// 새로운 사용자가 생성되었으므로 다시 조회하여 소셜 크레딧을 반환합니다.
				db.get("SELECT social_credit FROM users WHERE user_id = ?", [userId], (err, newRow) => {
					if (err) {
						console.error(err.message);
						return res.status(500).json({ error: 'Internal server error' });
					}
					res.json({ social_credit: newRow.social_credit });
				});
			});
		}
	});
});

// 소셜 크레딧 삭제 API
app.delete('/api/users/:userId/social-credit', authenticateApiKey, (req, res) => {
	const { userId } = req.params;

	// 데이터베이스에서 userId에 해당하는 사용자 레코드를 삭제
	db.run("DELETE FROM users WHERE user_id = ?", [userId], (err) => {
		if (err) {
			console.error(err.message);
			return res.status(500).json({ error: 'Internal server error' });
		}
		res.sendStatus(200);
	});
});

// 소셜 크레딧 업데이트 API
app.put('/api/users/:userId/social-credit', authenticateApiKey, (req, res) => {
	const { userId } = req.params;
	const { social_credit: socialCredit } = req.body;

	db.run(`INSERT INTO users (user_id, social_credit) VALUES (?, ?)
          ON CONFLICT(user_id) DO UPDATE SET social_credit = ?`,
		[userId, socialCredit, socialCredit],
		(err) => {
			if (err) {
				console.error(err.message);
				return res.status(500).json({ error: 'Internal server error' });
			}
			res.sendStatus(200);
		});
});

// 소셜 크레딧 증가 API
app.post('/api/users/:userId/social-credit/increase', authenticateApiKey, (req, res) => {
	const { userId } = req.params;
	const { amount } = req.body;

	db.run(`INSERT INTO users (user_id, social_credit) VALUES (?, ?)
          ON CONFLICT(user_id) DO UPDATE SET social_credit = social_credit + ?`,
		[userId, amount, amount],
		(err) => {
			if (err) {
				console.error(err.message);
				return res.status(500).json({ error: 'Internal server error' });
			}
			res.sendStatus(200);
		});
});

// 소셜 크레딧 감소 API
app.post('/api/users/:userId/social-credit/decrease', authenticateApiKey, (req, res) => {
	const { userId } = req.params;
	const { amount } = req.body;

	db.run(`INSERT INTO users (user_id, social_credit) VALUES (?, ?)
          ON CONFLICT(user_id) DO UPDATE SET social_credit = social_credit - ?`,
		[userId, -amount, amount],
		(err) => {
			if (err) {
				console.error(err.message);
				return res.status(500).json({ error: 'Internal server error' });
			}
			res.sendStatus(200);
		});
});

export default app;