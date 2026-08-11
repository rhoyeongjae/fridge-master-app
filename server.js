const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const path = require("path");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const app = express();

// CORS 설정
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

// JSON 파싱 미들웨어 (이게 있어야 req.body를 읽습니다)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

const SECRET_KEY = "fridge_secret_key";

// DB 연결 (커넥션 풀 방식)
const db = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "Asdf0602!?",
  database: "fridge_db",
  waitForConnections: true,
  connectionLimit: 10,
});

db.getConnection((err, conn) => {
  if (err) {
    console.error("❌ MySQL 연결 실패:", err.message);
    process.exit(1);
  }
  console.log("✅ MySQL 연결 성공!");
  conn.release();
});

// ─── [인증] JWT 토큰 검증 미들웨어 ──────────────────────────────
const verifyToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    console.log("⚠️ [인증 실패] 헤더에 Authorization 토큰이 유실되었습니다.");
    return res.status(401).json({ error: "인증 토큰이 누락되었습니다." });
  }

  jwt.verify(token, SECRET_KEY, (err, decoded) => {
    if (err) {
      console.log("⚠️ [인증 실패] 잘못되었거나 만료된 토큰입니다.");
      return res
        .status(403)
        .json({ error: "유효하지 않거나 만료된 토큰입니다." });
    }
    req.user = decoded; // 토큰 속 유저 ID 및 정보 저장
    next();
  });
};

// ─── 회원가입 ───────────────────────────────────────────────
app.post("/api/register", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: "아이디와 비밀번호를 입력하세요" });

  const hashed = await bcrypt.hash(password, 10);
  db.query(
    "INSERT INTO users (username, password) VALUES (?, ?)",
    [username, hashed],
    (err, result) => {
      if (err) {
        if (err.code === "ER_DUP_ENTRY")
          return res.status(400).json({ error: "이미 존재하는 아이디입니다" });
        return res.status(500).json({ error: err.message });
      }
      res.status(201).json({ message: "회원가입 완료!" });
    },
  );
});

// ─── 로그인 ─────────────────────────────────────────────────
app.post("/api/login", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: "아이디와 비밀번호를 입력하세요" });

  db.query(
    "SELECT * FROM users WHERE username = ?",
    [username],
    async (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!rows.length)
        return res.status(401).json({ error: "아이디가 존재하지 않습니다" });

      const match = await bcrypt.compare(password, rows[0].password);
      if (!match)
        return res.status(401).json({ error: "비밀번호가 틀렸습니다" });

      const token = jwt.sign({ id: rows[0].id, username }, SECRET_KEY, {
        expiresIn: "7d",
      });
      res.json({ token, username });
    },
  );
});

// ─── 식재료 API (원인 추적용 console.log 포함) ─────────────────────────────

// 1. 로그인한 사용자의 전체 식재료 조회
app.get("/api/ingredients", verifyToken, (req, res) => {
  db.query(
    "SELECT id, name, quantity, expiry, category FROM ingredients WHERE user_id = ? ORDER BY expiry ASC",
    [req.user.id],
    (err, rows) => {
      if (err) {
        console.error("❌ DB 식재료 조회 실패:", err.message);
        return res.status(500).json({ error: err.message });
      }
      res.json(rows);
    },
  );
});

// 2. 식재료 등록 (★ 디버깅 코드 대폭 추가 ★)
app.post("/api/ingredients", verifyToken, (req, res) => {
  console.log("\n========================================");
  console.log("🔔 [식재료 등록 요청 감지]");
  console.log("👤 인증된 유저 번호(user_id):", req.user.id);
  console.log("📦 프론트에서 받은 데이터(req.body):", req.body);
  console.log("========================================");

  const { name, quantity, expiry, category } = req.body;

  // 필수값 검증 실패 시 로그 출력
  if (!name || !expiry) {
    console.log("⚠️ [필수값 누락] 이름 혹은 유통기한 데이터가 비어있습니다.");
    return res.status(400).json({ error: "이름과 유통기한은 필수입니다" });
  }

  db.query(
    "INSERT INTO ingredients (name, quantity, expiry, category, user_id) VALUES (?, ?, ?, ?, ?)",
    [name, quantity || 1, expiry, category || "신선", req.user.id],
    (err, result) => {
      if (err) {
        // 👈 이 에러가 터미널에 찍히면 MySQL 테이블 제약조건이나 타입 에러입니다!
        console.error("❌ DB 저장 실패! 원인 메시지:", err);
        return res.status(500).json({ error: err.message });
      }
      console.log("✅ DB 저장 성공! 생성된 식재료 ID:", result.insertId);
      res.status(201).json({ id: result.insertId, message: "등록 완료!" });
    },
  );
});

// 3. 수정
app.put("/api/ingredients/:id", verifyToken, (req, res) => {
  const { name, quantity, expiry, category } = req.body;
  db.query(
    "UPDATE ingredients SET name=?, quantity=?, expiry=?, category=? WHERE id=? AND user_id=?",
    [name, quantity, expiry, category, req.params.id, req.user.id],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!result.affectedRows)
        return res
          .status(404)
          .json({ error: "찾을 수 없거나 권한이 없습니다." });
      res.json({ message: "수정 완료!" });
    },
  );
});

// 4. 삭제
app.delete("/api/ingredients/:id", verifyToken, (req, res) => {
  db.query(
    "DELETE FROM ingredients WHERE id = ? AND user_id = ?",
    [req.params.id, req.user.id],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!result.affectedRows)
        return res
          .status(404)
          .json({ error: "찾을 수 없거나 권한이 없습니다." });
      res.json({ message: "삭제 완료!" });
    },
  );
});

// 서버 시작
const PORT = 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 서버 실행 중 → http://localhost:${PORT}`);
});
