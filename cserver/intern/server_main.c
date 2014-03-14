#include "sock.h"
#include "requestlib.h"
#include "boilerplate.h"

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <math.h>

#ifdef WIN32

double time_ms(void) {
	static int hasperfcounter = -1; /* (-1 == unknown) */
	static double perffreq;

	if (hasperfcounter == -1) {
		__int64 ifreq;
		hasperfcounter = QueryPerformanceFrequency((LARGE_INTEGER *) &ifreq);
		perffreq = (double) ifreq;
	}

	if (hasperfcounter) {
		__int64 count;

		QueryPerformanceCounter((LARGE_INTEGER *) &count);

		return count / perffreq;
	}
	else {
		static double accum = 0.0;
		static int ltick = 0;
		int ntick = GetTickCount();

		if (ntick < ltick) {
			accum += (0xFFFFFFFF - ltick + ntick) / 1000.0;
		}
		else {
			accum += (ntick - ltick) / 1000.0;
		}

		ltick = ntick;
		return accum;
	}
}

//XXX
SOCKET open_sockets[512];
int cursock = 0;

int initSockets() {
  WSADATA wsaData;
  int iResult;
  
  iResult = WSAStartup(MAKEWORD(2,2), &wsaData);
  if (iResult != 0) {
      printf("WSAStartup failed: %d\n", iResult);
      return 0;
  }
  
  return 1;
}

int loadSocket(char *port) {
  struct addrinfo *result = NULL, hints;
  SOCKET ListenSocket = INVALID_SOCKET;
  int iResult;
  
  ZeroMemory(&hints, sizeof (hints));
  hints.ai_family = AF_INET;
  hints.ai_socktype = SOCK_STREAM;
  hints.ai_protocol = IPPROTO_TCP;
  hints.ai_flags = AI_PASSIVE;

  // Resolve the local address and port to be used by the server
  iResult = getaddrinfo("localhost", port, &hints, &result);

  if (iResult != 0 || result == NULL) {
      printf("getaddrinfo failed: %d\n", iResult);
      WSACleanup();
      return -1;
  }
  
  ListenSocket = socket(result->ai_family, result->ai_socktype, result->ai_protocol);
  
  if (ListenSocket == INVALID_SOCKET) {
    printf("Error at socket(): %ld\n", WSAGetLastError());
    freeaddrinfo(result);
    WSACleanup();
    return -1;
  }

  // Setup the TCP listening socket
  iResult = bind( ListenSocket, result->ai_addr, (int)result->ai_addrlen);
  if (iResult == SOCKET_ERROR) {
	  printf("bind failed with error: %d\n", WSAGetLastError());
	  freeaddrinfo(result);
	  closesocket(ListenSocket);
	  WSACleanup();
	  return -1;
  }

  if (listen( ListenSocket, SOMAXCONN ) == SOCKET_ERROR ) {
    printf( "Listen failed with error: %ld\n", WSAGetLastError() );
    closesocket(ListenSocket);
    WSACleanup();
    return -1;
  }

  freeaddrinfo(result);

  open_sockets[cursock] = ListenSocket;
  return cursock++;
}

int waitForConnection(int sock) {
  SOCKET ClientSocket;
  SOCKET ListenSocket = open_sockets[sock];

  // Accept a client socket
  ClientSocket = accept(ListenSocket, NULL, NULL);
  if (ClientSocket == INVALID_SOCKET) {
    printf("accept failed: %d\n", WSAGetLastError());
    return 0;
  }

  open_sockets[cursock++] = ClientSocket;
  return cursock-1;
}

int socketSend(int sock, int clientsock, const char *buf, int buflen) {
  SOCKET ClientSocket = open_sockets[clientsock];
  int iResult, iSendResult;

  //printf("Bytes received: %d\n", iResult);

  // Echo the buffer back to the sender
  iSendResult = send(ClientSocket, buf, buflen, 0);

  if (iSendResult == SOCKET_ERROR) {
      printf("send failed: %d\n", WSAGetLastError());
      closesocket(ClientSocket);
      WSACleanup();
      return 1;
  }
  
  return iSendResult;
}

