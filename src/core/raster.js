"use strict";

class CacheStack extends Array {
  constructor(itemlen) {
    Array.call(this);
    
    this.dellist = [];
    this.ilen = itemlen;
  }
  
  pop() {
    var ret = Array.prototype.pop.apply(this, arguments);
    
    if (this.dellist.length < 64) {
      this.dellist.push(ret);
    }
    
    return ret;
  }
  
  clear() {
    var len = this.length;
    
    for (var i=0; i<len; i++) {
      this.pop(len);
    }
  }
  
  gen() {
    if (this.dellist.length != 0) {
      return this.dellist.pop();
    } else {
      return new Array(this.ilen);
    }
  }
}

/*this function stores 2d render state *only*.  
  3d transformation stacks and the like should
  be handled where they are needed.*/
class RasterState {
  constructor(gl, size) {
    this.size = size;
    
    //need to finish fontmanager code
    this.fonts = new FontManager();
    
    this.font = this.fonts.get_font(gl, this, 10);
    this.pos = [0, 0];
    
    this.iconsheet = new IconManager(gl, "content/iconsheet.png", [512, 512], [32, 32]);
    
    this.viewport_stack = new CacheStack(2)
    this.scissor_stack = new CacheStack(4)
  }

  begin_draw(gl, pos, size) {
    this.gl = gl;
    this.pos = pos;
    this.size = size;
    
    this.viewport_stack.clear();
    this.scissor_stack.clear();
    this.cur_scissor = undefined;
  }
  
  get viewport() {
    static ret = [[0, 0], [0, 0]];
    
    //check if we're inside a viewport
    if (this.viewport_stack.length > 0) {
      return this.viewport_stack[this.viewport_stack.length-1];
    } else {
      //eek! no current viewport.  fallback on global screen size in this case.
      ret[0][0] = ret[0][1] = 0.0;
      ret[1][0] = g_app_state.screen.size[0];
      ret[1][1] = g_app_state.screen.size[1];
      
      return ret;
    }
  }
  push_viewport(pos, size) {
    var arr = this.viewport_stack.gen()
    arr[0] = pos;
    arr[1] = size;
    
    this.viewport_stack.push(arr);
    this.pos = pos;
    this.size = size;
  }

  pop_viewport() {
    var ret = this.viewport_stack.pop(this.viewport_stack.length-1);
    
    this.pos = ret[0];
    this.size = ret[1];
    
    return ret;
  }

  push_scissor(pos, size) {
    var rect;
    var gl = this.gl;
    
    if (this.cur_scissor == undefined) {
      var rect = this.scissor_stack.gen();
      var size2 = g_app_state.screen.size;
      
      rect[0] = 0; rect[1] = 0; rect[2] = size2[0]; rect[3] = size2[1];
    } else {
      rect = this.cur_scissor;
    }

    this.scissor_stack.push(rect);
    
    this.gl.scissor(pos[0], pos[1], size[0], size[1]);
    
    if (this.cur_scissor == undefined) {
      this.cur_scissor = [pos[0], pos[1], size[0], size[1]];
    } else {
      var cur = this.cur_scissor;
      cur[0] = pos[0]; cur[1] = pos[1]; cur[2] = size[0]; cur[3] = size[1];
    }
  }

  pop_scissor() {
    var rect = this.scissor_stack.pop();
    
    var cur = this.cur_scissor;
    
    if (cur == undefined) {
      cur = [rect[0], rect[1], rect[2], rect[3]];
    } else {
      cur[0] = rect[0]; cur[1] = rect[1]; cur[2] = rect[2]; cur[3] = rect[3];
    }
    
    this.cur_scissor = cur;
    this.gl.scissor(rect[0], rect[1], rect[2], rect[3]);
  }

  reset_scissor_stack() {
    this.scissor_stack.clear();
    this.cur_scissor = undefined;
  }
}
