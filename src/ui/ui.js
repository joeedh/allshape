"use strict";

var UIFlags = {
  ENABLED : 1, HIGHLIGHT: 2, 
  FOCUS: 4, GREYED: 8, 
  REDERROR: 16, WARNING: 32, 
  USE_PATH : 64, NO_RECALC: 128,
  FLASH : (16|32)
};

var PackFlags = {
  INHERIT_HEIGHT : 1, INHERIT_WIDTH: 2, 
  ALIGN_RIGHT : 4, ALIGN_LEFT: 8, 
  ALIGN_CENTER: 16, ALIGN_BOTTOM : 32, 
  IGNORE_LIMIT : 64, NO_REPACK : 128,
  UI_DATAPATH_IGNORE : 256
}
var CanvasFlags = {NOT_ROOT : 1, NO_PROPEGATE : 2}

var _ui_element_id_gen = 1;
var default_ui_font_size = 0.75;
function open_android_keyboard() {
   var canvas = document.getElementById("example")
   canvas.contentEditable = true
   canvas.focus()
}

function close_android_keyboard() {
    var  canvas = document.getElementById("example")
    canvas.contentEditable = false
    canvas.focus()
    
}

function UIElement(ctx, path, pos, size) { //path, pos, size are optional
  EventHandler.call(this)
  
  this._id = _ui_element_id_gen++;
  
  this.state = UIFlags.ENABLED;
  this.packflag = 0
  this.data_path = path;
  this.ctx = ctx
  this.parent = undefined
  
  //timer for error/warning flashes
  this.flash_timer_len = 0.2; //seconds
  this.flash_timer = undefined;
  
  if (pos == undefined)
    pos = [0, 0];
  
  if (size == undefined)
    size = [0, 0];
  
  this.size = size
  this.pos = pos
  
  this.recalc = 0;
  
  if (path != undefined) {
    this.state |= UIFlags.USE_PATH;
  }  
}
inherit(UIElement, EventHandler);

UIElement.prototype.__hash__ = function() : String {
  return this.constructor.name[2] + this.constructor.name[3] + this.constructor.name[4] + this._id;
}

UIFrame.prototype.set_context = function(ctx) {
  this.ctx = ctx;
}

UIElement.prototype.inc_flash_timer = function(color) {
  if (this.status_timer == undefined) return false;
    
  if (this.status_timer.ready()) {
    this.status_timer = undefined;
    this.state &= ~UIFlags.FLASH;
    return false;
  }
  
  return true;
}

UIElement.prototype.do_flash_color = function(color) {
  if (!this.inc_flash_timer()) return undefined;
  
  var color2;
  
  if (this.state & UIFlags.REDERROR)
    color2 = uicolors["ErrorBox"];
  else if (this.state & UIFlags.WARNING)
    color2 = uicolors["WarningBox"];
  
  if (color == undefined)
    color = color2;
  if (color2 == undefined)
    return undefined;
  
  var f = this.status_timer.normval;
  
  if (f < 0.5) f *= 2.0;
  else (f = 1.0 - f) *2.0;
  
  //console.log("f: " + f.toString());
  
  var l1 = [], l2 = [];
  if (typeof(color[0]) == "number") {
    l1.push(color);
  } else {
    for (var i=0; i<color.length; i++) {
      l1.push(color[i]);
    }
  }
  
  if (typeof(color2[0]) == "number") {
    l2.push(color2);
  } else {
    for (var i=0; i<color2.length; i++) {
      l2.push(color2[i]);
    }
  }
  
  while (l1.length < l2.length) {
    l1.push(l1[l1.length-1]);
  }
  while (l2.length < l1.length) {
    l2.push(l2[l2.length-1]);
  }
  
  var l3 = [];
  for (var i=0; i<l1.length; i++) {
    var clr = new Vector4(l1[i]);
    clr.interp(l2[i], f);
    l3.push(clr);
  }
  
  if (l3.length == 1) 
    return l3[0];
  else
    return l3;
}

UIElement.prototype.flash = function(status) {
  this.status_timer = new Timer(this.flash_timer_len*1000.0);
  this.state |= status;
}

UIElement.prototype.get_abs_pos = function() {
  var pos = [this.pos[0], this.pos[1]];
  
  var p = this.parent;
  while (p != undefined) {
    pos = [pos[0]+p.pos[0], pos[1]+p.pos[1]]
    p = p.parent;
  }
  
  return pos;
}

//calls a menu at an element's screen position, offset by off
UIElement.prototype.call_menu = function(menu, off, min_width) { //off, min_width are optional
  if (off == undefined) {
    off = [0, 0];
  }
  
  off[0] += this.pos[0];
  off[1] += this.pos[1];
  
  var frame;
  if (this.parent == undefined) {
    frame = this;
  } else  {
    frame = this.parent;
  }
  
  while (frame.parent != undefined) {
    off[0] += frame.pos[0];
    off[1] += frame.pos[1];
    frame = frame.parent;
  }
  off[0] += frame.pos[0];
  off[1] += frame.pos[1];
  
  ui_call_menu(menu, frame, off, false, min_width);
}

UIElement.prototype.set_prop_data = function(data) {
  var ctx = this.ctx;
  
  ctx.api.set_prop(ctx, this.data_path, data);
}

UIElement.prototype.get_prop_data = function() {
  var ctx = this.ctx;
  
  return ctx.api.get_prop(ctx, this.data_path);
}

UIElement.prototype.get_prop_meta = function() {
  var ctx = this.ctx;
  
  return ctx.api.get_prop_meta(ctx, this.data_path);
}

UIElement.prototype.do_recalc = function() {
  this.recalc = 1;
  
  if (this.parent != undefined && !this.is_canvas_root()) {
    this.parent.do_recalc();
  }
}

UIElement.prototype.push_modal = function(e) {
  if (e == undefined)
    e = this;
  
  EventHandler.prototype.push_modal.call(this, e);
  
  var p = this.parent
  while (p != undefined) {
    p.push_modal(e);
    
    e = p;
    p = p.parent;
  }
}

UIElement.prototype.pop_modal = function() {
  EventHandler.prototype.pop_modal.call(this);
  
  var p = this.parent
  while (p != undefined) {
    p.pop_modal();
    
    p = p.parent;
  }
}

UIElement.prototype.get_canvas = function() {
  var frame = this;
  while (frame.parent != undefined && frame.canvas == undefined) {
    frame = frame.parent;
  }
  
  return frame.canvas;
}

UIElement.prototype.is_canvas_root = function() : Boolean {
  var ret = this.parent == undefined || this.parent.canvas == undefined || (this.parent.canvas != this.canvas);
  
  ret = ret || this instanceof ScreenArea;
  ret = ret && this.canvas != undefined;
  ret = ret && !(this.canvas.flag & CanvasFlags.NOT_ROOT);
  
  return ret;
}

UIElement.prototype.on_tick = function() { };
UIElement.prototype.on_keydown = function(KeyboardEvent event) { };
UIElement.prototype.on_keyup = function(KeyboardEvent event) { };
UIElement.prototype.on_mousemove = function(MouseEvent event) { };
UIElement.prototype.on_mousedown = function(MouseEvent event) { };
UIElement.prototype.on_mousewheel = function(MouseEvent event) { };
UIElement.prototype.on_mouseup = function(MouseEvent event) { };
UIElement.prototype.on_contextchange = function(Object event) { };
UIElement.prototype.update_data = function(Context ctx) { }
UIElement.prototype.get_min_size = function(UICanvas canvas, Boolean isvertical) { };
UIElement.prototype.build_draw = function(UICanvas canvas, Boolean isvertical) { };
UIElement.prototype.on_active = function() {}
UIElement.prototype.on_inactive = function() {}
UIElement.prototype.pack = function(UICanvas canvas, Boolean isvertical) {}
UIElement.prototype.gen_tooltip = function() : String {}
UIElement.prototype.on_add = function(parent) {}
UIElement.prototype.on_remove = function(parent) {}

