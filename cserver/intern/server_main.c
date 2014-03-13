#include "sock.h"

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <math.h>

#ifdef WIN32

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

  printf("Bytes received: %d\n", iResult);

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
  int iResult, iSendResult;

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

sleep_ms(int ms) {
  Sleep(ms);
}
#endif

#define MAXBUF  4096

typedef struct ReqInfo {
  char method[8];
  char *path;
  char **headers;
  int totheader;
} ReqInfo;

#define CRLF "\r\n"

int expect(char *buf, char *word, int *i) {
  int j, len = strlen(word);

  for (j=0; j<len; j++) {
    if (!buf[*i] || buf[*i] != word[j]) {
      fprintf(stderr, "error in request: expected %s\n", word);
      return 0;
    }
    (*i)++;
  }

  return 1;
}

int consume_space(char *buf, int *i) {
  while (buf[*i] && (buf[*i] == ' ' || buf[*i] == '\t'))
    (*i)++;
}

int consume_ws(char *buf, int *i) {
  int c = strcspn(buf+*i, " \t\n\r");
  
  if (c > 0) (*i) += c;
}

int parse_request(char *buf, ReqInfo *req) {
  int i=0, *ih=&i;
  char c;
  char method[32];
  char path[8192];
  int j=0;

  memset(req, 0, sizeof(ReqInfo));
  
  c = strcspn(buf, " \t");

  if (c <= 0) return -1;

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
  
  consume_ws(buf, ih);
}

int serv(int sock) {
  char buf[MAXBUF];
  ReqInfo req;
  int csock;

  buf[0] = 0;
  buf[20] = 0;

  csock = waitForConnection(sock);
  
  while (1) {
    int ret = socketRecv(sock, csock, buf, MAXBUF);

    if (ret >= MAXBUF) ret = MAXBUF-1;
    if (ret < 0) {
      fprintf(stderr, "Connection error");
      break;
    }

    if (ret == 0) continue;

    buf[ret] = 0;
    buf[MAXBUF-1] = 0;

    printf("got %d\n\n|%s\n", ret, buf);
    ret = parse_request(buf, &req);

    if (ret < 0) {
      printf("parse_request error!");
    }

    sleep_ms(5);
  }
}


int main(int argc, char **argv) {
  int socket;
  
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
