const http = require('http');
const express = require('express');
const app = express();
const server = http.createServer(app);
server.listen(3007, () => console.log('Listening 3007'));