var _trilist_n0 = new Vector3(); var _trilist_n1 = new Vector3()
var _trilist_n2 = new Vector3(); var _trilist_n3 = new Vector3()
var _trilist_v1 = new Vector3(); var _trilist_v2 = new Vector3()
var _trilist_v3 = new Vector3(); var _trilist_v4 = new Vector3()
var _trilist_c1 = new Vector4(); var _trilist_c2 = new Vector4()
var _trilist_c3 = new Vector4(); var _trilist_c4 = new Vector4()
var _trilist_v5 = new Vector3(); var _trilist_v6 = new Vector3();
var _trilist_v7 = new Vector3(); var _trilist_v8 = new Vector3();
var _trilist_v9 = new Vector3();

function TriList(View3DHandler view3d, UICanvas canvas) {
  this.verts = [];
  this.colors = [];
  this.texcos = [];
  this.use_tex = 0;
  this.tex = 0 : WebGLTexture;
  this.view3d = view3d : View3DHandler;
  
  this.recalc = 1
  this.tottri = 0;
  this.canvas = canvas
  this.spos = undefined : Array<float>;
  this.ssize = undefined : Array<float>;
  this.gl_spos = undefined : Array<float>;
  this.gl_ssize = undefined : Array<float>;
  this.viewport = canvas.viewport;
  
  this.add_tri = function(Vector3 v1, Vector3 v2, Vector3 v3, 
                          Array<float> c1, Array<float> c2, Array<float> c3,
                          Array<float> t1, Array<float> t2, Array<float> t3) 
  {
    var vs = this.verts;
    
    this.tottri++;
    
    _trilist_v1.load(v1); _trilist_v2.load(v2); _trilist_v3.load(v3);
    v1 = _trilist_v1; v2 = _trilist_v2; v3 = _trilist_v3;
    
    this.transform(v1); this.transform(v2); this.transform(v3);
    
    vs.push(v1[0]); vs.push(v1[1]); vs.push(v1[2]); 
    vs.push(v2[0]); vs.push(v2[1]); vs.push(v2[2]); 
    vs.push(v3[0]); vs.push(v3[1]); vs.push(v3[2]);
    
    var cs = this.colors
    
    if (c2 == undefined) {
      c2 = c1;
      c3 = c1;
    }
    
    cs.push(c1[0]); cs.push(c1[1]); cs.push(c1[2]); cs.push(c1[3]);
    cs.push(c2[0]); cs.push(c2[1]); cs.push(c2[2]); cs.push(c2[3]);
    cs.push(c3[0]); cs.push(c3[1]); cs.push(c3[2]); cs.push(c3[3]);
    
    if (this.use_tex) {
      if (t1 == undefined)
        t1 = t2 = t3 = [0, 0]
      
      var ts = self.texcos
      ts.push(t1[0]); ts.push(t1[1]); ts.push(t2[0]); ts.push(t2[1]);
      ts.push(t3[0]); ts.push(t3[1])
    }
  }
  
  this.add_quad = function(Vector3 v1, Vector3 v2, Vector3 v3, Vector3 v4,
                           Array<float> c1,Array<float> c2,Array<float> c3,
                           Array<float> c4,Array<float> t1,Array<float> t2,
                           Array<float> t3,Array<float> t4)
  {
    this.add_tri(v1, v2, v3, c1, c2, c3, t1, t2, t3);
    this.add_tri(v1, v3, v4, c1, c3, c4, t1, t3, t4);
  }
  
  this.transform = function(v) {
    if (v.length == 2) v.push(0);
    
    var v3 = _trilist_v9;
    v3[0] = v[0]; v3[1] = v[1]; v3[2] = v[2];
    
    v3.multVecMatrix(this.canvas.transmat);
    
    v[0] = (v3[0]/this.viewport[1][0])*2.0 - 1.0;
    v[1] = (v3[1]/this.viewport[1][1])*2.0 - 1.0;
  }
  
  this.line = function(v1, v2, c1, c2, width) { //c2 and width are optional
    if (c2 == undefined) {
      c2 = c1;
    }
    
    if (v1.length == 2) v1.push(0);
    if (v2.length == 2) v2.push(0);
    
    this.line_strip([[v1, v2]], [[c1, c2]], undefined, width);
  }
  
  this.line_strip = function(lines, colors, texcos, width, half) {//width, width are optional
    if (width == undefined) {
      width = 2.0;
    }
    if (half == undefined) {
      half = false;
    }
    
    for (var i =0; i<lines.length; i++) {
      if (lines[i][0].length == 2) lines[i][0].push(0);
      if (lines[i][1].length == 2) lines[i][1].push(0);
      
      var v1 = _trilist_v5.load(lines[i][0])
      var v2 = _trilist_v6.load(lines[i][1])
      var v0=_trilist_v7, v3=_trilist_v8, n0=_trilist_n1, n1=_trilist_n2, n2=_trilist_n3;
      var c3=_trilist_c3, c4=_trilist_c4
      
      n0.zero(); n1.zero(); n2.zero();
      
      var z = 0.0
      
      v1.load(lines[i][1]);
      v1.sub(lines[i][0]);
      v1.normalize();
      
      n1[0] = v1[1];
      n1[1] = -v1[0];
      n1[2] = z;
      n1.normalize()
      
      if (i > 0) {
        v0.load(lines[i-1][1]);
        v0.sub(lines[i-1][0])
        v0.normalize();
        
        n0[0] = v0[1];
        n0[1] = -v0[0];
        n0[2] = z;
        n0.normalize()
      } else {
        n0.load(n1);
      }
      
      v1.load(lines[i][1]);
      v1.sub(lines[i][0])
      
      if (i < lines.length-1) {
        v3.load(lines[i+1][1]);
        v3.sub(lines[i+1][0]);
        v3.normalize();
        
        n2[0] = v3[1];
        n2[1] = -v3[0];
        n2[2] = z;
        n2.normalize()
      } else {
        n2.load(n1);
      }
      
      n0.normalize();
      n1.normalize();
      n2.normalize();
      
      n0.mulScalar(0.5);
      n1.mulScalar(0.5);
      n2.mulScalar(0.5);
      
      n2.add(n1).normalize();
      n1.add(n0).normalize();
      
      n1.mulScalar(width*0.5);
      n2.mulScalar(width*0.5);
      
      v0.load(lines[i][0]);
      v1.load(lines[i][1]);
      
      v2.load(lines[i][1]);
      v2.add(n1);
      v3.load(lines[i][0]);
      v3.add(n2);
      
      var c1 = _trilist_c1.load(colors[i][0]); var c2 = _trilist_c2.load(colors[i][1]);
      var c3 = _trilist_c3.load(colors[i][1]); var c4 = _trilist_c4.load(colors[i][0]);
      
      c3[3] = 0.0; c4[3] = 0.0;
      n1.mulScalar(2.0);
      n2.mulScalar(2.0);
      if (this.use_tex) { 
        if (!half)
          this.add_quad(v0, v1, v2, v3, c1, c2, c3, c4, texcos[i][0], 
                      texcos[i][1], texcos[i][0], texcos[i][1]);
        this.add_quad(v1, v0, v3.sub(n1), v2.sub(n2), c2, c1, c3, c4, texcos[i][0], 
                      texcos[i][1], texcos[i][0], texcos[i][1]);
      } else {
        if (!half)
         this.add_quad(v0, v1, v2, v3, c1, c2, c3, c4);
        this.add_quad(v1, v0, v3.sub(n2), v2.sub(n1), c2, c1, c3, c4);
      }
      
    }
  }
  
  this.destroy = function() {
    var gl = this.view3d.gl
    
    if (this.vbuf) {
      gl.deleteBuffer(this.vbuf);
      gl.deleteBuffer(this.cbuf);
    }
    if (this.tbuf) {
      gl.deleteBuffer(this.tbuf);
    }  
    
    this.vbuf = this.cbuf = this.tbuf = undefined;
    this.recalc = 1;
  }
  
  this.gen_buffers = function(gl) {
    this.verts = new Float32Array(this.verts)
    this.colors = new Float32Array(this.colors)
    if (this.use_tex)
      this.texcos = new Float32Array(this.texcos);
    
    gl.enableVertexAttribArray(0);
    gl.enableVertexAttribArray(1);
    
    if (this.use_tex)
      gl.enableVertexAttribArray(2);
    else
      gl.disableVertexAttribArray(2);
          
    var vbuf = gl.createBuffer();    
    gl.bindBuffer(gl.ARRAY_BUFFER, vbuf);
    gl.bufferData(gl.ARRAY_BUFFER, this.verts, gl.STATIC_DRAW);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, vbuf);

    var cbuf = gl.createBuffer();    
    gl.bindBuffer(gl.ARRAY_BUFFER, cbuf);
    gl.bufferData(gl.ARRAY_BUFFER, this.colors, gl.STATIC_DRAW);
    gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, cbuf);

    if (this.use_tex) {
      var tbuf = gl.createBuffer();    
      gl.bindBuffer(gl.ARRAY_BUFFER, tbuf);
      gl.bufferData(gl.ARRAY_BUFFER, this.texcos, gl.STATIC_DRAW);
      gl.vertexAttribPointer(2, 2, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, tbuf);
      this.tbuf = tbuf
    }    
    this.vbuf = vbuf;
    this.cbuf = cbuf;
    
    gl.disableVertexAttribArray(1);
    gl.disableVertexAttribArray(2);

    this.recalc = 0;
  }
  
  this.on_draw = function(gl) {
    if (this.recalc) {
      this.gen_buffers(gl);
    }
    
    if (this.ssize != undefined) {
      gl.enable(gl.SCISSOR_TEST);
      g_app_state.raster.push_scissor(this.spos, this.ssize);
    }
    
    gl.disable(gl.DEPTH_TEST);
    
    gl.enable(gl.BLEND);
    gl_blend_func(gl);
    
    //gl.blendEquation(gl.BLEND_EQUATION);
    //gl.blendEquationSeparate(gl.BLEND_EQUATION, gl.BLEND_EQUATION);
    
    gl.enableVertexAttribArray(0);
    gl.enableVertexAttribArray(1);
    gl.disableVertexAttribArray(3);
    gl.disableVertexAttribArray(4);
    
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbuf);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbuf);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.cbuf);
    gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.cbuf);

    if (this.use_tex) {
      gl.enableVertexAttribArray(2);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.tbuf);
      gl.vertexAttribPointer(2, 2, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.tbuf);
    } else {
      gl.disableVertexAttribArray(2);
    } 
    
    gl.useProgram(gl.basic2d.program);
    
    //console.log(this.verts);
    //console.log(this.tottri*3, this.verts.length/3, this.colors.length/4, this.verts[0], this.verts[1], this.verts[2])
    gl.drawArrays(gl.TRIANGLES, 0,this.tottri*3);
    
    gl.disableVertexAttribArray(1);
    gl.disableVertexAttribArray(2);
    
    gl.enable(gl.DEPTH_TEST);
    
    if (this.ssize != undefined) {
      g_app_state.raster.pop_scissor();
    }
  }
}

