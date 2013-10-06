var clu = require('../clu');
var net = require('net');
var repl = require('repl');
var fs = require('fs');

var logger = require('./logger');

var _ = require("lodash");

var cluster;

module.exports = function(){
	return function(){
		cluster = this.cluster;
		init();
	};
};

function init(){
	var configDir = clu.dir;
	if (fs.existsSync(configDir + "/repl.sock")) fs.unlinkSync(configDir + "/repl.sock");

	var promt = "master> ";

	var server = net.createServer(function (socket) {

		// this might be verry bad
		socket.on("error", function(err){
			console.log("NET ERR: " + err);
			console.log(err.stack);
		});

		welcomeMessage(socket);

		var redrawPromt;

		var logListener = function(msg){
			socket.write("\nlog: ");
			socket.write(msg);

			// send "master>" after 1 second
			clearTimeout(redrawPromt);
			setTimeout(function(){
				socket.write("\n"+promt);
			}, 1000);
		};

		var stepListener = function(msg){
			socket.write("");
			socket.write(msg);
		};

		logger.on('log', logListener);
		logger.on('step', stepListener);


		var rs = repl.start({
			prompt: promt,
			input: socket,
			output: socket,
			ignoreUndefined: true,
			useColors: true,
			terminal: true
		}).on('exit', function() {
			logger.removeListener('log', logListener);
			logger.removeListener('step', stepListener);
			socket.end();
		});

		rs.context.clu = clu;
		rs.context.cluster = clu.cluster;
		rs.context.restart = clu.restart;
		rs.context.scaleUp = clu.increaseWorkers;
		rs.context.scaleDown = clu.decreaseWorkers;
		rs.context.status = function(){
			printStatus(socket);
		};
	});

	server.listen(configDir + "/repl.sock");

	process.on('exit', function(){
		var configDir = clu.dir;
		fs.unlinkSync(configDir + "/repl.sock");
	});

}

var welcomeMessage = function(socket){
	socket.write("clu REPL\n".white);
	socket.write("=================\n");
	printStatus(socket);
};

var printStatus = function(socket){
	var workers = _.keys(cluster.workers);
	
	var pending = 0;
	_.each(workers, function(worker){
		if (worker.state == "disconnected" || worker.state == "exit" || worker.state == "online") pending++;
	});
	var active = workers.length - pending;


	socket.write("Status: \n");
	socket.write("  Workers: ".bold + workers.length + "\n");
	socket.write("  Active: ".bold.green + active + "\n");
	socket.write("  Pending: ".bold.yellow + pending + "\n");
	socket.write("\n");
};



