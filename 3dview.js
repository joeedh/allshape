"use strict";

function drawline(co1, co2) {
  this.v1 = co1;
  this.v2 = co2;
  this.clr = [0.9, 0.9, 0.9, 1.0];
}

create_prototype(drawline);

drawline.prototype.set_clr = function(Array<float> clr) {
  this.clr = clr;
}

function FrameBuffer(gl, size)
{
  this.size = size;
  this.fbuf = undefined;
  this.rbuf1 = undefined;
  this.rbuf2 = undefined;
  this.gl = gl;
  this.caller = undefined;
}
create_prototype(FrameBuffer)

//returns true if the framebuffer needs to be redrawn
FrameBuffer.prototype.capture = function(size, caller)
{
  size[0] = Math.ceil(size[0]);
  size[1] = Math.ceil(size[1]);
  
  if (this.fbuf == undefined) {
    this.regen();
    return true;
  }
  
  if (size[0] != this.size[0] || size[1] != this.size[1]) {
    this.size = size;
    this.regen();
    return true;
  }
  
  var c2 = this.caller;
  this.caller = caller;
  
  return c2 != caller;
}

FrameBuffer.prototype.regen = function() {
  this.size[0] = Math.ceil(this.size[0]);
  this.size[1] = Math.ceil(this.size[1]);
  
  if (this.fbuf != undefined) {
    gl.deleteFramebuffer(this.fbuf);
    gl.deleteRenderbuffer(this.rbuf1);
    gl.deleteRenderbuffer(this.rbuf2);  
  }

  this.fbuf = gl.createFramebuffer()
  gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbuf);

  this.rbuf1 = gl.createRenderbuffer();
  gl.bindRenderbuffer(gl.RENDERBUFFER, this.rbuf1);
  gl.renderbufferStorage(gl.RENDERBUFFER, gl.RGBA4, this.size[0], this.size[1]);
  
  this.rbuf2 = gl.createRenderbuffer();
  gl.bindRenderbuffer(gl.RENDERBUFFER, this.rbuf2);
  gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, this.size[0], this.size[1]);
  
  gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, 
                            gl.RENDERBUFFER, this.rbuf1);
                            
  gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, 
                            gl.RENDERBUFFER, this.rbuf2);
}

FrameBuffer.prototype.bind = function() 
{
  //this.regen();
  this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.fbuf);
}

FrameBuffer.prototype.unbind = function() 
{
  this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
}

function View3DUserState()
{
  this.drawmats = undefined
  this.selectmode = 0;
  this.use_radial_menus = false;
  this.zoomfac = 0.0
  this.zoomwheel = 0.0
}

var _v3d_id_gen = 0
function View3DHandler(WebGLRenderingContext gl, Mesh mesh, ShaderProgram vprogram, ShaderProgram fprogram, 
                       DrawMats drawmats, int x, int y, int width, 
                       int height, int znear, int zfar) 
{
  this.drawmats = drawmats;
  
  this.mesh = mesh;
  
  this.znear = znear;
  this.zfar = zfar;
  this.vprogram = vprogram;
  this.fprogram = fprogram;
  
  this.redo_selbuf = true;
  
  this.flagprop = 1;
  
  this.zoomfac = 0.0
  this.zoomwheel = 0.0
  this.screen = undefined : Screen;
  this.ui_canvas = null;
  this.framerate = 0.1;
  this.size = [width, height]
  this.use_backbuf_sel = true;
  this.last_selectmode = 0;
  
  this.use_subsurf = false;
  
  this.user_pref = new View3DUserState()
  this.toolstack = g_app_state.toolstack;
  
  /*if (localStorage.user_pref != undefined) {
    var state
    try {
      state = JSON.parse(localStorage.user_pref);
    } catch (_error) {
      state = {};
    }
    
    for (var k in state) {
      this.user_pref[k] = state[k]
    }
    
    if (this.user_pref.drawmats != undefined) {
      this.set_drawmats(DrawMats.fromJSON(this.user_pref.drawmats));
    }
    
    this.zoomfac = this.user_pref.zoomfac;
    this.zoomwheel = this.user_pref.zoomwheel;
  }*/ 
  
  this.mesh = mesh;
  
  if (mesh.render == 0) {
    mesh.render = new render();
  }
  
  this.selectmode = this.user_pref.selectmode;
  var sm = this.selectmode;
  if (sm!= 2 && sm != 4 && sm != 8) this.selectmode = MeshTypes.VERT;

  mesh.render.drawprogram = gl.program;
  mesh.render.vertprogram = gl.program2;

  this.gl = gl;
  this.pos = new Vector2([x, y]);
  this.size = new Vector2([width, height]);
  this.asp = width / height;
  this.mesh = mesh;
  this.zfar = zfar;
  this.znear = znear;
  this.last_tick = time_ms()
  
  this.font = new Font(gl, this);
  
  this.gpu_test = null;
  
  this.mpos = new Vector2([0, 0]);
  this._mstart = null;
  
  this.overlay = null;
  
  this.shift = false;
  this.alt = false;
  this.ctrl = false;
  
  this.zoom_wheelrange = [-20, 20]
  this.zoom_range = [-7.0, 7.0]
  this.tools_define = {}
  
  this.ss_mesh = null;
  this.last_steps = 0;
  this.drawlines = new GArray<drawline>();
  
  this.line_2d_shader = new ShaderProgram(gl, "2d_line_vshader", "2d_line_fshader", ["vPosition", "vNormal", "vColor"]);
  
  this.define_macros();
  
  Area.call(this, View3DHandler.name, new Context(this), this.pos, this.size);
  
  this.keymap = new KeyMap()
  this.define_keymap();
  this._id = _v3d_id_gen++;
}

inherit(View3DHandler, Area);

View3DHandler.framebuffer = undefined;

View3DHandler.prototype.get_framebuffer = function()
{
  if (View3DHandler.framebuffer == undefined)
    View3DHandler.framebuffer = new FrameBuffer(this.gl, this.size);
  
  return View3DHandler.framebuffer;
}

View3DHandler.prototype.__hash__ = function() : String {
  return this.constructor.name + this._id;
}

View3DHandler.prototype.gen_persmat = function() : String {
  this.drawmats.persmat = new Matrix4();
  this.drawmats.persmat.perspective(30, this.size[0] / this.size[1], 0.2, 10000);
  this.drawmats.persmat.lookat(0, 0, 7, 0, 0, 0, 0, 1, 0);
}

View3DHandler.prototype.kill_drawline = function(DrawLine dl) {
  this.drawlines.remove(dl, true);
}

View3DHandler.prototype.new_drawline = function(Vector3 v1, Vector3 v2) { //v1 and v2 are optional
  if (v1 == undefined) {
    v1 = new Vector3();
    v2 = new Vector3();
  }
  
  var dl = new drawline(v1, v2);
  this.drawlines.push(dl);
  
  return dl;
}

