/* Connectivity check for CognoDB — writes result to ./connectivity-check.log */
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const logFile = path.resolve(__dirname, '../connectivity-check.log');
const log = (msg) => {
  console.log(msg);
  fs.appendFileSync(logFile, msg + '\n', 'utf-8');
};

async function main() {
  fs.writeFileSync(logFile, '', 'utf-8');
  const neo4j = require('neo4j-driver');
  const uri = process.env.COGNODB_URI;
  const user = process.env.COGNODB_USER;
  const pass = process.env.COGNODB_PASSWORD;

  log('URI: ' + uri);
  log('User: ' + user);
  log('Password set: ' + (!!pass && pass !== '<password>' && pass !== 'replace-me'));

  const driver = neo4j.driver(uri, neo4j.auth.basic(user, pass), {
    maxConnectionPoolSize: 50,
    connectionTimeout: 20000,
  });

  try {
    await driver.verifyConnectivity();
    log('CONNECTIVITY OK');
    const session = driver.session();
    const res = await session.run('RETURN 1 AS x');
    log('Query result: ' + res.records[0].get('x'));
    await session.close();
  } catch (e) {
    log('CONNECTIVITY FAILED: ' + e.message);
  } finally {
    try { await driver.close(); } catch (_) {}
    log('DONE');
    process.exit(0);
  }
}

main();
