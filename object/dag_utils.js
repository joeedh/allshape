//if field is not undefined, use the data
//contained in owner.[field].  otherwise, use
//own data.
function Matrix4Socket(field, owner, name, flag) {
  //flag is optional
  DagSocket.call(this, owner, name, flag);
  
  this.matrix = new Matrix4();
  this.field = field;
}
inherit(Matrix4Socket, DagSocket);

Matrix4Socket.prototype.get_data = function(edge) {
  if (this.field != undefined)
    return this.owner["field"];
  else return this.matrix;
}

function DepSocket(owner, name, flag) {
  DagSocket.call(this, owner, name, flag);
  
};
inherit(DepSocket, DagSocket);
