const { Client, LocalAuth } = require('whatsapp-web.js');
const express = require('express');
const { body, validationResult } = require('express-validator');
const qrcode = require('qrcode');
const fileUpload = require('express-fileupload');
const fs = require('fs');
const cors = require('cors');

const app = express();
const port = 8001; // Porta diferente para evitar conflito

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(fileUpload({ debug: false }));
app.use(cors({
    origin: [
        'http://localhost:8080',
        'https://agencia-connectify.lovable.app/'
    ]
}));

// Diretório para armazenar dados do bot
const dirBot = './bot';
if (!fs.existsSync(dirBot)) {
    fs.mkdirSync(dirBot);
}

// Variável para armazenar o último QR Code
let lastQr = null;

// Inicialização do cliente WhatsApp
const client = new Client({
    authStrategy: new LocalAuth({ clientId: 'bot-shop' }),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu',
        ],
    },
});

client.on('qr', (qr) => {
    lastQr = qr;
    console.log('QR RECEBIDO');
});

client.on('ready', () => {
    lastQr = null;
    console.log('Bot pronto!');
});

client.on('authenticated', () => {
    lastQr = null;
    console.log('Bot autenticado!');
});

client.on('auth_failure', () => {
    lastQr = null;
    console.log('Falha na autenticação!');
});

client.on('disconnected', (reason) => {
    lastQr = null;
    console.log('Bot desconectado!', reason);
    client.initialize();
});

client.initialize();

// Rota para retornar o QR Code
app.get('/qr', (req, res) => {
    if (!lastQr) {
        return res.status(404).json({ error: 'QR Code não disponível ou sessão já autenticada.' });
    }
    qrcode.toDataURL(lastQr, (err, url) => {
        if (err) {
            return res.status(500).json({ error: 'Erro ao gerar QR Code.' });
        }
        res.json({ qr: url });
    });
});

// Rota para desconectar a sessão
app.post('/logout', async (req, res) => {
    try {
        await client.logout();
        res.json({ status: true, message: 'Sessão desconectada com sucesso.' });
    } catch (err) {
        res.status(500).json({ status: false, message: 'Erro ao desconectar sessão.', error: err });
    }
});

// Rota para enviar mensagem
app.post('/send-message', [
    body('number').notEmpty(),
    body('message').notEmpty(),
], async (req, res) => {
    const errors = validationResult(req).formatWith(({ msg }) => msg);
    if (!errors.isEmpty()) {
        return res.status(400).json({ message: errors.mapped() });
    }
    const number = req.body.number.replace(/\D/g, '');
    const message = req.body.message;
    const numberDDI = number.substring(0, 2);
    const numberDDD = number.substring(2, 4);
    const numberUser = number.substring(4, 13);
    let numberZDG;
    if (numberDDI !== '55') {
        numberZDG = number + '@c.us';
    } else {
        numberZDG = '55' + numberDDD + numberUser + '@c.us';
    }
    client.sendMessage(numberZDG, message).then(response => {
        res.status(200).json({
            status: true,
            message: 'Mensagem enviada com sucesso!',
            response: response
        });
    }).catch(err => {
        res.status(500).json({
            status: false,
            message: 'Erro ao enviar a mensagem!',
            error: err
        });
    });
});

// Rota de status (health check)
app.get('/status', (req, res) => {
    res.status(200).json({ status: 'ok' });
});

// Rota para status da sessão WhatsApp
app.get('/session-status', (req, res) => {
    let status = 'desconectado';
    if (client.info && client.info.wid) {
        status = 'autenticado';
    } else if (lastQr) {
        status = 'precisa autenticar';
    }
    res.status(200).json({ status });
});

app.listen(port, () => {
    console.log(`Servidor API rodando na porta ${port}`);
}); 