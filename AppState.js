"use strict";

var formacad_file_ext = ".fc3";
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
  
  object.type = ObTypes.MESH;
  //mesh
  object.data = mesh;
  
  g.datalib.add(object);
  g.datalib.add(object.data);

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
  view3d.ctx = new Context(view3d);
}

function AppState(screen, mesh) {
  this.screen = screen;
  this.toolstack = new ToolStack(this);
  this.active_view3d = undefined;
  this.api = new DataAPI(this);
  this.filepath = ""
  this.version = g_app_version;
  
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
  m2.render.destroy();
}

AppState.prototype.update_context = function() {
  var scene = this.datalib.get_active(DataTypes.SCENE);
  if (scene == undefined) return;
  
  var obj = scene.active;
  if (obj == undefined) return;
  
  if (obj.type == ObTypes.MESH)
    this.set_mesh(obj.data)
  else
    this.set_mesh(undefined);
}

AppState.prototype.reset_state = function(screen, mesh) {
  AppState.call(this, screen, mesh);
}

AppState.prototype.set_mesh = function(Mesh m2) {
  if (this.mesh != m2)
    this.kill_mesh(this.mesh);
  
  this.mesh = m2;
  
  for (var c in this.screen.children) {
    if (c instanceof ScreenArea) {
      if (View3DHandler.name in c.screens)
        c.screens[View3DHandler.name].mesh = m2;
    }
  }
}

AppState.prototype.create_user_file_new = function(different_mesh) : ArrayBuffer {
  var mesh = different_mesh != undefined ? different_mesh : this.mesh;
  
  var data = [];
  
  //header "magic"
  pack_static_string(data, "ALSH", 4);
  
  //version
  var major = Math.floor(g_app_version);
  var minor = g_app_version - Math.floor(g_app_version);
  
  pack_int(major);
  pack_int(minor);
  
  //the schema struct definitions used to save
  //the non-JSON parts of this file.
  pack_static_string(data, "STRT", 4);
  var buf = gen_struct_str();
  pack_string(data, buf);
  
  var jsonpart = JSON.stringify(this.screen.toJSON());
  
  pack_static_string(data, "JSON", 4);
  pack_static_string(data, "SCRN", 4);
  pack_string(data, jsonpart);
  
  var data2 = [];
  for (var lib in this.datalists.values()) {
    for (var block in lib) {
      data2.length = 0;      
      istruct.write_object(data2, block);
      
      pack_static_string(data, "BLCK", 4);
      pack_int(block.lib_type);
      pack_int(data2.length);
      
      data.concat(data2);
    }   
  }
}

AppState.prototype.create_user_file = function(different_mesh) : ArrayBuffer {
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

var _filemagic = ["A".charCodeAt(0), "L".charCodeAt(0), "S".charCodeAt(0), "A".charCodeAt(0)]
AppState.prototype.create_user_file_new = function() {
  var obj = {};
  
  var bjson = new BJSON();
  
  var data = [];

  obj.lib = this.lib;
  obj.screen = this.screen;
  obj.owner = this.session.username;
  
  data = bjson.binify(obj);
  
  var data2 = new Array(8+schemas.length);
  
  pack_int(data2, _filemagic);
  pack_int(data2, schemas.length);
  
  for (var i=0; i<schemas.length; i++) {
    data2[i+8] = schemas[i].charCodeAt(i);
  }
  
  data = data2.concat(data);
  
  return data;
}

AppState.prototype.load_user_file_new = function(data) : ArrayBuffer {
  
}



AppState.prototype.load_user_file = function(data) : ArrayBuffer {
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

function Context(view3d) {
  this.view3d = view3d;
  this.font = view3d.font
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
      if (sce.active.type == ObTypes.MESH)
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
  this.appstate.set_mesh(m2);
  this.mesh = m2;
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
    this.undostack[this.undocur].undo(new Context(this.appstate.active_view3d));
    
    this.appstate.jobs.kill_owner_jobs(this.appstate.mesh);
  }
}

ToolStack.prototype.redo = function() {
  if (this.undocur < this.undostack.length) {
    var tool = this.undostack[this.undocur];
    var ctx = new Context(this.appstate.active_view3d);
    
    tool.is_modal = false;
    
    if (!(tool.undoflag & UndoFlags.IGNORE_UNDO)) {
      tool.undo_pre(ctx);
    }    
    tool.exec(new Context(this.appstate.active_view3d));
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
  
  var ctx = new Context(this.appstate.active_view3d);
  
  console.log(tool);
  if (tool.can_call(ctx) == false) {
    console.trace()
    console.log("Can not call tool.");
    console.log(typeof tool);
    return;
  }
  
  if (!(tool.undoflag & UndoFlags.IGNORE_UNDO))
    this.undo_push(tool);
  
  for (var k in tool.inputs) {
    var p = tool.inputs[k];
     
    if (p.user_set_data != undefined)
      p.user_set_data(p);
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
