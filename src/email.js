const _ = require('lodash')
, dotenv = require('dotenv').config()
, request = require('request')
, qs = require('querystring')
, async = require('async')
, verifier = require('email-verify')
, Promise = require('bluebird')
, nodemailer = require('nodemailer')
, EmailTemplate = require('email-templates').EmailTemplate
, path = require('path')
, templateDir = path.join(__dirname, '..', 'email-templates');

module.exports = function(options){
    var seneca = this;
    
    const nodemailerTransport = options.nodemailerTransport || nodemailer.createTransport(process.env.SMTP_CONNECTION_STRING) || process.exit();
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
    
    this.add({role:'template', cmd:'render'}, (msg, done) => {
        var dir =  path.join(msg.templateDir || templateDir, msg.action);
        var template = new EmailTemplate(dir);

        template.render(msg.object, msg.locale, done);
    });
    

    this.add({role:'notify', cmd:'email'}, (msg, done) => {
        var user = msg.user?msg.user:msg.req$.body;
        var users = msg.users?msg.users:_.isArray(user)?user:[user];
        var action = msg.action;

        var sendCards = users.map((user) => {
            var dir =  path.join(templateDir, action);
            var newsletter = new EmailTemplate(dir);

            seneca.act({role:'template', cmd:'render', action: action, object: user, locale: user.locale}, (err, result) => {
                const mail = {
                    from: '"SOFTSKY Support" <gutsal.arsen@softsky.com.ua>',
                    to: user.email, // sender address
                    subject: result.subject,
                    text: result.text,
                    html: result.html
                };

                return nodemailerTransport.sendMail(mail,  (err, responseStatus) => { 
                    if (err) {
                        console.error(err);
                        //done(err);
                    } else {
                        responseStatus.response = responseStatus.response.toString('utf-8');
                        //done(null, responseStatus.response);
                    }
                });
                
            });
        });

        Promise.all(sendCards)
            .catch(done)
            .then(_.curry(done)(null));
    });
        
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

    //    this.add('init:api', function (msg, respond) {
    seneca.ready((respond) => {
	console.log('init:api called, email');
    	this.act('role:web',{use:{
    	    prefix: '/api/template',
    	    pin:    'role:template, cmd:*',
    	    map: {
    		render: { POST:true }
    	    }
    	}}, respond);
        
    	this.act('role:web',{use:{
    	    prefix: '/api/notify',
    	    pin:    'role:notify, cmd:*',
    	    map: {
    		email: { POST:true, suffix:'/:action' }
    	    }
    	}}, respond);
    });
    
};
