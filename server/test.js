const http = require('http');
const server = http.createServer();
server.listen(3002, () => {
  console.log('Listening 3002');
  setTimeout(() => console.log('still alive'), 1000);
});
