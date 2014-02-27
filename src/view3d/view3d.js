"use strict";

var EditModes = {OBJECT : 1, GEOMETRY : 2};
var ibuf_idgen = new EIDGen();

ibuf_idgen.gen_id();

//stupid statics
var __v3d_g_s = []
var _v3d_static_mat = new Matrix4()
var bleh_bleh = 0;

class View3DEditor {
  constructor(name, type, lib_type, keymap) {
    this.name = name;
    this.type = type;
    this.lib_type = lib_type;
    this.keymap = keymap;
  }

  //objecteditor is an abstract class,
  //but struct system does require the presence
  //of fromSTRUCT.  need to review that.
  static fromSTRUCT(reader) {
    var obj = {};
    reader(obj);
    
    return obj;
  }

  on_area_inactive(view3d) {}

  //returns new copy
  editor_duplicate(view3d) {}
  render_selbuf(gl, view3d, typemask) {}
  selbuf_changed(typemask) {}
  reset_selbuf_changed(typemask) {}
  add_menu(view3d, mpos) {}
  draw_object(gl, view3d, object, is_active) {}
  build_sidebar1(view3d) {}
  build_bottombar(view3d) {}
  set_selectmode(int mode) {}

  //returns number of selected items
  do_select(event, mpos, view3d) {}
  tools_menu(event, view3d) {}
  rightclick_menu(event, view3d) {}
  on_mousemove(event) {}
  do_alt_select(event, mpos, view3d) {}
  delete_menu(event) {}
}
View3DEditor.STRUCT = """
  View3DEditor {
  }
""";

class drawline {
  constructor(co1, co2) {
    this.v1 = co1;
    this.v2 = co2;
    this.clr = [0.9, 0.9, 0.9, 1.0];
  }

  set_clr(Array<float> clr) {
    this.clr = clr;
  }
}

class IndexBufItem {
  constructor(id, owner) {
    this.user_id = id;
  }
}

class FrameBuffer {
  constructor(gl, size) {
    this.size = size;
    this.fbuf = undefined;
    this.rbuf1 = undefined;
    this.rbuf2 = undefined;
    this.gl = gl;
    this.caller = undefined;
    
    this.idmap = {};
  }

  //returns true if the framebuffer needs to be redrawn
  capture(size, caller) {
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

  regen() {
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

  bind() {
    //this.regen();
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.fbuf);
  }

  unbind() {
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
  }
}

var _v3d_id_gen = 0
class View3DHandler extends Area {
   constructor(WebGLRenderingContext gl, Mesh mesh, ShaderProgram vprogram, ShaderProgram fprogram, 
                       DrawMats drawmats, int x, int y, int width, 
                       int height, int znear, int zfar) 
  {
    this.drawmats = drawmats;
    this.transmat = new Mat4Stack();
    
    this.mesh = mesh;
    
    this.znear = znear;
    this.zfar = zfar;
    this.vprogram = vprogram;
    this.fprogram = fprogram;
    
    this._can_select = true;
    this.redo_selbuf = true;
    
    this.flagprop = 1;
    
    this.zoomfac = 0.0
    this.zoomwheel = 0.0
    this.screen = undefined : Screen;
    this.ui_canvas = null;
    this.framerate = 0.1;
    this.use_backbuf_sel = true;
    this.last_selectmode = 0;
    
    this.use_radial_menus = false;
    this.use_subsurf = false;
    
    this.mesh = mesh;
    this.selectmode = MeshTypes.VERT;
    
    var sm = this.selectmode;
    if (sm!= 2 && sm != 4 && sm != 8) this.selectmode = MeshTypes.VERT;

    this.mesh = mesh;
    
    this.gl = gl;
    this.asp = width / height;
    this.zfar = zfar;
    this.znear = znear;
    
    this.last_tick = time_ms()
    
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
    
    Area.call(this, View3DHandler.name, new Context(), [x, y], [width, height]);
    
    this.keymap = new KeyMap()
    this.define_keymap();
    this._id = _v3d_id_gen++;
    
    this.editor = new MeshEditor(this);
    this.editors = new GArray([this.editor]);
  }
  
  get can_select() {
    return this._can_select;
  }
  
  set can_select(val) {
    this._can_select = !!val;
  }
  
