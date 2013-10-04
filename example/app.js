var http = require('http');
var cluster = require('cluster');


var id = cluster.isWorker ? "worker: " + cluster.worker.id : "master";

console.log(id);

var server = http.createServer(function (req, res) {
	res.writeHead(200, {'Content-Type': 'text/plain'});
	res.write(id + "\n");
	res.end('Hello World\n');
}).listen(8888, '127.0.0.1');

server.on('close', function(){
	setTimeout(function(){
		// simulate some work
	}, 900);

});
