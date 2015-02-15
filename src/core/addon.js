"use strict";

var loaded_addons = new GArray();
var loading_addons = {};

//template
/*
  addon_define("AnAddOn", "an_add_on", some_version, function(util) {
  var MeshDBHandler = {
    data_link : function data_link(block, getblock, getblock_us) { 
    },
    
    copy      : function copy(dest, source) {
    },
    
    unlink_block : function(block) {
    }
  }

  function AnAddOn() {
    AddOn.call(this, 0.01);
  }

  AnAddOn.prototype = util.inherit(AnAddOn, AddOn, {
    datablock_classes : {
      "Mesh" : MeshDBHandler,
    }
  });
  
  return AnAddOn;
}
*/


class AddOnDBData {
  data_link(DataBlock block, Function getblock, Function getblock_us) { 
  }
  copy(DataBlock dest, DataBlock source) { 
  }
  unlink_block(block) { 
  }
  
  static fromSTRUCT(reader) {
    var ret = new AddOnDBData();
    
    reader(ret);
    
    return ret;
  }
}
AddOnDBData.STRUCT = """
  AddOnDBData {
  }
""";

class AddOn {
  constructor() {
    //these are set later;
    this.uiname = undefined;
    this.name = undefined;
    this.version = undefined;
    
    this.ready = true; //true by default, must explicitly be set to false by child classes
    
    //private variable
    this._classes = []; 
    
    this.prefix = undefined; //this.name + "_";
  }
  
  //return true if default object draw should be replaced
  //only called in object selection mode
  on_object_draw(WebGLRenderingContext gl, ASObject ob, 
                 View3DHandler view3d, Context ctx) {
  }
  
  on_module_unload(ctx, appstate) {
  }
  
  on_file_open(ctx) {
  }
  
  on_file_close(ctx) {
  }
}

class AddOnDef {
  constructor(uiname, apiname, version, module_callback) {
    this.uiname = uiname;
    this.apiname = apiname;
    this.version = version;
    this.module_callback = module_callback;
  }
}

function addon_define(uiname, apiname, version, module_callback) {
  global _last_addon_define;
  
  var ret = new AddOnDef(uiname, apiname, version, module_callback);
  _last_addon_define = ret;
  
  load_addon(ret);
  
  return ret;
}

function find_addon(apiname) {
  for (var a in loaded_addons) {
    if (a.name == apiname) return a;
  }
  
  return undefined;
}

function load_addon(adef) {
  var new_classes = [];
  
  var util = {
    inherit          : function() {
      var ret = inherit.apply(window, arguments);
      
      new_classes.push(ret.constructor);
      return ret;
    },
    create_prototype : function() {
      var ret = create_prototype.apply(window, arguments);
      
      new_classes.push(ret.constructor);
      return ret;
    },
    GArray           : GArray,
    static_method    : static_method,
    set              : set,
    hashtable        : hashtable
  };
  
  //prepare to detect new struct serialization scrips
  var lasti = defined_classes.length;
  
  var addon = new (adef.module_callback(util))();
  if (addon.name in loading_addons) {
    console.log("  WARNING!! add-on", addon.name, " already in the process of loading");
    return;
  }
  
  function gen_default_fromSTRUCT(cls) {
    return function(reader) {
      var ret = new cls();
      reader(ret);
      return ret;
    }
  }
  
  var astruct = new STRUCT();
  var clst = new GArray();
  
  var donemap = {};
  
  function load_class_structs(new_classes) {
    console.log("LOADING ADD-ON CLASS STRUCTS");
    console.log(donemap);
    
    for (var i=0; i<new_classes.length; i++) {
      var cls = new_classes[i];
      
      if (cls.STRUCT == undefined) 
        continue;
      if (cls.structName != undefined)// && cls.structName in donemap)
        continue;
        
      console.log("  ", cls.structName, cls.name);
        
      if (cls.fromSTRUCT == undefined) {
        console.trace("Warning, auto-generating fromSTRUCT for an addon class");
        cls.fromSTRUCT = gen_default_fromSTRUCT(cls);
      }
      
      var stt = schema_parse.parse(cls.STRUCT);
      var name = stt.name;
      
      cls.structName = name;
      astruct.add_struct(cls);
      
      clst.push(cls);
      donemap[cls.structName] = 1;
    }
  }
  
  function finish_struct_load() {
    for (var i=0; i<new_classes.length; i++) {
      var cls = new_classes[i];
      var name = cls.structName;
      
      cls.structName = addon.prefix + name;
      astruct.rename_struct(name, cls.structName);
    }
  }
  
  load_class_structs(new_classes);
  
  addon._classes = new_classes;
  addon._astruct = astruct;
  addon.name = adef.apiname;
  addon.prefix = addon.name + "_";
  addon.uiname = adef.uiname;
  addon.version = adef.version;
  
  loading_addons[addon.name] = addon;
  
  //merge addon structs into main struct list
  istruct.join(astruct);
  
  if (!addon.ready) {
    //schedule an on_file_open call
    var ival = window.setInterval(function() {
      if (addon.ready) {
        clearInterval(ival);
        
        //make sure all struct scripts are parsed and merged into istruct
        load_class_structs(new_classes);
        finish_struct_load();
        
        //save and reload an undo file 
        //to make sure any data that belongs to this addon
        //is initialized properly
        var buf = g_app_state.create_undo_file();
        g_app_state.load_undo_file(buf);
        
        addon.on_file_open(new Context());
        
        delete loading_addons[addon.name];
        loaded_addons.push(addon);
      }
    }, 500);
  } else {
    finish_struct_load();
    
    //save and reload an undo file 
    //to make sure any data that belongs to this addon
    //is initialized properly
    var buf = g_app_state.create_undo_file();
    g_app_state.load_undo_file(buf);
    
    addon.on_file_open(new Context());
    
    delete loading_addons[addon.name];
    loaded_addons.push(addon);
  }
  
  return addon;
}