function TextDraw(pos, text, color, view3d, mat, spos, ssize, viewport, size) {
  this.text = text;
  this.pos = pos;
  this.color = color;
  this.view3d = view3d
  this.transmat = new Matrix4(mat)
  this.tdrawbuf = undefined : TextDrawBuffer;
  this.spos = spos;
  this.ssize = ssize;
  this.viewport = viewport;
  this.size = size;
  this.transmat.translate(pos[0], pos[1], 0.0);
  this.transmat.scale(size, size, size);
  
  this.destroy = function() {
    if (this.tdrawbuf != undefined)
      this.tdrawbuf.destroy();
    this.tdrawbuf = undefined;
  }
  
  this.on_draw = function(gl) {
    gl.disableVertexAttribArray(4);
    if (this.tdrawbuf == undefined)
      this.tdrawbuf = this.view3d.font.gen_text_buffers(gl, 0, 0, this.text, this.color, this.transmat, this.viewport);
    
    var spos, ssize;
    
    if (this.ssize != undefined) {
        spos = new Vector3([this.spos[0], this.spos[1], 0]);
        ssize = new Vector3([this.ssize[0], this.ssize[1], 0]);
        
        g_app_state.raster.push_scissor(spos, ssize);
    }
    
    this.tdrawbuf.on_draw(gl);
    
    if (this.ssize != undefined) {
      g_app_state.raster.pop_scissor();
    }
  }
}

var __uicanvas_id = 1;
//viewport is optional, defaults to view3d.size
function UICanvas(view3d, viewport) { 
  if (viewport == undefined)
    this.viewport = [view3d.pos, view3d.size];
  else
    this.viewport = viewport;
    
  this.trilist = new TriList(view3d, this)
  this.view3d = view3d;
  this.trilist.view3d = view3d
  
  this.trans_stack = []
  this.transmat = new Matrix4()
  
  this.drawlists = [this.trilist]
  this.stack = []
  
  this.cache = new hashtable();
  this.oldcache = new hashtable();
  
  this.uncached = new GArray([this.trilist]);
  this.scissor_stack = new GArray();
  
  this.flag = 0;
  this._id = __uicanvas_id++;
}
create_prototype(UICanvas);

UICanvas.prototype.push_scissor = function(pos, size) {
  var oldpos = pos;
  
  pos = new Vector3([pos[0], pos[1], 0]);
  size = new Vector3([size[0], size[1], 0]);
  
  pos.multVecMatrix(this.transmat);
  size.multVecMatrix(this.transmat);
  
  var dx = pos[0] - oldpos[0], dy = pos[1] - oldpos[1];
  size[0] -= dx; size[1] -= dy;
  
  for (var i=0; i<3; i++) {
    pos[i] = Math.floor(pos[i]);
    size[i] = Math.ceil(size[i]);
  }
  
  this.scissor_stack.push([pos, size]);
  
  this.new_trilist();
}

UICanvas.prototype.pop_scissor = function() {
  this.scissor_stack.pop();
  this.new_trilist();
}

UICanvas.prototype.new_trilist = function() {
  this.trilist = new TriList(this.view3d, this);
  
  if (this.scissor_stack.length > 0) {
    this.trilist.spos = this.scissor_stack[this.scissor_stack.length-1][0];
    this.trilist.ssize = this.scissor_stack[this.scissor_stack.length-1][1];
  }
  
  this.drawlists.push(this.trilist);
  
  return this.trilist;
}

UICanvas.prototype.push_transform = function(mat) {
  this.trans_stack.push(this.transmat)
  
  this.transmat = new Matrix4(this.transmat)
  this.transmat.multiply(mat);
}

UICanvas.prototype.pop_transform = function() {
  this.transmat = this.trans_stack.pop();
}

UICanvas.prototype.begin = function(Object item) {
  this.stack.push(this.drawlists.length);
  
  this.new_trilist();
}

UICanvas.prototype.end = function(Object item) {
  var arr = new GArray([])
    
  for (var i=this.stack[this.stack.length-1]; i<this.drawlists.length; i++) {
    arr.push(this.drawlists[i]);
  }
  
  this.stack.pop();  
  this.cache.set(item, arr);
  this.new_trilist();
  
  return arr;
}

UICanvas.prototype.use_cache = function(Object item) {
  if (this.oldcache.has(item)) {
    var arr = this.oldcache.get(item);
    
    for (var i=0; i<arr.length; i++) {
      this.drawlists.push(arr[i]);
    }
    
    this.oldcache.remove(item);
    this.cache.set(item, arr);
  }
}

UICanvas.prototype.has_cache = function(Object item) {
  return this.oldcache.has(item);
}

UICanvas.prototype.remove_cache = function(Object item) {
  if (this.oldcache.has(item))
    this.oldcache.remove(item);
}

UICanvas.prototype.textsize = function(text, size) {
  if (size == undefined)
    size = default_ui_font_size;
  
  var box = this.view3d.font.calcsize(text);
  return [box[0]*size, box[1]*size];
}

UICanvas.prototype.line = function(v1, v2, c1, c2, width) {
  if (c2 == undefined) {
    c2 = c1;
  }
  
  this.line_strip([[v1, v2]], [[c1, c2]], undefined, width);
}

var _ls_static_colors = {reallength: 0, length: 0};
UICanvas.prototype.line_strip = function(lines, colors, texcos, width, half) {//colors,texcos,width are optional
  if (colors == undefined) {
    colors = uicolors["DefaultLine"];
  }
  
  if (typeof(colors[0]) == "number") {
    var clr = colors;
    
    colors =_ls_static_colors;
    for (var i=0; i<lines.length; i++) {
      if (colors[i] == undefined) {
        colors[i] = [clr, clr];
      } else {
        colors[i][0] = clr;
        colors[i][1] = clr;
      }
    }
    
    colors.reallength = Math.max(colors.reallength, i);
    colors.length = i;
  }
  
  this.trilist.line_strip(lines, colors, texcos, width, half);
}

