#include "sock.h"
#include "requestlib.h"
#include "boilerplate.h"

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <math.h>

#include "thread.h"
#include "pthread.h"

pthread_mutex_t net_mutex = PTHREAD_MUTEX_INITIALIZER;
pthread_mutex_t time_mutex = PTHREAD_MUTEX_INITIALIZER;
#ifdef WIN32

double time_ms(void) {

	static int hasperfcounter = -1; /* (-1 == unknown) */
	static double perffreq;
  pthread_mutex_lock(&time_mutex);

	if (hasperfcounter == -1) {
		__int64 ifreq;
		hasperfcounter = QueryPerformanceFrequency((LARGE_INTEGER *) &ifreq);
		perffreq = (double) ifreq;
	}

	if (hasperfcounter) {
		__int64 count;

		QueryPerformanceCounter((LARGE_INTEGER *) &count);
    
    pthread_mutex_unlock(&time_mutex);
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

    pthread_mutex_unlock(&time_mutex);
		return accum;
	}

  pthread_mutex_unlock(&time_mutex);
}

//XXX
SOCKET open_sockets[512];
int cursock = 0;
volatile int active_threads = 1;
pthread_mutex_t active_thread_mutex = PTHREAD_MUTEX_INITIALIZER;

int inc_active_threads() {
  pthread_mutex_lock(&active_thread_mutex);
  active_threads++;
  pthread_mutex_unlock(&active_thread_mutex);
}

int dec_active_threads() {
  pthread_mutex_lock(&active_thread_mutex);
  active_threads--;
  pthread_mutex_unlock(&active_thread_mutex);
}

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
  int iResult, ret;
  
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
  pthread_mutex_lock(&net_mutex);

  ret = cursock;
  open_sockets[cursock++] = ListenSocket;

  pthread_mutex_unlock(&net_mutex);
  return ret;
}

int waitForConnection(int sock) {
  SOCKET ClientSocket;
  SOCKET ListenSocket = open_sockets[sock];
  int ret;

  // Accept a client socket
  ClientSocket = accept(ListenSocket, NULL, NULL);
  if (ClientSocket == INVALID_SOCKET) {
    printf("accept failed: %d\n", WSAGetLastError());
    return 0;
  }

  pthread_mutex_lock(&net_mutex);
  ret = cursock;
  open_sockets[cursock++] = ClientSocket;
  pthread_mutex_unlock(&net_mutex);

  return ret;
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
  int iResult, iError;

  iResult = recv(ClientSocket, buf, buflen, 0);

 if (iResult == 0) {
      printf("Connection closing...\n");
      return -1;
  } else if (iResult < 0) {
      printf("recv failed: %d\n", WSAGetLastError());
      closesocket(ClientSocket);
      WSACleanup();
      return -2;
  }

  iError = WSAGetLastError();
  if (iError == WSAEMSGSIZE) {
    printf("failed to get full message");
    return 0;
  }

  return iResult;
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
  char key[64];
  char val[256];
  int j=0;

  memset(req, 0, sizeof(ReqInfo));
  
  c = strcspn(buf, " \t");

  if (c <= 0 || c > 4) return -1;

  memcpy(method, buf, c);
  method[c] = 0;
  i += c;

  strcpy(req->method, method);
  //printf("method: '%s'\n", method);

  consume_space(buf, ih);
  c = strcspn(buf+i, " \t");

  if (c <= 0 || c >= sizeof(path)) return -1;
  memcpy(path, buf+i, c);
  path[c] = 0;
  i+=c;

  //printf("path: %s\n", path);
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

    if (c <= 0) 
      break;

    memcpy(key, buf+i, c);
    key[c] = 0;
    i+=c;

    if (buf[i] == ':') i++;

    consume_ws(buf, ih, buflen);
    c = CLAMP(strcspn(buf+i, "\r"), 0, sizeof(val)-1);

    if (c <= 0) 
      break;

    memcpy(val, buf+i, c);
    val[c] = 0;
    i += c;

    consume_ws(buf, ih, buflen);

    array_append(req->headers, s_dup(key));
    array_append(req->headers, s_dup(val));
    req->totheader++;

    //printf("header: '%s' : '%s'\n", key, val);
  }

  return 0;
}

int do_default_res(int sock, int csock, HandlerInfo *info)
{
  ReqInfo req;
  PageHandlerFunc func;
  char *buf = NULL;
  char *res = NULL;
  char *mime = NULL;
  char *path2 = NULL;
  int i, ilen, iadd, err = 0, totread=0;

  RQ_InitReq(&req, info->req->method);
  if (info->res) {
    RQ_Free(info->res);
    MEM_free(info->res);
  }

  info->res = &req;
  if (info->out_buf)
    s_free(info->out_buf);
  info->out_buf = NULL;

  s_cpy(buf, docroot);
  RQ_SplitQuery(info->req->path, &path2, NULL, NULL);

  if (path2[0] != '/')
    s_cat(buf, "/");
  s_cat(buf, path2);

  s_free(info->req->path);
  info->req->path = path2;

  func = get_page(info->req->path);
  if (!func) {
    FILE *file;
    char *path2;

    file = fopen(buf, "rb");
    if (file) {
      int readlen = 4096;
      array_resize(buf, readlen+1);

      totread = 0;
      while (!feof(file)) {
        int r = fread(buf, 1, readlen, file);
        if (r < 0) break;

        if (r < readlen) {
          buf[r] = 0;
        } else {
          buf[readlen] = 0;
        }

        array_catn(info->out_buf, buf, r);
        totread += r;
      }
    } else {
      err = 404;
    }

  } else {
    func(info);
  }
  
  //at this point, buf is either static page data, or the query path
  //free it.
  array_free(buf);

  if (err) {
    s_cpy(info->out_buf, "<!DOCTYPE html><html><head><title>404 Error</title></head><body>404</body></html> ");
    mime = "text/html";
  } else {
    if (!info->out_buf) {
      err = 500;
      s_cpy(info->out_buf, "<!DOCTYPE html><html><head><title>500 Error</title></head><body>500</body></html> ");
      mime = "text/html";
    }
  }
  
  if (!err) {
    if (s_endswith(info->req->path, ".js")) {
      mime = "application/javascript";
    } else if (s_endswith(info->req->path, ".jpg")) {
      mime = "image/jpeg";
    } else if (s_endswith(info->req->path, ".png")) {
      mime = "image/png";
    } else if (s_endswith(info->req->path, ".css")) {
      mime = "text/css";
    } else {
      mime = "text/html";
    }
  }
  RQ_StandardHeaders(&req, s_len(info->out_buf), mime);

  res = RQ_BuildReq(&req, 0, err != 0 ? err : 200);
  //s_cat(res, "\r\n");

  //remove NULL terminator byte
  //from now on, res is no longer
  //a C string
  while (res[array_len(res)-1] == 0) {
    array_pop(res);
  }
  array_catn(res, info->out_buf, array_len(info->out_buf));

  iadd = 1024;
  ilen = array_len(res);
  for (i=0; i<ilen; i += iadd) {
    int len2 = i+iadd > ilen ? ilen%iadd : iadd;

    socketSend(sock, csock, res+i, len2);
  }

  s_free(res);
  RQ_Free(&req);
}

