"use strict";

var FileFlags = {COMPRESSED_LZSTRING : 1};

/*Globals*/
var AppState g_app_state = undefined;

class FileData {
  constructor(blocks, fstructs, version) {
    this.blocks = blocks;
    this.fstructs = fstructs;
    this.version = version;
  }
}

class AppSettings {
  constructor() {
    this.unit_scheme = "imperial";
    this.unit = "in";
  }

  toJSON() {
    return this;
  }

  static fromJSON(obj) {
    var as = new AppSettings();
    as.unit_scheme = obj.unit_scheme;
    as.unit = obj.unit;
    
    return as;
  }
}

class UserSession {
  constructor() {
    this.tokens = {} : ObjectMap;
    this.username = "";
    this.password = "";
    this.is_logged_in = false;
    
    this.settings = new AppSettings();
  }
  
  store() {
    localStorage.session = JSON.stringify(this);
  }
  
  logout_simple() {
    this.is_logged_in = false;
    this.tokens = {};
  }
  
  validate_session() {
    var session = this;
    
    var finish = function(job, owner) {
      console.log("session valid");
      return;
    }
    
    function finish2(job, owner) {
      session.tokens = job.value;
      session.is_logged_in = true;
      session.store();
    }
    
    function error2(obj, owner, msg) {
      session.is_logged_in = false;
      session.store();
    }
    
    function error(job, owner, msg) {
      auth_session(session.username, session.password, finish2, error2);
    }
    
    call_api(get_user_info, undefined, finish, error);
  }
  
  static fromJSON(obj) {
    var us = new UserSession;
    us.tokens = obj.tokens;
    us.username = obj.username;
    us.password = obj.password;
    us.is_logged_in = obj.is_logged_in;
    
    if (obj.settings != undefined) {
      us.settings = AppSettings.fromJSON(obj.settings);
    } else {
      us.settings = new AppSettings();
    }
    
    return us;
  }
}

//size is screen size
function gen_default_file(size) {
  var g = g_app_state;
  
  if (localStorage.startup_file) {
    try {
      var buf = localStorage.startup_file
      buf = new DataView(b64decode(buf).buffer);
      //buf = new DataView(new Uint8Array(JSON.parse(buf)).buffer);
      
      g.load_user_file_new(buf, new unpack_ctx());
      return;
    } catch (err) {
      print_stack(err);
      console.log("ERROR: Could not load user-defined startup file.");
    }
  }
  if (size == undefined)
    var size = [512, 512];
  
  //reset app state, calling without args
  //will leave .screen and .mesh undefined
  g.reset_state();
  
  //drawmats
  var mesh = makeBoxMesh(undefined);
  g.mesh = mesh;
  
  //make scene
  var scene = new Scene();
  scene.set_fake_user();
  
  g.datalib.add(scene);
  
  //object
  var object = new ASObject();
  scene.add(object);
  
  //mesh
  object.data = mesh;
  mesh.gen_render_struct();
  mesh.regen_render();
  
  g.datalib.add(object);
  g.datalib.add(mesh);

  //set up screen UI
  var mvMatrix = new Matrix4();
  mvMatrix.rotate(Math.PI/2.0, new Vector3([1, 0, 0]));
  var drawmats = new DrawMats(new Matrix4(), mvMatrix, new Matrix4());
  
  //a 3d viewport
  var view3d = new View3DHandler(gl, mesh, gl.program, gl.program2,
                     drawmats, 0, 0, size[0], size[1], 0.1, 1000.0);
  
  g.view3d = g.active_view3d = view3d;
  g.view3d.gen_persmat()
  g.view3d.gen_rendermats();
  //g.view3d.set_canvasbox();

  //now create screen
  gen_screen(gl, view3d, size[0], size[1]);
    
  g.set_mesh(mesh);
  view3d.ctx = new Context();
}

