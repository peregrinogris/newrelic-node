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
	newrelic.log(request, responsse, timespent);
	
## Requisitos:
JAVA 1.6

## Como funciona?
Como newrelic no tiene soporte nativo para nodejs, lo que hace el modulo es levantar un proceso java que usa la api de newrelic para loguear las transacciones. El proceso java usa MINA para escuchar en un socket y del lado de nodejs se envia las metricas por ese socket

## Herramientas usadas:
	Mina (mina.apache.org)


