"use strict";

class TouchManager {
  constructor(MyMouseEvent event) {
    this.pattern = new set(Object.keys(event.touches));
    this.idxmap = {};
    this.tot = event.touches.length;
    this.event = event;
    this.deltas = {};
    
    //create a mapping from integer sequence 0..<tot,
    //to the identifiers within the event.
    var i = 0;
    for (var k in event.touches) {
      this.idxmap[i++] = k;
      this.deltas[k] = 0.0;
    }
  }
  
  update(MyMouseEvent event) {
    if (this.valid(event)) {
      for (var k in event.touches) {
        var t2 = event.touches[k];
        var t1 = this.event.touches[k];
        
        var d = [t2[0]-t1[0], t2[1]-t1[1]];
        
        this.deltas[k] = d;
      }
    }
    
    this.event = event;
  }
  
  delta(int i) {
    return this.deltas[this.idxmap[i]];
  }
  
  get(int i) {
    return this.event.touches[this.idxmap[i]];
  }
  
  valid(MyMouseEvent event=this.event) : Boolean {
    var keys = Object.keys(event.touches);
    if (keys.length != this.pattern.length) return false;
    
    for (var i=0; i<keys.length; i++) {
      if (!pattern.has(keys[i])) return false;
    }
    
    return true;
  }
}

/*
class TouchManager {
  constructor() {
    this.last_mpos = [0, 0];
  }
  
  gen_event(event, type, handlers) {
    g_app_state.was_touch = true;
    stop_event_propegation(e);

    var x, y;

    if (DEBUG.touch)
      console.log(e.targetTouches.length, e);

    var t = e.targetTouches[0];
    if (t == undefined) {
      x = g_app_state._last_touch_mpos[0];
      y = g_app_state._last_touch_mpos[1];
    } else {         
      x = t.pageX;
      y = g_app_state.screen.size[1] - t.pageY;
      
      g_app_state._last_touch_mpos[0] = x;
      g_app_state._last_touch_mpos[1] = y;
    }

    var e2 = new MyMouseEvent(x, y, 0, type);
    
    e2.shiftKey = e.shiftKey;
    e2.altKey = e.altKey;
    e2.ctrlKey = e.ctrlKey;
    
    return e2;
    g_app_state.eventhandler._on_mousedown(e2);
  }

  on_touchmove(event) {
    var ret = this.gen_event(event, MyMouseEvent.MOUSEMOVE);
    g_app_state.eventhandler._on_mousemove(ret);
  }
  
  on_touchup(event) {
  }
  
  on_touchcancel(event) {
  }
  
  on_touchmove(event) {
  }
}
*/