View3DHandler.prototype.gen_rendermats = function() {
  // Construct the normal matrix from the model-view matrix and pass it in
  this.drawmats.normalmat.load(this.drawmats.cameramat);
  this.drawmats.normalmat.invert();
  this.drawmats.normalmat.transpose();

  // Construct the model-view * projection matrix and pass it in
  this.drawmats.rendermat.makeIdentity();
  
  this.drawmats.rendermat.multiply(this.drawmats.persmat);
  this.drawmats.rendermat.translate(0, 0, this.zoomfac);
  this.drawmats.rendermat.multiply(this.drawmats.cameramat);
  this.drawmats.rendermat.isPersp = true;
  
  this.redo_selbuf = true;
}

View3DHandler.prototype.change_zoom = function(float delta) {
  this.zoomwheel += delta
  this.zoomwheel = Math.max(Math.min(this.zoomwheel+delta, this.zoom_wheelrange[1]), this.zoom_wheelrange[0])

  this.zoomfac = (this.zoomwheel-this.zoom_wheelrange[0]) / (this.zoom_wheelrange[1]-this.zoom_wheelrange[0])
  this.zoomfac = this.zoom_range[0] + (this.zoom_range[1] - this.zoom_range[0]) * this.zoomfac
  
  this.gen_rendermats()
}

View3DHandler.prototype.set_drawmats = function(DrawMats drawmats) 
{
  this.drawmats = drawmats;
  this.gen_persmat();
  this.gen_rendermats();
}

View3DHandler.prototype.set_canvasbox = function() 
{
  this.asp = this.size[0] / this.size[1];
  
  //Set the viewport and projection matrix for the scene
  gl.viewport(this.parent.pos[0], this.parent.pos[1], this.size[0], this.size[1]);
}

View3DHandler.prototype.project = function(Vector3 co, Matrix4 pmat) {
  co.multVecMatrix(pmat);
  co[0] = (co[0]+1.0)*0.5*this.size[0];
  co[1] = (co[1]+1.0)*0.5*this.size[1];
  co[2] = 0.0;
}

/*
View3DHandler.prototype.findnearest_backbuf_edge = function(Vector2 mpos, int type) {
  pmat = new Matrix4(this.drawmats.rendermat);
  
  var dis = 100000, vpick=null;
  var size=75, limie=75*75;
  
  this.ensure_selbuf();
  var selbuf = this.read_selbuf([mpos[0]-size/2, mpos[1]-size/2], size);
  
  var mesh = this.mesh;
  
  var ret = undefined;
  var dis = 0;
  var x2 = -size/2;
  var y2 = -size/2;
  
  for (var x=0; x<size; x++) {
    y2 = -size/2;
    
    for (var y=0; y<size; y++) {
      var pix = [selbuf[(size*y+x)*4], selbuf[(size*y+x)*4+1], selbuf[(size*y+x)*4+2], selbuf[(size*y+x)*4+3]]
      y2++;
      
      var idx = unpack_index(pix);
      
      if (idx != 0) {
        var e = mesh.eidmap[idx-1];
        
        if (e != undefined && e.type == MeshTypes.EDGE) {
          var d = x2*x2+y2*y2;
          
          var s1, s2;
          if (this.mesh.flag & MeshFlags.USE_MAP_CO) {
            s1 = new Vector3(e.v1.mapco);
            s2 = new Vector3(e.v2.mapco);
          } else {
          }
          
          this.project(s1, pmat);
          this.project(s2, pmat);
    
          var d = dist_to_line_v2(mpos, s1, s2);
    
          if (ret == undefined || d < dis) {
            ret = idx-1;
            dis = d;
          }
        }
      }
      
      y2++;
    }
    
    x2++;
  }
  
  if (ret == undefined)
    return ret;
  else
    return mesh.eidmap[ret];
}
*/

var __v3d_g_s = []
function _get_spiral(size)
{
  if (__v3d_g_s.length == size*size)
    return __v3d_g_s;
  
  var arr = __v3d_g_s;
  
  var x = Math.floor((size-1)/2);
  var y = Math.floor((size-1)/2);
  
  var c;
  var i;
  
  if (size%2 == 0) {
    arr.push([x, y+1]);
    arr.push([x, y]);
    arr.push([x+1, y]);
    arr.push([x+1, y+1]);
    arr.push([x+1, y+2]);
    c = 5;
    i = 2;
    
    y += 2;
    x += 1;
  } else {
    arr.push([x, y])
    arr.push([x+1, y])
    arr.push([x+1, y+1]);
    c = 3;
    i = 2;
    x++; y++;
  }  
  
  while (c < size*size-1) {
    var sign = (Math.floor(i/2) % 2)==1;
    sign = sign ? -1.0 : 1.0;
    
    for (var j=0; j<i; j++) {
      if ((i%2==0)) {
        if (x+sign < 0 || x+sign >= size)
          break;
        x += sign;
      } else {
        if (y+sign < 0 || y+sign >= size)
          break;
        y += sign;
      }
      
      if (c == size*size)
        break;
        
      arr.push([x, y]);
      c++;
    }
    
    if (c == size*size)
      break;
    i++;
  }
  
  for (var j=0; j<arr.length; j++) {
    arr[j][0] = Math.floor(arr[j][0]);
    arr[j][1] = Math.floor(arr[j][1]);
  }
  
  return __v3d_g_s;
}

View3DHandler.prototype.findnearest_backbuf = function(Vector2 mpos, int type) {
  var pmat = new Matrix4(this.drawmats.rendermat);
  
  var mesh = this.mesh;
  
  var vpick=null;
  var size=75;
  
  /*make sure the backbuffer has the right data*/
  //theoretically, always drawing edges should improve speed
  this.ensure_selbuf(type|MeshTypes.EDGE); 
  
  var selbuf = this.read_selbuf([Math.floor(mpos[0]-size/2), Math.floor(mpos[1]-size/2)], size);
  
  var ret = undefined;
  var dis = 0;
  var x, y, x2, y2;
  
  var spiral = _get_spiral(size);
  for (var i=0; i<spiral.length; i++) {
    x = spiral[i][0];
    y = spiral[i][1];
    x2 = spiral[i][0] - size/2;
    y2 = spiral[i][1] - size/2;
    
    var pix = [selbuf[(size*y+x)*4], selbuf[(size*y+x)*4+1], selbuf[(size*y+x)*4+2], selbuf[(size*y+x)*4+3]]
    
    var idx = unpack_index(pix);
    
    if (idx > 0) {
      var e = mesh.eidmap[idx-1];
      
      if (e != undefined && e.type == type) {
        var d = x2*x2+y2*y2;
        if (ret == undefined || d < dis) {
          ret = idx-1;
          dis = d;
          break;
        }
      }
    }
  }
  
  if (ret == undefined)
    return null;
  else
    return mesh.eidmap[ret];
}

View3DHandler.prototype.findnearestedge_mapco = function(Vector2 mpos) {
  var pmat = new Matrix4(this.drawmats.rendermat);
  
  if (this.use_backbuf_sel)
    return this.findnearest_backbuf(mpos, MeshTypes.EDGE);
    
  var epick = null;
  var limit=750;
  var dis = limit;

  var s1 = new Vector3(); var s2 = new Vector3();
  for (var e in this.mesh.edges) {
    s1.load(e.v1.mapco); s2.load(e.v2.mapco);
    
    this.project(s1, pmat);
    this.project(s2, pmat);
    
    var d = dist_to_line_v2(mpos, s1, s2);
    //console.log(d)
    if (d < dis) {
      epick = e;
      dis = d;
    }
  }
  
  return epick;
}