  static fromSTRUCT(reader) {
    var v3d = new View3DHandler(g_app_state.gl)
    
    reader(v3d)
    
    v3d.editors = new GArray(v3d.editors);
    v3d.editor = v3d.editors[v3d.editor];
    
    if (v3d.editor == undefined) {
      console.log("WARNING: corrupted View3DHandler sturct data");
      v3d.editor = v3d.editors[0];
    }
    
    v3d.gl = g_app_state.gl;
    
    return v3d;
  }

  data_link(block, getblock, getblock_us) {
    this.mesh = this.ctx.mesh;
    
    //make dummy mesh, if necassary
    //stupid!
    var mesh = this.mesh
    
    if (this.mesh == undefined) {
      this.mesh = new Mesh();
    } else {
      this.mesh.regen_render();
    }
    
    this.ctx = new Context();
    this.ctx.mesh = this.mesh;
    
    for (var e in this.editors) {
      e.view3d = this;
      e.mesh = this.mesh;
      e.ctx = this.ctx;
      
      e.data_link(block, getblock, getblock_us);
      e.mesh = mesh;
    }
    
    this.mesh = mesh; 
    this.ctx = new Context();
  }

  get_framebuffer()
  {
    if (View3DHandler.framebuffer == undefined)
      View3DHandler.framebuffer = new FrameBuffer(this.gl, this.size);
    
    return View3DHandler.framebuffer;
  }

  __hash__() : String {
    return this.constructor.name + this._id;
  }

  gen_persmat() : String {
    this.drawmats.persmat = new Matrix4();
    this.drawmats.persmat.perspective(30, this.size[0] / this.size[1], 0.2, 10000);
    this.drawmats.persmat.lookat(0, 0, 7, 0, 0, 0, 0, 1, 0);
  }

  kill_drawline(DrawLine dl) {
    this.drawlines.remove(dl, true);
  }

  new_drawline(Vector3 v1, Vector3 v2) { //v1 and v2 are optional
    if (v1 == undefined) {
      v1 = new Vector3();
      v2 = new Vector3();
    }
    
    var dl = new drawline(v1, v2);
    this.drawlines.push(dl);
    
    return dl;
  }

  gen_rendermats() {
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
  }

  change_zoom(float delta) {
    this.zoomwheel += delta
    this.zoomwheel = Math.max(Math.min(this.zoomwheel+delta, this.zoom_wheelrange[1]), this.zoom_wheelrange[0]);

    this.zoomfac = (this.zoomwheel-this.zoom_wheelrange[0]) / (this.zoom_wheelrange[1]-this.zoom_wheelrange[0]);
    this.zoomfac = this.zoom_range[0] + (this.zoom_range[1] - this.zoom_range[0]) * this.zoomfac;
    
    this.gen_rendermats();
    this.on_view_change();
  }

  set_drawmats(DrawMats drawmats) {
    this.drawmats = drawmats;
    this.gen_persmat();
    this.gen_rendermats();
  }

  set_canvasbox() {
    this.asp = this.size[0] / this.size[1];
    
    //Set the viewport and projection matrix for the scene
    gl.viewport(this.parent.pos[0], this.parent.pos[1], this.size[0], this.size[1]);
  }

  project(Vector3 co, Matrix4 pmat) {
    co.multVecMatrix(pmat);
    co[0] = (co[0]+1.0)*0.5*this.size[0];
    co[1] = (co[1]+1.0)*0.5*this.size[1];
    co[2] = 0.0;
  }

  ensure_selbuf(typemask) {//typemask is optional, additional type masks to this.select
    var gl = this.gl;
    var fbuf = this.get_framebuffer();
    
    var redo_selbuf = this.redo_selbuf
    redo_selbuf |= fbuf.capture(this.size, this);
    redo_selbuf |= this.editor.selbuf_changed(typemask);
    
    if (redo_selbuf) {
      console.log("render selbuf");
      fbuf.bind()
      
      gl.colorMask(true, true, true, true);
      gl.clear(gl.COLOR_BUFFER_BIT 
             | gl.DEPTH_BUFFER_BIT 
             | gl.STENCIL_BUFFER_BIT);
            
      gl.viewport(0, 0, this.size[0], this.size[1]);
      gl.disable(gl.SCISSOR_TEST);
      gl.disable(gl.DITHER);
      gl.enable(gl.DEPTH_TEST);
      
      this.editor.render_selbuf(this.gl, this, typemask);

      gl.flush();
      gl.finish();
      
      gl.enable(gl.SCISSOR_TEST);
      gl.enable(gl.DITHER);
      fbuf.unbind()
      
      this.redo_selbuf = false;
      this.editor.reset_selbuf_changed(typemask);
    }
  }

