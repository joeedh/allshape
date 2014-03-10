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

class ToolIter {
  constructor() {
    this.parent = undefined : IterProperty;
    this.ctx = undefined; //is set by IterProperty, which gets it from calling code
    this.ret = {done : true, value : undefined}; //might try cached_iret() later. . .
  }
  
  set_parent(p) {
    this.parent = p;
  }
  
  next() {
    //calls this.parent._iter_end at iteration end
  }
  
  reset() {
  }
  
  spawn() { //spawn a copy of this iterator
  }
  
  _on_end() {
    this.parent._iter_end(this);
  }
  
  get_block(ref) {
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
}

class TMeshSelectIter extends ToolIter {
  constructor(int typemask, Mesh mesh) {
    ToolIter.call(this);
    
    //inherits .ctx, .parent (IterProperty), and .ret ({done, val} objet)
    
    this.meshref = new DataRef(mesh);
    this.mask = typemask;
    this.mesh = undefined;
    this.init = true;
  }
  
  _on_end() {
    prior(TMeshSelectIter, this)._on_end.call(this);
    this.mesh = undefined; //very important: clean up references.
  }
  
  next() {
    if (this.init) {
      //init state
      this.mesh = this.get_block(this.meshref);
      this.init = false;
    }
  }
}

class IterProperty extends ToolProperty {
  constructor(data, apiname, uiname, description, flag) {
    ToolProperty.call(this, data, apiname, uiname, description, flag);
    
    this.iter_use = 0;
    this._ctx = undefined;
  }
  
  get ctx() {
    return this._ctx;
  }
  
  set ctx(data) {
    this._ctx = data;
    
    if (this.data != undefined)
      this.data.ctx = data;
  }
  
  get data() {
    this.iter_use++;
    if (this.iter_use != 1)
      return this.data.spawn();
    else
      return this.data;
  }
  
  _iter_end(ToolIter iter) {
    this.iser_use--;
  }
  
  set_ctx(ToolContext tctx) {
    this.ctx = tctx;
  }
}