View3DHandler.prototype.findnearestedge = function(Vector2 mpos) {
  var pmat = new Matrix4(this.drawmats.rendermat);
  mpos = new Vector2(mpos);
  
  if (this.use_backbuf_sel)
    return this.findnearest_backbuf(mpos, MeshTypes.EDGE);
    
  if (this.mesh.flag & MeshFlags.USE_MAP_CO)
    return this.findnearestedge_mapco(mpos);
    
  var epick = null;
  var limit=75;
  var dis = limit;

  var s1 = new Vector3(); var s2 = new Vector3();
  for (var e in this.mesh.edges) {
    s1.load(e.v1.co); s2.load(e.v2.co);
    
    this.project(s1, pmat);
    this.project(s2, pmat);
    
    var d = dist_to_line_v2(mpos, s1, s2);
    //console.log(d)
    if (d < dis) {
      epick = e;
      dis = d;
    }
  }
  
  return epick;
}

View3DHandler.prototype.findnearestvert_mapco = function(Vector2 mpos) {
  var pmat = new Matrix4(this.drawmats.rendermat);
  
  if (this.use_backbuf_sel)
    return this.findnearest_backbuf(mpos, MeshTypes.VERT);
    
  var dis = 100000, vpick=null;
  var limit=75*75;
  
  for (var v in this.mesh.verts) {
    var co = new Vector3(v.mapco);
    co.multVecMatrix(pmat);
    
    co[0] = (co[0]+1.0)*0.5*this.size[0];
    co[1] = (co[1]+1.0)*0.5*this.size[1];
    co[2] = 0.0;
    
    co.sub(mpos);
    var d = co.dot(co);
    if (d < dis && d < limit) {
      vpick = v;
      dis = d;
    }
  }
  
  return vpick;
}

View3DHandler.prototype.findnearestvert = function(Vector2 mpos) {
  var pmat = new Matrix4(this.drawmats.rendermat);
  
  if (this.use_backbuf_sel)
    return this.findnearest_backbuf(mpos, MeshTypes.VERT);
  
  if (this.mesh.flag & MeshFlags.USE_MAP_CO)
    return this.findnearestvert_mapco(mpos);
  
  var dis = 100000, vpick=null;
  var limit=75*75;
  
  for (var v in this.mesh.verts) {
    var co = new Vector3(v.co);
    co.multVecMatrix(pmat);
    
    co[0] = (co[0]+1.0)*0.5*this.size[0];
    co[1] = (co[1]+1.0)*0.5*this.size[1];
    co[2] = 0.0;
    
    co.sub(mpos);
    var d = co.dot(co);
    if (d < dis && d < limit) {
      vpick = v;
      dis = d;
    }
  }
  
  return vpick;
}

View3DHandler.prototype.findnearestface_mapco = function(Vector2 mpos) {
  var pmat = new Matrix4(this.drawmats.rendermat);
  
  if (this.use_backbuf_sel)
    return this.findnearest_backbuf(mpos, MeshTypes.FACE);
    
  var dis = 100000, fpick=null;
  var limit=75;
  
  for (var f in this.mesh.faces) {
    var co = new Vector3(f.mapcenter);
    co.multVecMatrix(pmat);
    
    co[0] = (co[0]+1.0)*0.5*this.size[0];
    co[1] = (co[1]+1.0)*0.5*this.size[1];
    co[2] = 0.0;
    
    co.sub(mpos);
    var d = co.vectorLength();
    if (d < dis && d < limit) {
      fpick = f;
      dis = d;
    }
  }
  
  return fpick;
}

View3DHandler.prototype.findnearestface = function(Vector2 mpos) {
  var pmat = new Matrix4(this.drawmats.rendermat);
  
  if (this.use_backbuf_sel)
    return this.findnearest_backbuf(mpos, MeshTypes.FACE);

  if (this.mesh.flag & MeshFlags.USE_MAP_CO)
    return this.findnearestface_mapco(mpos);
    
  var dis = 100000, fpick=null;
  var limit=75;
  
  for (var f in this.mesh.faces) {
    var co = new Vector3(f.center);
    co.multVecMatrix(pmat);
    
    co[0] = (co[0]+1.0)*0.5*this.size[0];
    co[1] = (co[1]+1.0)*0.5*this.size[1];
    co[2] = 0.0;
    
    co.sub(mpos);
    var d = co.vectorLength();
    if (d < dis && d < limit) {
      fpick = f;
      dis = d;
    }
  }
  
  return fpick;
}

View3DHandler.prototype.select_flush = function() {
  var m = this.mesh;
  
  if (this.selectmode == MeshTypes.VERT) {
    for (var v in this.mesh.verts) {
      for (var e in v.edges) {
        m.select(e, (v.flag & Flags.SELECT) && (e.other_vert(v).flag & Flags.SELECT));
      }
    }
    
    for (var f in this.mesh.faces) {
      var totsel = 0;
      
      for (var v in f.verts) {
        totsel += (v.flag & Flags.SELECT) != 0;
      }
      
      m.select(f, totsel==f.totvert);
    }
    
  } else if (this.selectmode == MeshTypes.EDGE) {
    for (var v in this.mesh.verts) {
      var found = false;
      for (var e in v.edges) {
        if (e.flag & Flags.SELECT) {
          found = true;
          break;
        }
      }
      
      m.verts.select(v, found);
    }
    
    for (var f in this.mesh.faces) {
      var totsel = 0;
      var tote = 0;
      
      for (var e in f.edges) {
        totsel += e.flag & Flags.SELECT;
        tote++;
      }
      
      m.faces.select(f, totsel==tote);
    }
  } else {
    m = this.mesh;
    for (var v in this.mesh.verts)
      m.verts.select(v, false);
    
    for (var e in this.mesh.edges)
      m.edges.select(e, false);
    
    for (var f in this.mesh.faces) {
      if (!(f.flag & Flags.SELECT))
        continue;
      
      for (var v in f.verts)
        m.verts.select(v, true);
      for (var e in f.edges)
        m.edges.select(e, true);
    }
  }
}

View3DHandler.prototype.do_loop_select = function(event) {
  var e = this.findnearestedge(new Vector2([event.x, event.y]));
  if (e == undefined)
    return false;
  
  var macro = new ToolMacro("Loop Select");
  macro.flag = ToolFlags.HIDE_TITLE_IN_LAST_BUTTONS;
   
  var op = this.selectmode == MeshTypes.FACE ? new FaceLoopOp() : new EdgeLoopOp();
  
  op.inputs.eid_es.data.push(e.eid);
  
  if (event.shiftKey) {
    op.inputs.mode.data = (e.flag & Flags.SELECT) ? "subtract" : "add";
  } else {
    op.inputs.mode.data = "add";
    macro.add_tool(new ToggleSelectAllOp("deselect"));
  }
  
  macro.add_tool(op);
  console.log("edgeloop select")
  
  if (macro.tools.length == 1) 
    this.toolstack.exec_tool(macro.tools[0]);
  else
    this.toolstack.exec_tool(macro);
    
  return true;
}

