Agente de newrelic para node.

## Instalación
	npm install newrelic-node

## Configuración
Editar el archivo newrelic/newrelic.yml con la license_key y app_name de la aplicación correspondiente.

## Uso:
	var newrelic = require( "newrelic-node" );
	
	newrelic.logRequest(request, response, timespent);
	o
	newrelic.log(timespent:{"URI_WEB_TRANSACTION":5000}, path:"/test", httpStatus:200, httpMethod:"GET"});
	o
	newrelic.log(timespent:{"URI_WEB_TRANSACTION":5000, WEB_TRANSACTION_EXTERNAL_ALL: 1000}}, path:"/test", httpStatus:200, httpMethod:"GET"});
	
## Loguear errores:
	var newrelic = require( "newrelic-node" );
	newrelic.logRequestError("Un mensaje de error", request, response, timespent);	

## 

## Entorno de desarrollo:
Para que no levante el proceso en entorno de desarrollo se puede usar:
	NODE_ENV=development node app.js

## Requisitos:
JAVA 1.6

## Como funciona?
Como newrelic no tiene soporte nativo para nodejs, lo que hace el modulo es levantar un proceso java que loguea en newrelic. El proceso java usa MINA para comunicarse con nodejs.

## Herramientas usadas:
	Mina (mina.apache.org)


