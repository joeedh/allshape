"use strict";

//bitmask
//VERT/EDGE/FACE is compatible with MeshTypes, thus why we skip 4
var EditModes = {VERT : 1, EDGE : 2, FACE : 8, OBJECT : 16, GEOMETRY : 1|2|8};

var ibuf_idgen = new EIDGen();

ibuf_idgen.gen_id();

//stupid statics
var __v3d_g_s = [];
var _v3d_static_mat = new Matrix4();
var bleh_bleh = 0;
var icon_tst_k = 0;

class View3DEditor {
  constructor(String name, int type, int lib_type, KeyMap keymap) {
    this.name = name;
    this.type = type;
    this.lib_type = lib_type;
    this.keymap = keymap;
  }

  /*
    View3DEditor is an abstract class,
    but the STRUCT system does require the 
    presence of fromSTRUCT.  Need to review 
    that.
   */
  static fromSTRUCT(Function reader) {
    var obj = {};
    reader(obj);
    
    return obj;
  }
  
  get_keymaps() : Array<KeyMap> {
    return [this.keymap];
  }
  
  on_area_inactive(View3DHandler view3d) {}
  
  on_inactive(View3DHandler view3d) {}
  on_active(View3DHandler view3d) {}
  
  data_link(DataBlock block, Function getblock, Function getblock_us) {}
  
  //returns new copy
  editor_duplicate(View3DHandler view3d) {}
  render_selbuf(WebGLRenderingContext gl, View3DHandler view3d, int typemask) {}
  selbuf_changed(int typemask) {}
  reset_selbuf_changed(int typemask) {}
  add_menu(View3DHandler view3d, Array<float> mpos) {}
  draw_object(WebGLRenderingContext gl, View3DHandler view3d, ASObject object, Boolean is_active) {}
  build_sidebar1(View3DHandler view3d) {}
  build_bottombar(View3DHandler view3d) {}
  set_selectmode(int mode) {}

  //returns number of selected items
  do_select(MouseEvent event, Array<float> mpos, View3DHandler view3d) {}
  tools_menu(Context ctx, Array<float> mpos, View3DHandler view3d) {}
  rightclick_menu(MouseEvent event, View3DHandler view3d) {}
  on_mousemove(MouseEvent event) {}
  do_alt_select(MouseEvent event, Array<float> mpos, View3DHandler view3d) {}
  delete_menu(MouseEvent event) {}
  gen_delete_menu() : UIMenu {}
}

View3DEditor.STRUCT = """
  View3DEditor {
  }
""";

class drawline {
  constructor(Vector3 co1, Vector3 co2) {
    this.v1 = co1;
    this.v2 = co2;
    this.clr = [0.9, 0.9, 0.9, 1.0];
  }

  set_clr(Array<float> clr) {
    this.clr = clr;
  }
}

class IndexBufItem {
  constructor(int id, Object owner) {
    this.user_id = id;
  }
}

class View3DHandler extends Area {
   constructor(WebGLRenderingContext gl, Mesh mesh, ShaderProgram vprogram, ShaderProgram fprogram, 
                       DrawMats drawmats, int x, int y, int width, 
                       int height, int znear, int zfar) 
  {
    static int v3d_id = 0;
    
    this.drawmats = drawmats;
    this.transmat = new Mat4Stack();
    this.topbar = undefined;
    this.test = new Vector3();
    
    if (drawmats != undefined) {
      drawmats.cameramat.load([0.920457286330552, 0.05884240153177518, -0.386388348456536, 0, 0.373664711170723,
      -0.4223555167941103, 0.8258271617349959, 0, -0.1145995971489264, -0.9045183188944005, 
      -0.4107475418280071, 0, 0, 0, 0, 1]);
    }
    
    this.mesh = mesh;
    this.sidmap = {}; //stores objects, and possibly manipulator widgets and the like
    
    this.framebuffer = undefined : FrameBuffer;
    this.csg_render = undefined;
    this.draw_csg = false;
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
    
    this._in_from_struct = false;
    
    this.use_radial_menus = false;
    
    this.mesh = mesh;
    this._selectmode = MeshTypes.FACE;
    
    var sm = this._selectmode;
    if (sm!= 2 && sm != 4 && sm != 8) this._selectmode = MeshTypes.VERT;

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
    
    Area.call(this, View3DHandler.name, "3D Viewport", new Context(), [x, y], [width, height]);
    
    this.keymap = new KeyMap()
    this.define_keymap();
    this._id = v3d_id++;
    
    this.editor = new MeshEditor(this);
    this.editors = new GArray([this.editor]);
    
    this.touch_delay = 100;
  }
  