View3DHandler.prototype.ensure_selbuf = function(typemask) {//typemask is optional, additional type masks to this.select
  var gl = this.gl;
  var fbuf = this.get_framebuffer();
  
  var redo_selbuf = this.redo_selbuf
  
  redo_selbuf |= fbuf.capture(this.size, this);
  redo_selbuf |= (this.last_selectmode != (this.selectmode|typemask))
  
  if (redo_selbuf) {
    console.log("yay");
    fbuf.bind()
    
    gl.colorMask(true, true, true, true);
    gl.clear(gl.COLOR_BUFFER_BIT 
           | gl.DEPTH_BUFFER_BIT 
           | gl.STENCIL_BUFFER_BIT);
          
    gl.viewport(0, 0, this.size[0], this.size[1]);
    gl.disable(gl.SCISSOR_TEST);
    gl.disable(gl.DITHER);
    gl.enable(gl.DEPTH_TEST);
    
    if (this.ss_mesh) 
      subsurf_selbuf_render(this.gl, this.ss_mesh, this.mesh, this.drawmats, 
                            (this.selectmode|MeshTypes.FACE|typemask));
    else
      render_mesh_selbuf(this.gl, this.mesh, this.drawmats, 
                       (this.selectmode|MeshTypes.FACE|typemask));
    gl.flush();
    gl.finish();
    
    gl.enable(gl.SCISSOR_TEST);
    gl.enable(gl.DITHER);
    fbuf.unbind()
    
    this.redo_selbuf = false;
    this.last_selectmode = this.selectmode|typemask;
  }
}

View3DHandler.prototype.read_selbuf = function(pos, size)
{
  var gl = this.gl;
  
  var fbuf = this.get_framebuffer();
  fbuf.bind();
  
  var pixels = new Uint8Array(new ArrayBuffer(size*size*4));
  gl.readPixels(pos[0], pos[1], size, size, 
                  gl.RGBA, gl.UNSIGNED_BYTE, pixels);

  fbuf.unbind();
  
  return pixels;
}

View3DHandler.prototype.do_select = function() {
  var mode;
  var macro = new ToolMacro("select_macro", "Select Macro");
  var ret;
  
  var highlight = this.get_mode_highlight()
  
  if (!this.shift) {
    var op = new ToggleSelectAllOp("deselect");
    macro.add_tool(op);
    
    mode = "add";
    ret = !(highlight.flag & Flags.SELECT);
  } else {
    mode = (highlight.flag & Flags.SELECT) ? "subtract" : "add";
    ret = true;
  }
  
  var op = new SelectOp(mode);
  macro.add_tool(op);
  macro.flag = ToolFlags.HIDE_TITLE_IN_LAST_BUTTONS

  var eid = highlight.eid;
  var type = highlight.type
  
  if (type == MeshTypes.VERT) {
    console.log("selected vert " + eid);
    op.inputs.eid_vs.data.push(eid);
  } else if (type == MeshTypes.EDGE) {
    console.log("selected edge " + eid);
    op.inputs.eid_es.data.push(eid);
  } else {
    console.log("selected face " + eid);
    op.inputs.eid_fs.data.push(eid);
  }
  
  if (macro.tools.length == 1) 
    this.toolstack.exec_tool(macro.tools[0]);
  else
    this.toolstack.exec_tool(macro);
  
  return ret;
}

View3DHandler.prototype.get_mode_highlight = function() : Element {
  if (this.selectmode == MeshTypes.VERT)
    return this.mesh.verts.highlight;
  else if (this.selectmode == MeshTypes.EDGE)
    return this.mesh.edges.highlight;
  else
    return this.mesh.faces.highlight;
}

View3DHandler.prototype.tools_menu = function(ctx, pos) {
  var ops = [
    "mesh.subdivide(faces=mesh_selected(f))",
    "mesh.flip_normals(faces=mesh_selected(f))",
    "mesh.vertsmooth(verts=mesh_selected(v))"
  ]
  
  var menu = this.toolop_menu(ctx, "Tools", ops);
  this.call_menu(menu, this, pos);
}

View3DHandler.prototype.rightclick_common_ops = function() {
  return [
    "mesh.extrude(geometry=mesh_selected(vef))",
    "mesh.subdivide(faces=mesh_selected(f))"
  ];
}

View3DHandler.prototype.toolop_menu = function(ctx, name, ops) {
  if (0) { //XXX ops.length > 1 && this.user_pref.use_radial_menus) {
    return toolop_radial_menu(ctx, name, ops);
  } else {
    return toolop_menu(ctx, name, ops);
  }
}

View3DHandler.prototype.call_menu = function(menu, frame, pos) {
  if (menu instanceof UIRadialMenu) {
    return ui_call_radial_menu(menu, frame, pos);
  } else {
    return ui_call_menu(menu, frame, pos);
  }
}

View3DHandler.prototype.delete_menu = function(event) {
  var ctx = new Context(this);
  
  var selstr;
  if (this.selectmode == MeshTypes.VERT) selstr = "vert"
  else if (this.selectmode == MeshTypes.EDGE) selstr = "edge"
  else selstr = "face"
  
  //var dissolve_op = "mesh.dissolve_" + selstr + "(edges=mesh_selected(vef))"
  var ops = [
    "mesh.kill_verts(verts=mesh_selected(v))",
    "mesh.kill_edges(edges=mesh_selected(e))",
    "mesh.kill_regions(faces=mesh_selected(f))",
    "mesh.kill_faces(faces=mesh_selected(f))"
    //"mesh.kill_edgesfaces(edges=mesh_selected(ef))",
    //"mesh.kill_onlyfaces(edges=mesh_selected(f))",
    //dissolve_op,
  ]
  
  var menu = this.toolop_menu(ctx, "Delete", ops);
  menu.close_on_right = true
  menu.swap_mouse_button = 2;
  
  this.call_menu(menu, this, [event.x, event.y]);
}

View3DHandler.prototype.rightclick_menu_vert = function(event) {
  var ops = this.rightclick_common_ops();
  var ctx = new Context(this);
  
  ops = ops.concat([
    "mesh.split_edges(edges=mesh_selected(e))",
    "mesh.context_create(verts=mesh_selected(v)"
  ])
  
  var menu = this.toolop_menu(ctx, "Vertex", ops);
  menu.close_on_right = true
  menu.swap_mouse_button = 2;
  
  this.call_menu(menu, this, [event.x, event.y]);
}

View3DHandler.prototype.rightclick_menu_edge = function(event) {
  var ops = this.rightclick_common_ops();
  var ctx = new Context(this);
  
  ops = ops.concat([
    "mesh.split_edges(edges=mesh_selected(e))"
  ])
  
  var menu = this.toolop_menu(ctx, "Edges", ops);
  menu.close_on_right = true
  menu.swap_mouse_button = 2;
  
  this.call_menu(menu, this, [event.x, event.y]);
}

