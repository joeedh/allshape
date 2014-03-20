#ifndef _UTILS_H
#define _UTILS_H

typedef struct List {
	void *first, *last;
} List;

typedef struct ListLink {
	struct ListLink *next, *prev;
} ListLink;

void List_Append(List *list, void *vlink);
void List_Prepend(List *list, void *vlink);
void List_Insert(List *list, void *before, void *vlink);
void List_Remove(List *list, void *vlink);
void List_FreeListM(List *list);

#define ELEM(a, b, c) ((a) == (b) || (a) == (c))
#define ELEM3(a, b, c, d) (ELEM(a, b, c) || ELEM(a, c, d))
#define ELEM4(a, b, c, d, e) (ELEM3(a, b, c, d) || ELEM3(a, c, d, e))
#define ELEM5(a, b, c, d, e, f) (ELEM4(a, b, c, d, e) || ELEM4(a, c, d, e, f))
#define SWAP(type, a, b) {type _t; _t = a; a = b; b = _t;}
#define MAX(a, b) ((a) > (b) ? (a) : (b))
#define MIN(a, b) ((a) < (b) ? (a) : (b))
#define ABS(a) ((a) < 0 ? -(a) : (a))
#define CLAMP(n, min, max) MIN(MAX(n, min), max)

#define CHECK_TYPE_INLINE(val, type) ((void)(((type *)0) != (val)))

#define EXPORT 
#endif /* _UTILS_H */
