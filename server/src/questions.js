async function pickRandomQuestions(pool, count) {
  // MySQL: ORDER BY RAND() is fine for small tables; OK for MVP.
  const n = Math.max(3, Math.min(5, Number(count) || 3));
  const [rows] = await pool.query(
    "SELECT id, content, category FROM questions ORDER BY RAND() LIMIT ?",
    [n]
  );
  return rows;
}

module.exports = { pickRandomQuestions };

