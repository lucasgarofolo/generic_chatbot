const {Client, LocalAuth} = require('whatsapp-web.js');
const express = require('express');
const {body, validationResult} = require('express-validator');
const socketIO = require('socket.io');
const qrcode = require('qrcode');
const http = require('http');
const fileUpload = require('express-fileupload');
const port = 8000;
const app = express();
const server = http.createServer(app);
const io = socketIO(server);
const fs = require('fs');

app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use(fileUpload({
    debug: true
}));
app.use("/", express.static(__dirname + "/"));
app.get("/", (req, res) => {
    res.sendFile('index.html', {root: __dirname});
});
const dirBot = './bot';
if (!fs.existsSync(dirBot)) {
    fs.mkdirSync(dirBot);
}
const client = new Client({
    authStrategy: new LocalAuth({ clientId:'bot-shop' }),
    puppeteer: { 
        headless: true, 
        args: [
            '--no-sandbox', 
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            //'--single-process',
            '--disable-gpu'
] }
});
client.initialize();
io.on('connection', function(socket) {
    socket.emit('message','Bot iniciado!');
    socket.emit('qr','./icon.svg');
    client.on('qr', (qr) => {
        console.log('QR RECEIVED', qr);
        qrcode.toDataURL(qr, (err, url) => {
            socket.emit('qr', url);
            socket.emit('message','QR Code recebido, aponte a câmera do seu celular!');

        });
    });
    client.on('ready', () => {
        socket.emit('ready','Bot pronto!');
        socket.emit('message','Bot pronto!');
        socket.emit('qr','./check.svg');
        console.log('Dispositivo pronto!');
    });
    client.on('authenticated', () => {
        socket.emit('authenticated','Bot autenticado!');
        socket.emit('message','Bot autenticado!');
        console.log('Bot autenticado!');
    });
    client.on('auth_failure', function() {
        socket.emit('auth_failure','Falha na autenticação!');
        socket.emit('message','Falha na autenticação!');
        console.log('Falha na autenticação!');
    });
    client.on('change_state', state => {
        console.log('Status da conexão', state);
    });
    client.on('disconnected', (reason) => {
        socket.emit('disconnected','Bot desconectado!');
        socket.emit('message','Bot desconectado!');
        console.log('Bot desconectado!', reason);
        client.initialize();
    });
});

app.post('/send-message', [
    body('number').notEmpty(),
    body('message').notEmpty(),
], async(req,res) => {
    const errors = validationResult(req).formatWith(({msg}) => {
        return msg;
    });

    if(!errors.isEmpty()) {
        return res.status(400).json({
            message: errors.mapped(),
        });
    }


    const number = req.body.number.replace(/\D/g, '');
    const message = req.body.message;
    const numberDDI = number.substring(0, 2);
    const numberDDD = number.substring(2, 4);
    const numberUser = number.substring(4,13);

//    console.log(number);
//    console.log(message); 
//    console.log(numberDDI);
//    console.log(numberDDD);
//    console.log(numberUser);
//    client.sendMessage("+5512981669841@c.us", "Olá!");


    if(numberDDI !== "55"){
        const numberZDG = number + "@c.us";
        client.sendMessage(numberZDG, message).then(response => {
            res.status(200).json({
                status: true,
                message: "Mensagem enviada com sucesso!",
                response: response
            });
        }).catch(err => {
            res.status(400).json({
                status: false,
                message: "Erro ao enviar a mensagem!",
                error: err
            });
        });
    } else if(numberDDI === "55" && parseInt(numberDDD) <= 30) {
        const numberZDG = "55" + numberDDD + numberUser + "@c.us";
        console.log(numberZDG)
        client.sendMessage(numberZDG, message).then(response => {
            res.status(200).json({
                status: true,
                message: "Mensagem enviada com sucesso!",
                response: response
            });
        }).catch(err => {
            res.status(500).json({
                status: false,
                message: "Erro ao enviar a mensagem!",
                error: err
            });
        });
    }else if (numberDDI === "55" && parseInt(numberDDD) > 30){
        const numberZDG = "55" + numberDDD + numberUser + "@c.us";
        client.sendMessage(numberZDG, message).then(response => {
            res.status(200).json({
                status: true,
                message: "Mensagem enviada com sucesso!",
                response: response
            });
        }).catch(err => {
            res.status(500).json({
                status: false,
                message: "Erro ao enviar a mensagem!",
                error: err
            });
        });
    }
});

// client.on('message', async message => {
//     if(message.body === '') {
//         message.reply('pong');
//     }
// });

server.listen(port, function() {
    console.log('Servidor rodando na porta', port);
});