var seneca = require('seneca')()
    .use('src/queue')
    .use('src/exec');

var express = require('express')
, app = express()

app.use( seneca.export('web') )

seneca.add({role:'entity', cmd:'list'}, function (msg, respond){
    console.log('ENTITY');
    seneca
	.make$(msg.name)
    	.list$(_.pickBy(msg, (val, key) => { return key.startsWith('q.'); }), (err, entities) => {
	    if(err){
		respond(null, {error: err});
	    } else {
    		respond(null, entity);
	    }
    	});
});

seneca.add('role:web',{use:{
    // define some routes that start with /api/v1
    prefix: '/api',

    // use action patterns where role has the value 'api' and cmd has some defined value
    pin: {role:'entity',cmd:'*'},

    //pin: {role:'*',cmd:'*'},

    // for each value of cmd, match some HTTP method, and use the
    // query parameters as values for the action
    map:{
    	list: {GET:true},
    	email: {GET:true},          // explicitly accepting GETs
    	whatweb: {GET:true,POST:true} // accepting both GETs and POSTs
    }
}});

// This is how you integrate Seneca with Express

app.listen(process.env.NODE_PORT || 3000)

