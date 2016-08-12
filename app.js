var fs = require('fs');
var http = require('http');
var https = require('https');
var privateKey  = fs.readFileSync('sslcert/server.key', 'utf8');
var certificate = fs.readFileSync('sslcert/server.crt', 'utf8');

var seneca = require('seneca')()
// .use('src/queue')
// .use('src/email')
// .use('src/routes')
	.use('src/entity')
	.use('src/exec');
	// .listen({
	//     type: 'http',
	//     port: '3000',
	//     host: '0.0.0.0',
	//     protocol: 'http'
	// });



var app = require('express')()
 	.use(require('body-parser').json())
 	.use( seneca.export('web') );

var httpServer = http.createServer(app);
var credentials = {key: privateKey, cert: certificate};
var httpsServer = https.createServer(credentials, app);

// // This is how you integrate Seneca with Express
//app.listen(process.env.NODE_PORT || 3000);
httpServer.listen(process.env.NODE_PORT || 3000);
httpsServer.listen((process.env.NODE_PORT || 3000) + 443);



