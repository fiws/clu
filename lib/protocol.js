var nssocket = require('nssocket');
var fs = require('fs');
var _ = require('lodash');

_.mixin({
	capitalize: function(string) {
		//return string.charAt(0).toUpperCase() + string.slice(1);
		return string;
	}
});

module.exports = function(){
	return init;
};

// t for transport error
var t = function(realErr){
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


var init = function(clu){
	if (fs.existsSync(clu.dir + "clu.sock")) fs.unlinkSync(clu.dir + "clu.sock");
	var logger = clu.logger;

	var server = nssocket.createServer(function(socket){
		socket.send("connect");
		var sendLog = function(msg){
			socket.send("log", msg);
		};

		var sendStep = function(step){
			socket.send(["log", "step"], step);
		};

		var progressHandler = function(data){
			socket.send("progress", data);
		};

		logger.on("log", sendLog);
		logger.on("step", sendStep);

		clu.on("progress", progressHandler);

		var done = function(data){
			if (data.err) data.err = t(data.err);
			else data.err = null;

			if (!data.name) data.name = _.capitalize(data.task);

			socket.send("done", data);
		};


		socket.data("status", function(){
			socket.send("status", clu.status());
		});

		socket.data(["task", "stop"], function(data){
			if (data.force) {} // force it
			clu.stop(function(){
				done({task: "stop"});
			});
		});

		socket.data(["task", "scaleTo"], function(num){
			clu.scaleTo(num, function(err){
				done({task: "scaleTo", name: "Scale", err: err});
			});
		});

		socket.data(["task", "scaleUp"], function(num){
			clu.scaleUp(num, function(err){
				done({task: "scaleUp", name: "Upscale", err: err});
			});
		});

		socket.data(["task", "scaleDown"], function(num){
			clu.scaleDown(num, function(err){
				done({task: "scaleDown", name: "Downscale", err: err});
			});
		});

		socket.data(["task", "restart"], function(data){
			if (data.force) {} // force it
			clu.restart(function(err){
				done({task: "restart", err: err});
			});
		});

		socket.data(["task", "restartMaster"], function(){
			clu.restartMaster(function(){
				done({task: "restartMaster", name: "restart Master", err: null});
			});
		});

		socket.data(["task", "*"], function(){
			if (socket.listeners(this.event).length > 1) return; // task already catched
			done({task: this.event[2], name: this.event[2], err: t(new Error("Task not found! You might need to update the master by restarting it."))});
		});

		socket.on("close", function(){
			logger.removeListener("log", sendLog);
			logger.removeListener("step", sendStep);
			clu.removeListener("progress", progressHandler);
		});

		socket.on("error", function(err){
			if (err.code === "ECONNRESET") console.log(err.stack); // can be ignored
			else throw err;
		});
	});
	
	server.listen(clu.dir + "clu.sock");
};