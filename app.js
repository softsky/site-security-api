var fs = require('fs');
var http = require('http');
var https = require('https');
var privateKey  = fs.readFileSync(__dirname + '/sslcert/server.key', 'utf8');
var certificate = fs.readFileSync(__dirname + '/sslcert/server.crt', 'utf8');

var options = require('./src/options.json');
var [protocol, host, port] = (process.env.MONGODB_PORT || "tcp://localhost:27017").split(/\:/);
var report_path = process.env.REPORT_PATH || '/data';
options.mongo.host = host.replace(/\/\//,''); options.mongo.port = port; //FIXME use destructuring assignments

options.report_path = report_path;
console.log(options.mongo);

const PORT = parseInt(process.env.NODE_PORT) || 3001;
var seneca = require('seneca')()
// .use('src/queue')
// .use('src/email')
// .use('src/routes')
    .use('web')
    .use('src/entity', options)
    .use('src/exec', options);


var app = require('express')()
 	.use(require('body-parser').json())
 	.use( seneca.export('web') );

var httpServer = http.createServer(app);
var credentials = {key: privateKey, cert: certificate};
var httpsServer = https.createServer(credentials, app);

// // This is how you integrate Seneca with Express
httpServer.listen(PORT);
httpsServer.listen(PORT + 443);



