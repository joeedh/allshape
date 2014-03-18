#ifndef _REQUEST_LIB
#define _REQUEST_LIB

extern char docroot[1048];
extern char servroot[1048];
extern char servhost[256];

typedef struct ReqInfo {
  char method[8];
  char *path;
  char **headers;
  int totheader;
  char *body;
} ReqInfo;

typedef struct HandlerInfo {
    ReqInfo *req, *res;
    char *docroot;
    char *servroot;
    char **query;
    char **query2;
    char *out_buf;
} HandlerInfo;

HandlerInfo *HL_New(ReqInfo *info);
//does not free HandlerInfo struct itself
void HL_Free(HandlerInfo *info);

char *RQ_BuildQuery(char **query);
char *RQ_GetQueryKey(HandlerInfo *info, char *key);
char *RQ_GetDataQueryKey(HandlerInfo *info, char *key);

void RQ_InitReq(ReqInfo *info, char *method);
//does not free ReqInfo struct itself
void RQ_Free(ReqInfo *info);

//duplicates header on the heap
void RQ_AddHeader(ReqInfo *info, char *header, char *val);
char *RQ_GetHeader(ReqInfo *info, char *header);
void RQ_StandardHeaders(ReqInfo *info, int content_length, char *mimeType);
char *RQ_BuildReq(ReqInfo *info, int add_path, int code);

char **RQ_ParseQuery(char *path);
int RQ_SplitQuery(char *path, char **pathout, char **query, char **label);

void RQ_EscapePath(char *input, char *output, int outlen, int mask);
void RQ_UnEscapePath(char *input, char *output, int outlen, int mask);
char *RQ_EscapeDup(char *input, int mask);
char *RQ_UnEscapeDup(char *input, int mask);
 
//called in main, on startup
void RQ_OnStartup(void);
void RQ_PrintHeaders(ReqInfo *req);
void RQ_OutHeaders(HandlerInfo *info, ReqInfo *req);

#define RQ_ESC_PATH   1
#define RQ_ESC_QUERY  2
#define RQ_ESC_LABEL  4
#define EQ_ESC_ALL    7

#endif /* _REQUEST_LIB */