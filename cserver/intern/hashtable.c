#include "memalloc.h"
#include "hashtable.h"
#include "utils.h"

#include <stdlib.h>
#include <string.h>

const unsigned int hashsizes[] = {
	5, 11, 17, 37, 67, 131, 257, 521, 1031, 2053, 4099, 8209, 
	16411, 32771, 65537, 131101, 262147, 524309, 1048583, 2097169, 
	4194319, 8388617, 16777259, 33554467, 67108879, 134217757, 
	268435459
};

/* SMHASH_CELL_UNUSED means this cell is inside a key series,
 * while SMHASH_CELL_FREE means this cell terminates a key series.
 *
 * no chance of anyone shoving INT32_MAX-2 into a *val pointer, I
 * imagine.  hopefully.
 *
 * note: these have the SMHASH suffix because we may want to make them public.
 */
#define SMHASH_CELL_UNUSED  ((void *)0x7FFFFFFF)
#define SMHASH_CELL_FREE    ((void *)0x7FFFFFFD)

#ifdef __GNUC__
#  pragma GCC diagnostic ignored "-Wstrict-overflow"
#  pragma GCC diagnostic error "-Wsign-conversion"
#endif

/* typically this re-assigns 'h' */
#define SMHASH_NEXT(h, hoff)  ( \
	CHECK_TYPE_INLINE(&(h),    unsigned int), \
	CHECK_TYPE_INLINE(&(hoff), unsigned int), \
	((h) + (((hoff) = ((hoff) * 2) + 1), (hoff))) \
	)

void Hash_init(SmallHash *hash)
{
	int i;

	memset(hash, 0, sizeof(*hash));

	hash->table = hash->_stacktable;
	hash->curhash = 2;
	hash->size = hashsizes[hash->curhash];

	hash->copytable = hash->_copytable;
	hash->stacktable = hash->_stacktable;

	for (i = 0; i < hash->size; i++) {
		hash->table[i].val = SMHASH_CELL_FREE;
	}
}

/*NOTE: does *not* free *hash itself!  only the direct data!*/
void Hash_release(SmallHash *hash)
{
	if (hash->table != hash->stacktable) {
		MEM_free(hash->table);
	}
}

void Hash_insert(SmallHash *hash, uintptr_t key, void *item)
{
	unsigned int h, hoff = 1;

	if (hash->size < hash->used * 3) {
		unsigned int newsize = hashsizes[++hash->curhash];
		SmallHashEntry *tmp;
		int i = 0;

		if (hash->table != hash->stacktable || newsize > SMSTACKSIZE) {
			tmp = MEM_calloc(sizeof(*hash->table) * newsize, "hashtable");
		}
		else {
			SWAP(SmallHashEntry *, hash->stacktable, hash->copytable);
			tmp = hash->stacktable;
		}

		SWAP(SmallHashEntry *, tmp, hash->table);

		hash->size = newsize;

		for (i = 0; i < hash->size; i++) {
			hash->table[i].val = SMHASH_CELL_FREE;
		}

		for (i = 0; i < hashsizes[hash->curhash - 1]; i++) {
			if (ELEM(tmp[i].val, SMHASH_CELL_UNUSED, SMHASH_CELL_FREE)) {
				continue;
			}

			h = (unsigned int)(tmp[i].key);
			hoff = 1;
			while (!ELEM(hash->table[h % newsize].val, SMHASH_CELL_UNUSED, SMHASH_CELL_FREE)) {
				h = SMHASH_NEXT(h, hoff);
			}

			h %= newsize;

			hash->table[h].key = tmp[i].key;
			hash->table[h].val = tmp[i].val;
		}

		if (tmp != hash->stacktable && tmp != hash->copytable) {
			MEM_free(tmp);
		}
	}

	h = (unsigned int)(key);
	hoff = 1;

	while (!ELEM(hash->table[h % hash->size].val, SMHASH_CELL_UNUSED, SMHASH_CELL_FREE)) {
		h = SMHASH_NEXT(h, hoff);
	}

	h %= hash->size;
	hash->table[h].key = key;
	hash->table[h].val = item;

	hash->used++;
}

void Hash_remove(SmallHash *hash, uintptr_t key)
{
	unsigned int h, hoff = 1;

	h = (unsigned int)(key);

	while ((hash->table[h % hash->size].key != key) ||
	       (hash->table[h % hash->size].val == SMHASH_CELL_UNUSED))
	{
		if (hash->table[h % hash->size].val == SMHASH_CELL_FREE) {
			return;
		}

		h = SMHASH_NEXT(h, hoff);
	}

	h %= hash->size;
	hash->table[h].key = 0;
	hash->table[h].val = SMHASH_CELL_UNUSED;
}