UICanvas.prototype.line_loop = function(points, colors, texcos, width, half) { //colors,texcos,width are optional
  var lines = []
  
  if (colors == undefined) {
    colors = uicolors["DefaultLine"];
  }
  
  var lcolors;
  if (typeof colors[0] != "number") 
    lcolors = []
  else
    lcolors = []
  
  for (var i=0; i<points.length; i++) {
    var i2 = (i+1)%points.length;
    
    lines.push([points[i], points[i2]]);
    if (typeof(colors[0]) != "number") {
      lcolors.push([colors[i], colors[i2]]);
    } else {
      lcolors.push([colors, colors]);
    }
  }
  
  this.line_strip(lines, lcolors, undefined, width, half);
}

UICanvas.prototype.quad = function(v1, v2, v3, v4, c1, c2, c3, c4) {
  if (v1.length == 2)
    v1.push(0);
  if (v2.length == 2)
    v2.push(0);
  if (v3.length == 2)
    v3.push(0);
  if (v4.length == 2)
    v4.push(0);
    
  this.trilist.add_quad(v1, v2, v3, v4, c1, c2, c3, c4);
}

UICanvas.prototype.quad_aa = function(v1, v2, v3, v4, c1, c2, c3, c4) {
  if (v1.length == 2)
    v1.push(0);
  if (v2.length == 2)
    v2.push(0);
  if (v3.length == 2)
    v3.push(0);
  if (v4.length == 2)
    v4.push(0);
  
  if (c2 == undefined) {
    c2 = c3 = c4 = c1;
  }
  
  this.trilist.add_quad(v1, v2, v3, v4, c1, c2, c3, c4);
  var lines = [[v1, v4], [v4, v3], [v3, v2], [v2, v1]];
  var colors = [[c1, c4], [c4, c3], [c3, c2], [c2, c1]];
  
  this.trilist.line_strip(lines, colors, undefined, undefined, true)
}

UICanvas.prototype.tri = function(v1, v2, v3, c1, c2, c3) {
  if (v1.length == 2)
    v1.push(0);
  if (v2.length == 2)
    v2.push(0);
  if (v3.length == 2)
    v3.push(0);
    
  this.trilist.add_tri(v1, v2, v3, c1, c2, c3);
}

UICanvas.prototype.on_draw = function(gl) {
  for (var i=0; i<this.drawlists.length; i++) {
    this.drawlists[i].on_draw(gl);
  }
}

UICanvas.prototype.arc_points = function(pos, start, arc, r, steps) {//steps is optional
  if (steps == undefined) {
    steps = Math.floor(6*arc/Math.PI);
  }
  
  var f, df;
  
  var f = start;
  var df = arc / steps;
  var points = [];
  for (var i=0; i<steps+1; i++) {
    var x = pos[0] + Math.sin(f)*r;
    var y = pos[1] + Math.cos(f)*r;
    
    points.push([x, y, 0]);
    f += df;
  }
  
  return points;
}

UICanvas.prototype.arc = function(pos, start, arc, r, clr, half) {
  if (clr == undefined) {
    clr = [0.9, 0.8, 0.7, 0.6];
  }
  
  var steps = 18/(2.0 - arc/(Math.PI*2));
  var f, df;
  
  var f = start;
  var df = arc / steps;
  var points = [];
  console.log("ss", start, arc, r);
  for (var i=0; i<steps+1; i++) {
    var x = pos[0] + Math.sin(f)*r;
    var y = pos[1] + Math.cos(f)*r;
    
    points.push([x, y, 0]);
    f += df;
  }
  
  var lines = [];
  var colors = [];
  for (var i=0; i<points.length-1; i++) {
    lines.push([points[i], points[i+1]])
    colors.push([clr, clr])
  }
  
  colors[0][0] = [1.0, 1.0, 0.0, 1.0] 
  colors[0][1] = [1.0, 1.0, 0.0, 1.0] 
  
  this.trilist.line_strip(lines, colors, undefined, undefined, half);
}

UICanvas.prototype.reset = function() {
  for (var i=0; i<this.uncached.length; i++) {
    this.uncached[i].destroy();
  }
  
  this.uncached = new GArray();
  this.scissor_stack = new GArray();
  
  /*destroy old cache that was used in last draw cycle, then swap it with
    the new cache that was *built* last cycle.*/
    
  for (var k in this.oldcache) {
    var arr = this.oldcache.get(k)
    
    for (var i=0; i<arr.length; i++) {
      arr[i].destroy();
    }
  }
  
  this.oldcache = this.cache;
  this.cache = new hashtable();
  
  this.drawlists = [];
  this.trans_stack = [new Matrix4()]
  this.transmat = this.trans_stack[0];
  this.stack = []
  
  this.new_trilist();
}

function darken(c, m) {
  for (var i=0; i<3; i++) {
    c[i] *= m;
  }
  
  return c;
}

var lighten = darken
var uicolors = {
  "Box": [
    darken([1.0, 0.7, 0.5, 0.9], 0.7),
    darken([1.0, 0.7, 0.5, 0.9], 0.8),
    lighten([1.0, 0.7, 0.5, 0.9], 1.05),
    lighten([1.0, 0.7, 0.5, 0.9], 1.05)
  ],
  "ErrorBox": [
    darken([1.0, 0.3, 0.2, 0.9], 0.7),
    darken([1.0, 0.3, 0.2, 0.9], 0.8),
    lighten([1.0, 0.3, 0.2, 0.9], 1.05),
    lighten([1.0, 0.3, 0.2, 0.9], 1.05)
  ],
  "WarningBox": [
    darken([1.0, 0.8, 0.1, 0.9], 0.7),
    darken([1.0, 0.8, 0.1, 0.9], 0.8),
    lighten([1.0, 0.8, 0.1, 0.9], 1.05),
    lighten([1.0, 0.8, 0.1, 0.9], 1.05)
  ],
  "ListBoxBG": [0.9, 0.9, 0.9, 0.9],  
  "ListBoxText": [0.2, 0.2, 0.2, 1.0],  
  "InvBox": [
    darken([1.0, 0.5, 0.1, 0.9], 0.7),
    darken([1.0, 0.5, 0.1, 0.9], 0.7),
    darken([0.5, 0.5, 0.1, 0.9], 0.7),
    darken([0.5, 0.5, 0.1, 0.9], 0.7)
  ],
  "HLightBox": [
    [0.75, 0.75, 0.21, 0.3],
    [0.75, 0.75, 0.21, 0.3],
    [1.0, 0.75, 0.21, 0.875],
    [1.0, 0.75, 0.21, 0.875]
  ],
  "Highlight": [1.0, 0.75, 0.21, 1],
  "MenuHighlight": [1.0, 1, 1, 1],
  "SimpleBox": [
    darken([0.5, 0.5, 0.5, 0.4], 1),
    darken([0.5, 0.5, 0.5, 0.4], 1),
    darken([0.5, 0.5, 0.5, 0.4], 1),
    darken([0.5, 0.5, 0.5, 0.4], 1)
  ],
  "DialogBox": [
    darken([0.5, 0.5, 0.5, 0.8], 1),
    darken([0.5, 0.5, 0.5, 0.8], 1),
    darken([0.5, 0.5, 0.5, 0.8], 1),
    darken([0.5, 0.5, 0.5, 0.8], 1)
  ],
  "MenuBox": [
    [0.85, 0.65, 0.35, 0.8],
    [0.85, 0.65, 0.35, 0.8],
    [0.85, 0.65, 0.35, 0.8],
    [0.85, 0.65, 0.35, 0.8]
  ],
  "RadialMenu": [0.85, 0.65, 0.35, 0.8],
  "RadialMenuHighlight" : [0.85, 0.85, 0.85, 0.5],
  "DefaultLine" : [0.2, 0.2, 0.2, 1.0],
  "SelectLine" : [0.7, 0.7, 0.7, 1.0],
  "Check" : [0.9, 0.7, 0.4, 1],
  "Arrow" : [0.4, 0.4, 0.4, 1],
  "DefaultText" : [0.7, 0.7, 0.7, 1.0],
  "BoxText" : [0.2, 0.2, 0.2, 1.0],
  "HotkeyText" : [0.4, 0.4, 0.4, 0.9],
  "HighlightCursor" : [0.9, 0.9, 0.9, 0.875],
  "TextSelect" : [0.4, 0.4, 0.4, 0.75],
  "TextEditCursor" : [0.1, 0.1, 0.1, 1.0],
  "TextBox": [
    [0.8, 0.8, 0.8, 0.9],
    [0.8, 0.8, 0.8, 0.9],
    [0.8, 0.8, 0.8, 0.9],
    [0.8, 0.8, 0.8, 0.9]
  ],
  "TextBoxHighlight": [0.9, 0.9, 0.9, 1.0],
  "TextBoxInv": [
    [0.7, 0.7, 0.7, 1.0],
    [0.7, 0.7, 0.7, 1.0],
    [0.6, 0.6, 0.6, 1.0],
    [0.6, 0.6, 0.6, 1.0]
  ],
  "MenuSep" : [0.1, 0.2, 0.2, 1.0],
  "RadialMenuSep" : [0.1, 0.2, 0.2, 1.0],
  "MenuLabel" : [
    [0.6, 0.6, 0.6, 0.9],
    [0.6, 0.6, 0.6, 0.9],
    [0.75, 0.75, 0.75, 0.9],
    [0.75, 0.75, 0.75, 0.9]
  ],
  "MenuLabelInv" : [
    [0.75, 0.75, 0.75, 0.9],
    [0.75, 0.75, 0.75, 0.9],
    [0.6, 0.6, 0.6, 0.9],
    [0.6, 0.6, 0.6, 0.9]
  ]
};

