"use strict";

class WebGLObjManager {
  constructor() {
    this.textures = {};
    this.framebuffers = {};
    this.buffers = {}; //vbo's
    this.renderbuffers = {};
    
    this.idgen = 1;
  }
  
  get totals() : ObjectMap<int> {
    function count_obj(obj) {
      var i = 0;
      for (var k in obj) {
        i++;
      }
      return i;
    }
    
    return {
      textures      : count_obj(this.textures),
      framebuffers  : count_obj(this.framebuffers),
      buffers       : count_obj(this.buffers),
      renderbuffers : count_obj(this.renderbuffers)
    }
  }
  
  patch_gl(WebGLRenderingContext gl) {
    var createTexture = gl.createTexture;
    var createFramebuffer = gl.createFramebuffer;
    var createRenderbuffer = gl.createRenderbuffer;
    var createBuffer = gl.createBuffer;
    
    var this2 = this;
    function wrap_func(func, name) {
      function wrapper() {
        var ret = func.call(gl);
        ret._id = this2.idgen++;
        this2[name][ret._id] = ret;
        
        return ret;
      }
      
      return wrapper;
    }
    
    gl.createTexture = wrap_func(createTexture, "textures");
    gl.createFramebuffer = wrap_func(createFramebuffer, "framebuffers");
    gl.createRenderbuffer = wrap_func(createRenderbuffer, "renderbuffers");
    gl.createBuffer = wrap_func(createBuffer, "buffers");
    
    function wrap_del_func(func, name) {
      function wrapper(obj) {
        if (obj == undefined || obj == null) {
          console.trace();
          console.log("undefined passed to a gl.delete*** function");
          return;
        }
        
        var map = this2[name];
        if (!("_id" in obj)) {
          console.trace();
          console.log("yeek, invalid obj passed to a gl.delete**** function", obj);
          return;
        }
        
        if (!(obj._id in map)) {
          console.trace();
          console.log("yeek, already dead obj passed to a gl.delete**** function", obj);
          return;
        }
        
        func.call(gl, obj);
        delete map[obj._id];
      }
      
      return wrapper;
    }
    
    gl.deleteTexture = wrap_del_func(gl.deleteTexture, "textures");
    gl.deleteFramebuffer = wrap_del_func(gl.deleteFramebuffer, "framebuffers");
    gl.deleteRenderbuffer = wrap_del_func(gl.deleteRenderbuffer, "renderbuffers");
    gl.deleteBuffer = wrap_del_func(gl.deleteBuffer, "buffers");
  }
}

var WebGLObjManager gld = undefined;
