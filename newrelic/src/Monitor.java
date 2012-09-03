import java.io.IOException;
import java.net.InetSocketAddress;
import java.nio.charset.Charset;
import java.util.Arrays;

import org.apache.commons.cli.CommandLine;
import org.apache.commons.cli.CommandLineParser;
import org.apache.commons.cli.Options;
import org.apache.commons.cli.ParseException;
import org.apache.commons.cli.PosixParser;
import org.apache.mina.filter.codec.ProtocolCodecFilter;
import org.apache.mina.filter.codec.textline.TextLineCodecFactory;
import org.apache.mina.transport.socket.nio.NioSocketAcceptor;

/**
 * Created by: Matias Rege
 */
public class Monitor  {
		
	private Monitor(CommandLine cmd) throws IOException {
		NioSocketAcceptor acceptor = new NioSocketAcceptor(4);
		
		TextLineCodecFactory factory = new TextLineCodecFactory(Charset.forName("UTF-8"));
		if (cmd.hasOption("buffer"))
			factory.setDecoderMaxLineLength(Integer.valueOf(cmd.getOptionValue("buffer")));
		
		acceptor.getFilterChain().addLast("codec", new ProtocolCodecFilter(factory));
		MonitorHandler handler = new MonitorHandler();
		
		if (cmd.hasOption("debug"))
			handler.setDebug(Boolean.valueOf(cmd.getOptionValue("debug")));
		
		if (cmd.hasOption("formatdate"))
			handler.setFormatDate(cmd.getOptionValue("formatdate"));
		
		if (cmd.hasOption("buffer"))
			handler.setBuffer(Integer.valueOf(cmd.getOptionValue("buffer")));
        acceptor.setHandler(handler);
        
        int port = cmd.hasOption("port") ? Integer.valueOf(cmd.getOptionValue("port")) : 9999;
       	acceptor.bind(new InetSocketAddress(port));
        System.out.println("Listening on port " + port);
	}


	public static void main(String[] args) throws IOException, ParseException {
		// create Options object
		Options options = new Options();

		// add t option
		options.addOption("f", "formatdate",  true, "format date");
		options.addOption("b", "buffer", true, "buffer size");
		options.addOption("d", "debug", true, "debug mode");
		options.addOption("p", "port", true, "port");
				
		CommandLineParser parser = new PosixParser();
		CommandLine cmd = parser.parse( options, args);
		
		System.out.println("Iniciando monitor con parametros: "+Arrays.toString(args));
		new Monitor(cmd);
		System.out.println("Server started.");
	}
}