function _box_process_clr(default_cs, clr) {
  var cs = default_cs;
  
  if (clr != undefined) {
    if (typeof clr == "number") {
      var cs2 = [0, 0, 0, 0]
      
      for (var i=0; i<4; i++) {
        cs2[i] = [cs[i][0], cs[i][1], cs[i][2], cs[i][3]];
        cs2[i] = darken(cs2[i], clr);
      }
      
      cs = cs2;
    } else if (typeof clr[0] == "number") {
      cs = [clr, clr, clr, clr];
    } else {
      cs = clr;
    }
  }
  
  return cs;
}

UICanvas.prototype.invbox = function(pos, size, clr, r) {
  var cs = uicolors["InvBox"]
  
  cs = _box_process_clr(cs, clr);
    
  this.box(pos, size, cs, r);
}

UICanvas.prototype.simple_box = function(pos, size, clr, r) { //clr is optional
  
  var cs = uicolors["SimpleBox"]
  
  cs = _box_process_clr(cs, clr);
  
  if (r == undefined)
    r = 2.0;
    
  this.box(pos, size, cs, r);
}

UICanvas.prototype.hlightbox = function(pos, size, clr_mul, r) { //clr_mul is optional
  var cs = uicolors["HLightBox"]
  
  /*if (clr != undefined) {
    cs = [clr, clr, clr, clr]
  }*/
    
  if (clr_mul != undefined) {
    cs = [new Vector4(cs[0]), new Vector4(cs[1]), new Vector4(cs[2]), new Vector4(cs[3])]
    for (var i=0; i<4; i++) {
      for (var j=0; j<4; j++) {
        cs[i][j] *= clr_mul;
      }
    }
  }
  this.box(pos, size, cs, r);
}

UICanvas.prototype.box_outline = function(pos, size, clr, rfac) {
  this.box(pos, size, clr, rfac, true);
}

UICanvas.prototype.box = function(pos, size, clr, rfac, outline_only) {
  if (IsMobile)
    return this.box2(pos, size, clr, rfac, outline_only);
  else
    return this.box1(pos, size, clr, rfac, outline_only);
}

UICanvas.prototype.box2 = function(pos, size, clr, rfac, outline_only) {
  var cs = uicolors["Box"];
  
  cs = _box_process_clr(cs, clr);
  
  var x = pos[0], y=pos[1];
  var w=size[0], h=size[1];
  
  this.trilist.add_quad([x, y, 0], [x+w, y, 0], [x+w, y+h, 0], [x, y+h, 0], cs[0], cs[1], cs[2], cs[3]);
}

UICanvas.prototype.box1 = function(pos, size, clr, rfac, outline_only) {//clr,rfac,outline_only are optional
  var c1, c2, c3, c4;
  var cs = uicolors["Box"];
  
  if (outline_only == undefined)
    outline_only = false;
  
  cs = _box_process_clr(cs, clr);
    
  var x = pos[0], y=pos[1];
  var w=size[0], h=size[1];
  
  //this.trilist.add_quad([x, y, 0], [x+w, y, 0], [x+w, y+h, 0], [x, y+h, 0], c1, c2, c3, c4);
  
  var start = 0;
  var ang = Math.PI/2;
  var r = 4 //Math.sqrt(size[0]*size[1])
  
  if (rfac == undefined) 
    rfac = 1;
  
  r /= rfac;
  
  var p1 = this.arc_points([x+r+2, y+r+2, 0], Math.PI, ang, r);
  var p2 = this.arc_points([x+w-r-2, y+r+2, 0], Math.PI/2, ang, r);
  var p3 = this.arc_points([x+w-r-2, y+h-r-2, 0], 0, ang, r);
  var p4 = this.arc_points([x+r+2, y+h-r-2, 0], -Math.PI/2, ang, r);

  var plen = p1.length;
  
  p4.reverse();
  p3.reverse();
  p2.reverse();
  p1.reverse();
  var points = []
  for (var i=0; i<p1.length; i++) {
    points.push(p1[i]);
  }
  
  for (var i=0; i<p2.length; i++) {
    points.push(p2[i]);
    p1.push(p2[i]);
  }
  
  for (var i=0; i<p3.length; i++) {
    points.push(p3[i]);
  }
  
  p2 = p3;
  for (var i=0; i<p4.length; i++) {
    p2.push(p4[i]);
    points.push(p4[i]);
  }
  
  p2.reverse();
  
  function color(i) {
    if (i < plen) return cs[0];
    else if (i < plen*2) return cs[1];
    else if (i < plen*3) return cs[2];
    else if (i <= plen*4+1) return cs[3];
  }
  
  if (!outline_only) {
    for (var i=0; i<p1.length-1; i++) {
      var i1 = i;
      var i2 = i+plen*2;
      var i3 = i + 1+plen*2;
      var i4 = i+1;
      
      var v1 = p1[i];
      var v2 = p2[i];
      var v3 = p2[i+1]
      var v4 = p1[i+1]
      
      this.trilist.add_quad(v1, v2, v3, v4, color(i1), color(i2), color(i3), color(i4));
    }
  }
  
  var lines = []
  var colors = []
  for (var i=0; i<points.length; i++) {
    var v1 = points[(i+1)%points.length];
    var v2 = points[i];
    
    lines.push([v1, v2]);    
    colors.push([color((i+1)%points.length), color(i)]);
  }
  
  this.trilist.line_strip(lines, colors, undefined, 4, true);
  
  return this.trilist
}

UICanvas.prototype.text = function(Array<float> pos, String text, Array<float> color, Number size, Array<float> scissor_pos, Array<float> scissor_size)
{ 
  if (size == undefined) {
    size = default_ui_font_size;
  }
  
  if (color == undefined) {
    color = uicolors["DefaultText"]
  }
  
  if (scissor_pos == undefined) {
    if (this.scissor_stack.length > 0) {
      scissor_pos = this.scissor_stack[this.scissor_stack.length-1][0];
      scissor_size = this.scissor_stack[this.scissor_stack.length-1][1];
    }
  } else {
    scissor_pos = new Vector3([scissor_pos[0], scissor_pos[1], 0]);
    scissor_size = new Vector3([scissor_size[0], scissor_size[1], 0]);
    
    scissor_pos.multVecMatrix(this.transmat);
  }
  
  var textdraw = new TextDraw(pos, text, color, this.view3d, this.transmat, scissor_pos, scissor_size, this.viewport, size);
  if (this.drawlists[this.drawlists.length-1] == this.trilist) {
    this.drawlists.push(textdraw);
    
    this.new_trilist();
    
    if (this.stack.length == 0) {
      this.uncached.push(textdraw);
      this.uncached.push(this.trilist);
    }
  } else {
    this.drawlists.push(textdraw);
    
    if (this.stack.length == 0) {
      this.uncached.push(textdraw);
    }
  }
}