function test_addon_api() {
  var adef = addon_define("An Add On", "an_add_on", 0.01, function(util) {
    function SceneDBData() {
      AddOnDBData.call(this);
      
      this.a = 0;
      this.b = "yay";
      this.c = ["bleh"];
    };
    
    SceneDBData.prototype = util.inherit(SceneDBData, AddOnDBData, {
      data_link : function(block, getblock, getblock_us) { 
      },
      
      copy      : function(dest, source) {
      },
      
      unlink_block : function(block) {
      },
      
      fromSTRUCT : util.static_method(function(reader) {
        var ret = new SceneDBData();
        
        reader(ret);
        
        return ret;
      })
    });
    
    SceneDBData.STRUCT = """
      SceneDBData {
        a : int;
        b : string;
        c : array(string);
      }
    """;

    function AnAddOn() {
      AddOn.call(this, 0.01);
    }

    AnAddOn.prototype = util.inherit(AnAddOn, AddOn, {
      datablock_classes : {
        "SCENE" : SceneDBData,
      },
      
      on_file_open : function(ctx) {
        var sdata = ctx.scene.get_addon_data(this);
        
        sdata.a = 1;
        
        console.log("sdata!", sdata);
      }
    });
    
    return AnAddOn;
  });
  
  console.log("\n\n\n");
}

function unload_addons() {
  global loaded_addons;
  
  for (var addon in loaded_addons) {
    addon.on_module_unload(new Context(), g_app_state);
  }
  
  loaded_addons = new GArray();
}

function _addon_do_load(modname, buf, path) {
   var head= document.getElementsByTagName('head')[0];
   var script= document.createElement('script');
   
   script.type= 'text/javascript';
   script.src = path;
   head.appendChild(script);
   
  //eval(buf);
  //var ret = new Function(buf);
  //ret();
  
  //_last_addon_define = ret;
}

function _do_load_addons(job, args) {
  if (g_app_state.session.tokens == undefined) {
    job.finish = undefined;
    job.error(job, job.owner);
    return;
  }
  
  var token = g_app_state.session.tokens.access;
  api_exec("/api/addon/list", job);

  yield;

  console.log("ADDON LIST", job.value, job);
  
  var mods = job.value;
  var lst = [];
  
  for (var i=0; i<mods.length; i++) {
    var path = "/api/addon/file/get/" + mods[i].name + "/module.js";
    console.log("ADDON PATH", path);
    
    api_exec(path, job);
    yield;
    
    lst.push([job.value, mods[i].name, path]);
  }

  for (var i=0; i<lst.length; i++) {
    console.log("LOADING ADD-ON", lst[i][1]);
    try {
      _addon_do_load(lst[i][1], lst[i][0], lst[i][2]);
    } catch (err) {
      print_stack(err);
      console.log("\n==================\n", "ERROR: failed to load module", lst[i][1], "\n\n");
    }
  }
}

function reload_addons() {
  console.log("\n\nLoading add-ons. . .");
  unload_addons();
  
  call_api(_do_load_addons, undefined, function() {
    //XXX
  }, function() {
    console.log("ERROR LOADING ADD-ONS!", arguments); //XXX
  });

  console.log("\n");
}