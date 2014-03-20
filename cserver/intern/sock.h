//XXX
#ifndef _SOCK_H
#define _SOCK_H

#define WIN32
#ifdef WIN32

#ifndef WIN32_LEAN_AND_MEAN
#define WIN32_LEAN_AND_MEAN
#endif

#include <windows.h>
#include <winsock2.h>
#include <ws2tcpip.h>
#include <iphlpapi.h>
#include <stdio.h>

#pragma comment(lib, "Ws2_32.lib")

#endif

#define MAXBUF  16384
#define MAXURL  8196
#define MAXBODY 1024*1024*700

extern void *page_handlers[];
extern int page_handlers_len;
extern char *page_handler_names[];

#endif /* _SOCK_H */