/************** ui frame **************/
function UIFrame(ctx, canvas, path, pos, size) { //path, pos, size are optional
  UIElement.call(this, ctx, path, pos, size);
  
  this.ctx = ctx;
  this.children = new GArray([])
  this.active = undefined;
  
  this.draw_background = false;
  
  if (canvas != undefined) {
    this.canvas = canvas;
    this.view3d = canvas.view3d;
  }
  
  this.rcorner = 16.0;
}
inherit(UIFrame, UIElement);

UIFrame.prototype.do_full_recalc = function()
{
  this.do_recalc();
  
  for (var c in this.children) {
    if (c instanceof UIFrame) 
      c.do_full_recalc();
    else
      c.do_recalc();
  }
}
UIFrame.prototype.on_resize = function(Array<int> newsize, Array<int> oldsize)
{
  this.do_recalc();
  
  for (var c in this.children) {
    c.do_recalc();
    c.on_resize(newsize, oldsize);
  }
}

UIFrame.prototype.on_inactive = function() {
  if (this.active != undefined) {
    this.active.state &= ~UIFlags.HIGHLIGHT;
    this.active.do_recalc();
    this.active.on_inactive();
    this.active = undefined;
    this.do_recalc();
  }
}

UIFrame.prototype.push_modal = function(e) {
  UIElement.prototype.push_modal.call(this, e);
}

UIFrame.prototype.pop_modal = function() {
  UIElement.prototype.pop_modal.call(this);
}

UIFrame.prototype._on_mousemove = function(MouseEvent event) {
  if (this.modalhandler != null) {
    if (this.modalhandler instanceof UIElement) {
      event.x -= this.modalhandler.pos[0]
      event.y -= this.modalhandler.pos[1]
    }
    this.modalhandler._on_mousemove(event);
    
    return true;
  } else {
    return this.on_mousemove(event);
  }
}

UIFrame.prototype.on_mousemove = function(MouseEvent e) {
  var mpos = [e.x, e.y]
  
  var found = false;
  
  for (var i=this.children.length-1; i >= 0; i--) {
    var c = this.children[i];
    
    if (inrect_2d(mpos, c.pos, c.size)) {
      found = true;
      if (this.active != c && this.active != undefined) {
        this.active.state &= ~UIFlags.HIGHLIGHT;
        this.active.on_inactive();
        this.active.do_recalc();
      }
      
      if (this.active != c) {
        //console.log("active", c.constructor.name);
        
        c.state |= UIFlags.HIGHLIGHT;
        c.on_active();
        c.do_recalc();
        this.active = c;      
      }
      
      break;
    }
  }
  
  if (!found && this.active != undefined) {
    //console.log("inactive", get_type_name(this))
    this.active.state &= ~UIFlags.HIGHLIGHT;
    this.active.on_inactive();
    this.active.do_recalc();
    this.active = undefined;
  }
  
  if (this.active != undefined) {
    e.x -= this.active.pos[0];
    e.y -= this.active.pos[1];
    
    this.active.on_mousemove(e)
    
    e.x += this.active.pos[0];
    e.y += this.active.pos[1];
  }
  
  return this.active != undefined;
}

UIFrame.prototype._on_mousedown = function(MouseEvent event) {
  if (this.modalhandler != null) {
    if (this.modalhandler["pos"] != undefined) {
      event.x -= this.modalhandler.pos[0]
      event.y -= this.modalhandler.pos[1]
    }
    this.modalhandler._on_mousedown(event);
  } else {
    this.on_mousedown(event);
  }
}

UIFrame.prototype.on_mousedown = function(MouseEvent e) {
  var mpos = [e.x, e.y];
  this.on_mousemove(e);
  e.x = mpos[0];
  e.y = mpos[1];
  
  if (this.active != undefined) {
    e.x -= this.active.pos[0];
    e.y -= this.active.pos[1];
    
    this.active.on_mousedown(e);
  }
  
  return this.active != undefined;
}


UIFrame.prototype._on_mouseup = function(MouseEvent event) {
  if (this.modalhandler != null) {
    if (this.modalhandler["pos"] != undefined) {
      event.x -= this.modalhandler.pos[0]
      event.y -= this.modalhandler.pos[1]
    }
    this.modalhandler._on_mouseup(event);
  } else {
    this.on_mouseup(event);
  }
}

UIFrame.prototype.on_mouseup = function(MouseEvent e) {
  if (this.active != undefined) {
    e.x -= this.active.pos[0];
    e.y -= this.active.pos[1];
    
    this.active.on_mouseup(e);
  }
  
  return this.active != undefined;
}


UIFrame.prototype._on_mousewheel = function(MouseEvent event, float delta) {
  if (this.modalhandler != null) {
    if (this.modalhandler["pos"] != undefined) {
      event.x -= this.modalhandler.pos[0]
      event.y -= this.modalhandler.pos[1]
    }
    this.modalhandler._on_mousewheel(event, delta);
  } else {
    this.on_mousewheel(event, delta);
  }
}

UIFrame.prototype.on_mousewheel = function(MouseEvent e, float delta) {
  if (this.active != undefined) {
    if (this.modalhandler != null && this.modalhandler["pos"] != undefined) {
      event.x -= this.modalhandler.pos[0]
      event.y -= this.modalhandler.pos[1]
    }
    
    this.active.on_mousewheel(e, delta);
  }
  
  return this.active != undefined;
}

UIFrame.prototype.on_keydown = function(KeyboardEvent e) {
  if (this.active != undefined) {
    this.active._on_keydown(e);
  }
  
  return this.active != undefined;
}


UIFrame.prototype.on_keyup = function(KeyboardEvent e) {
  if (this.active != undefined) {
    this.active._on_keyup(e);
  }
  
  return this.active != undefined;
}

UIFrame.prototype.on_charcode = function(KeyboardEvent e) {
  if (this.active != undefined) {
    this.active._on_charcode(e);
  }
  
  return this.active != undefined;
}

UIFrame.prototype.add = function(UIElement e, int packflag) { //packflag is optional
  this.children.push(e);
  
  if (packflag != undefined)
    e.packflag |= packflag;
  
  e.parent = this;
  if (e.canvas == undefined)
    e.canvas = this.canvas;
  
  e.on_add(this);
  this.do_recalc();
}

UIFrame.prototype.replace = function(UIElement a, UIElement b) {
  if (a == this.modalhandler) {
    a.pop_modal();
  }
  a.on_remove(this);
  this.children.replace(a, b);
  if (this.canvas != undefined)
    this.canvas.remove_cache(a);
  if (a == this.active)
    this.active = b;
  
  b.parent = this;
  if (b.canvas == undefined)
    b.canvas = this.get_canvas();
  if (b.ctx == undefined)
    b.ctx = this.ctx;
  
  b.on_add(this);
  
  this.do_recalc();
}

UIFrame.prototype.remove = function(UIElement e) {
  if (e == this.modalhandler) {
    e.pop_modal();
  }
  
  this.children.remove(e);
  e.on_remove(this);
  
  if (this.canvas != undefined)
    this.canvas.remove_cache(e);
  
  if (e == this.active)
    this.active = undefined;
}

UIFrame.prototype.on_draw = function(gl) {
  if (this.recalc && this.is_canvas_root() && this.get_canvas() != undefined) {
    this.canvas = this.get_canvas();
    
    for (var c in this.children) {
      if (c.canvas == undefined)
        c.canvas = this.canvas;
    }
    
    this.canvas.reset();
    this.build_draw(this.canvas);
  }
  
  if (this.canvas != undefined) {
    this.canvas.on_draw(gl);
  }
}

var _static_mat = new Matrix4();
var _ufbd_v1 = new Vector3();
//hack for spreading updates across frames
var _canvas_threshold = 1.0;

UIFrame.prototype.set_context = function(ctx)
{
  this.ctx = ctx;
  for (var c in this.children) {
    c.set_context(ctx);
  }
}

