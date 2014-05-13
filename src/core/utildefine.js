var $_mh;


#ifdef NOCACHE
#define CACHEARR2(a, b) [a, b]
#define CACHEARR3(a, b, c) [a, b, c]
#define CACHEARR4(a, b, c, d) [a, b, c, d]
#else
#define CACHEARR2(a, b) (($_mh = objcache.array(2)), ($_mh[0] = (a)), ($_mh[1] = (b)), $_mh)
#define CACHEARR3(a, b, c) (($_mh = objcache.array(2)), ($_mh[0] = (a)), ($_mh[1] = (b)), ($_mh[2] = (c)), $_mh)
#define CACHEARR4(a, b, c, d) (($_mh = objcache.array(2)), ($_mh[0] = (a)), ($_mh[1] = (b)), ($_mh[2] = (c)), ($_mh[3] = (d)), $_mh)
#endif

var $_swapt;
#define SWAP(a, b) ($_swapt = a, a = b, b = $_swapt)
