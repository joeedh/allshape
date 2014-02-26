"use strict";

/*this function stores 2d render state *only*.  
  3d transformation stacks and the like should
  be handled where they are needed.*/
function RasterState(gl, size) {
  this.size = size;
  this.font = new Font(gl, this);
  this.pos = [0, 0];
  
  this.viewport_stack = [];
}
create_prototype(RasterState);

RasterState.prototype.begin_draw = function(gl, pos, size) {
  this.gl = gl;
  this.pos = pos;
  this.size = size;
  
  this.viewport_stack = [];
  this.scissor_stack = [];
  this.cur_scissor = undefined;
}

RasterState.prototype.push_viewport = function(pos, size) {
  this.viewport_stack.push([pos, size]);
  this.pos = pos;
  this.size = size;
}

RasterState.prototype.pop_viewport = function() {
  var ret = this.viewport_stack.pop(this.viewport_stack.length-1);
  
  this.pos = ret[0];
  this.size = ret[1];
  
  return ret;
}

RasterState.prototype.push_scissor = function(pos, size)
{
  var rect;
  var gl = this.gl;
  
  if (this.cur_scissor == undefined) {
    var size2 = g_app_state.screen.size;
    rect = [0, 0, size2[0], size2[1]]; //gl.getParameter(gl.SCISSOR_BOX);
  } else {
    rect = this.cur_scissor;
  }

  /*
  rect = gl.getParameter(gl.SCISSOR_BOX);
  if (cur_scissor != undefined) {
    var dif = new Vector4([rect[0], rect[1], rect[2], rect[3]])
    dif.sub(new Vector4(cur_scissor))
    dif = Math.sqrt(dif.dot(dif));
    
    if (dif != 0.0)
      throw new Error("corrupted scissor stack " + dif + ", " + JSON.stringify(cur_scissor) + ", " + JSON.stringify(rect))
  }
  */
  
  this.scissor_stack.push(new Vector4(rect));
  
  this.gl.scissor(pos[0], pos[1], size[0], size[1]);
  this.cur_scissor = [pos[0], pos[1], size[0], size[1]];
}

RasterState.prototype.pop_scissor = function()
{
  var rect = this.scissor_stack.pop();
  
  this.cur_scissor = rect;
  this.gl.scissor(rect[0], rect[1], rect[2], rect[3]);
}

RasterState.prototype.reset_scissor_stack  = function()
{
  this.scissor_stack = [];
  this.cur_scissor = undefined;
}
