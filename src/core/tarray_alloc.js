"use strict";

#define POOL_SIZE 128
#define POOL_THRESHOLD  4096

//pool allocators interface with the world in bytes, not
//logical array indices
class TA_PoolAlloc {
  constructor(int cellsize, int type_size=4, int max_bytes = -1, Function cls = Float32Array) {
    this.pools = [];
    this.freelist = [];
    this.max_bytes = max_bytes;
    this.psize = cellsize*POOL_SIZE;
    this.used = 0;
    this.csize = cellsize;
    this.cls = cls;
    this.tsize = type_size;
    this.psize2 = POOL_SIZE*Math.floor(cellsize/type_size);
    this.csize2 = Math.floor(cellsize/type_size);
    this.memsize = 0;
    
    this.new_pool();
  }
  
  new_pool() {
    var cs = this.csize;
    var cs2 = this.csize2;
    var ts = this.tsize;
    var cls = this.cls;
    
    this.memsize += this.csize*POOL_SIZE;
    
    var p = new cls(this.psize2);
    
    for (var i=0; i<POOL_SIZE; i++) {
      var r = new Float32Array(p.buffer.slice(i*cs, i*cs+cs));
      r._is_free = true;
      this.freelist.push(r);
    }
    
    this.pools.push(p);
  }
  
  alloc() {
    if (this.freelist.length == 0) {
      this.new_pool();
    }
    
    this.used += this.csize;
    var ret = this.freelist.pop();
    
    //XXX is this necessary? can client code change the .length parameter?
    ret.length = this.csize2;
    ret._is_free = false;
    
    return ret;
  }
  
  free(Object tarr) {
    if (tarr == undefined || tarr._is_free == undefined) {
      console.trace();
      console.log("Warning: bad object ", tarr, " passed to TA_PoolAlloc.free()");
      return;
    }
    
    if (tarr._is_free) {
      console.trace();
      console.log("Warning: double free!");
      return;
    }
    
    this.used -= this.csize;
    this.freelist.push(tarr);
    tarr._is_free = true;
    
    //free memory if no elements are used and pool allocation is "excessive"
    if (this.used == 0 && this.pools.length > 1) { //5? are smaller numbers better than bigger ones?
      console.log("freeing unused pool");
      this.reset();
    }
  }
  
  reset() {
    this.destroy();
  }
  
  destroy() {
    this.memsize = 0;
    this.pools = [];
    this.freelist = [];
  }
}

//TA_Alloc interfaces with the world in logical array indices,
//unlike TA_PoolAlloc.  need to review whether TA_PoolAlloc
//needs to behave differently or not.
class TA_Alloc {
  constructor(Function cls=Float32Array, int type_size = 4) {
    this.tsize = type_size;
    this.cls = cls;
    this.pools = {};
    this.used = 0;
    this._memsize = 0;
  }
  
  alloc(int size) : Float32Array {
    size = Math.floor(size); //sanity check;
    
    if (size < 0 || size > 1<<23) {
      console.trace();
      throw new Error("Warning: bad size " + size.toString() + " passed to TA_Alloc.alloc()!");
    }
    
    if (size == 0) {
      var cls = this.cls;
      var ret = new cls();
      ret._t_asize_1 = 0;
      
      return ret;
    }
    
    var size2 = size*this.tsize;
    
    var cls = this.cls;
    var ret = undefined;
    
    if (size2 < POOL_THRESHOLD) {
      if (!(size in this.pools)) {
        console.log("TA_Alloc: creating pool of size " + size);
        this.pools[size] = new TA_PoolAlloc(size2, this.tsize, undefined, cls);
      }
      
      ret = this.pools[size].alloc();
    } else {
      ret = new cls(size);
      this._memsize += size2;
    }
    
    this.used += size2;
    
    //this is a copy of .length, in case .length changes for some reason
    //it is *not* the size of the typed array in bytes.
    ret._t_asize_1 = size; 
    
    return ret;
  }
  
  get memsize() {
    var ret = this._memsize;
    
    for (var k in this.pools) {
      ret += this.pools[k].memsize;
    }
    
    return ret;
  }
  
  free(ArrayBufferView data) {
    if (data == undefined || data._t_asize_1 == 0) {
      //silently fail
      return;
    }
    
    if (data == undefined || data._t_asize_1 == undefined) {
      console.trace();
      console.log("Warning: Bad typed array ", data, " passed to TA_Alloc.free()!");
      return;
    }
    
    this.used -= data._t_asize_1*this.tsize;
    
    if (data._t_asize_1*this.tsize < POOL_THRESHOLD) {
      if (this.pools[data._t_asize_1] != undefined) {
        this.pools[data._t_asize_1].free(data);
      } else {
        console.trace();
        console.log(JSON.stringify(Object.keys(this.pools)));
        console.log("Bad data._t_asize_1 ", data._t_asize_1, " for typed array of length ", data.length);
        return;
      }
    } else {
      //nothing to do yet for large arrays, which are handled by
      //the native GC
      this._memsize -= data._t_asize_1*this.tsize;
    }
  }
  
  from_array(Array arr) {
    //console.log("-", arr.length);
    
    var ret = this.alloc(arr.length);
    
    for (var i=0; i<arr.length; i++) {
      ret[i] = arr[i];
    }
    
    return ret;
  }
}

function test_pool_alloc() {
  console.log("\n\n====Start test_pool_alloc()=====")
  
  console.log("\n---testing TA_PoolAlloc---");
  var pa = new TA_PoolAlloc(8*3*4);
  
  var lst = [];
  for (var i=0; i<128; i++) {
    var arr = pa.alloc();
    lst.push(arr);
  }
  
  console.log("fl len:", pa.freelist.length);
  
  for (var i=0; i<lst.length; i++) {
    pa.free(lst[i]);
  }
  
  console.log("fl len:", pa.freelist.length);
  console.log("used: ", pa.used);
  
  var arr2 = pa.alloc();
  //arr[0] = 1;
  console.log(arr2.length, arr2[0]);
  
  console.log("\n---testing TA_Alloc---");
  var ta = new TA_Alloc();
  
  var ret1 = ta.alloc(4);
  ret1[0] = 1;
  console.log("  " + ret1[0], ret1.length);
  console.log("  used: ", ta.used);
  
  var ret2 = ta.alloc(4096);
  //ret[0] = 1;
  console.log("  " + ret2[0], ret2.length);
  console.log("  used: ", ta.used);
   
  ta.free(ret1);
  console.log("  used: ", ta.used);
  ta.free(ret2);
  console.log("  used: ", ta.used);
  
  console.log("total memsize: ", ta.memsize);
}

//test_pool_alloc();

