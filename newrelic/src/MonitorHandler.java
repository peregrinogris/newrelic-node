import java.util.Collections;
import java.util.Map;

import org.apache.mina.common.IoHandlerAdapter;
import org.apache.mina.common.IoSession;
import org.apache.mina.common.TransportType;
import org.apache.mina.transport.socket.nio.SocketSessionConfig;

import com.google.common.collect.Maps;
import com.newrelic.agent.Agent;
import com.newrelic.agent.MetricNames;
import com.newrelic.agent.MetricSpec;
import com.newrelic.agent.errors.HttpTracedError;
import com.newrelic.agent.errors.ThrowableError;
import com.newrelic.agent.stats.StatsEngine;
import com.newrelic.agent.tracers.RequestDispatcherTracer;
import com.newrelic.org.json.simple.JSONObject;
import com.newrelic.org.json.simple.parser.JSONParser;

/**
 * Created by: Matias Rege
 */
public class MonitorHandler extends IoHandlerAdapter {
	private static final StatsEngine StatsEngine = Agent.instance().getDefaultRPMService().getStatsEngine();
	
	public void exceptionCaught(IoSession session, Throwable t) throws Exception {
		t.printStackTrace();
		session.close();
	}

	public void messageReceived(IoSession session, Object msg) throws Exception {
		try {
			JSONObject json = (JSONObject)new JSONParser().parse(msg.toString());
			
			String path = json.containsKey("path") ? (String)json.get("path") : "-";
			String method = json.containsKey("httpMethod") ? (String)json.get("httpMethod") : "-";
			long timespent = json.containsKey("timespent") ? (Long)json.get("timespent") : 0;
			long status = json.containsKey("httpStatus") ? (Long)json.get("httpStatus") : 0;
			
			StatsEngine.getApdexStats(MetricSpec.APDEX).recordApdexResponseTime(timespent);
			StatsEngine.getResponseTimeStats(MetricSpec.DISPATCHER).recordResponseTime(timespent);
			StatsEngine.getResponseTimeStats(MetricNames.URI_WEB_TRANSACTION +path).recordResponseTime(timespent);
			StatsEngine.getApdexStats(MetricSpec.lookup(MetricNames.APDEX+path)).recordApdexResponseTime(timespent);
			
			boolean failed = ((status < 200) || (status > 399));
			if (failed) {
				reportAppError(msg.toString(), status, path, method, timespent);
				return;
			}

		} catch (Throwable t) {
			reportParserError(msg.toString(), t);
		}

	}

	public void sessionCreated(IoSession session) throws Exception {
		System.out.println("Session created...");
		if( session.getTransportType() == TransportType.SOCKET )
			((SocketSessionConfig) session.getConfig() ).setReceiveBufferSize( 2048 );
	}

	private static void reportAppError(String logLine, long status, String path, String method, long timespent) {
		Map<String, Object> errorParams = Maps.newHashMap();
		errorParams.put(RequestDispatcherTracer.REQUEST_PARAMETERS_PARAMETER_NAME, Collections.EMPTY_MAP);
		errorParams.put("Status", (int)status);
		errorParams.put("Method", method);
		errorParams.put("Total Time", timespent);
		errorParams.put("Log Line", logLine);
		Agent.instance().getDefaultRPMService().getErrorService().reportError(new HttpTracedError(path,
				(int)status,"HTTP - " + path,path,errorParams,System.currentTimeMillis()));
	}

	private void reportParserError(String logLine, Throwable t) {
		Map<String, Object> errorParams = Maps.newHashMap();
		errorParams.put(RequestDispatcherTracer.REQUEST_PARAMETERS_PARAMETER_NAME, Collections.EMPTY_MAP);
		errorParams.put("Log Line", logLine);
		Agent.instance().getDefaultRPMService().getErrorService().reportError(new ThrowableError("NodeMonitor",t,
				"NodeMonitor",errorParams,System.currentTimeMillis()));
	}	
}