  push_modal(EventHandler e) {
    this.push_touch_delay(20);
    
    prior(View3DHandler, this).push_modal.call(this, e);
  }
  
  pop_modal(EventHandler e) {
    if (this.modalhandler != undefined)
      this.pop_touch_delay();
    
    //paranoid check
    if (this.modalhandler == undefined) {
      this.touch_delay_stack = [];
    }
    
    prior(View3DHandler, this).pop_modal.call(this, e);
  }
  
  get_keymaps() {
    var ret = [this.keymap];
    
    var maps = this.editor.get_keymaps();
    for (var i=0; i<maps.length; i++) {
      ret.push(maps[i]);
    }
    
    return ret;
  }
  
  check_subsurf(Context ctx, ASObject ob) {
    if (!(ob.data instanceof Mesh))
      return;
    
    if (ob.subsurf && ob.ss_mesh)
      return;
    
    if (!ob.subsurf && ob.ss_mesh == null)
      return;
      
    if (ob.subsurf) {
        if (!ob.ss_mesh) {
          ctx.mesh.regen_render();
          
          ob.ss_mesh = gpu_subsurf(this.gl, ob.data, ob.calc_ss_steps());
        }
      } else {
        if (ob.ss_mesh) {
          destroy_subsurf_mesh(this.gl, ob.ss_mesh);
          
          ob.ss_mesh = null;
          ob.data.regen_render();
        }
      }  
  }
  
  //XXX need to implement this still
  get can_select() {
    return this._can_select;
  }
  
  set can_select(int val) {
    this._can_select = !!val;
  }
  
  static fromSTRUCT(Function reader) {
    var v3d = new View3DHandler(g_app_state.gl)
    v3d._in_from_struct = true;
    
    reader(v3d)
    
    v3d.editors = new GArray(v3d.editors);
    v3d.editor = v3d.editors[v3d.editor];
    
    if (v3d.editor == undefined) {
      console.log("WARNING: corrupted View3DHandler sturct data");
      v3d.editor = v3d.editors[0];
    }
    
    v3d.gl = g_app_state.gl;
    v3d._in_from_struct = false;
    
    return v3d;
  }
  
  draw_rect(WebGLRenderingContext gl, Vector3 pos, 
            Vector3 size, Array<float> color) 
  {
    static verts = undefined;
    
    if (verts == undefined) {
      verts = gl.createBuffer();
    }
    
    size = new Vector2(size).div(this.size);
    pos = new Vector2(pos).div(this.size);
    
    var vs = new Float32Array(12);
    
    var d = 0;
    vs[d++] = pos[0];
    vs[d++] = pos[1];
    
    vs[d++] = pos[0];
    vs[d++] = pos[1]+size[1];
    
    vs[d++] = pos[0]+size[0];
    vs[d++] = pos[1]+size[1];
    
    
    vs[d++] = pos[0];
    vs[d++] = pos[1];
    
    vs[d++] = pos[0]+size[0];
    vs[d++] = pos[1]+size[1];

    vs[d++] = pos[0]+size[0];
    vs[d++] = pos[1];
    
    for (var i=0; i<12; i++) {
      vs[i] = (vs[i]-0.5)*2.0;
    }
    gl.enableVertexAttribArray(0);
    gl.disableVertexAttribArray(1);
    gl.disableVertexAttribArray(2);
    gl.disableVertexAttribArray(3);
    gl.disableVertexAttribArray(4);
    
    gl.bindBuffer(gl.ARRAY_BUFFER, verts);
    gl.bufferData(gl.ARRAY_BUFFER, vs, gl.STATIC_DRAW);
    
    gl.useProgram(gl.rect2d.program);
    
    gl.bindBuffer(gl.ARRAY_BUFFER, verts);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    
    gl.uniform4fv(gl.rect2d.uniformloc(gl, "color"), color);
    
    gl.depthFunc(gl.ALWAYS);
    gl.depthMask(0);
    
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    gl.flush();
    gl.depthFunc(gl.LESS);
    gl.depthMask(1);
    
    //ctx.disableVertexAttribArray(0);
  }
  
