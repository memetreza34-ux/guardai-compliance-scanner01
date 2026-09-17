const { createApp } = require('./app');
console.log('calling createApp');
const app = createApp();
console.log('called createApp');
setTimeout(() => console.log('still alive'), 2000);
