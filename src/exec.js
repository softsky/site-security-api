const _ = require('lodash')
, spawn = require('child_process').spawn
, fs = require('fs')
, dotenv = require('dotenv') //.configure()
, request = require('request')
, qs = require('querystring')
, seneca = require('seneca')()
	  .use('entity')
	  .use('mongo-store', {
    	      name: 'security',
	      db: 'security',
    	      host: '127.0.0.1',
    	      port: 27017,
    	      options: {}
	  });

const wrap = (command, args) => {
    if(process.env.NODE_EVN === 'production'){
	return [command, args];
    } else {
	return ['docker', ['exec', '-t', 'zen_davinci'].concat([command]).concat(args)];
    }
};

const pathForHost = (host, suffix) => {
    return `/tmp/reports/${host}${suffix}`;
};

const saveLogger = (err, object) => {
    if(err){
	throw new Error(err);
    }
    console.log(`Saved: ${object}`);
};

const beforeExecute = (msg) => {
    const path = `/tmp/reports/${msg.host}-${msg.cmd}.json`;
    if(fs.existsSync(path)){
	fs.unlinkSync(path, console.log);
    }
    return path;
}
const execute = (cmd, args, done) => {
    const stdout = [], stderr = [];

    const w = wrap(cmd, args)
    , wrapped = {cmd: w[0], args: w.slice(1)}
    , command = spawn(wrapped.cmd, wrapped.args[0]);

    command.stdout.on('data', (data) => {
	// getting buffer in `data`
	const str = data.toString('utf-8');
	stdout.push(str);
    });

    command.stderr.on('data', (data) => {
	//getting buffer in `data`
	const str = data.toString('utf-8');
	stderr.push(str);
    });

    command.on('close', (code) => {
	if(_.isFunction(done)){
	    var fs = require('fs')
	    , host = args[args.length - 1];
	    fs.writeFileSync(pathForHost(host,`-${cmd}.stdout.txt`), stdout);
	    fs.writeFileSync(pathForHost(host,`-${cmd}.stderr.txt`), stderr);
	    var jsonObj = JSON.parse(fs.readFileSync(pathForHost(host,`-${cmd}.json`), 'utf8'));
	    seneca
		.make$(cmd)
		.data$(_.extend({date:new Date(), host:host}, _.isArray(jsonObj)?jsonObj[0]:jsonObj))
		.save$(saveLogger);
	    // check if it's sync or async
	    done(code, stdout, stderr);
	} else {
	    console.log(`child process exited with code ${code}`);
	}
    });
};

module.exports = function exec(options){

    this.add({role: 'exec', cmd: 'whatweb'}, function (msg, done) {
	const path = beforeExecute(msg);
	execute('whatweb', [`--log-json=${path}`, msg.host], (code, stdout, stderr) => {
	    done(null, {result: code});
	});
    });

    this.add({role: 'exec', cmd: 'nmap'}, function (msg, done) {
	const path = beforeExecute(msg);
	execute('nmap', ['--script=vuln', msg.host], (code, stdout, stderr) => {
	    done(null, {result: code});
	});
    });
    
};
