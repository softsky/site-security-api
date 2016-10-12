const _ = require('lodash')
, dotenv = require('dotenv').config({silent:true})
, request = require('request')
, qs = require('querystring')
, async = require('async')
, verifier = require('email-verify')
, Promise = require('bluebird')
, validate = require('validate.js')
, nodemailer = require('nodemailer')
, EmailTemplate = require('email-templates').EmailTemplate
, path = require('path')
, templateDir = path.join(__dirname, '..', 'email-templates');

module.exports = function(options){
    var seneca = this;
    
    const nodemailerTransport = options.nodemailerTransport || process.exit();
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
			  }, () => {			      
			      setTimeout(loopDomains, 1);
			  });
    };

    loopDomains(); // initializing
    
    this.add({role:'template', cmd:'render'}, (msg, done) => {
        var dir =  path.join(msg.templateDir || templateDir, msg.action);
        var template = new EmailTemplate(dir);

        template.render(msg.object, msg.locale, done);
    });
    

    this.add('role:notify, cmd:email', (msg, respond) => {
        var user = msg.user || (msg.req$?msg.req$.body:undefined);
        if(!user) {
            respond(null, {status:'error', msg:'user is not defined'});
            return; // FIXME make logic more clear
        }
        if(user && _.isObject(user.name) === false){
            const splitted = user.name.split(/\ /);
            user.name = {
                first: splitted[0],
                last: splitted[1]
            };
        }
        const v = validate(user, {
            'url': {
                presence: false
            },
            'name.first': {
                presence: true
            },
            'name.last': {
                presence: true
            },
            email: {
                presence: true,
                email: true
            },
            'subject':{
                presence: false
            },
            'message':{
                presence: false
            }
        });
        
        if(v){
            console.log(v);
            // something is wrong
            respond(null, {status: 'error', reason: {msg: 'Invalid arguments', reason:v }});
        };

        var users = msg.users || _.isArray(user)?user:[user];
        var action = msg.action;

        var sendCards = users.map((user) => {
            var dir =  path.join(templateDir, action);
            var newsletter = new EmailTemplate(dir);
            return seneca.actAsync({role:'template', cmd:'render', action: action, object: user, locale: user.locale})
                .then((result) => {
                    const mail = {
                        from: '"SOFTSKY Site Security" <gutsal.arsen@softsky.com.ua>',
                        to: user.email, // sender address
                        bcc: msg.bcc,
                        subject: result.subject,
                        text: result.text,
                        html: result.html,
                        attachments: msg.attachments
                    };

                    return new Promise((resolve, reject) => {
                        nodemailerTransport.sendMail(mail,  (err, responseStatus) => { 
                            if (err) {
                                console.log('-------------- ERR:', err);
                                reject(err);
                            } else {
                                //responseStatus.response = responseStatus.response.toString('utf-8');
                                resolve(responseStatus);
                            }
                        });                        
                    });
                });
        });

        Promise.all(sendCards)
            .then((results) => respond(null, results), (err) => respond(err));
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
