const bcrypt = require('bcryptjs');
const password = process.argv[2] || 'ashfar';
bcrypt.hash(password, 10).then((hash) => {
  console.log(hash);
}).catch((err) => {
  console.error(err);
  process.exit(1);
});
