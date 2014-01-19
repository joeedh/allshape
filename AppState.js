"use strict";

var formacad_file_ext = ".fc3";
var g_app_version = 0.01;

function UserSession() {
  this.tokens = {} : ObjectMap;
  this.username = "";
  this.password = "";
  this.is_logged_in = false;
  
  this.store = function() {
    localStorage.session = JSON.stringify(this);
  }
  
  this.logout_simple = function() {
    this.is_logged_in = false;
    this.tokens = {};
  }
  
  this.validate_session = function() {
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
  
  return us;
}

function AppState(screen, mesh) {
  this.screen = screen;
  this.toolstack = new ToolStack(this);
  this.active_view3d = undefined;
  this.api = new DataAPI(this);
  this.filepath = ""
  this.version = g_app_version;
  
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

//different_mesh is optional
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
  this.mesh = g_app_state.mesh;
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
