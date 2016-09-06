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

    this.add({role: 'exec', cmd:'whatweb'}, function (msg, done) {
	const filePath = `${options.report_path}/${msg.cmd}.xml`;

	const spec = wrap({
	    cwd: options.report_path,
	    command: msg.cmd,
	    args: [`--log-xml=${filePath}`, 'http://' + msg.host]
	});
	done(null, spec);
    });

    this.add({role:'exec', cmd:'nmap'}, function (msg, done) {
	const filePath = `${options.report_path}/${msg.cmd}.xml`;

	const spec = wrap({
	    cwd: options.report_path,
	    command: 'nmap',
	    args: ['-oX',filePath, '--script','vuln', '-Pn', msg.host]
	});
	done(null, spec);
    });
        

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
		//console.log('Item:', item, 'Key:', key);
		self.prior(item, (err, spec) => {
		    console.warn('Prior returned:', err, spec);
		    seneca.act({role:'run', cmd:'execute', name: spec.command, spec: spec}, (err, result) => {
			if(err){
			    console.log(err);
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
		    console.error('Error occured', err);
		}
		clearTimeout(timer);
		timer = 0;
		console.log('All processes finished');
		//schedule_new();
		//respond(null, {status: 'completed'});
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
    		nmap: { GET:true, suffix:'/:host' },
    		whatweb: { GET:true, suffix:'/:host' }
    	    }
    	}}, respond);
    });
};
