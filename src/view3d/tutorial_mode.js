"use strict";

/*
okay.  tutorial recording mode should work by producing a series of
events, which are really paths into the data api.  it should produce
a easily-editable script file.

MouseTo(PathElement("view3d.zoomfac"))

run-time, tutorial mode works by capturing the event system
(and now I'm wishing I'd implemented aspects).
*/
/*
class EventPlayer extends EventHandler {
  constructor(EventHandler child, on_end=undefined) {
    EventHandler.call(this);
    
    this.events = new GArray()
    this.timer = 0;
    this.last_t = 0;
    this.cur = 0;
    this.child = child;
    this.on_end = on_end;
  }
  
  queue(Event event, int time_ms, String handler) {
    this.events.push([event, time, handler])
  }
  
  start() {
    this.timer = 0;
    this.last_t = time_ms();
    
    this.events.sort(function(a, b) {
      return a[1] < b[1] ? -1 : (a[1] > b[1] ? 1 : 0);
    });
  }
  
  do_event(event, handler) {
    this.child[handler](event);
  }
  
  end() {
    if (this.on_end != undefined)
      this.on_end(this);
    g_app_state.eventhandler = g_app_state.screen;
  }
  
  run() {
    var ival = time_ms() - this.last_t
    this.timer += ival
    
    for (var i=this.cur; i<this.events.length; i++) {
      var e = this.events[i];
      if (e[1] > this.timer) break;
      
      this.do_event(e[0], e[2]);
      this.cur++;
    }
    
    if (this.cur >= this.events.length) {
      this.end();
    }
  }
}*/

class TutorialEvent {
  constructor(String event) {
    this.handler = event;
  }
}

class TutKeyDown extends TutorialEvent {
  constructor(key, modifiers, handler="on_keydown") {
    TutorialEvent.call(this, handler);
    
    this.key = key;
    this.modifiers = modifiers;
  }
}
class TutKeyUp extends TutKeyDown {
  constructor(key, modifiers) {
    TutKeyDown.call(this, key, modifiers, "on_keyup");
  }
}

class HotSpot {
  get rect() : Array<Vector2> {
  }
}

class ManualHotSpot extends HotSpot {
  constructor(Array<Vector2> hotspot) {
    this._rect = hotspot;
  }
  
  get rect() : Array<Vector2> {
    return this._rect;
  }
}

class UIPath extends HotSpot {
  constructor(path) {
    this.path = path;
  }
  
  get rect() : Array<Vector2> {
    /*the hueristics for this may end up being
      a bit tricky.  for now, though, it's pretty
      simple.
     */
    function descend(UIElement e, String path) {
      if (e.data_path == path)
        return e;
      
      if (e instanceof UIFrame) {
        for (var e2 in e.children) {
          var ret = descend(e2, path);
          if (ret)
            return ret;
        }
      }
      
      return undefined;
    }
    
    var e = undefined;
    for (var a in g_app_state.screen.children) {
      if (!(a instanceof ScreenArea)) continue;
      
      e = descend(a.area, this.path);
      if (e != undefined) 
        break;
    }
    
    if (e == undefined) {
      console.trace();
      console.log("Could not find element hotspot for path " + this.path);
      return [[0, 0], [0, 0]];
    }
    
    var pos = new Vector2(e.pos);
    var size = new Vector2(e.size);
    
    while (e.parent != undefined) {
      pos.add(e.parent.pos);
      e = e.parent;
    }
    
    return [pos, size];
  }
}

class TutMouse extends TutorialEvent {
  constructor(HotSpot hotspot, String handler) {
    TutorialEvent.call(this, handler);
    this.hotspot = hotspot;
  }
}

class TutMouseDown extends TutMouse {
  constructor(HotSpot hotspot) {
    TutMouse.call(this, hotspot, "on_mousedown");
  }
}

class TutMouseUp extends TutMouse {
  constructor(HotSpot hotspot) {
    TutMouse.call(this, hotspot, "on_mouseup");
  }
}

class TutBox {
  constructor(text, pos, size) {
    this.pos = pos;
    this.size = size;
    this.text = text;
  }
}

class TutorialPage {
  constructor(Array<TutorialEvent> events, char primary_text="", Array<TutBox> boxes=[]) {
    this.pritext = primary_text;
    this.events = new GArray(events);
    this.boxes = boxes;
  }
}

class TutorialHandler extends EventHandler {
  constructor(child) {
    this.pages = new GArray() : Array<TutorialPage>;
    this.curp = 0;
    this.cure = 0;
    this.child = child;
    this.canvas = undefined : UICanvas;
  }
  