class AppState {
  constructor(FrameManager screen, Mesh mesh, WebGLRenderingContext gl) {
    this.screen = screen;
    this.eventhandler = screen : EventHandler;
    
    this.toolstack = new ToolStack(this);
    this.active_view3d = undefined;
    this.api = new DataAPI(this);
    this.filepath = ""
    this.version = g_app_version;
    this.gl = gl;
    this.size = screen != undefined ? screen.size : [512, 512];
    this.raster = new RasterState(gl, screen != undefined ? screen.size : [512, 512]);
    
    static toolop_input_cache = {};
    this.toolop_input_cache = toolop_input_cache;
    
    this.datalib = new DataLib();
    
    this.jobs = new JobManager();
    
    if (localStorage.session != undefined) {
      this.session = UserSession.fromJSON(JSON.parse(localStorage.session));  
    } else {
      this.session = new UserSession();
    }
    
    if (mesh == undefined) {
      this.mesh = makeBoxMesh(gl); 
      //this.mesh = mesh = makeCircleMesh(gl, 1.0, 10);
      this.mesh.api.recalc_normals();
      mesh = this.mesh;
    }
    
    
    if (0) { //localStorage.mesh_bytes != undefined && localStorage.mesh_bytes != "undefined") {//hasOwnProperty("mesh_bytes") {
      var ren = this.mesh.render;
      
      this.mesh = mesh = new Mesh()
      
      var arr = eval("["+localStorage.mesh_bytes+"]")

      this.mesh.unpack(new DataView(new Uint8Array(arr).buffer), new unpack_ctx());
      this.mesh.render = ren;
      this.mesh.regen_render();
    }
    
    this.mesh = mesh;  
  }

  kill_mesh(Mesh m2) {
    m2.do_callbacks(MeshEvents.DESTROY);
    this.jobs.kill_owner_jobs(m2);
    
    if (m2.render != undefined && m2.render != 0) {
      m2.render.destroy();
      m2.regen_render();
    }
  }

  update_context() {
    var scene = this.datalib.get_active(DataTypes.SCENE);
    if (scene == undefined) return;
    
    var obj = scene.active;
    if (obj == undefined) return;
    
    this.scene = scene;
    this.object = obj;
    this.mesh = obj.data;
  }

  reset_state(screen, mesh) {
    AppState.call(this, screen, mesh, this.gl);
  }

  //shallow copy
  copy() {
    var as = new AppState(this.screen, this.mesh, this.gl);
    as.datalib = this.datalib;
    as.session = this.session;
    as.toolstack = this.toolstack;
    as.filepath = this.filepath;
    
    return as;
  }

  set_mesh(Mesh m2) {
    if (this.mesh != m2)
      this.kill_mesh(this.mesh);
    
    this.mesh = m2;
    
    for (var c in this.screen.children) {
      if (c instanceof ScreenArea) {
        if (View3DHandler.name in c.editors)
          c.editors[View3DHandler.name].mesh = m2;
      }
    }
  }

  set_startup_file() {
    var buf = this.create_user_file_new(true, false);
    buf = new Uint8Array(buf.buffer);
    
    /*var ar = [];
    for (var i=0; i<buf.length; i++) {
      ar.push(buf[i]);
    }
    buf = JSON.stringify(ar);*/
    
    buf = b64encode(buf);
    
    localStorage.startup_file = buf;
  }

  create_undo_file() {
    var buf = this.create_user_file_new(true, false, false);
    
    return buf;
  }
  
  load_undo_file(undofile) {
    var screen = this.screen;
    var toolstack = this.toolstack;
    
    console.log(undofile);
    
    var datalib = new DataLib();
    this.datalib = datalib;
    var filedata = this.load_blocks(undofile);
    
    this.link_blocks(datalib, filedata);
    
    //this.load_user_file_new(undofile);
    this.screen = screen;
    this.eventhandler = screen;
    
    this.toolstack = toolstack;
    
    this.screen.ctx = new Context();
  }
  
