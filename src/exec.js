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
    , spawn = require('child_process').spawn
    , fs = require('fs')
    , dotenv = require('dotenv') //.configure()
    , request = require('request')
    , qs = require('querystring')
    , seneca = require('seneca')()
	  .use('entity')
	  .use('src/import', options)
	  .use('run', {
	      batch: {
		  'whatweb': {
		      command: 'whatweb'		      
		  },
		  'nmap': {
		      command: 'nmap',
		      timeout: 2 * 24 * 3600 * 1000 // default to 2 days
		  },
		  'nikto': {
		      command: 'whatweb'
		      
		  }		  
	      }
	  })
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
        

    // this.sub('role:run,info:report',function(args,done){
    // 	fs.readFile(`/data/${args.host}/whatweb.xml`, function(err, data) {
    // 	    var parser = new xml2js.Parser({attrkey:'properties$'});
    // 	    if(err){
    // 		seneca.log.error(err);
    // 		done(null, {error: JSON.stringify(err), result:JSON.stringify(data)});
    // 	    } else {
    // 		parser.parseString(data, function (err, result) {
    // 		    if(err){
    // 			seneca.log.error(err);
    // 			done(null, {error: `Can\'t parse JSON for ${args.host}`});
    // 		    } else {
    // 			var instance = seneca
    // 				.make$('nmaprun')
    // 				.data$({nmaprun: result['nmaprun']})
    // 				.save$((err, obj) => {
    // 			    if(err){
    // 				seneca.log.error(err);
    // 				done(null, {error: JSON.stringify(err), result:JSON.stringify(data)});
    // 			    } else {
    // 				done(null, {status:'OK'});
    // 			    }
    // 			});
    // 		    };
    // 		});
    // 	    };
    // 	});
    // });

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
			// if(fs.existsSync(filePath)){
			//     seneca.act(_.extend(msg, {role:'import'}), respond);
			// } else 
			{

			    console.log('spec', spec);				
			    
			    var stdout = [], stderr = [];			   
			    var proc = spawn(spec.command, spec.args);
			    
			    proc.stdout.on('data', stdout.push.bind(stdout));
			    proc.stderr.on('data', stderr.push.bind(stderr));
			    proc.on('close', (ret) => {
				console.log(stdout.join('\n'));
				console.log(stderr.join('\n'));
				console.log('Process finished:', ret);
				if(ret === 0){
				    seneca.act({role:'import', cmd:msg.cmd, host: old.msg.host});
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
