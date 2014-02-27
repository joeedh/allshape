"use strict";

var FileFlags = {COMPRESSED_LZJB : 1}

var formacad_file_ext = ".al3";
var g_app_version = 0.02;

function AppSettings() {
  this.unit_scheme = "imperial";
  this.unit = "in";
}
create_prototype(AppSettings);

AppSettings.prototype.toJSON = function() {
  return this;
};

AppSettings.fromJSON = function(obj) {
  var as = new AppSettings();
  as.unit_scheme = obj.unit_scheme;
  as.unit = obj.unit;
  
  return as;
};


function UserSession() {
  this.tokens = {} : ObjectMap;
  this.username = "";
  this.password = "";
  this.is_logged_in = false;
  
  this.settings = new AppSettings();
  
  this.store = function() {
    localStorage.session = JSON.stringify(this);
  }
  
  this.logout_simple = function() {
    this.is_logged_in = false;
    this.tokens = {};
  }
  
  this.validate_session = function() {
    //XXX
    //this.is_logged_in = true;
    //return;
    
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
}

UserSession.fromJSON = function(obj) {
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

//size is screen size
function gen_default_file(size) {
  var g = g_app_state;
  
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

function AppState(screen, mesh, gl) {
  this.screen = screen;
  this.toolstack = new ToolStack(this);
  this.active_view3d = undefined;
  this.api = new DataAPI(this);
  this.filepath = ""
  this.version = g_app_version;
  this.gl = gl;
  this.size = screen != undefined ? screen.size : [512, 512];
  this.raster = new RasterState(gl, screen != undefined ? screen.size : [512, 512]);
  
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
} AppState;
create_prototype(AppState);

AppState.prototype.kill_mesh = function(Mesh m2) {
  m2.do_callbacks(MeshEvents.DESTROY);
  this.jobs.kill_owner_jobs(m2);
  
  if (m2.render != undefined && m2.render != 0) {
    m2.render.destroy();
    m2.regen_render();
  }
}

AppState.prototype.update_context = function() {
  var scene = this.datalib.get_active(DataTypes.SCENE);
  if (scene == undefined) return;
  
  var obj = scene.active;
  if (obj == undefined) return;
  
  this.scene = scene;
  this.object = obj;
  this.mesh = obj.data;
}

AppState.prototype.reset_state = function(screen, mesh) {
  AppState.call(this, screen, mesh, this.gl);
}

//shallow copy
AppState.prototype.copy = function() {
  var as = new AppState(this.screen, this.mesh, this.gl);
  as.datalib = this.datalib;
  as.session = this.session;
  as.toolstack = this.toolstack;
  as.filepath = this.filepath;
  
  return as;
}

AppState.prototype.set_mesh = function(Mesh m2) {
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
AppState.prototype.create_user_file_new = function(different_mesh) : ArrayBuffer {
  var mesh = different_mesh != undefined ? different_mesh : this.mesh;
  
  function bheader(data, type, subtype) {
    pack_static_string(data, type, 4);
    pack_static_string(data, subtype, 4);
  }
  
  var data = [];
  
  //header "magic"
  pack_static_string(data, "ALSH", 4);
  
  //general file flags, e.g. compression
  pack_int(data, 0);
  
  //version
  var major = Math.floor(g_app_version);
  var minor = Math.floor((g_app_version - Math.floor(g_app_version))*100);
  
  pack_int(data, major);
  pack_int(data, minor);
  
  //the schema struct definitions used to save
  //the non-JSON parts of this file.
  var buf = gen_struct_str();
  
  bheader(data, "SDEF", "SDEF") ;
  pack_string(data, buf);
  
  //write screen block
  var data2 = []
  istruct.write_object(data2, this.screen);

  bheader(data, "SCRN", "STRT");
  pack_int(data, data2.length);
  data = data.concat(data2);
  
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
  
  return new DataView(new Uint8Array(data).buffer);
}

AppState.prototype.do_versions = function(datalib, blocks, version)
{
}

AppState.prototype.load_user_file_new = function(DataView data, unpack_ctx uctx) {
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
  //XXX need to write code to handle compressed files
  
  var version_major = unpack_int(data, uctx);
  var version_minor = unpack_int(data, uctx)/100.0;
  
  var version = version_major + version_minor;
  
  var blocks = [];
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
    
    console.log("-------------------------->", this2.size, this2.screen.size);
    
    this2.screen.on_resize(this2.size);
    this2.screen.size = this2.size;
    
    var ctx = new Context();
  }
  
  load_state();
}

AppState.prototype.create_user_file_old = function(Mesh different_mesh) : ArrayBuffer {
  //we save a json part and a binary part
  var obj = {}
  
  var mesh = different_mesh != undefined ? different_mesh : this.mesh;
  
  obj["screen"] = this.screen.toJSON();
  
  var str = JSON.stringify(obj);
  
  var data = []
  pack_string(data, str);
  
  mesh.pack(data);
  pack_float(data, this.version);
  
  data = new Uint8Array(data).buffer;
  
  return new DataView(data);
}

AppState.prototype.load_user_file_old = function(data) : ArrayBuffer {
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

function Context() {
  this.view3d = g_app_state.active_view3d;
  this.font = g_app_state.raster.font
  this.api = g_app_state.api;
  this.screen = g_app_state.screen;
  
  //find active scene, object, and object data, respectively
  var sce = g_app_state.datalib.get_active(DataTypes.SCENE);
  this.scene = sce;
  this.object = undefined;
  this.mesh = undefined;
  
  if (sce != undefined) {
    if (sce.active == undefined && sce.objects.length > 0) {
      console.log("WARNING: sce.objects (a DBList) had an undefined .active");
      console.log("in the prescence of objects.  This should be impossible.");
      console.log("Correcting.");
      
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

Context.prototype.kill_mesh_ctx = function(Mesh m2) {
  this.appstate.kill_mesh(m2);
}

Context.prototype.set_mesh = function(Mesh m2) {
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

function ToolStack(appstate) {
  this.undocur = 0;
  this.undostack = new GArray();
  this.appstate = appstate;
}
create_prototype(ToolStack);

ToolStack.prototype.undo_push = function(ToolOp tool) {
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

ToolStack.prototype.undo = function() {
  if (this.undocur > 0) {
    this.undocur--;
    this.undostack[this.undocur].undo(new Context());
    
    this.appstate.jobs.kill_owner_jobs(this.appstate.mesh);
  }
}

ToolStack.prototype.redo = function() {
  if (this.undocur < this.undostack.length) {
    var tool = this.undostack[this.undocur];
    var ctx = new Context();
    
    tool.is_modal = false;
    
    if (!(tool.undoflag & UndoFlags.IGNORE_UNDO)) {
      tool.undo_pre(ctx);
    }    
    tool.exec(new Context());
    this.undocur++;

    this.appstate.jobs.kill_owner_jobs(this.appstate.mesh);
  }
}

ToolStack.prototype.gen_tool_datastruct = function(ToolOp tool) {
  var datastruct = new DataStruct([]);
  
  var this2 = this;
  function update_dataprop(d) {
    this2.undo();
    this2.redo();
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

ToolStack.prototype.rebuild_last_tool = function(tool) {
  var s
  
  if (tool != undefined)
    s = this.gen_tool_datastruct(tool);
  else
    s = new DataStruct([]);
  
  s.name = "last_tool"
  s = new DataPath(s, "last_tool", "", false, false)
  
  ContextStruct.replace(s);
}

ToolStack.prototype.exec_tool = function(ToolOp tool) {
  if (this.appstate.screen.active instanceof ScreenArea && this.appstate.screen.active.area instanceof View3DHandler)
    this.appstate.active_view3d = this.appstate.screen.active.area;
  
  if (this.appstate.active_view3d == null) {
    for (var s in this.appstate.screen.children) {
      if (s instanceof ScreenArea && s.area instanceof View3DHandler) {
        this.appstate.active_view3d = s;
        break;
      }
    }
  }
  
  var ctx = new Context();
  
  if (tool.can_call(ctx) == false) {
    console.trace()
    console.log("Can not call tool '" + tool.constructor.name + "'");
    console.log(typeof tool);
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
    tool.modal_init(ctx);
    tool._start_modal(ctx);
  } else {
    if (!(tool.undoflag & UndoFlags.IGNORE_UNDO)) {
      tool.undo_pre(ctx);
    }
    tool.exec(ctx);
  }
  
  if (!(tool.undoflag & UndoFlags.IGNORE_UNDO)) { 
    this.rebuild_last_tool(tool);
  }
}

/*Globals*/
var g_app_state = undefined;

/*File management functions*/
