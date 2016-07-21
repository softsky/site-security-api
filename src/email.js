const _ = require('lodash')
, dotenv = require('dotenv') //.configure()
, request = require('request')
, qs = require('querystring')
, seneca = require('seneca')();


module.exports = function exec(options){

    this.add({role: 'validate', cmd: 'email'}, function (msg, done) {
	const email = 'webmaster@' + msg.host;
	const params = {
	    access_key:process.env.APILAYER_KEY,
	    smtp:1,
	    format:1,
	    email:email
	};

	var entity = seneca.make$('email');
	if(entity.list({email: email})){
	    done(null, {status: 'OK', cached: entity});
	} else {
	    request('http://apilayer.net/api/check?' + qs.stringify(params), (err, response, body) => {
		entity
	    	    .data$(response)
	    	    .save$((err, obj) => {
	    		if(err){
	    		    throw new Error(err);
	    		} else {
	    		    console.log(`Saved: ${obj}`);
	    		}
	    	    });
	    });
	}
	done(null, {status: 'OK'});
    });
};
