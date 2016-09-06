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
        

    var q = [], timer = 0;
    
    this.wrap("role:exec", function(msg, respond) {
	var self = this
	, schedule_new = () => {
	    timer = setTimeout(asyncQueueExecutor, 1);
	}
	, asyncQueueExecutor = () => {
	    class TaskQueue {
		constructor(data) {
		    this.data = data;
		}

		[Symbol.iterator]() {
		    const self = this;		    
		    return  {
			next: function () {
			    return self.data.length > 0?{value: self.data.pop(), done: false}:{done: true};
			}
		    };
		}
	    };
	    
	    const EXEC_QUEUE_LIMIT = 3;
	    
	    async.eachOfLimit(new TaskQueue(q), EXEC_QUEUE_LIMIT, (item, key, callback) => {
		self.prior(item, (err, spec) => {
		    console.warn('Prior returned:', err, spec);
		    seneca.act({role:'run', cmd:'execute', name: spec.command, spec: spec}, (err, result) => {
			if(err){
			    console.error(err);
			}
			console.log('Started', err, result);

			// setting up run:report callback
			seneca.sub({role:'run',info:'report', procid: result.procid}, (args) => {
			    console.log('Finished', args);
			    if(_.isFunction(args.report.spec.done)){
				args.report.spec.done(args);
			    }
			    callback(null, args);		    
			});
		    });
		});
	    }, (err) => {
		if(err){
		    console.error('An Error occured', err);
		}
		clearTimeout(timer);
		timer = 0;
		console.log('All processes finished');
	    });
	};
	q.push(msg);
	respond(null, {status:'scheduled', len: q.length});
	if(q.length){
	    if(timer){
		// let this other timer work
		console.log('Not scheduling new queue. Let existing queue work');
	    } else {
		console.log('Scheduling new queue.'); 
		schedule_new();
	    }
	};
    });
    
    this.add('init:api', function (msg, respond) {
    	this.act('role:web',{use:{
    	    prefix: '/api/exec',
    	    pin:    'role:exec,cmd:*',
    	    map: {
    		nmap: { GET:true /*, suffix:'/:host'*/ },
    		whatweb: { GET:true /*, suffix:'/:host'*/ }
    	    }
    	}}, respond);
    });
};