int socketRecv(int sock, int clientsock, char *buf, int buflen) {
  SOCKET ClientSocket = open_sockets[clientsock];
  int iResult;

  iResult = recv(ClientSocket, buf, buflen, 0);

  if (iResult > 0) {
    return iResult;
  } else if (iResult == 0) {
      printf("Connection closing...\n");
      return -1;
  } else {
      printf("recv failed: %d\n", WSAGetLastError());
      closesocket(ClientSocket);
      WSACleanup();
      return -1;
  }

  return 0;
}

void sleep_ms(int ms) {
  Sleep(ms);
}
#endif

#define CRLF "\r\n"

int expect(char *buf, char *word, int *i) {
  int j, len = strlen(word);

  for (j=0; j<len; j++) {
    if (!buf[*i] || tolower(buf[*i]) != tolower(word[j])) {
      fprintf(stderr, "error in request: expected %s\n", word);
      return 0;
    }
    (*i)++;
  }

  return 1;
}

int consume_space(char *buf, int *i) {
  int start = *i;
  while (buf[*i] && (buf[*i] == ' ' || buf[*i] == '\t'))
    (*i)++;

  return (*i) - start;
}

int consume_ws(char *buf, int *i, int buflen) {
  static char ws[] = "\n\r\t \v";
  int start = *i;

  while ((*i) < buflen) {
    int found = 0;
    int j;
    for (j=0; j<sizeof(ws)-1; j++) {
      if (buf[*i] == ws[j]) {
        found = 1;
        break;
      }
    }

    if (!found) break;
    (*i)++;
  }

  return (*i) - start;
}

int parse_request(char *buf, ReqInfo *req, int buflen) {
  int i=0, *ih=&i;
  char c;
  char method[32];
  char path[8192];
  char key[32];
  char val[256];
  int j=0;

  memset(req, 0, sizeof(ReqInfo));
  
  c = strcspn(buf, " \t");

  if (c <= 0 || c > 3) return -1;

  memcpy(method, buf, c);
  method[c] = 0;
  i += c;

  strcpy(req->method, method);
  printf("method: '%s'\n", method);

  consume_space(buf, ih);
  c = strcspn(buf+i, " \t");

  if (c <= 0 || c >= sizeof(path)) return -1;
  memcpy(path, buf+i, c);
  path[c] = 0;
  i+=c;

  printf("path: %s\n", path);
  consume_space(buf, ih);
  if (!expect(buf, "HTTP/1.1", ih))
    return -1;
  
  req->path = s_dup(path);

  //prevent buffer overrun
  method[sizeof(req->method)-1] = 0;
  strcpy(req->method, method);

  consume_ws(buf, ih, buflen);
  while (i < buflen) {
    //char *cp;
    c = CLAMP(strcspn(buf+i, ": "), 0, sizeof(key)-1);

    if (c <= 0) break;

    memcpy(key, buf+i, c);
    key[c] = 0;
    i+=c;

    if (buf[i] == ':') i++;

    consume_ws(buf, ih, buflen);
    c = CLAMP(strcspn(buf+i, "\r"), 0, sizeof(val)-1);

    if (c <= 0) break;

    memcpy(val, buf+i, c);
    val[c] = 0;
    i += c;

    consume_ws(buf, ih, buflen);

    array_append(req->headers, s_dup(key));
    array_append(req->headers, s_dup(val));
    req->totheader++;

    printf("header: '%s' : '%s'\n", key, val);
  }

  return 0;
}

int do_default_res(int sock, int csock, HandlerInfo *info)
{
  ReqInfo req;
  PageHandlerFunc func;
  char *buf = NULL;
  char *res = NULL;
  
  RQ_InitReq(&req, "GET");
  if (info->res) {
    RQ_Free(info->res);
    MEM_free(info->res);
  }

  info->res = &req;
  if (info->out_buf)
    s_free(info->out_buf);
  info->out_buf = NULL;

  func = get_page(info->req->path);
  if (!func) {
    s_cat(info->out_buf, "<!DOCTYPE html><html><head><title>404 Error</title></head><body>404</body></html>");
  } else {
    func(info);
    if (!info->out_buf) {
      s_cat(info->out_buf, "<!DOCTYPE html><html><head><title>500 Error</title></head><body>500</body></html>");
    }
  }

  RQ_StandardHeaders(&req, strlen(info->out_buf), "text/html");

  res = RQ_BuildReq(&req, 0);
  s_cat(res, "\r\n");
  s_cat(res, info->out_buf);

  socketSend(sock, csock, res, s_len(res));

  s_free(res);
}

