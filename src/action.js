'use strict';

const _ = require('lodash')
, dotenv = require('dotenv').config({silent:true})
, request = require('request')
, validate = require('validate.js')
, async = require('async')
, verifier = require('email-verify')
, path = require('path')
, glob = require('glob');

const Promise = require('bluebird');

module.exports = function(options){
    var seneca = this;
    this
        .ready(() => {
            // extending Entity with async methods
            seneca.private$.exports.Entity.prototype.listAsync = 
                Promise.promisify(seneca.private$.exports.Entity.prototype.list$);
            seneca.private$.exports.Entity.prototype.loadAsync = 
                Promise.promisify(seneca.private$.exports.Entity.prototype.load$);
            seneca.private$.exports.Entity.prototype.saveAsync = 
                Promise.promisify(seneca.private$.exports.Entity.prototype.save$);

            glob.globAsync = Promise.promisify(glob);
        })
        .sub('role:run,info:report',function(args){
            const card = args.report.spec.extra;
            seneca.log.debug('INFO:args', card, args.report);
            let attachments;
            // TODO rework using Promises
            glob.globAsync(`/usr/share/sniper/loot/reports/sniper-${card.url}-*.txt`, {})
                .then(files => {
                    attachments = _(files).map((file) => {
                        return {
                            filename: path.basename(file),
                            path: file
                        };
                    }).last(); // FIME improve

                    seneca.log.info('Sending report for:' + card.url + ' to ' + card.email, attachments);
                    seneca.log.debug('Attachments:', attachments);
                    seneca.actAsync({role:'notify',cmd:'email', action: 'online-scan-finish'},
                                    {user: card,
                                     bcc: 'info@softsky.com.ua',
                                     attachments: attachments});                
                });            
	})    
        .add({role:'on', cmd:'online-scan', action:'start'}, (msg, respond) => {
            var card = msg.card || (msg.req$?msg.req$.body:undefined);
            //+++VALIDATE
            const v = validate(card, {
                'url': {
                    presence: true,
                    format: {
                        pattern: /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9](?:\.[a-zA-Z]{2,})+$|^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/,
                        message: function(value, attribute, validatorOptions, attributes, globalOptions) {
                            return validate.format("^%{domain} is not a valid domain", {
                                domain: value
                            });
                        }
                    }
                },
                'email':{
                    'email': true,
                    'presence': true
                },
                'name.first': {
                    presence: true
                },
                'name.last':{
                    presence: true
                },
                'scan-type':{
                    presence: true
                },
                'round':{
                    presence: true
                },
                'coupon':{
                    presence: false,
                    format: {
                        pattern: /^[\w\d]{6}/
                    }
                }            
            });
            if(v){
                seneca.log.debug(v);
                // something is wrong
                respond(null, {status: 'error', reason: {msg: 'Invalid arguments', reason:v}});
                return;
            } else {
                seneca.log.info('Parameters valid, starting scan for:' + card.url);
            }
            //---VALIDATE

            var customer = seneca.make$('customer', {name: card.name, email:card.email});
            var scan = seneca.make$('scan', {url: card.url, 'scan-type': card['scan-type'], round:card['round'], coupon: card.coupon});
            
            customer.listAsync({email:card.email})
                .then((items) => { 
                    if(items.length === 0){
                        return customer.saveAsync();
                    } else {
                        // item already in database
                        return Promise.resolve(items[0]);
                    }
                })
                .then((c) => scan.customer_id = c.id)
                .then(() => scan.saveAsync())
                .then(() => seneca.actAsync({role:'notify',cmd:'email', action: 'online-scan-start'}, {user: card}))
                .then(() => { return {status:'scheduled'};})
                .then(_.curry(respond)(null))
            // this executes 
                .then(() => {
                    glob.globAsync(`/usr/share/sniper/loot/reports/sniper-${card.url}-*.txt`)
                        .then(data => {
                            if(data.length > 0){
                                // sending last report
                                seneca.log.info('Cached report found');
                                return seneca.actAsync('role:run,info:report', {
                                    report: {
                                        spec: {
                                            extra: card
                                        }
                                    }
                                });
                            } else {
                                // invoking execution
                                seneca.log.info('Cached report not found, running scan');
                                return seneca.actAsync({role:'exec', cmd: 'sniper'}, {host: card.url, extra: card});                                
                            }
                        });
                })
                .catch(respond);
            
        });

    seneca.ready((respond) => {
	seneca.log.info('init:api called, action');       	
        
    	this.act('role:web',{use:{
    	    prefix: '/api/on',
    	    pin:    'role:on, cmd:*',
    	    map: {
    		'online-scan': { POST:true, suffix:'/:action' }
    	    }
    	}}, respond);
        
    });    
};
