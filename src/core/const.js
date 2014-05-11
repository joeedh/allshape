"use strict";

/* various constant (except for DEBUG) globals */

//file extension
var allshape_file_ext = ".al3";
var allshape_settings_filename = ".settings.bin";

//application version
var g_app_version = 0.045;

/*all selection bitflags flags must use this value, even if they define
  their own enumeration member, e.g. MeshFlags.SELECT*/
var SELECT = 1;

//release mode
//var RELEASE = false;
//now defined in src/config/config.js

var UNIT_TESTER = false;
var FEATURES = {
  save_toolstack : true //(RELEASE ? false : true)
}

//need a struct to contain constants I'm not compiling in with the preprocessor
var use_octree_select = true;
var fuzzy_ui_press_hotspot = 25;

var new_api_parser = true;

//debug flags
var DEBUG = {
  alias_g_app_state : true, //make a G alias to g_app_state at runtime
  gl_objects : false,
  Struct : false,
  ui_except_handling : false,
  modal : false, 
  datalib : false, 
  glext : false, //prints gl extensions to console on startup
  selbuf : false,
  toolstack : false,
  transform : false,
  mesh_api : false,
  keyboard : false,
  modifier_keys : false,
  mouse : false,
  touch : false,
  mousemove : false,
  ui_datapaths : false,
  ui_menus : false,
  ui_canvas : false,
  dag : false,
  icons : false,
  complex_ui_recalc : false,
  screen_keyboard : false // !RELEASE
};

//private macro helper global for utildefine.js
var $_mh = undefined;


//debug globals
if (!RELEASE) {
  Object.defineProperty(this, "M", {get : function() {
    return new Context().mesh;
  }});
  Object.defineProperty(this, "O", {get : function() {
    return new Context().object;
  }});
  Object.defineProperty(this, "S", {get : function() {
    return new Context().scene;
  }});
  Object.defineProperty(this, "G", {get : function() {
    return g_app_state;
  }});
  Object.defineProperty(this, "V3D", {get : function() {
    return g_app_state.active_view3d;
  }});
  Object.defineProperty(this, "API", {get : function() {
    return g_app_state.api;
  }});
}
