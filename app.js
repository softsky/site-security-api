var seneca = require('seneca')()
	.use('src/queue')
	.use('src/email')
	.use('src/entity')
	.use('src/routes')
	.use('src/exec');

// var express = require('express')
// , app = express();

// app.use( seneca.export('web') );

// // This is how you integrate Seneca with Express
// app.listen(process.env.NODE_PORT || 3000);
seneca.listen({transport:'http', port:3000});