  /*
    new file format:
    ALSH          | 4 chars
    file flags    | int (e.g. whether compression was used)
    version major | int
    version minor | int
    
    block {
      type    | 4 chars 
      subtype | 4 chars [STRT (Struct), JSON, SDEF (struct definition[s])]
      datalen | int
    }
    
    BLCK blocks correspond to DataBlocks, and are defined like so:
    
    BLCK         | 4 chars
    STRT         | 4 chars
    data_length  | int
    blocktype    | int
    data (of length data_length-4)
    
  */
  create_user_file_new(gen_dataview=true, compress=false, save_screen=true) : ArrayBuffer {
    var mesh = this.mesh;
    
    function bheader(data, type, subtype) {
      pack_static_string(data, type, 4);
      pack_static_string(data, subtype, 4);
    }
    
    var data = [];
    
    //header "magic"
    pack_static_string(data, "ALSH", 4);
    
    //general file flags, e.g. compression
    var flag = compress ? FileFlags.COMPRESSED_LZSTRING : 0;
    pack_int(data, flag);
    
    //version
    var major = Math.floor(g_app_version);
    var minor = Math.floor((g_app_version - Math.floor(g_app_version))*1000);
    
    pack_int(data, major);
    pack_int(data, minor);
    
    var headerdata = data;
    if (compress) {
      data = [];
    }
    
    //the schema struct definitions used to save
    //the non-JSON parts of this file.
    var buf = gen_struct_str();
    
    bheader(data, "SDEF", "SDEF") ;
    pack_string(data, buf);
    
    if (save_screen) {
      //write screen block
      var data2 = []
      istruct.write_object(data2, this.screen);

      bheader(data, "SCRN", "STRT");
      pack_int(data, data2.length);
      data = data.concat(data2);
    }
    
    var data2 = [];
    for (var lib in this.datalib.datalists.values()) {
      for (var block in lib) {
        data2 = [];

        istruct.write_object(data2, block);
        
        bheader(data, "BLCK", "STRT");
        pack_int(data, data2.length+4);
        pack_int(data, block.lib_type);
        
        data = data.concat(data2);
      }   
    }
    
    if (compress) {
      data = LZString.compress(new Uint8Array(data));
      
      var d = new Uint16Array(data.length);
      for (var i=0; i<data.length; i++) {
        d[i] = data.charCodeAt(i);
      }
      
      d = new Uint8Array(d.buffer);
      console.log("-----1------>", d.length);
      
      data = new Uint8Array(d.length + headerdata.length)
      for (var i=0; i<headerdata.length; i++) {
        data[i] = headerdata[i];
      }
      for (var i=0; i<d.length; i++) {
        data[i+headerdata.length] = d[i];
      }
      
      if (gen_dataview)
        return new DataView(data.buffer);
      else
        return data;
    } else {
      if (gen_dataview)
        return new DataView(new Uint8Array(data).buffer);
      else
        return data;
    }
  }

  //version patching happens *before* block linking
  do_versions(datalib, blocks, version)
  {
    if (version <= 0.02) {
      //subsurf flag moved from view3d.editor to object
      console.log("---doing version 0.02->0.03 changes---");
      for (var b in blocks) {
        if (b.type != "SCRN") continue;
        
        var screen = b.data;
        for (var scr in screen.areas) {
          console.log("-------->", scr);
          if (!(scr.area instanceof View3DHandler)) continue;
          console.log(scr.area.use_subsurf);
          if (!scr.area.use_subsurf && !scr.area.editor.use_subsurf) continue;
          
          if (scr.area.use_subsurf)
            delete scr.area.use_subsurf;
          if (scr.area.editor.use_subsurf)
            delete scr.area.editor.use_subsurf;
           
          var sce = datalib.get_active(DataTypes.SCENE);
          var ob = sce.objects.active;
          
          if (ob == undefined && sce.objects.length > 0) {
            ob = sce.objects[0];
          }
          
          ob = datalib.get(ob[0]);
          ob.subsurf = true;
        }
      }
    }
    
    if (version <= 0.03) {
      //rebuild scene graph from scratch
      for (var sce in datalib.scenes) {
        sce.graph = undefined;
      }
    }
    
    console.log("VERSION FILE LOAD", version);
    if (version < 0.041) {
      for (var sce in datalib.scenes) {
        //rebuild scene graph. . .
        sce.graph = undefined;
      }
    }
  }

