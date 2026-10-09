const bcrypt = require('bcryptjs');

async function main() {
  const plain = '1234';

  // 1. Hash (this is what you store in the database)
  const hash = await bcrypt.hash(plain, 10);   // 10 = salt rounds
  console.log('hash:', hash);

  // 2. Compare: plain password FIRST, hash second
  console.log('right password:', await bcrypt.compare('1234', hash)); // true
  console.log('wrong password:', await bcrypt.compare('nope', hash)); // false
}

main();
