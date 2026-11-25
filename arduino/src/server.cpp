#include "web_server.h"

#include <Arduino.h>
#include <WiFiNINA.h>
#include <utility/server_drv.h>

#include "wifi_hotspot.h"

namespace
{

	const uint16_t PORT = 80;
	const uint8_t MAX_CONNECTIONS = 4;
	const uint8_t LINE_SIZE = 96;
	const uint8_t SCRATCH_SIZE = 128;
	const uint8_t RX_CHUNK = 64;
	const uint8_t TX_CHUNK = 128;

	const uint16_t MAX_BODY = 5000;

	const uint32_t ACCEPT_INTERVAL_MS = 5;
	const uint32_t LISTEN_RETRY_MS = 1000;
	const uint32_t REQUEST_TIMEOUT_MS = 5000;
	const uint32_t LINGER_MS = 100;

	const uint8_t STATE_LISTENING = 1;

	struct Request
	{
		const char *path;	 // "/status"
		const char *query; // text after '?', or ""
	};

	struct Response
	{
		const char *status;
		const char *contentType;
		const char *body; // must stay valid after the handler returns
		uint16_t length;
		char *scratch; // SCRATCH_SIZE bytes, safe to use as the body
	};

	const char HTML[] = "text/html; charset=utf-8";
	const char JSON[] = "application/json";
	const char TEXT[] = "text/plain";

	template <size_t N>
	void sendPage(Response &response, const char *contentType,
								const char (&page)[N])
	{
		static_assert(N - 1 <= MAX_BODY, "page is too large, see MAX_BODY");
		response.contentType = contentType;
		response.body = page;
		response.length = N - 1;
	}

	template <size_t N>
	void sendError(Response &response, const char *status, const char (&text)[N])
	{
		response.status = status;
		sendPage(response, TEXT, text);
	}

