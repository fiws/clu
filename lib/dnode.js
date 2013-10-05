var net = require('net');
var fs = require('fs');
var dnode = require('dnode');
var _ = require('lodash');
var clu = require('../clu');

// dnode only wants functions. otherwise it will get crazy
var api = _.pick(clu, function(obj){
	return _.isFunction(obj);
});

// manuall fixes
api.decreaseWorkersForce = clu.decreaseWorkers.force;

module.exports = function(){
	var configDir = clu.dir;
	//var cluster = this;
	if (fs.existsSync(configDir + "/dnode.sock")) fs.unlinkSync(configDir + "/dnode.sock");
	var server = net.createServer(function (socket) {
		var d = dnode(api);
		socket.pipe(d);
		d.pipe(socket);
		socket.on("end", function(){
			socket.end();
		});
	});
	server.listen(configDir + '/dnode.sock');
};