typedef struct threadarg {
  int sock, csock;
} threadarg;

void *thread_start(void *arg) {
  char *reqs = NULL;
  char *body = NULL;
  threadarg *ta = (threadarg*)arg;
  int sock, csock, content_len=0;
  char buf[MAXBUF];
  ReqInfo req;
  int atstart=1;
  double time;
  char *end=NULL;
  HandlerInfo *info;
  
  RQ_InitReq(&req, "null");
  sock = ta->sock;
  csock = ta->csock;

  //don't need the thread arg anymore
  MEM_free(ta);

  while (1) {
    int ret = socketRecv(sock, csock, buf, MAXBUF);
    int hi, go=0;

    if (atstart)
      time = time_ms();
    atstart = 0;

    if (ret >= MAXBUF) ret = MAXBUF-1;

    if (ret == -1 && body && array_len(body) == content_len) {
      go = 1;
    } else if (ret < 0) {
       RQ_Free(&req);
       break;
    } else if (ret > 0) {
      ret = MIN(ret, MAXBUF);

      //printf("got %d\n\n|%s\n", ret, reqs);
      array_catn(reqs, buf, ret);
    
      if (!end) {
        end = strnstr(reqs, "\r\n\r\n", array_len(reqs)+1);
        if (end) {
          int start;
          char *val;

          //find body, if it exists
          start =  (int)(end - reqs)+4;
          if (start < s_len(reqs)) {
            body = array_ndup((reqs+start), (array_len(reqs)-start));
          }

          array_resize(reqs, start+1);
          reqs[start] = 0;

          if (reqs[0] == 'P' && reqs[1] == 'U') {
            printf("put operation!\n");
          }
          ret = parse_request(reqs, &req, array_len(reqs));

          if (ret < 0) {
            fprintf(stderr, "parse_request error!");
            RQ_Free(&req);
            break;
          }

          val = RQ_GetHeader(&req, "Content-Length");
          if (val) {
            content_len = atoi(val) - 4;
            content_len = CLAMP(content_len, 0, MAXBODY);
          } else {
            content_len = 0;
          }
        }
      } else {
        array_catn(body, buf, ret);
      }
    }

    if (!go && (!end || array_len(body) < content_len))
      continue;
    
    //invoke response handler
    if (body == NULL)
      array_append(body, 0);
    
    req.body = body;
    
    info = HL_New(&req);
    do_default_res(sock, csock, info);

    printf("time : %.4fms\n\n", time_ms()-time);

    HL_Free(info);
    MEM_free(info);
    RQ_Free(&req);
    RQ_InitReq(&req, "null");

    sleep_ms(5);
    array_reset(reqs);
    body = NULL;
    atstart = 1;
    end = NULL;
  }
  
  array_free(body);
  array_free(reqs);
  dec_active_threads();
}

int serv(int sock) {
  int csock, ret;
  static int curthread=0;
  threadarg *ta;

  //print blocks before accepting next connection
  MEM_PrintMemBlocks(stderr);
  
  csock = waitForConnection(sock);
  while (active_threads >= MAXTHREAD) {
    sleep_ms(1);
  }

  ta = (threadarg*) MEM_calloc(sizeof(*ta), "threadarg");
  ta->csock = csock;
  ta->sock = sock;

  curthread++;
  inc_active_threads();

  ret = pthread_create(&curthread, NULL, thread_start, ta);
  if (ret != 0) {
    MEM_free(ta);
  }
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

  path =  RQ_EscapeDup("/root/?title=yay", RQ_ESC_QUERY); //a=[0]&b={2}&c=#4#label", RQ_ESC_QUERY);

  RQ_SplitQuery(path, &pathout, &query, &label);
  qs = RQ_ParseQuery(query);
  qlen = array_len(qs);

  for (i=0; i<qlen/2; i++) {
    printf("'%s' : '%s'\n", qs[i*2], qs[i*2+1]);
  }
  printf("\n");


  fprintf(stdout, "%s|'%s' : '%s' : '%s'\n", path, pathout, query, label);

  path = "/sdfdsf/sdfsd?a=title"; //yay yay yay&b = 2[] & c = bleh";
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

  path = RQ_BuildReq(&req, 1, 200);

  RQ_Free(&req);

  system("PAUSE");
}