  load_user_file_new(DataView data, unpack_ctx uctx, use_existing_screen=false) {
    if (uctx == undefined) {
      uctx = new unpack_ctx();
    }
    
    var s = unpack_static_string(data, uctx, 4);
    if (s != "ALSH") {
      console.log(s, s.length);
      console.log(data);
      throw new Error("Could not load file.");
    }
    
    var file_flag = unpack_int(data, uctx);
    
    var version_major = unpack_int(data, uctx);
    var version_minor = unpack_int(data, uctx)/1000.0;
    
    var version = version_major + version_minor;
    
    if (file_flag & FileFlags.COMPRESSED_LZSTRING) {
      console.log("decompressing. . .");
      
      data = new Uint16Array(data.buffer.slice(uctx.i, data.byteLength));
      var s = ""
      for (var i=0; i<data.length; i++) {
        s += String.fromCharCode(data[i]);
      }
      data = LZString.decompress(s)
      
      var data2 = new Uint8Array(data.length);
      console.log("uncompressed length: ", data.length);
      
      for (var i=0; i<data.length; i++) {
        data2[i] = data.charCodeAt(i);
      }
      
      data = new DataView(data2.buffer);
      uctx.i = 0;
    }
    
    var blocks = new GArray();
    var fstructs = new STRUCT();
    var datalib = new DataLib();
    
    var tmap = get_data_typemap();
    
    while (uctx.i < data.byteLength) {
      var type = unpack_static_string(data, uctx, 4);
      var subtype = unpack_static_string(data, uctx, 4);
      var len = unpack_int(data, uctx);
      var bdata;
      
      if (subtype == "JSON") {
        bdata = unpack_static_string(data, uctx, len);
      } else if (subtype == "STRT") {
        if (type == "BLCK") {
          var dtype = unpack_int(data, uctx);
          bdata = unpack_bytes(data, uctx, len-4);
          bdata = [dtype, bdata];
        } else {
          bdata = unpack_bytes(data, uctx, len);        
        }
      } else if (subtype == "SDEF") {
        bdata = unpack_static_string(data, uctx, len).trim();
        fstructs.parse_structs(bdata);
      } else {
        console.log(subtype, type, uctx.i, data.byteLength);
        console.trace();
        throw new Error("Unknown block type '" + subtype + "', " + JSON.stringify({subtype: subtype, type : type}));
      }
      
      blocks.push({type : type, subtype : subtype, len : len, data : bdata});
    }
    
    for (var i=0; i<blocks.length; i++) {
      var b = blocks[i];
      
      if (b.subtype == "JSON") {
        b.data = JSON.parse(b.data);
      } else if (b.subtype == "STRT") { //struct data should only be lib blocks
        if (b.type == "BLCK") {
          var lt = tmap[b.data[0]];
          
          lt = lt != undefined ? lt.name : lt;
          
          b.data = fstructs.read_object(b.data[1], tmap[b.data[0]]);
          b.data.lib_refs = 0; //reading code will re-calculate ref count
          
          datalib.add(b.data, false);
        } else {
          if (b.type == "SCRN") {
            b.data = fstructs.read_object(b.data, Screen);
          }
        }
      }
    }
    
    var ascopy = this.copy();
    
    this.datalib = datalib;
    
    //ensure we get an error if the unpacking code/
    //tries to access g_app_state.active_view3d.
    this.active_view3d = undefined;
    
    var getblock = wrap_getblock(datalib);
    var getblock_us = wrap_getblock_us(datalib);  
    var screen = undefined;
    
    this.mesh = undefined;
    this.object = undefined;
    this.scene = undefined;
    
    var this2 = this;
    function load_state() {
      //handle version changes
      this2.do_versions(datalib, blocks, version);
      
      for (var i=0; i<blocks.length; i++) {
        var block = blocks[i];
        
        if (block.subtype == "STRT" && block.type != "SCRN") {
          block.data.data_link(block.data, getblock, getblock_us);
        }
      }
      
      for (var i=0; i<blocks.length; i++) {
        var block = blocks[i];
        
        if (block.type == "SCRN") {
          screen = block.data;
        }
      }
      
      if (screen == undefined) {
        //generate default UI layout
        var size =  new Vector2(this2.size);
        gen_default_file(this2.size);
        this2.size = size;
        this2.datalib = datalib;
        screen = this2.screen;
      } else {
        var size =  new Vector2(this2.size);
        this2.reset_state(screen, undefined);
        this2.size = size;
        this2.datalib = datalib;
      }
      
      //stupid. . .
      for (var sa in screen.areas) {
        //need to get rid of appstate.active_view3d
        if (sa.area instanceof View3DHandler) {
          this2.active_view3d = sa.area;
          break;
        }
      }
      
      var ctx = new Context();
      this2.mesh = ctx.mesh;
      
      if (screen != undefined) {
        screen.view3d = this2.active_view3d;
        screen.data_link(screen, getblock, getblock_us);
      }
      
      //load data into appstate
      this2.datalib = datalib;
      if (this2.screen.canvas == undefined) {
        this2.screen.canvas = new UICanvas(this2.active_view3d, [new Vector2(this2.screen.pos), new Vector2(this2.screen.size)])
      }
      
      this2.eventhandler = this2.screen;
      this2.screen.on_resize(this2.size);
      this2.screen.size = this2.size;
      
      var ctx = new Context();
    }
    
    load_state();
  }

