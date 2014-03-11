"use strict";

/*
  Iterator Tool property design:
  
  Fundamentally, iterator properties are collections
  whose data is resolved on access (not unlike the 
  datapath api).  The logical way to do this would be
  to implement a DataPathIterProperty class, that would
  take an arbitrary datapath to an iterator.
  
  Unfortunately, I don't really know what the rules or
  use cases are going to be, yet.  Until then, I shall
  stick with writing each iterator manually, and perhaps
  write the generic version later.
  
  So.  The single rule of iter properties is that the iterators
  they contain must not store direct references into the data 
  state *until they start iterating*.  Rather, they must store 
  lookup values like eid's, dataref's, etc.
  
  To make things even more complicated, we are not going to have
  separate iterator factory objects (e.g. with their own .__iterator__ methods).
  Instead, each iter class will iterate on it own, as well as be able to 
  spawn copies of itself for nested iteration.
  
  This means iterators have to store direct references while
  iterating, but *only then*.
*/

//a generic abstract class,
//for container types that can
//be stored directly in tool
//properties.
class TPropIterable {
  constructor() {
  }
  
  __iterator__() : ToolIter { }
}

class TCanSafeIter {
  constructor() {
  }
  
  __tooliter__() : TPropIterable {}
}

class ToolIter extends TPropIterable {
  constructor(Array<Function> itemtypes=[]) {
    TPropIterable.call(this);
     
    this.itemtypes = itemtypes;
    this.ctx = undefined; //is set by IterProperty, which gets it from calling code
    this.ret = {done : true, value : undefined}; //might try cached_iret() later. . .
  }
  
  next() {
    //calls this.parent._iter_end at iteration end
  }
  
  reset() {
  }
  
  spawn() { //spawn a copy of this iterator
  }
  
  //a utility function for child classes
  _get_block(ref) {
    if (this.ctx != undefined) {
      //a very paranoid test, for edge cases
      //where ctx.object is not the same as
      //ctx.datalib.get(new DataRef(ctx.object))
      //
      //I might get rid of it later.
      if (ref.lib_id == this.ctx.object.lib_id)
        return this.ctx.object;
      else
        return this.ctx.datalib.get(ref);
    }
  }
  
  __iterator__() {
    return this;
  }
  
  //subclasses are required to implement this
  static fromSTRUCT(reader) {
    var obj = new ToolIter();
    reader(obj);
    return obj;
  }
}
ToolIter.STRUCT = """
  ToolIter {
  }
""";

class MSelectIter extends ToolIter {
  constructor(int typemask, Mesh mesh) {
    ToolIter.call(this);
    
    //inherits .ctx, .parent (IterProperty), and .ret ({done, val} objet)
    
    this.meshref = new DataRef(mesh);
    this.mask = typemask;
    this.mesh = undefined;
    this.init = true;
    this.iter = undefined;
  }
  
  __iterator__() {
    if (this.init) {
      return this;
    } else { //detect nested iterator cases
      return new MSelectIter(this.mask, this.meshref);
    }
  }
    
  reset() {
    this.init = true;
    this.mesh = undefined;
    this.iter = undefined;
  }
  
  next() {
    if (this.init) {
      //init state
      this.mesh = this._get_block(this.meshref);
      this.init = false;
      this.iter = new selectiter(this.mesh, this.mask);
    }
    
    var ret = this.iter.next();
    
    if (ret.done) {
      this.reset();
    }
    
    return ret;
  }
}

class element_iter_convert extends ToolIter {
  constructor(iter, type) {
    ToolIter.call(this);
    
    if (!(iter instanceof TPropIterable)) {
      throw new Error("element_iter_convert requires a 'safe' TPropIterable-derived iterator");
    }
    
    this.vset = new set();
    this.iter = iter.__iterator__();
    this.subiter = undefined;
    
    if (type == MeshTypes.VERT)
      this.type = Vertex;
    else if (type == MeshTypes.EDGE)
      this.type = Edge;
    else if (type == MeshTypes.LOOP)
      this.type = Loop;
    else if (type == MeshTypes.FACE)
      this.type = Face;
  }
  
  reset() {
    if (this.iter.reset != undefined)
      this.iter.reset();
      
    this.vset = new set();
    this.iter.ctx = this.ctx;
  }
  
  __iterator__() {
    return this;
  }
  
  next() {
    if (this.mesh != undefined)
      this.iter.mesh = this.mesh;
      
    var v = this._next();
	
    if (v.done) return v;
	
    var vset = this.vset;
    while ((!v.done) && (v.value == undefined || vset.has(v.value))) {
      v = this._next();
    }
    
    if (!v.done)
      vset.add(v.value);
    
    return v;
  }
  
  _next() {
    if (this.subiter == undefined) {
      var next = this.iter.next();
      
      if (next.done) {
        this.reset();
        return next;
      }
  
      if (next.value.constructor.name == this.type.name)
        return next;
      
      this.subiter = next.value.verts.__iterator__();
    }
    
    var vset = this.vset;
	  var v = this.subiter.next();
	  if (v.done) {
        this.subiter = undefined;
        return this._next();
	  }
	  
	  return v;
  }
}
