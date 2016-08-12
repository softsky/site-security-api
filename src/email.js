const _ = require('lodash')
, dotenv = require('dotenv') //.configure()
, request = require('request')
, qs = require('querystring')
, async = require('async')
, verifier = require('email-verify')
, seneca = require('seneca')()
      .use('entity')
      .use('mongo-store', require('./options.json').mongo);



module.exports = function(options){
    const domains = []
    ,  loopDomains = () => {
	async.eachOfLimit(domains, 25,
			  (domain, key, done) => {
			      console.log(domain);
			      async.eachOfLimit([ "webmaster", "tech", "jobs", "job", "hire", "team", "hr", "dev", "developers", "info", "contact", "employment", "recruitment", "recruiting", "recruit", "hiring" ], 5, (val, idx, cb) => {
				  const email = val + '@' + domain;
				  console.log('Verifying', email);
				  verifier.verify( email, function( err, info ){
				      if(err) {
					  console.log('Error', err);
					  cb(err);
				      } else {
					  console.log(info);
					  seneca.act({role:'queue', cmd:'add', msg: _.extend({name:'email'}, info)});
					  cb();					  
				      }
				  });
			      }, done);
			  } , () => {
			      
			      setTimeout(loopDomains, 1);
			  });
    };

    loopDomains(); // initializing
    
    this.add({role:'discover', cmd:'email'}, function(msg, done){
	domains.push(msg.domain || msg.host);
	done(null, {status: 'started'});
    });
    
    this.add({role: 'verify', cmd: 'email'}, function (msg, done) {
	verifier.verify( msg.email, function( err, info ){
	    if(err) {
		done(null, {error: err, success: false});
	    } else {
		done(null, {info: info});
	    }
	});	
    });
    
    this.add({role: 'validate', cmd: 'email'}, function (msg, done) {
	const email = msg.email;
	const params = {
	    access_key:process.env.APILAYER_KEY,
	    smtp:1,
	    format:1,
	    email:email
	};

	var entity = seneca.make$('email');
	entity.list$({email: email}, (err, entities) => {
	    if(err){
		throw new Error(err);
	    }
	    if(entities && entities.length){
		done(null, _.extend({status: 'CACHED'}, entities["0"]));
	    } else {
		request('http://apilayer.net/api/check?' + qs.stringify(params), (err, response, body) => {
		    console.log(response, body);
		    entity
			.data$(JSON.parse(body))
			.save$((err, obj) => {
	    		    if(err){
				done(null, _.extend({status: 'ERROR'}, err));
	    			throw new Error(err);
	    		    } else {
	    			console.log(`Saved: ${obj}`);
				done(null, _.extend({status: 'NEW'}, obj));
	    		    }
	    		});
		});
	

	    }
	});
    });
};
