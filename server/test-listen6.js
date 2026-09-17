const { createApp } = require('./app');
const app = createApp();
const server = app.listen(3001, () => {
  console.log('Test app listening');
});
const origClose = server.close;
server.close = function() {
  console.trace('server.close called');
  return origClose.apply(this, arguments);
};
server.on('close', () => console.log('server emitted close'));