  read_selbuf(pos, size)
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

  do_select(event, mpos, view3d) {
    return this.editor.do_select(event, mpos, view3d);
  }
  do_alt_select(event, mpos, view3d) {
    return this.editor.do_alt_select(event, mpos, view3d);
  }
  tools_menu(event) {
    this.editor.tools_menu(event, this);
  }


  toolop_menu(ctx, name, ops) {
    if (ops.length > 1 && this.use_radial_menus) {
      return toolop_radial_menu(ctx, name, ops);
    } else {
      return toolop_menu(ctx, name, ops);
    }
  }

  call_menu(menu, frame, pos) {
    if (menu instanceof UIRadialMenu) {
      return ui_call_radial_menu(menu, frame, pos);
    } else {
      return ui_call_menu(menu, frame, pos);
    }
  }

  rightclick_menu(event) {
    this.editor.rightclick_menu(event, this);
  }

  on_mousedown(event) {
    if (UIFrame.prototype.on_mousedown.call(this, event))
      return;
    
    var selfound = false;
    var is_middle = event.button == 1 || (event.button == 2 && g_app_state.screen.ctrl);
    
    if (is_middle && this.shift) {
      console.log("Panning");
      g_app_state.toolstack.exec_tool(new ViewPanOp());
    } else if (is_middle) { //middle mouse
      g_app_state.toolstack.exec_tool(new ViewRotateOp());
    //need to add mouse keymaps to properly handle this next one
    } else if ((this.editor instanceof MeshEditor) && event.button == 0 && g_app_state.screen.ctrl) {
      console.log("Click Extrude");
      var op = new ClickExtrude();
      
      g_app_state.toolstack.exec_tool(op);
      op.on_mousedown(event);
    } else if (event.button == 0 && event.altKey) {
      this._mstart = new Vector2(this.mpos);
      selfound = this.do_alt_select(event, this.mpos, this);
    } else if (event.button == 0) {
      this._mstart = new Vector2(this.mpos);
      selfound = this.do_select(event, this.mpos, this); 
    }

    if (event.button == 2 && !g_app_state.screen.shift && !g_app_state.screen.ctrl && !g_app_state.screen.alt) {
      this.rightclick_menu(event);
    }
  }

  on_mouseup(MouseEvent event) {
    this._mstart = null;
    
    if (UIFrame.prototype.on_mouseup.call(this, event))
      return;
  }

  on_mousemove(MouseEvent event) {
    var mpos = new Vector3([event.x, event.y, 0])
    this.mpos = mpos;
    
    if (this._mstart != null) {
      var vec = new Vector2(this.mpos);
      vec.sub(this._mstart);
    
      /*handle drag translate*/
      if (vec.vectorLength() > 10) {
        g_app_state.toolstack.exec_tool(new TranslateOp());
        this._mstart = null;
        return;
      }
    }
    
    if (UIFrame.prototype.on_mousemove.call(this, event))
      return;
    
    this.editor.on_mousemove(event);
  }

  set_selectmode(int mode) {
    this.selectmode = mode;
    this.editor.selectmode = mode;
  }

  on_mousewheel(MouseEvent event, float delta) {
    this.change_zoom(delta)
  }