  load_blocks(DataView data, unpack_ctx uctx) {
    if (uctx == undefined) {
      uctx = new unpack_ctx();
    }
    
    var s = unpack_static_string(data, uctx, 4);
    if (s != "ALSH") {
      console.log(s, s.length);
      console.log(data);
      throw new Error("Could not load file.");
    }
    
    var file_flag = unpack_int(data, uctx);
    
    var version_major = unpack_int(data, uctx);
    var version_minor = unpack_int(data, uctx)/1000.0;
    
    var version = version_major + version_minor;
    
    if (file_flag & FileFlags.COMPRESSED_LZSTRING) {
      console.log("decompressing. . .");
      
      data = new Uint16Array(data.buffer.slice(uctx.i, data.byteLength));
      var s = ""
      for (var i=0; i<data.length; i++) {
        s += String.fromCharCode(data[i]);
      }
      data = LZString.decompress(s)
      
      var data2 = new Uint8Array(data.length);
      console.log("uncompressed length: ", data.length);
      
      for (var i=0; i<data.length; i++) {
        data2[i] = data.charCodeAt(i);
      }
      
      data = new DataView(data2.buffer);
      uctx.i = 0;
    }
    
    var blocks = new GArray();
    var fstructs = new STRUCT();
    
    var tmap = get_data_typemap();
    
    while (uctx.i < data.byteLength) {
      var type = unpack_static_string(data, uctx, 4);
      var subtype = unpack_static_string(data, uctx, 4);
      var len = unpack_int(data, uctx);
      var bdata;
      
      if (subtype == "JSON") {
        bdata = unpack_static_string(data, uctx, len);
      } else if (subtype == "STRT") {
        if (type == "BLCK") {
          var dtype = unpack_int(data, uctx);
          bdata = unpack_bytes(data, uctx, len-4);
          bdata = [dtype, bdata];
        } else {
          bdata = unpack_bytes(data, uctx, len);        
        }
      } else if (subtype == "SDEF") {
        bdata = unpack_static_string(data, uctx, len).trim();
        fstructs.parse_structs(bdata);
      } else {
        console.log(subtype, type, uctx.i, data.byteLength);
        console.trace();
        throw new Error("Unknown block type '" + subtype + "', " + JSON.stringify({subtype: subtype, type : type}));
      }
      
      blocks.push({type : type, subtype : subtype, len : len, data : bdata});
    }
    
    return new FileData(blocks, fstructs, version);
  }
  