View3DHandler.prototype.rightclick_menu_face = function(event) {
  var ops = this.rightclick_common_ops();
  var ctx = new Context(this);
  
  ops = ops.concat(
  ["mesh.flip_normals(faces=mesh_selected(f))",
   "mesh.dissolve_faces(faces=mesh_selected(f))",
   "mesh.inset()"
  ])
  
  /*
  ops = []
  
  console.log("flip_max", flip_max);
  var tot = flip_max-2;
  tot = Math.max(tot, 2);
  
  for (var i=0; i<tot; i++) {
    ops = ops.concat(["mesh.flip_normals(faces=mesh_selected(f))"
    ])
  }
  // */
  
  var menu = this.toolop_menu(ctx, "Faces", ops);
  menu.close_on_right = true
  menu.swap_mouse_button = 2;
  
  this.call_menu(menu, this, [event.x, event.y]);
}

View3DHandler.prototype.rightclick_menu = function(event) {
  if (this.selectmode == MeshTypes.VERT)
    this.rightclick_menu_vert(event);
  if (this.selectmode == MeshTypes.EDGE)
    this.rightclick_menu_edge(event);
  if (this.selectmode == MeshTypes.FACE)
    this.rightclick_menu_face(event);
    
}

View3DHandler.prototype.on_mousedown = function(event) {
  if (UIFrame.prototype.on_mousedown.call(this, event))
    return;
  
  var Element highlight = this.get_mode_highlight()
  
  var selfound = false;
  
  var is_middle = event.button == 1 || (event.button == 2 && g_app_state.screen.ctrl);
  
  if (is_middle && this.shift) {
    console.log("Panning");
    this.toolstack.exec_tool(new ViewPanOp());
  } else if (is_middle) { //middle mouse
    this.toolstack.exec_tool(new ViewRotateOp());
  } else if (event.button == 0 && g_app_state.screen.ctrl) {
    console.log("Click Extrude");
    var op = new ClickExtrude();
    
    this.toolstack.exec_tool(op);
    op.on_mousedown(event);
  } else if (event.button == 0 && event.altKey) {
    this._mstart = new Vector2(this.mpos);
    selfound = this.do_loop_select(event);
  } else if (event.button == 0 && highlight != null) {
    this._mstart = new Vector2(this.mpos);
    selfound = this.do_select(); 
  }

  if (event.button == 2 && !g_app_state.screen.shift && !g_app_state.screen.ctrl && !g_app_state.screen.alt) {
    this.rightclick_menu(event);
  }
}

View3DHandler.prototype.on_mouseup = function(MouseEvent event) {
  this._mstart = null;
  
  if (UIFrame.prototype.on_mouseup.call(this, event))
    return;
}

View3DHandler.prototype.on_mousemove = function(MouseEvent event) {
  if (this._mstart != null) {
    var vec = new Vector2(this.mpos);
    vec.sub(this._mstart);
  
    /*handle drag translate*/
    if (vec.vectorLength() > 10) {
      this.toolstack.exec_tool(new TranslateOp());
      this._mstart = null;
      return;
    }
  }
  
  var mpos = new Vector3([event.x, event.y, 0])
  this.mpos = mpos;
  
  if (UIFrame.prototype.on_mousemove.call(this, event))
    return;
  
  //don't highlight elements when selecting loops,
  //except for edgemode
  if (!this.alt || this.selectmode == MeshTypes.EDGE) {
    if (this.selectmode & MeshTypes.VERT) {
      var prev = this.mesh.verts.highlight;
      var vpick;
      
      vpick = this.findnearestvert(mpos);
      this.mesh.verts.highlight = vpick;
    } else if (this.selectmode & MeshTypes.EDGE) {
      var prev = this.mesh.edges.highlight;
      var epick;
      
      epick = this.findnearestedge(mpos);
      this.mesh.edges.highlight = epick;
    } else if (this.selectmode & MeshTypes.FACE) {
      var prev = this.mesh.faces.highlight;
      var fpick;
      
      fpick = this.findnearestface(mpos);
      this.mesh.faces.highlight = fpick;
    }
  }
}

View3DHandler.prototype.set_selectmode = function(int mode) {
  this.selectmode = mode;
}

View3DHandler.prototype.on_mousewheel = function(MouseEvent event, float delta) {
  this.change_zoom(delta)
}

View3DHandler.prototype.get_ss_steps = function() : int {
  var steps = Math.floor(this.ss_steps / Math.log(this.mesh.faces.length))+1.0;
  steps = Math.max(steps, 3.0);
  
  return steps;
}

View3DHandler.prototype.draw_lines = function(WebGLRenderingContext gl) {
  gl.enable(gl.BLEND);
  gl_blend_func(gl);
  
  if (this.drawlines.length == 0)
    return;
  
  gl.disableVertexAttribArray(3);
  gl.disableVertexAttribArray(4);
    
  var normals = []
  var verts = []
  var colors = []
  for (var dl in this.drawlines) {
    var no = new Vector3(dl.v2);
    no.sub(dl.v1);
    no.normalize();
    
    for (var i=0; i<4; i++)
      colors.push(dl.clr[i]);
    for (var i=0; i<4; i++)
      colors.push(dl.clr[i]);
    
    for (var i=0; i<3; i++) {
      verts.push(dl.v1[i]);
      normals.push(no[i]);
    }
    
    for (var i=0; i<3; i++) {
      verts.push(dl.v2[i]);
      normals.push(no[i]);
    }
  }    
  
  gl.disable(gl.DEPTH_TEST);
  
  verts = new Float32Array(verts);
  normals = new Float32Array(normals);
  colors = new Float32Array(colors);
  
  gl.useProgram(this.line_2d_shader.program);
  var color = [0.9, 0.9, 0.9, 1.0];
  gl.uniform4fv(gl.getUniformLocation(this.line_2d_shader.program, "vColor"), color);
  
  gl.enableVertexAttribArray(0);
  gl.enableVertexAttribArray(1);
  gl.enableVertexAttribArray(2);
  
  var vbuf = gl.createBuffer();    
  gl.bindBuffer(gl.ARRAY_BUFFER, vbuf);
  gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);
  gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);

  var nbuf = gl.createBuffer();    
  gl.bindBuffer(gl.ARRAY_BUFFER, nbuf);
  gl.bufferData(gl.ARRAY_BUFFER, normals, gl.STATIC_DRAW);
  gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0);
  gl.bindBuffer(gl.ARRAY_BUFFER, nbuf);

  var cbuf = gl.createBuffer();    
  gl.bindBuffer(gl.ARRAY_BUFFER, cbuf);
  gl.bufferData(gl.ARRAY_BUFFER, colors, gl.STATIC_DRAW);
  gl.vertexAttribPointer(2, 4, gl.FLOAT, false, 0, 0);
  
  gl.drawArrays(gl.LINES, 0, this.drawlines.length*2);
  
  gl.deleteBuffer(vbuf);
  gl.deleteBuffer(nbuf);
  
  gl.disableVertexAttribArray(1);
  gl.disableVertexAttribArray(2);
  gl.enable(gl.DEPTH_TEST);
}

