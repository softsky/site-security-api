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
        .add('role:contact,cmd:info', (msg, done) => {
            // validate(msg, {
            //     email: {
            //         presence: true,
            //         email: true
            //     }
            // }) && 
                ((email) => {
                console.log(email);
                    request.get({
                        url: `https://api.linkedin.com/v1/people/email=${email}:(first-name,last-name,headline,location,distance,positions,twitter-accounts,im-accounts,phone-numbers,member-url-resources,picture-urls::(original),site-standard-profile-request,public-profile-url,relation-to-viewer:(connections:(person:(first-name,last-name,headline,site-standard-profile-request,picture-urls::(original)))))`,
                        headers:{
                            'Content-type':'application/json',
                            'Cookie':'bcookie="v=2&f6f552f2-90dd-43bc-8399-2791cb7734c7"; ELOQUA=GUID=A3A570C10C3E49E783551EACF4B11770; BKUT=1443199558; __cfduid=dd9ad8a2805a0d4a7c05c60acb05a34921463592527; __utma=23068709.783762804.1441632039.1476380882.1476460916.2; __utmz=23068709.1476380882.1.1.utmcsr=republic.co|utmccn=(referral)|utmcmd=referral|utmcct=/softsky-company; __utmv=23068709.user; _leo_profile=""; VID=V_2016_10_22_08_1638; SID=3eae5eea-7719-4521-b66a-e5db53420429; sdsc=1%3A1SZM1shxDNbLt36wZwCgPgvN58iw%3D; liap=true; _lipt=0_0jpXAcoLoRE4XPEB6OSkNThRf0O_GsO9nwvfNH5Q2JRRN5SZjRY1lT684d7F_brjBDmUtJwvnp_4oH2s2umeCSAVqSbZr4tBSHaqSfvoGOEi6opmJ6rlc5SkPOshl3IJdTs8s1Uwcj6ti2uEAALFhdOUzdk8bE3R6sCZB1HBIWhO6MoEhv3V_XrUCKuZm8x9EDg0ZJL3Fccs5HXh4C18ay6eEy2ao50t3clJGv-gtN5YfcQlaKYVJ00ROEQILchoQ2GiSs3FQxps-cPhp6OtCj8m2S5G-yfkWm28bA_OqITXHnL1Sysw-EZEoCKm9X1KvEeDDJ50bg1VT_gXJjnO9aGASNm3GO7vMlc9H2LhVFVfRlj0YIwxZOD0jALFiK0SKm28TLE3HXnf6XJ0RGFv6NPfqjDDosA4P1FjXqy0mlzC33IzFoGg9UH0fDn7MmM1Gs9Z6adA3aXD0LfYwrSNPv; lidc="b=TB05:g=604:u=281:i=1477309167:t=1477333007:s=AQFLv9PqeL1WGVZEyivt7hPVYyMf8pWQ"; lang="v=2&lang=en-us&c="; _ga=GA1.2.783762804.1441632039; _gat=1',
                            'auth_token':'Z9q38DnEdFVjq4RYNYqUyvO71K_xY5q3_iwK',
                            'x-li-format': 'json'
                        }
                    }, (err, response, body) => {
                        console.log(arguments, body);
                        done(null, {status:'ok'});
                });
                
            })(msg.email);
        })
        .ready((respond) => {
	    seneca.log.info('init:api called, social/linkedin');
            
    	    this.act('role:web',{use:{
    	        prefix: '/api/contact/linkedin',
    	        pin:    'role:contact, cmd:*',
    	        map: {
    		    'info': { GET:true, suffix:'/:email' }
    	        }
    	    }}, respond);
            
        });   
};
