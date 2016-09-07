'use strict';

const wrap = (spec) => {
    var arr = ['tmux', 'new-window', spec.command].concat(spec.args);
    return {
	command: arr[0],
	args: arr.slice(1)
    };
};

module.exports = function api(options){
    const _ = require('lodash')
    , async = require('async')
    //, async = require('neo-async')
    , spawn = require('child_process').spawn
    , fs = require('fs')
    , dotenv = require('dotenv') //.configure()
    , request = require('request')
    , qs = require('querystring')
    , xml2js = require('xml2js')    
    , seneca = require('seneca')()
	      .use('run', { batch: require('../conf/commands.js')(options)})
	      .use('entity')
	      .use('src/import', options);
    
    // this.add({role:'exec',cmd:'sleep'}, (msg, respond) => {
    // 	const spec = {
    // 	    command: msg.cmd,
    // 	    args: [msg.time || 1]
    // 	};
    // 	console.log('Returning spec', spec);
    // 	respond(null, spec);
    // });

    class TaskQueue {
	constructor(data) {
	    this.data = data;
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
    };
    const EXEC_QUEUE_LIMIT = 3, queue = []
    , iter = new TaskQueue(queue)[Symbol.iterator]();
    var EXEC_QUEUE_SIZE = 0;
    
    this.wrap("role:exec", function(msg, respond) {
	const self = this
	, peek = () => {
	    const item = iter.next();
	    console.log('Item:', item);
	    if(item.done){
		return;
	    }

	    self.prior(item.value, (err, spec) => {
		console.warn('Prior returned:', err, spec);
		seneca.act({role:'run', cmd:'execute', name: spec.command, spec: spec}, (err, result) => {
		    if(err){
			console.error(err);
		    } else {
			EXEC_QUEUE_SIZE++;
			console.log('Started', err, result);

			// setting up run:report callback
			seneca.sub({role:'run',info:'report', procid: result.procid}, (args) => {
			    EXEC_QUEUE_SIZE--;
			    console.log('Finished', args);
			    if(_.isFunction(args.report.spec.done)){
				args.report.spec.done(args);
			    }
			    if(queue.length){
				// peeking next to execute
				peek();
			    };
			});
		    }
		});
	    });
	    
	};
	    
	queue.push(msg);
	if(EXEC_QUEUE_SIZE < EXEC_QUEUE_LIMIT){
	    peek();
	    respond(null, {status:'scheduled', msg: msg, 'queue-size': queue.length});
	} else {
	    // let it live in queue till next tick
	    respond(null, {status:'queued', msg: msg, 'queue-size': queue.length});	    
	}
    });
    
    this.add('init:api', function (msg, respond) {
	console.log('init:api called, exec');
    	this.act('role:web',{use:{
    	    prefix: '/api/exec',
    	    pin:    'role:exec,cmd:*',
    	    map: {
    		nmap: { GET:true, suffix:'/:command'},
    		whatweb: { GET:true,suffix:'/:command'},
		sleep: {GET: true }
    	    }
    	}}, respond);
    });
};
