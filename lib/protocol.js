var nssocket = require('nssocket');
var fs = require('fs');
var _ = require('lodash');

var port = "./.clu/clu.sock";

_.mixin({
	capitalize(string) {
		//return string.charAt(0).toUpperCase() + string.slice(1);
		return string;
	}
});

module.exports = _port => {
	if (port) port = _port;
	return init;
};

// t for transport error
var t = realErr => {
	if (realErr === null || realErr === undefined) return null;
	var err = {
		message: "",
		stack: null
	};

	if (_.isString(realErr)) err.message = realErr;
	else {
		err = {
			message: realErr.message,
			stack: realErr.stack
		};
	}
	return err;
};


var init = clu => {
	if (_.isString(port)){
		if (port[0] !== "/") port = clu.dir + port;
		if (fs.existsSync(port)) fs.unlinkSync(port);
	}
	var logger = clu.logger;

	var server = nssocket.createServer(socket => {
		socket.send("connect");
		var sendLog = msg => {
			socket.send("log", msg);
		};

		var progressHandler = data => {
			socket.send("progress", data);
		};

		logger.on("log", sendLog);
		clu.on("progress", progressHandler);

		var done = data => {
			if (data.err) data.err = t(data.err);
			else data.err = null;

			if (!data.name) data.name = _.capitalize(data.task);

			socket.send("done", data);
		};


		socket.data("status", () => {
			socket.send("status", clu.status());
		});

		socket.data(["task", "stop"], data => {
			if (data.force) {} // force it
			clu.stop(() => {
				done({task: "stop"});
			});
		});

		socket.data(["task", "scaleTo"], num => {
			clu.scaleTo(num, err => {
				done({task: "scaleTo", name: "Scale", err});
			});
		});

		socket.data(["task", "scaleUp"], num => {
			clu.scaleUp(num, err => {
				done({task: "scaleUp", name: "Upscale", err});
			});
		});

		socket.data(["task", "scaleDown"], num => {
			clu.scaleDown(num, err => {
				done({task: "scaleDown", name: "Downscale", err});
			});
		});

		socket.data(["task", "restart"], data => {
			if (data.force) {} // force it
			clu.restart(err => {
				done({task: "restart", err});
			});
		});

		socket.data(["task", "restartMaster"], () => {
			clu.restartMaster(() => {
				done({task: "restartMaster", name: "restart Master", err: null});
			});
		});

		socket.data(["task", "*"], function(){
			if (socket.listeners(this.event).length > 1) return; // task already catched
			var err = "Task not found! You might need to update the master by restarting it.";
			done({
				task: this.event[2],
				 name: this.event[2],
				 err: new Error(err)
			});
		});

		socket.on("close", () => {
			logger.removeListener("log", sendLog);
			clu.removeListener("progress", progressHandler);
		});

		socket.on("error", err => {
			if (err.code === "ECONNRESET") console.log(err.stack); // can be ignored
			else throw err;
		});
	});
	
	server.listen(port);
	clu.on("stop", () => {
		server.close();
	});

	exports.server = server;
};