var clu = require('../clu');
var net = require('net');
var repl = require('repl');
var fs = require('fs');

var logger = require('./logger');

var _ = require("lodash");
var moment = require('moment');

var cluster;
var port  = null;

module.exports = function(_port){
	if (_port) port = _port;
	if (port === null) port = require("os").platform() === "win32" ? 13873 : clu.dir + "repl.sock";
	else if (_.isString(port)){
		if (port[0] !== "/") port = clu.dir + port;
	}

	// add repĺ command to commandline
	var commandLine = clu.commandLine;

	commandLine.program
		.command('repl')
		.description('Throws you inside a REPL')
		.action(function(){
			// socket.removeAllListeners("close"); // u might call that a bad hack
			// process.stdin.unpipe(multi.charm);

			commandLine.socket.end(); // end protcol socket. we're in repl now!
			require("./telnet-client").connect(port);
		});

	return function(){
		cluster = this.cluster;
		init();
	};
};

function init(){
	var configDir = clu.dir;
	if (_.isString(port) && fs.existsSync(port)) fs.unlinkSync(port);

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

		socket.on("close", function(){
			// remove all listeners
			logger.removeListener('log', logListener);
			logger.removeListener('step', stepListener);
		});

		var rs = repl.start({
			prompt: promt,
			input: socket,
			output: socket,
			ignoreUndefined: true,
			useColors: true,
			terminal: true
		}).on('exit', function() {
			socket.end();
		});

		rs.context.clu = clu;
		
		_.extend(rs.context, clu);

		rs.context.status = function(){
			printStatus(socket);
		};
	});

	server.listen(port);
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