  get selectmode() {
    return this._selectmode;
  }
  
  set selectmode(Boolean val) {
    this._selectmode = val;
    
    if (!this._in_from_struct)
      this.set_selectmode(val);
  }
  
  data_link(DataBlock block, Function getblock, Function getblock_us) {
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

  on_gl_lost(WebGLRenderingContext new_gl) {
    this.gl = gl;
    this.framebuffer = undefined;
    this.drawlines = new GArray();
    this.line_2d_shader = new ShaderProgram(gl, "2d_line_vshader", "2d_line_fshader", ["vPosition", "vNormal", "vColor"]);
    this.csg_render = undefined;
    
    for (var e in this.editors) {
      e.on_gl_lost(new_gl);
    }
    
    prior(View3DHandler, this).on_gl_lost.call(this, new_gl);
  }
  
  get_framebuffer() : FrameBuffer
  {
    if (this.framebuffer == undefined)
      this.framebuffer = new FrameBuffer(this.gl, this.size);
    
    return this.framebuffer;
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

  new_drawline(Vector3 v1, Vector3 v2) : drawline { //v1 and v2 are optional
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
    
    if (this.drawmats.cameramat_zoom == undefined)
      this.drawmats.cameramat_zoom = new Matrix4();
    
    this.drawmats.cameramat_zoom.makeIdentity();
    this.drawmats.cameramat_zoom.translate(0, 0, this.zoomfac);
    this.drawmats.cameramat_zoom.multiply(this.drawmats.cameramat);
    
    // Construct the model-view * projection matrix and pass it in
    this.drawmats.rendermat.makeIdentity();
    
    this.drawmats.rendermat.multiply(this.drawmats.persmat);
    this.drawmats.rendermat.translate(0, 0, this.zoomfac);
    this.drawmats.rendermat.multiply(this.drawmats.cameramat);
    this.drawmats.rendermat.isPersp = true;
  }

  set_zoom(float zoom) {
    this.zoomwheel = zoom
    this.zoomwheel = Math.max(Math.min(this.zoomwheel, this.zoom_wheelrange[1]), this.zoom_wheelrange[0]);

    this.zoomfac = (this.zoomwheel-this.zoom_wheelrange[0]) / (this.zoom_wheelrange[1]-this.zoom_wheelrange[0]);
    this.zoomfac = this.zoom_range[0] + (this.zoom_range[1] - this.zoom_range[0]) * this.zoomfac;
    
    this.gen_rendermats();
    this.on_view_change();
  }
  
  change_zoom(float delta) {
    this.set_zoom(this.zoomwheel+delta);
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
    pmat.isPersp = true;
    co.multVecMatrix(pmat);
    
    if (this.size == undefined)
      this.size = g_app_state.raster.viewport[1];
    
    co[0] = (co[0]+1.0)*0.5*this.size[0];
    co[1] = (co[1]+1.0)*0.5*this.size[1];
    co[2] = 0.0;
  }
  
  test_render_selbuf(int typemask) {
    var gl = this.gl;
    
    gl.colorMask(true, true, true, true);
    gl.clear(gl.COLOR_BUFFER_BIT 
           | gl.DEPTH_BUFFER_BIT 
           | gl.STENCIL_BUFFER_BIT);
          
    gl.viewport(0, 0, this.size[0], this.size[1]);
    gl.disable(gl.SCISSOR_TEST);
    gl.disable(gl.DITHER);
    gl.enable(gl.DEPTH_TEST);
    gl.disable(gl.BLEND); 
    
    var sce = this.ctx.scene;
    for (var ob in sce.objects) {
      if (ob.sid == -1)
        ob.sid = ibuf_idgen.idgen();
      
      this.sidmap[ob.sid] = new DataRef(ob);
      
      if (ob !== this.ctx.object) {
        this.transmat.push();
        this.transmat.multiply(ob.matrix);
        this.render_selbuf_obj(this.gl, ob, typemask);
        this.transmat.pop();
      }
    }

    this.sidmap[this.ctx.object.sid] = new DataRef(this.ctx.object);
    
    this.transmat.push();
    this.transmat.multiply(this.ctx.object.matrix);
    this.editor.render_selbuf(this.gl, this, typemask);
    this.transmat.pop();
    
    gl.flush();
    gl.finish();
    
    gl.enable(gl.SCISSOR_TEST);
    gl.enable(gl.DITHER);
  }
  
  ensure_selbuf(int typemask) {//typemask is optional, additional type masks to this.select
    var gl = this.gl;
    var fbuf = this.get_framebuffer();
    
    var redo_selbuf = this.redo_selbuf
    redo_selbuf |= fbuf.capture(this.size, this);
    redo_selbuf |= this.editor.selbuf_changed(typemask);
    
    if (redo_selbuf) {
      if (DEBUG.selbuf)
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
      gl.disable(gl.BLEND); 
      
      var sce = this.ctx.scene;
      for (var ob in sce.objects) {
        if (ob.sid == -1)
          ob.sid = ibuf_idgen.idgen();
        
        this.sidmap[ob.sid] = new DataRef(ob);
        
        if (ob !== this.ctx.object) {
          this.transmat.push();
          this.transmat.multiply(ob.matrix);
          this.render_selbuf_obj(this.gl, ob, typemask);
          this.transmat.pop();
        }
      }

      this.sidmap[this.ctx.object.sid] = new DataRef(this.ctx.object);
      
      this.transmat.push();
      this.transmat.multiply(this.ctx.object.matrix);
      this.editor.render_selbuf(this.gl, this, typemask);
      this.transmat.pop();
      
      gl.flush();
      gl.finish();
      
      gl.enable(gl.SCISSOR_TEST);
      gl.enable(gl.DITHER);
      fbuf.unbind()
      
      this.redo_selbuf = false;
      this.editor.reset_selbuf_changed(typemask);
    }
  }

  read_selbuf(Array<float> pos, Array<float> size) : Uint8Array
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

  do_select(MouseEvent event, Array<float> mpos, 
            View3DHandler view3d, Boolean do_multiple=false) 
  {
    return this.editor.do_select(event, mpos, view3d, do_multiple);
  }
  
  do_alt_select(MouseEvent event, Array<float> mpos, View3DHandler view3d) {
    return this.editor.do_alt_select(event, mpos, view3d);
  }
  
  tools_menu(Context ctx, Array<float> mpos) {
    this.editor.tools_menu(ctx, mpos, this);
  }


  toolop_menu(Context ctx, String name, Array<String> ops) {
    if (ops.length > 1 && this.use_radial_menus) {
      return toolop_radial_menu(ctx, name, ops);
    } else {
      return toolop_menu(ctx, name, ops);
    }
  }

  call_menu(Object menu, UIFrame frame, Array<float> pos) {
    if (menu instanceof UIRadialMenu) {
      return ui_call_radial_menu(menu, frame, pos);
    } else if (menu instanceof UIMenu) {
      return ui_call_menu(menu, frame, pos);
    }
  }

  rightclick_menu(MouseEvent event) {
    this.editor.rightclick_menu(event, this);
  }
  
  on_mousedown(MouseEvent event) {
    if (this.bad_event(event))
      return;
    
    if (prior(View3DHandler, this).on_mousedown.call(this, event))
      return;
    
    var selfound = false;
    var is_middle = event.button == 1 || (event.button == 2 && g_app_state.screen.ctrl);
    
    var tottouch = g_app_state.screen.tottouch;
    console.log("tottouch", tottouch);
    
    if (tottouch >= 2) {
      console.log("Touch screen rotate/pan/zoom combo");
      g_app_state.toolstack.exec_tool(new ViewRotateZoomPanOp());
    } else if (is_middle && this.shift) {
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
      selfound = this.do_select(event, this.mpos, this, this.shift|g_app_state.select_multiple); 
    }

    if (event.button == 2 && !g_app_state.screen.shift && !g_app_state.screen.ctrl && !g_app_state.screen.alt) {
      this.rightclick_menu(event);
    }
  }

  on_mouseup(MouseEvent event) {
    if (this.bad_event(event))
      return;
      
    this._mstart = null;
    
    console.log("t", event.touches);
    
    if (prior(View3DHandler, this).on_mouseup.call(this, event))
      return;
  }

  on_mousemove(MyMouseEvent event) {
    //console.log("->", event, event.touches);
    
    //console.log("t", JSON.stringify(event.touches));
    
    var mpos = new Vector3([event.x, event.y, 0])
    this.mpos = mpos;
    
    if (this._mstart != null) {
      var vec = new Vector2(this.mpos);
      vec.sub(this._mstart);
    
      /*handle drag translate*/
      if (vec.vectorLength() > 10) {
        var top = new TranslateOp(EditModes.GEOMETRY);
        
        /*callback to cancel drag translate if 
          multiple touch hotspots show up.
         */
         
        var this2 = this;
        function switch_on_multitouch(TranslateOp op, MouseEvent event, cancel_func) {
          if (g_app_state.screen.tottouch > 1) {
            this2._mstart = null;
            cancel_func();
            g_app_state.toolstack.exec_tool(new ViewRotateZoomPanOp());
          }
        }
        
        top.cancel_callback = switch_on_multitouch;
        g_app_state.toolstack.exec_tool(top);
        this._mstart = null;
        
        return;
      }
    }
    
    if (prior(View3DHandler, this).on_mousemove.call(this, event))
      return;
    
    this.editor.on_mousemove(event);
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
    this.editor.on_tick(this.ctx);
    prior(View3DHandler, this).on_tick.call(this);
  }
  
  destroy() {
    if (this.framebuffer != undefined) {
      this.framebuffer.destroy(this.gl);
      this.framebuffer = undefined;
    }
   
    Area.prototype.destroy.call(this);
  }
  
  ensure_csg(Boolean is_enabled=true) {
    this.draw_csg = is_enabled;
    
    if (is_enabled && !this.csg_render) {
      this.csg_render = new CSGDraw(this, this.ctx.scene);
    } else if (!is_enabled && this.csg_render) {
      this.csg_render.destroy();
      this.csg_render = undefined;
    }
    
    //XXX paranoid check; might not be good enough
    if (this.csg_render) {
      this.csg_render.scene = this.ctx.scene;
    }
  }
  
  update_selbuf() {
    this.redo_selbuf = true;
  }
  
  on_view_change() {
    this.redo_selbuf = true;
  }

  on_draw(WebGLRenderingContext gl, test) {
    this.gl = gl;
    this.editor.shift = this.shift;
    this.editor.alt = this.alt;
    this.editor.ctrl = this.ctrl;
    
    //temporarily override active view3d for draw
    var old_active = g_app_state.active_view3d;
    g_app_state.active_view3d = this;
    
    var ctx = this.ctx = new Context();
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
    
    //update DAG
    this.ctx.scene.update();
    
    var scene = ctx.scene;
    var objects = scene.objects;
    
    for (var ob in objects) {
      if (ob.csg && ob != ctx.object) {
        this.ensure_csg(true);
        continue;
      }
      
      this.transmat.push();
      this.transmat.multiply(ob.matrix);
      
      //draw object
      if (ob == ctx.object) {
        this.editor.draw_object(gl, this, ob, true);
      } else {
        this.draw_object_basic(gl, ob);
      }
      
      this.transmat.pop();
    }
    
    //clean up transformation stack
    this.transmat.reset(cameramat_backup);
    this.drawmats.cameramat.load(cameramat_backup);
    
    if (this.draw_csg) {
      this.csg_render.on_draw(gl, this);
    }
    
    this.draw_lines(gl);
    Area.prototype.on_draw.call(this, gl)
    
    g_app_state.active_view3d = old_active;
  }
  
  undo_redo(RowFrame row) {
    var ctx = this.ctx;
    
    var col = row.col();
    var row2 = col.row();
    
    var undo = new UIButtonIcon(ctx, "Undo", Icons.UNDO);
    undo.hint = "  Hotkey : CTRL-Z"
    undo.callback = function() {
      g_app_state.toolstack.undo();
    }
    
    row2.add(undo);
    var row2 = col.row();
    
    var redo = new UIButtonIcon(ctx, "Redo", Icons.REDO);
    redo.hint = "  Hotkey : CTRL-SHIFT-Z"
    redo.callback = function() {
      g_app_state.toolstack.redo();
    }
    row2.add(redo);
  }
  
  gen_add_menu(Context ctx, UIMenuLabel label) : UIMenu {
    return ctx.view3d.add_menu(false);
  }
  
  add_menu(Boolean add_title=true) : UIMenu {
    return this.editor.add_menu(this, this.mpos, add_title);
  }

  define_keymap() {
    var k = this.keymap;
  
    k.add(new KeyHandler("T", [], "Toggle Select Mode"), new FuncKeyHandler(function(ctx) {
      var mode = ctx.view3d.selectmode;
      
      if (mode == EditModes.VERT)
        mode = EditModes.EDGE;
      else if (mode == EditModes.EDGE)
        mode = EditModes.FACE;
      else if (mode == EditModes.FACE)
        mode = EditModes.OBJECT;
      else if (mode == EditModes.OBJECT)
        mode = EditModes.VERT;
        
      ctx.view3d.set_selectmode(mode);
    }));
  
    k.add(new KeyHandler("K", [], "Debug Test"), new FuncKeyHandler(function (ctx) {
      //test compression
      //console.log("file compression test");
      //g_app_state.load_user_file_new(g_app_state.create_user_file_new({compress : true}));
      /*
      var d = [];
      istruct.write_object(d, g_app_state.toolstack);
      d = Iuppiter.compress(d)
      
      console.log("toolstack serialized: ", d, d.length);
      */
      
      //g_app_state.load_undo_file(g_app_state.create_undo_file());
      //console.log(sort_csg(ctx.scene).toString());
      //test_tutorial_mode();
      //icon_tst_k++;
      if (UNIT_TESTER) {
        console.log("executing unit tests...");
        window.unit_test_env.execute();
      } else {
        //console.log(g_app_state.api.get_prop(ctx, "operator_stack[0].test"));
        //test_dapi_parser();
        test_ui_structs();
        
        /*var tree = build_octree(new Context().mesh);
        
        var dir = new Vector3([1, 1, 2]);
        dir.normalize();
        
        console.log(tree.isect_ray(new Vector3([0, 0, 0]), dir));*/
        /*
        var octree = build_octree(ctx.mesh);
        var view3d = g_app_state.active_view3d;
       
        if (1) {
          var steps = 70;
          var times = [];
          
          for (var i=0; i<steps; i++) {
            var a = time_ms();
            var ret = view3d.editor.findnearestface_octree(view3d.mpos, octree);
            var b = time_ms();
            
            times.push(b-a);
          }
          times.sort();
          console.log(times);
        }
        
        var ret = view3d.editor.findnearestface_octree(view3d.mpos, octree);
        
        ctx.mesh.api.select_none();
        if (ret != undefined) {
          ctx.mesh.faces.select(ret);
        }
        ctx.mesh.regen_colors();
        */
        //test_progress_dialog();
        //g_app_state.toolstack.reexec_stack();
      }
      //new Context().scene.graph.exec();
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
    this.shift = this.editor.shift = event.shiftKey;
    this.alt = this.editor.alt = event.altKey;
    this.ctrl = this.editor.ctrl = event.ctrlKey;
    
    prior(View3DHandler, this)._on_keyup.call(this, event);
  }

  on_resize(Array<int> newsize, Array<int> oldsize)
  {
    for (var c in this.rows) {
      if (c.pos[1] > 70)
        c.pos[1] = this.size[1] - Area.get_barhgt();
        
      c.size[0] = this.size[0];
    }
    
    for (var c in this.cols) {
      c.size[1] = this.size[1]-Area.get_barhgt()*2;
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

  static default_new(Context ctx, ScreenArea scr, WebGLRenderingContext gl, 
                     Array<float> pos, Array<float> size) {
    var ret = new View3DHandler(gl, ctx.mesh, gl.program2, gl.program, 
                               new DrawMats(), pos[0], pos[1], size[0], 
                               size[1], 0.1, 100000);
    return ret;
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

  gen_file_menu(Context ctx, uimenulabel)
  {
    return toolop_menu(ctx, "",    
      [
      "appstate.export_al3_b64()",
      "appstate.export_stl()",
      "sep",
      "appstate.save_as()", 
      "appstate.save()", 
      "appstate.open()",
      "sep",
      "appstate.new()"
      ]);
  }
  
  gen_session_menu(Context ctx, uimenulabel)
  {
    function callback(entry) {
      console.log(entry);
      if (entry.i == 0) {
        console.log("logging out");
        g_app_state.session.logout_simple();
      }
    }
    var menu = new UIMenu("", callback);
    menu.add_item("Log out", "");
    
    return menu;
  }
  
  gen_tools_menu(Context ctx, uimenulabel)
  {
    return toolop_menu(ctx, "", ["mesh.translate()", "mesh.rotate()", "mesh.scale()"]);
  }

  on_area_inactive()
  {
    this.destroy();
    this.editor.on_area_inactive(this);
    
    Area.prototype.on_area_inactive.call(this);
  }
  
  on_area_active()
  {
    if (this.canvas != undefined)
      this.canvas.reset();
    
    for (var e in this.editors) {
      e.canvas = this.canvas;
    }
    
    Area.prototype.on_area_active.call(this);
  }

  build_bottombar() {
    this.editor.build_bottombar(this);
  }

  build_sidebar1() {
    this.ctx = new Context();
    this.editor.build_sidebar1(this);
  }
  
  get note_area() : UIPackFrame {
    return this.topbar;
  }
  
  build_topbar()
  {
    this.ctx = new Context();
    
    var col = new ColumnFrame(this.ctx, undefined, PackFlags.ALIGN_LEFT);
    
    this.topbar = col;
    col.packflag |= PackFlags.IGNORE_LIMIT|PackFlags.NO_AUTO_SPACING;
    
    col.size = [this.size[0], Area.get_barhgt()];
    col.draw_background = true
    col.rcorner = 100.0
    col.pos = [0, this.size[1]-Area.get_barhgt()]
    
    col.label("                      ");
    var iconflag = IsMobile ? PackFlags.USE_LARGE_ICON : PackFlags.USE_SMALL_ICON;
    col.toolop("screen.hint_picker()", iconflag, "?");
    
    var this2 = this;
    function gen_del_menu() {
      return this2.editor.gen_delete_menu();
    }
    
    col.add(new UIMenuLabel(this.ctx, "File", undefined, this.gen_file_menu));
    col.add(new UIMenuLabel(this.ctx, "Session", undefined, this.gen_session_menu));
    col.add(new UIMenuLabel(this.ctx, "Add", undefined, this.gen_add_menu));
    col.add(new UIMenuLabel(this.ctx, "Delete", undefined, gen_del_menu));
    
    //col.add(new UIMenuLabel(this.ctx, "Tools", undefined, this.gen_tools_menu));
    
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

  switch_editor(View3DEditor editortype) {
    if (editortype == undefined) {
      console.log("Undefined passed to switch_editor()");
      return;
    }
    
    var editor = undefined;
    for (var e in this.editors) {
      if (e instanceof editortype) {
        editor = e;
        break;
      }
    }
    
    if (editor == undefined) {
      editor = new editortype(this);
      this.editors.push(editor);
    }
    
    this.editor.on_inactive(this);
    this.editor = editor;
    editor.on_active(this);
    editor.gl = this.gl;
    
    for (var c in list(this.cols)) {
      this.remove(c);
    }
    for (var c in list(this.rows)) {
      this.remove(c);
    }
    
    this.cols = new GArray();
    this.rows = new GArray();
    
    this.build_topbar();
    this.editor.build_bottombar(this);
    this.editor.build_sidebar1(this);
    
    this.do_recalc();
  }
  
  ensure_editor(View3DEditor editortype) {
    if (!(this.editor instanceof editortype))
      this.switch_editor(editortype);
  }
  
  set_selectmode(int mode) {
    this._selectmode = mode;
    
    if (mode & EditModes.GEOMETRY) {
      this.ensure_editor(MeshEditor);
    } else if (mode == EditModes.OBJECT) {
      this.ensure_editor(ObjectEditor);
    } else {
      console.trace();
      console.log("Error: invalid selection mode ", mode, " in view3d.set_selmod()");
    }
    
    this.editor.selectmode = mode;
  }
  
  render_selbuf_obj(WebGLRenderingContext gl, ASObject ob, int typemask) {
    this.check_subsurf(this.ctx, ob);
    var flip = ob == this.ctx.object;
    
    if (flip) {
      //gl.depthFunc(gl.GREATER);
    }
    
    if (ob.data instanceof Mesh) {
      var color = [0, 0, 0, 1];
      var program = ob.subsurf ? gl.ss_flat : gl.flat;
      
      pack_index(ob.sid+1, color, 0);
        
      gl.useProgram(program.program);
      gl.uniform4fv(program.uniformloc(gl, "color"), color);
      
      if (ob.subsurf) {
        subsurf_render(gl, this, ob.ss_mesh, ob.data, 
                      this.drawmats, !this.use_backbuf_sel, false,
                      program);
      } else {
        gl.useProgram(program.program);
        gl.uniform4fv(program.uniformloc(gl, "color"), color);
        render_mesh_object(gl, this, ob.data, this.drawmats, false, program);
      }
    }
    
    if (flip) {
      //gl.depthFunc(gl.LESS);
    }
  }
  
  draw_object_flat(WebGLRenderingContext gl, ASObject object, Array<float> clr) {
    this.gl = gl;
    
    //this.render_selbuf_obj(gl, object, this.selectmode);
    //return
    if (object.data instanceof Mesh) {
      this.check_subsurf(this.ctx, object);
      var drawmode = gl.LINES;
      
      if (object.subsurf) {
        var prog = gl.ss_flat;
        gl.useProgram(prog.program);
        gl.uniform4fv(prog.uniformloc(gl, "color"), clr);
        
        subsurf_render(gl, this, object.ss_mesh, object.data, 
                      this.drawmats, !this.use_backbuf_sel, false,
                      prog, drawmode);
      } else {
        var prog = gl.flat;
        gl.useProgram(prog.program);
        gl.uniform4fv(prog.uniformloc(gl, "color"), clr);
        
        render_mesh_object(gl, this, object.data, this.drawmats, false, prog, drawmode);
        gl.useProgram(gl.program.program);
      }
    }
  }
  
  draw_object_basic(WebGLRenderingContext gl, ASObject object, 
                    int drawmode=gl.TRIANGLES, Boolean is_active=false) 
  {
    this.gl = gl;
    
    //gl.depthFunc(gl.GREATER);
    //gl.enable(gl.BLEND);
    //gl.blendFunc(gl.DST_ALPHA, gl.ONE_MINUS_DST_ALPHA);
    //gl.polygonOffset(1.0, 20);
    //gl.depthFunc(gl.LESS);
    
    //this.render_selbuf_obj(gl, object, this.selectmode);
    //return
    gl.polygonOffset(0.5, 200);
    if (object.data instanceof Mesh) {
      this.check_subsurf(this.ctx, object);
      
      if (object.subsurf) {
        subsurf_render(gl, this, object.ss_mesh, object.data, 
                      this.drawmats, !this.use_backbuf_sel, false,
                      undefined, drawmode);
      } else {
        render_mesh_object(gl, this, object.data, this.drawmats, false, undefined, drawmode);
      }
    }
    
    if (is_active && drawmode != gl.LINES) {
      this.draw_object_flat(gl, object, colors3d.ActiveObject);
    } else if (object.flag & SELECT) {
      this.draw_object_flat(gl, object, colors3d.Selection);
    }
  }
}

View3DHandler.STRUCT = STRUCT.inherit(View3DHandler, Area) + """
    use_backbuf_sel : int;
    drawmats        : DrawMats;
    zoomfac         : float;
    zoomwheel       : float;
    _id             : int;
    selectmode      : int;
    zoom_wheelrange : array(float);
    zoom_range      : array(float);
    editors         : array(abstract(View3DEditor));
    editor          : int | obj.editors.indexOf(obj.editor);
  }
"""

View3DHandler.uiname = "3D Viewport";