  link_blocks(DataLib datalib, FileData filedata) {
    var blocks = filedata.blocks;
    var fstructs = filedata.fstructs;
    var version = filedata.version;
    
    var tmap = get_data_typemap();
    
    for (var i=0; i<blocks.length; i++) {
      var b = blocks[i];
      
      if (b.subtype == "JSON") {
        b.data = JSON.parse(b.data);
      } else if (b.subtype == "STRT") { //struct data should only be lib blocks
        if (b.type == "BLCK") {
          var lt = tmap[b.data[0]];
          
          lt = lt != undefined ? lt.name : lt;
          
          b.data = fstructs.read_object(b.data[1], tmap[b.data[0]]);
          
          datalib.add(b.data, false);
        } else {
          if (b.type == "SCRN") {
            b.data = fstructs.read_object(b.data, Screen);
          }
        }
      }
    }
    
    //ensure we get an error if the unpacking code/
    //tries to access g_app_state.active_view3d.
    this.active_view3d = undefined;
    
    var getblock = wrap_getblock(datalib);
    var getblock_us = wrap_getblock_us(datalib);  
    var screen = undefined;
    
    this.mesh = undefined;
    this.object = undefined;
    this.scene = undefined;
    
    //handle version changes
    this.do_versions(datalib, blocks, version);
    
    for (var i=0; i<blocks.length; i++) {
      var block = blocks[i];
      
      if (block.subtype == "STRT" && block.type != "SCRN") {
        block.data.data_link(block.data, getblock, getblock_us);
      }
    }
    
    for (var i=0; i<blocks.length; i++) {
      var block = blocks[i];
      
      if (block.type == "SCRN") {
        screen = block.data;
      }
    }
    
    if (screen != undefined) {
      this.active_view3d = undefined;
      
      for (var sa in screen.areas) {
        //need to get rid of appstate.active_view3d
        if (sa.area instanceof View3DHandler) {
          this.active_view3d = sa.area;
          break;
        }
      }
    }
    
    var ctx = new Context();
    this.mesh = ctx.mesh;
    
    if (screen != undefined) {
      screen.view3d = this.active_view3d;
      screen.data_link(screen, getblock, getblock_us);
    }
    
    if (screen != undefined) {
      if (screen.canvas == undefined) {
        screen.canvas = new UICanvas(this.active_view3d, [new Vector2(screen.pos), new Vector2(screen.size)])
      }
      
      screen.on_resize(this.size);
      screen.size = this.size;
    }
  }

  load_user_file_old(data) : ArrayBuffer {
    //we save a json part and a binary part
    
    var uctx = new unpack_ctx();
    var json = unpack_string(data, uctx);
    
    var mesh = new Mesh()
    mesh.unpack(data, uctx);
    
    try {
      var file_version = unpack_float(data, uctx);
    } catch (_error) {
    }
    
    this.set_mesh(mesh);
    
    var obj = JSON.parse(json);
    var backup = JSON.stringify(this.screen);
    
    //try {
      load_screen(this.screen, obj.screen);
    /*} catch (_error) {
      console.log("YEEK! Error loading screen UI data!");
      this.screen.children = new GArray();
      this.screen.active = null;
      this.screen.modalhandler = null;
      load_screen(this.screen, JSON.parse(backup));
    }*/
  }
}

//restricted context for tools
class ToolContext {
  constructor(scene=undefined, ob=undefined, mesh=undefined) {
    if (scene == undefined)
      scene = new Context().scene;
    if (ob == undefined)
      ob = new Context().object;
    if (mesh==undefined)
      mesh = new Context().mesh;
      
    this.scene = scene;
    this.object = ob;
    this.mesh = mesh;
    this.datalib = g_app_state.datalib;
  }
}

class SavedContext {
  constructor(ctx=undefined) {
    if (ctx != undefined) {
      this.scene = ctx.scene ? new DataRef(ctx.scene) : undefined;
      this.object = ctx.object ? new DataRef(ctx.object) : undefined;
      this.mesh = ctx.mesh ? new DataRef(ctx.mesh) : undefined;
    } else {
      this.scene = undefined; this.object = undefined; this.mesh = undefined;
    }
  }
  
  static fromSTRUCT(reader) {
    var sctx = new SavedContext();
    reader(sctx);
    
    return sctx;
  }
}

SavedContext.STRUCT = """
  SavedContext {
    scene : dataref(DataBlock);
    object : dataref(DataBlock);
    mesh : dataref(DataBlock);
  }
"""


/*
  need to split context into two structs: a serializable ToolContext,
  and a UI/View3D Context.
*/
class Context {
  constructor() {
    this.font = g_app_state.raster.font;
    this.appstate = g_app_state;
    this.keymap_mpos = [0, 0];
    this.api = g_app_state.api;
  }
  
  get scene() {
    return this.datalib.get_active(DataTypes.SCENE);
  }
  
