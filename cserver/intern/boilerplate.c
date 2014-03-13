#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <math.h>

#include "boilerplate.h"

#define OUTFILE stdout
#define ERRFILE stderr

#define MAX_STR_OUT_LEN (1024*75)

const char *get_title1(void)
{
  return "yay";
}
const void do_out(const char *str)
{
  if (strlen(str) > MAX_STR_OUT_LEN) {
    fprintf(ERRFILE, "ERROR: bad str\n");
    fprintf(ERRFILE, "%s", str);
    return;
  }
  
  fprintf(OUTFILE, "%s", str);
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