void *Hash_lookup(SmallHash *hash, uintptr_t key)
{
	unsigned int h, hoff = 1;
	void *v;

  if (hash->size == 0) return NULL;

	h = (unsigned int)(key);

	while ((hash->table[h % hash->size].key != key) ||
	       (hash->table[h % hash->size].val == SMHASH_CELL_UNUSED))
	{
		if (hash->table[h % hash->size].val == SMHASH_CELL_FREE) {
			return NULL;
		}

		h = SMHASH_NEXT(h, hoff);
	}

	v = hash->table[h % hash->size].val;
	if (ELEM(v, SMHASH_CELL_UNUSED, SMHASH_CELL_FREE)) {
		return NULL;
	}

	return v;
}


int Hash_haskey(SmallHash *hash, uintptr_t key)
{
	unsigned int h = (unsigned int)(key);
	unsigned int hoff = 1;

  if (hash->size == 0) return 0;

	while ((hash->table[h % hash->size].key != key) ||
	       (hash->table[h % hash->size].val == SMHASH_CELL_UNUSED))
	{
		if (hash->table[h % hash->size].val == SMHASH_CELL_FREE) {
			return 0;
		}

		h = SMHASH_NEXT(h, hoff);
	}

	return !ELEM(hash->table[h % hash->size].val, SMHASH_CELL_UNUSED, SMHASH_CELL_FREE);
}

int Hash_count(SmallHash *hash)
{
	return (int)hash->used;
}

void *Hash_iternext(SmallHashIter *iter, uintptr_t *key)
{
	while (iter->i < iter->hash->size) {
		if ((iter->hash->table[iter->i].val != SMHASH_CELL_UNUSED) &&
		    (iter->hash->table[iter->i].val != SMHASH_CELL_FREE))
		{
			if (key) {
				*key = iter->hash->table[iter->i].key;
			}

			iter->i++;

			return iter->hash->table[iter->i - 1].val;
		}

		iter->i++;
	}

	return NULL;
}

void *Hash_iternew(SmallHash *hash, SmallHashIter *iter, uintptr_t *key)
{
	iter->hash = hash;
	iter->i = 0;

	return Hash_iternext(iter, key);
}

//-----------------------------------------------------------------------------
// MurmurHashAligned2, by Austin Appleby

// Same algorithm as MurmurHash2, but only does aligned reads - should be safer
// on certain platforms. 

// Performance will be lower than MurmurHash2

#define MIX(h,k,m) { k *= m; k ^= k >> r; k *= m; h *= m; h ^= k; }

uintptr_t MurmurHashAligned2 ( const void * key, int len, unsigned int seed )
{
	const unsigned int m = 0x5bd1e995;
	const int r = 24;
	int sl, sr;

	const unsigned char * data = (const unsigned char *)key;

	unsigned int h = seed ^ len;

	int align = (int)data & 3;

	if(align && (len >= 4))
	{
		// Pre-load the temp registers

		unsigned int t = 0, d = 0;

		switch(align)
		{
			case 1: t |= data[2] << 16;
			case 2: t |= data[1] << 8;
			case 3: t |= data[0];
		}

		t <<= (8 * align);

		data += 4-align;
		len -= 4-align;

		sl = 8 * (4-align);
		sr = 8 * align;

		// Mix

		while(len >= 4)
		{
			unsigned int k;
			d = *(unsigned int *)data;
			t = (t >> sr) | (d << sl);

			k = t;

			MIX(h,k,m);

			t = d;

			data += 4;
			len -= 4;
		}

		// Handle leftover data in temp registers

		d = 0;

		if(len >= align)
		{
			unsigned int k;

			switch(align)
			{
			case 3: d |= data[2] << 16;
			case 2: d |= data[1] << 8;
			case 1: d |= data[0];
			}

			k = (t >> sr) | (d << sl);
			MIX(h,k,m);

			data += align;
			len -= align;

			//----------
			// Handle tail bytes

			switch(len)
			{
			case 3: h ^= data[2] << 16;
			case 2: h ^= data[1] << 8;
			case 1: h ^= data[0];
					h *= m;
			};
		}
		else
		{
			switch(len)
			{
			case 3: d |= data[2] << 16;
			case 2: d |= data[1] << 8;
			case 1: d |= data[0];
			case 0: h ^= (t >> sr) | (d << sl);
					h *= m;
			}
		}

		h ^= h >> 13;
		h *= m;
		h ^= h >> 15;

		return h;
	}
	else
	{
		while(len >= 4)
		{
			unsigned int k = *(unsigned int *)data;

			MIX(h,k,m);

			data += 4;
			len -= 4;
		}

		//----------
		// Handle tail bytes

		switch(len)
		{
		case 3: h ^= data[2] << 16;
		case 2: h ^= data[1] << 8;
		case 1: h ^= data[0];
				h *= m;
		};

		h ^= h >> 13;
		h *= m;
		h ^= h >> 15;

		return h;
	}
}

uintptr_t Hash_String(char *str) {
	return MurmurHashAligned2(str, array_len(str), 0);
}

uintptr_t Hash_CString(char *str) {
	return MurmurHashAligned2(str, strlen(str), 0);
}