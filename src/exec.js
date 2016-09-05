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
    	// if (q.length < process.env.EXEC_QUEUE_LIMIT || 50) {
    	//     var func = function(err, spec) {
    	// 	if (err){
    	// 	    respond(err);
    	// 	} else {
    	// 	    var old = q.pop() || {self:this, msg:msg};
    	// 	    if(old){
	// 		const filePath = `${options.report_path}/${old.msg.cmd}.xml`;
	// 		console.log('Message:', msg.args);
	// 		// if(fs.existsSync(filePath)){
	// 		//     seneca.act(_.extend(msg, {role:'import'}), respond);
	// 		// } else 
	// 		{

	// 		    console.log('spec', spec);				
			    
	// 		    var stdout = [], stderr = [];			   
	// 		    var proc = spawn(spec.command, spec.args);
			    
	// 		    proc.stdout.on('data', stdout.push.bind(stdout));
	// 		    proc.stderr.on('data', stderr.push.bind(stderr));
	// 		    proc.on('close', (code) => {
	// 			console.log('stdout:', stdout.join('\n'));
	// 			console.log('stderr', stderr.join('\n'));
	// 			console.log('Process finished:', code);
	// 			if(code === 0){
	// 			    seneca.act({role:'import', cmd:msg.cmd, host: old.msg.host});
	// 			} else {
				    
	// 			}
	// 		    });
	// 		}
	// 		respond(null, {status:'scheduled'});
	// 	    }
    	// 	}
    	//     };
    	//     this.prior(msg, func);
    	// } else {
    	//     q.push({self:this, msg:msg});
    	// };
	var self = this,
	    timer = 0;
	const asyncQueueExecutor = () => {
	    const EXEC_QUEUE_LIMIT = 50;
	    async.eachOfLimit(q, EXEC_QUEUE_LIMIT, (item, key, callback) => {
		console.log('Item:', item, 'Key:', key);
		seneca.sub({role:'run',info:'report'}, (args) => {
		    console.log('Got it:', args);
		});
		self.prior(item, (err, spec) => {
		    console.log('Prior returned:', err, spec);
		    seneca.act({role:'run', cmd:'execute', name: spec.command, spec: spec}, (err, result) => {
			console.log('Finished', err, result);
			respond(null, {status:'scheduled', procid: result.procid});
		    });		    
		});
	    }, () => {
		clearTimeout(timer);
		timer = 0;
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
