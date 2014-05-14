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
    this.defunct = false; //expected to be a getter
  }
  
  __hash__() : String {
    return ""+this._id;
  }
  
  gen_uielement(Context ctx) : UIElement {
  }
  
  on_remove() {
  }
}

class LabelNote extends Notification {
  constructor(String label, String description="", float life_ms=3000) {
    Notification.call(this, "label", "Label", description);
    
    this.life_ms = life_ms;
    this.last_ms = time_ms();
    this.label = label;
  }
  
  get defunct() : Boolean {
    return time_ms() - this.last_ms >= this.life_ms;
  }
  
  gen_uielement(Context ctx) : UIElement {
    return new UILabel(ctx, this.label);
  }
}

class ProgressNote extends Notification {
  constructor(String label, String id, String description="", Function callback=undefined, float progress=0.0) {
    Notification.call(this, "progress", "Progress Bar", description);
    
    if (callback == undefined)
      callback = function() {};
      
    this.do_end = false;
    this.id = id;
    this.label = label;
    this.progress = progress;
    this.callback = callback;
  }
  
  get defunct() : Boolean {
    return this.progress >= 1.0 || this.do_end;
  }
  
  end() {
    this.do_end = true;
  }
  
  update_uielement(UIElement element) {
    var bar = element.children[1];
    
    bar.set_value(this.progress);
  }
  
  gen_uielement(Context ctx) : UIElement {
    var c = new UIProgressBar(ctx);

    c.min_wid = 100;
    c.min_hgt = 15;
    c.set_value(this.progress);
    
    var r = new ColumnFrame(ctx);

    r.pad[1] = 0;
    r.packflag |= PackFlags.NO_AUTO_SPACING;
    
    r.label(this.label);
    r.add(c);
    
    return r;
  }
  
  set value(float value) {
    if (value != this.progress)
      this.set_value(value);
  }
  
  get value() : float {
    return this.progress;
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
    this.notes.push(note);
    
    if (note instanceof ProgressNote) {
      this.progbars[note.id] = note;
    }
    
    this.emap[note._id] = new GArray;
  }
  
  remove(Notification note) {
    this.notes.remove(note);
    
    if (note instanceof ProgressNote) {
      delete this.progbars[note.id];
    }
    
    for (var e in this.emap[note._id]) {
      if (e.parent instanceof NoteContainer) {
        e.parent.parent.do_full_recalc();
        e.parent.parent.remove(e);
      } else {
        e.parent.do_full_recalc();
        e.parent.remove(e);
      }
    }
    
    delete this.emap[note._id];
    
    note.on_remove();
  }
 
  ensure_uielement(Notification note) {
    /*get rid of any defunc elements
      
      important for GC, given circular 
      references we maintain in the UI code
     */
     
    for (var e in list(this.emap[note._id])) {
      if (e.defunct)
        this.emap[note._id].remove(e);
    }
    
    if (this.emap[note._id].length == 0) {
      for (var c in g_app_state.screen.children) {
        if (!(c instanceof ScreenArea)) continue;
        if (c.area.note_area == undefined) continue;
        
        var area = c.area.note_area;
        var c2 = note.gen_uielement(c.ctx);
        
        area.add(c2, undefined, note);
        this.emap[note._id].push(c2);
      }
    }
  }
  
  label(String label, String description) {
    var n = new LabelNote(label, description);
    this.add(n);
    this.ensure_uielement(n);
    
    return n;
  }
  
  progbar(String label, float progress, String id=label, String description="") {
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
    
    return progbar;
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

class NoteContainer extends UIFrame {
  constructor(Context ctx, UIElement child, Notification note) {
    UIFrame.call(this, ctx);
    
    this.note = note;
    this.xbut = new UIButtonIcon(this.ctx, "", Icons.TINY_X);
    this.xbut.bgmode = "flat";
  
    var this2 = this;
    this.xbut.callback = function() {
      g_app_state.notes.remove(this2.note);
    }
    
    this.add(child);
    this.add(this.xbut);
    
    this.margin = 2;
    this.child = child;
    this.iconwid = 10;
    this.xwid = 13;
  }
  
  pack(UICanvas canvas, Boolean isVertical) {
    var size = this.child.get_min_size(canvas, isVertical)
    
    var margin = this.margin;
    
    this.child.pos[0] = this.margin+this.iconwid; 
    this.child.pos[1] = Math.abs(this.size[1] - size[1])*0.5+this.margin;
    this.child.size[0] = size[0]; 
    this.child.size[1] = size[1];
    
    this.xbut.pos[0] = this.child.pos[0]+this.child.size[0];
    this.xbut.pos[1] = this.margin;
    this.xbut.size[0] = this.xbut.size[1] = this.xwid;
    
    this.state |= UIFlags.NO_FRAME_CACHE;
  }
  
  get_min_size(UICanvas canvas, Boolean isVertical) {
    var s = this.child.get_min_size(canvas, isVertical);
    return [s[0]+this.margin*2+this.iconwid+this.xwid, s[1]+this.margin*2];
  }
  
  build_draw(UICanvas canvas, Boolean isVertical) {
    //canvas.frame_begin(this);
    
    var y = Math.abs(this.child.size[1] - this.size[1])*0.5;
    canvas.box([0, 0], this.size, uicolors["NoteBox"], 0.5);
    canvas.icon(Icons.NOTE_EXCL, [this.margin+2, this.margin+y], undefined, true);
    
    prior(NoteContainer, this).build_draw.call(this, canvas, isVertical);
    //canvas.frame_end(this);
  }
}

class NoteFrame extends ColumnFrame {
  constructor(Context ctx, NotificationManager notes) {
    ColumnFrame.call(this, ctx);
    this.notes = notes; //note manager
    
    this.packflag |= PackFlags.NO_AUTO_SPACING|PackFlags.INHERIT_HEIGHT;
    this.packflag |= PackFlags.IGNORE_LIMIT|PackFlags.ALIGN_LEFT;
  }
  
  add(UIElement e, int packflag, Notification note) {
    var c = new NoteContainer(this.ctx, e, note);
    prior(NoteFrame, this).add.call(this, c, packflag);
  }
  
  prepend(UIElement e, int packflag, Notification note) {
    var c = new NoteContainer(this.ctx, e, note);
    prior(NoteFrame, this).prepend.call(this, c, packflag);
  }
  
  remove(UIElement e) {
    for (var c in this.children) {
      if (c.child == e) {
        prior(NoteFrame, this).remove.call(this, c);
        return;
      }
    }
  }
}

function test_notes() {
  g_app_state.notes.label("yay", "description!");
  g_app_state.notes.progbar("tst", 0.3, "pbar");
  
  console.log("Notification test");
}
