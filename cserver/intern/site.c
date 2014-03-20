#include "boilerplate.h"
#include "site_boilerplate.h"

#include <time.h>
#include "pthread.h"
#include "thread.h"

static RWLock db_lock = RWLOCK_INIT;

int PG_InitPage(DocPage *page, char *path, char *title, int type, char *body)
{
  char *b64path;
  memset(page, 0, sizeof(*page));

  strcpy(page->path, path);
  strcpy(page->title, title);

  b64path = b64_path_encode((unsigned char*)path);
  strncpy(page->b64path, b64path, sizeof(page->b64path));
  page->b64path[sizeof(page->b64path)] = 0;
  s_free(b64path);

  page->modified_time = (uint64) time(NULL);
  page->created_time = (uint64) time(NULL);
  page->flag = PAGE_FLAG_DEFAULT;
  page->body = body;
  page->type = type;

  strcpy(page->created_user_name, "admin");
  page->size = strlen(body);

  return 1;
}

char *page_folders[] = {
  "pages",
  "posts"
};
int num_page_types = 2;

FILE *PG_open_database(char *mode)
{
  FILE *f;
  char *datapath = s_dup(servroot);

  if (mode == NULL || mode[0] == 0) 
    return NULL;
  
  if (!s_endswith(datapath, "/") && !s_endswith(datapath, "\\"))
    s_cat(datapath, "/");

  s_cat(datapath, "site.pagedef");
  f = fopen(datapath, "rb");
  if (!f) {
    f = fopen(datapath, "wb");

    //page doesn't exist if database doesn't
    //but first check that we can access the
    //database directory, and spit out an error
    //if we cannot.
    if (!f) {
      fprintf(stderr, "Error! Could not generate site.pages!!\n");
      s_free(datapath);
      return NULL;
    }

    fclose(f);
  }

  f = fopen(datapath, mode);
  if (!f) {
    fprintf(stderr, "Impossible Error! Could not generate site.pages after first error check!!\n");
    s_free(datapath);
    return 0;
  }

  s_free(datapath);
  return f;
}

DocDatabase site_db = {0,};
int db_started = 0;

int PG_FreeDB() {
  int ilen, i;
  
  RW_wrlock(&db_lock);

  ilen = array_len(site_db.pages);
  for (i=0; i<ilen; i++) {
    if (site_db.pages[i].body)
      s_free(site_db.pages[i].body);
  }

  ilen = array_len(site_db.posts);
  for (i=0; i<ilen; i++) {
    if (site_db.posts[i].body)
      s_free(site_db.posts[i].body);
  }

  Hash_release(&site_db.page_hash);
  Hash_release(&site_db.post_hash);
  array_free(site_db.pages);
  array_free(site_db.posts);
  db_started = 0;

  memset(&site_db, 0, sizeof(site_db));
  RW_unlock(&db_lock);

  return 1;
}

int PG_ReloadDB() {
  FILE *dbfile = PG_open_database("rb");
  DocPage page;
  int off = 0;

  if (db_started) {
    PG_FreeDB();
  }

  RW_wrlock(&db_lock);

  memset(&site_db, 0, sizeof(site_db));
  Hash_init(&site_db.page_hash);
  Hash_init(&site_db.post_hash);

  if (!dbfile) {
    fprintf(stderr, "error loading database file in PG_ReloadDB\n");
    RW_unlock(&db_lock);
    return 0;
  }

  while (!feof(dbfile)) {
    int c = fread(&page, sizeof(page), 1, dbfile);
    if (c < 1) break;

    page.body = NULL;
    page.db_start = off;

    off += c*sizeof(DocPage);

    switch (page.type&PAGE_TYPE_MASK) {
      int i;

      case PAGE_TYPE_PAGE:
        i = array_len(site_db.pages);
        array_append(site_db.pages, page);
        Hash_insert(&site_db.page_hash, Hash_CString(page.b64path), site_db.pages+i);
        break;
      case PAGE_TYPE_POST:
        i = array_len(site_db.posts);
        array_append(site_db.posts, page);
        Hash_insert(&site_db.post_hash, Hash_CString(page.b64path), site_db.posts+i);
        break;
      default:
        fprintf(stderr, "Error! Corrupted page in PG_ReloadDB()!\n");
        break;
    }
  }

  db_started = 1;
  RW_unlock(&db_lock);
  return 1;
}

int PG_SaveDB() {
  FILE *f = PG_open_database("wb");
  int i, ilen;

  RW_rdlock(&db_lock);
  if (!db_started) {
    if (f)
      fclose(f);
    RW_unlock(&db_lock);
    return 0;
  }

  if (!f) {
    RW_unlock(&db_lock);
    return 0;
  }

  ilen = array_len(site_db.pages);
  for (i=0; i<ilen; i++) {
    fwrite(site_db.pages+i, sizeof(DocPage), 1, f);
  }

  ilen = array_len(site_db.posts);
  for (i=0; i<ilen; i++) {
    fwrite(site_db.posts+i, sizeof(DocPage), 1, f);
  }

  fclose(f);
  RW_unlock(&db_lock);

  return 1;
}

