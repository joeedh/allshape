#include "../site_config.h"
#include "types.h"
#include "hashtable.h"

#define SITE_NAME "AllShape"
#define SITE_LOGO "/media/images/AllShape.png"
#define SITE_AUTHOR "Joe Eagar"

#define MAXTITLE  128

struct Hash;
struct DocPage;
typedef struct DocDatabase {
  int totpage, totpost;
  struct SmallHash page_hash;
  struct SmallHash post_hash;
  struct DocPage *pages, *posts;
} DocDatabase;

//if I had time to do things right, I wouldn't 
//expose this global variable
extern DocDatabase site_db;

typedef struct DocPage {
  unsigned int db_start; //start byte in database
  char title[MAXTITLE];

  char path[128];
  char b64path[512];

  char diskpath[128];
  char diskpath_meta[128];

  int type;

  int created_user_id;
  char created_user_name[256];

  uint64 modified_time;
  uint64 created_time;

  int flag;
  int flag2; //for future use?
  
  int size; //page data size
  char *body; //is set to NULL when saving this struct to disk
} DocPage;

#define PAGE_FLAG_VISIBLE     1
#define PAGE_FLAG_IN_MENUBAR  2
#define PAGE_FLAG_DEFAULT     3

//page data types
#define PAGE_TYPE_PAGE        0
#define PAGE_TYPE_POST        1
#define PAGE_TYPE_MASK        255

//subtypes
#define PAGE_TYPE_NEWS        1024
#define PAGE_TYPE_BLOG        2048

//api calls return true on success
int PG_SaveDB(void);
int PG_FreeDB(void);
int PG_ReloadDB(void);
int PG_EnsureDB(void);

int PG_InitPage(DocPage *page, char *path, char *title, int type, char *body);
DocPage *PG_FetchPage(char *path, int type, int fetch_body);
DocPage *PG_UpdatePage(DocPage *page);
int PG_SavePage(DocPage *page);
int PG_PrintPageMeta(void);
