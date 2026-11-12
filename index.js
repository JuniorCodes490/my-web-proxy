const express = require('express');
const { createServer } = require('node:http');
const { uvPath } = require('@titaniumnetwork-dev/ultraviolet');
const wisp = require('@mercuryworkshop/wisp-js/server');
const path = require('node:path');

const epoxyPath = path.join(__dirname, 'node_modules', '@mercuryworkshop', 'epoxy-transport', 'dist');
const baremuxPath = path.join(__dirname, 'node_modules', '@mercuryworkshop', 'bare-mux', 'dist');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));

app.use('/uv/', (req, res, next) => {
  res.setHeader('Service-Worker-Allowed', '/');
  next();
}, express.static(uvPath));

app.use('/epoxy/', express.static(epoxyPath));
app.use('/baremux/', express.static(baremuxPath));

app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'public', 'index.html'));
});

const server = createServer(app);

server.on('upgrade', (req, socket, head) => {
  if (req.url.endsWith('/wisp/')) {
    wisp.routeRequest(req, socket, head);
  } else {
    socket.end();
  }
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
