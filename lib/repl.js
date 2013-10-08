var clu = require('../clu');
var net = require('net');
var repl = require('repl');
var fs = require('fs');

var logger = require('./logger');

var _ = require("lodash");
var moment = require('moment');

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
		
		_.extend(rs.context, clu);

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
	var status = clu.status();

	socket.write("\n");
	socket.write("Workers\n".white.underline);
	socket.write("  Total:   ".bold + status.workers.total + "\n");
	socket.write("  Active:  ".bold.green + status.workers.active + "\n");
	socket.write("  Pending: ".bold.yellow + status.workers.pending + "\n\n");

	var masterUptime = moment.duration(status.master.uptime, "seconds").humanize();
	var workerAvgUptime = moment.duration(status.workers.averageUptime, "seconds").humanize();

	socket.write("Uptime\n".white.underline);
	socket.write("  Master:         ".bold + masterUptime + "\n");
	socket.write("  Average Worker: ".bold + workerAvgUptime + "\n");
	socket.write("\n");
};