View3DHandler.prototype.on_tick = function() {
  UIFrame.prototype.on_tick.call(this);
}

View3DHandler.prototype.check_subsurf = function(Context ctx) {
  if (this.use_subsurf && this.ss_mesh)
    return;
  if (!this.use_subsurf && this.ss_mesh == null)
    return;
    
  if (this.use_subsurf) {
      if (!this.ss_mesh) {
        ctx.mesh.regen_render();
        
        this.ss_mesh = gpu_subsurf(this.gl, ctx.mesh, this.get_ss_steps());
      }
    } else {
      if (ctx.view3d.ss_mesh) {
        destroy_subsurf_mesh(this.gl, this.ss_mesh);
        
        this.ss_mesh = null;
        ctx.mesh.regen_render();
      }
    }  
}

var _v3d_static_mat = new Matrix4()
View3DHandler.prototype.on_draw = function(WebGLRenderingContext gl, test) {
  this.check_subsurf(this.ctx);
  
  this.ss_steps = 24;
  this.set_canvasbox()
  
  gl.getExtension("OES_TEXTURE_FLOAT");
  
  this.mesh.update_callback(this, function(view3d, mesh, event) {
    if (event == MeshEvents.RECALC) {
      if (mesh.render.recalc & (RecalcFlags.REGEN_TESS|RecalcFlags.REGEN_COS)) 
      {
        view3d.redo_selbuf = true;
      }
    }
  });
  
  this.gl = gl;
  if (this.gpu_test) {
    var ret = this.gpu_test.compute(false);
    render_points(gl, ret[1], ret[0][0]*ret[0][1], this, this.drawmats);
  } else {
    if (this.ss_mesh != null) {
      //console.log("face length: ", this.ss_mesh.faces.length);
      var steps = this.get_ss_steps();
      var ss_recalc = this.mesh.render.recalc;
      
      if (steps != this.last_steps) {
        this.last_steps = steps;
        ss_recalc |= RecalcFlags.REGEN_TESS;
      }
      
      if ((ss_recalc & RecalcFlags.REGEN_TESS)==0)
        this.mesh.render.recalc &= ~RecalcFlags.REGEN_NORS;

      if (ss_recalc != 0) {
        if (ss_recalc != RecalcFlags.REGEN_COLORS) {
          if (ss_recalc & RecalcFlags.REGEN_TESS) {
            destroy_subsurf_mesh(gl, this.ss_mesh);
            this.ss_mesh = gpu_subsurf(gl, this.mesh, steps);
          } else {
            this.ss_mesh = gpu_subsurf(gl, this.mesh, steps, this.ss_mesh);
          }
        }
        
        if (ss_recalc & RecalcFlags.REGEN_TESS)
          this.mesh.flag |= MeshFlags.USE_MAP_CO;
        
        gen_mesh_render(gl, this.mesh, this.mesh.render.drawprogram, this.mesh.render.vertprogram, this.mesh.render.recalc);        
      }
      
      this.mesh.flag |= MeshFlags.USE_MAP_CO;
      
      if (0) {
        subsurf_selbuf_render(this.gl, this.ss_mesh, this.mesh, this.drawmats, 
                            (this.selectmode|MeshTypes.FACE));
      } else {
        subsurf_render(gl, this, this.ss_mesh, this.mesh, 
                       this.drawmats, !this.use_backbuf_sel);
      }
    } else {
      this.mesh.flag &= ~MeshFlags.USE_MAP_CO;
      render_mesh(gl, this, this.mesh, this.drawmats, !this.use_backbuf_sel); 
    }
  }
  
  this.draw_lines(gl);
  Area.prototype.on_draw.call(this, gl)
}

//this particular function is going away
View3DHandler.prototype.define_macros = function() {
  this.tools_define["subsurf"] = function(ctx) {
    var macro = new ToolMacro("Smooth Subdivide")
    
    var meshop = new QuadSubdOp(ctx.mesh.ops.gen_flag_iter(MeshTypes.FACE, Flags.SELECT), 1);
    var smoothop = new VertSmoothOp(ctx.mesh.ops.gen_flag_iter(MeshTypes.VERT, Flags.SELECT), 1);
    macro.add_tool(new MeshToolOp(meshop));
    macro.add_tool(new MeshToolOp(smoothop));
    
    return macro;
  };
  this.tools_define["flipnormals"] = function(ctx) {
    var meshop = new FlipNormalsOp(ctx.mesh.ops.gen_flag_iter(MeshTypes.FACE, Flags.SELECT), 1);
    
    var op = new MeshToolOp(meshop);
    
    return op;  
  };
  this.tools_define["connect"] = function(ctx) {
    var meshop = new VertexConnectOp(ctx.mesh.ops.gen_flag_iter(MeshTypes.VERT, Flags.SELECT), 1);
    
    var op = new MeshToolOp(meshop);
    
    return op;
  };
  this.tools_define["vertconnect"] = function(ctx) {
    var meshop = new VertexConnectOp(ctx.mesh.ops.gen_flag_iter(MeshTypes.VERT, Flags.SELECT), 1);
    
    var op = new MeshToolOp(meshop);
    return op;
  };
  
  this.tools_define["remove_doubles"] = function(ctx) {
    var meshop = new RemoveDoublesOp(ctx.mesh.ops.gen_flag_iter(MeshTypes.VERT, Flags.SELECT));
    
    var op = new MeshToolOp(meshop);
    return op;
  };
  
  this.tools_define["inset"] = function(ctx) {
    var meshop = new InsetRegionsOp(ctx.mesh.ops.gen_flag_iter(MeshTypes.FACE, Flags.SELECT));
    
    var op = new MeshToolOp(meshop);
    var macro = new ToolMacro("inset", "Inset Regions");
    
    macro.add_tool(op);
    
    var transop = new InsetOp()
    macro.add_tool(transop);

    return macro;  
  };
  
  this.tools_define["extrude_all"] = function(ctx) {
    var meshop = new ExtrudeAllOp(ctx.mesh.ops.gen_flag_iter(MeshTypes.FACE|MeshTypes.VERT|MeshTypes.EDGE, Flags.SELECT));
    
    var op = new MeshToolOp(meshop);
    var macro = new ToolMacro("extrude_grab", "Extrude");
    
    macro.add_tool(op);
    
    var transop = new TranslateOp()
    macro.add_tool(transop);

    macro.connect_tools(op.outputs.group_no, transop.inputs.AXIS);
    
    return macro;
  }
}

View3DHandler.prototype.add_menu = function() {
  this.ctx = new Context(this);
  
  console.log("Add menu")
   
  var oplist = ["mesh.add_cube()", "mesh.add_circle()"]
  var menu = toolop_menu(this.ctx, "Add", oplist);
  this.call_menu(menu, this, this.mpos);
}

