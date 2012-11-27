var sys = require('util');
var log = require('node-logging');
var exec = require('child_process').exec;
var net = require('net');
var url = require('url');
var cluster = require('cluster');

var client;

log.setLevel("info");

log.inf ("Node ENV: "+process.env.NODE_ENV);

if (cluster.isMaster) {
	var child;
	var runJava = function () {
			child = exec("java -Xms16M -Xmx16M -Xss256k -javaagent:lib/newrelic.jar -Dnewrelic.config.file=newrelic.yml -Dnewrelic.environment=production -cp ./lib/slf4j-api-1.6.1.jar:./lib/mina-core-2.0.4.jar:./lib/mina-transport-apr-2.0.4.jar:./lib/mina-filter-compression-2.0.4.jar:./lib/commons-lang-2.6.jar:./lib/mina-statemachine-2.0.4.jar:./lib/mina-integration-beans-2.0.4.jar:./lib/commons-logging-1.0.3.jar:./lib/mina-integration-xbean-2.0.4.jar:./lib/mina-integration-ognl-2.0.4.jar:./lib/mina-integration-jmx-2.0.4.jar:./lib/guava-r05.jar:./lib/commons-cli-1.2.jar:./bin/ Monitor -port 9999 -buffer 5120000 -debug true 1>> monitor.log 2>> monitor.err", 
			{cwd:__dirname + "/newrelic/", stdio: 'ignore'}, function (error, stdout, stderr) {
				log.err("Proceso Java Termino, error: ["+error + "], stdout: ["+stdout +"] stderr: ["+stderr+"]");
				setTimeout(runJava, 15000);
			}
			);
	};

	switch(process.env.NODE_ENV){
		case 'testing':
			child = exec("java -Xms16M -Xmx16M -Xss256k -javaagent:lib/newrelic.jar -Dnewrelic.config.file=newrelic-test.yml -Dnewrelic.environment=production -cp ./lib/slf4j-api-1.6.1.jar:./lib/mina-core-2.0.4.jar:./lib/mina-transport-apr-2.0.4.jar:./lib/mina-filter-compression-2.0.4.jar:./lib/commons-lang-2.6.jar:./lib/mina-statemachine-2.0.4.jar:./lib/mina-integration-beans-2.0.4.jar:./lib/commons-logging-1.0.3.jar:./lib/mina-integration-xbean-2.0.4.jar:./lib/mina-integration-ognl-2.0.4.jar:./lib/mina-integration-jmx-2.0.4.jar:./lib/guava-r05.jar:./lib/commons-cli-1.2.jar:./bin/ Monitor -port 9999 -buffer 5120000 1>> monitor.log 2>> monitor.err", 
			{cwd:__dirname + "/newrelic/", stdio: 'ignore'}, function (error, stdout, stderr) {/*ver que hacer si se muere el proceso java*/});
			break;
		case 'development':
			//entorno de desarollo, no hago nada
			break;
		default:
			runJava();
	}
}


var util = require('util'),
    events = require('events');

function NewRelic() {
	events.EventEmitter.call(this);  
}

NewRelic.super_ = events.EventEmitter;

NewRelic.prototype = Object.create(events.EventEmitter.prototype, {
    constructor: {
        value: NewRelic,
        enumerable: false
    }
});

module.exports = new NewRelic();

NewRelic.prototype.BUFFER_SIZE = 1000000;
var connected = false;
var retry = false;
NewRelic.prototype.RETRY_INTERVAL = 2000;

var socket = new net.Socket();
socket.on('connect', function() {
  log.inf("Conectado a proceso JAVA");
  connected = true;
});

socket.on('disconnect', function() {
  connected = false;
  log.inf("Desconectado del proceso JAVA");
  retryConnectOnFailure(NewRelic.prototype.RETRY_INTERVAL);
});

socket.on('error', function() {
  connected = false;
  log.inf("Error en socket, reintentando en: "+NewRelic.prototype.RETRY_INTERVAL+" ms");
  retryConnectOnFailure(NewRelic.prototype.RETRY_INTERVAL);
});

socket.on('close', function() {
  connected = false;
  log.inf("Conexion con Monitor cerrada, reconectando en: "+NewRelic.prototype.RETRY_INTERVAL+" ms...");
  retryConnectOnFailure(NewRelic.prototype.RETRY_INTERVAL);
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

NewRelic.prototype.log = function(data){
	if (connected) {
		if (socket.bufferSize > this.BUFFER_SIZE) {
			this.emit('buffer_full');
		}
		else
			socket.write(JSON.stringify(data)+"\n");
	}
};

NewRelic.prototype.logRequest = function(req, res, timespent){    
	if (connected) {
		var path = url.parse(req.url).pathname;
		this.log({"timespent":{URI_WEB_TRANSACTION:timespent}, 
			"path":path, 
			"httpStatus":res.statusCode, 
			"httpMethod":req.method});
	}
};

NewRelic.prototype.logRequestWithMessage = function(req, res, timespent, message){    
	if (connected) {
		var path = url.parse(req.url).pathname;
		this.log({"timespent":{URI_WEB_TRANSACTION:timespent}, 
			"path":path, 
			"httpStatus":res.statusCode, 
			"httpMethod":req.method,
			"message":message});
	}
};

NewRelic.prototype.logRequestError = function(messsage, req, res, timespent){    
	if (connected) {
		var path = url.parse(req.url).pathname;
		this.log({"timespent":{URI_WEB_TRANSACTION:timespent}, 
			"path":path, 
			"httpStatus":res.statusCode, 
			"httpMethod":req.method, 
			"error":messsage, 
			"request.headers":req.headers, 
			"response.headers":res.headers});
	}
};

NewRelic.prototype.logWebTransactionExternalAll = function(req, res, timespent){    
	if (connected) {
		var path = url.parse(req.url).pathname;
		this.log({"timespent":{WEB_TRANSACTION_EXTERNAL_ALL: timespent}, 
			"path":path, 
			"httpStatus":res.statusCode, 
			"httpMethod":req.method});
	}
};

NewRelic.prototype.express = function (req, res, next) {
	var startDate = new Date();
	res.on ('finish', function () {
		module.exports.logRequest(req, res, Date.now()-startDate.getTime()); 
	});
	next();
}

process.on('exit', function () {
	if (child && child.pid) {
	 	exec("pkill -9 -P "+child.pid);
	}
});
