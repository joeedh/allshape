var $_mh;

#define NOCACHE

#ifdef NOCACHE
#define CACHEARR2(a, b) [a, b]
#define CACHEARR3(a, b, c) [a, b, c]
#else
#define CACHEARR2(a, b) (($_mh = objcache.array(2)), ($_mh[0] = (a)), ($_mh[1] = (b)), $_mh)
#define CACHEARR3(a, b, c) (($_mh = objcache.array(2)), ($_mh[0] = (a)), ($_mh[1] = (b)), ($_mh[2] = (c)), $_mh)
#endif