  draw_lines(WebGLRenderingContext gl) {
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

  on_tick() {
    UIFrame.prototype.on_tick.call(this);
  }

  on_view_change() {
    this.redo_selbuf = true;
  }

  on_draw(WebGLRenderingContext gl, test) {
    g_app_state.active_view3d = this;
    
    this.ctx = new Context();
    this.mesh = this.ctx.mesh;
    
    if (this.mesh.render == 0 || this.mesh.render == undefined) {
      this.mesh.gen_render_struct(gl);
    }
    
    gl.getExtension("OES_TEXTURE_FLOAT");
    
    var this2 = this;
    var updatefunc = function() {
      this2.gen_rendermats();
    }
    
    //set up matrix transformation stack
    var cameramat_backup = new Matrix4(this.drawmats.cameramat);
    this.transmat.set_internal_matrix(this.drawmats.cameramat, updatefunc);
    
    //set up canvas box
    this.set_canvasbox();
    
    //draw object
    this.editor.draw_object(gl, this, this.ctx.object, true);
    
    //clean up transformation stack
    this.transmat.reset(cameramat_backup);
    this.drawmats.cameramat.load(cameramat_backup);
    
    this.draw_lines(gl);
    Area.prototype.on_draw.call(this, gl)
  }

  add_menu() {
    this.editor.add_menu(this, this.mpos);
  }

  define_keymap() {
    var k = this.keymap;
    
    k.add_tool(new KeyHandler("C", ["CTRL"], "Loop Cut"),
               "mesh.loopcut()");
    k.add_tool(new KeyHandler("G", [], "Translate"), 
               "mesh.translate()");
    k.add_tool(new KeyHandler("S", [], "Scale"), 
               "mesh.scale()");
    k.add_tool(new KeyHandler("R", [], "Rotate"), 
               "mesh.rotate()");
    
    k.add(new KeyHandler("K", [], "Test Dialog"), new FuncKeyHandler(function (ctx) {
      g_app_state.load_user_file_new(g_app_state.create_user_file_new());
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
  }

  _on_keyup(KeyboardEvent event) {
    this.shift = event.shiftKey;
    this.alt = event.altKey;
    this.ctrl = event.ctrlKey;
    
    prior(View3DHandler, this)._on_keyup.call(this, event);
  }

  on_keyup(KeyboardEvent event) {

    var ctx = new Context();
    var ret = this.keymap.process_event(ctx, event);
    
    if (ret == undefined)
      ret = this.editor.keymap.process_event(ctx, event);
    
    if (ret != undefined) {
      ret.handle(ctx);
    }
  }

  on_keydown(Keyboard event) {
    this.shift = event.shiftKey;
    this.alt = event.altKey;
    this.ctrl = event.ctrlKey;
  }

  on_resize(Array<int> newsize, Array<int> oldsize)
  {
    for (var c in this.rows) {
      if (c.pos[1] > 70)
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
    this.on_view_change();
  }

  area_duplicate()
  {
    var cpy = new View3DHandler(this.gl, this.mesh, this.vprogram, this.fprogram, this.mesh.drawmats, 0, 0, this.size[0], this.size[1], this.znear, this.zfar);
    
    cpy.mesh = this.mesh;
    cpy.zoomfac = this.zoomfac;
    cpy.zoomwheel = this.zoomwheel;
    cpy.drawmats = this.drawmats.copy();
    cpy.ctx = new Context();
    
    cpy.editors = new GArray();
    cpy.editor = undefined;
    for (var e in this.editors) {
      var e2 = e.editor_duplicate(cpy);
      
      cpy.editors.push(e2);
      if (e == this.editor)
        cpy.editor = e2;
    }
    
    if (cpy.editor == undefined) {
      cpy.editor = cpy.editors[0];
    }
    
    return cpy
  }

  gen_file_menu(ctx, uimenulabel)
  {
    return toolop_menu(ctx, "", ["appstate.save_as()", "appstate.save()", "appstate.open()"]);
  }

  gen_tools_menu(ctx, uimenulabel)
  {
    return toolop_menu(ctx, "", ["mesh.translate()", "mesh.rotate()", "mesh.scale()"]);
  }

  on_area_inactive()
  {
    this.editor.on_area_inactive(this);
  }

  on_area_active()
  {
  }

  build_bottombar() {
    this.editor.build_bottombar(this);
  }

  build_sidebar1() {
    this.ctx = new Context();
    this.editor.build_sidebar1(this);
  }

  build_topbar()
  {
    this.ctx = new Context();
    
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

  static fromJSON(obj)
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

  toJSON() {
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
}

View3DHandler.framebuffer = undefined;
View3DHandler.STRUCT = STRUCT.inherit(View3DHandler, Area) + """
    use_backbuf_sel : int;
    drawmats : DrawMats;
    zoomfac : float;
    zoomwheel : float;
    _id : int;
    selectmode : int;
    zoom_wheelrange : array(float);
    zoom_range : array(float);
    editors : array(abstract(View3DEditor));
    editor : int | obj.editors.indexOf(obj.editor);
  }
"""