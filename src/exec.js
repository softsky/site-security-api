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
        

    var q = [];

    
    this.wrap("role:exec", function(msg, respond) {
	var self = this,
	    timer = 0,
	    execute_process = (item, key, callback) => {
		console.log('Item:', item, 'Key:', key);
		self.prior(item, (err, spec) => {
		    console.warn('Prior returned:', err, spec);
		    seneca.act({role:'run', cmd:'execute', name: spec.command, spec: spec}, (err, result) => {
			console.warn('Finished', err, result);
			respond(null, {status:'scheduled', procid: result.procid});

			// setting up run:report callback
			seneca.sub({role:'run',info:'report', procid: result.procid}, callback);
		    });
		});
	    };
	    
	const asyncQueueExecutor = () => {
	    const EXEC_QUEUE_LIMIT = 2;
	    async.eachOfLimit(q, EXEC_QUEUE_LIMIT, execute_process, () => {
		clearTimeout(timer);
		timer = 0;
		console.log('All process finished');
		//respond(null, {status: 'completed'});
	    });
	};
	q.push(msg);
	if(q.length){
	    if(timer){
		// let this other timer work
	    } else {
		timer = setTimeout(asyncQueueExecutor, 1);
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
