struct Object;
typedef void (*gc_traverse)(void *gc, struct Object **refs);

typedef struct RootType {
  void (*construct)(void *self);
  void (*destruct)(void *self);
  
  void (*alloc)(void *self, int elements);
  void (*free)(void *self);
  void (*gc_traverse)(void *self, gc_traverse func); //f
  
  const int **ref_pointer_offsets;
  const char **attribute_names;
} RootType;

typedef struct Root {
  RootType *type;
  int gc_flag;
} Root;

struct StringType;
struct IteratorType;

typedef struct ObjectType {
  RootType prior;
  
  struct StringType (*__hash__)(void *self);
  struct StringType (*__toString__)(void *self);
  
  struct IteratorType (*__iterator__)(void *self);
} ObjectType;

typedef struct Object {
    Root prior;
} Object;

typedef struct StringType {
  ObjectType prior;
} StringType;

typedef struct String {
  const char *utf8;
} String;

/*is inherited by Array*/
typedef struct ObjectListType {
  ObjectType prior;
  
  void (*__getitem__)(void *self, unsigned int item);
  void (*__setitem__)(void *self, unsigned int item, Object *val);
  void (*append)(void *self, Object *val);
  void (*resize)(void *self, int newsize);
} ObjectListType;

typedef struct ObjectList {
  Object prior;
  
  Object **refs;
  unsigned int length;
} ObjectList;

