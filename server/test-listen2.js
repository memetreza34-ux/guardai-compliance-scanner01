const { createApp } = require('./app');
const app = createApp();
const server = app.listen(3001, () => {
  console.log('Test app listening');
});
setInterval(() => console.log('Ping'), 1000);
