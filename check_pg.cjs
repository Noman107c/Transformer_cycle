const net = require('net');

const host = 'db.onropnbpchlhhrdbstns.supabase.co';
const port = 5432;

console.log(`Attempting to connect to ${host}:${port}...`);

const client = new net.Socket();

client.connect(port, host, () => {
    console.log(`Successfully connected to ${host}:${port}!`);
    client.destroy(); // kill client after server's response
});

client.on('error', (err) => {
    console.error(`Connection failed: ${err.message}`);
});

client.on('close', () => {
    console.log('Connection closed');
});
