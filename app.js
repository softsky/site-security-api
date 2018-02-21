var fs = require('fs');
var http = require('http');
var https = require('https');
var nodemailer = require('nodemailer');
var dotenv = require('dotenv').config({silent: true});
var _ = require('lodash');

var privateKey  = fs.readFileSync(__dirname + '/sslcert/server.key', 'utf8');
var certificate = fs.readFileSync(__dirname + '/sslcert/server.crt', 'utf8');

var options = require('./src/options.json');
var [mongo_protocol, mongo_host, mongo_port] = (process.env.MONGODB_PORT || "tcp://mongo:27017").split(/\:\/\/|\:/),
    [redis_protocol, redis_host, redis_port] = (process.env.REDIS_PORT || 'tcp://redis:6379').split(/\:\/\/|\:/);
var report_path = process.env.REPORT_PATH || '/data';



options.mongo = _.extend(options.mongo, {
    host: mongo_host,
    port :mongo_port
}); //FIXME use destructuring assignments
options.nodemailerTransport = nodemailer.createTransport(process.env.SMTP_CONNECTION_STRING);
// options.nodemailerTransport = nodemailer.createTransport({
//     transport: 'smtp',    
//     host: process.env.SES_SMTP_HOST,
//     port: process.env.SES_SMTP_PORT,
//     auth: {
//         user: process.env.SES_SMTP_USERNAME,
//         pass: process.env.SES_SMTP_PASSWORD        
//     },
//     secure: true,
//     rateLimit: 1,
//     maxMessages: 100
// });

options.report_path = report_path;
console.log(options.mongo);

const PORT = parseInt(process.env.NODE_PORT || process.env.PORT) || 3001;

var Promise = require('bluebird')
, seneca = Promise.promisifyAll(require('seneca')())
        .use('redis-queue-transport',{
            'redis-queue': {
                timeout: 500,
                type: 'redis-queue',
                host: redis_host,
                port: redis_port
            }
        })
        .use('web')
        .use('entity', options)
        .use('mongo-store', options.mongo)
        .use('src/email', options)
        .use('src/social/linkedin', options)
        .use('src/action', options)
        .use('src/exec', options)
        .use('src/health', options)
        .listen( {type:'redis-queue'} ),
    express = require('express');


var app = express()
 	.use(require('body-parser').json())
 	.use(seneca.export('web'))
        .use('/ref/generate/linkedin', (req, res, next) => {
            var ref = req.query;
            console.log(ref);
            res.redirect('mailto:gutsal.arsen@softsky.com.ua?subject=bestSubject&body=Hiall');
            next();
        });

var httpServer = http.createServer(app);
var credentials = {key: privateKey, cert: certificate};
var httpsServer = https.createServer(credentials, app);

// This is how you integrate Seneca with Express
httpServer.listen(PORT);
httpsServer.listen(PORT + 443);