UIFrame.prototype.build_draw = function(canvas, skip_box) { //skip_box is optional
  var mat = _static_mat;
  
  if (this.pos == undefined) {
    this.pos = [0,0];
    console.log("eek");
    console.trace();
  }
  
  if (!skip_box && this.draw_background) {
    canvas.simple_box([0, 0], this.size, undefined, this.rcorner);
  }
  
  var retag_recalc = false;
  this.recalc = 0;
  
  for (var c in this.children) {
    if (c.pos == undefined) {
      c.pos = [0,0];
      c.size = [0, 0];
      console.log("eek2");
      console.trace();
    }
    
    mat.makeIdentity();
    _ufbd_v1.zero(); _ufbd_v1[0] = c.pos[0]; _ufbd_v1[1] = c.pos[1];
    
    mat.translate(_ufbd_v1);
    
    if (c.canvas != undefined && c.canvas != this.get_canvas())
      continue;
    if (c.is_canvas_root())
      continue;
    
    var do_skip = !c.recalc;
    
    if (!(c instanceof UIFrame) && this.constructor.name != UIMenu.name) {
      do_skip = !c.recalc || Math.random() > _canvas_threshold;
    }
    
    if (canvas.has_cache(c) && do_skip) {
      if (c.recalc) {
        retag_recalc = true;
        c.do_recalc();
      }
      canvas.use_cache(c);
    } else {
      if (!(c instanceof UIFrame)) {
        //console.log("recalculating element", c.__hash__());
      }
      
      var r = this.recalc;
      
      if (!(c.packflag & PackFlags.NO_REPACK))
        c.pack(this.get_canvas(), false);
        
      canvas.push_transform(mat);
      c.build_draw(canvas);
      canvas.pop_transform(mat);
      c.recalc = 0;
    }
  }

  if (retag_recalc)
    this.do_recalc();
}

//pre_func is optional, and is called before each child's on_tick is executed
UIFrame.prototype.on_tick = function(pre_func) {
  for (var c in this.children) {
    if (pre_func != undefined)
      pre_func(c);
    
    c.on_tick();
    
    if (c.status_timer != undefined) {
      c.inc_flash_timer();
      c.do_recalc();
    }
  }
}

UIFrame.prototype.pack = function(UICanvas canvas, Boolean isvertical) {
  for (var c in this.children) {
    if (!(c.packflag & PackFlags.NO_REPACK))
      c.pack(canvas, isvertical);
  }  
}

function UIPackFrame(ctx, path_prefix)
{
  UIFrame.call(this, ctx);
  if (path_prefix == undefined)
    path_prefix = ""
  
  this.path_prefix = path_prefix;
  this.min_size = undefined : Array<float>;
  
}
inherit(UIPackFrame, UIFrame);

UIPackFrame.prototype.on_resize = function(Array<int> newsize, Array<int> oldsize)
{
  UIFrame.prototype.on_resize.call(this);
  
  this.pack(this.get_canvas());
}

UIPackFrame.prototype.toolop = function(path, inherit_flag) {
  var ctx = this.ctx;
  var opname = ctx.api.get_op_uiname(ctx, path);
  
  if (opname == undefined) {
    console.trace();
    console.log("couldn't find tool operator at path" + path + ".");
    return;
  }
  
  var c = new UIButton(ctx, opname, [0,0], [0,0], path);
  
  if (inherit_flag != undefined) 
    c.packflag |= inherit_flag;
    
  this.add(c);
}

UIPackFrame.prototype.pack = function(canvas, isVertical) {
  //this.do_full_recalc();
}

UIPackFrame.prototype.prop = function(path, packflag) {
  if (packflag == undefined)
    packflag = 0;
  
  if (this.path_prefix.length > 0)
    path = this.path_prefix + "." + path

  var ctx = this.ctx;
  var prop = ctx.api.get_prop_meta(ctx, path)
  
  if (prop == undefined) {
    console.trace();
    console.log("couldn't find property: " + path + ".", this.path_prefix);
    return;
  }
  
  if (prop.type == PropTypes.INT || prop.type == PropTypes.FLOAT) {
    var range = prop.range;
    if (prop.range == undefined || (prop.range[0] == 0 && prop.range[1] == 0)) {
      range = [-2000, 2000];
    }
    
    var c = new UINumBox(ctx, prop.uiname, range, prop.data, [0,0], [0,0], path);
    c.packflag = packflag;
    c.unit = prop.unit;
    
    this.add(c);
  } else if (prop.type == PropTypes.ENUM) {
    var c = new UIMenuButton(ctx, undefined, [0,0], [0,0], path);
    
    c.packflag |= packflag;
    this.add(c)
  } else if (prop.type == PropTypes.VEC3) {
      range = [-2000, 2000];
      
      var row = this.row();
      row.packflag = packflag;
      
      row.label(prop.uiname);
      var c = new UINumBox(ctx, "X", range, prop.data, [0,0], [0,0], path + "[0]");
      c.unit = prop.unit;
      c.packflag |= packflag;
      row.add(c);
      
      var c = new UINumBox(ctx, "Y", range, prop.data, [0,0], [0,0], path + "[1]");
      c.unit = prop.unit;
      c.packflag |= packflag;
      row.add(c);
      
      var c = new UINumBox(ctx, "Z", range, prop.data, [0,0], [0,0], path + "[2]");
      c.unit = prop.unit;
      c.packflag |= packflag;
      row.add(c);
  } else if (prop.type == PropTypes.VEC4) {
      range = [-2000, 2000];
      
      var row = this.row();
      
      row.label(prop.uiname);
      var c = new UINumBox(ctx, "X", range, prop.data, [0,0], [0,0], path + "[0]");
      c.packflag |= packflag;
      c.unit = prop.unit;
      row.add(c);

      var c = new UINumBox(ctx, "Y", range, prop.data, [0,0], [0,0], path + "[1]");
      c.packflag |= packflag;
      c.unit = prop.unit;
      row.add(c);

      var c = new UINumBox(ctx, "Z", range, prop.data, [0,0], [0,0], path + "[2]");
      c.packflag |= packflag;
      c.unit = prop.unit;
      row.add(c);

      var c = new UINumBox(ctx, "W", range, prop.data, [0,0], [0,0], path + "[3]");
      c.packflag |= packflag;
      c.unit = prop.unit;
      row.add(c);
  } else if (prop.type == PropTypes.STRING && (prop.flag & TPropFlags.LABEL)) {
    this.label(path, true, packflag);
  } else if (prop.type == PropTypes.BOOL) {
    var check = new UICheckBox(ctx, prop.uiname, undefined, undefined, path);
    check.packflag |= packflag;
    this.add(check);
  } else if (prop.type == PropTypes.FLAG) {
    var row = this.row();
    row.packflag |= packflag;
    
    row.label(prop.uiname + ":");
    for (var k in prop.ui_value_names) {
      var path2 = path + "["+prop.keys[prop.ui_value_names[k]]+"]"
      var check = new UICheckBox(ctx, k, undefined, undefined, path2);
      check.packflag |= PackFlags.INHERIT_WIDTH;
      
      row.add(check);
    }
  }
  else {
    console.log("warning: unimplemented property type for path " + path + " in user interface code");
  }
}

UIPackFrame.prototype.label = function(text, use_path, align) { //use_path, align are optional
  if (use_path != undefined && use_path) {
    var c = new UILabel(this.ctx, "", [0,0], [0,0], text);
    this.add(c);
    
    if (align)
      c.packflag |= align;
    
    return c;
  } else {
    var c = new UILabel(this.ctx, text, [0,0], [0,0], undefined);
    this.add(c);
    
    if (align)
      c.packflag |= align;
    
    return c;
  }
}

UIPackFrame.prototype.row = function(path_prefix, align) { //path_prefix is optional
  if (path_prefix == undefined) path_prefix = ""
  
  var row = new RowFrame(this.ctx, this.path_prefix);
  this.add(row);
  
  if (align)
    row.packflag |= align;
    
  return row;
}

UIPackFrame.prototype.col = function(path_prefix, align) { //path_prefix is optional
  if (path_prefix == undefined) path_prefix = ""
  
  var col = new ColumnFrame(this.ctx, this.path_prefix);
  this.add(col);

  if (align)
    col.packflag |= align;
  
  return col;
}

UIPackFrame.prototype._pack_recalc = function() 
{
  return;
  this.do_full_recalc();
  
  for (var c in this.children) {
    if (!(c instanceof UIFrame)) {
      c.recalc = 1;
    }
  }
}

