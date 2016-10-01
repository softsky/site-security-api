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
    this.add({role:'on', cmd:'online-scan'}, (msg, respond) => {
        
        //+++VALIDATE
        const v = validate(msg.card, {
            url: {
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
            }
        });
        if(v){
            console.log(v);
            // something is wrong
            respond('Invalid arguments', v);
            return;
        };
        //---VALIDATE
        
        var ent$;

        Promise.promisify(seneca.make$)('customer', _.extend(msg.card,{}))
            .catch(console.log)
            .then((ent) => {
                var ent$ = ent.promisifyAll(ent, {suffix: 'Async'});
                // var ent$ = seneca 
                //         .make$('customer', _.extend(msg.card,{}));
                ent$.list$Async({email:msg.card.email})
                    .then(console.log.bind(console))
                    .then((items) => { 
                        if(items.length === 0){
                            ent$.save$((err, result) => {
                                if(err){
                                    console.log('--------------');
                                    console.log('ERROR:', err.msg);
                                    respond(err.msg, null);
                                } else {
                                    console.log('++++++++++++++');
                                    respond(null, result);
                                }
                            });
                            
                        }})
                    .catch(console.log.bind(console));
                
            });
        // if(ent$.list$({email:msg.card.email}, (err, items) => {
        //     } else {
        //         respond(null, {status:'Looks like entry already exists in the database'});
        //     }                        
        // }));
      });
};
