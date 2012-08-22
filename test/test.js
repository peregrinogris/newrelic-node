var newrelic = require( "../newrelic-node.js" );

var should = require('should'),
    log = require("node-logging"),
    sys = require('util'),
    http = require('http'), 
    request = require('request'),
    exec = require('child_process').exec;


var server = http.createServer(function(request, response) {
	response.writeHead(200, {});
	response.end();
 	server.emit('message', request, response);
}).listen(8087);

    
describe("process java" ,function(){
   afterEach(function(done){
	server.removeAllListeners('message');
	done();	
   });



   it("controla que se lanze el proceso java",function(done){
	exec("ps -efa | grep java | grep Monitor | grep -v grep",  function (error, stdout, stderr) {
                should.not.exist(error);
                "".should.equal(stderr);
                stdout.should.include("Monitor");
		done()
	});
    })
    
    it("controla que el proceso java este escuchando en el puerto",function(done){
	this.timeout(5000);
	//duermo 1 segundo para q levanta el server
	exec("sleep 3 && netstat -tpan | grep LISTEN | grep 9999",  function (error, stdout, stderr) {
                stdout.should.include("9999");
		done()
	});
    })
     	
    it("envio de mensaje a proceso java",function(done){
	this.timeout(2000);
	newrelic.log({timespent:{URI_WEB_TRANSACTION:5000},path:"/test", httpStatus:200, httpMethod:"GET"});
	//termina de implementar
	done()
	});


    it("envio de mensaje por request",function(done){
    	this.timeout(5000);
    	http.createServer(function(request, response) {
    		response.writeHead(200, {});
    	 	newrelic.logRequest(request, response, 5000);
    	 	newrelic.logRequest(request, response, 5000);
    	 	newrelic.logRequest(request, response, 5000);
    	 	setTimeout(function() {
    			done();	
    	 	}, 2000);
    	}).listen(8085);
    	   request({
                url:"http://127.0.0.1:8085/ping",
                method:"GET",
                jar: false
            },function(error,response,body){
            })
	});
	
	
    it("envio de error",function(done){
    	this.timeout(5000);
    	http.createServer(function(request, response) {
    		response.writeHead(500, {});
    	 	newrelic.logRequestError("Un error", request, response, 5000);
    	 	setTimeout(function() {
    			done();	
    	 	}, 2000);
    	}).listen(8086);
    	   request({
                url:"http://127.0.0.1:8086/pingError",
                method:"GET",
                jar: false
            },function(error,response,body){
            })
	});
	
    it("log WEB_TRANSACTION_EXTERNAL_ALL",function(done){
    	server.on('message', function(request, response) {
	    	newrelic.logWebTransactionExternalAll(request, response, 5000);
		done();
    	});

    	   request({
                url:"http://127.0.0.1:8087/ping",
                method:"GET",
                jar: false
            },function(error,response,body){
            })
	});


    it("buffer muy grande no descarta nensages",function(done){
    	this.timeout(50000);
	var j = 0;
	newrelic.BUFFER_SIZE = 5000000000000;
	newrelic.on('buffer_full', function () {
		should.fail("Nunca deberia ser llamado");
		
	});
    	server.on('message', function(req, res) {
		newrelic.logWebTransactionExternalAll(req, res, 5000);
		j++;
		if (j > 1000)
			done();
		else
			request({
	        	        url:"http://127.0.0.1:8087/ping",
	        	        method:"GET",
	        	        jar: false
	        	    },function(error,res,body){
	            });
    		});
	request({
       	        url:"http://127.0.0.1:8087/ping",
       	        method:"GET",
       	        jar: false
       	    },function(error,response,body){
         });

	});
})

