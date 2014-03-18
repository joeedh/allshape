#include "pthread.h"
#define MAXTHREAD 512

typedef struct RWLock {
  pthread_rwlock_t lock;
  int c;
} RWLock;

#define RWLOCK_INIT {PTHREAD_RWLOCK_INITIALIZER, 0}

void _RW_rdlock(RWLock *lock, char *file, int line);
void _RW_wrlock(RWLock *lock, char *file, int line);
void _RW_unlock(RWLock *lock, char *file, int line);

#define DEBUG_RW_LOCK
#ifdef DEBUG_RW_LOCK
  #define RW_rdlock(lock) _RW_rdlock(lock, __FILE__, __LINE__)
  #define RW_wrlock(lock) _RW_wrlock(lock, __FILE__, __LINE__)
  #define RW_unlock(lock) _RW_unlock(lock, __FILE__, __LINE__)
#else
  #define RW_rdlock(lock) pthread_rwlock_rdlock(lock->lock)
  #define RW_wrlock(lock) pthread_wrlock_rdlock(lock->lock)
  #define RW_unlock(lock) pthread_lock_rdlock(lock->lock)
#endif
