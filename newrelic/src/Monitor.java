import java.io.IOException;
import java.net.InetSocketAddress;
import java.nio.charset.Charset;
import java.util.Arrays;

import org.apache.mina.common.ByteBuffer;
import org.apache.mina.common.IoAcceptor;
import org.apache.mina.common.SimpleByteBufferAllocator;
import org.apache.mina.filter.codec.ProtocolCodecFilter;
import org.apache.mina.filter.codec.textline.TextLineCodecFactory;
import org.apache.mina.transport.socket.nio.SocketAcceptor;
import org.apache.mina.transport.socket.nio.SocketAcceptorConfig;

/**
 * Created by: Matias Rege
 */
public class Monitor  {
		
	private Monitor(int port, int buffer, boolean debug) throws IOException {
		ByteBuffer.setUseDirectBuffers(false);
		ByteBuffer.setAllocator(new SimpleByteBufferAllocator());

		IoAcceptor acceptor = new SocketAcceptor();

		SocketAcceptorConfig cfg = new SocketAcceptorConfig();
		TextLineCodecFactory factory = new TextLineCodecFactory(Charset.forName("UTF-8"));
		factory.setDecoderMaxLineLength(buffer);
		cfg.getFilterChain().addLast("codec", new ProtocolCodecFilter(factory));
		MonitorHandler handler = new MonitorHandler();
		handler.setDebug(debug);
		acceptor.bind(new InetSocketAddress(port), handler, cfg);
	}

	public static void main(String[] args) throws IOException {
		System.out.println("Iniciando monitor con parametros: "+Arrays.toString(args));
		if (args.length > 2)
			new Monitor(Integer.valueOf(args[0]), Integer.valueOf(args[1]), Boolean.valueOf(args[2]));
		else
			new Monitor(Integer.valueOf(args[0]), Integer.valueOf(args[1]), false);
		System.out.println("Server started.");
	}
}

