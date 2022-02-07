

// with commonJS
const { Client } = require('node-scp')

// with ES Module
import { Client } from 'node-scp'

Client({
    host: '',
    port: 22,
    username: 'username',
    password: 'password',
    // privateKey: fs.readFileSync('./key.pem'),
    // passphrase: 'your key passphrase',
}).then(client => {
    client.uploadDir('./local/dir', '/server/path')
        .then(response => {
            client.close() // remember to close connection after you finish
        })
        .catch(error => {})
}).catch(e => console.log(e))