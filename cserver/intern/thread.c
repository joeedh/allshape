#include "memalloc.h"
#include "pthread.h"
#include "thread.h"

static pthread_mutex_t debug_mutex = PTHREAD_MUTEX_INITIALIZER;

static void tab(int c, char *buf)
{
  int i;
  for (i=0; i<c*2; i++) {
    buf[i] = ' ';
  }
  buf[i] = 0;
}

void _RW_rdlock(RWLock *lock, char *file, int line)
{
  char buf[128];
  tab(lock->c, buf);
  printf("%.3d rdlock : %s:%d\n", lock->c, file, line);
  
  pthread_rwlock_rdlock(lock);

  pthread_mutex_lock(&debug_mutex);
  lock->c++; //
  pthread_mutex_unlock(&debug_mutex);  
}

void _RW_wrlock(RWLock *lock, char *file, int line)
{
  char buf[128];
  tab(lock->c, buf);
  printf("%.3d wrlock : %s:%d\n", lock->c, file, line);
  
  pthread_rwlock_wrlock(lock);

  pthread_mutex_lock(&debug_mutex);
  lock->c++; //
  pthread_mutex_unlock(&debug_mutex);  
}

void _RW_unlock(RWLock *lock, char *file, int line)
{
  char buf[128];
  tab(lock->c, buf);
  printf("%.3d unlock : %s:%d\n", lock->c, file, line);
  
  pthread_rwlock_unlock(lock);

  pthread_mutex_lock(&debug_mutex);
  lock->c--; //
  pthread_mutex_unlock(&debug_mutex);  
}
