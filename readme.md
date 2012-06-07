Agente de newrelic para node.

## Instalación
	npm install newrelic-node

## Configuración
Editar el archivo newrelic/newrelic.yml con la license_key y app_name de la aplicación correspondiente.

## Uso:
	var newrelic = require( "newrelic-node" );
	newrelic.log({timespent:5000, path:"/test", httpStatus:500, httpMethod:"GET"});
	o
	var newrelic = require( "newrelic-node" );
	newrelic.logRequest(request, response, timespent);
	
## Loguear errores:
	var newrelic = require( "newrelic-node" );
	newrelic.logRequestError("Un mensaje de error", request, response, timespent);	

## Requisitos:
JAVA 1.6

## Como funciona?
Como newrelic no tiene soporte nativo para nodejs, lo que hace el modulo es levantar un proceso java que loguea en newrelic. El proceso java usa MINA para comunicarse con nodejs.

## Herramientas usadas:
	Mina (mina.apache.org)


