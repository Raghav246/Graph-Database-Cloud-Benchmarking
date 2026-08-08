/* State check for CognoDB — writes result to ./state-check.log */
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const logFile = path.resolve(__dirname, '../state-check.log');
const log = (msg) => {
  console.log(msg);
  fs.appendFileSync(logFile, msg + '\n', 'utf-8');
};

async function main() {
  fs.writeFileSync(logFile, '', 'utf-8');
  const neo4j = require('neo4j-driver');
  const driver = neo4j.driver(process.env.COGNODB_URI, neo4j.auth.basic(process.env.COGNODB_USER, process.env.COGNODB_PASSWORD), {
    maxConnectionPoolSize: 10,
    connectionTimeout: 20000,
  });
  const session = driver.session();
  try {
    const n = await session.run('MATCH (n:Node) RETURN count(n) AS c');
    log('NODES: ' + n.records[0].get('c').toNumber());
  } catch (e) { log('NODES ERR: ' + e.message); }
  try {
    const e = await session.run('MATCH ()-[r:REL]->() RETURN count(r) AS c');
    log('EDGES: ' + e.records[0].get('c').toNumber());
  } catch (err) { log('EDGES ERR: ' + err.message); }
  try {
    const idx = await session.run('SHOW INDEXES YIELD name, type, labelsOrTypes, properties RETURN name, type, labelsOrTypes, properties');
    log('INDEXES:');
    idx.records.forEach((r) => {
      log('  ' + JSON.stringify({ name: r.get('name'), type: r.get('type'), labels: r.get('labelsOrTypes'), props: r.get('properties') }));
    });
  } catch (e) { log('INDEX ERR: ' + e.message); }
  await session.close();
  await driver.close();
  log('DONE');
  process.exit(0);
}

main();
