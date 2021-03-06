module.exports = function(options){
    return {
	whatweb: {
	    command: 'whatweb',
	    args: [`--log-xml=${options.report_path}/whatweb.xml`, process.env.SCAN_DOMAIN],
	    cwd: __dirname
	},
	sniper: {
	    command: 'sniper',
	    args: [ process.env.SCAN_DOMAIN, 'report'],
	    cwd: __dirname
	},
	nmap: {
	    command: 'nmap',
	    args: ['-Pn', '--script=vuln','-oX', `${options.report_path}/nmap.xml`, process.env.SCAN_DOMAIN],
	    cwd: __dirname
	},
	nikto: {
	    command: 'nikto',
	    args: [],
	    cwd: __dirname
	},
	sslscan: {
	    command: 'sslscan',
	    args: [],
	    cwd: __dirname
	},	
	sqlmap: {
	    command: 'sqlmap',
	    args: [],
	    cwd: __dirname
	},
	w3af: {
	    command: 'w3af',
	    args: [],
	    cwd: __dirname
	},
	skipfish: {
	    command: 'skipfish',
	    args: [],
	    cwd: __dirname
	},
	wpscan: {
	    command: 'wpscan',
	    args: [],
	    cwd: __dirname
	},
	joomscan: {
	    command: 'joomscan',
	    args: [],
	    cwd: __dirname
	},
	droopescan: {
	    command: 'droopescan',
	    args: [],
	    cwd: __dirname
	},
	ccze: {
	    command: 'ccze',
	    args: [],
	    cwd: __dirname
	},
	sleep: {
	    command: 'sleep',
	    args: [1]
	}	
    };
};
