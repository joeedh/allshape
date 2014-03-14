#include "boilerplate.h"
#include "sock.h"
#include "requestlib.h"

EXPORT char docroot[1048] = "c:\\dev\\allshape\\cserver";
EXPORT char servroot[1048] = "c:\\dev\\allshape\\cserver";
EXPORT char servhost[256] = "localhost:8080";

HandlerInfo *HL_New(ReqInfo *info)
{
  HandlerInfo *hl = MEM_calloc(sizeof(HandlerInfo), "HandlerInfo");
  hl->docroot = s_dup(docroot);
  hl->servroot = s_dup(servroot);
  hl->req = info;
  hl->query = RQ_ParseQuery(info->path);

  return hl;
}

//does not free HandlerInfo struct itself, or .req
void HL_Free(HandlerInfo *info)
{
  int i, len;

  len = array_len(info->query);

  for (i=0; i<len; i++) {
    s_free(info->query[i]);
  }

  if (info->query)
    array_free(info->query);
  if (info->out_buf)
    s_free(info->out_buf);

  info->query = NULL;
  info->out_buf = NULL;
}

int RQ_SplitQuery(char *path, char **pathout, char **query, char **label)
{
  char buf[MAXQUERY];
  char *c = path;
  int i=0, j=0, qstart, lstart, plen;

  if (path == NULL) {
    fprintf(stderr, "NULL passed to RQ_SplitQuery()!");

    if (*pathout) *pathout = s_dup("");
    if (*query) *query = s_dup("");
    if (*label) *label = s_dup("");

    return 0;
  }

  plen = strlen(path);
  qstart = lstart = plen;

  if (strlen(path) >= MAXQUERY) {
    path[MAXQUERY-1] = 0;

    fprintf(stderr, "%s\n", path);
    fprintf(stderr, "corrupted path detected\n");
  }

  j = strcspn(c, "?");
  c += j;
  i += j;

  qstart = i;

  if (i < plen && buf[i] == '&') {
  }

  if (i < plen) {
    int lasti = i;

    while (i < plen) {
      lasti = i;

      i++;
      c++;

      j = strcspn(c, "#");
      i += j;
      c += j;
    }

    if (lasti < plen && path[lasti] == '#')
      lstart = lasti;
  }

  if (pathout && qstart != 0 && qstart <= plen) {
      memcpy(buf, path, qstart);
      buf[qstart] = 0;
      *pathout = s_dup(buf);
  } else if (pathout) {
    *pathout = s_dup("");
  }

  if (query && qstart < plen) {
    memcpy(buf, path+qstart, lstart-qstart);
    buf[lstart-qstart] = 0;
    *query = s_dup(buf);
  } else if (query) {
    *query = s_dup("");
  }

  if (label && lstart < plen) {
    memcpy(buf, path+lstart, plen-lstart);
    buf[plen-lstart] = 0;
    *label = s_dup(buf);
  } else if (label) {
    *label = s_dup("");
  }

  return 1;
}

char **RQ_ParseQuery(char *path)
{
  char *query;
  char *c;
  char *cur_word = NULL;
  char **ret = NULL;
  int i, qlen;
  char *buf=NULL;

  RQ_SplitQuery(path, NULL, &query, NULL);
  buf = s_dup(query);
  array_resize(buf, array_len(buf)*2);

  RQ_UnEscapePath(query, buf, array_len(buf), RQ_ESC_QUERY);
  s_free(query);

  query = buf;

  c = query;
  if (c[0] == '?')
    c++;

  qlen = strlen(c);
  for (i=0; i<qlen; i++, c++) {
    if (*c == '&' || *c == '=') {
      if (!cur_word) {
        cur_word = s_dup("");
      } else {
        array_append(cur_word, 0);
      }

      if (cur_word != NULL && cur_word[0] != 0)
        array_append(ret, cur_word);
      cur_word = NULL;
    } else {
      array_append(cur_word, *c);
    }
  }

  if (array_len(ret) > 0) {
    if (!cur_word) {
      cur_word = NULL;
      array_append(cur_word, 0);
    }
  
    array_append(ret, cur_word);

    if (array_len(ret) % 2 != 0)
      array_append(ret, "");
  }

  s_free(query);
  return ret;
}

static char good_chars[255] = {0,};
static char good_path_chars[255] = {0,};
static char good_label_chars[255] = {0,};
static char good_hex[255] = {0,};

static void init_good_chars(void) {
  int i;
  for (i = 'a'; i<='z'; i++) {
    good_chars[i] = 1;
  }

  for (i = 'A'; i<='Z'; i++) {
    good_chars[i] = 1;
  }

  for (i = '0'; i<'9'; i++) {
    good_chars[i] = 1;
    good_hex[i] = i-'0'+1;
  }

  good_chars['_'] = 1;
  good_chars['-'] = 1;
  good_chars['~'] = 1;
  good_chars['_'] = 1;

  //XXX is this wrong? don't mask & ? = for query part of URL?
  good_chars['&'] = 1;
  good_chars['='] = 1;
  good_chars['?'] = 1;

  good_path_chars['/'] = 1;
  good_label_chars['#'] = 1;

  good_hex['a'] = good_hex['A'] = 11;
  good_hex['b'] = good_hex['B'] = 12;
  good_hex['c'] = good_hex['C'] = 13;
  good_hex['d'] = good_hex['D'] = 14;
  good_hex['e'] = good_hex['E'] = 15;
  good_hex['f'] = good_hex['F'] = 16;
}

void RQ_OnStartup(void) {
  init_good_chars();
}