int serv(int sock) {
  char buf[MAXBUF];
  ReqInfo req;
  int csock;
  int atstart=1;
  char last_method[8];
  char *reqs = NULL;
  double time;
  HandlerInfo *info;

  //print blocks before accepting next connection
  MEM_PrintMemBlocks(stderr);

  //make sure we're not null.  could also do reqs = s_dup("");
  array_append(reqs, 0);
  csock = waitForConnection(sock);
  
  while (1) {
    int ret = socketRecv(sock, csock, buf, MAXBUF);
    
    if (atstart)
      time = time_ms();
    atstart = 0;

    if (ret >= MAXBUF) ret = MAXBUF-1;
    if (ret < 0) {
      fprintf(stderr, "Connection error");
      break;
    }

    if (ret == 0) {
      break;
    }

    buf[ret] = 0;
    buf[MAXBUF-1] = 0;
    
    s_cat(reqs, buf);
    if (!s_endswith(reqs, "\r\n\r\n"))
      continue;

    printf("got %d\n\n|%s\n", ret, reqs);
    ret = parse_request(reqs, &req, ret);

    if (ret < 0) {
      printf("parse_request error!");
    }

    info = HL_New(&req);

    do_default_res(sock, csock, info);

    printf("\ntime : %.4fms\n\n", time_ms()-time);

    HL_Free(info);
    MEM_free(info);
    RQ_Free(&req);

    //memcpy(last_method, req.method, 3);

    sleep_ms(5);
    array_reset(reqs);
    array_append(reqs, 0);
    atstart = 1;
  }

  s_free(reqs);
}

int test_strutil_main(int argc, char **argv) {
  char *test = NULL;

  RQ_OnStartup();
  s_cat(test, "yay");
  printf("%s %d\n", test, s_len(test));

  s_cat(test, "|yay2");
  printf("%s %d\n", test, s_len(test));
  
  s_free(test);
  test = NULL;
  test = s_dup("yay3");
  printf("%s %d\n", test, s_len(test));

  s_cpy(test, "yay4");
  printf("%s %d\n", test, s_len(test));
  s_free(test);

  MEM_PrintMemBlocks(stdout);
  system("PAUSE");
}

int main(int argc, char **argv) {
  int socket;
  PageHandlerFunc page = get_page("/tst");
  RQ_OnStartup();

  printf("total pages: %d\n", page_handlers_len);

  if (!initSockets()) {
    fprintf(stderr, "error initializing  sockets\n");
    return -1;
  }
  
  socket = loadSocket("8080");
  if (socket < 0) {
    fprintf(stderr, "socket error\n");
    return -1;
  }

  while (1) {
    serv(socket);
  }

  system("PAUSE");
}

int main2(int argc, char **argv) {
  char *path;
  char *pathout, *query, *label;
  char **qs;
  ReqInfo req;
  int qlen, i;
  
  //init
  RQ_OnStartup();

  path =  RQ_EscapeDup("/root/?a=[0]&b={2}&c=#4#label", RQ_ESC_QUERY);

  RQ_SplitQuery(path, &pathout, &query, &label);
  qs = RQ_ParseQuery(path);
  qlen = array_len(qs);

  for (i=0; i<qlen/2; i++) {
    printf("'%s' : '%s'\n", qs[i*2], qs[i*2+1]);
  }

  fprintf(stdout, "%s|'%s' : '%s' : '%s'\n", path, pathout, query, label);

  path = "/sdfdsf/sdfsd?a=yay yay yay&b = 2[] & c = bleh";
  pathout = s_dup(path);
  array_resize(pathout, s_len(pathout)*3);

  RQ_EscapePath(path, pathout, s_len(pathout)+1, RQ_ESC_QUERY);
  fprintf(stdout, "'%s' : '%s'\n", path, pathout);

  path = s_dup(pathout);

  RQ_UnEscapePath(pathout, path, s_len(path)+1, RQ_ESC_QUERY);
  fprintf(stdout, "'%s' : '%s'\n", pathout, path);

  path = RQ_BuildQuery(qs);
  fprintf(stdout, "'%s'\n", path);

  RQ_InitReq(&req, "GET");
  req.path = s_dup("/some/path");
  RQ_StandardHeaders(&req, 10, "application/x-html");

  path = RQ_BuildReq(&req, 1);

  RQ_Free(&req);

  system("PAUSE");
}
