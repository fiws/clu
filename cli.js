var path = require('path');
//var fs = require('fs');
var nssocket = require('nssocket');
var child_process = require('child_process');

var pack = require("./package.json");
var _ = require('lodash');
var moment = require('moment');

require('colors');

var socket = new nssocket.NsSocket();
var program = require('commander');

var multimeter = require('multimeter');
var multi = multimeter(process);
//var inquirer = require('inquirer');

var cluPath = "./.clu";

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
	.command('start')
	.description('Start the clu cluster')
	.action(function(){
		socket.destroy();
		// thanks https://github.com/indexzero/daemon.node/blob/master/index.js
		var script = process.argv[1];
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
	.command('status')
	.description('Throws you inside a REPL')
	.action(function(){
		socket.send("status");
		socket.data("status", function(status){
			console.log("Workers\n".white.underline);
			console.log("  Total:   ".bold + status.workers.total);
			console.log("  Active:  ".bold.green + status.workers.active);
			console.log("  Pending: ".bold.yellow + status.workers.pending + "\n");

			var masterUptime = moment.duration(status.master.uptime, "seconds").humanize();
			var workerAvgUptime = moment.duration(status.workers.averageUptime, "seconds").humanize();

			console.log("Uptime\n".white.underline);
			console.log("  Master:         ".bold + masterUptime);
			console.log("  Average Worker: ".bold + workerAvgUptime);
			console.log();
			socket.end();
		});
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
	.option('--fast', 'Restart More workers one by one')
	.action(function(){
		console.log("Restarting all workers\n");
		socket.send(["task", "restart"], {fast: program.fast});
	});

program
	.command('restart-master')
	.description('Restart the master process (there will be a downtime!)')
	.action(function(){
		console.log("Restarting master process\n");
		socket.send(["task", "restartMaster"]);
	});

program
	.command('scaleto <x>')
	.description('Scale to x workers')
	.action(function(num){
		console.log("Scaling to %d workers\n", num);
		socket.send(["task", "scaleTo"], num);
	});

program
	.command('scaleup <x>')
	.description('Scaleup by x workers')
	.action(function(num){
		if (num === 0) {
			console.log("Ok, doing nothing.");
			socket.end();
		}
		console.log("Scaling up by %d workers\n", num);
		socket.send(["task", "scaleUp"], num);
	});

program
	.command('scaledown <x>')
	.description('Scale down by x workers')
	.action(function(num){
		if (num === 0) {
			console.log("Ok, doing nothing.");
			socket.end();
		}
		console.log("Scaling down by %d workers\n", num);
		socket.send(["task", "scaleDown"], num);
	});


program
	.command('stop')
	.description('Stop all workers and the master process')
	.action(function(){
		console.log("Stopping all workers & the master process!");
		socket.send(["task", "stop"], {force: program.force});
	});


socket.data("log", function(data){
	if (data.msg) console.log(data.msg);
});

socket.data(["log", "step"], function(msg){
	process.stdout.write(msg);
});

var tasks = {};

socket.data("progress", function(data){
	if (tasks[data.task] === undefined) tasks[data.task] = data;

	var task = tasks[data.task];

	if (task.bar === undefined){
		// dropin
		var bar = task.bar = multi.rel(4, 1);
		bar.solid = {background: null, foreground: "white", text: "◼"};
		bar.before = data.task + " ❲";
		bar.after = "❳ ";
		bar.width = 14;

		task.bar.ratio(data.current, data.total);

	} else {
		// update progress
		if (task.current > data.current && task.reverse !== true) return;

		task.bar.ratio(data.current, data.total);
		if (data.current == data.total) delete tasks[data.task];
	}
});

socket.data("done", function(data){
	// move progress bars
	_.each(tasks, function(task){
		task.bar.offset +=2;
	});

	if (data.err){
		console.log("✘ Task %s failed!".red, data.name);
		console.log(data.err.message);
		if (program.verbose) console.log(data.err.stack);
	} else {
		console.log("\n✔ Task %s succeeded!".green, data.name);
	}

	if (_.values(tasks).length !== 0){
		// Timeout for progress bars
		setTimeout(function(){ socket.end(); }, 300);
	} else socket.end();

});

socket.on("close", function(){
	// otherwise process will keep running
	multi.charm.cursor(true);
	multi.write('\n').destroy();
});

// if master is not running
socket.on("error", function(err){
	multi.charm.cursor(true);
	multi.write('\n').destroy();

	if (err.code === "ECONNREFUSED") console.log("Connection refused. Is the master running?".red);
	else throw err;
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