  get object() {
    var sce = this.scene;
    
    if (sce == undefined) return undefined;
    
    if (sce.objects.active == undefined && sce.objects.length > 0) {
      console.trace();
      console.log("Warning: corrupted selection/active state in scene.objects");
      sce.objects.set_active(sce.objects[0]);
    }
    
    return sce.objects.active;
  }
  
  get view3d() {
    return g_app_state.active_view3d;
  }
  
  get screen() {
    return g_app_state.screen;
  }
  
  get mesh() {
    var ob = this.object;
    if (ob != undefined && ob.data instanceof Mesh)
      return ob.data;
    return undefined;
  }
  
  get datalib() {
    return g_app_state.datalib;
  }
  
  get toolstack() {
    return g_app_state.toolstack;
  }


  kill_mesh_ctx(Mesh m2) {
    this.appstate.kill_mesh(m2);
  }

  //this function must die
  set_mesh(Mesh m2) {
    if (this.mesh != undefined)
      var render = this.mesh.render;
    else 
      var render = undefined;
      
    if (this.mesh != m2)
      this.appstate.kill_mesh(this.mesh);
    else
      return
      
    this.mesh.load(m2);
    
    if (render != undefined)
      this.mesh.render = render;
    
    this.mesh.regen_render();
  }
}
/*
function Context() {
  this.view3d = g_app_state.active_view3d;
  this.font = g_app_state.raster.font
  this.api = g_app_state.api;
  this.screen = g_app_state.screen;
  this.datalib = g_app_state.datalib;
  
  //find active scene, object, and object data, respectively
  var sce = g_app_state.datalib.get_active(DataTypes.SCENE);
  this.scene = sce;
  this.object = undefined;
  this.mesh = undefined;
  
  if (sce != undefined) {
    if (sce.active == undefined && sce.objects.length > 0) {
      if (DEBUG.datalib) {
        console.log("WARNING: sce.objects (a DBList) had an undefined .active");
        console.log("in the prescence of objects.  This should be impossible.");
        console.log("Correcting.");
      }
      
      sce.active = sce.objects[0];
    }
    
    if (sce.active != undefined) {
      this.object = sce.active;
      if (sce.active.data instanceof Mesh)
        this.mesh = sce.active.data;
    }
  }
  
  this.appstate = g_app_state;
  this.toolstack = g_app_state.toolstack;
  this.keymap_mpos = [0, 0]; //mouse position at time of keymap event firing
}
create_prototype(Context);
*/

class ToolStack {
  constructor(appstate) {
    this.undocur = 0;
    this.undostack = new GArray();
    this.appstate = appstate;
    this.valcache = appstate.toolop_input_cache;
  }
  
  default_inputs(Context ctx, ToolOp tool) {
    var cache = this.valcache;
    
    //input_prop will be necassary for type checking
    //in the future
    function get_default(String key, Object defaultval, ToolProperty input_prop) {
      key = tool.constructor.name + ":" + key;
      
      if (key in cache)
        return cache[key];
      
      cache[key] = defaultval;
      
      return defaultval;
    }
    
    /*set .ctx on tool properties*/
    var tctx = new ToolContext();
    for (var k in tool.inputs) {
      tool.inputs[k].ctx = tctx;
    }
    for (var k in tool.outputs) {
      tool.outputs[k].ctx = tctx;
    }
    
    tool.default_inputs(ctx, get_default);
  }
  
  undo_push(ToolOp tool) {
    if (this.undocur != this.undostack.length) {
      if (this.undocur == 0) {
        this.undostack = new GArray();
      } else {
        this.undostack = this.undostack.slice(0, this.undocur);
      }
    }
    
    this.undostack.push(tool);
    this.undocur++;
  }

  undo() {
    if (this.undocur > 0) {
      this.appstate.jobs.kill_owner_jobs(this.appstate.mesh);
      
      this.undocur--;
      this.undostack[this.undocur].undo(new Context());
    }
  }

  redo() {
    if (this.undocur < this.undostack.length) {
      var tool = this.undostack[this.undocur];
      var ctx = new Context();
      
      tool.is_modal = false;
      
      if (!(tool.undoflag & UndoFlags.IGNORE_UNDO)) {
        tool.undo_pre(ctx);
      }
      var tctx = new ToolContext();
      
      tool.exec_pre(tctx);
      tool.exec(tctx);
      
      this.undocur++;
      this.appstate.jobs.kill_owner_jobs(this.appstate.mesh);
    }
  }

