#ifndef _BOILDERPLATE_H 
#define _BOILDERPLATE_H

#include "memalloc.h"
#include "poolalloc.h"
#include "utils.h"
#include "hashtable.h"
#include "strutils.h"
#include "requestlib.h"
#include "fileutils.h"

#define GETSTR(type, val) CWS_getstr_##type(val)

const char *CWS_getstr_charSTAR(char *input);
const char *CWS_getstr_int(int input);
const char *CWS_getstr_float(float input);
const char *CWS_getstr_str(char *input);

const void do_out(HandlerInfo *state, const char *str);

const char *get_title(void);

struct HandlerInfo;
typedef int (*PageHandlerFunc)(struct HandlerInfo *info);
extern PageHandlerFunc get_page(char *path);

#endif /* _BOILDERPLATE_H */