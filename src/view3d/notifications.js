"use strict";

var _id_note_gen = 1;
class Notification {
  constructor(String apiname, String uiname, 
              String description) 
  {
    this._id = _id_note_gen++;
    this.name = apiname;
    this.uiname = uiname;
    this.description = description;
  }
  
  __hash__() : String {
    return ""+this._id;
  }
  
  get defunct() {
    return false;
  }
  
  gen_uielement(Context ctx) : UIElement {
  }
  
  on_remove() {
  }
}

class LabelNote extends Notification {
  constructor(String label, String description="", float progress=0.0) {
    Notification.call("label", "Label", description);
    
    this.label = label;
  }
  
  get defunct() : Boolean {
    return false;
  }
  
  gen_uielement(Context ctx) : UIElement {
    return new UILabel(ctx, this.label);
  }
}

class ProgressNote extends Notification {
  constructor(String label, String id, String description="", Function callback=undefined, float progress=0.0) {
    Notification.call("progress", "Progress Bar", description);
    
    if (callback == undefined)
      callback = function() {};
      
    this.id = id;
    this.label = label;
    this.progress = progress;
    this.callback = callback;
  }
  
  get defunct() : Boolean {
    return this.progress >= 1.0;
  }
  
  update_uielement(UIElement element) {
    var UIProgressBar bar = element;
    
    bar.set_value(this.progress);
  }
  
  gen_uielement(Context ctx) : UIElement {
    var c = new UIProgressBar(ctx);
    
    c.set_value(this.progress);
    return c;
  }
  
  set_value(float value) {
    this.progress = value;
    this.callback(this);
  }
}

class NotificationManager {
  constructor() {
    this.notes = new GArray();
    this.progbars = {};
    this.emap = {}; //active elements for each note
    this.cached_dellist = new Array();
  }
  
  add(Notification note) {
    this.notes.add(note);
    if (note instanceof ProgressNote) {
      this.progbars[note.id] = node;
    }
    
    this.emap[note._id] = note;
  }
  
  remove(Notification note) {
    this.notes.remove(note);
    
    if (note instanceof ProgressNote) {
      delete progbars[node.id];
    }
    
    for (var e in this.emap[note._id]) {
      e.parent.remove(e);
    }
    
    delete this.emap[note._id];
    
    note.on_remove();
  }
 
  ensure_uielement(Notification note) {
    /*get rid of any defunc elements
      
      important for GC, given circular 
      references we maintain in the UI code
     */
     
    for (var e in list(this.emap[node._id])) {
      if (e.defunct)
        this.emap[node._id].remove(e);
    }
    
    if (this.emap[note._id].length == 0) {
      for (var c in g_app_state.screen.children) {
        if (!(c instanceof ScreenArea)) continue;
        if (c.note_area == undefined) continue;
        
        var area = c.note_area;
        var c2 = note.gen_uielement(c.ctx);
        
        area.add(c2);
      }
    }
  }
  
  progbar(String label, float progress, String id=undefined, String description="") {
    var this2 = this;
    function callback(ProgressNote note) {
      if (!(note._id in this2.emap)) return;
      
      for (var e in this2.emap[note._id]) {
        note.update_uielement(e);
      }
    }
    
    var progbar = new ProgressNote(label, id, description, callback, progress);
    
    this.add(progbar);
    this.ensure_uielement(progbar);
  }
  
  on_tick() {
    var dellist = this.cached_dellist;
    
    dellist.length = 0;
    for (var n in this.notes) {
      if (n.defunct)
        dellist.push(n);
    }
    
    for (var i=0; i<dellist.length; i++) {
      this.remove(dellist[i]);
    }
  }
}

