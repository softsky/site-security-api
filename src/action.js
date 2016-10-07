'use strict';

const _ = require('lodash')
, dotenv = require('dotenv').config()
, request = require('request')
, validate = require('validate.js')
, async = require('async')
, verifier = require('email-verify');

const Promise = require('bluebird');

module.exports = function(options){
    var seneca = this;

    this.ready(() => {
                // extending Entity with async methods
                seneca.private$.exports.Entity.prototype.listAsync = 
                    Promise.promisify(seneca.private$.exports.Entity.prototype.list$);
                seneca.private$.exports.Entity.prototype.loadAsync = 
                    Promise.promisify(seneca.private$.exports.Entity.prototype.load$);
                seneca.private$.exports.Entity.prototype.saveAsync = 
                    Promise.promisify(seneca.private$.exports.Entity.prototype.save$);
    });
    this.add({role:'on', cmd:'online-scan', action:'start'}, (msg, respond) => {
        var card = msg.card || msg.req$.body;
        //+++VALIDATE
        const v = validate(card, {
            'url': {
                presence: true,
                format: {
                    pattern: /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9](?:\.[a-zA-Z]{2,})+$/,
                    message: function(value, attribute, validatorOptions, attributes, globalOptions) {
                        return validate.format("^%{domain} is not a valid domain", {
                            domain: value
                        });
                    }
                }
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
            console.log(v);
            // something is wrong
            respond(null, {status: 'error', reason: {msg: 'Invalid arguments', reason:v}});
            return;
        };
        //---VALIDATE

        var customer = seneca.make$('customer', {name: card.name, email:card.email});
        var scan = seneca.make$('scan', {url: card.url, 'scan-type': card['scan-type'], round:card['round'],coupon: card.coupon});
        
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
            .then(() => seneca.actAsync({role:'notify',cmd:'email', action: 'online-scan-start', user: card}))
            .then(() => { return {status:'scheduled'};})
            .then(_.curry(respond)(null))
            .catch(respond);
        
    });

    seneca.ready((respond) => {
	console.log('init:api called, action');
    	this.act('role:web',{use:{
    	    prefix: '/api/on',
    	    pin:    'role:on, cmd:*',
    	    map: {
    		'online-scan': { POST:true, suffix:'/:action' }
    	    }
    	}}, respond);
        
    });    
};