function RowFrame(ctx, path_prefix, align)
{
  UIPackFrame.call(this, ctx, path_prefix);
  this.packflag |= PackFlags.INHERIT_HEIGHT|align;
}
inherit(RowFrame, UIPackFrame);

RowFrame.prototype.get_min_size = function(UICanvas canvas, Boolean isvertical) {
  var maxwidth = 0;
  var tothgt = 0;
  
  for (var c in this.children) {
    var size;
    
    if (!(c.packflag & PackFlags.NO_REPACK))
      size = c.get_min_size(canvas, isvertical);
    else
      size = [c.size[0], c.size[1]];
    
    tothgt += size[1]+2;
    maxwidth = Math.max(maxwidth, size[0]+2);
  }
  
  if (this.min_size != undefined) {
    maxwidth = Math.max(maxwidth, this.min_size[0]);
    tothgt = Math.max(tothgt, this.min_size[1]);
  }
  
  return [Math.max(maxwidth, 1), Math.max(tothgt, 1)];
}

RowFrame.prototype.pack = function(UICanvas canvas, Boolean is_vertical) {
  this._pack_recalc();
  
  if (this.size[0] == 0 && this.size[1] == 0) {
    this.size[0] = this.parent.size[0];
    this.size[1] = this.parent.size[1];
  }
  
  var minsize = this.get_min_size(canvas, is_vertical);
  var spacing = Math.floor((this.size[1] - minsize[1])/this.children.length);
  if (spacing < 0) spacing = 0;
  spacing = Math.min(spacing, 4.0);
  
  var x = 0;
  var y;
  
  if (this.packflag & PackFlags.ALIGN_BOTTOM)
    y = 2;
  else
    y = this.size[1];
  
  for (var i=0; i<this.children.length; i++) { //i=this.children.length-1; i>=0; i--) {
    var c = this.children[i];
    var size;
    
    if (!(c.packflag & PackFlags.NO_REPACK))
      size = c.get_min_size(canvas, is_vertical);
    else
      size = [c.size[0], c.size[1]]
    
    size[0] = Math.min(size[0], this.size[0]);
    if (c.packflag & PackFlags.INHERIT_WIDTH)
      size[0] = this.size[0]-2
    
    c.size = size;
    var final_y = y;
    if (!(this.packflag & PackFlags.ALIGN_BOTTOM))
      final_y -= size[1];
    
    if (this.packflag & PackFlags.ALIGN_RIGHT) {
      c.pos = [this.size[0]-size[0]-x, final_y];
    } else if (this.packflag & PackFlags.ALIGN_LEFT) {
      c.pos = [x, final_y];
    } else {
      c.pos = [x + Math.floor(0.5*(this.size[0]-size[0])), final_y];
    }
    
    if (this.packflag & PackFlags.ALIGN_BOTTOM)
      y += c.size[1]+spacing;
    else
      y -= c.size[1]+spacing;
    
    if (!(c.packflag & PackFlags.NO_REPACK))
      c.pack(canvas, is_vertical);
  }
  
  //this.size[1] = Math.max(this.size[1], minsize[1]);
}

function ColumnFrame(ctx, path_prefix, align)
{
  UIPackFrame.call(this, ctx, path_prefix);
  this.packflag |= PackFlags.INHERIT_WIDTH|align
}
inherit(ColumnFrame, UIPackFrame);

ColumnFrame.prototype.get_min_size = function(UICanvas canvas, Boolean isvertical) {
  var maxheight = 0;
  var totwid = 0;
  
  for (var c in this.children) {
    var size;
    if (!(c.packflag & PackFlags.NO_REPACK))
      size = c.get_min_size(canvas, isvertical);
    else
      size = [c.size[0], c.size[1]];
      
    totwid += size[0]+2;
    maxheight = Math.max(maxheight, size[1]+2);
  }
  
  if (this.min_size != undefined) {
    totwid = Math.max(totwid, this.min_size[0]);
    maxheight = Math.max(maxheight, this.min_size[1]);
  }
  
  return [totwid, maxheight];
}

ColumnFrame.prototype.pack = function(UICanvas canvas, Boolean is_vertical) {
  this._pack_recalc();
  
  if (this.size[0] == 0 && this.size[1] == 0) {
    this.size[0] = this.parent.size[0];
    this.size[1] = this.parent.size[1];
  }
  
  var minsize = this.get_min_size(canvas, is_vertical);
  var spacing = Math.floor((this.size[0] - minsize[0])/this.children.length);
  if (spacing < 0) spacing = 0;
  spacing = Math.min(spacing, 4.0);
  
  var sum=0;
  var max_wid = 0;
  for (var c in this.children) {
    var s;
    
    if (!(c.packflag & PackFlags.NO_REPACK))
      s = c.get_min_size(canvas, is_vertical);
    else
      s = [c.size[0], c.size[1]];
    
    max_wid = Math.max(s[0], max_wid);
    sum += s[0];
  }
  
  var x;
  var y = 2;
  var pad = 4;
  max_wid *= ((this.size[0])/sum);
  
  if (!(this.packflag & PackFlags.ALIGN_LEFT) && !(this.packflag & PackFlags.ALIGN_RIGHT))
    this.packflag |= PackFlags.ALIGN_CENTER;
    
  if (this.packflag & PackFlags.ALIGN_RIGHT) {
    x = this.size[0]-3;
  } else if (this.packflag & PackFlags.ALIGN_LEFT) {
    x = 3;
  } else {
    x = 0;
  }
    
  for (var c in this.children) {
    var size;
    
    if (!(c.packflag & PackFlags.NO_REPACK))
      size = c.get_min_size(canvas, is_vertical);
    else
      size = [c.size[0], c.size[1]];
      
    if (!(this.packflag & PackFlags.IGNORE_LIMIT)) {
      if (c.packflag & PackFlags.INHERIT_WIDTH)
        size[0] = max_wid-pad;
      else
        size[0] = Math.min(size[0], max_wid-pad);
    }
    
    if (c.packflag & PackFlags.INHERIT_HEIGHT)
      size[1] = this.size[1]-6
      
    c.size = size;
    if (this.packflag & PackFlags.ALIGN_RIGHT) {
      c.pos = [x-size[0], y];
      x -= Math.floor(size[0]+pad+spacing);
    } else {
      c.pos = [x, y];
      x += Math.floor(size[0]+pad+spacing);
    }
    
    if (!(c.packflag & PackFlags.NO_REPACK))
      c.pack(canvas, is_vertical);
  }
  
  if ((this.packflag & PackFlags.ALIGN_CENTER) && x < this.size[0]) {
    for (var c in this.children) {
      c.pos[0] += Math.floor((this.size[0]-x)*0.5);
    }
  }
}

function ToolOpFrame(ctx, path) {
  RowFrame.call(this, ctx, path);
  this.rebuild = true;
  this.strct = undefined;
  this.ctx = ctx;
}

inherit(ToolOpFrame, RowFrame);

ToolOpFrame.prototype.do_rebuild = function(ctx) {
  var strct = this.ctx.api.get_struct(ctx, this.path_prefix);
  
  this.children = new GArray([]);
  
  if (strct == undefined) return;
  
  this.strct = strct;
  for (var p in strct) {
    //console.log(p.name, "=-");
    if (!(p.flag & PackFlags.UI_DATAPATH_IGNORE))
      this.prop(p.name, PackFlags.INHERIT_WIDTH);
  }
}

ToolOpFrame.prototype.on_tick = function() {
  var strct = this.ctx.api.get_struct(this.ctx, this.path_prefix);
  
  if (strct != this.strct) {
    this.do_rebuild(this.ctx);
    this.do_recalc();
  }
  
  RowFrame.prototype.on_tick.call(this);
}

var _te = 0
ToolOpFrame.prototype.build_draw = function(UICanvas canvas, Boolean isVertical) {
  //canvas.begin(this);
  
  if (this.rebuild) {
    this.do_rebuild(this.ctx);
    this.rebuild = false;
  }
  
  canvas.simple_box([0,0], this.size, [0.2, 0.2, 0.2, 0.1]);
  RowFrame.prototype.build_draw.call(this, canvas, isVertical);
  
 // canvas.end(this);
}

