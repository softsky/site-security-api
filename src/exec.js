'use strict';
const _ = require('lodash')
, async = require('async')
//, async = require('neo-async')
, fs = require('fs')
, dotenv = require('dotenv') //.configure()
, request = require('request')
, qs = require('querystring')
, xml2js = require('xml2js')
, Promise = require('bluebird');


class TaskQueue {
    constructor(data) {
	this.data = data || [];
    }

    [Symbol.iterator]() {
	const self = this;		    
	return  {
	    next: function () {
		var result = (self.data.length?{value: self.data.shift(), done: false}:{done: true});
		return result;
	    }
	};
    }

    push(it){
	this.data.push(it);
    }

    add(it) {
	this.data.push(it);
    }

    iterator() {
	return this[Symbol.iterator]();
    }
};

module.exports = function api(options){
    var seneca = this;
    seneca//.use('run', { batch: require('../conf/commands.js')(options)})
	    .use('run', { batch: {
		whatweb: {
		    command: 'whatweb',
		    args: [`--log-json=/dev/stdout`],
		    cwd: __dirname
		},
	    }})
	.use('src/import', options);

    
    this.add({role:'exec',cmd:'scan', type: 'fast'}, (msg, respond) => {
	seneca
	    .actAsync({role:'exec', cmd: 'whatweb'})
	    .then((result) => {
		console.log('RESULT', result);
		respond(null, result);
	    })
	    .catch(respond);
    });

    // this.add({role:'exec', cmd:'sleep'}, (msg, respond) => {
    // 	const spec = {
    // 	    command: msg.cmd,
    // 	    args: msg.args || [msg.time || 1]
    // 	};
    // 	console.log('Returning spec', spec);
    // 	respond(null, spec);
    // });

    
    this.add({role:'exec', cmd:'whatweb'}, (msg, respond) => {
	var tmp = require('tmp');
	var tmpObj = tmp.fileSync({ mode: '0644', prefix: 'whatweb-', postfix: '.json' });
	console.log(tmpObj);
	seneca.sub('role:run,info:report',function(args){
	    if( 'whatweb' == args.report.name ) {
		console.log(args, args.report.spec.args);
		if(args.report.final){
		    var answer = JSON.parse(fs.readFileSync(tmpObj.name));
		    respond(null, answer);
		    //fs.unlink(tmpObj.name);
		}
	    }
	});
	
	seneca.act({role:'run',cmd:'execute',name:'whatweb', spec: {
	    args: ['-p','Django,WordPress,Joomla,Apache,HTTPServer,Country,IP,PoweredBy',`--log-json=${tmpObj.name}`, msg.host || process.env.SCAN_DOMAIN]
	}
	           }, (err, result) => {
	               console.log(err, result);
	           });
    });
    
    
    
    const wrap = (spec) => {
	var arr = ['tmux', 'new-window', spec.command].concat(spec.args);
	return {
	    command: arr[0],
	    args: arr.slice(1)
	};
    };


    const EXEC_QUEUE_LIMIT = 3, queue = []
    , tq = new TaskQueue(queue)
    , iter = tq.iterator();
    var EXEC_QUEUE_SIZE = 0;
    
    // this.wrap("role:run,cmd:execute", (msg, respond) => {
    // 	const peek = () => {
    // 	    const item = iter.next();
    // 	    if(item.done){
    // 		return;
    // 	    }
    
    // 	    var msg = item.value.msg,
    // 		seneca = item.value.this;

    // 	    console.log(seneca);
    // 	    seneca.prior(msg, (err, result) => {
    // 		if(err){
    // 		    console.log(err);
    // 		} else {
    // 		    console.log('Started', err, result);		    
    // 		    // setting up run:report callback
    // 		    seneca.sub({role:'run',info:'report', procid: result.procid}, (args) => {
    // 			EXEC_QUEUE_SIZE--;
    // 			console.log('Finished', args);
    // 			if(_.isFunction(args.report.spec.done)){
    // 			    args.report.spec.done(args);
    // 			}
    // 			if(queue.length){
    // 			    // peeking next to execute
    // 			    peek();
    // 			};
    // 		    });
    // 		};
    // 	    });
    // 	};
    
    // 	queue.push({this: this, msg: msg});
    // 	var resp;
    // 	if(++EXEC_QUEUE_SIZE < EXEC_QUEUE_LIMIT){
    // 	    peek();
    // 	    resp = {status:'scheduled', 'queue-size': queue.length};
    
    // 	} else {
    // 	    // let it live in queue till next tick
    // 	    resp = {status:'queued', 'queue-size': queue.length};
    // 	}
    // 	respond(null, resp);
    // });
    
//    this.add('init:api', function (msg, respond) {
    seneca.ready((respond) => {
	console.log('init:api called, exec');
    	this.act('role:web',{use:{
    	    prefix: '/api/exec',
    	    pin:    'role:exec, cmd:*',
    	    map: {
    		nmap: { GET:true, suffix:'/:command'},
    		whatweb: { GET:true, suffix:'/:host'},
		sleep: {GET: true, suffix:'/:command' }
    	    }
    	}}, respond);
    });

    //this.act({role:'exec', cmd:'scan', type:'fast'});
    // seneca.ready(() => {
    //     seneca.act('role:run,cmd:execute,name:whatweb',console.log.bind(console));
    // });

    
    
}

module.exports.TaskQueue = TaskQueue;
