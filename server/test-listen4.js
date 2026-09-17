process.exit = (code) => { console.trace('process.exit called with', code); };
const { createApp } = require('./app');
const app = createApp();
const server = app.listen(3001, () => {
  console.log('Test app listening');
});
