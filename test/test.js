var newrelic = require( "../newrelic-node.js" );

var should = require('should'),
    log = require("node-logging"),
    sys = require('util'),
    http = require('http'), 
    request = require('request'),
    exec = require('child_process').exec;
    
describe("process java" ,function(){
   afterEach(function(done){
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
	this.timeout(12000);
	//duermo 1 segundo para q levanta el server
	exec("sleep 3 && netstat -tpan | grep LISTEN | grep 9999",  function (error, stdout, stderr) {
                stdout.should.include("9999");
		done()
	});
    })
     	
    it("envio de mensaje a proceso java",function(done){
	//newrelic.log({timespent:5000,path:"/test", httpStatus:500, httpMethod:"GET"});
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
    	 	}, 4000);
    	}).listen(8085);
    	   request({
                url:"http://127.0.0.1:8085/ping",
                method:"GET",
                jar: false
            },function(error,response,body){
            })
	});
})