View3DHandler.prototype.define_keymap = function() {
  var k = this.keymap;
  
  k.add_tool(new KeyHandler("O", ["CTRL"], "Open File"),
             "appstate.open()");
  k.add_tool(new KeyHandler("S", ["CTRL", "ALT"], "Open File"),
             "appstate.save_as()");
  k.add_tool(new KeyHandler("S", ["CTRL", "S"], "Open File"),
             "appstate.save()");
  k.add_tool(new KeyHandler("C", ["CTRL"], "Loop Cut"),
             "mesh.loopcut()");
  k.add_tool(new KeyHandler("F", [], "Create Face"),
             "mesh.context_create(verts=mesh_selected(v))");
  k.add_tool(new KeyHandler("D", ["SHIFT"], "Duplicate"), 
             "mesh.duplicate_transform()");
  k.add_tool(new KeyHandler("D", [], "Smooth Subdivide"), 
             "mesh.smooth_subdivide(faces=mesh_selected(f))");
  k.add_tool(new KeyHandler("Y", [], "Connect"), 
             "mesh.vert_connect(verts=mesh_selected(v))");
  k.add_tool(new KeyHandler("E", [], "Extrude"), 
             "mesh.extrude(geometry=mesh_selected(vef))");
  k.add_tool(new KeyHandler("L", [], "Remove Duplicate Verts"), 
             "mesh.remove_doubles(verts=mesh_selected(v))");
  k.add_tool(new KeyHandler("G", [], "Translate"), 
             "mesh.translate()");
  k.add_tool(new KeyHandler("S", [], "Scale"), 
             "mesh.scale()");
  k.add_tool(new KeyHandler("R", [], "Rotate"), 
             "mesh.rotate()");
  k.add_tool(new KeyHandler("A", [], "Toggle Select All"), 
             "mesh.toggle_select_all()");
  k.add_func(new KeyHandler("A", ["SHIFT"], "Add"), 
             function(ctx) {
              ctx.view3d.add_menu();
             });
  k.add_tool(new KeyHandler("C", [], "Circle Select"), 
             "view3d.circle_select()");
  
  k.add(new KeyHandler("K", [], "Test Dialog"), new FuncKeyHandler(function (ctx) {
    console.log("Dialog test");
    var d = new PackedDialog("Test", ctx, ctx.screen, DialogFlags.END_ON_ESCAPE|DialogFlags.MODAL);
    d.size = [200, 200];
    
    function cb() {
      d.end();
    }
    
    var col = d.subframe.col()
    col.add(new UIButton(ctx, "Okay", undefined, undefined, undefined, cb));    
    col.add(new UIButton(ctx, "Cancel", undefined, undefined, undefined, cb));    
    
    d.call(ctx.screen.mpos);
  }));
  
  k.add(new KeyHandler("X", [], "Delete Menu"), new FuncKeyHandler(function (ctx) {
    ctx.view3d.delete_menu(new MyMouseEvent(ctx.keymap_mpos[0], ctx.keymap_mpos[1], 0));
  }));
  k.add(new KeyHandler("Delete", [], "Delete Menu"), new FuncKeyHandler(function (ctx) {
    ctx.view3d.delete_menu(new MyMouseEvent(ctx.keymap_mpos[0], ctx.keymap_mpos[1], 0));
  }));
  
  k.add(new KeyHandler("Z", ["CTRL", "SHIFT"], "Redo"), new FuncKeyHandler(function(ctx) {
    console.log("Redo")
    ctx.toolstack.redo();
  }));
  k.add(new KeyHandler("Y", ["CTRL"], "Redo"), new FuncKeyHandler(function(ctx) {
    console.log("Redo")
    ctx.toolstack.redo();
  }));
  k.add(new KeyHandler("Z", ["CTRL"], "Undo"), new FuncKeyHandler(function(ctx) {
    console.log("Undo");
    ctx.toolstack.undo();
  }));
  k.add(new KeyHandler("O", [], "Save Mesh"), new FuncKeyHandler(function(ctx) {
    send_mesh(ctx.mesh);
  }));
  k.add(new KeyHandler("I", ["CTRL"], "Toggle Generator Debug"), new FuncKeyHandler(function(ctx) {
    console.log("Toggling frame debug")
    _do_frame_debug ^= 1;
    test_nested_with();
  }));
  k.add(new KeyHandler("F", ["CTRL"], "Face Menu"), new FuncKeyHandler(function(ctx) {
    var mpos = ctx.keymap_mpos;
    ctx.view3d.rightclick_menu_face({x : mpos[0], y : mpos[1]});
  }));
  k.add(new KeyHandler("E", ["CTRL"], "Edge Menu"), new FuncKeyHandler(function(ctx) {
    var mpos = ctx.keymap_mpos;
    ctx.view3d.rightclick_menu_edge({x : mpos[0], y : mpos[1]});
  }));
  k.add(new KeyHandler("V", ["CTRL"], "Vertex Menu"), new FuncKeyHandler(function(ctx) {
    var mpos = ctx.keymap_mpos;
    ctx.view3d.rightclick_menu_vert({x : mpos[0], y : mpos[1]});
  }));
  k.add(new KeyHandler("W", [], "Tools Menu"), new FuncKeyHandler(function(ctx) {
    var mpos = ctx.keymap_mpos;
    ctx.view3d.tools_menu(ctx, mpos);
  }));
  k.add(new KeyHandler("E", ["SHIFT"], "Toggle Subsurf"), new FuncKeyHandler(function(ctx) {
    console.log("subsurf");
    if (ctx.view3d.ss_mesh == null) {
      ctx.mesh.regen_render();
      ctx.view3d.ss_mesh = gpu_subsurf(ctx.view3d.gl, ctx.mesh, ctx.view3d.get_ss_steps());
    } else {
      destroy_subsurf_mesh(ctx.view3d.gl, ctx.view3d.ss_mesh);
      ctx.view3d.ss_mesh = null;
      ctx.mesh.regen_render();
    }
  }));
  k.add(new KeyHandler("Up", [], "Increment Debug Value"), new FuncKeyHandler(function(ctx) {
    //flip_max++;
    global debug_int_1;
    
    debug_int_1++;
    
    console.log("debug_int_1: ", debug_int_1);
    ctx.mesh.regen_render();
  }));
  k.add(new KeyHandler("Down", [], "Decrement Debug Value"), new FuncKeyHandler(function(ctx) {
    //flip_max--;
    global debug_int_1;
    
    debug_int_1--;
    debug_int_1 = Math.max(0, debug_int_1);
    
    console.log("debug_int_1: ", debug_int_1);
    ctx.mesh.regen_render();
  }));
  k.add(new KeyHandler("T", [], "Toggle Select Mode"), new FuncKeyHandler(function(ctx) {
    var mode = ctx.view3d.selectmode;
    if (mode == MeshTypes.VERT)
      mode = MeshTypes.EDGE;
    else if (mode == MeshTypes.EDGE)
      mode = MeshTypes.FACE;
    else if (mode == MeshTypes.FACE)
      mode = MeshTypes.VERT;
      
    ctx.view3d.set_selectmode(mode);
  }));
}

View3DHandler.prototype._on_keyup = function(KeyboardEvent event) {
  this.shift = event.shiftKey;
  this.alt = event.altKey;
  this.ctrl = event.ctrlKey;
  
  prior(View3DHandler, this)._on_keyup.call(this, event);
}

