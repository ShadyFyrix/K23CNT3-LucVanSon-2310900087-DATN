const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || 'localhost',
  port: parseInt(process.env.MYSQL_PORT, 10) || 3306,
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || 'lvson2005',
  database: process.env.MYSQL_DATABASE || 'examguard_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4'
});

const connectMySQL = async () => {
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.query('SELECT VERSION() AS version, DATABASE() AS current_db');
    connection.release();
    console.log(`✅ MySQL connected [${rows[0].current_db}]: MySQL Server ${rows[0].version} on port ${process.env.MYSQL_PORT || 3306}`);
    return true;
  } catch (error) {
    console.warn(`⚠️ MySQL connection warning: ${error.message} (Vui lòng đảm bảo MySQL Service đang chạy)`);
    return false;
  }
};

module.exports = {
  mysqlPool: pool,
  connectMySQL
};