void RQ_UnEscapePath(char *input, char *output, int outlen, int mask)
{
  unsigned char *ci = (unsigned char*) input, *co =  (unsigned char*) output;
  int i = 0;

  while (i < outlen) {
    unsigned char c = *ci;

    if (c == '%' && i < outlen-3) {
      unsigned char a = good_hex[ci[1]], b = good_hex[ci[2]];
      if (a && b) {
        unsigned char h;
        a--; b--;

        h = 16*a + b;
        if (h == 20) h = ' ';

        i += 3;
        ci += 3;

        *co = h;
        co += 1;
        continue;
      }
    }

    *co = *ci;
    ci++;
    co++;
    i++;
  }
}

char *RQ_EscapeDup(char *input, int mask) {
  char *buf = s_dup(input);
  int blen = array_len(buf)*3;

  array_resize(buf, blen);
  RQ_EscapePath(input, buf, blen, mask);

  return buf;
}

char *RQ_UnEscapeDup(char *input, int mask) {
  char *buf = s_dup(input);
  int blen = array_len(buf)*2;

  array_resize(buf, blen);
  RQ_UnEscapePath(input, buf, blen, mask);

  return buf;
}

void RQ_EscapePath(char *input, char *output, int outlen, int mask)
{
  char *ci = input, *co = output;
  int i=0;

  while (i < outlen) {
    int good;
    unsigned char c = *(unsigned char*)ci;

    if (!c) {
      *co = 0;

      break;
    }

    good = 0;
    if (mask & RQ_ESC_QUERY)
      good = good_chars[c];
    
    if (!(mask & RQ_ESC_LABEL))
      good |= good_label_chars[c];
    if (!(mask & RQ_ESC_PATH))
      good |= good_path_chars[c];

    if (!good) {
      int j;

      if (i < outlen-3) {
        if (c == ' ') 
          c = 20;
        j = sprintf(co, "%%%2x", (int)c);
        if (j > 0) {
          co += j-1;
          i += j-1;
        }
      }
    } else {
      *co = *ci;
    }

    ci++;
    co++;
    i++;
  }

  //sanity check
  output[outlen-1] = 0;
}

char *RQ_BuildQuery(char **query)
{
  int i;
  char *buf = NULL;
  char *ret = NULL;
  int qlen = array_len(query);

  s_cat(ret, "?");

  for (i=0; i<qlen/2; i++) {
    int blen;

    if (i > 0)
      s_cat(ret, "&");

    blen = array_len(query[i*2])*3+1;
    array_resize(buf, blen);

    RQ_EscapePath(query[i*2], buf, blen, RQ_ESC_QUERY|RQ_ESC_LABEL|RQ_ESC_PATH);

    s_cat(ret, buf);
    s_cat(ret, "=");

    if (i*2+1 >= qlen) {
      break;
    }

    blen = array_len(query[i*2+1])*3+1;
    array_resize(buf, blen);

    RQ_EscapePath(query[i*2+1], buf, blen, RQ_ESC_QUERY|RQ_ESC_LABEL|RQ_ESC_PATH);

    s_cat(ret, buf);
  }

  return ret;
}

char *RQ_GetQueryKey(HandlerInfo *info, char *key)
{
  int len = array_len(info->query), i;

  for (i=0; i<len/2; i++) {
    if (info->query[i*2] && !strcmp(info->query[i*2], key))
      return i*2+1 < len ? info->query[i*2+1] : NULL;
  }

  return NULL;
}

void RQ_InitReq(ReqInfo *req, char *method)
{
  memset(req, 0, sizeof(*req));

  strncpy(req->method, method, sizeof(req->method));
  req->method[sizeof(req->method)-1] = 0;
}


//does not free ReqInfo struct itself
void RQ_Free(ReqInfo *req)
{
  int len, i;

  len = array_len(req->headers);
  for (i=0; i<len; i++) {
    s_free(req->headers[i]);
  }

  if (req->headers)
    array_free(req->headers);
  if (req->path)
    s_free(req->path);
}

void RQ_AddHeader(ReqInfo *req, char *header, char *val)
{
  array_append(req->headers, s_dup(header));
  array_append(req->headers, s_dup(val));
}

char *RQ_GetHeader(ReqInfo *req, char *header)
{
  int len = array_len(req->headers), i;

  for (i=0; i<len/2; i++) {
    if (req->headers[i*2] && !strcmp(req->headers[i*2], header))
      return i*2+1 < len ? req->headers[i*2+1] : NULL;
  }

  return NULL;
}

void RQ_StandardHeaders(ReqInfo *req, int content_length, char *mimeType)
{
  char buf[256];

  sprintf(buf, "%d", content_length);

  RQ_AddHeader(req, "Content-Length", buf);
  RQ_AddHeader(req, "Content-Type", mimeType);
  RQ_AddHeader(req, "ServerHost", servhost);
}

char *RQ_BuildReq(ReqInfo *req, int add_path)
{
  char *s = NULL;
  char **headers = req->headers;
  int i, len;

  s_cat(s, req->method);
  if (add_path) {
    s_cat(s, " ");
    s_cat(s, req->path);
  }

  s_cat(s, " http/1.1\r\n");

  len = array_len(headers);
  for (i=0; i<len/2; i++) {
    if (i*2+1 >= len) break;

    s_cat(s, headers[i*2]);
    s_cat(s, ": ");
    s_cat(s, headers[i*2+1]);
    s_cat(s, "\r\n");
  }
  s_cat(s, "\r\n");

  return s;
}