View3DHandler.prototype.on_keyup = function(KeyboardEvent event) {

  var ctx = new Context(this);
  var ret = this.keymap.process_event(ctx, event);
  
  if (ret != undefined) {
    ret.handle(ctx);
  }
}

View3DHandler.prototype.on_keydown = function(Keyboard event) {
  this.shift = event.shiftKey;
  this.alt = event.altKey;
  this.ctrl = event.ctrlKey;
}

View3DHandler.prototype.on_resize = function(Array<int> newsize, Array<int> oldsize)
{
  for (var c in this.rows) {
    if (c.pos[1] > 30)
      c.pos[1] = this.size[1] - 28;
      
    c.size[0] = this.size[0];
  }
  
  for (var c in this.cols) {
    c.size[1] = this.size[1]-28*2;
  }
  
  for (var c in this.children) {
    if (this.canvas != undefined) 
      c.canvas = this.canvas;
    
    c.on_resize(newsize, oldsize);
  }
  
  this.gen_persmat();
  this.gen_rendermats();
  
  this.set_canvasbox();
}

View3DHandler.prototype.area_duplicate = function()
{
  var cpy = new View3DHandler(this.gl, this.mesh, this.vprogram, this.fprogram, this.mesh.drawmats, 0, 0, this.size[0], this.size[1], this.znear, this.zfar);
  
  cpy.mesh = this.mesh;
  cpy.zoomfac = this.zoomfac;
  cpy.zoomwheel = this.zoomwheel;
  cpy.drawmats = this.drawmats.copy();
  cpy.ctx = new Context(cpy);
  
  return cpy
}

View3DHandler.prototype.build_bottombar = function()
{
  this.ctx = new Context(this);
  
  var col = new ColumnFrame(this.ctx);
  col.draw_background = true;
  col.rcorner = 100.0
  col.pos = [0,0]
  col.size = [this.size[0], 30];
  
  col.prop("view3d.use_subsurf");
  
  //col.add(new UIMenuLabel(this.ctx, "File", undefined, gen_file_menu));
  col.label("  |  Select Mode:  ");
  col.prop("view3d.selectmode");
  col.prop("view3d.use_backbuf_sel");
  col.label("  |   ");
  col.prop("view3d.zoomfac");
  
  this.rows.push(col);
  this.add(col);
}

View3DHandler.prototype.gen_file_menu = function(ctx, uimenulabel)
{
  return toolop_menu(ctx, "", ["appstate.save_as()", "appstate.save()", "appstate.open()"]);
}

View3DHandler.prototype.gen_tools_menu = function(ctx, uimenulabel)
{
  return toolop_menu(ctx, "", ["mesh.translate()", "mesh.rotate()", "mesh.scale()"]);
}

View3DHandler.prototype.on_area_inactive = function()
{
  this.mesh.remove_callback(this);
}

View3DHandler.prototype.on_area_active = function()
{
}

View3DHandler.prototype.build_topbar = function()
{
  this.ctx = new Context(this);
  
  var col = new ColumnFrame(this.ctx, undefined, PackFlags.ALIGN_LEFT);
  col.packflag |= PackFlags.IGNORE_LIMIT;
  
  col.size = [this.size[0], 30];
  col.draw_background = true
  col.rcorner = 100.0
  col.pos = [0, this.size[1]-28]
  
  col.label("                 ");
  col.add(new UIMenuLabel(this.ctx, "File", undefined, this.gen_file_menu));
  col.add(new UIMenuLabel(this.ctx, "Tools", undefined, this.gen_tools_menu));
  
  col.label("|");
  if (!IsMobile) {
    col.label("view3d.framerate", true);
  }
  col.label("mesh.tottri", true);
  col.label("mesh.totvert", true);
  col.label("mesh.totedge", true);
  
  //UIMenuLabel(ctx, text, pos, size, menu, gen_menu_func)
  this.rows.push(col);
  this.add(col);
}

View3DHandler.prototype.build_sidebar1 = function()
{
  this.ctx = new Context(this);
  
  var row = new RowFrame(this.ctx);
  
  row.size = [115, this.size[1]]
  row.draw_background = true
  row.rcorner = 100.0
  row.pos = [0, 28]
  
  this.cols.push(row);
  this.add(row);
  
  row.toolop("screen.area_split_tool()", PackFlags.INHERIT_WIDTH);
  row.label("");
  
  row.toolop("mesh.subdivide(faces=mesh_selected(f))", PackFlags.INHERIT_WIDTH);
  row.toolop("mesh.translate()", PackFlags.INHERIT_WIDTH);
  row.toolop("mesh.extrude()", PackFlags.INHERIT_WIDTH);
  row.toolop("mesh.rotate()", PackFlags.INHERIT_WIDTH);
  row.toolop("mesh.scale()", PackFlags.INHERIT_WIDTH);
  row.toolop("mesh.flip_normals(faces=mesh_selected(f))", PackFlags.INHERIT_WIDTH);
  row.toolop("mesh.triangulate(faces=mesh_selected(f))", PackFlags.INHERIT_WIDTH);
  row.toolop("mesh.tri2quad(faces=mesh_selected(f))", PackFlags.INHERIT_WIDTH);
  row.toolop("mesh.duplicate_transform()", PackFlags.INHERIT_WIDTH);
  row.toolop("mesh.bridge_edges(edges=mesh_selected(e))", PackFlags.INHERIT_WIDTH);
  row.toolop("mesh.vertsmooth(verts=mesh_selected(v))", PackFlags.INHERIT_WIDTH);
  
  row.label("Last Tool:", false)
  row.add(new ToolOpFrame(this.ctx, "last_tool"), PackFlags.INHERIT_WIDTH);
}


View3DHandler.fromJSON = function(obj)
{
  var gl = g_app_state.gl;
  var view3d = new View3DHandler(gl, g_app_state.mesh, gl.program, gl.program2, DrawMats.fromJSON(obj.drawmats), obj.pos[0], obj.pos[1], obj.size[0], obj.size[1], obj.znear, obj.zfar);
  
  view3d.selectmode = obj.selectmode;
  
  view3d.zoomfac = obj.zoomfac;
  view3d.zoomwheel = obj.zoomwheel;
  view3d.use_subsurf = obj.use_subsurf
  
  view3d.gen_persmat();
  view3d.gen_rendermats();
  
  view3d.pos[0] = obj.pos[0]; view3d.pos[1] = obj.pos[1];
  view3d.size[0] = obj.size[0]; view3d.size[1] = obj.size[1];
  
  view3d.use_backbuf_sel = obj.use_backbuf_sel;
  
  return view3d;
}

View3DHandler.prototype.toJSON = function() {
  var obj = prior(this, View3DHandler).toJSON.call(this);
  
  obj.type = View3DHandler.name;
  
  obj.zoomfac = this.zoomfac;
  obj.zoomwheel = this.zoomwheel;
  
  obj.drawmats = this.drawmats.toJSON();
  obj.selectmode = this.selectmode;
  
  obj.znear = this.znear;
  obj.zfar = this.zfar;
  
  obj.use_backbuf_sel = this.use_backbuf_sel;
  obj.use_subsurf = this.use_subsurf
  
  return obj;
}