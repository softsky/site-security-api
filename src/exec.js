'use strict';
const _ = require('lodash')
, async = require('async')
//, async = require('neo-async')
, fs = require('fs')
, dotenv = require('dotenv').config({silent:true})
, request = require('request')
, qs = require('querystring')
, xml2js = require('xml2js')
, Promise = require('bluebird');


module.exports = function api(options){
    var seneca = this;
    seneca.use('run', { batch: require('../conf/commands.js')(options)})
	.use('src/import', options)
        .sub('role:run,info:report',function(args){
            if(args.report.spec.final){
	        if( 'whatweb' == args.report.name ) {
		    console.log(args, args.report.spec.args);
		    if(args.report.final){
		        var answer = JSON.parse(fs.readFileSync(tmpObj.name));
		        respond(null, answer);
		        //fs.unlink(tmpObj.name);
		    }
	        }
            } else {
                console.log(args.report.name);
            }
	})
        .add({role:'exec', cmd:'whatweb'}, (msg, respond) => {
	    var tmp = require('tmp');
	    var tmpObj = tmp.fileSync({ mode: '0644', prefix: 'whatweb-', postfix: '.json' });
	    console.log(tmpObj);
	    
	    seneca.act({role:'run',cmd:'execute',name:'whatweb', spec: {
	        args: ['-p','Django,WordPress,Joomla,Apache,HTTPServer,Country,IP,PoweredBy',`--log-json=${tmpObj.name}`, msg.host || process.env.SCAN_DOMAIN]
	    }
	               }, (err, result) => {
	                   console.log(err, result);
	               });
        })
        .add({role:'exec', cmd:'sniper'}, (msg, respond) => {
	    seneca.act({role:'run',cmd:'execute',name:'sniper'}, {spec: {
	        args: [msg.host, 'report'],
                extra:  msg.extra
	    }}, (err, result) => {
                respond(err, result);
	    });
        });
    
   

    const EXEC_QUEUE_LIMIT = 3;
    
    seneca.ready((respond) => {
	console.log('init:api called, exec');
    	this.act('role:web',{use:{
    	    prefix: '/api/exec',
    	    pin:    'role:exec, cmd:*',
    	    map: {
    		whatweb: { GET: true, suffix:'/:host'},
                sniper: { GET: true, suffix:'/:host'},
		sleep: {GET: true, suffix:'/:command' }
    	    }
    	}}, respond);
    });
};

