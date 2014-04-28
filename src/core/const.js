"use strict";

/* various constant (except for DEBUG) globals */

//file extension
var allshape_file_ext = ".al3";

//application version
var g_app_version = 0.043;

/*all selection bitflags flags must use this value, even if they define
  their own enumeration member, e.g. MeshFlags.SELECT*/
var SELECT = 1;

//release mode
//var RELEASE = false;
//now defined in src/config/config.js

var UNIT_TESTER = false;
var FEATURES = {
  save_toolstack : (RELEASE ? false : true)
}

//debug flags
var DEBUG = {
  gl_objects : true,
  Struct : false,
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
  complex_ui_recalc : false
};

//private macro helper global for utildefine.js
var $_mh = undefined;
