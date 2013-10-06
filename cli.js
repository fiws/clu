var path = require('path');
var fs = require('fs');
var nssocket = require('nssocket');
var child_process = require('child_process');

var pack = require("./package.json");
var _ = require('lodash');

require('colors');

var socket = new nssocket.NsSocket();
var program = require('commander');
//var inquirer = require('inquirer');

var cluPath = "./.clu";
if (!fs.existsSync(cluPath + '/clu.sock')) throw new Error("master is not running or cli is disabled");

program
	.version(pack.version)
	.usage('[options] <action>')
	.option('-j, --json', 'Output only json')
	.option('-v, --verbose', 'More Output')
	.option('--force', 'Force something');


program.on('--help', function(){
	console.log("  I have no %se what I am doing...", "clu".bold);
});


program
	.command('start [server]')
	.description('Start the clu cluster')
	.option('-r, --repl', 'Start a REPL after the Server started')
	.action(function(server){
		socket.destroy();
		// thanks https://github.com/indexzero/daemon.node/blob/master/index.js
		var script = server || process.argv[1];
		var scriptName = path.basename(script);

		var options = {
			stdio: 'ignore',
			env: process.env,
			cwd: process.cwd,
			detached: true
		};

		if (scriptName === "newCli" || scriptName === "newCli.js"){
			console.log("Error: Nothing to start.");
		} else {
			// spawn the child using the same node process as ours
			var child = child_process.spawn(process.execPath, [script], options);

			// let the parent exit
			child.unref();
			process.exit();
		}
	});

program
	.command('repl')
	.description('Throws you inside a REPL')
	.action(function(){
		require("./lib/telnet-client");
		socket.end(); // end protcol socket. we're in repl now!
	});

program
	.command('restart')
	.description('Restart all workers (safely)')
	.option('--fast', 'Restart More workers at once')
	.action(function(){
		console.log("Restarting all workers");
		socket.send(["cmd", "restart"], {fast: program.fast});
	});

program
	.command('restart-master')
	.description('Restart the master process (there will be a downtime!)')
	.action(function(){
		console.log("Restarting master process");
		socket.send(["cmd", "restartMaster"]);
	});

program
	.command('scaleup <x>')
	.description('Scaleup by x workers')
	.action(function(num){
		console.log("Scaling up by %d", num);
		socket.send(["cmd", "scaleUp"], num);
	});

program
	.command('scaledown <x>')
	.description('Scale down by x workers')
	.action(function(num){
		console.log("Scaling down by %d", num);
		socket.send(["cmd", "scaleDown"], num);
	});


program
	.command('stop')
	.description('stop all workers and the master process')
	.action(function(){
		console.log("Stopping all workers & the master process!");
		socket.send(["cmd", "stop"], {force: program.force});
	});


socket.data("log", function(data){
	if (data.msg) console.log(data.msg);
});

socket.data(["log", "step"], function(msg){
	process.stdout.write(msg);
});

socket.data("done", function(data){
	console.log();
	if (data.err){
		console.log("✘ Task %s failed!".red, data.name);
		console.log(data.err.message);
		if (program.verbose) console.log(data.err.stack);
	} else {
		console.log("✔ Task %s succeeded!".green, data.name);
	}
	socket.end();
});


if (!_.contains(process.argv, "--help") && !_.contains(process.argv, "-h")){
	var commands = _.keys(program._events);

	// if <action> is unknown
	if (!_.contains(commands, process.argv[2])){
		console.log("use --help for help");
		return;
	}

	// don't connect. otherwise there will be ECONNRESET
	socket.connect(cluPath + '/clu.sock');
}
program.parse(process.argv);