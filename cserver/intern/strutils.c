#include "memalloc.h"
#include "strutils.h"

#include <string.h>
#include <stdlib.h>
#include <stdio.h>
#include <math.h>

char *_check_dynstr(char *dynstr, const char *file, unsigned int line) {
  char c = 0;

  if (dynstr == NULL) 
    (dynstr=_Array_Append(dynstr, &c, sizeof(*dynstr), file, line));

  if (array_len(dynstr) == 0)
    (dynstr=_Array_Append(dynstr, &c, sizeof(*dynstr), file, line));

  return dynstr;
}

int _strlen(char *str)
{

}
char *ST_concat(char *dynstr, char *str, const char *file, unsigned int line) {
  int len = strnlen(str, 1024*1024*500);
  int thislen = dynstr ? strnlen(dynstr, s_len(dynstr)) : 0;

  dynstr = _check_dynstr(dynstr, file, line);

  (dynstr=_Array_Resize(dynstr, thislen+len+1, sizeof(*dynstr), file, line));
  
  dynstr[thislen] = 0;
  strcat(dynstr, str);

  return dynstr;
}

char *ST_cpy(char *dynstr, char *str, const char *file, unsigned int line) {
  int len = strlen(str);

  dynstr = _check_dynstr(dynstr, file, line);
  (dynstr=_Array_Resize(dynstr, len+1, sizeof(*dynstr), file, line));

  strcpy(dynstr, str);
  dynstr[len] = 0;

  return dynstr;
}

char *ST_dup(char *str, const char *file, unsigned int line) {
  char *s = NULL;
  int len;

  if (str == NULL) return NULL;
  len = CLAMP(strlen(str), 0, MAX_DYN_STR);

  (s=_Array_Resize(s, len+1, sizeof(*s), file, line));

  strcpy(s, str);
  s[len] = 0;

  return s;
}


static char _b64str[66] = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
static char _b64_map[255] = {
   0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
   0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
   0, 0, 0,62, 0, 0, 0,63,52,53,54,55,56,57,58,59,60,61, 0,
   0, 0,64, 0, 0, 0, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9,10,11,12,
  13,14,15,16,17,18,19,20,21,22,23,24,25, 0, 0, 0, 0, 0, 0,
  26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,
  45,46,47,48,49,50,51, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
   0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
   0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
   0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
   0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
   0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
   0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
   0, 0, 0, 0, 0, 0
};

char *b64encode(char *strin) {
  unsigned char *str = (unsigned char*) strin;
  unsigned char *s = NULL;
  int i, ci, ilen, j, jlen, a, b, n, c, arr[4] = {0,};
  int b1, b2, b3, b4, b5, b6;

  ilen = strnlen((char*)str, MAX_B64_STR);
  ci = 0;
  for (i=0; i<ilen-2; i += 3) {
    a = str[i]; b = str[i+1]; c = str[i+2];
    n = a | (b << 8) | (c << 16);
    
    b1 = n & 63;
    b2 = (n>>6) & 63;
    b3 = (n>>12) & 63;
    b4 = (n>>18) & 63;
  
    arr[0] = b1; arr[1] = b2; arr[2] = b3; arr[3] = b4;
    for (j=0; j<4; j++) {
      array_append(s, _b64str[arr[j]]);
    }
  }
  
  if ((ilen%3) != 0) {
    i = ilen % 3;
    
    if (i == 1) {
      n = str[ilen-1];
      
      b1 = n & 63;
      b2 = (n>>6) & 63;
      
      array_append(s, _b64str[b1]);
      array_append(s, _b64str[b2]);
      array_append(s, '='); array_append(s, '=');
    } else {
      n = str[ilen-2] | (str[ilen-1]<<8);
      
      b1 = n & 63;
      b2 = (n>>6) & 63;
      b3 = (n>>12) & 63;
      
      array_append(s, b1);
      array_append(s, b2);
      array_append(s, b3);
      array_append(s, '=');
    }
  }
  
  //null-terminate
  array_append(s, 0);
  return (char*) s;
}

