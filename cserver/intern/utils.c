#include <stdio.h>

#include "utils.h"
#include "memalloc.h"

void List_Append(List *list, void *vlink) {
	ListLink *link = (ListLink*) vlink;
	ListLink *last = (ListLink*) list->last;
	ListLink *first = (ListLink*) list->first;

	if (!list->first) {
		list->first = list->last = link;
		link->next = link->prev = NULL;
	} else {
		link->prev = last;
		last->next = link;

		link->next = NULL;
		list->last = link;
	}
}

void List_Prepend(List *list, void *vlink) {
	ListLink *link = (ListLink*) vlink;
	ListLink *last = (ListLink*) list->last;
	ListLink *first = (ListLink*) list->first;

	if (!list->first) {
		list->first = list->last = link;
		link->next = link->prev = NULL;
	} else {
		link->next = first;
		first->prev = link;

		link->prev = NULL;
		list->first = link;
	}
}

void List_Insert(List *list, void *before, void *vlink) {
	ListLink *link = (ListLink*) vlink;
	ListLink *last = (ListLink*) list->last;
	ListLink *first = (ListLink*) list->first;
	ListLink *next = (ListLink*) before;

	link->prev = next->prev;
	link->next = next;

	if (next->prev) next->prev->next = link;

	if (next == list->first)
			list->first = link;
}

void List_Remove(List *list, void *vlink) {
	ListLink *link = (ListLink*) vlink;
	ListLink *last = (ListLink*) list->last;
	ListLink *first = (ListLink*) list->first;

	if (link->prev) link->prev->next = link->next;
	if (link->next) link->next->prev = link->prev;
	if (link == list->first) list->first = link->next;
	if (link == list->last) list->last = link->prev;
}

void List_FreeListM(List *list)
{
	ListLink *link, *next;

	for (link=list->first; link; link=next) {
		next = link->next;
		MEM_free(link);
	}
}