  load_pages(Array<TutorialPage> pages) {
    this.pages = new GArray(pages);
  }
  
  get cur() : TutorialEvent {
    if (this.curp >= this.pages.length) 
      return undefined;
    return this.pages[this.curp].events[this.cure];
  }
  
  next() {
    console.log("next", this.cure, this.pages[this.curp].events.length-1);
    
    if (this.cure >= this.pages[this.curp].events.length - 1) {
      this.curp++;
      this.cure = 0;
      
      if (this.curp < this.pages.length) {
        this.canvas.reset();
        this.canvas.text([200, 200], this.pages[this.curp].pritext, [0,0,0,1], 1.0);
      }
    } else {
      this.cure++;
    }
    
    this.do_passpart();
  }
  
  do_passpart() {
    var e = this.cur;
    if (e == undefined) return;
    
    if (e instanceof TutMouse) {
      var rect = e.hotspot.rect;
      if (rect == undefined) return;
      
      console.log("yay, passpart");
      this.canvas.passpart(rect[0], rect[1]);
    }
  }
  
  do_event(tevent, event, handler) {
    if (tevent.handler == handler) {
      this.next();
    }
    
    handler = "_" + handler;
    this.child[handler](event);
  }
  
  do_mouse(event, handler) {
    var e = this.cur;
    
    if (e == undefined) {
      console.log(this.curp, this.cure, "tutorial end");
      this.end();
      return;
    }
    
    var rect = e.hotspot.rect;
    
    if (rect == undefined) {
      console.log("warning: undefined hotspot", e.hotspot.constructor.name, e);
      if (e.hotspot instanceof UIPath)
        console.log(e.hotspot.path);
      return;
    }
    
    if (inrect_2d([event.x, event.y], rect[0], rect[1])) {
      console.log("event: ", handler);
      this.do_event(e, event, handler);
    }
  }
  
  _on_mousemove(MouseEvent event) {
    this.do_mouse(event, "on_mousemove");
  }
  
  _on_mousedown(MouseEvent event) {
    this.do_mouse(event, "on_mousedown");
  }
  
  _on_mouseup(MouseEvent event) {
    this.do_mouse(event, "on_mouseup");
  }
  
  on_draw(WebGLRenderingContext gl) {
    this.child.on_draw(gl);
    this.canvas.on_draw(gl);
  }

  start() {
    this.child = g_app_state.eventhandler;

    var v3d = g_app_state.active_view3d;
    this.canvas = new UICanvas(v3d, [g_app_state.screen.pos, g_app_state.screen.size]);
    this.canvas.text([200, 200], this.pages[this.curp].pritext, [0,0,0,1], 1.0);
    
    this.do_passpart();
    
    g_app_state.eventhandler = this;
  }
  
  end() {
    g_app_state.eventhandler = this.child;
    this.canvas.reset();
  }
}

function test_tutorial_mode() {
  /*tutorial mode uses a scripting language
    that's a subset of JS.  to facilitate that,
    we use fatory functions to cut out new operators*/
  function factory(cls) {
    function ret(arg) {
      var obj = Object.create(cls.prototype);
      cls.apply(obj, arguments);
      
      return obj;
    }
    return ret;
  }
  
  var PathSpot = factory(UIPath);
  var MouseUp = factory(TutMouseUp);
  var MouseDown = factory(TutMouseDown);
  var KeyDown = factory(TutKeyDown);
  var KeyUp = factory(TutKeyUp);
  var Page = factory(TutorialPage);
  
  var handler = new TutorialHandler(g_app_state.screen);
  
  handler.load_pages([
    /*tutorial script*/
    Page([
      MouseUp(PathSpot("view3d.zoomfac"))
    ], 'Click And Drag "Zoom" Button'),
    Page([
      MouseUp(PathSpot("view3d.use_backbuf_sel"))
    ], 'Click "Cull Select" Button')
    /*end tutorial script*/
  ]);
  
  console.log("hotspot test", handler.pages);
  for (var p in handler.pages) {
    for (var e in p.events) {
      if (!(e instanceof TutMouseDown)) continue;
      if (!(e.hotspot instanceof UIPath)) continue;
      
      var r = e.hotspot.rect;
      
      console.log("testing " + e.hotspot.path);
      console.log("  result: ", r[0], r[1]);
    }
  }
  
  console.log("replacing main event handler");
  handler.start();
}