char *b64decode(char *input) {
  unsigned char *s2 = NULL, *s=(unsigned char*)input;
  int i, n, a, b, c, d, ilen;

  ilen = strnlen((char*)s, MAX_B64_STR);
  //strip any whitespace
  for (i=0; i<ilen; i++) {
    if (s[i] != '\n' && s[i] != '\r' && s[i] != ' ' && s[i] != '\t')
      array_append(s2, s[i]);
  }
  
  s = s2;
  s2 = NULL;
  
  ilen = array_len(s);
  for (i=0; i<ilen; i += 4) {
    a = _b64_map[s[i]], b = _b64_map[s[i+1]], c = _b64_map[s[i+2]], d=_b64_map[s[i+3]];
    n = a | (b<<6) | (c<<12) | (d<<18);
    
    if (c == 65) {
      a = n & 255;
      array_append(s2, a);
      continue;
    } else if (d == 65) {
      a = n & 255;
      b = (n>>8) & 255;
      array_append(s2, a);
      array_append(s2, b);
      continue;
    }
    
    a = n & 255;
    b = (n>>8) & 255;
    c = (n>>16) & 255;
    
    array_append(s2, a);
    array_append(s2, b);
    if (d != '=')
      array_append(s2, c);
  }
  
  array_append(s2, 0);
  array_free(s);

  return s2;
}

static char _b64pathstr[66] = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_.-";
char _b64_pathmap[255] = {
   0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
   0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
   0, 0, 0, 0, 0,64,63, 0,52,53,54,55,56,57,58,59,60,61, 0,
   0, 0, 0, 0, 0, 0, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9,10,11,12,
  13,14,15,16,17,18,19,20,21,22,23,24,25, 0, 0, 0, 0,62, 0,
  26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,
  45,46,47,48,49,50,51, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
   0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
   0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
   0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
   0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
   0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
   0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
   0, 0, 0, 0, 0, 0
};

char *b64_path_encode(char *strin) {
  unsigned char *str = (unsigned char*) strin;
  unsigned char *s = NULL;
  int i, ci, ilen, j, jlen, a, b, n, c, arr[4] = {0,};
  int b1, b2, b3, b4, b5, b6;

  ilen = strnlen((char*)str, MAX_B64_STR);
  ci = 0;
  for (i=0; i<ilen-2; i += 3) {
    a = str[i]; b = str[i+1]; c = str[i+2];
    n = a | (b << 8) | (c << 16);
    
    b1 = n & 63;
    b2 = (n>>6) & 63;
    b3 = (n>>12) & 63;
    b4 = (n>>18) & 63;
  
    arr[0] = b1; arr[1] = b2; arr[2] = b3; arr[3] = b4;
    for (j=0; j<4; j++) {
      array_append(s, _b64pathstr[arr[j]]);
    }
  }
  
  if ((ilen%3) != 0) {
    i = ilen % 3;
    
    if (i == 1) {
      n = str[ilen-1];
      
      b1 = n & 63;
      b2 = (n>>6) & 63;
      
      array_append(s, _b64pathstr[b1]);
      array_append(s, _b64pathstr[b2]);
      array_append(s, '-'); array_append(s, '-');
    } else {
      n = str[ilen-2] | (str[ilen-1]<<8);
      
      b1 = n & 63;
      b2 = (n>>6) & 63;
      b3 = (n>>12) & 63;
      
      array_append(s, b1);
      array_append(s, b2);
      array_append(s, b3);
      array_append(s, '-');
    }
  }
  
  //null-terminate
  array_append(s, 0);
  return (char*) s;
}

#define DO_APPEND(s2, c) array_append(s2, (allow_bad_chars || (c) > 31) ? (c) : badchar)

char *b64_path_decode(char *input, int allow_bad_chars) {
  unsigned char *s2 = NULL, *s=(unsigned char*)input;
  int i, n, a, b, c, d, ilen;
  char badchar = '_';

  ilen = strnlen((char*)s, MAX_B64_STR);
  //strip any whitespace
  for (i=0; i<ilen; i++) {
    if (s[i] != '\n' && s[i] != '\r' && s[i] != ' ' && s[i] != '\t')
      array_append(s2, s[i]);
  }
  
  s = s2;
  s2 = NULL;
  
  ilen = array_len(s);
  for (i=0; i<ilen; i += 4) {
    a = _b64_pathmap[s[i]], b = _b64_pathmap[s[i+1]], c = _b64_pathmap[s[i+2]], d=_b64_pathmap[s[i+3]];
    n = a | (b<<6) | (c<<12) | (d<<18);
    
    if (c == 65) {
      a = n & 255;
      DO_APPEND(s2, a);
      continue;
    } else if (d == 65) {
      a = n & 255;
      b = (n>>8) & 255;
      DO_APPEND(s2, a);
      DO_APPEND(s2, b);
      continue;
    }
    
    a = n & 255;
    b = (n>>8) & 255;
    c = (n>>16) & 255;
    
    DO_APPEND(s2, a);
    DO_APPEND(s2, b);
    if (d != '-')
      DO_APPEND(s2, c);
  }
  
  DO_APPEND(s2, 0);
  array_free(s);

  return s2;
}