int PG_EnsureDB(void)
{
  if (!db_started) {
    return PG_ReloadDB();
  }

  return 1;
}

DocPage *PG_FetchPage(char *path, int type, int fetch_body) 
{
  SmallHash *hash;
  DocPage *page;
  char *b64path = b64_path_encode(path);

  PG_EnsureDB();

  RW_rdlock(&db_lock);

  hash = type == PAGE_TYPE_PAGE ? &site_db.page_hash : &site_db.post_hash;
  page = Hash_lookup(hash, Hash_CString(b64path));

  if (page && fetch_body && !page->body) {
    FILE *file = fopen(page->diskpath, "rb");
    if (!file) {
      fprintf(stderr, "error! could not open pagedata file %s (%s) for reading!", page->diskpath, path);
    } else {
      array_resize(page->body, page->size);
      fread(page->body, 1, page->size, file);
      array_append(page->body, 0);
      fclose(file);
    }
  }
  s_free(b64path);

  RW_unlock(&db_lock);
  return page;
}

int PG_PrintPageMeta(void) {
  int ilen1, ilen2, ilen, i;
  DocPage *page;

  PG_ReloadDB();
  RW_rdlock(&db_lock);

  ilen1 = array_len(site_db.pages);
  ilen2 = array_len(site_db.pages);
  ilen = ilen1+ilen2;
  for (i=0; i<ilen; i++) {
    page = i<ilen1 ? (site_db.pages+i) : (site_db.posts+i-ilen1);
    if (page == NULL) break;

    printf("%s:\"%s\", modified:%.1f, b64form: %s\n", page->title, 
            page->path, (double)page->modified_time, page->b64path);
  }
  RW_unlock(&db_lock);
}

static int pg_savepage_intern(DocPage *page)
{
  FILE *f;
  DocPage *page2;
  char *path = s_dup(docroot);
  char *meta_path = s_dup(docroot);
  int type = page->type & PAGE_TYPE_MASK;
  SmallHash *hash = type == PAGE_TYPE_PAGE ? &site_db.page_hash : &site_db.post_hash;

  if (!s_endswith(path, "/") && !s_endswith(path, "\\")) {
    s_cat(path, "/");
    s_cat(meta_path, "/");
  }

  if (type < 0 || type >= num_page_types) {
    fprintf(stderr, "Invalid DocPage type! %d\n", type);
    return 0;
  }

  s_cat(path, page_folders[type]);
  s_cat(path, "/");
  s_cat(path, page->b64path);

  printf("path: %s\n", path);

  strncpy(page->diskpath, path, sizeof(page->diskpath));
  page->diskpath[sizeof(page->diskpath)-1] = 0;

  s_cat(meta_path, page_folders[type]);
  s_cat(meta_path, "_meta/");
  s_cat(meta_path, page->b64path);

  printf("meta path: %s\n", meta_path);

  strncpy(page->diskpath_meta, meta_path, sizeof(page->diskpath_meta));
  page->diskpath_meta[sizeof(page->diskpath_meta)-1] = 0;

  f = fopen(path, "wb");
  if (!f) {
    fprintf(stderr, "Error: could not open file at path %s\n", path);
    return 0;
  }
  fwrite(page->body, 1, page->size, f);
  fclose(f);

  f = fopen(meta_path, "wb");
  if (!f) {
    fprintf(stderr, "Error: could not open file at path %s\n", path);
    return 0;
  }
  fwrite(page, sizeof(*page), 1, f);
  fclose(f);

  page2 = Hash_lookup(hash, Hash_CString(page->b64path));
  if (!page2) {
    switch (type) {
    case PAGE_TYPE_PAGE:
      page2 = array_growone(site_db.pages);
      break;
    case PAGE_TYPE_POST:
      page2 = array_growone(site_db.posts);
      break;
    default:
      fprintf(stderr, "error in pg_save_page_intern: invalid page type %d\n", type);
      return 0;
    }
  }

  memcpy(page2, page, sizeof(DocPage));
}

//this function, by definition, does *not* retain page->body
DocPage *PG_UpdatePage(DocPage *page) {
  DocPage *p2; 
  int ret;

  p2 = PG_FetchPage(page->path, page->type, 0);

  //update existing page record
  RW_wrlock(&db_lock);
  if (p2) {
    if (p2->body) {
      s_free(p2->body);
    }
    
    p2->body = s_dup(page->body);
    p2->modified_time = time(NULL);
    p2->size = page->size;
    p2->flag = page->flag;
    p2->flag2 = page->flag2;

    strncpy(p2->title, page->title, sizeof(page->title));
    page->title[sizeof(page->title)-1] = 0;

    page = p2;
  }
  RW_unlock(&db_lock);
  
  RW_wrlock(&db_lock);
  ret = pg_savepage_intern(page);
  RW_unlock(&db_lock);

  return ret && PG_SaveDB();
}

int PG_SavePage(DocPage *page) {
  return PG_UpdatePage(page);
}