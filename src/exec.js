const wrap = (spec) => {
    var arr = ['tmux', 'new-window', spec.command].concat(spec.args);
    if(process.env.NODE_ENV === 'production'){
	return {
	    command: arr[0],
	    args: arr.slice(1)
	};
    } else {
	return {
	    command: 'docker',
	    args: ['exec', '-t', process.env.DOCKER_CONTAINER_NAME].concat(arr)
	};
    }
};

module.exports = function api(options){
    const _ = require('lodash')
    , async = require('async')
    , spawn = require('child_process').spawn
    , fs = require('fs')
    , dotenv = require('dotenv') //.configure()
    , request = require('request')
    , qs = require('querystring')
    , seneca = require('seneca')()
	  .use('entity')
	  .use('src/import', options)
	      .use('run', { batch: require('../conf/commands.js')()})
	  .use('mongo-store',  options.mongo),
	  xml2js = require('xml2js');

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
    	if (q.length < process.env.EXEC_QUEUE_LIMIT || 50) {
    	    var func = function(err, spec) {
    		if (err){
    		    respond(err);
    		} else {
    		    var old = q.pop() || {self:this, msg:msg};
    		    if(old){
			const filePath = `${options.report_path}/${old.msg.cmd}.xml`;
			console.log('Message:', msg.args);
			// if(fs.existsSync(filePath)){
			//     seneca.act(_.extend(msg, {role:'import'}), respond);
			// } else 
			{

			    console.log('spec', spec);				
			    
			    var stdout = [], stderr = [];			   
			    var proc = spawn(spec.command, spec.args);
			    
			    proc.stdout.on('data', stdout.push.bind(stdout));
			    proc.stderr.on('data', stderr.push.bind(stderr));
			    proc.on('close', (code) => {
				console.log('stdout:', stdout.join('\n'));
				console.log('stderr', stderr.join('\n'));
				console.log('Process finished:', code);
				if(code === 0){
				    seneca.act({role:'import', cmd:msg.cmd, host: old.msg.host});
				} else {
				    
				}
			    });
			}
			respond(null, {status:'scheduled'});
		    }
    		}
    	    };
    	    this.prior(msg, func);
    	} else {
    	    q.push({self:this, msg:msg});
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
