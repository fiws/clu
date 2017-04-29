var clu = require('../clu');
var net = require('net');
var repl = require('repl');
var fs = require('fs');

var logger = require('./logger');

var _ = require('lodash');
var moment = require('moment');
var chalk = require('chalk');

var cluster;
var port = null;

module.exports = _port => {
	if (_port) port = _port;
	if (port === null){
		port = require("os").platform() === "win32" ? 13873 : clu.dir + "repl.sock";
	}
	else if (_.isString(port)){
		if (port[0] !== "/") port = clu.dir + port;
	}

	// add repl command to commandline
	var commandLine = clu.commandLine;

	commandLine.program
		.command('repl')
		.description('Throws you inside a REPL')
		.action(() => {
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

	// delete old unix socket if it exists
	if (_.isString(port)){
		try {
			fs.unlinkSync(port);
		} catch(e){	/* don't care (first start, probably) */ }
	}

	var promt = "master> ";

	var server = net.createServer(socket => {

		// this might be verry bad
		socket.on("error", err => {
			console.log("NET ERR: " + err);
			console.log(err.stack);
		});

		welcomeMessage(socket);

		var redrawPromt;

		var logListener = msg => {
			socket.write("\nlog: ");
			socket.write(msg);

			// send "master>" after 1 second
			clearTimeout(redrawPromt);
			setTimeout(() => {
				socket.write("\n"+promt);
			}, 1000);
		};
		logger.on('log', logListener);

		socket.on("close", () => {
			// remove all listeners
			logger.removeListener('log', logListener);
		});

		var rs = repl.start({
			prompt: promt,
			input: socket,
			output: socket,
			ignoreUndefined: true,
			useColors: true,
			terminal: true
		}).on('exit', () => {
			socket.end();
		});

		rs.context.clu = clu;
		
		_.extend(rs.context, clu);

		rs.context.status = () => {
			printStatus(socket);
		};
	});

	server.listen(port);
	clu.on("stop", () => {
		server.close();
	});
}

var welcomeMessage = socket => {
	socket.write("clu REPL\n");
	socket.write("=================\n");
	printStatus(socket);
};

var printStatus = socket => {
	var status = clu.status();

	socket.write("\n");
	socket.write(chalk.white.underline("Workers\n"));
	socket.write(chalk.bold("  Total:   ") + status.workers.total);
	socket.write(chalk.bold.green("  Active:  ") + status.workers.active);
	socket.write(chalk.bold.yellow("  Pending: ") + status.workers.pending + "\n");

	var mUptime = moment.duration(status.master.uptime, "seconds").humanize();
	var wAvgUptime = moment.duration(status.workers.averageUptime, "seconds").humanize();

	socket.write(chalk.white.underline("Uptime\n"));
	socket.write(chalk.bold("  Master:         ") + mUptime);
	socket.write(chalk.bold("  Average Worker: ") + wAvgUptime);
	socket.write("\n");
};