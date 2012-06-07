var sys = require('util');
var log = require('node-logging');
var exec = require('child_process').exec;
var net = require('net');
var url = require('url');
var client;

log.setLevel("info");

exec("java -Xms32M -Xmx32M -javaagent:lib/newrelic.jar -Dnewrelic.config.file=newrelic.yml -Dnewrelic.environment=production -cp ./lib/mina-core-1.1.7.jar:./lib/mina-filter-compression-1.1.7.jar:./lib/mina-integration-jmx-1.1.7.jar:./lib/guava-r05.jar:./lib/commons-lang-2.6.jar:./lib/commons-logging-1.0.3.jar:./lib/slf4j-api-1.6.1.jar:./bin/ Monitor 1> monitor.log 2> monitor.err", 
	{cwd:__dirname + "/newrelic/"}, function (error, stdout, stderr) {log.err(error); log.err(stdout); log.err("Termino proceso JAVA!")/*ver que hacer si se muere el proceso java*/});
 
var connected = false;
var retry = false;
const RETRY_INTERVAL = 2000;

var socket = new net.Socket({ allowHalfOpen: true});
socket.on('connect', function() {
  log.inf("Conectado a proceso JAVA");
  connected = true;
});

socket.on('disconnect', function() {
  connected = false;
  log.inf("Desconectado del proceso JAVA");
  retryConnectOnFailure(RETRY_INTERVAL);
});

socket.on('error', function() {
  connected = false;
  log.inf("Error en socket");
  retryConnectOnFailure(RETRY_INTERVAL);
});

socket.on('close', function() {
  connected = false;
  log.inf("Socket cerrado");
  retryConnectOnFailure(RETRY_INTERVAL);
});

var retryConnectOnFailure = function(retryInMilliseconds) {
    if (!retry) {
    	socket.connect(9999);
	    setTimeout(function() {
	      retry = false;
	      if (!connected) {
	        retryConnectOnFailure(retryInMilliseconds);
	      }
	    }, retryInMilliseconds);
	}
    retry = true;
  }

socket.connect(9999);

exports.log = function(data){
	if (connected) {
		socket.write(JSON.stringify(data)+"\n");
	}
};

exports.logRequest = function(req, res, timespent){    
	if (connected) {
		var path = url.parse(req.url).pathname;
		this.log({"timespent":{URI_WEB_TRANSACTION:timespent}, "path":path, "httpStatus":res.statusCode, "httpMethod":req.method});
	}
};

exports.logRequestError = function(messsage, req, res, timespent){    
	if (connected) {
		var path = url.parse(req.url).pathname;
		this.log({"timespent":{URI_WEB_TRANSACTION:timespent}, "path":path, "httpStatus":res.statusCode, "httpMethod":req.method, "error":messsage});
	}
};

exports.logWebTransactionExternalAll = function(req, res, timespent){    
	if (connected) {
		var path = url.parse(req.url).pathname;
		this.log({"timespent":{WEB_TRANSACTION_EXTERNAL_ALL: timespent}, "path":path, "httpStatus":res.statusCode, "httpMethod":req.method});
	}
};




