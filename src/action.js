'use strict';

const _ = require('lodash')
, dotenv = require('dotenv').config()
, request = require('request')
, validate = require('validate.js')
, async = require('async')
, verifier = require('email-verify')
, nodemailer = require('nodemailer');

const Promise = require('bluebird');
// var seneca = Promise.promisifyAll(require('seneca')()
// 				  .use('entity'), {suffix: 'Async'});

const seneca = require('seneca')().use('src/entity');

module.exports = function(options){
    const self = this;
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
            firstName: {
                presence: true
            },
            lastName: {
                presence: true
            }
            
        });
        if(v){
            console.log(v);
            // something is wrong
            respond('Invalid arguments', v);
            return;
        };
        const card = msg.card;
        console.log(card);
        //self.act({role:'entity',cmd:'save',name:'customers',body:_.extend(msg.card,{})}, respond);

        // create reusable transporter object using the default SMTP transport
        var transporter = nodemailer.createTransport(`smtps://${process.env.SMTP_USER.replace(/@/,'%40')}:${process.env.SMTP_PASSWORD}@smtp.gmail.com`);

        // setup e-mail data with unicode symbols
        var mailOptions = {
            from: '"Arsen A. Gutsal" <gutsal.arsen@softsky.com.ua',
            to: `"${card.firstName} ${card.lastName} ?" <${card.email}>`, // sender address
            bcc: `scan@softsky.com.ua`,
            subject: `✔ ${card.url} security scan has been started`, // Subject line
            text: `Security Scan of ${card.url} has been started. We will send you report once it completes`, // plaintext body
            html: `Security Scan of <b>${card.url}</b> has been started. We will send you report once it completes` // html body
        };

        // send mail with defined transport object
        transporter.sendMail(mailOptions, function(error, info){
            if(error){
                console.log(error);
                return;
            }
            console.log('Message sent: ' + info.response);
        });
        //---VALIDATE
        // self.actAsync({role:'entity',cmd:'save',name:'customers',body:_.extend(msg.card,{})})p
        //     .then(() => {
        //         respond(null, {status: 'scheduled'});
        //     })
        //     .catch(respond);
    });
};