  gen_tool_datastruct(ToolOp tool) {
    var datastruct = new DataStruct([]);
    
    var this2 = this;
    function update_dataprop(d) {
      this2.undo();
      this2.redo();
      var tool = this2.undostack[this2.undocur-1]; //XXX this MUST be correct
      tool.saved_context = new SavedContext(new Context());
    }
    
    var prop = new StringProperty(tool.uiname, tool.uiname, tool.uiname, "Tool Name");
    var dataprop = new DataPath(prop, "tool", "tool_name", true, false);
    dataprop.update = function() { }
    
    prop.flag = TPropFlags.LABEL;
    
    if (!(tool.flag & ToolFlags.HIDE_TITLE_IN_LAST_BUTTONS)) {
      datastruct.add(dataprop);
    }
    
    for (var k in tool.inputs) {
      prop = tool.inputs[k];
      
      if (prop.flag & TPropFlags.PRIVATE) continue;
      
      dataprop = new DataPath(prop, prop.apiname, "", true, false);
      dataprop.update = update_dataprop;
      
      datastruct.add(dataprop);
    }
    
    return datastruct;
  }

  rebuild_last_tool(tool) {
    var s
    
    if (tool != undefined)
      s = this.gen_tool_datastruct(tool);
    else
      s = new DataStruct([]);
    
    s.flag |= DataFlags.RECALC_CACHE;
    s.name = "last_tool"
    
    s = new DataPath(s, "last_tool", "", false, false)
    s.flag |= DataFlags.RECALC_CACHE;
    
    ContextStruct.replace(s);
  }

  exec_tool(ToolOp tool) {
    if (this.appstate.screen.active instanceof ScreenArea && this.appstate.screen.active.area instanceof View3DHandler)
      this.appstate.active_view3d = this.appstate.screen.active.area;
    
    if (this.appstate.active_view3d == undefined) {
      for (var s in this.appstate.screen.children) {
        if (s instanceof ScreenArea && s.area instanceof View3DHandler) {
          this.appstate.active_view3d = s.area;
          break;
        }
      }
    }
    
    var ctx = new Context();
    
    if (tool.can_call(ctx) == false) {
      if (DEBUG.toolstack) {
        console.trace()
        console.log(typeof tool);
      }
      
      console.log("Can not call tool '" + tool.constructor.name + "'");
      return;
    }
    
    if (!(tool.undoflag & UndoFlags.IGNORE_UNDO))
      this.undo_push(tool);
    
    for (var k in tool.inputs) {
      var p = tool.inputs[k];
      
      p.ctx = ctx;
      
      if (p.user_set_data != undefined)
        p.user_set_data.call(p);
    }
    
    if (tool.is_modal) {
      if (!(tool.undoflag & UndoFlags.IGNORE_UNDO)) {
        tool.undo_pre(ctx);
      }
      
      tool.modal_ctx = ctx;
      tool.modal_tctx = new ToolContext();
      
      tool.exec_pre(tool.modal_tctx);
      tool.modal_init(ctx);
      tool._start_modal(ctx);
    } else {
      var tctx = new ToolContext();
      tool.saved_context = new SavedContext(ctx);
      
      if (!(tool.undoflag & UndoFlags.IGNORE_UNDO)) {
        //undo callbacks, unlike .exec, get full context structure
        tool.undo_pre(ctx);
      }
      
      tool.exec_pre(tctx);
      tool.exec(tctx);
    }
    
    if (!(tool.undoflag & UndoFlags.IGNORE_UNDO)) { 
      this.rebuild_last_tool(tool);
    }
  }
  
  static fromSTRUCT(reader) {
    var ts = new ToolStack(g_app_state);
    reader(ts);
    
    ts.undostack = new GArray(ts.undostack);
    
    return ts;
  }
}

ToolStack.STRUCT = """
  ToolStack {
    undostack : array(ToolOp) | obj.undostack.slice(0, obj.undocur);
  }
"""