	const char INDEX_PAGE[] = R"html(<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>ELEC290</title>
</head>
<body>
<p>The Arduino web server is running.</p>
<p><a href="/status">Status</a></p>
</body>
</html>
)html";

	void handleIndex(const Request &, Response &response)
	{
		sendPage(response, HTML, INDEX_PAGE);
	}

	void handleStatus(const Request &, Response &response)
	{
		response.contentType = JSON;
		response.body = response.scratch;
		response.length = snprintf(response.scratch, SCRATCH_SIZE,
															 "{\"uptime_ms\":%lu}", millis());
	}

	struct Route
	{
		const char *path;
		void (*handler)(const Request &, Response &);
	};

	// Add new URLs here.
	const Route ROUTES[] = {
			{"/", handleIndex},
			{"/status", handleStatus},
	};

	enum class State : uint8_t
	{
		Free,
		Reading,
		SendingHeader,
		SendingBody,
		Linger
	};

	struct Connection
	{
		State state;
		uint8_t sock;
		uint32_t since;

		// Request parsing
		char line[LINE_SIZE];
		uint8_t lineLength;
		bool lineDone;
		bool lineTooLong;
		bool headerEmpty; // no characters seen yet on the current header line

		// Response
		Response response;
		uint16_t sent;
		char scratch[SCRATCH_SIZE];
	};

	Connection connections[MAX_CONNECTIONS];
	uint8_t nextConnection = 0;
	uint8_t serverSock = SOCK_NOT_AVAIL;
	bool listening = false;
	uint32_t lastListenAttempt = 0;
	uint32_t lastAccept = 0;

	void enter(Connection &c, State state)
	{
		c.state = state;
		c.since = millis();
	}

	void close(Connection &c)
	{
		ServerDrv::stopClient(c.sock);
		c.state = State::Free;
	}

	void closeAll()
	{
		for (Connection &c : connections)
		{
			if (c.state != State::Free)
			{
				close(c);
			}
		}
	}

	void listen()
	{
		const uint32_t now = millis();
		if (lastListenAttempt != 0 && now - lastListenAttempt < LISTEN_RETRY_MS)
		{
			return;
		}
		lastListenAttempt = now;

		if (serverSock != SOCK_NOT_AVAIL &&
				ServerDrv::getServerState(serverSock) == STATE_LISTENING)
		{
			listening = true;
			return;
		}

		serverSock = ServerDrv::getSocket();
		if (serverSock == SOCK_NOT_AVAIL)
		{
			return;
		}
		ServerDrv::startServer(PORT, serverSock);
		listening = ServerDrv::getServerState(serverSock) == STATE_LISTENING;
		if (!listening)
		{
			ServerDrv::stopClient(serverSock); // releases the socket number
			serverSock = SOCK_NOT_AVAIL;
		}
	}

	void acceptConnection()
	{
		const uint32_t now = millis();
		if (now - lastAccept < ACCEPT_INTERVAL_MS)
		{
			return;
		}
		lastAccept = now;

		Connection *slot = nullptr;
		for (Connection &c : connections)
		{
			if (c.state == State::Free)
			{
				slot = &c;
				break;
			}
		}
		if (slot == nullptr)
		{
			return; // new connections wait in the module until a slot frees up
		}

		uint8_t sock = ServerDrv::availServer(serverSock, true);
		if (sock == SOCK_NOT_AVAIL)
		{
			sock = ServerDrv::availServer(serverSock, false);
		}
		if (sock >= WIFI_MAX_SOCK_NUM || sock == serverSock)
		{
			return;
		}
		for (const Connection &c : connections)
		{
			if (c.state != State::Free && c.sock == sock)
			{
				return;
			}
		}

		slot->sock = sock;
		slot->lineLength = 0;
		slot->lineDone = false;
		slot->lineTooLong = false;
		slot->headerEmpty = true;
		slot->sent = 0;
		enter(*slot, State::Reading);
	}

	uint8_t receive(const Connection &c, char (&buffer)[RX_CHUNK])
	{
		uint16_t length = RX_CHUNK;
		if (!ServerDrv::getDataBuf(c.sock, reinterpret_cast<uint8_t *>(buffer),
															 &length))
		{
			return 0;
		}
		return length <= RX_CHUNK ? length : 0;
	}

	bool parse(Connection &c, char ch)
	{
		if (ch == '\r')
		{
			return false;
		}
		if (ch == '\n')
		{
			if (!c.lineDone)
			{
				c.lineDone = c.lineLength > 0; // ignore blank lines before the request
				return false;
			}
			const bool endOfHeaders = c.headerEmpty;
			c.headerEmpty = true;
			return endOfHeaders;
		}
		if (c.lineDone)
		{
			c.headerEmpty = false;
		}
		else if (c.lineLength < LINE_SIZE - 1)
		{
			c.line[c.lineLength++] = ch;
		}
		else
		{
			c.lineTooLong = true;
		}
		return false;
	}

	void route(Connection &c)
	{
		Response &response = c.response;
		response.status = "200 OK";
		response.contentType = TEXT;
		response.body = "";
		response.length = 0;
		response.scratch = c.scratch;

		if (c.lineTooLong)
		{
			sendError(response, "414 URI Too Long", "URI too long\n");
			return;
		}

		// "METHOD /path?query HTTP/1.1"
		c.line[c.lineLength] = '\0';
		char *path = strchr(c.line, ' ');
		char *end = path ? strchr(path + 1, ' ') : nullptr;
		if (end == nullptr || path[1] != '/')
		{
			sendError(response, "400 Bad Request", "Bad request\n");
			return;
		}
		*path++ = '\0';
		*end = '\0';

		if (strcmp(c.line, "GET") != 0)
		{
			sendError(response, "405 Method Not Allowed\r\nAllow: GET",
								"Method not allowed\n");
			return;
		}

		Request request = {path, ""};
		char *query = strchr(path, '?');
		if (query != nullptr)
		{
			*query = '\0';
			request.query = query + 1;
		}

		for (const Route &candidate : ROUTES)
		{
			if (strcmp(path, candidate.path) == 0)
			{
				candidate.handler(request, response);
				const bool generated = response.body == response.scratch;
				if (response.length > (generated ? SCRATCH_SIZE - 1 : MAX_BODY))
				{
					sendError(response, "500 Internal Server Error",
										"Response too large\n");
				}
				return;
			}
		}
		sendError(response, "404 Not Found", "Not found\n");
	}

	void stepReading(Connection &c)
	{
		char buffer[RX_CHUNK] = {};
		const uint8_t length = receive(c, buffer);
		for (uint8_t i = 0; i < length; i++)
		{
			if (parse(c, buffer[i]))
			{
				route(c);
				enter(c, State::SendingHeader);
				return;
			}
		}
		if (millis() - c.since >= REQUEST_TIMEOUT_MS)
		{
			close(c);
		}
	}

	void stepSendingHeader(Connection &c)
	{
		char header[192];
		const int length = snprintf(header, sizeof(header),
																"HTTP/1.1 %s\r\n"
																"Content-Type: %s\r\n"
																"Content-Length: %u\r\n"
																"Cache-Control: no-store\r\n"
																"Connection: close\r\n\r\n",
																c.response.status, c.response.contentType,
																c.response.length);
		if (length < 0 || length >= static_cast<int>(sizeof(header)) ||
				ServerDrv::sendData(c.sock, reinterpret_cast<uint8_t *>(header),
														length) != static_cast<uint16_t>(length))
		{
			close(c);
			return;
		}
		enter(c, c.response.length > 0 ? State::SendingBody : State::Linger);
	}

	void stepSendingBody(Connection &c)
	{
		const uint16_t remaining = c.response.length - c.sent;
		const uint16_t chunk = remaining < TX_CHUNK ? remaining : TX_CHUNK;
		const uint16_t written = ServerDrv::sendData(
				c.sock, reinterpret_cast<const uint8_t *>(c.response.body) + c.sent,
				chunk);
		if (written == 0 || written > chunk)
		{
			close(c); // the client has gone
			return;
		}
		c.sent += written;
		if (c.sent == c.response.length)
		{
			enter(c, State::Linger);
		}
	}

	void stepLinger(Connection &c)
	{
		char buffer[RX_CHUNK];
		receive(c, buffer);
		if (millis() - c.since >= LINGER_MS)
		{
			close(c);
		}
	}

	void step(Connection &c)
	{
		switch (c.state)
		{
		case State::Free:
			break;
		case State::Reading:
			stepReading(c);
			break;
		case State::SendingHeader:
			stepSendingHeader(c);
			break;
		case State::SendingBody:
			stepSendingBody(c);
			break;
		case State::Linger:
			stepLinger(c);
			break;
		}
	}

} // namespace

namespace WebServer
{

	void begin()
	{
		for (Connection &c : connections)
		{
			c.state = State::Free;
		}
		serverSock = SOCK_NOT_AVAIL;
		listening = false;
		lastListenAttempt = 0;
	}

	void update()
	{
		if (!Hotspot::isUp())
		{
			if (listening)
			{
				closeAll();
				listening = false;
			}
			return;
		}
		if (!listening)
		{
			listen();
			return;
		}

		acceptConnection();
		step(connections[nextConnection]);
		nextConnection = (nextConnection + 1) % MAX_CONNECTIONS;
	}

} // namespace WebServer
