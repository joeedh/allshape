"use strict";

var debug_dag = 0;

/*okay, this design is a bit weird for just a simple scenegraph.
  it's designed to allow us to use a single integrated Dag 
  system for all situations where we might want one, 
  e.g. scenegraph, mesh nodes, material shaders, compositors,
  whatever.  Perhaps a node-based finite element analyser?*/

var DagFlags = {
  DIRTY : 1,
  HAS_EXECUTE : 2,
  SORTDIRTY : 4
};

var DagEdgeFlags = {
  INPUT_EXCLUSIVE : 1,  //socket can only have one input connection at a time
  OUTPUT_EXCLUSIVE : 2
};

class DagSocket {
  //by default, input sockets are only allowed to have
  //one input.
  constructor(name, owner, flag=DagEdgeFlags.INPUT_EXCLUSIVE) {
    this.edges = new GArray();
    this.node = owner;
    this.name = name;
  }

  find_node(DagNode node) {
    for (var e in this.edges) {
      if (e.src == node || e.dst == node) {
        return e;
      }
    }
  }
  
  __iterator__() {
    return this.edges.__iterator__();
  }
  
  //get the data from an (output) socket.
  get_data(DagEdge edge) {
   
  }
}

//node connection type
class DagEdge {
  constructor(src, dst, dag) {
    //name is optional
    this.src = src;
    this.dst = dst;

    this.dag = dag;
    this.killfunc = undefined;
  }

  /*grabs the node connected to this edge that isn't src.
    src is optional, defaults to the node opposite to Edge.node*/
  opposite(Node src) {
    return this.src == src ? this.dst : this.src;
  }
}

/*flag is optional, defaults to DagFlags.HAS_EXECUTE.*/
class DagNodeData {
  constructor(flag=DagFlags.HAS_EXECUTE) {
    this.ins = new GArray<DagSocket>();
    this.outs = new GArray<DagSocket>();
    
    this.inmap = {};
    this.outmap = {};
    
    this.flag = flag | DagFlags.DIRTY;
  }

  //socktype can be 'i' or 'o', for input and output respectively
  add_sockets(type, socks) {
    var list, map;
    
    if (type == 'i') {
      list = this.ins;
      map = this.inmap;
    } else if (type == 'o') {
      list = this.outs;
      map = this.outmap;
    }
    
    for (var i=0; i<socks.length; i++) {
      list.push(socks[i]);
      map[socks[i].name] = socks[i];
    }
  }
}

class DagNode extends DataBlock {
  constructor() {
    this.dag_node = new DagNodeData();
  }

  dag_execute() { }
  dag_update() {
    function flush(n) {
      n.dag_node.flag |= DagFlags.DIRTY;
      
      for (var o in n.dag_node.outs) {
        for (var e in o.edges) {
          var n2 = e.opposite(e).node;
          flush(n2);
        }
      }
    }
    
    flush(this);
  }
}

function ddebug(msg) {
  if (debug_dag) {
    if (arguments.length > 1) {
      var args = []
      for (var i=0; i<arguments.length; i++) {
        args.push(arguments[i]);
      }
      
      console.log.apply(console, args);
    } else {
      console.log(msg);
    }
  }
}

class Dag {
  constructor() {
    //maps the data objects of nodes to the nodes themselves
    this.nodes = new GArray();
    this.sortlist = new GArray();
    
    this.flag = 0;
  }

  data_link(block, getblock, getblock_us)
  {
  }

  sort() {
    ddebug("in sort", this.nodes);
    
    var nodes = this.nodes;
    
    for (var i=0; i<nodes.length; i++) {
      nodes[i].dag_node.flag |= DagFlags.SORTDIRTY;
    }
    
    var Dag = this;
    var sortl = new GArray();
    
    function dosort(n) {
      for (var i=0; i<n.dag_node.ins.length; i++) {
        for (var e in n.dag_node.ins[i]) {
          var n2 = e.opposite(e).node;
          
          if (n2.dag_node.flag & DagFlags.SORTDIRTY) {
            dosort(n2);
          }
        }
      }
      
      sortl.push(n);
      
      for (var i=0; i<n.dag_node.outs.length; i++) {
        for (var e in n.dag_node.outs[i]) {
          var n2 = e.opposite(e).node;
          
          if (n2.dag_node.flag & DagFlags.SORTDIRTY) {
            dosort(n2);
          }
        }
      }
    }
    
    for (var i=0; i<nodes.length; i++) {
      var n = nodes[i];
      ddebug("sorting node ", (n.dag_node.flag & DagFlags.SORTDIRTY), n);
      
      if (n.dag_node.flag & DagFlags.SORTDIRTY)
        dosort(n);
    }
    
    this.sortlist = sortl;
  }

  exec() {
    if (debug_dag)
      console.log("executing dag...");
    
    if (this.flag & DagFlags.DIRTY) {
      if (debug_dag)
        console.log("sorting dag...");
        
      this.sort();
    }
    
    for (var n in this.sortlist) {
      if (debug_dag)
        console.log("n.flag, n:", n.dag_node.flag, n);
      
      if (n.dag_node.flag  & DagFlags.DIRTY) {
        if (n.dag_node.flag & DagFlags.HAS_EXECUTE) {
          n.dag_execute();
          n.dag_node.flag &= ~DagFlags.DIRTY;
        }
      }
    }
    
    if (debug_dag)
      console.log("finished executing dag");
  }

  add(DagNode node) {
    this.nodes.push(node);
    this.flag |= DagFlags.DIRTY;
  }

  //
  remove(DagNode node) {
    //disconnect from all other nodes
    for (var s in list(node.dag_node.ins)) {
      this.socket_clear(node, s, "i");
    }
    for (var s in list(node.dag_node.outs)) {
      this.socket_clear(node, s, "o");
    }
    
    this.nodes.remove(node);
    this.flag |= DagFlags.DIRTY;
  }

  //returns a new DagEdge object
  socket_connect(s1, s2) {
    var e = new DagEdge(s1, s2, this);
    
    s1.edges.push(e);
    s2.edges.push(e);
    
    return e;
  }

  socket_disconnect(s1, s2) {
    for (var e in s1.edges) {
      if (e.src == s1 && e.dst == s2) {
        if (e.killfunc != undefined)
          e.killfunc(e);
        e.src.edges.remove(e);
        e.dst.edges.remove(e);
        break;
      } else if (e.dst == s1 && e.src == s2) {
        if (e.killfunc != undefined)
          e.killfunc(e);
        e.src.edges.remove(e);
        e.dst.edges.remove(e);
        break;
      }
    }
  }

  //socktype must be one of ['i', 'o'], input/output
  socket_clear(node, sockname, socktype) {
    var sock;
    
    if (socktype == 'i')
      sock = node.dag_node.inmap[sockname];
    else
      sock = node.dag_node.outmap[sockname];
      
    for (var e in sock.edges) {
      if (e.killfunc != undefined)
        e.killfunc(e);
      
      if (e.src == sock)
        e.dst.edges.remove(e);
      else if (e.dst == sock)
        e.src.edges.remove(e);
    }
    
    sock.edges = new GArray();
  }

  //this function connects inputs to outputs.
  //make sure the arguments are in the right order
  connect(n1, String s1name, n2, String s2name) {
    var s1 = n1.node_data.outmap[s1name];
    var s2 = n2.node_data.inmap[s2name];
    
    return this.socket_connect(s1, s2);
  }
}
