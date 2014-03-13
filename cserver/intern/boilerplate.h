#define GETSTR(type, val) CWS_getstr_##type(val)

const char *CWS_getstr_charSTAR(char *input);
const char *CWS_getstr_int(int input);
const char *CWS_getstr_float(float input);

const void do_out(const char *str);

const char *get_title(void);
