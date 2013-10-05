var fs = require('fs');
var dnode = require('dnode');
var net = require('net');
var child_process = require('child_process');

require('colors');

var _ = require('lodash');
var program = require('commander');

program
	.version('0.0.1')
	.usage('[options] <action> [path]')
	.option('-j, --json', 'Output only json')
	.option('--force', 'force something');

program.parse(process.argv);
var cmd = program.args[0];

if (cmd === "start") {
	// thanks https://github.com/indexzero/daemon.node/blob/master/index.js
	var script = process.argv[1];

	var options = {
		stdio: 'ignore',
		env: process.env,
		cwd: process.cwd,
		detached: true
	};

	// spawn the child using the same node process as ours
	var child = child_process.spawn(process.execPath, [script], options);

	// required so the parent can exit
	child.unref();

	// now exit
	process.exit();
}


var d = dnode();
d.on('remote', function (master) {

	var cmds = {};

	cmds.stop = function(cb){
		console.log("stopping..");
		master.stop(function(){
			cb();
		});
	};


	cmds.restart = function(cb){
		console.log("respawning all workers");
		master.restart(function(){
			cb();
		});
	};

	cmds["restart-master"] = function(cb){
		console.log("restarting master process");
		master.restartMaster();
		cb();
	};

	cmds.scaleup = function(cb){
		var usage = function(){
			console.log("Usage: scaleup <value>");
			cb();
		};
		var value = program.args[1];
		if (!value) usage();
		if (_.isNumber(value)) usage();
		if (value === 0){
			console.log("0 won't change anything...");
			cb();
		}

		master.increaseWorkers(value);
		console.log("scaling " + "up".bold +  " by " + value);
		cb();

	};

	cmds.scaledown = function(cb){
		var usage = function(){
			console.log("Usage: scaleup <value>");
			cb();
		};
		var value = program.args[1];
		if (!value) usage();
		if (_.isNumber(value)) usage();
		if (value === 0){
			console.log("0 won't change anything...");
			cb();
		}

		console.log("scaling " + "down".bold +  " by " + value);
		master.decreaseWorkers(value, function(err){
			if(err) console.log("ERROR: %s".red, err.message);
			cb();
		});

	};

	cmds.repl = function(){
		console.log("Starting telnet client...\n");
		require("./lib/telnet-client");
		socket.end();
	};

	if (!cmds[cmd]) process.exit();
	else cmds[cmd](process.exit);

});

if (!fs.existsSync('./.clu/dnode.sock')) throw new Error("master is not running or cli is disabled");
var socket = net.connect('./.clu/dnode.sock');
socket.pipe(d).pipe(socket);