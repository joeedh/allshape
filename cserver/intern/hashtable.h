#ifndef _HASHTABLE_H
#define _HASHTABLE_H

#include <stdint.h>

/* a light stack-friendly hash library,
 * (it uses stack space for smallish hash tables) */

/* based on a doubling non-chaining approach */

typedef struct {
	uintptr_t key;
	void *val;
} SmallHashEntry;

/*how much stack space to use before dynamically allocating memory*/
#define SMSTACKSIZE 64
typedef struct SmallHash {
	SmallHashEntry *table;
	SmallHashEntry _stacktable[SMSTACKSIZE];
	SmallHashEntry _copytable[SMSTACKSIZE];
	SmallHashEntry *stacktable, *copytable;
	unsigned int used;
	unsigned int curhash;
	unsigned int size;
} SmallHash;

typedef struct {
	SmallHash *hash;
	int i;
} SmallHashIter;

#ifdef __GNUC__
#  define ATTR_NONULL_FIRST  __attribute__((nonnull(1)))
#  define ATTR_UNUSED_RESULT __attribute__((warn_unused_result))
#else
#  define ATTR_NONULL_FIRST
#  define ATTR_UNUSED_RESULT
#endif


void    Hash_init(SmallHash *hash)  ATTR_NONULL_FIRST;
void    Hash_release(SmallHash *hash)  ATTR_NONULL_FIRST;
void    Hash_insert(SmallHash *hash, uintptr_t key, void *item)  ATTR_NONULL_FIRST;
void    Hash_remove(SmallHash *hash, uintptr_t key)  ATTR_NONULL_FIRST;
void   *Hash_lookup(SmallHash *hash, uintptr_t key)  ATTR_NONULL_FIRST ATTR_UNUSED_RESULT;
int     Hash_haskey(SmallHash *hash, uintptr_t key)  ATTR_NONULL_FIRST;
int     Hash_count(SmallHash *hash)  ATTR_NONULL_FIRST;
void   *Hash_iternext(SmallHashIter *iter, uintptr_t *key)  ATTR_NONULL_FIRST ATTR_UNUSED_RESULT;
void   *Hash_iternew(SmallHash *hash, SmallHashIter *iter, uintptr_t *key)  ATTR_NONULL_FIRST ATTR_UNUSED_RESULT;

uintptr_t Hash_String(char *str);
uintptr_t Hash_CString(char *str);

#undef ATTR_NONULL_FIRST
#undef ATTR_UNUSED_RESULT

#endif /* _HASHTABLE_H */
