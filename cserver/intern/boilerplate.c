#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <math.h>

#include "boilerplate.h"

#define OUTFILE stdout
#define ERRFILE stderr

#define MAX_STR_OUT_LEN (1024*75)
#include "strutils.h"
#include "sock.h"

const void do_out(HandlerInfo *state, const char *str)
{
  s_cat(state->out_buf, (char*) str);

  if (strlen(str, MAX_STR_OUT_LEN*2) > MAX_STR_OUT_LEN) {
    fprintf(ERRFILE, "ERROR: bad str\n");
    fprintf(ERRFILE, "%s", str);
    return;
  }
}

PageHandlerFunc get_page(char *path) {
  int i, len;
  char path2[2048];
  char *c = path;

  if (path == NULL) return NULL;

  len = strlen(path);
  if (len == 0) return NULL;
  if (len >= sizeof(path2)-1) len = sizeof(path2)-2;

  if (path[0] != '/') {
    strncpy(path2+1, path, sizeof(path2));
    path2[0] = '/';
    path2[len+1] = 0;
    len++;
  } else {
    strncpy(path2, path, sizeof(path2));
    path2[len] = 0;
  }

  if (path2[len-1] == '/') {
    path2[len-1] = 0;
  }

  for (i=0; i<page_handlers_len; i++) {
    if (!strcmp(page_handler_names[i], path2))
      return page_handlers[i];
  }

  return NULL;
}


const char *CWS_getstr_str(char *input)
{
  return input;
}

const char *CWS_getstr_charSTAR(char *input)
{
  return input;
}

const char *CWS_getstr_int(int input)
{
  static char buf[32];
  sprintf(buf, "%d", input);
  return buf;
}

const char *CWS_getstr_float(float input)
{
  static char buf[32];
  sprintf(buf, "%.4f", input);
  return buf;
}
