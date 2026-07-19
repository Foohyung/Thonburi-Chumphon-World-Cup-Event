function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('ทายผลบอลโลก 2026: อาร์เจนตินา vs สเปน')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

const NEON_HOST = 'ep-sweet-cake-azyad7ak-pooler.c-3.ap-southeast-1.aws.neon.tech';
const NEON_PORT = '5432';
const NEON_DB = 'neondb';
const NEON_USER = 'neondb_owner';
const NEON_PASSWORD = 'npg_lvH4yOfETSh9';
const NEON_TABLE = 'predictions';

function submitPrediction(data) {
  const empId = data.empId.toString().trim();

  if (!empId || !data.empName) {
    throw new Error('ข้อมูลไม่ครบถ้วน');
  }

  const conn = getNeonConnection_();
  try {
    ensurePredictionTable_(conn);

    const selectStmt = conn.prepareStatement(
      'SELECT id FROM ' + NEON_TABLE + ' WHERE emp_id = ? LIMIT 1'
    );
    selectStmt.setString(1, empId);
    const rs = selectStmt.executeQuery();
    if (rs.next()) {
      throw new Error('รหัสพนักงานนี้เคยลงผลแล้ว');
    }
    rs.close();
    selectStmt.close();

    const insertStmt = conn.prepareStatement(
      'INSERT INTO ' + NEON_TABLE + ' (created_at, emp_id, emp_name, winner, arg_score, esp_score) VALUES (CURRENT_TIMESTAMP, ?, ?, ?, ?, ?)'
    );
    insertStmt.setString(1, empId);
    insertStmt.setString(2, data.empName);
    insertStmt.setString(3, data.winner);

    if (data.arg !== null && data.arg !== '') {
      insertStmt.setInt(4, parseInt(data.arg, 10));
    } else {
      insertStmt.setNull(4, Jdbc.Type.INTEGER);
    }

    if (data.esp !== null && data.esp !== '') {
      insertStmt.setInt(5, parseInt(data.esp, 10));
    } else {
      insertStmt.setNull(5, Jdbc.Type.INTEGER);
    }

    insertStmt.execute();
    insertStmt.close();

    return {
      success: true,
      message: 'บันทึกผลการทายสำเร็จ!'
    };
  } finally {
    conn.close();
  }
}

function getNeonConnection_() {
  const url = 'jdbc:postgresql://' + NEON_HOST + ':' + NEON_PORT + '/' + NEON_DB + '?sslmode=require';
  return Jdbc.getConnection(url, NEON_USER, NEON_PASSWORD);
}

function ensurePredictionTable_(conn) {
  const ddl =
    'CREATE TABLE IF NOT EXISTS ' + NEON_TABLE + ' (' +
    'id SERIAL PRIMARY KEY,' +
    'created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,' +
    'emp_id TEXT NOT NULL UNIQUE,' +
    'emp_name TEXT NOT NULL,' +
    'winner TEXT NOT NULL,' +
    'arg_score INTEGER,' +
    'esp_score INTEGER' +
    ')';
  conn.createStatement().execute(ddl);
}
