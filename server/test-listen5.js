const { createApp } = require('./app');
const app = createApp();
const server = app.listen(3001, () => {
  console.log('Test app listening');
});
const origUnref = server.unref;
server.unref = function() {
  console.trace('server.unref called');
  return origUnref.apply(this, arguments);
};
